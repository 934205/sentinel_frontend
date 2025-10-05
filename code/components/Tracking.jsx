// screens/AutoLocationTracker.js
import React, { useEffect, useState ,} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  DeviceEventEmitter,
  Platform,
  PermissionsAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PushNotification from "react-native-push-notification";
import { useTheme } from "./ThemeContext";
import { API_BASE_URL } from "@env";
import { TRIANGLE_POINTS, THRESHOLDS } from "../auth/config";
import { haversineDistance, isInsideTriangle } from "../utils/locationUtils";
import { NativeModules } from "react-native";

const { LocationServiceModule } = NativeModules;


PushNotification.configure({
  onNotification: (notification) => console.log("Notification:", notification),
  requestPermissions: Platform.OS === "ios",
});

const notify = (title, message) => {
  PushNotification.localNotification({
    channelId: "sentinel-shield",
    title,
    message,
    smallIcon: "ic_notification",
    playSound: true,
    soundName: "default",
    importance: "high",
    vibrate: true,
  });
};

global.lastLocation = global.lastLocation || null;
global.insideRegion = global.insideRegion || false;
global.entryTime = global.entryTime || null;
global.navigateToSignin = global.navigateToSignin || null;

const AutoLocationTracker = ({ navigation }) => {
  const [trackingState, setTrackingState] = useState(false);
  const [lastLocation, setLastLocation] = useState(global.lastLocation);
  const [insideRegion, setInsideRegion] = useState(global.insideRegion);
  const [entryTime, setEntryTime] = useState(global.entryTime);
  const { theme } = useTheme();
  const isDark = theme === "dark";


  useEffect(() => {
    global.navigateToSignin = () => navigation.replace("login");

    const subscription = DeviceEventEmitter.addListener(
      "LocationUpdate",
      (loc) => handleLocation(loc.latitude, loc.longitude, loc.accuracy || 0)
    );

    requestLocationPermission().then((granted) => {
      if (granted) startTracking();
    });

    return () => {
      subscription.remove();
      stopTracking();
    };
  }, []);

  // ---------------- Request Permissions ----------------
  const requestLocationPermission = async () => {
    if (Platform.OS === "ios") {
      const granted = await LocationServiceModule.requestPermission?.();
      return granted ?? false;
    } else {
      try {
        const fine = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "App needs access to your location for attendance tracking",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;

        const background = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: "Background Location Permission",
            message: "App needs background location access",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        return background === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error(err);
        return false;
      }
    }
  };

  // ---------------- Handle Location ----------------
  const handleLocation = async (latitude, longitude, accuracy) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("en-GB", { hour12: false });

    console.log(
      `[${timestamp}] Location received: ${latitude.toFixed(
        6
      )}, ${longitude.toFixed(6)}, accuracy: ${accuracy}m`
    );

    // ---------------- Validate Accuracy ----------------
    if (accuracy == null || accuracy > THRESHOLDS.ACCURACY) {
      console.log(`[${timestamp}] ❌ Location discarded due to low accuracy (${accuracy}m)`);
      return;
    }

    // ---------------- Validate Distance ----------------
    let movedEnough = true;
    if (global.lastLocation) {
      const dist = haversineDistance(
        global.lastLocation.latitude,
        global.lastLocation.longitude,
        latitude,
        longitude
      );
      
      if (dist < THRESHOLDS.MIN_DISTANCE) {
        console.log(`[${timestamp}] ❌ Location discarded: moved only ${dist.toFixed(2)}m`);
        movedEnough = false;
      } else if (dist > THRESHOLDS.MAX_JUMP) {
        console.log(`[${timestamp}] ❌ Location discarded: jump too far ${dist.toFixed(2)}m`);
        movedEnough = false;
      }
    }

    // Always accept the first location
    if (!global.lastLocation) movedEnough = true;

    if (!movedEnough) return;

    console.log(`[${timestamp}] ✅ Valid Location accepted`);

    // ---------------- Update Global Location ----------------
    global.lastLocation = { latitude, longitude, accuracy, timestamp: now.toISOString() };
    setLastLocation(global.lastLocation);

    const inside = isInsideTriangle(
      latitude,
      longitude,
      TRIANGLE_POINTS.A,
      TRIANGLE_POINTS.B,
      TRIANGLE_POINTS.C
    );
    setInsideRegion(inside);

    // ---------------- Load User ----------------
    let userData = null;
    try {
      const stored = await AsyncStorage.getItem("user");
      if (stored) userData = JSON.parse(stored);
    } catch (err) {
      console.error(err);
    }
    if (!userData) return;

    // ---------------- Attendance Logic ----------------
    if (inside && !global.insideRegion) {
      global.insideRegion = true;
      global.entryTime = timestamp;
      setEntryTime(global.entryTime);
      const entryDate = now.toISOString().split("T")[0];

      try {
        const checkResponse = await fetch(
          `${API_BASE_URL}/location/checkattendance/${userData.reg_no}`
        );
        const checkData = await checkResponse.json();

        if (!checkData.hasEntry) {
          await fetch(`${API_BASE_URL}/location/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reg_no: userData.reg_no,
              latitude,
              longitude,
              entry_time: global.entryTime,
              is_present: true,
              date: entryDate,
            }),
          }).then(res => res.json()).then(data => {
            if (!data.success) console.error("Log API error:", data);
            else{
              notify("Entry Logged ✅", `Entry time: ${global.entryTime}`);
            }
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else if (!inside && global.insideRegion) {
      global.insideRegion = false;
      const [h, m, s] = timestamp.split(":").map(Number);

      try {
        const resp = await fetch(`${API_BASE_URL}/location/exit-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reg_no: userData.reg_no, latitude, longitude }),
        });
        const data = await resp.json();

        if (data.success) {
          notify("Exit Logged ✅", `Exit time: ${h}:${m}:${s}`);
          await AsyncStorage.removeItem("user");
          stopTracking();
          global.navigateToSignin();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startTracking = () => {
    LocationServiceModule.startService();
    setTrackingState(true);
    Alert.alert("Tracking started");
  };

  const stopTracking = () => {
    LocationServiceModule.stopService();
    setTrackingState(false);
    Alert.alert("Tracking stopped");
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#f9fafb" },
      ]}
    >
      <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
        SentinelShield — Attendance Tracker
      </Text>

      <View
        style={[styles.statusCard, { backgroundColor: isDark ? "#1E1E1E" : "#fff" }]}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>
              Tracking
            </Text>
            <Text
              style={[
                styles.value,
                { color: trackingState ? "#2e7d32" : "#c62828" },
              ]}
            >
              {trackingState ? "Active" : "Stopped"}
            </Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>
              Region
            </Text>
            <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
              {insideRegion ? "Inside" : "Outside"}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>
            Last Location
          </Text>
          <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
            {lastLocation
              ? `${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}`
              : "-"}
          </Text>
          <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Accuracy: {lastLocation.accuracy.toFixed(2)}</Text>
          <Text style={{color:'red'}}>Please ensure accuracy less than 50</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>
            Last Entry
          </Text>
          <Text style={[styles.value, { color: "#fff" }]}>{entryTime || "-"}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.btnDanger]} onPress={stopTracking}>
          <Text style={styles.btnText}>Stop Tracking</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, minHeight: "100%" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  statusCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusBox: { flex: 1, alignItems: "center" },
  label: { fontSize: 12 },
  value: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  infoBox: { marginTop: 12 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  btnDanger: {
    flex: 1,
    backgroundColor: "#f44336",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});

export default AutoLocationTracker;
