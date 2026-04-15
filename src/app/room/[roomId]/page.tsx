"use client";

import { use, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import RoomProvider from "@/components/RoomProvider";
import Toolbar from "@/components/Toolbar";
import LatexCheatsheet from "@/components/LatexCheatsheet";

const Canvas = dynamic(() => import("@/components/Canvas"), { ssr: false });
const LiveCursors = dynamic(() => import("@/components/LiveCursors"), {
  ssr: false,
});

function RoomToaster() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      if (success === "invite_accepted") {
        toast.success("Invite Accepted", {
          description: "You've successfully joined the room.",
        });
      } else if (success === "invite_already_accepted") {
        toast.info("Already Joined", {
          description: "You've already accepted this invite.",
        });
      }
      
      const params = new URLSearchParams(searchParams.toString());
      params.delete("success");
      const newSearch = params.toString();
      router.replace(newSearch ? `?${newSearch}` : window.location.pathname);
    }
  }, [searchParams, router]);

  return null;
}

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = use(params);

  return (
    <RoomProvider roomId={roomId}>
      <main
        className="h-screen w-screen relative"
        role="application"
        aria-label="Scrawl collaborative whiteboard"
      >
        <Suspense fallback={null}>
          <RoomToaster />
        </Suspense>
        <Canvas roomId={roomId} />
        <LiveCursors />
        <Toolbar />
        <LatexCheatsheet />
        <footer className="hidden sm:block fixed bottom-4 left-4 z-50 text-[12px] text-[var(--color-warm-silver)] select-none pointer-events-none tracking-wide">
          <span className="font-semibold text-[var(--color-warm-charcoal)]">
            Scrawl
          </span>
          {" · "}
          Room: {roomId.slice(0, 8)}&hellip;
        </footer>
      </main>
    </RoomProvider>
  );
}
