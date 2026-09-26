"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Cookie, X } from "lucide-react";
import {
  CONSENT_CHANGE_EVENT,
  OPEN_COOKIE_SETTINGS_EVENT,
  getConsent,
  parseConsent,
  readConsentRaw,
  saveConsent,
  type ConsentCategory,
} from "@/lib/consent";

// Returned while rendering on the server so the banner never flashes into
// static HTML for visitors who have already chosen.
const SERVER_SNAPSHOT = "__server__";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  };
}

const CATEGORIES: { id: ConsentCategory; label: string; description: string }[] = [
  {
    id: "analytics",
    label: "Analytics",
    description: "Anonymous visit statistics that help us improve the site.",
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Lets us measure promotions and show relevant offers.",
  },
];

type Choice = Record<ConsentCategory, boolean>;

export function CookieConsent() {
  const raw = useSyncExternalStore(subscribe, readConsentRaw, () => SERVER_SNAPSHOT);
  // Covers browsers where localStorage is blocked and the save can't persist.
  const [decided, setDecided] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, marketing: false });
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const open = () => {
      const current = getConsent();
      setChoice({
        analytics: current?.analytics ?? false,
        marketing: current?.marketing ?? false,
      });
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  const needsChoice = raw !== SERVER_SNAPSHOT && parseConsent(raw) === null && !decided;
  if (!needsChoice && !settingsOpen) return null;

  const decide = (next: Choice) => {
    saveConsent(next);
    setDecided(true);
    setSettingsOpen(false);
  };

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-x-0 bottom-0 z-[60] p-3 print:hidden sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-full sm:max-w-md sm:p-0"
    >
      <div className="rounded-card bg-charcoal-900 p-5 text-cream shadow-float ring-1 ring-white/10">
        <div className="flex items-start gap-3">
          <Cookie aria-hidden className="mt-0.5 size-5 shrink-0 text-mint-400" />
          <div className="flex-1">
            <h2 id={titleId} className="text-base font-semibold">
              {settingsOpen ? "Cookie preferences" : "Cookies at El Greco"}
            </h2>
            <p id={descId} className="mt-1.5 text-sm leading-relaxed text-charcoal-200">
              We use essential cookies to keep this site working. With your permission we&apos;d
              also use analytics and marketing cookies. You can change this any time under
              &ldquo;Cookie settings&rdquo; in the footer.
            </p>
          </div>
          {settingsOpen && !needsChoice && (
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close cookie preferences"
              className="-mt-1 -mr-1 grid size-9 place-items-center rounded-full text-charcoal-300 hover:bg-charcoal-800 hover:text-cream"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {settingsOpen && (
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Cookie categories</legend>
            <div className="flex items-start gap-3 rounded-xl bg-charcoal-800 p-3">
              <input
                type="checkbox"
                checked
                disabled
                id="consent-necessary"
                className="mt-0.5 size-4 accent-mint-500"
              />
              <label htmlFor="consent-necessary" className="text-sm">
                <span className="font-medium">Essential</span>
                <span className="ml-2 text-xs text-mint-300">Always on</span>
                <span className="block text-charcoal-300">
                  Needed for security and to remember this choice.
                </span>
              </label>
            </div>
            {CATEGORIES.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-xl bg-charcoal-800 p-3">
                <input
                  type="checkbox"
                  id={`consent-${c.id}`}
                  checked={choice[c.id]}
                  onChange={(e) => setChoice((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                  className="mt-0.5 size-4 accent-mint-500"
                />
                <label htmlFor={`consent-${c.id}`} className="text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="block text-charcoal-300">{c.description}</span>
                </label>
              </div>
            ))}
          </fieldset>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {settingsOpen ? (
            <button
              type="button"
              onClick={() => decide(choice)}
              className="rounded-full border border-charcoal-600 px-4 py-2.5 text-sm font-semibold hover:border-cream"
            >
              Save choices
            </button>
          ) : (
            <button
              type="button"
              onClick={() => decide({ analytics: false, marketing: false })}
              className="rounded-full border border-charcoal-600 px-4 py-2.5 text-sm font-semibold hover:border-cream"
            >
              Reject optional
            </button>
          )}
          <button
            type="button"
            onClick={() => decide({ analytics: true, marketing: true })}
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink hover:bg-mint-400"
          >
            Accept all
          </button>
        </div>
        {!settingsOpen && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-3 w-full text-center text-sm font-medium text-mint-300 underline-offset-4 hover:underline"
          >
            Customize
          </button>
        )}
      </div>
    </section>
  );
}
