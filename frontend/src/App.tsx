import { useEffect, useRef, useState } from "react";
import { askQuestion, getDefaultViz, getMatch, selectMatch } from "./api";
import { Header } from "./components/Header";
import { ChatPanel } from "./components/ChatPanel";
import { VizCanvas } from "./components/VizCanvas";
import { GamesBrowser } from "./components/GamesBrowser";
import type { AskResponse, ChatMessage, MatchMeta } from "./types";

function App() {
  const [match, setMatch] = useState<MatchMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [current, setCurrent] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGames, setShowGames] = useState(false);
  const [switchingMatchId, setSwitchingMatchId] = useState<number | null>(null);
  const seeded = useRef(false);

  async function loadDefaultViz() {
    const res = await getDefaultViz();
    setCurrent(res);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: res.answer,
        hasVisualization: res.visualization.type !== "none",
      },
    ]);
  }

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    getMatch()
      .then(setMatch)
      .catch(() => setError("Could not reach the backend. Is it running on :8000?"));
    loadDefaultViz().catch(() =>
      setError("Could not reach the backend. Is it running on :8000?")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAsk(question: string) {
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: question }]);
    try {
      const res = await askQuestion(question);
      setCurrent(res);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: res.answer,
          hasVisualization: res.visualization.type !== "none",
        },
      ]);
    } catch {
      setError("Copilot couldn't answer that — check the backend logs.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectGame(competitionId: number, seasonId: number, matchId: number) {
    if (switchingMatchId !== null || matchId === match?.match_id) return;
    setSwitchingMatchId(matchId);
    setError(null);
    try {
      const meta = await selectMatch(competitionId, seasonId, matchId);
      setMatch(meta);
      setShowGames(false);
      setCurrent(null);
      setMessages([]);
      await loadDefaultViz();
    } catch {
      setError("Couldn't switch match — check the backend logs.");
    } finally {
      setSwitchingMatchId(null);
    }
  }

  return (
    <div className="app-shell">
      <Header match={match} onBrowseGames={() => setShowGames(true)} />
      <GamesBrowser
        open={showGames}
        onClose={() => setShowGames(false)}
        activeMatchId={match?.match_id ?? null}
        switchingMatchId={switchingMatchId}
        onSelect={handleSelectGame}
      />
      <div className="app-body">
        <ChatPanel messages={messages} loading={loading} onAsk={handleAsk} match={match} />
        <VizCanvas
          visualization={current?.visualization ?? null}
          stats={current?.stats ?? []}
          match={match}
        />
      </div>
      {error && <div className="chat-loading">{error}</div>}
    </div>
  );
}

export default App;
