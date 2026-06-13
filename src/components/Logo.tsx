import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

// Wave keyframes for the swimming tail. Each has the same path-command
// structure (M + one multi-segment cubic) so it can be interpolated smoothly.
const TAIL = [
  "M41 19c0 9-19 9-19 20 0 8.5 13 9.5 14 17.5",
  "M41 19c0 9-23 8-18 20 5 9 11 11 12 17.5",
  "M41 19c0 9-15 10-20 20 -5 8 17 8 16 17.5",
];

/**
 * Spearmee logomark — a stylized sperm whose body forms an "S".
 * When `animated`, the tail undulates in place (a gentle swim). Fixed
 * brand-blue gradient, consistent in light & dark like the source logo.
 */
export function LogoMark({
  size = 40,
  animated = true,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const swim = animated && !reduce;
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
      {/* tail — swims in place */}
      <motion.path
        d={TAIL[0]}
        stroke="url(#spearmee-mark)"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
        animate={swim ? { d: [TAIL[0], TAIL[1], TAIL[2], TAIL[0]] } : undefined}
        transition={swim ? { duration: 1.7, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      {/* head — gentle bob */}
      <motion.ellipse
        cx="42.5"
        cy="15.5"
        rx="10.5"
        ry="8"
        transform="rotate(-20 42.5 15.5)"
        fill="url(#spearmee-mark)"
        animate={swim ? { cy: [15.5, 14, 15.5] } : undefined}
        transition={swim ? { duration: 1.7, repeat: Infinity, ease: "easeInOut" } : undefined}
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
  animated = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} animated={animated} />
      {showWordmark && (
        <span style={{ fontSize: Math.round(size * 0.62) }}>
          <Wordmark />
        </span>
      )}
    </span>
  );
}
