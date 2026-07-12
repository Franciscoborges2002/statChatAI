export interface Shot {
  player: string;
  team: string;
  minute: number;
  x: number;
  y: number;
  xg: number;
  outcome: "goal" | "saved" | "off_t";
  outcome_detail: string;
  body_part: string;
  technique: string;
}

export interface PassNetworkNode {
  player: string;
  x: number;
  y: number;
  passes: number;
}

export interface PassNetworkEdge {
  source: string;
  target: string;
  count: number;
}

export interface MomentumPoint {
  minute: number;
  team: string;
  value: number;
}

export interface RadarMetric {
  metric: string;
  value: number;
  max: number;
}

export type VisualizationType =
  | "shot_map"
  | "pass_network"
  | "momentum"
  | "player_radar"
  | "none";

export interface Visualization {
  type: VisualizationType;
  title: string;
  data: {
    shots?: Shot[];
    team?: string;
    nodes?: PassNetworkNode[];
    edges?: PassNetworkEdge[];
    series?: MomentumPoint[];
    goals?: { minute: number; team: string; player: string }[];
    metrics?: RadarMetric[];
    [key: string]: unknown;
  };
}

export interface StatCard {
  label: string;
  value: string;
}

export interface AskResponse {
  answer: string;
  visualization: Visualization;
  stats: StatCard[];
}

export interface MatchMeta {
  match_id: number;
  competition_id: number;
  season_id: number;
  competition: string;
  season: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  match_date: string;
  stadium: string;
}

export interface SeasonRef {
  season_id: number;
  season_name: string;
  year: number;
}

export interface CompetitionGroup {
  competition_id: number;
  competition_name: string;
  country_name: string | null;
  seasons: SeasonRef[];
}

export interface GameSummary {
  match_id: number;
  match_date: string | null;
  kick_off: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  stage: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  hasVisualization?: boolean;
}
