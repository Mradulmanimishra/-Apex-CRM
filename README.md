# 🌌 Quantum CRM — Self-Hosted Command Center

[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TailwindCSS-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Capacitor](https://img.shields.io/badge/Mobile-Android%20%7C%20PWA-118D9B?logo=android&logoColor=white)](https://capacitorjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Quantum CRM is a premium, self-hosted Customer Relationship Management (CRM) platform featuring a stunning glassmorphic dark-theme design. Engineered for businesses requiring strict **data sovereignty, zero recurring SaaS licensing overhead, and offline capabilities**, Quantum CRM acts as a unified command center for B2B/B2C transactions, client communication, and support queues.

---

## 🎯 Strategic Value Proposition

* **100% Data Sovereignty**: All corporate telemetry, client contact lists, and pipeline financials stay securely within your controlled environment in a single, transportable SQLite file.
* **Zero SaaS Fees**: Eliminates high per-seat subscription models (Salesforce, HubSpot) while providing core pipelines, support queues, and automated follow-ups.
* **Intelligent WhatsApp Funnels**: A designed WhatsApp integration pipeline logs incoming leads and communications as rich activities, bridging the gap for mobile-first customer outreach.
* **Progressive Web App (PWA) Installable**: Native-feeling mobile app behavior that can be installed on Android/iOS home screens, with companion Capacitor configurations for native APK compiling.

---

## 🚀 Key Capabilities

1. **Revenue Command Center**: Live KPIs including Open Pipeline Value, Risk-Adjusted Weighted Forecasts, Win Rate %, Active accounts, and open ticket volumes using interactive **Recharts** visualizations.
2. **Deals Pipeline (Kanban & Table)**: Interactive Kanban board grouped by deal stage featuring HTML5 drag-and-drop stage progression, automatic probability recalibration, and detailed lost-reason capturing.
3. **Global Search Palette (`Ctrl + K`)**: Instant keyboard-triggered command overlay querying Contacts, Companies, Deals, and Tickets with a debounced SQL backend search engine.
4. **Smart Notification Center**: Dynamic alert drawer highlighting overdue follow-ups, daily tasks, and high-priority ticket escalations, with interactive redirection links.
5. **WhatsApp Simulator Webhook**: Fully built mock simulation logging incoming WhatsApp messages as activities and auto-generating contacts for new phone numbers.
6. **CSV Export Engine**: One-click data migration backups for both contact directories and deals records.

---

## 📂 Architecture & Technical Stack

```text
├── backend/
│   ├── database.js     # SQLite connection, FK constraint configuration, schema & mock seeding
│   ├── server.js       # Express app setup, CORS credentials configuration, and production server
│   ├── routes.js       # REST APIs, debounced search endpoints, and notifications aggregation logic
│   └── crm.db          # Unified SQLite database file (highly portable for hot-backups)
│
├── frontend/
│   ├── src/
│   │   ├── views/      # Relational modular views (Dashboard, Contacts, Pipeline, Tickets, etc.)
│   │   ├── App.jsx     # Global state controller, Ctrl+K listeners, and navigation managers
│   │   └── main.jsx    # React mounting point & Service Worker PWA registration entry
│   ├── public/
│   │   ├── manifest.json  # PWA webmanifest (icons, background styling, standalone settings)
│   │   └── sw.js          # Service worker pass-through script supporting browser installer banners
│   ├── capacitor.config.json # Capacitor native wrapper definitions
│   └── tailwind.config.cjs   # Custom branding theme (typography & palette extenders)
```

### Technical Highlights:
* **Relational Database Integrity**: Fully utilizes SQLite `PRAGMA foreign_keys = ON` to manage cascading actions and links between Contacts, Companies, Deals, Activities, and Tickets.
* **Frontend Performance**: Built using **Vite** for optimized assets compilation and features responsive, hardware-accelerated Tailwind transitions.
* **Mobile-First Touch Target Design**: Input elements and menus utilize standardized HSL tailored touch scales matching Apple/Google mobile tap target guidelines (minimum 44x44px).

---

## 🛠️ Quick Start & Local Deployment

### 1. Prerequisite Installations
Ensure you have [Node.js](https://nodejs.org/) (v16.x or higher) installed.

### 2. Dependency Setup
Clone the repository and run the root installation script to configure the workspaces:
```bash
npm run install:all
```

### 3. Launch Development Environment
Run both backend Express (port 3000) and frontend Vite (port 5173) simultaneously:
```bash
npm run dev
```

* **Frontend Command Console**: [http://localhost:5173/](http://localhost:5173/)
* **Backend API Docs / Metrics**: [http://localhost:3000/api/dashboard](http://localhost:3000/api/dashboard)
* **Default Developer Override Login**: `admin` / `admin`

---

## 📱 Mobile App Compilation (Capacitor Android)

To bundle the web app into an Android package (`.apk`):

1. **Verify Requirements**: Make sure you have **Android Studio** and **Java JDK 17+** installed.
2. **Compile Web Assets**:
   ```bash
   cd frontend
   npm run build
   npx cap copy android
   ```
3. **Build APK**:
   * Open the directory `frontend/android` inside Android Studio.
   * Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.

---

## 📈 Future Strategic Roadmap

- [ ] **Database Migration (PostgreSQL)**: Transition database configurations from SQLite files to cloud-scale PostgreSQL.
- [ ] **Role-Based Access Control (RBAC)**: Upgrade the current session authentication to full JWT-signed payloads with custom agent permissions.
- [ ] **Live Twilio API Connector**: Replace the WhatsApp simulator with a production webhook mapping real client conversations directly into timelines.
