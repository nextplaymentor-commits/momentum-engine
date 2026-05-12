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

  const loadDashboard = async () => {
    setLoading(true);

    const [checkInsRes, notesRes, journalRes, reportsRes] = await Promise.all([
      supabase.from("check_ins").select("*").order("created_at", { ascending: false }),
      supabase.from("coach_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("journal_entries").select("*").order("created_at", { ascending: false }),
      supabase.from("weekly_reports").select("*").order("created_at", { ascending: false }),
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
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => loadDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries" }, () => loadDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_reports" }, () => loadDashboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unlocked]);

  const athleteNames = useMemo(() => {
    return [
      "All",
      ...Array.from(new Set(checkIns.map((item) => item.player_name))).sort(),
    ];
  }, [checkIns]);

  const visibleCheckIns =
    selectedAthlete === "All"
      ? checkIns
      : checkIns.filter((item) => item.player_name === selectedAthlete);

  const visibleNotes =
    selectedAthlete === "All"
      ? coachNotes
      : coachNotes.filter((item) => item.player_name === selectedAthlete);

  const visibleJournals =
    selectedAthlete === "All"
      ? journalEntries
      : journalEntries.filter((item) => item.player_name === selectedAthlete);

  const visibleReports =
    selectedAthlete === "All"
      ? weeklyReports
      : weeklyReports.filter((item) => item.player_name === selectedAthlete);

  const averageScore =
    visibleCheckIns.length > 0
      ? Math.round(
          visibleCheckIns.reduce((sum, item) => sum + Number(item.score || 0), 0) /
            visibleCheckIns.length
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
      Alert.alert("Select Athlete", "Choose one athlete before saving a note.");
      return;
    }

    if (!noteText.trim()) {
      Alert.alert("Add a note", "Write a coach note first.");
      return;
    }

    const { error } = await supabase.from("coach_notes").insert([
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

          <TouchableOpacity style={styles.button} onPress={unlockCoachDashboard}>
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

        <TouchableOpacity style={styles.refreshButton} onPress={loadDashboard}>
          <Text style={styles.buttonText}>
            {loading ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          {athleteNames.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.chip, selectedAthlete === name && styles.chipActive]}
              onPress={() => setSelectedAthlete(name)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedAthlete === name && styles.chipTextActive,
                ]}
              >
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{visibleCheckIns.length}</Text>
            <Text style={styles.statLabel}>Check-Ins</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{averageScore}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{highRiskCount}</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Reports</Text>

          {visibleReports.length === 0 ? (
            <Text style={styles.entryText}>No weekly reports saved yet.</Text>
          ) : (
            visibleReports.slice(0, 8).map((report) => (
              <View key={report.id} style={styles.entry}>
                <Text style={styles.entryTitle}>{report.player_name}</Text>

                <Text style={styles.entrySub}>
                  {report.week_start} → {report.week_end}
                </Text>

                <Text style={styles.entryText}>
                  Readiness Avg: {report.readiness_avg || 0}
                </Text>

                <Text style={styles.entryText}>
                  Soreness Avg: {report.soreness_avg || 0}/10 • Confidence Avg:{" "}
                  {report.mood_avg || 0}/10
                </Text>

                <Text style={styles.entryText}>
                  Check-ins: {report.checkins_completed || 0} • Journals:{" "}
                  {report.journal_entries_completed || 0}
                </Text>

                <Text style={styles.entryText}>
                  Focus Area: {report.focus_area || "None"}
                </Text>

                <Text style={styles.entryText}>
                  {report.coach_summary || "No summary saved."}
                </Text>

                <Text style={styles.entryDate}>{formatDate(report.created_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Save Coach Note</Text>

          <TextInput
            value={focusArea}
            onChangeText={setFocusArea}
            placeholder="Focus Area"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Coach note..."
            placeholderTextColor="#64748b"
            multiline
            style={[styles.input, { minHeight: 100 }]}
          />

          <TouchableOpacity style={styles.button} onPress={saveCoachNote}>
            <Text style={styles.buttonText}>Save Note</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Check-Ins</Text>

          {visibleCheckIns.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.entry}>
              <Text style={styles.entryTitle}>
                {item.player_name} • {item.score}
              </Text>

              <Text style={styles.entrySub}>
                {item.readiness_label} • {item.risk_text}
              </Text>

              <Text style={styles.entryText}>
                Stress {item.stress}/10 • Soreness {item.soreness}/10
              </Text>

              <Text style={styles.entryText}>{item.coach_feedback}</Text>

              <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Journal Entries</Text>

          {visibleJournals.slice(0, 8).map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <Text style={styles.entryTitle}>{entry.player_name}</Text>

              {Object.values(entry.answers || {})
                .slice(0, 2)
                .map((answer, index) => (
                  <Text key={index} style={styles.entryText}>
                    • {answer}
                  </Text>
                ))}

              <Text style={styles.entryDate}>{formatDate(entry.created_at)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coach Notes</Text>

          {visibleNotes.slice(0, 10).map((note) => (
            <View key={note.id} style={styles.entry}>
              <Text style={styles.entryTitle}>{note.player_name}</Text>

              <Text style={styles.entrySub}>{note.focus_area}</Text>

              <Text style={styles.entryText}>{note.note}</Text>

              <Text style={styles.entryDate}>{formatDate(note.created_at)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.lockButton} onPress={lockCoachDashboard}>
          <Text style={styles.lockButtonText}>Lock Coach Dashboard</Text>
        </TouchableOpacity>
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

  card: {
    backgroundColor: "#0b182b",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  cardTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
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

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#0f1d33",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
  },

  statNumber: {
    color: "#2dd4bf",
    fontSize: 30,
    fontWeight: "900",
  },

  statLabel: {
    color: "#cbd5e1",
    marginTop: 6,
  },

  chip: {
    backgroundColor: "#0f1d33",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },

  chipActive: {
    backgroundColor: "#2dd4bf",
  },

  chipText: {
    color: "white",
    fontWeight: "900",
  },

  chipTextActive: {
    color: "#03111d",
  },

  entry: {
    backgroundColor: "#061322",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },

  entryTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 4,
  },

  entrySub: {
    color: "#2dd4bf",
    marginBottom: 6,
  },

  entryText: {
    color: "#dbeafe",
    marginBottom: 4,
    lineHeight: 20,
  },

  entryDate: {
    color: "#fbbf24",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
  },

  lockButton: {
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },

  lockButtonText: {
    color: "#fbbf24",
    fontSize: 16,
    fontWeight: "900",
  },
});