import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { OptionPriceRequest } from '../types/options'

const schema = z.object({
  option_type: z.enum(['european', 'american']),
  call_put: z.enum(['call', 'put']),
  spot: z.coerce.number().positive('Must be positive'),
  strike: z.coerce.number().positive('Must be positive'),
  maturity_date: z.string().min(1, 'Required'),
  risk_free_rate: z.coerce.number().min(0).max(1),
  dividend_yield: z.coerce.number().min(0).max(1),
  volatility: z.coerce.number().positive().max(10),
  engine: z.enum(['black-scholes', 'heston', 'binomial', 'baw', 'mc']),
  binomial_steps: z.coerce.number().int().min(50).max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

const oneYearFromNow = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)

const defaults: FormValues = {
  option_type: 'european',
  call_put: 'call',
  spot: 100,
  strike: 100,
  maturity_date: oneYearFromNow,
  risk_free_rate: 0.05,
  dividend_yield: 0.00,
  volatility: 0.20,
  engine: 'black-scholes',
  binomial_steps: 200,
}

interface Props {
  onSubmit: (req: OptionPriceRequest) => void
  isLoading: boolean
}

export default function OptionForm({ onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  const engine = watch('engine')
  const optionType = watch('option_type')

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v as OptionPriceRequest))}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

      <h2 className="text-base font-semibold text-gray-800">Option Parameters</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Exercise</label>
          <select {...register('option_type')} className="input">
            <option value="european">European</option>
            <option value="american">American</option>
          </select>
        </div>
        <div>
          <label className="label">Call / Put</label>
          <select {...register('call_put')} className="input">
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Spot (S)" error={errors.spot?.message}>
          <input type="number" step="0.01" {...register('spot')} className="input" />
        </Field>
        <Field label="Strike (K)" error={errors.strike?.message}>
          <input type="number" step="0.01" {...register('strike')} className="input" />
        </Field>
      </div>

      <Field label="Maturity Date" error={errors.maturity_date?.message}>
        <input type="date" {...register('maturity_date')} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Risk-Free Rate" error={errors.risk_free_rate?.message}>
          <input type="number" step="0.001" placeholder="0.05" {...register('risk_free_rate')} className="input" />
        </Field>
        <Field label="Volatility (σ)" error={errors.volatility?.message}>
          <input type="number" step="0.01" placeholder="0.20" {...register('volatility')} className="input" />
        </Field>
      </div>

      <Field label="Dividend Yield" error={errors.dividend_yield?.message}>
        <input type="number" step="0.001" placeholder="0.00" {...register('dividend_yield')} className="input" />
      </Field>

      <div>
        <label className="label">Pricing Engine</label>
        <select {...register('engine')} className="input">
          {optionType === 'european' && <option value="black-scholes">Black-Scholes (Analytic)</option>}
          {optionType === 'european' && <option value="heston">Heston (Stochastic Vol)</option>}
          <option value="binomial">Binomial CRR Tree</option>
          {optionType === 'american' && <option value="baw">Barone-Adesi-Whaley</option>}
          <option value="mc">Monte Carlo</option>
        </select>
      </div>

      {engine === 'binomial' && (
        <Field label="Tree Steps" error={errors.binomial_steps?.message}>
          <input type="number" step="1" {...register('binomial_steps')} className="input" />
        </Field>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Pricing…' : 'Price Option'}
      </button>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  )
}
