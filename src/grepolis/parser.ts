import type {
  Alliance,
  GrepolisServerId,
  GrepolisTables,
  Island,
  LoadSource,
  ParseDiagnostic,
  Player,
  Town,
  WorldData,
} from "../types/grepolis";
import { getTownSlotOffset } from "./offsets";

type TableName = keyof GrepolisTables;

interface Row {
  columns: string[];
  lineNumber: number;
  rawLine: string;
}

interface ParseContext {
  diagnostics: ParseDiagnostic[];
}

export function parseGrepolisTables(
  serverId: GrepolisServerId,
  tables: GrepolisTables,
  source: LoadSource = "manual-import",
): WorldData {
  const context: ParseContext = { diagnostics: [] };
  const alliances = parseAlliances(tables.alliances, context);
  const allianceById = new Map(alliances.map((alliance) => [alliance.id, alliance]));

  const players = parsePlayers(tables.players, allianceById, context);
  const playerById = new Map(players.map((player) => [player.id, player]));

  const islands = parseIslands(tables.islands, context);
  const islandByCoordinate = new Map(islands.map((island) => [`${island.x}:${island.y}`, island]));

  const towns = parseTowns(tables.towns, playerById, islandByCoordinate, context);

  return {
    serverId,
    loadedAt: new Date().toISOString(),
    source,
    diagnostics: context.diagnostics,
    alliances,
    players,
    islands,
    towns,
  };
}

function parseAlliances(input: string, context: ParseContext): Alliance[] {
  return rows(input, "alliances", context, 6).flatMap((row) => {
    const id = requiredNumber(row, "alliances", 0, "alliance id", context);
    const points = requiredNumber(row, "alliances", 2, "alliance points", context);
    const towns = requiredNumber(row, "alliances", 3, "alliance towns", context);
    const members = requiredNumber(row, "alliances", 4, "alliance members", context);
    const rank = requiredNumber(row, "alliances", 5, "alliance rank", context);

    if (id === null || points === null || towns === null || members === null || rank === null) {
      return [];
    }

    return [
      {
        id,
        name: decodeGrepolisText(row.columns[1], row, "alliances", context),
        points,
        towns,
        members,
        rank,
      },
    ];
  });
}

function parsePlayers(input: string, alliances: Map<number, Alliance>, context: ParseContext): Player[] {
  return rows(input, "players", context, 6).flatMap((row) => {
    const id = requiredNumber(row, "players", 0, "player id", context);
    const allianceId = optionalNumber(row, "players", 2, "player alliance id", context);
    const points = requiredNumber(row, "players", 3, "player points", context);
    const rank = requiredNumber(row, "players", 4, "player rank", context);
    const towns = requiredNumber(row, "players", 5, "player towns", context);

    if (id === null || points === null || rank === null || towns === null) {
      return [];
    }

    const alliance = allianceId === null ? null : alliances.get(allianceId) ?? null;
    if (allianceId !== null && !alliance) {
      addDiagnostic(context, "players", row, "warning", `Unknown alliance id ${allianceId} for player ${id}.`);
    }

    return [
      {
        id,
        name: decodeGrepolisText(row.columns[1], row, "players", context),
        allianceId,
        allianceName: alliance?.name ?? null,
        alliancePoints: alliance?.points ?? null,
        allianceRank: alliance?.rank ?? null,
        points,
        rank,
        towns,
      },
    ];
  });
}

function parseIslands(input: string, context: ParseContext): Island[] {
  return rows(input, "islands", context, 7).flatMap((row) => {
    const id = requiredNumber(row, "islands", 0, "island id", context);
    const x = requiredNumber(row, "islands", 1, "island x", context);
    const y = requiredNumber(row, "islands", 2, "island y", context);
    const type = requiredNumber(row, "islands", 3, "island type", context);
    const towns = requiredNumber(row, "islands", 4, "island towns", context);

    if (id === null || x === null || y === null || type === null || towns === null) {
      return [];
    }

    return [
      {
        id,
        x,
        y,
        type,
        towns,
        resourcePlus: row.columns[5] ?? "",
        resourceMinus: row.columns[6] ?? "",
      },
    ];
  });
}

