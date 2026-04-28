import {
  TextInput,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAppContext } from "../AppContext";
import { useState, useEffect } from "react";
import { saveServerConfig, getCurrentServerUrl } from "../main-axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Server } from "lucide-react-native";

type ServerDetails = {
  ip: string;
};

function normalizeServerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Please enter a server address");
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(withScheme);

  if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Server address must be a valid HTTP or HTTPS URL");
  }

  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export default function ServerForm() {
  const {
    setShowServerManager,
    setShowLoginForm,
    setSelectedServer,
    selectedServer,
  } = useAppContext();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<ServerDetails>({ ip: "" });
  const [isLoading, setIsLoading] = useState(false);
  const isHttpServer = /^http:\/\//i.test(formData.ip.trim());

  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        const currentUrl = getCurrentServerUrl();
        if (currentUrl) {
          setFormData({ ip: currentUrl });
        } else if (selectedServer?.ip) {
          setFormData({ ip: selectedServer.ip });
        }
      } catch (error) {}
    };
    loadExistingConfig();
  }, [selectedServer]);

  const handleInputChange = (field: keyof ServerDetails, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    let serverUrl: string;

    try {
      serverUrl = normalizeServerUrl(formData.ip);
      setFormData({ ip: serverUrl });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Invalid server address",
      );
      return;
    }

    setIsLoading(true);

    try {
      const serverConfig = {
        serverUrl,
        lastUpdated: new Date().toISOString(),
      };
      await saveServerConfig(serverConfig);

      const serverInfo = {
        name: "Server",
        ip: serverUrl,
      };

      setSelectedServer(serverInfo);
      setShowServerManager(false);
      setShowLoginForm(true);
    } catch (error: any) {
      Alert.alert(
        "Error",
        `Failed to save server: ${error?.message || "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f7f4ed]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <View className="bg-[#f7f4ed] p-4">
          <Text className="text-center text-2xl font-semibold text-[#1c1c1c]">
            Server Connection
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 pb-10">
            <View className="mb-8">
              <Text className="mb-2 text-sm font-medium text-[#1c1c1c]">
                Server Address
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Server size={20} color="#5f5f5d" />
                </View>
                <TextInput
                  className="rounded-xl border border-[#eceae4] bg-[#fcfbf8] text-[#1c1c1c]"
                  style={{
                    height: 56,
                    paddingLeft: 48,
                    paddingRight: 16,
                  }}
                  placeholder="https://sshbridge.example.com"
                  placeholderTextColor="#8b8780"
                  value={formData.ip}
                  onChangeText={(value) => handleInputChange("ip", value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  editable={!isLoading}
                />
              </View>
              <Text className="mt-2 text-xs text-[#5f5f5d]">
                Enter the address of your self-hosted SSHBridge server.
              </Text>
              {isHttpServer ? (
                <Text className="mt-2 text-xs font-medium text-[#b45309]">
                  HTTP is plaintext. Use HTTPS outside a trusted local network.
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={handleConnect}
              disabled={isLoading}
              className={`mt-4 rounded-xl px-6 py-4 ${
                isLoading ? "bg-[#5f5f5d]" : "bg-[#1c1c1c]"
              }`}
            >
              <Text className="text-center text-lg font-semibold text-[#fcfbf8]">
                {isLoading ? "Saving..." : "Connect"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
