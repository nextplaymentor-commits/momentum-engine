export type DayType = 'offday' | 'training' | 'matchday';
export type LoadType = 'low' | 'medium' | 'high';

type RecommendationInput = {
  sleep?: number;
  energy?: number;
  soreness?: number;
  stress?: number;
  confidence?: number;
  focus?: number;
  nutrition?: number;
  dayType?: DayType;
  load?: LoadType;
};

function pickRandom(items: string[], count: number) {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const hydrationRecommendations = {
  low: [
    'Aim for 60–70 oz of water today.',
    'Drink 16–20 oz before lunch.',
    'Take small sips throughout the day instead of waiting until you feel thirsty.',
    'Keep a water bottle near you and finish it at least twice today.',
    'Drink 8–12 oz with each meal.',
  ],

  medium: [
    'Aim for 70–90 oz of water today.',
    'Drink 24 oz before noon.',
    'Refill your bottle at least 3 times today.',
    'Drink 12–16 oz after training.',
    'Get 16 oz in during the first part of your day before you feel tired.',
  ],

  high: [
    'Aim for 90–110 oz of water today.',
    'Drink 24–32 oz before noon.',
    'Add electrolytes after training or match play.',
    'Drink 16–20 oz within 30 minutes after training.',
    'Bring a full bottle with you and finish it before training starts.',
    'After hard work, drink water plus electrolytes instead of only sipping water.',
  ],
};

export const recoveryRecommendations = {
  sore: [
    'Do 10–15 minutes of lower body mobility tonight.',
    'Foam roll calves, quads, and hamstrings for 5–8 minutes.',
    'Take a light recovery walk after dinner.',
    'Try to be off screens 30 minutes before bed.',
    'Avoid extra sprinting, jumping, or conditioning today.',
    'Stretch hips, calves, hamstrings, and quads before bed.',
  ],

  moderate: [
    'Stretch for 8–10 minutes tonight.',
    'Get a protein snack after training.',
    'Do light mobility before bed.',
    'Prioritize sleep tonight so your legs feel better tomorrow.',
    'Take 5 minutes after training to cool down instead of stopping cold.',
    'Keep your recovery simple: water, food, stretch, sleep.',
  ],

  fresh: [
    'Keep your recovery routine simple today.',
    'Stretch for 5 minutes before bed.',
    'Stay ahead on water and meals.',
    'Keep your sleep routine consistent.',
    'Do a short cooldown walk after training.',
    'Protect your body even when you feel good.',
  ],
};

export const fuelRecommendations = {
  matchday: [
    '3 hours before kickoff: eat carbs + protein, like chicken/rice, eggs/toast, or a turkey sandwich with fruit.',
    '60 minutes before kickoff: eat a banana, granola bar, applesauce, or crackers.',
    'After the match: eat protein + carbs within 45 minutes.',
    'Avoid heavy or fried food close to game time.',
    'Breakfast idea: oatmeal + banana + eggs + water.',
    'Post-game idea: chocolate milk, smoothie, chicken/rice, or eggs/toast.',
  ],

  training: [
    'Eat a real meal 2–3 hours before training.',
    'After training, get protein + carbs within 30–45 minutes.',
    'Good options: Greek yogurt + granola, turkey sandwich + fruit, eggs + toast, or chicken + rice.',
    'Do not skip breakfast on training days.',
    'Pre-training snack: banana, toast with peanut butter, granola bar, or applesauce.',
    'Post-training meal: protein + carbs — chicken/rice, pasta/meat sauce, eggs/potatoes, or Greek yogurt + fruit.',
  ],

  offday: [
    'Use today to recover: eat balanced meals and stay hydrated.',
    'Get protein with each main meal.',
    'Add fruit, rice, potatoes, oats, or bread to keep energy steady.',
    'Avoid skipping meals just because it is an off day.',
    'Snack idea: Greek yogurt, banana, trail mix, smoothie, or peanut butter toast.',
    'Dinner goal: protein + carbs + vegetables.',
  ],
};

export const mindsetRecommendations = {
  lowConfidence: [
    'Before training, write down one thing you can control today: effort, attitude, focus, or communication.',
    'Pick one small win early today and build from there.',
    'Keep it simple: one good touch, one good pass, one good decision.',
    'Do not judge the whole day off one mistake. Reset fast.',
  ],

  lowFocus: [
    'Pick one focus goal today: clean first touch, scanning before receiving, or strong body language.',
    'Before starting, take 5 slow breaths and lock into one detail.',
    'Focus on your next action, not the last mistake.',
    'Set one training intention before you step on the field.',
  ],

  highStress: [
    'Slow the day down. Take 5 slow breaths before training.',
    'Keep the session simple and control what you can control.',
    'Take a 10-minute walk today to reset your mind.',
    'Put your phone away 30 minutes before bed to protect sleep.',
  ],
};

export const performanceRecommendations = {
  lowEnergy: [
    'Keep the warm-up longer today and ease into intensity instead of starting too fast.',
    'Start with clean technical reps before going into high intensity work.',
    'Do not force extra conditioning if your body feels flat.',
    'Fuel early today so you are not trying to catch up later.',
  ],

  highReadiness: [
    'You are in a good spot today. Bring high standards to every rep.',
    'Push quality, but still recover properly after the session.',
    'Use the good energy today to sharpen one position-specific detail.',
    'Stay disciplined even when you feel good.',
  ],
};

export function getMomentumRecommendations(input: RecommendationInput) {
  const {
    sleep = 5,
    energy = 5,
    soreness = 5,
    stress = 5,
    confidence = 5,
    focus = 5,
    nutrition = 5,
    dayType = 'training',
    load = 'medium',
  } = input;

  const recommendations: string[] = [];

  if (dayType === 'matchday' || load === 'high' || soreness >= 7) {
    recommendations.push(...pickRandom(hydrationRecommendations.high, 3));
  } else if (load === 'medium' || energy <= 6) {
    recommendations.push(...pickRandom(hydrationRecommendations.medium, 3));
  } else {
    recommendations.push(...pickRandom(hydrationRecommendations.low, 3));
  }

  if (soreness >= 7 || sleep <= 5) {
    recommendations.push(...pickRandom(recoveryRecommendations.sore, 3));
  } else if (soreness >= 4 || stress >= 7) {
    recommendations.push(...pickRandom(recoveryRecommendations.moderate, 3));
  } else {
    recommendations.push(...pickRandom(recoveryRecommendations.fresh, 2));
  }

  recommendations.push(...pickRandom(fuelRecommendations[dayType], 3));

  if (confidence <= 5) {
    recommendations.push(...pickRandom(mindsetRecommendations.lowConfidence, 1));
  }

  if (focus <= 5) {
    recommendations.push(...pickRandom(mindsetRecommendations.lowFocus, 1));
  }

  if (stress >= 7) {
    recommendations.push(...pickRandom(mindsetRecommendations.highStress, 1));
  }

  if (nutrition <= 5) {
    recommendations.push(
      'Make your next meal simple: protein + carbs + fruit or vegetables.'
    );
  }

  if (energy <= 5) {
    recommendations.push(...pickRandom(performanceRecommendations.lowEnergy, 1));
  }

  if (
    sleep >= 7 &&
    energy >= 7 &&
    soreness <= 4 &&
    stress <= 4 &&
    confidence >= 7
  ) {
    recommendations.push(...pickRandom(performanceRecommendations.highReadiness, 1));
  }

  return [...new Set(recommendations)].slice(0, 8);
}