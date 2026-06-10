import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface VerifyResult {
  verified: boolean;
  pointsAwarded: number;
}

/**
 * Selfie verification. The client uploads a selfie to the private `photos`
 * bucket and passes its storage path here. We run a (currently mocked)
 * liveness + face-match check, then flip the profile's `verified` flag and
 * award one-time points.
 *
 * TODO(provider): replace `runLivenessCheck` with a real liveness/face-match
 * provider (e.g. AWS Rekognition, FaceTec, Onfido). Compare the selfie against
 * the user's primary profile photo and require a passing liveness score.
 */
async function runLivenessCheck(_selfiePath: string): Promise<boolean> {
  // TODO(provider): real liveness/face-match. Mocked as always-pass for MVP.
  return true;
}

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { selfiePath: string }) => input)
  .handler(async ({ data, context }): Promise<VerifyResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const passed = await runLivenessCheck(data.selfiePath);
    if (!passed) return { verified: false, pointsAwarded: 0 };

    await supabaseAdmin
      .from("profiles")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", userId);

    let pointsAwarded = 0;
    const { error } = await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: "verified",
      points: 100,
      dedupe_key: "verified",
    });
    if (!error) pointsAwarded = 100;
    else if (error.code !== "23505") throw error;

    return { verified: true, pointsAwarded };
  });
