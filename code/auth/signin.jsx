// import React, { useEffect, useState } from 'react';
// import {
//   Text,
//   StyleSheet,
//   Button,
//   Image,
//   Alert,
//   ActivityIndicator,
//   ScrollView,
//   TextInput,
//   View,
//   Pressable
// } from 'react-native';
// import * as ort from 'onnxruntime-react-native';
// import RNFS from 'react-native-fs';
// import { launchCamera } from 'react-native-image-picker';
// import FaceDetection from '@react-native-ml-kit/face-detection';
// import jpeg from 'jpeg-js';
// import { Buffer } from 'buffer';
// import { API_BASE_URL } from '@env';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// const INPUT_WIDTH = 160;
// const INPUT_HEIGHT = 160;

// const Login = ({ navigation }) => {
//   const [session, setSession] = useState(null);
//   const [refEmbedding, setRefEmbedding] = useState(null);
//   const [userEmbedding, setUserEmbedding] = useState(null);
//   const [userFaceUri, setUserFaceUri] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [regNo, setRegNo] = useState("");
//   const [studentData, setStudentData] = useState(null); // hold student JSON temporarily
//   const [checkUser, setCheckUser] = useState(true)
//   const [dbimage,setDbImage] = useState(null)

//   useEffect(() => {
//     (async () => {
//       const storedUser = await AsyncStorage.getItem("user");
//       if (storedUser) {
//         navigation.navigate("Tabs", { screen: "Home" });
//       }
//       else{
//         setCheckUser(false)
//       }
//     })();
//   }, [])


//   // Load ONNX model
//   useEffect(() => {
//     (async () => {
//       try {
//         const modelName = 'faceNet.onnx';
//         const modelPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
//         if (!(await RNFS.exists(modelPath))) {
//           await RNFS.copyFileAssets(modelName, modelPath);
//         }
//         const loaded = await ort.InferenceSession.create(modelPath);
//         setSession(loaded);
//         console.log('✅ ONNX model loaded');
//       } catch (err) {
//         console.error('❌ Model load failed', err);
//       }
//     })();
//   }, []);



//   // Capture image from camera
//   // Capture image from camera
//   const captureFromCamera = async () => {
//     if (!session) return;
//     setLoading(true);
//     setUserFaceUri(null);
//     try {
//       const res = await launchCamera({ mediaType: 'photo' });

//       // ✅ If user cancels, just return silently
//       if (!res || res.didCancel) {
//         setLoading(false);
//         return;
//       }

//       const uri = res.assets?.[0]?.uri;
//       if (!uri) {
//         setLoading(false);
//         return;
//       }

//       const embedding = await detectAndRun(session, uri, setUserFaceUri);
//       if (embedding) {
//         setUserEmbedding(embedding);
//       } else {
//         Alert.alert('Error', 'No face detected in captured image.');
//       }
//     } catch (err) {
//       console.error('❌ Capture failed:', err);
//       Alert.alert('Error', 'Failed to process captured image.');
//     }
//     setLoading(false);
//   };


//   // Verify with backend
//   const verifyFace = async () => {
//     if (!session) return;
//     if (!regNo.trim()) {
//       Alert.alert("Error", "Please enter a register number.");
//       return;
//     }
//     if (!userEmbedding) {
//       Alert.alert("Error", "Please capture your face first.");
//       return;
//     }

//     setLoading(true);
//     setRefEmbedding(null);
//     try {

//       // Fetch from backend
//       console.log(API_BASE_URL);


//       const res = await fetch(`${API_BASE_URL}/location/signin?reg_no=${regNo}`);
//       const json = await res.json();

//       if (!json.success) throw new Error("No image URL from backend");
//       setStudentData(json.student)
//       setDbImage(json.student.face_url)
//       console.log(json.student.face_url);



//       // Detect + embed reference face
//       const embedding = await detectAndRun(session, json.student.face_url, () => { });
//       if (!embedding) {
//         Alert.alert("Error", "No face detected in reference image.");
//         setLoading(false);
//         return;
//       }
//       setRefEmbedding(embedding);

//       // Compare similarity
//       const sim = cosineSimilarity(userEmbedding, embedding);

//       if (sim > 0.2) {
//         await AsyncStorage.setItem("user", JSON.stringify(json.student));
//         navigation.replace("Tabs", { screen: "Home" })
//       } else {
//         Alert.alert("❌ Not Matched", `Similarity Score: ${sim.toFixed(3)}`);
//       }
//     } catch (err) {
//       console.error("❌ Verification failed:", err);
//       Alert.alert("Error", "Failed to verify face.");
//     }
//     setLoading(false);
//   };

