import { Alert } from "react-native";
import SSHClient, {
  type HostKeyResult,
} from "@dylankenneally/react-native-ssh-sftp";
import {
  getCredentialDetails,
  getSSHHostWithCredentials,
} from "../../../main-axios";
import type {
  SSHHost,
  TunnelConnection,
  TunnelStatus,
} from "../../../../types";
import {
  buildDirectHostKeyData,
  formatDirectFingerprint,
  getKnownDirectHostKey,
  isDirectHostKeyTrusted,
  saveDirectHostKey,
} from "@/app/tabs/sessions/terminal/direct-host-keys";
import {
  directAuthUnavailable,
  mergeCredentialDetails,
  normalizeDirectAuthConfig,
} from "@/app/tabs/sessions/terminal/direct-auth";

type DirectTunnelHostConfig = SSHHost & {
  privateKey?: string | null;
  sshKey?: string | null;
};

type ActiveDirectTunnel = {
  client: SSHClient;
  bindAddress: string;
  localPort: number;
};

const DEFAULT_BIND_ADDRESS = "127.0.0.1";
const activeTunnels = new Map<string, ActiveDirectTunnel>();
let tunnelStatuses: Record<string, TunnelStatus> = {};

export function getDirectTunnelStatuses(): Record<string, TunnelStatus> {
  return { ...tunnelStatuses };
}

export async function connectDirectTunnel(
  tunnelName: string,
  host: SSHHost,
  tunnel: TunnelConnection,
): Promise<void> {
  if (activeTunnels.has(tunnelName)) {
    tunnelStatuses = {
      ...tunnelStatuses,
      [tunnelName]: { connected: true, status: "connected" },
    };
    return;
  }

  tunnelStatuses = {
    ...tunnelStatuses,
    [tunnelName]: { connected: false, status: "connecting" },
  };

  let client: SSHClient | null = null;

  try {
    const authConfig = await resolveAuthConfig(host);
    const sshHost = authConfig.ip?.replace(/^\[|\]$/g, "");
    const sshPort = Number(authConfig.port || 22);

    if (!sshHost || !authConfig.username) {
      throw new Error("Host or username is missing");
    }

    client = await connectClient(authConfig, sshHost, sshPort);

    const hostKeyAccepted = await verifyDirectTunnelHostKey(
      authConfig,
      sshHost,
      sshPort,
      client,
    );
    if (!hostKeyAccepted) {
      throw new Error("Host key rejected");
    }

    await client.startLocalPortForwarding(
      DEFAULT_BIND_ADDRESS,
      Number(tunnel.sourcePort),
      tunnel.endpointHost,
      Number(tunnel.endpointPort),
    );

    activeTunnels.set(tunnelName, {
      client,
      bindAddress: DEFAULT_BIND_ADDRESS,
      localPort: Number(tunnel.sourcePort),
    });
    tunnelStatuses = {
      ...tunnelStatuses,
      [tunnelName]: { connected: true, status: "connected" },
    };
  } catch (error) {
    client?.disconnect();
    tunnelStatuses = {
      ...tunnelStatuses,
      [tunnelName]: {
        connected: false,
        status: "failed",
        reason: formatError(error),
        errorType: "CONNECTION_FAILED",
      },
    };
    throw error;
  }
}

export async function disconnectDirectTunnel(
  tunnelName: string,
): Promise<void> {
  const activeTunnel = activeTunnels.get(tunnelName);

  tunnelStatuses = {
    ...tunnelStatuses,
    [tunnelName]: { connected: Boolean(activeTunnel), status: "disconnecting" },
  };

  if (!activeTunnel) {
    tunnelStatuses = {
      ...tunnelStatuses,
      [tunnelName]: { connected: false, status: "disconnected" },
    };
    return;
  }

  try {
    await activeTunnel.client.stopLocalPortForwarding(
      activeTunnel.bindAddress,
      activeTunnel.localPort,
    );
  } catch {
    // Disconnecting the SSH session below also tears down the forward.
  } finally {
    activeTunnel.client.disconnect();
    activeTunnels.delete(tunnelName);
    tunnelStatuses = {
      ...tunnelStatuses,
      [tunnelName]: { connected: false, status: "disconnected" },
    };
  }
}

