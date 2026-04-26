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
} from "lucide-react-native";

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
      className="flex-1 bg-dark-bg"
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
        <View className="mb-8">
          <Text className="text-center text-3xl font-bold text-white">
            Termix
          </Text>
          <Text className="mt-2 text-center text-gray-400">
            Sign in directly to your self-hosted server
          </Text>
        </View>

        <View className="rounded-2xl border border-[#303032] bg-[#1a1a1a] p-5">
          <Text className="mb-1 text-lg font-semibold text-white">
            Server Login
          </Text>
          <Text className="mb-5 text-sm text-gray-400">
            Enter the server address and your account credentials.
          </Text>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-300">
              Server Address
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <ServerIcon size={20} color="#9CA3AF" />
              </View>
              <TextInput
                className="rounded-xl border border-[#303032] bg-[#111113] text-white"
                style={{ height: 56, paddingLeft: 48, paddingRight: 16 }}
                placeholder="http://192.168.1.10:30001"
                placeholderTextColor="#71717A"
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
            <Text className="mb-2 text-sm font-medium text-gray-300">
              Username
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <User size={20} color="#9CA3AF" />
              </View>
              <TextInput
                className="rounded-xl border border-[#303032] bg-[#111113] text-white"
                style={{ height: 56, paddingLeft: 48, paddingRight: 16 }}
                placeholder="admin"
                placeholderTextColor="#71717A"
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
            <Text className="mb-2 text-sm font-medium text-gray-300">
              Password
            </Text>
            <View className="relative">
              <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                <Lock size={20} color="#9CA3AF" />
              </View>
              <TextInput
                className="rounded-xl border border-[#303032] bg-[#111113] text-white"
                style={{ height: 56, paddingLeft: 48, paddingRight: 52 }}
                placeholder="Password"
                placeholderTextColor="#71717A"
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
                  <EyeOff size={20} color="#9CA3AF" />
                ) : (
                  <Eye size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {pendingTotpToken ? (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-300">
                Verification Code
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                  <ShieldCheck size={20} color="#9CA3AF" />
                </View>
                <TextInput
                  className="rounded-xl border border-[#303032] bg-[#111113] text-white"
                  style={{ height: 56, paddingLeft: 48, paddingRight: 16 }}
                  placeholder="123456"
                  placeholderTextColor="#71717A"
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
              <Text className="mt-2 text-xs text-gray-500">
                Two-factor authentication is enabled for this account.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`mt-2 flex-row items-center justify-center rounded-xl px-6 py-4 ${
              isSubmitting ? "bg-gray-600" : "bg-green-600"
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
              <Text className="text-center text-sm font-medium text-gray-400">
                Use a different password
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
