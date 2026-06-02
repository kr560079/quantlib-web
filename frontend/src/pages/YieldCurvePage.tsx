import { useState } from 'react'
import { useBootstrapCurve, useFitCurve } from '../hooks/useFixedIncome'
import YieldCurveChart from '../components/YieldCurveChart'
import type {
  BootstrapResponse, CurveFitResponse,
  DepositRate, SwapRate, FitBond,
  CurveInterpolation, CurveFitMethod, Frequency,
} from '../types/fixedIncome'

type Tab = 'bootstrap' | 'fit'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'bootstrap', label: 'Bootstrap' },
  { id: 'fit',       label: 'Parametric Fit' },
]

export default function YieldCurvePage() {
  const [tab, setTab] = useState<Tab>('bootstrap')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yield Curves</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bootstrap from market rates or fit parametric models to bond prices
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

      {tab === 'bootstrap' && <BootstrapTab />}
      {tab === 'fit'       && <FitTab />}
    </div>
  )
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const DEFAULT_DEPOSITS: DepositRate[] = [
  { term: '1M', rate: 0.0315 },
  { term: '3M', rate: 0.0320 },
  { term: '6M', rate: 0.0325 },
]

const DEFAULT_SWAPS: SwapRate[] = [
  { term: '1Y',  rate: 0.0310 },
  { term: '2Y',  rate: 0.0300 },
  { term: '3Y',  rate: 0.0295 },
  { term: '5Y',  rate: 0.0290 },
  { term: '7Y',  rate: 0.0288 },
  { term: '10Y', rate: 0.0285 },
  { term: '20Y', rate: 0.0280 },
  { term: '30Y', rate: 0.0275 },
]

function BootstrapTab() {
  const { mutateAsync: bootstrap, isPending } = useBootstrapCurve()
  const [deposits, setDeposits] = useState<DepositRate[]>(DEFAULT_DEPOSITS)
  const [swaps, setSwaps] = useState<SwapRate[]>(DEFAULT_SWAPS)
  const [interpolation, setInterpolation] = useState<CurveInterpolation>('LogLinear')
  const [result, setResult] = useState<BootstrapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuild() {
    setError(null)
    try {
      const r = await bootstrap({ deposits, swaps, interpolation })
      setResult(r)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Bootstrap failed — check inputs and ensure backend is running.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="space-y-4">
        {/* Interpolation */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Settings</h3>
          <label className="label">Interpolation</label>
          <select
            value={interpolation}
            onChange={(e) => setInterpolation(e.target.value as CurveInterpolation)}
            className="input"
          >
            <option value="LogLinear">Log-Linear (Discount Factor)</option>
            <option value="Linear">Linear (Zero Rate)</option>
            <option value="CubicSpline">Cubic Spline (Zero Rate)</option>
          </select>
        </div>

        {/* Deposits */}
        <RateTable
          title="Deposit Rates"
          rows={deposits}
          termPlaceholder="3M"
          onChange={setDeposits}
        />

        {/* Swaps */}
        <RateTable
          title="Swap Rates (6M Euribor float)"
          rows={swaps}
          termPlaceholder="5Y"
          onChange={setSwaps}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          onClick={handleBuild}
          disabled={isPending}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Building…' : 'Build Curve'}
        </button>
      </div>

      <div className="lg:col-span-2">
        {result ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Reference date: <span className="font-mono font-medium">{result.reference_date}</span>
              {' · '}Interpolation: <span className="font-mono font-medium">{result.interpolation}</span>
            </p>
            <YieldCurveChart points={result.points} title="Bootstrapped Yield Curve" />
          </div>
        ) : (
          <EmptyState isPending={isPending} label='Edit the rates and click "Build Curve".' />
        )}
      </div>
    </div>
  )
}

// ── Parametric Fit ─────────────────────────────────────────────────────────────

const DEFAULT_BONDS: FitBond[] = [
  { maturity_date: yearOut(1),  coupon_rate: 0.03,  price: 100.0, frequency: 'semiannual' },
  { maturity_date: yearOut(2),  coupon_rate: 0.03,  price: 99.8,  frequency: 'semiannual' },
  { maturity_date: yearOut(3),  coupon_rate: 0.035, price: 100.2, frequency: 'semiannual' },
  { maturity_date: yearOut(5),  coupon_rate: 0.04,  price: 100.5, frequency: 'semiannual' },
  { maturity_date: yearOut(7),  coupon_rate: 0.04,  price: 100.1, frequency: 'semiannual' },
  { maturity_date: yearOut(10), coupon_rate: 0.045, price: 100.8, frequency: 'semiannual' },
  { maturity_date: yearOut(20), coupon_rate: 0.05,  price: 101.0, frequency: 'semiannual' },
  { maturity_date: yearOut(30), coupon_rate: 0.05,  price: 100.5, frequency: 'semiannual' },
]

function yearOut(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + n)
  return d.toISOString().slice(0, 10)
}

