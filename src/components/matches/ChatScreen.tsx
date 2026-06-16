import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Send, Languages, Baby, Lightbulb, Loader2, X, Globe } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";
import { translateMessage } from "@/lib/translate.functions";
import { generateIcebreakers } from "@/lib/icebreaker.functions";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { VerifiedBadge } from "@/components/points/VerifiedBadge";
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
  const { award } = usePoints();
  const callTranslate = useServerFn(translateMessage);
  const callIcebreakers = useServerFn(generateIcebreakers);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [otherName, setOtherName] = useState<string | null>(null);
  const [otherVerified, setOtherVerified] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [autoTranslate, setAutoTranslate] = useState(false);
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
          .select("display_name, verified")
          .eq("id", otherId)
          .maybeSingle();
        setOtherName(p?.display_name ?? null);
        setOtherVerified(p?.verified ?? false);
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

  // Auto-translate: when on, translate every incoming message into my language.
  useEffect(() => {
    if (!autoTranslate || !profile) return;
    for (const m of messages) {
      if (m.sender_id !== profile.id && !translations[m.id]) {
        void callTranslate({ data: { message_id: m.id, target_lang: i18n.language } })
          .then((res) => setTranslations((prev) => ({ ...prev, [m.id]: res.text })))
          .catch(() => {});
      }
    }
    // translations is intentionally omitted to avoid a re-run loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTranslate, messages, profile, i18n.language]);

  const send = async () => {
    const body = text.trim();
    if (!body || !profile) return;
    setText("");
    haptic("light");
    await supabase.from("messages").insert({ match_id: matchId, sender_id: profile.id, body });
    void award("send_message");
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
      <header className="flex items-center gap-2 border-b border-border bg-card/90 px-2 py-3 backdrop-blur">
        <button onClick={onBack} className="rounded-full p-1 text-foreground active:scale-90">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="flex flex-1 items-center gap-1 truncate font-semibold text-foreground">
          <span className="truncate">{otherName}</span>
          {otherVerified && <VerifiedBadge size={16} className="shrink-0" />}
        </span>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            haptic("selection");
            setAutoTranslate((v) => !v);
          }}
          aria-label={t("chat.autoTranslate")}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
            autoTranslate
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          <Languages className="h-4 w-4" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowBaby(true)}
          className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
        >
          <Baby className="h-4 w-4" />
          {t("chat.aiBaby")}
        </motion.button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("chat.empty")}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === profile?.id;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-[var(--shadow-soft)]",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-card text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <AnimatePresence initial={false}>
                  {translations[m.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "mt-1.5 flex gap-1.5 overflow-hidden border-t pt-1.5 text-xs",
                        mine
                          ? "border-white/25 text-primary-foreground/85"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <Globe className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                      <span className="whitespace-pre-wrap break-words">{translations[m.id]}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!mine && (
                  <button
                    onClick={() => translate(m)}
                    className="mt-1.5 flex items-center gap-1 text-xs font-medium"
                    style={{ color: "var(--primary)" }}
                  >
                    <Languages className="h-3 w-3" />
                    {translations[m.id] ? t("chat.showOriginal") : t("chat.showTranslation")}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Ice-breaker suggestions */}
      <AnimatePresence>
        {icebreakers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="border-t border-border bg-card px-3 pt-2"
          >
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
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    haptic("selection");
                    setText(s);
                    setIcebreakers([]);
                    void award("icebreaker_used");
                  }}
                  className="rounded-2xl bg-accent px-3 py-2 text-left text-sm text-accent-foreground"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={loadIcebreakers}
          disabled={iceLoading}
          className="rounded-full bg-secondary p-2.5 text-secondary-foreground disabled:opacity-60"
          aria-label={t("chat.icebreaker")}
        >
          {iceLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Lightbulb className="h-5 w-5" />
          )}
        </motion.button>
        <Input
          value={text}
          placeholder={t("chat.placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={send}
          className="rounded-full bg-primary p-2.5 text-primary-foreground"
          aria-label={t("chat.send")}
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>

      {showBaby && (
        <AiBabyDialog
          matchId={matchId}
          partnerName={otherName ?? undefined}
          onClose={() => setShowBaby(false)}
        />
      )}
    </div>
  );
}
