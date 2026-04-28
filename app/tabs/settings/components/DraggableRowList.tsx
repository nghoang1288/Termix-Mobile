import React, { useState } from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react-native";

import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { KeyboardRow, KeyConfig } from "@/types/keyboard";

interface RenderRowItemProps {
  item: KeyboardRow;
  drag: () => void;
  isActive: boolean;
  onToggleVisibility: (rowId: string) => void;
  onRemoveKey: (rowId: string, keyId: string) => void;
  onReorderKeys: (rowId: string, keys: KeyConfig[]) => void;
  onAddKeyToRow?: (rowId: string) => void;
  expandedRowId: string | null;
  onToggleExpand: (rowId: string) => void;
}

export function renderRowItem({
  item,
  drag,
  isActive,
  onToggleVisibility,
  expandedRowId,
  onToggleExpand,
}: RenderRowItemProps) {
  const isExpanded = expandedRowId === item.id;

  return (
    <View
      className={`border ${isExpanded ? "mb-0 rounded-b-none" : "mb-3"}`}
      style={{
        backgroundColor: BACKGROUNDS.CARD,
        borderColor: BORDER_COLORS.SECONDARY,
        borderRadius: RADIUS.CARD,
      }}
    >
      <View className="flex-row items-center p-3">
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={200}
          disabled={isActive}
          activeOpacity={0.7}
          className="mr-2 items-center justify-center"
          style={{
            width: 40,
            height: 40,
          }}
        >
          <GripVertical color={TEXT_COLORS.TERTIARY} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onToggleExpand(item.id)}
          disabled={isActive}
          className="flex-1 flex-row items-center"
          activeOpacity={0.6}
        >
          <View className="flex-1">
            <Text
              className="text-base font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              {item.label}
            </Text>
            <Text
              className="mt-0.5 text-xs"
              style={{ color: TEXT_COLORS.TERTIARY }}
            >
              {item.keys.length} keys / {item.category}
            </Text>
          </View>

          <View className="ml-3">
            {isExpanded ? (
              <ChevronDown color={TEXT_COLORS.TERTIARY} size={18} />
            ) : (
              <ChevronRight color={TEXT_COLORS.TERTIARY} size={18} />
            )}
          </View>
        </TouchableOpacity>

        <View className="ml-3 justify-center">
          <Switch
            value={item.visible}
            onValueChange={() => onToggleVisibility(item.id)}
            trackColor={{ false: "#e4e0d6", true: "#1c1c1c" }}
            thumbColor={item.visible ? "#fcfbf8" : "#9f9b91"}
          />
        </View>
      </View>
    </View>
  );
}

export function useRowExpansion() {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const toggleExpand = (rowId: string) => {
    setExpandedRowId(expandedRowId === rowId ? null : rowId);
  };

  return { expandedRowId, toggleExpand };
}
