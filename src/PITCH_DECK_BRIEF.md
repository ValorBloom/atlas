# ATLAS — Pitch Deck Master Brief

> A complete product, technical, and feature reference for building a detailed pitch deck.
> ATLAS is a mobile-first command & administration platform for military training units (modeled on the Singapore Armed Forces / OCS context).

---

## 1. ONE-LINER & POSITIONING

**ATLAS is the digital command centre for a military training unit** — replacing the scattered mess of WhatsApp text reports, paper parade states, and Excel duty rosters with one structured, role-aware mobile app.

- **Category:** Vertical SaaS / GovTech / Defence administration tooling.
- **Form factor:** Mobile-first web app, installable to iOS & Android home screens (PWA-style), built to feel like a native app.
- **Core promise:** Every status report, movement, fitness session, duty, and announcement flows through one auditable system — instructors get real-time visibility, cadets get a 30-second submission flow.

### The elevator pitch
> "Military training units still run daily operations over WhatsApp — sick reports, movement tracking, PT attendance, parade states, all as free-text messages that get lost, mistyped, and manually re-compiled every morning. ATLAS structures all of it. Cadets submit in taps; instructors approve in one screen; the parade state compiles itself; and a medical officer sees unit-wide health trends no one could see before."

---

## 2. THE PROBLEM

Military training units run high-tempo daily admin almost entirely on **WhatsApp + paper + Excel**:

| Pain point | Current reality | Cost |
|---|---|---|
| **Sick / status reporting** | Cadets text symptoms to a group chat; admin re-types into a parade state | Errors, lost messages, no audit trail |
| **Parade state compilation** | A cadet admin manually assembles the daily strength/status list every morning | 30–60 min of error-prone copy-paste daily |
| **Movement tracking** | "Moving off to cookhouse" texts; no one knows who's where | Safety/accountability gap |
| **PT / SFT attendance** | Names texted in, manually counted | No record, disputes |
| **Duty rosters** | Excel sheet, points tallied by hand | Unfair allocation, no transparency |
| **Approvals** | Verbal / chat, no record of who approved what | Zero accountability |
| **Medical oversight** | No one sees patterns across the unit | Outbreaks & abuse patterns missed |

**Root insight:** the data is *already being collected* — it's just unstructured, unaccountable, and re-keyed multiple times. ATLAS captures it once, at the source, in structure.

---

## 3. THE SOLUTION — HOW IT WORKS

A **single role-aware app** with four user roles. Each sees a different home screen and toolset, but all data lives in one auditable backend.

**The golden flow (status reporting → parade state):**
1. Cadet taps "Report Sick Outside (RSO)", enters symptoms (30 sec) → submitted as `pending_approval`.
2. Instructor gets a real-time notification → opens **Status Approvals** → approves/denies with one tap (denial requires a written reason).
3. Cadet sees a popup confirmation. After seeing the doctor, cadet taps "Update RSO/RSI" to add diagnosis + MC duration.
4. The **Parade State page auto-compiles** every approved status into the correct section (MC, Light Duty, MA, Temporary, Permanent) — with live strength / on-status / available counts.
5. Every action is written to an immutable **Audit Log**.

No manual re-typing. No lost messages. Full accountability.

---

## 4. USER ROLES (Access Control Model)

ATLAS has a 4-tier role hierarchy, gated at signup by **authorisation PINs**:

| Role | How they join | What they can do |
|---|---|---|
| **Cadet** | Unit PIN only | Submit movements, SFT, status reports; view CET, duties, tasks |
| **Cadet Admin** | Appointed in-app by an instructor | Everything a cadet does **+** open SFT windows, compile parade state, track movements, send announcements, assign duties |
| **Instructor** | Unit PIN **+** Instructor Auth Code (`SAF2040`) | Full command access — approvals, all admin tools, appoint admins, data clear |
| **Medical Officer (MO)** | MO Auth Code (`L1fe_First`) | Cross-unit health analytics dashboard (separate UI shell), no unit-admin tools |

**Security design:** unit membership is PIN-gated (each unit has its own 6-digit PIN). Elevated roles need a second secret code. This keeps the app open to self-registration while preventing privilege escalation.

