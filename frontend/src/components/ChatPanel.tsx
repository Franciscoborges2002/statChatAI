import { useState } from "react";
import type { ChatMessage, MatchMeta } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onAsk: (question: string) => void;
  match: MatchMeta | null;
}

export function ChatPanel({ messages, loading, onAsk, match }: Props) {
  const [input, setInput] = useState("");

  const suggestedQuestions = [
    "Compare xG by team",
    match ? `${match.home_team} pass network` : "Pass network",
    "Narrate the match",
  ];

  function submit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onAsk(trimmed);
    setInput("");
  }

  return (
    <section className="panel chat-panel">
      <div className="chat-messages">
        {messages.map((m) => (
          <div className={`chat-message ${m.role}`} key={m.id}>
            {m.text}
            {m.hasVisualization && <div className="viz-chip">rendered →</div>}
          </div>
        ))}
        {loading && <div className="chat-loading">Copilot is querying events…</div>}
      </div>

      <div className="suggested-pills">
        {suggestedQuestions.map((q) => (
          <button key={q} className="pill-btn" onClick={() => onAsk(q)} disabled={loading}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          placeholder="Ask about the match…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          disabled={loading}
        />
        <button className="send-btn" onClick={submit} disabled={loading || !input.trim()} aria-label="Send">
          ➤
        </button>
      </div>
    </section>
  );
}
