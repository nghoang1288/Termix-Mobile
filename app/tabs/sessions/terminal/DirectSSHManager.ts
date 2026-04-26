import SSHClient, {
  PtyType,
  type HostKeyResult,
} from "@dylankenneally/react-native-ssh-sftp";
import {
  getCredentialDetails,
  getSSHHostWithCredentials,
} from "../../../main-axios";
import type {
  NativeWSConfig,
  TerminalHostConfig,
} from "./NativeWebSocketManager";
import {
  buildDirectHostKeyData,
  getKnownDirectHostKey,
  isDirectHostKeyTrusted,
  saveDirectHostKey,
} from "./direct-host-keys";
import {
  directAuthUnavailable,
  mergeCredentialDetails,
  normalizeDirectAuthConfig,
} from "./direct-auth";
import { retainConnectionKeepAlive } from "@/app/native/connection-keep-alive";

type DirectAuthConfig = TerminalHostConfig & {
  password?: string | null;
  key?: string | null;
  keyPassword?: string | null;
  privateKey?: string | null;
  sshKey?: string | null;
};

export class DirectSSHManager {
  private config: NativeWSConfig;
  private client: SSHClient | null = null;
  private hostConfig: TerminalHostConfig;
  private destroyed = false;
  private cols = 80;
  private rows = 24;
  private hasNotifiedFailure = false;
  private pendingHostKeyDecision: ((accepted: boolean) => void) | null = null;
  private releaseKeepAlive: (() => void) | null = null;

  constructor(config: NativeWSConfig) {
    this.config = config;
    this.hostConfig = config.hostConfig;
  }

  async connect(cols: number, rows: number): Promise<void> {
    if (this.destroyed) return;

    this.cols = cols;
    this.rows = rows;
    this.hasNotifiedFailure = false;
    this.config.onStateChange("connecting");

    try {
      const authConfig = await this.resolveAuthConfig();
      if (this.destroyed) return;

      const host = authConfig.ip?.replace(/^\[|\]$/g, "");
      const port = Number(authConfig.port || 22);
      const username = authConfig.username;

      if (!host || !username) {
        throw new Error("Host or username is missing");
      }

      let client: SSHClient;
      if (authConfig.authType === "password" && authConfig.password) {
        client = await withTimeout(
          SSHClient.connectWithPassword(
            host,
            port,
            username,
            authConfig.password,
          ),
          30000,
          "Direct SSH connection timeout",
        );
      } else if (authConfig.authType === "key") {
        const privateKey = normalizePrivateKey(
          authConfig.key || authConfig.privateKey || authConfig.sshKey,
        );
        if (!privateKey) {
          this.config.onAuthDialogNeeded("no_keyboard");
          return;
        }

        client = await withTimeout(
          SSHClient.connectWithKey(
            host,
            port,
            username,
            privateKey,
            authConfig.keyPassword || undefined,
          ),
          30000,
          "Direct SSH connection timeout",
        );
      } else {
        this.config.onAuthDialogNeeded("no_keyboard");
        return;
      }

      if (this.destroyed) {
        client.disconnect();
        return;
      }

      this.client = client;

      const hostKeyAccepted = await this.verifyHostKey(host, port, client);
      if (!hostKeyAccepted) {
        client.disconnect();
        throw new Error("Host key rejected");
      }

      client.on("Shell", (event) => {
        if (this.destroyed || event == null) return;
        this.config.onData(String(event));
        this.config.onStateChange("dataReceived", {
          hostName: this.hostConfig.name,
          connectionMode: "direct",
        });
      });

      await withTimeout(
        client.startShell(PtyType.XTERM),
        10000,
        "Direct SSH shell startup timeout",
      );

      if (this.destroyed) return;

      this.retainKeepAlive();
      this.config.onStateChange("connected", {
        hostName: this.hostConfig.name,
        connectionMode: "direct",
      });
      this.config.onPostConnectionSetup();
    } catch (error) {
      if (this.destroyed) return;
      this.notifyFailureOnce(formatError(error));
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.releaseKeepAliveHandle();
    try {
      this.client?.disconnect();
    } catch {}
    this.client = null;
  }

  sendInput(data: string): void {
    if (!this.client || this.destroyed) return;

    this.client.writeToShell(data).catch((error) => {
      this.notifyFailureOnce(formatError(error));
    });
  }

  sendResize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
  }

  sendTotpResponse(_code: string, _isPassword: boolean): void {}

  sendHostKeyResponse(action: "accept" | "reject"): void {
    if (!this.pendingHostKeyDecision) return;
    this.pendingHostKeyDecision(action === "accept");
    this.pendingHostKeyDecision = null;
  }

  sendReconnectWithCredentials(
    credentials: { password?: string; sshKey?: string; keyPassword?: string },
    cols: number,
    rows: number,
  ): void {
    this.destroy();
    this.destroyed = false;
    this.hostConfig = {
      ...this.hostConfig,
      password: credentials.password,
      key: credentials.sshKey,
      keyPassword: credentials.keyPassword,
      authType: credentials.password ? "password" : "key",
    };
    void this.connect(cols, rows);
  }

  notifyBackgrounded(): void {}

  notifyForegrounded(): void {}

  private retainKeepAlive(): void {
    if (this.releaseKeepAlive) return;
    this.releaseKeepAlive = retainConnectionKeepAlive(
      `Direct SSH: ${this.hostConfig.name}`,
    );
  }

  private releaseKeepAliveHandle(): void {
    if (!this.releaseKeepAlive) return;
    this.releaseKeepAlive();
    this.releaseKeepAlive = null;
  }

  private async resolveAuthConfig(): Promise<DirectAuthConfig> {
    const inlineAuthConfig = normalizeDirectAuthConfig(this.hostConfig);
    if (!needsServerCredentials(inlineAuthConfig)) {
      return inlineAuthConfig;
    }

    try {
      const resolved = (await getSSHHostWithCredentials(
        this.hostConfig.id,
      )) as DirectAuthConfig;

      return normalizeDirectAuthConfig({
        ...this.hostConfig,
        ...resolved,
        id: this.hostConfig.id,
      });
    } catch {}

    if (this.hostConfig.credentialId) {
      try {
        const credential = await getCredentialDetails(
          this.hostConfig.credentialId,
        );
        return mergeCredentialDetails(this.hostConfig, credential);
      } catch {}
    }

    return directAuthUnavailable(this.hostConfig);
  }

  private notifyFailureOnce(message: string): void {
    if (this.hasNotifiedFailure) return;
    this.hasNotifiedFailure = true;
    this.config.onConnectionFailed(
      `${this.hostConfig.name}: Direct SSH failed - ${message}`,
    );
  }

  private async verifyHostKey(
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

    const scenario = knownHostKey ? "changed" : "new";
    const hostKeyData = buildDirectHostKeyData(
      {
        ...this.hostConfig,
        ip: host,
        port,
      },
      observed,
      knownHostKey,
    );

    if (!this.config.onHostKeyVerificationRequired) {
      return false;
    }

    this.config.onHostKeyVerificationRequired(scenario, hostKeyData);
    const accepted = await this.waitForHostKeyDecision();

    if (accepted) {
      await saveDirectHostKey(host, port, observed);
    }

    return accepted;
  }

  private waitForHostKeyDecision(): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingHostKeyDecision = resolve;
    });
  }
}

function normalizePrivateKey(key: string | null | undefined): string {
  return typeof key === "string"
    ? key.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    : "";
}

function needsServerCredentials(config: DirectAuthConfig): boolean {
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

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
