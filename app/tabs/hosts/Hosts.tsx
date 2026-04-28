import {
  ActivityIndicator,
  Alert,
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
import { CircleDot, RefreshCw, Search, Zap } from "lucide-react-native";

import Folder from "@/app/tabs/hosts/navigation/Folder";
import {
  getAllServerStatuses,
  getCurrentServerUrl,
  getFoldersWithStats,
  getSSHHosts,
  initializeServerConfig,
  refreshServerPolling,
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

const filters: { id: HostFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "failed", label: "Failed" },
  { id: "pinned", label: "Pinned" },
];

export default function Hosts() {
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
  const isRefreshingRef = useRef(false);
  const statusRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const padding = getResponsivePadding(isLandscape);

  const loadServerStatuses = useCallback(async (force = false) => {
    try {
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
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefreshingRef.current) return;

    try {
      isRefreshingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!getCurrentServerUrl()) {
        await initializeServerConfig();
      }

      const currentServerUrl = getCurrentServerUrl();

      if (!currentServerUrl) {
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
  }, [loadServerStatuses]);

  const handleRefresh = useCallback(() => {
    if (!isRefreshingRef.current) {
      fetchData(true);
    }
  }, [fetchData]);

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
              Adjust search or sync servers from the web app.
            </Text>
          </View>
        ) : (
          filteredFolders.map((folder) => (
            <Folder
              key={folder.name}
              name={folder.name}
              hosts={folder.hosts}
              getHostStatus={getHostStatus}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
