import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from .database import Base

class ExtensionTriggerType(str, enum.Enum):
    ANY_BID = "ANY_BID"
    ANY_RANK_CHANGE = "ANY_RANK_CHANGE"
    L1_RANK_CHANGE = "L1_RANK_CHANGE"

class AuctionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    FORCE_CLOSED = "FORCE_CLOSED"

class LogType(str, enum.Enum):
    BID_SUBMITTED = "BID_SUBMITTED"
    EXTENDED = "EXTENDED"
    COMPLETED = "COMPLETED"

class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    close_date = Column(DateTime(timezone=True), nullable=False)
    forced_close_date = Column(DateTime(timezone=True), nullable=False)
    current_close_date = Column(DateTime(timezone=True), nullable=False)
    pickup_date = Column(DateTime(timezone=True), nullable=False)
    trigger_window_minutes = Column(Integer, nullable=False)
    extension_duration_minutes = Column(Integer, nullable=False)
    extension_trigger_type = Column(Enum(ExtensionTriggerType), nullable=False)
    status = Column(Enum(AuctionStatus), default=AuctionStatus.ACTIVE)
    celery_task_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    quotes = relationship("Quote", back_populates="rfq", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="rfq", cascade="all, delete-orphan")

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    supplier_id = Column(String, nullable=False)
    carrier_name = Column(String, nullable=False)
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, nullable=False)
    destination_charges = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    transit_time = Column(String, nullable=False)
    validity_of_quote = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    rfq = relationship("RFQ", back_populates="quotes")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum(LogType), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    rfq = relationship("RFQ", back_populates="activity_logs")
