from fastapi import FastAPI
from data_models import MerchantRequest, MerchantResponse
from prompt import categorize_merchant

app = FastAPI(title="Merchant Categorization API", version="0.1.0")

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/categorize", response_model=MerchantResponse)
async def categorize(merchant: MerchantRequest):
    category = categorize_merchant(
        merchant.name,
        merchant.description,
        merchant.categories
    )
    desc = merchant.description or merchant.name
    return MerchantResponse(
        merchant_name=merchant.name,
        description=desc,
        category=category
    )