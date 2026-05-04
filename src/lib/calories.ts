type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';

interface CalorieParams {
  sex: string;
  weight: number;
  height: number;
  age: number;
  activityLevel: string;
  targetWeight?: number | null;
  targetDays?: number | null;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

export function calculateDailyCalories(params: CalorieParams): number {
  const { sex, weight, height, age, activityLevel, targetWeight, targetDays } = params;

  // Mifflin-St Jeor BMR
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    // female and any other value defaults to female formula
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const multiplier =
    ACTIVITY_MULTIPLIERS[activityLevel as ActivityLevel] ?? ACTIVITY_MULTIPLIERS.moderate;

  let tdee = bmr * multiplier;

  // Adjust for weight goal if both targetWeight and targetDays are provided
  if (
    targetWeight != null &&
    targetDays != null &&
    targetDays > 0
  ) {
    const weightDifference = targetWeight - weight; // negative = loss, positive = gain
    // 1 kg of body fat ≈ 7700 kcal
    const dailyAdjustment = (weightDifference * 7700) / targetDays;
    tdee += dailyAdjustment;
  }

  // Clamp to a safe minimum (1200 kcal)
  const result = Math.max(1200, Math.round(tdee));
  return result;
}
