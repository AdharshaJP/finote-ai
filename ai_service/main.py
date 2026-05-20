import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from ai_service.routers import chat, insights, predict, afford, anomaly

load_dotenv()

app = FastAPI(
    title="Finote AI Service",
    description="Python-powered AI microservice for financial insights, predictions, chat, and affordability checks.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
app.include_router(insights.router, prefix="/insights", tags=["AI Insights"])
app.include_router(predict.router, prefix="/predict", tags=["AI Predictions"])
app.include_router(afford.router, prefix="/afford", tags=["Afford Check"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["Anomaly Detection"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "OK", "service": "Finote AI Service", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("ai_service.main:app", host="0.0.0.0", port=port, reload=True)