function parseTowns(
  input: string,
  players: Map<number, Player>,
  islands: Map<string, Island>,
  context: ParseContext,
): Town[] {
  return rows(input, "towns", context, 7).flatMap((row) => {
    const id = requiredNumber(row, "towns", 0, "town id", context);
    const playerId = optionalNumber(row, "towns", 1, "town player id", context);
    const islandX = requiredNumber(row, "towns", 3, "town island x", context);
    const islandY = requiredNumber(row, "towns", 4, "town island y", context);
    const slot = requiredNumber(row, "towns", 5, "town slot", context);
    const points = requiredNumber(row, "towns", 6, "town points", context);

    if (id === null || islandX === null || islandY === null || slot === null || points === null) {
      return [];
    }

    const player = playerId === null ? null : players.get(playerId) ?? null;
    if (playerId !== null && !player) {
      addDiagnostic(context, "towns", row, "warning", `Unknown player id ${playerId} for town ${id}.`);
    }

    const island = islands.get(`${islandX}:${islandY}`) ?? null;
    if (!island) {
      addDiagnostic(context, "towns", row, "warning", `No island found at ${islandX}:${islandY} for town ${id}.`);
    }

    const offset = getTownSlotOffset(island?.type ?? null, slot);
    if (!offset) {
      addDiagnostic(
        context,
        "towns",
        row,
        "warning",
        `No slot offset found for island type ${island?.type ?? "unknown"} and slot ${slot}.`,
      );
    }

    return [
      {
        id,
        name: decodeGrepolisText(row.columns[2], row, "towns", context),
        playerId,
        playerName: player?.name ?? null,
        playerPoints: player?.points ?? null,
        playerRank: player?.rank ?? null,
        allianceId: player?.allianceId ?? null,
        allianceName: player?.allianceName ?? null,
        alliancePoints: player?.alliancePoints ?? null,
        allianceRank: player?.allianceRank ?? null,
        points,
        islandId: island?.id ?? null,
        islandX,
        islandY,
        islandType: island?.type ?? null,
        slot,
        x: islandX + (offset?.dx ?? 0.5),
        y: islandY + (offset?.dy ?? 0.5),
      },
    ];
  });
}

function rows(input: string, table: TableName, context: ParseContext, minColumns: number): Row[] {
  return input
    .split(/\r?\n/)
    .map((rawLine, index) => ({ rawLine, lineNumber: index + 1 }))
    .filter(({ rawLine }) => rawLine.trim() !== "")
    .flatMap(({ rawLine, lineNumber }) => {
      const columns = rawLine.trim().split(",");
      const row = { columns, lineNumber, rawLine };
      if (columns.length < minColumns) {
        addDiagnostic(
          context,
          table,
          row,
          "error",
          `Expected at least ${minColumns} columns, got ${columns.length}.`,
        );
        return [];
      }

      return [row];
    });
}

function requiredNumber(
  row: Row,
  table: TableName,
  index: number,
  label: string,
  context: ParseContext,
): number | null {
  const value = Number(row.columns[index]);
  if (!Number.isFinite(value)) {
    addDiagnostic(context, table, row, "error", `Invalid ${label}: "${row.columns[index] ?? ""}".`);
    return null;
  }

  return value;
}

function optionalNumber(
  row: Row,
  table: TableName,
  index: number,
  label: string,
  context: ParseContext,
): number | null {
  const text = row.columns[index] ?? "";
  if (text.trim() === "") {
    return null;
  }

  return requiredNumber(row, table, index, label, context);
}

function decodeGrepolisText(input = "", row: Row, table: TableName, context: ParseContext): string {
  try {
    return decodeURIComponent(input.replace(/\+/g, " "));
  } catch {
    addDiagnostic(context, table, row, "warning", `Could not decode text "${input}".`);
    return input;
  }
}

function addDiagnostic(
  context: ParseContext,
  table: TableName,
  row: Row,
  severity: "warning" | "error",
  message: string,
): void {
  context.diagnostics.push({
    table,
    line: row.lineNumber,
    severity,
    message,
    rawLine: row.rawLine,
  });
}
