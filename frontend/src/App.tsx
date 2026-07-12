import { useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const seeded = useRef(false);
  const askControllerRef = useRef<AbortController | null>(null);

  async function loadDefaultViz() {
    const res = await getDefaultViz();
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
  }

  async function loadInitialData() {
    try {
      await Promise.all([getMatch().then(setMatch), loadDefaultViz()]);
      setInitialLoadFailed(false);
      setError(null);
    } catch {
      setInitialLoadFailed(true);
      setError("Could not reach the backend. Is it running on :8000?");
    }
  }

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAsk(question: string) {
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: question }]);
    const controller = new AbortController();
    askControllerRef.current = controller;
    try {
      const res = await askQuestion(question, controller.signal);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setError(
        message === "Question canceled." || message === "Copilot took too long to respond — please try again."
          ? message
          : "Copilot couldn't answer that — check the backend logs."
      );
    } finally {
      setLoading(false);
      askControllerRef.current = null;
    }
  }

  function handleCancelAsk() {
    askControllerRef.current?.abort();
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
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "system",
          text: `Switched to ${meta.home_team} vs ${meta.away_team}`,
        },
      ]);
      await loadDefaultViz();
    } catch {
      setError("Couldn't switch match — check the backend logs.");
    } finally {
      setSwitchingMatchId(null);
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[1440px] flex-col gap-4 p-4">
      <Header match={match} onBrowseGames={() => setShowGames(true)} />
      <GamesBrowser
        open={showGames}
        onClose={() => setShowGames(false)}
        activeMatchId={match?.match_id ?? null}
        activeCompetitionId={match?.competition_id ?? null}
        activeSeasonId={match?.season_id ?? null}
        switchingMatchId={switchingMatchId}
        onSelect={handleSelectGame}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(340px,420px)_1fr] grid-rows-1 gap-4 max-lg:grid-cols-1 max-lg:grid-rows-[minmax(0,45dvh)_minmax(0,1fr)]">
        <ChatPanel
          messages={messages}
          loading={loading}
          onAsk={handleAsk}
          onCancel={handleCancelAsk}
          match={match}
        />
        <VizCanvas
          visualization={current?.visualization ?? null}
          stats={current?.stats ?? []}
          match={match}
          loading={loading || switchingMatchId !== null}
        />
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive-foreground"
        >
          <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          {initialLoadFailed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 border-destructive/50 text-xs text-destructive-foreground hover:bg-destructive/10"
              onClick={loadInitialData}
            >
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
