import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  ArrowDownUp,
  FolderOpen,
  MoreVertical,
  Terminal,
  X,
} from "lucide-react-native";

import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { DEFAULT_STATS_CONFIG, StatsConfig } from "@/constants/stats-config";
import { useTerminalSessions } from "@/app/contexts/TerminalSessionsContext";
import { SSHHost } from "@/types";

interface HostProps {
  host: SSHHost;
  status: "online" | "offline" | "unknown";
  isLast?: boolean;
}

const statusMeta = {
  online: {
    label: "Online",
    color: "#34d399",
    muted: "rgba(52,211,153,0.16)",
  },
  offline: {
    label: "Failed",
    color: "#fb7185",
    muted: "rgba(251,113,133,0.16)",
  },
  unknown: {
    label: "Checking",
    color: "#fbbf24",
    muted: "rgba(251,191,36,0.16)",
  },
};

function endpoint(host: SSHHost) {
  return `${host.username}@${host.ip}:${host.port}`;
}

function parseStatsConfig(host: SSHHost): StatsConfig {
  try {
    return host.statsConfig
      ? { ...DEFAULT_STATS_CONFIG, ...JSON.parse(host.statsConfig) }
      : DEFAULT_STATS_CONFIG;
  } catch {
    return DEFAULT_STATS_CONFIG;
  }
}

