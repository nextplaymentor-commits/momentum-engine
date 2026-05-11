import { useEffect, useState } from "react";
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

const MAX_DAILY_QUESTIONS = 3;

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
};

export default function ExploreScreen() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] =
    useState<Athlete | null>(null);

  const [questionsUsed, setQuestionsUsed] = useState(0);

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete) {
      loadUsage();
    }
  }, [selectedAthlete]);

  const loadAthletes = async () => {
    const { data, error } = await supabase
      .from("check_ins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    const uniqueAthletes = Object.values(
      (data || []).reduce((acc: any, item: any) => {
        if (!acc[item.player_name]) {
          acc[item.player_name] = item;
        }
        return acc;
      }, {})
    );

    setAthletes(uniqueAthletes);

    if (uniqueAthletes.length > 0) {
      setSelectedAthlete(uniqueAthletes[0] as Athlete);
    }
  };

  const loadUsage = async () => {
    if (!selectedAthlete) return;

    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("athlete_name", selectedAthlete.player_name)
      .eq("usage_date", today)
      .maybeSingle();

    setQuestionsUsed(data?.question_count || 0);
  };

  const incrementUsage = async () => {
    if (!selectedAthlete) return;

    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("athlete_name", selectedAthlete.player_name)
      .eq("usage_date", today)
      .maybeSingle();

    if (!data) {
      await supabase.from("ai_usage").insert({
        athlete_name: selectedAthlete.player_name,
        usage_date: today,
        question_count: 1,
      });

      setQuestionsUsed(1);
    } else {
      const newCount = data.question_count + 1;

      await supabase
        .from("ai_usage")
        .update({
          question_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      setQuestionsUsed(newCount);
    }
  };

  const askCoachAI = async () => {
    if (!selectedAthlete) {
      Alert.alert("Select an athlete first.");
      return;
    }

    if (!question.trim()) {
      Alert.alert("Ask Coach AI a question first.");
      return;
    }

    if (questionsUsed >= MAX_DAILY_QUESTIONS) {
      Alert.alert(
        "Daily AI Limit Reached",
        "This athlete has used all 3 Coach AI questions today."
      );
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const { data, error } = await supabase.functions.invoke("coach-ai", {
        body: {
          question,
          athlete: selectedAthlete,
        },
      });

      if (error) {
        console.log(error);
        setResponse(
          "Coach AI could not respond right now. Please try again."
        );
        return;
      }

      setResponse(data.answer);

      await incrementUsage();
    } catch (err) {
      console.log(err);

      setResponse("Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.smallTitle}>EXPLORE</Text>

          <Text style={styles.title}>Coach AI</Text>

          <Text style={styles.subtitle}>
            Personalized athlete mentoring powered by AI.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Athlete</Text>

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

          <Text style={styles.usageText}>
            Questions Remaining Today:{" "}
            {MAX_DAILY_QUESTIONS - questionsUsed}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ask Coach AI</Text>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="How can I improve faster?"
            placeholderTextColor="#64748b"
            multiline
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={askCoachAI}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? "Coach AI is analyzing readiness..."
                : "Ask Coach AI"}
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

            {selectedAthlete.stress &&
            selectedAthlete.stress >= 7 ? (
              <Text style={styles.smartText}>
                ⚠️ Stress levels are elevated. Prioritize recovery and reduce
                mental overload today.
              </Text>
            ) : null}

            {selectedAthlete.soreness &&
            selectedAthlete.soreness >= 7 ? (
              <Text style={styles.smartText}>
                ⚠️ Soreness is high. Focus on hydration, mobility, and lighter
                work today.
              </Text>
            ) : null}

            {selectedAthlete.confidence &&
            selectedAthlete.confidence <= 5 ? (
              <Text style={styles.smartText}>
                ⚠️ Confidence is trending low. Keep things simple and focus on
                small wins today.
              </Text>
            ) : null}

            {selectedAthlete.sleep &&
            selectedAthlete.sleep <= 5 ? (
              <Text style={styles.smartText}>
                ⚠️ Sleep is low. Recovery and energy may be impacted today.
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

  button: {
    backgroundColor: "#2dd4bf",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
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