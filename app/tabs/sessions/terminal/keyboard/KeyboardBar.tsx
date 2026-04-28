import React, { useState, useEffect } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { TerminalHandle } from "../Terminal";
import KeyboardKey from "./KeyboardKey";
import { useKeyboardCustomization } from "@/app/contexts/KeyboardCustomizationContext";
import { KeyConfig } from "@/types/keyboard";
import { useOrientation } from "@/app/utils/orientation";
import { BORDER_COLORS, BACKGROUNDS } from "@/app/constants/designTokens";

interface KeyboardBarProps {
  terminalRef: React.RefObject<TerminalHandle | null>;
  isVisible: boolean;
  onModifierChange?: (modifiers: { ctrl: boolean; alt: boolean }) => void;
  isKeyboardIntentionallyHidden?: boolean;
}

export default function KeyboardBar({
  terminalRef,
  isVisible,
  onModifierChange,
  isKeyboardIntentionallyHidden = false,
}: KeyboardBarProps) {
  const { config } = useKeyboardCustomization();
  const { isLandscape } = useOrientation();
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);

  const sendKey = (key: string) => {
    terminalRef.current?.sendInput(key);
  };

  const sendSpecialKey = (keyConfig: KeyConfig) => {
    const { value, id } = keyConfig;

    switch (id) {
      case "escape":
        sendKey("\x1b");
        break;
      case "tab":
      case "complete":
      case "comp":
        sendKey("\t");
        break;
      case "arrowUp":
      case "history":
      case "hist":
        sendKey("\x1b[A");
        break;
      case "arrowDown":
        sendKey("\x1b[B");
        break;
      case "arrowRight":
        sendKey("\x1b[C");
        break;
      case "arrowLeft":
        sendKey("\x1b[D");
        break;
      case "paste":
        handlePaste();
        break;
      default:
        sendKey(value);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        sendKey(clipboardContent);
      }
    } catch {}
  };

  const toggleModifier = (modifier: "ctrl" | "alt") => {
    switch (modifier) {
      case "ctrl":
        setCtrlPressed(!ctrlPressed);
        break;
      case "alt":
        setAltPressed(!altPressed);
        break;
    }
  };

  useEffect(() => {
    if (onModifierChange) {
      onModifierChange({ ctrl: ctrlPressed, alt: altPressed });
    }
  }, [ctrlPressed, altPressed, onModifierChange]);

  if (!isVisible) return null;

  const renderKey = (keyConfig: KeyConfig, index: number) => {
    const isModifier =
      keyConfig.isModifier || keyConfig.id === "ctrl" || keyConfig.id === "alt";
    const isCtrl = keyConfig.id === "ctrl";
    const isAlt = keyConfig.id === "alt";

    return (
      <View
        key={`${keyConfig.id}-${index}`}
        style={{
          width: "16.666%",
          paddingHorizontal: isLandscape ? 2 : 3,
          paddingVertical: 3,
        }}
      >
        <KeyboardKey
          label={keyConfig.label}
          onPress={() => {
            if (isModifier) {
              if (isCtrl) toggleModifier("ctrl");
              else if (isAlt) toggleModifier("alt");
            } else {
              sendSpecialKey(keyConfig);
            }
          }}
          isModifier={isModifier}
          isActive={isCtrl ? ctrlPressed : isAlt ? altPressed : false}
          keySize={config.settings.keySize}
          hapticFeedback={config.settings.hapticFeedback}
          style={{ width: "100%" }}
        />
      </View>
    );
  };

  const { pinnedKeys, keys } = config.topBar;
  const hasPinnedKeys = pinnedKeys.length > 0;

  return (
    <View style={{ position: "relative", marginTop: isLandscape ? -2 : -4 }}>
      <View
        style={{
          backgroundColor: BACKGROUNDS.DARKER,
          paddingBottom: isKeyboardIntentionallyHidden ? 16 : 0,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 6,
            paddingVertical: isLandscape ? 5 : 7,
            borderBottomWidth: 1,
            borderBottomColor: BORDER_COLORS.SECONDARY,
          }}
        >
          {[...(hasPinnedKeys ? pinnedKeys : []), ...keys]
            .slice(0, 12)
            .map((key, index) => renderKey(key, index))}
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: -52,
          left: 0,
          right: 0,
          backgroundColor: BACKGROUNDS.DARKER,
          height: 55,
        }}
      />
    </View>
  );
}
