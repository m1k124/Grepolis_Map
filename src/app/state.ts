import { createDefaultSelections } from "../domain/selections";
import type { TownSelection } from "../domain/filters";
import type { SeaId } from "../domain/seas";
import type { GrepolisServerId, WorldData } from "../types/grepolis";
import type { CachedWorldTables } from "../storage/worldCache";

export interface AppState {
  serverId: GrepolisServerId;
  world: WorldData | null;
  worldCache: CachedWorldTables | null;
  worldLoadedFromCache: boolean;
  selections: TownSelection[];
  selectedSeas: SeaId[];
  showAllTowns: boolean;
  showGhosts: boolean;
  searchQuery: string;
  status: string;
  isLoading: boolean;
}

export function createInitialState(): AppState {
  return {
    serverId: "fr114",
    world: null,
    worldCache: null,
    worldLoadedFromCache: false,
    selections: createDefaultSelections(),
    selectedSeas: [],
    showAllTowns: true,
    showGhosts: true,
    searchQuery: "",
    status: "Pret a charger fr114 ou la demo locale.",
    isLoading: false,
  };
}
