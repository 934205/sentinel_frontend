import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Geolocation from "react-native-geolocation-service";
import { useTheme } from "../components/ThemeContext";
import Header from "../components/Header";

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error retrieving user:", error);
    }
  };

  const handleEmergencyAlert = () => {
    Alert.alert("🚨 Emergency Alert", "An alert has been sent to the authorities.");
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "This app needs access to your location for safety tracking.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } 
    return true; // iOS automatically prompts
  };

  const stopLocationTracking = () => {
    if (global.locationInterval) {
      clearInterval(global.locationInterval);
      global.locationInterval = null;
      console.log("✅ Location interval cleared.");
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      stopLocationTracking();
      navigation.replace("login");
    } catch (error) {
      console.log("❌ Error during logout:", error);
    }
  };

  // Example of starting location updates
  const startLocationTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return Alert.alert("Permission denied", "Enable location to track.");

    if (global.locationInterval) {
      clearInterval(global.locationInterval);
    }

    // Track location every 10 seconds
    global.locationInterval = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords);
          // You can send this to backend if needed
        },
        (error) => {
          console.error("Location error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 10000);
  };

  useEffect(() => {
    startLocationTracking();
    return () => stopLocationTracking();
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F5F5F5" }]}
    >
      <Header />

      <View style={styles.header}>
        {user?.face_url ? (
          <Image source={{ uri: user.face_url }} style={styles.avatar} />
        ) : (
          <Icon name="person" size={50} color={isDark ? "#fff" : "#2C3E50"} />
        )}
        <Text style={[styles.name, { color: isDark ? "#fff" : "#000" }]}>
          {user ? user.name : "Guest"}
        </Text>
        <Text style={[styles.studentId, { color: isDark ? "#bbb" : "gray" }]}>
          Student ID: {user ? user.reg_no : "Null"}
        </Text>
      </View>

      {/* Personal Info */}
      <View
        style={[styles.section, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}
      >
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          Personal Information
        </Text>
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color={isDark ? "#4dabf7" : "#4A90E2"} />
          <Text style={[styles.infoText, { color: isDark ? "#ddd" : "#333" }]}>
            {user ? user.mobile_number : "Null"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="school" size={20} color={isDark ? "#4dabf7" : "#4A90E2"} />
          <Text style={[styles.infoText, { color: isDark ? "#ddd" : "#333" }]}>
            Department: Computer Science
          </Text>
        </View>
      </View>

      {/* Safety Tracking */}
      <View
        style={[styles.section, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}
      >
        <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>
          Safety Tracking
        </Text>
        <View style={styles.infoRow}>
          <Icon name="location-on" size={20} color="#FF5733" />
          <Text style={[styles.infoText, { color: isDark ? "#ddd" : "#333" }]}>
            Live Location Tracking Enabled
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleEmergencyAlert}>
          <Text style={styles.buttonText}>Send Emergency Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: isDark ? "#4dabf7" : "#007BFF" }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
  },
  studentId: {
    fontSize: 16,
  },
  section: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
  },
  button: {
    backgroundColor: "#FF5733",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    width: 120,
    padding: 10,
    margin: 20,
    borderRadius: 15,
  },
  logoutText: {
    color: "white",
    fontSize: 15,
    textAlign: "center",
  },
});

export default ProfileScreen;
