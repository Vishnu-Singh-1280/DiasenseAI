export type RiskCategory = 'Low risk' | 'Moderate risk' | 'High risk';

export function calculateBmi(heightCm: number, weightKg: number) {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) return 0;
  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

export function calculateRisk(input: { age: number; bmi: number; glucose?: number; familyHistory?: boolean; activity?: 'low' | 'moderate' | 'high' }) {
  const ageScore = Math.max(0, input.age - 18) * 0.55;
  const bmiScore = input.bmi > 25 ? (input.bmi - 25) * 3 : 0;
  const glucoseScore = input.glucose && input.glucose > 100 ? (input.glucose - 100) * 0.18 : 0;
  const familyScore = input.familyHistory ? 12 : 0;
  const activityScore = input.activity === 'low' ? 9 : input.activity === 'high' ? -4 : 0;
  return Math.min(95, Math.max(5, Math.round(8 + ageScore + bmiScore + glucoseScore + familyScore + activityScore)));
}

export function riskCategory(risk: number): RiskCategory {
  if (risk < 25) return 'Low risk';
  if (risk < 55) return 'Moderate risk';
  return 'High risk';
}

export function healthScore(risk: number) {
  return Math.max(5, Math.min(100, 100 - risk));
}

export function recommendations(input: { bmi: number; activity?: 'low' | 'moderate' | 'high'; sleepHours?: number }) {
  return {
    diet: input.bmi >= 25 ? 'Build meals around fiber-rich vegetables, lean protein, and measured portions.' : 'Keep a balanced plate with fiber-forward foods and consistent meal timing.',
    exercise: input.activity === 'low' ? 'Start with a 12-minute walk after one meal each day, then build gradually.' : 'Maintain regular movement and add strength work twice weekly if appropriate.',
    lifestyle: (input.sleepHours ?? 7) < 7 ? 'Protect a consistent wind-down window and aim for more restorative sleep.' : 'Keep your sleep window consistent and make stress recovery part of the routine.',
  };
}

export type FullDietPlan = {
  focus: string;
  targetCaloriesNote: string;
  meals: {
    breakfast: string;
    midMorning: string;
    lunch: string;
    eveningSnack: string;
    dinner: string;
  };
  foodsToEat: string[];
  foodsToAvoid: string[];
  hydrationAndHabits: string[];
};

