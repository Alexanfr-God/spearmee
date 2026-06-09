import { supabase } from "@/integrations/supabase/client";
export { ageFromBirthDate, distanceKm } from "@/lib/calc";

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
    context: (context ?? null) as never,
  });
}