//   // Detect + crop + run model
//   const detectAndRun = async (session, imgPath, setFaceUri) => {
//     try {
//       const path = imgPath.startsWith('file://') ? imgPath : imgPath;

//       const faces = await FaceDetection.detect(path);

//       if (!faces || faces.length !== 1) {
//         throw new Error("Image must contain exactly one face");
//       }

//       const face = faces[0];
//       if (!face.frame) throw new Error('No face frame detected');

//       const { width, height, left, top } = face.frame;
//       if (width <= 0 || height <= 0) throw new Error('Invalid bounding box');

//       const { default: ImageEditor } = await import('@react-native-community/image-editor');
//       const crop = {
//         offset: { x: left, y: top },
//         size: { width, height },
//         displaySize: { width: INPUT_WIDTH, height: INPUT_HEIGHT },
//         resizeMode: "contain",
//       };

//       const cropResult = await ImageEditor.cropImage(path, crop);
//       setFaceUri(cropResult.uri);

//       const buf = await RNFS.readFile(cropResult.uri.replace('file://', ''), 'base64');
//       const raw = jpeg.decode(Buffer.from(buf, 'base64'), { useTArray: true });

//       const floatData = new Float32Array(INPUT_WIDTH * INPUT_HEIGHT * 3);
//       for (let y = 0; y < INPUT_HEIGHT; y++) {
//         for (let x = 0; x < INPUT_WIDTH; x++) {
//           const idx = (y * INPUT_WIDTH + x) * 4;
//           const r = (raw.data[idx] - 127.5) / 128;
//           const g = (raw.data[idx + 1] - 127.5) / 128;
//           const b = (raw.data[idx + 2] - 127.5) / 128;
//           const i = (y * INPUT_WIDTH + x) * 3;
//           floatData[i] = r;
//           floatData[i + 1] = g;
//           floatData[i + 2] = b;
//         }
//       }

//       const input = new ort.Tensor('float32', floatData, [1, INPUT_HEIGHT, INPUT_WIDTH, 3]);
//       const output = await session.run({ image_input: input });
//       return output["Bottleneck_BatchNorm"].data;
//     } catch (err) {
//       console.error('❌ Face embedding failed:', err);
//       return null;
//     }
//   };

//   // Cosine similarity
//   const cosineSimilarity = (a, b) => {
//     const dot = a.reduce((acc, val, i) => acc + val * b[i], 0);
//     const magA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
//     const magB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
//     return dot / (magA * magB);
//   };


//   return (
//     <ScrollView contentContainerStyle={styles.container}>

//       {checkUser ? (
//         <ActivityIndicator size="large" color="#00f" style={{ marginTop: 20 }} />
//       ) : (
//         <>
//           <Text style={styles.title}> Face Verification </Text>

//           <TextInput
//             style={styles.input}
//             placeholder="Enter Register Number"
//             value={regNo}
//             onChangeText={setRegNo}
//           />

//           <View style={styles.buttonWrapper}>
//             <Pressable
//               onPress={captureFromCamera}
//               style={[styles.customButton, (!userEmbedding || loading) && styles.disabledButton]}
//               disabled={loading}
//             >
//               <Text style={styles.buttonText}>Capture Your Face</Text>
//             </Pressable>
//           </View>

//           {userFaceUri && (
//             <>
//               <Text style={styles.label}>Captured Face:</Text>
//               <Image source={{ uri: userFaceUri }} style={styles.image} />
//             </>
//           )}

//           {dbimage && (
//             <>
//               <Text style={styles.label}>Captured Face:</Text>
//               <Image source={{ uri: dbimage }} style={styles.image} />
//             </>
//           )}

//           <View style={styles.buttonWrapper}>
//             <Pressable
//               style={[styles.customButton, (!userEmbedding || loading) && styles.disabledButton]}
//               onPress={verifyFace}
//               disabled={!userEmbedding || loading}
//             >
//               <Text style={styles.buttonText}>Verify Face</Text>
//             </Pressable>
//           </View>

