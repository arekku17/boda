import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Gift,
  HandHeart,
  ImagePlus,
  Loader2,
  LogOut,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  adminLogin,
  checkAdminSession,
  createGift,
  deleteGift,
  fetchGifts,
  resolveApiUrl,
  unclaimGift,
  updateGift,
} from "@/services/api";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "boda_admin_token";
const MAX_IMAGE_SIZE = 1200; // px, longest side
const EMPTY_FORM = {
  name: "",
  store: "",
  url: "",
  imageUrl: "",
};

const inputClass = cn(
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100",
);

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const saveToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: the session just won't survive a reload
  }
};

// Friendly messages for API errors
const getErrorMessage = (error) => {
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor. ¿Está corriendo el API?";
  }
  if (error?.code === "ADMIN_NOT_CONFIGURED") {
    return "Falta configurar ADMIN_PASSWORD en el archivo .env del servidor.";
  }
  if (error?.status === 401) return "Tu sesión expiró. Vuelve a entrar.";
  if (error?.status === 413) return "La imagen es demasiado pesada.";
  if (error?.status === 400) {
    return "Revisa los datos: el nombre y el link de la tienda (con https://) son obligatorios.";
  }
  return error?.message || "Ocurrió un error inesperado.";
};

/**
 * Resize an image file in the browser and return it as base64 JPEG
 * @param {File} file
 * @returns {Promise<{ preview: string, data: string, type: string }>}
 */
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const scale = Math.min(
          1,
          MAX_IMAGE_SIZE / Math.max(img.width, img.height),
        );
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // White background so transparent PNGs don't turn black as JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({
          preview: dataUrl,
          data: dataUrl.split(",")[1],
          type: "image/jpeg",
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function LoginForm({ onLogin }) {
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: adminLogin,
    onSuccess: (response) => onLogin(response.data.token),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate(password);
      }}
      className={cn(
        "max-w-sm mx-auto mt-16 bg-white rounded-2xl border border-gray-100 shadow-lg p-8 space-y-5",
      )}
    >
      <div className={cn("text-center space-y-2")}>
        <div
          className={cn(
            "w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center",
          )}
        >
          <Gift className={cn("w-6 h-6 text-rose-500")} />
        </div>
        <h1 className={cn("text-2xl font-serif text-gray-800")}>
          Panel de regalos
        </h1>
        <p className={cn("text-sm text-gray-500")}>
          Ingresa la contraseña de administrador.
        </p>
      </div>

      <input
        type="password"
        autoComplete="current-password"
        aria-label="Contraseña"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />

      {login.isError && (
        <p className={cn("text-sm text-red-600")}>
          {login.error.status === 401
            ? "Contraseña incorrecta."
            : getErrorMessage(login.error)}
        </p>
      )}

      <button
        type="submit"
        disabled={!password || login.isPending}
        className={cn(
          "w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
        )}
      >
        {login.isPending && <Loader2 className={cn("w-4 h-4 animate-spin")} />}
        Entrar
      </button>
    </form>
  );
}

