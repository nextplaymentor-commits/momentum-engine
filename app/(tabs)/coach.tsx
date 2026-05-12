import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  clearCoachSession,
  getCoachSession,
  saveCoachSession,
} from "../../lib/coachSession";

import { supabase } from "../../lib/supabase";

const COACH_PASSCODE = "1010";

type CheckIn = {
  id?: string;
  player_name: string;
  position: string;
  score: number;
  readiness_label: string;
  risk_text: string;
  soreness: number;
  stress: number;
  confidence: number;
  coach_feedback: string;
  created_at?: string;
};

type CoachNote = {
  id?: string;
  player_name: string;
  note: string;
  focus_area: string;
  created_at?: string;
};

type JournalEntry = {
  id?: string;
  player_name: string;
  answers: Record<string, string>;
  created_at?: string;
};

type WeeklyReport = {
  id?: string;
  player_name: string;
  week_start?: string;
  week_end?: string;
  readiness_avg?: number;
  soreness_avg?: number;
  mood_avg?: number;
  checkins_completed?: number;
  journal_entries_completed?: number;
  coach_summary?: string;
  focus_area?: string;
  created_at?: string;
};

function formatDate(dateString?: string) {
  if (!dateString) return "Saved";

  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CoachScreen() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);

  const [selectedAthlete, setSelectedAthlete] = useState("All");

  const [noteText, setNoteText] = useState("");
  const [focusArea, setFocusArea] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCoachSession();
  }, []);

  const checkCoachSession = async () => {
    const session = await getCoachSession();

    if (session?.unlocked) {
      setUnlocked(true);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);

    const [checkInsRes, notesRes, journalRes, reportsRes] =
      await Promise.all([
        supabase
          .from("check_ins")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("coach_notes")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("journal_entries")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("weekly_reports")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

    setCheckIns(checkInsRes.data || []);
    setCoachNotes(notesRes.data || []);
    setJournalEntries(journalRes.data || []);
    setWeeklyReports(reportsRes.data || []);

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (unlocked) {
        loadDashboard();
      }
    }, [unlocked])
  );

  useEffect(() => {
    if (!unlocked) return;

    const channel = supabase
      .channel("coach-live-dashboard")

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "check_ins" },
        () => loadDashboard()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_entries" },
        () => loadDashboard()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_reports" },
        () => loadDashboard()
      )

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_notes" },
        () => loadDashboard()
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unlocked]);

  const athleteNames = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(checkIns.map((item) => item.player_name))
      ).sort(),
    ];
  }, [checkIns]);

  const visibleCheckIns =
    selectedAthlete === "All"
      ? checkIns
      : checkIns.filter(
          (item) => item.player_name === selectedAthlete
        );

  const visibleNotes =
    selectedAthlete === "All"
      ? coachNotes
      : coachNotes.filter(
          (item) => item.player_name === selectedAthlete
        );

  const visibleJournals =
    selectedAthlete === "All"
      ? journalEntries
      : journalEntries.filter(
          (item) => item.player_name === selectedAthlete
        );

  const visibleReports =
    selectedAthlete === "All"
      ? weeklyReports
      : weeklyReports.filter(
          (item) => item.player_name === selectedAthlete
        );

  const averageScore =
    visibleCheckIns.length > 0
      ? Math.round(
          visibleCheckIns.reduce(
            (sum, item) => sum + Number(item.score || 0),
            0
          ) / visibleCheckIns.length
        )
      : 0;

  const highRiskCount = visibleCheckIns.filter(
    (item) => item.risk_text === "High Risk"
  ).length;

  const unlockCoachDashboard = async () => {
    if (passcode === COACH_PASSCODE) {
      await saveCoachSession();
      setUnlocked(true);
    } else {
      Alert.alert("Wrong passcode");
    }
  };

  const lockCoachDashboard = async () => {
    await clearCoachSession();

    setUnlocked(false);
    setPasscode("");
  };

  const saveCoachNote = async () => {
    if (selectedAthlete === "All") {
      Alert.alert(
        "Select Athlete",
        "Choose one athlete before saving a note."
      );
      return;
    }

    if (!noteText.trim()) {
      Alert.alert("Add a note", "Write a coach note first.");
      return;
    }

    const { error } = await supabase
      .from("coach_notes")
      .insert([
        {
          player_name: selectedAthlete,
          note: noteText.trim(),
          focus_area: focusArea.trim(),
          is_private: true,
        },
      ]);

    if (error) {
      Alert.alert("Save Failed", error.message);
      return;
    }

    setNoteText("");
    setFocusArea("");

    loadDashboard();

    Alert.alert("Coach note saved");
  };

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>Coach Dashboard</Text>

          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Coach passcode"
            placeholderTextColor="#64748b"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={unlockCoachDashboard}
          >
            <Text style={styles.buttonText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Coach Dashboard</Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadDashboard}
        >
          <Text style={styles.buttonText}>
            {loading ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>

        {/* KEEP REST OF YOUR EXISTING UI BELOW */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#04111f",
  },

  container: {
    padding: 20,
    paddingBottom: 120,
  },

  loginCard: {
    margin: 20,
    backgroundColor: "#0b182b",
    padding: 24,
    borderRadius: 24,
  },

  header: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 18,
  },

  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#061322",
    color: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1f3555",
  },

  button: {
    backgroundColor: "#2dd4bf",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  refreshButton: {
    backgroundColor: "#2dd4bf",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 18,
  },

  buttonText: {
    color: "#03111d",
    fontWeight: "900",
    fontSize: 16,
  },
});