// ── VaR ───────────────────────────────────────────────────────────────────

export interface ParametricVaRRequest {
  position_value: number
  volatility: number
  confidence_level: number
  holding_period_days: number
}

export interface VaRResponse {
  var: number
  var_pct: number
  expected_shortfall: number
  es_pct: number
  confidence_level: number
  holding_period_days: number
  method: string
}

export interface HistoricalVaRRequest {
  returns: number[]
  position_value: number
  confidence_level: number
  holding_period_days: number
}

export interface MCVaRRequest {
  position_value: number
  volatility: number
  drift: number
  holding_period_days: number
  confidence_level: number
  simulations: number
}

export interface HistogramBin {
  midpoint: number
  density: number
}

export interface MCVaRResponse extends VaRResponse {
  simulations: number
  percentiles: Record<string, number>
  histogram: HistogramBin[]
}

// ── Portfolio VaR ──────────────────────────────────────────────────────────

export interface PortfolioPosition {
  name: string
  value: number
  volatility: number
}

export interface PortfolioVaRRequest {
  positions: PortfolioPosition[]
  avg_correlation: number
  confidence_level: number
  holding_period_days: number
}

export interface PositionVaR {
  name: string
  value: number
  individual_var: number
  component_var: number
}

export interface PortfolioVaRResponse {
  portfolio_var: number
  portfolio_var_pct: number
  portfolio_es: number
  undiversified_var: number
  diversification_benefit: number
  diversification_benefit_pct: number
  positions: PositionVaR[]
  confidence_level: number
  holding_period_days: number
}

// ── Greeks P&L ─────────────────────────────────────────────────────────────

export interface GreeksPnLRequest {
  delta: number
  gamma: number
  vega: number
  theta: number
  rho: number
  spot_change: number
  vol_change: number
  days_elapsed: number
  rate_change: number
}

export interface GreeksPnLResponse {
  delta_pnl: number
  gamma_pnl: number
  vega_pnl: number
  theta_pnl: number
  rho_pnl: number
  total_pnl: number
  total_first_order_pnl: number
}

// ── Stress Test ────────────────────────────────────────────────────────────

export interface StressScenario {
  name: string
  spot_shock_pct: number
  vol_shock_abs: number
  rate_shock_abs: number
}

export interface OptionStressRequest {
  call_put: 'call' | 'put'
  spot: number
  strike: number
  time_to_expiry_years: number
  risk_free_rate: number
  dividend_yield: number
  volatility: number
  position_size: number
  scenarios: StressScenario[]
}

export interface ScenarioResult {
  name: string
  spot_shocked: number
  vol_shocked: number
  rate_shocked: number
  price: number
  pnl: number
  delta: number | null
}

export interface OptionStressResponse {
  base_price: number
  base_delta: number | null
  position_size: number
  scenarios: ScenarioResult[]
}
