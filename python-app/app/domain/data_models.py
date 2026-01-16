from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class TransactionStatus(str, Enum):
    PENDING = "pending"
    CATEGORIZED = "categorized"
    FAILED = "failed"
    MANUAL_REVIEW = "manual_review"

class Category(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class Transaction(BaseModel):
    transaction_id: str
    merchant_name: str
    description: Optional[str] = None
    amount: float
    currency: str = "USD"
    timestamp: datetime
    metadata: Optional[dict] = None
    category: Category

class MerchantRequest(BaseModel):
    name: str
    description: Optional[str] = None
    categories: Optional[List[str]] = None  # Override categories if needed


class MerchantResponse(BaseModel):
    merchant_name: str
    description: str
    category: str
    confidence: Optional[float] = None
    provider_used: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    transaction_id: str
    merchant_name: str
    description: Optional[str]
    amount: float
    currency: str
    category: Optional[str]
    status: TransactionStatus
    error_message: Optional[str]
    provider_used: Optional[str]
    created_at: datetime
    categorized_at: Optional[datetime]

