// // screens/AutoLocationTracker.js
// import React, { useEffect, useState, } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Alert,
//   AppState,
//   Platform,
//   PermissionsAndroid
// } from "react-native";
// import Geolocation from "react-native-geolocation-service";
// import PushNotification from "react-native-push-notification";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { TRIANGLE_POINTS, THRESHOLDS } from "../auth/config";
// import { haversineDistance, isInsideTriangle } from "../utils/locationUtils";
// import { useTheme } from "./ThemeContext";
// import { API_BASE_URL } from '@env';


// // Global state
// global.lastLocation = global.lastLocation || null;
// global.insideRegion = global.insideRegion || false;
// global.entryTime = global.entryTime || null;
// global.navigateToSignin = global.navigateToSignin || null;

// let watchId = null;

// // ---------------- Push Notification setup ----------------
// PushNotification.configure({
//   onNotification: function (notification) {
//     console.log("Notification:", notification);
//   },
//   requestPermissions: Platform.OS === "ios",
// });



// const notify = (title, message) => {
//   PushNotification.localNotification({ title, message });
// };

// // ---------------- UI Component ----------------
// const AutoLocationTracker = ({ navigation }) => {
//   const [trackingState, setTrackingState] = useState(false);
//   const [lastLocation, setLastLocation] = useState(global.lastLocation || null);
//   const [entryTime, setEntryTime] = useState(global.entryTime || null);
//   const [insideRegion, setInsideRegion] = useState(global.insideRegion || false);

//   const { theme } = useTheme();
//   const isDark = theme === "dark";

//   useEffect(() => {
//     global.navigateToSignin = () => navigation.replace("login");

//     const interval = setInterval(() => {
//       setLastLocation(global.lastLocation || null);
//       setInsideRegion(global.insideRegion || false);
//       setEntryTime(global.entryTime || null);
//     }, 2000);

//     handleStart();

//     return () => {
//       clearInterval(interval);
//       handleStop();
//     };
//   }, []);

//   // ---------------- Request Location Permission ----------------
//   const requestLocationPermission = async () => {
//   if (Platform.OS === "ios") {
//     try {
//       const granted = await Geolocation.requestAuthorization("always");
//       if (granted === "granted") return true;
//       Alert.alert("Permission required", "Enable location permission in Settings");
//       return false;
//     } catch (err) {
//       console.error(err);
//       return false;
//     }
//   } else if (Platform.OS === "android") {
//     try {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         {
//           title: "Location Permission",
//           message: "App needs access to your location for attendance tracking",
//           buttonNeutral: "Ask Me Later",
//           buttonNegative: "Cancel",
//           buttonPositive: "OK",
//         }
//       );

//       if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
//       Alert.alert("Permission required", "Enable location permission in Settings");
//       return false;
//     } catch (err) {
//       console.error(err);
//       return false;
//     }
//   }
// };


//   // ---------------- Start Tracking ----------------
//   const handleStart = async () => {
//     const hasPermission = await requestLocationPermission();
//     if (!hasPermission) return;

//     watchId = Geolocation.watchPosition(
//       async (position) => {
//         const { latitude, longitude, accuracy, speed } = position.coords;
//         console.log(latitude,longitude);

//         const timestamp = new Date().toISOString();

//         // Ignore bad data
//         if (!accuracy || accuracy > THRESHOLDS.ACCURACY) return;
//         if (speed === 0) return;

//         // Distance checks
//         if (global.lastLocation) {
//           const dist = haversineDistance(
//             global.lastLocation.latitude,
//             global.lastLocation.longitude,
//             latitude,
//             longitude
//           );
//           if (dist < THRESHOLDS.MIN_DISTANCE || dist > THRESHOLDS.MAX_JUMP) return;
//         }

//         // Geofence check
//         const inside = isInsideTriangle(
//           latitude,
//           longitude,
//           TRIANGLE_POINTS.A,
//           TRIANGLE_POINTS.B,
//           TRIANGLE_POINTS.C
//         );

//         // Load user
//         let userData = null;
//         try {
//           const stored = await AsyncStorage.getItem("user");
//           if (stored) userData = JSON.parse(stored);
//         } catch (err) {
//           console.error(err);
//         }
//         if (!userData) {
//           global.lastLocation = { latitude, longitude };
//           return;
//         }

