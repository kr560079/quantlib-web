import type { SwapResponse } from '../types/fixedIncome'

export default function SwapResult({ result, notional }: { result: SwapResponse; notional: number }) {
  const npvColor = result.npv >= 0 ? 'text-emerald-700' : 'text-red-600'
  const npvBg = result.npv >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-6 ${npvBg}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium mb-1 ${result.npv >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>NPV</p>
            <p className={`text-4xl font-bold font-mono tracking-tight ${npvColor}`}>
              ${result.npv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Fair Rate</p>
            <p className="text-lg font-semibold text-gray-800 font-mono">
              {(result.fair_rate * 100).toFixed(4)}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leg Breakdown</h3>
        <div className="divide-y divide-gray-100">
          <Row label="Fixed Leg NPV"   value={`$${result.fixed_leg_npv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <Row label="Floating Leg NPV" value={`$${result.floating_leg_npv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <Row label="BPV (DV01)"       value={`$${result.bpv.toFixed(2)}`} />
          <Row label="Fixed Leg BPS"    value={`${result.fixed_leg_bps.toFixed(2)} bps`} />
          <Row label="Floating Leg BPS" value={`${result.floating_leg_bps.toFixed(2)} bps`} />
          <Row label="Notional"          value={`$${notional.toLocaleString()}`} />
        </div>
      </div>
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
