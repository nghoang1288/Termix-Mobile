import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const LEGACY_PREFIX = "sshbridge.legacySecure.";

function legacyKey(key: string) {
  return `${LEGACY_PREFIX}${key}`;
}

async function canUseSecureStore() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function setSecureItem(
  key: string,
  value: string | null | undefined,
): Promise<void> {
  if (!value) {
    await deleteSecureItem(key);
    return;
  }

  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(legacyKey(key));
    return;
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    await AsyncStorage.setItem(legacyKey(key), value);
    return;
  }

  throw new Error("Secure storage is not available on this device");
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    const value = await SecureStore.getItemAsync(key);
    if (value) return value;
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return AsyncStorage.getItem(legacyKey(key));
  }

  return null;
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
  }
  await AsyncStorage.removeItem(legacyKey(key));
}

export async function migrateLegacyAsyncStorageSecret(
  storageKey: string,
  secureKey = storageKey,
): Promise<string | null> {
  const secureValue = await getSecureItem(secureKey);
  if (secureValue) return secureValue;

  const legacyValue = await AsyncStorage.getItem(storageKey);
  if (!legacyValue) return null;

  await setSecureItem(secureKey, legacyValue);
  await AsyncStorage.removeItem(storageKey);
  return legacyValue;
}
