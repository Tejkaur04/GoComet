import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict
import logging

from . import models, schemas, database, bidding_engine, dependencies
from .database import engine
from .tasks import close_auction
from .celery_app import celery

logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, rfq_id: str):
        await websocket.accept()
        if rfq_id not in self.active_connections:
            self.active_connections[rfq_id] = []
        self.active_connections[rfq_id].append(websocket)

    def disconnect(self, websocket: WebSocket, rfq_id: str):
        if rfq_id in self.active_connections:
            self.active_connections[rfq_id].remove(websocket)

    async def broadcast(self, rfq_id: str, message: dict):
        if rfq_id in self.active_connections:
            for connection in self.active_connections[rfq_id]:
                await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    async with engine.begin() as conn:
        # Note: In production use Alembic. Recreating all here for local testing ease.
        # Ensure we drop/recreate to apply new schema fields easily without alembic hassle during dev
        await conn.run_sync(models.Base.metadata.create_all)
    yield

app = FastAPI(
    title="Velocity RFQ API",
    description="""
A high-performance British Auction Request for Quotation (RFQ) system.

## Key Features
* **Role-Based Access**: Buyers create auctions, Suppliers submit bids.
* **British Auction Engine**: Automatic timer extensions based on bidding activity (L1 Rank Changes, Any Rank Changes).
* **Race-Condition Safe**: Uses PostgreSQL row-level locking (`with_for_update`) to safely process concurrent bids.
* **Celery Background Jobs**: Robust timer logic using Redis and Celery for auction closures.
* **Live Updates**: Real-time WebSockets to broadcast new bids and time extensions instantly.
    """,
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REST Endpoints ---

@app.post("/rfqs/", response_model=schemas.RFQResponse)
async def create_rfq(
    rfq: schemas.RFQCreate, 
    db: AsyncSession = Depends(database.get_db),
    user: dependencies.User = Depends(dependencies.require_buyer)
):
    if rfq.forced_close_date <= rfq.close_date:
        raise HTTPException(status_code=400, detail="Forced close date must be greater than close date")
    
    db_rfq = models.RFQ(
        **rfq.model_dump(),
        current_close_date=rfq.close_date
    )
    db.add(db_rfq)
    await db.commit()
    await db.refresh(db_rfq)
    
    # Schedule Celery task
    task = close_auction.apply_async((str(db_rfq.id),), eta=db_rfq.current_close_date)
    
    db_rfq.celery_task_id = task.id
    await db.commit()
    await db.refresh(db_rfq)
    
    return db_rfq

@app.get("/rfqs/", response_model=List[schemas.RFQResponse])
async def list_rfqs(db: AsyncSession = Depends(database.get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(models.RFQ)
        .options(
            selectinload(models.RFQ.activity_logs),
            selectinload(models.RFQ.quotes)
        )
        .order_by(models.RFQ.created_at.desc())
    )
    return result.scalars().all()

@app.get("/rfqs/{rfq_id}", response_model=schemas.RFQDetailResponse)
async def get_rfq(rfq_id: str, db: AsyncSession = Depends(database.get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(models.RFQ)
        .options(selectinload(models.RFQ.quotes), selectinload(models.RFQ.activity_logs))
        .filter(models.RFQ.id == rfq_id)
    )
    db_rfq = result.scalar_one_or_none()
    if db_rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    db_rfq.quotes.sort(key=lambda x: (x.total_amount, x.created_at))
    db_rfq.activity_logs.sort(key=lambda x: x.created_at, reverse=True)
    
    return db_rfq

@app.post("/quotes/", response_model=schemas.QuoteResponse)
async def submit_quote(
    quote: schemas.QuoteCreate, 
    db: AsyncSession = Depends(database.get_db),
    user: dependencies.User = Depends(dependencies.require_supplier)
):
    try:
        new_quote, extended, new_close_date, old_task_id = await bidding_engine.process_quote(db, quote, user.id)
        
        if extended and new_close_date:
            # Revoke old task
            if old_task_id:
                celery.control.revoke(old_task_id, terminate=False)
            
            # Schedule new task
            task = close_auction.apply_async((str(quote.rfq_id),), eta=new_close_date)
            
            # Update RFQ with new task ID
            await bidding_engine.update_celery_task_id(db, quote.rfq_id, task.id)
        
        # Broadcast the new quote event
        await manager.broadcast(str(quote.rfq_id), {
            "type": "NEW_BID",
            "quote": schemas.QuoteResponse.model_validate(new_quote).model_dump(mode="json"),
            "extended": extended
        })
        
        return new_quote
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- WebSocket Endpoint ---

@app.websocket("/ws/rfqs/{rfq_id}")
async def websocket_endpoint(websocket: WebSocket, rfq_id: str):
    await manager.connect(websocket, rfq_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, rfq_id)
