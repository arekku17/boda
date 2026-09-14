import { safeBase64 } from "@/lib/base64";

/**
 * Generate a personalized invitation link for a guest
 * @param {string} uid - The invitation UID (e.g., 'rifqi-dina-2025')
 * @param {string} guestName - The guest's name (e.g., 'John Doe')
 * @param {string} baseUrl - Optional base URL (defaults to current origin)
 * @returns {string} - The personalized invitation URL
 *
 * @example
 * generateInvitationLink('rifqi-dina-2025', 'John Doe')
 * // Returns: http://localhost:5173/rifqi-dina-2025?guest=Sm9obiBEb2U=
 *
 * generateInvitationLink('rifqi-dina-2025', 'Ahmad Abdullah', 'https://wedding.example.com')
 * // Returns: https://wedding.example.com/rifqi-dina-2025?guest=QWhtYWQgQWJkdWxsYWg=
 */
export function generateInvitationLink(uid, guestName, baseUrl) {
  const url =
    baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const encodedName = safeBase64.encode(guestName);
  return `${url}/${uid}?guest=${encodedName}`;
}

/**
 * Generate multiple invitation links for a list of guests
 * @param {string} uid - The invitation UID
 * @param {string[]} guestNames - Array of guest names
 * @param {string} baseUrl - Optional base URL
 * @returns {Array<{name: string, link: string}>} - Array of objects with name and link
 *
 * @example
 * const guests = ['John Doe', 'Jane Smith', 'Ahmad Abdullah'];
 * generateBulkInvitationLinks('rifqi-dina-2025', guests);
 * // Returns:
 * // [
 * //   { name: 'John Doe', link: 'http://localhost:5173/?uid=rifqi-dina-2025&guest=...' },
 * //   { name: 'Jane Smith', link: 'http://localhost:5173/?uid=rifqi-dina-2025&guest=...' },
 * //   { name: 'Ahmad Abdullah', link: 'http://localhost:5173/?uid=rifqi-dina-2025&guest=...' }
 * // ]
 */
export function generateBulkInvitationLinks(uid, guestNames, baseUrl) {
  return guestNames.map((name) => ({
    name,
    link: generateInvitationLink(uid, name, baseUrl),
  }));
}

/**
 * Console utility to quickly generate invitation links
 * Usage: Run this in browser console or node script
 *
 * @example
 * // In browser console:
 * import { printInvitationLinks } from './utils/generateInvitationLink'
 * printInvitationLinks('rifqi-dina-2025', ['John Doe', 'Jane Smith'])
 */
export function printInvitationLinks(
  uid,
  guestNames,
  baseUrl = "http://localhost:5173",
) {
  const links = generateBulkInvitationLinks(uid, guestNames, baseUrl);
  console.log("\n=== Personalized Invitation Links ===\n");
  links.forEach(({ name, link }) => {
    console.log(`${name}:\n${link}\n`);
  });
  return links;
}
