import type { Constraint, TownSelection } from "./filters";

export function createDefaultConstraint(): Constraint {
  return { field: "playerName", comparator: "contains", value: "" };
}

export function createSelection(name = "Nouvelle selection"): TownSelection {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    color: randomSelectionColor(),
    enabled: true,
    joinMode: "and",
    constraints: [createDefaultConstraint()],
  };
}

export function createDefaultSelections(): TownSelection[] {
  return [
    {
      schemaVersion: 1,
      id: "ghosts",
      name: "Villes fantomes",
      color: "#ef4444",
      enabled: true,
      joinMode: "and",
      constraints: [{ field: "ownerStatus", comparator: "eq", value: "ghost" }],
    },
    {
      schemaVersion: 1,
      id: "high-points",
      name: "Villes 10k+",
      color: "#22c55e",
      enabled: true,
      joinMode: "and",
      constraints: [{ field: "townPoints", comparator: "gte", value: "10000" }],
    },
  ];
}

function randomSelectionColor(): string {
  const colors = ["#38bdf8", "#f59e0b", "#a78bfa", "#10b981", "#f472b6", "#eab308"];
  return colors[Math.floor(Math.random() * colors.length)];
}
