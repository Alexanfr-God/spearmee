import { cn } from "@/lib/utils";

/**
 * Spearmee logomark — a stylized sperm whose body forms an "S".
 * Fixed brand-blue gradient (consistent in light & dark, like the source logo).
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Spearmee"
      className={className}
    >
      <defs>
        <linearGradient
          id="spearmee-mark"
          x1="18"
          y1="6"
          x2="46"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5b8cff" />
          <stop offset="1" stopColor="#2b4fd6" />
        </linearGradient>
      </defs>
      {/* tail — an S-shaped swim path */}
      <path
        d="M41 19c0 9-19 9-19 20 0 8.5 13 9.5 14 17.5"
        stroke="url(#spearmee-mark)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* head */}
      <ellipse
        cx="42.5"
        cy="15.5"
        rx="10.5"
        ry="8"
        transform="rotate(-20 42.5 15.5)"
        fill="url(#spearmee-mark)"
      />
    </svg>
  );
}

/** Wordmark in the brand sans (matches the source logo); inherits currentColor. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-sans font-semibold tracking-tight", className)}>Spearmee</span>;
}

/** Full lockup: logomark + wordmark, sized off the mark. */
export function Logo({
  size = 40,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span style={{ fontSize: Math.round(size * 0.62) }}>
          <Wordmark />
        </span>
      )}
    </span>
  );
}
