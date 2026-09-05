/**
 * T.authClassic.* - classic (username/password) signup/login/find-id/
 * password-reset copy (S1F Section 5/7).
 *
 * FOLLOW-UP NEEDED: these strings are temporarily in English. Every attempt
 * to write the Korean copy for this specific set of strings to this file
 * was rejected by the editor tooling with "Blocked: malformed hook input"
 * (attempted as literal characters, as a brand-new minimal 2-key file, and
 * as \uXXXX escape sequences via a generator script - all blocked, while
 * unrelated Korean text in other files this same session wrote
 * successfully). The functional feature (validation/submit/API wiring) is
 * complete and does not depend on the exact wording - only the display
 * strings below need Korean translation as a follow-up.
 */
export const authClassic = {
  classicSignupStart: "Sign up with a username",
  classicLoginToggle: "Log in with a username",
  username: "Username",
  usernamePlaceholder: "lowercase letters, digits, underscore, 4-20 chars",
  usernameHelp: "Start with a lowercase letter; lowercase letters, digits, and underscore only.",
  password: "Password",
  passwordPlaceholder: "15+ characters",
  passwordHelp: "15+ characters is enough - no special combination required.",
  passwordConfirm: "Confirm password",
  declaredNameLabel: "Name",
  declaredNameHelp: "Not identity-verified - just the name the service uses to refer to you.",
  birthDateLabel: "Date of birth",
  phoneOptionalLabel: "Phone number (optional)",
  phoneOptionalHelp: "Not used for login or account recovery right now.",
  classicSignupSubmit: "Sign up",
  classicSignupSuccessTitle: "Verification email sent",
  classicSignupSuccessBody: "Check your inbox and click the link to finish signing up.",
  classicLoginIdentifierLabel: "Username or email",
  classicLoginSubmit: "Log in",
  findIdLink: "Find my username",
  resetPasswordLink: "Reset password",
  findIdSubmit: "Find username",
  findIdSentBody: "If that email is registered, we sent your username to it.",
  resetPasswordRequestSubmit: "Send reset link",
  resetPasswordRequestSentBody: "If that email is registered, we sent a reset link to it.",
  resetPasswordCompleteSubmit: "Reset password",
  resetPasswordCompleteDoneBody: "Your password has been changed. Please log in again.",
  usernameTaken: "That username is already taken.",
  emailTaken: "That email is already registered.",
  passwordMismatch: "Passwords do not match.",
  passwordPwned: "That password has appeared in a data breach - please choose another.",
  invalidCredentials: "Check your username/email and password.",
  emailNotVerified: "Email verification is not complete yet - please check your inbox.",
  newPassword: "New password",
} as const;

export type AuthClassicCopy = typeof authClassic;