//         // ---------------- Attendance Logic ----------------
//         if (inside && !global.insideRegion) {
//           global.insideRegion = true;
//           const now = new Date();
//           global.entryTime = now.toLocaleTimeString("en-GB", { hour12: false });
//           const entryDate = now.toISOString().split("T")[0];

//           const checkResponse = await fetch(
//             `${API_BASE_URL}/location/checkattendance/${userData.reg_no}`
//           );
//           const checkData = await checkResponse.json();

//           if (!checkData.hasEntry) {
//             await fetch(`${API_BASE_URL}/location/log`, {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 reg_no: userData.reg_no,
//                 latitude,
//                 longitude,
//                 entry_time: global.entryTime,
//                 is_present: true,
//                 date: entryDate,
//               }),
//             });
//             notify("Entry Logged ✅", `Entry time: ${global.entryTime}`);
//           }
//         } else if (!inside && global.insideRegion) {
//           global.insideRegion = false;
//           const now = new Date();
//           const Time = now.toLocaleTimeString("en-GB", { hour12: false });
//           const [h, m, s] = Time.split(":").map(Number);
//           const totalSeconds = h * 3600 + m * 60 + s;
//           const start = 12 * 3600 + 50 * 60; // 12:50:00
//           const end = 14 * 3600; // 14:00:00
//           if (totalSeconds > start && totalSeconds < end) return;

//           const resp = await fetch(`${API_BASE_URL}/location/exit-verification`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ reg_no: userData.reg_no, latitude, longitude }),
//           });
//           const data = await resp.json();
//           if (data.success) {
//             notify("Exit Logged ✅", `Exit time: ${h}:${m}:${s}`);
//             if (global.navigateToSignin) {
//               await AsyncStorage.removeItem("user");
//               handleStop();
//               global.navigateToSignin();
//             }
//           }
//         }

//         global.lastLocation = { latitude, longitude, accuracy, timestamp };
//       },
//       (error) => console.error(error),
//       {
//         enableHighAccuracy: true,
//         distanceFilter: 5,
//         interval: 10000,
//         fastestInterval: 5000,
//         showsBackgroundLocationIndicator: true,
//       }
//     );

//     setTrackingState(true);
//     Alert.alert("Tracking started");
//   };

//   // ---------------- Stop Tracking ----------------
//   const handleStop = () => {
//     if (watchId !== null) {
//       Geolocation.clearWatch(watchId);
//       watchId = null;
//     }
//     setTrackingState(false);
//     Alert.alert("Tracking stopped");
//   };

//   return (
//     <ScrollView
//       contentContainerStyle={[
//         styles.container,
//         { backgroundColor: isDark ? "#121212" : "#f9fafb" },
//       ]}
//     >
//       <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
//         SentinelShield — Attendance Tracker
//       </Text>

//       <View style={[styles.statusCard, { backgroundColor: isDark ? "#1E1E1E" : "#fff" }]}>
//         <View style={styles.statusRow}>
//           <View style={styles.statusBox}>
//             <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Tracking</Text>
//             <Text
//               style={[
//                 styles.value,
//                 { color: trackingState ? "#2e7d32" : "#c62828" },
//               ]}
//             >
//               {trackingState ? "Active" : "Stopped"}
//             </Text>
//           </View>
//           <View style={styles.statusBox}>
//             <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Region</Text>
//             <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
//               {insideRegion ? "Inside" : "Outside"}
//             </Text>
//           </View>
//         </View>

//         <View style={styles.infoBox}>
//           <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Last Location</Text>
//           <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
//             {lastLocation
//               ? `${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}`
//               : "-"}
//           </Text>
//         </View>

//         <View style={styles.infoBox}>
//           <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Last Entry</Text>
//           <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
//             {entryTime || "-"}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.buttonRow}>
//         <TouchableOpacity style={[styles.btnDanger]} onPress={handleStop}>
//           <Text style={styles.btnText}>Stop Tracking</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { padding: 20, paddingTop: 60, minHeight: "100%" },
//   title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center" },
//   statusCard: {
//     borderRadius: 14,
//     padding: 16,
//     marginBottom: 20,
//     shadowColor: "#000",
//     shadowOpacity: 0.06,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 3,
//   },
//   statusRow: { flexDirection: "row", justifyContent: "space-between" },
//   statusBox: { flex: 1, alignItems: "center" },
//   label: { fontSize: 12 },
//   value: { fontSize: 16, fontWeight: "700", marginTop: 4 },
//   infoBox: { marginTop: 12 },
//   buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
//   btnDanger: {
//     flex: 1,
//     backgroundColor: "#f44336",
//     paddingVertical: 14,
//     borderRadius: 12,
//     alignItems: "center",
//     marginLeft: 8,
//   },
//   btnText: { color: "#fff", fontWeight: "700" },
// });

