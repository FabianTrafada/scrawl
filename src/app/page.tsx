"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Canvas from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import LatexCheatsheet from "@/components/LatexCheatsheet";
import CalculatorPanel from "@/components/CalculatorPanel";
import UserMenu from "@/components/UserMenu";
import Script from "next/script";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { PresenceSource, RoomActivity } from "@/types/collab";
import { clearPendingRoomImport, setPendingRoomImport } from "@/lib/room-import";
import { useCanvasStore, type CanvasElement } from "@/store/canvasStore";
import { loadScene } from "@/lib/storage";

function ErrorToaster() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      if (error === "room_access_denied") {
        toast.error("Access Denied", {
          description: "The room was closed or your access was revoked.",
        });
      } else if (error === "invalid_invite") {
        toast.error("Invalid Invite", {
          description: "This invite link is invalid or doesn't belong to this room.",
        });
      } else if (error === "invite_expired") {
        toast.error("Invite Expired", {
          description: "This invite link has expired.",
        });
      } else if (error === "missing_token") {
        toast.error("Invalid Link", {
          description: "The invite link is missing its token.",
        });
      } else {
        toast.error("Error", { description: error });
      }

      // Clear the error from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      const newSearch = params.toString();
      router.replace(newSearch ? `/?${newSearch}` : "/");
    }
  }, [searchParams, router]);

  return null;
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Scrawl",
  url: "https://scrawl.site",
  description:
    "Draw, sketch, and write math on a freeform whiteboard. Type LaTeX like \\frac{a}{b} or x^2 and see it rendered instantly.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Freehand drawing",
    "Shape tools (rectangle, ellipse, line, arrow)",
    "Instant LaTeX math rendering",
    "Image paste support",
    "Undo / Redo",
    "Trackpad zoom and pan",
    "Real-time collaboration",
  ],
};

interface RoomItem {
  id: string;
  name: string;
  updatedAt: string;
  _count: { members: number };
  activity?: RoomActivity;
}

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showDashboard, setShowDashboard] = useState(false);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pollingMs, setPollingMs] = useState(50_000);

  const fetchRooms = useCallback(async (isActive?: () => boolean) => {
    setLoadingRooms(true);
    try {
      const res = await fetch("/api/rooms");
      if (!isActive || isActive()) {
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms ?? []);
          if (typeof data?.polling?.recommendedMs === "number") {
            setPollingMs(Math.max(15_000, data.polling.recommendedMs));
          }
        }
        setLoadingRooms(false);
      }
    } catch {
      if (!isActive || isActive()) {
        setLoadingRooms(false);
      }
    }
  }, []);

  useEffect(() => {
    if (showDashboard && session?.user) {
      let active = true;
      fetchRooms(() => active);
      return () => { active = false; };
    }
  }, [showDashboard, session, fetchRooms]);

  useEffect(() => {
    if (!showDashboard || !session?.user) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

    const interval = window.setInterval(() => {
      void fetchRooms();
      const roomIds = rooms.slice(0, 10).map((room) => room.id);
      if (roomIds.length > 0) {
        void fetch("/api/rooms/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomIds }),
        });
      }
    }, pollingMs);

    return () => window.clearInterval(interval);
  }, [fetchRooms, pollingMs, rooms, session?.user, showDashboard]);

