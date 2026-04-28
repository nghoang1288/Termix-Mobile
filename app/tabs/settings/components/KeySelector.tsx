import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";

import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { KeyConfig, KeyCategory } from "@/types/keyboard";
import { ALL_KEYS } from "@/app/tabs/sessions/terminal/keyboard/KeyDefinitions";

interface KeySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectKey: (key: KeyConfig) => void;
  excludeKeys?: string[];
  title?: string;
}

const CATEGORIES: { id: KeyCategory; label: string }[] = [
  { id: "modifier", label: "Modifiers" },
  { id: "arrow", label: "Arrows" },
  { id: "navigation", label: "Navigation" },
  { id: "function", label: "Function" },
  { id: "number", label: "Numbers" },
  { id: "symbol", label: "Symbols" },
  { id: "operator", label: "Operators" },
  { id: "punctuation", label: "Punctuation" },
  { id: "action", label: "Actions" },
  { id: "shortcut", label: "Shortcuts" },
];

export default function KeySelector({
  visible,
  onClose,
  onSelectKey,
  excludeKeys = [],
  title = "Add Key",
}: KeySelectorProps) {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<KeyCategory | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const allKeysArray = useMemo(() => Object.values(ALL_KEYS), []);

  const filteredKeys = useMemo(() => {
    let keys = allKeysArray;

    if (selectedCategory !== "all") {
      keys = keys.filter((key) => key.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      keys = keys.filter(
        (key) =>
          key.label.toLowerCase().includes(query) ||
          key.id.toLowerCase().includes(query) ||
          key.description?.toLowerCase().includes(query),
      );
    }

    return keys.filter((key) => !excludeKeys.includes(key.id));
  }, [allKeysArray, selectedCategory, searchQuery, excludeKeys]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
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
            <Text
              className="text-lg font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="items-center justify-center rounded-md border"
              style={{
                width: 36,
                height: 36,
                backgroundColor: BACKGROUNDS.BUTTON,
                borderColor: BORDER_COLORS.BUTTON,
              }}
            >
              <X color={TEXT_COLORS.PRIMARY} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="border-b px-4 py-3"
          style={{
            backgroundColor: BACKGROUNDS.DARK,
            borderBottomColor: BORDER_COLORS.SECONDARY,
          }}
        >
          <View
            className="flex-row items-center rounded-md border px-3"
            style={{
              height: 42,
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          >
            <Search size={16} color={TEXT_COLORS.TERTIARY} />
            <TextInput
              className="ml-2 flex-1 text-sm"
              placeholder="Search keys..."
              placeholderTextColor={TEXT_COLORS.TERTIARY}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={TEXT_COLORS.ACCENT}
              underlineColorAndroid="transparent"
              style={{
                color: TEXT_COLORS.PRIMARY,
                backgroundColor: "transparent",
                paddingVertical: 0,
              }}
            />
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
            {([{ id: "all", label: "All" }, ...CATEGORIES] as const).map(
              (cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    className="mr-2 px-4 py-3"
                    style={{
                      borderBottomWidth: active ? 2 : 0,
                      borderBottomColor: TEXT_COLORS.PRIMARY,
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: active
                          ? TEXT_COLORS.PRIMARY
                          : TEXT_COLORS.TERTIARY,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {filteredKeys.length === 0 ? (
            <View className="py-8">
              <Text
                className="text-center"
                style={{ color: TEXT_COLORS.TERTIARY }}
              >
                {searchQuery
                  ? "No keys found matching your search"
                  : "No keys available"}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {filteredKeys.map((key) => (
                <TouchableOpacity
                  key={key.id}
                  onPress={() => onSelectKey(key)}
                  className="flex-row items-center justify-between rounded-lg border p-4"
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: BACKGROUNDS.CARD,
                    borderColor: BORDER_COLORS.SECONDARY,
                    borderRadius: RADIUS.CARD,
                  }}
                >
                  <View className="mr-4 flex-1">
                    <View className="mb-1 flex-row items-center gap-2">
                      <View
                        className="rounded border px-3 py-1.5"
                        style={{
                          backgroundColor: BACKGROUNDS.BUTTON_ALT,
                          borderColor: BORDER_COLORS.SECONDARY,
                        }}
                      >
                        <Text
                          className="font-mono text-sm"
                          style={{ color: TEXT_COLORS.PRIMARY }}
                        >
                          {key.label}
                        </Text>
                      </View>
                      <Text
                        className="text-xs"
                        style={{ color: TEXT_COLORS.TERTIARY }}
                      >
                        {key.category}
                      </Text>
                    </View>
                    {key.description && (
                      <Text
                        className="mt-1 text-xs"
                        style={{ color: TEXT_COLORS.SECONDARY }}
                      >
                        {key.description}
                      </Text>
                    )}
                  </View>
                  <View
                    className="rounded-md px-4 py-2"
                    style={{ backgroundColor: BACKGROUNDS.ACTIVE }}
                  >
                    <Text className="text-sm font-semibold text-[#fcfbf8]">
                      Add
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
