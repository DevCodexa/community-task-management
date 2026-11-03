# Community Task Management

An integrated community operations platform for managing **people, tasks, projects, events, speakers, announcements, and automated communication** in one system.

Community Task Management was designed to manage the operational side of a technology community from a single platform. It brings together people, organizational structure, task management, project workflows, events, speakers, announcements, notifications, and communication automation.

The platform can also work together with a separate email infrastructure, allowing operational actions in the community management system to trigger automated communication workflows.

---

## What is Community Task Management?

Community Task Management is more than a traditional task board.

It is a **community operations and collaboration platform** that centralizes the day-to-day management of a technology community.

The system provides a unified environment for managing:

* Community members
* Departments, areas, and projects
* Tasks and assignments
* Kanban workflows
* Workload and task capacity
* Events
* Speakers
* Announcements
* Notifications
* Personal member profiles
* Useful resources
* Automated email workflows
* Community settings

The main goal is to connect these different operational areas instead of managing each one as a separate tool.

---

# Core Features

## Member Management

Community members can be created, updated, searched, filtered, viewed, and removed from the management panel.

Member records can contain information such as:

* Name
* Email
* Phone
* Company
* Job title
* Community title
* Avatar
* Birthday information

Members can also be connected to tasks, events, departments, areas, and projects.

The member management system provides a centralized view of the people involved in the community and their current responsibilities.

---

## Task Management

The task management module works as a lightweight Jira-style operational workspace.

Tasks can be:

* Created
* Assigned to members
* Edited
* Viewed in detail
* Deleted
* Moved between workflow states
* Archived
* Restored

The system supports both **Kanban** and **Table** views.

### Task Workflow

Current task states include:

```text
backlog
started
in_progress
completed
done
```

Tasks can be moved between workflow states through the Kanban interface using drag and drop.

Each task can contain:

* Title
* Description
* Assignee
* Deadline
* Point value
* Image reference
* Status
* Completion information

---

## Workload and Task Capacity

The task system does not only track whether a task is completed.

It also tracks the **active workload of community members**.

The system keeps count of active tasks assigned to each member and can prevent additional active assignments when the configured capacity is reached.

This gives the community team visibility into:

* Who is working on what
* Which tasks belong to which people
* How much active work each person has
* Which members still have available capacity
* Which tasks are waiting for an assignee

This turns the task module into a simple workload management layer rather than a basic checklist.

---

## Task Archive

Completed or manually archived tasks can be moved into a separate archive.

The archive supports:

* Paginated task history
* Task detail inspection
* Restoring archived tasks back into the workflow

This keeps the active workspace focused while preserving previous work.

---

# Organization Structure

Community Task Management also provides an organizational structure for the community.

The current hierarchy is designed around:

```text
Community
    |
    +-- Departments
          |
          +-- Areas
                |
                +-- Projects
```

This structure makes it possible to organize people and work according to the actual organization of the community.

Instead of treating every task as an isolated item, tasks and projects can exist within a larger organizational context.

---

# Projects

Projects provide a higher-level structure for community work.

They can be associated with organizational areas and used to group related activities and responsibilities.

The project structure is intended to make it easier to understand:

* Which work belongs to which project
* Which area owns a project
* Which people are involved
* Which tasks are associated with the work

Project-level member and workspace capabilities are part of the application's ongoing development.

---

# Event Management

Events can be created and managed directly through the platform.

Supported operations include:

* Event creation
* Event editing
* Event deletion
* Event search
* Event type filtering
* Upcoming event queries
* Past event queries
* Staff assignment
* Speaker assignment
* Staff count tracking
* Speaker count tracking

An event can contain:

* Title
* Description
* Event type
* Start date
* End date
* Location
* Drive link

Events therefore become operational hubs that connect the event itself with the members and speakers responsible for it.

---

# Speaker Management

The platform includes a dedicated speaker management system.

Speaker records can contain:

* Full name
* Title
* Company
* Email
* Phone
* Image
* Description
* Status
* Added-by information

Speakers can be assigned to events and managed independently from regular community members.

This allows the platform to manage both:

* Internal community members
* External event speakers

within the same operational environment.

---

# Announcements

The platform includes an announcements module for community communication.

Announcements can be used for:

* General community updates
* Member-specific communication
* Operational announcements
* Internal information sharing

This provides a central place for managing communication that does not belong to a specific task or event.

---

# Notifications and Realtime Updates

The application includes an integrated notification system.

Current capabilities include:

* Notification listing
* Unread notification count
* Mark as read
* Mark all as read
* Notification deletion
* Realtime notification updates through Supabase
* Birthday-related checks

Realtime subscriptions allow new notifications to appear without requiring users to manually refresh the application.

