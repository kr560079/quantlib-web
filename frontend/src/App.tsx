import { useState } from 'react'
import OptionsPage from './pages/OptionsPage'
import FixedIncomePage from './pages/FixedIncomePage'
import RiskPage from './pages/RiskPage'
import YieldCurvePage from './pages/YieldCurvePage'

type Page = 'options' | 'fixed-income' | 'yield-curves' | 'risk'

export default function App() {
  const [page, setPage] = useState<Page>('options')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-xl font-bold text-blue-700">QuantLib Web</span>
          <span className="text-gray-300">|</span>
          <nav className="flex gap-1">
            <NavBtn active={page === 'options'}       onClick={() => setPage('options')}>Options Pricing</NavBtn>
            <NavBtn active={page === 'fixed-income'}  onClick={() => setPage('fixed-income')}>Fixed Income</NavBtn>
            <NavBtn active={page === 'yield-curves'}  onClick={() => setPage('yield-curves')}>Yield Curves</NavBtn>
            <NavBtn active={page === 'risk'}          onClick={() => setPage('risk')}>Risk</NavBtn>
          </nav>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {page === 'options'      && <OptionsPage />}
        {page === 'fixed-income' && <FixedIncomePage />}
        {page === 'yield-curves' && <YieldCurvePage />}
        {page === 'risk'         && <RiskPage />}
      </main>
    </div>
  )
}

function NavBtn({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-50 text-blue-600 font-medium'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
