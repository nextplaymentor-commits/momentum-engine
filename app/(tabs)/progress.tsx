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
  clearAthleteSession,
  getAthleteSession,
  saveAthleteSession,
} from "../../lib/athleteSession";
import { supabase } from "../../lib/supabase";

type AthleteAccess = {
  id: string;
  access_code: string;
  player_name: string;
  status?: string;
};

type CheckIn = {
  id?: string;
  athlete_id?: string;
  player_name: string;
  position: string;
  day_type: string;
  training_load: string;
  sleep: number;
  energy: number;
  focus: number;
  nutrition: number;
  confidence: number;
  stress: number;
  soreness: number;
  score: number;
  readiness_label: string;
  risk_text: string;
  coach_feedback: string;
  created_at?: string;
};

type JournalEntry = {
  id?: string;
  athlete_id?: string;
  player_name: string;
  created_at?: string;
};

function formatAtlantaDate(dateString?: string) {
  if (!dateString) return "Saved Check-In";

  return new Date(dateString).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDaysAgo(dateString?: string) {
  if (!dateString) return 999;

  const now = new Date();
  const created = new Date(dateString);

  return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
}

function getWeekDates() {
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);

  weekStart.setDate(now.getDate() - 7);

  return {
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
  };
}

export default function ProgressScreen() {
  const [accessCode, setAccessCode] = useState("");
  const [activeAthlete, setActiveAthlete] = useState<AthleteAccess | null>(null);

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [lastSynced, setLastSynced] = useState("");
  const [isCheckingSavedSession, setIsCheckingSavedSession] = useState(true);

  const playerName = activeAthlete?.player_name || "Athlete";

  useEffect(() => {
    const loadSavedAthlete = async () => {
      const savedAthlete = await getAthleteSession();

      if (savedAthlete?.id) {
        setActiveAthlete(savedAthlete as AthleteAccess);
      }

      setIsCheckingSavedSession(false);
    };

    loadSavedAthlete();
  }, []);

  const unlockProgress = async () => {
    const cleanCode = accessCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert("Access Required", "Enter your athlete access code.");
      return;
    }

    setUnlocking(true);

    const { data, error } = await supabase
      .from("athletes")
      .select("id, player_name, access_code, status")
      .eq("access_code", cleanCode)
      .maybeSingle();

    setUnlocking(false);

    if (error) {
      Alert.alert("Login Failed", error.message);
      return;
    }

    if (!data) {
      Alert.alert("Invalid Code", "Please enter the correct athlete access code.");
      return;
    }

    if (data.status === "inactive") {
      Alert.alert(
        "Inactive Athlete",
        "This athlete is currently inactive. Please contact Coach Rey."
      );
      return;
    }

    setActiveAthlete(data);
    await saveAthleteSession(data);
  };

  const lockProgress = async () => {
    await clearAthleteSession();

    setAccessCode("");
    setActiveAthlete(null);
    setCheckIns([]);
    setJournalEntries([]);
    setLastSynced("");
  };

  const loadProgress = async () => {
    if (!activeAthlete?.id) return;

    setLoading(true);

    const [checkInRes, journalRes] = await Promise.all([
      supabase
        .from("check_ins")
        .select("*")
        .eq("athlete_id", activeAthlete.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("journal_entries")
        .select("id, athlete_id, player_name, created_at")
        .eq("athlete_id", activeAthlete.id)
        .order("created_at", { ascending: false }),
    ]);

    if (checkInRes.error) {
      console.log("Progress check-in load error:", checkInRes.error.message);
      setCheckIns([]);
    } else {
      setCheckIns(checkInRes.data || []);
    }

    if (journalRes.error) {
      console.log("Progress journal load error:", journalRes.error.message);
      setJournalEntries([]);
    } else {
      setJournalEntries(journalRes.data || []);
    }

    setLastSynced(
      new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    );

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (activeAthlete?.id) {
        loadProgress();
      }
    }, [activeAthlete])
  );

  const totalCheckIns = checkIns.length;

  const thisWeekCheckIns = useMemo(() => {
    return checkIns.filter((item) => getDaysAgo(item.created_at) <= 7);
  }, [checkIns]);

  const lastWeekCheckIns = useMemo(() => {
    return checkIns.filter((item) => {
      const diff = getDaysAgo(item.created_at);
      return diff > 7 && diff <= 14;
    });
  }, [checkIns]);

  const thisWeekJournals = useMemo(() => {
    return journalEntries.filter((item) => getDaysAgo(item.created_at) <= 7);
  }, [journalEntries]);

  const averageReadiness =
    totalCheckIns > 0
      ? Math.round(
          checkIns.reduce((sum, item) => sum + Number(item.score || 0), 0) /
            totalCheckIns
        )
      : 0;

  const averageConfidence =
    totalCheckIns > 0
      ? Math.round(
          checkIns.reduce((sum, item) => sum + Number(item.confidence || 0), 0) /
            totalCheckIns
        )
      : 0;

  const thisWeekAvg =
    thisWeekCheckIns.length > 0
      ? Math.round(
          thisWeekCheckIns.reduce(
            (sum, item) => sum + Number(item.score || 0),
            0
          ) / thisWeekCheckIns.length
        )
      : 0;

  const lastWeekAvg =
    lastWeekCheckIns.length > 0
      ? Math.round(
          lastWeekCheckIns.reduce(
            (sum, item) => sum + Number(item.score || 0),
            0
          ) / lastWeekCheckIns.length
        )
      : 0;

  const trend = thisWeekAvg - lastWeekAvg;

  const avgSleep =
    totalCheckIns > 0
      ? Math.round(
          checkIns.reduce((sum, item) => sum + Number(item.sleep || 0), 0) /
            totalCheckIns
        )
      : 0;

  const avgStress =
    totalCheckIns > 0
      ? Math.round(
          checkIns.reduce((sum, item) => sum + Number(item.stress || 0), 0) /
            totalCheckIns
        )
      : 0;

  const avgSoreness =
    totalCheckIns > 0
      ? Math.round(
          checkIns.reduce((sum, item) => sum + Number(item.soreness || 0), 0) /
            totalCheckIns
        )
      : 0;

  const thisWeekSorenessAvg =
    thisWeekCheckIns.length > 0
      ? Math.round(
          thisWeekCheckIns.reduce(
            (sum, item) => sum + Number(item.soreness || 0),
            0
          ) / thisWeekCheckIns.length
        )
      : 0;

  const thisWeekConfidenceAvg =
    thisWeekCheckIns.length > 0
      ? Math.round(
          thisWeekCheckIns.reduce(
            (sum, item) => sum + Number(item.confidence || 0),
            0
          ) / thisWeekCheckIns.length
        )
      : 0;

  const biggestIssue =
    totalCheckIns === 0
      ? "Not enough data"
      : avgStress >= 7
      ? "Stress"
      : avgSoreness >= 7
      ? "Soreness"
      : avgSleep <= 5
      ? "Sleep"
      : averageConfidence <= 5
      ? "Confidence"
      : "Consistency";

  const weeklyFocus =
    biggestIssue === "Stress"
      ? "Focus on recovery, breathing, and reducing mental load."
      : biggestIssue === "Soreness"
      ? "Reduce extra work and prioritize mobility."
      : biggestIssue === "Sleep"
      ? "Improve bedtime routine and recovery habits."
      : biggestIssue === "Confidence"
      ? "Build confidence with small wins and positive reps."
      : biggestIssue === "Consistency"
      ? "Keep building strong daily habits."
      : "Complete more check-ins this week.";

  const coachSummary =
    thisWeekCheckIns.length === 0
      ? `${playerName} has not completed a check-in this week yet.`
      : `${playerName} completed ${thisWeekCheckIns.length} check-in(s) this week with an average readiness of ${thisWeekAvg}. Main focus: ${weeklyFocus}`;

  const saveWeeklyReport = async () => {
    if (!activeAthlete?.id) return;

    const { weekStart, weekEnd } = getWeekDates();

    setSavingReport(true);

    const { error } = await supabase.from("weekly_reports").insert([
      {
        athlete_id: activeAthlete.id,
        player_name: playerName,
        access_code: activeAthlete.access_code,
        week_start: weekStart,
        week_end: weekEnd,
        readiness_avg: thisWeekAvg,
        soreness_avg: thisWeekSorenessAvg,
        mood_avg: thisWeekConfidenceAvg,
        checkins_completed: thisWeekCheckIns.length,
        journal_entries_completed: thisWeekJournals.length,
        coach_summary: coachSummary,
        focus_area: biggestIssue,
      },
    ]);

    setSavingReport(false);

    if (error) {
      Alert.alert("Report Failed", error.message);
      return;
    }

    Alert.alert("Weekly Report Saved", `${playerName}'s weekly report was saved.`);
  };

  const latestCheckIn = checkIns[0];

  if (isCheckingSavedSession) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <Text style={styles.loadingText}>Loading athlete...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeAthlete) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <View style={styles.lockCard}>
            <Text style={styles.smallTitle}>PROGRESS</Text>
            <Text style={styles.title}>Athlete Progress</Text>
            <Text style={styles.subtitle}>
              Enter your athlete code once. Momentum Engine will remember you.
            </Text>

            <TextInput
              value={accessCode}
              onChangeText={(text) => setAccessCode(text.toUpperCase())}
              placeholder="Enter access code"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              style={styles.lockInput}
            />

            <TouchableOpacity
              style={[styles.refreshButton, unlocking && styles.disabledButton]}
              onPress={unlockProgress}
              disabled={unlocking}
            >
              <Text style={styles.refreshButtonText}>
                {unlocking ? "Checking..." : "Open My Progress"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.smallTitle}>PROGRESS</Text>
          <Text style={styles.title}>{playerName}'s Trends</Text>
          <Text style={styles.subtitle}>
            Individual readiness, weekly trends, journal completion, and smart
            alerts.
          </Text>

          <Text style={styles.syncText}>
            {lastSynced ? `Last synced: ${lastSynced}` : "Not synced yet"}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadProgress}>
          <Text style={styles.refreshButtonText}>
            {loading ? "Refreshing..." : "Refresh Progress"}
          </Text>
        </TouchableOpacity>

        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{thisWeekAvg}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{lastWeekAvg}</Text>
            <Text style={styles.statLabel}>Last Week</Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statNumber,
                { color: trend >= 0 ? "#22c55e" : "#ef4444" },
              ]}
            >
              {trend >= 0 ? "+" : ""}
              {trend}
            </Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{playerName}'s Weekly Report</Text>

          <Text style={styles.bodyText}>
            Check-Ins This Week: {thisWeekCheckIns.length}
          </Text>

          <Text style={styles.bodyText}>
            Journals This Week: {thisWeekJournals.length}
          </Text>

          <Text style={styles.bodyText}>Avg Readiness: {thisWeekAvg}</Text>

          <Text style={styles.bodyText}>
            Avg Soreness: {thisWeekSorenessAvg}/10
          </Text>

          <Text style={styles.bodyText}>
            Avg Confidence: {thisWeekConfidenceAvg}/10
          </Text>

          <Text style={styles.bodyText}>Biggest Issue: {biggestIssue}</Text>

          <Text style={styles.bodyText}>Weekly Focus: {weeklyFocus}</Text>

          <TouchableOpacity
            style={[styles.reportButton, savingReport && styles.disabledButton]}
            onPress={saveWeeklyReport}
            disabled={savingReport}
          >
            <Text style={styles.reportButtonText}>
              {savingReport ? "Saving Report..." : "Save Weekly Report"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Smart Alerts</Text>

          {loading ? (
            <Text style={styles.bodyText}>Loading progress...</Text>
          ) : totalCheckIns === 0 ? (
            <Text style={styles.bodyText}>No check-ins found yet.</Text>
          ) : (
            <>
              {avgSoreness >= 7 && (
                <Text style={styles.alertText}>
                  ⚠️ High soreness detected — reduce load.
                </Text>
              )}

              {avgStress >= 7 && (
                <Text style={styles.alertText}>
                  ⚠️ Stress levels elevated — prioritize recovery.
                </Text>
              )}

              {avgSleep <= 5 && (
                <Text style={styles.alertText}>⚠️ Low sleep trend detected.</Text>
              )}

              {averageConfidence <= 5 && (
                <Text style={styles.alertText}>
                  ⚠️ Confidence trending low — build small wins.
                </Text>
              )}

              {thisWeekJournals.length === 0 && (
                <Text style={styles.alertText}>
                  ⚠️ No journal entries this week — complete one reflection.
                </Text>
              )}

              {avgStress < 7 &&
                avgSleep > 5 &&
                avgSoreness < 7 &&
                averageConfidence > 5 &&
                thisWeekJournals.length > 0 && (
                  <Text style={styles.goodText}>✅ Trending well this week.</Text>
                )}
            </>
          )}
        </View>

        {latestCheckIn && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Latest Check-In</Text>

            <Text style={styles.dateText}>
              {formatAtlantaDate(latestCheckIn.created_at)}
            </Text>

            <Text style={styles.bodyText}>
              Score: {latestCheckIn.score} — {latestCheckIn.readiness_label}
            </Text>

            <Text style={styles.bodyText}>
              Day: {latestCheckIn.day_type} / {latestCheckIn.training_load}
            </Text>

            <Text style={styles.bodyText}>
              Sleep {latestCheckIn.sleep}/10 • Energy {latestCheckIn.energy}/10
              • Focus {latestCheckIn.focus}/10
            </Text>

            <Text style={styles.bodyText}>
              Confidence {latestCheckIn.confidence}/10 • Stress{" "}
              {latestCheckIn.stress}/10 • Soreness {latestCheckIn.soreness}/10
            </Text>

            <Text style={styles.bodyText}>
              Coach Note: {latestCheckIn.coach_feedback}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.lockAgainButton} onPress={lockProgress}>
          <Text style={styles.lockAgainText}>Switch Athlete</Text>
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

  lockContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },

  loadingText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  lockCard: {
    backgroundColor: "#0b182b",
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1f3555",
  },

  lockInput: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#1f3555",
    borderRadius: 18,
    color: "#ffffff",
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 18,
    marginBottom: 14,
  },

  container: {
    padding: 20,
    paddingBottom: 120,
  },

  heroCard: {
    backgroundColor: "#0b182b",
    borderRadius: 30,
    padding: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1f3555",
  },

  smallTitle: {
    color: "#2dd4bf",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },

  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },

  subtitle: {
    color: "#9fb0c8",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
  },

  syncText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12,
  },

  refreshButton: {
    backgroundColor: "#2dd4bf",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 18,
  },

  disabledButton: {
    opacity: 0.6,
  },

  refreshButtonText: {
    color: "#03111d",
    fontSize: 15,
    fontWeight: "900",
  },

  card: {
    backgroundColor: "#0b182b",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f3555",
    marginBottom: 18,
  },

  cardTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#0f1d33",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f3555",
  },

  statNumber: {
    color: "#2dd4bf",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },

  statLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },

  bodyText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 6,
  },

  reportButton: {
    backgroundColor: "#2dd4bf",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },

  reportButtonText: {
    color: "#03111d",
    fontSize: 15,
    fontWeight: "900",
  },

  alertText: {
    color: "#fbbf24",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },

  goodText: {
    color: "#22c55e",
    fontSize: 15,
    fontWeight: "700",
  },

  dateText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },

  lockAgainButton: {
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },

  lockAgainText: {
    color: "#fbbf24",
    fontSize: 16,
    fontWeight: "900",
  },
});