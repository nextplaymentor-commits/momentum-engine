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

export const hydrationRecommendations = {
  low: [
    'Aim for 60–70 oz of water today.',
    'Drink 16–20 oz before lunch.',
    'Take small sips throughout the day instead of waiting until you feel thirsty.',
  ],

  medium: [
    'Aim for 70–90 oz of water today.',
    'Drink 24 oz before noon.',
    'Refill your bottle at least 3 times today.',
    'Drink 12–16 oz after training.',
  ],

  high: [
    'Aim for 90–110 oz of water today.',
    'Drink 24–32 oz before noon.',
    'Add electrolytes after training or match play.',
    'Drink 16–20 oz within 30 minutes after training.',
  ],
};

export const recoveryRecommendations = {
  sore: [
    'Do 10 minutes of lower body mobility tonight.',
    'Foam roll calves, quads, and hamstrings for 5–8 minutes.',
    'Take a light recovery walk after dinner.',
    'Try to be off screens 30 minutes before bed.',
  ],

  moderate: [
    'Stretch for 8–10 minutes tonight.',
    'Get a protein snack after training.',
    'Do light mobility before bed.',
    'Prioritize sleep tonight so your legs feel better tomorrow.',
  ],

  fresh: [
    'Keep your recovery routine simple today.',
    'Stretch for 5 minutes before bed.',
    'Stay ahead on water and meals.',
    'Keep your sleep routine consistent.',
  ],
};

export const fuelRecommendations = {
  matchday: [
    '3 hours before kickoff: eat carbs + protein, like chicken/rice, eggs/toast, or a turkey sandwich with fruit.',
    '60 minutes before kickoff: eat a banana, granola bar, applesauce, or crackers.',
    'After the match: eat protein + carbs within 45 minutes.',
    'Avoid heavy/fried food close to game time.',
  ],

  training: [
    'Eat a real meal 2–3 hours before training.',
    'After training, get protein + carbs within 30–45 minutes.',
    'Good options: Greek yogurt + granola, turkey sandwich + fruit, eggs + toast, or chicken + rice.',
    'Do not skip breakfast on training days.',
  ],

  offday: [
    'Use today to recover: eat balanced meals and stay hydrated.',
    'Get protein with each main meal.',
    'Add fruit, rice, potatoes, oats, or bread to keep energy steady.',
    'Avoid skipping meals just because it is an off day.',
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

  // Hydration
  if (dayType === 'matchday' || load === 'high' || soreness >= 7) {
    recommendations.push(...hydrationRecommendations.high);
  } else if (load === 'medium' || energy <= 6) {
    recommendations.push(...hydrationRecommendations.medium);
  } else {
    recommendations.push(...hydrationRecommendations.low);
  }

  // Recovery
  if (soreness >= 7 || sleep <= 5) {
    recommendations.push(...recoveryRecommendations.sore);
  } else if (soreness >= 4 || stress >= 7) {
    recommendations.push(...recoveryRecommendations.moderate);
  } else {
    recommendations.push(...recoveryRecommendations.fresh);
  }

  // Fuel
  recommendations.push(...fuelRecommendations[dayType]);

  // Mindset / focus
  if (confidence <= 5) {
    recommendations.push(
      'Before training, write down one thing you can control today: effort, attitude, focus, or communication.'
    );
  }

  if (focus <= 5) {
    recommendations.push(
      'Pick one focus goal today, like clean first touch, scanning before receiving, or strong body language.'
    );
  }

  if (nutrition <= 5) {
    recommendations.push(
      'Make your next meal simple: protein + carbs + fruit or vegetables.'
    );
  }

  if (energy <= 5) {
    recommendations.push(
      'Keep the warm-up longer today and ease into intensity instead of starting too fast.'
    );
  }

  // Remove duplicates and limit output
  return [...new Set(recommendations)].slice(0, 8);
}