export default function Host({ host, status }: HostProps) {
  const { navigateToSessions } = useTerminalSessions();
  const insets = useSafeAreaInsets();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const meta = statusMeta[status];
  const statsConfig = useMemo(() => parseStatsConfig(host), [host]);
  const tags = Array.isArray(host.tags) ? host.tags : [];
  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const canTunnel =
    host.enableTunnel &&
    Array.isArray(host.tunnelConnections) &&
    host.tunnelConnections.length > 0;

  const openTerminal = () => {
    navigateToSessions(host, "terminal");
    setShowContextMenu(false);
  };

  const openStats = () => {
    navigateToSessions(host, "stats");
    setShowContextMenu(false);
  };

  const openTunnel = () => {
    navigateToSessions(
      {
        ...host,
        enableTunnel: true,
        tunnelConnections: host.tunnelConnections || [],
      },
      "tunnel",
    );
    setShowContextMenu(false);
  };

  const openFiles = () => {
    navigateToSessions(host, "filemanager");
    setShowContextMenu(false);
  };

  const actionRows = [
    host.enableTerminal && {
      key: "terminal",
      icon: <Terminal size={20} color={TEXT_COLORS.PRIMARY} />,
      title: "Open terminal",
      subtitle: endpoint(host),
      onPress: openTerminal,
    },
    statsConfig.metricsEnabled && {
      key: "stats",
      icon: <Activity size={20} color={TEXT_COLORS.PRIMARY} />,
      title: "Server stats",
      subtitle: "CPU, memory, disk and network",
      onPress: openStats,
    },
    host.enableFileManager && {
      key: "files",
      icon: <FolderOpen size={20} color={TEXT_COLORS.PRIMARY} />,
      title: "File manager",
      subtitle: "Browse and manage files",
      onPress: openFiles,
    },
    canTunnel && {
      key: "tunnel",
      icon: <ArrowDownUp size={20} color={TEXT_COLORS.PRIMARY} />,
      title: "Tunnels",
      subtitle: "Open saved port forwards",
      onPress: openTunnel,
    },
  ].filter(Boolean) as {
    key: string;
    icon: ReactNode;
    title: string;
    subtitle: string;
    onPress: () => void;
  }[];

  return (
    <>
      <TouchableOpacity
        onPress={openTerminal}
        activeOpacity={0.78}
        className="rounded-md border p-3"
        style={{
          backgroundColor: BACKGROUNDS.BUTTON,
          borderColor: BORDER_COLORS.SECONDARY,
          borderRadius: RADIUS.CARD,
        }}
      >
        <View className="flex-row items-start">
          <View
            className="mr-3 items-center justify-center rounded-md border"
            style={{
              width: 42,
              height: 42,
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Terminal size={20} color={TEXT_COLORS.PRIMARY} />
            <View
              className="absolute right-[-2px] top-[-2px] rounded-full"
              style={{
                width: 10,
                height: 10,
                backgroundColor: meta.color,
                shadowColor: meta.color,
                shadowOpacity: 0.4,
                shadowRadius: 5,
              }}
            />
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text
                className="flex-1 text-base font-semibold"
                numberOfLines={1}
                style={{ color: TEXT_COLORS.PRIMARY }}
              >
                {host.name || host.ip}
              </Text>
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  setShowContextMenu(true);
                }}
                activeOpacity={0.7}
                className="ml-2 rounded-md border p-2"
                style={{
                  backgroundColor: BACKGROUNDS.DARKER,
                  borderColor: BORDER_COLORS.SECONDARY,
                }}
              >
                <MoreVertical size={16} color={TEXT_COLORS.SECONDARY} />
              </TouchableOpacity>
            </View>

            <Text
              className="mt-1 font-mono text-xs"
              numberOfLines={1}
              style={{ color: TEXT_COLORS.SECONDARY }}
            >
              {endpoint(host)}
            </Text>

            <View className="mt-3 flex-row flex-wrap items-center">
              <View
                className="mr-1.5 rounded border px-2 py-1"
                style={{
                  backgroundColor: meta.muted,
                  borderColor: meta.color,
                }}
              >
                <Text
                  className="text-[11px] font-bold"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </Text>
              </View>

              <View
                className="mr-1.5 rounded border px-2 py-1"
                style={{
                  backgroundColor: BACKGROUNDS.CARD,
                  borderColor: BORDER_COLORS.SECONDARY,
                }}
              >
                <Text
                  className="text-[11px]"
                  style={{ color: TEXT_COLORS.SECONDARY }}
                >
                  {host.authType}
                </Text>
              </View>

              {visibleTags.map((tag) => (
                <View
                  key={tag}
                  className="mr-1.5 rounded border px-2 py-1"
                  style={{
                    backgroundColor: BACKGROUNDS.CARD,
                    borderColor: BORDER_COLORS.SECONDARY,
                  }}
                >
                  <Text
                    className="text-[11px]"
                    style={{ color: TEXT_COLORS.SECONDARY }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}

              {hiddenTagCount > 0 && (
                <Text
                  className="text-[11px]"
                  style={{ color: TEXT_COLORS.TERTIARY }}
                >
                  +{hiddenTagCount}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <TouchableWithoutFeedback onPress={() => setShowContextMenu(false)}>
          <View className="flex-1 justify-end bg-black/35">
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                className="border-t border-x px-4 pt-4"
                style={{
                  maxHeight: "80%",
                  paddingBottom: Math.max(insets.bottom, 16),
                  backgroundColor: BACKGROUNDS.CARD,
                  borderColor: BORDER_COLORS.SECONDARY,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                }}
              >
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center">
                      <View
                        className="mr-2 rounded-full"
                        style={{
                          width: 9,
                          height: 9,
                          backgroundColor: meta.color,
                        }}
                      />
                      <Text
                        className="flex-1 text-lg font-semibold"
                        numberOfLines={1}
                        style={{ color: TEXT_COLORS.PRIMARY }}
                      >
                        {host.name || host.ip}
                      </Text>
                    </View>
                    <Text
                      className="mt-1 font-mono text-xs"
                      numberOfLines={1}
                      style={{ color: TEXT_COLORS.TERTIARY }}
                    >
                      {endpoint(host)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    className="ml-3 rounded-md border p-2"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON,
                      borderColor: BORDER_COLORS.SECONDARY,
                    }}
                    onPress={() => setShowContextMenu(false)}
                  >
                    <X size={16} color={TEXT_COLORS.PRIMARY} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    {actionRows.map((row) => (
                      <TouchableOpacity
                        key={row.key}
                        onPress={row.onPress}
                        className="flex-row items-center rounded-md border p-3"
                        activeOpacity={0.72}
                        style={{
                          backgroundColor: BACKGROUNDS.BUTTON,
                          borderColor: BORDER_COLORS.SECONDARY,
                        }}
                      >
                        <View
                          className="mr-3 items-center justify-center rounded-md border"
                          style={{
                            width: 38,
                            height: 38,
                            backgroundColor: BACKGROUNDS.CARD,
                            borderColor: BORDER_COLORS.PRIMARY,
                          }}
                        >
                          {row.icon}
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text
                            className="font-semibold"
                            style={{ color: TEXT_COLORS.PRIMARY }}
                          >
                            {row.title}
                          </Text>
                          <Text
                            className="mt-0.5 text-xs"
                            numberOfLines={1}
                            style={{ color: TEXT_COLORS.TERTIARY }}
                          >
                            {row.subtitle}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
