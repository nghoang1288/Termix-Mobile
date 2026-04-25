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

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.card}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.list}
        >
          {suggestions.map((suggestion, index) => {
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
          <Text style={styles.footerText}>
            Enter complete - Tab/Arrows navigate - Esc close
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    zIndex: 1006,
  },
  card: {
    backgroundColor: "rgba(18, 18, 22, 0.96)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  list: {
    maxHeight: 236,
  },
  row: {
    alignItems: "center",
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedRow: {
    backgroundColor: "rgba(34, 197, 94, 0.14)",
  },
  commandBlock: {
    flex: 1,
    minWidth: 0,
  },
  commandText: {
    color: "#F8FAFC",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  footerText: {
    color: "#71717A",
    fontSize: 10,
    textAlign: "center",
  },
});
