import { NativeModules, Platform } from "react-native";

type KeepAliveNativeModule = {
  start?: (label?: string | null) => Promise<boolean>;
  stop?: () => Promise<boolean>;
};

const nativeKeepAlive = NativeModules.SSHBridgeConnectionKeepAlive as
  | KeepAliveNativeModule
  | undefined;

const activeTokens = new Map<string, string>();
let nextTokenId = 0;
let lastLabel: string | null = null;

export function retainConnectionKeepAlive(label: string): () => void {
  if (Platform.OS !== "android" || !nativeKeepAlive?.start) {
    return () => {};
  }

  const token = `${Date.now()}-${nextTokenId++}`;
  activeTokens.set(token, label);
  updateKeepAliveService();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeTokens.delete(token);
    updateKeepAliveService();
  };
}

function updateKeepAliveService() {
  if (Platform.OS !== "android" || !nativeKeepAlive) return;

  if (activeTokens.size === 0) {
    lastLabel = null;
    nativeKeepAlive.stop?.().catch(() => {});
    return;
  }

  const labels = Array.from(activeTokens.values());
  const label =
    labels.length === 1 ? labels[0] : `${labels.length} active SSH connections`;

  if (label === lastLabel) return;

  lastLabel = label;
  nativeKeepAlive.start?.(label).catch(() => {});
}