//           {loading && <ActivityIndicator size="large" color="#00f" style={{ marginTop: 20 }} />}
//         </>
//       )}
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     padding: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: "#f9f9f9",
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 24,
//     textAlign: "center",
//     color: "#333",
//   },
//   input: {
//     width: "90%",
//     borderColor: "#ccc",
//     borderWidth: 1,
//     padding: 12,
//     marginBottom: 20,
//     borderRadius: 8,
//     fontSize: 16,
//     backgroundColor: "#fff",
//   },
//   buttonWrapper: {
//     width: "90%",
//     marginVertical: 10,
//     borderRadius: 8,
//     overflow: "hidden", // to keep button rounded
//   },
//   image: {
//     width: 180,
//     height: 180,
//     marginVertical: 12,
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: "#007bff",
//   },
//   label: {
//     fontSize: 16,
//     marginTop: 12,
//     marginBottom: 6,
//     textAlign: "center",
//     color: "#444",
//   },
//   customButton: {
//     width: "90%",
//     paddingVertical: 14,
//     backgroundColor: "#007bff",
//     borderRadius: 8,
//     alignItems: "center",
//     marginVertical: 10,
//   },
//   buttonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   disabledButton: {
//     backgroundColor: "#a0a0a0",
//   },

// });


// export default Login;



