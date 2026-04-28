import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  ArrowLeft,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { TerminalSession } from "@/app/contexts/TerminalSessionsContext";
import { useRouter } from "expo-router";
import { useOrientation } from "@/app/utils/orientation";
import { getTabBarHeight, getButtonSize } from "@/app/utils/responsive";
import { BORDERS, BACKGROUNDS, RADIUS } from "@/app/constants/designTokens";

interface TabBarProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onTabPress: (sessionId: string) => void;
  onTabClose: (sessionId: string) => void;
  onAddSession?: () => void;
  onToggleKeyboard?: () => void;
  isCustomKeyboardVisible: boolean;
  hiddenInputRef: React.RefObject<TextInput | null>;
  onHideKeyboard?: () => void;
  onShowKeyboard?: () => void;
  keyboardIntentionallyHiddenRef: React.MutableRefObject<boolean>;
  activeSessionType?: TerminalSession["type"];
  isSystemKeyboardVisible?: boolean;
}

export default function TabBar({
  sessions,
  activeSessionId,
  onTabPress,
  onTabClose,
  onAddSession,
  onToggleKeyboard,
  isCustomKeyboardVisible,
  hiddenInputRef,
  onHideKeyboard,
  onShowKeyboard,
  keyboardIntentionallyHiddenRef,
  activeSessionType,
  isSystemKeyboardVisible = false,
}: TabBarProps) {
  const router = useRouter();
  const { isLandscape } = useOrientation();
  const insets = useSafeAreaInsets();

  const isCompact =
    activeSessionType === "terminal" &&
    !isCustomKeyboardVisible &&
    isSystemKeyboardVisible;
  const tabBarHeight = isCompact
    ? isLandscape
      ? 34
      : 38
    : getTabBarHeight(isLandscape);
  const buttonSize = isCompact
    ? isLandscape
      ? 28
      : 30
    : getButtonSize(isLandscape);

  const needsBottomPadding = activeSessionType !== "terminal";

  const handleToggleSystemKeyboard = () => {
    if (keyboardIntentionallyHiddenRef.current) {
      onShowKeyboard?.();
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 50);
    } else {
      onHideKeyboard?.();
      Keyboard.dismiss();
    }
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <View style={{ position: "relative" }}>
      <View
        style={{
          backgroundColor: BACKGROUNDS.DARKER,
          borderTopWidth: BORDERS.MAJOR,
          borderTopColor: "rgba(252,251,248,0.1)",
          borderBottomWidth:
            activeSessionType === "terminal" ? BORDERS.STANDARD : 0,
          borderBottomColor: "rgba(252,251,248,0.1)",
          height: tabBarHeight + (needsBottomPadding ? insets.bottom : 0),
          paddingBottom: needsBottomPadding ? insets.bottom : 0,
          justifyContent:
            activeSessionType === "terminal" ? "center" : "flex-start",
        }}
        focusable={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: tabBarHeight,
            paddingHorizontal: isCompact ? 5 : 8,
          }}
        >
          <TouchableOpacity
            onPress={() => router.navigate("/hosts" as any)}
            focusable={false}
            className="items-center justify-center"
            activeOpacity={0.7}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderWidth: BORDERS.STANDARD,
              borderColor: "rgba(252,251,248,0.12)",
              backgroundColor: "rgba(252,251,248,0.08)",
              borderRadius: RADIUS.BUTTON,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
              marginRight: isCompact ? 5 : isLandscape ? 6 : 8,
            }}
          >
            <ArrowLeft
              size={isCompact ? 16 : isLandscape ? 18 : 20}
              color="#fcfbf8"
            />
          </TouchableOpacity>

          <View style={{ flex: 1, justifyContent: "center" }}>
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              focusable={false}
              contentContainerStyle={{
                paddingHorizontal: 0,
                gap: isCompact ? 4 : 6,
                alignItems: "center",
              }}
              className="flex-row"
              scrollEnabled={true}
              directionalLockEnabled={true}
              nestedScrollEnabled={false}
              alwaysBounceVertical={false}
              alwaysBounceHorizontal={false}
              bounces={false}
              bouncesZoom={false}
              scrollEventThrottle={16}
              removeClippedSubviews={false}
              overScrollMode="never"
              disableIntervalMomentum={true}
              pagingEnabled={false}
            >
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;

                return (
                  <TouchableOpacity
                    key={session.id}
                    onPress={() => onTabPress(session.id)}
                    focusable={false}
                    className="flex-row items-center"
                    style={{
                      borderWidth: BORDERS.STANDARD,
                      borderColor: isActive
                        ? "#f7f4ed"
                        : "rgba(252,251,248,0.12)",
                      backgroundColor: isActive
                        ? "#f7f4ed"
                        : "rgba(252,251,248,0.08)",
                      borderRadius: RADIUS.BUTTON,
                      shadowColor: isActive ? "#f7f4ed" : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.2 : 0,
                      shadowRadius: 4,
                      elevation: isActive ? 3 : 0,
                      minWidth: isCompact
                        ? isLandscape
                          ? 82
                          : 96
                        : isLandscape
                          ? 100
                          : 120,
                      height: buttonSize,
                    }}
                  >
                    <View
                      className="flex-1"
                      style={{
                        paddingHorizontal: isCompact ? 8 : 12,
                        paddingVertical: isCompact ? 4 : 8,
                      }}
                    >
                      <Text
                        className="font-medium"
                        numberOfLines={1}
                        style={{
                          color: isActive
                            ? "#1c1c1c"
                            : "rgba(252,251,248,0.72)",
                          fontSize: isCompact ? 11 : 14,
                        }}
                      >
                        {session.title}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onTabClose(session.id);
                      }}
                      focusable={false}
                      className="items-center justify-center"
                      activeOpacity={0.7}
                      style={{
                        width: isCompact ? 26 : isLandscape ? 32 : 36,
                        height: buttonSize,
                        borderLeftWidth: BORDERS.STANDARD,
                        borderLeftColor: isActive
                          ? "rgba(28,28,28,0.16)"
                          : "rgba(252,251,248,0.12)",
                      }}
                    >
                      <X
                        size={isCompact ? 12 : isLandscape ? 14 : 16}
                        color={isActive ? "#1c1c1c" : "rgba(252,251,248,0.55)"}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {activeSessionType === "terminal" && !isCustomKeyboardVisible && (
            <TouchableOpacity
              onPress={handleToggleSystemKeyboard}
              focusable={false}
              className="items-center justify-center"
              activeOpacity={0.7}
              style={{
                width: buttonSize,
                height: buttonSize,
                borderWidth: BORDERS.STANDARD,
                borderColor: "rgba(252,251,248,0.12)",
                backgroundColor: "rgba(252,251,248,0.08)",
                borderRadius: RADIUS.BUTTON,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
                marginLeft: isCompact ? 5 : isLandscape ? 6 : 8,
              }}
            >
              {keyboardIntentionallyHiddenRef.current ? (
                <ChevronUp
                  size={isCompact ? 16 : isLandscape ? 18 : 20}
                  color="#fcfbf8"
                />
              ) : (
                <ChevronDown
                  size={isCompact ? 16 : isLandscape ? 18 : 20}
                  color="#fcfbf8"
                />
              )}
            </TouchableOpacity>
          )}

          {activeSessionType === "terminal" && (
            <TouchableOpacity
              onPress={() => onToggleKeyboard?.()}
              focusable={false}
              className="items-center justify-center"
              activeOpacity={0.7}
              style={{
                width: buttonSize,
                height: buttonSize,
                borderWidth: BORDERS.STANDARD,
                borderColor: "rgba(252,251,248,0.12)",
                backgroundColor: "rgba(252,251,248,0.08)",
                borderRadius: RADIUS.BUTTON,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
                marginLeft: isCompact ? 5 : isLandscape ? 6 : 8,
              }}
            >
              {isCustomKeyboardVisible ? (
                <Minus
                  size={isCompact ? 16 : isLandscape ? 18 : 20}
                  color="#fcfbf8"
                />
              ) : (
                <Plus
                  size={isCompact ? 16 : isLandscape ? 18 : 20}
                  color="#fcfbf8"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {activeSessionType === "terminal" && isCustomKeyboardVisible && (
        <View
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: "rgba(252,251,248,0.1)",
          }}
        />
      )}
    </View>
  );
}
