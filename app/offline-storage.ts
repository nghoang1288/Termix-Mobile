import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SSHHost, SSHHostData } from "@/types";

const OFFLINE_MODE_KEY = "sshbridge.offlineMode";
const OFFLINE_HOSTS_KEY = "sshbridge.offlineHosts";
const LAST_USERNAME_KEY = "sshbridge.lastUsername";
const USERNAME_MAP_KEY = "sshbridge.rememberedUsernames";

type SSHHostDataWithStringKey = SSHHostData & {
  key?: string | File | null;
};

function normalizeServerKey(serverUrl?: string | null): string {
  return (serverUrl || "").trim().replace(/\/$/, "").toLowerCase();
}

function makeOfflineId(): number {
  return -Math.max(Date.now(), 1);
}

function parseHosts(value: string | null): SSHHost[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeHostData(
  hostData: SSHHostDataWithStringKey,
  existing?: SSHHost,
): SSHHost {
  const now = new Date().toISOString();
  const rawKey = hostData.key;
  const key = typeof rawKey === "string" ? rawKey : existing?.key;
  const authType = hostData.authType || existing?.authType || "password";
  const ip = hostData.ip || existing?.ip || "";
  const username = hostData.username || existing?.username || "";

  return {
    id: existing?.id ?? makeOfflineId(),
    connectionType:
      hostData.connectionType || existing?.connectionType || "ssh",
    name: hostData.name?.trim() || existing?.name || ip,
    ip,
    port: Number(hostData.port || existing?.port || 22),
    username,
    folder: hostData.folder ?? existing?.folder ?? "Offline",
    tags: hostData.tags || existing?.tags || ["offline"],
    pin: hostData.pin ?? existing?.pin ?? false,
    authType,
    password:
      authType === "password"
        ? (hostData.password ?? existing?.password)
        : undefined,
    key: authType === "key" ? key : undefined,
    keyPassword:
      authType === "key"
        ? (hostData.keyPassword ?? existing?.keyPassword)
        : undefined,
    keyType:
      authType === "key" ? (hostData.keyType ?? existing?.keyType) : undefined,
    sudoPassword: hostData.sudoPassword ?? existing?.sudoPassword,
    forceKeyboardInteractive:
      hostData.forceKeyboardInteractive ?? existing?.forceKeyboardInteractive,
    credentialId: hostData.credentialId ?? existing?.credentialId,
    overrideCredentialUsername:
      hostData.overrideCredentialUsername ??
      existing?.overrideCredentialUsername,
    userId: existing?.userId || "offline",
    enableTerminal: hostData.enableTerminal ?? existing?.enableTerminal ?? true,
    enableTunnel: hostData.enableTunnel ?? existing?.enableTunnel ?? false,
    enableFileManager:
      hostData.enableFileManager ?? existing?.enableFileManager ?? false,
    enableDocker: hostData.enableDocker ?? existing?.enableDocker ?? false,
    showTerminalInSidebar:
      hostData.showTerminalInSidebar ?? existing?.showTerminalInSidebar ?? true,
    showFileManagerInSidebar:
      hostData.showFileManagerInSidebar ??
      existing?.showFileManagerInSidebar ??
      false,
    showTunnelInSidebar:
      hostData.showTunnelInSidebar ?? existing?.showTunnelInSidebar ?? false,
    showDockerInSidebar:
      hostData.showDockerInSidebar ?? existing?.showDockerInSidebar ?? false,
    showServerStatsInSidebar:
      hostData.showServerStatsInSidebar ??
      existing?.showServerStatsInSidebar ??
      false,
    defaultPath: hostData.defaultPath ?? existing?.defaultPath ?? "/",
    tunnelConnections:
      hostData.tunnelConnections || existing?.tunnelConnections || [],
    jumpHosts: hostData.jumpHosts || existing?.jumpHosts || [],
    quickActions: hostData.quickActions || existing?.quickActions || [],
    statsConfig:
      typeof hostData.statsConfig === "string"
        ? hostData.statsConfig
        : hostData.statsConfig
          ? JSON.stringify(hostData.statsConfig)
          : existing?.statsConfig,
    terminalConfig: hostData.terminalConfig || existing?.terminalConfig,
    dockerConfig: hostData.dockerConfig ?? existing?.dockerConfig,
    notes: hostData.notes ?? existing?.notes,
    useSocks5: hostData.useSocks5 ?? existing?.useSocks5,
    socks5Host: hostData.socks5Host ?? existing?.socks5Host,
    socks5Port: hostData.socks5Port ?? existing?.socks5Port,
    socks5Username: hostData.socks5Username ?? existing?.socks5Username,
    socks5Password: hostData.socks5Password ?? existing?.socks5Password,
    socks5ProxyChain: hostData.socks5ProxyChain ?? existing?.socks5ProxyChain,
    macAddress: hostData.macAddress ?? existing?.macAddress,
    portKnockSequence:
      hostData.portKnockSequence ?? existing?.portKnockSequence,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export async function isOfflineModeEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(OFFLINE_MODE_KEY)) === "true";
}

export async function setOfflineModeEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(OFFLINE_MODE_KEY, "true");
  } else {
    await AsyncStorage.removeItem(OFFLINE_MODE_KEY);
  }
}