---

# Personal Member Profiles

The application also includes a token-based member profile experience.

Members can access a dedicated read-only profile page through a generated profile link.

Example:

```text
/profile/<token>
```

The profile can contain information such as:

* Personal information
* Assigned tasks
* Organizational relationships
* Department information
* Announcements
* Attachments
* Event-related information

The purpose of this feature is to provide each community member with a dedicated view of the information and work relevant to them.

The member-facing experience is still an active area of development and can evolve into a richer personal workspace.

---

# Email Automation

Community Task Management is designed to work together with a separate email infrastructure.

The application can trigger communication as part of community workflows.

Examples include:

* Task assignment notifications
* Event staff notifications
* Speaker-related notifications
* Community announcements
* Other operational email workflows

The repository also contains an `email-worker` service responsible for queue-based email processing.

In the broader Orion Tech Community ecosystem, this responsibility is handled by the dedicated **Orion Team Mail Worker** application.

The two systems separate community management from email delivery responsibilities:

```text
Community Task Management
          |
          | Business Events
          v
     Email Infrastructure
          |
          +-- Templates
          +-- Queue
          +-- Retry
          +-- Delivery
          +-- Logs
          |
          v
        Brevo
```

This separation allows the community management application to focus on business operations while the mail infrastructure handles delivery and email operations.

---

# Dashboard

The main dashboard provides an overview of the current state of the community.

Dashboard information includes:

* Total members
* Total speakers
* Total events / announcements
* Total tasks
* Task completion rate
* Task status distribution
* Recently added members
* Recently completed tasks

Charts and summary cards provide a quick operational overview without requiring users to open every module separately.

---

# Useful Links

The system includes a centralized useful-links module for shared community resources.

Links can be:

* Added
* Updated
* Deleted
* Searched
* Filtered by category
* Grouped by category

This provides a shared resource area for tools, documentation, platforms, references, and other frequently used links.

---

# Application Routes

The main application routes include:

| Path                                  | Screen             | Purpose                            |
| ------------------------------------- | ------------------ | ---------------------------------- |
| `/`                                   | Login              | Authentication entry point         |
| `/dashboard`                          | Dashboard          | Community and operational overview |
| `/uyeler`                             | Members            | Member management                  |
| `/organizasyon/bolumler`              | Departments        | Organizational structure           |
| `/organizasyon/bolum/:deptId/alanlar` | Areas              | Areas within a department          |
| `/organizasyon/alan/:areaId/projeler` | Projects           | Projects within an area            |
| `/dogum-gunleri`                      | Birthdays          | Birthday tracking                  |
| `/gorev-zinciri`                      | Tasks              | Task management                    |
| `/linkler`                            | Useful Links       | Shared resources                   |
| `/konusmacilar`                       | Speakers           | Speaker management                 |
| `/etkinlikler`                        | Events             | Event management                   |
| `/duyurular`                          | Announcements      | Community announcements            |
| `/profile/:token`                     | Member Profile     | Token-based read-only profile      |
| `/topluluk-ayarlar`                   | Community Settings | Community configuration            |

---

# Technology Stack

## Frontend

* React 18
* TypeScript
* Vite
* React Router
* Tailwind CSS
* Framer Motion
* Lucide React
* Recharts

## Data Layer

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Realtime
* Row Level Security

## Email Infrastructure

* Brevo
* Email worker
* Supabase-based integration

## Runtime

* Node.js
* TypeScript
* npm
* Vite

---

# Architecture

The main application is a React single-page application that uses Supabase as its primary data and authentication layer.

```text
                    Community Task Management
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
          React SPA                          Supabase
              |                                 |
              |                 +---------------+----------------+
              |                 |               |                |
              v                 v               v                v
         React Router       Members / Tasks   Events / Org    Notifications
              |
              v
       Operational UI
              |
              v
       Email Integration
              |
              v
        Email Worker
              |
              v
            Brevo
```

The application is organized around domain-specific services and components so that members, tasks, events, speakers, notifications, and organizational structures can evolve independently.

---

# Project Structure

```text
src/
  App.tsx
  main.tsx
  index.css

  components/
    dashboard/
    events/
    kanban/
    layout/
    links/
    members/
    notifications/
    speakers/
    tasks/
    ui/

  context/
  data/
  hooks/
  lib/
  pages/
  types/

database/
  SQL schema and policy scripts

email-worker/
  Queue processing service
  Worker
  Template engine
  Brevo integration
  Supabase client

supabase/
  Supabase integration resources

README.md
TODO.md
TODO-v2.md
NOTIFICATION_PLAN.md
package.json
vercel.json
```

### Main Responsibilities

