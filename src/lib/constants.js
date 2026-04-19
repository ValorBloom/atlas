// Anchor App Constants

export const ADMIN_PIN = "SAF2040";

export const RANKS = [
  "REC", "PTE", "LCP", "CPL", "CFC",
  "3SG", "2SG", "1SG", "SSG", "MSG",
  "3WO", "2WO", "1WO", "MWO", "SWO", "CWO",
  "OCT", "2LT", "LTA", "CPT", "MAJ", "LTC", "SLTC", "COL",
  "BG", "MG", "LG"
];

export const UNITS = [
  "1 SIR", "2 SIR", "3 SIR", "4 SAR", "5 SAR",
  "OCS", "SCS", "SAFTI MI", "HQ TRADOC", "BMT Centre"
];

export const LOCATIONS = [
  "Camp", "SAF Ferry Terminal", "Tekong Jetty", "Medical Centre",
  "Cookhouse", "Training Shed", "SOC Ground", "BTP", "Parade Square",
  "Company Line", "HQ", "Guard Room", "Armskote"
];

export const PURPOSES = [
  "Training", "Medical Appointment", "Admin", "Duty",
  "Personal Errand", "Book Out", "Book In", "Fatigue",
  "Guard Duty", "Ration Run", "COS Detail"
];

export const SFT_ACTIVITIES = [
  "Running (2.4km)", "Running (5km)", "Push-ups", "Sit-ups",
  "Pull-ups", "Shuttle Run", "Standing Broad Jump",
  "Swim (IPPT)", "SOC", "Route March", "Other PT"
];

export const SFT_LOCATIONS = [
  "Track", "Gym", "SOC Ground", "Pool", "Training Shed",
  "Company Line", "Route (Camp)", "Route (External)"
];

export const POINT_REASONS = [
  "Punctuality", "Cleanliness", "Initiative", "Teamwork",
  "Physical Performance", "Duty Excellence", "Leadership",
  "Late for parade", "Improper attire", "Missing equipment",
  "Custom"
];

export const STATUS_TYPES = ["RSO", "MA", "RSI"];

export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error"
};

// Time format: HHmm (24hr)
export const TIME_REGEX = /^([01]\d|2[0-3])[0-5]\d$/;

export const formatTime = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return hhmm;
  return `${hhmm.slice(0, 2)}${hhmm.slice(2)}h`;
};

export const formatRankName = (rank, name) => {
  return `${rank} ${name}`.trim();
};

export const getCurrentDateSG = () => {
  return new Date().toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' });
};

export const getCurrentTimeSG = () => {
  const now = new Date();
  const sg = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  return `${String(sg.getHours()).padStart(2, '0')}${String(sg.getMinutes()).padStart(2, '0')}`;
};

export const isAdmin = (user) => {
  return user?.is_admin === true || user?.role === 'instructor';
};