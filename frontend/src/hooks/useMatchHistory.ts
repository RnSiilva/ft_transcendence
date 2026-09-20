import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL ?? '/api'

export type PlayedGame = {
  points: number
  won: boolean
  position: number
  players: number
  roomCode: string
  finishedAt: string
  theme: string
  language: string
  rounds: number
  opponents: {
    id: number
    username: string
    avatarUrl: string | null
    points: number
    won: boolean
  }[]
}

/** The games the signed in player has finished, newest first. */
export function useMatchHistory() {
  const [games, setGames] = useState<PlayedGame[]>([])

  useEffect(() => {
    let live = true

    fetch(`${API}/games/history`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { games: [] }))
      .then((data) => { if (live) setGames(data.games ?? []) })
      .catch(() => { if (live) setGames([]) })

    return () => { live = false }
  }, [])

  return games
}
