import type { Town } from "../types/grepolis";

export type ConstraintField =
  | "playerName"
  | "playerPoints"
  | "playerRank"
  | "allianceName"
  | "alliancePoints"
  | "allianceRank"
  | "townName"
  | "townPoints"
  | "islandX"
  | "islandY"
  | "islandType"
  | "ownerStatus";

export type Comparator = "eq" | "neq" | "gte" | "lte" | "contains";
export type JoinMode = "and" | "or";

export interface Constraint {
  field: ConstraintField;
  comparator: Comparator;
  value: string;
}

export interface TownSelection {
  schemaVersion: 1;
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  joinMode: JoinMode;
  constraints: Constraint[];
}

export const constraintFields: ConstraintField[] = [
  "playerName",
  "playerPoints",
  "playerRank",
  "allianceName",
  "alliancePoints",
  "allianceRank",
  "townName",
  "townPoints",
  "islandX",
  "islandY",
  "islandType",
  "ownerStatus",
];

export const comparators: Comparator[] = ["eq", "neq", "gte", "lte", "contains"];

export const fieldLabels: Record<ConstraintField, string> = {
  playerName: "Joueur",
  playerPoints: "Points joueur",
  playerRank: "Rang joueur",
  allianceName: "Alliance",
  alliancePoints: "Points alliance",
  allianceRank: "Rang alliance",
  townName: "Ville",
  townPoints: "Points ville",
  islandX: "Ile X",
  islandY: "Ile Y",
  islandType: "Type ile",
  ownerStatus: "Occupation",
};

export const comparatorLabels: Record<Comparator, string> = {
  eq: "=",
  neq: "!=",
  gte: ">=",
  lte: "<=",
  contains: "contient",
};

export function townMatchesSelection(town: Town, selection: TownSelection): boolean {
  const activeConstraints = selection.constraints.filter((constraint) => constraint.value.trim() !== "");

  if (!selection.enabled || activeConstraints.length === 0) {
    return false;
  }

  const results = activeConstraints.map((constraint) => townMatchesConstraint(town, constraint));
  return selection.joinMode === "and" ? results.every(Boolean) : results.some(Boolean);
}

function townMatchesConstraint(town: Town, constraint: Constraint): boolean {
  if (constraint.field === "ownerStatus") {
    const wanted = constraint.value.toLowerCase();
    const status = town.playerId === null ? "ghost" : "owned";
    return compareString(status, wanted, constraint.comparator);
  }

  const value = getTownFieldValue(town, constraint.field);

  if (isNumberField(constraint.field)) {
    if (typeof value !== "number") {
      return false;
    }
    return compareNumber(value, Number(constraint.value), constraint.comparator);
  }

  return compareString(String(value ?? ""), constraint.value, constraint.comparator);
}

function isNumberField(field: ConstraintField): boolean {
  return [
    "playerPoints",
    "playerRank",
    "alliancePoints",
    "allianceRank",
    "townPoints",
    "islandX",
    "islandY",
    "islandType",
  ].includes(field);
}

function getTownFieldValue(town: Town, field: ConstraintField): string | number | null {
  switch (field) {
    case "playerName":
      return town.playerName;
    case "playerPoints":
      return town.playerPoints;
    case "playerRank":
      return town.playerRank;
    case "allianceName":
      return town.allianceName;
    case "alliancePoints":
      return town.alliancePoints;
    case "allianceRank":
      return town.allianceRank;
    case "townName":
      return town.name;
    case "townPoints":
      return town.points;
    case "islandX":
      return town.islandX;
    case "islandY":
      return town.islandY;
    case "islandType":
      return town.islandType;
    case "ownerStatus":
      return town.playerId === null ? "ghost" : "owned";
  }
}

function compareNumber(actual: number, expected: number, comparator: Comparator): boolean {
  if (Number.isNaN(expected)) {
    return false;
  }

  switch (comparator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gte":
      return actual >= expected;
    case "lte":
      return actual <= expected;
    case "contains":
      return String(actual).includes(String(expected));
  }
}

function compareString(actual: string, expected: string, comparator: Comparator): boolean {
  const left = actual.trim().toLowerCase();
  const right = expected.trim().toLowerCase();

  switch (comparator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "gte":
      return left >= right;
    case "lte":
      return left <= right;
  }
}
