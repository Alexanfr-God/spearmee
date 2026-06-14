/** Perk catalog — costs in Resonance Points (RP). RP = in-app perks only (no crypto). */
export const PERK_COSTS = {
  extra_picks: 60,
  boost: 100,
  reveal_likers: 80,
} as const;

/** Hours that "see who liked you" stays unlocked after redeeming. */
export const REVEAL_HOURS = 24;

/** How many fresh candidates an "extra picks" redemption appends. */
export const EXTRA_PICKS_AMOUNT = 5;

/** Earn-multiplier tiers: spend RP for a multiplier on all RP earnings for N days. */
export const MULTIPLIER_TIERS = [
  { value: 1.2, cost: 100, days: 7 },
  { value: 1.5, cost: 300, days: 7 },
  { value: 2.0, cost: 700, days: 7 },
] as const;

export type PerkKey = keyof typeof PERK_COSTS;
