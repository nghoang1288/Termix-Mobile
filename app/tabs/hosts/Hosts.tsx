import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  CircleDot,
  Plus,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react-native";

import { useAppContext } from "@/app/AppContext";
import Folder from "@/app/tabs/hosts/navigation/Folder";
import {
  createSSHHost,
  deleteSSHHost,
  getAllServerStatuses,
  getCurrentServerUrl,
  getFoldersWithStats,
  getSSHHosts,
  initializeServerConfig,
  refreshServerPolling,
  updateSSHHost,
} from "@/app/main-axios";
import { getResponsivePadding } from "@/app/utils/responsive";
import { useOrientation } from "@/app/utils/orientation";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { ServerStatus, SSHHost } from "@/types";

interface FolderData {
  name: string;
  hosts: SSHHost[];
  stats?: {
    totalHosts: number;
    hostsByType: {
      type: string;
      count: number;
    }[];
  };
}

type HostFilter = "all" | "online" | "failed" | "pinned";
type OfflineAuthType = "password" | "key";

interface OfflineHostFormState {
  name: string;
  ip: string;
  port: string;
  username: string;
  folder: string;
  tags: string;
  authType: OfflineAuthType;
  password: string;
  key: string;
  keyPassword: string;
}

const filters: { id: HostFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "failed", label: "Failed" },
  { id: "pinned", label: "Pinned" },
];

const emptyOfflineHostForm: OfflineHostFormState = {
  name: "",
  ip: "",
  port: "22",
  username: "",
  folder: "Offline",
  tags: "offline",
  authType: "password",
  password: "",
  key: "",
  keyPassword: "",
};

