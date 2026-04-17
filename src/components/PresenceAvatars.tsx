"use client";

import { getDefaultAvatarUrlFromUser } from "@/lib/avatar";
import { useCanvasStore } from "@/store/canvasStore";

const AVATAR_COLORS = [
  "#078a52",
  "#3bd3fd",
  "#fbbd41",
  "#43089f",
  "#fc7981",
  "#01418d",
  "#ef6d00",
  "#8b5cf6",
];

/**
 * Shows small avatar bubbles for other connected users.
 * Positioned in the top-right of the screen.
 */
export default function PresenceAvatars() {
  const others = useCanvasStore((s) => s.liveblocks.others);
  const activePresenterId = useCanvasStore((s) => s.activePresenterId);

  if (!others || others.length === 0) return null;

  // Deduplicate users based on their user ID (or connection ID if anonymous)
  const uniqueOthers = [];
  const seenIds = new Set();
  
  for (const other of others) {
    const idToTrack = other.id ?? other.connectionId;
    if (!seenIds.has(idToTrack)) {
      seenIds.add(idToTrack);
      uniqueOthers.push(other);
    }
  }

  return (
    <div
      className="clay-card clay-card-dashed px-2 py-1.5 rounded-full flex items-center max-w-[38vw] sm:max-w-none overflow-hidden"
      aria-label={`${uniqueOthers.length} other user${uniqueOthers.length > 1 ? "s" : ""} connected`}
    >
      {uniqueOthers.slice(0, 5).map((other, i) => {
        const info = other.info as
          | { name?: string; avatar?: string; email?: string }
          | undefined;
        const name = info?.name ?? "Someone";
        const avatar = info?.avatar;
        const fallbackAvatar = getDefaultAvatarUrlFromUser({
          id: other.id,
          email: info?.email,
          name,
        });
        const avatarSrc = avatar || fallbackAvatar;
        // Use a consistent color based on user ID or name length so it doesn't change randomly
        const colorIndex = (other.id ? other.id.length : name.length) % AVATAR_COLORS.length;
        const color = AVATAR_COLORS[colorIndex];
        const initials = name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div
            key={other.connectionId}
            title={name}
            className="relative -ml-2 first:ml-0 w-8 h-8 rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-[11px] font-semibold text-[var(--on-accent)] select-none shadow-[rgba(0,0,0,0.16)_0px_2px_6px]"
            style={{ backgroundColor: color, zIndex: 5 - i }}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={name}
                className="w-full h-full rounded-full object-cover border border-transparent"
              />
            ) : (
              initials
            )}
            {other.id === activePresenterId && (
              <span className="absolute -bottom-1 -right-1 text-[9px] px-1 rounded bg-[var(--color-slushie-500)] text-white shadow-[rgba(0,0,0,0.2)_0px_1px_2px]">
                Live
              </span>
            )}
          </div>
        );
      })}
      {uniqueOthers.length > 5 && (
        <div
          className="-ml-2 w-8 h-8 rounded-full border-2 border-[var(--surface)] bg-[var(--color-warm-charcoal)] flex items-center justify-center text-[11px] font-semibold text-[var(--on-accent)] select-none shadow-[rgba(0,0,0,0.16)_0px_2px_6px]"
          style={{ zIndex: 0 }}
        >
          +{uniqueOthers.length - 5}
        </div>
      )}
    </div>
  );
}
