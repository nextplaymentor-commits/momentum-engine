import { useMemo, useState } from "react";
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

import { supabase } from "../../lib/supabase";

type Position = "Striker" | "Winger" | "Midfielder" | "Defender" | "Goalkeeper";
type DayType = "Training" | "Match" | "Off";
type TrainingLoad = "None" | "Light" | "Full";

type MetricState = {
  sleep: number;
  energy: number;
  focus: number;
  nutrition: number;
  confidence: number;
  stress: number;
  soreness: number;
};

type PlanResult = {
  score: number;
  readinessLabel: string;
  coachFeedback: string;
  riskText: string;
  priorityActions: string[];
  trainingPlan: string;
  fuelPlan: string;
  recoveryPlan: string;
  mindsetPlan: string;
  journalPrompts: string[];
};

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

function calculatePlan(
  playerName: string,
  position: Position,
  dayType: DayType,
  trainingLoad: TrainingLoad,
  metrics: MetricState
): PlanResult {
  const sorenessScore = 10 - metrics.soreness;
  const stressScore = 10 - metrics.stress;

  const readinessRaw =
    metrics.sleep * 0.2 +
    metrics.energy * 0.2 +
    metrics.focus * 0.15 +
    metrics.nutrition * 0.15 +
    metrics.confidence * 0.15 +
    sorenessScore * 0.1 +
    stressScore * 0.05;

  const score = clamp(Math.round(readinessRaw * 10), 0, 100);
  const name = playerName.trim() || "Athlete";

  const readinessLabel =
    score >= 90
      ? "Ready to Go"
      : score >= 75
      ? "Solid Readiness"
      : score >= 60
      ? "Moderate Readiness"
      : score >= 40
      ? "Recovery Focus"
      : "Recharge Needed";

  let riskText = "Low Risk";

  if (
    metrics.stress >= 8 ||
    metrics.soreness >= 8 ||
    (metrics.sleep > 0 && metrics.sleep <= 4) ||
    score < 60
  ) {
    riskText = "High Risk";
  } else if (
    metrics.stress >= 5 ||
    metrics.soreness >= 5 ||
    (metrics.sleep > 0 && metrics.sleep <= 6) ||
    score < 75
  ) {
    riskText = "Moderate Risk";
  }

  const priorityActions: string[] = [];

  if (metrics.soreness >= 7) {
    priorityActions.push("Soreness: Keep the load low. Mobility, hydration, and no extra impact today.");
  }

  if (metrics.stress >= 7) {
    priorityActions.push("Stress: Slow the day down. Breathe, reset, and keep training simple.");
  }

  if (metrics.sleep > 0 && metrics.sleep <= 6) {
    priorityActions.push("Sleep: Protect recovery tonight. No extra work late.");
  }

  if (metrics.nutrition > 0 && metrics.nutrition <= 5) {
    priorityActions.push("Nutrition: Get carbs, protein, fruit, and water in today.");
  }

  if (metrics.confidence > 0 && metrics.confidence <= 5) {
    priorityActions.push("Confidence: Focus on one small win early.");
  }

  if (priorityActions.length === 0) {
    priorityActions.push("Body: You are in a solid spot. Keep the standard high.");
    priorityActions.push("Mindset: Start sharp and stay locked into the details.");
  }

  const positionFocus: Record<Position, string> = {
    Striker:
      "Striker Focus: finishing, checking runs, timing runs behind, and staying aggressive in the box.",
    Winger:
      "Winger Focus: 1v1 attacking, first touch forward, crossing, cut-inside shots, and recovery runs.",
    Midfielder:
      "Midfielder Focus: scanning, playing on the half-turn, wall passes, switches, and quick decisions.",
    Defender:
      "Defender Focus: body shape, 1v1 defending, clearances, communication, and winning first contact.",
    Goalkeeper:
      "Goalkeeper Focus: footwork, set position, catching, distribution, communication, and reactions.",
  };

  let dayPlan = "";

  if (dayType === "Match") {
    dayPlan =
      "Match Day Plan: arrive early, eat 2–3 hours before, visualize your first 3 actions, communicate early, play simple for the first 5 minutes, and win your first duel.";
  }

  if (dayType === "Training") {
    dayPlan =
      "Training Day Plan: focus on quality reps, strong habits, clean technique, communication, and one position-specific detail.";
  }

  if (dayType === "Off") {
    dayPlan =
      "Off Day Plan: no hard training. Walk 15–20 minutes, stretch, hydrate, eat well, and mentally reset.";
  }

  let loadPlan = "";

  if (trainingLoad === "Full") {
    loadPlan =
      "Full Load: warm up properly, complete your main training block, push intensity, then cool down and recover.";
  }

  if (trainingLoad === "Light") {
    loadPlan =
      "Light Load: keep it technical. Ball touches, passing, mobility, light movement, and no extra conditioning.";
  }

  if (trainingLoad === "None") {
    loadPlan =
      "No Load: recovery only. Stretch, walk, hydrate, journal, and prepare for the next session.";
  }

  let trainingPlan = `${positionFocus[position]} ${dayPlan} ${loadPlan}`;

  if (dayType === "Off") {
    trainingPlan = `${dayPlan} ${loadPlan} If you touch a ball, keep it easy: juggling, light wall passes, or simple technical touches only.`;
  }

  let fuelPlan = "Eat balanced today: protein, carbs, fruit, vegetables, and water.";

  if (dayType === "Match") {
    fuelPlan =
      "Match Fuel: oatmeal, toast, eggs, chicken/rice, pasta, banana, yogurt, and water. Eat 2–3 hours before the game.";
  }

  if (dayType === "Training") {
    fuelPlan =
      "Training Fuel: carbs before training, protein after, fruit for energy, and water throughout the day.";
  }

  if (dayType === "Off") {
    fuelPlan =
      "Off Day Fuel: eat clean and recover. Protein, carbs, fruit, vegetables, and plenty of water. Do not skip meals.";
  }

  if (metrics.nutrition > 0 && metrics.nutrition <= 5) {
    fuelPlan =
      "Nutrition Fix: get real food in today. Protein + carbs first: eggs/toast, chicken/rice, pasta, fruit, yogurt, or potatoes.";
  }

  let recoveryPlan = "Stretch calves, hamstrings, hips, and quads for 10 minutes. Hydrate and sleep on time.";

  if (dayType === "Match") {
    recoveryPlan =
      "Post-Match Recovery: cooldown walk, stretch, hydrate, eat protein + carbs, and sleep early.";
  }

  if (dayType === "Training") {
    recoveryPlan =
      "Training Recovery: cooldown, stretch sore areas, hydrate, eat a recovery meal, and avoid extra work if your body feels heavy.";
  }

  if (dayType === "Off") {
    recoveryPlan =
      "Off Day Recovery: mobility, hydration, light walk, mental reset, and no extra hard work.";
  }

  if (metrics.soreness >= 7) {
    recoveryPlan =
      "Soreness Recovery: take it seriously. Mobility, hydration, stretching, and no extra high-impact work today.";
  }

  if (metrics.stress >= 7) {
    recoveryPlan =
      "Stress Recovery: keep today calm. Deep breathing, light movement, hydration, and early sleep.";
  }

  let mindsetPlan = "";

  if (dayType === "Match") {
    mindsetPlan =
      "Mindset: compete first, then settle in. Win your first action, communicate, and do not chase perfection.";
  }

  if (dayType === "Training") {
    mindsetPlan =
      "Mindset: train with purpose. Pick one detail and attack it the whole session.";
  }

  if (dayType === "Off") {
    mindsetPlan =
      "Mindset: recovery is work too. Use today to reset your body and clear your mind.";
  }

  if (metrics.confidence > 0 && metrics.confidence <= 5) {
    mindsetPlan =
      "Mindset: keep it simple. One good touch, one good pass, one good decision. Build confidence through action.";
  }

  const journalPrompts: string[] = [];

  if (dayType === "Off") {
    journalPrompts.push(
      "What did my body need today?",
      "What helped me recover mentally?",
      "What can I do tonight to be ready for the next session?"
    );
  }

  if (dayType === "Training") {
    journalPrompts.push(
      "What did I improve today?",
      "What was hard about training?",
      "What detail do I want to sharpen next time?"
    );
  }

  if (dayType === "Match") {
    journalPrompts.push(
      "What moment changed the game today?",
      "How was my confidence under pressure?",
      "What would I do differently next match?"
    );
  }

  if (position === "Striker") {
    journalPrompts.push("Did I stay aggressive and make dangerous runs?");
  }

  if (position === "Winger") {
    journalPrompts.push("Did I attack defenders with confidence?");
  }

  if (position === "Midfielder") {
    journalPrompts.push("Did I scan before receiving the ball?");
  }

  if (position === "Defender") {
    journalPrompts.push("Did I communicate and stay locked in defensively?");
  }

  if (position === "Goalkeeper") {
    journalPrompts.push("Did I stay vocal, organized, and ready?");
  }

  let coachFeedback = `${name}, follow the plan for your ${dayType.toLowerCase()} day.`;

  if (dayType === "Off") {
    coachFeedback = `${name}, today is not about doing more. It is about recovering right so you can come back sharper.`;
  } else if (dayType === "Match") {
    coachFeedback = `${name}, today is game day. Keep it simple early, compete, and trust your work.`;
  } else if (dayType === "Training") {
    coachFeedback = `${name}, train with purpose today. One detail, full focus, clean reps.`;
  }

  if (score < 60) {
    coachFeedback = `${name}, your readiness is low today. Be smart with your body and prioritize recovery.`;
  }

  return {
    score,
    readinessLabel,
    coachFeedback,
    riskText,
    priorityActions: priorityActions.slice(0, 4),
    trainingPlan,
    fuelPlan,
    recoveryPlan,
    mindsetPlan,
    journalPrompts,
  };
}

