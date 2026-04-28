import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, RotateCcw } from "lucide-react-native";

import { useTerminalCustomization } from "@/app/contexts/TerminalCustomizationContext";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { showToast } from "@/app/utils/toast";

const FONT_SIZE_OPTIONS = [
  { label: "Extra Small", value: 12 },
  { label: "Small", value: 14 },
  { label: "Medium", value: 16 },
  { label: "Large", value: 18 },
  { label: "Extra Large", value: 20 },
  { label: "Huge", value: 24 },
];

export default function TerminalCustomization() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, updateFontSize, resetToDefault } = useTerminalCustomization();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [customFontSize, setCustomFontSize] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isCustomFontSize = !FONT_SIZE_OPTIONS.some(
    (option) => option.value === config.fontSize,
  );

  const handleFontSizeChange = async (fontSize: number) => {
    try {
      await updateFontSize(fontSize);
      showToast.success(`Font size updated to ${fontSize}px`);
    } catch {
      showToast.error("Failed to update font size");
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefault();
      showToast.success("Terminal settings reset to default");
      setShowResetConfirm(false);
    } catch {
      showToast.error("Failed to reset settings");
    }
  };

  const handleCustomFontSize = async () => {
    const fontSize = parseInt(customFontSize, 10);
    if (isNaN(fontSize) || fontSize <= 0) {
      showToast.error("Please enter a valid font size");
      return;
    }

    try {
      await updateFontSize(fontSize);
      showToast.success(`Font size updated to ${fontSize}px`);
      setShowCustomInput(false);
      setCustomFontSize("");
    } catch {
      showToast.error("Failed to update font size");
    }
  };

  const renderOption = (label: string, value: number, isCustom = false) => {
    const active = isCustom ? isCustomFontSize : config.fontSize === value;

    return (
      <TouchableOpacity
        key={isCustom ? "custom" : value}
        onPress={() =>
          isCustom ? setShowCustomInput(true) : handleFontSizeChange(value)
        }
        className="mb-2 rounded-lg border p-4"
        activeOpacity={0.75}
        style={{
          backgroundColor: active ? BACKGROUNDS.ACTIVE : BACKGROUNDS.CARD,
          borderColor: active ? BORDER_COLORS.ACTIVE : BORDER_COLORS.SECONDARY,
          borderRadius: RADIUS.CARD,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              className="text-base font-semibold"
              style={{
                color: active ? "#fcfbf8" : TEXT_COLORS.PRIMARY,
              }}
            >
              {label}
            </Text>
            <Text
              className="mt-1 text-xs"
              style={{
                color: active ? "#ded8c9" : TEXT_COLORS.TERTIARY,
              }}
            >
              {isCustom && isCustomFontSize
                ? `${config.fontSize}px base size`
                : isCustom
                  ? "Enter any custom size"
                  : `${value}px base size`}
            </Text>
          </View>
          {active ? (
            <View className="rounded border border-[#fcfbf866] px-2 py-1">
              <Text className="text-xs font-bold text-[#fcfbf8]">ACTIVE</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: BACKGROUNDS.DARK }}>
      <View
        className="border-b px-4"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          backgroundColor: BACKGROUNDS.HEADER,
          borderColor: BORDER_COLORS.SECONDARY,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-md border"
            style={{
              backgroundColor: BACKGROUNDS.BUTTON,
              borderColor: BORDER_COLORS.BUTTON,
            }}
          >
            <ArrowLeft size={19} color={TEXT_COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text
            className="text-lg font-semibold"
            style={{ color: TEXT_COLORS.PRIMARY }}
          >
            Terminal
          </Text>
          <TouchableOpacity
            onPress={() => setShowResetConfirm(true)}
            className="h-10 w-10 items-center justify-center rounded-md border"
            style={{
              backgroundColor: BACKGROUNDS.BUTTON,
              borderColor: BORDER_COLORS.BUTTON,
            }}
          >
            <RotateCcw size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Text
          className="mb-2 text-lg font-semibold"
          style={{ color: TEXT_COLORS.PRIMARY }}
        >
          Terminal settings
        </Text>
        <Text className="mb-4 text-sm" style={{ color: TEXT_COLORS.TERTIARY }}>
          Tune the terminal font size for mobile screens.
        </Text>

        <View className="mb-6">
          <Text
            className="mb-3 text-base font-semibold"
            style={{ color: TEXT_COLORS.PRIMARY }}
          >
            Font size
          </Text>
          {FONT_SIZE_OPTIONS.map((option) =>
            renderOption(option.label, option.value),
          )}
          {renderOption("Custom", config.fontSize ?? 16, true)}
        </View>

        <TouchableOpacity
          onPress={() => setShowResetConfirm(true)}
          className="rounded-lg border p-3"
          style={{ backgroundColor: "#fff1f2", borderColor: "#fecdd3" }}
        >
          <Text className="text-center font-semibold text-[#dc2626]">
            Reset to default
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showCustomInput}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCustomInput(false);
          setCustomFontSize("");
        }}
        supportedOrientations={["portrait", "landscape"]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 items-center justify-center px-8"
            style={{ backgroundColor: "rgba(28,28,28,0.42)" }}
            onPress={() => {
              setShowCustomInput(false);
              setCustomFontSize("");
            }}
          >
            <Pressable
              className="w-full rounded-lg border p-6"
              style={{
                backgroundColor: BACKGROUNDS.CARD,
                borderColor: BORDER_COLORS.SECONDARY,
              }}
            >
              <Text
                className="mb-2 text-lg font-semibold"
                style={{ color: TEXT_COLORS.PRIMARY }}
              >
                Custom font size
              </Text>
              <Text
                className="mb-4 text-sm"
                style={{ color: TEXT_COLORS.TERTIARY }}
              >
                Enter your preferred terminal font size.
              </Text>
              <TextInput
                value={customFontSize}
                onChangeText={setCustomFontSize}
                placeholder="e.g. 15"
                placeholderTextColor={TEXT_COLORS.TERTIARY}
                keyboardType="number-pad"
                autoFocus
                style={{
                  backgroundColor: BACKGROUNDS.BUTTON_ALT,
                  borderWidth: 1,
                  borderColor: BORDER_COLORS.PANEL,
                  borderRadius: RADIUS.BUTTON,
                  padding: 12,
                  color: TEXT_COLORS.PRIMARY,
                  fontSize: 16,
                  textAlignVertical: "center",
                }}
              />
              <View className="mt-4 flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowCustomInput(false);
                    setCustomFontSize("");
                  }}
                  className="flex-1 rounded-lg border p-3"
                  style={{
                    backgroundColor: BACKGROUNDS.BUTTON,
                    borderColor: BORDER_COLORS.BUTTON,
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
                  onPress={handleCustomFontSize}
                  className="flex-1 rounded-lg p-3"
                  style={{ backgroundColor: BACKGROUNDS.ACTIVE }}
                >
                  <Text className="text-center font-semibold text-[#fcfbf8]">
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <Pressable
          className="flex-1 items-center justify-center px-8"
          style={{ backgroundColor: "rgba(28,28,28,0.42)" }}
          onPress={() => setShowResetConfirm(false)}
        >
          <Pressable
            className="w-full rounded-lg border p-6"
            style={{
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Text
              className="mb-2 text-lg font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              Confirm reset
            </Text>
            <Text
              className="mb-6 text-sm"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              This will reset terminal customizations to default settings.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border p-3"
                style={{
                  backgroundColor: BACKGROUNDS.BUTTON,
                  borderColor: BORDER_COLORS.BUTTON,
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
                onPress={handleReset}
                className="flex-1 rounded-lg p-3"
                style={{ backgroundColor: "#dc2626" }}
              >
                <Text className="text-center font-semibold text-white">
                  Reset
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
