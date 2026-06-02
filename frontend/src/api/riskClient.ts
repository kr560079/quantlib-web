import axios from 'axios'
import type {
  ParametricVaRRequest, VaRResponse,
  HistoricalVaRRequest,
  MCVaRRequest, MCVaRResponse,
  PortfolioVaRRequest, PortfolioVaRResponse,
  GreeksPnLRequest, GreeksPnLResponse,
  OptionStressRequest, OptionStressResponse,
} from '../types/risk'

const BASE = '/api/v1/risk'

export const calcParametricVaR = (req: ParametricVaRRequest) =>
  axios.post<VaRResponse>(`${BASE}/var/parametric`, req).then((r) => r.data)

export const calcHistoricalVaR = (req: HistoricalVaRRequest) =>
  axios.post<VaRResponse>(`${BASE}/var/historical`, req).then((r) => r.data)

export const calcMCVaR = (req: MCVaRRequest) =>
  axios.post<MCVaRResponse>(`${BASE}/var/mc`, req).then((r) => r.data)

export const calcPortfolioVaR = (req: PortfolioVaRRequest) =>
  axios.post<PortfolioVaRResponse>(`${BASE}/portfolio/var`, req).then((r) => r.data)

export const calcGreeksPnL = (req: GreeksPnLRequest) =>
  axios.post<GreeksPnLResponse>(`${BASE}/greeks/pnl`, req).then((r) => r.data)

export const calcOptionStress = (req: OptionStressRequest) =>
  axios.post<OptionStressResponse>(`${BASE}/stress/option`, req).then((r) => r.data)
