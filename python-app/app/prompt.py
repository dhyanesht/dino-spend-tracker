from llama_index.llms.ollama import Ollama
from llama_index.llms.groq import Groq
import os

# https://developers.llamaindex.ai/python/examples/llm/ollama/
llm = Ollama(
    model="qwen2:0.5b",
    request_timeout=120.0,
    context_window=8000,
    temperature=0.2
)
# response = llm.complete("Hello, world!")
# print(response)


groq = Groq(
    model="llama-3.1-8b-instant",
    api_key="",
    )
response = groq.complete("Hello, world!")
print(response)


CATEGORIES = [
    "Coffee shop",
    "Restaurant",
    "Grocery",
    "Retail",
    "Gas station",
    "Pharmacy",
    "Clothing",
    "Electronics",
    "Entertainment",
    "Other"
]
def categorize_merchant(name: str, description: str = "", categories: list = None) -> str:
    """Categorize merchant using Ollama LLM"""
    cats = categories or CATEGORIES
    desc = description or name

    prompt = f"""
    Assign EXACTLY ONE category from this list to the merchant:
    Choose the most specific category possible. Do not pick a general one if a more precise category exists.
    
    {', '.join(cats)}
    
    Merchant: {name}
    Description: {desc}
    
    Respond with ONLY the category name (no quotes, no explanation):"""

    result = groq.complete(prompt)
    category = result.text.strip().strip('"').strip()

    return category if category in cats else "Other"