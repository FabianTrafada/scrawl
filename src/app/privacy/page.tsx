import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Scrawl collects, uses, and protects account details, collaboration activity, and uploaded files.",
  alternates: {
    canonical: "/privacy",
  },
};

const lastUpdated = "April 17, 2026";

type SectionTone = "paper" | "matcha" | "slushie" | "lemon" | "ube" | "blueberry";

type PolicySection = {
  id: string;
  title: string;
  intro: string;
  tone: SectionTone;
  points: string[];
};

const sections: PolicySection[] = [
  {
    id: "what-we-collect",
    title: "What We Collect",
    intro:
      "We only collect data needed to run whiteboards, collaboration, and account access.",
    tone: "paper",
    points: [
      "Account details: your name, email, avatar, and linked sign-in provider details (for example Google or GitHub).",
      "Workspace data: room names, room membership, comments, and collaboration permissions.",
      "Content you create: whiteboard elements, uploaded images, and optional room checkpoints.",
      "Session and security data: session tokens, approximate device information, IP address, and user-agent for authentication and abuse prevention.",
    ],
  },
  {
    id: "how-we-use-data",
    title: "How We Use Data",
    intro: "Your data is used to operate the product and keep it safe.",
    tone: "matcha",
    points: [
      "Authenticate users and keep sessions active across visits.",
      "Enable real-time collaboration, room access control, and invite handling.",
      "Store and deliver uploaded whiteboard images and room state.",
      "Detect fraud, investigate misuse, and maintain service reliability.",
    ],
  },
  {
    id: "sharing-and-processors",
    title: "Sharing and Processors",
    intro:
      "We do not sell your personal data. We share it only with infrastructure providers that process data on our behalf.",
    tone: "slushie",
    points: [
      "Authentication providers: Google and GitHub for sign-in.",
      "Collaboration provider: Liveblocks for real-time room presence and synchronization.",
      "File storage provider: Cloudflare R2 for image uploads.",
      "Email provider: Resend for invite and transactional email delivery.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    intro: "We keep data for as long as it is needed for product functionality.",
    tone: "lemon",
    points: [
      "Account and room records are retained while your account and rooms remain active.",
      "Invite records and session records may be kept for security and audit trails.",
      "Uploaded files remain available until removed from their workspace or account context.",
      "Backup and log retention windows may persist for limited periods after deletion requests.",
    ],
  },
  {
    id: "your-controls",
    title: "Your Controls",
    intro: "You can manage visibility and access in product settings.",
    tone: "ube",
    points: [
      "Room owners can change room access, remove members, and stop sharing links.",
      "You can sign out at any time and unlink from active sessions.",
      "If you need account or data deletion assistance, contact privacy@scrawl.site.",
      "Where required by law, you may request access, correction, portability, or deletion of personal data.",
    ],
  },
  {
    id: "security-and-changes",
    title: "Security and Policy Changes",
    intro: "We apply technical and organizational safeguards, then update this page as the product evolves.",
    tone: "blueberry",
    points: [
      "Data access is restricted to authorized systems and personnel with a legitimate need.",
      "We use industry-standard encryption in transit and provider-level storage protections.",
      "No method of storage or transfer is perfectly secure, but we continuously improve controls.",
      "Material policy changes will be reflected by updating the Last Updated date on this page.",
    ],
  },
];

const lightToneHeading = "#17130f";
const lightToneBody = "#4b4439";
const lightToneKicker = "#70685f";

const toneStyles: Record<SectionTone, CSSProperties> = {
  paper: { background: "var(--surface)", color: "var(--foreground)" },
  matcha: { background: "#eaf9ef", color: lightToneHeading },
  slushie: { background: "#e9f9ff", color: lightToneHeading },
  lemon: { background: "#fff5db", color: lightToneHeading },
  ube: { background: "var(--color-ube-800)", color: "#ffffff" },
  blueberry: { background: "var(--color-blueberry-800)", color: "#ffffff" },
};

const darkTones = new Set<SectionTone>(["ube", "blueberry"]);

export default function PrivacyPolicyPage() {
  return (
    <main className="relative h-screen overflow-y-auto overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[12%] h-72 w-72 rounded-full bg-[var(--bg-spot-a)] blur-3xl" />
        <div className="absolute top-[20%] right-[8%] h-80 w-80 rounded-full bg-[var(--bg-spot-b)] blur-3xl" />
        <div className="absolute bottom-0 left-[28%] h-96 w-96 rounded-full bg-[var(--bg-spot-c)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="clay-chip">Scrawl Privacy</span>
          <Link
            href="/"
            className="clay-btn clay-btn-ux inline-flex items-center gap-2 rounded-full border border-[var(--border-oat)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold"
          >
            Back to Whiteboard
          </Link>
        </div>

        <section className="clay-card relative overflow-hidden rounded-[40px] border border-[var(--border-oat)] px-6 py-8 sm:px-10 sm:py-12">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--color-lemon-500)]/25 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-60 w-60 rounded-full bg-[var(--color-slushie-500)]/25 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="clay-kicker mb-3">Clear and Human</p>
              <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
                Privacy Policy
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--color-warm-charcoal)] sm:text-[18px]">
                Scrawl is built for sketching ideas, not harvesting personal data. This page explains
                what we collect, why we collect it, and how you can control it.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-dashed border-[var(--border-oat)] bg-[var(--surface)] p-4">
                <p className="clay-kicker">Last Updated</p>
                <p className="mt-1 text-[18px] font-semibold tracking-tight">{lastUpdated}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-oat)] bg-[var(--surface)] p-4">
                <p className="clay-kicker">Scope</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-warm-charcoal)]">
                  Applies to Scrawl web app, collaboration rooms, account sessions, and invite workflows.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="clay-card clay-card-dashed h-max rounded-[24px] border border-[var(--border-oat)] p-4 lg:sticky lg:top-6">
            <p className="clay-kicker mb-3">On This Page</p>
            <nav aria-label="Privacy policy sections" className="space-y-1.5">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-[13px] font-medium text-[var(--color-warm-charcoal)] transition-all hover:border-[var(--border-oat)] hover:bg-[var(--surface-soft)]"
                >
                  <span>{section.title}</span>
                  <span className="text-[11px] tracking-wide text-[var(--color-warm-silver)]">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-4">
            {sections.map((section, index) => {
              const isDark = darkTones.has(section.tone);
              const isPaper = section.tone === "paper";

              return (
                <section
                  id={section.id}
                  key={section.id}
                  className="clay-card scroll-mt-6 rounded-[28px] border border-[var(--border-oat)] px-5 py-6 sm:px-7 sm:py-7"
                  style={toneStyles[section.tone]}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[1.08px]"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.75)"
                        : isPaper
                          ? "var(--color-warm-silver)"
                          : lightToneKicker,
                    }}
                  >
                    Section {(index + 1).toString().padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 text-[clamp(1.5rem,3.2vw,2.15rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                    {section.title}
                  </h2>
                  <p
                    className="mt-3 text-[15px] leading-relaxed sm:text-[16px]"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.85)"
                        : isPaper
                          ? "var(--color-warm-charcoal)"
                          : lightToneBody,
                    }}
                  >
                    {section.intro}
                  </p>

                  <ul className="mt-4 space-y-2.5">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-[14px] leading-relaxed sm:text-[15px]">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isDark ? "bg-white/80" : "bg-[var(--color-matcha-600)]"}`}
                          aria-hidden="true"
                        />
                        <span
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.9)"
                              : isPaper
                                ? "var(--foreground)"
                                : lightToneHeading,
                          }}
                        >
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <section className="clay-card rounded-[28px] border border-dashed border-[var(--border-oat)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
              <p className="clay-kicker">Questions</p>
              <h2 className="mt-2 text-[clamp(1.35rem,3vw,1.9rem)] font-semibold leading-tight tracking-[-0.02em]">
                Contact and Notices
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-warm-charcoal)] sm:text-[16px]">
                For privacy requests or policy questions, contact
                <a
                  href="mailto:privacy@scrawl.site"
                  className="mx-1 inline-flex rounded-md border border-[var(--border-oat)] bg-[var(--surface-soft)] px-2 py-0.5 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                >
                  privacy@scrawl.site
                </a>
                and include the email address tied to your account.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-warm-silver)]">
                This document is provided for transparency and product operations. It is not legal advice.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
