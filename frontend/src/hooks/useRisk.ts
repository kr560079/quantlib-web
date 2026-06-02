import { useMutation } from '@tanstack/react-query'
import {
  calcParametricVaR, calcHistoricalVaR, calcMCVaR,
  calcPortfolioVaR, calcGreeksPnL, calcOptionStress,
} from '../api/riskClient'

export const useParametricVaR  = () => useMutation({ mutationFn: calcParametricVaR })
export const useHistoricalVaR  = () => useMutation({ mutationFn: calcHistoricalVaR })
export const useMCVaR          = () => useMutation({ mutationFn: calcMCVaR })
export const usePortfolioVaR   = () => useMutation({ mutationFn: calcPortfolioVaR })
export const useGreeksPnL      = () => useMutation({ mutationFn: calcGreeksPnL })
export const useOptionStress   = () => useMutation({ mutationFn: calcOptionStress })
