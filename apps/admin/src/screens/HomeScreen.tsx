import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FormsScreen } from "./FormsScreen";
import { InboxScreen } from "./InboxScreen";
import { MediaScreen } from "./MediaScreen";
import { UsersScreen } from "./UsersScreen";

import { ContentScreen } from "./ContentScreen";

import type { User } from "../config";
import { theme } from "../theme";

// Placeholder sections until Tasks 3-9 fill them in.
const TABS = ["Dashboard", "Content", "Media", "Forms", "Inbox"] as const;
type Tab = (typeof TABS)[number] | "Users";

export function HomeScreen({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const tabs: Tab[] = user.role === "owner" ? [...TABS, "Users"] : [...TABS];

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>Sarak Admin</Text>
        <View style={styles.session}>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <Text style={user.role === "owner" ? styles.roleOwner : styles.roleEditor}>
            {user.role}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
            onPress={onLogout}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.tabRow}>
        {tabs.map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={tab === activeTab ? styles.tabActive : styles.tab}>{tab}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {activeTab === "Content" ? (
          <ContentScreen />
        ) : activeTab === "Media" ? (
          <MediaScreen />
        ) : activeTab === "Forms" ? (
          <FormsScreen />
        ) : activeTab === "Inbox" ? (
          <InboxScreen user={user} />
        ) : activeTab === "Users" ? (
          <UsersScreen currentUserId={user.id} />
        ) : (
          <>
            <Text style={styles.placeholderTitle}>{activeTab}</Text>
            <Text style={styles.placeholderBody}>
              This section arrives with a later portal task.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  topBar: {
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  brand: {
    color: theme.text,
    fontSize: 17,
    fontWeight: "700",
  },
  session: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  userEmail: {
    color: theme.textDim,
    fontSize: 13,
    maxWidth: 180,
  },
  roleOwner: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  roleEditor: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  logout: {
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logoutText: {
    color: theme.text,
    fontSize: 13,
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 18,
  },
  tab: {
    color: theme.textDim,
    fontSize: 14,
  },
  tabActive: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 20,
  },
  placeholderTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 6,
  },
  placeholderBody: {
    color: theme.textDim,
    fontSize: 14,
  },
});
