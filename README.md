# Velocity RFQ: British Auction System

A production-grade Request for Quotation (RFQ) system featuring a true British Auction mechanism. Built with modern, scalable technologies to ensure high concurrency, real-time updates, and robust timer logic.

## 🌟 Key Features

* **British Auction Engine**: Automatic extensions based on specific triggers (Any Bid, Any Rank Change, L1 Rank Change) within a defined time window.
* **Race Condition Safe**: Uses PostgreSQL row-level pessimistic locking (`with_for_update`) to guarantee data integrity when multiple suppliers bid simultaneously.
* **Robust Background Jobs**: Uses Celery and Redis to manage and track auction closures, ensuring tasks survive app restarts.
* **Real-time Live Updates**: WebSockets push live rank changes and timer extensions directly to all connected clients.
* **Role-Based Simulation**: Implemented a mock Auth header system to strictly segregate `BUYER` and `SUPPLIER` actions.
* **Strict Business Rules**: Suppliers are prevented from submitting bids equal to or higher than their own previous lowest bid.

## 🏗 High-Level Architecture (HLD)

```mermaid
graph TD
    Client[React Frontend + TanStack Query] <-->|WebSockets (Live Bids/Timer)| FastAPI[FastAPI Backend]
    Client -->|HTTP REST (Create/Bid)| FastAPI
    FastAPI -->|1. Row-level Lock| DB[(PostgreSQL)]
    FastAPI -->|2. Compute Logic| DB
    FastAPI -->|3. Schedule / Revoke Task| Redis[Redis Broker]
    Redis -->|4. Consume Task| Celery[Celery Worker]
    Celery -->|5. Close Auction| DB
```

## 🚀 Quick Start

The entire stack is containerized using Docker Compose.

1. **Start the application**:
   ```bash
   docker-compose up --build
   ```

2. **Access the Application**:
   * **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   * **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### How to Test the Flow

1. On the frontend, ensure the top-right role switcher is set to **Buyer**.
2. Click **Create New RFQ** and set a Bid Close time 2 minutes into the future.
3. Once created, switch the role to **Supplier A** and view the auction details.
4. Submit a quote. Notice the ranking.
5. Switch to **Supplier B** and submit a lower quote.
6. Watch the timer extend automatically (if your trigger conditions are met) and see the UI update instantly without refreshing!
