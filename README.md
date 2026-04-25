# ⚡ Velocity RFQ — British Auction System

A production-grade **Request for Quotation (RFQ)** platform built on a **British Auction** mechanic. Suppliers compete on freight price in real-time, with automatic timer extensions that prevent last-second sniping and reward genuine competition.

> Built as a full-stack submission demonstrating: async FastAPI, Celery + Redis background jobs, PostgreSQL row-level locking, WebSockets, and a role-based React frontend.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| **Frontend UI** | http://localhost:5173 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Docs (ReDoc)** | http://localhost:8000/redoc |

---

## 🏗 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│        (Vite · TanStack Query · Role Switcher · WebSocket)       │
└────────────────────┬───────────────────────────┬─────────────────┘
                     │  REST (HTTP)               │  WebSocket (ws://)
                     ▼                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│   │ Role Auth    │  │ Bidding      │  │ WebSocket          │    │
│   │ (Headers)    │  │ Engine       │  │ Connection Manager │    │
│   │              │  │ (with_for_   │  │ (Broadcast on bid) │    │
│   │ BUYER only → │  │  update lock)│  │                    │    │
│   │ POST /rfqs/  │  │              │  │                    │    │
│   │ SUPPLIER →   │  │              │  │                    │    │
│   │ POST /quotes/│  │              │  │                    │    │
│   └──────────────┘  └──────┬───────┘  └────────────────────┘    │
└──────────────────────────  │  ────────────────────────────────────┘
                             │
         ┌───────────────────┼─────────────────────┐
         ▼                   ▼                     ▼
┌─────────────────┐  ┌──────────────┐  ┌─────────────────────────┐
│   PostgreSQL    │  │    Redis     │  │    Celery Worker        │
│                 │  │   Broker     │  │                         │
│  · RFQ table   │  │  · Task queue│  │  · close_auction task   │
│  · Quotes table │  │  · Results   │  │  · Runs at eta=         │
│  · Activity log │  │              │  │    current_close_date   │
│  · Row locking  │  │              │  │  · Revoke + reschedule  │
│    on bid submit│  │              │  │    on timer extension   │
└─────────────────┘  └──────────────┘  └─────────────────────────┘
```

---

## 🗄 Schema Design

### `rfqs` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique auction identifier |
| `name` | VARCHAR | NOT NULL | RFQ reference name |
| `start_date` | TIMESTAMPTZ | NOT NULL | When bidding opens |
| `close_date` | TIMESTAMPTZ | NOT NULL | Original scheduled close |
| `current_close_date` | TIMESTAMPTZ | NOT NULL | Current close — updated on each extension |
| `forced_close_date` | TIMESTAMPTZ | NOT NULL | Hard deadline — never exceeded |
| `pickup_date` | TIMESTAMPTZ | NOT NULL | Service/pickup date |
| `trigger_window_minutes` | INTEGER | NOT NULL | X — monitoring window in minutes |
| `extension_duration_minutes` | INTEGER | NOT NULL | Y — minutes added per extension |
| `extension_trigger_type` | ENUM | NOT NULL | `ANY_BID` / `ANY_RANK_CHANGE` / `L1_RANK_CHANGE` |
| `status` | ENUM | default ACTIVE | `ACTIVE` / `CLOSED` / `FORCE_CLOSED` |
| `celery_task_id` | VARCHAR | nullable | Tracks the scheduled Celery close task for revocation |
| `created_at` | TIMESTAMPTZ | default now() | Record creation time |

### `quotes` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique quote identifier |
| `rfq_id` | UUID | FK → rfqs.id | Parent auction |
| `supplier_id` | VARCHAR | NOT NULL | Supplier identity (from auth header) |
| `carrier_name` | VARCHAR | NOT NULL | Carrier/supplier company name |
| `freight_charges` | FLOAT | NOT NULL | Freight cost component |
| `origin_charges` | FLOAT | NOT NULL | Origin handling cost |
| `destination_charges` | FLOAT | NOT NULL | Destination handling cost |
| `total_amount` | FLOAT | NOT NULL | Computed sum (stored for fast ranking ORDER BY) |
| `transit_time` | VARCHAR | NOT NULL | Estimated transit duration |
| `validity_of_quote` | TIMESTAMPTZ | NOT NULL | Quote expiry date |
| `created_at` | TIMESTAMPTZ | default now() | Submission timestamp |

### `activity_logs` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Log entry identifier |
| `rfq_id` | UUID | FK → rfqs.id | Parent auction |
| `message` | VARCHAR | NOT NULL | Human-readable event description |
| `type` | ENUM | NOT NULL | `BID_SUBMITTED` / `EXTENDED` / `COMPLETED` |
| `created_at` | TIMESTAMPTZ | default now() | Event timestamp |

> **Key decisions**: `current_close_date` is mutable and tracks live extensions while `close_date` is the immutable original. `total_amount` is stored (not derived) so ranking is a single `ORDER BY`. `celery_task_id` enables revoke-and-reschedule on every extension. `supplier_id` on quotes enables the "can't bid higher than own previous" rule.

---

## ✨ Key Features

### British Auction Engine
- **Trigger Window**: Bids placed in the last N minutes trigger an extension
- **Extension Duration**: Close time pushed forward by M minutes
- **Forced Close (Hard Deadline)**: Extensions can never exceed this absolute limit
- **Trigger Types**: `ANY_BID` · `ANY_RANK_CHANGE` · `L1_RANK_CHANGE`

### Backend
- ⚡ **FastAPI** with async SQLAlchemy + asyncpg for non-blocking DB operations
- 🔒 **Race-Condition Safe** — PostgreSQL `SELECT ... FOR UPDATE` row locking on every bid
- 🕐 **Celery + Redis** — Auction closures survive server restarts; tasks are revoked and rescheduled on every extension
- 🔐 **Header-Based Role Auth** — `X-User-Role` / `X-User-Id` enforced server-side on every endpoint
- 📡 **WebSockets** — Live bid and extension events broadcast to all connected clients
- 📋 **Full Activity Log** — Every bid and extension timestamped with full audit trail

### Frontend
- 🎨 **React + Vite** with TanStack Query for server state management
- 🟢 **Contextual Status Badges** — ACTIVE / 🟡 EXTENDED / 🔴 FORCE CLOSED / ⚫ CLOSED
- ⏱ **Pulsing Countdown Timer** — Turns red and pulses when under 2 minutes remaining
- 📊 **Extension Counter** — `+N extensions` badge on the auction list
- 👤 **Role Switcher** — Toggle between Buyer and Supplier; enforced both in UI and API headers
- 🏠 **Landing Page** — Full concept explainer with HLD, mechanics, and role guide

### Business Rules Enforced
- Suppliers **cannot bid equal to or higher** than their own previous lowest bid
- Buyers **cannot submit quotes** (403 on `POST /quotes/`)
- Suppliers **cannot create RFQs** (403 on `POST /rfqs/`)

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)

### 1. Clone & Start

```bash
git clone https://github.com/Tejkaur04/GoComet.git
cd GoComet
docker-compose up --build
```

All 5 services will start:
| Container | Role |
|---|---|
| `gocomet-db-1` | PostgreSQL 15 |
| `gocomet-redis-1` | Redis 7 (Celery broker) |
| `gocomet-backend-1` | FastAPI on port 8000 |
| `gocomet-celery_worker-1` | Celery worker for auction closures |
| `gocomet-frontend-1` | React/Vite on port 5173 |

### 2. Load Demo Data (Recommended)

In a second terminal, after the stack is up:

```bash
docker-compose exec backend python seed.py
```

This creates **3 pre-built auctions**:
- 🟢 **ACTIVE** — Electronics Shipment (Shanghai → LA) with 3 bids and 2 extensions already applied
- ⚫ **CLOSED** — Medical Supplies (Berlin → NY) that ended naturally
- 🔴 **FORCE CLOSED** — Urgent Auto Parts (Tokyo → Detroit) that hit the hard deadline

### 3. Explore the App

1. Open **http://localhost:5173** — you'll land on the concept explainer page
2. Click **🏛 Auctions** to see the pre-seeded dashboard
3. Use the **Role Switcher** (top-right) to toggle between Buyer and Supplier
4. Click **View Details** on the active auction to see live rankings

---

## 🧪 Testing the British Auction Flow

1. **Switch to Buyer** → Click **+ Create RFQ**
2. Set `Bid Close Time` to 3 minutes from now, `Forced Close` to 10 minutes, `Trigger Window` to 2 minutes, `Extension` to 2 minutes
3. Open the auction detail page
4. **Switch to Supplier A** → Submit a quote
5. Open a second browser tab → **Switch to Supplier B** → Submit a lower quote
6. Watch the timer extend automatically and both tabs update instantly via WebSocket
7. Try submitting a **higher** quote as Supplier A — the system rejects it with a business rule error

---

## 📁 Project Structure

```
GoComet/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, WebSocket manager, REST endpoints
│   │   ├── models.py          # SQLAlchemy ORM models (RFQ, Quote, ActivityLog)
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── database.py        # Async engine and session factory
│   │   ├── bidding_engine.py  # Core auction logic (locking, ranking, extensions)
│   │   ├── celery_app.py      # Celery + Redis configuration
│   │   ├── tasks.py           # close_auction Celery task
│   │   └── dependencies.py    # Role-based auth dependencies
│   ├── seed.py                # Dev-only seed script (NOT a production endpoint)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx       # Landing page with concept explainer
│       │   ├── RFQList.jsx    # Auction dashboard with badges and countdown
│       │   ├── RFQDetail.jsx  # Live auction view with WebSocket connection
│       │   └── RFQCreate.jsx  # Buyer-only RFQ creation form
│       ├── components/
│       │   ├── QuoteForm.jsx  # Supplier bid form with auto-calculate total
│       │   └── RoleSwitcher.jsx # Mock auth role toggle
│       ├── api.js             # Axios instance with auth header interceptor
│       └── useAuth.js         # Hook to read role from localStorage
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

Full interactive docs available at **http://localhost:8000/docs**

| Method | Endpoint | Role Required | Description |
|---|---|---|---|
| `POST` | `/rfqs/` | BUYER | Create a new RFQ auction |
| `GET` | `/rfqs/` | Any | List all auctions |
| `GET` | `/rfqs/{id}` | Any | Get auction details with bids and logs |
| `POST` | `/quotes/` | SUPPLIER | Submit a bid |
| `WS` | `/ws/rfqs/{id}` | Any | WebSocket for live updates |

### Auth Headers (Required on all requests)
```
X-User-Role: BUYER | SUPPLIER
X-User-Id:   buyer-1 | supplier-a | supplier-b | supplier-c
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://rfq_user:rfq_password@db:5432/rfq_db` | Async PostgreSQL connection |
| `REDIS_URL` | `redis://redis:6379/0` | Redis broker for Celery |

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **API** | FastAPI 0.110, Python 3.11 |
| **ORM** | SQLAlchemy 2.0 (async) + asyncpg |
| **Database** | PostgreSQL 15 |
| **Task Queue** | Celery 5.3 + Redis 7 |
| **Real-time** | FastAPI native WebSockets |
| **Frontend** | React 18 + Vite 5 |
| **State** | TanStack Query v5 |
| **Styling** | Vanilla CSS (Glassmorphism dark theme) |
| **Container** | Docker Compose |

---

## 🔑 Design Decisions

**Why Celery instead of APScheduler?**
APScheduler runs in-process; if the server restarts, all scheduled jobs are lost. Celery persists tasks in Redis, making auction closures durable. On extension, the old task is revoked by `task_id` and a new one is scheduled with the updated ETA.

**Why header-based auth instead of JWT?**
For a scoped assignment, header-based roles are defensible and easily testable without a full user registration/login flow. The key requirement — server-side enforcement — is fully met via FastAPI `Depends()` on every protected endpoint.

**Why `SELECT ... FOR UPDATE`?**
Two suppliers submitting bids simultaneously must not read stale rank data. The pessimistic lock ensures the second bid waits for the first transaction to commit before proceeding, preventing split-brain ranking bugs.
