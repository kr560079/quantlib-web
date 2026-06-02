import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { useGreeksPnL } from '../hooks/useRisk'
import type { GreeksPnLResponse } from '../types/risk'

const schema = z.object({
  delta: z.coerce.number(),
  gamma: z.coerce.number(),
  vega: z.coerce.number(),
  theta: z.coerce.number(),
  rho: z.coerce.number(),
  spot_change: z.coerce.number(),
  vol_change: z.coerce.number(),
  days_elapsed: z.coerce.number().min(0),
  rate_change: z.coerce.number(),
})
type FormValues = z.infer<typeof schema>

export default function GreeksPnLPanel() {
  const { mutateAsync, isPending } = useGreeksPnL()
  const [result, setResult] = useState<GreeksPnLResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      delta: 0.5, gamma: 0.02, vega: 0.35, theta: -0.05, rho: 0.15,
      spot_change: 2.0, vol_change: 0.01, days_elapsed: 1, rate_change: 0.0,
    },
  })

  async function onSubmit(v: FormValues) {
    setError(null)
    try { setResult(await mutateAsync(v)) }
    catch { setError('Calculation failed.') }
  }

  const chartData = result ? [
    { label: 'Δ Delta',  pnl: result.delta_pnl },
    { label: 'Γ Gamma',  pnl: result.gamma_pnl },
    { label: 'ν Vega',   pnl: result.vega_pnl },
    { label: 'Θ Theta',  pnl: result.theta_pnl },
    { label: 'ρ Rho',    pnl: result.rho_pnl },
  ] : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Greeks (from Options Pricing)</h3>
          <div className="space-y-3">
            {([['delta','Δ Delta','0.5'],['gamma','Γ Gamma','0.02'],['vega','ν Vega','0.35'],['theta','Θ Theta (per day)','-0.05'],['rho','ρ Rho','0.15']] as const).map(([key, label, ph]) => (
              <div key={key} className="grid grid-cols-[auto_1fr] gap-3 items-center">
                <span className="text-xs text-gray-500 w-28">{label}</span>
                <input type="number" step="0.0001" placeholder={ph} {...register(key)} className="input text-sm" />
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Market Moves</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Spot Change ($)</label>
              <input type="number" step="0.01" {...register('spot_change')} className="input" />
            </div>
            <div>
              <label className="label">Vol Change (decimal, e.g. 0.01 = 1 vol pt)</label>
              <input type="number" step="0.001" {...register('vol_change')} className="input" />
            </div>
            <div>
              <label className="label">Rate Change (decimal, e.g. 0.01 = 100 bps)</label>
              <input type="number" step="0.001" {...register('rate_change')} className="input" />
            </div>
            <div>
              <label className="label">Days Elapsed</label>
              <input type="number" step="0.5" {...register('days_elapsed')} className="input" />
            </div>
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <p className="text-red-500 text-xs">Check all fields are filled correctly.</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Calculating…' : 'Attribute P&L'}
        </button>
      </form>

      <div className="lg:col-span-2 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {result ? (
          <>
            {/* Total P&L banner */}
            <div className={`rounded-xl border p-6 ${result.total_pnl >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-medium mb-1 ${result.total_pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Total P&amp;L (with Gamma)</p>
                  <p className={`text-4xl font-bold font-mono tracking-tight ${result.total_pnl >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.total_pnl >= 0 ? '+' : ''}{result.total_pnl.toFixed(6)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">First-order only</p>
                  <p className="text-lg font-semibold text-gray-600 font-mono">
                    {result.total_first_order_pnl >= 0 ? '+' : ''}{result.total_first_order_pnl.toFixed(6)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Gamma adds {(result.total_pnl - result.total_first_order_pnl).toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            {/* Attribution breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Attribution</h3>
              <div className="divide-y divide-gray-100">
                {([
                  ['Δ Delta P&L',  result.delta_pnl],
                  ['Γ Gamma P&L',  result.gamma_pnl],
                  ['ν Vega P&L',   result.vega_pnl],
                  ['Θ Theta P&L',  result.theta_pnl],
                  ['ρ Rho P&L',    result.rho_pnl],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className={`font-mono text-sm font-semibold tabular-nums ${val >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {val >= 0 ? '+' : ''}{val.toFixed(6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">P&amp;L Attribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tickFormatter={(v: number) => v.toFixed(4)} tick={{ fontSize: 10, fill: '#6b7280' }} width={65} />
                  <Tooltip formatter={(v: number) => [v.toFixed(6), 'P&L']} />
                  <ReferenceLine y={0} stroke="#9ca3af" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-gray-400 text-sm">{isPending ? 'Calculating…' : 'Enter Greeks and market moves, then click "Attribute P&L".'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