// export default AutoLocationTracker;



// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Alert,
//   Platform,
//   PermissionsAndroid,
// } from "react-native";
// import Geolocation from "react-native-geolocation-service";
// import PushNotification from "react-native-push-notification";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import BackgroundFetch from "react-native-background-fetch";
// import { TRIANGLE_POINTS, THRESHOLDS } from "../auth/config";
// import { haversineDistance, isInsideTriangle } from "../utils/locationUtils";
// import { useTheme } from "./ThemeContext";
// import { API_BASE_URL } from "@env";

// // ---------------- Global state ----------------
// global.lastLocation = global.lastLocation || null;
// global.insideRegion = global.insideRegion || false;
// global.entryTime = global.entryTime || null;
// global.navigateToSignin = global.navigateToSignin || null;

// let watchId = null;

// // ---------------- Push Notification ----------------
// PushNotification.configure({
//   onNotification: function (notification) {
//     console.log("Notification:", notification);
//   },
//   requestPermissions: Platform.OS === "ios",
// });

// const notify = (title, message) => {
//   PushNotification.localNotification({ title, message });
// };

// // ---------------- Request Location Permission ----------------
// const requestLocationPermission = async () => {
//   if (Platform.OS === "ios") {
//     try {
//       const granted = await Geolocation.requestAuthorization("always");
//       if (granted === "granted") return true;
//       Alert.alert("Permission required", "Enable location permission in Settings");
//       return false;
//     } catch (err) {
//       console.error(err);
//       return false;
//     }
//   } else {
//     try {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         {
//           title: "Location Permission",
//           message: "App needs access to your location for attendance tracking",
//           buttonNeutral: "Ask Me Later",
//           buttonNegative: "Cancel",
//           buttonPositive: "OK",
//         }
//       );
//       if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
//       Alert.alert("Permission required", "Enable location permission in Settings");
//       return false;
//     } catch (err) {
//       console.error(err);
//       return false;
//     }
//   }
// };

// // ---------------- Core Location Tracking ----------------
// const trackLocation = async () => {
//   try {
//     const position = await new Promise((resolve, reject) =>
//       Geolocation.getCurrentPosition(resolve, reject, {
//         enableHighAccuracy: true,
//         timeout: 15000,
//         maximumAge: 10000,
//       })
//     );

//     const { latitude, longitude, accuracy, speed } = position.coords;

//     // ✅ Log location every time trackLocation runs
//     console.log(
//       "📍 trackLocation called at",
//       new Date().toLocaleTimeString(),
//       "-> Lat:", latitude.toFixed(6),
//       "Lng:", longitude.toFixed(6),
//       "Accuracy:", accuracy,
//       "Speed:", speed
//     );

//     if (!accuracy || accuracy > THRESHOLDS.ACCURACY) return;
//     if (speed === 0) return;

//     if (global.lastLocation) {
//       const dist = haversineDistance(
//         global.lastLocation.latitude,
//         global.lastLocation.longitude,
//         latitude,
//         longitude
//       );
//       if (dist < THRESHOLDS.MIN_DISTANCE || dist > THRESHOLDS.MAX_JUMP) return;
//     }

//     const inside = isInsideTriangle(
//       latitude,
//       longitude,
//       TRIANGLE_POINTS.A,
//       TRIANGLE_POINTS.B,
//       TRIANGLE_POINTS.C
//     );

//     let userData = null;
//     try {
//       const stored = await AsyncStorage.getItem("user");
//       if (stored) userData = JSON.parse(stored);
//     } catch (err) {
//       console.error(err);
//     }
//     if (!userData) {
//       global.lastLocation = { latitude, longitude };
//       return;
//     }

//     // ---------------- Attendance Logic ----------------
//     const now = new Date();
//     const entryDate = now.toISOString().split("T")[0];
//     const timeString = now.toLocaleTimeString("en-GB", { hour12: false });

