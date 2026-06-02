import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { BondScenarioPoint } from '../types/fixedIncome'

interface Props {
  scenarios: BondScenarioPoint[]
  currentRate: number
}

export default function BondSensitivityChart({ scenarios, currentRate }: Props) {
  const valid = scenarios.filter((s) => s.clean_price !== null)
  if (!valid.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Price vs Discount Rate</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="discount_rate"
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={50}
          />
          <Tooltip
            formatter={(v: number) => [v.toFixed(4), 'Clean Price']}
            labelFormatter={(l: number) => `Rate: ${(Number(l) * 100).toFixed(2)}%`}
          />
          <ReferenceLine
            x={currentRate}
            stroke="#3b82f6"
            strokeDasharray="5 3"
            label={{ value: 'r', position: 'insideTopLeft', fontSize: 11, fill: '#3b82f6' }}
          />
          <Line type="monotone" dataKey="clean_price" stroke="#3b82f6" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
