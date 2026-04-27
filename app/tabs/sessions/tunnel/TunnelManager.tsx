import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, Plus, Pencil, Trash2, X } from "lucide-react-native";
import {
  getTunnelStatuses,
  connectTunnel,
  disconnectTunnel,
  cancelTunnel,
  getSSHHosts,
  updateSSHHost,
} from "../../../main-axios";
import { showToast } from "../../../utils/toast";
import {
  getTerminalConnectionMode,
  type TerminalConnectionMode,
} from "@/app/tabs/sessions/terminal/terminal-connection-mode";
import {
  connectDirectTunnel,
  disconnectDirectTunnel,
  getDirectTunnelStatuses,
} from "@/app/tabs/sessions/tunnel/DirectTunnelManager";
import type {
  TunnelStatus,
  SSHHost,
  TunnelConnection,
  TunnelSessionProps,
  SSHHostData,
} from "../../../../types";
import { useOrientation } from "@/app/utils/orientation";
import { getResponsivePadding, getColumnCount } from "@/app/utils/responsive";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
} from "@/app/constants/designTokens";
import TunnelCard from "@/app/tabs/sessions/tunnel/TunnelCard";

export type TunnelManagerHandle = {
  refresh: () => void;
};

export const TunnelManager = forwardRef<
  TunnelManagerHandle,
  TunnelSessionProps
