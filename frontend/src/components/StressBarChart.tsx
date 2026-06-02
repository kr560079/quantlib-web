import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import type { ScenarioResult } from '../types/risk'

export default function StressBarChart({ scenarios }: { scenarios: ScenarioResult[] }) {
  const data = scenarios.map((s) => ({ name: s.name, pnl: s.pnl }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">P&amp;L by Scenario</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            width={60}
          />
          <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, 'P&L']} />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
