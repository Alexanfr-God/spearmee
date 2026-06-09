import { supabase } from "@/integrations/supabase/client";

export function ageFromBirthDate(birth?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function distanceKm(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null,
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const signedCache = new Map<string, { url: string; expires: number }>();

/** Create signed URLs for private photo paths, with a small in-memory cache. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const now = Date.now();
  const toFetch: string[] = [];
  for (const p of paths) {
    const cached = signedCache.get(p);
    if (cached && cached.expires > now) out[p] = cached.url;
    else toFetch.push(p);
  }
  if (toFetch.length > 0) {
    const { data } = await supabase.storage
      .from("photos")
      .createSignedUrls(toFetch, 60 * 60);
    for (const item of data ?? []) {
      if (item.signedUrl && item.path) {
        out[item.path] = item.signedUrl;
        signedCache.set(item.path, {
          url: item.signedUrl,
          expires: now + 55 * 60 * 1000,
        });
      }
    }
  }
  return out;
}

export async function signedUrl(path: string): Promise<string | null> {
  const map = await signedUrls([path]);
  return map[path] ?? null;
}

export async function logPremiumIntent(
  profileId: string,
  eventType: string,
  context?: Record<string, unknown>,
) {
  await supabase.from("premium_intent_events").insert({
    profile_id: profileId,
    event_type: eventType,
    context: context ?? null,
  });
}