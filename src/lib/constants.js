// Anchor App Constants

export const ADMIN_PIN = "SAF2040";

export const CADET_RANKS = ["SCT", "OCT", "ME4T"];

export const INSTRUCTOR_RANKS = [
  "2LT", "LTA", "CPT", "MAJ", "LTC", "SLTC", "COL",
  "ME4", "ME5", "ME6",
  "MSG", "3WO", "2WO", "1WO", "MWO"
];

export const RANKS = [...CADET_RANKS, ...INSTRUCTOR_RANKS];

export const UNITS = [
  "Alpha", "Charlie", "Delta", "Echo", "Sierra", "Tango",
  "Mids", "Air", "DIS"
];

// Unit-specific platoon/section groups
export const UNIT_GROUPS = {
  Air: ["Alpha", "Bravo", "Charlie"],
  DIS: ["Byte 1", "Byte 2", "Byte 3", "Byte 4", "Byte 5", "Byte 6"],
  Mids: ["Sea Tiger", "Sea Lion", "Sea Dragon"],
};

export const PLATOONS = [1, 2, 3, 4];
export const SECTIONS = [1, 2, 3, 4];

// Returns the group label for unit (Platoon / Flight / Byte etc.)
export const getGroupLabel = (unit) => {
  if (unit === 'Air') return 'Flight';
  if (unit === 'DIS') return 'Byte';
  if (unit === 'Mids') return 'Division';
  return 'Platoon';
};

export const getGroupOptions = (unit) => {
  if (UNIT_GROUPS[unit]) return UNIT_GROUPS[unit];
  return PLATOONS.map(p => `Platoon ${p}`);
};

export const getSectionOptions = (unit) => {
  if (UNIT_GROUPS[unit]) return null; // No sections for these units
  return SECTIONS.map(s => `Section ${s}`);
};

export const LOCATIONS = [
  "DHA",
  "WINGLINE",
  "TRASH POINT",
  "STADIUM",
  "OCS HQ",
  "MEDICAL CENTRE",
  "AUDITORIUM",
  "EXAM HALL",
  "E-MART",
  "PASS OFFICE",
  "LIBRARY",
];

export const PURPOSES = [
  "TO COLLECT OUTRATION",
  "TO SET UP SAFETY STORE",
  "TO RSI",
  "TO HAVE LUNCH",
  "TO HAVE DINNER",
  "TO BOOKOUT",
  "TO THROW TRASH",
  "TO ATTEND STAFF PARADE",
  "TO ATTEND CERT BRIEF",
  "TO JOIN BACK MAIN BODY",
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