export function getStructuredDietPlan(category?: string, bmi?: number): FullDietPlan {
  const isHighRisk = category === 'High risk' || (typeof bmi === 'number' && bmi >= 28);
  const isModerate = category === 'Moderate risk' || (typeof bmi === 'number' && bmi >= 25);

  if (isHighRisk) {
    return {
      focus: 'Strict Glycemic Control & Insulin Sensitivity (Low Carb, High Fiber, Lean Protein)',
      targetCaloriesNote: 'Focus on low-glycemic foods that prevent rapid blood glucose spikes.',
      meals: {
        breakfast: 'Sprouted moong dal chilla with green chutney OR Rolled oats cooked with chia seeds, cinnamon, and 5 soaked almonds.',
        midMorning: '1 small bowl of fresh cucumber/tomato salad with roasted cumin OR 1 cup unsweetened green tea with 4 walnuts.',
        lunch: '1-2 multigrain/barley rotis OR 1 cup brown rice + 1 large bowl vegetable salad + 1 bowl yellow dal/lentils + sauteed spinach/methi.',
        eveningSnack: '1 small bowl roasted chana (chickpeas) OR 1 glass fresh buttermilk (chaas) with mint and roasted jeera.',
        dinner: 'Warm clear vegetable soup + grilled paneer/tofu/chicken breast + sauteed broccoli, bell peppers, and french beans (Eat 2 hrs before sleep).'
      },
      foodsToEat: [
        'High-fiber vegetables (spinach, methi, bitter gourd/karela, broccoli, okra)',
        'Complex low-GI grains (steel-cut oats, quinoa, barley, millets like ragi/jowar)',
        'Plant & lean protein (lentils, chickpeas, tofu, paneer, eggs, fish)',
        'Healthy fats in moderation (chia seeds, flaxseeds, walnuts, extra virgin olive oil)'
      ],
      foodsToAvoid: [
        'Refined sugars, sweets, jaggery, honey, desserts, pastries',
        'Sugary beverages, packaged fruit juices, energy drinks, sodas',
        'Refined flour (maida), white bread, instant noodles, white pasta',
        'Deep fried items, trans fats, packaged namkeens, chips'
      ],
      hydrationAndHabits: [
        'Drink 2.5 to 3.2 liters of plain water throughout the day.',
        'Take a 10-15 minute gentle walk immediately after lunch and dinner to reduce glucose spikes.',
        'Never skip meals; maintain regular 3.5 to 4-hour eating intervals.',
        'Avoid heavy late-night dinners; finish meals by 8:00 PM.'
      ]
    };
  }

  if (isModerate) {
    return {
      focus: 'Metabolic Balance & Weight Optimization (Balanced Macronutrients & Portion Control)',
      targetCaloriesNote: 'Emphasis on balanced plates with 50% non-starchy vegetables, 25% lean protein, and 25% complex carbs.',
      meals: {
        breakfast: 'Vegetable oats upma OR 2 boiled egg whites with 1 slice whole grain toast + avocado/cucumbers.',
        midMorning: '1 whole fruit with low glycemic index (e.g. green apple, guava, berries) + small handful of pumpkin seeds.',
        lunch: '2 wheat-bran rotis + bowl of mixed sprout salad + bowl of rajma/chole or lentil soup + stir-fried beans and carrots.',
        eveningSnack: 'Roasted makhana (fox nuts) lightly seasoned OR freshly brewed green tea.',
        dinner: 'Light lentil & vegetable khichdi with curd OR Grilled cottage cheese/tofu salad with lemon-herb dressing.'
      },
      foodsToEat: [
        'Non-starchy vegetables (cucumber, cauliflower, zucchini, cabbage, leafy greens)',
        'Whole pulses and legumes (black beans, moong, chickpeas, masoor dal)',
        'Healthy nuts & seeds (almonds, sunflower seeds, pumpkin seeds)',
        'Low-GI fresh whole fruits (apples, berries, oranges, papayas)'
      ],
      foodsToAvoid: [
        'Processed snacks and foods with hidden high-fructose corn syrup',
        'Refined white carbohydrates and bakery items',
        'Excessive fried snacks and sugary desserts',
        'Creamy dressings and high-sodium processed meats'
      ],
      hydrationAndHabits: [
        'Stay well hydrated with 2.5+ liters of water daily.',
        'Incorporate 30 minutes of moderate aerobic activity 5 days a week.',
        'Practice mindful eating: chew slowly and stop at 80% fullness.',
        'Maintain a consistent sleep schedule to regulate hunger hormones.'
      ]
    };
  }

  return {
    focus: 'Preventative Wellness & Sustained Vitality (Whole Food Nutrient-Dense Nutrition)',
    targetCaloriesNote: 'Focus on colorful whole foods, sustained natural energy, and metabolic health maintenance.',
    meals: {
      breakfast: 'Overnight oats with berries and flaxseed OR Scrambled eggs/tofu with sauteed mushrooms, tomatoes, and whole grain toast.',
      midMorning: 'Fresh seasonal fruit (orange or kiwi) + a handful of mixed unsalted nuts.',
      lunch: 'Colorful Buddha bowl with quinoa/brown rice, grilled protein, roasted vegetables, and tahini or olive oil drizzle.',
      eveningSnack: 'Sprouted bean chaat with lemon juice and coriander OR Chamomile/Green tea.',
      dinner: 'Steamed fish or paneer tikka + large garden salad + light vegetable stew or clear soup.'
    },
    foodsToEat: [
      'Diverse seasonal fruits and vegetables of various colors',
      'Whole unrefined grains (brown rice, whole wheat, oats, quinoa)',
      'High-quality lean protein sources and fermented foods (yogurt, kefir)',
      'Omega-3 rich foods (walnuts, chia seeds, fatty fish)'
    ],
    foodsToAvoid: [
      'Ultra-processed snacks, fast food, and soda beverages',
      'Excessive refined sugars and artificial additives',
      'Late-night high-sodium heavy snacking'
    ],
    hydrationAndHabits: [
      'Drink 2.5 to 3 liters of water daily.',
      'Engage in 150 minutes of physical exercise per week.',
      'Maintain 7-8 hours of sound sleep nightly.',
      'Keep annual routine health checkups.'
    ]
  };
}
