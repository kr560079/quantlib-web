import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { BondRequest } from '../types/fixedIncome'

const schema = z.object({
  face_value: z.coerce.number().positive(),
  coupon_rate: z.coerce.number().min(0).max(1),
  frequency: z.enum(['annual', 'semiannual', 'quarterly', 'monthly']),
  maturity_date: z.string().min(1, 'Required'),
  settlement_date: z.string().optional(),
  issue_date: z.string().optional(),
  discount_rate: z.coerce.number().min(0).max(1),
  spread: z.coerce.number().min(0).max(1),
  day_count: z.enum(['act365', 'act360', '30/360']),
})

type FormValues = z.infer<typeof schema>

const fiveYearsOut = new Date(Date.now() + 5 * 365 * 86_400_000).toISOString().slice(0, 10)

const defaults: FormValues = {
  face_value: 100,
  coupon_rate: 0.05,
  frequency: 'semiannual',
  maturity_date: fiveYearsOut,
  discount_rate: 0.05,
  spread: 0.00,
  day_count: 'act365',
}

interface Props {
  onSubmit: (req: BondRequest) => void
  isLoading: boolean
}

export default function BondForm({ onSubmit, isLoading }: Props) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v as BondRequest))}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
    >
      <h2 className="text-base font-semibold text-gray-800">Bond Parameters</h2>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Face Value" error={errors.face_value?.message}>
          <input type="number" step="0.01" {...register('face_value')} className="input" />
        </Field>
        <Field label="Coupon Rate" error={errors.coupon_rate?.message}>
          <input type="number" step="0.001" placeholder="0.05" {...register('coupon_rate')} className="input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Frequency</label>
          <select {...register('frequency')} className="input">
            <option value="semiannual">Semiannual</option>
            <option value="annual">Annual</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="label">Day Count</label>
          <select {...register('day_count')} className="input">
            <option value="act365">Act/365</option>
            <option value="act360">Act/360</option>
            <option value="30/360">30/360</option>
          </select>
        </div>
      </div>

      <Field label="Maturity Date" error={errors.maturity_date?.message}>
        <input type="date" {...register('maturity_date')} className="input" />
      </Field>

      <Field label="Settlement Date (optional)" error={errors.settlement_date?.message}>
        <input type="date" {...register('settlement_date')} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount Rate" error={errors.discount_rate?.message}>
          <input type="number" step="0.001" placeholder="0.05" {...register('discount_rate')} className="input" />
        </Field>
        <Field label="Credit Spread" error={errors.spread?.message}>
          <input type="number" step="0.001" placeholder="0.00" {...register('spread')} className="input" />
        </Field>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Pricing…' : 'Price Bond'}
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