function GiftForm({ token, editingGift, onDone, onUnauthorized }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() =>
    editingGift
      ? {
          name: editingGift.name,
          store: editingGift.store,
          url: editingGift.url,
          imageUrl: editingGift.imageUrl,
        }
      : EMPTY_FORM,
  );
  const [newImage, setNewImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const save = useMutation({
    mutationFn: (payload) =>
      editingGift
        ? updateGift(token, editingGift.id, payload)
        : createGift(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      onDone();
    },
    onError: (error) => {
      if (error.status === 401) onUnauthorized();
    },
  });

  const uploadedImage =
    editingGift?.hasUploadedImage && !removeImage
      ? resolveApiUrl(editingGift.image)
      : "";
  const preview = newImage?.preview || uploadedImage || form.imageUrl;

  const setField = (field) => (e) =>
    setForm((current) => ({ ...current, [field]: e.target.value }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImageError("");
    try {
      setNewImage(await resizeImage(file));
      setRemoveImage(false);
    } catch (error) {
      setImageError(error.message);
    }
  };

  const clearImage = () => {
    setNewImage(null);
    if (editingGift?.hasUploadedImage) setRemoveImage(true);
    setForm((current) => ({ ...current, imageUrl: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    save.mutate({
      ...form,
      image: newImage ? { data: newImage.data, type: newImage.type } : null,
      removeImage: removeImage && !newImage,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4",
      )}
    >
      <h2 className={cn("text-lg font-medium text-gray-800")}>
        {editingGift ? "Editar regalo" : "Agregar regalo"}
      </h2>

      {/* Image */}
      <div className={cn("space-y-2")}>
        <span className={cn("text-sm font-medium text-gray-700")}>Imagen</span>
        <div
          className={cn(
            "relative aspect-[4/3] rounded-xl overflow-hidden bg-rose-50 border border-dashed border-rose-200 flex items-center justify-center",
          )}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Vista previa"
                className={cn("w-full h-full object-cover")}
              />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Quitar imagen"
                className={cn(
                  "absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow text-gray-600 hover:text-red-600",
                )}
              >
                <X className={cn("w-4 h-4")} />
              </button>
            </>
          ) : (
            <Gift className={cn("w-10 h-10 text-rose-300")} />
          )}
        </div>

        <label
          className={cn(
            "flex items-center justify-center gap-2 w-full cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50",
          )}
        >
          <ImagePlus className={cn("w-4 h-4")} />
          Subir foto
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className={cn("sr-only")}
          />
        </label>
        {imageError && (
          <p className={cn("text-sm text-red-600")}>{imageError}</p>
        )}

        {!newImage && !uploadedImage && (
          <input
            type="url"
            placeholder="…o pega el link de una imagen (https://…)"
            value={form.imageUrl}
            onChange={setField("imageUrl")}
            className={inputClass}
          />
        )}
      </div>

      <label className={cn("block space-y-1")}>
        <span className={cn("text-sm font-medium text-gray-700")}>
          Nombre del regalo *
        </span>
        <input
          required
          value={form.name}
          onChange={setField("name")}
          className={inputClass}
        />
      </label>

      <label className={cn("block space-y-1")}>
        <span className={cn("text-sm font-medium text-gray-700")}>
          Link para comprarlo *
        </span>
        <input
          required
          type="url"
          placeholder="https://"
          value={form.url}
          onChange={setField("url")}
          className={inputClass}
        />
      </label>

      <label className={cn("block space-y-1")}>
        <span className={cn("text-sm font-medium text-gray-700")}>Tienda</span>
        <input
          placeholder="Liverpool"
          value={form.store}
          onChange={setField("store")}
          className={inputClass}
        />
      </label>

      {save.isError && (
        <p className={cn("text-sm text-red-600")}>
          {getErrorMessage(save.error)}
        </p>
      )}

      <div className={cn("flex gap-3")}>
        <button
          type="submit"
          disabled={save.isPending}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
          )}
        >
          {save.isPending && <Loader2 className={cn("w-4 h-4 animate-spin")} />}
          {editingGift ? "Guardar cambios" : "Agregar regalo"}
        </button>
        {editingGift && (
          <button
            type="button"
            onClick={onDone}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50",
            )}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function GiftList({ token, editingId, onEdit, onDeleted, onUnauthorized }) {
  const queryClient = useQueryClient();
  const gifts = useQuery({
    queryKey: ["gifts", token],
    queryFn: () => fetchGifts(token),
  });

  const remove = useMutation({
    mutationFn: (id) => deleteGift(token, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      onDeleted(id);
    },
    onError: (error) => {
      if (error.status === 401) onUnauthorized();
    },
  });

  const unclaim = useMutation({
    mutationFn: (id) => unclaimGift(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
    onError: (error) => {
      if (error.status === 401) onUnauthorized();
    },
  });

  const handleDelete = (gift) => {
    if (window.confirm(`¿Eliminar "${gift.name}"?`)) {
      remove.mutate(gift.id);
    }
  };

  const handleUnclaim = (gift) => {
    if (window.confirm(`¿Quitar a "${gift.claimedBy}" de "${gift.name}"?`)) {
      unclaim.mutate(gift.id);
    }
  };

  const list = gifts.data?.data || [];

  return (
    <section className={cn("space-y-3")}>
      <h2 className={cn("text-lg font-medium text-gray-800")}>
        Regalos ({list.length})
      </h2>

      {gifts.isLoading && (
        <p className={cn("text-sm text-gray-500")}>Cargando regalos…</p>
      )}
      {gifts.isError && (
        <p className={cn("text-sm text-red-600")}>
          {getErrorMessage(gifts.error)}
        </p>
      )}
      {remove.isError && (
        <p className={cn("text-sm text-red-600")}>
          {getErrorMessage(remove.error)}
        </p>
      )}
      {unclaim.isError && (
        <p className={cn("text-sm text-red-600")}>
          {getErrorMessage(unclaim.error)}
        </p>
      )}
      {gifts.isSuccess && list.length === 0 && (
        <p className={cn("text-sm text-gray-500")}>
          Aún no hay regalos. Agrega el primero con el formulario.
        </p>
      )}

      <ul className={cn("space-y-3")}>
        {list.map((gift) => (
          <li
            key={gift.id}
            className={cn(
              "flex items-center gap-3 bg-white rounded-xl border p-3",
              editingId === gift.id
                ? "border-rose-300 ring-2 ring-rose-100"
                : "border-gray-100",
            )}
          >
            <div
              className={cn(
                "w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-rose-50 flex items-center justify-center",
              )}
            >
              {gift.image ? (
                <img
                  src={resolveApiUrl(gift.image)}
                  alt={gift.name}
                  className={cn("w-full h-full object-cover")}
                />
              ) : (
                <Gift className={cn("w-6 h-6 text-rose-300")} />
              )}
            </div>

            <div className={cn("flex-1 min-w-0")}>
              <p className={cn("font-medium text-gray-800 truncate")}>
                {gift.name}
              </p>
              <p className={cn("text-sm text-gray-500 truncate")}>
                {gift.store}
              </p>
              <a
                href={gift.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1 text-xs text-rose-600 hover:underline",
                )}
              >
                Ver en la tienda
                <ExternalLink className={cn("w-3 h-3")} />
              </a>
              {gift.claimedBy && (
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 w-fit",
                  )}
                >
                  <HandHeart className={cn("w-3.5 h-3.5 shrink-0")} />
                  <span className={cn("truncate")}>
                    Lo lleva: {gift.claimedBy}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnclaim(gift)}
                    disabled={unclaim.isPending}
                    className={cn(
                      "shrink-0 underline hover:text-emerald-900 disabled:opacity-50",
                    )}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            <div className={cn("flex gap-1")}>
              <button
                type="button"
                onClick={() => onEdit(gift)}
                aria-label={`Editar ${gift.name}`}
                className={cn(
                  "p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800",
                )}
              >
                <Pencil className={cn("w-4 h-4")} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(gift)}
                disabled={remove.isPending}
                aria-label={`Eliminar ${gift.name}`}
                className={cn(
                  "p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50",
                )}
              >
                <Trash2 className={cn("w-4 h-4")} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(readToken);
  const [editingGift, setEditingGift] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    document.title = "Admin · Mesa de regalos";
  }, []);

  const session = useQuery({
    queryKey: ["admin-session", token],
    queryFn: () => checkAdminSession(token),
    enabled: !!token,
    retry: false,
  });

  const handleLogin = (newToken) => {
    saveToken(newToken);
    setToken(newToken);
  };

  const logout = () => {
    saveToken(null);
    setToken(null);
    setEditingGift(null);
  };

  const resetForm = () => {
    setEditingGift(null);
    setFormKey((key) => key + 1);
  };

  const handleEdit = (gift) => {
    setEditingGift(gift);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sessionExpired = session.error?.status === 401;

  return (
    <div className={cn("min-h-screen bg-gray-50 px-4 py-8")}>
      {!token || sessionExpired ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div className={cn("max-w-5xl mx-auto space-y-6")}>
          <header
            className={cn("flex flex-wrap items-center justify-between gap-3")}
          >
            <div>
              <h1 className={cn("text-3xl font-serif text-gray-800")}>
                Mesa de regalos
              </h1>
              <p className={cn("text-sm text-gray-500")}>
                Lo que agregues aquí aparece en la página de regalos.
              </p>
            </div>
            <div className={cn("flex items-center gap-2")}>
              <Link
                to="/regalos"
                target="_blank"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 bg-white hover:bg-gray-50",
                )}
              >
                Ver página
                <ExternalLink className={cn("w-3.5 h-3.5")} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 bg-white hover:bg-gray-50",
                )}
              >
                <LogOut className={cn("w-3.5 h-3.5")} />
                Salir
              </button>
            </div>
          </header>

          <div className={cn("grid gap-6 md:grid-cols-2 items-start")}>
            <GiftForm
              key={`${editingGift?.id ?? "new"}-${formKey}`}
              token={token}
              editingGift={editingGift}
              onDone={resetForm}
              onUnauthorized={logout}
            />
            <GiftList
              token={token}
              editingId={editingGift?.id}
              onEdit={handleEdit}
              onDeleted={(id) => {
                if (editingGift?.id === id) resetForm();
              }}
              onUnauthorized={logout}
            />
          </div>
        </div>
      )}
    </div>
  );
}
