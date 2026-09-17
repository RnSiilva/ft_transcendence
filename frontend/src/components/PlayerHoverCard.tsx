import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { demoStats } from '../utils/demoStats'

const API = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Cartãozinho que abre ao pousar o rato (ou tocar) no username de um
 * jogador — no placar do jogo e na sala de espera:
 *  - stats do jogador (rank, pontos, vitórias, partidas);
 *  - "Adicionar amigo" REAL (POST /api/friends/request), escondido se já
 *    forem amigos (GET /api/friends) ou se o jogador fores tu;
 *  - "Reportar jogador" quando faz sentido (dentro do jogo), ligado à
 *    votação real do servidor.
 *
 * Stats REAIS: ao abrir, o cartão vai buscá-las a GET /api/users/:username
 * (rota pública nossa); os valores de exemplo só aparecem sem sessão.
 */

type FriendState = 'unknown' | 'none' | 'friend' | 'sent'

/* Ecrã tátil (telemóvel): um toque dispara mouseenter E click ao mesmo
   tempo — o cartão abria e fechava no mesmo toque. Com hover verdadeiro
   o rato manda; sem hover, só o clique abre/fecha. */
const canHover =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover)').matches
    : true

type Props = {
  username: string
  isSelf?: boolean
  onReport?: () => void
  /** Stats reais quando as temos (ex.: lista de amigos); o resto fica demo. */
  stats?: { rank?: number; points?: number; wins?: number; matches?: number }
  /** false = só informação, sem Adicionar amigo/Reportar (perfil, pedidos). */
  showActions?: boolean
  /** Com `to`, CLICAR no nome navega (como um link normal) e o cartão fica
      só para o hover — comportamento da lista de amigos do perfil. */
  to?: string
  children: React.ReactNode
}

function PlayerHoverCard({ username, isSelf = false, onReport, stats: realStats, showActions = true, to, children }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [friendState, setFriendState] = useState<FriendState>('unknown')
  const [failed, setFailed] = useState(false)
  // Stats reais do servidor, obtidas na primeira abertura do cartão.
  const [fetched, setFetched] = useState<
    { rank: number; points: number; wins: number; matches: number } | null
  >(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)

  // No tátil não há mouseleave de confiança: tocar fora do cartão fecha-o.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [open])

  useEffect(() => {
    if (!open || fetched) return
    let alive = true
    fetch(`${API}/users/${encodeURIComponent(username)}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive || !data?.user) return
        setFetched({
          rank: data.user.rank,
          points: data.user.totalPoints,
          wins: data.user.wins,
          matches: data.user.gamesPlayed,
        })
      })
      .catch(() => {
        /* sem sessão/rede: ficam os valores por defeito */
      })
    return () => {
      alive = false
    }
  }, [open, fetched, username])

  // Só ao abrir pela primeira vez: verificar se já são amigos.
  useEffect(() => {
    if (!open || isSelf || !showActions || friendState !== 'unknown') return
    let alive = true
    fetch(`${API}/friends`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return
        const entry = data?.friends?.find(
          (f: { username: string; status: string }) => f.username === username,
        )
        if (!entry) setFriendState('none')
        else if (entry.status === 'ACCEPTED') setFriendState('friend')
        else setFriendState('sent')
      })
      .catch(() => {
        if (alive) setFriendState('none')
      })
    return () => {
      alive = false
    }
  }, [open, isSelf, showActions, friendState, username])

  async function addFriend() {
    setFailed(false)
    try {
      const res = await fetch(`${API}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      })
      if (!res.ok) throw new Error()
      setFriendState('sent')
    } catch {
      setFailed(true)
    }
  }

  // Prioridade: servidor (fetched) > props reais > valores de exemplo.
  const demo = demoStats(username)
  const stats = {
    rank: fetched?.rank ?? realStats?.rank ?? demo.rank,
    points: fetched?.points ?? realStats?.points ?? demo.points,
    wins: fetched?.wins ?? realStats?.wins ?? demo.wins,
    matches: fetched?.matches ?? realStats?.matches ?? demo.matches,
  }

  return (
    <span
      ref={rootRef}
      className="phc"
      onMouseEnter={canHover ? () => setOpen(true) : undefined}
      onMouseLeave={canHover ? () => setOpen(false) : undefined}
    >
      {to ? (
        <Link to={to} className="phc-name friend-link">
          {children}
        </Link>
      ) : (
        <button
          type="button"
          className="phc-name"
          onClick={() => setOpen((o) => !o)}
        >
          {children}
        </button>
      )}

      {open && (
        <span className="phc-card">
          <span className="phc-head">
            <span className="mini-avatar">{username.charAt(0).toUpperCase()}</span>
            {/* clicar no nome abre o perfil público (só leitura) */}
            <b><Link to={`/user/${username}`} className="phc-link">{username}</Link></b>
          </span>
          <span className="phc-stats">
            <span><i>{t('profile.stats.rank')}</i><b>{stats.rank > 0 ? `#${stats.rank}` : '—'}</b></span>
            <span><i>{t('profile.stats.points')}</i><b>{stats.points}</b></span>
            <span><i>{t('profile.stats.wins')}</i><b>{stats.wins}</b></span>
            <span><i>{t('profile.stats.matches')}</i><b>{stats.matches}</b></span>
          </span>

          {!isSelf && showActions && (
            <span className="phc-actions">
              {friendState === 'friend' ? (
                <span className="phc-tag">✓ {t('card.friends')}</span>
              ) : friendState === 'sent' ? (
                <span className="phc-tag">{t('card.sent')}</span>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={addFriend}>
                  {t('card.addfriend')}
                </button>
              )}
              {onReport && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm phc-report"
                  onClick={() => {
                    setOpen(false)
                    onReport()
                  }}
                >
                  🚩 {t('card.report')}
                </button>
              )}
            </span>
          )}
          {failed && <span className="phc-error">{t('errors.networkError')}</span>}
        </span>
      )}
    </span>
  )
}

export default PlayerHoverCard
