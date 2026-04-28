import React, { useState, useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { TerminalHandle } from "../Terminal";
import KeyboardKey from "./KeyboardKey";
import { useKeyboardCustomization } from "@/app/contexts/KeyboardCustomizationContext";
import { KeyConfig } from "@/types/keyboard";
import { useOrientation } from "@/app/utils/orientation";
import { ALL_KEYS } from "./KeyDefinitions";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";

interface KeyboardBarProps {
  terminalRef: React.RefObject<TerminalHandle | null>;
  isVisible: boolean;
  onModifierChange?: (modifiers: { ctrl: boolean; alt: boolean }) => void;
  isKeyboardIntentionallyHidden?: boolean;
  isSystemKeyboardVisible?: boolean;
}

export default function KeyboardBar({
  terminalRef,
  isVisible,
  onModifierChange,
  isKeyboardIntentionallyHidden = false,
  isSystemKeyboardVisible = false,
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

  const compactKeys: {
    key: KeyConfig;
    label: string;
    flex?: number;
  }[] = [
    { key: ALL_KEYS.escape, label: "Esc" },
    { key: ALL_KEYS.tab, label: "Tab" },
    { key: ALL_KEYS.ctrl, label: "Ctrl" },
    { key: ALL_KEYS.alt, label: "Alt" },
    { key: ALL_KEYS.arrowLeft, label: "Left" },
    { key: ALL_KEYS.arrowDown, label: "Down" },
    { key: ALL_KEYS.arrowUp, label: "Up" },
    { key: ALL_KEYS.arrowRight, label: "Right" },
    { key: ALL_KEYS.slash, label: "/" },
    { key: ALL_KEYS.pipe, label: "|" },
    { key: ALL_KEYS.paste, label: "Paste", flex: 1.35 },
  ];

  const renderCompactKey = ({
    key,
    label,
    flex = 1,
  }: {
    key: KeyConfig;
    label: string;
    flex?: number;
  }) => {
    const isModifier = key.isModifier || key.id === "ctrl" || key.id === "alt";
    const isCtrl = key.id === "ctrl";
    const isAlt = key.id === "alt";
    const isActive = isCtrl ? ctrlPressed : isAlt ? altPressed : false;

    return (
      <TouchableOpacity
        key={key.id}
        onPress={() => {
          if (isModifier) {
            if (isCtrl) toggleModifier("ctrl");
            else if (isAlt) toggleModifier("alt");
          } else {
            sendSpecialKey(key);
          }
        }}
        activeOpacity={0.75}
        style={{
          flex,
          minWidth: 0,
          height: isLandscape ? 28 : 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: RADIUS.BUTTON,
          borderWidth: 1,
          borderColor: isActive ? BORDER_COLORS.ACTIVE : BORDER_COLORS.BUTTON,
          backgroundColor: isActive ? BACKGROUNDS.ACTIVE : BACKGROUNDS.BUTTON,
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{
            color: isActive ? TEXT_COLORS.PRIMARY : TEXT_COLORS.SECONDARY,
            fontSize: isLandscape ? 9 : 10,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

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
          paddingVertical: 1,
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
          keySize="small"
          hapticFeedback={config.settings.hapticFeedback}
          style={{ width: "100%" }}
        />
      </View>
    );
  };

  const { pinnedKeys, keys } = config.topBar;
  const hasPinnedKeys = pinnedKeys.length > 0;
  const visibleKeys = [...(hasPinnedKeys ? pinnedKeys : []), ...keys].slice(
    0,
    12,
  );

  if (isSystemKeyboardVisible) {
    return (
      <View
        style={{
          backgroundColor: BACKGROUNDS.DARKER,
          borderTopWidth: 1,
          borderTopColor: BORDER_COLORS.SECONDARY,
          borderBottomWidth: 1,
          borderBottomColor: BORDER_COLORS.SECONDARY,
          paddingHorizontal: 5,
          paddingVertical: isLandscape ? 3 : 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          {compactKeys.map(renderCompactKey)}
        </View>
      </View>
    );
  }

  return (
    <View style={{ position: "relative" }}>
      <View
        style={{
          backgroundColor: BACKGROUNDS.DARKER,
          paddingBottom: isKeyboardIntentionallyHidden ? 12 : 0,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 6,
            paddingVertical: isLandscape ? 3 : 4,
            borderBottomWidth: 1,
            borderBottomColor: BORDER_COLORS.SECONDARY,
          }}
        >
          {visibleKeys.map((key, index) => renderKey(key, index))}
        </View>
      </View>
    </View>
  );
}
