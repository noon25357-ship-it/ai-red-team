import { site } from "@/lib/site";

/** The mark is the staircase: three steps and a signal at the top. */
export function Mark({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M2 21h6v-6h6V9h5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
      <rect x="17" y="3" width="6" height="6" fill="var(--color-signal)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark />
      <span className="wordmark" lang="en">
        {site.name}
      </span>
    </span>
  );
}

/** The brand full stop: a square of signal, identical in every script. */
export function SignalDot() {
  return <span className="signal-dot" aria-hidden="true" />;
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={`arrow rtl:-scale-x-100 ${className}`} aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
