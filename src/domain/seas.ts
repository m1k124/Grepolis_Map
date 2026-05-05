export type SeaId = `${number}${number}`;

export interface SeaBounds {
  id: SeaId;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const seaSize = 100;

export const seaOptions: SeaId[] = Array.from({ length: 100 }, (_, index) => {
  const x = Math.floor(index / 10);
  const y = index % 10;
  return `${x}${y}` as SeaId;
});

export function getSeaId(x: number, y: number): SeaId {
  const seaX = clampSeaDigit(Math.floor(x / seaSize));
  const seaY = clampSeaDigit(Math.floor(y / seaSize));
  return `${seaX}${seaY}` as SeaId;
}

export function getSeaBounds(seaId: SeaId): SeaBounds {
  const [xDigit, yDigit] = seaId.split("").map(Number);
  const minX = xDigit * seaSize;
  const minY = yDigit * seaSize;

  return {
    id: seaId,
    minX,
    minY,
    maxX: minX + seaSize,
    maxY: minY + seaSize,
  };
}

export function normalizeSeaIds(values: string[]): SeaId[] {
  const unique = new Set<SeaId>();
  values.forEach((value) => {
    const normalized = value.trim().padStart(2, "0");
    if (/^[0-9]{2}$/.test(normalized)) {
      unique.add(normalized as SeaId);
    }
  });

  return seaOptions.filter((seaId) => unique.has(seaId));
}

function clampSeaDigit(value: number): number {
  return Math.min(9, Math.max(0, value));
}