//     if (inside && !global.insideRegion) {
//       global.insideRegion = true;
//       global.entryTime = timeString;

//       const checkResponse = await fetch(
//         `${API_BASE_URL}/location/checkattendance/${userData.reg_no}`
//       );
//       const checkData = await checkResponse.json();

//       if (!checkData.hasEntry) {
//         await fetch(`${API_BASE_URL}/location/log`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             reg_no: userData.reg_no,
//             latitude,
//             longitude,
//             entry_time: global.entryTime,
//             is_present: true,
//             date: entryDate,
//           }),
//         });
//         notify("Entry Logged ✅", `Entry time: ${global.entryTime}`);
//       }
//     } else if (!inside && global.insideRegion) {
//       global.insideRegion = false;

//       const [h, m, s] = timeString.split(":").map(Number);
//       const totalSeconds = h * 3600 + m * 60 + s;
//       const start = 12 * 3600 + 50 * 60; // 12:50
//       const end = 14 * 3600; // 14:00
//       if (totalSeconds > start && totalSeconds < end) return;

//       const resp = await fetch(`${API_BASE_URL}/location/exit-verification`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ reg_no: userData.reg_no, latitude, longitude }),
//       });
//       const data = await resp.json();
//       if (data.success) {
//         notify("Exit Logged ✅", `Exit time: ${h}:${m}:${s}`);
//         if (global.navigateToSignin) {
//           await AsyncStorage.removeItem("user");
//           stopTracking();
//           global.navigateToSignin();
//         }
//       }
//     }

//     global.lastLocation = { latitude, longitude, accuracy, timestamp: now.toISOString() };
//   } catch (err) {
//     console.error("Tracking error:", err);
//   }
// };

// // ---------------- Start Tracking ----------------
// const startTracking = async (setTrackingState) => {
//   const hasPermission = await requestLocationPermission();
//   if (!hasPermission) return;

//   watchId = Geolocation.watchPosition(
//     async (pos) => {
//       await trackLocation();
//     },
//     (err) => console.error(err),
//     {
//       enableHighAccuracy: true,
//       distanceFilter: 5,
//       interval: 10000,
//       fastestInterval: 5000,
//       showsBackgroundLocationIndicator: true,
//     }
//   );

//   BackgroundFetch.configure(
//     {
//       minimumFetchInterval: 5,
//       stopOnTerminate: false,
//       startOnBoot: true,
//       enableHeadless: true,
//     },
//     async (taskId) => {
//       console.log("[BackgroundFetch] taskId:", taskId);
//       await trackLocation();
//       BackgroundFetch.finish(taskId);
//     },
//     (error) => console.log("[BackgroundFetch] failed to start:", error)
//   );

//   BackgroundFetch.start();

//   setTrackingState(true);
//   Alert.alert("Tracking started");
// };

// // ---------------- Stop Tracking ----------------
// const stopTracking = (setTrackingState) => {
//   if (watchId !== null) {
//     Geolocation.clearWatch(watchId);
//     watchId = null;
//   }
//   BackgroundFetch.stop();
//   setTrackingState(false);
//   Alert.alert("Tracking stopped");
// };

// // ---------------- UI Component ----------------
// const AutoLocationTracker = ({ navigation }) => {
//   const [trackingState, setTrackingState] = useState(false);
//   const [lastLocation, setLastLocation] = useState(global.lastLocation || null);
//   const [entryTime, setEntryTime] = useState(global.entryTime || null);
//   const [insideRegion, setInsideRegion] = useState(global.insideRegion || false);

//   const { theme } = useTheme();
//   const isDark = theme === "dark";

//   useEffect(() => {
//     global.navigateToSignin = () => navigation.replace("login");

//     const interval = setInterval(() => {
//       setLastLocation(global.lastLocation || null);
//       setInsideRegion(global.insideRegion || false);
//       setEntryTime(global.entryTime || null);
//     }, 2000);

//     startTracking(setTrackingState);

//     return () => {
//       clearInterval(interval);
//       stopTracking(setTrackingState);
//     };
//   }, []);

//   return (
//     <ScrollView
//       contentContainerStyle={[
//         styles.container,
//         { backgroundColor: isDark ? "#121212" : "#f9fafb" },
//       ]}
//     >
//       <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>
//         SentinelShield — Attendance Tracker
//       </Text>

