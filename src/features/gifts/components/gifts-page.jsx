import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Gift,
  HandHeart,
  HeartHandshake,
  Loader2,
  Undo2,
} from "lucide-react";
import { useConfig } from "@/features/invitation/hooks/use-config";
import {
  claimGift,
  fetchGifts,
  fetchMyGifts,
  releaseGift,
  resolveApiUrl,
} from "@/services/api";
import {
  addClaimToken,
  getClaimTokens,
  removeClaimToken,
  setClaimTokens,
} from "@/features/gifts/claimed-gifts-storage";
import { LanguageProvider, useTranslation } from "@/lib/i18n";
import {
  useMotionPreset,
  useReducedMotionFlag,
  staggerContainer,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

function ClaimGift({ gift, t, onClaimed }) {
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const claim = useMutation({
    mutationFn: (guestName) => claimGift(gift.id, guestName),
    onSuccess: async ({ data }) => {
      if (data?.claimToken) addClaimToken(data.claimToken);
      // Wait for the lists to refresh so the gift is already in
      // "Regalos que llevarás" when the page scrolls up to it
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gifts"] }),
        queryClient.invalidateQueries({ queryKey: ["my-gifts"] }),
      ]);
      onClaimed?.();
    },
    onError: (err) => {
      // Someone else just claimed it, or it was removed - either way it
      // should no longer show as available, so refresh the list.
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      setError(
        err.code === "GIFT_ALREADY_CLAIMED"
          ? t("giftsPage.claimTaken")
          : t("giftsPage.claimError"),
      );
    },
  });

  if (!claiming) {
    return (
      <button
        type="button"
        onClick={() => setClaiming(true)}
        className={cn(
          "w-full flex items-center justify-center gap-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-xs font-medium leading-tight transition-colors",
        )}
      >
        <HandHeart className={cn("w-3.5 h-3.5 shrink-0")} />
        <span>{t("giftsPage.claim")}</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setError("");
        claim.mutate(name.trim());
      }}
      className={cn("space-y-2")}
    >
      <input
        autoFocus
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("giftsPage.claimPlaceholder")}
        maxLength={100}
        className={cn(
          "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-800 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100",
        )}
      />
      {error && <p className={cn("text-xs text-red-600")}>{error}</p>}
      <div className={cn("flex flex-col gap-2")}>
        <button
          type="submit"
          disabled={claim.isPending || !name.trim()}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors",
          )}
        >
          {claim.isPending && (
            <Loader2 className={cn("w-3.5 h-3.5 animate-spin")} />
          )}
          {t("giftsPage.claimConfirm")}
        </button>
        <button
          type="button"
          onClick={() => {
            setClaiming(false);
            setName("");
            setError("");
          }}
          className={cn(
            "w-full px-3 py-2 rounded-xl text-xs text-gray-600 border border-gray-200 hover:bg-gray-50",
          )}
        >
          {t("giftsPage.claimCancel")}
        </button>
      </div>
    </form>
  );
}

// Gifts this browser claimed. Tokens the server no longer recognizes (the
// gift was released or deleted) are dropped from storage.
async function loadMyGifts() {
  const tokens = getClaimTokens();
  if (tokens.length === 0) return [];

  const { data } = await fetchMyGifts(tokens);
  setClaimTokens(data.map((gift) => gift.claimToken));
  return data;
}

