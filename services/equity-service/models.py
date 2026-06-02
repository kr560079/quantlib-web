from __future__ import annotations
from datetime import date
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class OptionType(str, Enum):
    european = "european"
    american = "american"


class CallPut(str, Enum):
    call = "call"
    put = "put"


class PricingEngine(str, Enum):
    black_scholes = "black-scholes"
    heston = "heston"
    binomial = "binomial"
    baw = "baw"
    mc = "mc"


class HestonParams(BaseModel):
    v0: float = Field(0.04, description="Initial variance")
    kappa: float = Field(2.0, description="Mean reversion speed")
    theta: float = Field(0.04, description="Long-run variance")
    sigma: float = Field(0.3, description="Vol of variance")
    rho: float = Field(-0.7, description="Spot-variance correlation")


class OptionPriceRequest(BaseModel):
    option_type: OptionType = OptionType.european
    call_put: CallPut = CallPut.call
    spot: float = Field(..., gt=0)
    strike: float = Field(..., gt=0)
    maturity_date: date
    valuation_date: Optional[date] = None
    risk_free_rate: float = Field(..., description="Annualized, e.g. 0.05")
    dividend_yield: float = Field(0.0)
    volatility: float = Field(..., gt=0, description="Annualized, e.g. 0.20")
    engine: PricingEngine = PricingEngine.black_scholes
    heston_params: Optional[HestonParams] = None
    binomial_steps: int = Field(200, ge=50, le=2000)

    @model_validator(mode="after")
    def check_maturity(self) -> OptionPriceRequest:
        val = self.valuation_date or date.today()
        if self.maturity_date <= val:
            raise ValueError("maturity_date must be after valuation_date")
        return self


class Greeks(BaseModel):
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: float


class OptionPriceResponse(BaseModel):
    price: float
    greeks: Greeks
    engine_used: str
    option_type: str
    call_put: str
    time_to_expiry_years: float


class ScenarioRequest(BaseModel):
    base: OptionPriceRequest
    spot_range: Optional[list[float]] = None
    vol_range: Optional[list[float]] = None
