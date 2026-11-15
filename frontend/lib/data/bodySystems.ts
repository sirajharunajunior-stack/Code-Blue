import type { BodySystem, BodySystemId } from "@/types";

/**
 * Body systems used by the Digital Human explorer.
 *
 * Region coordinates are in the 200 × 400 schematic viewBox drawn by
 * `components/anatomy/BodySchematic.tsx`. Reference content summarises widely
 * published spaceflight physiology in plain language; it is not a clinical
 * protocol. Treatment decisions belong to the flight surgeon.
 */
export const BODY_SYSTEMS: BodySystem[] = [
  {
    id: "brain",
    label: "Brain & neurobehavioural",
    shortLabel: "Brain",
    region: { cx: 100, cy: 31 },
    summary: "Sleep, mood, cognition and the body's stress response.",
    function:
      "Integrates sensory input, regulates sleep and mood, and coordinates every voluntary action.",
    spaceflightEffects: [
      "Fluid shifts toward the head can raise intracranial pressure and change the shape of the eye.",
      "Short sleep and a drifting circadian rhythm reduce attention and working memory.",
      "Isolation, confinement and distance from home raise the risk of low mood.",
    ],
    watchFor: [
      "Sleep below 6 h for more than three consecutive days",
      "Persistent headache, visual change or head fullness",
      "Low mood or loss of interest lasting more than two weeks",
      "Word-finding or concentration problems noticed by the crew",
    ],
    metricIds: ["sleep_hours", "mood_score", "stress_score", "fatigue_score"],
    assessmentId: "sleep-mood",
    hazardIds: ["isolation", "distance", "hostile"],
  },
  {
    id: "eyes",
    label: "Eyes & vision",
    shortLabel: "Eyes",
    region: { cx: 100, cy: 48 },
    summary: "Visual acuity, eye pressure and the neuro-ocular changes seen in flight.",
    function: "Focuses light onto the retina and converts it into nerve signals.",
    spaceflightEffects: [
      "Headward fluid shift is associated with optic-disc swelling and a hyperopic (far-sighted) shift.",
      "Cabin CO₂ and dry air worsen eye irritation over long missions.",
      "Acuity changes are often gradual and easy to under-report.",
    ],
    watchFor: [
      "Blurred distance vision or a new far-sighted shift",
      "Flashing lights, new floaters or a blind spot",
      "Eye pain, redness or persistent dryness",
      "Changes that persist after a rest period",
    ],
    metricIds: ["cabin_co2"],
    assessmentId: "vision",
    hazardIds: ["gravity", "hostile"],
  },
  {
    id: "heart",
    label: "Heart & circulation",
    shortLabel: "Heart",
    region: { cx: 103, cy: 110 },
    summary: "Resting rate, blood pressure and orthostatic tolerance.",
    function:
      "Pumps blood through the body and adjusts pressure as posture, load and fluid volume change.",
    spaceflightEffects: [
      "Plasma volume falls in microgravity, so the heart works with less filling volume.",
      "Cardiac muscle mass can decrease; orthostatic tolerance drops, especially after return.",
      "Radiation exposure adds a long-term cardiovascular risk.",
    ],
    watchFor: [
      "Resting heart rate persistently above 90 or below 50 bpm",
      "Dizziness or vision greying on standing",
      "Blood pressure above 140/90 on repeated measurement",
      "Chest discomfort, breathlessness or an irregular pulse",
    ],
    metricIds: ["heart_rate", "bp_systolic", "bp_diastolic", "exercise_hours"],
    assessmentId: "cardiovascular",
    hazardIds: ["gravity", "radiation", "isolation"],
  },
  {
    id: "lungs",
    label: "Lungs & respiration",
    shortLabel: "Lungs",
    region: { cx: 90, cy: 98 },
    summary: "Oxygen saturation, breathing rate and cabin atmosphere exposure.",
    function: "Exchanges oxygen and carbon dioxide between the blood and the cabin atmosphere.",
    spaceflightEffects: [
      "Microgravity changes how air and blood are distributed in the lung.",
      "Closed-loop habitats concentrate CO₂, dust and trace contaminants.",
      "Deconditioning lowers exercise tolerance and raises breathlessness on exertion.",
    ],
    watchFor: [
      "SpO₂ below 94% at rest, or a sustained downward trend",
      "Breathing rate above 22/min at rest",
      "Cabin CO₂ above 0.7%, or symptoms that improve in fresh air",
      "Persistent cough, wheeze or chest tightness",
    ],
    metricIds: ["spo2", "resp_rate", "cabin_co2"],
    assessmentId: "respiratory",
    hazardIds: ["hostile", "gravity"],
  },
  {
    id: "digestive",
    label: "Digestive & metabolic",
    shortLabel: "Digestive",
    region: { cx: 100, cy: 158 },
    summary: "Appetite, glucose, hydration and gut health.",
    function: "Breaks down food, absorbs nutrients and fluid, and regulates blood glucose.",
    spaceflightEffects: [
      "Gut motility and the microbiome shift in flight; appetite often falls.",
      "Radiation exposure increases risk to the intestinal lining over time.",
      "Limited food variety and recycled water make hydration easy to neglect.",
    ],
    watchFor: [
      "Glucose outside 70–140 mg/dL on repeated checks",
      "More than 48 h without a bowel movement, or persistent nausea",
      "Unintended weight loss over two weeks",
      "Reduced fluid intake with dark urine",
    ],
    metricIds: ["blood_glucose", "radiation"],
    assessmentId: "metabolic",
    hazardIds: ["radiation", "hostile", "isolation"],
  },
  {
    id: "bones",
    label: "Bones & skeleton",
    shortLabel: "Bones",
    region: { cx: 88, cy: 268 },
    summary: "Bone mineral density, fracture risk and renal stone risk.",
    function: "Provides structure, protects organs and stores calcium and marrow.",
    spaceflightEffects: [
      "Unloaded bone loses mineral density, mostly in the hip and spine.",
      "Calcium released into the blood raises the risk of kidney stones.",
      "Radiation deposits dose in bone marrow and increases lifetime cancer risk.",
    ],
    watchFor: [
      "Exercise below the prescribed load for several days",
      "Back or hip pain, especially after a loaded session",
      "Flank pain or blood in urine (possible stone)",
      "Cumulative radiation approaching the 600 mSv career ceiling",
    ],
    metricIds: ["exercise_hours", "radiation"],
    assessmentId: "musculoskeletal",
    hazardIds: ["gravity", "radiation"],
  },
  {
    id: "muscles",
    label: "Muscles & strength",
    shortLabel: "Muscles",
    region: { cx: 67, cy: 116 },
    summary: "Strength, endurance and functional capacity.",
    function: "Produces movement, stabilises joints and supports posture against load.",
    spaceflightEffects: [
      "Without loading, muscle mass and strength decline within weeks.",
      "Postural and antigravity muscles are affected first.",
      "Loss of strength raises injury risk during transfers and emergencies.",
    ],
    watchFor: [
      "Difficulty completing the prescribed resistance session",
      "New muscle pain or weakness that does not settle with rest",
      "Reduced grip or lift capacity compared with your own baseline",
      "Fatigue that persists after a full sleep period",
    ],
    metricIds: ["exercise_hours", "fatigue_score"],
    assessmentId: "musculoskeletal",
    hazardIds: ["gravity", "isolation"],
  },
];

export const BODY_SYSTEM_MAP: Record<BodySystemId, BodySystem> = Object.fromEntries(
  BODY_SYSTEMS.map((s) => [s.id, s]),
) as Record<BodySystemId, BodySystem>;

export function getBodySystem(id: BodySystemId): BodySystem {
  return BODY_SYSTEM_MAP[id];
}

export const DEFAULT_SYSTEM_ID: BodySystemId = "heart";
