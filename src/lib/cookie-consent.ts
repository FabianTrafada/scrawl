export const COOKIE_CONSENT_VERSION = 1;

const COOKIE_CONSENT_STORAGE_KEY = "scrawl:cookie-consent";
const COOKIE_CONSENT_COOKIE_NAME = "scrawl_cookie_consent";
const COOKIE_CONSENT_UPDATED_EVENT = "scrawl:cookie-consent-updated";
const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SERVER_SNAPSHOT_KEY = "server";

export type CookieConsentMethod = "accept_all" | "customize";

export interface CookieConsentRecord {
  version: number;
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  method: CookieConsentMethod;
  updatedAt: string;
}

function isCookieConsentMethod(value: unknown): value is CookieConsentMethod {
  return value === "accept_all" || value === "customize";
}

function isCookieConsentRecord(value: unknown): value is CookieConsentRecord {
  if (!value || typeof value !== "object") return false;

  const maybe = value as Partial<CookieConsentRecord>;
  return (
    typeof maybe.version === "number" &&
    maybe.necessary === true &&
    typeof maybe.preferences === "boolean" &&
    typeof maybe.analytics === "boolean" &&
    isCookieConsentMethod(maybe.method) &&
    typeof maybe.updatedAt === "string"
  );
}

function parseConsent(raw: string | null): CookieConsentRecord | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCookieConsentRecord(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const all = document.cookie ? document.cookie.split("; ") : [];
  for (const pair of all) {
    if (pair.startsWith(`${name}=`)) {
      return pair.slice(name.length + 1);
    }
  }

  return null;
}

function readConsentFromCookie(): CookieConsentRecord | null {
  const raw = readCookieValue(COOKIE_CONSENT_COOKIE_NAME);
  if (!raw) return null;

  try {
    return parseConsent(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function writeConsentCookie(record: CookieConsentRecord): void {
  if (typeof document === "undefined") return;

  const encoded = encodeURIComponent(JSON.stringify(record));
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie =
    `${COOKIE_CONSENT_COOKIE_NAME}=${encoded}; ` +
    `Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
}

function emitCookieConsentUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_UPDATED_EVENT));
}

export function createCookieConsentRecord(input: {
  preferences: boolean;
  analytics: boolean;
  method: CookieConsentMethod;
}): CookieConsentRecord {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: input.preferences,
    analytics: input.analytics,
    method: input.method,
    updatedAt: new Date().toISOString(),
  };
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window !== "undefined") {
    try {
      const stored = parseConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
      if (stored) return stored;
    } catch {
      // Ignore blocked storage in private mode or restrictive browsers.
    }
  }

  return readConsentFromCookie();
}

export function saveCookieConsent(record: CookieConsentRecord): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignore blocked storage.
    }
  }

  writeConsentCookie(record);
  emitCookieConsentUpdated();
}

export function isCookieConsentCurrent(record: CookieConsentRecord | null): record is CookieConsentRecord {
  return !!record && record.version === COOKIE_CONSENT_VERSION;
}

export function shouldPromptCookieConsent(record: CookieConsentRecord | null): boolean {
  return !isCookieConsentCurrent(record);
}

export function hasAnalyticsConsent(): boolean {
  const record = readCookieConsent();
  return !!record && isCookieConsentCurrent(record) && record.analytics;
}

export function getCookieConsentSnapshotKey(): string {
  const record = readCookieConsent();
  if (!record || !isCookieConsentCurrent(record)) return "prompt";

  return [
    "accepted",
    record.version,
    record.preferences ? 1 : 0,
    record.analytics ? 1 : 0,
    record.method,
    record.updatedAt,
  ].join(":");
}

export function getServerCookieConsentSnapshotKey(): string {
  return SERVER_SNAPSHOT_KEY;
}

export function subscribeCookieConsent(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
    onStoreChange();
  };

  const onCustomUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onCustomUpdate);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onCustomUpdate);
  };
}