> *Note for deck: these are demo PINs hardcoded in `lib/constants.js`. For production, call out that these would move to server-side secret validation.*

---

## 5. FEATURE INVENTORY (every feature, in depth)

### 5.1 Onboarding & Setup
- Two-step setup wizard: profile (name, unit, rank, role, platoon/section) → identity confirmation (unit PIN + role auth code).
- **Unit-aware org structure:** standard units use Platoon + Section; specialist units have custom groupings — **Air** = Flights (Alpha/Bravo/Charlie), **DIS** = Bytes (1–6), **Mids** = Divisions (Sea Tiger/Lion/Dragon). The form dynamically adapts labels and options per unit.
- Rank lists differ by role (cadet ranks: SCT, OCT, ME4T vs. instructor ranks: 2LT–COL, ME4–ME6, MSG–MWO).
- Profile persisted to the user record via the auth SDK; redirect to `/setup` enforced for any user missing a unit.

### 5.2 Status Reporting (the flagship module)
Cadet-submittable status types, each a guided multi-step form:
- **RSO** (Report Sick Outside) — symptoms → pending approval → post-consult diagnosis update.
- **RSI** (Report Sick Inside) — same, at the medical centre.
- **MA** (Medical Appointment) — appointment name, location, date, time.
- **OTHERS** — any other status/event needing endorsement.
- **PERM / TEMP** — manual permanent/temporary statuses added by admins directly on the parade state.

Workflow features:
- **Two-phase medical flow:** initial symptom report → instructor approval → post-consultation update (diagnosis + outcome category MC/Light Duty/Others + auto-calculated MC duration & end date).
- **Approval queue** (`Status Approvals` page): instructors approve/deny; **denials require a written reason** shown back to the cadet.
- All text normalized to **UPPERCASE** for official record consistency.
- Cadets see their own pending/denied reports with the instructor's denial reason inline.

### 5.3 Parade State (auto-compiler)
- Pulls all unit status reports and **auto-sorts into sections:** Awaiting Update, MC, Medical Appointments, Others, Temporary, Permanent.
- **Live headcount:** Strength / On Status / Available, computed from real records (dedup by person).
- **Auto-expiry:** statuses past their end date drop off automatically.
- Collapsible compact chip rows for resolved items, full cards for items needing attention.
- Admins can add manual PERM/TEMP statuses, delete entries.
- Refetches every 30 seconds for near-real-time accuracy.

### 5.4 Movement Tracking
- **Report departure:** select personnel (multi-select), from/to location, purpose, departure time → creates a movement log + broadcasts to admins.
- **Reached confirmation:** confirm arrival individually or as a group; updates status departed → reached.
- Predefined location & purpose lists (DHA, Wingline, Medical Centre, etc.) for one-tap entry.
- Live movement log for instructors/cadet admins with a 30-second auto-refresh; home dashboard shows "X out" count.

### 5.5 SFT / PT (fitness session management)
- **Cadet Admin opens an SFT window** (start/end time, approving instructor, salutation).
- **Cadets join** the active window — pick activity (gym, running, basketball…), set a 5-min-increment time range via a tap-friendly time selector.
- **Auto-generated report:** the system formats a complete, numbered, grouped-by-activity submission list ready to send to the instructor (matches the exact text format units use today).
- One-tap **copy to clipboard** + **submit to instructor** (with confirmation gate + popup).
- Admins can remove submissions; window can be closed.

### 5.6 CET — Daily Training Programme
- Instructors build the daily timetable (time + activity rows), set the WDI (duty instructor), add notes.
- **AI "Quote of the Day" generator:** context-aware — reads the day's activities and themes the motivational quote accordingly (PT day → endurance quotes, field → resilience, lessons → learning), with de-duplication so quotes don't repeat.
- **Reusable templates:** save/apply common timetables.
- Publishes to the unit as a formatted announcement **+** push notification.
- Date scroller (yesterday/today/tomorrow) with published-status dots.
- Cadets see the published CET and the daily quote on their home screen (with a show/hide toggle).

