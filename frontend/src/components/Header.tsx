import type { MatchMeta } from "../types";

interface Props {
  match: MatchMeta | null;
  onBrowseGames: () => void;
}

export function Header({ match, onBrowseGames }: Props) {
  return (
    <header className="header-bar">
      <span className="header-icon" role="img" aria-label="football">
        ⚽
      </span>
      <div>
        <div className="header-title">Stat Chat AI</div>
        {match && (
          <div className="header-match">
            {match.home_team} {match.home_score}–{match.away_score} {match.away_team} ·{" "}
            {match.competition} {match.season}
          </div>
        )}
      </div>
      <div className="header-spacer" />
      <button className="header-chip header-btn" onClick={onBrowseGames}>
        <span role="img" aria-label="list">
          📋
        </span>
        Browse games
      </button>
      <div className="header-chip">
        <span role="img" aria-label="clock">
          ⏱
        </span>
        {match ? `Full match replay · ${match.match_date}` : "Loading match…"}
      </div>
    </header>
  );
}
