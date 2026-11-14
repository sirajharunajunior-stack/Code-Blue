import type { AssessmentCategory, AssessmentDefinition } from "@/types";

export const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  cardiovascular: "Cardiovascular",
  metabolic: "Metabolic",
  neuro: "Neurobehavioural",
  musculoskeletal: "Musculoskeletal",
  behavioural: "Behavioural",
  environmental: "Environmental",
};

/**
 * Guided assessments.
 *
 * Each step collects a small number of fields, validated with zod at the point
 * of entry. Fields that carry a `metricId` are classified against the same
 * thresholds the backend uses, so a submitted assessment produces a health
 * level rather than a bare number.
 *
 * Equipment lists and instructions are written for the items this mission
 * carries. Nothing here turns a consumer device into a medical instrument.
 */
export const ASSESSMENTS: AssessmentDefinition[] = [
  {
    id: "cardiovascular",
    name: "Cardiovascular & orthostatic check",
    shortName: "Cardiovascular",
    category: "cardiovascular",
    description:
      "Resting heart rate and blood pressure, plus the response to standing. The standing test is what detects orthostatic intolerance early.",
    why: "Blood volume falls in microgravity. A normal resting blood pressure can hide a circulation that no longer copes with standing.",
    equipment: ["Automated blood-pressure cuff", "Pulse oximeter (optional)", "Timer"],
    instructions: [
      "Sit quietly for five minutes with both feet flat and your back supported.",
      "Rest the cuff on the bare upper arm, level with the heart.",
      "Take two readings a minute apart and record the second.",
      "Then stand still for two minutes and take one more reading.",
      "Stop the standing test immediately if you feel faint.",
    ],
    durationMinutes: 8,
    cadence: "Weekly, and any day you feel light-headed",
    steps: [
      {
        id: "rest",
        title: "Before you measure",
        guidance: [
          "Empty your bladder and avoid caffeine for 30 minutes.",
          "Sit for a full five minutes before the first reading.",
        ],
        fields: [
          {
            id: "rest_minutes",
            label: "Minutes rested",
            type: "number",
            unit: "min",
            min: 0,
            max: 30,
            step: 1,
            required: true,
            help: "Record what actually happened, not what the procedure asks for.",
          },
          {
            id: "position",
            label: "Measurement position",
            type: "select",
            required: true,
            options: [
              { value: "seated", label: "Seated" },
              { value: "supine", label: "Supine" },
              { value: "standing", label: "Standing" },
            ],
          },
        ],
      },
      {
        id: "resting",
        title: "Resting values",
        guidance: ["Second of two readings, taken a minute apart."],
        fields: [
          {
            id: "heart_rate",
            label: "Resting heart rate",
            type: "number",
            unit: "bpm",
            metricId: "heart_rate",
            min: 30,
            max: 220,
            step: 1,
            required: true,
          },
          {
            id: "bp_systolic",
            label: "Systolic pressure",
            type: "number",
            unit: "mmHg",
            metricId: "bp_systolic",
            min: 60,
            max: 250,
            step: 1,
            required: true,
          },
          {
            id: "bp_diastolic",
            label: "Diastolic pressure",
            type: "number",
            unit: "mmHg",
            metricId: "bp_diastolic",
            min: 30,
            max: 150,
            step: 1,
            required: true,
          },
        ],
      },
      {
        id: "orthostatic",
        title: "Standing response",
        guidance: [
          "Stand still for two minutes, then measure once.",
          "Stop if you feel faint and record that you stopped.",
        ],
        fields: [
          {
            id: "standing_hr",
            label: "Standing heart rate",
            type: "number",
            unit: "bpm",
            min: 30,
            max: 220,
            step: 1,
            help: "A rise of more than 30 bpm is worth reporting.",
          },
          {
            id: "standing_sys",
            label: "Standing systolic",
            type: "number",
            unit: "mmHg",
            min: 50,
            max: 250,
            step: 1,
            help: "A fall of more than 20 mmHg is worth reporting.",
          },
          { id: "dizziness", label: "Dizziness or vision greying on standing", type: "boolean" },
          { id: "test_stopped", label: "Test stopped early", type: "boolean" },
        ],
      },
      {
        id: "symptoms",
        title: "Symptoms",
        guidance: ["Only report what you are experiencing now."],
        fields: [
          { id: "chest_discomfort", label: "Chest discomfort or pressure", type: "boolean" },
          { id: "breathless", label: "Breathless at rest", type: "boolean" },
          { id: "palpitations", label: "Irregular or racing pulse", type: "boolean" },
          {
            id: "notes",
            label: "Anything else the flight surgeon should know",
            type: "text",
            placeholder: "Optional · one or two sentences",
          },
        ],
      },
    ],
    followUp:
      "A reading beyond the warning threshold, or any dizziness on standing, is reviewed by the flight surgeon within 24 hours. Chest discomfort, breathlessness at rest or fainting is an immediate escalation.",
    metricIds: ["heart_rate", "bp_systolic", "bp_diastolic"],
    systemIds: ["heart", "brain"],
    lastCompletedDaysAgo: 2,
  },
  {
    id: "metabolic",
    name: "Metabolic & hydration check",
    shortName: "Metabolic",
    category: "metabolic",
    description:
      "Capillary glucose, fluid intake, appetite and bowel habit — the four things that drift first in a closed food system.",
    why: "Radiation, altered diet and reduced fluid intake all affect the gut. Early changes are easy to normalise and hard to notice.",
    equipment: ["Crew glucometer and test strips", "Water log", "Gloves"],
    instructions: [
      "Wash and dry your hands, then use a fresh lancet.",
      "Apply blood to the strip and wait for the reading.",
      "Record what you have eaten and drunk in the last 24 hours.",
      "Do not adjust insulin or medication without the flight surgeon.",
    ],
    durationMinutes: 6,
    cadence: "Twice weekly, and any day appetite or hydration changes",
    steps: [
      {
        id: "glucose",
        title: "Glucose reading",
        guidance: ["Record the value the meter shows, without correcting for the meal."],
        fields: [
          {
            id: "blood_glucose",
            label: "Capillary glucose",
            type: "number",
            unit: "mg/dL",
            metricId: "blood_glucose",
            min: 20,
            max: 600,
            step: 1,
            required: true,
          },
          {
            id: "last_meal",
            label: "Time since last meal",
            type: "select",
            required: true,
            options: [
              { value: "fasting", label: "Fasting (8 h+)" },
              { value: "lt2h", label: "Under 2 hours" },
              { value: "2to8h", label: "2–8 hours" },
            ],
          },
        ],
      },
      {
        id: "intake",
        title: "Intake and appetite",
        guidance: ["Estimate from the habitat water log rather than from memory."],
        fields: [
          {
            id: "fluid_litres",
            label: "Fluid intake in the last 24 h",
            type: "number",
            unit: "L",
            min: 0,
            max: 8,
            step: 0.1,
            required: true,
          },
          {
            id: "appetite",
            label: "Appetite compared with normal",
            type: "select",
            required: true,
            options: [
              { value: "normal", label: "Normal" },
              { value: "reduced", label: "Reduced" },
              { value: "increased", label: "Increased" },
              { value: "none", label: "No appetite" },
            ],
          },
          { id: "nausea", label: "Nausea or vomiting", type: "boolean" },
        ],
      },
      {
        id: "gut",
        title: "Gut and symptoms",
        guidance: ["A change in bowel habit for more than 48 hours is worth reporting."],
        fields: [
          {
            id: "bowel",
            label: "Bowel movement in the last 48 h",
            type: "select",
            required: true,
            options: [
              { value: "normal", label: "Normal" },
              { value: "loose", label: "Loose" },
              { value: "hard", label: "Hard or straining" },
              { value: "none", label: "None" },
            ],
          },
          { id: "abdominal_pain", label: "Abdominal pain", type: "boolean" },
          {
            id: "symptom_score",
            label: "Worst symptom severity",
            type: "scale",
            metricId: "symptom_score",
            min: 0,
            max: 10,
            help: "0 = none, 10 = the worst you can imagine.",
          },
        ],
      },
    ],
    followUp:
      "Glucose outside 70–140 mg/dL on a repeated check, or vomiting that prevents fluid intake, goes to the flight surgeon the same day. Persistent abdominal pain is an immediate escalation.",
    metricIds: ["blood_glucose", "symptom_score"],
    systemIds: ["digestive"],
    lastCompletedDaysAgo: 1,
  },
  {
    id: "sleep-mood",
    name: "Sleep, mood & fatigue check",
    shortName: "Sleep & mood",
    category: "behavioural",
    description:
      "A two-minute daily check of sleep, mood, stress and fatigue. Small changes are far easier to act on when they are logged.",
    why: "Isolation and a drifting circadian rhythm degrade sleep and mood long before performance fails visibly.",
    equipment: ["Habitat sleep log", "This form"],
    instructions: [
      "Complete within an hour of waking, before the first duty period.",
      "Answer for the last 24 hours only.",
      "There is no consequence for a low score — the point is early support.",
    ],
    durationMinutes: 3,
    cadence: "Daily",
    steps: [
      {
        id: "sleep",
        title: "Sleep",
        guidance: ["Use the sleep log rather than an estimate."],
        fields: [
          {
            id: "sleep_hours",
            label: "Hours slept",
            type: "number",
            unit: "h",
            metricId: "sleep_hours",
            min: 0,
            max: 16,
            step: 0.25,
            required: true,
          },
          {
            id: "sleep_quality",
            label: "Sleep quality",
            type: "scale",
            min: 1,
            max: 10,
            help: "1 = woke repeatedly, 10 = fully rested.",
          },
          { id: "wake_events", label: "Woke more than twice", type: "boolean" },
        ],
      },
      {
        id: "mood",
        title: "Mood and stress",
        guidance: ["Answer for how you actually feel today, not how you think you should feel."],
        fields: [
          {
            id: "mood_score",
            label: "Mood",
            type: "scale",
            metricId: "mood_score",
            min: 1,
            max: 10,
            help: "1 = very low, 10 = positive.",
          },
          {
            id: "stress_score",
            label: "Stress load",
            type: "scale",
            metricId: "stress_score",
            min: 0,
            max: 10,
            help: "0 = none, 10 = the highest you have felt.",
          },
          {
            id: "fatigue_score",
            label: "Fatigue",
            type: "scale",
            metricId: "fatigue_score",
            min: 0,
            max: 10,
            help: "0 = none, 10 = unable to do routine tasks.",
          },
        ],
      },
      {
        id: "context",
        title: "Context",
        guidance: ["What changed today? Context makes a score actionable."],
        fields: [
          {
            id: "primary_factor",
            label: "Biggest factor today",
            type: "select",
            options: [
              { value: "none", label: "Nothing unusual" },
              { value: "workload", label: "Workload" },
              { value: "sleep", label: "Sleep disruption" },
              { value: "crew", label: "Crew friction" },
              { value: "home", label: "Home and family" },
              { value: "physical", label: "Physical discomfort" },
            ],
          },
          {
            id: "notes",
            label: "Anything you want the flight surgeon to read",
            type: "text",
            placeholder: "Optional",
          },
        ],
      },
    ],
    followUp:
      "A mood score of 4 or below, or sleep under 6 h for three days, triggers a scheduled conversation with the flight surgeon. Thoughts of self-harm are an immediate escalation to the ground medical team.",
    metricIds: ["sleep_hours", "mood_score", "stress_score", "fatigue_score"],
    systemIds: ["brain"],
    lastCompletedDaysAgo: 0,
  },
  {
    id: "respiratory",
    name: "Respiratory & cabin exposure check",
    shortName: "Respiratory",
    category: "environmental",
    description:
      "Breathing rate, oxygen saturation and a short symptom screen, paired with the cabin CO₂ reading for the same hour.",
    why: "In a closed loop, a change in breathing is as likely to come from the atmosphere as from the person.",
    equipment: ["Pulse oximeter", "Habitat CO₂ display", "This form"],
    instructions: [
      "Sit quietly for two minutes before measuring.",
      "Warm your hands before using the oximeter.",
      "Record the cabin CO₂ value shown at the time of the reading.",
      "Measure again in ten minutes if a value looks wrong.",
    ],
    durationMinutes: 5,
    cadence: "Twice weekly, and after any air-quality event",
    steps: [
      {
        id: "measure",
        title: "Breathing and oxygen",
        guidance: ["Rest for two minutes first. One reading, then confirm if abnormal."],
        fields: [
          {
            id: "resp_rate",
            label: "Breathing rate",
            type: "number",
            unit: "br/min",
            metricId: "resp_rate",
            min: 4,
            max: 60,
            step: 1,
            required: true,
            help: "Count for a full 60 seconds.",
          },
          {
            id: "spo2",
            label: "Oxygen saturation",
            type: "number",
            unit: "%",
            metricId: "spo2",
            min: 60,
            max: 100,
            step: 1,
            required: true,
          },
          {
            id: "cabin_co2",
            label: "Cabin CO₂ at measurement",
            type: "number",
            unit: "%",
            metricId: "cabin_co2",
            min: 0,
            max: 5,
            step: 0.01,
            required: true,
          },
        ],
      },
      {
        id: "symptoms",
        title: "Symptom screen",
        guidance: ["Report symptoms that started or worsened in the last 48 hours."],
        fields: [
          { id: "cough", label: "New or worsening cough", type: "boolean" },
          { id: "breathless", label: "Breathless at rest or on mild exertion", type: "boolean" },
          { id: "headache", label: "Headache", type: "boolean" },
          { id: "irritation", label: "Eye, nose or throat irritation", type: "boolean" },
        ],
      },
      {
        id: "environment",
        title: "Habitat context",
        guidance: ["Environmental causes are checked before individual ones."],
        fields: [
          {
            id: "symptom_pattern",
            label: "Does the symptom change with location or time?",
            type: "select",
            options: [
              { value: "no", label: "No pattern" },
              { value: "sleep", label: "Worse in the sleep station" },
              { value: "work", label: "Worse during exercise" },
              { value: "scrubber", label: "Worse near the scrubber bay" },
            ],
            help: "A pattern points at the environment rather than the person.",
          },
          {
            id: "notes",
            label: "Additional notes",
            type: "text",
            placeholder: "Optional",
          },
        ],
      },
    ],
    followUp:
      "SpO₂ below 94% or a breathing rate above 22/min is rechecked after ten minutes, then reported. A CO₂ reading above 0.7% triggers an immediate scrubber check for the whole crew.",
    metricIds: ["resp_rate", "spo2", "cabin_co2"],
    systemIds: ["lungs", "eyes"],
    lastCompletedDaysAgo: 3,
  },
  {
    id: "musculoskeletal",
    name: "Musculoskeletal load check",
    shortName: "Musculoskeletal",
    category: "musculoskeletal",
    description:
      "Exercise completed, soreness and strength compared with your own baseline. Loading is the countermeasure — this checks whether it happened.",
    why: "Bone and muscle are lost silently. The only early signal is the training log and how load feels.",
    equipment: ["Exercise log", "Resistive device", "This form"],
    instructions: [
      "Complete after the last session of the day.",
      "Compare today's capacity with your own best, not with the crew.",
      "Report pain that persists beyond 24 hours.",
    ],
    durationMinutes: 4,
    cadence: "Daily after exercise",
    steps: [
      {
        id: "load",
        title: "Loading completed",
        guidance: ["Log the session that actually happened."],
        fields: [
          {
            id: "exercise_hours",
            label: "Exercise duration",
            type: "number",
            unit: "h",
            metricId: "exercise_hours",
            min: 0,
            max: 6,
            step: 0.1,
            required: true,
          },
          {
            id: "modality",
            label: "Primary modality",
            type: "select",
            required: true,
            options: [
              { value: "resistive", label: "Resistive" },
              { value: "aerobic", label: "Aerobic" },
              { value: "combined", label: "Combined" },
              { value: "none", label: "None completed" },
            ],
          },
        ],
      },
      {
        id: "soreness",
        title: "Soreness and pain",
        guidance: ["Soreness that settles within a day is expected. Pain that does not is not."],
        fields: [
          {
            id: "soreness",
            label: "Muscle soreness",
            type: "scale",
            min: 0,
            max: 10,
            help: "0 = none, 10 = limits movement.",
          },
          {
            id: "pain_site",
            label: "Site of pain",
            type: "select",
            options: [
              { value: "none", label: "No pain" },
              { value: "back", label: "Lower back" },
              { value: "hip", label: "Hip" },
              { value: "knee", label: "Knee" },
              { value: "shoulder", label: "Shoulder" },
              { value: "ankle", label: "Ankle or foot" },
            ],
          },
          { id: "pain_persists", label: "Pain persists beyond 24 hours", type: "boolean" },
        ],
      },
      {
        id: "capacity",
        title: "Functional capacity",
        guidance: ["Compare with your own normal, not with the crew."],
        fields: [
          {
            id: "strength_vs_baseline",
            label: "Strength compared with your baseline",
            type: "select",
            required: true,
            options: [
              { value: "better", label: "Better" },
              { value: "same", label: "About the same" },
              { value: "slightly_worse", label: "Slightly reduced" },
              { value: "much_worse", label: "Clearly reduced" },
            ],
          },
          { id: "balance_issue", label: "Balance or coordination problem", type: "boolean" },
        ],
      },
    ],
    followUp:
      "Two consecutive days below the exercise target, or pain that persists beyond 24 hours, is reviewed by the flight surgeon. Sudden weakness or inability to bear load is an immediate escalation.",
    metricIds: ["exercise_hours"],
    systemIds: ["muscles", "bones"],
    lastCompletedDaysAgo: 1,
  },
  {
    id: "vision",
    name: "Vision & head pressure check",
    shortName: "Vision",
    category: "neuro",
    description:
      "A short self-check of acuity, headache and visual symptoms — the earliest practical screen for neuro-ocular change.",
    why: "Headward fluid shift can change the back of the eye without any pain. Gradual blurring is easy to adapt to and easy to miss.",
    equipment: ["Near and distance acuity card", "This form"],
    instructions: [
      "Use the same distance and lighting each time.",
      "Cover one eye at a time and read the smallest line you can.",
      "Report change, not just the current level.",
    ],
    durationMinutes: 4,
    cadence: "Weekly",
    steps: [
      {
        id: "acuity",
        title: "Acuity",
        guidance: ["Compare with your last recorded result."],
        fields: [
          {
            id: "distance_vision",
            label: "Distance vision",
            type: "select",
            required: true,
            options: [
              { value: "normal", label: "Normal" },
              { value: "slightly_blurred", label: "Slightly blurred" },
              { value: "clearly_blurred", label: "Clearly blurred" },
              { value: "cannot_read", label: "Cannot read the line" },
            ],
          },
          {
            id: "near_vision",
            label: "Near vision",
            type: "select",
            required: true,
            options: [
              { value: "normal", label: "Normal" },
              { value: "slightly_blurred", label: "Slightly blurred" },
              { value: "clearly_blurred", label: "Clearly blurred" },
            ],
          },
          { id: "one_eye_only", label: "Change in one eye only", type: "boolean" },
        ],
      },
      {
        id: "symptoms",
        title: "Head and visual symptoms",
        guidance: ["Any sudden change is reported the same day."],
        fields: [
          { id: "headache", label: "Headache or head fullness", type: "boolean" },
          { id: "floaters", label: "New floaters or flashing lights", type: "boolean" },
          { id: "field_loss", label: "Area of vision missing", type: "boolean" },
          { id: "eye_pain", label: "Eye pain or redness", type: "boolean" },
          {
            id: "notes",
            label: "Describe any change",
            type: "text",
            placeholder: "When it started, which eye, what changed",
          },
        ],
      },
    ],
    followUp:
      "Any new visual field loss, flashing lights or eye pain is escalated immediately. A persistent acuity change is referred to the ground ophthalmology team for review.",
    metricIds: ["cabin_co2"],
    systemIds: ["eyes", "brain"],
    lastCompletedDaysAgo: 5,
  },
  {
    id: "symptom-report",
    name: "Symptom report",
    shortName: "Symptoms",
    category: "behavioural",
    description:
      "A structured report for anything that is not covered by the scheduled checks. Structured reports are reviewed faster than free text.",
    why: "Early, specific reporting is the single most useful thing a crew member can do for their own care.",
    equipment: ["This form"],
    instructions: [
      "Describe what you feel, when it started and what makes it better or worse.",
      "Include symptoms you think are minor — clusters matter more than single reports.",
      "You can submit this at any time, not only when scheduled.",
    ],
    durationMinutes: 3,
    cadence: "As needed",
    steps: [
      {
        id: "primary",
        title: "Primary symptom",
        guidance: ["Choose the symptom that bothers you most right now."],
        fields: [
          {
            id: "primary_symptom",
            label: "Primary symptom",
            type: "select",
            required: true,
            options: [
              { value: "headache", label: "Headache" },
              { value: "nausea", label: "Nausea" },
              { value: "pain", label: "Pain" },
              { value: "breathless", label: "Breathlessness" },
              { value: "dizziness", label: "Dizziness" },
              { value: "fatigue", label: "Fatigue" },
              { value: "mood", label: "Low mood" },
              { value: "sleep", label: "Sleep problem" },
              { value: "other", label: "Something else" },
            ],
          },
          {
            id: "symptom_score",
            label: "Severity",
            type: "scale",
            metricId: "symptom_score",
            min: 0,
            max: 10,
            help: "0 = barely noticeable, 10 = worst imaginable.",
          },
          {
            id: "onset",
            label: "When did it start?",
            type: "select",
            required: true,
            options: [
              { value: "today", label: "Today" },
              { value: "1to3d", label: "1–3 days ago" },
              { value: "over3d", label: "More than 3 days ago" },
            ],
          },
        ],
      },
      {
        id: "detail",
        title: "Detail",
        guidance: ["Patterns help the flight surgeon more than adjectives."],
        fields: [
          {
            id: "trend",
            label: "Is it getting better or worse?",
            type: "select",
            required: true,
            options: [
              { value: "better", label: "Improving" },
              { value: "stable", label: "About the same" },
              { value: "worse", label: "Getting worse" },
            ],
          },
          { id: "affects_duties", label: "It affects my ability to do my duties", type: "boolean" },
          {
            id: "notes",
            label: "Describe the symptom",
            type: "text",
            placeholder: "What it feels like, what helps, what makes it worse",
          },
        ],
      },
    ],
    followUp:
      "Reports are read by the flight surgeon within one working period. Severity of 8 or above, or anything affecting duties, is escalated immediately.",
    metricIds: ["symptom_score"],
    systemIds: ["brain"],
    lastCompletedDaysAgo: null,
  },
];

export const ASSESSMENT_MAP = Object.fromEntries(ASSESSMENTS.map((a) => [a.id, a]));

export function getAssessment(id: string): AssessmentDefinition | undefined {
  return ASSESSMENT_MAP[id];
}

export function assessmentsForSystem(systemId: string): AssessmentDefinition[] {
  return ASSESSMENTS.filter((a) => a.systemIds.includes(systemId as never));
}