### 5.7 Duty Roster & Points
- Calendar-based duty assignment (month view, per-day roster).
- **Configurable duty types per unit** with weekday/weekend **point values** and colour coding (Guard Duty, CDO, CDS, CDG, Store Team, Safety Duty…).
- Multi-person assignment with duplicate detection; per-person notification on assignment.
- Points system designed for fair-share duty allocation (e.g. Guard Duty 12 weekday / 15 weekend pts).
- Settings panel to edit duty types, points, and colours.

### 5.8 Tasks
- Assignable to-do system: instructors/admins assign tasks (title, description, priority, due date, assignee) to personnel.
- Status tracking (Not Done / In Progress / Completed) with completion notes.
- Per-task detail page; home dashboard shows the cadet's outstanding task count.
- A standalone **task widget** route (`/widget/tasks`) for embedding.
- Backend **task reminder** function (scheduled) for due-date nudges.

### 5.9 Announcements
- Instructors/admins post unit notices, targetable to all / cadets / instructors.
- **AI draft assistant:** paste rough bullet points → AI converts to a formal military-style announcement.
- Auto-sends a push notification to the unit on publish.

### 5.10 Notifications
- In-app notification centre (unread badge on home + bottom nav).
- Categories: movement, SFT, status, points, admin, announcement, approval, system.
- Unit-broadcast and per-recipient targeting.
- Real-time unread counts.

### 5.11 Medical Officer Dashboard (analytics)
A completely separate UI shell for MOs, providing cross-unit health intelligence:
- **Overview charts:** symptom frequency, cases by unit, report types, reporting patterns.
- **Epidemic curve (epi curve):** time-series of cases to spot outbreak trends.
- **Wing-level comparison:** health load across units.
- **Watch lists:** identifies **health clusters** (symptom spikes) and **frequent filers** (cadets reporting sick unusually often) via configurable time windows.
- **AI-driven insights:** summarized health data sent to an LLM to surface risks, clusters, and recommendations.
- Service-role data access so the MO can see across unit silos (which normal RLS would block).

### 5.12 Command Centre & System Tools (instructor)
- **Command Centre dashboard:** unit overview & management hub.
- **Nominal Role:** full personnel directory.
- **Location Tracker:** live movement map/log.
- **Appoint Admin:** grant/revoke cadet-admin access in-app.
- **Data Clear:** controlled, audited data wipe with a **4-eyes (dual-witness) verification** requirement and full audit logging before any destructive action.

---

## 6. TECHNICAL ARCHITECTURE

### 6.1 Stack
- **Frontend:** React 18 + Vite, React Router v6, Tailwind CSS, shadcn/ui component library, lucide-react icons.
- **State/data:** TanStack React Query (caching, background refetch, optimistic updates).
- **Animation:** Framer Motion. **Charts:** Recharts. **Dates:** date-fns + moment.
- **Backend (BaaS):** Base44 — managed auth, entity database (JSON-schema entities with row-level security), serverless Deno functions, file storage, and built-in integrations (LLM, email, image/speech/video generation, file extraction).
- **Mobile:** responsive, safe-area-aware (notch/home-indicator insets), installable to iOS/Android home screens; non-selectable interactive elements and tap-highlight suppression for a native feel.

### 6.2 Data Model (entities)
Core entities, each a row-level-secured JSON schema:
- `User` (built-in; extended with unit, rank, user_role, platoon, section, display_name)
- `StatusReport` — the central record (RSO/RSI/MA/OTHERS/PERM/TEMP, approval state machine)
- `MovementLog`, `SFTWindow`, `SFTSubmission`
- `CETRecord`, `CETTemplate`, `Announcement`
- `DutyRoster`, `DutyConfig`
- `Task`, `Notification`, `PointLog`, `HomeConfig`, `AuditLog`

