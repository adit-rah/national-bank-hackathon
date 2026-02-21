import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, Boolean, ForeignKey, Text, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    trade_count = Column(Integer, default=0)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed

    trades = relationship("Trade", back_populates="session", cascade="all, delete-orphan")
    bias_result = relationship("BiasResult", back_populates="session", uselist=False, cascade="all, delete-orphan")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("analysis_sessions.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    asset = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=True)
    entry_price = Column(Float, nullable=True)
    exit_price = Column(Float, nullable=True)
    profit_loss = Column(Float, nullable=True)
    balance = Column(Float, nullable=True)

    # Derived fields (computed during feature engineering)
    holding_duration = Column(Float, nullable=True)
    pnl_percent = Column(Float, nullable=True)
    position_size_pct = Column(Float, nullable=True)
    is_win = Column(Boolean, nullable=True)
    drawdown_at_trade = Column(Float, nullable=True)
    streak_index = Column(Integer, nullable=True)
    time_since_last = Column(Float, nullable=True)

    session = relationship("AnalysisSession", back_populates="trades")


class BiasResult(Base):
    __tablename__ = "bias_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("analysis_sessions.id"), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Bias scores (0-100)
    overtrading_score = Column(Float, default=0.0)
    loss_aversion_score = Column(Float, default=0.0)
    revenge_trading_score = Column(Float, default=0.0)

    # Statistical details
    overtrading_details = Column(JSON, nullable=True)
    loss_aversion_details = Column(JSON, nullable=True)
    revenge_trading_details = Column(JSON, nullable=True)

    # Archetype
    archetype = Column(String(100), nullable=True)
    archetype_details = Column(JSON, nullable=True)

    # Feature summary
    feature_summary = Column(JSON, nullable=True)

    # Coach output
    coach_output = Column(JSON, nullable=True)

    session = relationship("AnalysisSession", back_populates="bias_result")
