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

type Athlete = {
  id: string;
  player_name: string;
  access_code?: string;
  status?: string;
};

type CheckIn = {
  id?: string;
  athlete_id?: string;
  player_name: string;
  position?: string;
  score?: number;
  readiness_label?: string;
  risk_text?: string;
  soreness?: number;
  stress?: number;
  confidence?: number;
  coach_feedback?: string;
  created_at?: string;
};

type CoachNote = {
  id?: string;
  athlete_id?: string;
  player_name: string;
  note: string;
  focus_area?: string;
  created_at?: string;
};

type JournalEntry = {
  id?: string;
  athlete_id?: string;
  player_name: string;
  answers?: Record<string, string>;
  created_at?: string;
};

type WeeklyReport = {
  id?: string;
  athlete_id?: string;
  player_name: string;
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
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CoachScreen() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
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

    if (session) {
      setUnlocked(true);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);

    const [athletesRes, checkInsRes, notesRes, journalRes, reportsRes] =
      await Promise.all([
        supabase.from("athletes").select("*").order("player_name", { ascending: true }),
        supabase.from("check_ins").select("*").order("created_at", { ascending: false }),
        supabase.from("coach_notes").select("*").order("created_at", { ascending: false }),
        supabase.from("journal_entries").select("*").order("created_at", { ascending: false }),
        supabase.from("weekly_reports").select("*").order("created_at", { ascending: false }),
      ]);

    if (athletesRes.error) console.log("athletes error:", athletesRes.error.message);
    if (checkInsRes.error) console.log("check_ins error:", checkInsRes.error.message);
    if (notesRes.error) console.log("coach_notes error:", notesRes.error.message);
    if (journalRes.error) console.log("journal_entries error:", journalRes.error.message);
    if (reportsRes.error) console.log("weekly_reports error:", reportsRes.error.message);

    setAthletes(athletesRes.data || []);
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

  const athleteNames = useMemo(() => {
    const names = new Set<string>();

    athletes.forEach((item) => item.player_name && names.add(item.player_name));
    checkIns.forEach((item) => item.player_name && names.add(item.player_name));
    coachNotes.forEach((item) => item.player_name && names.add(item.player_name));
    journalEntries.forEach((item) => item.player_name && names.add(item.player_name));
    weeklyReports.forEach((item) => item.player_name && names.add(item.player_name));

    return ["All", ...Array.from(names).sort()];
  }, [athletes, checkIns, coachNotes, journalEntries, weeklyReports]);

  const selectedAthleteRecord = athletes.find(
    (athlete) => athlete.player_name === selectedAthlete
  );

  const filterByAthlete = <T extends { athlete_id?: string; player_name: string }>(
    items: T[]
  ) => {
    if (selectedAthlete === "All") return items;

    if (selectedAthleteRecord?.id) {
      return items.filter(
        (item) =>
          item.athlete_id === selectedAthleteRecord.id ||
          item.player_name === selectedAthlete
      );
    }

    return items.filter((item) => item.player_name === selectedAthlete);
  };

  const visibleCheckIns = filterByAthlete(checkIns);
  const visibleNotes = filterByAthlete(coachNotes);
  const visibleJournals = filterByAthlete(journalEntries);
  const visibleReports = filterByAthlete(weeklyReports);

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

    const athlete = athletes.find(
      (item) => item.player_name === selectedAthlete
    );

    const { error } = await supabase.from("coach_notes").insert([
      {
        athlete_id: athlete?.id,
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

        <TouchableOpacity style={styles.logoutButton} onPress={lockCoachDashboard}>
          <Text style={styles.logoutText}>Lock Coach View</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.athleteRow}>
          {athleteNames.map((name) => (
            <TouchableOpacity
              key={name}
              onPress={() => setSelectedAthlete(name)}
              style={[
                styles.athleteChip,
                selectedAthlete === name && styles.athleteChipActive,
              ]}
            >
              <Text
                style={[
                  styles.athleteChipText,
                  selectedAthlete === name && styles.athleteChipTextActive,
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
            <Text style={styles.statLabel}>Check-ins</Text>
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

        {selectedAthlete !== "All" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Coach Note</Text>

            <TextInput
              value={focusArea}
              onChangeText={setFocusArea}
              placeholder="Focus area"
              placeholderTextColor="#64748b"
              style={styles.input}
            />

            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Private coach note"
              placeholderTextColor="#64748b"
              multiline
              style={[styles.input, styles.noteInput]}
            />

            <TouchableOpacity style={styles.button} onPress={saveCoachNote}>
              <Text style={styles.buttonText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Check-ins</Text>

          {visibleCheckIns.length === 0 ? (
            <Text style={styles.emptyText}>No check-ins yet.</Text>
          ) : (
            visibleCheckIns.slice(0, 10).map((item, index) => (
              <View key={item.id || index} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{item.player_name}</Text>
                <Text style={styles.itemText}>Score: {item.score || 0}</Text>
                <Text style={styles.itemText}>
                  Readiness: {item.readiness_label || "N/A"}
                </Text>
                <Text style={styles.itemText}>Risk: {item.risk_text || "N/A"}</Text>
                <Text style={styles.itemText}>
                  Soreness: {item.soreness ?? "N/A"} | Stress:{" "}
                  {item.stress ?? "N/A"} | Confidence:{" "}
                  {item.confidence ?? "N/A"}
                </Text>
                {!!item.coach_feedback && (
                  <Text style={styles.feedback}>{item.coach_feedback}</Text>
                )}
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Journal Entries</Text>

          {visibleJournals.length === 0 ? (
            <Text style={styles.emptyText}>No journal entries yet.</Text>
          ) : (
            visibleJournals.slice(0, 10).map((entry, index) => (
              <View key={entry.id || index} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{entry.player_name}</Text>

                {entry.answers &&
                  Object.entries(entry.answers).map(([question, answer]) => (
                    <Text key={question} style={styles.itemText}>
                      {question}: {answer}
                    </Text>
                  ))}

                <Text style={styles.dateText}>{formatDate(entry.created_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Reports</Text>

          {visibleReports.length === 0 ? (
            <Text style={styles.emptyText}>No weekly reports yet.</Text>
          ) : (
            visibleReports.slice(0, 10).map((report, index) => (
              <View key={report.id || index} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{report.player_name}</Text>
                <Text style={styles.itemText}>
                  Readiness Avg: {report.readiness_avg ?? "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  Soreness Avg: {report.soreness_avg ?? "N/A"}
                </Text>
                <Text style={styles.itemText}>
                  Check-ins: {report.checkins_completed ?? 0}
                </Text>
                <Text style={styles.itemText}>
                  Journals: {report.journal_entries_completed ?? 0}
                </Text>
                {!!report.coach_summary && (
                  <Text style={styles.feedback}>{report.coach_summary}</Text>
                )}
                <Text style={styles.dateText}>{formatDate(report.created_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coach Notes</Text>

          {visibleNotes.length === 0 ? (
            <Text style={styles.emptyText}>No coach notes yet.</Text>
          ) : (
            visibleNotes.slice(0, 10).map((note, index) => (
              <View key={note.id || index} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{note.player_name}</Text>
                {!!note.focus_area && (
                  <Text style={styles.itemText}>Focus: {note.focus_area}</Text>
                )}
                <Text style={styles.feedback}>{note.note}</Text>
                <Text style={styles.dateText}>{formatDate(note.created_at)}</Text>
              </View>
            ))
          )}
        </View>
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
  noteInput: {
    minHeight: 90,
    textAlignVertical: "top",
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
    marginBottom: 12,
  },
  logoutButton: {
    borderColor: "#334155",
    borderWidth: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  logoutText: {
    color: "#cbd5e1",
    fontWeight: "800",
  },
  buttonText: {
    color: "#03111d",
    fontWeight: "900",
    fontSize: 16,
  },
  athleteRow: {
    marginBottom: 18,
  },
  athleteChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#0b182b",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1f3555",
  },
  athleteChipActive: {
    backgroundColor: "#2dd4bf",
  },
  athleteChipText: {
    color: "#cbd5e1",
    fontWeight: "800",
  },
  athleteChipTextActive: {
    color: "#03111d",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0b182b",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f3555",
  },
  statNumber: {
    color: "#2dd4bf",
    fontSize: 26,
    fontWeight: "900",
  },
  statLabel: {
    color: "#cbd5e1",
    fontWeight: "700",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#0b182b",
    padding: 18,
    borderRadius: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1f3555",
  },
  cardTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  itemBox: {
    backgroundColor: "#061322",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  itemTitle: {
    color: "#2dd4bf",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  itemText: {
    color: "#e2e8f0",
    fontSize: 14,
    marginBottom: 4,
  },
  feedback: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
  },
  dateText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 6,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 15,
  },
});