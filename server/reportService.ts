import { jsPDF } from 'jspdf';
import { storagePut, storageGetSignedUrl } from './storage';
import { createReportMetadata } from './db';
import { getStructuredDietPlan } from '../shared/health';

export async function generateStoredReport(input: {
  userId: number;
  assessmentId: number;
  name: string;
  risk: number;
  confidence: number;
  bmi: number;
  healthScore: number;
  category: string;
  diet: string;
  exercise: string;
  lifestyle: string;
}) {
  const plan = getStructuredDietPlan(input.category, input.bmi);
  const pdf = new jsPDF();

  /* ========================================================
     PAGE 1: CLINICAL RISK ASSESSMENT SUMMARY
     ======================================================== */
  pdf.setFillColor(7, 9, 13);
  pdf.rect(0, 0, 210, 297, 'F');

  // Header Brand
  pdf.setTextColor(34, 211, 238);
  pdf.setFontSize(10);
  pdf.text('DIASENSE AI / HEALTH INTELLIGENCE & CLINICAL ESTIMATION', 20, 20);

  pdf.setTextColor(248, 250, 252);
  pdf.setFontSize(20);
  pdf.text('Diabetes Risk Assessment Report', 20, 34);

  pdf.setDrawColor(34, 211, 238);
  pdf.setLineWidth(0.5);
  pdf.line(20, 40, 190, 40);

  // Metadata Card
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 46, 170, 38, 3, 3, 'F');

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(9);
  pdf.text(`PATIENT NAME:`, 26, 56);
  pdf.text(`DATE GENERATED:`, 26, 66);
  pdf.text(`REPORT ID:`, 26, 76);

  pdf.setTextColor(248, 250, 252);
  pdf.setFontSize(10);
  pdf.text(input.name || 'Account holder', 70, 56);
  pdf.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 70, 66);
  pdf.text(`DS-${new Date().getFullYear()}-A${input.assessmentId}`, 70, 76);

  // Clinical Estimation Metrics Card
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 90, 170, 48, 3, 3, 'F');

  const riskColor = input.risk >= 50 ? [244, 63, 94] : input.risk >= 25 ? [245, 158, 11] : [16, 185, 129];
  pdf.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  pdf.setFontSize(28);
  pdf.text(`${input.risk}%`, 26, 114);

  pdf.setFontSize(11);
  pdf.text(`${input.category.toUpperCase()}`, 26, 124);

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(9);
  pdf.text('AI MODEL CONFIDENCE', 105, 102);
  pdf.text('BMI (BODY MASS INDEX)', 105, 114);
  pdf.text('HEALTH SCORE', 105, 126);

  pdf.setTextColor(248, 250, 252);
  pdf.text(`${input.confidence}%`, 160, 102);
  pdf.text(`${input.bmi.toFixed(1)} kg/m²`, 160, 114);
  pdf.text(`${input.healthScore}/100`, 160, 126);

  // Core Lifestyle & Activity Directives
  pdf.setTextColor(34, 211, 238);
  pdf.setFontSize(11);
  pdf.text('CORE CLINICAL DIRECTIVES', 20, 150);

  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 156, 170, 64, 3, 3, 'F');

  pdf.setFontSize(9);
  pdf.setTextColor(56, 189, 248);
  pdf.text('NUTRITION STRATEGY:', 26, 168);
  pdf.setTextColor(226, 232, 240);
  pdf.text(input.diet || plan.focus, 26, 175, { maxWidth: 158 });

  pdf.setTextColor(56, 189, 248);
  pdf.text('PHYSICAL ACTIVITY TARGET:', 26, 188);
  pdf.setTextColor(226, 232, 240);
  pdf.text(input.exercise, 26, 195, { maxWidth: 158 });

  pdf.setTextColor(56, 189, 248);
  pdf.text('LIFESTYLE & RECOVERY:', 26, 208);
  pdf.setTextColor(226, 232, 240);
  pdf.text(input.lifestyle, 26, 215, { maxWidth: 158 });

  // Page 1 Footer / Medical Disclaimer
  pdf.setTextColor(245, 158, 11);
  pdf.setFontSize(9);
  pdf.text('MEDICAL DISCLAIMER', 20, 236);

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(8);
  pdf.text('This report is generated automatically for informational purposes only.', 20, 244);
  pdf.text('It is not a diagnosis and does not replace professional medical advice,', 20, 250);
  pdf.text('diagnosis, or treatment. Consult a qualified healthcare professional.', 20, 256);

  pdf.setTextColor(34, 211, 238);
  pdf.setFontSize(9);
  pdf.text('Project Developed By DiaSense AI', 20, 274);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Page 1 of 2  (See Page 2 for Detailed Personalized Diet Chart ->)', 95, 274);

  /* ========================================================
     PAGE 2: COMPLETE PERSONALIZED DIET & NUTRITION CHART
     ======================================================== */
  pdf.addPage();
  pdf.setFillColor(7, 9, 13);
  pdf.rect(0, 0, 210, 297, 'F');

  pdf.setTextColor(34, 211, 238);
  pdf.setFontSize(10);
  pdf.text('DIASENSE AI / PERSONALIZED NUTRITIONAL PROTOCOL', 20, 18);

  pdf.setTextColor(248, 250, 252);
  pdf.setFontSize(18);
  pdf.text('Clinical Diet & Meal Plan Guide', 20, 30);

  pdf.setDrawColor(34, 211, 238);
  pdf.setLineWidth(0.5);
  pdf.line(20, 35, 190, 35);

  // Nutritional Target Banner
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 40, 170, 22, 3, 3, 'F');
  pdf.setTextColor(56, 189, 248);
  pdf.setFontSize(9);
  pdf.text('PRIMARY CLINICAL DIETARY FOCUS:', 26, 48);
  pdf.setTextColor(226, 232, 240);
  pdf.setFontSize(8.5);
  pdf.text(plan.focus, 26, 56, { maxWidth: 158 });

  // Daily Meal Schedule Card
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 68, 170, 104, 3, 3, 'F');

  pdf.setTextColor(34, 211, 238);
  pdf.setFontSize(10);
  pdf.text('STRUCTURED DAILY MEAL SCHEDULE', 26, 77);

  const mealItems = [
    { title: 'BREAKFAST (8:00 AM)', desc: plan.meals.breakfast, y: 86 },
    { title: 'MID-MORNING SNACK (11:00 AM)', desc: plan.meals.midMorning, y: 106 },
    { title: 'BALANCED LUNCH (1:30 PM)', desc: plan.meals.lunch, y: 124 },
    { title: 'EVENING REFRESHMENT (5:00 PM)', desc: plan.meals.eveningSnack, y: 144 },
    { title: 'LIGHT DINNER (7:30 - 8:00 PM)', desc: plan.meals.dinner, y: 160 },
  ];

  mealItems.forEach(meal => {
    pdf.setTextColor(56, 189, 248);
    pdf.setFontSize(8.5);
    pdf.text(meal.title, 26, meal.y);
    pdf.setTextColor(203, 213, 225);
    pdf.setFontSize(8);
    pdf.text(meal.desc, 26, meal.y + 5, { maxWidth: 158 });
  });

  // Food Directives: Prioritize vs Avoid
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 178, 82, 60, 3, 3, 'F');
  pdf.setTextColor(52, 211, 153); // Emerald
  pdf.setFontSize(9);
  pdf.text('FOODS TO PRIORITIZE', 26, 187);
  pdf.setTextColor(203, 213, 225);
  pdf.setFontSize(7.5);
  let yEat = 194;
  plan.foodsToEat.forEach(food => {
    pdf.text(`+ ${food}`, 26, yEat, { maxWidth: 72 });
    yEat += 10;
  });

  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(108, 178, 82, 60, 3, 3, 'F');
  pdf.setTextColor(248, 113, 113); // Rose
  pdf.setFontSize(9);
  pdf.text('FOODS TO STRICTLY AVOID', 114, 187);
  pdf.setTextColor(203, 213, 225);
  pdf.setFontSize(7.5);
  let yAvoid = 194;
  plan.foodsToAvoid.forEach(food => {
    pdf.text(`x ${food}`, 114, yAvoid, { maxWidth: 72 });
    yAvoid += 10;
  });

  // Daily Habits & Hydration
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(20, 244, 170, 32, 3, 3, 'F');
  pdf.setTextColor(34, 211, 238);
  pdf.setFontSize(9);
  pdf.text('HYDRATION & POST-MEAL GLUCOSE MANAGEMENT RULES:', 26, 252);
  pdf.setTextColor(203, 213, 225);
  pdf.setFontSize(7.5);
  let yHabit = 259;
  plan.hydrationAndHabits.slice(0, 3).forEach(habit => {
    pdf.text(`* ${habit}`, 26, yHabit, { maxWidth: 158 });
    yHabit += 7;
  });

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(8);
  pdf.text('Page 2 of 2  |  DiaSense AI Automated Clinical Report', 65, 285);

  const buffer = Buffer.from(pdf.output('arraybuffer') as ArrayBuffer);
  const stored = await storagePut(`reports/${input.assessmentId}.pdf`, buffer, 'application/pdf');
  const metadata = await createReportMetadata({
    userId: input.userId,
    assessmentId: input.assessmentId,
    storageUrl: stored.url
  });
  return { ...metadata, storageUrl: await storageGetSignedUrl(stored.key) };
}
