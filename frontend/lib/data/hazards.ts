import type { Hazard, HazardId } from "@/types";

/**
 * The five human-spaceflight hazards, paraphrased for crew use.
 *
 * Wording follows the widely published NASA hazard framing (radiation,
 * isolation and confinement, distance from Earth, gravity fields, hostile and
 * closed environments). Risk figures are demonstration values.
 */
export const HAZARDS: Hazard[] = [
  {
    id: "radiation",
    name: "Space radiation",
    tagline: "Galactic cosmic rays and solar particle events",
    what: "Outside Earth's magnetic field the crew is exposed to a continuous background of high-energy cosmic rays, punctuated by solar particle events that can deliver a large dose in hours.",
    howItAffects: [
      "Ionising particles damage DNA and cell structures along their track.",
      "Bone marrow, the gut lining and the lens of the eye are the most sensitive tissues.",
      "A solar storm can raise acute exposure faster than any other in-flight hazard.",
    ],
    affectedSystems: ["bones", "digestive", "eyes", "heart", "brain"],
    metricIds: ["radiation"],
    consequences: [
      "Increased lifetime cancer risk",
      "Cataract formation",
      "Acute radiation syndrome during an extreme solar event",
      "Possible contribution to cardiovascular and central-nervous-system effects",
    ],
    prevention: [
      "Keep every crew member's cumulative dose inside the career ceiling.",
      "Track daily dose against the person's own baseline, not only a fixed limit.",
      "Treat any day at twice the usual dose as an event to review.",
    ],
    countermeasures: [
      {
        title: "Dose readout each morning",
        detail: "Personal dosimeter summary reviewed at the daily tag-up; log the value in the radiation daily record.",
        cadence: "daily",
        systemIds: ["bones", "digestive"],
      },
      {
        title: "Storm shelter drill",
        detail: "Move to the shielded core with water stores and power reserves; rehearse until it takes under five minutes.",
        cadence: "weekly",
        systemIds: ["brain", "bones"],
      },
      {
        title: "Schedule EVA outside high flux",
        detail: "Check the solar activity forecast before any external activity and shorten the exposure window.",
        cadence: "mission",
        systemIds: ["eyes"],
      },
      {
        title: "Shielding and stowage plan",
        detail: "Keep consumables and water between the crew quarters and the least-shielded hull sections.",
        cadence: "mission",
        systemIds: ["bones"],
      },
    ],
    exposure: {
      label: "Cumulative dose · this week",
      value: "4.15 mSv",
      note: "Demonstration snapshot. Career ceiling configured at 600 mSv.",
    },
  },
  {
    id: "isolation",
    name: "Isolation & confinement",
    tagline: "Small crew, no exit, long duration",
    what: "A crew of a few people shares a sealed volume for months, with limited privacy, a fixed social group and no possibility of leaving.",
    howItAffects: [
      "Low mood, irritability and reduced motivation can appear gradually.",
      "Sleep and circadian rhythm drift when light and schedule cues are weak.",
      "Team friction reduces the willingness to report small problems early.",
    ],
    affectedSystems: ["brain", "heart", "muscles"],
    metricIds: ["sleep_hours", "mood_score", "stress_score", "fatigue_score"],
    consequences: [
      "Behavioural health decline and degraded performance",
      "Sleep loss accumulating into attention failures",
      "Conflict within a crew that cannot be separated",
      "Under-reporting of symptoms",
    ],
    prevention: [
      "Protect sleep opportunity as an operational requirement, not a preference.",
      "Give every crew member scheduled private time each day.",
      "Ask about mood and stress on a fixed cadence, not only when something looks wrong.",
    ],
    countermeasures: [
      {
        title: "Daily mood and stress check",
        detail: "Two-minute self-report; any mood score of 4 or below triggers a flight-surgeon conversation within 24 h.",
        cadence: "daily",
        systemIds: ["brain"],
      },
      {
        title: "Protected private window",
        detail: "One scheduled hour per crew member per day with no duties and no shared-space obligation.",
        cadence: "daily",
        systemIds: ["brain"],
      },
      {
        title: "Crew conference with behaviour health",
        detail: "Structured check-in on cohesion, workload and unresolved friction.",
        cadence: "weekly",
        systemIds: ["brain"],
      },
      {
        title: "Family and ground messages",
        detail: "Asynchronous personal messages delivered on a predictable schedule.",
        cadence: "daily",
        systemIds: ["brain"],
      },
    ],
    exposure: {
      label: "Crew in shared volume",
      value: "3 · 214 days",
      note: "Demonstration figure for the current transit leg.",
    },
  },
  {
    id: "distance",
    name: "Distance from Earth",
    tagline: "Light-time delay, no resupply, no evacuation",
    what: "The further the vehicle travels, the longer the communication delay and the less possible it becomes to send supplies, spare parts or a rescue.",
    howItAffects: [
      "Advice arrives minutes to tens of minutes after it is requested.",
      "The crew must make medical and engineering decisions without real-time support.",
      "Resupply and evacuation are effectively unavailable for the transit.",
    ],
    affectedSystems: ["brain", "heart", "digestive"],
    metricIds: ["stress_score", "fatigue_score"],
    consequences: [
      "Delayed response to a deteriorating condition",
      "Higher cognitive load on the crew commander",
      "Stock-outs of medication or consumables",
      "Sense of distance and separation affecting mood",
    ],
    prevention: [
      "Decide in advance which decisions the crew can take autonomously.",
      "Keep a stored margin of medication, water and spares.",
      "Rehearse delayed-communication consultations before the mission.",
    ],
    countermeasures: [
      {
        title: "Autonomous care authority",
        detail: "Written standing orders let the commander authorise defined treatments when the delay exceeds the safe window.",
        cadence: "mission",
        systemIds: ["brain", "heart"],
      },
      {
        title: "Asynchronous telemedicine packet",
        detail: "Send structured vitals, images and notes in one bundle so the ground team can review without a live link.",
        cadence: "weekly",
        systemIds: ["heart"],
      },
      {
        title: "Consumable margin review",
        detail: "Check medication, water and spare-part reserves against the projected remaining transit.",
        cadence: "weekly",
        systemIds: ["digestive"],
      },
      {
        title: "Delay-aware consultation drill",
        detail: "Practise a consultation with the real light-time delay simulated.",
        cadence: "mission",
        systemIds: ["brain"],
      },
    ],
    exposure: {
      label: "One-way light time",
      value: "4m 21s",
      note: "Demonstration value for the current Earth–vehicle range (78.4M km).",
    },
  },
  {
    id: "gravity",
    name: "Gravity fields",
    tagline: "Weightlessness, then a planetary surface",
    what: "The crew lives without gravitational loading, then must work in partial gravity on arrival — with a body that has adapted to neither.",
    howItAffects: [
      "Bone mineral density falls in unloaded regions of the skeleton.",
      "Muscle mass and strength decline without resistance loading.",
      "Blood volume and orthostatic tolerance drop, causing dizziness on standing.",
      "Vestibular adaptation makes head movement and translation disorienting at first.",
    ],
    affectedSystems: ["bones", "muscles", "heart", "brain", "eyes"],
    metricIds: ["exercise_hours", "heart_rate", "bp_systolic", "bp_diastolic"],
    consequences: [
      "Fracture risk and renal stones",
      "Loss of functional strength for surface operations",
      "Orthostatic intolerance on return or landing",
      "Space motion sickness and spatial disorientation",
    ],
    prevention: [
      "Load the skeleton and muscles on a fixed schedule, not by feel.",
      "Measure orthostatic response, not just resting blood pressure.",
      "Progress surface activity gradually after arrival.",
    ],
    countermeasures: [
      {
        title: "Resistive exercise session",
        detail: "Prescribed load targeting hips, spine and legs; log duration and perceived effort.",
        cadence: "daily",
        systemIds: ["bones", "muscles"],
      },
      {
        title: "Aerobic session",
        detail: "Continuous cardiovascular work at the prescribed intensity.",
        cadence: "daily",
        systemIds: ["heart"],
      },
      {
        title: "Orthostatic stand test",
        detail: "Blood pressure and heart rate before and after two minutes standing; report dizziness or vision greying.",
        cadence: "weekly",
        systemIds: ["heart", "brain"],
      },
      {
        title: "Lower-body negative pressure",
        detail: "Seated or supine session to restore fluid distribution and vascular tone.",
        cadence: "weekly",
        systemIds: ["heart"],
      },
      {
        title: "Graduated surface loading",
        detail: "Increase walking and load over the first days on a planetary surface.",
        cadence: "mission",
        systemIds: ["bones", "muscles"],
      },
    ],
    exposure: {
      label: "Loading countermeasure",
      value: "2.0 h/day target",
      note: "Demonstration target derived from the exercise metric's normal range.",
    },
  },
  {
    id: "hostile",
    name: "Hostile & closed environments",
    tagline: "Recycled air, noise, dust and a sealed hull",
    what: "The habitat is a closed loop: the same air and water are processed repeatedly, machinery runs continuously, and there is no way to open a window.",
    howItAffects: [
      "CO₂ and trace contaminants concentrate when scrubbing lags.",
      "Continuous fan and pump noise fragments sleep.",
      "Dust and microbial growth irritate airways, eyes and skin.",
      "Immune function can drift during long confinement.",
    ],
    affectedSystems: ["lungs", "eyes", "brain", "digestive"],
    metricIds: ["cabin_co2", "spo2", "resp_rate", "sleep_hours"],
    consequences: [
      "Headache, fatigue and reduced cognitive performance from CO₂",
      "Respiratory irritation and impaired sleep",
      "Allergic or infectious illness spreading in a closed crew",
      "Loss of trust in the environment when symptoms are unexplained",
    ],
    prevention: [
      "Watch cabin CO₂ as a vital sign of the habitat.",
      "Investigate clusters of symptoms rather than individuals.",
      "Protect the sleep period from noise and light.",
    ],
    countermeasures: [
      {
        title: "CO₂ scrubber check",
        detail: "Verify scrubber performance and cabin concentration; correlate with headache and fatigue reports.",
        cadence: "daily",
        systemIds: ["lungs", "brain"],
      },
      {
        title: "Air and water quality sample",
        detail: "Microbial and particulate sampling of the atmosphere and potable water loop.",
        cadence: "weekly",
        systemIds: ["lungs", "digestive"],
      },
      {
        title: "Noise and light survey",
        detail: "Measure the sleep station during the rest period and correct the dominant source.",
        cadence: "mission",
        systemIds: ["brain"],
      },
      {
        title: "Symptom cluster review",
        detail: "Any two crew reporting the same symptom within 48 h triggers an environmental review.",
        cadence: "immediate",
        systemIds: ["lungs", "eyes"],
      },
    ],
    exposure: {
      label: "Cabin CO₂ · peak today",
      value: "0.51%",
      note: "Demonstration figure. Normal ceiling configured at 0.5%.",
    },
  },
];

export const HAZARD_MAP: Record<HazardId, Hazard> = Object.fromEntries(
  HAZARDS.map((h) => [h.id, h]),
) as Record<HazardId, Hazard>;

export function getHazard(id: HazardId): Hazard {
  return HAZARD_MAP[id];
}

export const DEFAULT_HAZARD_ID: HazardId = "radiation";
