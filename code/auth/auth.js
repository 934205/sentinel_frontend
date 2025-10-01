import { supabase } from "../services/SupabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getMobileNumberByRegister = async (registerNumber) => {
  if (registerNumber.length !== 12) {
    throw new Error("Invalid register number");
  }
  const { data, error } = await supabase
    .from("student")
    .select("mobile_number")
    .eq("reg_no", registerNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Student not found");
    }
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Student not found");
  }
  return data.mobile_number;
};


//Get user details
const Getdetails = async (registerNumber) => {
  const { data, error } = await supabase
    .from("student")
    .select("*")
    .eq("reg_no", registerNumber)
    .single();

  if (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }

  console.log("Fetched User Data:", data);
  return data;
};

//fetch data and store in async storage
export const fetchAndStoreUser = async (registerNumber) => {
  try {
    const user = await Getdetails(registerNumber);

    if (!user) {
      console.warn("No user found for register number:", registerNumber);
      return;
    }

    await AsyncStorage.setItem("user", JSON.stringify(user));
    console.log("User data stored successfully!", user);
  } catch (error) {
    console.error("Error storing user data:", error);
  }
};
