import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";

export type UnifiedListItem =
  | {
      type: "header";
      id: string;
      title: string;
      subtitle?: string;
      onAddPress?: () => void;
      addButtonLabel?: string;
    }
  | {
      type: "draggable-key";
      id: string;
      data: any;
      section: string;
      rowId?: string;
      renderItem: (
        item: any,
        onRemove: () => void,
        drag: () => void,
        isActive: boolean,
      ) => React.ReactNode;
    }
  | {
      type: "draggable-row";
      id: string;
      data: any;
      renderItem: (
        item: any,
        drag: () => void,
        isActive: boolean,
      ) => React.ReactNode;
    }
  | {
      type: "row-keys-header";
      id: string;
      rowId: string;
      onAddPress?: () => void;
    }
  | {
      type: "button";
      id: string;
      label: string;
      onPress: () => void;
      variant?: "danger" | "normal";
    }
  | { type: "spacer"; id: string; height: number };

interface UnifiedDraggableListProps {
  data: UnifiedListItem[];
  onDragEnd: (data: UnifiedListItem[]) => void;
  onRemoveKey?: (itemId: string, section: string) => void;
}

export default function UnifiedDraggableList({
  data,
  onDragEnd,
  onRemoveKey,
}: UnifiedDraggableListProps) {
  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<UnifiedListItem>) => {
    if (item.type === "header") {
      return (
        <View className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className="text-lg font-semibold"
                style={{ color: TEXT_COLORS.PRIMARY }}
              >
                {item.title}
              </Text>
              {item.subtitle && (
                <Text
                  className="mt-0.5 text-xs"
                  style={{ color: TEXT_COLORS.TERTIARY }}
                >
                  {item.subtitle}
                </Text>
              )}
            </View>
            {item.onAddPress && (
              <TouchableOpacity
                onPress={item.onAddPress}
                className="rounded-md border px-4 py-2"
                style={{
                  backgroundColor: BACKGROUNDS.ACTIVE,
                  borderColor: BORDER_COLORS.ACTIVE,
                }}
              >
                <Text className="text-sm font-semibold text-[#fcfbf8]">
                  {item.addButtonLabel || "+ Add"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (item.type === "draggable-key") {
      const isRowKey = item.rowId !== undefined;

      return (
        <ScaleDecorator>
          <View style={{ opacity: isActive ? 0.5 : 1 }}>
            <View
              className={isRowKey ? "border-l border-r px-4" : ""}
              style={
                isRowKey
                  ? {
                      backgroundColor: BACKGROUNDS.CARD,
                      borderColor: BORDER_COLORS.SECONDARY,
                    }
                  : undefined
              }
            >
              {item.renderItem(
                item.data,
                () => onRemoveKey?.(item.id, item.section),
                drag,
                isActive,
              )}
            </View>
          </View>
        </ScaleDecorator>
      );
    }

    if (item.type === "draggable-row") {
      return (
        <ScaleDecorator>
          <View style={{ opacity: isActive ? 0.5 : 1 }}>
            {item.renderItem(item.data, drag, isActive)}
          </View>
        </ScaleDecorator>
      );
    }

    if (item.type === "row-keys-header") {
      return (
        <View
          className="-mt-px border-l border-r border-t px-4 pb-2 pt-4"
          style={{
            backgroundColor: BACKGROUNDS.CARD,
            borderColor: BORDER_COLORS.SECONDARY,
          }}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className="text-sm font-semibold"
              style={{ color: TEXT_COLORS.PRIMARY }}
            >
              Keys in this row
            </Text>
            {item.onAddPress && (
              <TouchableOpacity
                onPress={item.onAddPress}
                className="rounded px-3 py-1.5"
                style={{ backgroundColor: BACKGROUNDS.ACTIVE }}
              >
                <Text className="text-xs font-semibold text-[#fcfbf8]">
                  + Add Key
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (item.type === "button") {
      const isDanger = item.variant === "danger";
      return (
        <TouchableOpacity
          onPress={item.onPress}
          className="mb-3 rounded-lg border p-3"
          style={{
            backgroundColor: isDanger
              ? "rgba(239,68,68,0.08)"
              : BACKGROUNDS.BUTTON_ALT,
            borderColor: isDanger
              ? "rgba(239,68,68,0.3)"
              : BORDER_COLORS.SECONDARY,
            borderRadius: RADIUS.BUTTON,
          }}
        >
          <Text
            className="text-center font-semibold"
            style={{ color: isDanger ? "#dc2626" : TEXT_COLORS.PRIMARY }}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    }

    if (item.type === "spacer") {
      const isRowClose = item.id.startsWith("row-close-");

      if (isRowClose) {
        return (
          <View
            className="mb-3 rounded-b-lg border-b border-l border-r"
            style={{
              height: item.height,
              backgroundColor: BACKGROUNDS.CARD,
              borderColor: BORDER_COLORS.SECONDARY,
            }}
          />
        );
      }

      return <View style={{ height: item.height }} />;
    }

    return null;
  };

  return (
    <DraggableFlatList
      data={data}
      onDragEnd={({ data: newData }) => onDragEnd(newData)}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    />
  );
}