function ReleaseGift({ gift, t }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const release = useMutation({
    mutationFn: () => releaseGift(gift.id, gift.claimToken),
    onSuccess: () => removeClaimToken(gift.claimToken),
    onError: (err) => {
      // 404: it was already released (e.g. by the couple), so forget it too
      if (err.status === 404) removeClaimToken(gift.claimToken);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      queryClient.invalidateQueries({ queryKey: ["my-gifts"] });
    },
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn(
          "inline-flex items-center gap-1 text-xs text-gray-500 hover:text-rose-600 underline underline-offset-2 transition-colors",
        )}
      >
        <Undo2 className={cn("w-3 h-3")} />
        {t("giftsPage.release")}
      </button>
    );
  }

  return (
    <div className={cn("space-y-1")}>
      <div className={cn("flex items-center gap-2")}>
        <button
          type="button"
          onClick={() => release.mutate()}
          disabled={release.isPending}
          className={cn(
            "inline-flex items-center gap-1 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-60 text-rose-600 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
          )}
        >
          {release.isPending && (
            <Loader2 className={cn("w-3 h-3 animate-spin")} />
          )}
          {t("giftsPage.releaseConfirm")}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            release.reset();
          }}
          disabled={release.isPending}
          className={cn(
            "px-2 py-1 rounded-lg text-xs text-gray-600 border border-gray-200 hover:bg-gray-50",
          )}
        >
          {t("giftsPage.releaseCancel")}
        </button>
      </div>
      {release.isError && release.error.status !== 404 && (
        <p className={cn("text-xs text-red-600")}>
          {t("giftsPage.releaseError")}
        </p>
      )}
    </div>
  );
}

