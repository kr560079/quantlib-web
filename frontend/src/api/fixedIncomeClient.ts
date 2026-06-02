import axios from 'axios'
import type {
  BondRequest, BondResponse, BondScenarioPoint,
  ZeroCouponBondRequest, ZeroCouponBondResponse,
  SwapRequest, SwapResponse,
  TIPSRequest, TIPSResponse,
  BootstrapRequest, BootstrapResponse,
  CurveFitRequest, CurveFitResponse,
} from '../types/fixedIncome'

const BASE = '/api/v1/fixed-income'

export async function priceBond(req: BondRequest): Promise<BondResponse> {
  const { data } = await axios.post<BondResponse>(`${BASE}/bonds/price`, req)
  return data
}

export async function priceBondScenarios(
  base: BondRequest,
  rateRange?: number[],
): Promise<BondScenarioPoint[]> {
  const { data } = await axios.post<{ results: BondScenarioPoint[] }>(
    `${BASE}/bonds/scenarios`,
    { base, rate_range: rateRange },
  )
  return data.results
}

export async function priceZCB(req: ZeroCouponBondRequest): Promise<ZeroCouponBondResponse> {
  const { data } = await axios.post<ZeroCouponBondResponse>(`${BASE}/bonds/zcb`, req)
  return data
}

export async function priceSwap(req: SwapRequest): Promise<SwapResponse> {
  const { data } = await axios.post<SwapResponse>(`${BASE}/swaps/price`, req)
  return data
}

export async function priceTIPS(req: TIPSRequest): Promise<TIPSResponse> {
  const { data } = await axios.post<TIPSResponse>(`${BASE}/bonds/tips`, req)
  return data
}

export async function bootstrapCurve(req: BootstrapRequest): Promise<BootstrapResponse> {
  const { data } = await axios.post<BootstrapResponse>(`${BASE}/curves/bootstrap`, req)
  return data
}

export async function fitCurve(req: CurveFitRequest): Promise<CurveFitResponse> {
  const { data } = await axios.post<CurveFitResponse>(`${BASE}/curves/fit`, req)
  return data
}
