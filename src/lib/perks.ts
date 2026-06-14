/** Perk catalog — costs in Resonance Points (RP). RP = in-app perks only (no crypto). */
export const PERK_COSTS = {
  extra_picks: 60,
  boost: 100,
} as const;

/** How many fresh candidates an "extra picks" redemption appends. */
export const EXTRA_PICKS_AMOUNT = 5;

export type PerkKey = keyof typeof PERK_COSTS;
