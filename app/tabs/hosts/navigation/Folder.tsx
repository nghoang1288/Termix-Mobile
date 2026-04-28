import { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { ChevronDown, Folder as FolderIcon } from "lucide-react-native";

import Host from "@/app/tabs/hosts/navigation/Host";
import {
  BACKGROUNDS,
  BORDER_COLORS,
  RADIUS,
  TEXT_COLORS,
} from "@/app/constants/designTokens";
import { SSHHost } from "@/types";

interface FolderProps {
  name: string;
  hosts: SSHHost[];
  getHostStatus: (hostId: number) => "online" | "offline" | "unknown";
  onEditHost?: (host: SSHHost) => void;
  onDeleteHost?: (host: SSHHost) => void;
}

export default function Folder({
  name,
  hosts,
  getHostStatus,
  onEditHost,
  onDeleteHost,
}: FolderProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotateValue, {
      toValue: isExpanded ? 0 : 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateValue]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      className="w-full overflow-hidden rounded-md border"
      style={{
        backgroundColor: BACKGROUNDS.CARD,
        borderColor: BORDER_COLORS.SECONDARY,
        borderRadius: RADIUS.CARD,
      }}
    >
      <TouchableOpacity
        onPress={() => setIsExpanded((value) => !value)}
        className="flex-row items-center justify-between px-3 py-3"
        activeOpacity={0.75}
        style={{
          borderBottomWidth: isExpanded ? 1 : 0,
          borderBottomColor: BORDER_COLORS.SECONDARY,
          backgroundColor: BACKGROUNDS.HEADER,
        }}
      >
        <View className="min-w-0 flex-1 flex-row items-center">
          <FolderIcon size={18} color={TEXT_COLORS.PRIMARY} />
          <Text
            className="ml-2 flex-1 text-base font-semibold"
            numberOfLines={1}
            style={{ color: TEXT_COLORS.PRIMARY }}
          >
            {name}
          </Text>
          <Text
            className="ml-2 text-xs"
            style={{ color: TEXT_COLORS.TERTIARY }}
          >
            {hosts.length}
          </Text>
        </View>
        <View
          className="ml-3 items-center justify-center rounded-md border"
          style={{
            width: 30,
            height: 30,
            backgroundColor: BACKGROUNDS.BUTTON,
            borderColor: BORDER_COLORS.BUTTON,
          }}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDown size={16} color={TEXT_COLORS.PRIMARY} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="p-3">
          {hosts.length === 0 ? (
            <View className="px-4 py-4">
              <Text
                className="text-center"
                style={{ color: TEXT_COLORS.SECONDARY }}
              >
                No servers in this folder
              </Text>
            </View>
          ) : (
            hosts.map((host, index) => (
              <View
                key={host.id}
                style={{ marginBottom: index < hosts.length - 1 ? 8 : 0 }}
              >
                <Host
                  host={host}
                  status={getHostStatus(host.id)}
                  isLast={index === hosts.length - 1}
                  onEditHost={onEditHost}
                  onDeleteHost={onDeleteHost}
                />
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}
