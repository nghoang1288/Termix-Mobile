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
    <ScrollView className="flex-1 bg-[#f7f4ed]">
      <View style={{ padding, paddingTop: insets.top + 20 }}>
        <Text
          className="mb-6 text-3xl font-semibold text-[#1c1c1c]"
          style={{ lineHeight: 36, includeFontPadding: false }}
        >
          Settings
        </Text>

        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-[#1c1c1c]">
            Terminal
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push("/tabs/settings/TerminalCustomization" as any)
            }
            className="flex-row items-center justify-between rounded-lg border border-[#eceae4] bg-[#fcfbf8] px-6 py-4"
          >
            <View>
              <Text className="text-base font-semibold text-[#1c1c1c]">
                Customize Terminal
              </Text>
              <Text className="mt-1 text-sm text-[#5f5f5d]">
                Font size and appearance
              </Text>
            </View>
            <Text className="text-xl text-[#1c1c1c]">{">"}</Text>
          </TouchableOpacity>

          <View className="mt-3 rounded-lg border border-[#eceae4] bg-[#fcfbf8] px-4 py-4">
            <Text className="text-base font-semibold text-[#1c1c1c]">
              SSH Connection Mode
            </Text>
            <Text className="mb-3 mt-1 text-sm text-[#5f5f5d]">
              Applies to terminal sessions and tunnels.
            </Text>

            <TouchableOpacity
              onPress={() => saveTerminalConnectionMode("direct")}
              className={`px-4 py-3 rounded-lg border mb-2 ${
                terminalConnectionMode === "direct"
                  ? "border-[#1c1c1c] bg-[#1c1c1c]"
                  : "border-[#eceae4] bg-[#f7f4ed]"
              }`}
            >
              <Text
                className={`font-semibold ${
                  terminalConnectionMode === "direct"
                    ? "text-[#fcfbf8]"
                    : "text-[#1c1c1c]"
                }`}
              >
                Direct from phone
              </Text>
              <Text
                className={`mt-1 text-sm ${
                  terminalConnectionMode === "direct"
                    ? "text-[#ded8c9]"
                    : "text-[#5f5f5d]"
                }`}
              >
                The Android device opens SSH and local port forwards itself.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => saveTerminalConnectionMode("relay")}
              className={`px-4 py-3 rounded-lg border ${
                terminalConnectionMode === "relay"
                  ? "border-[#1c1c1c] bg-[#1c1c1c]"
                  : "border-[#eceae4] bg-[#f7f4ed]"
              }`}
            >
              <Text
                className={`font-semibold ${
                  terminalConnectionMode === "relay"
                    ? "text-[#fcfbf8]"
                    : "text-[#1c1c1c]"
                }`}
              >
                Via SSHBridge server
              </Text>
              <Text
                className={`mt-1 text-sm ${
                  terminalConnectionMode === "relay"
                    ? "text-[#ded8c9]"
                    : "text-[#5f5f5d]"
                }`}
              >
                The SSHBridge backend opens SSH/tunnels and the app controls
                them.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-[#1c1c1c]">
            Keyboard
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push("/tabs/settings/KeyboardCustomization" as any)
            }
            className="flex-row items-center justify-between rounded-lg border border-[#eceae4] bg-[#fcfbf8] px-6 py-4"
          >
            <View>
              <Text className="text-base font-semibold text-[#1c1c1c]">
                Customize Keyboard
              </Text>
              <Text className="mt-1 text-sm text-[#5f5f5d]">
                Layouts, keys, and preferences
              </Text>
            </View>
            <Text className="text-xl text-[#1c1c1c]">{">"}</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-[#1c1c1c]">
            Account
          </Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Logout</Text>
          </TouchableOpacity>

          <Text className="mt-3 text-sm text-[#5f5f5d]">
            To delete your account, visit your self-hosted SSHBridge instance
            and log in.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-[#1c1c1c]">
            About
          </Text>
          <View className="rounded-lg border border-[#eceae4] bg-[#fcfbf8] px-6 py-4">
            <Text className="text-base font-semibold text-[#1c1c1c]">
              SSHBridge Mobile
            </Text>
            <Text className="mt-1 text-sm text-[#5f5f5d]">
              Version {appVersion}
            </Text>
            <Text className="mt-3 text-sm text-[#5f5f5d]">
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
              className="mt-4 rounded-lg border border-[#1c1c1c66] bg-[#f7f4ed] px-4 py-3"
            >
              <Text className="font-semibold text-[#1c1c1c]">
                Open mobile repository
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://github.com/nghoang1288/SSHBridge-Web")
              }
              className="mt-3 rounded-lg border border-[#1c1c1c66] bg-[#f7f4ed] px-4 py-3"
            >
              <Text className="font-semibold text-[#1c1c1c]">
                Open web/server repository
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
