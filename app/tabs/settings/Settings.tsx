import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

  const toggleTerminalConnectionMode = async () => {
    const previousMode = terminalConnectionMode;
    const nextMode = previousMode === "direct" ? "relay" : "direct";
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

          <TouchableOpacity
            onPress={toggleTerminalConnectionMode}
            className="bg-[#1a1a1a] border border-[#303032] px-6 py-4 rounded-lg flex-row items-center justify-between mt-3"
          >
            <View className="flex-1 pr-4">
              <Text className="text-white font-semibold text-base">
                Direct SSH Terminal
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                {terminalConnectionMode === "direct"
                  ? "Phone connects directly to SSH hosts"
                  : "Termix server relays SSH sessions"}
              </Text>
            </View>
            <View
              className={`w-12 h-7 rounded-full p-1 ${
                terminalConnectionMode === "direct"
                  ? "bg-green-500"
                  : "bg-[#303032]"
              }`}
            >
              <View
                className={`h-5 w-5 rounded-full bg-white ${
                  terminalConnectionMode === "direct" ? "ml-5" : "ml-0"
                }`}
              />
            </View>
          </TouchableOpacity>
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
            To delete your account, visit your self-hosted Termix instance and
            log in.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
