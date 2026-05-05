import {
  comparatorLabels,
  comparators,
  constraintFields,
  fieldLabels,
  townMatchesSelection,
  type Comparator,
  type ConstraintField,
  type JoinMode,
} from "../domain/filters";
import { seaOptions, type SeaId } from "../domain/seas";
import { createDefaultConstraint, createSelection } from "../domain/selections";
import { fetchGrepolisTables, type GrepolisTablesLoad } from "../grepolis/api";
import { parseGrepolisTables } from "../grepolis/parser";
import { sampleTables } from "../grepolis/sampleWorld";
import { GrepolisCanvas } from "../rendering/canvas";
import {
  configFromUrl,
  createAppConfigExport,
  encodeAppConfig,
  parseAppConfigJson,
  type AppConfigExport,
} from "../storage/appConfig";
import { loadSelections, parseSelectionsJson, saveSelections, serializeSelections } from "../storage/localStore";
import {
  clearCachedWorld,
  getFreshCachedWorld,
  saveCachedWorld,
  type CachedWorldTables,
} from "../storage/worldCache";
import type { GrepolisTables, Town } from "../types/grepolis";
import { createInitialState, type AppState } from "./state";

export class App {
  private readonly root: HTMLElement;
  private readonly state: AppState;
  private map: GrepolisCanvas | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = createInitialState();
    this.state.selections = loadSelections() ?? this.state.selections;
    this.restoreConfigFromUrl();
  }

  mount(): void {
    this.root.innerHTML = this.template();

    const canvas = this.requireElement<HTMLCanvasElement>("#map-canvas");
    this.map = new GrepolisCanvas(canvas);

    this.bindEvents();
    this.syncServerInput();
    this.syncSeaSelect();
    this.refresh();
  }

  private bindEvents(): void {
    this.requireElement<HTMLInputElement>("#server-id").addEventListener("input", (event) => {
      this.state.serverId = (event.target as HTMLInputElement).value.trim();
    });

    this.requireElement<HTMLButtonElement>("#load-sample").addEventListener("click", () => {
      this.loadSampleWorld();
    });

    this.requireElement<HTMLButtonElement>("#load-server").addEventListener("click", () => {
      void this.loadServer();
    });

    this.requireElement<HTMLButtonElement>("#refresh-server").addEventListener("click", () => {
      void this.loadServer({ forceRefresh: true });
    });

    this.requireElement<HTMLButtonElement>("#clear-world-cache").addEventListener("click", () => {
      void this.clearCurrentWorldCache();
    });

    this.requireElement<HTMLInputElement>("#import-files").addEventListener("change", (event) => {
      void this.importFiles(event.target as HTMLInputElement);
    });

    this.requireElement<HTMLInputElement>("#toggle-all").addEventListener("change", (event) => {
      this.state.showAllTowns = (event.target as HTMLInputElement).checked;
      this.refresh();
    });

    this.requireElement<HTMLInputElement>("#toggle-ghosts").addEventListener("change", (event) => {
      this.state.showGhosts = (event.target as HTMLInputElement).checked;
      this.refresh();
    });

    this.requireElement<HTMLInputElement>("#search-query").addEventListener("input", (event) => {
      this.state.searchQuery = (event.target as HTMLInputElement).value;
      this.renderSearchResults();
    });

    this.requireElement<HTMLButtonElement>("#reset-camera").addEventListener("click", () => {
      this.map?.resetCamera();
    });

    this.requireElement<HTMLButtonElement>("#zoom-out").addEventListener("click", () => {
      this.map?.zoomBy(-5);
    });

    this.requireElement<HTMLButtonElement>("#zoom-in").addEventListener("click", () => {
      this.map?.zoomBy(5);
    });

    this.requireElement<HTMLSelectElement>("#sea-select").addEventListener("change", (event) => {
      this.state.selectedSeas = Array.from((event.target as HTMLSelectElement).selectedOptions).map(
        (option) => option.value as SeaId,
      );
      this.refresh();
      this.focusSelectedSeas();
    });

    this.requireElement<HTMLButtonElement>("#focus-seas").addEventListener("click", () => {
      this.focusSelectedSeas();
    });

    this.requireElement<HTMLButtonElement>("#clear-seas").addEventListener("click", () => {
      this.state.selectedSeas = [];
      this.syncSeaSelect();
      this.refresh();
    });

    this.requireElement<HTMLButtonElement>("#export-png").addEventListener("click", () => {
      void this.exportMapPng();
    });

    this.requireElement<HTMLButtonElement>("#export-config").addEventListener("click", () => {
      this.exportAppConfig();
    });

    this.requireElement<HTMLButtonElement>("#import-config").addEventListener("click", () => {
      this.requireElement<HTMLInputElement>("#import-config-file").click();
    });

    this.requireElement<HTMLInputElement>("#import-config-file").addEventListener("change", (event) => {
      void this.importAppConfig(event.target as HTMLInputElement);
    });

    this.requireElement<HTMLButtonElement>("#copy-share-link").addEventListener("click", () => {
      void this.copyShareLink();
    });

    this.requireElement<HTMLButtonElement>("#add-selection").addEventListener("click", () => {
      this.state.selections.push(createSelection());
      this.refresh();
    });

    this.requireElement<HTMLButtonElement>("#export-selections").addEventListener("click", () => {
      this.exportSelections();
    });

    this.requireElement<HTMLButtonElement>("#import-selections").addEventListener("click", () => {
      this.requireElement<HTMLInputElement>("#import-selections-file").click();
    });

    this.requireElement<HTMLInputElement>("#import-selections-file").addEventListener("change", (event) => {
      void this.importSelections(event.target as HTMLInputElement);
    });

    this.requireElement("#selections").addEventListener("input", (event) => {
      this.handleSelectionInput(event);
    });

    this.requireElement("#selections").addEventListener("change", (event) => {
      this.handleSelectionChange(event);
    });

    this.requireElement("#selections").addEventListener("click", (event) => {
      this.handleSelectionClick(event);
    });

    window.addEventListener("keydown", (event) => {
      this.handleKeyboardShortcut(event);
    });
  }

  private loadSampleWorld(): void {
    this.state.serverId = "demo";
    this.state.world = parseGrepolisTables("demo", sampleTables, "demo");
    this.state.worldCache = null;
    this.state.worldLoadedFromCache = false;
    this.state.status = "Donnees de demonstration chargees.";
    this.syncServerInput();
    this.refresh();
  }

  private async loadServer(options: { forceRefresh?: boolean } = {}): Promise<void> {
    if (!this.state.serverId) {
      this.setStatus("Indique un serveur, par exemple fr95.");
      return;
    }

    const serverId = this.state.serverId;
    this.setLoading(true, options.forceRefresh ? `Rafraichissement de ${serverId}...` : `Chargement de ${serverId}...`);

    try {
      if (!options.forceRefresh) {
        const cached = await getFreshCachedWorld(serverId);
        if (cached) {
          this.setWorldFromLoad(cached, true, cached);
          this.setStatus(`Monde ${serverId} charge depuis le cache local. ${this.formatCacheStatus(cached)}`);
          this.refresh();
          return;
        }
      }

      const result = await fetchGrepolisTables(serverId);
      const cacheResult = await this.trySaveWorldCache(serverId, result);
      this.setWorldFromLoad(cacheResult.load, false, cacheResult.saved ? cacheResult.load : null);
      this.setStatus(
        result.warning
          ? `Monde ${serverId} charge en direct${cacheResult.saved ? " et mis en cache" : ""}. ${result.warning}`
          : cacheResult.saved
            ? `Monde ${serverId} charge via proxy local et mis en cache.`
            : `Monde ${serverId} charge via proxy local. Cache indisponible.`,
      );
      this.refresh();
    } catch (error) {
      this.setStatus(`${String(error)} Utilise l'import manuel si besoin.`);
    } finally {
      this.setLoading(false);
    }
  }

  private setWorldFromLoad(load: CachedWorldTables, fromCache: boolean, cacheInfo: CachedWorldTables | null): void {
    const world = parseGrepolisTables(load.serverId, load.tables, load.source);
    world.loadedAt = load.loadedAt;
    this.state.serverId = load.serverId;
    this.state.world = world;
    this.state.worldCache = cacheInfo;
    this.state.worldLoadedFromCache = fromCache;
    this.syncServerInput();
  }

  private async trySaveWorldCache(
    serverId: string,
    result: GrepolisTablesLoad,
  ): Promise<{ load: CachedWorldTables; saved: boolean }> {
    try {
      const cached = await saveCachedWorld(serverId, result);
      return { load: cached, saved: true };
    } catch {
      const fallback: CachedWorldTables = {
        ...result,
        serverId,
        expiresAt: new Date().toISOString(),
        counts: {
          players: 0,
          alliances: 0,
          islands: 0,
          towns: 0,
        },
      };
      return { load: fallback, saved: false };
    }
  }

  private async clearCurrentWorldCache(): Promise<void> {
    if (!this.state.serverId) {
      return;
    }

    try {
      await clearCachedWorld(this.state.serverId);
      this.state.worldCache = null;
      this.state.worldLoadedFromCache = false;
      this.setStatus(`Cache ${this.state.serverId} vide.`);
      this.renderCacheInfo();
    } catch (error) {
      this.setStatus(`Impossible de vider le cache. ${String(error)}`);
    }
  }

  private async importFiles(input: HTMLInputElement): Promise<void> {
    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    const tables: Partial<GrepolisTables> = {};
    this.setLoading(true, "Import des fichiers Grepolis...");

    try {
      for (const file of files) {
        const text = await file.text();
        if (file.name.includes("players")) tables.players = text;
        if (file.name.includes("alliances")) tables.alliances = text;
        if (file.name.includes("islands")) tables.islands = text;
        if (file.name.includes("towns")) tables.towns = text;
      }

      if (!tables.players || !tables.alliances || !tables.islands || !tables.towns) {
        this.setStatus("Import incomplet : il faut players.txt, alliances.txt, islands.txt et towns.txt.");
        return;
      }

      this.state.world = parseGrepolisTables(this.state.serverId || "import", tables as GrepolisTables, "manual-import");
      this.state.worldCache = null;
      this.state.worldLoadedFromCache = false;
      this.setStatus("Fichiers Grepolis importes.");
      this.refresh();
    } finally {
      this.setLoading(false);
    }
  }

  private async importSelections(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    try {
      const selections = parseSelectionsJson(await file.text());
      this.state.selections = selections;
      this.setStatus(`${selections.length} selections importees.`);
      this.refresh();
    } catch (error) {
      this.setStatus(`Import des selections impossible. ${String(error)}`);
    }
  }

  private exportSelections(): void {
    const json = JSON.stringify(serializeSelections(this.state.selections), null, 2);
    this.downloadText(json, `grepolis-map-selections-${this.state.serverId || "world"}.json`, "application/json");
    this.setStatus("Selections exportees.");
  }

  private async exportMapPng(): Promise<void> {
    if (!this.state.world) {
      this.setStatus("Charge un monde avant d'exporter la carte.");
      return;
    }

    try {
      this.setLoading(true, "Export PNG...");
      const blob = await this.map?.toPngBlob();
      if (!blob) {
        throw new Error("Canvas indisponible");
      }
      this.downloadBlob(blob, `grepolis-map-${this.state.serverId}-viewport.png`);
      this.setStatus("Carte visible exportee en PNG.");
    } catch (error) {
      this.setStatus(`Export PNG impossible. ${String(error)}`);
    } finally {
      this.setLoading(false);
    }
  }

  private exportAppConfig(): void {
    const json = JSON.stringify(this.createCurrentConfig(), null, 2);
    this.downloadText(json, `grepolis-map-config-${this.state.serverId || "world"}.json`, "application/json");
    this.setStatus("Configuration exportee.");
  }

  private async importAppConfig(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    try {
      this.applyConfig(parseAppConfigJson(await file.text()));
      this.syncServerInput();
      this.syncSeaSelect();
      this.setStatus("Configuration importee. Clique Charger pour recuperer le monde.");
      this.refresh();
    } catch (error) {
      this.setStatus(`Import de configuration impossible. ${String(error)}`);
    }
  }

  private async copyShareLink(): Promise<void> {
    const url = this.createShareUrl();

    try {
      await navigator.clipboard.writeText(url);
      this.setStatus("Lien de partage copie.");
    } catch (error) {
      this.setStatus(`Copie impossible. Lien genere : ${url}. ${String(error)}`);
    }
  }

  private refresh(): void {
    this.map?.setOptions({
      showAllTowns: this.state.showAllTowns,
      showGhosts: this.state.showGhosts,
      selections: this.state.selections,
      selectedSeas: this.state.selectedSeas,
    });

    if (this.state.world) {
      this.map?.setWorld(this.state.world);
    }

    saveSelections(this.state.selections);
    this.renderStats();
    this.renderCacheInfo();
    this.renderLegend();
    this.renderSearchResults();
    this.renderDiagnostics();
    this.renderSeaSelection();
    this.renderSelections();
    this.renderLoadingState();
    this.renderStatus();
  }

  private refreshMapAndSummary(): void {
    this.map?.setOptions({
      showAllTowns: this.state.showAllTowns,
      showGhosts: this.state.showGhosts,
      selections: this.state.selections,
      selectedSeas: this.state.selectedSeas,
    });
    saveSelections(this.state.selections);
    this.renderStats();
    this.renderLegend();
  }

  private restoreConfigFromUrl(): void {
    try {
      const config = configFromUrl(new URL(window.location.href));
      if (!config) {
        return;
      }

      this.applyConfig(config);
      this.state.status = "Configuration partagee restauree. Clique Charger pour recuperer le monde.";
    } catch (error) {
      this.state.status = `Configuration partagee illisible. ${String(error)}`;
    }
  }

  private applyConfig(config: AppConfigExport): void {
    this.state.serverId = config.serverId;
    this.state.showAllTowns = config.showAllTowns;
    this.state.showGhosts = config.showGhosts;
    this.state.selectedSeas = config.selectedSeas;
    this.state.selections = config.selections;
  }

  private createCurrentConfig(): AppConfigExport {
    return createAppConfigExport({
      serverId: this.state.serverId,
      showAllTowns: this.state.showAllTowns,
      showGhosts: this.state.showGhosts,
      selectedSeas: this.state.selectedSeas,
      selections: this.state.selections,
      world: this.state.world,
    });
  }

  private createShareUrl(): string {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("config", encodeAppConfig(this.createCurrentConfig()));
    return url.toString();
  }

  private formatCacheStatus(cached: CachedWorldTables): string {
    return `Expire le ${formatDateTime(cached.expiresAt)}.`;
  }

  private handleSelectionInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const selection = this.selectionFromTarget(target);
    if (!selection) {
      return;
    }

    if (target.dataset.selectionField === "name") {
      selection.name = target.value || "Selection";
      this.refreshMapAndSummary();
      return;
    }

    if (target.dataset.selectionField === "color") {
      selection.color = target.value;
      this.refreshMapAndSummary();
      return;
    }

    const constraint = this.constraintFromTarget(target);
    if (constraint && target.dataset.constraintField === "value") {
      constraint.value = target.value;
      this.refreshMapAndSummary();
      this.updateSelectionCounts();
    }
  }

  private handleSelectionChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
      return;
    }

    const selection = this.selectionFromTarget(target);
    if (!selection) {
      return;
    }

    if (target.dataset.selectionField === "enabled" && target instanceof HTMLInputElement) {
      selection.enabled = target.checked;
      this.refresh();
      return;
    }

    if (target.dataset.selectionField === "joinMode" && this.isJoinMode(target.value)) {
      selection.joinMode = target.value;
      this.refresh();
      return;
    }

    const constraint = this.constraintFromTarget(target);
    if (!constraint) {
      return;
    }

    if (target.dataset.constraintField === "field" && this.isConstraintField(target.value)) {
      constraint.field = target.value;
      this.refresh();
      return;
    }

    if (target.dataset.constraintField === "comparator" && this.isComparator(target.value)) {
      constraint.comparator = target.value;
      this.refresh();
    }
  }

  private handleSelectionClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("button[data-action]");
    if (!button) {
      return;
    }

    const selection = this.selectionFromTarget(button);
    if (!selection) {
      return;
    }

    const action = button.dataset.action;
    if (action === "add-constraint") {
      selection.constraints.push(createDefaultConstraint());
      this.refresh();
      return;
    }

    if (action === "remove-constraint") {
      const constraintIndex = Number(button.dataset.constraintIndex);
      if (Number.isInteger(constraintIndex)) {
        selection.constraints.splice(constraintIndex, 1);
        if (selection.constraints.length === 0) {
          selection.constraints.push(createDefaultConstraint());
        }
        this.refresh();
      }
      return;
    }

    if (action === "remove-selection") {
      const selectionIndex = Number(button.dataset.selectionIndex);
      if (Number.isInteger(selectionIndex)) {
        this.state.selections.splice(selectionIndex, 1);
        this.refresh();
      }
      return;
    }

    if (action === "move-selection-up" || action === "move-selection-down") {
      const selectionIndex = Number(button.dataset.selectionIndex);
      const direction = action === "move-selection-up" ? -1 : 1;
      const nextIndex = selectionIndex + direction;
      if (this.state.selections[selectionIndex] && this.state.selections[nextIndex]) {
        const [movedSelection] = this.state.selections.splice(selectionIndex, 1);
        this.state.selections.splice(nextIndex, 0, movedSelection);
        this.refresh();
      }
    }
  }

  private renderStats(): void {
    const world = this.state.world;
    const total = world?.towns.length ?? 0;
    const ghosts = world?.towns.filter((town) => town.playerId === null).length ?? 0;
    const players = world?.players.length ?? 0;
    const alliances = world?.alliances.length ?? 0;
    const diagnostics = world?.diagnostics.length ?? 0;

    this.requireElement("#stats").innerHTML = `
      <span>${total.toLocaleString("fr-FR")} villes</span>
      <span>${ghosts.toLocaleString("fr-FR")} fantomes</span>
      <span>${players.toLocaleString("fr-FR")} joueurs</span>
      <span>${alliances.toLocaleString("fr-FR")} alliances</span>
      <span>${diagnostics.toLocaleString("fr-FR")} diagnostics</span>
    `;
  }

  private renderCacheInfo(): void {
    const container = this.requireElement("#cache-info");
    const cached = this.state.worldCache;

    if (!cached) {
      container.innerHTML = `<span>Cache : aucun monde charge via proxy/API.</span>`;
      return;
    }

    const mode = this.state.worldLoadedFromCache ? "depuis cache" : "donnees fraiches";
    container.innerHTML = `
      <span>Source : ${mode}</span>
      <span>Charge : ${formatDateTime(cached.loadedAt)}</span>
      <span>Expire : ${formatDateTime(cached.expiresAt)}</span>
      <span>${cached.counts.towns.toLocaleString("fr-FR")} villes</span>
    `;
  }

  private renderDiagnostics(): void {
    const container = this.requireElement("#diagnostics");
    const diagnostics = this.state.world?.diagnostics ?? [];

    if (diagnostics.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <h2>Diagnostics</h2>
      <div class="diagnostics-list">
        ${diagnostics
          .slice(0, 5)
          .map(
            (diagnostic) => `
              <p class="diagnostic diagnostic--${diagnostic.severity}">
                <strong>${diagnostic.table}:${diagnostic.line}</strong>
                ${diagnostic.message}
              </p>
            `,
          )
          .join("")}
      </div>
    `;
  }

  private renderLegend(): void {
    const container = this.requireElement("#legend");
    const world = this.state.world;
    const items: Array<{ label: string; color: string; count: number; enabled: boolean }> = [
      {
        label: "Toutes les villes",
        color: "#64748b",
        count: world?.towns.length ?? 0,
        enabled: this.state.showAllTowns,
      },
      {
        label: "Villes fantomes",
        color: "#ef4444",
        count: world?.towns.filter((town) => town.playerId === null).length ?? 0,
        enabled: this.state.showGhosts,
      },
      ...this.state.selections.map((selection) => ({
        label: selection.name,
        color: selection.color,
        count: world?.towns.filter((town) => townMatchesSelection(town, selection)).length ?? 0,
        enabled: selection.enabled,
      })),
    ];

    container.innerHTML = items
      .filter((item) => item.enabled)
      .map(
        (item) => `
          <div class="legend-row">
            <span class="selection-row__swatch" style="background:${item.color}"></span>
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.count.toLocaleString("fr-FR")}</strong>
          </div>
        `,
      )
      .join("");
  }

  private renderSearchResults(): void {
    const container = this.requireElement("#search-results");
    const query = normalizeSearch(this.state.searchQuery);

    if (!query || !this.state.world) {
      container.innerHTML = "";
      return;
    }

    const matches = this.searchTowns(query).slice(0, 8);
    if (matches.length === 0) {
      container.innerHTML = `<p class="empty-results">Aucun resultat</p>`;
      return;
    }

    container.innerHTML = matches
      .map(
        (town) => `
          <button class="search-result" type="button" data-town-id="${town.id}">
            <span>
              <strong>${escapeHtml(town.name)}</strong>
              <small>${escapeHtml(town.playerName ?? "Ville fantome")} - ${escapeHtml(town.allianceName ?? "Sans alliance")}</small>
            </span>
            <em>${town.islandX},${town.islandY}</em>
          </button>
        `,
      )
      .join("");

    container.querySelectorAll<HTMLButtonElement>("button[data-town-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const townId = Number(button.dataset.townId);
        this.map?.focusTown(townId);
      });
    });
  }

  private searchTowns(query: string): Town[] {
    const towns = this.state.world?.towns ?? [];
    return towns.filter((town) => {
      const haystack = [
        town.name,
        town.playerName ?? "",
        town.allianceName ?? "",
        `${town.islandX},${town.islandY}`,
        `${town.islandX} ${town.islandY}`,
      ]
        .map(normalizeSearch)
        .join(" ");

      return haystack.includes(query);
    });
  }

  private renderSeaSelection(): void {
    const container = this.requireElement("#selected-seas-summary");
    container.textContent =
      this.state.selectedSeas.length === 0
        ? "Aucune mer selectionnee"
        : `Mers selectionnees : ${this.state.selectedSeas.join(", ")}`;
  }

  private renderSelections(): void {
    const container = this.requireElement("#selections");

    if (this.state.selections.length === 0) {
      container.innerHTML = `<p class="empty-results">Aucune selection</p>`;
      return;
    }

    container.innerHTML = this.state.selections
      .map((selection, index) => {
        const count = this.countSelectionMatches(index);
        const fieldOptions = constraintFields
          .map(
            (field) => `
              <option value="${field}" ${field === selection.constraints[0]?.field ? "" : ""}>
                ${fieldLabels[field]}
              </option>
            `,
          )
          .join("");

        return `
          <article class="selection-card" data-selection-index="${index}">
            <div class="selection-card__header">
              <input
                type="checkbox"
                data-selection-index="${index}"
                data-selection-field="enabled"
                ${selection.enabled ? "checked" : ""}
                aria-label="Afficher ${escapeHtml(selection.name)}"
              />
              <input
                class="selection-color"
                type="color"
                value="${escapeHtml(selection.color)}"
                data-selection-index="${index}"
                data-selection-field="color"
                aria-label="Couleur ${escapeHtml(selection.name)}"
              />
              <input
                class="selection-name"
                type="text"
                value="${escapeHtml(selection.name)}"
                data-selection-index="${index}"
                data-selection-field="name"
                aria-label="Nom de la selection"
              />
              <strong class="selection-card__count" data-selection-count="${index}">${count.toLocaleString("fr-FR")}</strong>
              <button class="button-icon button-danger" type="button" data-action="remove-selection" data-selection-index="${index}" title="Supprimer">x</button>
            </div>

            <div class="selection-card__meta">
              <select data-selection-index="${index}" data-selection-field="joinMode" aria-label="Mode de combinaison">
                <option value="and" ${selection.joinMode === "and" ? "selected" : ""}>AND</option>
                <option value="or" ${selection.joinMode === "or" ? "selected" : ""}>OR</option>
              </select>
              <button
                class="button-icon"
                type="button"
                data-action="move-selection-up"
                data-selection-index="${index}"
                title="Monter"
                ${index === 0 ? "disabled" : ""}
              >^</button>
              <button
                class="button-icon"
                type="button"
                data-action="move-selection-down"
                data-selection-index="${index}"
                title="Descendre"
                ${index === this.state.selections.length - 1 ? "disabled" : ""}
              >v</button>
            </div>

            <div class="constraint-list">
              ${selection.constraints
                .map(
                  (constraint, constraintIndex) => `
                    <div class="constraint-row">
                      <select
                        data-selection-index="${index}"
                        data-constraint-index="${constraintIndex}"
                        data-constraint-field="field"
                        aria-label="Champ"
                      >
                        ${fieldOptions.replace(
                          `value="${constraint.field}"`,
                          `value="${constraint.field}" selected`,
                        )}
                      </select>
                      <select
                        data-selection-index="${index}"
                        data-constraint-index="${constraintIndex}"
                        data-constraint-field="comparator"
                        aria-label="Comparateur"
                      >
                        ${comparators
                          .map(
                            (comparator) => `
                              <option value="${comparator}" ${comparator === constraint.comparator ? "selected" : ""}>
                                ${escapeHtml(comparatorLabels[comparator])}
                              </option>
                            `,
                          )
                          .join("")}
                      </select>
                      <input
                        type="text"
                        value="${escapeHtml(constraint.value)}"
                        data-selection-index="${index}"
                        data-constraint-index="${constraintIndex}"
                        data-constraint-field="value"
                        aria-label="Valeur"
                      />
                      <button
                        class="button-icon"
                        type="button"
                        data-action="remove-constraint"
                        data-selection-index="${index}"
                        data-constraint-index="${constraintIndex}"
                        title="Retirer"
                      >-</button>
                    </div>
                  `,
                )
                .join("")}
            </div>

            <button class="button-secondary selection-card__add" type="button" data-action="add-constraint" data-selection-index="${index}">
              Ajouter contrainte
            </button>
          </article>
        `;
      })
      .join("");
  }

  private setStatus(status: string): void {
    this.state.status = status;
    this.renderStatus();
  }

  private setLoading(isLoading: boolean, status?: string): void {
    this.state.isLoading = isLoading;
    if (status) {
      this.state.status = status;
    }
    this.renderLoadingState();
    this.renderStatus();
  }

  private renderStatus(): void {
    this.requireElement("#status").textContent = this.state.status;
  }

  private renderLoadingState(): void {
    const disabled = this.state.isLoading;
    this.requireElement<HTMLButtonElement>("#load-server").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#refresh-server").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#clear-world-cache").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#load-sample").disabled = disabled;
    this.requireElement<HTMLInputElement>("#import-files").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#export-png").disabled = disabled || !this.state.world;
    this.requireElement<HTMLButtonElement>("#export-config").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#import-config").disabled = disabled;
    this.requireElement<HTMLInputElement>("#import-config-file").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#copy-share-link").disabled = disabled;
    this.requireElement<HTMLSelectElement>("#sea-select").disabled = disabled;
    this.requireElement<HTMLButtonElement>("#focus-seas").disabled = disabled || this.state.selectedSeas.length === 0;
    this.requireElement<HTMLButtonElement>("#clear-seas").disabled = disabled || this.state.selectedSeas.length === 0;
    this.root.querySelector(".file-import")?.classList.toggle("is-disabled", disabled);
  }

  private syncServerInput(): void {
    this.requireElement<HTMLInputElement>("#server-id").value = this.state.serverId;
  }

  private syncSeaSelect(): void {
    const selected = new Set(this.state.selectedSeas);
    this.requireElement<HTMLSelectElement>("#sea-select")
      .querySelectorAll<HTMLOptionElement>("option")
      .forEach((option) => {
        option.selected = selected.has(option.value as SeaId);
      });
  }

  private requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Element introuvable: ${selector}`);
    }
    return element;
  }

  private template(): string {
    return `
      <main class="app-shell">
        <aside class="sidebar">
          <section class="sidebar__section">
            <h1>Grepolis Map</h1>
            <div class="server-form">
              <input id="server-id" value="${this.state.serverId}" aria-label="Serveur Grepolis" />
              <button id="load-server" type="button">Charger</button>
            </div>
            <div class="cache-toolbar">
              <button id="refresh-server" class="button-secondary" type="button">Rafraichir</button>
              <button id="clear-world-cache" class="button-secondary" type="button">Vider cache</button>
            </div>
            <button id="load-sample" class="button-secondary" type="button">Demo locale</button>
            <label class="file-import">
              Importer fichiers
              <input id="import-files" type="file" accept=".txt" multiple />
            </label>
            <div class="action-toolbar">
              <button id="export-png" class="button-secondary" type="button">Exporter PNG</button>
              <button id="export-config" class="button-secondary" type="button">Exporter config</button>
              <button id="import-config" class="button-secondary" type="button">Importer config</button>
              <button id="copy-share-link" class="button-secondary" type="button">Copier lien</button>
              <input id="import-config-file" type="file" accept="application/json,.json" />
            </div>
          </section>

          <section class="sidebar__section">
            <div id="stats" class="stats"></div>
            <div id="cache-info" class="cache-info"></div>
            <label class="toggle-row">
              <input id="toggle-all" type="checkbox" ${this.state.showAllTowns ? "checked" : ""} />
              Toutes les villes
            </label>
            <label class="toggle-row">
              <input id="toggle-ghosts" type="checkbox" ${this.state.showGhosts ? "checked" : ""} />
              Villes fantomes
            </label>
          </section>

          <section class="sidebar__section">
            <div class="map-tools">
              <input id="search-query" type="search" placeholder="Ville, joueur, alliance, coordonnees" />
              <button id="reset-camera" type="button">Reset</button>
            </div>
            <div class="zoom-toolbar">
              <button id="zoom-out" class="button-secondary" type="button">Zoom -5%</button>
              <button id="zoom-in" class="button-secondary" type="button">Zoom +5%</button>
            </div>
            <div id="search-results" class="search-results"></div>
          </section>

          <section class="sidebar__section">
            <h2>Mers</h2>
            <select id="sea-select" class="sea-select" multiple size="6" aria-label="Selection de mers">
              ${seaOptions.map((seaId) => `<option value="${seaId}">Mer ${seaId}</option>`).join("")}
            </select>
            <div class="sea-toolbar">
              <button id="focus-seas" class="button-secondary" type="button">Focus mers</button>
              <button id="clear-seas" class="button-secondary" type="button">Effacer</button>
            </div>
            <p id="selected-seas-summary" class="sea-summary"></p>
          </section>

          <section class="sidebar__section">
            <h2>Legende</h2>
            <div id="legend" class="legend"></div>
          </section>

          <section id="diagnostics" class="sidebar__section"></section>

          <section class="sidebar__section">
            <div class="section-title-row">
              <h2>Selections</h2>
              <button id="add-selection" class="button-icon" type="button" title="Ajouter">+</button>
            </div>
            <div class="selection-toolbar">
              <button id="import-selections" class="button-secondary" type="button">Importer JSON</button>
              <button id="export-selections" class="button-secondary" type="button">Exporter JSON</button>
              <input id="import-selections-file" type="file" accept="application/json,.json" />
            </div>
            <div id="selections"></div>
          </section>

          <p id="status" class="status"></p>
        </aside>

        <section class="map-stage" aria-label="Carte Grepolis">
          <canvas id="map-canvas"></canvas>
        </section>
      </main>
    `;
  }

  private selectionFromTarget(target: HTMLElement): (typeof this.state.selections)[number] | null {
    const index = Number(target.dataset.selectionIndex);
    if (!Number.isInteger(index)) {
      return null;
    }

    return this.state.selections[index] ?? null;
  }

  private constraintFromTarget(target: HTMLElement): (typeof this.state.selections)[number]["constraints"][number] | null {
    const selection = this.selectionFromTarget(target);
    const constraintIndex = Number(target.dataset.constraintIndex);
    if (!selection || !Number.isInteger(constraintIndex)) {
      return null;
    }

    return selection.constraints[constraintIndex] ?? null;
  }

  private countSelectionMatches(selectionIndex: number): number {
    const selection = this.state.selections[selectionIndex];
    if (!selection || !this.state.world) {
      return 0;
    }

    return this.state.world.towns.filter((town) => townMatchesSelection(town, { ...selection, enabled: true })).length;
  }

  private updateSelectionCounts(): void {
    this.root.querySelectorAll<HTMLElement>("[data-selection-count]").forEach((element) => {
      const index = Number(element.dataset.selectionCount);
      element.textContent = this.countSelectionMatches(index).toLocaleString("fr-FR");
    });
  }

  private isConstraintField(value: string): value is ConstraintField {
    return constraintFields.includes(value as ConstraintField);
  }

  private isComparator(value: string): value is Comparator {
    return comparators.includes(value as Comparator);
  }

  private isJoinMode(value: string): value is JoinMode {
    return value === "and" || value === "or";
  }

  private focusSelectedSeas(): void {
    this.map?.focusSeas(this.state.selectedSeas);
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      return;
    }

    if (event.key === "/") {
      event.preventDefault();
      this.requireElement<HTMLInputElement>("#search-query").focus();
      return;
    }

    if (event.key.toLowerCase() === "r") {
      this.map?.resetCamera();
    }
  }

  private downloadText(text: string, filename: string, type: string): void {
    this.downloadBlob(new Blob([text], { type }), filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
