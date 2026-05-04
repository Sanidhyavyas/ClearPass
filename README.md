# ClearPass

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

ClearPass is a full-stack digital college clearance management system that eliminates manual, paper-based processes. Students submit clearance requests through a self-service portal, each department independently approves or rejects based on outstanding obligations (fees, library dues, attendance, etc.), and a signed PDF clearance certificate is automatically generated the moment all departments clear a student. The platform supports multiple academic semesters, a five-tier role hierarchy, real-time notifications, audit trails on every action, and an analytics dashboard — making institutional clearance fast, transparent, and fully auditable.

---

## Screenshots

> _Add screenshots here once the UI is finalized._

| Student Dashboard | Admin Panel | Certificate Preview |
|:-----------------:|:-----------:|:-------------------:|
| ![Student Dashboard](docs/screenshots/student-dashboard.png) | ![Admin Panel](docs/screenshots/admin-panel.png) | ![Certificate](docs/screenshots/certificate.png) |

---

## Key Features

- **Multi-role access control** — Student, Teacher, TGC, Admin, and Super Admin, each with scoped permissions
- **Smart clearance engine** — Configurable auto-approval logic that evaluates external service data (attendance, fees, library)
- **Certificate generation** — PDF clearance certificates generated automatically on full clearance, with QR-code verification tokens
- **Multi-semester support** — Students and clearance records are scoped to academic semesters; a semester switcher is built into the UI
- **Real-time notifications** — In-app notification bell with persistent read/unread state
- **Audit logs** — Every approval, rejection, and admin action is recorded with timestamps and actor metadata
- **Analytics dashboard** — Charts and summary cards powered by Recharts for clearance rates, department bottlenecks, and trends
- **Dark / Light theme** — System-aware theme toggle persisted per user
- **Rate limiting & request logging** — Express-level rate limiter and structured Winston logs on every request
- **Email notifications** — Nodemailer integration (Gmail / Mailtrap) for status updates and certificate delivery

---

## System Roles

| Role | Responsibilities |
|------|-----------------|
| **Student** | Submit clearance requests, track department statuses, download clearance certificates |
| **Teacher** | Review and approve/reject clearance requests for their assigned subjects or departments |
| **TGC** _(Training & Guidance Cell)_ | Manage TGC-specific clearance modules, issue TGC certificates, handle subject assignments |
| **Admin** | Manage students, teachers, subjects, and semesters; view audit logs; oversee all clearance activity for their institution |
| **Super Admin** | Cross-institution oversight, manage admin accounts, access platform-wide analytics and configuration |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Tailwind CSS 3, Bootstrap 5, Recharts, Axios, DnD Kit |
| **Backend** | Node.js, Express 5, JWT (jsonwebtoken), bcrypt, Joi validation |
| **Database** | PostgreSQL 15+ (via `pg`), MySQL2 compatible |
| **Auth** | JWT-based, role-scoped middleware, refresh-token ready |
| **File Handling** | Multer (uploads), PDFKit (certificate generation), QRCode |
| **Email** | Nodemailer (SMTP — Gmail or Mailtrap) |
| **Logging** | Winston (structured JSON in production, pretty in dev) |
| **Deployment** | Vercel (frontend + backend via `vercel.json`) |

---

## Project Structure

```
ClearPass/
├── clearpass-backend/          # Express API
│   ├── config/                 # App-wide constants
│   ├── controllers/            # Route handler logic (19 modules)
│   ├── middleware/             # Auth, rate limiter, logger, uploads, validation
│   ├── migrations/             # SQL migration files
│   ├── routes/                 # Express routers (19 route files)
│   ├── services/               # Clearance engine, remarks engine, external services
│   ├── utils/                  # Logger (Winston), Mailer (Nodemailer)
│   ├── uploads/                # Generated certificates
│   ├── db.js                   # PostgreSQL connection pool
│   ├── index.js                # Express app entry point
│   └── vercel.json
│
└── clearpass-frontend/         # React SPA
    ├── src/
    │   ├── components/         # Shared UI — Navbar, NotificationBell, SemesterSwitcher, Charts, Modals
    │   ├── context/            # AuthContext, ThemeContext, ToastContext
    │   ├── pages/              # Role-based pages — Student, Teacher, Admin, SuperAdmin dashboards
    │   ├── services/           # Axios API service layer
    │   └── utils/              # Utility helpers
    ├── public/
    └── vercel.json
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

---

### Backend

```bash
# 1. Navigate to the backend folder
cd clearpass-backend

