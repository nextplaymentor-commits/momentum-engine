import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type AthleteAccess = {
  id?: string;
  access_code: string;
  player_name: string;
  status?: string;
};

type Question = {
  id: string;
  text: string;
};

const QUESTIONS_PER_ENTRY = 2;

const CORE_QUESTIONS: Question[] = [
  { id: "core-1", text: "What was your best soccer moment today?" },
  { id: "core-2", text: "What did you do today that showed confidence?" },
  { id: "core-3", text: "What mistake did you make, and what did it teach you?" },
  { id: "core-4", text: "What is one small win you are proud of today?" },
  { id: "core-5", text: "How did you respond after losing the ball?" },
  { id: "core-6", text: "How did you respond after making a mistake?" },
  { id: "core-7", text: "What is one habit you want to repeat next session?" },
  { id: "core-8", text: "What did you learn about yourself as a player today?" },
  { id: "core-9", text: "When did you demand the ball today?" },
  { id: "core-10", text: "When did you play forward instead of playing safe?" },
  { id: "core-11", text: "When did you show bravery on the ball today?" },
  { id: "core-12", text: "What action proved that you are improving?" },
  { id: "core-13", text: "How was your first touch today?" },
  { id: "core-14", text: "Did you use both feet today? Give one example." },
  { id: "core-15", text: "What technical skill felt sharp today?" },
  { id: "core-16", text: "What technical skill needs more work?" },
  { id: "core-17", text: "Did you scan before receiving the ball? Give one example." },
  { id: "core-18", text: "How was your movement off the ball?" },
  { id: "core-19", text: "Did you create space for yourself today?" },
  { id: "core-20", text: "How was your communication today?" },
  { id: "core-21", text: "Did you encourage a teammate today?" },
  { id: "core-22", text: "Did you ask for the ball with your voice?" },
  { id: "core-23", text: "Did you recover defensively after attacking?" },
  { id: "core-24", text: "Did you track your runner today?" },
  { id: "core-25", text: "How was your energy before training?" },
  { id: "core-26", text: "How was your energy after training?" },
  { id: "core-27", text: "Did you eat well before playing?" },
  { id: "core-28", text: "Did you drink enough water today?" },
  { id: "core-29", text: "How was your sleep last night?" },
  { id: "core-30", text: "What recovery do you need tonight?" },
];

const SKILLS = [
  "first touch",
  "passing accuracy",
  "scanning",
  "communication",
  "one-on-one attacking",
  "one-on-one defending",
  "finishing",
  "crossing",
  "movement off the ball",
  "body shape",
  "speed of play",
  "decision-making",
  "pressing",
  "recovery runs",
  "confidence",
  "composure",
  "weak foot",
  "ball protection",
  "turning under pressure",
  "playing forward",
  "supporting angles",
  "checking your shoulder",
  "receiving under pressure",
  "creating space",
  "defensive tracking",
  "attacking the box",
  "quick passing",
  "shooting technique",
  "defensive positioning",
  "team leadership",
];

const MOMENTS = [
  "warmup",
  "first 10 minutes",
  "final 10 minutes",
  "moment you felt tired",
  "moment after losing the ball",
  "moment after winning the ball",
  "moment you received under pressure",
  "moment you attacked",
  "moment you defended",
  "transition moment",
  "moment near goal",
  "middle-third moment",
  "one-on-one moment",
  "moment you had to communicate",
  "moment you had space",
  "moment you had no space",
  "moment your team needed energy",
  "moment you made a mistake",
  "moment you had to make a quick decision",
  "moment your team was under pressure",
];

function buildQuestionBank() {
  const bank: Question[] = [...CORE_QUESTIONS];

  SKILLS.forEach((skill, skillIndex) => {
    bank.push({
      id: `skill-action-${skillIndex}`,
      text: `What is one thing you did today to improve your ${skill}?`,
    });

    bank.push({
      id: `skill-rep-${skillIndex}`,
      text: `What is one specific rep you can do next session to improve your ${skill}?`,
    });
  });

  MOMENTS.forEach((moment, momentIndex) => {
    bank.push({
      id: `moment-good-${momentIndex}`,
      text: `What did you do well during the ${moment}?`,
    });

    bank.push({
      id: `moment-improve-${momentIndex}`,
      text: `What could you improve during the ${moment} next time?`,
    });
  });

  return bank;
}

const QUESTION_BANK = buildQuestionBank();

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

async function getFreshQuestions(playerName: string) {
  const storageKey = `seenQuestionIds-${playerName}`;
  const savedSeenQuestions = await AsyncStorage.getItem(storageKey);
  const savedSeenIds: string[] = savedSeenQuestions
    ? JSON.parse(savedSeenQuestions)
    : [];

  let availableQuestions = QUESTION_BANK.filter(
    (question) => !savedSeenIds.includes(question.id)
  );

  if (availableQuestions.length < QUESTIONS_PER_ENTRY) {
    availableQuestions = QUESTION_BANK;
  }

  const nextQuestions = shuffle(availableQuestions).slice(0, QUESTIONS_PER_ENTRY);

  const updatedSeenIds = Array.from(
    new Set([...savedSeenIds, ...nextQuestions.map((question) => question.id)])
  );

  await AsyncStorage.setItem(storageKey, JSON.stringify(updatedSeenIds));

  return {
    questions: nextQuestions,
    seenIds: updatedSeenIds,
  };
}

