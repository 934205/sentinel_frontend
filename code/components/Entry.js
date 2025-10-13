// screens/Entry.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Linking,
  PermissionsAndroid,
} from "react-native";
import { NativeModules } from "react-native";

const { PersistentLocationModule } = NativeModules;

export default function Entry({ navigation }) {
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // ---------------- iOS ----------------
        if (Platform.OS === "ios") {
          // 1️⃣ Notification
          if (PersistentLocationModule.requestNotificationPermission) {
            await PersistentLocationModule.requestNotificationPermission();
          }

          // 2️⃣ Location (Foreground + Background)
          const granted = await PersistentLocationModule.requestPermission?.();
          if (!granted) {
            Alert.alert(
              "Location Permission Required",
              "Enable location in Settings (Always Allow).",
              [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
            );
            return false;
          }
          return true;
        }

        // ---------------- Android ----------------
        if (Platform.OS === "android") {
          // 1️⃣ Notification (Android 13+)
          if (Platform.Version >= 33) {
            const notif = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (notif !== PermissionsAndroid.RESULTS.GRANTED) {
              console.log("Notification permission denied");
            }
          }

          // 2️⃣ Foreground location
          const fine = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission",
              message: "App needs location access to track students.",
              buttonPositive: "OK",
              buttonNegative: "Cancel",
            }
          );
          if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;

          // 3️⃣ Background location (Android 10+)
          if (Platform.Version >= 29) {
            const bg = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
              {
                title: "Background Location",
                message:
                  "Allow all the time to track students even when app is closed.",
                buttonPositive: "OK",
                buttonNegative: "Cancel",
              }
            );
            if (bg !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                "Background Location Required",
                "Enable 'Allow all the time' in Settings to track students in background.",
                [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
              );
              return false;
            }
          }
          return true;
        }

      } catch (err) {
        console.error("Permission Error:", err);
        return false;
      }
    };

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
            alignSelf: "center",
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
  );
}
