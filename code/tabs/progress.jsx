import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Header from "../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from '@env';
import { useTheme } from "../components/ThemeContext"; 
import { Calendar } from "react-native-calendars";  

const ProgressScreen = () => {
  const [attendance, setAttendance] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("❌ Error retrieving user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/location/attendance/${user.reg_no}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Failed to fetch attendance");

        const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendance(sortedData);
      } catch (error) {
        console.error("❌ Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? "#121212" : "#F6F9FF" },
        ]}
      >
        <ActivityIndicator size="large" color={isDark ? "#4dabf7" : "#0b3766"} />
        <Text
          style={{
            marginTop: 10,
            fontSize: 16,
            color: isDark ? "#ddd" : "#0b3766",
          }}
        >
          Loading attendance...
        </Text>
      </View>
    );
  }

  // Prepare marked dates for calendar
  const markedDates = attendance.reduce((acc, record) => {
    acc[record.date] = {
      marked: true,
      dotColor: record.present ? "green" : "red",
      selected: selectedDate === record.date,
      selectedColor: "#4dabf7",
    };
    return acc;
  }, {});

  const selectedRecord = attendance.find((rec) => rec.date === selectedDate);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#F6F9FF" },
      ]}
    >
      <Header />

      <Text
        style={[
          styles.sectionTitle,
          { color: isDark ? "#fff" : "#0b3766" },
        ]}
      >
        Attendance Calendar
      </Text>

      <Calendar
  key={isDark ? "dark" : "light"}   
  theme={{
    backgroundColor: isDark ? "#121212" : "#fff",
    calendarBackground: isDark ? "#121212" : "#fff",
    dayTextColor: isDark ? "#fff" : "#000",
    monthTextColor: isDark ? "#4dabf7" : "#0b3766",
    arrowColor: isDark ? "#4dabf7" : "#0b3766",
    selectedDayBackgroundColor: "#4dabf7",
    todayTextColor: "#FF5733",
  }}
  markedDates={markedDates}
  onDayPress={(day) => setSelectedDate(day.dateString)}
/>


      {selectedRecord ? (
  <View style={[styles.attendanceCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff", shadowColor: isDark ? "#000" : "#ccc" }]}>
    <View style={styles.cardRow}>
      <Icon name="login" size={20} color={selectedRecord.present ? "#4CAF50" : "gray"} />
      <Text style={[styles.infoText, { color: isDark ? "#ccc" : "#333" }]}>
        Entry: {selectedRecord.entry || "-"}
      </Text>
    </View>

    <View style={styles.cardRow}>
      <Icon name="logout" size={20} color={selectedRecord.present ? "#FF5733" : "gray"} />
      <Text style={[styles.infoText, { color: isDark ? "#ccc" : "#333" }]}>
        Exit: {selectedRecord.exit || "-"}
      </Text>
    </View>

    <View style={styles.cardRow}>
      <Icon
        name={selectedRecord.present ? "check-circle" : "cancel"}
        size={20}
        color={selectedRecord.present ? "#4CAF50" : "#FF0000"}
      />
      <Text style={[styles.infoText, { color: isDark ? "#ccc" : "#333" }]}>
        {selectedRecord.present ? "Present" : "Absent"}
      </Text>
    </View>
  </View>
) : (
  <Text style={{ color: isDark ? "#aaa" : "#888", marginTop: 10 }}>
    No record found for this date.
  </Text>
)}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 10,
  },
  attendanceCard: {
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ProgressScreen;
