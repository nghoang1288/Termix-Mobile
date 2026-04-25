import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HostKeyData, TerminalHostConfig } from "./NativeWebSocketManager";

export interface DirectHostKeyResult {
  host?: string | null;
  type?: string | null;
  fingerprint?: string | null;
}

export interface StoredDirectHostKey {
  host: string;
  port: number;
  keyType: string;
  fingerprint: string;
  algorithm: string;
  trustedAt: number;
}

const STORAGE_KEY = "directSSHKnownHostKeys";

export function normalizeDirectFingerprint(fingerprint: string): string {
  const value = fingerprint.trim();
  if (!value) return "";

  if (/^[0-9a-f:]+$/i.test(value)) {
    return value.replace(/:/g, "").toLowerCase();
  }

  return value;
}

export function inferDirectFingerprintAlgorithm(fingerprint: string): string {
  if (fingerprint.trim().toLowerCase().startsWith("sha256:")) {
    return "sha256";
  }

  return "md5";
}

export function formatDirectFingerprint(fingerprint: string): string {
  const value = fingerprint.trim();
  if (!value) return value;

  if (/^[0-9a-f:]+$/i.test(value)) {
    return (
      normalizeDirectFingerprint(value)
        .match(/.{1,2}/g)
        ?.join(":") || value
    );
  }

  return value;
}

export function directHostKeyStorageId(host: string, port: number): string {
  return `${host.trim().toLowerCase()}:${port}`;
}

export async function getKnownDirectHostKey(
  host: string,
  port: number,
): Promise<StoredDirectHostKey | null> {
  const records = await readKnownHostKeys();
  return records[directHostKeyStorageId(host, port)] || null;
}

export async function saveDirectHostKey(
  host: string,
  port: number,
  observed: DirectHostKeyResult,
): Promise<StoredDirectHostKey> {
  const fingerprint = normalizeDirectFingerprint(observed.fingerprint || "");
  const keyType = observed.type || "unknown";
  const record: StoredDirectHostKey = {
    host,
    port,
    keyType,
    fingerprint,
    algorithm: inferDirectFingerprintAlgorithm(observed.fingerprint || ""),
    trustedAt: Date.now(),
  };

  const records = await readKnownHostKeys();
  records[directHostKeyStorageId(host, port)] = record;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));

  return record;
}

export function buildDirectHostKeyData(
  hostConfig: TerminalHostConfig,
  observed: DirectHostKeyResult,
  knownHostKey?: StoredDirectHostKey | null,
): HostKeyData {
  const fingerprint = normalizeDirectFingerprint(observed.fingerprint || "");
  const keyType = observed.type || "unknown";
  const algorithm = inferDirectFingerprintAlgorithm(observed.fingerprint || "");

  return {
    ip: hostConfig.ip,
    port: Number(hostConfig.port || 22),
    hostname: hostConfig.name || observed.host || hostConfig.ip,
    fingerprint,
    oldFingerprint: knownHostKey?.fingerprint,
    keyType,
    oldKeyType: knownHostKey?.keyType,
    algorithm,
  };
}

export function isDirectHostKeyTrusted(
  knownHostKey: StoredDirectHostKey | null,
  observed: DirectHostKeyResult,
): boolean {
  if (!knownHostKey) return false;
  return (
    knownHostKey.fingerprint ===
    normalizeDirectFingerprint(observed.fingerprint || "")
  );
}

async function readKnownHostKeys(): Promise<
  Record<string, StoredDirectHostKey>
> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
