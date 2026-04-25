from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import asc
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
from uuid import UUID

from . import models, schemas
from .schemas import QuoteCreate

async def process_quote(db: AsyncSession, quote_data: QuoteCreate, supplier_id: str) -> Tuple[models.Quote, bool, Optional[datetime], Optional[str]]:
    # 1. Fetch RFQ with row lock to prevent race conditions
    result = await db.execute(
        select(models.RFQ)
        .filter(models.RFQ.id == quote_data.rfq_id)
        .with_for_update()
    )
    rfq = result.scalar_one_or_none()

    if not rfq:
        raise ValueError("RFQ not found")

    if rfq.status != models.AuctionStatus.ACTIVE:
        raise ValueError(f"RFQ is not active. Current status: {rfq.status}")

    now = datetime.now(timezone.utc)
    if now > rfq.current_close_date:
        raise ValueError("RFQ has already closed")

    # 2. Calculate Total Amount
    total_amount = quote_data.freight_charges + quote_data.origin_charges + quote_data.destination_charges

    # 3. Check Supplier Rules (Cannot bid higher than or equal to their previous lowest bid)
    supplier_quotes_result = await db.execute(
        select(models.Quote)
        .filter(models.Quote.rfq_id == rfq.id, models.Quote.supplier_id == supplier_id)
        .order_by(asc(models.Quote.total_amount))
    )
    supplier_lowest_quote = supplier_quotes_result.scalars().first()
    
    if supplier_lowest_quote and total_amount >= supplier_lowest_quote.total_amount:
        raise ValueError(f"You cannot bid higher than or equal to your previous lowest bid (${supplier_lowest_quote.total_amount:.2f})")

    # 4. Determine current rankings to check for rank changes later
    quotes_result = await db.execute(
        select(models.Quote)
        .filter(models.Quote.rfq_id == rfq.id)
        .order_by(asc(models.Quote.total_amount), asc(models.Quote.created_at))
    )
    existing_quotes = quotes_result.scalars().all()
    
    current_l1 = existing_quotes[0] if existing_quotes else None
    
    # 5. Create Quote
    new_quote = models.Quote(
        **quote_data.model_dump(),
        supplier_id=supplier_id,
        total_amount=total_amount
    )
    db.add(new_quote)
    
    log_bid = models.ActivityLog(
        rfq_id=rfq.id,
        message=f"Bid submitted by {quote_data.carrier_name} for amount {total_amount}",
        type=models.LogType.BID_SUBMITTED
    )
    db.add(log_bid)

    await db.flush()

    # 6. Check Extension Rules
    time_remaining = rfq.current_close_date - now
    trigger_window = timedelta(minutes=rfq.trigger_window_minutes)

    extended = False
    new_close_date = None
    old_task_id = rfq.celery_task_id

    # Do not evaluate extensions if we are already at or past the forced close date
    if time_remaining <= trigger_window and rfq.current_close_date < rfq.forced_close_date:
        trigger_met = False

        if rfq.extension_trigger_type == models.ExtensionTriggerType.ANY_BID:
            trigger_met = True
        else:
            # Need to recalculate ranks with the new quote included
            new_quotes_result = await db.execute(
                select(models.Quote)
                .filter(models.Quote.rfq_id == rfq.id)
                .order_by(asc(models.Quote.total_amount), asc(models.Quote.created_at))
            )
            new_quotes_sorted = new_quotes_result.scalars().all()
            new_l1 = new_quotes_sorted[0] if new_quotes_sorted else None
            
            if rfq.extension_trigger_type == models.ExtensionTriggerType.L1_RANK_CHANGE:
                # Rank change logic: L1 is different quote id AND L1 belongs to different supplier OR just different quote?
                # Usually it's if a *new* lowest value is achieved or a new supplier takes L1.
                if current_l1 is None or new_l1.id != current_l1.id:
                    trigger_met = True
            elif rfq.extension_trigger_type == models.ExtensionTriggerType.ANY_RANK_CHANGE:
                old_ids = [q.id for q in existing_quotes]
                new_ids = [q.id for q in new_quotes_sorted]
                
                # If the new list of IDs is not just the old list + the new quote at the end, a rank changed.
                if new_ids[-1] != new_quote.id:
                    trigger_met = True

        if trigger_met:
            proposed_close = rfq.current_close_date + timedelta(minutes=rfq.extension_duration_minutes)
            
            # Must not exceed forced close date
            if proposed_close > rfq.forced_close_date:
                proposed_close = rfq.forced_close_date
            
            if proposed_close > rfq.current_close_date:
                rfq.current_close_date = proposed_close
                new_close_date = proposed_close
                log_ext = models.ActivityLog(
                    rfq_id=rfq.id,
                    message=f"Auction extended to {proposed_close.isoformat()} due to {rfq.extension_trigger_type}",
                    type=models.LogType.EXTENDED
                )
                db.add(log_ext)
                extended = True

    await db.commit()
    await db.refresh(new_quote)
    
    return new_quote, extended, new_close_date, old_task_id

async def update_celery_task_id(db: AsyncSession, rfq_id: UUID, task_id: str):
    result = await db.execute(select(models.RFQ).filter(models.RFQ.id == rfq_id))
    rfq = result.scalar_one_or_none()
    if rfq:
        rfq.celery_task_id = task_id
        await db.commit()
