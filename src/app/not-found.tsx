import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404: Not Found | Scrawl",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <main className="h-screen w-screen flex flex-col items-center justify-center p-6 bg-[var(--background)] relative overflow-hidden">
      {/* Decorative grid background to look like a whiteboard */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      ></div>

      <div className="relative z-10 w-full max-w-md mx-auto clay-card flex flex-col bg-[var(--surface)] rounded-[32px] p-10 text-center shadow-sm">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 mb-8 bg-[var(--background)] rounded-full flex items-center justify-center border border-dashed border-[var(--color-warm-silver)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-warm-silver)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>
          
          <h1 className="text-[36px] font-bold text-[var(--foreground)] tracking-tight mb-2">Room not found</h1>
          
          <p className="text-[15px] text-[var(--color-warm-silver)] font-medium leading-relaxed mb-10 px-2">
            The whiteboard you are looking for doesn't exist, has been deleted, or you don't have access to it.
          </p>
          
          <Link
            href="/"
            className="group flex items-center justify-center gap-2 px-6 py-4 w-full rounded-2xl bg-[var(--foreground)] text-[var(--on-foreground)] text-[15px] font-semibold hover:-translate-y-1 hover:shadow-[-4px_4px_0px_0px_var(--color-warm-silver)] active:translate-y-0 active:shadow-none transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