async function resolveAuthConfig(
  host: SSHHost,
): Promise<DirectTunnelHostConfig> {
  const inlineAuthConfig = normalizeDirectAuthConfig(host);
  if (!needsServerCredentials(inlineAuthConfig)) {
    return inlineAuthConfig;
  }

  try {
    const resolved = (await getSSHHostWithCredentials(
      host.id,
    )) as DirectTunnelHostConfig;
    return normalizeDirectAuthConfig({
      ...host,
      ...resolved,
      id: host.id,
    });
  } catch {}

  if (host.credentialId) {
    try {
      const credential = await getCredentialDetails(host.credentialId);
      return mergeCredentialDetails(host, credential);
    } catch {}
  }

  return directAuthUnavailable(host);
}

async function connectClient(
  authConfig: DirectTunnelHostConfig,
  host: string,
  port: number,
): Promise<SSHClient> {
  if (authConfig.authType === "password" && authConfig.password) {
    return SSHClient.connectWithPassword(
      host,
      port,
      authConfig.username,
      authConfig.password,
    );
  }

  if (authConfig.authType === "key") {
    const privateKey = normalizePrivateKey(
      authConfig.key || authConfig.privateKey || authConfig.sshKey,
    );
    if (!privateKey) throw new Error("Private key is missing");

    return SSHClient.connectWithKey(
      host,
      port,
      authConfig.username,
      privateKey,
      authConfig.keyPassword || undefined,
    );
  }

  throw new Error(
    "Direct tunnel requires password or key authentication. Managed credential could not be resolved on this server.",
  );
}

async function verifyDirectTunnelHostKey(
  hostConfig: DirectTunnelHostConfig,
  host: string,
  port: number,
  client: SSHClient,
): Promise<boolean> {
  const observed: HostKeyResult | null = await client
    .getHostKey()
    .catch(() => null);
  if (!observed?.fingerprint) return true;

  const knownHostKey = await getKnownDirectHostKey(host, port);
  if (isDirectHostKeyTrusted(knownHostKey, observed)) {
    return true;
  }

  const accepted = await promptForHostKey(hostConfig, observed, knownHostKey);
  if (accepted) {
    await saveDirectHostKey(host, port, observed);
  }

  return accepted;
}

function promptForHostKey(
  hostConfig: DirectTunnelHostConfig,
  observed: HostKeyResult,
  knownHostKey: Awaited<ReturnType<typeof getKnownDirectHostKey>>,
): Promise<boolean> {
  const scenario = knownHostKey ? "changed" : "new";
  const data = buildDirectHostKeyData(hostConfig, observed, knownHostKey);
  const title =
    scenario === "changed" ? "SSH host key changed" : "Trust SSH host key?";
  const message =
    scenario === "changed"
      ? `${hostConfig.name}\nPrevious: ${formatDirectFingerprint(data.oldFingerprint || "")}\nNew: ${formatDirectFingerprint(data.fingerprint)}`
      : `${hostConfig.name}\n${formatDirectFingerprint(data.fingerprint)}`;

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Trust", style: "default", onPress: () => resolve(true) },
    ]);
  });
}

function normalizePrivateKey(key: string | null | undefined): string {
  return typeof key === "string"
    ? key.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    : "";
}

function needsServerCredentials(config: DirectTunnelHostConfig): boolean {
  if (config.authType === "credential") return true;
  if (config.authType === "password") return !hasText(config.password);
  if (config.authType === "key") {
    return (
      !hasText(config.key) &&
      !hasText(config.privateKey) &&
      !hasText(config.sshKey)
    );
  }
  return false;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
