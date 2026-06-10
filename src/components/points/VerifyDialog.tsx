import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, ShieldCheck, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";
import { submitVerification } from "@/lib/verify.functions";
import { haptic } from "@/lib/telegram";

export function VerifyDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const { award } = usePoints();
  const callVerify = useServerFn(submitVerification);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onSelfie = async (file: File) => {
    if (!profile) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${profile.id}/verify/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
      if (upErr) throw upErr;

      const res = await callVerify({ data: { selfiePath: path } });
      if (res.verified) {
        haptic("success");
        await refreshProfile();
        // Reflect the awarded points in the pill (deduped server-side).
        await award("verified");
        toast.success(t("verify.success"));
        onClose();
      } else {
        haptic("error");
        toast.error(t("verify.failed"));
      }
    } catch (e) {
      console.error("[verify] failed", e);
      haptic("error");
      toast.error(t("verify.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-20">
      <div className="w-full max-w-[420px] rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("verify.title")}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t("verify.body")}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-foreground">
          <li>• {t("verify.tip1")}</li>
          <li>• {t("verify.tip2")}</li>
        </ul>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground active:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("verify.checking")}
            </>
          ) : (
            t("verify.takeSelfie")
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("verify.reward")}</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelfie(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
