// Shared option value lists used across onboarding, preferences and resonance.
// Values are stable identifiers; human labels come from i18n: options.<group>.<value>.

export const GENDERS = ["male", "female", "other"] as const;
export const EYE_COLORS = ["brown", "blue", "green", "hazel", "gray", "dark"] as const;
export const HAIR_COLORS = ["black", "brown", "blonde", "red", "gray", "other"] as const;
export const HAIR_TYPES = ["straight", "wavy", "curly", "coily"] as const;
export const BODY_TYPES = ["slim", "athletic", "average", "curvy", "plus"] as const;
export const ETHNICITIES = [
  "east_asian",
  "south_asian",
  "southeast_asian",
  "white",
  "black",
  "hispanic",
  "middle_eastern",
  "mixed",
  "other",
] as const;
export const WANTS_CHILDREN = ["yes", "open", "unsure", "no"] as const;
export const CHILDREN_TIMELINE = ["within_1y", "1_3y", "someday", "undecided"] as const;
export const HAS_CHILDREN = ["none", "has"] as const;
export const RELATIONSHIP_GOAL = ["marriage", "serious", "coparenting", "open"] as const;
export const SMOKING = ["never", "sometimes", "regularly"] as const;
export const DRINKING = ["never", "sometimes", "often"] as const;
export const RELIGION = [
  "none",
  "christian",
  "muslim",
  "jewish",
  "hindu",
  "buddhist",
  "spiritual",
  "other",
] as const;
export const DIET = ["omnivore", "vegetarian", "vegan", "halal", "kosher", "other"] as const;
export const EXERCISE = ["never", "sometimes", "often", "daily"] as const;
export const WANTS_MARRIAGE = ["yes", "open", "no"] as const;
export const WILLING_TO_RELOCATE = ["yes", "maybe", "no"] as const;
export const EDUCATION = [
  "high_school",
  "college",
  "bachelor",
  "master",
  "phd",
  "other",
] as const;

export type OptionGroup =
  | "gender"
  | "eye_color"
  | "hair_color"
  | "hair_type"
  | "body_type"
  | "ethnicity"
  | "wants_children"
  | "children_timeline"
  | "has_children"
  | "relationship_goal"
  | "smoking"
  | "drinking"
  | "religion"
  | "diet"
  | "exercise"
  | "wants_marriage"
  | "willing_to_relocate"
  | "education";

export const OPTION_GROUPS: Record<OptionGroup, readonly string[]> = {
  gender: GENDERS,
  eye_color: EYE_COLORS,
  hair_color: HAIR_COLORS,
  hair_type: HAIR_TYPES,
  body_type: BODY_TYPES,
  ethnicity: ETHNICITIES,
  wants_children: WANTS_CHILDREN,
  children_timeline: CHILDREN_TIMELINE,
  has_children: HAS_CHILDREN,
  relationship_goal: RELATIONSHIP_GOAL,
  smoking: SMOKING,
  drinking: DRINKING,
  religion: RELIGION,
  diet: DIET,
  exercise: EXERCISE,
  wants_marriage: WANTS_MARRIAGE,
  willing_to_relocate: WILLING_TO_RELOCATE,
  education: EDUCATION,
};