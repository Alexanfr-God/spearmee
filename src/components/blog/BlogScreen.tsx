import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  title: string | null;
  body_markdown: string | null;
  cover_image: string | null;
}

export function BlogScreen() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Article | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, body_markdown, cover_image")
        .order("published_at", { ascending: false });
      setArticles((data ?? []) as Article[]);
      setLoading(false);
    })();
  }, []);

  if (open) {
    return (
      <div className="px-4 pt-4">
        <button onClick={() => setOpen(null)} className="mb-3 flex items-center gap-1 text-sm text-primary">
          <ChevronLeft className="h-4 w-4" /> {t("tabs.blog")}
        </button>
        {open.cover_image && (
          <img src={open.cover_image} alt="" className="mb-3 aspect-video w-full rounded-2xl object-cover" />
        )}
        <h1 className="text-xl font-bold text-foreground">{open.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{open.body_markdown}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-2xl font-bold text-foreground">{t("blog.title")}</h1>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">{t("blog.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setOpen(a)}
                className="w-full overflow-hidden rounded-2xl border border-border bg-card text-left active:bg-accent"
              >
                {a.cover_image && <img src={a.cover_image} alt="" className="aspect-video w-full object-cover" />}
                <div className="p-3">
                  <p className="font-semibold text-foreground">{a.title}</p>
                  {a.body_markdown && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body_markdown}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}