import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  View,
  Pressable
} from 'react-native';
import * as ort from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import { launchCamera } from 'react-native-image-picker';
import FaceDetection from '@react-native-ml-kit/face-detection';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
import { API_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INPUT_WIDTH = 160;
const INPUT_HEIGHT = 160;

const Login = ({ navigation }) => {
  const [session, setSession] = useState(null);
  const [userEmbedding, setUserEmbedding] = useState(null);
  const [userFaceUri, setUserFaceUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [checkUser, setCheckUser] = useState(true);
  const [dbimage, setDbImage] = useState(null);

  useEffect(() => {
    (async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        navigation.navigate("Tabs", { screen: "Home" });
      } else {
        setCheckUser(false);
      }
    })();
  }, []);

  // Load ONNX model
  useEffect(() => {
    (async () => {
      try {
        const modelName = 'faceNet.onnx';
        const modelPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
        if (!(await RNFS.exists(modelPath))) {
          await RNFS.copyFileAssets(modelName, modelPath);
        }
        const loaded = await ort.InferenceSession.create(modelPath);
        setSession(loaded);
        console.log('✅ ONNX model loaded');
      } catch (err) {
        console.error('❌ Model load failed', err);
      }
    })();
  }, []);

  // Capture image from camera
  const captureFromCamera = async () => {
    if (!session) return;
    setLoading(true);
    setUserFaceUri(null);
    try {
      const res = await launchCamera({ mediaType: 'photo' });
      if (!res || res.didCancel) {
        setLoading(false);
        return;
      }
      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        setLoading(false);
        return;
      }
      const embedding = await detectAndRun(session, uri, setUserFaceUri);
      if (embedding) {
        setUserEmbedding(embedding);
      } else {
        Alert.alert('Error', 'No face detected in captured image.');
      }
    } catch (err) {
      console.error('❌ Capture failed:', err);
      Alert.alert('Error', 'Failed to process captured image.');
    }
    setLoading(false);
  };

  // Verify with backend
  const verifyFace = async () => {
    if (!session) return;
    if (!regNo.trim()) {
      Alert.alert("Error", "Please enter a register number.");
      return;
    }
    if (!userEmbedding) {
      Alert.alert("Error", "Please capture your face first.");
      return;
    }


    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/location/signin?reg_no=${regNo}`);
      const json = await res.json();

      if (!json.success) throw new Error("No image URL from backend");

      setDbImage(json.student.face_url);
      console.log("Backend face_url:", json.student.face_url);

      // Download backend image to temp file
      const tempPath = `${RNFS.TemporaryDirectoryPath}ref_${regNo}.jpg`;
      await RNFS.downloadFile({
        fromUrl: json.student.face_url,
        toFile: tempPath,
      }).promise;

      // Detect + embed reference face
      const refEmbedding = await detectAndRun(session, tempPath, () => { });
      await RNFS.unlink(tempPath).catch(() => { }); // delete temp file

      if (!refEmbedding) {
        Alert.alert("Error", "No face detected in reference image.");
        setLoading(false);
        return;
      }

      // Compare similarity
      const sim = cosineSimilarity(userEmbedding, refEmbedding);

      if (sim > 0.2) {
        await AsyncStorage.setItem("user", JSON.stringify(json.student));
        navigation.replace("Tabs", { screen: "Home" });
      } else {
        Alert.alert("❌ Not Matched", `Similarity Score: ${sim.toFixed(3)}`);
      }
    } catch (err) {
      console.error("❌ Verification failed:", err);
      Alert.alert("Error", "Failed to verify face.");
    }
    setLoading(false);


  };

  // Detect + crop + run model
  const detectAndRun = async (session, imgPath, setFaceUri) => {
    try {
      const path = imgPath.startsWith('file://') ? imgPath : `file://${imgPath}`;


      const faces = await FaceDetection.detect(path);
      if (!faces || faces.length !== 1) {
        throw new Error("Image must contain exactly one face");
      }

      const face = faces[0];
      const { width, height, left, top } = face.frame;
      if (width <= 0 || height <= 0) throw new Error('Invalid bounding box');

      const { default: ImageEditor } = await import('@react-native-community/image-editor');
      const crop = {
        offset: { x: left, y: top },
        size: { width, height },
        displaySize: { width: INPUT_WIDTH, height: INPUT_HEIGHT },
        resizeMode: "contain",
      };

      const cropResult = await ImageEditor.cropImage(path, crop);
      if (setFaceUri) setFaceUri(cropResult.uri);

      const buf = await RNFS.readFile(cropResult.uri.replace('file://', ''), 'base64');
      const raw = jpeg.decode(Buffer.from(buf, 'base64'), { useTArray: true });

      const floatData = new Float32Array(INPUT_WIDTH * INPUT_HEIGHT * 3);
      for (let y = 0; y < INPUT_HEIGHT; y++) {
        for (let x = 0; x < INPUT_WIDTH; x++) {
          const idx = (y * INPUT_WIDTH + x) * 4;
          const r = (raw.data[idx] - 127.5) / 128;
          const g = (raw.data[idx + 1] - 127.5) / 128;
          const b = (raw.data[idx + 2] - 127.5) / 128;
          const i = (y * INPUT_WIDTH + x) * 3;
          floatData[i] = r;
          floatData[i + 1] = g;
          floatData[i + 2] = b;
        }
      }

      const input = new ort.Tensor('float32', floatData, [1, INPUT_HEIGHT, INPUT_WIDTH, 3]);
      const output = await session.run({ image_input: input });
      return output["Bottleneck_BatchNorm"].data;
    } catch (err) {
      console.error('❌ Face embedding failed:', err);
      return null;
    }

  };

  // Cosine similarity
  const cosineSimilarity = (a, b) => {
    const dot = a.reduce((acc, val, i) => acc + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
    return dot / (magA * magB);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {checkUser ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Image
            source={require("../../assets/images/android-icon-foreground.png")}
            style={{ height: 400, width: 400 }}
          />
          <Text style={{ marginTop: 10, fontSize: 18, color: "#333" }}>Welcome Back!</Text>
        </View>
      ) : (
        <View style={{ width: "100%", alignItems: "center" }}>
          <Text style={styles.title}>Face Verification</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Register Number"
            value={regNo}
            onChangeText={setRegNo}
            keyboardType="numeric"
          />

          <View style={{ width: "100%", alignItems: "center", marginVertical: 10 }}>
            <Pressable
              onPress={captureFromCamera}
              style={[styles.customButton, loading && styles.disabledButton]}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Capture Your Face</Text>
            </Pressable>
          </View>

          {userFaceUri && (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.label}>Captured Face:</Text>
              <Image source={{ uri: userFaceUri }} style={styles.image} />
            </View>
          )}

          {dbimage && (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.label}>Reference Face (from DB):</Text>
              <Image source={{ uri: dbimage }} style={styles.image} />
            </View>
          )}

          <View style={{ width: "100%", alignItems: "center", marginVertical: 10 }}>
            <Pressable
              onPress={verifyFace}
              style={[styles.customButton, (!userEmbedding || loading) && styles.disabledButton]}
              disabled={!userEmbedding || loading}
            >
              <Text style={styles.buttonText}>Verify Face</Text>
            </Pressable>
          </View>

          {loading && <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />}
        </View>
      )}
    </ScrollView>



  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#333",
  },
  input: {
    width: "90%",
    borderColor: "#ccc",
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  buttonWrapper: {
    width: "90%",
    marginVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: 180,
    height: 180,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007bff",
  },
  label: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
    color: "#444",
  },
  customButton: {
    width: "90%",
    paddingVertical: 14,
    backgroundColor: "#007bff",
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#a0a0a0",
  },
});

export default Login;