//       <View style={[styles.statusCard, { backgroundColor: isDark ? "#1E1E1E" : "#fff" }]}>
//         <View style={styles.statusRow}>
//           <View style={styles.statusBox}>
//             <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Tracking</Text>
//             <Text
//               style={[styles.value, { color: trackingState ? "#2e7d32" : "#c62828" }]}
//             >
//               {trackingState ? "Active" : "Stopped"}
//             </Text>
//           </View>
//           <View style={styles.statusBox}>
//             <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Region</Text>
//             <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
//               {insideRegion ? "Inside" : "Outside"}
//             </Text>
//           </View>
//         </View>

//         <View style={styles.infoBox}>
//           <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Last Location</Text>
//           <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
//             {lastLocation
//               ? `${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}`
//               : "-"}
//           </Text>
//         </View>

//         <View style={styles.infoBox}>
//           <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Last Entry</Text>
//           <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
//             {entryTime || "-"}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.buttonRow}>
//         <TouchableOpacity
//           style={[styles.btnDanger]}
//           onPress={() => stopTracking(setTrackingState)}
//         >
//           <Text style={styles.btnText}>Stop Tracking</Text>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { padding: 20, paddingTop: 60, minHeight: "100%" },
//   title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center" },
//   statusCard: {
//     borderRadius: 14,
//     padding: 16,
//     marginBottom: 20,
//     shadowColor: "#000",
//     shadowOpacity: 0.06,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 3,
//   },
//   statusRow: { flexDirection: "row", justifyContent: "space-between" },
//   statusBox: { flex: 1, alignItems: "center" },
//   label: { fontSize: 12 },
//   value: { fontSize: 16, fontWeight: "700", marginTop: 4 },
//   infoBox: { marginTop: 12 },
//   buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
//   btnDanger: {
//     flex: 1,
//     backgroundColor: "#f44336",
//     paddingVertical: 14,
//     borderRadius: 12,
//     alignItems: "center",
//     marginLeft: 8,
//   },
//   btnText: { color: "#fff", fontWeight: "700" },
// });

// export { trackLocation, startTracking, stopTracking };
// export default AutoLocationTracker;



import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import BackgroundGeolocation from "react-native-background-geolocation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PushNotification from "react-native-push-notification";
import { TRIANGLE_POINTS, THRESHOLDS } from "../auth/config";
import { haversineDistance, isInsideTriangle } from "../utils/locationUtils";
import { useTheme } from "./ThemeContext";
import { API_BASE_URL } from "@env";

// ---------------- Global state ----------------
global.lastLocation = global.lastLocation || null;
global.insideRegion = global.insideRegion || false;
global.entryTime = global.entryTime || null;
global.navigateToSignin = global.navigateToSignin || null;

// ---------------- Push Notification ----------------
PushNotification.configure({
  onNotification: function (notification) {
    console.log("Notification:", notification);
  },
  requestPermissions: Platform.OS === "ios",
});

const notify = (title, message) => {
  PushNotification.localNotification({
    channelId: "sentinel-shield", // must match created channel
    title: title,
    message: message,
    smallIcon: "ic_notification", // from drawable
    playSound: true,
    soundName: "default",
    importance: "high",
    vibrate: true,
  });
};

