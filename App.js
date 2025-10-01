import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ThemeProvider } from "./code/components/ThemeContext"; // ✅ import provider


// --- Import your screens ---

import Entry from "./code/components/Entry";
import Login from "./code/auth/signin";
import Tabs from "./code/Tabs";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';





const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


export default function App() {

  
  return (
    <ThemeProvider>
        <GestureHandlerRootView style={styles.container}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="entry" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="entry" component={Entry} />
              <Stack.Screen name="login" component={Login} />
              <Stack.Screen name="Tabs" component={Tabs} />
            </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
    </ThemeProvider>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
