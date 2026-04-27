import { useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAppContext } from "@/app/AppContext";
import { useTerminalSessions } from "@/app/contexts/TerminalSessionsContext";
import { clearAuth, logoutUser } from "@/app/main-axios";
import {
  getTerminalConnectionMode,
  setTerminalConnectionMode,
  type TerminalConnectionMode,
} from "@/app/tabs/sessions/terminal/terminal-connection-mode";
import { useOrientation } from "@/app/utils/orientation";
import { getResponsivePadding } from "@/app/utils/responsive";

export default function Settings() {
  const router = useRouter();
  const { isLandscape } = useOrientation();
  const { setAuthenticated, setShowLoginForm, setShowServerManager } =
    useAppContext();
  const { clearAllSessions } = useTerminalSessions();
  const insets = useSafeAreaInsets();
  const [terminalConnectionMode, setLocalTerminalConnectionMode] =
    useState<TerminalConnectionMode>("direct");
  const appVersion = Constants.expoConfig?.version || "1.3.2";

  const padding = getResponsivePadding(isLandscape);

  useEffect(() => {
    let mounted = true;

    getTerminalConnectionMode("direct")
      .then((mode) => {
        if (mounted) setLocalTerminalConnectionMode(mode);
      })
      .catch((error) => {
        console.error(
          "[Settings] Failed to load terminal connection mode:",
          error,
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();

      await clearAuth();

      clearAllSessions();

      setAuthenticated(false);
      setShowLoginForm(true);
      setShowServerManager(false);
    } catch (error) {
      console.error("[Settings] Error during logout:", error);
    }
  };

  const saveTerminalConnectionMode = async (
    nextMode: TerminalConnectionMode,
  ) => {
    if (nextMode === terminalConnectionMode) return;

    const previousMode = terminalConnectionMode;
    setLocalTerminalConnectionMode(nextMode);

    try {
      await setTerminalConnectionMode(nextMode);
    } catch (error) {
      console.error(
        "[Settings] Failed to save terminal connection mode:",
        error,
      );
      setLocalTerminalConnectionMode(previousMode);
    }
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg">
      <View style={{ padding, paddingTop: insets.top + 20 }}>
        <Text
          className="text-3xl font-bold text-white mb-6"
          style={{ lineHeight: 36, includeFontPadding: false }}
        >
          Settings
        </Text>

        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-3">
            Terminal
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push("/tabs/settings/TerminalCustomization" as any)
            }
            className="bg-[#1a1a1a] border border-[#303032] px-6 py-4 rounded-lg flex-row items-center justify-between"
          >
            <View>
              <Text className="text-white font-semibold text-base">
                Customize Terminal
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                Font size and appearance
              </Text>
            </View>
            <Text className="text-green-500 text-xl">{">"}</Text>
          </TouchableOpacity>

          <View className="mt-3 bg-[#1a1a1a] border border-[#303032] px-4 py-4 rounded-lg">
            <Text className="text-white font-semibold text-base">
              SSH Connection Mode
            </Text>
            <Text className="text-gray-400 text-sm mt-1 mb-3">
              Applies to terminal sessions and tunnels.
            </Text>

            <TouchableOpacity
              onPress={() => saveTerminalConnectionMode("direct")}
              className={`px-4 py-3 rounded-lg border mb-2 ${
                terminalConnectionMode === "direct"
                  ? "border-green-500 bg-green-500/10"
                  : "border-[#303032] bg-[#111113]"
              }`}
            >
              <Text className="text-white font-semibold">
                Direct from phone
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                The Android device opens SSH and local port forwards itself.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => saveTerminalConnectionMode("relay")}
              className={`px-4 py-3 rounded-lg border ${
                terminalConnectionMode === "relay"
                  ? "border-green-500 bg-green-500/10"
                  : "border-[#303032] bg-[#111113]"
              }`}
            >
              <Text className="text-white font-semibold">
                Via SSHBridge server
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                The SSHBridge backend opens SSH/tunnels and the app controls
                them.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-3">
            Keyboard
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push("/tabs/settings/KeyboardCustomization" as any)
            }
            className="bg-[#1a1a1a] border border-[#303032] px-6 py-4 rounded-lg flex-row items-center justify-between"
          >
            <View>
              <Text className="text-white font-semibold text-base">
                Customize Keyboard
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                Layouts, keys, and preferences
              </Text>
            </View>
            <Text className="text-green-500 text-xl">{">"}</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-3">Account</Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Logout</Text>
          </TouchableOpacity>

          <Text className="text-gray-400 text-sm mt-3">
            To delete your account, visit your self-hosted SSHBridge instance
            and log in.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-3">About</Text>
          <View className="bg-[#1a1a1a] border border-[#303032] px-6 py-4 rounded-lg">
            <Text className="text-white font-semibold text-base">
              SSHBridge Mobile
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              Version {appVersion}
            </Text>
            <Text className="text-gray-400 text-sm mt-3">
              Native mobile SSH terminal with direct device connections,
              SSHBridge server relay mode, and tunnel/port forwarding
              management.
            </Text>

            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  "https://github.com/nghoang1288/SSHBridge-Mobile",
                )
              }
              className="mt-4 bg-[#111113] border border-[#303032] px-4 py-3 rounded-lg"
            >
              <Text className="text-green-500 font-semibold">
                Open mobile repository
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://github.com/nghoang1288/SSHBridge-Web")
              }
              className="mt-3 bg-[#111113] border border-[#303032] px-4 py-3 rounded-lg"
            >
              <Text className="text-green-500 font-semibold">
                Open web/server repository
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