>(({ hostConfig, isVisible, title = "Manage Tunnels", onClose }, ref) => {
  const insets = useSafeAreaInsets();
  const { width, isLandscape } = useOrientation();
  const [tunnelStatuses, setTunnelStatuses] = useState<
    Record<string, TunnelStatus>
  >({});
  const [connectionMode, setConnectionMode] =
    useState<TerminalConnectionMode>("direct");
  const [loadingTunnels, setLoadingTunnels] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allHosts, setAllHosts] = useState<SSHHost[]>([]);
  const [currentHostConfig, setCurrentHostConfig] = useState({
    ...hostConfig,
    tunnelConnections: hostConfig.tunnelConnections || [],
  });
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTunnelIndex, setEditingTunnelIndex] = useState<number | null>(
    null,
  );
  const [isSavingTunnel, setIsSavingTunnel] = useState(false);
  const [tunnelForm, setTunnelForm] = useState({
    tunnelType: "local" as NonNullable<TunnelConnection["tunnelType"]>,
    sourcePort: "",
    endpointHost: "",
    endpointPort: "",
    maxRetries: "5",
    retryInterval: "5",
    autoStart: false,
  });
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const padding = getResponsivePadding(isLandscape);
  const columnCount = getColumnCount(width, isLandscape, 350);
  const isDirectMode = connectionMode === "direct";
  const getTunnelName = useCallback(
    (tunnel: TunnelConnection, tunnelIndex: number) =>
      `${currentHostConfig.id}::${tunnelIndex}::${currentHostConfig.name || `${currentHostConfig.id}`}::${tunnel.sourcePort}::${tunnel.endpointHost}::${tunnel.endpointPort}`,
    [currentHostConfig.id, currentHostConfig.name],
  );

  useEffect(() => {
    if (!isVisible) return;

    getTerminalConnectionMode("direct")
      .then(setConnectionMode)
      .catch(() => setConnectionMode("direct"));
  }, [isVisible]);

  const fetchTunnelStatuses = useCallback(
    async (showLoadingSpinner = true) => {
      try {
        if (showLoadingSpinner) {
          setIsLoading(true);
        }
        setError(null);

        const statuses = isDirectMode
          ? getDirectTunnelStatuses()
          : await getTunnelStatuses();
        setTunnelStatuses(statuses);
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to fetch tunnel statuses";
        setError(errorMessage);
        if (showLoadingSpinner) {
          showToast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isDirectMode],
  );

  const fetchAllHosts = useCallback(async () => {
    try {
      const hosts = await getSSHHosts();
      setAllHosts(hosts);

      const updatedHost = hosts.find((h) => h.id === hostConfig.id);
      if (updatedHost) {
        setCurrentHostConfig({
          id: updatedHost.id,
          name: updatedHost.name,
          enableTunnel: updatedHost.enableTunnel,
          tunnelConnections: updatedHost.tunnelConnections || [],
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch hosts for tunnel endpoint lookup:", err);
    }
  }, [hostConfig.id]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTunnelStatuses(false), fetchAllHosts()]);
    setIsRefreshing(false);
  }, [fetchTunnelStatuses, fetchAllHosts]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: handleRefresh,
    }),
    [handleRefresh],
  );

  useEffect(() => {
    if (isVisible) {
      fetchTunnelStatuses();
      fetchAllHosts();

      refreshIntervalRef.current = setInterval(() => {
        fetchTunnelStatuses(false);
      }, 5000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isVisible, fetchTunnelStatuses, fetchAllHosts]);

  const handleTunnelAction = async (
    action: "connect" | "disconnect" | "cancel",
    tunnelIndex: number,
  ) => {
    const tunnel = currentHostConfig.tunnelConnections[tunnelIndex];
    const tunnelName = getTunnelName(tunnel, tunnelIndex);
    const tunnelType = tunnel.tunnelType || "remote";

    setLoadingTunnels((prev) => new Set(prev).add(tunnelName));

    try {
      if (action === "connect") {
        const fullHost = allHosts.find((h) => h.id === currentHostConfig.id);
        if (!fullHost) {
          throw new Error("Source host not found");
        }

        if (isDirectMode) {
          if (tunnelType !== "local") {
            throw new Error(
              "Direct mode only supports local (-L) port forwarding. Switch to Via SSHBridge server for remote (-R) tunnels.",
            );
          }

          const endpointHost = allHosts.find(
            (h) =>
              h.name === tunnel.endpointHost ||
              `${h.username}@${h.ip}` === tunnel.endpointHost,
          );
          const directTunnel = endpointHost
            ? { ...tunnel, endpointHost: endpointHost.ip }
            : tunnel;

          await connectDirectTunnel(tunnelName, fullHost, directTunnel);
          setTunnelStatuses(getDirectTunnelStatuses());
          showToast.success(
            `Direct tunnel listening on 127.0.0.1:${tunnel.sourcePort} -> ${directTunnel.endpointHost}:${directTunnel.endpointPort}`,
          );
          return;
        }

        const endpointHost = allHosts.find(
          (h) =>
            h.name === tunnel.endpointHost ||
            `${h.username}@${h.ip}` === tunnel.endpointHost,
        );

        if (!endpointHost) {
          throw new Error(`Endpoint host not found: ${tunnel.endpointHost}`);
        }

        const tunnelConfig = {
          name: tunnelName,
          tunnelType,
          sourceHostId: fullHost.id,
          tunnelIndex,
          hostName: fullHost.name || `${fullHost.username}@${fullHost.ip}`,
          sourceIP: fullHost.ip,
          sourceSSHPort: fullHost.port,
          sourceUsername: fullHost.username,
          sourcePassword:
            fullHost.authType === "password" ? fullHost.password : undefined,
          sourceAuthMethod: fullHost.authType,
          sourceSSHKey: fullHost.authType === "key" ? fullHost.key : undefined,
          sourceKeyPassword:
            fullHost.authType === "key" ? fullHost.keyPassword : undefined,
          sourceKeyType:
            fullHost.authType === "key" ? fullHost.keyType : undefined,
          sourceCredentialId: fullHost.credentialId,
          sourceUserId: fullHost.userId,
          endpointHost: tunnel.endpointHost,
          endpointIP: endpointHost.ip,
          endpointSSHPort: endpointHost.port,
          endpointUsername: endpointHost.username,
          endpointPassword:
            endpointHost.authType === "password"
              ? endpointHost.password
              : undefined,
          endpointAuthMethod: endpointHost.authType,
          endpointSSHKey:
            endpointHost.authType === "key" ? endpointHost.key : undefined,
          endpointKeyPassword:
            endpointHost.authType === "key"
              ? endpointHost.keyPassword
              : undefined,
          endpointKeyType:
            endpointHost.authType === "key" ? endpointHost.keyType : undefined,
          endpointCredentialId: endpointHost.credentialId,
          endpointUserId: endpointHost.userId,
          sourcePort: tunnel.sourcePort,
          endpointPort: tunnel.endpointPort,
          maxRetries: tunnel.maxRetries,
          retryInterval: tunnel.retryInterval * 1000,
          autoStart: tunnel.autoStart,
          isPinned: fullHost.pin,
          useSocks5: fullHost.useSocks5,
          socks5Host: fullHost.socks5Host,
          socks5Port: fullHost.socks5Port,
          socks5Username: fullHost.socks5Username,
          socks5Password: fullHost.socks5Password,
          socks5ProxyChain: fullHost.socks5ProxyChain,
        };

        await connectTunnel(tunnelConfig);
        showToast.success(`Connecting tunnel on port ${tunnel.sourcePort}`);
      } else if (action === "disconnect") {
        if (isDirectMode) {
          await disconnectDirectTunnel(tunnelName);
          setTunnelStatuses(getDirectTunnelStatuses());
          showToast.success(
            `Disconnected direct tunnel on port ${tunnel.sourcePort}`,
          );
        } else {
          await disconnectTunnel(tunnelName);
          showToast.success(
            `Disconnecting tunnel on port ${tunnel.sourcePort}`,
          );
        }
      } else if (action === "cancel") {
        if (isDirectMode) {
          await disconnectDirectTunnel(tunnelName);
          setTunnelStatuses(getDirectTunnelStatuses());
          showToast.success(
            `Cancelled direct tunnel on port ${tunnel.sourcePort}`,
          );
        } else {
          await cancelTunnel(tunnelName);
          showToast.success(`Cancelling tunnel on port ${tunnel.sourcePort}`);
        }
      }

      await fetchTunnelStatuses(false);
    } catch (err: any) {
      const errorMsg = err?.message || `Failed to ${action} tunnel`;
      showToast.error(errorMsg);
    } finally {
      setLoadingTunnels((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tunnelName);
        return newSet;
      });
    }
  };

  const openNewTunnelEditor = () => {
    setEditingTunnelIndex(null);
    setTunnelForm({
      tunnelType: "local",
      sourcePort: "",
      endpointHost: "",
      endpointPort: "",
      maxRetries: "5",
      retryInterval: "5",
      autoStart: false,
    });
    setEditorVisible(true);
  };

  const openEditTunnelEditor = (tunnel: TunnelConnection, index: number) => {
    setEditingTunnelIndex(index);
    setTunnelForm({
      tunnelType: tunnel.tunnelType || "remote",
      sourcePort: String(tunnel.sourcePort),
      endpointHost: tunnel.endpointHost,
      endpointPort: String(tunnel.endpointPort),
      maxRetries: String(tunnel.maxRetries ?? 5),
      retryInterval: String(tunnel.retryInterval ?? 5),
      autoStart: Boolean(tunnel.autoStart),
    });
    setEditorVisible(true);
  };

  const validatePort = (value: string) => {
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
  };

  const getFullCurrentHost = () => {
    return allHosts.find((h) => h.id === currentHostConfig.id) || null;
  };

  const buildHostUpdatePayload = (
    host: SSHHost,
    tunnelConnections: TunnelConnection[],
  ): SSHHostData => ({
    connectionType: host.connectionType || "ssh",
    name: host.name,
    ip: host.ip,
    port: host.port,
    username: host.username,
    folder: host.folder,
    tags: host.tags,
    pin: host.pin,
    authType: host.authType,
    password: host.password,
    key: host.key as any,
    keyPassword: host.keyPassword,
    keyType: host.keyType,
    sudoPassword: host.sudoPassword,
    credentialId: host.credentialId ?? null,
    overrideCredentialUsername: host.overrideCredentialUsername,
    enableTerminal: host.enableTerminal,
    enableTunnel: tunnelConnections.length > 0,
    enableFileManager: host.enableFileManager,
    enableDocker: host.enableDocker,
    showTerminalInSidebar: host.showTerminalInSidebar,
    showFileManagerInSidebar: host.showFileManagerInSidebar,
    showTunnelInSidebar: host.showTunnelInSidebar,
    showDockerInSidebar: host.showDockerInSidebar,
    showServerStatsInSidebar: host.showServerStatsInSidebar,
    defaultPath: host.defaultPath,
    forceKeyboardInteractive: host.forceKeyboardInteractive,
    tunnelConnections,
    jumpHosts: host.jumpHosts,
    quickActions: host.quickActions,
    statsConfig: host.statsConfig,
    terminalConfig: host.terminalConfig,
    dockerConfig: host.dockerConfig,
    notes: host.notes,
    useSocks5: host.useSocks5,
    socks5Host: host.socks5Host,
    socks5Port: host.socks5Port,
    socks5Username: host.socks5Username,
    socks5Password: host.socks5Password,
    socks5ProxyChain: host.socks5ProxyChain,
    macAddress: host.macAddress,
    portKnockSequence: host.portKnockSequence,
  });

  const saveTunnelConfiguration = async () => {
    const sourcePort = validatePort(tunnelForm.sourcePort);
    const endpointPort = validatePort(tunnelForm.endpointPort);
    const maxRetries = Number(tunnelForm.maxRetries);
    const retryInterval = Number(tunnelForm.retryInterval);
    const endpointHost = tunnelForm.endpointHost.trim();

    if (!sourcePort || !endpointPort) {
      Alert.alert("Invalid Port", "Ports must be between 1 and 65535.");
      return;
    }

    if (!endpointHost) {
      Alert.alert("Missing Endpoint", "Please enter an endpoint host.");
      return;
    }

    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      Alert.alert("Invalid Retries", "Max retries must be 0 or greater.");
      return;
    }

    if (!Number.isInteger(retryInterval) || retryInterval < 1) {
      Alert.alert("Invalid Interval", "Retry interval must be at least 1.");
      return;
    }

    const fullHost = getFullCurrentHost();
    if (!fullHost) {
      Alert.alert("Host Missing", "Unable to load the source host details.");
      return;
    }

    const existingTunnel =
      editingTunnelIndex === null
        ? null
        : currentHostConfig.tunnelConnections[editingTunnelIndex];
    const nextTunnel: TunnelConnection = {
      ...existingTunnel,
      tunnelType: tunnelForm.tunnelType,
      sourcePort,
      endpointHost,
      endpointPort,
      maxRetries,
      retryInterval,
      autoStart: tunnelForm.autoStart,
    };
    const nextTunnels = [...(currentHostConfig.tunnelConnections || [])];

    if (editingTunnelIndex === null) {
      nextTunnels.push(nextTunnel);
    } else {
      nextTunnels[editingTunnelIndex] = nextTunnel;
    }

    setIsSavingTunnel(true);
    try {
      const updatedHost = await updateSSHHost(
        fullHost.id,
        buildHostUpdatePayload(fullHost, nextTunnels),
      );

      setCurrentHostConfig({
        id: updatedHost.id,
        name: updatedHost.name,
        enableTunnel: updatedHost.enableTunnel,
        tunnelConnections: updatedHost.tunnelConnections || [],
      });
      setAllHosts((hosts) =>
        hosts.map((host) => (host.id === updatedHost.id ? updatedHost : host)),
      );
      setEditorVisible(false);
      showToast.success(
        editingTunnelIndex === null
          ? "Port forward added"
          : "Port forward updated",
      );
      await fetchTunnelStatuses(false);
    } catch (err: any) {
      showToast.error(err?.message || "Failed to save tunnel");
    } finally {
      setIsSavingTunnel(false);
    }
  };

  const deleteTunnelConfiguration = (
    tunnel: TunnelConnection,
    index: number,
  ) => {
    Alert.alert(
      "Delete Tunnel",
      `Remove port ${tunnel.sourcePort} -> ${tunnel.endpointHost}:${tunnel.endpointPort}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const fullHost = getFullCurrentHost();
            if (!fullHost) {
              showToast.error("Unable to load the source host details");
              return;
            }

            const tunnelName = getTunnelName(tunnel, index);
            const status = tunnelStatuses[tunnelName];
            const nextTunnels = currentHostConfig.tunnelConnections.filter(
              (_item, itemIndex) => itemIndex !== index,
            );

            try {
              if (status?.connected) {
                if (isDirectMode) {
                  await disconnectDirectTunnel(tunnelName);
                } else {
                  await disconnectTunnel(tunnelName);
                }
              }

              const updatedHost = await updateSSHHost(
                fullHost.id,
                buildHostUpdatePayload(fullHost, nextTunnels),
              );

              setCurrentHostConfig({
                id: updatedHost.id,
                name: updatedHost.name,
                enableTunnel: updatedHost.enableTunnel,
                tunnelConnections: updatedHost.tunnelConnections || [],
              });
              setAllHosts((hosts) =>
                hosts.map((host) =>
                  host.id === updatedHost.id ? updatedHost : host,
                ),
              );
              showToast.success("Port forward deleted");
              await fetchTunnelStatuses(false);
            } catch (err: any) {
              showToast.error(err?.message || "Failed to delete tunnel");
            }
          },
        },
      ],
    );
  };

  const cardWidth =
    isLandscape && columnCount > 1 ? `${100 / columnCount - 1}%` : "100%";

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BACKGROUNDS.DARK,
        opacity: isVisible ? 1 : 0,
        display: isVisible ? "flex" : "none",
      }}
    >
      {isLoading && !tunnelStatuses ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: BACKGROUNDS.DARKEST,
          }}
        >
          <ActivityIndicator size="large" color="#22C55E" />
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 14,
              marginTop: 16,
            }}
          >
            Loading tunnels...
          </Text>
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: BACKGROUNDS.DARKEST,
            paddingHorizontal: 24,
          }}
        >
          <Activity size={48} color="#EF4444" />
          <Text
            style={{
              color: "#ffffff",
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Failed to Load Tunnels
          </Text>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 14,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              backgroundColor: "#22C55E",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: RADIUS.BUTTON,
              marginTop: 24,
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : !currentHostConfig.enableTunnel ||
        !currentHostConfig.tunnelConnections ||
        currentHostConfig.tunnelConnections.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            marginTop: 80,
          }}
        >
          <Activity size={64} color="#6b7280" />
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
            }}
          >
            No Port Forwards Yet
          </Text>
          <Text
            style={{
              color: "#6B7280",
              textAlign: "center",
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Create a local or remote port forward through this SSH host.
          </Text>
          <Text
            style={{
              color: "#6B7280",
              textAlign: "center",
              marginTop: 4,
              fontSize: 14,
            }}
          >
            Direct mode opens the local port on this Android device.
          </Text>
          <TouchableOpacity
            onPress={openNewTunnelEditor}
            style={{
              backgroundColor: "#22C55E",
              borderRadius: RADIUS.BUTTON,
              flexDirection: "row",
              alignItems: "center",
              marginTop: 24,
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          >
            <Plus size={16} color="#ffffff" />
            <Text
              style={{
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "700",
                marginLeft: 8,
              }}
            >
              Add Port Forward
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding,
            paddingTop: padding / 2,
            paddingLeft: Math.max(insets.left, padding),
            paddingRight: Math.max(insets.right, padding),
            paddingBottom: padding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#22C55E"
              colors={["#22C55E"]}
            />
          }
        >
          <View
            style={{
              alignItems: "flex-start",
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: "#ffffff", fontSize: 24, fontWeight: "700" }}
              >
                Port Forwarding
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 4 }}>
                {isDirectMode
                  ? "Direct mode - phone opens local port forwards. "
                  : ""}
                {currentHostConfig.tunnelConnections.length} tunnel
                {currentHostConfig.tunnelConnections.length !== 1
                  ? "s"
                  : ""}{" "}
                configured for {currentHostConfig.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={openNewTunnelEditor}
              style={{
                alignItems: "center",
                backgroundColor: "#22C55E",
                borderRadius: RADIUS.BUTTON,
                flexDirection: "row",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Plus size={16} color="#ffffff" />
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: "700",
                  marginLeft: 6,
                }}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: isLandscape && columnCount > 1 ? "row" : "column",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {currentHostConfig.tunnelConnections.map((tunnel, idx) => {
              const tunnelName = getTunnelName(tunnel, idx);
              const status = tunnelStatuses[tunnelName] || null;
              const isLoadingTunnel = loadingTunnels.has(tunnelName);

              return (
                <View
                  key={idx}
                  style={{
                    width: cardWidth as any,
                    marginBottom: isLandscape && columnCount > 1 ? 0 : 12,
                  }}
                >
                  <TunnelCard
                    tunnel={tunnel}
                    tunnelName={tunnelName}
                    status={status}
                    isLoading={isLoadingTunnel}
                    onAction={async (action) => handleTunnelAction(action, idx)}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => openEditTunnelEditor(tunnel, idx)}
                      style={{
                        alignItems: "center",
                        backgroundColor: BACKGROUNDS.CARD,
                        borderColor: BORDER_COLORS.BUTTON,
                        borderRadius: RADIUS.BUTTON,
                        borderWidth: 1,
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "center",
                        paddingVertical: 10,
                      }}
                    >
                      <Pencil size={15} color="#E5E7EB" />
                      <Text
                        style={{
                          color: "#E5E7EB",
                          fontSize: 13,
                          fontWeight: "600",
                          marginLeft: 6,
                        }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTunnelConfiguration(tunnel, idx)}
                      style={{
                        alignItems: "center",
                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                        borderColor: "rgba(239, 68, 68, 0.35)",
                        borderRadius: RADIUS.BUTTON,
                        borderWidth: 1,
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "center",
                        paddingVertical: 10,
                      }}
                    >
                      <Trash2 size={15} color="#FCA5A5" />
                      <Text
                        style={{
                          color: "#FCA5A5",
                          fontSize: 13,
                          fontWeight: "600",
                          marginLeft: 6,
                        }}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <View
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.58)",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: BACKGROUNDS.DARKEST,
              borderTopColor: BORDER_COLORS.PRIMARY,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderTopWidth: 1,
              maxHeight: "88%",
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <View
              style={{
                alignItems: "center",
                borderBottomColor: BORDER_COLORS.SECONDARY,
                borderBottomWidth: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 18,
                paddingVertical: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {editingTunnelIndex === null
                    ? "Add Port Forward"
                    : "Edit Port Forward"}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                  Configure local (-L) or remote (-R) forwarding
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditorVisible(false)}
                style={{
                  backgroundColor: BACKGROUNDS.CARD,
                  borderColor: BORDER_COLORS.BUTTON,
                  borderRadius: 999,
                  borderWidth: 1,
                  padding: 8,
                }}
              >
                <X size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 18, gap: 14 }}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <Text
                  style={{ color: "#D1D5DB", fontSize: 13, marginBottom: 8 }}
                >
                  Tunnel Type
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {(["local", "remote"] as const).map((type) => {
                    const selected = tunnelForm.tunnelType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() =>
                          setTunnelForm((form) => ({
                            ...form,
                            tunnelType: type,
                          }))
                        }
                        style={{
                          backgroundColor: selected
                            ? "rgba(34, 197, 94, 0.16)"
                            : BACKGROUNDS.CARD,
                          borderColor: selected
                            ? "#22C55E"
                            : BORDER_COLORS.BUTTON,
                          borderRadius: RADIUS.BUTTON,
                          borderWidth: 1,
                          flex: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 11,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {type === "local" ? "Local (-L)" : "Remote (-R)"}
                        </Text>
                        <Text
                          style={{
                            color: "#9CA3AF",
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          {type === "local"
                            ? "Phone/server listens locally"
                            : "Remote host listens"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {isDirectMode && tunnelForm.tunnelType === "remote" && (
                  <Text
                    style={{ color: "#FBBF24", fontSize: 11, marginTop: 8 }}
                  >
                    Remote (-R) tunnels require Via SSHBridge server mode.
                  </Text>
                )}
              </View>

              <View>
                <Text
                  style={{ color: "#D1D5DB", fontSize: 13, marginBottom: 8 }}
                >
                  Source Port
                </Text>
                <TextInput
                  value={tunnelForm.sourcePort}
                  onChangeText={(sourcePort) =>
                    setTunnelForm((form) => ({ ...form, sourcePort }))
                  }
                  keyboardType="number-pad"
                  placeholder="8080"
                  placeholderTextColor="#71717A"
                  style={{
                    backgroundColor: BACKGROUNDS.CARD,
                    borderColor: BORDER_COLORS.BUTTON,
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: 1,
                    color: "#ffffff",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                />
              </View>

              <View>
                <Text
                  style={{ color: "#D1D5DB", fontSize: 13, marginBottom: 8 }}
                >
                  Endpoint Host
                </Text>
                <TextInput
                  value={tunnelForm.endpointHost}
                  onChangeText={(endpointHost) =>
                    setTunnelForm((form) => ({ ...form, endpointHost }))
                  }
                  placeholder="Existing host name or host/IP"
                  placeholderTextColor="#71717A"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    backgroundColor: BACKGROUNDS.CARD,
                    borderColor: BORDER_COLORS.BUTTON,
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: 1,
                    color: "#ffffff",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                />
                <Text style={{ color: "#71717A", fontSize: 11, marginTop: 6 }}>
                  Use a host name already saved in SSHBridge.
                </Text>
                {allHosts.filter((host) => host.id !== currentHostConfig.id)
                  .length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingTop: 10 }}
                  >
                    {allHosts
                      .filter((host) => host.id !== currentHostConfig.id)
                      .map((host) => (
                        <TouchableOpacity
                          key={host.id}
                          onPress={() =>
                            setTunnelForm((form) => ({
                              ...form,
                              endpointHost: host.name,
                            }))
                          }
                          style={{
                            backgroundColor:
                              tunnelForm.endpointHost === host.name
                                ? "rgba(34, 197, 94, 0.16)"
                                : BACKGROUNDS.CARD,
                            borderColor:
                              tunnelForm.endpointHost === host.name
                                ? "#22C55E"
                                : BORDER_COLORS.BUTTON,
                            borderRadius: 999,
                            borderWidth: 1,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                          }}
                        >
                          <Text style={{ color: "#E5E7EB", fontSize: 12 }}>
                            {host.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                )}
              </View>

              <View>
                <Text
                  style={{ color: "#D1D5DB", fontSize: 13, marginBottom: 8 }}
                >
                  Endpoint Port
                </Text>
                <TextInput
                  value={tunnelForm.endpointPort}
                  onChangeText={(endpointPort) =>
                    setTunnelForm((form) => ({ ...form, endpointPort }))
                  }
                  keyboardType="number-pad"
                  placeholder="80"
                  placeholderTextColor="#71717A"
                  style={{
                    backgroundColor: BACKGROUNDS.CARD,
                    borderColor: BORDER_COLORS.BUTTON,
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: 1,
                    color: "#ffffff",
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#D1D5DB", fontSize: 13, marginBottom: 8 }}
                  >
                    Max Retries
                  </Text>
                  <TextInput
                    value={tunnelForm.maxRetries}
                    onChangeText={(maxRetries) =>
                      setTunnelForm((form) => ({ ...form, maxRetries }))
                    }
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor="#71717A"
                    style={{
                      backgroundColor: BACKGROUNDS.CARD,
                      borderColor: BORDER_COLORS.BUTTON,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: 1,
                      color: "#ffffff",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#D1D5DB", fontSize: 13, marginBottom: 8 }}
                  >
                    Retry Seconds
                  </Text>
                  <TextInput
                    value={tunnelForm.retryInterval}
                    onChangeText={(retryInterval) =>
                      setTunnelForm((form) => ({ ...form, retryInterval }))
                    }
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor="#71717A"
                    style={{
                      backgroundColor: BACKGROUNDS.CARD,
                      borderColor: BORDER_COLORS.BUTTON,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: 1,
                      color: "#ffffff",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setTunnelForm((form) => ({
                    ...form,
                    autoStart: !form.autoStart,
                  }))
                }
                style={{
                  alignItems: "center",
                  backgroundColor: BACKGROUNDS.CARD,
                  borderColor: tunnelForm.autoStart
                    ? "#22C55E"
                    : BORDER_COLORS.BUTTON,
                  borderRadius: RADIUS.BUTTON,
                  borderWidth: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
              >
                <View>
                  <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                    Auto Start
                  </Text>
                  <Text
                    style={{ color: "#71717A", fontSize: 11, marginTop: 2 }}
                  >
                    Start this tunnel automatically when supported by server
                  </Text>
                </View>
                <View
                  style={{
                    alignItems: tunnelForm.autoStart
                      ? "flex-end"
                      : "flex-start",
                    backgroundColor: tunnelForm.autoStart
                      ? "#22C55E"
                      : "#3F3F46",
                    borderRadius: 999,
                    height: 26,
                    justifyContent: "center",
                    paddingHorizontal: 3,
                    width: 48,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 999,
                      height: 20,
                      width: 20,
                    }}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveTunnelConfiguration}
                disabled={isSavingTunnel}
                style={{
                  alignItems: "center",
                  backgroundColor: isSavingTunnel ? "#4B5563" : "#22C55E",
                  borderRadius: RADIUS.BUTTON,
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 4,
                  paddingVertical: 14,
                }}
              >
                {isSavingTunnel ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    Save Port Forward
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

TunnelManager.displayName = "TunnelManager";

export default TunnelManager;
