


import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  ActivityIndicator,
  BackHandler,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import { NativeEventEmitter, NativeModules } from "react-native";
import AutoLocationTracker from "../components/Tracking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../components/ThemeContext";
import Header from "../components/Header";
import { API_BASE_URL } from "@env";
import { DeviceEventEmitter } from "react-native";

// ✅ Modular Firebase Imports
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
  registerDeviceForRemoteMessages,
  getInitialNotification,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";


const { PersistentLocationModule } = NativeModules;

const Home = () => {

  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const app = getApp();
  const messaging = getMessaging(app);


  useEffect(() => {
    fetchUser();

    const initialize = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      if (parsedUser) {
        await registerDevice(parsedUser.reg_no);
      }

      await setupListeners();
    };

    initialize();

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );

    return () => backHandler.remove();
  }, []);

  // 🔹 Register Device Token
  const registerDevice = async (regNo) => {
    try {
      await requestPermission(messaging);
      await registerDeviceForRemoteMessages(messaging);

      const fcmToken = await getToken(messaging);
      console.log("✅ FCM Token:", fcmToken);

      await fetch(`${API_BASE_URL}/location/register-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo, fcmToken }),
      })
      .then((res)=>res.json())
      .then((data)=>(console.log(data)));


      // 🔁 Handle token refresh
      onTokenRefresh(messaging, async (token) => {
        console.log("🔄 FCM Token refreshed:", token);
        await fetch(`${API_BASE_URL}/location/register-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regNo, fcmToken: token }),
        })
        .then((res)=>res.json())
        .then((data)=>(console.log(data)));
      });
    } catch (error) {
      console.error("❌ Error registering device:", error);
    }
  };

  // 🔹 Fetch user info
  const fetchUser = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
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

    <ScrollView contentContainerStyle={styles.scrollContainer} style={{ backgroundColor: isDark ? "#121212" : "#FFFFFF" }}>
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

  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: { paddingTop: 20, paddingBottom: 30 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginLeft: 10,
  },
  track: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginLeft: 10 },
  avatar: { width: 60, height: 60, borderRadius: 50, marginLeft: 20 },
  userInfo: { marginLeft: 15 },
  name: { fontSize: 20, fontWeight: "bold" },
  studentId: { fontSize: 14, marginTop: 3 },
  title: { fontSize: 18, fontWeight: "bold", marginLeft: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    flex: 0.5,
    justifyContent: "space-evenly"
  },
  modalTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 10, color: "red" },
  modalMessage: { fontSize: 18, marginBottom: 20, textAlign: "center", color: "red" },
  button: {
    width: "100%",
    backgroundColor: "green",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default Home;
