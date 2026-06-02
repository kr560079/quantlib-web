import axios from 'axios'
import type { OptionPriceRequest, OptionPriceResponse, ScenarioPoint } from '../types/options'

const BASE = '/api/v1/equity'

export async function priceOption(req: OptionPriceRequest): Promise<OptionPriceResponse> {
  const { data } = await axios.post<OptionPriceResponse>(`${BASE}/options/price`, req)
  return data
}

export async function priceScenarios(
  base: OptionPriceRequest,
  spotRange?: number[],
  volRange?: number[],
): Promise<ScenarioPoint[]> {
  const { data } = await axios.post<{ results: ScenarioPoint[] }>(`${BASE}/options/scenarios`, {
    base,
    spot_range: spotRange,
    vol_range: volRange,
  })
  return data.results
}

export async function getPricingHistory(limit = 20) {
  const { data } = await axios.get(`${BASE}/options/history?limit=${limit}`)
  return data.results as Array<Record<string, unknown>>
}
