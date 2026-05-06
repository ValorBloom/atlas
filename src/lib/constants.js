// ATLAS App Constants

export const ADMIN_PIN = "SAF2040";

// Unit-join PINs — required for ALL users (cadet and instructor) when selecting a unit
export const UNIT_PINS = {
  Alpha:   "482731",
  Charlie: "615284",
  Delta:   "903617",
  Echo:    "274958",
  Sierra:  "531846",
  Tango:   "768129",
  Air:     "040475",
  Mids:    "050567",
  DIS:     "281022",
};

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
  "Gym @ Wingline",
  "Running @ Yellow Cluster Parade Square",
  "Running @ DIS Wing Approved Route",
  "Frisbee @ Basketball court",
  "Basketball @ Basketball court",
  "Other ball @ Yellow Cluster Parade Square",
  "Badminton @ Basketball court",
];

export const SFT_LOCATIONS = [
  "Wingline", "Yellow Cluster Parade Square", "DIS Wing Approved Route",
  "Basketball court", "Track", "Gym", "SOC Ground", "Pool", "Training Shed"
];

export const POINT_REASONS = [
  "Punctuality", "Cleanliness", "Initiative", "Teamwork",
  "Physical Performance", "Duty Excellence", "Leadership",
  "Late for parade", "Improper attire", "Missing equipment",
  "Custom"
];

export const STATUS_TYPES = ["RSO", "MA", "RSI"];

// Duty types per unit
export const getDutyTypes = (unit) => {
  const base = unit === 'DIS'
    ? ['CDG', 'Guard Duty', 'Store Team', 'Safety Duty']
    : ['CDO', 'CDS', 'Guard Duty', 'Store Team', 'Safety Duty'];
  return base;
};

// Points hierarchy for duties
export const DUTY_POINTS = {
  'Guard Duty':   { weekday: 12, weekend: 15 },
  'CDO':          { weekday: 6,  weekend: 9  },
  'CDS':          { weekday: 6,  weekend: 9  },
  'CDG':          { weekday: 6,  weekend: 9  },
  'Store Team':   { weekday: 3,  weekend: 4  },
  'Safety Duty':  { weekday: 3,  weekend: 4  },
};

export const getDutyPoints = (dutyType, isWeekendDay) => {
  const config = DUTY_POINTS[dutyType];
  if (!config) return 0;
  return isWeekendDay ? config.weekend : config.weekday;
};

export const DUTY_COLORS = {
  CDO:           { bg: 'bg-primary/10',        text: 'text-primary',      border: 'border-primary/25'      },
  CDS:           { bg: 'bg-green-500/10',       text: 'text-green-400',    border: 'border-green-500/25'    },
  CDG:           { bg: 'bg-amber-500/10',       text: 'text-amber-400',    border: 'border-amber-500/25'    },
  'Guard Duty':  { bg: 'bg-destructive/10',     text: 'text-destructive',  border: 'border-destructive/25'  },
  'Store Team':  { bg: 'bg-violet-500/10',      text: 'text-violet-400',   border: 'border-violet-500/25'   },
  'Safety Duty': { bg: 'bg-orange-500/10',      text: 'text-orange-400',   border: 'border-orange-500/25'   },
};

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
  return user?.user_role === 'instructor';
};

export const isCadetAdmin = (user) => {
  return user?.user_role === 'cadet_admin';
};

export const isAdmin = (user) => {
  return isInstructor(user) || isCadetAdmin(user);
};