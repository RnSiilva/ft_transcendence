import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL ?? '/api'

export type RankPeriod = 'general' | 'weekly' | 'daily'

export type LeaderboardEntry = {
  rank: number
  userId: number
  username: string
  avatarUrl: string | null
  points: number
  games: number
}

/** "general" means all time, which the API expresses by asking for no period. */
export function useLeaderboard(period: RankPeriod) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    let live = true
    const query = period === 'general' ? '' : `?period=${period}`

    fetch(`${API}/games/leaderboard${query}`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => { if (live) setEntries(data.entries ?? []) })
      .catch(() => { if (live) setEntries([]) })

    // Switching tabs quickly must not let an older answer win.
    return () => { live = false }
  }, [period])

  return entries
}
