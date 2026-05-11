import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const COACH_PASSCODE = "1010";

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

export default function CoachScreen() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState("");

  const loadCheckIns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Coach load error:", error.message);
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
      if (unlocked) {
        loadCheckIns();
      }
    }, [unlocked])
  );

  useEffect(() => {
    if (!unlocked) return;

    const channel = supabase
      .channel("coach-check-ins-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "check_ins",
        },
        () => {
          loadCheckIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unlocked]);

  const latestCheckIns = Object.values(
    checkIns.reduce((acc, item) => {
      const name = item.player_name || "Athlete";

      if (!acc[name]) {
        acc[name] = item;
      }

      return acc;
    }, {} as Record<string, CheckIn>)
  );

  const totalAthletes = latestCheckIns.length;

  const averageReadiness =
    latestCheckIns.length > 0
      ? Math.round(
          latestCheckIns.reduce(
            (sum, item) => sum + Number(item.score || 0),
            0
          ) / latestCheckIns.length
        )
      : 0;

  const highRiskCount = latestCheckIns.filter(
    (item) => item.risk_text === "High Risk"
  ).length;

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <View style={styles.lockCard}>
            <Text style={styles.lockEmoji}>🔒</Text>
            <Text style={styles.lockTitle}>Coach Access</Text>
            <Text style={styles.lockSub}>
              Enter your private coach passcode to view the dashboard.
            </Text>

            <TextInput
              value={passcode}
              onChangeText={setPasscode}
              placeholder="Enter passcode"
              placeholderTextColor="#64748b"
              secureTextEntry
              keyboardType="number-pad"
              style={styles.lockInput}
            />

            <TouchableOpacity
              style={styles.unlockButton}
              onPress={() => {
                if (passcode === COACH_PASSCODE) {
                  setUnlocked(true);
                } else {
                  alert("Wrong passcode");
                  setPasscode("");
                }
              }}
            >
              <Text style={styles.unlockButtonText}>Unlock Dashboard</Text>
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
          <Text style={styles.smallTitle}>COACH DASHBOARD</Text>
          <Text style={styles.title}>Team Overview</Text>
          <Text style={styles.subtitle}>
            Showing the newest check-in for each athlete in Atlanta time.
          </Text>

          <Text style={styles.syncText}>
            {lastSynced ? `Last synced: ${lastSynced}` : "Not synced yet"}
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalAthletes}</Text>
            <Text style={styles.statLabel}>Athletes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{averageReadiness}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{highRiskCount}</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadCheckIns}>
          <Text style={styles.refreshButtonText}>
            {loading ? "Refreshing..." : "Refresh Check-Ins"}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Athlete Check-Ins</Text>

          {loading ? (
            <Text style={styles.bodyText}>Loading athlete data...</Text>
          ) : latestCheckIns.length === 0 ? (
            <Text style={styles.bodyText}>
              No check-ins found yet. Once athletes complete readiness, they
              will show here.
            </Text>
          ) : (
            latestCheckIns.map((item, index) => (
              <View key={item.id || index} style={styles.entryCard}>
                <Text style={styles.entryDate}>
                  {formatAtlantaDate(item.created_at)}
                </Text>

                <View style={styles.entryTopRow}>
                  <View>
                    <Text style={styles.athleteName}>{item.player_name}</Text>
                    <Text style={styles.entryText}>
                      {item.position} • {item.day_type} / {item.training_load}
                    </Text>
                  </View>

                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>{item.score}</Text>
                  </View>
                </View>

                <Text style={styles.readinessText}>
                  {item.readiness_label} • {item.risk_text}
                </Text>

                <Text style={styles.entryText}>
                  Sleep {item.sleep}/10 • Energy {item.energy}/10 • Focus{" "}
                  {item.focus}/10
                </Text>

                <Text style={styles.entryText}>
                  Confidence {item.confidence}/10 • Stress {item.stress}/10 •
                  Soreness {item.soreness}/10
                </Text>

                <Text style={styles.coachNote}>
                  Coach Note: {item.coach_feedback}
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.lockAgainButton}
          onPress={() => setUnlocked(false)}
        >
          <Text style={styles.lockAgainText}>Lock Coach Dashboard</Text>
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
  lockContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  lockCard: {
    backgroundColor: "#0b182b",
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1f3555",
  },
  lockEmoji: {
    fontSize: 42,
    marginBottom: 12,
  },
  lockTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
  },
  lockSub: {
    color: "#9fb0c8",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  lockInput: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#1f3555",
    borderRadius: 18,
    color: "#ffffff",
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  unlockButton: {
    backgroundColor: "#2dd4bf",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  unlockButtonText: {
    color: "#03111d",
    fontSize: 16,
    fontWeight: "900",
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
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
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
    marginBottom: 10,
  },
  bodyText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 5,
  },
  entryCard: {
    backgroundColor: "#061322",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#1f3555",
    marginTop: 12,
  },
  entryDate: {
    color: "#fbbf24",
    fontWeight: "900",
    marginBottom: 10,
  },
  entryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  athleteName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  scoreBadge: {
    backgroundColor: "#2dd4bf",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    color: "#03111d",
    fontSize: 22,
    fontWeight: "900",
  },
  readinessText: {
    color: "#2dd4bf",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  entryText: {
    color: "#e5e7eb",
    fontSize: 14,
    lineHeight: 21,
  },
  coachNote: {
    color: "#dbeafe",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
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