import type { TownSelection } from "../domain/filters";

const selectionsKey = "grepolis-map:selections";
const selectionSchemaVersion = 1;

export interface StoredSelections {
  schemaVersion: typeof selectionSchemaVersion;
  selections: TownSelection[];
}

export function loadSelections(): TownSelection[] | null {
  const raw = localStorage.getItem(selectionsKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSelections | TownSelection[];
    if (Array.isArray(parsed)) {
      return normalizeSelections(parsed);
    }

    return normalizeSelections(parsed.selections);
  } catch {
    return null;
  }
}

export function saveSelections(selections: TownSelection[]): void {
  localStorage.setItem(selectionsKey, JSON.stringify(serializeSelections(selections), null, 2));
}

export function serializeSelections(selections: TownSelection[]): StoredSelections {
  return {
    schemaVersion: selectionSchemaVersion,
    selections: normalizeSelections(selections),
  };
}

export function parseSelectionsJson(text: string): TownSelection[] {
  const parsed = JSON.parse(text) as StoredSelections | TownSelection[];
  if (Array.isArray(parsed)) {
    return normalizeSelections(parsed);
  }

  return normalizeSelections(parsed.selections);
}

export function clearSelections(): void {
  localStorage.removeItem(selectionsKey);
}

export function normalizeSelections(selections: TownSelection[]): TownSelection[] {
  return selections.map((selection) => ({
    schemaVersion: 1,
    id: selection.id || crypto.randomUUID(),
    name: selection.name || "Selection",
    color: selection.color || "#38bdf8",
    enabled: selection.enabled ?? true,
    joinMode: selection.joinMode === "or" ? "or" : "and",
    constraints: selection.constraints?.length
      ? selection.constraints.map((constraint) => ({
          field: constraint.field,
          comparator: constraint.comparator,
          value: constraint.value ?? "",
        }))
      : [{ field: "playerName", comparator: "contains", value: "" }],
  }));
}
