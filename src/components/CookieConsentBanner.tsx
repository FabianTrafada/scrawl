"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  createCookieConsentRecord,
  getCookieConsentSnapshotKey,
  getServerCookieConsentSnapshotKey,
  readCookieConsent,
  saveCookieConsent,
  shouldPromptCookieConsent,
  subscribeCookieConsent,
} from "@/lib/cookie-consent";

function CookieRow({
  title,
  description,
  enabled,
  locked,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-oat)] bg-[var(--surface)] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-warm-charcoal)]">
            {description}
          </p>
        </div>

        <button
          type="button"
          aria-pressed={enabled}
          aria-label={`${title}: ${enabled ? "Enabled" : "Disabled"}`}
          onClick={onToggle}
          disabled={locked}
          className={`cookie-consent-toggle ${enabled ? "cookie-consent-toggle-on" : ""}`}
        >
          <span className="cookie-consent-toggle-knob" />
        </button>
      </div>

      {locked && (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-warm-silver)]">
          Always active
        </p>
      )}
    </div>
  );
}

export default function CookieConsentBanner() {
  useSyncExternalStore(
    subscribeCookieConsent,
    getCookieConsentSnapshotKey,
    getServerCookieConsentSnapshotKey
  );

  const consent = readCookieConsent();
  const shouldShow = shouldPromptCookieConsent(consent);

  const [customOpen, setCustomOpen] = useState(false);
  const [preferencesEnabled, setPreferencesEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const openCustomize = () => {
    const latest = readCookieConsent();
    setPreferencesEnabled(latest?.preferences ?? false);
    setAnalyticsEnabled(latest?.analytics ?? false);
    setCustomOpen(true);
  };

  if (!shouldShow) return null;

  return (
    <section
      role="dialog"
      aria-live="polite"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="cookie-consent-banner fixed inset-x-3 bottom-3 z-[96] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(700px,calc(100vw-2rem))]"
    >
      <div className="clay-card rounded-[24px] border border-[var(--border-oat)] overflow-hidden">
        <div className="relative bg-[var(--surface)]/95 px-4 py-4 sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[var(--color-slushie-500)]/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 left-0 h-28 w-28 rounded-full bg-[var(--color-lemon-500)]/20 blur-2xl" />

          <div className="relative">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="clay-kicker">Cookie Settings</p>
              <span className="rounded-full border border-dashed border-[var(--border-oat)] bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-warm-charcoal)]">
                First visit
              </span>
            </div>

            <h2
              id="cookie-consent-title"
              className="text-[clamp(1.2rem,2.4vw,1.7rem)] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]"
            >
              We use cookies to keep Scrawl stable
            </h2>

            <p
              id="cookie-consent-desc"
              className="mt-2 text-[13px] leading-relaxed text-[var(--color-warm-charcoal)] sm:text-[14px]"
            >
              Accept all or choose optional categories. Strictly necessary cookies stay enabled so
              login, room access, and core collaboration keep working.
            </p>

            {!customOpen ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    saveCookieConsent(
                      createCookieConsentRecord({
                        preferences: true,
                        analytics: true,
                        method: "accept_all",
                      })
                    );
                  }}
                  className="clay-btn clay-btn-ux rounded-xl border border-[var(--border-oat)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold"
                >
                  Accept all
                </button>

                <button
                  type="button"
                  onClick={openCustomize}
                  className="clay-btn rounded-xl border border-[var(--border-oat)] bg-[var(--surface-soft)] px-4 py-2.5 text-[13px] font-semibold"
                >
                  Customize
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-2.5">
                  <CookieRow
                    title="Strictly necessary"
                    description="Required for sessions, permissions, and essential app functionality."
                    enabled
                    locked
                    onToggle={() => {
                      // Necessary is always enabled.
                    }}
                  />

                  <CookieRow
                    title="Preferences"
                    description="Remembers your personalization and convenience settings."
                    enabled={preferencesEnabled}
                    onToggle={() => setPreferencesEnabled((v) => !v)}
                  />

                  <CookieRow
                    title="Analytics"
                    description="Helps us measure quality and improve product performance."
                    enabled={analyticsEnabled}
                    onToggle={() => setAnalyticsEnabled((v) => !v)}
                  />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveCookieConsent(
                        createCookieConsentRecord({
                          preferences: preferencesEnabled,
                          analytics: analyticsEnabled,
                          method: "customize",
                        })
                      );
                    }}
                    className="clay-btn clay-btn-ux rounded-xl border border-[var(--border-oat)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold"
                  >
                    Save preferences
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomOpen(false)}
                    className="clay-btn rounded-xl border border-[var(--border-oat)] bg-[var(--surface-soft)] px-4 py-2.5 text-[13px] font-semibold"
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-warm-silver)]">
              Read our <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>{" "}
              and <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
