import { townMatchesSelection, type TownSelection } from "../domain/filters";
import { getSeaBounds, getSeaId, seaOptions, type SeaId } from "../domain/seas";
import type { Town, WorldData } from "../types/grepolis";
import { mapColors } from "./colors";

export interface Camera {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

interface RenderOptions {
  showAllTowns: boolean;
  showGhosts: boolean;
  selections: TownSelection[];
  selectedSeas: SeaId[];
}

export class GrepolisCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private camera: Camera = { offsetX: -420, offsetY: -500, zoom: 3 };
  private world: WorldData | null = null;
  private spatialIndex = new Map<string, Town[]>();
  private options: RenderOptions = { showAllTowns: true, showGhosts: true, selections: [], selectedSeas: [] };
  private hoverTown: Town | null = null;
  private focusedTown: Town | null = null;
  private isDragging = false;
  private lastPointer: { x: number; y: number } | null = null;
  private readonly spatialCellSize = 10;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D indisponible");
    }

    this.canvas = canvas;
    this.context = context;
    this.bindEvents();
    this.resize();
  }

  setWorld(world: WorldData): void {
    const shouldFocus = this.world !== world;
    this.world = world;
    this.spatialIndex = buildSpatialIndex(world.towns, this.spatialCellSize);
    if (shouldFocus) {
      this.focusOnTowns(world.towns);
    }
    this.render();
  }

  setOptions(options: RenderOptions): void {
    this.options = options;
    this.render();
  }

  resetCamera(): void {
    if (!this.world) {
      return;
    }

    this.focusOnTowns(this.world.towns);
    this.focusedTown = null;
    this.hoverTown = null;
    this.render();
  }

  zoomBy(percent: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const before = this.screenToWorld(centerX, centerY);
    this.camera.zoom = clamp(this.camera.zoom * (1 + percent / 100), 0.5, 80);
    const after = this.screenToWorld(centerX, centerY);
    this.camera.offsetX += before.x - after.x;
    this.camera.offsetY += before.y - after.y;
    this.render();
  }

  focusTown(townId: number): void {
    const town = this.world?.towns.find((candidate) => candidate.id === townId) ?? null;
    if (!town) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    this.camera.zoom = Math.max(this.camera.zoom, 18);
    this.camera.offsetX = town.x - rect.width / (2 * this.camera.zoom);
    this.camera.offsetY = town.y - rect.height / (2 * this.camera.zoom);
    this.focusedTown = town;
    this.hoverTown = town;
    this.render();
  }

  focusSeas(seaIds: SeaId[]): void {
    if (seaIds.length === 0) {
      return;
    }

    const bounds = seaIds.map(getSeaBounds);
    const minX = Math.min(...bounds.map((bound) => bound.minX));
    const minY = Math.min(...bounds.map((bound) => bound.minY));
    const maxX = Math.max(...bounds.map((bound) => bound.maxX));
    const maxY = Math.max(...bounds.map((bound) => bound.maxY));
    this.focusOnBounds(minX, minY, maxX, maxY, 8);
    this.focusedTown = null;
    this.hoverTown = null;
    this.render();
  }

  async toPngBlob(): Promise<Blob> {
    this.render();

    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Export PNG impossible"));
      }, "image/png");
    });
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.context;

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = mapColors.water;
    ctx.fillRect(0, 0, rect.width, rect.height);
    this.drawGrid(rect.width, rect.height);
    this.drawSelectedSeas();
    this.drawSeaLabels(rect.width, rect.height);

    if (!this.world) {
      this.drawEmptyState(rect.width, rect.height);
      return;
    }

    if (this.options.showAllTowns) {
      this.drawTownLayer(this.world.towns, mapColors.town, this.townRadius(2.2));
    }

    if (this.options.showGhosts) {
      this.drawTownLayer(this.world.towns.filter((town) => town.playerId === null), mapColors.ghost, this.townRadius(3));
    }

    for (const selection of this.options.selections) {
      if (!selection.enabled) {
        continue;
      }

      const towns = this.world.towns.filter((town) => townMatchesSelection(town, selection));
      this.drawTownLayer(towns, selection.color, this.townRadius(3.4));
    }

    this.drawFocusRing();
    this.drawHover();
  }

  private bindEvents(): void {
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("pointerdown", (event) => {
      this.isDragging = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener("pointerup", (event) => {
      this.isDragging = false;
      this.lastPointer = null;
      this.canvas.releasePointerCapture(event.pointerId);
    });

    this.canvas.addEventListener("pointermove", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };

      if (this.isDragging && this.lastPointer) {
        this.camera.offsetX -= (event.clientX - this.lastPointer.x) / this.camera.zoom;
        this.camera.offsetY -= (event.clientY - this.lastPointer.y) / this.camera.zoom;
        this.lastPointer = { x: event.clientX, y: event.clientY };
      }

      this.hoverTown = this.findNearestTown(pointer.x, pointer.y);
      if (this.hoverTown?.id !== this.focusedTown?.id) {
        this.focusedTown = null;
      }
      this.render();
    });

    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const before = this.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        const factor = event.deltaY < 0 ? 1.18 : 0.84;
        this.camera.zoom = clamp(this.camera.zoom * factor, 0.5, 80);
        const after = this.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        this.camera.offsetX += before.x - after.x;
        this.camera.offsetY += before.y - after.y;
        this.render();
      },
      { passive: false },
    );
  }

  private focusOnTowns(towns: Town[]): void {
    if (towns.length === 0) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    let minX = towns[0].x;
    let minY = towns[0].y;
    let maxX = towns[0].x;
    let maxY = towns[0].y;

    for (const town of towns) {
      minX = Math.min(minX, town.x);
      minY = Math.min(minY, town.y);
      maxX = Math.max(maxX, town.x);
      maxY = Math.max(maxY, town.y);
    }

    const worldWidth = Math.max(1, maxX - minX + 20);
    const worldHeight = Math.max(1, maxY - minY + 20);
    this.focusOnBounds(minX, minY, maxX, maxY, 10, 0.8, 8);
  }

  private focusOnBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    padding: number,
    minZoom = 0.8,
    maxZoom = 20,
  ): void {
    const rect = this.canvas.getBoundingClientRect();
    const worldWidth = Math.max(1, maxX - minX + padding * 2);
    const worldHeight = Math.max(1, maxY - minY + padding * 2);
    this.camera.zoom = clamp(Math.min(rect.width / worldWidth, rect.height / worldHeight), minZoom, maxZoom);
    this.camera.offsetX = minX - padding;
    this.camera.offsetY = minY - padding;
  }

  private drawGrid(width: number, height: number): void {
    const ctx = this.context;
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(width, height);

    for (let x = Math.floor(topLeft.x / 10) * 10; x <= bottomRight.x; x += 10) {
      const screen = this.worldToScreen(x, 0);
      ctx.strokeStyle = x % 100 === 0 ? mapColors.gridMajor : mapColors.gridMinor;
      ctx.lineWidth = x % 100 === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(screen.x, 0);
      ctx.lineTo(screen.x, height);
      ctx.stroke();
    }

    for (let y = Math.floor(topLeft.y / 10) * 10; y <= bottomRight.y; y += 10) {
      const screen = this.worldToScreen(0, y);
      ctx.strokeStyle = y % 100 === 0 ? mapColors.gridMajor : mapColors.gridMinor;
      ctx.lineWidth = y % 100 === 0 ? 1.2 : 0.6;
      ctx.beginPath();
      ctx.moveTo(0, screen.y);
      ctx.lineTo(width, screen.y);
      ctx.stroke();
    }
  }

  private drawSeaLabels(width: number, height: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = mapColors.seaLabel;
    ctx.font = this.camera.zoom >= 5 ? "18px system-ui" : "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const seaId of seaOptions) {
      const bounds = getSeaBounds(seaId);
      const screen = this.worldToScreen((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
      if (screen.x < -40 || screen.y < -24 || screen.x > width + 40 || screen.y > height + 24) {
        continue;
      }

      ctx.fillText(seaId, screen.x, screen.y);
    }

    ctx.restore();
  }

  private drawSelectedSeas(): void {
    if (this.options.selectedSeas.length === 0) {
      return;
    }

    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = mapColors.seaHighlight;
    ctx.strokeStyle = mapColors.seaBorder;
    ctx.lineWidth = 2;

    for (const seaId of this.options.selectedSeas) {
      const bounds = getSeaBounds(seaId);
      const topLeft = this.worldToScreen(bounds.minX, bounds.minY);
      const bottomRight = this.worldToScreen(bounds.maxX, bounds.maxY);
      const width = bottomRight.x - topLeft.x;
      const height = bottomRight.y - topLeft.y;
      ctx.fillRect(topLeft.x, topLeft.y, width, height);
      ctx.strokeRect(topLeft.x, topLeft.y, width, height);
    }

    ctx.restore();
  }

  private drawTownLayer(towns: Town[], color: string, radius: number): void {
    const ctx = this.context;
    const rect = this.canvas.getBoundingClientRect();
    ctx.fillStyle = color;

    for (const town of towns) {
      const screen = this.worldToScreen(town.x, town.y);
      if (
        screen.x < -radius ||
        screen.y < -radius ||
        screen.x > rect.width + radius ||
        screen.y > rect.height + radius
      ) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHover(): void {
    if (!this.hoverTown) {
      return;
    }

    const ctx = this.context;
    const town = this.hoverTown;
    const screen = this.worldToScreen(town.x, town.y);
    const lines = [
      town.name,
      `${town.points.toLocaleString("fr-FR")} pts`,
      town.playerName ?? "Ville fantome",
      town.allianceName ?? "Sans alliance",
      `Joueur: ${formatNullableNumber(town.playerPoints)} pts / rang ${formatNullableNumber(town.playerRank)}`,
      `Alliance: ${formatNullableNumber(town.alliancePoints)} pts / rang ${formatNullableNumber(town.allianceRank)}`,
      `Mer ${getSeaId(town.islandX, town.islandY)} / ile ${town.islandId ?? "-"} type ${town.islandType ?? "-"} / slot ${town.slot}`,
      `Coordonnees: ${town.islandX}, ${town.islandY}`,
    ];

    ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
    ctx.strokeStyle = "rgba(226, 232, 240, 0.35)";
    ctx.lineWidth = 1;
    ctx.font = "12px system-ui";
    const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 20;
    const height = lines.length * 18 + 14;
    const x = screen.x + 12;
    const y = screen.y - height - 12;

    roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = mapColors.label;
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 10, y + 22 + index * 18);
    });
  }

  private drawEmptyState(width: number, height: number): void {
    const ctx = this.context;
    ctx.fillStyle = mapColors.label;
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Charge un monde Grepolis ou utilise les donnees de demonstration.", width / 2, height / 2);
    ctx.textAlign = "start";
  }

  private findNearestTown(screenX: number, screenY: number): Town | null {
    if (!this.world) {
      return null;
    }

    let nearest: Town | null = null;
    let nearestDistance = Infinity;
    const worldPointer = this.screenToWorld(screenX, screenY);
    const radiusWorld = 16 / this.camera.zoom;
    const candidateTowns = this.townsNear(worldPointer.x, worldPointer.y, radiusWorld);

    for (const town of candidateTowns) {
      const screen = this.worldToScreen(town.x, town.y);
      const distance = Math.hypot(screen.x - screenX, screen.y - screenY);
      if (distance < nearestDistance) {
        nearest = town;
        nearestDistance = distance;
      }
    }

    return nearestDistance <= 14 ? nearest : null;
  }

  private drawFocusRing(): void {
    if (!this.focusedTown) {
      return;
    }

    const ctx = this.context;
    const screen = this.worldToScreen(this.focusedTown.x, this.focusedTown.y);
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, this.townRadius(8), 0, Math.PI * 2);
    ctx.stroke();
  }

  private townRadius(baseRadius: number): number {
    if (this.camera.zoom < 2.5) {
      return Math.max(1.2, baseRadius - 1);
    }

    if (this.camera.zoom > 18) {
      return baseRadius + 1.5;
    }

    return baseRadius;
  }

  private townsNear(x: number, y: number, radius: number): Town[] {
    const minCellX = Math.floor((x - radius) / this.spatialCellSize);
    const maxCellX = Math.floor((x + radius) / this.spatialCellSize);
    const minCellY = Math.floor((y - radius) / this.spatialCellSize);
    const maxCellY = Math.floor((y + radius) / this.spatialCellSize);
    const towns: Town[] = [];

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
        towns.push(...(this.spatialIndex.get(`${cellX}:${cellY}`) ?? []));
      }
    }

    return towns;
  }

  private worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.camera.offsetX) * this.camera.zoom,
      y: (y - this.camera.offsetY) * this.camera.zoom,
    };
  }

  private screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: x / this.camera.zoom + this.camera.offsetX,
      y: y / this.camera.zoom + this.camera.offsetY,
    };
  }
}

function buildSpatialIndex(towns: Town[], cellSize: number): Map<string, Town[]> {
  const index = new Map<string, Town[]>();

  for (const town of towns) {
    const cellX = Math.floor(town.x / cellSize);
    const cellY = Math.floor(town.y / cellSize);
    const key = `${cellX}:${cellY}`;
    const bucket = index.get(key) ?? [];
    bucket.push(town);
    index.set(key, bucket);
  }

  return index;
}

function formatNullableNumber(value: number | null): string {
  return value === null ? "-" : value.toLocaleString("fr-FR");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
