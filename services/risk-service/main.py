from __future__ import annotations
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    ParametricVaRRequest, HistoricalVaRRequest, MCVaRRequest,
    PortfolioVaRRequest,
    GreeksPnLRequest,
    OptionStressRequest,
)
from pricing import (
    calc_parametric_var, calc_historical_var, calc_mc_var,
    calc_portfolio_var,
    calc_greeks_pnl,
    calc_option_stress,
)

app = FastAPI(title="QuantLib Web — Risk Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "risk"}


@app.post("/var/parametric")
async def var_parametric(req: ParametricVaRRequest):
    try:
        return calc_parametric_var(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/var/historical")
async def var_historical(req: HistoricalVaRRequest):
    try:
        return calc_historical_var(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/var/mc")
async def var_mc(req: MCVaRRequest):
    try:
        return calc_mc_var(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/portfolio/var")
async def portfolio_var(req: PortfolioVaRRequest):
    try:
        return calc_portfolio_var(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/greeks/pnl")
async def greeks_pnl(req: GreeksPnLRequest):
    try:
        return calc_greeks_pnl(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/stress/option")
async def stress_option(req: OptionStressRequest):
    try:
        return calc_option_stress(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
