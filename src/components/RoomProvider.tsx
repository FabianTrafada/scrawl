"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvasStore";

interface RoomProviderProps {
  roomId: string;
  children: React.ReactNode;
}

/**
 * Manages Liveblocks room lifecycle — enters on mount, leaves on unmount.
 * Wrap around Canvas + Toolbar when rendering a collaborative room.
 */
export default function RoomProvider({ roomId, children }: RoomProviderProps) {
  useEffect(() => {
    const { liveblocks } = useCanvasStore.getState();

    liveblocks.enterRoom(roomId);

    return () => {
      // In @liveblocks/zustand v3, we use leaveRoom() to clean up
      const currentLiveblocks = useCanvasStore.getState().liveblocks;
      if (currentLiveblocks && typeof currentLiveblocks.leaveRoom === 'function') {
        currentLiveblocks.leaveRoom();
      }
    };
  }, [roomId]);

  return <>{children}</>;
}
