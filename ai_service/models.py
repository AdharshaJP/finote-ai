from pydantic import BaseModel
from typing import Dict, Optional


class FinancialContext(BaseModel):
    income: float = 0
    expense: float = 0
    balance: float = 0
    categoryMap: Dict[str, float] = {}
    dailyMap: Dict[str, float] = {}


class InsightsRequest(BaseModel):
    financial: FinancialContext


class PredictRequest(BaseModel):
    financial: FinancialContext


class ChatRequest(BaseModel):
    question: str
    financial: FinancialContext


class AffordRequest(BaseModel):
    amount: float
    item: str
    financial: FinancialContext
