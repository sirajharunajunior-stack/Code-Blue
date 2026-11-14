export type Scenario =
  | "normal"
  | "elevated_heart_rate"
  | "low_spo2"
  | "high_temperature"
  | "abnormal_respiration"
  | "recovery";

export type VitalStatus =
  | "normal"
  | "warning"
  | "critical"
  | "sensor_error"
  | "no_signal"
  | "inactive"
  | "no_data";

export type OverallStatus = "normal" | "warning" | "critical" | "no_signal" | "paused";

export interface AIExplanation {
  detected: string;
  readings: string[];
  meaning: string;
  factors: string[];
  immediate_actions: string[];
  escalation: string;
  follow_up: string;
  source?: string;
}

export interface Alert {
  id: number;
  alert_key: string;
  condition: string;
  vital: string;
  severity: "warning" | "critical";
  title: string;
  value: number | null;
  unit: string | null;
  threshold: string;
  detected_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  status: "active" | "acknowledged" | "resolved";
  ai_status: "pending" | "ready" | "fallback";
  explanation: AIExplanation;
  recommendation: string;
}

export interface Baseline {
  mean: number;
  std: number;
  samples: number;
  ready: boolean;
}

export interface VitalSeriesPoint {
  t: string;
  value: number | null;
}

export interface Vital {
  key: "heart_rate" | "spo2" | "temperature_c" | "respiratory_rate";
  label: string;
  unit: string;
  value: number | null;
  status: VitalStatus;
  status_label: string;
  expected: string;
  threshold: string;
  baseline: Baseline;
  series: VitalSeriesPoint[];
}

export interface HistoryPoint {
  recorded_at: string;
  heart_rate: number | null;
  spo2: number | null;
  temperature_c: number | null;
  respiratory_rate: number | null;
  activity: string;
}

export interface Snapshot {
  generated_at: string;
  device: {
    connected: boolean;
    monitoring: boolean;
    scenario: Scenario;
    scenario_label: string;
    activity: string;
    last_reading_at: string | null;
    tick_seconds: number;
  };
  overall: {
    status: OverallStatus;
    label: string;
    message: string;
  };
  summary: string;
  current: HistoryPoint | null;
  vitals: Vital[];
  history: HistoryPoint[];
  alerts: Alert[];
  active_alerts: Alert[];
  ai: {
    enabled: boolean;
    model: string;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  aiStatus?: "ready" | "fallback";
}
