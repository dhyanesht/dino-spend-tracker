# app/api/llm.py
from fastapi import APIRouter, Depends, HTTPException
from dependency_injector.wiring import Provide

from app.domain.data_models import MerchantRequest, MerchantResponse
from app.container import Container
from app.services.merchant_categorization_service import MerchantCategorizationService
from app.services.prompt_service import PromptService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def get_merchant_service() -> MerchantCategorizationService:
    """Dependency to get the merchant categorization service from the container."""
    return Container.merchant_categorization_service()

def get_prompt_service() -> PromptService:
    """Dependency to get the merchant categorization service from the container."""
    return Container.prompt_service()

@router.post("/categorize", response_model=MerchantResponse, tags=["Transaction"])
async def categorize(
        merchant: MerchantRequest,
        service: MerchantCategorizationService = Depends(get_merchant_service)
) -> MerchantResponse:
    """
    Categorize a merchant using AI.

    - **name**: Merchant name (required)
    - **description**: Optional description or additional context
    - **categories**: Optional custom category list (defaults to database categories)
    """
    try:
        return await service.categorize_merchant(merchant)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to categorize merchant: {str(e)}"
        )

@router.post("/complete", response_model=str, tags=["Transaction"])
def complete(prompt: str, promt_service : PromptService = Depends(get_prompt_service)):
    logger.info("Received request %s", prompt)

    logger.info("Prompt service initialized")
    return promt_service.complete(prompt)
