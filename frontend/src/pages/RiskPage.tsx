import { useState } from 'react'
import VaRPanel from '../components/VaRPanel'
import PortfolioVaRPanel from '../components/PortfolioVaRPanel'
import GreeksPnLPanel from '../components/GreeksPnLPanel'
import StressTestPanel from '../components/StressTestPanel'

type Tab = 'var' | 'portfolio' | 'greeks' | 'stress'

const TABS: Array<{ id: Tab; label: string; description: string }> = [
  { id: 'var',       label: 'Value at Risk',      description: 'Parametric · Historical · Monte Carlo' },
  { id: 'portfolio', label: 'Portfolio VaR',       description: 'Variance-covariance, diversification benefit' },
  { id: 'greeks',    label: 'Greeks P&L',          description: 'Delta · Gamma · Vega · Theta · Rho attribution' },
  { id: 'stress',    label: 'Stress Test',         description: 'BSM reprice under shock scenarios' },
]

export default function RiskPage() {
  const [tab, setTab] = useState<Tab>('var')
  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk</h1>
        <p className="text-sm text-gray-500 mt-1">{active.description}</p>
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

      {tab === 'var'       && <VaRPanel />}
      {tab === 'portfolio' && <PortfolioVaRPanel />}
      {tab === 'greeks'    && <GreeksPnLPanel />}
      {tab === 'stress'    && <StressTestPanel />}
    </div>
  )
}
