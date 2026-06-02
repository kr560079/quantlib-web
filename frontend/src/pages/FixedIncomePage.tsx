import { useState } from 'react'
import BondForm from '../components/BondForm'
import BondResult from '../components/BondResult'
import BondSensitivityChart from '../components/BondSensitivityChart'
import SwapForm from '../components/SwapForm'
import SwapResult from '../components/SwapResult'
import TIPSForm from '../components/TIPSForm'
import TIPSResult from '../components/TIPSResult'
import { usePriceBond, usePriceZCB, usePriceSwap, usePriceTIPS } from '../hooks/useFixedIncome'
import { priceBondScenarios } from '../api/fixedIncomeClient'
import type {
  BondRequest, BondResponse, BondScenarioPoint,
  ZeroCouponBondRequest, ZeroCouponBondResponse,
  SwapRequest, SwapResponse,
  TIPSRequest, TIPSResponse,
} from '../types/fixedIncome'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type Tab = 'bond' | 'zcb' | 'swap' | 'tips'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'bond', label: 'Coupon Bond' },
  { id: 'zcb',  label: 'Zero-Coupon Bond' },
  { id: 'swap', label: 'Interest Rate Swap' },
  { id: 'tips', label: 'TIPS' },
]

export default function FixedIncomePage() {
  const [tab, setTab] = useState<Tab>('bond')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fixed Income</h1>
        <p className="text-sm text-gray-500 mt-1">
          Coupon bonds, zero-coupon bonds, swaps &amp; TIPS via QuantLib
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bond' && <BondTab />}
      {tab === 'zcb'  && <ZCBTab />}
      {tab === 'swap' && <SwapTab />}
      {tab === 'tips' && <TIPSTab />}
    </div>
  )
}

function BondTab() {
  const { mutateAsync: priceBond, isPending } = usePriceBond()
  const [result, setResult] = useState<BondResponse | null>(null)
  const [scenarios, setScenarios] = useState<BondScenarioPoint[]>([])
  const [currentRate, setCurrentRate] = useState(0.05)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(req: BondRequest) {
    setError(null)
    setCurrentRate(req.discount_rate)
    try {
      const r = await priceBond(req)
      setResult(r)
      const s = await priceBondScenarios(req)
      setScenarios(s)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Pricing failed — check parameters and ensure backend is running.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <BondForm onSubmit={handleSubmit} isLoading={isPending} />
        </div>
        <div className="lg:col-span-2 space-y-5">
          {result ? (
            <>
              <BondResult result={result} />
              {scenarios.length > 0 && (
                <BondSensitivityChart scenarios={scenarios} currentRate={currentRate} />
              )}
            </>
          ) : (
            <EmptyState isPending={isPending} label='Fill in the parameters and click "Price Bond".' />
          )}
        </div>
      </div>
    </div>
  )
}

const zcbSchema = z.object({
  face_value: z.coerce.number().positive(),
  maturity_date: z.string().min(1, 'Required'),
  settlement_date: z.string().optional(),
  discount_rate: z.coerce.number().min(0).max(1),
})
type ZCBFormValues = z.infer<typeof zcbSchema>

const fiveYearsOut = new Date(Date.now() + 5 * 365 * 86_400_000).toISOString().slice(0, 10)

function ZCBTab() {
  const { mutateAsync: priceZCB, isPending } = usePriceZCB()
  const [result, setResult] = useState<ZeroCouponBondResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<ZCBFormValues>({
    resolver: zodResolver(zcbSchema),
    defaultValues: { face_value: 100, maturity_date: fiveYearsOut, discount_rate: 0.05 },
  })

  async function onSubmit(v: ZCBFormValues) {
    setError(null)
    try {
      const r = await priceZCB(v as ZeroCouponBondRequest)
      setResult(r)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Pricing failed — check parameters and ensure backend is running.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-800">ZCB Parameters</h2>
          <ZField label="Face Value" error={errors.face_value?.message}>
            <input type="number" step="0.01" {...register('face_value')} className="input" />
          </ZField>
          <ZField label="Maturity Date" error={errors.maturity_date?.message}>
            <input type="date" {...register('maturity_date')} className="input" />
          </ZField>
          <ZField label="Settlement Date (optional)" error={errors.settlement_date?.message}>
            <input type="date" {...register('settlement_date')} className="input" />
          </ZField>
          <ZField label="Discount Rate (continuous)" error={errors.discount_rate?.message}>
            <input type="number" step="0.001" placeholder="0.05" {...register('discount_rate')} className="input" />
          </ZField>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Pricing…' : 'Price ZCB'}
          </button>
        </form>

        <div className="lg:col-span-2">
          {result ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <p className="text-sm text-blue-600 font-medium mb-1">Price</p>
                <p className="text-4xl font-bold text-blue-700 font-mono tracking-tight">
                  {result.price.toFixed(4)}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="divide-y divide-gray-100">
                  <ZRow label="Continuous Yield" value={`${(result.yield_cont * 100).toFixed(4)}%`} />
                  <ZRow label="Duration (years)"  value={result.duration.toFixed(4)} />
                  <ZRow label="DV01"               value={`$${result.dv01.toFixed(4)}`} />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState isPending={isPending} label='Fill in the parameters and click "Price ZCB".' />
          )}
        </div>
      </div>
    </div>
  )
}

function SwapTab() {
  const { mutateAsync: priceSwap, isPending } = usePriceSwap()
  const [result, setResult] = useState<SwapResponse | null>(null)
  const [notional, setNotional] = useState(1_000_000)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(req: SwapRequest) {
    setError(null)
    setNotional(req.notional)
    try {
      const r = await priceSwap(req)
      setResult(r)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Pricing failed — check parameters and ensure backend is running.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <SwapForm onSubmit={handleSubmit} isLoading={isPending} />
        </div>
        <div className="lg:col-span-2">
          {result ? (
            <SwapResult result={result} notional={notional} />
          ) : (
            <EmptyState isPending={isPending} label='Fill in the parameters and click "Price Swap".' />
          )}
        </div>
      </div>
    </div>
  )
}

function TIPSTab() {
  const { mutateAsync: priceTIPS, isPending } = usePriceTIPS()
  const [result, setResult] = useState<TIPSResponse | null>(null)
  const [faceValue, setFaceValue] = useState(1000)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(req: TIPSRequest) {
    setError(null)
    setFaceValue(req.face_value)
    try {
      const r = await priceTIPS(req)
      setResult(r)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Pricing failed — check parameters and ensure backend is running.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <TIPSForm onSubmit={handleSubmit} isLoading={isPending} />
        </div>
        <div className="lg:col-span-2">
          {result ? (
            <TIPSResult result={result} faceValue={faceValue} />
          ) : (
            <EmptyState isPending={isPending} label='Fill in the parameters and click "Price TIPS".' />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ isPending, label }: { isPending: boolean; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
      <p className="text-gray-400 text-sm">{isPending ? 'Calculating…' : label}</p>
    </div>
  )
}

function ZField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  )
}

function ZRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-sm text-gray-600">{label}</p>
      <span className="font-mono text-sm font-semibold text-gray-800 tabular-nums">{value}</span>
    </div>
  )
}
