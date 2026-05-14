import { useEffect, useMemo, useState } from "react";
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
import { getMomentumRecommendations } from "../../lib/recommendations";
import { supabase } from "../../lib/supabase";

type Position = "Striker" | "Winger" | "Midfielder" | "Defender" | "Goalkeeper";
type DayType = "Training" | "Match" | "Off";
type TrainingLoad = "None" | "Light" | "Full";

type AthleteAccess = {
  id: string;
  access_code: string;
  player_name: string;
  position?: string;
  status?: string;
};

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
};

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

function normalizePosition(position?: string): Position {
  const clean = position?.trim();

  if (
    clean === "Striker" ||
    clean === "Winger" ||
    clean === "Midfielder" ||
    clean === "Defender" ||
    clean === "Goalkeeper"
  ) {
    return clean;
  }

  return "Midfielder";
}

function getDefaultMetrics(): MetricState {
  return {
    sleep: 5,
    energy: 5,
    focus: 5,
    nutrition: 5,
    confidence: 5,
    stress: 5,
    soreness: 5,
  };
}

function getStatusColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#fbbf24";
  return "#ef4444";
}

function getMissionTitle(score: number, dayType: DayType) {
  if (score < 60) return "Recover Smart";
  if (dayType === "Match") return "Lock In";
  if (dayType === "Off") return "Reset Day";
  return "Train With Purpose";
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
    metrics.sleep <= 4 ||
    score < 60
  ) {
    riskText = "High Risk";
  } else if (
    metrics.stress >= 5 ||
    metrics.soreness >= 5 ||
    metrics.sleep <= 6 ||
    score < 75
  ) {
    riskText = "Moderate Risk";
  }

  const priorityActions: string[] = [];

  if (metrics.soreness >= 7) {
    priorityActions.push("Keep load low today. Mobility, hydration, and no extra impact.");
  }

  if (metrics.stress >= 7) {
    priorityActions.push("Slow the day down. Breathe, reset, and keep training simple.");
  }

  if (metrics.sleep <= 6) {
    priorityActions.push("Protect recovery tonight. No extra work late.");
  }

  if (metrics.nutrition <= 5) {
    priorityActions.push("Eat a real meal: protein, carbs, fruit, and water.");
  }

  if (metrics.confidence <= 5) {
    priorityActions.push("Focus on one small win early.");
  }

  const positionFocus: Record<Position, string> = {
    Striker:
      "20 finishing reps: 10 one-touch, 5 across goal, 5 near-post. Add checking runs and runs behind.",
    Winger:
      "10 1v1 moves, 10 crosses, 10 cut-inside shots, and 6 recovery runs.",
    Midfielder:
      "30 scanning reps, 20 wall passes, 10 half-turn receives, and 10 switches of play.",
    Defender:
      "15 body-shape reps, 10 clearances, 10 1v1 defending reps, and 10 communication commands.",
    Goalkeeper:
      "20 catches, 15 footwork reps, 10 distribution passes, and 10 set-position reactions.",
  };

  const dayPlan =
    dayType === "Match"
      ? "Arrive early, visualize your first 3 actions, play simple early, communicate, and win your first duel."
      : dayType === "Training"
      ? "Focus on quality reps, clean technique, communication, and one position-specific detail."
      : "No hard training. Walk 15–20 minutes, stretch, hydrate, eat well, and mentally reset.";

  const loadPlan =
    trainingLoad === "Full"
      ? "Full load: warm up well, push intensity, then cool down."
      : trainingLoad === "Light"
      ? "Light load: technical touches, passing, mobility, and no extra conditioning."
      : "No load: recovery only. Stretch, walk, hydrate, and prepare for the next session.";

  let trainingPlan = `${positionFocus[position]}\n\n${dayPlan}\n\n${loadPlan}`;

  if (dayType === "Off") {
    trainingPlan = `${dayPlan}\n\n${loadPlan}\n\nOptional: 5 minutes of juggling or light wall passes only. Nothing intense.`;
  }

  let fuelPlan =
    dayType === "Match"
      ? "Breakfast: oatmeal + banana + eggs + water.\n\n2–3 hours before: chicken/rice, pasta with lean meat, or turkey sandwich + fruit.\n\n60 minutes before: banana, granola bar, or yogurt.\n\nAfter: protein + carbs within 45 minutes."
      : dayType === "Training"
      ? "Before training: banana, toast with peanut butter, oatmeal, or rice + eggs.\n\nAfter training: protein + carbs within 30–45 minutes.\n\nHydration: drink 24 oz before noon and 12–16 oz after training."
      : "Breakfast: eggs + oatmeal or toast + fruit.\n\nLunch: chicken/rice/vegetables or turkey sandwich + fruit.\n\nSnack: Greek yogurt, banana, trail mix, or smoothie.\n\nHydration: aim for 60–70 oz today.";

  if (metrics.nutrition <= 5) {
    fuelPlan =
      "Nutrition Fix Today:\n\n1. Eat protein + carbs early.\n2. Do not skip carbs.\n3. Add fruit or yogurt as a snack.\n4. Finish 20–24 oz water before lunch.";
  }

  let recoveryPlan =
    dayType === "Match"
      ? "1. Walk or light jog 5 minutes.\n2. Stretch hips, calves, hamstrings, and quads.\n3. Drink water/electrolytes.\n4. Eat protein + carbs within 45 minutes.\n5. Sleep goal: 8+ hours."
      : dayType === "Training"
      ? "1. Cooldown walk 5 minutes.\n2. Stretch sore areas.\n3. Drink water after training.\n4. Eat recovery meal.\n5. No extra hard work if legs feel heavy."
      : "1. Walk 15–20 minutes.\n2. Stretch hips, calves, hamstrings, and quads.\n3. Hydrate throughout the day.\n4. Light mobility only.\n5. Sleep goal: 8+ hours.";

  if (metrics.soreness >= 7) {
    recoveryPlan =
      "High soreness recovery:\n\n1. No sprinting or jumping.\n2. Mobility 12–15 minutes.\n3. Hydrate early.\n4. Eat protein + carbs.\n5. Sleep early.";
  }

  if (metrics.stress >= 7) {
    recoveryPlan =
      "High stress recovery:\n\n1. Keep training simple.\n2. Take 5 slow breaths before starting.\n3. Walk 10–15 minutes.\n4. Stretch 10 minutes.\n5. Protect sleep.";
  }

  let mindsetPlan =
    dayType === "Match"
      ? "Compete first, then settle in. Win your first action and do not chase perfection."
      : dayType === "Training"
      ? "Train with purpose. Pick one detail and attack it the whole session."
      : "Recovery is work too. Reset your body and clear your mind.";

  if (metrics.confidence <= 5) {
    mindsetPlan =
      "Keep it simple. One good touch, one good pass, one good decision. Build confidence through action.";
  }

  let coachFeedback = `${name}, follow the plan for your ${dayType.toLowerCase()} day.`;

  if (dayType === "Off") {
    coachFeedback = `${name}, today is not about doing more. Recover right so you can come back sharper.`;
  } else if (dayType === "Match") {
    coachFeedback = `${name}, today is game day. Keep it simple early, compete, and trust your work.`;
  } else if (dayType === "Training") {
    coachFeedback = `${name}, train with purpose today. One detail, full focus, clean reps.`;
  }

  if (score < 60) {
    coachFeedback = `${name}, readiness is low today. Be smart with your body and prioritize recovery.`;
  }

  const smartRecommendations = getMomentumRecommendations({
    sleep: metrics.sleep,
    energy: metrics.energy,
    soreness: metrics.soreness,
    stress: metrics.stress,
    confidence: metrics.confidence,
    focus: metrics.focus,
    nutrition: metrics.nutrition,
    dayType:
      dayType === "Match"
        ? "matchday"
        : dayType === "Training"
        ? "training"
        : "offday",
    load:
      trainingLoad === "Full"
        ? "high"
        : trainingLoad === "Light"
        ? "medium"
        : "low",
  });

  priorityActions.push(...smartRecommendations);

  return {
    score,
    readinessLabel,
    coachFeedback,
    riskText,
    priorityActions: [...new Set(priorityActions)].slice(0, 8),
    trainingPlan,
    fuelPlan,
    recoveryPlan,
    mindsetPlan,
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

function PriorityCard({
  number,
  text,
}: {
  number: number;
  text: string;
}) {
  return (
    <View style={styles.priorityCard}>
      <View style={styles.priorityBadge}>
        <Text style={styles.priorityBadgeText}>{number}</Text>
      </View>
      <Text style={styles.priorityText}>{text}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [accessCode, setAccessCode] = useState("");
  const [activeAthlete, setActiveAthlete] = useState<AthleteAccess | null>(null);

  const [position, setPosition] = useState<Position>("Midfielder");
  const [dayType, setDayType] = useState<DayType>("Match");
  const [trainingLoad, setTrainingLoad] = useState<TrainingLoad>("Full");
  const [hasChecked, setHasChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isCheckingSavedSession, setIsCheckingSavedSession] = useState(true);

  const [metrics, setMetrics] = useState<MetricState>(getDefaultMetrics());

  const playerName = activeAthlete?.player_name || "Athlete";

  useEffect(() => {
    const loadSavedAthlete = async () => {
      const savedAthlete = await getAthleteSession();

      if (savedAthlete?.id) {
        setActiveAthlete(savedAthlete as AthleteAccess);
        setPosition(normalizePosition(savedAthlete.position));
      }

      setIsCheckingSavedSession(false);
    };

    loadSavedAthlete();
  }, []);

  const unlockAthlete = async () => {
    const cleanCode = accessCode.trim().toUpperCase();

    if (!cleanCode) {
      Alert.alert("Access Required", "Enter your athlete access code.");
      return;
    }

    setIsUnlocking(true);

    const { data, error } = await supabase
      .from("athletes")
      .select("id, player_name, position, access_code, status")
      .eq("access_code", cleanCode)
      .maybeSingle();

    setIsUnlocking(false);

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
    setPosition(normalizePosition(data.position));
    setHasChecked(false);
    setMetrics(getDefaultMetrics());
    await saveAthleteSession(data);
  };

  const logoutAthlete = async () => {
    await clearAthleteSession();

    setAccessCode("");
    setActiveAthlete(null);
    setHasChecked(false);
    setMetrics(getDefaultMetrics());
  };

  const livePlan = useMemo(() => {
    return calculatePlan(playerName, position, dayType, trainingLoad, metrics);
  }, [playerName, position, dayType, trainingLoad, metrics]);

  const plan = hasChecked ? livePlan : null;
  const scoreColor = plan ? getStatusColor(plan.score) : COLORS.blue;
  const missionTitle = plan ? getMissionTitle(plan.score, dayType) : "Daily Check-In";

  const topPriorities = plan
    ? [
        plan.priorityActions[0] || "Hydrate early.",
        plan.priorityActions[1] || "Eat protein with each meal.",
        plan.priorityActions[2] || "Complete your recovery routine.",
      ]
    : [
        "Set your day type.",
        "Adjust your readiness numbers.",
        "Tap Check Readiness.",
      ];

  const updateMetric = (key: keyof MetricState, change: number) => {
    setMetrics((prev) => ({
      ...prev,
      [key]: clamp(prev[key] + change, 0, 10),
    }));
  };

  const checkReadiness = async () => {
    if (!activeAthlete?.id) {
      Alert.alert("Access Required", "Please enter your athlete code first.");
      return;
    }

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
        athlete_id: activeAthlete.id,
        player_name: playerName,
        access_code: activeAthlete.access_code,

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

    Alert.alert("Check-In Saved", `${playerName}'s readiness was saved.`);
  };

  if (isCheckingSavedSession) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loginContainer}>
          <Text style={styles.loadingText}>Loading athlete...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeAthlete) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loginContainer}>
          <View style={styles.loginCard}>
            <Text style={styles.loginSmallTitle}>MOMENTUM ENGINE</Text>
            <Text style={styles.loginTitle}>Athlete Access</Text>
            <Text style={styles.loginText}>
              Enter your athlete code once. Momentum Engine will remember you.
            </Text>

            <TextInput
              value={accessCode}
              onChangeText={(text) => setAccessCode(text.toUpperCase())}
              placeholder="Enter access code"
              placeholderTextColor="#73849c"
              autoCapitalize="characters"
              style={styles.input}
            />

            <TouchableOpacity
              style={[styles.checkButton, isUnlocking && styles.checkButtonDisabled]}
              onPress={unlockAthlete}
              disabled={isUnlocking}
            >
              <Text style={styles.checkButtonText}>
                {isUnlocking ? "Checking..." : "Open My Plan"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.loginHint}>
              Coach Rey gives each athlete their own private code.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Momentum Engine</Text>
            <Text style={styles.appSubtitle}>{playerName}'s performance hub</Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logoutAthlete}>
            <Text style={styles.logoutButtonText}>Switch</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.missionCard, { borderColor: scoreColor }]}>
          <View style={styles.missionTopRow}>
            <View>
              <Text style={styles.missionLabel}>TODAY'S MISSION</Text>
              <Text style={styles.missionTitle}>{missionTitle}</Text>
              <Text style={styles.missionSub}>
                {plan
                  ? `${position} • ${dayType} Day • ${trainingLoad} Load`
                  : "Complete your check-in to unlock your plan."}
              </Text>
            </View>

            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={styles.scoreText}>{plan ? plan.score : 0}</Text>
              <Text style={styles.scoreLabel}>SCORE</Text>
            </View>
          </View>

          <View style={[styles.statusPill, { backgroundColor: scoreColor }]}>
            <Text style={styles.statusPillText}>
              {plan ? `${plan.readinessLabel} • ${plan.riskText}` : "NOT CHECKED YET"}
            </Text>
          </View>

          <Text style={styles.coachBrief}>
            {plan
              ? plan.coachFeedback
              : "Start at 5, adjust how you feel, then tap Check Readiness."}
          </Text>
        </View>

        <View style={styles.quickCard}>
          <Text style={styles.cardTitle}>Player Setup</Text>

          <View style={styles.lockedPlayerBox}>
            <Text style={styles.lockedPlayerLabel}>Logged in as</Text>
            <Text style={styles.lockedPlayerName}>{playerName}</Text>
          </View>

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
                color={item === "Match" ? COLORS.yellow : COLORS.green}
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
                color={item === "Full" ? COLORS.yellow : COLORS.green}
              />
            ))}
          </View>
        </View>

        <View style={styles.quickCard}>
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

        <TouchableOpacity
          style={[styles.checkButton, isSaving && styles.checkButtonDisabled]}
          onPress={checkReadiness}
          disabled={isSaving}
        >
          <Text style={styles.checkButtonText}>
            {isSaving
              ? "Saving..."
              : hasChecked
              ? "Update Readiness"
              : "Check Readiness"}
          </Text>
        </TouchableOpacity>

        <View style={styles.planBoard}>
          <View style={styles.planBoardHeader}>
            <Text style={styles.planBoardTitle}>Today’s Plan</Text>
            <Text style={styles.planBoardSub}>
              {plan
                ? "Built around your check-in and today’s load."
                : "Your plan unlocks after your readiness check."}
            </Text>
          </View>

          <View style={styles.prioritySection}>
            <Text style={styles.sectionTitle}>Top Priorities</Text>
            {topPriorities.map((item, index) => (
              <PriorityCard key={`${item}-${index}`} number={index + 1} text={item} />
            ))}
          </View>

          {plan ? (
            <View style={styles.planGrid}>
              <PlanTile wide title="Training" text={plan.trainingPlan} />
              <PlanTile wide title="Fuel" text={plan.fuelPlan} />
              <PlanTile wide title="Recovery" text={plan.recoveryPlan} />
              <PlanTile wide title="Mindset" text={plan.mindsetPlan} />
              <PlanTile
                wide
                title="Extra Recommendations"
                text={
                  plan.priorityActions.slice(3).join("\n\n") ||
                  "No extra recommendations today. Stay consistent."
                }
              />
            </View>
          ) : (
            <View style={styles.emptyPlan}>
              <Text style={styles.emptyTitle}>No plan yet</Text>
              <Text style={styles.emptyText}>
                Set your day, load, and check-in scores. Then tap Check Readiness.
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
  red: "#ef4444",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  loginCard: {
    backgroundColor: COLORS.card,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginSmallTitle: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  loginTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  loginText: {
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 18,
  },
  loginHint: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
    textAlign: "center",
  },
  container: {
    padding: 18,
    paddingBottom: 120,
  },
  header: {
    marginTop: 6,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  logoutButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 13,
  },
  missionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 22,
    marginBottom: 16,
    borderWidth: 2,
  },
  missionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  missionLabel: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  missionTitle: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  missionSub: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 6,
    fontWeight: "700",
  },
  scoreCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#061322",
  },
  scoreText: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: "900",
  },
  scoreLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  statusPillText: {
    color: "#03111d",
    fontSize: 12,
    fontWeight: "900",
  },
  coachBrief: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
  },
  quickCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 22,
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
  lockedPlayerBox: {
    backgroundColor: "#061322",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  lockedPlayerLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  lockedPlayerName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
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
    fontSize: 28,
    fontWeight: "900",
  },
  planBoardSub: {
    color: "#a7f3d0",
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  prioritySection: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  priorityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(45,212,191,0.24)",
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  priorityBadgeText: {
    color: "#03111d",
    fontWeight: "900",
  },
  priorityText: {
    flex: 1,
    color: "#dcfce7",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
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