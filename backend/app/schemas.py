from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import List, Optional
from .models import ExtensionTriggerType, AuctionStatus, LogType

class RFQCreate(BaseModel):
    name: str
    start_date: datetime
    close_date: datetime
    forced_close_date: datetime
    pickup_date: datetime
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: ExtensionTriggerType

class ActivityLogResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    message: str
    type: LogType
    created_at: datetime

    class Config:
        from_attributes = True

class QuoteCreate(BaseModel):
    rfq_id: UUID
    carrier_name: str
    freight_charges: float
    origin_charges: float
    destination_charges: float
    transit_time: str
    validity_of_quote: datetime

class QuoteResponse(QuoteCreate):
    id: UUID
    supplier_id: str
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

class RFQResponse(RFQCreate):
    id: UUID
    current_close_date: datetime
    status: AuctionStatus
    created_at: datetime
    activity_logs: List[ActivityLogResponse] = []
    quotes: List[QuoteResponse] = []

    class Config:
        from_attributes = True

class RFQDetailResponse(RFQResponse):
    quotes: List[QuoteResponse]
    activity_logs: List[ActivityLogResponse]
