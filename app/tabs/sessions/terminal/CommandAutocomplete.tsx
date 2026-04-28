import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CommandAutocompleteSource,
  CommandAutocompleteSuggestion,
} from "./terminal-autocomplete";

interface CommandAutocompleteProps {
  suggestions: CommandAutocompleteSuggestion[];
  selectedIndex: number;
  anchor: {
    left: number;
    top: number;
    maxWidth: number;
  };
  colors: {
    background: string;
    foreground: string;
    border: string;
    selectedBackground: string;
  };
  onSelect: (suggestion: CommandAutocompleteSuggestion) => void;
}

const SOURCE_COLOR: Record<CommandAutocompleteSource, string> = {
  history: "#22C55E",
  snippet: "#38BDF8",
  common: "#A3A3A3",
};

export default function CommandAutocomplete({
  suggestions,
  selectedIndex,
  anchor,
  colors,
  onSelect,
}: CommandAutocompleteProps) {
  if (suggestions.length === 0) return null;
  const visibleSuggestions = suggestions.slice(0, 3);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          left: anchor.left,
          maxWidth: anchor.maxWidth,
          top: anchor.top,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        {visibleSuggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex;

          return (
            <Pressable
              key={`${suggestion.source}-${suggestion.value}-${index}`}
              onPress={() => onSelect(suggestion)}
              style={[
                styles.row,
                isSelected
                  ? { backgroundColor: colors.selectedBackground }
                  : undefined,
              ]}
            >
              <View
                style={[
                  styles.sourceDot,
                  { backgroundColor: SOURCE_COLOR[suggestion.source] },
                ]}
              />

              <Text
                numberOfLines={1}
                style={[styles.commandText, { color: colors.foreground }]}
              >
                {suggestion.value}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1006,
  },
  card: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    height: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sourceDot: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  commandText: {
    flexShrink: 1,
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "600",
    minWidth: 0,
  },
});
