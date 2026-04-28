import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Save, RotateCcw } from "lucide-react-native";
import { showToast } from "@/app/utils/toast";
import { useOrientation } from "@/app/utils/orientation";
import {
  BACKGROUNDS,
  BORDERS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";

interface FileViewerProps {
  visible: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

const MONOSPACE_FONT = Platform.select({
  ios: "Courier",
  android: "monospace",
  default: "monospace",
});

export function FileViewer({
  visible,
  onClose,
  fileName,
  filePath,
  initialContent,
  onSave,
  readOnly = false,
}: FileViewerProps) {
  const insets = useSafeAreaInsets();
  const { isLandscape } = useOrientation();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setHasChanges(false);
  }, [initialContent, visible]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== initialContent);
  };

  const handleSave = async () => {
    if (!hasChanges || readOnly) return;

    try {
      setIsSaving(true);
      await onSave(content);
      setHasChanges(false);
    } catch (error: any) {
      showToast.error(error.message || "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = () => {
    if (!hasChanges) return;

    Alert.alert(
      "Revert Changes",
      "Are you sure you want to discard your changes?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revert",
          style: "destructive",
          onPress: () => {
            setContent(initialContent);
            setHasChanges(false);
          },
        },
      ],
    );
  };

  const handleClose = () => {
    if (hasChanges && !readOnly) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before closing?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: onClose,
          },
          {
            text: "Save",
            onPress: async () => {
              await handleSave();
              onClose();
            },
          },
        ],
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      key={isLandscape ? "landscape" : "portrait"}
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: BACKGROUNDS.DARK }}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1" style={{ backgroundColor: BACKGROUNDS.DARK }}>
          <View
            style={{
              backgroundColor: BACKGROUNDS.HEADER,
              borderBottomWidth: BORDERS.MAJOR,
              borderBottomColor: BORDER_COLORS.PRIMARY,
              paddingTop: isLandscape
                ? Math.max(insets.top, 8)
                : insets.top + 12,
              paddingBottom: isLandscape ? 8 : 12,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text
                  className="font-semibold text-base"
                  style={{ color: TEXT_COLORS.PRIMARY }}
                  numberOfLines={1}
                >
                  {fileName}
                </Text>
                <Text
                  className="text-xs mt-0.5"
                  style={{ color: TEXT_COLORS.TERTIARY }}
                  numberOfLines={1}
                >
                  {filePath}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                {!readOnly && hasChanges && (
                  <>
                    <TouchableOpacity
                      onPress={handleRevert}
                      className="p-2"
                      style={{
                        backgroundColor: BACKGROUNDS.BUTTON_ALT,
                        borderRadius: RADIUS.SMALL,
                        borderWidth: BORDERS.STANDARD,
                        borderColor: BORDER_COLORS.BUTTON,
                      }}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={18} color={TEXT_COLORS.PRIMARY} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSave}
                      className="p-2"
                      activeOpacity={0.7}
                      disabled={isSaving}
                      style={{
                        width: 34,
                        height: 34,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: BACKGROUNDS.ACTIVE,
                        borderRadius: RADIUS.SMALL,
                        borderWidth: BORDERS.STANDARD,
                        borderColor: BORDER_COLORS.ACTIVE,
                      }}
                    >
                      {isSaving ? (
                        <ActivityIndicator
                          size="small"
                          color={BACKGROUNDS.CARD}
                        />
                      ) : (
                        <Save size={18} color={BACKGROUNDS.CARD} />
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  onPress={handleClose}
                  className="p-2"
                  style={{
                    backgroundColor: BACKGROUNDS.BUTTON_ALT,
                    borderRadius: RADIUS.SMALL,
                    borderWidth: BORDERS.STANDARD,
                    borderColor: BORDER_COLORS.BUTTON,
                  }}
                  activeOpacity={0.7}
                >
                  <X size={18} color={TEXT_COLORS.PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>

            {readOnly && (
              <View
                className="mt-2 px-2 py-1"
                style={{
                  backgroundColor: BACKGROUNDS.BUTTON_ALT,
                  borderWidth: BORDERS.STANDARD,
                  borderColor: BORDER_COLORS.BUTTON,
                  borderRadius: RADIUS.SMALL,
                }}
              >
                <Text
                  className="text-xs"
                  style={{ color: TEXT_COLORS.TERTIARY }}
                >
                  Read-only mode
                </Text>
              </View>
            )}
          </View>

          <TextInput
            className="flex-1"
            value={content}
            onChangeText={handleContentChange}
            multiline
            editable={!readOnly}
            scrollEnabled={true}
            style={{
              fontFamily: MONOSPACE_FONT,
              fontSize: 14,
              color: TEXT_COLORS.PRIMARY,
              backgroundColor: BACKGROUNDS.CARD,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
              textAlignVertical: "top",
            }}
            placeholder={readOnly ? "File content..." : "Enter file content..."}
            placeholderTextColor="#8b8780"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