export default function JournalScreen() {
  const [accessCode, setAccessCode] = useState("");
  const [activeAthlete, setActiveAthlete] = useState<AthleteAccess | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);

  const playerName = activeAthlete?.player_name || "Athlete";

  useEffect(() => {
    if (activeAthlete) {
      loadQuestions();
    }
  }, [activeAthlete]);

  const unlockJournal = async () => {
    const cleanCode = accessCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert("Access Required", "Enter your athlete access code.");
      return;
    }

    setUnlocking(true);

    const { data, error } = await supabase
      .from("athlete_profiles")
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
  };

  const lockJournal = () => {
    setAccessCode("");
    setActiveAthlete(null);
    setQuestions([]);
    setAnswers({});
    setSeenQuestionIds([]);
  };

  const loadQuestions = async () => {
    const fresh = await getFreshQuestions(playerName);

    setQuestions(fresh.questions);
    setSeenQuestionIds(fresh.seenIds);
  };

  const updateAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const saveEntry = async () => {
    if (!activeAthlete) {
      Alert.alert("Access Required", "Enter your athlete code first.");
      return;
    }

    const hasAnswer = Object.values(answers).some(
      (answer) => answer.trim().length > 0
    );

    if (!hasAnswer) {
      Alert.alert("Add a reflection", "Answer at least one question before saving.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("journal_entries").insert([
      {
        player_name: playerName,
        questions,
        answers,
      },
    ]);

    setSaving(false);

    if (error) {
      Alert.alert("Save Failed", error.message);
      return;
    }

    const fresh = await getFreshQuestions(playerName);

    setAnswers({});
    setQuestions(fresh.questions);
    setSeenQuestionIds(fresh.seenIds);

    Alert.alert("Saved", "Journal saved. Two new soccer questions are ready.");
  };

  const getDifferentQuestions = async () => {
    const fresh = await getFreshQuestions(playerName);

    setAnswers({});
    setQuestions(fresh.questions);
    setSeenQuestionIds(fresh.seenIds);
  };

  if (!activeAthlete) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <View style={styles.lockCard}>
            <Text style={styles.smallTitle}>JOURNAL</Text>
            <Text style={styles.title}>Athlete Journal</Text>
            <Text style={styles.subtitle}>
              Enter your athlete code to save your own private journal entries.
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
              style={[styles.saveButton, unlocking && styles.disabledButton]}
              onPress={unlockJournal}
              disabled={unlocking}
            >
              <Text style={styles.saveButtonText}>
                {unlocking ? "Checking..." : "Open My Journal"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.screenTitle}>Journal</Text>
              <Text style={styles.screenSubtitle}>
                {playerName}'s private reflection space.
              </Text>
            </View>

            <TouchableOpacity style={styles.switchButton} onPress={lockJournal}>
              <Text style={styles.switchButtonText}>Switch</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>Today’s Reflection</Text>
              <Text style={styles.heroTitle}>2 Questions</Text>
              <Text style={styles.heroText}>
                Answer, save, and Momentum Engine will unlock a fresh set.
              </Text>
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>2</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Journal Entry</Text>
                <Text style={styles.cardSub}>
                  Questions shown: {seenQuestionIds.length}
                </Text>
              </View>
            </View>

            {questions.map((question, index) => (
              <View key={question.id} style={styles.questionBox}>
                <View style={styles.questionHeader}>
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberText}>{index + 1}</Text>
                  </View>

                  <Text style={styles.questionText}>{question.text}</Text>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Write your answer here..."
                  placeholderTextColor="#73849c"
                  value={answers[question.id] || ""}
                  onChangeText={(text) => updateAnswer(question.id, text)}
                  multiline
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={saveEntry}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Entry + New Questions"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={getDifferentQuestions}
            >
              <Text style={styles.secondaryButtonText}>
                Give Me Different Questions
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  background: "#04111f",
  card: "#0b182b",
  cardSoft: "#0f1d33",
  border: "#1f3555",
  text: "#ffffff",
  muted: "#9fb0c8",
  blue: "#2563eb",
  green: "#2dd4bf",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboard: {
    flex: 1,
  },

  lockContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },

  lockCard: {
    backgroundColor: COLORS.card,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  smallTitle: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },

  title: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 18,
  },

  lockInput: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    color: COLORS.text,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },

  container: {
    padding: 18,
    paddingBottom: 120,
  },

  header: {
    marginTop: 6,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  screenTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  screenSubtitle: {
    color: COLORS.muted,
    fontSize: 15,
    marginTop: 4,
    lineHeight: 22,
  },

  switchButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  switchButtonText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 13,
  },

  heroCard: {
    backgroundColor: COLORS.blue,
    borderRadius: 30,
    padding: 22,
    marginBottom: 16,
    minHeight: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroLabel: {
    color: "#dbeafe",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  heroTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
  },

  heroText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 220,
  },

  heroBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadgeText: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: "900",
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  cardHeader: {
    marginBottom: 16,
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },

  cardSub: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },

  questionBox: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },

  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  numberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },

  numberText: {
    color: "#03111d",
    fontSize: 14,
    fontWeight: "900",
  },

  questionText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    flex: 1,
  },

  input: {
    backgroundColor: "#020817",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 105,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    lineHeight: 22,
  },

  saveButton: {
    backgroundColor: COLORS.green,
    borderRadius: 22,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 4,
  },

  saveButtonText: {
    color: "#03111d",
    fontSize: 16,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: "900",
  },
});