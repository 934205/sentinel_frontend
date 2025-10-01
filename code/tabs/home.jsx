import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from "react-native";

import AutoLocationTracker from "../components/Tracking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../components/ThemeContext";
import Header from "../components/Header";

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
      fetchUser();
    },[])
  

  const fetchUser = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error retrieving user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loaderContainer,
          { backgroundColor: isDark ? "#121212" : "#fff" },
        ]}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#2C3E50"} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#fff" },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <Header />

        {/* User Info */}
        <View style={styles.row}>
          {user?.face_url ? (
            <Image source={{ uri: user.face_url }} style={styles.avatar} />
          ) : (
            <Icon name="person" size={50} color={isDark ? "#fff" : "#2C3E50"} />
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.name, { color: isDark ? "#fff" : "#2C3E50" }]}>
              {user?.name || "Guest User"}
            </Text>
            <Text
              style={[
                styles.studentId,
                { color: isDark ? "#aaa" : "#7F8C8D" },
              ]}
            >
              Register No: {user?.reg_no || "N/A"}
            </Text>
          </View>
        </View>

        {/* Location Tracking */}
        <View style={styles.track}>
          <Icon
            name="my-location"
            size={28}
            color={isDark ? "#FF6B6B" : "#E74C3C"}
          />
          <Text style={[styles.title, { color: isDark ? "#fff" : "#2C3E50" }]}>
            Location Tracking
          </Text>
        </View>
        <AutoLocationTracker />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginLeft: 10,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginLeft: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 50,
    marginLeft: 20,
  },
  userInfo: {
    marginLeft: 15,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
  },
  studentId: {
    fontSize: 14,
    marginTop: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
  },
});

export default Home;