// ---------------- Core Location Tracking ----------------
const handleLocation = async (location, setLastLocation, setInsideRegion) => {
  try {
    const { latitude, longitude, accuracy, speed } = location.coords;
    const timestamp = new Date().toISOString(); // Current time in ISO format

    // Log location with timestamp
    console.log(`[Location] ${timestamp} -> Lat: ${latitude}, Lon: ${longitude}, Acc: ${accuracy}`);


    if (!accuracy || accuracy > THRESHOLDS.ACCURACY) return;
    if (speed === 0) return;

    if (global.lastLocation) {
      const dist = haversineDistance(
        global.lastLocation.latitude,
        global.lastLocation.longitude,
        latitude,
        longitude
      );
      if (dist < THRESHOLDS.MIN_DISTANCE || dist > THRESHOLDS.MAX_JUMP) return;
    }

    const inside = isInsideTriangle(
      latitude,
      longitude,
      TRIANGLE_POINTS.A,
      TRIANGLE_POINTS.B,
      TRIANGLE_POINTS.C
    );

    // Update global state
    global.lastLocation = { latitude, longitude, accuracy, timestamp: new Date().toISOString() };
    global.insideRegion = inside;

    // ✅ Update React state so UI refreshes
    setLastLocation({ latitude, longitude, accuracy });
    setInsideRegion(inside);

    // ---------------- Attendance Logic ----------------
    let userData = null;
    try {
      const stored = await AsyncStorage.getItem("user");
      if (stored) userData = JSON.parse(stored);
    } catch (err) {
      console.error(err);
    }
    if (!userData) return;

    const now = new Date();
    const entryDate = now.toISOString().split("T")[0];
    const timeString = now.toLocaleTimeString("en-GB", { hour12: false });

    if (inside && !global.insideRegion) {
      global.insideRegion = true;
      global.entryTime = timeString;

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
        });
        notify("Entry Logged ✅", `Entry time: ${global.entryTime}`);
      }
    } else if (!inside && global.insideRegion) {
      global.insideRegion = false;

      const [h, m, s] = timeString.split(":").map(Number);
      const totalSeconds = h * 3600 + m * 60 + s;
      const start = 12 * 3600 + 50 * 60; // 12:50
      const end = 14 * 3600; // 14:00
      if (totalSeconds > start && totalSeconds < end) return;

      const resp = await fetch(`${API_BASE_URL}/location/exit-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_no: userData.reg_no, latitude, longitude }),
      });
      const data = await resp.json();
      if (data.success) {
        notify("Exit Logged ✅", `Exit time: ${h}:${m}:${s}`);
        if (global.navigateToSignin) {
          await AsyncStorage.removeItem("user");
          stopTracking();
          global.navigateToSignin();
        }
      }
    }
  } catch (err) {
    console.error("Tracking error:", err);
  }
};

// ---------------- Start Tracking ----------------
const startTracking = (setTrackingState, setLastLocation, setInsideRegion) => {
  BackgroundGeolocation.ready(
    {
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 5,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      foregroundService: true,
      interval: 10000,          // Android: 10 seconds
      fastestInterval: 5000,    // Android: minimum 5 seconds
      notification: {
        title: "SentinelShield Tracking",
        text: "Location tracking is active",
      },
    },
    (state) => {
      if (!state.enabled) BackgroundGeolocation.start();
      setTrackingState(true);
      Alert.alert("Tracking started");
    }
  );

  // Location listener
  BackgroundGeolocation.onLocation(
    (location) => handleLocation(location, setLastLocation, setInsideRegion),
    (error) => console.error("Location error:", error)
  );

  // Headless task (when app is killed)
  BackgroundGeolocation.registerHeadlessTask(async (event) => {
    if (event.location) {
      await handleLocation(event.location, setLastLocation, setInsideRegion);
    }
  });
};

// ---------------- Stop Tracking ----------------
const stopTracking = () => {
  BackgroundGeolocation.stop();
  Alert.alert("Tracking stopped");
};

// ---------------- UI Component ----------------
const AutoLocationTracker = ({ navigation }) => {
  const [trackingState, setTrackingState] = useState(false);
  const [lastLocation, setLastLocation] = useState(global.lastLocation || null);
  const [entryTime, setEntryTime] = useState(global.entryTime || null);
  const [insideRegion, setInsideRegion] = useState(global.insideRegion || false);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    global.navigateToSignin = () => navigation.replace("login");

    startTracking(setTrackingState, setLastLocation, setInsideRegion);

    return () => stopTracking();
  }, []);

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

      <View style={[styles.statusCard, { backgroundColor: isDark ? "#1E1E1E" : "#fff" }]}>
        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Tracking</Text>
            <Text
              style={[styles.value, { color: trackingState ? "#2e7d32" : "#c62828" }]}
            >
              {trackingState ? "Active " : "Stopped"}
            </Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Region</Text>
            <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
              {insideRegion ? "Inside " : "Outside"}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Last Location</Text>
          <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
            {lastLocation
              ? `${lastLocation.latitude.toFixed(6)}, ${lastLocation.longitude.toFixed(6)}`
              : "-"}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={[styles.label, { color: isDark ? "#aaa" : "#6b7280" }]}>Last Entry</Text>
          <Text style={[styles.value, { color: isDark ? "#fff" : "#111" }]}>
            {entryTime || "-"}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.btnDanger} onPress={() => stopTracking()}>
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



