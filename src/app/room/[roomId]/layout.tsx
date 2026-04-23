import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Room",
  description:
    "Collaborate in real-time on a freeform whiteboard with LaTeX math rendering.",
};

export default function RoomLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
