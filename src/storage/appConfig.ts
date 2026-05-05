import type { TownSelection } from "../domain/filters";
import { normalizeSeaIds, type SeaId } from "../domain/seas";
import type { WorldData } from "../types/grepolis";
import { normalizeSelections } from "./localStore";

export interface AppConfigExport {
  schemaVersion: 1;
  exportedAt: string;
  serverId: string;
  showAllTowns: boolean;
  showGhosts: boolean;
  selectedSeas: SeaId[];
  selections: TownSelection[];
  world: WorldMetadata | null;
}

export interface WorldMetadata {
  serverId: string;
  loadedAt: string;
  source: string;
  alliances: number;
  players: number;
  islands: number;
  towns: number;
  diagnostics: number;
}

export function createAppConfigExport(input: {
  serverId: string;
  showAllTowns: boolean;
  showGhosts: boolean;
  selectedSeas: SeaId[];
  selections: TownSelection[];
  world: WorldData | null;
}): AppConfigExport {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    serverId: input.serverId,
    showAllTowns: input.showAllTowns,
    showGhosts: input.showGhosts,
    selectedSeas: normalizeSeaIds(input.selectedSeas),
    selections: normalizeSelections(input.selections),
    world: input.world ? createWorldMetadata(input.world) : null,
  };
}

export function parseAppConfigJson(text: string): AppConfigExport {
  const parsed = JSON.parse(text) as Partial<AppConfigExport>;
  return normalizeAppConfig(parsed);
}

export function encodeAppConfig(config: AppConfigExport): string {
  const bytes = new TextEncoder().encode(JSON.stringify(config));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeAppConfig(value: string): AppConfigExport {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return parseAppConfigJson(new TextDecoder().decode(bytes));
}

export function configFromUrl(url: URL): AppConfigExport | null {
  const encoded = url.searchParams.get("config");
  if (!encoded) {
    return null;
  }

  return decodeAppConfig(encoded);
}

function normalizeAppConfig(config: Partial<AppConfigExport>): AppConfigExport {
  return {
    schemaVersion: 1,
    exportedAt: typeof config.exportedAt === "string" ? config.exportedAt : new Date().toISOString(),
    serverId: typeof config.serverId === "string" && config.serverId ? config.serverId : "fr114",
    showAllTowns: config.showAllTowns ?? true,
    showGhosts: config.showGhosts ?? true,
    selectedSeas: normalizeSeaIds((config.selectedSeas ?? []) as string[]),
    selections: normalizeSelections((config.selections ?? []) as TownSelection[]),
    world: config.world ?? null,
  };
}

function createWorldMetadata(world: WorldData): WorldMetadata {
  return {
    serverId: world.serverId,
    loadedAt: world.loadedAt,
    source: world.source,
    alliances: world.alliances.length,
    players: world.players.length,
    islands: world.islands.length,
    towns: world.towns.length,
    diagnostics: world.diagnostics.length,
  };
}
