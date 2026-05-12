import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedAthleteSession = {
  id?: string;
  player_name: string;
  access_code: string;
  position?: string;
  status?: string;
};

const ATHLETE_SESSION_KEY = "momentum_active_athlete";

export async function saveAthleteSession(athlete: SavedAthleteSession) {
  await AsyncStorage.setItem(ATHLETE_SESSION_KEY, JSON.stringify(athlete));
}

export async function getAthleteSession() {
  const saved = await AsyncStorage.getItem(ATHLETE_SESSION_KEY);

  if (!saved) {
    return null;
  }

  return JSON.parse(saved) as SavedAthleteSession;
}

export async function clearAthleteSession() {
  await AsyncStorage.removeItem(ATHLETE_SESSION_KEY);
} 