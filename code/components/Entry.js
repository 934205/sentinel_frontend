// screens/Entry.js
import React, { useEffect } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
  PermissionsAndroid,
} from "react-native";
import PushNotification from "react-native-push-notification";
import { NativeModules } from "react-native";

const { LocationServiceModule } = NativeModules;

export default function Entry({ navigation }) {
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // ---------------- iOS Location ----------------
        if (Platform.OS === "ios") {
          const granted = await LocationServiceModule.requestPermission?.();
          if (!granted) {
            Alert.alert(
              "Location Permission Required",
              "Please enable location access in Settings."
            );
            return false;
          }
        }

        // ---------------- Android Location ----------------
        if (Platform.OS === "android") {
          // Foreground
          const fg = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission",
              message: "App needs access to your location",
              buttonPositive: "OK",
              buttonNegative: "Cancel",
            }
          );
          if (fg !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert("Location Permission Denied", "Cannot start tracking");
            return false;
          }

          // Background (Android 10+)
          if (Platform.Version >= 29) {
            const bg = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: "Background Location Permission",
                message:
                  "Background location access is needed to track students when app is closed",
                buttonPositive: "OK",
                buttonNegative: "Cancel",
              }
            );
            if (bg !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                "Background Location Denied",
                "Cannot track in background"
              );
              return false;
            }
          }
        }

        // ---------------- Android Notifications ----------------
        if (Platform.OS === "android" && Platform.Version >= 33) {
          const notif = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (notif !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log("Notification permission denied");
          }
        }

        // ---------------- Check GPS ----------------
        const gpsEnabled = await LocationServiceModule.isLocationEnabled?.();
        if (!gpsEnabled) {
          Alert.alert(
            "GPS is Off",
            "Please turn on GPS/location services to start tracking"
          );
          return false;
        }

      } catch (err) {
        console.error("Permission Error:", err);
      }
    };

    // Configure Push Notifications
    const configurePush = () => {
      if (Platform.OS === "android") {
        PushNotification.createChannel(
          {
            channelId: "sentinel-shield",
            channelName: "Sentinel Shield",
            importance: 4,
          },
          (created) => console.log("Channel created:", created)
        );
      }

      PushNotification.configure({
        onNotification: (notification) =>
          console.log("LOCAL NOTIFICATION:", notification),
        requestPermissions: Platform.OS === "ios",
      });
    };

    configurePush();
    requestPermissions();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: "white" }}>
      <Image
        source={require("../../assets/images/landing.jpeg")}
        style={{ height: 400, width: "100%" }}
      />
      <View
        style={{
          backgroundColor: "blue",
          flex: 1,
          width: "100%",
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "white",
            padding: 20,
            fontSize: 20,
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          Welcome To Sentinel Shield!!
        </Text>
        <Text
          style={{
            padding: 10,
            textAlign: "center",
            color: "white",
            fontSize: 15,
          }}
        >
          Sentinel Shield ensures student security on campus using real-time
          location tracking. Admins and security can monitor movements, respond
          to emergencies, and enhance safety with geofencing, alerts, and secure
          access controls.
        </Text>
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <TouchableOpacity
            style={{
              backgroundColor: "white",
              width: 200,
              borderRadius: 10,
              marginTop: 20,
              height: 50,
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "blue",
            }}
            onPress={() => navigation.replace("login")}
          >
            <Text
              style={{
                color: "blue",
                textAlign: "center",
                padding: 10,
                fontSize: 15,
              }}
            >
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
