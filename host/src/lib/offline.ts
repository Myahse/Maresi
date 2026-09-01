const CACHE_PREFIX = "maresi-offline-cache:";
const QUEUE_KEY = "maresi-offline-queue";

export type QueuedRequest = {
  id: string;
  path: string;
  method: string;
  body?: string;
};

const listeners = new Set<() => void>();

export function onOfflineChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function isBrowserOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export const OFFLINE_QUEUED = "OFFLINE_QUEUED";

export function isOfflineQueued(error: unknown) {
  return error instanceof Error && error.message === OFFLINE_QUEUED;
}

export function actionErrorMessage(error: unknown, fallback: string, queuedMessage: string) {
  if (isOfflineQueued(error)) return queuedMessage;
  return error instanceof Error ? error.message : fallback;
}

function sessionScope() {
  try {
    const token = localStorage.getItem("token") || "anon";
    return token.slice(-12);
  } catch {
    return "anon";
  }
}

function cacheKey(path: string) {
  const scope = path.startsWith("/properties") ? "public" : sessionScope();
  return CACHE_PREFIX + scope + ":" + path;
}

export function shouldCachePath(path: string, method: string) {
  if (method !== "GET") return false;
  if (path.includes("/identity/")) return false;
  return (
    path.startsWith("/properties") ||
    path === "/visit-requests" ||
    path === "/visit-requests/owner" ||
    path.startsWith("/favorites") ||
    path === "/users/me" ||
    path === "/notifications"
  );
}

export function shouldQueuePath(path: string, method: string) {
  if (method === "GET" || path.startsWith("/payments") || path.startsWith("/auth")) return false;
  return path.startsWith("/visit-requests");
}

export function readCache<T>(path: string): T | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(path));
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache(path: string, value: unknown) {
  try {
    localStorage.setItem(cacheKey(path), JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function readQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

export function queueCount() {
  return readQueue().length;
}

export function clearOfflineSession() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_PREFIX) || key === QUEUE_KEY)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    notify();
  } catch {
    /* ignore */
  }
}

export function enqueueRequest(item: Omit<QueuedRequest, "id">) {
  const queue = readQueue();
  queue.push({ ...item, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notify();
}

let flushing = false;

export async function flushQueue(send: (item: QueuedRequest) => Promise<void>) {
  if (flushing || !isBrowserOnline()) return;
  flushing = true;
  try {
    const remaining: QueuedRequest[] = [];
    let failed = false;
    for (const item of readQueue()) {
      if (failed) {
        remaining.push(item);
        continue;
      }
      try {
        await send(item);
      } catch {
        remaining.push(item);
        failed = true;
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    notify();
  } finally {
    flushing = false;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isNetworkFailure(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const text = error instanceof Error ? error.message : String(error);
  return /failed to fetch|network|offline|abort|timeout|load failed/i.test(text);
}
