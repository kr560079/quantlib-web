from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    BondRequest, BondScenariosRequest, ZeroCouponBondRequest, SwapRequest,
    TIPSRequest, BootstrapRequest, CurveFitRequest,
)
from pricing import (
    price_bond, price_bond_scenarios, price_zcb, price_swap,
    price_tips, bootstrap_curve, fit_curve,
)
from database import init_db, save_result, get_recent


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="QuantLib Web — Fixed Income Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "fixed-income"}


@app.post("/bonds/price")
async def price_bond_endpoint(req: BondRequest):
    try:
        result = price_bond(req)
        save_result("bond", req, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing error: {e}")


@app.post("/bonds/scenarios")
async def bond_scenarios_endpoint(req: BondScenariosRequest):
    rates = req.rate_range or [
        req.base.discount_rate + (i - 10) * 0.005 for i in range(21)
    ]
    try:
        return {"results": price_bond_scenarios(req.base, rates)}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario error: {e}")


@app.post("/bonds/zcb")
async def price_zcb_endpoint(req: ZeroCouponBondRequest):
    try:
        result = price_zcb(req)
        save_result("zcb", req, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing error: {e}")


@app.post("/bonds/tips")
async def price_tips_endpoint(req: TIPSRequest):
    try:
        result = price_tips(req)
        save_result("tips", req, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing error: {e}")


@app.post("/swaps/price")
async def price_swap_endpoint(req: SwapRequest):
    try:
        result = price_swap(req)
        save_result("swap", req, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing error: {e}")


@app.post("/curves/bootstrap")
async def bootstrap_curve_endpoint(req: BootstrapRequest):
    try:
        return bootstrap_curve(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bootstrap error: {e}")


@app.post("/curves/fit")
async def fit_curve_endpoint(req: CurveFitRequest):
    try:
        return fit_curve(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Curve fit error: {e}")


@app.get("/history")
async def history(limit: int = 20):
    return {"results": get_recent(limit)}
