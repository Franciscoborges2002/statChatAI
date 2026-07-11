import { useEffect, useState } from "react";
import { getGames, getSeasonGames } from "../api";
import type { CompetitionGroup, GameSummary } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  activeMatchId: number | null;
  switchingMatchId: number | null;
  onSelect: (competitionId: number, seasonId: number, matchId: number) => void;
}

export function GamesBrowser({ open, onClose, activeMatchId, switchingMatchId, onSelect }: Props) {
  const [groups, setGroups] = useState<CompetitionGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set());
  const [openSeason, setOpenSeason] = useState<string | null>(null);
  const [games, setGames] = useState<Record<string, GameSummary[]>>({});
  const [seasonLoading, setSeasonLoading] = useState<string | null>(null);
  const [seasonError, setSeasonError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || groups) return;
    getGames()
      .then(setGroups)
      .catch(() => setError("Couldn't load the games catalog — is the backend running?"));
  }, [open, groups]);

  if (!open) return null;

  function toggleGroup(competitionId: number) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(competitionId)) next.delete(competitionId);
      else next.add(competitionId);
      return next;
    });
  }

  async function toggleSeason(competitionId: number, seasonId: number) {
    const key = `${competitionId}-${seasonId}`;
    if (openSeason === key) {
      setOpenSeason(null);
      return;
    }
    setOpenSeason(key);
    setSeasonError(null);
    if (games[key]) return;
    setSeasonLoading(key);
    try {
      const items = await getSeasonGames(competitionId, seasonId);
      setGames((prev) => ({ ...prev, [key]: items }));
    } catch {
      setSeasonError("Couldn't load this season's games.");
    } finally {
      setSeasonLoading(null);
    }
  }

  return (
    <div className="games-overlay" onClick={onClose}>
      <aside className="games-drawer panel" onClick={(e) => e.stopPropagation()}>
        <div className="games-drawer-header">
          <div>
            <div className="viz-title">Available games</div>
            <div className="viz-subtitle">StatsBomb open data · grouped by competition</div>
          </div>
          <button className="games-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="games-drawer-body">
          {!groups && !error && <div className="chat-loading">Loading games…</div>}
          {error && <div className="chat-loading">{error}</div>}
          {groups?.map((group) => {
            const expanded = openGroups.has(group.competition_id);
            return (
              <div key={group.competition_id} className="games-group">
                <button className="games-group-header" onClick={() => toggleGroup(group.competition_id)}>
                  <span className="games-chevron">{expanded ? "▾" : "▸"}</span>
                  <span className="games-group-name">{group.competition_name}</span>
                  {group.country_name && (
                    <span className="games-group-country">{group.country_name}</span>
                  )}
                  <span className="games-group-count">
                    {group.seasons.length} season{group.seasons.length === 1 ? "" : "s"}
                  </span>
                </button>
                {expanded &&
                  group.seasons.map((season) => {
                    const key = `${group.competition_id}-${season.season_id}`;
                    const seasonOpen = openSeason === key;
                    return (
                      <div key={season.season_id} className="games-season">
                        <button
                          className="games-season-header"
                          onClick={() => toggleSeason(group.competition_id, season.season_id)}
                        >
                          <span className="games-chevron">{seasonOpen ? "▾" : "▸"}</span>
                          {season.season_name}
                        </button>
                        {seasonOpen && (
                          <div className="games-list">
                            {seasonLoading === key && (
                              <div className="chat-loading">Loading games…</div>
                            )}
                            {seasonError && seasonLoading !== key && !games[key] && (
                              <div className="chat-loading">{seasonError}</div>
                            )}
                            {games[key]?.map((game) => {
                              const isActive = game.match_id === activeMatchId;
                              const isSwitching = game.match_id === switchingMatchId;
                              return (
                                <button
                                  key={game.match_id}
                                  className={isActive ? "games-item active" : "games-item"}
                                  disabled={isActive || switchingMatchId !== null}
                                  onClick={() =>
                                    onSelect(group.competition_id, season.season_id, game.match_id)
                                  }
                                >
                                  <span className="games-item-date">{game.match_date}</span>
                                  <span className="games-item-teams">
                                    {game.home_team} {game.home_score}–{game.away_score}{" "}
                                    {game.away_team}
                                  </span>
                                  {game.stage && (
                                    <span className="games-item-stage">{game.stage}</span>
                                  )}
                                  {isActive && <span className="games-item-loaded">Loaded</span>}
                                  {isSwitching && (
                                    <span className="games-item-loaded">Loading…</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
