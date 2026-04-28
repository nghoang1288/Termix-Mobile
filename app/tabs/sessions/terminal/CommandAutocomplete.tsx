import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CommandAutocompleteSource,
  CommandAutocompleteSuggestion,
} from "./terminal-autocomplete";

interface CommandAutocompleteProps {
  suggestions: CommandAutocompleteSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: CommandAutocompleteSuggestion) => void;
}

const SOURCE_LABEL: Record<CommandAutocompleteSource, string> = {
  history: "History",
  snippet: "Snippet",
  common: "Common",
};

const SOURCE_COLOR: Record<CommandAutocompleteSource, string> = {
  history: "#22C55E",
  snippet: "#38BDF8",
  common: "#A3A3A3",
};

export default function CommandAutocomplete({
  suggestions,
  selectedIndex,
  onSelect,
}: CommandAutocompleteProps) {
  if (suggestions.length === 0) return null;
  const visibleSuggestions = suggestions.slice(0, 3);

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.card}>
        {visibleSuggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex;

          return (
            <Pressable
              key={`${suggestion.source}-${suggestion.value}-${index}`}
              onPress={() => onSelect(suggestion)}
              style={[styles.row, isSelected ? styles.selectedRow : undefined]}
            >
              <Text numberOfLines={1} style={styles.commandText}>
                {suggestion.value}
              </Text>

              <View
                style={[
                  styles.badge,
                  { borderColor: SOURCE_COLOR[suggestion.source] },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: SOURCE_COLOR[suggestion.source] },
                  ]}
                >
                  {SOURCE_LABEL[suggestion.source]}
                </Text>
              </View>
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
    left: 8,
    right: 8,
    top: 8,
    alignItems: "center",
    zIndex: 1006,
  },
  card: {
    alignSelf: "stretch",
    backgroundColor: "rgba(16, 16, 16, 0.9)",
    borderColor: "rgba(252, 251, 248, 0.12)",
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 620,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  row: {
    alignItems: "center",
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    height: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedRow: {
    backgroundColor: "rgba(247, 244, 237, 0.12)",
  },
  commandText: {
    color: "#FCFBF8",
    flex: 1,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
    minWidth: 0,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
