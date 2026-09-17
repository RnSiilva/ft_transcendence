// Valores de exemplo estáveis por username (o mesmo nome dá sempre os
// mesmos números), usados no cartão de jogador e no perfil público até
// existir o endpoint real de stats no servidor.
// AQUI O CODIGO DO SERVIDOR (GET /api/users/:username com rank, pontos,
// vitórias e partidas reais substitui isto)
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
