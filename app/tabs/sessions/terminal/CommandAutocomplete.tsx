import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.list}
        >
          {visibleSuggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex;

            return (
              <Pressable
                key={`${suggestion.source}-${suggestion.value}-${index}`}
                onPress={() => onSelect(suggestion)}
                style={[
                  styles.row,
                  isSelected ? styles.selectedRow : undefined,
                ]}
              >
                <View style={styles.commandBlock}>
                  <Text numberOfLines={1} style={styles.commandText}>
                    {suggestion.value}
                  </Text>
                  {(suggestion.description ||
                    suggestion.label !== suggestion.value) && (
                    <Text numberOfLines={1} style={styles.descriptionText}>
                      {suggestion.label !== suggestion.value
                        ? suggestion.label
                        : suggestion.description}
                    </Text>
                  )}
                </View>

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
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tap to complete</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 6,
    zIndex: 1006,
  },
  card: {
    backgroundColor: "rgba(16, 16, 16, 0.96)",
    borderColor: "rgba(252, 251, 248, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
  list: {
    maxHeight: 124,
  },
  row: {
    alignItems: "center",
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  selectedRow: {
    backgroundColor: "rgba(247, 244, 237, 0.1)",
  },
  commandBlock: {
    flex: 1,
    minWidth: 0,
  },
  commandText: {
    color: "#FCFBF8",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionText: {
    color: "rgba(252,251,248,0.5)",
    fontSize: 10,
    marginTop: 1,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    backgroundColor: "rgba(252, 251, 248, 0.04)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  footerText: {
    color: "rgba(252,251,248,0.42)",
    fontSize: 9,
    textAlign: "center",
  },
});
