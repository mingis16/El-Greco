// Cookie consent stored in localStorage. Read it with `getConsent()` before
// loading any analytics or marketing script.

export const CONSENT_STORAGE_KEY = "egk.cookie-consent";
export const CONSENT_CHANGE_EVENT = "egk:consent-change";
export const OPEN_COOKIE_SETTINGS_EVENT = "egk:open-cookie-settings";

// Bump when the categories change so everyone is asked again.
const CONSENT_VERSION = 1;

export type ConsentCategory = "analytics" | "marketing";

export interface ConsentState {
  version: typeof CONSENT_VERSION;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export function parseConsent(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ConsentState>;
    if (
      value.version !== CONSENT_VERSION ||
      typeof value.analytics !== "boolean" ||
      typeof value.marketing !== "boolean"
    ) {
      return null;
    }
    return { ...value, necessary: true } as ConsentState;
  } catch {
    return null;
  }
}

export function readConsentRaw(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getConsent() {
  return parseConsent(readConsentRaw());
}

export function hasConsent(category: ConsentCategory) {
  return getConsent()?.[category] === true;
}

export function saveConsent(choice: Record<ConsentCategory, boolean>) {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    necessary: true,
    ...choice,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private mode, disabled cookies). The choice still
    // applies for this page view via the event below.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: state }));
  return state;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
