import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TIPSRequest } from '../types/fixedIncome'

const schema = z.object({
  face_value: z.coerce.number().positive(),
  real_coupon_rate: z.coerce.number().min(0).max(1),
  maturity_date: z.string().min(1, 'Required'),
  settlement_date: z.string().optional(),
  issue_date: z.string().optional(),
  base_cpi: z.coerce.number().positive(),
  current_cpi: z.coerce.number().positive(),
  annual_inflation_rate: z.coerce.number().min(0).max(1),
  real_discount_rate: z.coerce.number().min(-0.1).max(1),
})

type FormValues = z.infer<typeof schema>

const tenYearsOut = new Date(Date.now() + 10 * 365 * 86_400_000).toISOString().slice(0, 10)

const defaults: FormValues = {
  face_value: 1000,
  real_coupon_rate: 0.00625,
  maturity_date: tenYearsOut,
  base_cpi: 284.77,
  current_cpi: 310.50,
  annual_inflation_rate: 0.025,
  real_discount_rate: 0.02,
}

interface Props {
  onSubmit: (req: TIPSRequest) => void
  isLoading: boolean
}

export default function TIPSForm({ onSubmit, isLoading }: Props) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v as TIPSRequest))}
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
    >
      <h2 className="text-base font-semibold text-gray-800">TIPS Parameters</h2>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Face Value ($)" error={errors.face_value?.message}>
          <input type="number" step="0.01" {...register('face_value')} className="input" />
        </Field>
        <Field label="Real Coupon Rate" error={errors.real_coupon_rate?.message}>
          <input type="number" step="0.0001" placeholder="0.00625" {...register('real_coupon_rate')} className="input" />
        </Field>
      </div>

      <Field label="Maturity Date" error={errors.maturity_date?.message}>
        <input type="date" {...register('maturity_date')} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Settlement Date (opt.)" error={errors.settlement_date?.message}>
          <input type="date" {...register('settlement_date')} className="input" />
        </Field>
        <Field label="Issue Date (opt.)" error={errors.issue_date?.message}>
          <input type="date" {...register('issue_date')} className="input" />
        </Field>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Inflation Inputs</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base CPI (at issue)" error={errors.base_cpi?.message}>
            <input type="number" step="0.01" placeholder="284.77" {...register('base_cpi')} className="input" />
          </Field>
          <Field label="Current CPI" error={errors.current_cpi?.message}>
            <input type="number" step="0.01" placeholder="310.50" {...register('current_cpi')} className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Fwd Inflation Rate" error={errors.annual_inflation_rate?.message}>
            <input type="number" step="0.001" placeholder="0.025" {...register('annual_inflation_rate')} className="input" />
          </Field>
          <Field label="Real Discount Rate" error={errors.real_discount_rate?.message}>
            <input type="number" step="0.001" placeholder="0.02" {...register('real_discount_rate')} className="input" />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Pricing…' : 'Price TIPS'}
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
