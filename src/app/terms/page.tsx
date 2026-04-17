import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The public Terms of Service for Scrawl, including account rules, content rights, acceptable use, and collaboration responsibilities.",
  alternates: {
    canonical: "/terms",
  },
};

const effectiveDate = "April 17, 2026";
const termsVersion = "v1.0";

type SectionTone = "paper" | "matcha" | "slushie" | "lemon" | "ube" | "blueberry";

type TermsSection = {
  id: string;
  title: string;
  summary: string;
  tone: SectionTone;
  clauses: string[];
};

const termsSections: TermsSection[] = [
  {
    id: "acceptance",
    title: "Acceptance and Scope",
    summary: "Using Scrawl means you agree to these Terms and to our published policy updates.",
    tone: "paper",
    clauses: [
      "These Terms apply when you access the Scrawl web app, open rooms, or collaborate with invited members.",
      "If you use Scrawl on behalf of an organization, you confirm you have authority to bind that organization.",
      "If you do not agree to these Terms, you must stop using the service.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and Eligibility",
    summary: "You are responsible for account access, sign-in security, and activity under your profile.",
    tone: "matcha",
    clauses: [
      "You must provide accurate sign-in details and keep your authentication credentials secure.",
      "You are responsible for all actions taken through your account, including room sharing and invite actions.",
      "Anonymous sessions may have limited recovery options until linked to a full account.",
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration Responsibilities",
    summary: "Room owners control access settings and are responsible for how shared spaces are managed.",
    tone: "slushie",
    clauses: [
      "Room owners can grant, change, or revoke member access and link-based permissions.",
      "Invites are intended for the specified recipient and can expire or be revoked.",
      "Do not share confidential or restricted content with people who are not authorized to view it.",
    ],
  },
  {
    id: "content-rights",
    title: "Content Ownership and License",
    summary: "You keep ownership of your content, while granting Scrawl a limited license to run the service.",
    tone: "lemon",
    clauses: [
      "You retain rights to whiteboard content, comments, uploads, and room artifacts you create.",
      "You grant Scrawl a non-exclusive license to host, process, transmit, and display content for product operation.",
      "You confirm that content uploaded to Scrawl does not violate law, third-party rights, or contractual obligations.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    summary: "Scrawl is for productive collaboration, not abuse, disruption, or unauthorized data extraction.",
    tone: "ube",
    clauses: [
      "Do not attempt to disrupt infrastructure, bypass access controls, or interfere with other users.",
      "Do not upload malware, deceptive content, unlawful material, or content that infringes intellectual property.",
      "Do not scrape, harvest, or export data from rooms you do not own or have permission to access.",
    ],
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    summary: "Scrawl relies on integrated providers for auth, collaboration sync, storage, and transactional email.",
    tone: "blueberry",
    clauses: [
      "Authentication: Google and GitHub sign-in flows are governed in part by their own terms and policies.",
      "Real-time collaboration: Liveblocks powers synchronized presence and room event delivery.",
      "Storage and email: Cloudflare R2 stores uploads and Resend is used for invite and transactional messages.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension, Termination, and Changes",
    summary: "We may limit access for abuse or legal risk, and we can update these Terms as Scrawl evolves.",
    tone: "paper",
    clauses: [
      "We may suspend or terminate access when accounts violate these Terms or create security risk.",
      "We may remove content when required by law, safety obligations, or platform integrity needs.",
      "Updated Terms become effective when published, and continued use after publication means acceptance.",
    ],
  },
];

const toneCardStyles: Record<SectionTone, CSSProperties> = {
  paper: { background: "var(--surface)", color: "var(--foreground)" },
  matcha: { background: "#eaf9ef", color: "#17130f" },
  slushie: { background: "#e9f9ff", color: "#17130f" },
  lemon: { background: "#fff5db", color: "#17130f" },
  ube: { background: "var(--color-ube-800)", color: "#ffffff" },
  blueberry: { background: "var(--color-blueberry-800)", color: "#ffffff" },
};

const toneTextStyles: Record<
  SectionTone,
  {
    kicker: string;
    heading: string;
    summary: string;
    clause: string;
    dot: string;
  }
> = {
  paper: {
    kicker: "var(--color-warm-silver)",
    heading: "var(--foreground)",
    summary: "var(--color-warm-charcoal)",
    clause: "var(--foreground)",
    dot: "var(--color-matcha-600)",
  },
  matcha: {
    kicker: "#687167",
    heading: "#17130f",
    summary: "#47443b",
    clause: "#17130f",
    dot: "#078a52",
  },
  slushie: {
    kicker: "#67717a",
    heading: "#17130f",
    summary: "#47443b",
    clause: "#17130f",
    dot: "#0089ad",
  },
  lemon: {
    kicker: "#786743",
    heading: "#17130f",
    summary: "#4e4430",
    clause: "#17130f",
    dot: "#d08a11",
  },
  ube: {
    kicker: "rgba(255, 255, 255, 0.75)",
    heading: "#ffffff",
    summary: "rgba(255, 255, 255, 0.88)",
    clause: "rgba(255, 255, 255, 0.92)",
    dot: "rgba(255, 255, 255, 0.85)",
  },
  blueberry: {
    kicker: "rgba(255, 255, 255, 0.75)",
    heading: "#ffffff",
    summary: "rgba(255, 255, 255, 0.88)",
    clause: "rgba(255, 255, 255, 0.92)",
    dot: "rgba(255, 255, 255, 0.85)",
  },
};

const promises = [
  "You own your work",
  "Access controls stay visible",
  "Policy updates stay public",
];

export default function TermsPage() {
  return (
    <main className="relative h-screen overflow-y-auto overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-[10%] h-72 w-72 rounded-full bg-[var(--bg-spot-a)] blur-3xl" />
        <div className="absolute top-[18%] right-[7%] h-80 w-80 rounded-full bg-[var(--bg-spot-b)] blur-3xl" />
        <div className="absolute bottom-0 left-[32%] h-96 w-96 rounded-full bg-[var(--bg-spot-c)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="clay-chip">Scrawl Terms</span>
          <Link
            href="/"
            className="clay-btn clay-btn-ux inline-flex items-center gap-2 rounded-full border border-[var(--border-oat)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold"
          >
            Back to Whiteboard
          </Link>
        </div>

        <section className="clay-card relative overflow-hidden rounded-[40px] border border-[var(--border-oat)] px-6 py-8 sm:px-10 sm:py-12">
          <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[var(--color-slushie-500)]/25 blur-3xl" />
          <div className="absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-[var(--color-lemon-500)]/25 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="clay-kicker mb-3">Public Legal Terms</p>
              <h1 className="text-[clamp(2.45rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
                Terms of Service
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--color-warm-charcoal)] sm:text-[18px]">
                These Terms explain how Scrawl can be used, what responsibilities apply to
                collaboration rooms, and how rights and limits are handled on the platform.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-dashed border-[var(--border-oat)] bg-[var(--surface)] p-4">
                <p className="clay-kicker">Effective</p>
                <p className="mt-1 text-[18px] font-semibold tracking-tight">{effectiveDate}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-oat)] bg-[var(--surface)] p-4">
                <p className="clay-kicker">Version</p>
                <p className="mt-1 text-[18px] font-semibold tracking-tight">{termsVersion}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-oat)] bg-[var(--surface)] p-4">
                <p className="clay-kicker">Applies To</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-warm-charcoal)]">
                  All public Scrawl usage, including accounts, rooms, invites, and shared uploads.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap gap-2">
            {promises.map((promise) => (
              <span
                key={promise}
                className="inline-flex items-center rounded-full border border-[var(--border-oat)] bg-[var(--surface)] px-3 py-1 text-[12px] font-semibold text-[var(--color-warm-charcoal)]"
              >
                {promise}
              </span>
            ))}
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="clay-card clay-card-dashed h-max rounded-[24px] border border-[var(--border-oat)] p-4 lg:sticky lg:top-6">
            <p className="clay-kicker mb-3">On This Page</p>
            <nav aria-label="Terms of Service sections" className="space-y-1.5">
              {termsSections.map((section, index) => (
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

            <div className="mt-4 rounded-xl border border-[var(--border-oat)] bg-[var(--surface-soft)] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[1.08px] text-[var(--color-warm-silver)]">
                Legal Contact
              </p>
              <a
                href="mailto:legal@scrawl.site"
                className="mt-1 inline-flex text-[13px] font-semibold text-[var(--foreground)] underline decoration-[var(--border-oat)] underline-offset-3"
              >
                legal@scrawl.site
              </a>
            </div>
          </aside>

          <div className="space-y-4">
            {termsSections.map((section, index) => {
              const palette = toneTextStyles[section.tone];

              return (
                <section
                  id={section.id}
                  key={section.id}
                  className="clay-card scroll-mt-6 rounded-[28px] border border-[var(--border-oat)] px-5 py-6 sm:px-7 sm:py-7"
                  style={toneCardStyles[section.tone]}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[1.08px]"
                    style={{ color: palette.kicker }}
                  >
                    Section {(index + 1).toString().padStart(2, "0")}
                  </p>
                  <h2
                    className="mt-2 text-[clamp(1.5rem,3.2vw,2.15rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
                    style={{ color: palette.heading }}
                  >
                    {section.title}
                  </h2>
                  <p
                    className="mt-3 text-[15px] leading-relaxed sm:text-[16px]"
                    style={{ color: palette.summary }}
                  >
                    {section.summary}
                  </p>

                  <ul className="mt-4 space-y-2.5">
                    {section.clauses.map((clause) => (
                      <li key={clause} className="flex items-start gap-2.5 text-[14px] leading-relaxed sm:text-[15px]">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: palette.dot }}
                          aria-hidden="true"
                        />
                        <span style={{ color: palette.clause }}>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <section className="clay-card rounded-[28px] border border-dashed border-[var(--border-oat)] bg-[var(--surface)] px-5 py-6 sm:px-7 sm:py-7">
              <p className="clay-kicker">Disclaimer</p>
              <h2 className="mt-2 text-[clamp(1.35rem,3vw,1.9rem)] font-semibold leading-tight tracking-[-0.02em]">
                Warranty and Liability Limits
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-warm-charcoal)] sm:text-[16px]">
                Scrawl is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent
                permitted by law, Scrawl disclaims implied warranties and is not liable for indirect,
                incidental, special, consequential, or punitive damages.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-warm-silver)]">
                This page is published for transparency and operational clarity. It is not legal advice.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
