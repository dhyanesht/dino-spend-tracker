from pydantic import BaseModel
from typing import List, Optional

class MerchantRequest(BaseModel):
    name: str
    description: Optional[str] = None
    categories: Optional[List[str]] = None

class MerchantResponse(BaseModel):
    merchant_name: str
    description: str
    category: str
