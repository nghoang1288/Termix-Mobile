import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useAppContext } from "../AppContext";
import { useEffect, useState } from "react";
import {
  clearAuth,
  getCookie,
  getCurrentServerUrl,
  initializeServerConfig,
  loginUser,
  saveServerConfig,
  verifyTOTPLogin,
} from "../main-axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Server as ServerIcon,
  ShieldCheck,
  User,
  WifiOff,
} from "lucide-react-native";
import {
  getRememberedUsername,
  saveRememberedUsername,
} from "@/app/offline-storage";

function normalizeServerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Please enter a server address");
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  const parsed = new URL(withScheme);

  if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Server address must be a valid HTTP or HTTPS URL");
  }

  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Login failed. Please check the server address and credentials.";
}

export default function LoginForm() {
  const {
    setAuthenticated,
    setOfflineMode,
    setShowLoginForm,
    selectedServer,
    setSelectedServer,
  } = useAppContext();
  const insets = useSafeAreaInsets();
  const [serverAddress, setServerAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingTotpToken, setPendingTotpToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeLogin = async () => {
      const serverUrl = getCurrentServerUrl() || selectedServer?.ip || "";
      if (mounted) {
        setServerAddress(serverUrl);
      }

      const rememberedUsername = await getRememberedUsername(serverUrl);
      if (mounted && rememberedUsername) {
        setUsername(rememberedUsername);
      }

      const existingToken = await getCookie("jwt");
      if (!existingToken) {
        return;
      }

      try {
        const { getUserInfo } = await import("../main-axios");
        const userInfo = await getUserInfo();

        if (mounted && userInfo?.username && userInfo.data_unlocked !== false) {
          setAuthenticated(true);
          setShowLoginForm(false);
        }
      } catch {
        await clearAuth();
      }
    };

    initializeLogin();

    return () => {
      mounted = false;
    };
  }, [selectedServer, setAuthenticated, setShowLoginForm]);

  const resetTotp = () => {
    if (pendingTotpToken) {
      setPendingTotpToken("");
      setTotpCode("");
    }
  };

  const completeLogin = async (serverUrl: string) => {
    await initializeServerConfig();
    await saveRememberedUsername(username, serverUrl);
    setSelectedServer({
      name: "Server",
      ip: serverUrl,
    });
    setAuthenticated(true);
    setShowLoginForm(false);
  };

  const handlePasswordLogin = async (serverUrl: string) => {
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      throw new Error("Please enter your username");
    }

    if (!password) {
      throw new Error("Please enter your password");
    }

    await clearAuth();
    await saveServerConfig({
      serverUrl,
      lastUpdated: new Date().toISOString(),
    });

    const response = await loginUser(cleanUsername, password);

    if (response.requires_totp) {
      const tempToken = response.temp_token || response.token;
      if (!tempToken) {
        throw new Error(
          "TOTP is required, but the server did not return a temporary token",
        );
      }

      setPendingTotpToken(tempToken);
      setTotpCode("");
      return;
    }

    const token = response.token || (await getCookie("jwt"));
    if (!token) {
      throw new Error(
        "Login succeeded, but no authentication token was returned",
      );
    }

    await completeLogin(serverUrl);
  };

  const handleOfflineMode = async () => {
    await clearAuth();
    await setOfflineMode(true);
    setSelectedServer({
      name: "Offline",
      ip: "local",
    });
    setAuthenticated(false);
    setShowLoginForm(false);
  };

  const handleTotpLogin = async (serverUrl: string) => {
    const cleanTotp = totpCode.trim();
    if (!cleanTotp) {
      throw new Error("Please enter your verification code");
    }

    const response = await verifyTOTPLogin(pendingTotpToken, cleanTotp);
    const token = response.token || (await getCookie("jwt"));

    if (!token) {
      throw new Error(
        "Verification succeeded, but no authentication token was returned",
      );
    }

    await completeLogin(serverUrl);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const serverUrl = normalizeServerUrl(serverAddress);
      setServerAddress(serverUrl);

      if (pendingTotpToken) {
        await handleTotpLogin(serverUrl);
      } else {
        await handlePasswordLogin(serverUrl);
      }
    } catch (error) {
      Alert.alert("Login failed", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonLabel = pendingTotpToken ? "Verify and Sign In" : "Sign In";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f7f4ed]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top,
          paddingHorizontal: 24,
          paddingBottom: 32,
          justifyContent: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <View className="mx-auto mb-4 h-12 w-12 items-center justify-center rounded-xl bg-[#1c1c1c]">
            <Text className="font-mono text-base font-bold text-[#fcfbf8]">
              SB
            </Text>
          </View>
          <Text className="text-center text-3xl font-semibold text-[#1c1c1c]">
            SSHBridge
          </Text>
          <Text className="mt-2 text-center text-[#5f5f5d]">
            Connect to your server, then stay in terminal.
          </Text>
        </View>

        <View className="rounded-2xl border border-[#eceae4] bg-[#fcfbf8] p-5">
          <Text className="mb-1 text-lg font-semibold text-[#1c1c1c]">
            Command deck login
          </Text>
          <Text className="mb-5 text-sm text-[#5f5f5d]">
            Server URL, username and password. Next time opens straight to the
            server list.
          </Text>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#1c1c1c]">
              Server Address
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <ServerIcon size={20} color="#5f5f5d" />
              </View>
              <TextInput
                className="rounded-xl border border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]"
                style={{ height: 56, paddingLeft: 48, paddingRight: 16 }}
                placeholder="http://192.168.1.10:30001"
                placeholderTextColor="#8b8780"
                value={serverAddress}
                onChangeText={(value) => {
                  setServerAddress(value);
                  resetTotp();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="url"
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#1c1c1c]">
              Username
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <User size={20} color="#5f5f5d" />
              </View>
              <TextInput
                className="rounded-xl border border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]"
                style={{ height: 56, paddingLeft: 48, paddingRight: 16 }}
                placeholder="admin"
                placeholderTextColor="#8b8780"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  resetTotp();
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                editable={!isSubmitting}
                returnKeyType="next"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-[#1c1c1c]">
              Password
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <Lock size={20} color="#5f5f5d" />
              </View>
              <TextInput
                className="rounded-xl border border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]"
                style={{ height: 56, paddingLeft: 48, paddingRight: 52 }}
                placeholder="Password"
                placeholderTextColor="#8b8780"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  resetTotp();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                editable={!isSubmitting}
                returnKeyType={pendingTotpToken ? "next" : "done"}
                onSubmitEditing={!pendingTotpToken ? handleSubmit : undefined}
              />
              <TouchableOpacity
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2"
                onPress={() => setShowPassword((value) => !value)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#5f5f5d" />
                ) : (
                  <Eye size={20} color="#5f5f5d" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {pendingTotpToken ? (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-[#1c1c1c]">
                Verification Code
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                  <ShieldCheck size={20} color="#5f5f5d" />
                </View>
                <TextInput
                  className="rounded-xl border border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c]"
                  style={{ height: 56, paddingLeft: 48, paddingRight: 16 }}
                  placeholder="123456"
                  placeholderTextColor="#8b8780"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
              <Text className="mt-2 text-xs text-[#5f5f5d]">
                Two-factor authentication is enabled for this account.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`mt-2 flex-row items-center justify-center rounded-xl px-6 py-4 ${
              isSubmitting ? "bg-[#5f5f5d]" : "bg-[#1c1c1c]"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <LogIn size={20} color="#ffffff" />
            )}
            <Text className="ml-2 text-center text-base font-semibold text-white">
              {isSubmitting ? "Signing in..." : buttonLabel}
            </Text>
          </TouchableOpacity>

          {pendingTotpToken ? (
            <TouchableOpacity
              onPress={() => {
                setPendingTotpToken("");
                setTotpCode("");
              }}
              disabled={isSubmitting}
              className="mt-4"
            >
              <Text className="text-center text-sm font-medium text-[#5f5f5d]">
                Use a different password
              </Text>
            </TouchableOpacity>
          ) : null}

          {!pendingTotpToken ? (
            <TouchableOpacity
              onPress={handleOfflineMode}
              disabled={isSubmitting}
              className="mt-4 flex-row items-center justify-center rounded-xl border border-[#1c1c1c66] bg-[#f7f4ed] px-6 py-4"
            >
              <WifiOff size={19} color="#1c1c1c" />
              <Text className="ml-2 text-center text-base font-semibold text-[#1c1c1c]">
                Continue offline
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
