import { useTheme } from "../components/ThemeContext";

function parsePoint(str, fallback) {
  if (!str) return fallback;
  const [lat, lon] = str.split(",").map(Number);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { latitude: lat, longitude: lon };
  return fallback;
}

//Home Region(For Testing)
// export const TRIANGLE_POINTS = {
//   A: parsePoint(process.env.TRIANGLE_POINT_A, { latitude: 8.3372614, longitude: 77.5669758 }),
//   B: parsePoint(process.env.TRIANGLE_POINT_B, { latitude: 8.3351901, longitude: 77.5682358 }),
//   C: parsePoint(process.env.TRIANGLE_POINT_C, { latitude: 8.3360539, longitude: 77.5691025 }),
// };

//College Region
export const TRIANGLE_POINTS = {
  A: parsePoint(process.env.TRIANGLE_POINT_A, { latitude: 8.688042, longitude: 77.725464 }),
  B: parsePoint(process.env.TRIANGLE_POINT_B, { latitude: 8.685985, longitude: 77.727540 }),
  C: parsePoint(process.env.TRIANGLE_POINT_C, { latitude: 8.686051, longitude: 77.725166 }),
};

export const THRESHOLDS = {
  ACCURACY: Number(process.env.ACCURACY_THRESHOLD) || 50,
  MIN_DISTANCE: Number(process.env.MIN_DISTANCE_METERS) || 10,
  MAX_JUMP: Number(process.env.MAX_JUMP_DISTANCE) || 500,
};

export const APP_COLORS = {
  primary: "#007BFF",
  background: "#FFFFFF",
  text: "#000000",
  button: "#007BFF",
};

const theme={useTheme};
export const APP_ASSETS = {
  logo: theme==="dark"?require("../../assets/images/logo2.png"):require("../../assets/images/android-icon-foreground.png"),
};

