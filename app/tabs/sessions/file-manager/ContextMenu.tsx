import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import {
  Eye,
  Edit,
  Copy,
  Scissors,
  Trash2,
  FileText,
  Download,
  Lock,
  Archive,
  PackageOpen,
  X,
} from "lucide-react-native";
import {
  BACKGROUNDS,
  BORDERS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";

interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  fileName: string;
  fileType: "file" | "directory" | "link";
  onView?: () => void;
  onEdit?: () => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDelete: () => void;
  onDownload?: () => void;
  onPermissions?: () => void;
  onCompress?: () => void;
  onExtract?: () => void;
  isArchive?: boolean;
}

export function ContextMenu({
  visible,
  onClose,
  fileName,
  fileType,
  onView,
  onEdit,
  onRename,
  onCopy,
  onCut,
  onDelete,
  onDownload,
  onPermissions,
  onCompress,
  onExtract,
  isArchive = false,
}: ContextMenuProps) {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              className="rounded-t-2xl px-4 pb-6 pt-4"
              style={{
                backgroundColor: BACKGROUNDS.CARD,
                borderTopWidth: BORDERS.MAJOR,
                borderLeftWidth: BORDERS.MAJOR,
                borderRightWidth: BORDERS.MAJOR,
                borderColor: BORDER_COLORS.PRIMARY,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="font-semibold text-base"
                  style={{ color: TEXT_COLORS.PRIMARY }}
                  numberOfLines={1}
                >
                  {fileName}
                </Text>
                <TouchableOpacity
                  className="p-1"
                  style={{
                    backgroundColor: BACKGROUNDS.BUTTON_ALT,
                    borderRadius: RADIUS.SMALL,
                    borderWidth: BORDERS.STANDARD,
                    borderColor: BORDER_COLORS.BUTTON,
                  }}
                  onPress={onClose}
                >
                  <X size={16} color={TEXT_COLORS.PRIMARY} />
                </TouchableOpacity>
              </View>

              <View className="gap-2">
                {onView && fileType === "file" && (
                  <TouchableOpacity
                    onPress={() => handleAction(onView)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: BORDERS.STANDARD,
                      borderColor: BORDER_COLORS.BUTTON,
                    }}
                    activeOpacity={0.7}
                  >
                    <Eye size={20} color={TEXT_COLORS.PRIMARY} />
                    <Text
                      className="font-medium"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      View
                    </Text>
                  </TouchableOpacity>
                )}

                {onEdit && fileType === "file" && (
                  <TouchableOpacity
                    onPress={() => handleAction(onEdit)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: BORDERS.STANDARD,
                      borderColor: BORDER_COLORS.BUTTON,
                    }}
                    activeOpacity={0.7}
                  >
                    <Edit size={20} color={TEXT_COLORS.PRIMARY} />
                    <Text
                      className="font-medium"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => handleAction(onRename)}
                  className="flex-row items-center gap-3 p-3"
                  style={{
                    backgroundColor: BACKGROUNDS.BUTTON_ALT,
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: BORDERS.STANDARD,
                    borderColor: BORDER_COLORS.BUTTON,
                  }}
                  activeOpacity={0.7}
                >
                  <FileText size={20} color={TEXT_COLORS.PRIMARY} />
                  <Text
                    className="font-medium"
                    style={{ color: TEXT_COLORS.PRIMARY }}
                  >
                    Rename
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAction(onCopy)}
                  className="flex-row items-center gap-3 p-3"
                  style={{
                    backgroundColor: BACKGROUNDS.BUTTON_ALT,
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: BORDERS.STANDARD,
                    borderColor: BORDER_COLORS.BUTTON,
                  }}
                  activeOpacity={0.7}
                >
                  <Copy size={20} color={TEXT_COLORS.PRIMARY} />
                  <Text
                    className="font-medium"
                    style={{ color: TEXT_COLORS.PRIMARY }}
                  >
                    Copy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleAction(onCut)}
                  className="flex-row items-center gap-3 p-3"
                  style={{
                    backgroundColor: BACKGROUNDS.BUTTON_ALT,
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: BORDERS.STANDARD,
                    borderColor: BORDER_COLORS.BUTTON,
                  }}
                  activeOpacity={0.7}
                >
                  <Scissors size={20} color={TEXT_COLORS.PRIMARY} />
                  <Text
                    className="font-medium"
                    style={{ color: TEXT_COLORS.PRIMARY }}
                  >
                    Cut
                  </Text>
                </TouchableOpacity>

                {onDownload && fileType === "file" && (
                  <TouchableOpacity
                    onPress={() => handleAction(onDownload)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: BORDERS.STANDARD,
                      borderColor: BORDER_COLORS.BUTTON,
                    }}
                    activeOpacity={0.7}
                  >
                    <Download size={20} color={TEXT_COLORS.PRIMARY} />
                    <Text
                      className="font-medium"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      Download
                    </Text>
                  </TouchableOpacity>
                )}

                {onPermissions && (
                  <TouchableOpacity
                    onPress={() => handleAction(onPermissions)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: BORDERS.STANDARD,
                      borderColor: BORDER_COLORS.BUTTON,
                    }}
                    activeOpacity={0.7}
                  >
                    <Lock size={20} color={TEXT_COLORS.PRIMARY} />
                    <Text
                      className="font-medium"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      Permissions
                    </Text>
                  </TouchableOpacity>
                )}

                {onCompress && (
                  <TouchableOpacity
                    onPress={() => handleAction(onCompress)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: BORDERS.STANDARD,
                      borderColor: BORDER_COLORS.BUTTON,
                    }}
                    activeOpacity={0.7}
                  >
                    <Archive size={20} color={TEXT_COLORS.PRIMARY} />
                    <Text
                      className="font-medium"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      Compress
                    </Text>
                  </TouchableOpacity>
                )}

                {onExtract && isArchive && (
                  <TouchableOpacity
                    onPress={() => handleAction(onExtract)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      backgroundColor: BACKGROUNDS.BUTTON_ALT,
                      borderRadius: RADIUS.BUTTON,
                      borderWidth: BORDERS.STANDARD,
                      borderColor: BORDER_COLORS.BUTTON,
                    }}
                    activeOpacity={0.7}
                  >
                    <PackageOpen size={20} color={TEXT_COLORS.PRIMARY} />
                    <Text
                      className="font-medium"
                      style={{ color: TEXT_COLORS.PRIMARY }}
                    >
                      Extract
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => handleAction(onDelete)}
                  className="flex-row items-center gap-3 p-3"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    borderRadius: RADIUS.BUTTON,
                    borderWidth: BORDERS.STANDARD,
                    borderColor: "rgba(239,68,68,0.25)",
                  }}
                  activeOpacity={0.7}
                >
                  <Trash2 size={20} color="#dc2626" />
                  <Text className="font-medium" style={{ color: "#dc2626" }}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
