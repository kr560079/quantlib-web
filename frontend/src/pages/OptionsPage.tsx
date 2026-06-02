import { useState } from 'react'
import OptionForm from '../components/OptionForm'
import GreeksCard from '../components/GreeksCard'
import PricingResult from '../components/PricingResult'
import PayoffChart from '../components/PayoffChart'
import { usePriceOption } from '../hooks/usePricing'
import { priceScenarios } from '../api/equityClient'
import type { OptionPriceRequest, OptionPriceResponse, ScenarioPoint } from '../types/options'

export default function OptionsPage() {
  const { mutateAsync: priceOption, isPending } = usePriceOption()
  const [result, setResult] = useState<OptionPriceResponse | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioPoint[]>([])
  const [lastReq, setLastReq] = useState<OptionPriceRequest | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(req: OptionPriceRequest) {
    setError(null)
    setLastReq(req)
    try {
      const r = await priceOption(req)
      setResult(r)

      const spots = Array.from({ length: 21 }, (_, i) => req.spot * (0.6 + i * 0.04))
      const s = await priceScenarios(req, spots)
      setScenarios(s)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Pricing failed — check parameters and ensure backend is running.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Options Pricing</h1>
        <p className="text-sm text-gray-500 mt-1">
          European &amp; American options via QuantLib — BSM, Heston, Binomial, BAW, Monte Carlo
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <OptionForm onSubmit={handleSubmit} isLoading={isPending} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          {result ? (
            <>
              <PricingResult result={result} />
              <GreeksCard greeks={result.greeks} />
              {scenarios.length > 0 && lastReq && (
                <PayoffChart
                  scenarios={scenarios}
                  strike={lastReq.strike}
                  currentSpot={lastReq.spot}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
              <p className="text-gray-400 text-sm">
                {isPending ? 'Calculating…' : 'Fill in the parameters and click "Price Option".'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