const onlineCountLabel = (count: number | null, source: PresenceSource | undefined) => {
    if (count === null || count === undefined) return "--";
    if (source === "stale") return `${count} (stale)`;
    return `${count}`;
};

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      });
      if (res.ok) {
        const data = await res.json();
        const state = useCanvasStore.getState();
        const persisted = loadScene();
        const sourceElements =
          state.elements.length > 0 ? state.elements : (persisted?.elements ?? []);
        const sourceCamera =
          state.elements.length > 0 ? state.camera : (persisted?.camera ?? state.camera);
        const sceneElements = sourceElements.map((el) => structuredClone(el)) as CanvasElement[];
        const createdAt = Date.now();
        setPendingRoomImport({
          roomId: data.room.id,
          createdAt,
          scene: {
            version: 1,
            savedAt: createdAt,
            elements: sceneElements,
            camera: sourceCamera,
          },
        });
        toast.success("Room created successfully");
        router.push(`/room/${data.room.id}`);
      } else {
        clearPendingRoomImport();
        toast.error("Failed to create room");
      }
      setCreating(false);
    } catch {
      clearPendingRoomImport();
      toast.error("Network error while creating room");
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="h-screen w-screen relative" role="application" aria-label="Scrawl whiteboard">
        <Suspense fallback={null}>
          <ErrorToaster />
        </Suspense>
        <h1 className="sr-only">Scrawl — Freeform Whiteboard with LaTeX Math Rendering</h1>
        <Canvas />
        <Toolbar />
        <CalculatorPanel />
        <LatexCheatsheet />

        {/* Top-right controls for home page */}
        <div className="fixed top-3 right-3 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="flex items-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-full clay-card text-[15px] font-[500] text-[var(--color-warm-charcoal)] cursor-pointer hover:bg-[var(--border-oat-light)] active:scale-95 transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="sm:w-4 sm:h-4">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span className="hidden sm:inline">Rooms</span>
          </button>
          <UserMenu />
        </div>

        {/* Dashboard overlay */}
        {showDashboard && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              role="button"
              tabIndex={0}
              aria-label="Close dashboard"
              onClick={() => setShowDashboard(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowDashboard(false); }}
            />
            <div 
              className="relative w-full max-w-md mx-4 clay-card max-h-[80vh] overflow-hidden flex flex-col bg-[var(--surface)] rounded-3xl"
              style={{ minHeight: "460px" }}
            >
              {/* Header */}
              <div className="flex flex-row items-center justify-between gap-3 px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-[var(--border-oat-light)] bg-[var(--background)] rounded-t-[23px]">
                <div className="min-w-0">
                  <h2 className="text-[22px] sm:text-[28px] leading-none font-bold text-[var(--foreground)] tracking-tight truncate">Your Rooms</h2>
                  <p className="text-[13px] sm:text-[15px] text-[var(--color-warm-silver)] mt-1.5 sm:mt-2 font-medium truncate">
                    Collaborate in real-time
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <button
                    onClick={handleCreateRoom}
                    disabled={creating}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-[var(--color-matcha-600)] text-white text-[14px] sm:text-[15px] font-semibold cursor-pointer hover:-translate-y-1 hover:shadow-[-4px_4px_0px_0px_#000] active:translate-y-0 active:shadow-none disabled:opacity-40 transition-all duration-200"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="w-4 h-4 sm:w-[16px] sm:h-[16px]">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {creating ? "..." : "New"}
                  </button>
                  <button
                    onClick={() => setShowDashboard(false)}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex shrink-0 items-center justify-center rounded-xl hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-oat)] hover:shadow-sm transition-all cursor-pointer text-[var(--color-warm-charcoal)]"
                    aria-label="Close"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Room list */}
              <div className="flex-1 overflow-y-auto p-8 bg-[var(--surface)] flex flex-col">
                {!session?.user && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--color-ube-800)] rounded-2xl border border-[var(--border-oat)] relative overflow-hidden shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset]">
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-[var(--color-lemon-500)] rounded-full mix-blend-multiply opacity-80 blur-xl"></div>
                    <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[var(--color-pomegranate-400)] rounded-full mix-blend-multiply opacity-80 blur-xl"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-12 h-12 mb-4 bg-[var(--surface-overlay-hover-weak)] rounded-full flex items-center justify-center backdrop-blur-sm border border-[var(--surface-overlay-hover-border)]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <h3 className="text-white text-[22px] font-semibold mb-2 tracking-tight">Start Collaborating</h3>
                      <p className="text-white/90 text-[14px] leading-relaxed mb-0 font-medium">Sign in via the menu to create and manage real-time collaborative rooms.</p>
                    </div>
                  </div>
                )}

                {session?.user && loadingRooms && (
                  <div className="flex-1 flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-full p-5 rounded-2xl border border-[var(--border-oat)] bg-[var(--surface)] mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <Skeleton className="h-5 w-1/3" />
                          <Skeleton className="h-5 w-16 rounded-md" />
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {session?.user && !loadingRooms && rooms.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 bg-[var(--background)] rounded-2xl border border-dashed border-[var(--border-oat)]">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[var(--surface)] rounded-full flex items-center justify-center border border-[var(--border-oat)] shadow-sm">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warm-silver)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <h3 className="text-[18px] font-semibold text-[var(--foreground)] mb-1">No rooms yet</h3>
                    <p className="text-[15px] text-[var(--color-warm-silver)]">Create one to start collaborating!</p>
                  </div>
                )}

                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      router.push(`/room/${room.id}`);
                      setShowDashboard(false);
                    }}
                    className="w-full text-left p-5 rounded-2xl border border-[var(--border-oat)] bg-[var(--surface)] hover:bg-[var(--background)] cursor-pointer transition-all duration-200 mb-3 group hover:-translate-y-0.5 hover:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-[18px] font-semibold text-[var(--foreground)] group-hover:text-[var(--color-blueberry-800)] transition-colors leading-tight">
                        {room.name}
                      </h3>
                      <span className="text-[13px] font-medium text-[var(--color-warm-silver)] bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--border-oat-light)]">
                        {formatDate(room.updatedAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-warm-charcoal)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        {room._count.members} member{room._count.members !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-warm-charcoal)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Online {onlineCountLabel(room.activity?.onlineCount ?? null, room.activity?.onlineCountSource)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-warm-charcoal)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Open comments {room.activity?.unresolvedComments ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-warm-silver)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        {room.id.slice(0, 8)}&hellip;
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer hint */}
              <div className="p-4 border-t border-[var(--border-oat-light)] bg-[var(--background)]">
                <p className="text-[11px] font-semibold text-[var(--color-warm-silver)] text-center tracking-widest uppercase">
                  Local scratchpad active in background
                </p>
              </div>
            </div>
          </div>
        )}

        <noscript>
          <div style={{ padding: 32, textAlign: "center", fontFamily: "system-ui" }}>
            <h2>Scrawl requires JavaScript</h2>
            <p>Please enable JavaScript to use the freeform whiteboard with LaTeX math rendering.</p>
          </div>
        </noscript>
        <footer className="cookie-aware-footer hidden sm:block fixed bottom-4 left-4 z-50 text-[12px] text-[var(--color-warm-silver)] select-none pointer-events-none tracking-wide">
          <span className="font-semibold text-[var(--color-warm-charcoal)]">Scrawl</span>
          {" · "}
          Type LaTeX in text mode · Pinch to zoom · Two-finger scroll to pan
        </footer>
      </main>
    </>
  );
}
