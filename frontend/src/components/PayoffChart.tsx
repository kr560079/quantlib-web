import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { ScenarioPoint } from '../types/options'

interface Props {
  scenarios: ScenarioPoint[]
  strike: number
  currentSpot: number
}

export default function PayoffChart({ scenarios, strike, currentSpot }: Props) {
  const valid = scenarios.filter((s) => s.price !== null)
  if (!valid.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Price vs Spot</h2>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="spot"
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [`$${v.toFixed(4)}`, 'Price']}
            labelFormatter={(l: number) => `Spot: $${Number(l).toFixed(2)}`}
          />
          <ReferenceLine
            x={strike}
            stroke="#ef4444"
            strokeDasharray="5 3"
            label={{ value: 'K', position: 'insideTopRight', fontSize: 11, fill: '#ef4444' }}
          />
          <ReferenceLine
            x={currentSpot}
            stroke="#3b82f6"
            strokeDasharray="5 3"
            label={{ value: 'S', position: 'insideTopLeft', fontSize: 11, fill: '#3b82f6' }}
          />
          <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={false} strokeWidth={2} name="Price" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
