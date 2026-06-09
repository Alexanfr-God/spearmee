import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";

import { generateAiBaby } from "@/lib/ai-baby.functions";
import { Button } from "@/components/ui/button";

export function AiBabyDialog({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const callBaby = useServerFn(generateAiBaby);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [needPhotos, setNeedPhotos] = useState(false);

  const generate = async () => {
    setLoading(true);
    setNeedPhotos(false);
    try {
      const res = await callBaby({ data: { match_id: matchId } });
      if (res.ok) setImageUrl(res.image_url);
      else setNeedPhotos(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-[340px] rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("aiBaby.title")}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-secondary">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-6xl">👶</span>
          )}
        </div>
        {needPhotos && <p className="mt-3 text-sm text-destructive">{t("aiBaby.needPhotos")}</p>}
        <p className="mt-3 text-xs text-muted-foreground">{t("aiBaby.disclaimer")}</p>
        <Button className="mt-4 w-full" onClick={generate} disabled={loading}>
          {imageUrl ? t("aiBaby.again") : t("aiBaby.generate")}
        </Button>
      </div>
    </div>
  );
}