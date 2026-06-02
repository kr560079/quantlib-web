from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── VaR ────────────────────────────────────────────────────────────────────

class ParametricVaRRequest(BaseModel):
    position_value: float = Field(..., description="Current $ position value")
    volatility: float = Field(..., gt=0, description="Annualized vol, e.g. 0.20")
    confidence_level: float = Field(0.95, ge=0.5, le=0.9999)
    holding_period_days: int = Field(1, ge=1, le=250)


class VaRResponse(BaseModel):
    var: float
    var_pct: float
    expected_shortfall: float
    es_pct: float
    confidence_level: float
    holding_period_days: int
    method: str


class HistoricalVaRRequest(BaseModel):
    returns: list[float] = Field(..., min_length=30, description="Daily log/arithmetic returns")
    position_value: float
    confidence_level: float = Field(0.95, ge=0.5, le=0.9999)
    holding_period_days: int = Field(1, ge=1, le=20)


class MCVaRRequest(BaseModel):
    position_value: float
    volatility: float = Field(..., gt=0, description="Annualized vol")
    drift: float = Field(0.0, description="Annualized drift (0 = risk-neutral)")
    holding_period_days: int = Field(10, ge=1, le=250)
    confidence_level: float = Field(0.95, ge=0.5, le=0.9999)
    simulations: int = Field(10_000, ge=1000, le=100_000)


class HistogramBin(BaseModel):
    midpoint: float
    density: float


class MCVaRResponse(BaseModel):
    var: float
    var_pct: float
    expected_shortfall: float
    es_pct: float
    confidence_level: float
    holding_period_days: int
    simulations: int
    percentiles: dict[str, float]
    histogram: list[HistogramBin]
    method: str


# ── Portfolio VaR ───────────────────────────────────────────────────────────

class PortfolioPosition(BaseModel):
    name: str
    value: float = Field(..., description="$ value (negative = short)")
    volatility: float = Field(..., gt=0, description="Annualized vol")


class PortfolioVaRRequest(BaseModel):
    positions: list[PortfolioPosition] = Field(..., min_length=1)
    avg_correlation: float = Field(0.3, ge=-1.0, le=1.0)
    confidence_level: float = Field(0.95, ge=0.5, le=0.9999)
    holding_period_days: int = Field(1, ge=1, le=250)


class PositionVaR(BaseModel):
    name: str
    value: float
    individual_var: float
    component_var: float


class PortfolioVaRResponse(BaseModel):
    portfolio_var: float
    portfolio_var_pct: float
    portfolio_es: float
    undiversified_var: float
    diversification_benefit: float
    diversification_benefit_pct: float
    positions: list[PositionVaR]
    confidence_level: float
    holding_period_days: int


# ── Greeks P&L ──────────────────────────────────────────────────────────────

class GreeksPnLRequest(BaseModel):
    delta: float
    gamma: float
    vega: float = Field(..., description="Raw QuantLib vega (dP/d_sigma)")
    theta: float = Field(..., description="QuantLib theta — price decay per calendar day")
    rho: float = Field(..., description="Raw QuantLib rho (dP/d_rate)")
    spot_change: float = Field(..., description="$ change in spot")
    vol_change: float = Field(0.0, description="Absolute vol change in decimal (0.01 = 1 vol pt)")
    days_elapsed: float = Field(1.0, ge=0)
    rate_change: float = Field(0.0, description="Absolute rate change in decimal (0.01 = 100 bps)")


class GreeksPnLResponse(BaseModel):
    delta_pnl: float
    gamma_pnl: float
    vega_pnl: float
    theta_pnl: float
    rho_pnl: float
    total_pnl: float
    total_first_order_pnl: float


# ── Option Stress Test ──────────────────────────────────────────────────────

class StressScenario(BaseModel):
    name: str
    spot_shock_pct: float = Field(..., description="Fractional shock, e.g. -0.10 = -10%")
    vol_shock_abs: float = Field(..., description="Absolute vol shock (0.10 = +10 vol pts)")
    rate_shock_abs: float = Field(0.0, description="Absolute rate shock")


class OptionStressRequest(BaseModel):
    call_put: str = Field("call", pattern="^(call|put)$")
    spot: float = Field(..., gt=0)
    strike: float = Field(..., gt=0)
    time_to_expiry_years: float = Field(..., gt=0)
    risk_free_rate: float
    dividend_yield: float = Field(0.0)
    volatility: float = Field(..., gt=0)
    position_size: float = Field(1.0, description="Units held (negative = short)")
    scenarios: list[StressScenario]


class ScenarioResult(BaseModel):
    name: str
    spot_shocked: float
    vol_shocked: float
    rate_shocked: float
    price: float
    pnl: float
    delta: Optional[float]


class OptionStressResponse(BaseModel):
    base_price: float
    base_delta: Optional[float]
    position_size: float
    scenarios: list[ScenarioResult]
