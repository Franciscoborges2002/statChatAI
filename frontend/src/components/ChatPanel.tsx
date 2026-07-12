import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChartSpline, SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatMessage, MatchMeta } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onAsk: (question: string) => void;
  onCancel: () => void;
  match: MatchMeta | null;
}

export function ChatPanel({ messages, loading, onAsk, onCancel, match }: Props) {
  const [input, setInput] = useState("");
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Compare xG by team",
    match ? `${match.home_team} pass network` : "Pass network",
    "Narrate the match",
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages.length, loading, reduceMotion]);

  function submit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onAsk(trimmed);
    setInput("");
  }

  const enter = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  return (
    <Card className="flex min-h-0 flex-col gap-3 py-5">
      <CardHeader className="px-4">
        <CardTitle className="text-[15px]">Match chat</CardTitle>
        <CardDescription className="text-xs">
          {match ? `Ask about ${match.home_team} vs ${match.away_team}` : "Ask about the match"}
        </CardDescription>
      </CardHeader>
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) =>
            m.role === "system" ? (
              <motion.div
                key={m.id}
                {...enter}
                className="self-center rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground"
              >
                {m.text}
              </motion.div>
            ) : (
              <motion.div
                key={m.id}
                {...enter}
                className={cn(
                  "max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "self-end rounded-br-sm bg-primary text-primary-foreground"
                    : "self-start rounded-bl-sm border bg-secondary/50"
                )}
              >
                {m.text}
                {m.hasVisualization && (
                  <Badge variant="outline" className="mt-2 flex gap-1 text-muted-foreground">
                    <ChartSpline aria-hidden="true" />
                    chart rendered →
                  </Badge>
                )}
              </motion.div>
            )
          )}
          {loading && (
            <motion.div
              key="thinking"
              {...enter}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              className="flex items-center gap-2 self-start px-3.5 py-1 text-[13px] italic text-muted-foreground"
            >
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-muted-foreground"
                    animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </span>
              Copilot is querying events…
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[11px] not-italic text-muted-foreground hover:text-foreground"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4">
        {suggestedQuestions.map((q) => (
          <Button
            key={q}
            variant="outline"
            size="sm"
            className="h-7 rounded-full text-xs font-normal text-muted-foreground hover:text-foreground"
            onClick={() => onAsk(q)}
            disabled={loading}
          >
            {q}
          </Button>
        ))}
      </div>

      <form
        className="mx-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          placeholder="Ask about the match…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          aria-label="Ask about the match"
          className="rounded-full px-4"
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-full"
          disabled={loading || !input.trim()}
          aria-label="Send question"
        >
          <SendHorizontal aria-hidden="true" />
        </Button>
      </form>
    </Card>
  );
}
