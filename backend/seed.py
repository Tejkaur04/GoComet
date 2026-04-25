import asyncio
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from app.database import AsyncSessionLocal
from app.models import RFQ, Quote, AuctionStatus, ExtensionTriggerType, LogType, ActivityLog

async def seed_data():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        
        # 1. ACTIVE Competitive Auction
        active_rfq_id = uuid4()
        active_rfq = RFQ(
            id=active_rfq_id,
            name="Electronics Shipment (Shanghai -> LA)",
            start_date=now - timedelta(days=1),
            close_date=now + timedelta(minutes=5),
            current_close_date=now + timedelta(minutes=15), # Extended
            forced_close_date=now + timedelta(hours=1),
            pickup_date=now + timedelta(days=5),
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger_type=ExtensionTriggerType.ANY_BID,
            status=AuctionStatus.ACTIVE
        )
        db.add(active_rfq)
        
        # Bids for ACTIVE auction
        q1 = Quote(rfq_id=active_rfq_id, supplier_id="supplier-b", carrier_name="Ocean Freight Co", freight_charges=1000, origin_charges=200, destination_charges=300, total_amount=1500, transit_time="14 days", validity_of_quote=now + timedelta(days=30), created_at=now - timedelta(minutes=20))
        q2 = Quote(rfq_id=active_rfq_id, supplier_id="supplier-a", carrier_name="FastShip Logistics", freight_charges=900, origin_charges=150, destination_charges=300, total_amount=1350, transit_time="12 days", validity_of_quote=now + timedelta(days=30), created_at=now - timedelta(minutes=15))
        q3 = Quote(rfq_id=active_rfq_id, supplier_id="supplier-b", carrier_name="Ocean Freight Co", freight_charges=850, origin_charges=150, destination_charges=200, total_amount=1200, transit_time="14 days", validity_of_quote=now + timedelta(days=30), created_at=now - timedelta(minutes=5))
        db.add_all([q1, q2, q3])
        
        db.add(ActivityLog(rfq_id=active_rfq_id, message="Bid submitted by Ocean Freight Co for amount 1500", type=LogType.BID_SUBMITTED, created_at=now - timedelta(minutes=20)))
        db.add(ActivityLog(rfq_id=active_rfq_id, message="Bid submitted by FastShip Logistics for amount 1350", type=LogType.BID_SUBMITTED, created_at=now - timedelta(minutes=15)))
        db.add(ActivityLog(rfq_id=active_rfq_id, message="Bid submitted by Ocean Freight Co for amount 1200", type=LogType.BID_SUBMITTED, created_at=now - timedelta(minutes=5)))
        
        # 2 extensions
        db.add(ActivityLog(rfq_id=active_rfq_id, message=f"Auction extended to {(now + timedelta(minutes=10)).isoformat()} due to ANY_BID", type=LogType.EXTENDED, created_at=now - timedelta(minutes=15)))
        db.add(ActivityLog(rfq_id=active_rfq_id, message=f"Auction extended to {(now + timedelta(minutes=15)).isoformat()} due to ANY_BID", type=LogType.EXTENDED, created_at=now - timedelta(minutes=5)))

        # 2. CLOSED Auction
        closed_rfq_id = uuid4()
        closed_rfq = RFQ(
            id=closed_rfq_id,
            name="Medical Supplies (Berlin -> NY)",
            start_date=now - timedelta(days=3),
            close_date=now - timedelta(days=1),
            current_close_date=now - timedelta(days=1),
            forced_close_date=now - timedelta(hours=20),
            pickup_date=now + timedelta(days=2),
            trigger_window_minutes=5,
            extension_duration_minutes=5,
            extension_trigger_type=ExtensionTriggerType.L1_RANK_CHANGE,
            status=AuctionStatus.CLOSED
        )
        db.add(closed_rfq)
        db.add(ActivityLog(rfq_id=closed_rfq_id, message="Auction closed normally", type=LogType.COMPLETED, created_at=now - timedelta(days=1)))
        
        db.add(Quote(rfq_id=closed_rfq_id, supplier_id="supplier-c", carrier_name="MedLogistics", freight_charges=5000, origin_charges=500, destination_charges=500, total_amount=6000, transit_time="5 days", validity_of_quote=now + timedelta(days=30), created_at=now - timedelta(days=2)))

        # 3. FORCE_CLOSED Auction
        force_rfq_id = uuid4()
        force_rfq = RFQ(
            id=force_rfq_id,
            name="Urgent Auto Parts (Tokyo -> Detroit)",
            start_date=now - timedelta(days=2),
            close_date=now - timedelta(days=1, hours=2),
            current_close_date=now - timedelta(days=1),
            forced_close_date=now - timedelta(days=1),
            pickup_date=now + timedelta(days=1),
            trigger_window_minutes=15,
            extension_duration_minutes=10,
            extension_trigger_type=ExtensionTriggerType.ANY_RANK_CHANGE,
            status=AuctionStatus.FORCE_CLOSED
        )
        db.add(force_rfq)
        db.add(ActivityLog(rfq_id=force_rfq_id, message="Auction force closed", type=LogType.COMPLETED, created_at=now - timedelta(days=1)))

        db.add(Quote(rfq_id=force_rfq_id, supplier_id="supplier-a", carrier_name="FastShip Logistics", freight_charges=2000, origin_charges=300, destination_charges=300, total_amount=2600, transit_time="3 days", validity_of_quote=now + timedelta(days=30), created_at=now - timedelta(days=1, hours=1)))
        db.add(ActivityLog(rfq_id=force_rfq_id, message="Auction extended due to ANY_RANK_CHANGE", type=LogType.EXTENDED, created_at=now - timedelta(days=1, hours=1)))

        await db.commit()
        print("Database seeded successfully with test auctions!")

if __name__ == "__main__":
    asyncio.run(seed_data())