const METHOD_LABELS: Record<CurveFitMethod, string> = {
  NelsonSiegel:       'Nelson-Siegel (4 params)',
  Svensson:           'Svensson (6 params)',
  ExponentialSplines: 'Exponential Splines',
  CubicBSplines:      'Cubic B-Splines',
  SimplePolynomial:   'Simple Polynomial (deg 3)',
}

const NS_PARAM_LABELS = ['β₀ (level)', 'β₁ (slope)', 'β₂ (curvature)', 'τ (decay)']
const SV_PARAM_LABELS = ['β₀', 'β₁', 'β₂', 'β₃', 'τ₁', 'τ₂']

function FitTab() {
  const { mutateAsync: fitCurve, isPending } = useFitCurve()
  const [bonds, setBonds] = useState<FitBond[]>(DEFAULT_BONDS)
  const [method, setMethod] = useState<CurveFitMethod>('NelsonSiegel')
  const [result, setResult] = useState<CurveFitResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFit() {
    setError(null)
    try {
      const r = await fitCurve({ bonds, method })
      setResult(r)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Curve fit failed — check bond inputs.')
    }
  }

  function updateBond(i: number, field: keyof FitBond, value: string | number) {
    setBonds((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b))
  }

  function addBond() {
    setBonds((prev) => [...prev, { maturity_date: yearOut(15), coupon_rate: 0.04, price: 100.0, frequency: 'semiannual' }])
  }

  function removeBond(i: number) {
    setBonds((prev) => prev.filter((_, idx) => idx !== i))
  }

  const paramLabels = method === 'NelsonSiegel' ? NS_PARAM_LABELS
    : method === 'Svensson' ? SV_PARAM_LABELS
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="space-y-4">
        {/* Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Fitting Method</h3>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as CurveFitMethod)}
            className="input"
          >
            {(Object.entries(METHOD_LABELS) as [CurveFitMethod, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Bonds table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Bond Portfolio</h3>
            <button onClick={addBond} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
          </div>
          <div className="space-y-2">
            {bonds.map((b, i) => (
              <div key={i} className="grid grid-cols-4 gap-1 text-xs items-center">
                <input
                  type="date"
                  value={b.maturity_date}
                  onChange={(e) => updateBond(i, 'maturity_date', e.target.value)}
                  className="input text-xs py-1 col-span-2"
                />
                <input
                  type="number" step="0.001" placeholder="Cpn"
                  value={b.coupon_rate}
                  onChange={(e) => updateBond(i, 'coupon_rate', parseFloat(e.target.value))}
                  className="input text-xs py-1"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.01" placeholder="Px"
                    value={b.price}
                    onChange={(e) => updateBond(i, 'price', parseFloat(e.target.value))}
                    className="input text-xs py-1 flex-1"
                  />
                  <button onClick={() => removeBond(i)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Maturity · Coupon (dec) · Price (%)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          onClick={handleFit}
          disabled={isPending}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Fitting…' : 'Fit Curve'}
        </button>
      </div>

      <div className="lg:col-span-2">
        {result ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Reference date: <span className="font-mono font-medium">{result.reference_date}</span>
              {' · '}Method: <span className="font-mono font-medium">{result.method}</span>
              {' · '}Iterations: <span className="font-mono font-medium">{result.iterations}</span>
            </p>

            {/* Fitted parameters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Fitted Parameters</h3>
              <div className="flex flex-wrap gap-3">
                {result.parameters.map((v, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
                    <p className="text-xs text-gray-500 mb-0.5">
                      {paramLabels?.[i] ?? `c${i}`}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-800">{v.toFixed(5)}</p>
                  </div>
                ))}
              </div>
            </div>

            <YieldCurveChart points={result.points} title={`${result.method} Fitted Curve`} />
          </div>
        ) : (
          <EmptyState isPending={isPending} label='Configure bonds above and click "Fit Curve".' />
        )}
      </div>
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

interface RateRow { term: string; rate: number }

function RateTable({
  title, rows, termPlaceholder, onChange,
}: {
  title: string
  rows: RateRow[]
  termPlaceholder: string
  onChange: (rows: RateRow[]) => void
}) {
  function update(i: number, field: keyof RateRow, value: string | number) {
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  function add() { onChange([...rows, { term: termPlaceholder, rate: 0.03 }]) }
  function remove(i: number) { onChange(rows.filter((_, idx) => idx !== i)) }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button onClick={add} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text" placeholder="3M"
            value={r.term}
            onChange={(e) => update(i, 'term', e.target.value)}
            className="input text-xs py-1 w-16"
          />
          <input
            type="number" step="0.0001" placeholder="0.03"
            value={r.rate}
            onChange={(e) => update(i, 'rate', parseFloat(e.target.value))}
            className="input text-xs py-1 flex-1"
          />
          <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
        </div>
      ))}
      {rows.length === 0 && <p className="text-xs text-gray-400">No rates — click + Add</p>}
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