function Chip({
  label,
  selected,
  onPress,
  color = "#2dd4bf",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MetricBox({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}/10</Text>

      <View style={styles.metricButtons}>
        <TouchableOpacity style={styles.miniButton} onPress={onMinus}>
          <Text style={styles.miniButtonText}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.miniButton} onPress={onPlus}>
          <Text style={styles.miniButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PlanTile({
  title,
  text,
  wide = false,
}: {
  title: string;
  text: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.planTile, wide && styles.planTileWide]}>
      <Text style={styles.planTileTitle}>{title}</Text>
      <Text style={styles.planTileText}>{text}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [playerName, setPlayerName] = useState("Rey");
  const [position, setPosition] = useState<Position>("Midfielder");
  const [dayType, setDayType] = useState<DayType>("Match");
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoad>("Full");
  const [hasChecked, setHasChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [metrics, setMetrics] = useState<MetricState>({
    sleep: 0,
    energy: 0,
    focus: 0,
    nutrition: 0,
    confidence: 0,
    stress: 0,
    soreness: 0,
  });

  const livePlan = useMemo(() => {
    return calculatePlan(playerName, position, dayType, trainingLoad, metrics);
  }, [playerName, position, dayType, trainingLoad, metrics]);

  const plan = hasChecked ? livePlan : null;

  const updateMetric = (key: keyof MetricState, change: number) => {
    setMetrics((prev) => ({
      ...prev,
      [key]: clamp(prev[key] + change, 0, 10),
    }));
  };

  const checkReadiness = async () => {
    setHasChecked(true);
    setIsSaving(true);

    const result = calculatePlan(
      playerName,
      position,
      dayType,
      trainingLoad,
      metrics
    );

    const { error } = await supabase.from("check_ins").insert([
      {
        player_name: playerName.trim() || "Athlete",
        position,
        day_type: dayType,
        training_load: trainingLoad,

        sleep: metrics.sleep,
        energy: metrics.energy,
        focus: metrics.focus,
        nutrition: metrics.nutrition,
        confidence: metrics.confidence,
        stress: metrics.stress,
        soreness: metrics.soreness,

        score: result.score,
        readiness_label: result.readinessLabel,
        risk_text: result.riskText,
        coach_feedback: result.coachFeedback,
      },
    ]);

    setIsSaving(false);

    if (error) {
      console.log("Supabase save error:", error.message);
      Alert.alert("Check-In Failed", error.message || "Could not save check-in.");
      return;
    }

    Alert.alert("Check-In Saved", "Your readiness data was saved successfully.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Momentum Engine</Text>
            <Text style={styles.appSubtitle}>
              {playerName || "Athlete"}'s performance hub
            </Text>
          </View>
        </View>

        <View style={styles.readinessCard}>
          <View style={styles.readinessLeft}>
            <Text style={styles.readinessLabel}>Today’s Readiness</Text>
            <Text style={styles.readinessTitle}>
              {plan ? plan.readinessLabel : "Not Checked Yet"}
            </Text>
            <Text style={styles.readinessSub}>
              {plan
                ? `${plan.riskText} — follow today’s plan.`
                : "Start at 0. Adjust your check-in, then tap Check Readiness."}
            </Text>
          </View>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreText}>{plan ? plan.score : 0}</Text>
          </View>
        </View>

        <View style={styles.controlPanel}>
          <View style={styles.setupColumn}>
            <Text style={styles.cardTitle}>Player Setup</Text>

            <TextInput
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Player name"
              placeholderTextColor="#73849c"
              style={styles.input}
            />

            <Text style={styles.label}>Position</Text>
            <View style={styles.chipWrap}>
              {(["Striker", "Winger", "Midfielder", "Defender", "Goalkeeper"] as Position[]).map(
                (item) => (
                  <Chip
                    key={item}
                    label={item}
                    selected={position === item}
                    onPress={() => setPosition(item)}
                  />
                )
              )}
            </View>

            <Text style={styles.label}>Day</Text>
            <View style={styles.chipWrap}>
              {(["Training", "Match", "Off"] as DayType[]).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={dayType === item}
                  onPress={() => setDayType(item)}
                  color={item === "Match" ? "#fbbf24" : "#2dd4bf"}
                />
              ))}
            </View>

            <Text style={styles.label}>Load</Text>
            <View style={styles.chipWrap}>
              {(["None", "Light", "Full"] as TrainingLoad[]).map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={trainingLoad === item}
                  onPress={() => setTrainingLoad(item)}
                  color={item === "Full" ? "#fbbf24" : "#2dd4bf"}
                />
              ))}
            </View>
          </View>

          <View style={styles.checkColumn}>
            <Text style={styles.cardTitle}>Daily Check-In</Text>

            <View style={styles.metricsGrid}>
              <MetricBox label="Sleep" value={metrics.sleep} onMinus={() => updateMetric("sleep", -1)} onPlus={() => updateMetric("sleep", 1)} />
              <MetricBox label="Energy" value={metrics.energy} onMinus={() => updateMetric("energy", -1)} onPlus={() => updateMetric("energy", 1)} />
              <MetricBox label="Focus" value={metrics.focus} onMinus={() => updateMetric("focus", -1)} onPlus={() => updateMetric("focus", 1)} />
              <MetricBox label="Nutrition" value={metrics.nutrition} onMinus={() => updateMetric("nutrition", -1)} onPlus={() => updateMetric("nutrition", 1)} />
              <MetricBox label="Confidence" value={metrics.confidence} onMinus={() => updateMetric("confidence", -1)} onPlus={() => updateMetric("confidence", 1)} />
              <MetricBox label="Stress" value={metrics.stress} onMinus={() => updateMetric("stress", -1)} onPlus={() => updateMetric("stress", 1)} />
              <MetricBox label="Soreness" value={metrics.soreness} onMinus={() => updateMetric("soreness", -1)} onPlus={() => updateMetric("soreness", 1)} />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkButton, isSaving && styles.checkButtonDisabled]}
          onPress={checkReadiness}
          disabled={isSaving}
        >
          <Text style={styles.checkButtonText}>
            {isSaving ? "Saving..." : hasChecked ? "Update Readiness" : "Check Readiness"}
          </Text>
        </TouchableOpacity>

        <View style={styles.planBoard}>
          <View style={styles.planBoardHeader}>
            <Text style={styles.planBoardTitle}>Today’s Plan Board</Text>
            <Text style={styles.planBoardSub}>
              {plan
                ? `Built for ${position} • ${dayType} Day • ${trainingLoad} Load`
                : "Plan is locked until you check readiness."}
            </Text>
          </View>

          {plan ? (
            <View style={styles.planGrid}>
              <PlanTile wide title="Coach Note" text={plan.coachFeedback} />

              <PlanTile title="Priority 1" text={plan.priorityActions[0]} />

              <PlanTile title="Priority 2" text={plan.priorityActions[1]} />

              <PlanTile wide title="Training / Day Plan" text={plan.trainingPlan} />

              <PlanTile title="Fuel" text={plan.fuelPlan} />

              <PlanTile title="Recovery" text={plan.recoveryPlan} />

              <PlanTile wide title="Mindset" text={plan.mindsetPlan} />

              <PlanTile
                wide
                title="Journal Prompts"
                text={plan.journalPrompts.join("\n\n")}
              />
            </View>
          ) : (
            <View style={styles.emptyPlan}>
              <Text style={styles.emptyTitle}>No plan yet</Text>
              <Text style={styles.emptyText}>
                Set the player, day, load, and check-in scores. Then tap Check
                Readiness.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  yellow: "#fbbf24",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 18,
    paddingBottom: 120,
  },
  header: {
    marginTop: 6,
    marginBottom: 16,
  },
  appTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  appSubtitle: {
    color: COLORS.muted,
    fontSize: 15,
    marginTop: 4,
  },
  readinessCard: {
    backgroundColor: COLORS.blue,
    borderRadius: 30,
    padding: 22,
    marginBottom: 16,
    minHeight: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readinessLeft: {
    flex: 1,
    paddingRight: 14,
  },
  readinessLabel: {
    color: "#dbeafe",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  readinessTitle: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 31,
  },
  readinessSub: {
    color: "#dbeafe",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  scoreCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: "900",
  },
  controlPanel: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  setupColumn: {
    marginBottom: 18,
  },
  checkColumn: {},
  cardTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 14,
  },
  input: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    color: COLORS.text,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  label: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 9,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#061322",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: "#d8e3f5",
    fontSize: 13,
    fontWeight: "900",
  },
  chipTextSelected: {
    color: "#03111d",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricBox: {
    width: "48.5%",
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 13,
    marginBottom: 10,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 3,
    marginBottom: 10,
  },
  metricButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  miniButton: {
    width: 45,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  miniButtonText: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 28,
  },
  checkButton: {
    backgroundColor: COLORS.green,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: "#03111d",
    fontSize: 18,
    fontWeight: "900",
  },
  planBoard: {
    backgroundColor: "#08251f",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.green,
    padding: 16,
  },
  planBoardHeader: {
    marginBottom: 14,
  },
  planBoardTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },
  planBoardSub: {
    color: "#a7f3d0",
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  planGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  planTile: {
    width: "48.5%",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.24)",
    marginBottom: 10,
  },
  planTileWide: {
    width: "100%",
  },
  planTileTitle: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  planTileText: {
    color: "#dcfce7",
    fontSize: 14,
    lineHeight: 21,
  },
  emptyPlan: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.24)",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#a7f3d0",
    fontSize: 15,
    lineHeight: 22,
  },
});