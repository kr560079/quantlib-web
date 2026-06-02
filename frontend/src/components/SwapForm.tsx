import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { SwapRequest } from '../types/fixedIncome'

const schema = z.object({
  notional: z.coerce.number().positive(),
  fixed_rate: z.coerce.number().min(0).max(1),
  floating_spread: z.coerce.number().min(-0.1).max(0.1),
  start_date: z.string().min(1, 'Required'),
  maturity_date: z.string().min(1, 'Required'),
  fixed_frequency: z.enum(['annual', 'semiannual', 'quarterly', 'monthly']),
  floating_frequency: z.enum(['annual', 'semiannual', 'quarterly', 'monthly']),
  discount_rate: z.coerce.number().min(0).max(1),
  forward_rate: z.coerce.number().min(0).max(1).optional(),
  day_count: z.enum(['act365', 'act360', '30/360']),
  payer: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const today = new Date().toISOString().slice(0, 10)
const fiveYearsOut = new Date(Date.now() + 5 * 365 * 86_400_000).toISOString().slice(0, 10)

const defaults: FormValues = {
  notional: 1_000_000,
  fixed_rate: 0.03,
  floating_spread: 0.00,
  start_date: today,
  maturity_date: fiveYearsOut,
  fixed_frequency: 'semiannual',
  floating_frequency: 'quarterly',
  discount_rate: 0.03,
  day_count: 'act360',
  payer: true,
}

interface Props {
  onSubmit: (req: SwapRequest) => void
  isLoading: boolean
}

export default function SwapForm({ onSubmit, isLoading }: Props) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v as SwapRequest))}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
    >
      <h2 className="text-base font-semibold text-gray-800">Swap Parameters</h2>

      <div>
        <label className="label">Position</label>
        <select {...register('payer', { setValueAs: (v) => v === 'true' })} className="input">
          <option value="true">Pay Fixed / Receive Float</option>
          <option value="false">Receive Fixed / Pay Float</option>
        </select>
      </div>

      <Field label="Notional" error={errors.notional?.message}>
        <input type="number" step="1000" {...register('notional')} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fixed Rate" error={errors.fixed_rate?.message}>
          <input type="number" step="0.001" placeholder="0.03" {...register('fixed_rate')} className="input" />
        </Field>
        <Field label="Floating Spread" error={errors.floating_spread?.message}>
          <input type="number" step="0.001" placeholder="0.00" {...register('floating_spread')} className="input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date" error={errors.start_date?.message}>
          <input type="date" {...register('start_date')} className="input" />
        </Field>
        <Field label="Maturity Date" error={errors.maturity_date?.message}>
          <input type="date" {...register('maturity_date')} className="input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Fixed Frequency</label>
          <select {...register('fixed_frequency')} className="input">
            <option value="semiannual">Semiannual</option>
            <option value="annual">Annual</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div>
          <label className="label">Float Frequency</label>
          <select {...register('floating_frequency')} className="input">
            <option value="quarterly">Quarterly</option>
            <option value="semiannual">Semiannual</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount Rate" error={errors.discount_rate?.message}>
          <input type="number" step="0.001" placeholder="0.03" {...register('discount_rate')} className="input" />
        </Field>
        <Field label="Forward Rate (opt.)" error={errors.forward_rate?.message}>
          <input type="number" step="0.001" placeholder="same as discount" {...register('forward_rate')} className="input" />
        </Field>
      </div>

      <div>
        <label className="label">Day Count</label>
        <select {...register('day_count')} className="input">
          <option value="act360">Act/360</option>
          <option value="act365">Act/365</option>
          <option value="30/360">30/360</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Pricing…' : 'Price Swap'}
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
