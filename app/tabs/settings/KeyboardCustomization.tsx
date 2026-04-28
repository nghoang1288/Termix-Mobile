import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, RotateCcw } from "lucide-react-native";

import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { useKeyboardCustomization } from "@/app/contexts/KeyboardCustomizationContext";
import { PRESET_DEFINITIONS } from "@/app/tabs/sessions/terminal/keyboard/KeyDefinitions";
import { PresetType, KeyConfig } from "@/types/keyboard";
import { showToast } from "@/app/utils/toast";
import KeySelector from "./components/KeySelector";
import UnifiedDraggableList, {
  UnifiedListItem,
} from "./components/UnifiedDraggableList";
import { renderKeyItem } from "./components/DraggableKeyList";
import { renderRowItem, useRowExpansion } from "./components/DraggableRowList";

type TabType = "presets" | "topbar" | "fullKeyboard" | "settings";
type AddKeyMode = "pinned" | "topbar" | "row" | null;

const TABS: { id: TabType; label: string }[] = [
  { id: "presets", label: "Presets" },
  { id: "topbar", label: "Top Bar" },
  { id: "fullKeyboard", label: "Full Keyboard" },
  { id: "settings", label: "Settings" },
];

export default function KeyboardCustomization() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    config,
    setPreset,
    updateSettings,
    resetToDefault,
    resetTopBar,
    resetFullKeyboard,
    addPinnedKey,
    removePinnedKey,
    reorderPinnedKeys,
    addTopBarKey,
    removeTopBarKey,
    reorderTopBarKeys,
    reorderRows,
    toggleRowVisibility,
    addKeyToRow,
    removeKeyFromRow,
    reorderKeysInRow,
  } = useKeyboardCustomization();

  const [activeTab, setActiveTab] = useState<TabType>("presets");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState<"all" | "topbar" | "fullkeyboard">(
    "all",
  );
  const [showKeySelector, setShowKeySelector] = useState(false);
  const [addKeyMode, setAddKeyMode] = useState<AddKeyMode>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [listResetKey, setListResetKey] = useState(0);

  const { expandedRowId, toggleExpand } = useRowExpansion();

  const topBarData: UnifiedListItem[] = useMemo(() => {
    const items: UnifiedListItem[] = [];

    items.push({
      type: "header",
      id: "header-pinned",
      title: "Pinned Keys",
      subtitle: "Your frequently used keys",
      onAddPress: () => openKeySelector("pinned"),
      addButtonLabel: "+ Add",
    });

    config.topBar.pinnedKeys.forEach((key) => {
      items.push({
        type: "draggable-key",
        id: `pinned-${key.id}`,
        data: key,
        section: "pinned",
        renderItem: (item, onRemove, drag, isActive) =>
          renderKeyItem({ item, onRemove, drag, isActive }),
      });
    });

    items.push({ type: "spacer", id: "spacer-1", height: 20 });

    items.push({
      type: "header",
      id: "header-topbar",
      title: "Top Bar Keys",
      subtitle: "Keys shown in the terminal top bar",
      onAddPress: () => openKeySelector("topbar"),
      addButtonLabel: "+ Add",
    });

    config.topBar.keys.forEach((key) => {
      items.push({
        type: "draggable-key",
        id: `topbar-${key.id}`,
        data: key,
        section: "topbar",
        renderItem: (item, onRemove, drag, isActive) =>
          renderKeyItem({ item, onRemove, drag, isActive }),
      });
    });

    items.push({ type: "spacer", id: "spacer-2", height: 20 });

    items.push({
      type: "button",
      id: "reset-topbar",
      label: "Reset Top Bar to Default",
      variant: "danger",
      onPress: () => {
        setResetType("topbar");
        setShowResetConfirm(true);
      },
    });

    return items;
  }, [config.topBar.pinnedKeys, config.topBar.keys]);

  const fullKeyboardData: UnifiedListItem[] = useMemo(() => {
    const items: UnifiedListItem[] = [];

    items.push({
      type: "header",
      id: "header-rows",
      title: "Keyboard Rows",
      subtitle: "Organize, reorder, and customize keyboard rows",
    });

    config.fullKeyboard.rows.forEach((row) => {
      items.push({
        type: "draggable-row",
        id: `row-${row.id}`,
        data: row,
        renderItem: (item, drag, isActive) =>
          renderRowItem({
            item,
            drag,
            isActive,
            onToggleVisibility: toggleRowVisibility,
            onRemoveKey: removeKeyFromRow,
            onReorderKeys: reorderKeysInRow,
            onAddKeyToRow: (rowId) => openKeySelector("row", rowId),
            expandedRowId,
            onToggleExpand: toggleExpand,
          }),
      });

      if (expandedRowId === row.id) {
        items.push({
          type: "row-keys-header",
          id: `keys-header-${row.id}`,
          rowId: row.id,
          onAddPress: () => openKeySelector("row", row.id),
        });

        row.keys.forEach((key) => {
          items.push({
            type: "draggable-key",
            id: `row-${row.id}-key-${key.id}`,
            data: key,
            section: "row",
            rowId: row.id,
            renderItem: (item, onRemove, drag, isActive) =>
              renderKeyItem({ item, onRemove, drag, isActive }),
          });
        });

        items.push({
          type: "spacer",
          id: `row-close-${row.id}`,
          height: 12,
        });
      }
    });

    items.push({ type: "spacer", id: "spacer-3", height: 20 });

    items.push({
      type: "button",
      id: "reset-fullkeyboard",
      label: "Reset Full Keyboard to Default",
      variant: "danger",
      onPress: () => {
        setResetType("fullkeyboard");
        setShowResetConfirm(true);
      },
    });

    return items;
  }, [config.fullKeyboard.rows, expandedRowId]);

  const handlePresetSelect = async (presetId: PresetType) => {
    try {
      await setPreset(presetId);
      showToast.success(
        `Switched to ${PRESET_DEFINITIONS.find((p) => p.id === presetId)?.name} preset`,
      );
    } catch {
      showToast.error("Failed to switch preset");
    }
  };

  const handleKeySelected = async (key: KeyConfig) => {
    try {
      if (addKeyMode === "pinned") {
        await addPinnedKey(key);
        showToast.success(`Added ${key.label} to pinned keys`);
      } else if (addKeyMode === "topbar") {
        await addTopBarKey(key);
        showToast.success(`Added ${key.label} to top bar`);
      } else if (addKeyMode === "row" && selectedRowId) {
        await addKeyToRow(selectedRowId, key);
        showToast.success(`Added ${key.label} to row`);
      }
    } catch {
      showToast.error("Failed to add key");
    }
  };

  const openKeySelector = (mode: AddKeyMode, rowId?: string) => {
    setAddKeyMode(mode);
    setSelectedRowId(rowId || null);
    setShowKeySelector(true);
  };

  const getExcludedKeys = (): string[] => {
    if (addKeyMode === "pinned") {
      return config.topBar.pinnedKeys.map((key) => key.id);
    }
    if (addKeyMode === "topbar") {
      return config.topBar.keys.map((key) => key.id);
    }
    if (addKeyMode === "row" && selectedRowId) {
      const row = config.fullKeyboard.rows.find(
        (item) => item.id === selectedRowId,
      );
      return row ? row.keys.map((key) => key.id) : [];
    }
    return [];
  };

  const handleReset = async () => {
    try {
      if (resetType === "all") {
        await resetToDefault();
        showToast.success("Keyboard reset to default");
      } else if (resetType === "topbar") {
        await resetTopBar();
        showToast.success("Top bar reset to default");
      } else if (resetType === "fullkeyboard") {
        await resetFullKeyboard();
        showToast.success("Full keyboard reset to default");
      }
      setShowResetConfirm(false);
    } catch {
      showToast.error("Failed to reset");
    }
  };

  const renderPresets = () => (
    <ScrollView
      className="flex-1 px-4 py-4"
      showsVerticalScrollIndicator={false}
    >
      <Text
        className="mb-2 text-lg font-semibold"
        style={{ color: TEXT_COLORS.PRIMARY }}
      >
        Keyboard Presets
      </Text>
      <Text className="mb-4 text-sm" style={{ color: TEXT_COLORS.TERTIARY }}>
        Choose a preset layout optimized for different terminal workflows.
      </Text>

      {PRESET_DEFINITIONS.map((preset) => {
        const active = config.preset === preset.id;
        return (
          <TouchableOpacity
            key={preset.id}
            onPress={() => handlePresetSelect(preset.id)}
            className="mb-3 border p-4"
            activeOpacity={0.75}
            style={{
              backgroundColor: active ? BACKGROUNDS.ACTIVE : BACKGROUNDS.CARD,
              borderColor: active
                ? BORDER_COLORS.ACTIVE
                : BORDER_COLORS.SECONDARY,
              borderRadius: RADIUS.CARD,
            }}
          >
            <View className="mb-1 flex-row items-center justify-between">
              <Text
                className="text-base font-semibold"
                style={{ color: active ? "#fcfbf8" : TEXT_COLORS.PRIMARY }}
              >
                {preset.name}
              </Text>
              {active && (
                <View className="rounded-full bg-[#fcfbf8] px-2 py-1">
                  <Text className="text-xs font-semibold text-[#1c1c1c]">
                    ACTIVE
                  </Text>
                </View>
              )}
            </View>
            <Text
              className="text-sm"
              style={{ color: active ? "#ded8c9" : TEXT_COLORS.SECONDARY }}
            >
              {preset.description}
            </Text>
          </TouchableOpacity>
        );
      })}

      {config.preset === "custom" && (
        <View
          className="mt-2 rounded-lg border p-4"
          style={{
            backgroundColor: "rgba(59,130,246,0.08)",
            borderColor: "rgba(59,130,246,0.28)",
          }}
        >
          <Text className="mb-1 text-sm font-semibold text-[#2563eb]">
            Custom Layout
          </Text>
          <Text className="text-xs" style={{ color: TEXT_COLORS.SECONDARY }}>
            You have made custom changes. Select a preset above to reset to a
            predefined layout.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const validateTopBarDrag = (newData: UnifiedListItem[]): boolean => {
    const pinnedHeaderIndex = newData.findIndex(
      (item) => item.type === "header" && item.id === "header-pinned",
    );
    const topbarHeaderIndex = newData.findIndex(
      (item) => item.type === "header" && item.id === "header-topbar",
    );
    const resetButtonIndex = newData.findIndex(
      (item) => item.type === "button" && item.id === "reset-topbar",
    );

    for (let i = 0; i <= pinnedHeaderIndex; i += 1) {
      if (newData[i].type === "draggable-key") return false;
    }

    for (let i = 0; i < newData.length; i += 1) {
      const item = newData[i];
      if (item.type === "draggable-key" && item.section === "pinned") {
        if (i <= pinnedHeaderIndex || i >= topbarHeaderIndex) return false;
      }
      if (item.type === "draggable-key" && item.section === "topbar") {
        if (i <= topbarHeaderIndex || i >= resetButtonIndex) return false;
      }
    }

    return true;
  };

  const renderTopBar = () => (
    <View className="flex-1 px-4 py-4">
      <UnifiedDraggableList
        key={`topbar-${listResetKey}`}
        data={topBarData}
        onDragEnd={(newData) => {
          if (!validateTopBarDrag(newData)) {
            showToast.error("Cannot move items between sections");
            setListResetKey((prev) => prev + 1);
            return;
          }

          const pinnedKeys = newData
            .filter(
              (item) =>
                item.type === "draggable-key" && item.section === "pinned",
            )
            .map((item) => (item as any).data);

          const topBarKeys = newData
            .filter(
              (item) =>
                item.type === "draggable-key" && item.section === "topbar",
            )
            .map((item) => (item as any).data);

          reorderPinnedKeys(pinnedKeys);
          reorderTopBarKeys(topBarKeys);
        }}
        onRemoveKey={(itemId, section) => {
          const keyId = itemId.replace(`${section}-`, "");
          if (section === "pinned") {
            removePinnedKey(keyId);
          } else if (section === "topbar") {
            removeTopBarKey(keyId);
          }
        }}
      />
    </View>
  );

  const validateFullKeyboardDrag = (newData: UnifiedListItem[]): boolean => {
    const mainHeaderIndex = newData.findIndex(
      (item) => item.type === "header" && item.id === "header-rows",
    );
    const resetButtonIndex = newData.findIndex(
      (item) => item.type === "button" && item.id === "reset-fullkeyboard",
    );

    for (let i = 0; i <= mainHeaderIndex; i += 1) {
      const item = newData[i];
      if (item.type === "draggable-key" || item.type === "draggable-row") {
        return false;
      }
    }

    for (let i = resetButtonIndex; i < newData.length; i += 1) {
      const item = newData[i];
      if (item.type === "draggable-key" || item.type === "draggable-row") {
        return false;
      }
    }

    if (!expandedRowId) return true;

    const rowKeysHeaderIndex = newData.findIndex(
      (item) =>
        item.type === "row-keys-header" &&
        (item as any).rowId === expandedRowId,
    );
    const rowCloseIndex = newData.findIndex(
      (item) =>
        item.type === "spacer" && item.id === `row-close-${expandedRowId}`,
    );

    if (rowKeysHeaderIndex === -1 || rowCloseIndex === -1) return true;

    for (let i = 0; i < newData.length; i += 1) {
      const item = newData[i];
      if (
        item.type === "draggable-key" &&
        (item as any).rowId === expandedRowId
      ) {
        if (i <= rowKeysHeaderIndex || i >= rowCloseIndex) return false;
      }
    }

    for (let i = rowKeysHeaderIndex + 1; i < rowCloseIndex; i += 1) {
      const item = newData[i];
      if (
        item.type === "draggable-key" &&
        (item as any).rowId !== expandedRowId
      ) {
        return false;
      }
      if (item.type === "draggable-row") return false;
    }

    return true;
  };

  const renderFullKeyboard = () => (
    <View className="flex-1 px-4 py-4">
      <UnifiedDraggableList
        key={`fullkeyboard-${listResetKey}-${expandedRowId || "none"}`}
        data={fullKeyboardData}
        onDragEnd={(newData) => {
          if (!validateFullKeyboardDrag(newData)) {
            showToast.error("Cannot move items between sections");
            setListResetKey((prev) => prev + 1);
            return;
          }

          const rows = newData
            .filter((item) => item.type === "draggable-row")
            .map((item) => (item as any).data);

          reorderRows(rows);

          if (expandedRowId) {
            const rowKeys = newData
              .filter(
                (item) =>
                  item.type === "draggable-key" &&
                  (item as any).rowId === expandedRowId,
              )
              .map((item) => (item as any).data);

            reorderKeysInRow(expandedRowId, rowKeys);
          }
        }}
        onRemoveKey={(itemId, section) => {
          if (section === "row") {
            const match = itemId.match(/^row-(.+)-key-(.+)$/);
            if (match) removeKeyFromRow(match[1], match[2]);
          }
        }}
      />
    </View>
  );

  const renderSettings = () => (
    <ScrollView
      className="flex-1 px-4 py-4"
      showsVerticalScrollIndicator={false}
    >
      <Text
        className="mb-2 text-lg font-semibold"
        style={{ color: TEXT_COLORS.PRIMARY }}
      >
        Keyboard Settings
      </Text>
      <Text className="mb-4 text-sm" style={{ color: TEXT_COLORS.TERTIARY }}>
        Adjust keyboard appearance and behavior.
      </Text>

      <View className="mb-6">
        <Text
          className="mb-3 text-base font-semibold"
          style={{ color: TEXT_COLORS.PRIMARY }}
        >
          Key Size
        </Text>
        <View className="flex-row gap-2">
          {(["small", "medium", "large"] as const).map((size) => {
            const active = config.settings.keySize === size;
            return (
              <TouchableOpacity
                key={size}
                onPress={() => updateSettings({ keySize: size })}
                className="flex-1 rounded-lg border p-3"
                activeOpacity={0.75}
                style={{
                  backgroundColor: active
                    ? BACKGROUNDS.ACTIVE
                    : BACKGROUNDS.CARD,
                  borderColor: active
                    ? BORDER_COLORS.ACTIVE
                    : BORDER_COLORS.SECONDARY,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: active ? "#fcfbf8" : TEXT_COLORS.SECONDARY }}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {[
        {
          title: "Compact Mode",
          subtitle: "Tighter spacing for more keys on screen",
          value: config.settings.compactMode,
          onChange: (value: boolean) => updateSettings({ compactMode: value }),
        },
        {
          title: "Haptic Feedback",
          subtitle: "Vibrate on key press",
          value: config.settings.hapticFeedback,
          onChange: (value: boolean) =>
            updateSettings({ hapticFeedback: value }),
        },
        {
          title: "Show Hints",
          subtitle: 'Display "Customize in Settings" hint',
          value: config.settings.showHints,
          onChange: (value: boolean) => updateSettings({ showHints: value }),
        },
      ].map((item, index) => (
        <View
          key={item.title}
          className="mb-3 flex-row items-center justify-between rounded-lg border p-4"
          style={{
            backgroundColor: BACKGROUNDS.CARD,
            borderColor: BORDER_COLORS.SECONDARY,
            marginBottom: index === 2 ? 24 : 12,
          }}
        >
          <View className="mr-4 flex-1">
            <Text
              className="text-sm font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              {item.title}
            </Text>
            <Text
              className="mt-0.5 text-xs"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              {item.subtitle}
            </Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onChange}
            trackColor={{ false: "#e4e0d6", true: "#1c1c1c" }}
            thumbColor={item.value ? "#fcfbf8" : "#9f9b91"}
          />
        </View>
      ))}

      <TouchableOpacity
        onPress={() => {
          setResetType("all");
          setShowResetConfirm(true);
        }}
        className="rounded-lg border p-3"
        activeOpacity={0.75}
        style={{
          backgroundColor: "rgba(239,68,68,0.08)",
          borderColor: "rgba(239,68,68,0.3)",
        }}
      >
        <Text className="text-center font-semibold text-[#dc2626]">
          Reset Everything to Default
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: BACKGROUNDS.DARK }}>
      <View
        className="border-b px-4"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          backgroundColor: BACKGROUNDS.HEADER,
          borderBottomColor: BORDER_COLORS.SECONDARY,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="items-center justify-center rounded-md border"
            style={{
              width: 40,
              height: 40,
              backgroundColor: BACKGROUNDS.BUTTON,
              borderColor: BORDER_COLORS.BUTTON,
            }}
          >
            <ArrowLeft color={TEXT_COLORS.PRIMARY} size={19} />
          </TouchableOpacity>
          <Text
            className="text-lg font-semibold"
            style={{ color: TEXT_COLORS.PRIMARY }}
          >
            Keyboard Customization
          </Text>
          <TouchableOpacity
            onPress={() => {
              setResetType("all");
              setShowResetConfirm(true);
            }}
            className="items-center justify-center rounded-md border"
            style={{
              width: 40,
              height: 40,
              backgroundColor: BACKGROUNDS.BUTTON,
              borderColor: BORDER_COLORS.BUTTON,
            }}
          >
            <RotateCcw color={TEXT_COLORS.PRIMARY} size={17} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        className="border-b"
        style={{
          backgroundColor: BACKGROUNDS.DARK,
          borderBottomColor: BORDER_COLORS.SECONDARY,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className="mr-2 px-4 py-3"
                style={{
                  borderBottomWidth: active ? 2 : 0,
                  borderBottomColor: TEXT_COLORS.PRIMARY,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: active ? TEXT_COLORS.PRIMARY : TEXT_COLORS.TERTIARY,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {activeTab === "presets" && renderPresets()}
      {activeTab === "topbar" && renderTopBar()}
      {activeTab === "fullKeyboard" && renderFullKeyboard()}
      {activeTab === "settings" && renderSettings()}

      <KeySelector
        visible={showKeySelector}
        onClose={() => setShowKeySelector(false)}
        onSelectKey={handleKeySelected}
        excludeKeys={getExcludedKeys()}
        title={
          addKeyMode === "pinned"
            ? "Pin Key"
            : addKeyMode === "topbar"
              ? "Add to Top Bar"
              : "Add Key to Row"
        }
      />

      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/45"
          onPress={() => setShowResetConfirm(false)}
        >
          <Pressable
            className="mx-8 rounded-lg border p-6"
            style={{
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
              borderRadius: RADIUS.LARGE,
            }}
          >
            <Text
              className="mb-2 text-lg font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              Confirm Reset
            </Text>
            <Text
              className="mb-6 text-sm"
              style={{ color: TEXT_COLORS.SECONDARY }}
            >
              {resetType === "all"
                ? "This will reset all keyboard customizations to default settings."
                : resetType === "topbar"
                  ? "This will reset the top bar to default keys."
                  : "This will reset the full keyboard to default rows."}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border p-3"
                style={{
                  backgroundColor: BACKGROUNDS.BUTTON_ALT,
                  borderColor: BORDER_COLORS.SECONDARY,
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
                className="flex-1 rounded-lg bg-red-600 p-3"
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
