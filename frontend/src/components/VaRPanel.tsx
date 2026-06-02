import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParametricVaR, useHistoricalVaR, useMCVaR } from '../hooks/useRisk'
import MCDistributionChart from './MCDistributionChart'
import type { VaRResponse, MCVaRResponse } from '../types/risk'

type Method = 'parametric' | 'historical' | 'mc'

const baseSchema = {
  position_value: z.coerce.number().positive(),
  confidence_level: z.coerce.number().min(0.5).max(0.9999),
  holding_period_days: z.coerce.number().int().min(1).max(250),
}

const parametricSchema = z.object({
  ...baseSchema,
  volatility: z.coerce.number().positive().max(5),
})

const historicalSchema = z.object({
  ...baseSchema,
  returns_raw: z.string().min(1, 'Paste comma-separated daily returns'),
})

const mcSchema = z.object({
  ...baseSchema,
  volatility: z.coerce.number().positive().max(5),
  drift: z.coerce.number(),
  simulations: z.coerce.number().int().min(1000).max(100_000),
})

function VaRResultCard({ result }: { result: VaRResponse }) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-red-600 mb-1">
              {(result.confidence_level * 100).toFixed(0)}% VaR · {result.holding_period_days}d
            </p>
            <p className="text-4xl font-bold text-red-700 font-mono tracking-tight">
              ${Math.abs(result.var).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-red-500 mt-1">{(result.var_pct * 100).toFixed(3)}% of position</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Expected Shortfall</p>
            <p className="text-lg font-semibold text-orange-600 font-mono">
              ${Math.abs(result.expected_shortfall).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-orange-400">{(result.es_pct * 100).toFixed(3)}%</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">{result.method.replace('_', ' ')}</span>
          <span>{result.holding_period_days}-day holding period</span>
          <span>{(result.confidence_level * 100).toFixed(0)}% confidence</span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  )
}

function ParametricTab() {
  const { mutateAsync, isPending } = useParametricVaR()
  const [result, setResult] = useState<VaRResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(parametricSchema),
    defaultValues: { position_value: 100_000, volatility: 0.20, confidence_level: 0.95, holding_period_days: 1 },
  })

  async function onSubmit(v: z.infer<typeof parametricSchema>) {
    setError(null)
    try { setResult(await mutateAsync(v)) }
    catch { setError('Calculation failed — check parameters and backend.') }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Field label="Position Value ($)" error={errors.position_value?.message}>
          <input type="number" step="1000" {...register('position_value')} className="input" />
        </Field>
        <Field label="Annualized Volatility" error={errors.volatility?.message}>
          <input type="number" step="0.01" placeholder="0.20" {...register('volatility')} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Confidence" error={errors.confidence_level?.message}>
            <select {...register('confidence_level')} className="input">
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
              <option value={0.999}>99.9%</option>
            </select>
          </Field>
          <Field label="Horizon (days)" error={errors.holding_period_days?.message}>
            <input type="number" step="1" {...register('holding_period_days')} className="input" />
          </Field>
        </div>
        <SubmitBtn pending={isPending} label="Calculate VaR" />
      </form>
      <div className="lg:col-span-2">
        {error && <ErrorBanner msg={error} />}
        {result ? <VaRResultCard result={result} /> : <Empty pending={isPending} />}
      </div>
    </div>
  )
}

