# CRM Build Spec — Prompt for Google Antigravity

Copy the section below ("PROMPT TO PASTE") into Antigravity's Agent Manager as your initial task. The sections after it are reference material — keep them in the project folder so the agent (and you) can refer back during follow-up tasks.

---

## PROMPT TO PASTE

```
Build a self-hosted CRM web application with the following stack:
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite (file-based, easy to back up; can migrate to Postgres later)

DATA MODEL — create these tables/entities with the exact fields listed:

1. Contacts
   - id (auto), name, email, phone, role_title, company_id (FK), source,
     status, tags, last_contact_date, notes

2. Companies
   - id (auto), company_name, industry, size, website,
     primary_contact_id (FK), account_owner, notes

3. Deals
   - id (auto), deal_name, contact_id (FK), company_id (FK), stage,
     value, probability, weighted_value (= value * probability, computed),
     expected_close_date, owner, source, lost_reason

4. Activities
   - id (auto), date, type, contact_id (FK), deal_id (FK, nullable),
     notes, next_action, next_action_date

5. Tickets
   - id (auto), contact_id (FK), issue_type, description, status,
     priority, assigned_to, opened_date, resolved_date

DROPDOWN / ENUM VALUES:
- Contacts.source / Deals.source: Referral, Website, Cold Outreach,
  Social Media, Event/Trade Show, Advertisement, WhatsApp, Other
- Contacts.status: Lead, Qualified, Active Customer, Inactive, Lost
- Deals.stage: New Lead, Qualified, Proposal Sent, Negotiation, Won, Lost
- Activities.type: Call, Email, Meeting, Site Visit, Demo, Note,
  WhatsApp Message
- Tickets.issue_type: Billing, Delivery Delay, Product Defect,
  Service Issue, General Inquiry, Other
- Tickets.status: Open, In Progress, Waiting on Customer, Resolved, Closed
- Tickets.priority: Low, Medium, High, Urgent

REQUIRED PAGES/VIEWS:

1. Contacts page — table view, searchable/filterable by status, source,
   tags. Add/edit/delete contacts. Clicking a contact shows linked
   Companies, Deals, Activities, and Tickets in one detail view.

2. Companies page — table view of companies with linked contacts.

3. Pipeline (Deals) page — Kanban-style board grouped by Deal.stage,
   drag-and-drop to change stage. Show deal name, value, owner on each
   card. Include a list/table view as an alternative to the board.

4. Activities page — chronological log, filterable by contact/deal.
   Highlight overdue items where next_action_date < today.

5. Tickets page — table view grouped/filterable by status and priority.

6. Dashboard (home page) — show:
   - Pipeline by stage: count of deals, total value, weighted value
     (table or bar chart)
   - Key metrics: open pipeline value, weighted open pipeline,
     won deals count, lost deals count, win rate (%), total won value
   - Upcoming follow-ups: list of Activities where next_action_date
     is within the next 7 days, sorted soonest first
   - Open tickets count by priority

GENERAL REQUIREMENTS:
- Single-user app for now; no login required, but structure the code so
  authentication can be added later without major rework.
- Mobile-responsive layout (this will be used on phones frequently).
- Seed the database with a small set of sample records (2-3 per table)
  matching the field structure above, so the UI is testable immediately.
- Provide a README with instructions to run the app locally
  (npm install, npm run dev) and where the SQLite database file is
  stored (for backup purposes).

Build this incrementally: first the database schema and API endpoints,
then the Contacts and Companies pages, then the Pipeline/Deals board,
then Activities and Tickets, then the Dashboard. After each major piece,
show me a summary and screenshot before moving to the next.
```

---

## Reference: Why these choices

- **SQLite** keeps this zero-cost and easy to back up (it's a single file you can copy). If the business grows, the schema translates directly to Postgres/MySQL.
- **No login initially** keeps the first build fast; the spec asks the agent to structure the code so auth can be added without a rewrite — important if you later share access with a team.
- **Kanban pipeline board** matches the "Pipeline by Stage" view from the design document and is the most-used CRM view day to day.
- **Dashboard metrics** mirror exactly what's already built into the spreadsheet template (`CRM_Template.xlsx`), so you can compare the two side by side.

## Suggested follow-up prompts (after the first build)

- *"Add a WhatsApp integration: log incoming messages as Activities with type 'WhatsApp Message' and create a new Contact automatically if the phone number doesn't exist."*
- *"Add a second pipeline for [service line name] with its own stages: [list stages]."*
- *"Add CSV export for Contacts and Deals so I can back up or migrate data."*
- *"Add basic username/password login so I can share this with my team."*

## Working with the agent (recommended settings)

- Start in **Agent-Assisted Mode** — review each step before it runs terminal commands.
- Initialize a **Git repository first** and ask the agent to commit after each major piece (schema, then each page). This makes it easy to roll back if something breaks.
- Review the **screenshots/walkthroughs** the agent produces after each phase before approving the next one.
