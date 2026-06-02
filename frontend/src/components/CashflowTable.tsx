import type { CashflowItem } from '../types/fixedIncome'

interface Props {
  cashflows: CashflowItem[]
  currency?: string
}

export default function CashflowTable({ cashflows, currency = '' }: Props) {
  if (!cashflows.length) return null

  const total = cashflows.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Cash Flows</h3>
      <div className="overflow-auto max-h-60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 pr-4 font-medium text-gray-500">#</th>
              <th className="text-left py-1.5 pr-4 font-medium text-gray-500">Date</th>
              <th className="text-right py-1.5 font-medium text-gray-500">Amount {currency && `(${currency})`}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cashflows.map((cf, i) => (
              <tr key={i} className={i === cashflows.length - 1 ? 'bg-blue-50' : ''}>
                <td className="py-1.5 pr-4 text-gray-400 tabular-nums">{i + 1}</td>
                <td className="py-1.5 pr-4 text-gray-700 font-mono">{cf.date}</td>
                <td className="py-1.5 text-right font-mono font-semibold text-gray-800 tabular-nums">
                  {cf.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="py-1.5 pr-4 text-sm font-medium text-gray-600">Total</td>
              <td className="py-1.5 text-right font-mono font-bold text-gray-900 tabular-nums">
                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
