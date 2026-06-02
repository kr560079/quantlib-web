import type { Greeks } from '../types/options'

const GREEKS: Array<{ key: keyof Greeks; label: string; hint: string }> = [
  { key: 'delta', label: 'Δ Delta', hint: 'Price change per $1 spot move' },
  { key: 'gamma', label: 'Γ Gamma', hint: 'Delta change per $1 spot move' },
  { key: 'vega',  label: 'ν Vega',  hint: 'Price change per 1% vol change' },
  { key: 'theta', label: 'Θ Theta', hint: 'Price decay per calendar day' },
  { key: 'rho',   label: 'ρ Rho',   hint: 'Price change per 1% rate change' },
]

export default function GreeksCard({ greeks }: { greeks: Greeks }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Greeks</h2>
      <div className="divide-y divide-gray-100">
        {GREEKS.map(({ key, label, hint }) => {
          const val = greeks[key]
          const isNaN = Number.isNaN(val)
          return (
            <div key={key} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
              <span className={`font-mono text-sm font-semibold tabular-nums ${
                isNaN ? 'text-gray-400' : val < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {isNaN ? 'N/A' : val.toFixed(6)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
