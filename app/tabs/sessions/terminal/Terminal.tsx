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
  ActivityIndicator,
  Dimensions,
  AccessibilityInfo,
  ScrollView,
  Platform,
} from "react-native";
import { logActivity, getSnippets } from "../../../main-axios";
import { showToast } from "../../../utils/toast";
import { useTerminalCustomization } from "../../../contexts/TerminalCustomizationContext";
import { BACKGROUNDS, BORDER_COLORS } from "../../../constants/designTokens";
import {
  TOTPDialog,
  SSHAuthDialog,
  HostKeyVerificationDialog,
} from "@/app/tabs/dialogs";
import { TERMINAL_THEMES } from "@/constants/terminal-themes";
import { MOBILE_DEFAULT_TERMINAL_CONFIG } from "@/constants/terminal-config";
import type { TerminalConfig } from "@/types";
import {
  NativeWebSocketManager,
  type TerminalHostConfig,
  type HostKeyData,
  type NativeWSConfig,
} from "./NativeWebSocketManager";
import { DirectSSHManager } from "./DirectSSHManager";
import CommandAutocomplete from "./CommandAutocomplete";
import {
  applyInputToTrackedCommand,
  buildCommandAutocompleteSuggestions,
  getAutocompleteInsertText,
  loadTerminalCommandHistory,
  recordTerminalCommand,
  shouldRefreshAutocompleteForInput,
  type CommandAutocompleteSuggestion,
  type SnippetAutocompleteSource,
} from "./terminal-autocomplete";
import {
  getTerminalConnectionMode,
  type TerminalConnectionMode,
} from "./terminal-connection-mode";

interface TerminalProps {
  hostConfig: {
    id: number;
    name: string;
    ip: string;
    port: number;
    username: string;
    authType: "password" | "key" | "credential" | "none";
    password?: string;
    key?: string;
    keyPassword?: string;
    keyType?: string;
    credentialId?: number;
    overrideCredentialUsername?: boolean;
    terminalConfig?: Partial<TerminalConfig>;
  };
  isVisible: boolean;
  title?: string;
  onClose?: () => void;
  onBackgroundColorChange?: (color: string) => void;
}

export type TerminalHandle = {
  sendInput: (data: string) => void;
  fit: () => void;
  isDialogOpen: () => boolean;
  notifyBackgrounded: () => void;
  notifyForegrounded: () => void;
  scrollToBottom: () => void;
  isSelecting: () => boolean;
};

type TerminalConnectionManager = NativeWebSocketManager | DirectSSHManager;

const MAX_TERMINAL_BUFFER_CHARS = 120000;

