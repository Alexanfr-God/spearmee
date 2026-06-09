import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { signedUrls } from "@/lib/helpers";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface PhotoRow {
  id: string;
  storage_path: string;
  position: number;
  url?: string;
}

export function PhotosStep({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("photos")
      .select("id, storage_path, position")
      .eq("profile_id", userId)
      .order("position", { ascending: true });
    const rows = (data ?? []) as PhotoRow[];
    const urls = await signedUrls(rows.map((r) => r.storage_path));
    setPhotos(rows.map((r) => ({ ...r, url: urls[r.storage_path] })));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = async (file: File) => {
    if (photos.length >= 6) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;
      const position = photos.length;
      await supabase.from("photos").insert({ profile_id: userId, storage_path: path, position });
      haptic("success");
      await load();
    } catch (e) {
      console.error("[photos] upload failed", e);
      haptic("error");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (p: PhotoRow) => {
    await supabase.from("photos").delete().eq("id", p.id);
    await supabase.storage.from("photos").remove([p.storage_path]);
    haptic("light");
    await load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("onboarding.photos.hint")}</p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary">
            {p.url && <img src={p.url} alt="" className="h-full w-full object-cover" />}
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {t("onboarding.photos.primary")}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(p)}
              className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground",
              "active:bg-accent",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span className="text-xs">{t("onboarding.photos.add")}</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("onboarding.photos.faceTip")}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}