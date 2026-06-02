import type { BondResponse } from '../types/fixedIncome'
import CashflowTable from './CashflowTable'

type NumericKey = 'ytm' | 'modified_duration' | 'macaulay_duration' | 'convexity' | 'dv01' | 'accrued_interest'

const METRICS: Array<{ key: NumericKey; label: string; format: (v: number) => string }> = [
  { key: 'ytm',               label: 'Yield to Maturity',    format: (v) => `${(v * 100).toFixed(4)}%` },
  { key: 'modified_duration', label: 'Modified Duration',    format: (v) => v.toFixed(4) },
  { key: 'macaulay_duration', label: 'Macaulay Duration',    format: (v) => v.toFixed(4) },
  { key: 'convexity',         label: 'Convexity',            format: (v) => v.toFixed(4) },
  { key: 'dv01',              label: 'DV01',                 format: (v) => `$${v.toFixed(4)}` },
  { key: 'accrued_interest',  label: 'Accrued Interest',     format: (v) => v.toFixed(4) },
]

export default function BondResult({ result }: { result: BondResponse }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium mb-1">Clean Price</p>
            <p className="text-4xl font-bold text-blue-700 font-mono tracking-tight">
              {result.clean_price.toFixed(4)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-500 mb-0.5">Dirty Price</p>
            <p className="text-lg font-semibold text-blue-700 font-mono">
              {result.dirty_price.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Metrics</h3>
        <div className="divide-y divide-gray-100">
          {METRICS.map(({ key, label, format }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-600">{label}</p>
              <span className="font-mono text-sm font-semibold text-gray-800 tabular-nums">
                {format(result[key])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {result.cashflows?.length > 0 && (
        <CashflowTable cashflows={result.cashflows} />
      )}
    </div>
  )
}