const TerminalComponent = forwardRef<TerminalHandle, TerminalProps>(
  (
    {
      hostConfig,
      isVisible,
      title = "Terminal",
      onClose,
      onBackgroundColorChange,
    },
    ref,
  ) => {
    void title;

    const connectionManagerRef = useRef<TerminalConnectionManager | null>(null);
    const terminalColsRef = useRef(80);
    const terminalRowsRef = useRef(24);
    const pendingDataRef = useRef<string[]>([]);
    const dataFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const scrollViewRef = useRef<ScrollView>(null);
    const terminalOutputRef = useRef("");

    const { config } = useTerminalCustomization();
    const terminalPresentation = getTerminalPresentation(
      config,
      hostConfig.terminalConfig,
    );
    const terminalBackgroundColor = terminalPresentation.background;

    const [connectionMode, setConnectionMode] =
      useState<TerminalConnectionMode>("direct");
    const [connectionModeLoaded, setConnectionModeLoaded] = useState(false);
    const [screenDimensions, setScreenDimensions] = useState(
      Dimensions.get("window"),
    );
    type ConnectionState =
      | "connecting"
      | "connected"
      | "reconnecting"
      | "disconnected"
      | "failed";
    const [connectionState, setConnectionState] =
      useState<ConnectionState>("connecting");
    const [retryCount, setRetryCount] = useState(0);
    const [hasReceivedData, setHasReceivedData] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState("");

    const [totpRequired, setTotpRequired] = useState(false);
    const [totpPrompt, setTotpPrompt] = useState("");
    const [isPasswordPrompt, setIsPasswordPrompt] = useState(false);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [authDialogReason, setAuthDialogReason] = useState<
      "no_keyboard" | "auth_failed" | "timeout"
    >("auth_failed");
    const [hostKeyVerification, setHostKeyVerification] = useState<{
      scenario: "new" | "changed";
      data: HostKeyData;
    } | null>(null);

    const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
    const isScreenReaderEnabledRef = useRef(false);
    const [accessibilityText, setAccessibilityText] = useState("");
    const accessibilityBufferRef = useRef<string[]>([]);
    const accessibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const commandInputRef = useRef("");
    const commandHistoryRef = useRef<string[]>([]);
    const autocompleteSnippetsRef = useRef<SnippetAutocompleteSource[]>([]);
    const autocompleteSuggestionsRef = useRef<CommandAutocompleteSuggestion[]>(
      [],
    );
    const autocompleteSelectedIndexRef = useRef(0);
    const autocompleteVisibleRef = useRef(false);
    const autocompleteRefreshTimerRef = useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
      CommandAutocompleteSuggestion[]
    >([]);
    const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] =
      useState(0);
    const [showAutocomplete, setShowAutocomplete] = useState(false);

    useEffect(() => {
      if (onBackgroundColorChange) {
        onBackgroundColorChange(terminalBackgroundColor);
      }
    }, [onBackgroundColorChange, terminalBackgroundColor]);

    useEffect(() => {
      AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
        setIsScreenReaderEnabled(enabled);
        isScreenReaderEnabledRef.current = enabled;
      });
      const subscription = AccessibilityInfo.addEventListener(
        "screenReaderChanged",
        (enabled) => {
          setIsScreenReaderEnabled(enabled);
          isScreenReaderEnabledRef.current = enabled;
        },
      );
      return () => subscription.remove();
    }, []);

    useEffect(() => {
      let mounted = true;
      getTerminalConnectionMode("direct")
        .then((mode) => {
          if (mounted) setConnectionMode(mode);
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setConnectionModeLoaded(true);
        });

      return () => {
        mounted = false;
      };
    }, []);

    useEffect(() => {
      autocompleteVisibleRef.current = showAutocomplete;
    }, [showAutocomplete]);

    useEffect(() => {
      autocompleteSuggestionsRef.current = autocompleteSuggestions;
    }, [autocompleteSuggestions]);

    useEffect(() => {
      autocompleteSelectedIndexRef.current = autocompleteSelectedIndex;
    }, [autocompleteSelectedIndex]);

    const scrollToTerminalBottom = useCallback((animated = false) => {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      });
    }, []);

    const writeToAccessibility = useCallback((rawData: string) => {
      const cleaned = rawData
        .replace(/\x1b\[[0-9;]*[mGKHJABCDsu]/g, "")
        .replace(/\x1b\][^\x07]*\x07/g, "")
        .replace(/\x1b[()][AB012]/g, "")
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
        .trim();

      if (!cleaned) return;

      const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;

      accessibilityBufferRef.current.push(...lines);
      if (accessibilityBufferRef.current.length > 5) {
        accessibilityBufferRef.current =
          accessibilityBufferRef.current.slice(-5);
      }

      if (accessibilityTimerRef.current) {
        clearTimeout(accessibilityTimerRef.current);
      }
      accessibilityTimerRef.current = setTimeout(() => {
        accessibilityTimerRef.current = null;
        const text = accessibilityBufferRef.current.join("\n");
        accessibilityBufferRef.current = [];
        setAccessibilityText(text);
        AccessibilityInfo.announceForAccessibility(text);
      }, 500);
    }, []);

    const flushPendingTerminalData = useCallback(() => {
      dataFlushTimerRef.current = null;
      const batch = pendingDataRef.current.join("");
      pendingDataRef.current = [];

      if (!batch) return;

      const nextOutput = appendNativeTerminalData(
        terminalOutputRef.current,
        batch,
      );
      terminalOutputRef.current = nextOutput;
      setTerminalOutput(nextOutput);
      scrollToTerminalBottom(false);
    }, [scrollToTerminalBottom]);

    const resetNativeTerminal = useCallback(() => {
      pendingDataRef.current = [];
      terminalOutputRef.current = "";
      setTerminalOutput("");
      setHasReceivedData(false);
      if (dataFlushTimerRef.current) {
        clearTimeout(dataFlushTimerRef.current);
        dataFlushTimerRef.current = null;
      }
    }, []);

    useEffect(() => {
      const subscription = Dimensions.addEventListener(
        "change",
        ({ window }) => {
          setScreenDimensions(window);
        },
      );

      return () => subscription?.remove();
    }, []);

    useEffect(() => {
      const nextSize = estimateTerminalSize(
        screenDimensions,
        terminalPresentation.fontSize,
        terminalPresentation.lineHeight,
      );

      if (
        terminalColsRef.current === nextSize.cols &&
        terminalRowsRef.current === nextSize.rows
      ) {
        return;
      }

      terminalColsRef.current = nextSize.cols;
      terminalRowsRef.current = nextSize.rows;
      connectionManagerRef.current?.sendResize(nextSize.cols, nextSize.rows);
    }, [
      screenDimensions,
      terminalPresentation.fontSize,
      terminalPresentation.lineHeight,
    ]);

    useEffect(() => {
      let isMounted = true;

      commandInputRef.current = "";
      autocompleteVisibleRef.current = false;
      autocompleteSuggestionsRef.current = [];
      autocompleteSelectedIndexRef.current = 0;
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
      setAutocompleteSelectedIndex(0);

      const loadAutocompleteSources = async () => {
        const [history, snippets] = await Promise.all([
          loadTerminalCommandHistory(hostConfig.id),
          getSnippets().catch(() => []),
        ]);

        if (!isMounted) return;

        commandHistoryRef.current = history;
        autocompleteSnippetsRef.current = Array.isArray(snippets)
          ? (snippets as SnippetAutocompleteSource[])
          : [];
      };

      loadAutocompleteSources().catch((error) => {
        console.warn("Failed to load autocomplete sources:", error);
      });

      return () => {
        isMounted = false;
      };
    }, [hostConfig.id]);

    const handleConnectionFailure = useCallback(
      (errorMessage: string) => {
        showToast.error(errorMessage);
        setConnectionState("failed");
        if (onClose) {
          onClose();
        }
      },
      [onClose],
    );

    const hideAutocomplete = useCallback(() => {
      autocompleteVisibleRef.current = false;
      autocompleteSuggestionsRef.current = [];
      autocompleteSelectedIndexRef.current = 0;
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
      setAutocompleteSelectedIndex(0);
    }, []);

    const getAutocompleteMatches = useCallback(
      (input = commandInputRef.current) => {
        return buildCommandAutocompleteSuggestions(input, {
          history: commandHistoryRef.current,
          snippets: autocompleteSnippetsRef.current,
          limit: 3,
        });
      },
      [],
    );

    const showAutocompleteForCurrentCommand = useCallback(() => {
      const matches = getAutocompleteMatches();

      if (matches.length === 0) {
        hideAutocomplete();
        return false;
      }

      autocompleteVisibleRef.current = true;
      autocompleteSuggestionsRef.current = matches;
      autocompleteSelectedIndexRef.current = 0;
      setAutocompleteSuggestions(matches);
      setAutocompleteSelectedIndex(0);
      setShowAutocomplete(true);
      return true;
    }, [getAutocompleteMatches, hideAutocomplete]);

    const scheduleAutocompleteRefresh = useCallback(
      (data: string) => {
        if (!shouldRefreshAutocompleteForInput(data)) return;

        if (autocompleteRefreshTimerRef.current) {
          clearTimeout(autocompleteRefreshTimerRef.current);
        }

        autocompleteRefreshTimerRef.current = setTimeout(() => {
          autocompleteRefreshTimerRef.current = null;
          showAutocompleteForCurrentCommand();
        }, 80);
      },
      [showAutocompleteForCurrentCommand],
    );

    const persistSubmittedCommands = useCallback(
      (commands: string[]) => {
        if (commands.length === 0) return;

        void (async () => {
          let latestHistory = commandHistoryRef.current;
          for (const command of commands) {
            latestHistory = await recordTerminalCommand(hostConfig.id, command);
          }
          commandHistoryRef.current = latestHistory;
        })().catch((error) => {
          console.warn("Failed to save command history:", error);
        });
      },
      [hostConfig.id],
    );

    const trackCommandInput = useCallback(
      (data: string) => {
        const update = applyInputToTrackedCommand(
          commandInputRef.current,
          data,
        );

        if (!update.changed && update.submittedCommands.length === 0) return;

        commandInputRef.current = update.command;

        if (update.submittedCommands.length > 0) {
          hideAutocomplete();
          persistSubmittedCommands(update.submittedCommands);
          return;
        }

        if (!commandInputRef.current.trim()) {
          hideAutocomplete();
        }
      },
      [hideAutocomplete, persistSubmittedCommands],
    );

    const applyAutocompleteSuggestion = useCallback(
      (suggestion: CommandAutocompleteSuggestion) => {
        const selectedCommand = suggestion.value;
        const insertText = getAutocompleteInsertText(
          commandInputRef.current,
          selectedCommand,
        );

        connectionManagerRef.current?.sendInput(insertText);
        commandInputRef.current = selectedCommand;
        hideAutocomplete();
      },
      [hideAutocomplete],
    );

    const cycleAutocompleteSelection = useCallback((direction: 1 | -1) => {
      const suggestions = autocompleteSuggestionsRef.current;
      if (suggestions.length === 0) return;

      setAutocompleteSelectedIndex((current) => {
        const next =
          (current + direction + suggestions.length) % suggestions.length;
        autocompleteSelectedIndexRef.current = next;
        return next;
      });
    }, []);

    const handleAutocompleteInput = useCallback(
      (data: string) => {
        const suggestions = autocompleteSuggestionsRef.current;

        if (autocompleteVisibleRef.current && suggestions.length > 0) {
          if (data === "\x1b") {
            hideAutocomplete();
            return true;
          }

          if (data === "\r" || data === "\n") {
            applyAutocompleteSuggestion(
              suggestions[autocompleteSelectedIndexRef.current] ||
                suggestions[0],
            );
            return true;
          }

          if (data === "\t") {
            cycleAutocompleteSelection(1);
            return true;
          }

          if (data === "\x1b[A") {
            cycleAutocompleteSelection(-1);
            return true;
          }

          if (data === "\x1b[B") {
            cycleAutocompleteSelection(1);
            return true;
          }
        }

        if (data === "\t") {
          const matches = getAutocompleteMatches();

          if (matches.length === 0) {
            return false;
          }

          if (matches.length === 1) {
            applyAutocompleteSuggestion(matches[0]);
            return true;
          }

          autocompleteVisibleRef.current = true;
          autocompleteSuggestionsRef.current = matches;
          autocompleteSelectedIndexRef.current = 0;
          setAutocompleteSuggestions(matches);
          setAutocompleteSelectedIndex(0);
          setShowAutocomplete(true);
          return true;
        }

        return false;
      },
      [
        applyAutocompleteSuggestion,
        cycleAutocompleteSelection,
        getAutocompleteMatches,
        hideAutocomplete,
      ],
    );

    const sendTerminalInput = useCallback(
      (data: string) => {
        if (handleAutocompleteInput(data)) return;

        trackCommandInput(data);
        connectionManagerRef.current?.sendInput(data);
        scheduleAutocompleteRefresh(data);
      },
      [handleAutocompleteInput, scheduleAutocompleteRefresh, trackCommandInput],
    );

    const handlePostConnectionSetup = useCallback(async () => {
      const terminalConfig: Partial<TerminalConfig> = {
        ...MOBILE_DEFAULT_TERMINAL_CONFIG,
        ...config,
        ...hostConfig.terminalConfig,
      };

      setTimeout(async () => {
        if (terminalConfig.environmentVariables?.length) {
          terminalConfig.environmentVariables.forEach((envVar, index) => {
            setTimeout(
              () => {
                const key = envVar.key;
                const value = envVar.value;
                connectionManagerRef.current?.sendInput(
                  `export ${key}="${value}"\n`,
                );
              },
              100 * (index + 1),
            );
          });
        }

        if (terminalConfig.startupSnippetId) {
          const snippetDelay =
            100 * (terminalConfig.environmentVariables?.length || 0) + 200;
          setTimeout(async () => {
            try {
              const snippets = await getSnippets();
              const snippet = snippets.find(
                (s: any) => s.id === terminalConfig.startupSnippetId,
              );
              if (snippet) {
                connectionManagerRef.current?.sendInput(`${snippet.content}\n`);
              }
            } catch (err) {
              console.warn("Failed to execute startup snippet:", err);
            }
          }, snippetDelay);
        }

        if (terminalConfig.autoMosh && terminalConfig.moshCommand) {
          const moshDelay =
            100 * (terminalConfig.environmentVariables?.length || 0) +
            (terminalConfig.startupSnippetId ? 400 : 200);
          setTimeout(() => {
            connectionManagerRef.current?.sendInput(
              `${terminalConfig.moshCommand!}\n`,
            );
          }, moshDelay);
        }
      }, 500);
    }, [config, hostConfig.terminalConfig]);

    const handleTotpSubmit = useCallback(
      (code: string) => {
        connectionManagerRef.current?.sendTotpResponse(code, isPasswordPrompt);
        setTotpRequired(false);
        setTotpPrompt("");
        setIsPasswordPrompt(false);
        setConnectionState("connecting");
      },
      [isPasswordPrompt],
    );

    const handleAuthDialogSubmit = useCallback(
      (credentials: {
        password?: string;
        sshKey?: string;
        keyPassword?: string;
      }) => {
        connectionManagerRef.current?.sendReconnectWithCredentials(
          credentials,
          terminalColsRef.current,
          terminalRowsRef.current,
        );
        setShowAuthDialog(false);
        setConnectionState("connecting");
      },
      [],
    );

    useEffect(() => {
      if (!connectionModeLoaded) return;

      connectionManagerRef.current?.destroy();
      resetNativeTerminal();

      const initialSize = estimateTerminalSize(
        screenDimensions,
        terminalPresentation.fontSize,
        terminalPresentation.lineHeight,
      );
      terminalColsRef.current = initialSize.cols;
      terminalRowsRef.current = initialSize.rows;

      const managerConfig: NativeWSConfig = {
        hostConfig: hostConfig as TerminalHostConfig,
        onStateChange: (state, data) => {
          switch (state) {
            case "connecting":
              setConnectionState(
                (data?.retryCount as number) > 0
                  ? "reconnecting"
                  : "connecting",
              );
              setRetryCount((data?.retryCount as number) || 0);
              break;
            case "connected":
              setConnectionState("connected");
              setRetryCount(0);
              logActivity("terminal", hostConfig.id, hostConfig.name).catch(
                () => {},
              );
              break;
            case "dataReceived":
              setHasReceivedData(true);
              break;
          }
        },
        onData: (data) => {
          pendingDataRef.current.push(data);
          if (!dataFlushTimerRef.current) {
            dataFlushTimerRef.current = setTimeout(
              flushPendingTerminalData,
              16,
            );
          }
          if (isScreenReaderEnabledRef.current) {
            writeToAccessibility(data);
          }
        },
        onTotpRequired: (prompt, isPassword) => {
          setTotpPrompt(prompt);
          setIsPasswordPrompt(isPassword);
          setTotpRequired(true);
        },
        onAuthDialogNeeded: (reason) => {
          setAuthDialogReason(reason);
          setShowAuthDialog(true);
          setConnectionState("disconnected");
        },
        onHostKeyVerificationRequired: (scenario, data) => {
          setHostKeyVerification({ scenario, data });
        },
        onPostConnectionSetup: () => handlePostConnectionSetup(),
        onDisconnected: (hostName) => {
          setConnectionState("disconnected");
          showToast.warning(`Disconnected from ${hostName}`);
          if (onClose) onClose();
        },
        onConnectionFailed: (message) => handleConnectionFailure(message),
      };

      const manager =
        connectionMode === "direct"
          ? new DirectSSHManager(managerConfig)
          : new NativeWebSocketManager(managerConfig);

      connectionManagerRef.current = manager;
      setConnectionState("connecting");
      setRetryCount(0);
      void manager.connect(initialSize.cols, initialSize.rows);

      return () => {
        manager.destroy();
        if (connectionManagerRef.current === manager) {
          connectionManagerRef.current = null;
        }
      };
      // The session should only be recreated when the host or transport changes.
      // Presentation updates are handled by sendResize without reconnecting.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostConfig.id, connectionMode, connectionModeLoaded]);

    useEffect(() => {
      return () => {
        connectionManagerRef.current?.destroy();
        connectionManagerRef.current = null;
        if (dataFlushTimerRef.current) {
          clearTimeout(dataFlushTimerRef.current);
          dataFlushTimerRef.current = null;
        }
        if (accessibilityTimerRef.current) {
          clearTimeout(accessibilityTimerRef.current);
          accessibilityTimerRef.current = null;
        }
        if (autocompleteRefreshTimerRef.current) {
          clearTimeout(autocompleteRefreshTimerRef.current);
          autocompleteRefreshTimerRef.current = null;
        }
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        sendInput: (data: string) => {
          sendTerminalInput(data);
        },
        fit: () => {
          const nextSize = estimateTerminalSize(
            screenDimensions,
            terminalPresentation.fontSize,
            terminalPresentation.lineHeight,
          );
          terminalColsRef.current = nextSize.cols;
          terminalRowsRef.current = nextSize.rows;
          connectionManagerRef.current?.sendResize(
            nextSize.cols,
            nextSize.rows,
          );
          scrollToTerminalBottom(false);
        },
        isDialogOpen: () => {
          return totpRequired || showAuthDialog || hostKeyVerification !== null;
        },
        notifyBackgrounded: () => {
          connectionManagerRef.current?.notifyBackgrounded();
        },
        notifyForegrounded: () => {
          connectionManagerRef.current?.notifyForegrounded();
        },
        scrollToBottom: () => {
          scrollToTerminalBottom(false);
        },
        isSelecting: () => false,
      }),
      [
        screenDimensions,
        terminalPresentation.fontSize,
        terminalPresentation.lineHeight,
        totpRequired,
        showAuthDialog,
        hostKeyVerification,
        sendTerminalInput,
        scrollToTerminalBottom,
      ],
    );

    const showBlockingConnectionOverlay =
      connectionState === "connecting" && !hasReceivedData;
    const showConnectionBanner =
      connectionState === "reconnecting" ||
      (connectionState === "connecting" && hasReceivedData);
    const connectionStatusLabel =
      connectionState === "reconnecting" ? "Reconnecting..." : "Connecting...";

    return (
      <View
        style={{
          flex: isVisible ? 1 : 0,
          width: "100%",
          height: "100%",
          position: isVisible ? "relative" : "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: terminalBackgroundColor,
        }}
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            opacity: isVisible ? 1 : 0,
            position: "relative",
            zIndex: isVisible ? 1 : -1,
            backgroundColor: terminalBackgroundColor,
          }}
        >
          <View
            style={{ flex: 1, backgroundColor: terminalBackgroundColor }}
            pointerEvents={
              totpRequired || showAuthDialog || hostKeyVerification !== null
                ? "none"
                : "auto"
            }
          >
            <ScrollView
              ref={scrollViewRef}
              style={{
                flex: 1,
                width: "100%",
                height: "100%",
                backgroundColor: terminalBackgroundColor,
              }}
              contentContainerStyle={{
                minHeight: "100%",
                paddingHorizontal: 6,
                paddingTop: 4,
                paddingBottom: 16,
              }}
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={true}
              overScrollMode="never"
              onContentSizeChange={() => scrollToTerminalBottom(false)}
            >
              {connectionState === "connected" && !hasReceivedData ? (
                <Text
                  style={{
                    color: terminalPresentation.mutedForeground,
                    fontFamily: terminalPresentation.fontFamily,
                    fontSize: terminalPresentation.fontSize,
                    lineHeight: terminalPresentation.lineHeight,
                  }}
                >
                  Connected. Waiting for shell output...
                </Text>
              ) : null}

              {terminalOutput.length > 0 ? (
                <Text
                  selectable
                  style={{
                    color: terminalPresentation.foreground,
                    fontFamily: terminalPresentation.fontFamily,
                    fontSize: terminalPresentation.fontSize,
                    letterSpacing: terminalPresentation.letterSpacing,
                    lineHeight: terminalPresentation.lineHeight,
                  }}
                >
                  {terminalOutput}
                </Text>
              ) : null}
            </ScrollView>
          </View>

          {showConnectionBanner && (
            <View
              style={{
                position: "absolute",
                top: 8,
                left: 10,
                right: 10,
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(16,16,16,0.86)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: "rgba(252,251,248,0.12)",
                }}
              >
                <ActivityIndicator size="small" color="#f7f4ed" />
                <Text
                  style={{
                    color: "#fcfbf8",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {connectionStatusLabel}
                </Text>
              </View>
            </View>
          )}

          {showBlockingConnectionOverlay && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: terminalBackgroundColor,
                padding: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: "#fcfbf8",
                  borderRadius: 12,
                  padding: 24,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#eceae4",
                  minWidth: 280,
                }}
              >
                <ActivityIndicator size="large" color="#1c1c1c" />
                <Text
                  style={{
                    color: "#1c1c1c",
                    fontSize: 18,
                    fontWeight: "600",
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  {connectionStatusLabel}
                </Text>
                <Text
                  style={{
                    color: "#5f5f5d",
                    fontSize: 14,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {hostConfig.name} - {hostConfig.ip}
                </Text>
                {retryCount > 0 && (
                  <View
                    style={{
                      backgroundColor: "#f7f4ed",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginTop: 12,
                      borderWidth: 1,
                      borderColor: "#eceae4",
                    }}
                  >
                    <Text
                      style={{
                        color: "#EF4444",
                        fontSize: 12,
                        fontWeight: "500",
                        textAlign: "center",
                      }}
                    >
                      Retry {retryCount}/5
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {showAutocomplete &&
            autocompleteSuggestions.length > 0 &&
            connectionState === "connected" &&
            !totpRequired &&
            !showAuthDialog &&
            hostKeyVerification === null && (
              <CommandAutocomplete
                suggestions={autocompleteSuggestions}
                selectedIndex={autocompleteSelectedIndex}
                onSelect={applyAutocompleteSuggestion}
              />
            )}
        </View>

        {isScreenReaderEnabled && (
          <View
            accessible={true}
            accessibilityLabel={accessibilityText}
            accessibilityLiveRegion="polite"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              top: -1000,
              left: -1000,
            }}
          />
        )}

        <TOTPDialog
          visible={totpRequired}
          onSubmit={handleTotpSubmit}
          onCancel={() => {
            setTotpRequired(false);
            setTotpPrompt("");
            setIsPasswordPrompt(false);
            if (onClose) onClose();
          }}
          prompt={totpPrompt}
          isPasswordPrompt={isPasswordPrompt}
        />

        <SSHAuthDialog
          visible={showAuthDialog}
          onSubmit={handleAuthDialogSubmit}
          onCancel={() => {
            setShowAuthDialog(false);
            if (onClose) onClose();
          }}
          hostInfo={{
            name: hostConfig.name,
            ip: hostConfig.ip,
            port: hostConfig.port,
            username: hostConfig.username,
          }}
          reason={authDialogReason}
        />

        <HostKeyVerificationDialog
          visible={hostKeyVerification !== null}
          scenario={hostKeyVerification?.scenario ?? "new"}
          data={hostKeyVerification?.data ?? null}
          onAccept={() => {
            connectionManagerRef.current?.sendHostKeyResponse("accept");
            setHostKeyVerification(null);
          }}
          onReject={() => {
            connectionManagerRef.current?.sendHostKeyResponse("reject");
            setHostKeyVerification(null);
            if (onClose) onClose();
          }}
        />
      </View>
    );
  },
);

TerminalComponent.displayName = "Terminal";

export { TerminalComponent as Terminal };
export default TerminalComponent;

function getTerminalPresentation(
  config: Partial<TerminalConfig>,
  hostTerminalConfig?: Partial<TerminalConfig>,
) {
  const terminalConfig: Partial<TerminalConfig> = {
    ...MOBILE_DEFAULT_TERMINAL_CONFIG,
    ...config,
    ...hostTerminalConfig,
  };
  const themeName = terminalConfig.theme || "termix";
  const themeColors =
    TERMINAL_THEMES[themeName]?.colors || TERMINAL_THEMES.termix.colors;
  const fontSize = Number(terminalConfig.fontSize || 14);
  const lineHeightMultiplier = Number(terminalConfig.lineHeight || 1.2);
  const lineHeight = Math.max(12, Math.round(fontSize * lineHeightMultiplier));

  return {
    background: themeColors.background,
    foreground: themeColors.foreground,
    mutedForeground: themeColors.brightBlack || "#71717A",
    fontFamily: getNativeMonospaceFont(terminalConfig.fontFamily),
    fontSize,
    letterSpacing: Number(terminalConfig.letterSpacing || 0),
    lineHeight,
  };
}

function getNativeMonospaceFont(fontFamily: unknown): string {
  if (typeof fontFamily === "string" && fontFamily.trim()) {
    return fontFamily.trim();
  }

  return Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  })!;
}

function estimateTerminalSize(
  dimensions: { width: number; height: number },
  fontSize: number,
  lineHeight: number,
) {
  const charWidth = Math.max(6, fontSize * 0.6);
  const availableWidth = Math.max(120, dimensions.width - 12);
  const availableHeight = Math.max(160, dimensions.height - 12);

  return {
    cols: Math.max(20, Math.floor(availableWidth / charWidth)),
    rows: Math.max(8, Math.floor(availableHeight / lineHeight)),
  };
}

function appendNativeTerminalData(currentOutput: string, rawData: string) {
  const normalized = normalizeTerminalData(rawData);
  let output = normalized.clearBeforeAppend ? "" : currentOutput;

  for (const char of normalized.text) {
    if (char === "\n") {
      output += "\n";
      continue;
    }

    if (char === "\r") {
      output = replaceCurrentLine(output, "");
      continue;
    }

    if (char === "\b" || char === "\x7f") {
      output = output.slice(0, -1);
      continue;
    }

    if (char === "\f") {
      output = "";
      continue;
    }

    if (char === "\t") {
      output += "    ";
      continue;
    }

    if (char >= " ") {
      output += char;
    }
  }

  if (output.length <= MAX_TERMINAL_BUFFER_CHARS) {
    return output;
  }

  const trimmed = output.slice(-MAX_TERMINAL_BUFFER_CHARS);
  const firstLineBreak = trimmed.indexOf("\n");
  return firstLineBreak > -1 ? trimmed.slice(firstLineBreak + 1) : trimmed;
}

function normalizeTerminalData(rawData: string) {
  const clearBeforeAppend =
    /\x1bc/.test(rawData) || /\x1b\[(?:2|3)?J/.test(rawData);
  const text = rawData
    .replace(/\r\n/g, "\n")
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1bP[\s\S]*?\x1b\\/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][AB012]/g, "")
    .replace(/\x1b[=>]/g, "")
    .replace(/[\x00-\x08\x0b\x0e-\x1f]/g, "");

  return { clearBeforeAppend, text };
}

function replaceCurrentLine(output: string, value: string) {
  const lineBreakIndex = output.lastIndexOf("\n");
  if (lineBreakIndex === -1) return value;
  return `${output.slice(0, lineBreakIndex + 1)}${value}`;
}
