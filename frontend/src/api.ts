import type { AskResponse, CompetitionGroup, GameSummary, MatchMeta } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getMatch(): Promise<MatchMeta> {
  const res = await fetch(`${BASE_URL}/match`);
  if (!res.ok) throw new Error("Failed to load match metadata");
  return res.json();
}

export async function selectMatch(
  competitionId: number,
  seasonId: number,
  matchId: number
): Promise<MatchMeta> {
  const res = await fetch(`${BASE_URL}/select-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      competition_id: competitionId,
      season_id: seasonId,
      match_id: matchId,
    }),
  });
  if (!res.ok) throw new Error("Failed to switch match");
  return res.json();
}

export async function getDefaultViz(): Promise<AskResponse> {
  const res = await fetch(`${BASE_URL}/default-viz`);
  if (!res.ok) throw new Error("Failed to load the default visualization");
  return res.json();
}

export async function getGames(): Promise<CompetitionGroup[]> {
  const res = await fetch(`${BASE_URL}/games`);
  if (!res.ok) throw new Error("Failed to load the games catalog");
  const body = await res.json();
  return body.groups;
}

export async function getSeasonGames(
  competitionId: number,
  seasonId: number
): Promise<GameSummary[]> {
  const res = await fetch(`${BASE_URL}/games/${competitionId}/${seasonId}`);
  if (!res.ok) throw new Error("Failed to load games for that season");
  const body = await res.json();
  return body.games;
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("Failed to get an answer from Copilot");
  return res.json();
}
