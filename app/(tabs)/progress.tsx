import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type CheckIn = {
  id?: string;
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

export default function ProgressScreen() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState("All");
  const [lastSynced, setLastSynced] = useState("");

  const loadCheckIns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Progress load error:", error.message);
      setCheckIns([]);
    } else {
      setCheckIns(data || []);
      setLastSynced(
        new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadCheckIns();
    }, [])
  );

  const athleteNames = useMemo(() => {
    const names = checkIns
      .map((item) => item.player_name?.trim())
      .filter(Boolean);

    return ["All", ...Array.from(new Set(names))];
  }, [checkIns]);

  const filteredCheckIns = useMemo(() => {
    if (selectedAthlete === "All") {
      return checkIns;
    }

    return checkIns.filter(
      (item) =>
        item.player_name?.trim().toLowerCase() ===
        selectedAthlete.trim().toLowerCase()
    );
  }, [checkIns, selectedAthlete]);

  const totalCheckIns = filteredCheckIns.length;

  const averageReadiness =
    totalCheckIns > 0
      ? Math.round(
          filteredCheckIns.reduce(
            (sum, item) => sum + Number(item.score || 0),
            0
          ) / totalCheckIns
        )
      : 0;

  const averageConfidence =
    totalCheckIns > 0
      ? Math.round(
          filteredCheckIns.reduce(
            (sum, item) => sum + Number(item.confidence || 0),
            0
          ) / totalCheckIns
        )
      : 0;

  const thisWeekCheckIns = useMemo(() => {
    const now = new Date();

    return filteredCheckIns.filter((item) => {
      if (!item.created_at) return false;

      const created = new Date(item.created_at);
      const diff =
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      return diff <= 7;
    });
  }, [filteredCheckIns]);

  const lastWeekCheckIns = useMemo(() => {
    const now = new Date();

    return filteredCheckIns.filter((item) => {
      if (!item.created_at) return false;

      const created = new Date(item.created_at);
      const diff =
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      return diff > 7 && diff <= 14;
    });
  }, [filteredCheckIns]);

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
          filteredCheckIns.reduce(
            (sum, item) => sum + Number(item.sleep || 0),
            0
          ) / totalCheckIns
        )
      : 0;

  const avgStress =
    totalCheckIns > 0
      ? Math.round(
          filteredCheckIns.reduce(
            (sum, item) => sum + Number(item.stress || 0),
            0
          ) / totalCheckIns
        )
      : 0;

  const avgSoreness =
    totalCheckIns > 0
      ? Math.round(
          filteredCheckIns.reduce(
            (sum, item) => sum + Number(item.soreness || 0),
            0
          ) / totalCheckIns
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

  const latestCheckIn = filteredCheckIns[0];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.smallTitle}>PROGRESS</Text>
          <Text style={styles.title}>Athlete Trends</Text>
          <Text style={styles.subtitle}>
            Select an athlete to view individual readiness, weekly trends, and
            smart alerts.
          </Text>

          <Text style={styles.syncText}>
            {lastSynced ? `Last synced: ${lastSynced}` : "Not synced yet"}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadCheckIns}>
          <Text style={styles.refreshButtonText}>
            {loading ? "Refreshing..." : "Refresh Progress"}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Athlete</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {athleteNames.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.athleteChip,
                  selectedAthlete === name && styles.athleteChipActive,
                ]}
                onPress={() => setSelectedAthlete(name)}
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
        </View>

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
          <Text style={styles.cardTitle}>
            {selectedAthlete === "All"
              ? "Overall Weekly Report"
              : `${selectedAthlete}'s Weekly Report`}
          </Text>

          <Text style={styles.bodyText}>Total Check-Ins: {totalCheckIns}</Text>
          <Text style={styles.bodyText}>Avg Readiness: {averageReadiness}</Text>
          <Text style={styles.bodyText}>
            Avg Confidence: {averageConfidence}
          </Text>
          <Text style={styles.bodyText}>Biggest Issue: {biggestIssue}</Text>
          <Text style={styles.bodyText}>Weekly Focus: {weeklyFocus}</Text>
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
                <Text style={styles.alertText}>
                  ⚠️ Low sleep trend detected.
                </Text>
              )}

              {averageConfidence <= 5 && (
                <Text style={styles.alertText}>
                  ⚠️ Confidence trending low — add encouragement.
                </Text>
              )}

              {avgStress < 7 &&
                avgSleep > 5 &&
                avgSoreness < 7 &&
                averageConfidence > 5 && (
                  <Text style={styles.goodText}>
                    ✅ Trending well this week.
                  </Text>
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
              Athlete: {latestCheckIn.player_name}
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

  athleteChip: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#1f3555",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },

  athleteChipActive: {
    backgroundColor: "#2dd4bf",
    borderColor: "#2dd4bf",
  },

  athleteChipText: {
    color: "#dbeafe",
    fontSize: 14,
    fontWeight: "900",
  },

  athleteChipTextActive: {
    color: "#03111d",
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
});