# 2. Install dependencies
npm install

# 3. Copy the example environment file and fill in your values
cp .env.example .env

# 4. Create the database and run migrations
# Connect to your PostgreSQL instance and run:
psql -U <your_user> -d <your_db> -f schema_pg.sql

# 5. Start the development server
npm run dev
```

The API will be available at `http://localhost:5000`.

---

### Frontend

```bash
# 1. Navigate to the frontend folder
cd clearpass-frontend

# 2. Install dependencies
npm install

# 3. Create a .env file with the backend URL
echo "REACT_APP_API_URL=http://localhost:5000" > .env

# 4. Start the development server
npm start
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Copy `clearpass-backend/.env.example` to `clearpass-backend/.env` and set the following:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_NAME` | Database name | `clearpass` |
| `DB_PORT` | Database port | `5432` |
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | Long random secret for JWT signing | `replace_with_a_long_random_secret` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username / email address | `your_email@gmail.com` |
| `SMTP_PASS` | SMTP password / app password | `your_app_password` |
| `LOG_LEVEL` | Winston log level | `info` |

> **Security note:** Never commit your `.env` file. It is already listed in `.gitignore`.

---

## API Overview

All routes are prefixed with `/api`.

| Route Module | Path | Description |
|---|---|---|
| Auth | `/api/auth` | Login, register, token refresh |
| Students | `/api/students` | Student CRUD and profile management |
| Teachers | `/api/teachers` | Teacher management |
| Admin | `/api/admin` | Admin operations and configuration |
| Super Admin | `/api/super-admin` | Cross-institution management |
| Clearance | `/api/clearance` | Submit, approve, reject clearance requests |
| Checklist | `/api/checklist` | Department clearance checklist items |
| Certificates | `/api/certificates` | Generate and download PDF certificates |
| Subjects | `/api/subjects` | Subject management |
| Assignments | `/api/assignments` | Subject-student-teacher assignments |
| Module Assignments | `/api/module-assignments` | Clearance module configuration |
| TGC Subjects | `/api/tgc-subjects` | TGC-specific subject management |
| TGC Certificates | `/api/tgc-cert` | TGC certificate issuance |
| Notifications | `/api/notifications` | In-app notification CRUD |
| Dashboard | `/api/dashboard` | Role-scoped dashboard summary data |
| Analytics | `/api/analytics` | Charts and clearance statistics |
| Audit | `/api/audit` | Immutable action audit log |
| Uploads | `/api/uploads` | File upload endpoints (Multer) |
| Logs | `/api/logs` | Request log access (admin only) |

---

## Deployment

Both applications are deployed on **Vercel** using their respective `vercel.json` configuration files.

### Backend

The backend `vercel.json` rewrites all requests to `index.js`, enabling serverless deployment of the Express app.

```bash
# From clearpass-backend/
vercel --prod
```

### Frontend

The frontend `vercel.json` handles client-side routing by redirecting all paths to `index.html`.

```bash
# From clearpass-frontend/
vercel --prod
```

Set the `REACT_APP_API_URL` environment variable in your Vercel project settings to point to the deployed backend URL.

---

## Roadmap

- [ ] Mobile-responsive redesign (PWA support)
- [ ] Push notifications via Web Push / FCM
- [ ] Bulk clearance operations for admins
- [ ] CSV / Excel export for clearance records
- [ ] OAuth 2.0 (Google SSO) for student login
- [ ] Automated test suite (Jest + Supertest for API, React Testing Library for UI)
- [ ] Docker Compose setup for local development
- [ ] Internationalization (i18n) support

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with care by <a href="https://github.com/sanidhyavyas-clearpass">Sanidhya Vyas</a></p>
