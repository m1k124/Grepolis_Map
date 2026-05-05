import type { WorldSnapshot } from "../types/grepolis";

export interface SnapshotComparison {
  serverId: string;
  fromLoadedAt: string;
  toLoadedAt: string;
  newTownIds: number[];
  lostTownIds: number[];
  ownerChanges: OwnerChange[];
}

export interface OwnerChange {
  townId: number;
  townName: string;
  fromPlayerId: number | null;
  fromPlayerName: string | null;
  toPlayerId: number | null;
  toPlayerName: string | null;
}

export function compareWorldSnapshots(before: WorldSnapshot, after: WorldSnapshot): SnapshotComparison {
  if (before.serverId !== after.serverId) {
    throw new Error("Les snapshots doivent venir du meme serveur");
  }

  const beforeTowns = new Map(before.world.towns.map((town) => [town.id, town]));
  const afterTowns = new Map(after.world.towns.map((town) => [town.id, town]));
  const newTownIds: number[] = [];
  const lostTownIds: number[] = [];
  const ownerChanges: OwnerChange[] = [];

  for (const [townId, town] of afterTowns) {
    const previousTown = beforeTowns.get(townId);
    if (!previousTown) {
      newTownIds.push(townId);
      continue;
    }

    if (previousTown.playerId !== town.playerId) {
      ownerChanges.push({
        townId,
        townName: town.name,
        fromPlayerId: previousTown.playerId,
        fromPlayerName: previousTown.playerName,
        toPlayerId: town.playerId,
        toPlayerName: town.playerName,
      });
    }
  }

  for (const townId of beforeTowns.keys()) {
    if (!afterTowns.has(townId)) {
      lostTownIds.push(townId);
    }
  }

  return {
    serverId: before.serverId,
    fromLoadedAt: before.loadedAt,
    toLoadedAt: after.loadedAt,
    newTownIds,
    lostTownIds,
    ownerChanges,
  };
}
