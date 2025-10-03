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
import Geolocation from "react-native-geolocation-service";
import PushNotification from "react-native-push-notification";


// --- Request Location Permission ---

export const requestLocationAccess = async () => {
  try {
    if (Platform.OS === "ios") {
      // iOS -> ask for "always"
      const status = await Geolocation.requestAuthorization("always");
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is needed. Please enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
    } else if (Platform.OS === "android") {
      // Step 1: Foreground
      const fgGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "Location permission is required for tracking students",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );

      if (fgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          "Permission Required",
          "Enable location in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }

      // Step 2: Background (Android 10+)
      if (Platform.Version >= 29) {
        const bgGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: "Background Location Permission",
            message: "Background location access is required to track students even when app is not open",
            buttonPositive: "OK",
            buttonNegative: "Cancel",
          }
        );

        if (bgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Background Permission Required",
            "Enable background location in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
      }
    }

    // Step 3: Check if location services are enabled
    Geolocation.getCurrentPosition(
      () => { }, // success → GPS ON
      (error) => {
        if (error.code === 2) {
          Alert.alert(
            "Enable Location Services",
            "Your GPS/location services are turned off. Please enable them in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );

    return true;
  } catch (error) {
    console.error("Error requesting location:", error);
    return false;
  }
};


// --- Configure Push Notification ---
const configurePushNotifications = () => {
  if (Platform.OS === "android") {
    PushNotification.createChannel(
      {
        channelId: "sentinel-shield",
        channelName: "Sentinel Shield",
        importance: 4, // HIGH importance
      },
      (created) => console.log("Channel created:", created)
    );
  }

  PushNotification.configure({
    onNotification: function (notification) {
      console.log('LOCAL NOTIFICATION ==>', notification);
    },

    // This line solves the problem that I was facing.
    requestPermissions: Platform.OS === 'ios',
  });
};

// --- Entry Component ---
export default function Entry({ navigation }) {
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === "android" && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Permission Required",
            "Notification permission is needed. Please enable it in settings."
          );
        }
      }
    };

    requestPermissions();
    requestLocationAccess();
    configurePushNotifications();
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
          height: "100%",
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
          Sentinel Shield is a cutting-edge safety solution designed to ensure
          student security within the campus using an advanced location tracking
          system. By leveraging real-time tracking, the application enables
          administrators and security personnel to monitor student movements,
          respond swiftly to emergencies, and enhance overall campus safety.
          With features like geofencing, emergency alerts, and secure access
          controls, Sentinel Shield fosters a safe and protected environment,
          giving students, parents, and faculty peace of mind.
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