* `src/pages` — Page-level application screens
* `src/components` — Reusable and domain-specific UI components
* `src/lib` — Supabase services, email helpers, and business-related client logic
* `src/types` — Domain and database-facing TypeScript types
* `src/context` — Shared application contexts such as theme and user profile state
* `database` — SQL schema, indexes, triggers, and RLS policies
* `email-worker` — Queue-based email processing service

---

# Database

The project contains database definitions and scripts for the main application domains.

Logical database areas include:

* Members
* Tasks
* Archived tasks
* Speakers
* Events
* Event staff
* Event speakers
* Departments
* Areas
* Projects
* Announcements
* Notifications
* Useful links
* Profiles
* Email templates
* Email queues

Some SQL files in the repository are corrective, reset, or historical variants. A future cleanup can consolidate these into a clearer migration strategy.

---

# Authentication and Access

The application uses **Supabase Auth** for authenticated application access.

Task retrieval explicitly checks for an active authentication session.

The member profile page uses token-based access for its read-only member experience.

For production usage, application authentication and database-level Row Level Security policies should remain aligned so that access rules are consistently enforced.

---

# Local Development

## Requirements

* Node.js
* npm
* Supabase project

## Installation

```bash
git clone https://github.com/DevCodexa/community-task-management.git
cd community-task-management
npm install
```

Create a local environment file from the example and fill in your own Supabase project values.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Required values are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The app now stops with a clear configuration error if either is missing; it never falls back to the production project. Use only a browser-safe publishable/anon key in a `VITE_` variable. **Never put a Supabase service-role or secret key in frontend environment variables.**

Configure the variables explicitly for each Vercel environment as well. Use a separate Supabase project for previews if they need isolated data; do not copy production values into Preview unless production data access is intentional.

## Start Development Server

```bash
npm run dev
```

The development server normally runs at:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

---

# Environment Variables

A typical frontend configuration includes:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=
```

Additional email-related configuration depends on the deployed email infrastructure.

Secrets and service credentials should be provided through environment variables or secure secret storage rather than committed to source control.

---

# Email Worker

The repository contains a dedicated `email-worker` service for scheduled email processing.

Its responsibilities include:

* Loading email settings
* Reading queued email jobs
* Resolving active templates
* Rendering template parameters
* Sending messages through Brevo
* Applying retry limits
* Respecting daily sending limits
* Recording delivery results

The worker starts by processing the queue and then schedules recurring processing every five minutes.

The dedicated **Orion Team Mail Worker** application expands this concept into a full email operations platform with:

* Manual email sending
* Recipient selection
* Template management
* Queue management
* Retry handling
* Daily sending limits
* Delivery logs
* Sender settings
* Email previews

---

# Development Status

The project is in active development.

The core community-management functionality is already implemented across several domains:

* Member management
* Task management
* Kanban workflow
* Workload controls
* Task archive and restore
* Event management
* Speaker management
* Organizational hierarchy
* Projects
* Announcements
* Notifications
* Useful links
* Token-based member profiles
* Email workflow integration

The member-facing workspace remains an area for further development, with room for richer personal dashboards, project views, task history, and role-specific functionality.

---

# Security and Maintenance Notes

Before production hardening, the following areas should be reviewed:

* Remove any real API keys or fallback credentials from source code.
* Store secrets only in environment variables or secure secret storage.
* Ensure Row Level Security policies match the intended production roles.
* Consolidate historical SQL fixes and reset scripts into a clear migration strategy.
* Review authentication consistency across all data services.
* Add automated tests for critical task, event, profile, and email workflows.
* Keep generated build output and dependency directories out of source control where appropriate.
* Replace development-only logging with structured application logging where needed.

---

# Roadmap

Potential future improvements include:

* Richer member self-service dashboards
* Personal task and project views
* Project-level progress tracking
* More granular roles and permissions
* Advanced workload analytics
* More event-driven automation
* Expanded email workflow integrations
* Centralized backend/API boundaries
* Automated test coverage
* Monitoring and observability
* Richer member-specific workspaces

---

# Orion Tech Community

Community Task Management is part of the broader **Orion Tech Community** technical ecosystem.

Together with the email infrastructure, it provides a connected foundation for operating a technology community:

```text
People
   +
Organization
   +
Projects
   +
Tasks
   +
Events
   +
Speakers
   +
Announcements
   +
Automation
   +
Communication
        =
Community Operations Platform
```

The long-term goal is to provide a single operational environment where community management, collaboration, events, responsibilities, and communication can work together rather than being handled through disconnected tools.

---

## Project Status

**Active Development**

Community Task Management is evolving from a task-focused management dashboard into a broader community operations platform while retaining its original task and collaboration capabilities.