export default function Hosts() {
  const { isOfflineMode } = useAppContext();
  const insets = useSafeAreaInsets();
  const { isLandscape } = useOrientation();
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<HostFilter>("all");
  const [serverStatuses, setServerStatuses] = useState<
    Record<number, ServerStatus>
  >({});
  const [showOfflineHostForm, setShowOfflineHostForm] = useState(false);
  const [editingOfflineHost, setEditingOfflineHost] = useState<SSHHost | null>(
    null,
  );
  const [offlineHostForm, setOfflineHostForm] =
    useState<OfflineHostFormState>(emptyOfflineHostForm);
  const [savingOfflineHost, setSavingOfflineHost] = useState(false);
  const isRefreshingRef = useRef(false);
  const statusRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const padding = getResponsivePadding(isLandscape);

  const loadServerStatuses = useCallback(
    async (force = false) => {
      try {
        if (isOfflineMode) {
          setServerStatuses({});
          return;
        }

        statusRetryTimersRef.current.forEach(clearTimeout);
        statusRetryTimersRef.current = [];

        if (force) {
          await refreshServerPolling().catch(() => undefined);
        }

        const statuses = await getAllServerStatuses();
        setServerStatuses(statuses || {});

        if (Object.keys(statuses || {}).length === 0) {
          [1200, 3500].forEach((delay) => {
            const timer = setTimeout(() => {
              void getAllServerStatuses()
                .then((nextStatuses) => {
                  setServerStatuses(nextStatuses || {});
                })
                .catch(() => undefined);
            }, delay);
            statusRetryTimersRef.current.push(timer);
          });
        }
      } catch {
        // Status should never block opening the server list.
      }
    },
    [isOfflineMode],
  );

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefreshingRef.current) return;

      try {
        isRefreshingRef.current = true;

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (!isOfflineMode && !getCurrentServerUrl()) {
          await initializeServerConfig();
        }

        const currentServerUrl = getCurrentServerUrl();

        if (!isOfflineMode && !currentServerUrl) {
          Alert.alert(
            "No Server Configured",
            "Please configure a server first in the settings.",
          );
          return;
        }

        const [hostsResult, foldersResult] = await Promise.allSettled([
          getSSHHosts(),
          getFoldersWithStats(),
        ]);

        if (hostsResult.status !== "fulfilled") {
          throw hostsResult.reason;
        }

        const hostsRaw = hostsResult.value;
        const hosts: SSHHost[] = Array.isArray(hostsRaw)
          ? hostsRaw
          : Array.isArray((hostsRaw as any)?.hosts)
            ? (hostsRaw as any).hosts
            : [];
        const foldersData =
          foldersResult.status === "fulfilled" ? foldersResult.value : null;

        const folderMap = new Map<string, FolderData>();

        if (foldersData && Array.isArray(foldersData)) {
          foldersData.forEach((folder: any) => {
            folderMap.set(folder.name, {
              name: folder.name,
              hosts: [],
              stats: folder.stats,
            });
          });
        }

        hosts
          .filter(
            (host: SSHHost) =>
              !host.connectionType || host.connectionType === "ssh",
          )
          .forEach((host: SSHHost) => {
            const folderName = host.folder || "No Folder";
            if (!folderMap.has(folderName)) {
              folderMap.set(folderName, {
                name: folderName,
                hosts: [],
                stats: { totalHosts: 0, hostsByType: [] },
              });
            }
            folderMap.get(folderName)!.hosts.push(host);
          });

        const foldersArray = Array.from(folderMap.values()).sort((a, b) => {
          if (a.name === "No Folder") return 1;
          if (b.name === "No Folder") return -1;
          return a.name.localeCompare(b.name);
        });

        setFolders(foldersArray);
        void loadServerStatuses(isRefresh);
      } catch (error: any) {
        console.error("[Hosts] Error loading hosts:", error);

        const isAuthError =
          error?.response?.status === 401 ||
          error?.status === 401 ||
          error?.message?.includes("Authentication required");

        if (!isAuthError) {
          const errorMessage =
            error?.message ||
            "Failed to load hosts. Please check your connection and try again.";
          Alert.alert("Error Loading Hosts", errorMessage);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        isRefreshingRef.current = false;
      }
    },
    [isOfflineMode, loadServerStatuses],
  );

  const handleRefresh = useCallback(() => {
    if (!isRefreshingRef.current) {
      fetchData(true);
    }
  }, [fetchData]);

  const updateOfflineFormField = useCallback(
    <K extends keyof OfflineHostFormState>(
      field: K,
      value: OfflineHostFormState[K],
    ) => {
      setOfflineHostForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const openOfflineHostForm = useCallback((host?: SSHHost) => {
    if (host) {
      setEditingOfflineHost(host);
      setOfflineHostForm({
        name: host.name || "",
        ip: host.ip || "",
        port: String(host.port || 22),
        username: host.username || "",
        folder: host.folder || "Offline",
        tags: Array.isArray(host.tags) ? host.tags.join(", ") : "offline",
        authType: host.authType === "key" ? "key" : "password",
        password: host.password || "",
        key: host.key || "",
        keyPassword: host.keyPassword || "",
      });
    } else {
      setEditingOfflineHost(null);
      setOfflineHostForm(emptyOfflineHostForm);
    }

    setShowOfflineHostForm(true);
  }, []);

  const closeOfflineHostForm = useCallback(() => {
    if (savingOfflineHost) return;
    setShowOfflineHostForm(false);
    setEditingOfflineHost(null);
    setOfflineHostForm(emptyOfflineHostForm);
  }, [savingOfflineHost]);

  const handleSaveOfflineHost = useCallback(async () => {
    if (savingOfflineHost) return;

    const ip = offlineHostForm.ip.trim();
    const username = offlineHostForm.username.trim();
    const port = Number(offlineHostForm.port || 22);

    if (!ip) {
      Alert.alert("Missing host", "Enter the server IP or hostname.");
      return;
    }

    if (!username) {
      Alert.alert("Missing username", "Enter the SSH username.");
      return;
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      Alert.alert("Invalid port", "Enter a port between 1 and 65535.");
      return;
    }

    const parsedTags = offlineHostForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const tags = parsedTags.includes("offline")
      ? parsedTags
      : ["offline", ...parsedTags];

    const hostData = {
      name: offlineHostForm.name.trim() || ip,
      ip,
      port,
      username,
      folder: offlineHostForm.folder.trim() || "Offline",
      tags,
      pin: editingOfflineHost?.pin ?? false,
      authType: offlineHostForm.authType,
      password:
        offlineHostForm.authType === "password"
          ? offlineHostForm.password
          : undefined,
      key: offlineHostForm.authType === "key" ? offlineHostForm.key : undefined,
      keyPassword:
        offlineHostForm.authType === "key"
          ? offlineHostForm.keyPassword
          : undefined,
      enableTerminal: true,
      enableTunnel: false,
      enableFileManager: false,
      enableDocker: false,
      showTerminalInSidebar: true,
      showFileManagerInSidebar: false,
      showTunnelInSidebar: false,
      showDockerInSidebar: false,
      showServerStatsInSidebar: false,
      defaultPath: "/",
      tunnelConnections: [],
      jumpHosts: [],
      quickActions: [],
      connectionType: "ssh",
    };

    try {
      setSavingOfflineHost(true);
      if (editingOfflineHost) {
        await updateSSHHost(editingOfflineHost.id, hostData);
      } else {
        await createSSHHost(hostData);
      }
      setShowOfflineHostForm(false);
      setEditingOfflineHost(null);
      setOfflineHostForm(emptyOfflineHostForm);
      await fetchData(true);
    } catch (error: any) {
      Alert.alert(
        "Could not save server",
        error?.message || "Please check the offline server details.",
      );
    } finally {
      setSavingOfflineHost(false);
    }
  }, [editingOfflineHost, fetchData, offlineHostForm, savingOfflineHost]);

  const handleDeleteOfflineHost = useCallback(
    (host: SSHHost) => {
      Alert.alert(
        "Delete offline server",
        `Delete ${host.name || host.ip} from this device?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteSSHHost(host.id);
                await fetchData(true);
              } catch (error: any) {
                Alert.alert(
                  "Could not delete server",
                  error?.message || "Please try again.",
                );
              }
            },
          },
        ],
      );
    },
    [fetchData],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        statusRetryTimersRef.current.forEach(clearTimeout);
        statusRetryTimersRef.current = [];
      };
    }, [fetchData]),
  );

  const getHostStatus = useCallback(
    (hostId: number): "online" | "offline" | "unknown" => {
      const status = serverStatuses[hostId];
      if (!status) return "unknown";
      return status.status;
    },
    [serverStatuses],
  );

  const allHosts = useMemo(
    () => folders.flatMap((folder) => folder.hosts),
    [folders],
  );
  const onlineCount = allHosts.filter(
    (host) => getHostStatus(host.id) === "online",
  ).length;
  const failedCount = allHosts.filter(
    (host) => getHostStatus(host.id) === "offline",
  ).length;
  const pinnedCount = allHosts.filter((host) => host.pin).length;

  const filteredFolders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return folders
      .map((folder) => ({
        ...folder,
        hosts: folder.hosts.filter((host) => {
          const status = getHostStatus(host.id);
          if (activeFilter === "online" && status !== "online") return false;
          if (activeFilter === "failed" && status !== "offline") return false;
          if (activeFilter === "pinned" && !host.pin) return false;

          if (!query) return true;
          const searchable = [
            host.name,
            host.ip,
            host.username,
            host.folder,
            host.authType,
            ...(host.tags || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchable.includes(query);
        }),
      }))
      .filter((folder) => folder.hosts.length > 0 || query === "");
  }, [activeFilter, folders, getHostStatus, searchQuery]);

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: BACKGROUNDS.DARK,
          paddingTop: insets.top + 24,
        }}
      >
        <ActivityIndicator size="large" color={TEXT_COLORS.ACCENT} />
        <Text
          className="mt-4 font-semibold"
          style={{ color: TEXT_COLORS.PRIMARY }}
        >
          Loading servers...
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: BACKGROUNDS.DARK,
        paddingTop: insets.top + 18,
        paddingHorizontal: padding,
      }}
    >
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="mb-2 flex-row items-center">
              <CircleDot size={13} color="#34d399" />
              <Text
                className="ml-2 text-[11px] font-bold uppercase tracking-[2px]"
                style={{ color: TEXT_COLORS.TERTIARY }}
              >
                Server launcher
              </Text>
            </View>
            <Text
              className="text-3xl font-bold"
              style={{
                color: TEXT_COLORS.PRIMARY,
                lineHeight: 36,
                includeFontPadding: false,
              }}
            >
              Connect
            </Text>
          </View>

          <View className="flex-row gap-2">
            {isOfflineMode ? (
              <TouchableOpacity
                onPress={() => openOfflineHostForm()}
                activeOpacity={0.7}
                style={{
                  width: 42,
                  height: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: BACKGROUNDS.ACTIVE,
                  borderColor: BORDER_COLORS.ACTIVE,
                  borderWidth: 1,
                  borderRadius: RADIUS.BUTTON,
                }}
              >
                <Plus size={19} color="#fcfbf8" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing || loading}
              className={`${refreshing || loading ? "opacity-50" : ""}`}
              activeOpacity={0.7}
              style={{
                width: 42,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: BACKGROUNDS.BUTTON,
                borderColor: BORDER_COLORS.BUTTON,
                borderWidth: 1,
                borderRadius: RADIUS.BUTTON,
              }}
            >
              <RefreshCw
                size={19}
                color={TEXT_COLORS.ACCENT}
                style={{
                  transform: [{ rotate: refreshing ? "180deg" : "0deg" }],
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-4 flex-row gap-2">
          <View
            className="flex-1 rounded-md border px-3 py-3"
            style={{
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Text
              className="text-xl font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              {allHosts.length}
            </Text>
            <Text
              className="mt-1 text-[11px]"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              {pinnedCount} pinned
            </Text>
          </View>
          <View
            className="flex-1 rounded-md border px-3 py-3"
            style={{
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Text
              className="text-xl font-semibold"
              style={{ color: "#34d399" }}
            >
              {onlineCount}
            </Text>
            <Text
              className="mt-1 text-[11px]"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              Online
            </Text>
          </View>
          <View
            className="flex-1 rounded-md border px-3 py-3"
            style={{
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Text
              className="text-xl font-semibold"
              style={{ color: "#fb7185" }}
            >
              {failedCount}
            </Text>
            <Text
              className="mt-1 text-[11px]"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              Failed
            </Text>
          </View>
        </View>
      </View>

      <View
        className="mb-3 flex-row items-center rounded-md border px-3"
        style={{
          height: 44,
          backgroundColor: BACKGROUNDS.BUTTON_ALT,
          borderColor: BORDER_COLORS.PANEL,
        }}
      >
        <Search size={17} color={TEXT_COLORS.SECONDARY} />
        <TextInput
          className="ml-2 flex-1 text-sm"
          placeholder="Search by host, user, tag, folder"
          placeholderTextColor={TEXT_COLORS.TERTIARY}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={TEXT_COLORS.ACCENT}
          underlineColorAndroid="transparent"
          style={{
            color: TEXT_COLORS.PRIMARY,
            backgroundColor: "transparent",
            paddingVertical: 0,
            includeFontPadding: false,
          }}
        />
      </View>

      <View className="mb-3 flex-row gap-2">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              activeOpacity={0.75}
              className="flex-1 items-center rounded-md border py-2"
              style={{
                backgroundColor: active ? BACKGROUNDS.ACTIVE : BACKGROUNDS.CARD,
                borderColor: active
                  ? BORDER_COLORS.ACTIVE
                  : BORDER_COLORS.SECONDARY,
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{
                  color: active ? "#fcfbf8" : TEXT_COLORS.SECONDARY,
                }}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom, 16) + 10,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={TEXT_COLORS.ACCENT}
            colors={[TEXT_COLORS.ACCENT]}
            progressBackgroundColor={BACKGROUNDS.CARD}
            titleColor={TEXT_COLORS.PRIMARY}
          />
        }
      >
        {filteredFolders.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <Zap size={36} color={TEXT_COLORS.TERTIARY} />
            <Text
              className="mt-3 text-base font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              {searchQuery ? "No matching servers" : "No servers configured"}
            </Text>
            <Text
              className="mt-1 text-sm"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              {isOfflineMode
                ? "Add an offline server to connect directly from this device."
                : "Adjust search or sync servers from the web app."}
            </Text>
            {isOfflineMode && !searchQuery ? (
              <TouchableOpacity
                onPress={() => openOfflineHostForm()}
                className="mt-4 flex-row items-center rounded-md px-4 py-3"
                activeOpacity={0.75}
                style={{ backgroundColor: BACKGROUNDS.ACTIVE }}
              >
                <Plus size={16} color="#fcfbf8" />
                <Text className="ml-2 font-semibold text-[#fcfbf8]">
                  Add offline server
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filteredFolders.map((folder) => (
            <Folder
              key={folder.name}
              name={folder.name}
              hosts={folder.hosts}
              getHostStatus={getHostStatus}
              onEditHost={isOfflineMode ? openOfflineHostForm : undefined}
              onDeleteHost={isOfflineMode ? handleDeleteOfflineHost : undefined}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={showOfflineHostForm}
        transparent
        animationType="slide"
        onRequestClose={closeOfflineHostForm}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={closeOfflineHostForm}
        >
          <Pressable onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View
                className="border-x border-t px-4 pt-4"
                style={{
                  maxHeight: "88%",
                  paddingBottom: Math.max(insets.bottom, 16),
                  backgroundColor: BACKGROUNDS.CARD,
                  borderColor: BORDER_COLORS.SECONDARY,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                }}
              >
                <View className="mb-3 flex-row items-center justify-between">
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-lg font-semibold"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      {editingOfflineHost
                        ? "Edit offline server"
                        : "Add offline server"}
                    </Text>
                    <Text
                      className="mt-1 text-xs"
                      style={{ color: TEXT_COLORS.TERTIARY }}
                    >
                      Stored locally. Login is not required.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeOfflineHostForm}
                    className="ml-3 items-center justify-center rounded-md border"
                    style={{
                      width: 38,
                      height: 38,
                      backgroundColor: BACKGROUNDS.BUTTON,
                      borderColor: BORDER_COLORS.SECONDARY,
                    }}
                  >
                    <X size={16} color={TEXT_COLORS.PRIMARY} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 12 }}
                >
                  <View className="gap-3">
                    <View>
                      <Text
                        className="mb-1 text-xs font-semibold uppercase"
                        style={{ color: TEXT_COLORS.TERTIARY }}
                      >
                        Name
                      </Text>
                      <TextInput
                        value={offlineHostForm.name}
                        onChangeText={(value) =>
                          updateOfflineFormField("name", value)
                        }
                        placeholder="Production server"
                        placeholderTextColor={TEXT_COLORS.TERTIARY}
                        className="rounded-md border px-3 text-sm"
                        style={{
                          height: 42,
                          color: TEXT_COLORS.PRIMARY,
                          backgroundColor: BACKGROUNDS.BUTTON_ALT,
                          borderColor: BORDER_COLORS.SECONDARY,
                        }}
                      />
                    </View>

                    <View className="flex-row gap-2">
                      <View className="flex-[2]">
                        <Text
                          className="mb-1 text-xs font-semibold uppercase"
                          style={{ color: TEXT_COLORS.TERTIARY }}
                        >
                          Host / IP
                        </Text>
                        <TextInput
                          value={offlineHostForm.ip}
                          onChangeText={(value) =>
                            updateOfflineFormField("ip", value)
                          }
                          placeholder="192.168.1.10"
                          placeholderTextColor={TEXT_COLORS.TERTIARY}
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="rounded-md border px-3 text-sm"
                          style={{
                            height: 42,
                            color: TEXT_COLORS.PRIMARY,
                            backgroundColor: BACKGROUNDS.BUTTON_ALT,
                            borderColor: BORDER_COLORS.SECONDARY,
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="mb-1 text-xs font-semibold uppercase"
                          style={{ color: TEXT_COLORS.TERTIARY }}
                        >
                          Port
                        </Text>
                        <TextInput
                          value={offlineHostForm.port}
                          onChangeText={(value) =>
                            updateOfflineFormField("port", value)
                          }
                          placeholder="22"
                          placeholderTextColor={TEXT_COLORS.TERTIARY}
                          keyboardType="number-pad"
                          className="rounded-md border px-3 text-sm"
                          style={{
                            height: 42,
                            color: TEXT_COLORS.PRIMARY,
                            backgroundColor: BACKGROUNDS.BUTTON_ALT,
                            borderColor: BORDER_COLORS.SECONDARY,
                          }}
                        />
                      </View>
                    </View>

                    <View>
                      <Text
                        className="mb-1 text-xs font-semibold uppercase"
                        style={{ color: TEXT_COLORS.TERTIARY }}
                      >
                        Username
                      </Text>
                      <TextInput
                        value={offlineHostForm.username}
                        onChangeText={(value) =>
                          updateOfflineFormField("username", value)
                        }
                        placeholder="ubuntu"
                        placeholderTextColor={TEXT_COLORS.TERTIARY}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="rounded-md border px-3 text-sm"
                        style={{
                          height: 42,
                          color: TEXT_COLORS.PRIMARY,
                          backgroundColor: BACKGROUNDS.BUTTON_ALT,
                          borderColor: BORDER_COLORS.SECONDARY,
                        }}
                      />
                    </View>

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Text
                          className="mb-1 text-xs font-semibold uppercase"
                          style={{ color: TEXT_COLORS.TERTIARY }}
                        >
                          Folder
                        </Text>
                        <TextInput
                          value={offlineHostForm.folder}
                          onChangeText={(value) =>
                            updateOfflineFormField("folder", value)
                          }
                          placeholder="Offline"
                          placeholderTextColor={TEXT_COLORS.TERTIARY}
                          className="rounded-md border px-3 text-sm"
                          style={{
                            height: 42,
                            color: TEXT_COLORS.PRIMARY,
                            backgroundColor: BACKGROUNDS.BUTTON_ALT,
                            borderColor: BORDER_COLORS.SECONDARY,
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="mb-1 text-xs font-semibold uppercase"
                          style={{ color: TEXT_COLORS.TERTIARY }}
                        >
                          Tags
                        </Text>
                        <TextInput
                          value={offlineHostForm.tags}
                          onChangeText={(value) =>
                            updateOfflineFormField("tags", value)
                          }
                          placeholder="offline, prod"
                          placeholderTextColor={TEXT_COLORS.TERTIARY}
                          autoCapitalize="none"
                          className="rounded-md border px-3 text-sm"
                          style={{
                            height: 42,
                            color: TEXT_COLORS.PRIMARY,
                            backgroundColor: BACKGROUNDS.BUTTON_ALT,
                            borderColor: BORDER_COLORS.SECONDARY,
                          }}
                        />
                      </View>
                    </View>

                    <View>
                      <Text
                        className="mb-2 text-xs font-semibold uppercase"
                        style={{ color: TEXT_COLORS.TERTIARY }}
                      >
                        Auth
                      </Text>
                      <View className="flex-row gap-2">
                        {(["password", "key"] as const).map((authType) => {
                          const active = offlineHostForm.authType === authType;
                          return (
                            <TouchableOpacity
                              key={authType}
                              onPress={() =>
                                updateOfflineFormField("authType", authType)
                              }
                              className="flex-1 rounded-md border py-2"
                              activeOpacity={0.75}
                              style={{
                                backgroundColor: active
                                  ? BACKGROUNDS.ACTIVE
                                  : BACKGROUNDS.BUTTON_ALT,
                                borderColor: active
                                  ? BORDER_COLORS.ACTIVE
                                  : BORDER_COLORS.SECONDARY,
                              }}
                            >
                              <Text
                                className="text-center text-sm font-semibold"
                                style={{
                                  color: active
                                    ? "#fcfbf8"
                                    : TEXT_COLORS.SECONDARY,
                                }}
                              >
                                {authType === "password" ? "Password" : "Key"}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {offlineHostForm.authType === "password" ? (
                      <View>
                        <Text
                          className="mb-1 text-xs font-semibold uppercase"
                          style={{ color: TEXT_COLORS.TERTIARY }}
                        >
                          Password
                        </Text>
                        <TextInput
                          value={offlineHostForm.password}
                          onChangeText={(value) =>
                            updateOfflineFormField("password", value)
                          }
                          placeholder="Optional; app can prompt later"
                          placeholderTextColor={TEXT_COLORS.TERTIARY}
                          secureTextEntry
                          className="rounded-md border px-3 text-sm"
                          style={{
                            height: 42,
                            color: TEXT_COLORS.PRIMARY,
                            backgroundColor: BACKGROUNDS.BUTTON_ALT,
                            borderColor: BORDER_COLORS.SECONDARY,
                          }}
                        />
                      </View>
                    ) : (
                      <>
                        <View>
                          <Text
                            className="mb-1 text-xs font-semibold uppercase"
                            style={{ color: TEXT_COLORS.TERTIARY }}
                          >
                            Private key
                          </Text>
                          <TextInput
                            value={offlineHostForm.key}
                            onChangeText={(value) =>
                              updateOfflineFormField("key", value)
                            }
                            placeholder="Paste private key"
                            placeholderTextColor={TEXT_COLORS.TERTIARY}
                            autoCapitalize="none"
                            autoCorrect={false}
                            multiline
                            textAlignVertical="top"
                            className="rounded-md border px-3 py-2 font-mono text-xs"
                            style={{
                              minHeight: 94,
                              color: TEXT_COLORS.PRIMARY,
                              backgroundColor: BACKGROUNDS.BUTTON_ALT,
                              borderColor: BORDER_COLORS.SECONDARY,
                            }}
                          />
                        </View>
                        <View>
                          <Text
                            className="mb-1 text-xs font-semibold uppercase"
                            style={{ color: TEXT_COLORS.TERTIARY }}
                          >
                            Key passphrase
                          </Text>
                          <TextInput
                            value={offlineHostForm.keyPassword}
                            onChangeText={(value) =>
                              updateOfflineFormField("keyPassword", value)
                            }
                            placeholder="Optional"
                            placeholderTextColor={TEXT_COLORS.TERTIARY}
                            secureTextEntry
                            className="rounded-md border px-3 text-sm"
                            style={{
                              height: 42,
                              color: TEXT_COLORS.PRIMARY,
                              backgroundColor: BACKGROUNDS.BUTTON_ALT,
                              borderColor: BORDER_COLORS.SECONDARY,
                            }}
                          />
                        </View>
                      </>
                    )}
                  </View>
                </ScrollView>

                <View className="mt-3 flex-row gap-2">
                  <TouchableOpacity
                    onPress={closeOfflineHostForm}
                    disabled={savingOfflineHost}
                    className="flex-1 rounded-md border py-3"
                    activeOpacity={0.75}
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderColor: BORDER_COLORS.SECONDARY,
                    }}
                  >
                    <Text
                      className="text-center font-semibold"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveOfflineHost}
                    disabled={savingOfflineHost}
                    className={`flex-1 rounded-md py-3 ${
                      savingOfflineHost ? "opacity-60" : ""
                    }`}
                    activeOpacity={0.75}
                    style={{ backgroundColor: BACKGROUNDS.ACTIVE }}
                  >
                    <Text className="text-center font-semibold text-[#fcfbf8]">
                      {savingOfflineHost ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
