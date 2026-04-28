import { View, Text, TouchableOpacity } from "react-native";
import { Check, File, Folder, Link } from "lucide-react-native";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import {
  formatFileSize,
  formatDate,
  getFileIconColor,
} from "./utils/fileUtils";

interface FileItemProps {
  name: string;
  type: "file" | "directory" | "link";
  size?: number;
  modified?: string;
  isSelected?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onSelectToggle?: () => void;
  selectionMode?: boolean;
  columnCount?: number;
  useGrid?: boolean;
}

export function FileItem({
  name,
  type,
  size,
  modified,
  isSelected = false,
  onPress,
  onLongPress,
  onSelectToggle,
  selectionMode = false,
}: FileItemProps) {
  const iconColor = getFileIconColor(name, type);
  const IconComponent =
    type === "directory" ? Folder : type === "link" ? Link : File;

  return (
    <TouchableOpacity
      style={{
        width: "100%",
        backgroundColor: isSelected ? "rgba(28,28,28,0.08)" : BACKGROUNDS.CARD,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLORS.SECONDARY,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
      onPress={selectionMode && onSelectToggle ? onSelectToggle : onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {selectionMode && (
        <View className="mr-3">
          <View
            className="h-6 w-6 items-center justify-center rounded border-2"
            style={{
              backgroundColor: isSelected
                ? BACKGROUNDS.ACTIVE
                : BACKGROUNDS.CARD,
              borderColor: isSelected
                ? BORDER_COLORS.ACTIVE
                : BORDER_COLORS.BUTTON,
            }}
          >
            {isSelected && <Check size={14} color="#fcfbf8" strokeWidth={3} />}
          </View>
        </View>
      )}

      <View className="mr-3">
        <IconComponent size={24} color={iconColor} />
      </View>

      <View className="flex-1">
        <Text
          className="font-medium"
          numberOfLines={1}
          style={{ color: TEXT_COLORS.PRIMARY }}
        >
          {name}
        </Text>
        <View className="mt-0.5 flex-row items-center">
          {type === "directory" ? (
            <Text className="text-xs" style={{ color: TEXT_COLORS.TERTIARY }}>
              Folder
            </Text>
          ) : (
            <>
              {size !== undefined && (
                <Text
                  className="text-xs"
                  style={{ color: TEXT_COLORS.TERTIARY }}
                >
                  {formatFileSize(size)}
                </Text>
              )}
              {modified && (
                <>
                  {size !== undefined && (
                    <Text
                      className="mx-1 text-xs"
                      style={{ color: TEXT_COLORS.DISABLED }}
                    >
                      |
                    </Text>
                  )}
                  <Text
                    className="text-xs"
                    style={{ color: TEXT_COLORS.TERTIARY }}
                  >
                    {formatDate(modified)}
                  </Text>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {type === "link" && !selectionMode && (
        <View className="ml-2">
          <Link size={16} color="#8B5CF6" />
        </View>
      )}
    </TouchableOpacity>
  );
}
