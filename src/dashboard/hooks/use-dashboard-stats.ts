import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '@/shared/api/api-error'

interface DashboardStatsState<T> {
  stats: T | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

// `fetchStats` must be stable (a module-level function): a new one on every render would refetch.
export function useDashboardStats<T>(fetchStats: () => Promise<T>): DashboardStatsState<T> {
  const [stats, setStats] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setStats(await fetchStats())
    } catch (requestError: unknown) {
      setStats(null)
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar las estadísticas.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchStats])

  useEffect(() => {
    void load()
  }, [load])

  return { stats, isLoading, error, retry: () => void load() }
}
