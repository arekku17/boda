const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = {
  // Invitation
  async getInvitation(uid) {
    const res = await fetch(`${API_BASE}/api/invitation/${uid}`);
    return res.json();
  },

  // Wishes
  async getWishes(uid, { limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    const res = await fetch(`${API_BASE}/api/${uid}/wishes?${params}`);
    return res.json();
  },

  async createWish(uid, { name, message, attendance }) {
    const res = await fetch(`${API_BASE}/api/${uid}/wishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message, attendance }),
    });
    return res.json();
  },

  async deleteWish(uid, wishId) {
    const res = await fetch(`${API_BASE}/api/${uid}/wishes/${wishId}`, {
      method: "DELETE",
    });
    return res.json();
  },

  // Stats
  async getStats(uid) {
    const res = await fetch(`${API_BASE}/api/${uid}/stats`);
    return res.json();
  },
};
