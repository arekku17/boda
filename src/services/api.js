// In production the API is served from the same origin as the site
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:3000" : "");

/**
 * Fetch all wishes for an invitation
 * @param {string} uid - Invitation UID
 * @param {object} options - Query options (limit, offset)
 * @returns {Promise<object>} Response with wishes data
 */
export async function fetchWishes(uid, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const url = new URL(`${API_URL}/api/${uid}/wishes`);
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch wishes");
  }
  return response.json();
}

/**
 * Create a new wish
 * @param {string} uid - Invitation UID
 * @param {object} wishData - Wish data (name, message, attendance)
 * @returns {Promise<object>} Response with created wish
 */
export async function createWish(uid, wishData) {
  const response = await fetch(`${API_URL}/api/${uid}/wishes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(wishData),
  });

  const data = await response.json();

  if (!response.ok) {
    // Preserve error code for duplicate wish detection
    const error = new Error(data.error || "Failed to create wish");
    error.code = data.code;
    throw error;
  }
  return data;
}

/**
 * Check if guest has already submitted a wish
 * @param {string} uid - Invitation UID
 * @param {string} name - Guest name
 * @returns {Promise<object>} Response with hasSubmitted boolean
 */
export async function checkWishSubmitted(uid, name) {
  const response = await fetch(
    `${API_URL}/api/${uid}/wishes/check/${encodeURIComponent(name)}`,
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to check wish status");
  }
  return response.json();
}

/**
 * Delete a wish (admin function)
 * @param {string} uid - Invitation UID
 * @param {number} wishId - Wish ID to delete
 * @returns {Promise<object>} Response with deletion confirmation
 */
export async function deleteWish(uid, wishId) {
  const response = await fetch(`${API_URL}/api/${uid}/wishes/${wishId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete wish");
  }
  return response.json();
}

/**
 * Get attendance statistics
 * @param {string} uid - Invitation UID
 * @returns {Promise<object>} Response with stats data
 */
export async function fetchAttendanceStats(uid) {
  const response = await fetch(`${API_URL}/api/${uid}/stats`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch stats");
  }
  return response.json();
}

/**
 * Get invitation details
 * @param {string} uid - Invitation UID
 * @returns {Promise<object>} Response with invitation data
 */
export async function fetchInvitation(uid) {
  const response = await fetch(`${API_URL}/api/invitation/${uid}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch invitation");
  }
  return response.json();
}

/**
 * Turn an image path returned by the API into a full URL
 * @param {string} path - "/api/..." path or an external URL
 * @returns {string}
 */
export function resolveApiUrl(path) {
  if (!path) return "";
  return path.startsWith("/api/") ? `${API_URL}${path}` : path;
}

async function request(path, { token, headers, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      typeof data.error === "string" ? data.error : "Request failed",
    );
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

/**
 * Get the gift registry
 * @returns {Promise<object>} Response with gifts data
 */
export function fetchGifts() {
  return request("/api/gifts");
}

/**
 * Log in to the admin panel
 * @param {string} password - Admin password
 * @returns {Promise<object>} Response with the session token
 */
export function adminLogin(password) {
  return request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/**
 * Check whether an admin token is still valid
 * @param {string} token - Admin session token
 */
export function checkAdminSession(token) {
  return request("/api/admin/session", { token });
}

/**
 * Create a gift (admin)
 * @param {string} token - Admin session token
 * @param {object} gift - Gift data
 */
export function createGift(token, gift) {
  return request("/api/gifts", {
    method: "POST",
    token,
    body: JSON.stringify(gift),
  });
}

/**
 * Update a gift (admin)
 * @param {string} token - Admin session token
 * @param {string} id - Gift ID
 * @param {object} gift - Gift data
 */
export function updateGift(token, id, gift) {
  return request(`/api/gifts/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(gift),
  });
}

/**
 * Delete a gift (admin)
 * @param {string} token - Admin session token
 * @param {string} id - Gift ID
 */
export function deleteGift(token, id) {
  return request(`/api/gifts/${id}`, { method: "DELETE", token });
}
