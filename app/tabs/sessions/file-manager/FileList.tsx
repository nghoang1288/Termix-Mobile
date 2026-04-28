import { ScrollView, RefreshControl, Text } from "react-native";
import { FileItem } from "./FileItem";
import { sortFiles } from "./utils/fileUtils";
import { BACKGROUNDS, TEXT_COLORS } from "@/app/constants/designTokens";

interface FileListItem {
  name: string;
  path: string;
  type: "file" | "directory" | "link";
  size?: number;
  modified?: string;
  permissions?: string;
}

interface FileListProps {
  files: FileListItem[];
  onFilePress: (file: FileListItem) => void;
  onFileLongPress: (file: FileListItem) => void;
  selectedFiles: string[];
  onSelectToggle: (path: string) => void;
  selectionMode: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  sortBy?: "name" | "size" | "modified";
  sortOrder?: "asc" | "desc";
  isLandscape: boolean;
  width: number;
  toolbarHeight: number;
}

export function FileList({
  files,
  onFilePress,
  onFileLongPress,
  selectedFiles,
  onSelectToggle,
  selectionMode,
  isLoading,
  onRefresh,
  sortBy = "name",
  sortOrder = "asc",
  isLandscape,
  width,
  toolbarHeight,
}: FileListProps) {
  const sortedFiles = sortFiles(files, sortBy, sortOrder);

  if (!isLoading && files.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: BACKGROUNDS.DARK }}
        contentContainerClassName="flex-1 items-center justify-center"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={TEXT_COLORS.TERTIARY}
          />
        }
      >
        <Text className="text-center" style={{ color: TEXT_COLORS.TERTIARY }}>
          This folder is empty
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: BACKGROUNDS.DARK }}
      contentContainerStyle={{
        paddingBottom: toolbarHeight > 0 ? toolbarHeight + 12 : 12,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={TEXT_COLORS.TERTIARY}
        />
      }
    >
      {sortedFiles.map((file) => (
        <FileItem
          key={file.path}
          name={file.name}
          type={file.type}
          size={file.size}
          modified={file.modified}
          isSelected={selectedFiles.includes(file.path)}
          onPress={() => onFilePress(file)}
          onLongPress={() => onFileLongPress(file)}
          onSelectToggle={() => onSelectToggle(file.path)}
          selectionMode={selectionMode}
        />
      ))}
    </ScrollView>
  );
}
