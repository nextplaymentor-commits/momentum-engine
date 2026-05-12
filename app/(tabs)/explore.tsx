import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const MAX_WEEKLY_QUESTIONS = 1;

type Athlete = {
  player_name: string;
  position?: string;
  day_type?: string;
  training_load?: string;
  score?: number;
  confidence?: number;
  stress?: number;
  soreness?: number;
  sleep?: number;
  readiness_label?: string;
  risk_text?: string;
  created_at?: string;
};

const quickQuestions = [
  "Recovery",
  "Confidence",
  "Nutrition",
  "Training",
  "Game Day",
  "Mindset",
  "College Soccer",
  "Injury Check",
];

function getWeekStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getQuickPrompt(category: string, athleteName?: string) {
  const name = athleteName || "me";

  const prompts: Record<string, string> = {
    Recovery: `Based on my latest check-in, what should ${name} focus on for recovery today?`,
    Confidence: `What should ${name} do today to build confidence?`,
    Nutrition: `What should ${name} eat and drink today based on the latest check-in?`,
    Training: `What should ${name} focus on in training today?`,
    "Game Day": `What should ${name} focus on for game day?`,
    Mindset: `What mindset cue should ${name} carry today?`,
    "College Soccer": `What should ${name} do this week to prepare for college soccer?`,
    "Injury Check": `${name} is feeling pain or discomfort. What should we do safely today?`,
  };

  return prompts[category] || "";
}

function buildTrendSummary(history: Athlete[]) {
  if (!history.length) return "No recent history yet.";

  const validScores = history.filter((item) => typeof item.score === "number");
  const validSleep = history.filter((item) => typeof item.sleep === "number");
  const validSoreness = history.filter((item) => typeof item.soreness === "number");
  const validConfidence = history.filter((item) => typeof item.confidence === "number");

  const avg = (items: Athlete[], key: keyof Athlete) => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + Number(item[key] || 0), 0);
    return Math.round(total / items.length);
  };

  const latest = history[0];
  const oldest = history[history.length - 1];

  const scoreTrend =
    typeof latest?.score === "number" && typeof oldest?.score === "number"
      ? latest.score - oldest.score
      : 0;

  return `
Recent check-ins: ${history.length}
Average score: ${avg(validScores, "score")}
Average sleep: ${avg(validSleep, "sleep")}/10
Average soreness: ${avg(validSoreness, "soreness")}/10
Average confidence: ${avg(validConfidence, "confidence")}/10
Score trend: ${scoreTrend > 0 ? `up ${scoreTrend}` : scoreTrend < 0 ? `down ${Math.abs(scoreTrend)}` : "stable"}
Latest readiness: ${latest?.readiness_label || "Unknown"}
Latest risk: ${latest?.risk_text || "Unknown"}
`;
}

