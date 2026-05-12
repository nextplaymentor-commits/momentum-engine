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

import {
  clearAthleteSession,
  getAthleteSession,
  saveAthleteSession,
} from "../../lib/athleteSession";

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
];

const QUESTION_BANK = [...CORE_QUESTIONS];

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

  const nextQuestions = shuffle(availableQuestions).slice(
    0,
    QUESTIONS_PER_ENTRY
  );

  const updatedSeenIds = Array.from(
    new Set([
      ...savedSeenIds,
      ...nextQuestions.map((question) => question.id),
    ])
  );

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(updatedSeenIds)
  );

  return {
    questions: nextQuestions,
    seenIds: updatedSeenIds,
  };
}

export default function JournalScreen() {
  const [accessCode, setAccessCode] = useState("");

  const [activeAthlete, setActiveAthlete] =
    useState<AthleteAccess | null>(null);

  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isCheckingSavedSession, setIsCheckingSavedSession] =
    useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [seenQuestionIds, setSeenQuestionIds] = useState<
    string[]
  >([]);

  const playerName =
    activeAthlete?.player_name || "Athlete";

  useEffect(() => {
    const loadSavedAthlete = async () => {
      const savedAthlete = await getAthleteSession();

      if (savedAthlete) {
        setActiveAthlete(savedAthlete);
      }

      setIsCheckingSavedSession(false);
    };

    loadSavedAthlete();
  }, []);

  useEffect(() => {
    if (activeAthlete) {
      loadQuestions();
    }
  }, [activeAthlete]);

  const unlockJournal = async () => {
    const cleanCode = accessCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert(
        "Access Required",
        "Enter your athlete access code."
      );
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
      Alert.alert(
        "Invalid Code",
        "Please enter the correct athlete access code."
      );
      return;
    }

    if (data.status === "inactive") {
      Alert.alert(
        "Inactive Athlete",
        "This athlete is currently inactive."
      );
      return;
    }

    setActiveAthlete(data);

    await saveAthleteSession(data);
  };

  const lockJournal = async () => {
    await clearAthleteSession();

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

  const updateAnswer = (
    questionId: string,
    answer: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const saveEntry = async () => {
    if (!activeAthlete) {
      Alert.alert(
        "Access Required",
        "Enter your athlete code first."
      );
      return;
    }

    const hasAnswer = Object.values(answers).some(
      (answer) => answer.trim().length > 0
    );

    if (!hasAnswer) {
      Alert.alert(
        "Add a reflection",
        "Answer at least one question."
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("journal_entries")
      .insert([
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

    Alert.alert(
      "Saved",
      "Journal saved successfully."
    );
  };

  const getDifferentQuestions = async () => {
    const fresh = await getFreshQuestions(playerName);

    setAnswers({});
    setQuestions(fresh.questions);
    setSeenQuestionIds(fresh.seenIds);
  };

  if (isCheckingSavedSession) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <Text style={styles.loadingText}>
            Loading athlete...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeAthlete) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          <View style={styles.lockCard}>
            <Text style={styles.smallTitle}>
              JOURNAL
            </Text>

            <Text style={styles.title}>
              Athlete Journal
            </Text>

            <Text style={styles.subtitle}>
              Enter your athlete code once.
              Momentum Engine will remember you.
            </Text>

            <TextInput
              value={accessCode}
              onChangeText={(text) =>
                setAccessCode(text.toUpperCase())
              }
              placeholder="Enter access code"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              style={styles.lockInput}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                unlocking && styles.disabledButton,
              ]}
              onPress={unlockJournal}
              disabled={unlocking}
            >
              <Text style={styles.saveButtonText}>
                {unlocking
                  ? "Checking..."
                  : "Open My Journal"}
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
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.container}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.screenTitle}>
                Journal
              </Text>

              <Text style={styles.screenSubtitle}>
                {playerName}'s private reflection
                space.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={lockJournal}
            >
              <Text style={styles.switchButtonText}>
                Switch
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>
                Today’s Reflection
              </Text>

              <Text style={styles.heroTitle}>
                2 Questions
              </Text>

              <Text style={styles.heroText}>
                Answer, save, and Momentum Engine
                will unlock a fresh set.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            {questions.map((question, index) => (
              <View
                key={question.id}
                style={styles.questionBox}
              >
                <Text style={styles.questionText}>
                  {index + 1}. {question.text}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Write your answer..."
                  placeholderTextColor="#73849c"
                  multiline
                  value={answers[question.id] || ""}
                  onChangeText={(text) =>
                    updateAnswer(question.id, text)
                  }
                />
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={saveEntry}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving
                  ? "Saving..."
                  : "Save Entry"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={getDifferentQuestions}
            >
              <Text style={styles.secondaryButtonText}>
                Different Questions
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

  loadingText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
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
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  screenTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
  },

  screenSubtitle: {
    color: COLORS.muted,
    fontSize: 15,
    marginTop: 4,
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
  },

  heroLabel: {
    color: "#dbeafe",
    fontSize: 14,
    fontWeight: "800",
  },

  heroTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },

  heroText: {
    color: "#dbeafe",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  questionBox: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },

  questionText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 12,
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