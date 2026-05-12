import AsyncStorage from "@react-native-async-storage/async-storage";

const COACH_SESSION_KEY = "momentum_engine_coach_mode";

export async function saveCoachSession() {
  await AsyncStorage.setItem(COACH_SESSION_KEY, "true");
}

export async function getCoachSession() {
  const saved = await AsyncStorage.getItem(COACH_SESSION_KEY);
  return saved === "true";
}

export async function clearCoachSession() {
  await AsyncStorage.removeItem(COACH_SESSION_KEY);
}