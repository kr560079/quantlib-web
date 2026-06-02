import { useMutation, useQuery } from '@tanstack/react-query'
import { priceOption, getPricingHistory } from '../api/equityClient'

export function usePriceOption() {
  return useMutation({ mutationFn: priceOption })
}

export function usePricingHistory(enabled = true) {
  return useQuery({
    queryKey: ['pricingHistory'],
    queryFn: () => getPricingHistory(),
    enabled,
  })
}
