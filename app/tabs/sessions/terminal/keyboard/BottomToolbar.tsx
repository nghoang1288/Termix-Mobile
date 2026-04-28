import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TerminalHandle } from "../Terminal";
import CustomKeyboard from "./CustomKeyboard";
import SnippetsBar from "./SnippetsBar";
import { BORDERS } from "@/app/constants/designTokens";

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

  const safeKeyboardHeight = Math.max(152, Math.min(keyboardHeight, 360));

  const tabs: { id: ToolbarMode; label: string }[] = [
    { id: "keyboard", label: "KEYBOARD" },
    { id: "snippets", label: "SNIPPETS" },
  ];

  const TAB_BAR_HEIGHT = 34;

  return (
    <View style={{ backgroundColor: "#101010" }} pointerEvents="box-none">
      <View
        className="flex-row"
        style={{
          height: TAB_BAR_HEIGHT,
          borderBottomWidth: BORDERS.STANDARD,
          borderBottomColor: "rgba(252,251,248,0.1)",
          backgroundColor: "#101010",
        }}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            className="flex-1 items-center justify-center px-1 py-1.5"
            onPress={() => setMode(tab.id)}
            style={{
              backgroundColor:
                mode === tab.id ? "rgba(252,251,248,0.1)" : "#101010",
              borderRightWidth:
                index !== tabs.length - 1 ? BORDERS.STANDARD : 0,
              borderRightColor: "rgba(252,251,248,0.1)",
            }}
          >
            <Text
              className="text-center text-[10px] font-bold leading-[14px] tracking-wide"
              style={{
                color: mode === tab.id ? "#fcfbf8" : "rgba(252,251,248,0.45)",
              }}
            >
              {tab.label}
            </Text>
            {mode === tab.id && (
              <View
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: "#f7f4ed" }}
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
