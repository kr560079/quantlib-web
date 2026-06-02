import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { CurvePoint } from '../types/fixedIncome'

interface Props {
  points: CurvePoint[]
  title?: string
}

type Series = 'zero' | 'forward' | 'df'

export default function YieldCurveChart({ points, title = 'Yield Curve' }: Props) {
  const [visible, setVisible] = useState<Set<Series>>(new Set(['zero', 'forward']))

  const data = points.map((p) => ({
    tenor: p.tenor,
    years: p.years,
    zero: +(p.zero_rate * 100).toFixed(4),
    forward: p.forward_rate_3m != null ? +(p.forward_rate_3m * 100).toFixed(4) : undefined,
    df: +p.discount_factor.toFixed(6),
  }))

  function toggle(s: Series) {
    setVisible((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  function Chip({ id, label, color }: { id: Series; label: string; color: string }) {
    const active = visible.has(id)
    return (
      <button
        onClick={() => toggle(id)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          active ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-300'
        }`}
        style={active ? { backgroundColor: color, borderColor: color } : undefined}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="flex gap-2">
          <Chip id="zero" label="Zero Rate" color="#3b82f6" />
          <Chip id="forward" label="3M Fwd Rate" color="#f97316" />
          <Chip id="df" label="Discount Factor" color="#8b5cf6" />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="tenor" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            yAxisId="rate"
            tickFormatter={(v: number) => `${v.toFixed(2)}%`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={56}
          />
          {visible.has('df') && (
            <YAxis
              yAxisId="df"
              orientation="right"
              tickFormatter={(v: number) => v.toFixed(3)}
              tick={{ fontSize: 11, fill: '#8b5cf6' }}
              width={56}
            />
          )}
          <Tooltip
            formatter={(v: number, name: string) => {
              if (name === 'Discount Factor') return [v.toFixed(6), name]
              return [`${v.toFixed(4)}%`, name]
            }}
          />
          <Legend />
          {visible.has('zero') && (
            <Line
              yAxisId="rate" type="monotone" dataKey="zero"
              name="Zero Rate" stroke="#3b82f6" dot={{ r: 3 }} strokeWidth={2}
            />
          )}
          {visible.has('forward') && (
            <Line
              yAxisId="rate" type="monotone" dataKey="forward"
              name="3M Fwd Rate" stroke="#f97316" strokeDasharray="5 3" dot={{ r: 3 }} strokeWidth={2}
            />
          )}
          {visible.has('df') && (
            <Line
              yAxisId="df" type="monotone" dataKey="df"
              name="Discount Factor" stroke="#8b5cf6" dot={{ r: 3 }} strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Data table */}
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              {['Tenor', 'Years', 'Zero Rate', 'Discount Factor', '3M Fwd Rate'].map((h) => (
                <th key={h} className="text-left py-1.5 pr-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {points.map((p) => (
              <tr key={p.tenor}>
                <td className="py-1.5 pr-3 font-semibold text-gray-700">{p.tenor}</td>
                <td className="py-1.5 pr-3 font-mono text-gray-600">{p.years.toFixed(2)}</td>
                <td className="py-1.5 pr-3 font-mono text-blue-700">{(p.zero_rate * 100).toFixed(4)}%</td>
                <td className="py-1.5 pr-3 font-mono text-purple-700">{p.discount_factor.toFixed(6)}</td>
                <td className="py-1.5 font-mono text-orange-700">
                  {p.forward_rate_3m != null ? `${(p.forward_rate_3m * 100).toFixed(4)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
