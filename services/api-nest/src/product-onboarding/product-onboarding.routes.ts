/** JWT current-user product onboarding (prefix /api/v1/) */
export const PRODUCT_ONBOARDING_USER_ROUTES = {
  get: "me/product-onboarding",
  progress: "me/product-onboarding/progress",
  complete: "me/product-onboarding/complete",
} as const;
