from __future__ import annotations
from datetime import date
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Frequency(str, Enum):
    annual = "annual"
    semiannual = "semiannual"
    quarterly = "quarterly"
    monthly = "monthly"


class DayCount(str, Enum):
    act365 = "act365"
    act360 = "act360"
    thirty360 = "30/360"


class CashflowItem(BaseModel):
    date: str
    amount: float


class BondRequest(BaseModel):
    face_value: float = Field(100.0, gt=0)
    coupon_rate: float = Field(..., ge=0, description="Annual coupon rate, e.g. 0.05")
    frequency: Frequency = Frequency.semiannual
    maturity_date: date
    settlement_date: Optional[date] = None
    issue_date: Optional[date] = None
    discount_rate: float = Field(..., description="Flat discount rate, e.g. 0.05")
    spread: float = Field(0.0, description="Credit spread added to discount rate")
    day_count: DayCount = DayCount.act365


class BondResponse(BaseModel):
    clean_price: float
    dirty_price: float
    accrued_interest: float
    ytm: float
    modified_duration: float
    macaulay_duration: float
    convexity: float
    dv01: float
    cashflows: list[CashflowItem] = []


class BondScenariosRequest(BaseModel):
    base: BondRequest
    rate_range: Optional[list[float]] = None


class ZeroCouponBondRequest(BaseModel):
    face_value: float = Field(100.0, gt=0)
    maturity_date: date
    settlement_date: Optional[date] = None
    discount_rate: float = Field(..., description="Continuously compounded discount rate")


class ZeroCouponBondResponse(BaseModel):
    price: float
    yield_cont: float = Field(..., description="Continuously compounded yield")
    duration: float = Field(..., description="Time to maturity in years")
    dv01: float


class SwapRequest(BaseModel):
    notional: float = Field(1_000_000.0, gt=0)
    fixed_rate: float = Field(..., ge=0, description="Fixed leg rate, e.g. 0.03")
    floating_spread: float = Field(0.0, description="Spread over floating index")
    start_date: date
    maturity_date: date
    fixed_frequency: Frequency = Frequency.semiannual
    floating_frequency: Frequency = Frequency.quarterly
    discount_rate: float = Field(..., description="Flat OIS/discount rate")
    forward_rate: Optional[float] = Field(None, description="Floating index forward rate; defaults to discount_rate")
    day_count: DayCount = DayCount.act360
    payer: bool = Field(True, description="True = pay fixed, receive float")


class SwapResponse(BaseModel):
    npv: float
    fair_rate: float
    bpv: float
    fixed_leg_npv: float
    floating_leg_npv: float
    fixed_leg_bps: float
    floating_leg_bps: float


# ── TIPS ──────────────────────────────────────────────────────────────────────

class TIPSRequest(BaseModel):
    face_value: float = Field(1000.0, gt=0, description="Original face/par value")
    real_coupon_rate: float = Field(..., ge=0, description="Real coupon rate, e.g. 0.00625 for 0.625%")
    maturity_date: date
    settlement_date: Optional[date] = None
    issue_date: Optional[date] = None
    base_cpi: float = Field(..., gt=0, description="CPI at bond issuance / reference date")
    current_cpi: float = Field(..., gt=0, description="Latest observed CPI level")
    annual_inflation_rate: float = Field(0.025, description="Forward inflation assumption, e.g. 0.025 for 2.5%")
    real_discount_rate: float = Field(..., description="Real yield used for discounting, e.g. 0.02")


class TIPSResponse(BaseModel):
    index_ratio: float
    adjusted_principal: float
    real_clean_price: float
    real_dirty_price: float
    accrued_interest: float
    real_ytm: float
    nominal_clean_price: float
    nominal_dirty_price: float
    nominal_ytm: float
    modified_duration: float
    convexity: float
    dv01: float
    projected_final_notional: float
    cashflows: list[CashflowItem] = []


# ── Yield Curves ──────────────────────────────────────────────────────────────

class CurveInterpolation(str, Enum):
    log_linear = "LogLinear"
    linear = "Linear"
    cubic_spline = "CubicSpline"


class CurveFitMethod(str, Enum):
    nelson_siegel = "NelsonSiegel"
    svensson = "Svensson"
    exponential_splines = "ExponentialSplines"
    cubic_bsplines = "CubicBSplines"
    simple_polynomial = "SimplePolynomial"


class DepositRate(BaseModel):
    term: str = Field(..., description="e.g. '1M', '3M', '6M'")
    rate: float = Field(..., description="Decimal rate, e.g. 0.0315 for 3.15%")


class SwapRate(BaseModel):
    term: str = Field(..., description="e.g. '1Y', '5Y', '10Y'")
    rate: float = Field(..., description="Decimal rate, e.g. 0.03 for 3%")


class CurvePoint(BaseModel):
    tenor: str
    years: float
    zero_rate: float
    discount_factor: float
    forward_rate_3m: Optional[float] = None


class BootstrapRequest(BaseModel):
    evaluation_date: Optional[date] = None
    deposits: list[DepositRate] = Field(default_factory=list)
    swaps: list[SwapRate] = Field(default_factory=list)
    interpolation: CurveInterpolation = CurveInterpolation.log_linear


class BootstrapResponse(BaseModel):
    reference_date: str
    interpolation: str
    points: list[CurvePoint]


class FitBond(BaseModel):
    maturity_date: date
    coupon_rate: float = Field(..., ge=0, description="Annual coupon, e.g. 0.04 for 4%")
    price: float = Field(..., description="Clean price as % of par, e.g. 99.5")
    frequency: Frequency = Frequency.semiannual


class CurveFitRequest(BaseModel):
    evaluation_date: Optional[date] = None
    bonds: list[FitBond]
    method: CurveFitMethod = CurveFitMethod.nelson_siegel


class CurveFitResponse(BaseModel):
    reference_date: str
    method: str
    iterations: int
    parameters: list[float]
    points: list[CurvePoint]
