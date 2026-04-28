import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GripVertical, X } from "lucide-react-native";

import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { KeyConfig } from "@/types/keyboard";

interface RenderKeyItemProps {
  item: KeyConfig;
  onRemove: () => void;
  drag: () => void;
  isActive: boolean;
}

export function renderKeyItem({
  item,
  onRemove,
  drag,
  isActive,
}: RenderKeyItemProps) {
  return (
    <View
      className="mb-2 flex-row items-center border p-3"
      style={{
        backgroundColor: BACKGROUNDS.CARD,
        borderColor: BORDER_COLORS.SECONDARY,
        borderRadius: RADIUS.CARD,
      }}
    >
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

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
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
              {item.label}
            </Text>
          </View>
          <Text className="text-xs" style={{ color: TEXT_COLORS.TERTIARY }}>
            {item.category}
          </Text>
        </View>
        {item.description && (
          <Text
            className="mt-1 text-xs"
            numberOfLines={1}
            style={{ color: TEXT_COLORS.SECONDARY }}
          >
            {item.description}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={onRemove}
        className="ml-2 items-center justify-center rounded-full border"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.6}
        style={{
          width: 32,
          height: 32,
          backgroundColor: "rgba(239,68,68,0.08)",
          borderColor: "rgba(239,68,68,0.28)",
        }}
      >
        <X color="#dc2626" size={16} />
      </TouchableOpacity>
    </View>
  );
}
