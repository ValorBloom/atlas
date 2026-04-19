// Anchor App Constants

export const ADMIN_PIN = "SAF2040";

export const RANKS = [
  "SCT", "OCT", "ME4T",
  "2LT", "LTA", "CPT", "MAJ", "LTC", "SLTC", "COL",
  "ME4", "ME5", "ME6",
  "MSG", "3WO", "2WO", "1WO", "MWO"
];

export const UNITS = [
  "OCS, Alpha",
  "OCS, Charlie",
  "OCS, Delta",
  "OCS, Echo",
  "OCS, Sierra",
  "OCS, Tango",
  "OCS, Mids",
  "OCS, Air",
  "OCS, DIS"
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

// Role hierarchy:
// instructor = full admin (SAF2040 PIN required)
// cadet_admin = limited admin (appointed by instructor, can view movements + send parade state)
// cadet = standard user

export const isInstructor = (user) => {
  return user?.role === 'instructor' && user?.is_admin === true;
};

export const isCadetAdmin = (user) => {
  return user?.role === 'cadet_admin';
};

export const isAdmin = (user) => {
  return isInstructor(user) || isCadetAdmin(user);
};