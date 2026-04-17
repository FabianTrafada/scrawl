"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { useSession } from "@/lib/auth-client";
import type { CommentsViewMode } from "@/types/collab";

const MENTION_INBOX_STORAGE_PREFIX = "scrawl:mentions:";

type CommentItem = {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  x: number | null;
  y: number | null;
  elementId: string | null;
  text: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
  pending?: boolean;
  failed?: boolean;
};

export default function CommentsPanel({ roomId }: { roomId: string }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementId = useCanvasStore((s) => s.selectedElementId);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const setSelectedElementIds = useCanvasStore((s) => s.setSelectedElementIds);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const commentsPanelOpen = useCanvasStore((s) => s.commentsPanelOpen);
  const setCommentsPanelOpen = useCanvasStore((s) => s.setCommentsPanelOpen);
  const commentsView = useCanvasStore((s) => s.commentsView);
  const setCommentsView = useCanvasStore((s) => s.setCommentsView);
  const mentionUnreadCount = useCanvasStore((s) => s.mentionUnreadCount);
  const latestMentionCommentId = useCanvasStore((s) => s.latestMentionCommentId);
  const latestMentionElementId = useCanvasStore((s) => s.latestMentionElementId);
  const registerMention = useCanvasStore((s) => s.registerMention);
  const setMentionInboxState = useCanvasStore((s) => s.setMentionInboxState);
  const markMentionsRead = useCanvasStore((s) => s.markMentionsRead);
  const requestElementFocus = useCanvasStore((s) => s.requestElementFocus);
  const liveblocksRoom = useCanvasStore((s) => s.liveblocks.room);
  const [clearedReferenceSelectionId, setClearedReferenceSelectionId] = useState<
    string | null
  >(null);
  const cameraAnimationRef = useRef<number | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingMentionSoundRef = useRef(false);
  const mentionSoundUrl =
    process.env.NEXT_PUBLIC_COMMENT_MENTION_SOUND_URL ??
    "/sounds/comment-mention.mp3";
  const activeReferenceElementId =
    selectedElementId && selectedElementId !== clearedReferenceSelectionId
      ? selectedElementId
      : null;

  const participantNames = (() => {
    const names = new Set<string>();
    const selfName =
      session?.user?.name?.trim() || session?.user?.email?.trim() || "You";
    if (selfName) names.add(selfName);
    for (const other of liveblocksRoom?.getOthers?.() ?? []) {
      const n = (other.info as { name?: string; email?: string } | undefined)?.name?.trim();
      const e = (other.info as { name?: string; email?: string } | undefined)?.email?.trim();
      if (n) names.add(n);
      else if (e) names.add(e);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  })();

  const mentionCandidates =
    mentionQuery.trim().length === 0
      ? participantNames.slice(0, 6)
      : participantNames
          .filter((name) =>
            name.toLowerCase().includes(mentionQuery.trim().toLowerCase())
          )
          .slice(0, 6);

  const toMentionToken = (value: string) =>
    value
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

  const normalizeMentionToken = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const selfMentionAliases = useMemo(() => {
    const aliases = new Set<string>();

    const addAlias = (value: string | null | undefined) => {
      if (!value) return;
      const normalized = normalizeMentionToken(value);
      if (normalized) aliases.add(normalized);

      const mentionToken = toMentionToken(value);
      const normalizedToken = normalizeMentionToken(mentionToken);
      if (normalizedToken) aliases.add(normalizedToken);

      const localPart = value.includes("@") ? value.split("@")[0] ?? "" : "";
      const normalizedLocalPart = normalizeMentionToken(localPart);
      if (normalizedLocalPart) aliases.add(normalizedLocalPart);
    };

    addAlias(session?.user?.name);
    addAlias(session?.user?.email);

    const selfInfo = liveblocksRoom?.getSelf?.()?.info as
      | { name?: string; email?: string }
      | undefined;
    addAlias(selfInfo?.name);
    addAlias(selfInfo?.email);

    return aliases;
  }, [liveblocksRoom, session?.user?.email, session?.user?.name]);

  const isMentionedInText = useCallback(
    (commentText: string) => {
      if (selfMentionAliases.size === 0) return false;

      const mentionTokens = Array.from(commentText.matchAll(/@([a-zA-Z0-9._-]+)/g))
        .map((m) => normalizeMentionToken(m[1]))
        .filter(Boolean);
      return mentionTokens.some((token) => selfMentionAliases.has(token));
    },
    [selfMentionAliases]
  );

  const playMentionSound = useCallback(() => {
    const audio = notificationAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio
      .play()
      .then(() => {
        pendingMentionSoundRef.current = false;
      })
      .catch(() => {
        pendingMentionSoundRef.current = true;
      });
  }, []);

  const maybeNotifyMention = useCallback(
    (comment: CommentItem) => {
      if (!session?.user?.id) return;
      if (comment.userId === session.user.id) return;
      if (isMentionedInText(comment.text)) {
        playMentionSound();
        const shouldIncrementUnread = !(commentsPanelOpen && commentsView === "mentions");
        registerMention({
          commentId: comment.id,
          elementId: comment.elementId,
          incrementUnread: shouldIncrementUnread,
        });
      }
    },
    [commentsPanelOpen, commentsView, isMentionedInText, playMentionSound, registerMention, session?.user?.id]
  );

  const mentionFilteredItems = useMemo(
    () => items.filter((item) => isMentionedInText(item.text)),
    [isMentionedInText, items]
  );

  const elementScopedItems = useMemo(() => {
    if (!selectedElementId) return [];
    return items.filter((item) => item.elementId === selectedElementId);
  }, [items, selectedElementId]);

  const visibleItems = useMemo(() => {
    if (commentsView === "mentions") return mentionFilteredItems;
    if (commentsView === "element") {
      if (!selectedElementId) return [];
      return elementScopedItems;
    }
    return items;
  }, [commentsView, elementScopedItems, items, mentionFilteredItems, selectedElementId]);

  const upsertComment = (incoming: CommentItem) => {
    setItems((prev) => {
      const byId = prev.find((item) => item.id === incoming.id);
      if (byId) {
        const next = prev.map((item) =>
          item.id === incoming.id
            ? { ...incoming, pending: false, failed: false }
            : item
        );
        // Ensure a single instance per id.
        const firstIndex = next.findIndex((item) => item.id === incoming.id);
        return next.filter(
          (item, index) => item.id !== incoming.id || index === firstIndex
        );
      }

      const optimisticMatchIndex = prev.findIndex(
        (item) =>
          item.pending &&
          item.text === incoming.text &&
          item.elementId === incoming.elementId &&
          Math.abs(item.createdAt - incoming.createdAt) < 15000
      );

      if (optimisticMatchIndex >= 0) {
        const next = [...prev];
        next[optimisticMatchIndex] = { ...incoming, pending: false, failed: false };
        return next;
      }

      return [{ ...incoming, pending: false, failed: false }, ...prev];
    });
  };

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/rooms/${roomId}/comments`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { comments: CommentItem[] };
    const seen = new Set<string>();
    setItems(
      data.comments.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
    );
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!liveblocksRoom) return;
    const unsubscribe = (liveblocksRoom as unknown as {
      subscribe: (
        type: "event",
        cb: (payload: unknown) => void
      ) => (() => void) | void;
    }).subscribe("event", (payload) => {
      const event = (payload as { event?: unknown })?.event ?? payload;
      if (!event || typeof event !== "object") return;
      const e = event as
        | { type: "comment.created"; comment: CommentItem }
        | { type: "comment.updated"; comment: CommentItem }
        | { type: "comment.deleted"; id: string };

      if (e.type === "comment.created" && e.comment?.roomId === roomId) {
        upsertComment(e.comment);
        maybeNotifyMention(e.comment);
      } else if (e.type === "comment.updated" && e.comment?.roomId === roomId) {
        upsertComment(e.comment);
      } else if (e.type === "comment.deleted") {
        setItems((prev) => prev.filter((item) => item.id !== e.id));
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [liveblocksRoom, maybeNotifyMention, roomId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  useEffect(() => {
    const audio = new Audio(mentionSoundUrl);
    audio.preload = "auto";
    notificationAudioRef.current = audio;

    const retryPendingSound = () => {
      if (!pendingMentionSoundRef.current) return;
      playMentionSound();
    };

    window.addEventListener("pointerdown", retryPendingSound);
    window.addEventListener("keydown", retryPendingSound);

    return () => {
      window.removeEventListener("pointerdown", retryPendingSound);
      window.removeEventListener("keydown", retryPendingSound);
      audio.pause();
      notificationAudioRef.current = null;
      pendingMentionSoundRef.current = false;
    };
  }, [mentionSoundUrl, playMentionSound]);

  useEffect(() => {
    const key = `${MENTION_INBOX_STORAGE_PREFIX}${roomId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        unreadCount?: number;
        latestCommentId?: string | null;
        latestElementId?: string | null;
      };
      setMentionInboxState({
        unreadCount: parsed.unreadCount ?? 0,
        latestCommentId: parsed.latestCommentId ?? null,
        latestElementId: parsed.latestElementId ?? null,
      });
    } catch {
      // ignore invalid local storage
    }
  }, [roomId, setMentionInboxState]);

  useEffect(() => {
    const key = `${MENTION_INBOX_STORAGE_PREFIX}${roomId}`;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          unreadCount: mentionUnreadCount,
          latestCommentId: latestMentionCommentId,
          latestElementId: latestMentionElementId,
        })
      );
    } catch {
      // noop
    }
  }, [latestMentionCommentId, latestMentionElementId, mentionUnreadCount, roomId]);

  useEffect(() => {
    if (!commentsPanelOpen) return;
    if (commentsView !== "mentions") return;
    markMentionsRead();
  }, [commentsPanelOpen, commentsView, markMentionsRead]);

  const postComment = async (commentText: string, elementId: string | null) => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const now = Date.now();
    const tempId = `temp-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const selfId = (liveblocksRoom?.getSelf() as { id?: string } | null)?.id ?? "local";

    const optimistic: CommentItem = {
      id: tempId,
      roomId,
      userId: selfId,
      userName: "You",
      x: null,
      y: null,
      elementId,
      text: trimmed,
      resolved: false,
      createdAt: now,
      updatedAt: now,
      pending: true,
    };

    setItems((prev) => [optimistic, ...prev]);
    setText("");

    try {
      const res = await fetch(`/api/rooms/${roomId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          elementId,
        }),
      });
      if (!res.ok) throw new Error(`POST failed (${res.status})`);
      const data = (await res.json()) as { comment?: CommentItem };
      if (data.comment) {
        upsertComment(data.comment);
      }
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...item, pending: false, failed: true } : item
        )
      );
    }
  };

  const submitCurrentComment = async () => {
    if (!text.trim()) return;
    await postComment(text, activeReferenceElementId);
  };

  const jumpToLatestMention = () => {
    if (!latestMentionElementId) return;
    requestElementFocus(latestMentionElementId);
    setCommentsPanelOpen(true);
    setCommentsView("mentions");
  };

  const tabClass = (view: CommentsViewMode) =>
    `clay-btn clay-btn-ux px-2 py-1 text-[10px] border border-[var(--border-oat)] ${
      commentsView === view ? "clay-btn-active" : ""
    }`;

  const insertMention = useCallback(
    (name: string) => {
      const mentionToken = toMentionToken(name);
      if (!mentionToken) return;
      const token = `@${mentionToken}`;
      const next = text.replace(/@([a-zA-Z0-9._-]*)$/, token);
      setText(`${next} `);
      setMentionQuery("");
      setShowMentionPicker(false);
    },
    [text]
  );

  useEffect(() => {
    return () => {
      if (cameraAnimationRef.current !== null) {
        cancelAnimationFrame(cameraAnimationRef.current);
      }
    };
  }, []);

  const focusReferencedElement = useCallback(
    (elementId: string) => {
      const element = elements.find((el) => el.id === elementId);
      if (!element) return;
      const fallbackPosition = { x: element.x, y: element.y };

      const bounds = (() => {
        if (element.type === "line" || element.type === "arrow") {
          const minX = Math.min(element.x, element.x2);
          const minY = Math.min(element.y, element.y2);
          return {
            x: minX,
            y: minY,
            w: Math.max(1, Math.abs(element.x2 - element.x)),
            h: Math.max(1, Math.abs(element.y2 - element.y)),
          };
        }
        if ("width" in element && "height" in element) {
          return {
            x: element.x,
            y: element.y,
            w: Math.max(1, element.width),
            h: Math.max(1, element.height),
          };
        }
        if (element.type === "pen") {
          const points = element.outlinePoints ?? element.points;
          if (!points.length) return { x: element.x, y: element.y, w: 24, h: 24 };
          const xs = points.map((p) => p[0]);
          const ys = points.map((p) => p[1]);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
        }
        return { x: fallbackPosition.x, y: fallbackPosition.y, w: 24, h: 24 };
      })();

      const viewportWidth = Math.max(320, window.innerWidth - 360);
      const viewportHeight = Math.max(240, window.innerHeight - 120);
      const targetZoom = Math.min(
        3,
        Math.max(0.2, Math.min(viewportWidth / (bounds.w + 80), viewportHeight / (bounds.h + 80)))
      );
      const centerX = bounds.x + bounds.w / 2;
      const centerY = bounds.y + bounds.h / 2;

      setActiveTool("select");
      setSelectedElementIds([elementId]);
      setSelectedElementId(elementId);

      const targetCamera = {
        zoom: targetZoom,
        x: viewportWidth / 2 - centerX * targetZoom,
        y: viewportHeight / 2 - centerY * targetZoom,
      };
      const startCamera = useCanvasStore.getState().camera;
      const durationMs = 280;
      const startTime = performance.now();

      if (cameraAnimationRef.current !== null) {
        cancelAnimationFrame(cameraAnimationRef.current);
      }

      const animate = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        // easeOutCubic for a soft "stretch" feel
        const eased = 1 - Math.pow(1 - t, 3);
        setCamera({
          zoom: startCamera.zoom + (targetCamera.zoom - startCamera.zoom) * eased,
          x: startCamera.x + (targetCamera.x - startCamera.x) * eased,
          y: startCamera.y + (targetCamera.y - startCamera.y) * eased,
        });

        if (t < 1) {
          cameraAnimationRef.current = requestAnimationFrame(animate);
        } else {
          cameraAnimationRef.current = null;
        }
      };

      cameraAnimationRef.current = requestAnimationFrame(animate);
    },
    [elements, setActiveTool, setCamera, setSelectedElementId, setSelectedElementIds]
  );

  if (!commentsPanelOpen) {
    return (
      <button
        type="button"
        className="hidden sm:block fixed right-3 top-20 z-50 clay-card clay-card-dashed clay-btn clay-btn-ux px-3 py-2 text-xs"
        onClick={() => setCommentsPanelOpen(true)}
      >
        Open Comments
      </button>
    );
  }

  return (
    <aside className="fixed left-3 right-3 top-[6.3rem] bottom-3 sm:left-auto sm:right-3 sm:top-20 z-50 sm:w-[332px] sm:max-w-[calc(100vw-1.5rem)] clay-card clay-card-dashed p-3 text-xs overflow-hidden flex flex-col">
      <div className="flex items-start justify-between mb-2 pb-2 border-b border-dashed border-[var(--border-oat)]">
        <div>
          <div className="clay-kicker">Discussion</div>
          <div className="font-semibold text-[13px]">Comments</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <button type="button" className={tabClass("all")} onClick={() => setCommentsView("all")}>All</button>
            <button
              type="button"
              className={tabClass("element")}
              onClick={() => setCommentsView("element")}
              disabled={!selectedElementId}
            >
              This Element
            </button>
            <button type="button" className={tabClass("mentions")} onClick={() => setCommentsView("mentions")}>
              Mentions{mentionUnreadCount > 0 ? ` (${mentionUnreadCount})` : ""}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="clay-chip">
            {selectedElementId ? "Element Thread" : "Room Thread"}
          </div>
          <button
            type="button"
            className="clay-btn clay-btn-ux px-2 py-1 text-[10px]"
            onClick={jumpToLatestMention}
            disabled={!latestMentionElementId}
            aria-label="Jump to latest mention"
          >
            Jump
          </button>
          <button
            type="button"
            className="clay-btn clay-btn-ux px-2 py-1 text-[10px]"
            onClick={() => setCommentsPanelOpen(false)}
            aria-label="Hide comments panel"
          >
            Hide
          </button>
        </div>
      </div>

      <div className="space-y-2 overflow-auto flex-1 mb-2 pr-1 clay-scroll">
        {visibleItems.length === 0 ? (
          <div className="text-[11px] opacity-70 rounded-xl border border-dashed border-[var(--border-oat)] px-3 py-3 bg-[var(--surface-soft)]">
            {commentsView === "element" && !selectedElementId
              ? "Select an element to view its thread."
              : commentsView === "mentions"
                ? "No mentions yet."
                : "No comments yet. Mention collaborators with @name."}
          </div>
        ) : (
          visibleItems.map((item) => (
            <div key={item.id} className="border border-[var(--border-oat)] rounded-xl px-2.5 py-2 bg-[var(--surface-soft)] shadow-[var(--panel-shadow-soft)]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold">{item.userName}</div>
                <div className="text-[11px] opacity-70">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              {item.elementId && (
                <button
                  type="button"
                  className="mb-1 text-[10px] uppercase tracking-wider opacity-70 hover:opacity-100 underline underline-offset-2"
                  onClick={() => {
                    if (!item.elementId) return;
                    focusReferencedElement(item.elementId);
                  }}
                  aria-label={`Focus referenced element ${item.elementId.slice(0, 8)}`}
                >
                  Element: {item.elementId.slice(0, 8)}
                </button>
              )}
              <div className="leading-relaxed whitespace-pre-wrap break-words">{item.text}</div>
              {(item.pending || item.failed) && (
                <div className="mt-1 flex items-center gap-2">
                  {item.pending && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-oat)] bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)] animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
                      Sending...
                    </span>
                  )}
                  {item.failed && (
                    <>
                      <span className="text-[10px] text-red-500">Failed</span>
                      <button
                        type="button"
                        className="clay-btn clay-btn-ux px-1.5 py-0.5 text-[10px]"
                        onClick={() => {
                          setItems((prev) => prev.filter((it) => it.id !== item.id));
                          void postComment(item.text, item.elementId ?? null);
                        }}
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mb-2 min-h-6 pt-1">
        {activeReferenceElementId ? (
          <div
            role="button"
            tabIndex={0}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border-oat)] bg-[var(--surface)] px-2 py-0.5 text-[10px] hover:opacity-95 cursor-pointer"
            onClick={() => focusReferencedElement(activeReferenceElementId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                focusReferencedElement(activeReferenceElementId);
              }
            }}
            aria-label={`Focus referenced element ${activeReferenceElementId.slice(0, 8)}`}
          >
            <span className="uppercase tracking-wider opacity-70">Referencing</span>
            <span className="font-semibold">#{activeReferenceElementId.slice(0, 8)}</span>
            <button
              type="button"
              className="opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedElementId) {
                  setClearedReferenceSelectionId(selectedElementId);
                }
              }}
              aria-label="Clear referenced element"
            >
              x
            </button>
          </div>
        ) : (
          <div className="text-[10px] opacity-60">Posting to whole room.</div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-dashed border-[var(--border-oat)]">
        <input
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const mentionMatch = next.match(/@([a-zA-Z0-9._-]*)$/);
            if (mentionMatch) {
              setMentionQuery(mentionMatch[1] ?? "");
              setShowMentionPicker(true);
            } else {
              setShowMentionPicker(false);
            }
          }}
          onKeyDown={(e) => {
            if (showMentionPicker && mentionCandidates.length > 0 && e.key === "Tab") {
              e.preventDefault();
              insertMention(mentionCandidates[0]);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitCurrentComment();
            }
          }}
          placeholder={
            activeReferenceElementId
              ? "Comment on selected element..."
              : "Add global comment..."
          }
          className="flex-1 clay-input px-2 py-1"
        />
        <button
          className="clay-btn clay-btn-ux px-2 py-1"
          onClick={() => void submitCurrentComment()}
        >
          Add
        </button>
      </div>
      {showMentionPicker && mentionCandidates.length > 0 && (
        <div className="mt-2 clay-card clay-card-dashed p-2 text-[11px]">
          <div className="mb-1 opacity-70 clay-kicker">Mention someone</div>
          <div className="flex flex-wrap gap-1">
            {mentionCandidates.map((name) => (
              <button
                key={name}
                type="button"
                className="clay-btn clay-btn-ux px-2 py-1"
                onClick={() => insertMention(name)}
              >
                @{toMentionToken(name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
