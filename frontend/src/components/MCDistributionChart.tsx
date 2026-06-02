import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { MCVaRResponse } from '../types/risk'

export default function MCDistributionChart({ result }: { result: MCVaRResponse }) {
  const varThreshold = -(result.var_pct)
  const esThreshold = -(result.es_pct)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-1">Return Distribution</h3>
      <p className="text-xs text-gray-400 mb-4">{result.simulations.toLocaleString()} simulated paths</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={result.histogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="midpoint"
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            tick={{ fontSize: 10, fill: '#6b7280' }}
          />
          <YAxis hide />
          <Tooltip
            formatter={(v: number) => [v.toFixed(4), 'Density']}
            labelFormatter={(l: number) => `Return: ${(Number(l) * 100).toFixed(2)}%`}
          />
          <ReferenceLine
            x={varThreshold}
            stroke="#ef4444"
            strokeDasharray="4 3"
            label={{ value: 'VaR', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
          />
          <ReferenceLine
            x={esThreshold}
            stroke="#f97316"
            strokeDasharray="4 3"
            label={{ value: 'ES', position: 'insideTopLeft', fontSize: 10, fill: '#f97316' }}
          />
          <Area
            type="monotone" dataKey="density"
            stroke="#3b82f6" strokeWidth={2}
            fill="url(#distGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
