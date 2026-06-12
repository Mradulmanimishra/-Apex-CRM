# Quantum CRM - Self-Hosted CRM Web Application

A premium, self-hosted Customer Relationship Management (CRM) web application featuring a stunning dark-theme command-center design, built with React, Tailwind CSS, Express, and SQLite.

## Project Structure

```text
├── backend/
│   ├── database.js     # SQLite connection, schemas & seeds
│   ├── server.js       # Express server entry point
│   ├── routes.js       # REST APIs & Aggregated metrics
│   ├── package.json    # Backend dependencies (express, sqlite3, cors)
│   └── crm.db          # The SQLite database file (created on startup)
│
├── frontend/
│   ├── src/
│   │   ├── views/      # Individual page views (Dashboard, Contacts, etc.)
│   │   ├── App.jsx     # App shell & router navigation
│   │   ├── main.jsx    # React entry mount point
│   │   └── index.css   # Custom typography, animations & scrollbar base
│   ├── tailwind.config.cjs
│   ├── postcss.config.cjs
│   ├── vite.config.js  # Vite dev server + proxy settings
│   └── package.json    # Frontend dependencies (recharts, lucide-react, tailwindcss)
│
├── package.json        # Root script runner for concurrent execution
└── README.md
```

## Running the Application Locally

Follow these quick commands to set up and start the application:

1. **Install Dependencies (Root, Backend & Frontend)**
   At the root of the project folder, run:
   ```bash
   npm run install:all
   ```

2. **Start Development Servers (Concurrently)**
   Start both the Express backend (port 3000) and the Vite frontend (port 5173) in watch mode:
   ```bash
   npm run dev
   ```

3. **Access the CRM App**
   Open your browser and navigate to:
   - **Frontend UI**: [http://localhost:5173/](http://localhost:5173/)
   - **Backend API Docs**: [http://localhost:3000/api/dashboard](http://localhost:3000/api/dashboard)

---

## Database & Backups

This application uses **SQLite** for zero-cost, serverless database storage.
* **Database File Location**: `backend/crm.db`
* **Backup Process**: To back up the entire CRM database, simply copy the `crm.db` file to a secure directory (e.g. cloud storage or external drive) while the application is idle.
* **Restore Process**: Overwrite the `backend/crm.db` file with your backup file, then start the server.

---

## Technical Features

1. **Revenue Command Center**: Tracks real-time metrics (Open Pipeline Value, Weighted open pipeline, Win Rate %, Active Customers, Open support tickets) and includes interactive graphs (Recharts Area Charts and Stage Funnels).
2. **Upcoming Follow-ups**: Highlights tasks scheduled in the next 7 days, with specialized red warning indicators for overdue tasks (`next_action_date < today`).
3. **Contacts Directory**: Fully searchable and filterable table. Clicking a contact displays their individual relation card, rendering all linked deals, support tickets, and activity logs in a single sidebar overlay.
4. **Deals Pipeline**: Interactive Kanban board grouped by stage with support for HTML5 drag-and-drop actions. Also features a list/table alternative view.
5. **Support Ticket Queue**: Groups tickets filterable by priority (Low, Medium, High, Urgent) and statuses.
