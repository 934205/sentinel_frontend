import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import BackgroundFetch from "react-native-background-fetch";


//---------------- Headless JS Task (for background fetch packge) ----------------
// const backgroundFetchHeadlessTask = async (event) => {
//   console.log("[BackgroundFetch HeadlessTask] start:", event);

//   try {
//     // Import your location tracker function
//     const { trackLocation } = require("./code/components/Tracking");
//     await trackLocation(); // call the same logic as in foreground
//   } catch (err) {
//     console.error("Headless task error:", err);
//   }

//   // Finish the fetch
//   BackgroundFetch.finish(event.taskId);
// };

// // Register Headless Task
// BackgroundFetch.registerHeadlessTask(backgroundFetchHeadlessTask);



AppRegistry.registerComponent(appName, () => App);




