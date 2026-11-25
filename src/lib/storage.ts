// localStorage helpers. Storage can be unavailable (private mode, blocked site data),
// so every access is wrapped in try/catch and failures are ignored.

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  lastSeller: "rifa-navidena:last-seller",
  noticeSent: "rifa-navidena:notice-sent",
  noticeSeller: "rifa-navidena:notice-seller",
};
