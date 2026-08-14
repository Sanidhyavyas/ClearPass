# ClearPass: What to do next

This roadmap is based on a quick technical review of your current backend + frontend implementation.

## 1) Fix the highest-risk issues first (this week)

1. **Protect sensitive backend routes with JWT auth + role checks** *(done)*
   - Every route file now applies `verifyToken` (and `authorizeRoles` where roles matter) via `middleware/authMiddleware.js`.
   - Ownership checks still worth a review: confirm students can only read their own dashboard data.

2. **Harden client token handling** *(done)*
   - `api.js` interceptor now checks `isTokenExpired()` (via `jwt-decode`) before every request and redirects to `/login` on expiry.
   - No raw `token.split(...)` decoding remains in the frontend.

3. **Resolve status vocabulary drift** *(no change needed)*
   - Verified: DB, API, and shared constants (`backend/config/constants.js` + `frontend/src/utils/academicConfig.js` `CLEARANCE_STATUS`) all use `pending|approved|rejected`.
   - Recharts components in `ChartCard.js` use Title Case only as Bar `dataKey` display labels, not as stored values.

4. **Unify API access layer in frontend** *(done — no change needed)*
   - `TeacherDashboard` already uses the shared `API` service (interceptors + baseURL); no raw `axios` calls found.

## 2) Make the codebase maintainable (next 1–2 weeks)

1. **Split backend `index.js` into modules**
   - Create folders: `routes/`, `controllers/`, `middlewares/`, `services/`, `validators/`.
   - Keep `index.js` as server/bootstrap only.

2. **Add input validation**
   - Add schema validation (e.g., Zod/Joi/express-validator) for login/register and status update payloads.
   - Return consistent error shapes.

3. **Implement centralized error handling**
   - Use one Express error middleware instead of ad-hoc `try/catch` + repeated `res.status(500)` logic.

4. **Clean dependency set** *(done)*
   - `bcrypt` removed (only `bcryptjs` is used); `mysql2` removed from runtime deps (backend is PostgreSQL via `pg`); root `package.json` entries for `pg`/`twilio` removed.

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
