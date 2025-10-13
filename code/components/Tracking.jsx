


import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  DeviceEventEmitter,
} from "react-native";
import { NativeModules } from "react-native";

const { PersistentLocationModule } = NativeModules;

const AutoLocationTracker = () => {
  const [trackingState, setTrackingState] = useState(false);
  const [lastLocation, setLastLocation] = useState("-");
  const [insideRegion, setInsideRegion] = useState(false);
  const [entryTime, setEntryTime] = useState("-");

  useEffect(() => {
    const init = async () => {

      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert("Location permission denied");
        return;
      }

      if (PersistentLocationModule?.startService) {
        try {
          await restoreLastLocation()
          await PersistentLocationModule.startService();
          setTrackingState(true);
          console.log("✅ Tracking service started");
        } catch (e) {
          console.warn("Failed to start service:", e);
        }
      }
    };

    init();

    // Listen for location updates
    const subscription = DeviceEventEmitter.addListener(
      "onLocationUpdate",
      (loc) => {
        if (loc) {
          console.log("📍 Received location:", loc);
          setLastLocation(`${loc.latitude?.toFixed(6)}, ${loc.longitude?.toFixed(6)}`);
          setInsideRegion(loc.insideRegion ?? false);
          setEntryTime(loc.entryTime ?? "-");
        }
      }
    );

    return () => {
      subscription.remove();
      if (PersistentLocationModule?.stopService) {
        PersistentLocationModule.stopService();
        setTrackingState(false);
      }
    };
  }, []);

  const restoreLastLocation = async () => {
    if (PersistentLocationModule?.getLastLocation) {
      try {
        const locData = await PersistentLocationModule.getLastLocation();
        setLastLocation(locData.lastLocation);
        setInsideRegion(locData.insideRegion);
        setEntryTime(locData.entryTime);
      } catch (e) {
        console.warn("Failed to get last location:", e);
      }
    }
  };


  const requestLocationPermission = async () => {
    if (Platform.OS === "ios") {
      const granted = await PersistentLocationModule.requestPermission?.();
      return granted ?? false;
    } else {
      try {
        const fine = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;

        const background = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        return background === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error(err);
        return false;
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>SentinelShield — Attendance Tracker</Text>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <Text style={styles.label}>Tracking</Text>
            <Text style={[styles.value, { color: trackingState ? "#2e7d32" : "#c62828" }]}>
              {trackingState ? "Active" : "Stopped"}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.label}>Region</Text>
            <Text style={styles.value}>{insideRegion ? "Inside" : "Outside"}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Last Location</Text>
          <Text style={styles.value}>{lastLocation}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Last Entry</Text>
          <Text style={styles.value}>{entryTime}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, minHeight: "100%" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#000" },
  statusCard: { borderRadius: 14, padding: 16, marginBottom: 20, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusBox: { flex: 1, alignItems: "center" },
  label: { fontSize: 12, color: "#6b7280" },
  value: { fontSize: 16, fontWeight: "700", marginTop: 4, color: "#111" },
  infoBox: { marginTop: 12, alignItems: "flex-start" },
});

export default AutoLocationTracker;
