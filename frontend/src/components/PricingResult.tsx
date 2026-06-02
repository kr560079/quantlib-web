import type { OptionPriceResponse } from '../types/options'

export default function PricingResult({ result }: { result: OptionPriceResponse }) {
  const daysToExpiry = Math.round(result.time_to_expiry_years * 365)
  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-blue-600 font-medium mb-1">Option Price</p>
          <p className="text-4xl font-bold text-blue-700 font-mono tracking-tight">
            ${result.price.toFixed(4)}
          </p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full capitalize font-medium">
          {result.engine_used}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-blue-700">
        <Tag>{result.option_type}</Tag>
        <Tag>{result.call_put}</Tag>
        <Tag>{daysToExpiry} days to expiry</Tag>
        <Tag>{(result.time_to_expiry_years).toFixed(3)} years</Tag>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-blue-100 px-2.5 py-0.5 rounded-full capitalize text-xs font-medium">
      {children}
    </span>
  )
}
