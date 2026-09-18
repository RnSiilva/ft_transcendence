// Stable example values per username (the same name always yields the same
// numbers), used as a fallback in the player card and public profile.
export function demoStats(username: string) {
  let seed = 0
  for (const ch of username) seed = (seed * 31 + ch.charCodeAt(0)) % 997
  const matches = 6 + (seed % 40)
  const wins = Math.max(1, Math.floor((matches * ((seed % 45) + 15)) / 100))
  return {
    rank: 3 + (seed % 60),
    points: 120 + seed,
    wins,
    matches,
  }
}
