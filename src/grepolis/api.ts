import type { GrepolisServerId, GrepolisTables, LoadSource } from "../types/grepolis";

const proxyBaseUrl = window.location.port === "5174" ? "http://127.0.0.1:5175" : window.location.origin;

export interface GrepolisTablesLoad {
  tables: GrepolisTables;
  source: Extract<LoadSource, "proxy" | "direct">;
  loadedAt: string;
  warning?: string;
}

interface ProxyWorldResponse {
  serverId: string;
  loadedAt: string;
  tables: GrepolisTables;
}

export async function fetchGrepolisTables(serverId: GrepolisServerId): Promise<GrepolisTablesLoad> {
  try {
    return await fetchGrepolisTablesViaProxy(serverId);
  } catch (proxyError) {
    try {
      const directLoad = await fetchGrepolisTablesDirect(serverId);
      return {
        ...directLoad,
        warning: `Proxy local indisponible ou en erreur. Fallback direct tente. ${String(proxyError)}`,
      };
    } catch (directError) {
      throw new Error(
        `Chargement impossible. Lance le proxy avec npm run proxy, puis recharge ${serverId}. Proxy: ${String(
          proxyError,
        )} Direct: ${String(directError)}`,
      );
    }
  }
}

async function fetchGrepolisTablesViaProxy(serverId: GrepolisServerId): Promise<GrepolisTablesLoad> {
  const response = await fetch(`${proxyBaseUrl}/api/world/${encodeURIComponent(serverId)}`);

  if (!response.ok) {
    throw new Error(`proxy ${response.status}`);
  }

  const payload = (await response.json()) as ProxyWorldResponse;
  assertGrepolisTables(payload.tables);
  return {
    tables: payload.tables,
    source: "proxy",
    loadedAt: payload.loadedAt,
  };
}

async function fetchGrepolisTablesDirect(serverId: GrepolisServerId): Promise<GrepolisTablesLoad> {
  const baseUrl = `https://${serverId}.grepolis.com/data`;

  const [players, alliances, islands, towns] = await Promise.all([
    fetchText(`${baseUrl}/players.txt`),
    fetchText(`${baseUrl}/alliances.txt`),
    fetchText(`${baseUrl}/islands.txt`),
    fetchText(`${baseUrl}/towns.txt`),
  ]);

  return {
    tables: { players, alliances, islands, towns },
    source: "direct",
    loadedAt: new Date().toISOString(),
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Impossible de charger ${url}: ${response.status}`);
  }

  return response.text();
}

function assertGrepolisTables(tables: Partial<GrepolisTables> | undefined): asserts tables is GrepolisTables {
  if (!tables?.players || !tables.alliances || !tables.islands || !tables.towns) {
    throw new Error("reponse proxy incomplete");
  }
}
