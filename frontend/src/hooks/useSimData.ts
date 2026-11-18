import useSWR from 'swr'


export interface SimData {
  meta?: any
  towns?: any[]
  agents?: any[]
  prices?: any[]
  ledger?: any[]
  decisions?: any[]
}

export interface RunInfo {
  run_id: number
  name?: string
  turns?: number
  created_at?: string
}

function buildSimData(results: any[], keys: string[]): SimData {
  const out: any = {}
  keys.forEach((k, i) => { out[k] = results[i] })
  return out
}

export function useSimData(runId: number) {
  const baseUrl = 'http://localhost:3001'
  const endpoints = [
    `/api/meta?run_id=${runId}`,
    `/api/towns?run_id=${runId}`,
    `/api/agents?run_id=${runId}`,
    `/api/prices?run_id=${runId}`,
    `/api/ledger?run_id=${runId}`,
    `/api/decisions?run_id=${runId}`,
  ]

  const { data, error, isLoading } = useSWR(
    runId > 0 ? `sim-data-${runId}` : null,
    async () => {
      const results = await Promise.all(
        endpoints.map(ep =>
          fetch(baseUrl + ep)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      )
      return buildSimData(results, ['meta', 'towns', 'agents', 'prices', 'ledger', 'decisions'])
    },
    { refreshInterval: 5000, revalidateOnFocus: false }
  )

  return { data, isLoading, error, source: 'api' as const }
}

export function useRuns() {
  const { data, error, isLoading } = useSWR<RunInfo[]>(
    'runs-list',
    () => fetch('http://localhost:3001/api/runs').then(r => r.ok ? r.json() : []).catch(() => []),
    { refreshInterval: 10000 }
  )
  return { runs: data ?? [], isLoading, error }
}
