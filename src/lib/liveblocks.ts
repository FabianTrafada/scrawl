import { createClient } from "@liveblocks/client";

export const liveblocksClient = createClient({
  authEndpoint: async (room) => {
    const response = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room }),
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.replace("/?error=room_access_denied");
        }
      }
      throw new Error(`Unauthorized: ${response.status} returned by POST /api/liveblocks-auth`);
    }

    return await response.json();
  },
});
