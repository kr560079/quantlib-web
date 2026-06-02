from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import OptionPriceRequest, OptionPriceResponse, ScenarioRequest
from pricing import price_option, price_scenario_grid
from database import init_db, save_pricing_result, get_recent_results


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="QuantLib Web — Equity Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "equity"}


@app.get("/engines")
async def list_engines():
    return {
        "european": ["black-scholes", "heston", "binomial", "mc"],
        "american": ["binomial", "baw", "mc"],
    }


@app.post("/options/price", response_model=OptionPriceResponse)
async def price(req: OptionPriceRequest) -> OptionPriceResponse:
    try:
        result = price_option(req)
        save_pricing_result(req, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing error: {e}")


@app.post("/options/scenarios")
async def scenarios(req: ScenarioRequest):
    spots = req.spot_range or [req.base.spot * f for f in [0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.3]]
    vols = req.vol_range or [req.base.volatility]
    try:
        return {"results": price_scenario_grid(req.base, spots, vols)}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario error: {e}")


@app.get("/options/history")
async def history(limit: int = 20):
    return {"results": get_recent_results(limit)}
