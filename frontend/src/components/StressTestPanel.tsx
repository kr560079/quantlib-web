import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import StressBarChart from './StressBarChart'
import { useOptionStress } from '../hooks/useRisk'
import type { OptionStressResponse } from '../types/risk'

const DEFAULT_SCENARIOS = [
  { name: 'Mild Up',    spot_shock_pct:  0.05, vol_shock_abs: -0.02, rate_shock_abs: 0 },
  { name: 'Mild Down',  spot_shock_pct: -0.05, vol_shock_abs:  0.02, rate_shock_abs: 0 },
  { name: 'Bull',       spot_shock_pct:  0.15, vol_shock_abs: -0.05, rate_shock_abs: 0 },
  { name: 'Bear',       spot_shock_pct: -0.15, vol_shock_abs:  0.10, rate_shock_abs: 0 },
  { name: 'Crash',      spot_shock_pct: -0.30, vol_shock_abs:  0.20, rate_shock_abs: 0.01 },
  { name: 'Vol Spike',  spot_shock_pct:  0.00, vol_shock_abs:  0.15, rate_shock_abs: 0 },
  { name: 'Vol Crush',  spot_shock_pct:  0.00, vol_shock_abs: -0.10, rate_shock_abs: 0 },
  { name: 'Rate +100',  spot_shock_pct:  0.00, vol_shock_abs:  0.00, rate_shock_abs: 0.01 },
]

const schema = z.object({
  call_put: z.enum(['call', 'put']),
  spot: z.coerce.number().positive(),
  strike: z.coerce.number().positive(),
  time_to_expiry_years: z.coerce.number().positive(),
  risk_free_rate: z.coerce.number(),
  dividend_yield: z.coerce.number(),
  volatility: z.coerce.number().positive(),
  position_size: z.coerce.number(),
  scenarios: z.array(z.object({
    name: z.string().min(1),
    spot_shock_pct: z.coerce.number(),
    vol_shock_abs: z.coerce.number(),
    rate_shock_abs: z.coerce.number(),
  })).min(1),
})
type FormValues = z.infer<typeof schema>

export default function StressTestPanel() {
  const { mutateAsync, isPending } = useOptionStress()
  const [result, setResult] = useState<OptionStressResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      call_put: 'call', spot: 100, strike: 100,
      time_to_expiry_years: 0.5, risk_free_rate: 0.05,
      dividend_yield: 0.0, volatility: 0.20, position_size: 100,
      scenarios: DEFAULT_SCENARIOS,
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'scenarios' })

  async function onSubmit(v: FormValues) {
    setError(null)
    try { setResult(await mutateAsync(v)) }
    catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Stress test failed — check parameters.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Option Position</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select {...register('call_put')} className="input">
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
              </div>
              <div>
                <label className="label">Position Size</label>
                <input type="number" step="1" {...register('position_size')} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Spot (S)</label>
                <input type="number" step="0.01" {...register('spot')} className="input" />
              </div>
              <div>
                <label className="label">Strike (K)</label>
                <input type="number" step="0.01" {...register('strike')} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Time to Expiry (years)</label>
              <input type="number" step="0.01" {...register('time_to_expiry_years')} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Risk-Free Rate</label>
                <input type="number" step="0.001" placeholder="0.05" {...register('risk_free_rate')} className="input" />
              </div>
              <div>
                <label className="label">Volatility (σ)</label>
                <input type="number" step="0.01" placeholder="0.20" {...register('volatility')} className="input" />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Scenarios</h3>
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 text-xs text-gray-400 px-1">
              <span>Name</span><span>Spot%</span><span>ΔVol</span><span></span>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-center">
                <input placeholder="Name" {...register(`scenarios.${i}.name`)} className="input text-xs" />
                <input type="number" step="0.01" {...register(`scenarios.${i}.spot_shock_pct`)} className="input text-xs w-16 text-center" />
                <input type="number" step="0.01" {...register(`scenarios.${i}.vol_shock_abs`)} className="input text-xs w-16 text-center" />
                <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 text-base leading-none">×</button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ name: 'Custom', spot_shock_pct: 0, vol_shock_abs: 0, rate_shock_abs: 0 })}
            className="text-xs text-blue-600 hover:underline mt-2"
          >
            + Add scenario
          </button>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Running…' : 'Run Stress Test'}
        </button>
      </form>

      {/* Results */}
      <div className="lg:col-span-3 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {result ? (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400">Base Price</p>
                <p className="font-mono font-semibold text-gray-800">{result.base_price.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Base Delta</p>
                <p className="font-mono font-semibold text-gray-800">{result.base_delta?.toFixed(4) ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Position</p>
                <p className="font-mono font-semibold text-gray-800">{result.position_size > 0 ? '+' : ''}{result.position_size} units</p>
              </div>
            </div>

            <StressBarChart scenarios={result.scenarios} />

            <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">Scenario</th>
                    <th className="text-right py-1.5 font-medium">Spot</th>
                    <th className="text-right py-1.5 font-medium">Vol</th>
                    <th className="text-right py-1.5 font-medium">Price</th>
                    <th className="text-right py-1.5 font-medium">P&amp;L</th>
                    <th className="text-right py-1.5 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.scenarios.map((s) => (
                    <tr key={s.name}>
                      <td className="py-2 font-medium text-gray-700">{s.name}</td>
                      <td className="py-2 text-right font-mono text-gray-600">{s.spot_shocked.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono text-gray-600">{(s.vol_shocked * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right font-mono text-gray-600">{s.price.toFixed(4)}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${s.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {s.pnl >= 0 ? '+' : ''}{s.pnl.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-500">{s.delta?.toFixed(4) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-gray-400 text-sm">{isPending ? 'Running scenarios…' : 'Configure the option position and click "Run Stress Test".'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