### 6.3 Security model (the technically impressive part)
- **Row-Level Security (RLS):** every entity enforces unit-level data siloing — a cadet in Alpha can never read Bravo's data; cadets see only their own status reports; instructors see their whole unit.
- **Role-conditioned policies:** read/create/update/delete rules branch on `user_role` (instructor / cadet_admin / medical_officer).
- **Service-role backend functions:** sensitive or cross-cutting writes (notifications, audit logs, status resolution, MO cross-unit reads) are routed through **Deno serverless functions** that run with elevated privileges *after* authenticating the caller — so cadets can trigger a broadcast notification they aren't directly allowed to write, without ever holding that permission. This is a deliberate "capability via vetted endpoint" pattern.
- **Audit logging:** all high-impact actions (approvals, denials, data clears, SFT submissions) write immutable `AuditLog` records — a forensic trail.
- **4-eyes principle:** destructive operations (Data Clear) require a second admin witness + are logged.
- **Schema validation (Zod):** backend functions validate payloads server-side before acting.
- **Defence-in-depth signup:** unit PIN + role auth code gating.

### 6.4 Backend functions (serverless)
`broadcastNotification`, `submitStatusReport`, `submitStatusUpdate`, `resolveStatusReport`, `getPendingApprovals`, `getAllStatusReports`, `adminUpdateUser`, `updateProfile`, `taskReminders`, `secureProxy` — each a single-purpose Deno handler with auth + validation.

### 6.5 Reliability patterns
- Secondary side-effects (notifications) wrapped in silent try/catch so a notification failure never blocks the primary action.
- `finally` blocks guarantee UI state (saving spinners) always reset.
- Confirmation popups on every critical action so users get unambiguous success feedback.
- 30-second background refetch on live views (parade state, movements) for near-real-time data without manual refresh.

---

## 7. WHAT MAKES IT DEFENSIBLE / DIFFERENTIATED

1. **Domain-exact UX:** the generated reports (SFT lists, parade states) match the *exact text format* units already use — zero retraining, instant adoption.
2. **Role-aware single app:** one codebase serves cadet, cadet-admin, instructor, and medical officer with entirely different surfaces.
3. **Structured data → analytics:** because everything is captured in structure, the **Medical Officer dashboard** delivers outbreak detection and abuse-pattern insights that are *impossible* in a WhatsApp world.
4. **Auditability & accountability:** every approval and destructive action is logged — a genuine compliance/governance upgrade.
5. **AI woven in pragmatically:** context-aware CET quotes, announcement drafting, and medical insight generation — useful, not gimmicky.

---

## 8. SUGGESTED SLIDE STRUCTURE

1. **Title** — ATLAS: the digital command centre for training units.
2. **The Problem** — WhatsApp + paper + Excel (use the problem table).
3. **The Insight** — the data is already collected, just unstructured.
4. **The Solution** — the golden flow diagram (status → approval → parade state).
5. **Product Tour** — 3–4 screens (home, status approval, parade state, MO dashboard).
6. **Roles & Access** — the 4-tier role table.
7. **Feature Breadth** — the module grid (status, movement, SFT, CET, duty, tasks, announcements, medical).
8. **Under the Hood** — architecture + the security model (RLS, service-role, audit, 4-eyes).
9. **The Moat** — domain-exact UX, structured data → analytics, accountability.
10. **AI Layer** — quote generation, announcement drafting, medical insights.
11. **Traction / Rollout** — unit-by-unit PIN-gated rollout model.
12. **Vision** — from one unit's admin tool to the standard operating system for military training administration.
13. **Ask** — (fill in: funding, pilot units, etc.)

---

## 9. METRICS & TALKING POINTS TO QUANTIFY (fill with real data)

- Time saved per daily parade state compile (est. 30–60 min/day/unit).
- Reduction in mis-keyed / lost status reports.
- Approval turnaround time (chat → structured one-tap).
- Number of units / cadets onboarded.
- Audit-log volume as proof of accountability.
- Outbreak detection lead-time improvement (MO dashboard).

---

## 10. RISKS / HONEST CALL-OUTS (good to pre-empt in Q&A)

- **Demo PINs are hardcoded** — production needs server-side secret management.
- **Official adoption / data governance** — military data residency & approval to operate.
- **Self-registration model** — PIN-gated; would tighten to invite-based for production.
- **Single-tenant-per-unit data siloing** is enforced by RLS — multi-unit scaling is a config concern, not a rewrite.