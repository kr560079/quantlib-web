import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { usePortfolioVaR } from '../hooks/useRisk'
import type { PortfolioVaRResponse } from '../types/risk'

const schema = z.object({
  positions: z.array(z.object({
    name: z.string().min(1),
    value: z.coerce.number(),
    volatility: z.coerce.number().positive().max(5),
  })).min(1),
  avg_correlation: z.coerce.number().min(-1).max(1),
  confidence_level: z.coerce.number().min(0.5).max(0.9999),
  holding_period_days: z.coerce.number().int().min(1).max(250),
})
type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  positions: [
    { name: 'AAPL', value: 50_000, volatility: 0.28 },
    { name: 'MSFT', value: 40_000, volatility: 0.24 },
    { name: 'BND',  value: 30_000, volatility: 0.06 },
  ],
  avg_correlation: 0.3,
  confidence_level: 0.95,
  holding_period_days: 1,
}

export default function PortfolioVaRPanel() {
  const { mutateAsync, isPending } = usePortfolioVaR()
  const [result, setResult] = useState<PortfolioVaRResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })
  const { fields, append, remove } = useFieldArray({ control, name: 'positions' })

  async function onSubmit(v: FormValues) {
    setError(null)
    try { setResult(await mutateAsync(v)) }
    catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Calculation failed.')
    }
  }

  const chartData = result?.positions.map((p) => ({
    name: p.name,
    individual: Math.abs(p.individual_var),
    component: p.component_var,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Positions</h3>

        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <input placeholder="Name" {...register(`positions.${i}.name`)} className="input text-xs" />
              <input placeholder="Value $" type="number" {...register(`positions.${i}.value`)} className="input text-xs" />
              <input placeholder="Vol" type="number" step="0.01" {...register(`positions.${i}.volatility`)} className="input text-xs" />
              <button type="button" onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none px-1">×</button>
            </div>
          ))}
        </div>

        {errors.positions && (
          <p className="text-red-500 text-xs">Each position needs a name, value, and volatility.</p>
        )}

        <button
          type="button"
          onClick={() => append({ name: '', value: 10_000, volatility: 0.20 })}
          className="text-xs text-blue-600 hover:underline"
        >
          + Add position
        </button>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Avg Correlation</label>
            <input type="number" step="0.05" {...register('avg_correlation')} className="input" />
          </div>
          <div>
            <label className="label">Confidence</label>
            <select {...register('confidence_level')} className="input">
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Horizon (days)</label>
          <input type="number" step="1" {...register('holding_period_days')} className="input" />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Calculating…' : 'Calculate Portfolio VaR'}
        </button>
      </form>

      {/* Results */}
      <div className="lg:col-span-3 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {result ? (
          <>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">
                    Portfolio {(result.confidence_level * 100).toFixed(0)}% VaR · {result.holding_period_days}d
                  </p>
                  <p className="text-4xl font-bold text-red-700 font-mono tracking-tight">
                    ${result.portfolio_var.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-red-500 mt-1">{(result.portfolio_var_pct * 100).toFixed(3)}% of portfolio</p>
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <p className="text-xs text-gray-400">Expected Shortfall</p>
                    <p className="font-mono font-semibold text-orange-600">
                      ${result.portfolio_es.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Undiversified VaR</p>
                    <p className="font-mono font-semibold text-gray-600">
                      ${result.undiversified_var.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Diversification Benefit</p>
                    <p className="font-mono font-semibold text-emerald-600">
                      ${result.diversification_benefit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs ml-1">({(result.diversification_benefit_pct * 100).toFixed(1)}%)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-position table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Position Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium">Position</th>
                    <th className="text-right py-1.5 font-medium">Value</th>
                    <th className="text-right py-1.5 font-medium">Individual VaR</th>
                    <th className="text-right py-1.5 font-medium">Component VaR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.positions.map((p) => (
                    <tr key={p.name}>
                      <td className="py-2 font-medium text-gray-700">{p.name}</td>
                      <td className="py-2 text-right font-mono text-gray-600">
                        ${p.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 text-right font-mono text-red-600">
                        ${p.individual_var.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-2 text-right font-mono ${p.component_var >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${p.component_var.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {chartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">VaR Contribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={{ fontSize: 10, fill: '#6b7280' }} width={60} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, undefined]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="individual" name="Individual VaR" fill="#fca5a5" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="component"  name="Component VaR" fill="#ef4444"  radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-gray-400 text-sm">{isPending ? 'Calculating…' : 'Add positions and click "Calculate Portfolio VaR".'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
