import type { Profile } from "@/hooks/useAuth";

/** Fields that count toward a "complete" profile (drives points + UX nudges). */
const REQUIRED_FIELDS: (keyof Profile)[] = [
  "display_name",
  "birth_date",
  "gender",
  "height_cm",
  "wants_children",
  "relationship_goal",
  "city",
  "bio",
];

export function profileCompletePercent(profile: Profile | null): number {
  if (!profile) return 0;
  let filled = 0;
  for (const f of REQUIRED_FIELDS) {
    const v = profile[f];
    if (v !== null && v !== undefined && v !== "") filled++;
  }
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

export function isProfileComplete(profile: Profile | null): boolean {
  return profileCompletePercent(profile) === 100;
}