function MyGifts({ gifts, t }) {
  return (
    <section
      className={cn(
        "mb-8 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 space-y-3",
      )}
    >
      <div className={cn("flex items-center gap-2")}>
        <HeartHandshake className={cn("w-5 h-5 text-rose-500")} />
        <h2 className={cn("font-medium text-gray-800")}>
          {t("giftsPage.myGiftsTitle")}
        </h2>
      </div>

      <ul className={cn("space-y-2")}>
        {gifts.map((gift) => (
          <li
            key={gift.id}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-white border border-rose-100 p-2",
            )}
          >
            <div
              className={cn(
                "w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-rose-50 flex items-center justify-center",
              )}
            >
              {gift.image ? (
                <img
                  src={resolveApiUrl(gift.image)}
                  alt={gift.name}
                  loading="lazy"
                  className={cn("w-full h-full object-cover")}
                />
              ) : (
                <Gift className={cn("w-6 h-6 text-rose-300")} />
              )}
            </div>

            <div className={cn("flex-1 min-w-0")}>
              <p
                className={cn(
                  "text-sm font-medium text-gray-800 leading-snug truncate",
                )}
              >
                {gift.name}
              </p>
              {gift.store && (
                <p className={cn("text-xs text-gray-500 truncate")}>
                  {gift.store}
                </p>
              )}
              <div className={cn("pt-1")}>
                <ReleaseGift gift={gift} t={t} />
              </div>
            </div>

            <a
              href={gift.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("giftsPage.buy")}: ${gift.name}`}
              className={cn(
                "shrink-0 flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              )}
            >
              <span>{t("giftsPage.buy")}</span>
              <ExternalLink className={cn("w-3 h-3")} />
            </a>
          </li>
        ))}
      </ul>

      <p className={cn("text-xs text-gray-500")}>
        {t("giftsPage.myGiftsNote")}
      </p>
    </section>
  );
}

function GiftsPageContent() {
  const config = useConfig();
  const { t } = useTranslation();
  const fadeUp = useMotionPreset("fadeUp");
  const scaleIn = useMotionPreset("scaleIn");
  const giftsQuery = useQuery({ queryKey: ["gifts"], queryFn: fetchGifts });
  const gifts = giftsQuery.data?.data || [];
  const myGiftsQuery = useQuery({
    queryKey: ["my-gifts"],
    queryFn: loadMyGifts,
  });
  const myGifts = myGiftsQuery.data || [];
  const reducedMotion = useReducedMotionFlag();
  const [toast, setToast] = useState(null);

  const handleClaimed = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    setToast({ id: Date.now(), message: t("giftsPage.claimedToast") });
  }, [reducedMotion, t]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${t("giftsPage.title")} · ${config.brideName} & ${config.groomName}`;
  }, [t, config.brideName, config.groomName]);

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[430px] min-h-screen bg-white relative border border-gray-200 shadow-lg px-4 py-6",
        )}
      >
        {/* Returning opens the invitation directly instead of the landing page */}
        <Link
          to="/"
          state={{ openInvitation: true }}
          className={cn(
            "inline-flex items-center gap-2 text-sm text-gray-600 hover:text-rose-600 transition-colors",
          )}
        >
          <ArrowLeft className={cn("w-4 h-4")} />
          <span>{t("giftsPage.back")}</span>
        </Link>

        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          animate="visible"
          className={cn("text-center space-y-4 mt-10 mb-10")}
        >
          <motion.span
            variants={fadeUp}
            className={cn("inline-block text-rose-500 font-medium")}
          >
            {t("giftsPage.title")}
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className={cn("text-5xl font-script text-rose-600 py-1")}
          >
            {config.brideName}{" "}
            <span className={cn("font-amp text-rose-400")}>&</span>{" "}
            {config.groomName}
          </motion.h1>

          <motion.div
            variants={scaleIn}
            className={cn("flex items-center justify-center gap-4")}
          >
            <div className={cn("h-[1px] w-12 bg-rose-200")} />
            <Gift className={cn("w-5 h-5 text-rose-400")} />
            <div className={cn("h-[1px] w-12 bg-rose-200")} />
          </motion.div>

          <motion.p
            variants={fadeUp}
            className={cn("text-gray-600 leading-relaxed max-w-sm mx-auto")}
          >
            {t("giftsPage.message")}
          </motion.p>
        </motion.div>

        {myGifts.length > 0 && <MyGifts gifts={myGifts} t={t} />}

        {giftsQuery.isLoading && (
          <p className={cn("text-center text-gray-500")}>
            {t("giftsPage.loading")}
          </p>
        )}

        {giftsQuery.isError && (
          <p className={cn("text-center text-gray-500")}>
            {t("giftsPage.error")}
          </p>
        )}

        {giftsQuery.isSuccess && gifts.length === 0 && (
          <p className={cn("text-center text-gray-500")}>
            {t("giftsPage.empty")}
          </p>
        )}

        {gifts.length > 0 && (
          <motion.ul
            variants={staggerContainer()}
            initial="hidden"
            animate="visible"
            className={cn("grid grid-cols-2 gap-3 pb-8")}
          >
            {gifts.map((gift) => (
              <motion.li
                key={gift.id}
                variants={fadeUp}
                className={cn(
                  "bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden flex flex-col",
                )}
              >
                <div
                  className={cn(
                    "aspect-square bg-rose-50 flex items-center justify-center",
                  )}
                >
                  {gift.image ? (
                    <img
                      src={resolveApiUrl(gift.image)}
                      alt={gift.name}
                      loading="lazy"
                      className={cn("w-full h-full object-cover")}
                    />
                  ) : (
                    <Gift className={cn("w-10 h-10 text-rose-300")} />
                  )}
                </div>

                <div className={cn("p-3 space-y-2 flex flex-1 flex-col")}>
                  <div className={cn("flex-1")}>
                    <h2
                      className={cn(
                        "font-medium text-gray-800 text-sm leading-snug",
                      )}
                    >
                      {gift.name}
                    </h2>
                    {gift.store && (
                      <p className={cn("text-xs text-gray-500")}>
                        {gift.store}
                      </p>
                    )}
                  </div>

                  <a
                    href={gift.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "w-full flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                    )}
                  >
                    <span>{t("giftsPage.buy")}</span>
                    <ExternalLink className={cn("w-3.5 h-3.5")} />
                  </a>

                  <ClaimGift gift={gift} t={t} onClaimed={handleClaimed} />
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="status"
              className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100%-2rem)]",
              )}
            >
              <div
                className={cn(
                  "bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2",
                )}
              >
                <CheckCircle2 className={cn("w-4 h-4 shrink-0")} />
                <span className={cn("text-sm")}>{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function GiftsPage() {
  const config = useConfig();

  return (
    <LanguageProvider language={config?.language || "es"}>
      <GiftsPageContent />
    </LanguageProvider>
  );
}
