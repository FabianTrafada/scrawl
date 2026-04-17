"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "@/lib/auth-client";
import { getPreferredAvatarUrl } from "@/lib/avatar";
import {
  applyThemeToDocument,
  readThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { User } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickActionsProps {
  snapEnabled: boolean;
  commentsPanelOpen: boolean;
  activePresenterId: string | null;
  followPresenter: boolean;
  isInRoom: boolean;
  onToggleSnap: () => void;
  onOpenCommandPalette: () => void;
  onToggleComments: () => void;
  onTogglePresent: () => void;
  onToggleFollow: () => void;
  onOpenCheckpoints: () => void;
}

export default function UserMenu({ quickActions }: { quickActions?: QuickActionsProps }) {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [themePref, setThemePref] = useState<ThemePreference>(() => readThemePreference());

  const handlePickTheme = (pref: ThemePreference) => {
    setThemePreference(pref);
    applyThemeToDocument(pref);
    setThemePref(pref);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (isPending) {
    return (
      <div className="relative">
        <Skeleton className="w-10 h-10 rounded-full border-2 border-[var(--border-oat)]" />
      </div>
    );
  }

  const user = session?.user;
  const isAnonymous = !user || (user as { isAnonymous?: boolean }).isAnonymous;
  const avatarSrc = user
    ? getPreferredAvatarUrl({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      })
    : null;

  const initials = user?.name && user.name.trim() !== ""
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full border-2 border-[var(--border-oat)] bg-[var(--surface)] flex items-center justify-center text-sm font-semibold text-[var(--color-warm-charcoal)] cursor-pointer hover:border-[var(--foreground)] transition-colors shadow-[var(--panel-shadow-soft)]"
        aria-label="User menu"
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt={user?.name ?? "User"}
            className="w-full h-full rounded-full object-cover"
          />
        ) : initials ? (
          initials
        ) : (
          <User size={18} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-72 bg-[var(--surface)] border border-[var(--border-oat)] rounded-2xl shadow-[var(--panel-shadow)] py-2 z-[60] overflow-hidden">
          {/* Theme selector */}
          <div className="px-4 pt-4 pb-3 bg-[var(--surface-soft)] border-b border-[var(--border-oat-light)]">
            <div className="clay-kicker">
              Theme
            </div>
            <div className="mt-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePickTheme("light")}
                aria-label="Theme: Light"
                aria-pressed={themePref === "light"}
                className={`flex-1 clay-btn clay-btn-ux px-3 py-2 text-[13px] ${themePref === "light" ? "clay-btn-active" : ""}`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => handlePickTheme("dark")}
                aria-label="Theme: Dark"
                aria-pressed={themePref === "dark"}
                className={`flex-1 clay-btn clay-btn-ux px-3 py-2 text-[13px] ${themePref === "dark" ? "clay-btn-active" : ""}`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => handlePickTheme("system")}
                aria-label="Theme: System"
                aria-pressed={themePref === "system"}
                className={`flex-1 clay-btn clay-btn-ux px-3 py-2 text-[13px] ${themePref === "system" ? "clay-btn-active" : ""}`}
              >
                System
              </button>
            </div>
          </div>

          {quickActions && (
            <div className="px-4 pt-3 pb-3">
              <div className="clay-kicker">
                Quick Actions
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button className="clay-btn clay-btn-ux px-2 py-1.5 text-left text-xs border border-[var(--border-oat)]" onClick={quickActions.onToggleSnap}>
                  Snap: {quickActions.snapEnabled ? "On" : "Off"}
                </button>
                <button
                  className="clay-btn clay-btn-ux px-2 py-1.5 text-left text-xs border border-[var(--border-oat)]"
                  onClick={() => {
                    quickActions.onOpenCommandPalette();
                    setOpen(false);
                  }}
                >
                  Commands
                </button>
                <button className="clay-btn clay-btn-ux px-2 py-1.5 text-left text-xs border border-[var(--border-oat)]" onClick={quickActions.onToggleComments}>
                  Comments: {quickActions.commentsPanelOpen ? "On" : "Off"}
                </button>
                {quickActions.isInRoom && (
                  <>
                    <button className="clay-btn clay-btn-ux px-2 py-1.5 text-left text-xs border border-[var(--border-oat)]" onClick={quickActions.onTogglePresent}>
                      {quickActions.activePresenterId ? "Stop Present" : "Present"}
                    </button>
                    <button className="clay-btn clay-btn-ux px-2 py-1.5 text-left text-xs border border-[var(--border-oat)]" onClick={quickActions.onToggleFollow}>
                      Follow: {quickActions.followPresenter ? "On" : "Off"}
                    </button>
                    <button className="col-span-2 clay-btn clay-btn-ux px-2 py-1.5 text-left text-xs border border-[var(--border-oat)]" onClick={quickActions.onOpenCheckpoints}>
                      Checkpoints
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {isAnonymous ? (
            <>
              <p className="px-4 py-2 text-xs text-[var(--color-warm-silver)] border-t border-[var(--border-oat-light)]">
                Not signed in
              </p>
              <button
                onClick={() => {
                  signIn.social({ provider: "google" });
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-soft)] cursor-pointer transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
              <button
                onClick={() => {
                  signIn.social({ provider: "github" });
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-soft)] cursor-pointer transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                Sign in with GitHub
              </button>
            </>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-[var(--border-oat-light)]">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-[var(--color-warm-silver)] truncate">{user?.email}</p>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                  toast.success("Signed out successfully");
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