export async function getOfflineHosts(): Promise<SSHHost[]> {
  return parseHosts(await AsyncStorage.getItem(OFFLINE_HOSTS_KEY));
}

export async function saveOfflineHosts(hosts: SSHHost[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_HOSTS_KEY, JSON.stringify(hosts));
}

export async function cacheOnlineHosts(hosts: SSHHost[]): Promise<void> {
  const existing = await getOfflineHosts();
  const existingById = new Map(existing.map((host) => [host.id, host]));
  const onlineIds = new Set(hosts.map((host) => host.id));
  const offlineOnly = existing.filter((host) => host.id < 0);
  const mergedOnline = hosts.map((host) => ({
    ...host,
    password: existingById.get(host.id)?.password ?? host.password,
    key: existingById.get(host.id)?.key ?? host.key,
    keyPassword: existingById.get(host.id)?.keyPassword ?? host.keyPassword,
  }));

  await saveOfflineHosts([
    ...offlineOnly,
    ...mergedOnline,
    ...existing.filter((host) => host.id >= 0 && !onlineIds.has(host.id)),
  ]);
}

export async function createOfflineHost(
  hostData: SSHHostDataWithStringKey,
): Promise<SSHHost> {
  const hosts = await getOfflineHosts();
  const host = normalizeHostData(hostData);
  await saveOfflineHosts([host, ...hosts]);
  return host;
}

export async function updateOfflineHost(
  hostId: number,
  hostData: SSHHostDataWithStringKey,
): Promise<SSHHost> {
  const hosts = await getOfflineHosts();
  const existing = hosts.find((host) => host.id === hostId);
  const updated = normalizeHostData(hostData, existing);
  const hostToSave = existing ? updated : { ...updated, id: hostId };
  await saveOfflineHosts(
    existing
      ? hosts.map((host) => (host.id === hostId ? hostToSave : host))
      : [hostToSave, ...hosts],
  );
  return hostToSave;
}

export async function deleteOfflineHost(hostId: number): Promise<void> {
  const hosts = await getOfflineHosts();
  await saveOfflineHosts(hosts.filter((host) => host.id !== hostId));
}

export async function getOfflineHostById(hostId: number): Promise<SSHHost> {
  const hosts = await getOfflineHosts();
  const host = hosts.find((item) => item.id === hostId);
  if (!host) {
    throw new Error("Offline host not found");
  }
  return host;
}

export async function getOfflineFoldersWithStats() {
  const hosts = await getOfflineHosts();
  const folderNames = Array.from(
    new Set(hosts.map((host) => host.folder || "Offline")),
  );

  return folderNames.map((name) => ({
    name,
    stats: {
      totalHosts: hosts.filter((host) => (host.folder || "Offline") === name)
        .length,
      hostsByType: [
        {
          type: "ssh",
          count: hosts.filter((host) => (host.folder || "Offline") === name)
            .length,
        },
      ],
    },
  }));
}

export async function saveRememberedUsername(
  username: string,
  serverUrl?: string | null,
): Promise<void> {
  const cleanUsername = username.trim();
  if (!cleanUsername) return;

  await AsyncStorage.setItem(LAST_USERNAME_KEY, cleanUsername);

  const serverKey = normalizeServerKey(serverUrl);
  if (!serverKey) return;

  const rawMap = await AsyncStorage.getItem(USERNAME_MAP_KEY);
  let map: Record<string, string> = {};
  try {
    map = rawMap ? JSON.parse(rawMap) : {};
  } catch {}
  map[serverKey] = cleanUsername;
  await AsyncStorage.setItem(USERNAME_MAP_KEY, JSON.stringify(map));
}

export async function getRememberedUsername(
  serverUrl?: string | null,
): Promise<string> {
  const serverKey = normalizeServerKey(serverUrl);
  if (serverKey) {
    try {
      const rawMap = await AsyncStorage.getItem(USERNAME_MAP_KEY);
      const map = rawMap ? JSON.parse(rawMap) : {};
      if (typeof map[serverKey] === "string") {
        return map[serverKey];
      }
    } catch {}
  }

  return (await AsyncStorage.getItem(LAST_USERNAME_KEY)) || "";
}
