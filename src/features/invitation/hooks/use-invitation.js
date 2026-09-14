import { useContext } from "react";
import { InvitationContext } from "../invitation-context-definition";

/**
 * Custom hook to access the invitation UID and config
 *
 * @returns {object} Object containing the invitation UID, config, isLoading, and error
 * @throws {Error} If used outside of InvitationProvider
 *
 * @example
 * const { uid, config } = useInvitation();
 */
export function useInvitation() {
  const context = useContext(InvitationContext);

  if (context === null) {
    throw new Error("useInvitation must be used within InvitationProvider");
  }

  return context;
}
