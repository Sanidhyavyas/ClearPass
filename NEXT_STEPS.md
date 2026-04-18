# ClearPass: What to do next

This roadmap is based on a quick technical review of your current backend + frontend implementation.

## 1) Fix the highest-risk issues first (this week)

1. **Protect sensitive backend routes with JWT auth + role checks**
   - Right now, routes that expose or update clearance data are publicly accessible (e.g., teacher update endpoints and student dashboards).
   - Add middleware for:
     - token verification,
     - role-based access (`student`, `teacher`, `admin`),
     - ownership checks (students can only read their own dashboard).

2. **Harden client token handling**
   - `StudentDashboard` decodes JWT directly with `token.split(...)` and no guard path. Add safe checks for missing/invalid tokens and redirect to login.

3. **Resolve status vocabulary drift**
   - You currently use both lowercase (`approved`) and Title Case (`Approved`) depending on feature path.
   - Standardize status values across DB + API + UI (`pending|approved|rejected`) and map to display labels in one place.

4. **Unify API access layer in frontend**
   - Most pages use `API` service with interceptors, but `TeacherDashboard` uses raw `axios` + hardcoded URL.
   - Move teacher calls into `src/services/api.js` helpers to avoid inconsistent auth headers and base URLs.

## 2) Make the codebase maintainable (next 1–2 weeks)

1. **Split backend `index.js` into modules**
   - Create folders: `routes/`, `controllers/`, `middlewares/`, `services/`, `validators/`.
   - Keep `index.js` as server/bootstrap only.

2. **Add input validation**
   - Add schema validation (e.g., Zod/Joi/express-validator) for login/register and status update payloads.
   - Return consistent error shapes.

3. **Implement centralized error handling**
   - Use one Express error middleware instead of ad-hoc `try/catch` + repeated `res.status(500)` logic.

4. **Clean dependency set**
   - You have both `bcrypt` and `bcryptjs` in backend deps but only use `bcryptjs`.
   - Root package contains `pg`, while backend uses MySQL (`mysql2`); remove unused packages to reduce confusion.

## 3) Improve product completeness (next sprint)

1. **Implement Admin dashboard functionality**
   - `AdminDashboard.js` is currently empty but routed in `App.js`.
   - Define admin workflows: users list, approvals audit log, bulk actions, reporting.

2. **Create a single auth UX flow**
   - You currently have both combined login/register in `Login.js` and a separate `Register.js` page not wired in routes.
   - Choose one approach and remove dead paths.

3. **Add loading + empty + error states in dashboards**
   - Teacher and student pages should show meaningful feedback when API is slow/fails/no data.

## 4) Add quality gates before scaling

1. **Testing baseline**
   - Backend: add integration tests for `/register`, `/login`, route authorization, and teacher status update.
   - Frontend: add RTL tests for role-based routing and dashboard rendering states.

2. **Environment/config hygiene**
   - Move host URLs to environment variables (`REACT_APP_API_URL`) and avoid hardcoding localhost.

3. **Developer docs**
   - Replace default CRA README with project-specific setup docs:
     - architecture,
     - env vars,
     - DB schema + seed,
     - run/test/deploy commands.

## Suggested execution order

1. Auth middleware + route protection.
2. Status standardization + frontend API unification.
3. Admin dashboard MVP.
4. Tests + CI + documentation.

If you want, next I can convert this into a concrete 2-week implementation checklist with file-by-file tasks and estimated effort.
