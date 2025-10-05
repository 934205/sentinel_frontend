import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "./ThemeContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme === "dark" ? "#121212" : "#fff" }]}>
      {/* Logo + Title */}
      <View style={styles.logoContainer}>
        <Image
          source={theme==="dark"?require("../../assets/images/logo2.png"):require("../../assets/images/android-icon-foreground.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: theme === "dark" ? "#fff" : "#000" }]}>
          Sentinel Shield
        </Text>
      </View>

      {/* Theme Toggle Button */}
      <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
        <Icon
          name={theme === "dark" ? "light-mode" : "dark-mode"}
          size={26}
          color={theme === "dark" ? "#FFD700" : "#333"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  logoContainer: { flexDirection: "row", alignItems: "center" },
  logo: { width: 40, height: 40, marginRight: 15 },
  title: { fontSize: 20, fontWeight: "700" },
  themeButton: { padding: 10, borderRadius: 16 },
});
