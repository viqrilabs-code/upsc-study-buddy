export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
}

export function isLocalJsonStoreAllowed() {
  return process.env.ALLOW_LOCAL_JSON_STORE === "true" || !isProductionRuntime();
}

export function getLocalJsonStorePolicyLabel() {
  return isLocalJsonStoreAllowed() ? "allowed" : "disabled";
}
