import { useMutation } from '@tanstack/react-query'
import { priceBond, priceZCB, priceSwap, priceTIPS, bootstrapCurve, fitCurve } from '../api/fixedIncomeClient'

export function usePriceBond() {
  return useMutation({ mutationFn: priceBond })
}

export function usePriceZCB() {
  return useMutation({ mutationFn: priceZCB })
}

export function usePriceSwap() {
  return useMutation({ mutationFn: priceSwap })
}

export function usePriceTIPS() {
  return useMutation({ mutationFn: priceTIPS })
}

export function useBootstrapCurve() {
  return useMutation({ mutationFn: bootstrapCurve })
}

export function useFitCurve() {
  return useMutation({ mutationFn: fitCurve })
}
