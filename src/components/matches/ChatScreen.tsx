import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Send, Languages, Baby, Lightbulb, Loader2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { translateMessage } from "@/lib/translate.functions";
import { generateIcebreakers } from "@/lib/icebreaker.functions";
import { haptic } from "@/lib/telegram";
import { Input } from "@/components/ui/input";
import { AiBabyDialog } from "@/components/matches/AiBabyDialog";

interface Msg {
  id: string;
  body: string;
  sender_id: string;
  created_at: string | null;
}

export function ChatScreen({ matchId, onBack }: { matchId: string; onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const callTranslate = useServerFn(translateMessage);
  const callIcebreakers = useServerFn(generateIcebreakers);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [otherName, setOtherName] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showBaby, setShowBaby] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [iceLoading, setIceLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: match } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .eq("id", matchId)
        .maybeSingle();
      if (match && profile) {
        const otherId = match.user_a === profile.id ? match.user_b : match.user_a;
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", otherId)
          .maybeSingle();
        setOtherName(p?.display_name ?? null);
      }
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
    })();

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, profile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || !profile) return;
    setText("");
    haptic("light");
    await supabase.from("messages").insert({ match_id: matchId, sender_id: profile.id, body });
  };

  const translate = async (m: Msg) => {
    if (translations[m.id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      return;
    }
    const res = await callTranslate({
      data: { message_id: m.id, target_lang: i18n.language },
    });
    setTranslations((prev) => ({ ...prev, [m.id]: res.text }));
  };

  const loadIcebreakers = async () => {
    if (iceLoading) return;
    haptic("light");
    setIceLoading(true);
    try {
      const res = await callIcebreakers({ data: { match_id: matchId } });
      setIcebreakers(res.suggestions ?? []);
    } catch {
      setIcebreakers([]);
    } finally {
      setIceLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-screen max-w-[420px] flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-3">
        <button onClick={onBack} className="rounded-full p-1 text-foreground">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="flex-1 truncate font-semibold text-foreground">{otherName}</span>
        <button
          onClick={() => setShowBaby(true)}
          className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
        >
          <Baby className="h-4 w-4" />
          {t("chat.aiBaby")}
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("chat.empty")}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === profile?.id;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm " +
                  (mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground border border-border")
                }
              >
                <p>{m.body}</p>
                {translations[m.id] && (
                  <p className={"mt-1 border-t pt-1 text-xs " + (mine ? "border-white/20 text-primary-foreground/80" : "border-border text-muted-foreground")}>
                    {translations[m.id]}
                  </p>
                )}
                {!mine && (
                  <button
                    onClick={() => translate(m)}
                    className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Languages className="h-3 w-3" />
                    {translations[m.id] ? t("chat.showOriginal") : t("chat.showTranslation")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Ice-breaker suggestions */}
      {icebreakers.length > 0 && (
        <div className="border-t border-border bg-card px-3 pt-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("chat.icebreakerTitle")}
            </span>
            <button
              onClick={() => setIcebreakers([])}
              className="rounded-full p-0.5 text-muted-foreground"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5 pb-1">
            {icebreakers.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  haptic("selection");
                  setText(s);
                  setIcebreakers([]);
                }}
                className="rounded-2xl bg-accent px-3 py-2 text-left text-sm text-accent-foreground active:scale-[0.99]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={loadIcebreakers}
          disabled={iceLoading}
          className="rounded-full bg-secondary p-2.5 text-secondary-foreground active:scale-95 disabled:opacity-60"
          aria-label={t("chat.icebreaker")}
        >
          {iceLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Lightbulb className="h-5 w-5" />
          )}
        </button>
        <Input
          value={text}
          placeholder={t("chat.placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="rounded-full bg-primary p-2.5 text-primary-foreground">
          <Send className="h-5 w-5" />
        </button>
      </div>

      {showBaby && <AiBabyDialog matchId={matchId} onClose={() => setShowBaby(false)} />}
    </div>
  );
}