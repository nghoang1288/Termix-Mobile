import AsyncStorage from "@react-native-async-storage/async-storage";

export type TerminalConnectionMode = "direct" | "relay";

const STORAGE_KEY = "terminalConnectionMode";

export async function getTerminalConnectionMode(
  defaultMode: TerminalConnectionMode = "direct",
): Promise<TerminalConnectionMode> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved === "relay" || saved === "direct" ? saved : defaultMode;
}

export async function setTerminalConnectionMode(
  mode: TerminalConnectionMode,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}
