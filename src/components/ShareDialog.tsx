"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanvasStore } from "@/store/canvasStore";

interface Member {
  id: string;
  access: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

interface PendingInvite {
  id: string;
  email: string;
  access: string;
}

interface ShareData {
  id: string;
  name: string;
  isOwner: boolean;
  defaultAccess?: string;
  owner?: { id: string; name: string | null; email: string | null; image: string | null };
  members?: Member[];
  pendingInvites?: PendingInvite[];
}

interface ShareDialogProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareDialog({ roomId, open, onClose }: ShareDialogProps) {
  const router = useRouter();
  const setShareDialogOpen = useCanvasStore((s) => s.setShareDialogOpen);
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState<"edit" | "view">("edit");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const fetchShare = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/share`);
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${roomId}/share`);
        if (res.ok && active) {
          setData(await res.json());
        }
        if (active) setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [open, roomId]);

  const handleCloseRoom = async () => {
    if (closing) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        toast.success(data?.isOwner ? "Room closed successfully" : "Left room successfully");
        setShareDialogOpen(false);
        router.push("/");
      } else {
        toast.error("Failed to close/leave room");
      }
      setClosing(false);
    } catch {
      toast.error("Network error while trying to close/leave room");
      setClosing(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);

    try {
      const res = await fetch(`/api/rooms/${roomId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), access: inviteAccess }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to send invite");
      } else {
        toast.success(`Invite sent to ${inviteEmail.trim()}`);
        setInviteEmail("");
        fetchShare();
      }
      setSending(false);
    } catch {
      toast.error("Network error while sending invite");
      setSending(false);
    }
  };

  const handleAccessChange = async (newAccess: string) => {
    try {
      await fetch(`/api/rooms/${roomId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAccess: newAccess }),
      });
      toast.success("Link access updated");
      fetchShare();
    } catch {
      toast.error("Failed to update link access");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await fetch(`/api/rooms/${roomId}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      toast.success("Member removed");
      fetchShare();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => {
          setShareDialogOpen(false);
          onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setShareDialogOpen(false);
            onClose();
          }
        }}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-[var(--surface)] border border-[var(--border-oat)] rounded-2xl shadow-xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Share</h2>
          <button
            onClick={() => {
              setShareDialogOpen(false);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--background)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-oat)] hover:bg-[var(--background)] transition-colors cursor-pointer text-left"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          <span className="text-sm font-medium">Copy room link</span>
        </button>

        {/* Default access */}
        {data?.isOwner && data.defaultAccess !== undefined && (
          <div className="mb-4">
            <label htmlFor="default-access-select" className="text-xs font-medium text-[var(--color-warm-silver)] uppercase tracking-wider mb-1.5 block">
              Anyone with the link
            </label>
            <select
              id="default-access-select"
              value={data.defaultAccess}
              onChange={(e) => handleAccessChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-oat)] bg-[var(--input-bg)] text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-slushie-500)]"
            >
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
              <option value="none">No access</option>
            </select>
          </div>
        )}

        {/* Invite by email */}
        {data?.isOwner && (
          <div className="mb-4">
            <label htmlFor="invite-email-input" className="text-xs font-medium text-[var(--color-warm-silver)] uppercase tracking-wider mb-1.5 block">
              Invite by email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="invite-email-input"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-oat)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-slushie-500)]"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={inviteAccess}
                  onChange={(e) => setInviteAccess(e.target.value as "edit" | "view")}
                  className="flex-1 sm:flex-none px-2 py-2 rounded-lg border border-[var(--border-oat)] bg-[var(--input-bg)] text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-slushie-500)]"
                >
                  <option value="edit">Edit</option>
                  <option value="view">View</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={sending || !inviteEmail.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--foreground)] text-[var(--on-foreground)] text-sm font-medium disabled:opacity-40 cursor-pointer hover:bg-[var(--color-warm-charcoal)] transition-colors"
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members */}
        {loading && (
          <div className="flex flex-col gap-3 mt-4">
            <Skeleton className="h-4 w-20 mb-2" />
            {["skeleton-1", "skeleton-2"].map((key) => (
              <div key={key} className="flex items-center gap-3 py-2">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/3 mb-1.5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {data?.isOwner && data.owner && data.members && data.pendingInvites && (
          <div>
            {/* Owner */}
            <div className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-[var(--foreground)] flex items-center justify-center text-[var(--on-foreground)] text-xs font-semibold shrink-0">
                {(data.owner.name ?? "O")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{data.owner.name ?? "Owner"}</p>
                <p className="text-xs text-[var(--color-warm-silver)] truncate">{data.owner.email}</p>
              </div>
              <span className="text-xs text-[var(--color-warm-silver)] font-medium">Owner</span>
            </div>

            {/* Members */}
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <div
                  className="w-8 h-8 rounded-full bg-[var(--color-ube-800)] flex items-center justify-center text-[var(--on-accent)] text-xs font-semibold shrink-0"
                >
                  {(m.user.name ?? "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user.name ?? "User"}</p>
                  <p className="text-xs text-[var(--color-warm-silver)] truncate">{m.user.email}</p>
                </div>
                <span className="text-xs text-[var(--color-warm-silver)]">{m.access}</span>
                <button
                  onClick={() => handleRemoveMember(m.id)}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  aria-label={`Remove ${m.user.name}`}
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Pending invites */}
            {data.pendingInvites.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--color-warm-silver)] uppercase tracking-wider mt-3 mb-1">
                  Pending invites
                </p>
                {data.pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--border-oat)] flex items-center justify-center text-[var(--color-warm-charcoal)] text-xs font-semibold shrink-0">
                      @
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{inv.email}</p>
                    </div>
                    <span className="text-xs text-[var(--color-warm-silver)]">{inv.access}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Danger Zone (Leave / Close Room) */}
        {data && (
          <div className="mt-8 pt-4 border-t border-red-100 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
            <p className="text-xs text-red-500 mb-2">
              {data.isOwner 
                ? "Closing the room kicks everyone out and revokes all link access."
                : "Leaving the room will remove your access until you are re-invited."}
            </p>
            <button
              onClick={handleCloseRoom}
              disabled={closing}
              className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {closing ? "..." : (data.isOwner ? "Close Room for Everyone" : "Leave Room")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