export default function ExploreScreen() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [athleteHistory, setAthleteHistory] = useState<Athlete[]>([]);

  const [questionsUsed, setQuestionsUsed] = useState(0);

  const trendSummary = useMemo(() => {
    return buildTrendSummary(athleteHistory);
  }, [athleteHistory]);

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete) {
      loadUsage();
      loadAthleteHistory(selectedAthlete.player_name);
      setResponse("");
      setQuestion("");
    }
  }, [selectedAthlete]);

  const loadAthletes = async () => {
    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Explore athlete load error:", error.message);
      return;
    }

    const uniqueAthletes = Object.values(
      (data || []).reduce((acc: any, item: any) => {
        if (!acc[item.player_name]) {
          acc[item.player_name] = item;
        }
        return acc;
      }, {})
    ) as Athlete[];

    setAthletes(uniqueAthletes);

    if (uniqueAthletes.length > 0) {
      setSelectedAthlete(uniqueAthletes[0]);
    }
  };

  const loadAthleteHistory = async (playerName: string) => {
    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .eq("player_name", playerName)
      .order("created_at", { ascending: false })
      .limit(7);

    if (error) {
      console.log("Athlete history load error:", error.message);
      setAthleteHistory([]);
      return;
    }

    setAthleteHistory((data || []) as Athlete[]);
  };

  const loadUsage = async () => {
    if (!selectedAthlete) return;

    const weekStart = getWeekStartDate();

    const { data, error } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("athlete_name", selectedAthlete.player_name)
      .eq("usage_date", weekStart)
      .maybeSingle();

    if (error) {
      console.log("AI usage load error:", error.message);
      setQuestionsUsed(0);
      return;
    }

    setQuestionsUsed(data?.question_count || 0);
  };

  const incrementUsage = async () => {
    if (!selectedAthlete) return;

    const weekStart = getWeekStartDate();

    const { data, error } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("athlete_name", selectedAthlete.player_name)
      .eq("usage_date", weekStart)
      .maybeSingle();

    if (error) {
      console.log("AI usage check error:", error.message);
      return;
    }

    if (!data) {
      const { error: insertError } = await supabase.from("ai_usage").insert({
        athlete_name: selectedAthlete.player_name,
        usage_date: weekStart,
        question_count: 1,
      });

      if (insertError) {
        console.log("AI usage insert error:", insertError.message);
        return;
      }

      setQuestionsUsed(1);
    } else {
      const newCount = data.question_count + 1;

      const { error: updateError } = await supabase
        .from("ai_usage")
        .update({
          question_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (updateError) {
        console.log("AI usage update error:", updateError.message);
        return;
      }

      setQuestionsUsed(newCount);
    }
  };

  const askCoachAI = async () => {
    if (!selectedAthlete) {
      Alert.alert("No Athlete Selected", "Submit a check-in first.");
      return;
    }

    if (!question.trim()) {
      Alert.alert("Ask a question first.");
      return;
    }

    if (questionsUsed >= MAX_WEEKLY_QUESTIONS) {
      Alert.alert(
        "Weekly AI Limit Reached",
        "This athlete has used their 1 Coach AI question for the week."
      );
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/.netlify/functions/coach-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          athlete: selectedAthlete,
          history: athleteHistory,
          trendSummary,
          coachNotes: coachNotes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log("Coach AI error:", data);
        setResponse(
          data?.error ||
            "Coach AI could not respond right now. Please try again."
        );
        return;
      }

      setResponse(
        data?.answer || "Coach AI responded, but no answer came back."
      );

      await incrementUsage();
    } catch (err) {
      console.log("Coach AI crash:", err);
      setResponse("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (category: string) => {
    if (!selectedAthlete) return;
    setQuestion(getQuickPrompt(category, selectedAthlete.player_name));
  };

  const questionsRemaining = Math.max(
    MAX_WEEKLY_QUESTIONS - questionsUsed,
    0
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.smallTitle}>EXPLORE</Text>

          <Text style={styles.title}>Coach AI</Text>

          <Text style={styles.subtitle}>
            Personalized athlete mentoring powered by AI. Each athlete gets 1
            Coach AI question per week.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Athlete</Text>

          {athletes.length === 0 ? (
            <Text style={styles.bodyText}>
              No athletes found yet. Submit a check-in first.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {athletes.map((athlete, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.athleteChip,
                    selectedAthlete?.player_name === athlete.player_name &&
                      styles.athleteChipActive,
                  ]}
                  onPress={() => setSelectedAthlete(athlete)}
                >
                  <Text
                    style={[
                      styles.athleteChipText,
                      selectedAthlete?.player_name === athlete.player_name &&
                        styles.athleteChipTextActive,
                    ]}
                  >
                    {athlete.player_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.usageText}>
            AI Questions Remaining This Week: {questionsRemaining}
          </Text>
        </View>

        {selectedAthlete && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Athlete Trend Memory</Text>
            <Text style={styles.bodyText}>{trendSummary}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Ask</Text>

          <View style={styles.quickGrid}>
            {quickQuestions.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.quickButton}
                onPress={() => handleQuickQuestion(item)}
              >
                <Text style={styles.quickButtonText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coach Notes</Text>

          <TextInput
            value={coachNotes}
            onChangeText={setCoachNotes}
            placeholder="Private notes for Coach AI. Example: Ryan needs confidence after mistakes."
            placeholderTextColor="#64748b"
            multiline
            style={styles.notesInput}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ask Coach AI</Text>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Example: My ankle hurts. What should I do?"
            placeholderTextColor="#64748b"
            multiline
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={askCoachAI}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Coach AI is analyzing..." : "Ask Coach AI"}
            </Text>
          </TouchableOpacity>

          {loading && (
            <ActivityIndicator
              size="large"
              color="#2dd4bf"
              style={{ marginTop: 20 }}
            />
          )}

          {response ? (
            <View style={styles.responseCard}>
              <Text style={styles.responseTitle}>Coach AI Response</Text>
              <Text style={styles.responseText}>{response}</Text>
            </View>
          ) : null}
        </View>

        {selectedAthlete && (
          <View style={styles.smartCard}>
            <Text style={styles.smartTitle}>Smart Recovery Insights</Text>

            {selectedAthlete.stress && selectedAthlete.stress >= 7 ? (
              <Text style={styles.smartText}>
                ⚠️ Stress levels are elevated. Prioritize recovery and reduce
                mental overload today.
              </Text>
            ) : null}

            {selectedAthlete.soreness && selectedAthlete.soreness >= 7 ? (
              <Text style={styles.smartText}>
                ⚠️ Soreness is high. Focus on hydration, mobility, and lighter
                work today.
              </Text>
            ) : null}

            {selectedAthlete.confidence && selectedAthlete.confidence <= 5 ? (
              <Text style={styles.smartText}>
                ⚠️ Confidence is trending low. Keep things simple and focus on
                small wins today.
              </Text>
            ) : null}

            {selectedAthlete.sleep && selectedAthlete.sleep <= 5 ? (
              <Text style={styles.smartText}>
                ⚠️ Sleep is low. Recovery and energy may be impacted today.
              </Text>
            ) : null}

            {(!selectedAthlete.stress || selectedAthlete.stress < 7) &&
            (!selectedAthlete.soreness || selectedAthlete.soreness < 7) &&
            (!selectedAthlete.confidence || selectedAthlete.confidence > 5) &&
            (!selectedAthlete.sleep || selectedAthlete.sleep > 5) ? (
              <Text style={styles.smartText}>
                ✅ No major red flags from the latest check-in. Keep stacking
                good habits.
              </Text>
            ) : null}
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
  },

  subtitle: {
    color: "#9fb0c8",
    fontSize: 16,
    marginTop: 10,
    lineHeight: 24,
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
    marginBottom: 14,
  },

  bodyText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 24,
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
    fontWeight: "900",
  },

  athleteChipTextActive: {
    color: "#03111d",
  },

  usageText: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 16,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  quickButton: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#2dd4bf",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
  },

  quickButtonText: {
    color: "#dbeafe",
    fontWeight: "900",
    fontSize: 13,
  },

  input: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#1f3555",
    borderRadius: 20,
    color: "#ffffff",
    fontSize: 16,
    minHeight: 120,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    textAlignVertical: "top",
  },

  notesInput: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: "#1f3555",
    borderRadius: 20,
    color: "#ffffff",
    fontSize: 16,
    minHeight: 90,
    paddingHorizontal: 18,
    paddingVertical: 16,
    textAlignVertical: "top",
  },

  button: {
    backgroundColor: "#2dd4bf",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#03111d",
    fontSize: 16,
    fontWeight: "900",
  },

  responseCard: {
    marginTop: 20,
    backgroundColor: "#061322",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2dd4bf",
  },

  responseTitle: {
    color: "#2dd4bf",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },

  responseText: {
    color: "#dcfce7",
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "600",
  },

  smartCard: {
    backgroundColor: "#08251f",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2dd4bf",
  },

  smartTitle: {
    color: "#2dd4bf",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },

  smartText: {
    color: "#dcfce7",
    fontSize: 15,
    lineHeight: 25,
    marginBottom: 12,
  },
});