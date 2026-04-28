import { Stack } from "expo-router";
import { AppProvider, useAppContext } from "./AppContext";
import { TerminalSessionsProvider } from "./contexts/TerminalSessionsContext";
import { TerminalCustomizationProvider } from "./contexts/TerminalCustomizationContext";
import { KeyboardProvider } from "./contexts/KeyboardContext";
import { KeyboardCustomizationProvider } from "./contexts/KeyboardCustomizationContext";
import LoginForm from "@/app/authentication/LoginForm";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import UpdateRequired from "@/app/authentication/UpdateRequired";

function RootLayoutContent() {
  const {
    setShowServerManager,
    showLoginForm,
    setShowLoginForm,
    isAuthenticated,
    isOfflineMode,
    showUpdateScreen,
    isLoading,
  } = useAppContext();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f7f4ed] px-6">
        <View className="w-full max-w-sm rounded-2xl border border-[#eceae4] bg-[#fcfbf8] p-6">
          <View className="mb-5 flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-lg bg-[#1c1c1c]">
              <Text className="font-mono text-sm font-bold text-[#fcfbf8]">
                SB
              </Text>
            </View>
            <View className="ml-3">
              <Text className="text-base font-semibold text-[#1c1c1c]">
                SSHBridge
              </Text>
              <Text className="text-xs text-[#5f5f5d]">Mobile terminal</Text>
            </View>
          </View>
          <ActivityIndicator size="small" color="#1c1c1c" />
          <Text className="mt-4 text-sm font-medium text-[#5f5f5d]">
            Initializing command deck...
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowLoginForm(true);
            setShowServerManager(false);
          }}
          className="mt-6 rounded-lg border border-[#1c1c1c66] px-6 py-3"
        >
          <Text className="font-semibold text-[#1c1c1c]">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showUpdateScreen) {
    return <UpdateRequired />;
  }

  if (showLoginForm) {
    return <LoginForm />;
  }

  if (isAuthenticated || isOfflineMode) {
    return (
      <View className="flex-1 bg-[#f7f4ed]">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#f7f4ed" },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    );
  }

  return <LoginForm />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <TerminalSessionsProvider>
            <TerminalCustomizationProvider>
              <KeyboardProvider>
                <KeyboardCustomizationProvider>
                  <RootLayoutContent />
                  <Toaster
                    theme="light"
                    position="top-center"
                    toastOptions={{
                      style: {
                        backgroundColor: "#fcfbf8",
                        borderWidth: 1,
                        borderColor: "#eceae4",
                      },
                    }}
                    richColors={false}
                    closeButton={true}
                    duration={4000}
                  />
                </KeyboardCustomizationProvider>
              </KeyboardProvider>
            </TerminalCustomizationProvider>
          </TerminalSessionsProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
