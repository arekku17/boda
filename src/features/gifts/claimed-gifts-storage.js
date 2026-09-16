/**
 * Claim tokens of the gifts this guest said they'll bring, kept in this
 * browser so the gifts page can list them back ("Regalos que llevarás").
 * localStorage can be unavailable (private mode, blocked site data), so
 * every access is guarded and simply behaves as an empty list.
 */

const STORAGE_KEY = "boda_gift_claim_tokens";

export function getClaimTokens() {
  try {
    const tokens = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(tokens) ? tokens : [];
  } catch {
    return [];
  }
}

export function setClaimTokens(tokens) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    // Nothing to do - the list just won't be remembered
  }
}

export function addClaimToken(token) {
  const tokens = getClaimTokens();
  if (!tokens.includes(token)) setClaimTokens([...tokens, token]);
}

export function removeClaimToken(token) {
  setClaimTokens(getClaimTokens().filter((saved) => saved !== token));
}
