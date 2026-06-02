export type Frequency = 'annual' | 'semiannual' | 'quarterly' | 'monthly'
export type DayCount = 'act365' | 'act360' | '30/360'

export interface CashflowItem {
  date: string
  amount: number
}

export interface BondRequest {
  face_value: number
  coupon_rate: number
  frequency: Frequency
  maturity_date: string
  settlement_date?: string
  issue_date?: string
  discount_rate: number
  spread: number
  day_count: DayCount
}

export interface BondResponse {
  clean_price: number
  dirty_price: number
  accrued_interest: number
  ytm: number
  modified_duration: number
  macaulay_duration: number
  convexity: number
  dv01: number
  cashflows: CashflowItem[]
}

export interface BondScenarioPoint {
  discount_rate: number
  clean_price: number | null
  ytm: number | null
  modified_duration: number | null
}

export interface ZeroCouponBondRequest {
  face_value: number
  maturity_date: string
  settlement_date?: string
  discount_rate: number
}

export interface ZeroCouponBondResponse {
  price: number
  yield_cont: number
  duration: number
  dv01: number
}

export interface SwapRequest {
  notional: number
  fixed_rate: number
  floating_spread: number
  start_date: string
  maturity_date: string
  fixed_frequency: Frequency
  floating_frequency: Frequency
  discount_rate: number
  forward_rate?: number
  day_count: DayCount
  payer: boolean
}

export interface SwapResponse {
  npv: number
  fair_rate: number
  bpv: number
  fixed_leg_npv: number
  floating_leg_npv: number
  fixed_leg_bps: number
  floating_leg_bps: number
}

// ── TIPS ─────────────────────────────────────────────────────────────────────

export interface TIPSRequest {
  face_value: number
  real_coupon_rate: number
  maturity_date: string
  settlement_date?: string
  issue_date?: string
  base_cpi: number
  current_cpi: number
  annual_inflation_rate: number
  real_discount_rate: number
}

export interface TIPSResponse {
  index_ratio: number
  adjusted_principal: number
  real_clean_price: number
  real_dirty_price: number
  accrued_interest: number
  real_ytm: number
  nominal_clean_price: number
  nominal_dirty_price: number
  nominal_ytm: number
  modified_duration: number
  convexity: number
  dv01: number
  projected_final_notional: number
  cashflows: CashflowItem[]
}

// ── Yield Curves ──────────────────────────────────────────────────────────────

export type CurveInterpolation = 'LogLinear' | 'Linear' | 'CubicSpline'
export type CurveFitMethod = 'NelsonSiegel' | 'Svensson' | 'ExponentialSplines' | 'CubicBSplines' | 'SimplePolynomial'

export interface DepositRate {
  term: string
  rate: number
}

export interface SwapRate {
  term: string
  rate: number
}

export interface CurvePoint {
  tenor: string
  years: number
  zero_rate: number
  discount_factor: number
  forward_rate_3m: number | null
}

export interface BootstrapRequest {
  evaluation_date?: string
  deposits: DepositRate[]
  swaps: SwapRate[]
  interpolation: CurveInterpolation
}

export interface BootstrapResponse {
  reference_date: string
  interpolation: string
  points: CurvePoint[]
}

export interface FitBond {
  maturity_date: string
  coupon_rate: number
  price: number
  frequency: Frequency
}

export interface CurveFitRequest {
  evaluation_date?: string
  bonds: FitBond[]
  method: CurveFitMethod
}

export interface CurveFitResponse {
  reference_date: string
  method: string
  iterations: number
  parameters: number[]
  points: CurvePoint[]
}
