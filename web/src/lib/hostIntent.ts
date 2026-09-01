const HOST_INTENT_KEY = "maresi_host_intent";

export function markHostIntent() {
  try {
    sessionStorage.setItem(HOST_INTENT_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekHostIntent() {
  try {
    return sessionStorage.getItem(HOST_INTENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeHostIntent() {
  const marked = peekHostIntent();
  try {
    sessionStorage.removeItem(HOST_INTENT_KEY);
  } catch {
    /* ignore */
  }
  return marked;
}
