import type { TIPSResponse } from '../types/fixedIncome'
import CashflowTable from './CashflowTable'

interface Props {
  result: TIPSResponse
  faceValue: number
}

export default function TIPSResult({ result, faceValue }: Props) {
  return (
    <div className="space-y-4">
      {/* Headline prices */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <p className="text-xs text-blue-500 font-medium mb-0.5">Real Clean Price</p>
          <p className="text-3xl font-bold text-blue-700 font-mono">{result.real_clean_price.toFixed(4)}</p>
          <p className="text-xs text-blue-400 mt-1">% of original par</p>
        </div>
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <p className="text-xs text-indigo-500 font-medium mb-0.5">Nominal Clean Price</p>
          <p className="text-3xl font-bold text-indigo-700 font-mono">
            ${result.nominal_clean_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-indigo-400 mt-1">in nominal dollars</p>
        </div>
      </div>

      {/* Inflation metrics */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Inflation Metrics</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-amber-500 mb-0.5">Index Ratio</p>
            <p className="text-xl font-bold font-mono text-amber-800">{result.index_ratio.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-amber-500 mb-0.5">Adj. Principal</p>
            <p className="text-xl font-bold font-mono text-amber-800">${result.adjusted_principal.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-amber-500 mb-0.5">Proj. Notional</p>
            <p className="text-xl font-bold font-mono text-amber-800">${result.projected_final_notional.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Yield & risk metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Yield &amp; Risk Metrics</h3>
        <div className="divide-y divide-gray-100">
          <Row label="Real YTM"           value={`${(result.real_ytm * 100).toFixed(4)}%`} />
          <Row label="Nominal YTM"        value={`${(result.nominal_ytm * 100).toFixed(4)}%`} />
          <Row label="Real Dirty Price"   value={result.real_dirty_price.toFixed(4)} />
          <Row label="Nominal Dirty Price" value={`$${result.nominal_dirty_price.toFixed(2)}`} />
          <Row label="Accrued Interest"   value={result.accrued_interest.toFixed(4)} />
          <Row label="Modified Duration"  value={result.modified_duration.toFixed(4)} />
          <Row label="Convexity"          value={result.convexity.toFixed(4)} />
          <Row label="DV01"               value={`$${result.dv01.toFixed(4)}`} />
        </div>
      </div>

      {result.cashflows.length > 0 && (
        <CashflowTable cashflows={result.cashflows} currency="nominal $" />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-sm text-gray-600">{label}</p>
      <span className="font-mono text-sm font-semibold text-gray-800 tabular-nums">{value}</span>
    </div>
  )
}
