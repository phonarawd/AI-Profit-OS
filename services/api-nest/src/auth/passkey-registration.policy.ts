import { ConflictException } from "@nestjs/common";

export const PASSKEY_REGISTRATION_CONFLICT =
  "WEBAUTHN_CREDENTIAL_ALREADY_REGISTERED" as const;

/**
 * WebAuthn registration verifies a caller-supplied new public key. Therefore
 * an existing credentialId cannot be treated as identity authority here.
 * Existing credentials authenticate only through the stored-key assertion path.
 */
export function assertPasskeyCredentialUnclaimed(existing: unknown): void {
  if (existing != null) {
    throw new ConflictException(PASSKEY_REGISTRATION_CONFLICT);
  }
}

/**
 * If another registration wins between pre-check and INSERT, fail closed.
 * Returning the existing row's user_id would turn registration into an
 * account-takeover primitive.
 */
export function rejectPasskeyCredentialInsertRace(): never {
  throw new ConflictException(PASSKEY_REGISTRATION_CONFLICT);
}
