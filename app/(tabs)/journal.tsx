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

type Question = {
  id: string;
  text: string;
};

type JournalEntry = {
  id: string;
  date: string;
  questions: Question[];
  answers: Record<string, string>;
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

const POSITIONS = [
  "striker",
  "winger",
  "midfielder",
  "defender",
  "goalkeeper",
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

    bank.push({
      id: `skill-impact-${skillIndex}`,
      text: `How did your ${skill} affect your performance today?`,
    });

    bank.push({
      id: `skill-standard-${skillIndex}`,
      text: `What standard do you want to set for your ${skill} next time?`,
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

    bank.push({
      id: `moment-mindset-${momentIndex}`,
      text: `What was your mindset during the ${moment}?`,
    });
  });

  POSITIONS.forEach((position, positionIndex) => {
    bank.push({
      id: `position-role-${positionIndex}`,
      text: `As a ${position}, what did you do today that helped your team?`,
    });

    bank.push({
      id: `position-improve-${positionIndex}`,
      text: `As a ${position}, what is one part of your role you want to improve?`,
    });

    bank.push({
      id: `position-confidence-${positionIndex}`,
      text: `As a ${position}, what action would help you play with more confidence next time?`,
    });
  });

  SKILLS.forEach((skill, skillIndex) => {
    MOMENTS.forEach((moment, momentIndex) => {
      bank.push({
        id: `combo-use-${skillIndex}-${momentIndex}`,
        text: `During the ${moment}, how did you use your ${skill}?`,
      });

      bank.push({
        id: `combo-better-${skillIndex}-${momentIndex}`,
        text: `During the ${moment}, what would better ${skill} have helped you do?`,
      });
    });
  });

  const unique = new Map<string, Question>();

  bank.forEach((question) => {
    const key = question.text.toLowerCase().trim();

    if (!unique.has(key)) {
      unique.set(key, question);
    }
  });

  return Array.from(unique.values());
}

const QUESTION_BANK = buildQuestionBank();

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function createGeneratedQuestions(count: number, startNumber: number) {
  const generated: Question[] = [];

  for (let i = 0; i < count; i++) {
    const uniqueNumber = startNumber + i + 1;
    const skill = SKILLS[uniqueNumber % SKILLS.length];
    const moment = MOMENTS[(uniqueNumber * 3) % MOMENTS.length];

    generated.push({
      id: `generated-${uniqueNumber}-${Date.now()}-${i}`,
      text: `Reflection ${uniqueNumber}: During the ${moment}, what is one way you can improve your ${skill} next session?`,
    });
  }

  return generated;
}

async function getFreshQuestions(seenQuestionIds: string[]) {
  const availableQuestions = QUESTION_BANK.filter(
    (question) => !seenQuestionIds.includes(question.id)
  );

  let nextQuestions = shuffle(availableQuestions).slice(0, QUESTIONS_PER_ENTRY);

  if (nextQuestions.length < QUESTIONS_PER_ENTRY) {
    const needed = QUESTIONS_PER_ENTRY - nextQuestions.length;
    nextQuestions = [
      ...nextQuestions,
      ...createGeneratedQuestions(needed, seenQuestionIds.length),
    ];
  }

  const updatedSeenIds = Array.from(
    new Set([...seenQuestionIds, ...nextQuestions.map((question) => question.id)])
  );

  await AsyncStorage.setItem("seenQuestionIds", JSON.stringify(updatedSeenIds));

  return {
    questions: nextQuestions,
    seenIds: updatedSeenIds,
  };
}

export default function JournalScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const savedSeenQuestions = await AsyncStorage.getItem("seenQuestionIds");
    const savedSeenIds: string[] = savedSeenQuestions
      ? JSON.parse(savedSeenQuestions)
      : [];

    const fresh = await getFreshQuestions(savedSeenIds);

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
    const hasAnswer = Object.values(answers).some(
      (answer) => answer.trim().length > 0
    );

    if (!hasAnswer) {
      Alert.alert("Add a reflection", "Answer at least one question before saving.");
      return;
    }

    const savedEntries = await AsyncStorage.getItem("journalEntries");
    const oldEntries: JournalEntry[] = savedEntries ? JSON.parse(savedEntries) : [];

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      questions,
      answers,
    };

    await AsyncStorage.setItem(
      "journalEntries",
      JSON.stringify([newEntry, ...oldEntries])
    );

    const fresh = await getFreshQuestions(seenQuestionIds);

    setAnswers({});
    setQuestions(fresh.questions);
    setSeenQuestionIds(fresh.seenIds);

    Alert.alert("Saved", "Two new soccer questions are ready.");
  };

  const getDifferentQuestions = async () => {
    const fresh = await getFreshQuestions(seenQuestionIds);

    setAnswers({});
    setQuestions(fresh.questions);
    setSeenQuestionIds(fresh.seenIds);
  };

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
            <Text style={styles.screenTitle}>Journal</Text>
            <Text style={styles.screenSubtitle}>
              Reflect with two new soccer questions after every entry.
            </Text>
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

            <TouchableOpacity style={styles.saveButton} onPress={saveEntry}>
              <Text style={styles.saveButtonText}>
                Save Entry + New Questions
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
  container: {
    padding: 18,
    paddingBottom: 120,
  },
  header: {
    marginTop: 6,
    marginBottom: 16,
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