function HistoricalTab() {
  const { mutateAsync, isPending } = useHistoricalVaR()
  const [result, setResult] = useState<VaRResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(historicalSchema),
    defaultValues: { position_value: 100_000, confidence_level: 0.95, holding_period_days: 1, returns_raw: '' },
  })

  async function onSubmit(v: z.infer<typeof historicalSchema>) {
    setError(null)
    const returns = v.returns_raw.split(/[\s,]+/).map(Number).filter((x) => !isNaN(x))
    if (returns.length < 30) { setError('Need at least 30 return observations.'); return }
    try {
      setResult(await mutateAsync({ returns, position_value: v.position_value, confidence_level: v.confidence_level, holding_period_days: v.holding_period_days }))
    } catch { setError('Calculation failed.') }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Field label="Position Value ($)" error={errors.position_value?.message}>
          <input type="number" step="1000" {...register('position_value')} className="input" />
        </Field>
        <Field label="Historical Daily Returns"
               hint="Paste comma-separated values, e.g. -0.012, 0.008, 0.003 …"
               error={errors.returns_raw?.message}>
          <textarea rows={5} {...register('returns_raw')} className="input font-mono text-xs resize-none" placeholder="-0.012, 0.008, 0.003, -0.021, 0.015 …" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Confidence" error={errors.confidence_level?.message}>
            <select {...register('confidence_level')} className="input">
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </Field>
          <Field label="Horizon (days)" error={errors.holding_period_days?.message}>
            <input type="number" step="1" max="20" {...register('holding_period_days')} className="input" />
          </Field>
        </div>
        <SubmitBtn pending={isPending} label="Calculate VaR" />
      </form>
      <div className="lg:col-span-2">
        {error && <ErrorBanner msg={error} />}
        {result ? <VaRResultCard result={result} /> : <Empty pending={isPending} />}
      </div>
    </div>
  )
}

function MCTab() {
  const { mutateAsync, isPending } = useMCVaR()
  const [result, setResult] = useState<MCVaRResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(mcSchema),
    defaultValues: { position_value: 100_000, volatility: 0.20, drift: 0.0, confidence_level: 0.95, holding_period_days: 10, simulations: 10_000 },
  })

  async function onSubmit(v: z.infer<typeof mcSchema>) {
    setError(null)
    try { setResult(await mutateAsync(v)) }
    catch { setError('Calculation failed.') }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Field label="Position Value ($)" error={errors.position_value?.message}>
          <input type="number" step="1000" {...register('position_value')} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Annualized Vol" error={errors.volatility?.message}>
            <input type="number" step="0.01" placeholder="0.20" {...register('volatility')} className="input" />
          </Field>
          <Field label="Annualized Drift" error={errors.drift?.message}>
            <input type="number" step="0.01" placeholder="0.00" {...register('drift')} className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Confidence" error={errors.confidence_level?.message}>
            <select {...register('confidence_level')} className="input">
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </Field>
          <Field label="Horizon (days)" error={errors.holding_period_days?.message}>
            <input type="number" step="1" {...register('holding_period_days')} className="input" />
          </Field>
        </div>
        <Field label="Simulations" error={errors.simulations?.message}>
          <select {...register('simulations')} className="input">
            <option value={5_000}>5,000</option>
            <option value={10_000}>10,000</option>
            <option value={50_000}>50,000</option>
            <option value={100_000}>100,000</option>
          </select>
        </Field>
        <SubmitBtn pending={isPending} label="Run Simulation" />
      </form>
      <div className="lg:col-span-2 space-y-4">
        {error && <ErrorBanner msg={error} />}
        {result ? (
          <>
            <VaRResultCard result={result} />
            <MCDistributionChart result={result} />
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Percentiles</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                {Object.entries(result.percentiles).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded p-1.5">
                    <p className="text-gray-400">{k.toUpperCase()}</p>
                    <p className="font-mono font-semibold text-gray-700">{(v * 100).toFixed(2)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : <Empty pending={isPending} />}
      </div>
    </div>
  )
}

const VAR_METHODS: Array<{ id: Method; label: string }> = [
  { id: 'parametric', label: 'Parametric (Normal)' },
  { id: 'historical', label: 'Historical Simulation' },
  { id: 'mc', label: 'Monte Carlo (GBM)' },
]

export default function VaRPanel() {
  const [method, setMethod] = useState<Method>('parametric')

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {VAR_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              method === m.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {method === 'parametric' && <ParametricTab />}
      {method === 'historical' && <HistoricalTab />}
      {method === 'mc'         && <MCTab />}
    </div>
  )
}

function SubmitBtn({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Calculating…' : label}
    </button>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{msg}</div>
}

function Empty({ pending }: { pending: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
      <p className="text-gray-400 text-sm">{pending ? 'Calculating…' : 'Fill in the parameters and submit.'}</p>
    </div>
  )
}
