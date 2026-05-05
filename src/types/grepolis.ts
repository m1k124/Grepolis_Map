export type GrepolisServerId = string;
export type LoadSource = "demo" | "manual-import" | "proxy" | "direct" | "snapshot";
export type DiagnosticSeverity = "warning" | "error";

export interface ParseDiagnostic {
  table: keyof GrepolisTables;
  line: number;
  severity: DiagnosticSeverity;
  message: string;
  rawLine?: string;
}

export interface Alliance {
  id: number;
  name: string;
  points: number;
  towns: number;
  members: number;
  rank: number;
}

export interface Player {
  id: number;
  name: string;
  allianceId: number | null;
  allianceName: string | null;
  alliancePoints: number | null;
  allianceRank: number | null;
  points: number;
  rank: number;
  towns: number;
}

export interface Island {
  id: number;
  x: number;
  y: number;
  type: number;
  towns: number;
  resourcePlus: string;
  resourceMinus: string;
}

export interface Town {
  id: number;
  name: string;
  playerId: number | null;
  playerName: string | null;
  playerPoints: number | null;
  playerRank: number | null;
  allianceId: number | null;
  allianceName: string | null;
  alliancePoints: number | null;
  allianceRank: number | null;
  points: number;
  islandId: number | null;
  islandX: number;
  islandY: number;
  islandType: number | null;
  slot: number;
  x: number;
  y: number;
}

export interface WorldData {
  serverId: GrepolisServerId;
  loadedAt: string;
  source: LoadSource;
  diagnostics: ParseDiagnostic[];
  alliances: Alliance[];
  players: Player[];
  islands: Island[];
  towns: Town[];
}

export interface WorldSnapshot {
  id: string;
  serverId: GrepolisServerId;
  loadedAt: string;
  source: LoadSource;
  world: WorldData;
}

export interface GrepolisTables {
  players: string;
  alliances: string;
  islands: string;
  towns: string;
}
