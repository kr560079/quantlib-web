export type OptionExercise = 'european' | 'american'
export type CallPut = 'call' | 'put'
export type PricingEngine = 'black-scholes' | 'heston' | 'binomial' | 'baw' | 'mc'

export interface HestonParams {
  v0: number
  kappa: number
  theta: number
  sigma: number
  rho: number
}

export interface OptionPriceRequest {
  option_type: OptionExercise
  call_put: CallPut
  spot: number
  strike: number
  maturity_date: string         // ISO date "YYYY-MM-DD"
  valuation_date?: string
  risk_free_rate: number        // 0.05 = 5%
  dividend_yield: number
  volatility: number            // 0.20 = 20%
  engine: PricingEngine
  heston_params?: HestonParams
  binomial_steps?: number
}

export interface Greeks {
  delta: number
  gamma: number
  vega: number
  theta: number
  rho: number
}

export interface OptionPriceResponse {
  price: number
  greeks: Greeks
  engine_used: string
  option_type: string
  call_put: string
  time_to_expiry_years: number
}

export interface ScenarioPoint {
  spot: number
  volatility: number
  price: number | null
  delta: number | null
  gamma: number | null
}
