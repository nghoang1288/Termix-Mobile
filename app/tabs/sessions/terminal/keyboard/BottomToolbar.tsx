import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TerminalHandle } from "../Terminal";
import CustomKeyboard from "./CustomKeyboard";
import SnippetsBar from "./SnippetsBar";
import {
  BORDERS,
  BORDER_COLORS,
  BACKGROUNDS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";

type ToolbarMode = "keyboard" | "snippets";

interface BottomToolbarProps {
  terminalRef: React.RefObject<TerminalHandle | null>;
  isVisible: boolean;
  keyboardHeight: number;
  isKeyboardIntentionallyHidden?: boolean;
}

export default function BottomToolbar({
  terminalRef,
  isVisible,
  keyboardHeight,
  isKeyboardIntentionallyHidden = false,
}: BottomToolbarProps) {
  const [mode, setMode] = useState<ToolbarMode>("keyboard");
  const insets = useSafeAreaInsets();

  if (!isVisible) return null;

  const safeKeyboardHeight = Math.max(200, Math.min(keyboardHeight, 500));

  const tabs: { id: ToolbarMode; label: string }[] = [
    { id: "keyboard", label: "KEYBOARD" },
    { id: "snippets", label: "SNIPPETS" },
  ];

  const TAB_BAR_HEIGHT = 36;

  return (
    <View className="bg-dark-bg-darkest" pointerEvents="box-none">
      <View
        className="flex-row"
        style={{
          height: TAB_BAR_HEIGHT,
          borderBottomWidth: BORDERS.STANDARD,
          borderBottomColor: BORDER_COLORS.SECONDARY,
          backgroundColor: BACKGROUNDS.DARKER,
        }}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            className="flex-1 items-center justify-center px-1 py-1.5"
            onPress={() => setMode(tab.id)}
            style={{
              backgroundColor:
                mode === tab.id ? BACKGROUNDS.BUTTON : BACKGROUNDS.DARKER,
              borderRightWidth:
                index !== tabs.length - 1 ? BORDERS.STANDARD : 0,
              borderRightColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Text
              className="text-center text-[10px] font-bold leading-[14px] tracking-wide"
              style={{
                color:
                  mode === tab.id ? TEXT_COLORS.PRIMARY : TEXT_COLORS.TERTIARY,
              }}
            >
              {tab.label}
            </Text>
            {mode === tab.id && (
              <View
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: BORDER_COLORS.ACTIVE }}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View
        className="overflow-hidden"
        style={{
          height: safeKeyboardHeight,
          paddingBottom: insets.bottom,
        }}
      >
        {mode === "keyboard" && (
          <CustomKeyboard
            terminalRef={terminalRef}
            isVisible={true}
            keyboardHeight={safeKeyboardHeight}
            isKeyboardIntentionallyHidden={isKeyboardIntentionallyHidden}
          />
        )}

        {mode === "snippets" && (
          <SnippetsBar
            terminalRef={terminalRef}
            isVisible={true}
            height={safeKeyboardHeight}
          />
        )}
      </View>
    </View>
  );
}
