import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'


const API = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Small card that opens when hovering (or tapping) a player's username —
 * on the game scoreboard and in the waiting room:
 *  - player stats (rank, points, wins, matches);
 *  - REAL "Add friend" (POST /api/friends/request), hidden if you are
 *    already friends (GET /api/friends) or if the player is you;
 *  - "Report player" when it makes sense (inside the game), wired to the
 *    real server vote.
 *
 * REAL stats: on open, the card fetches them from GET /api/users/:username
 * (our public route); the sample values only appear without a session.
 */

type FriendState = 'unknown' | 'none' | 'friend' | 'sent'

/* Touch screen (mobile): a tap fires mouseenter AND click at the same
   time — the card used to open and close on the same tap. With real hover
   the mouse controls it; without hover, only the click opens/closes it. */
const canHover =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover)').matches
    : true

type Props = {
  username: string
  isSelf?: boolean
  onReport?: () => void
  /** Real stats when we have them (e.g. friends list); otherwise defaults to 0. */
  stats?: { rank?: number; points?: number; wins?: number; matches?: number }
  /** false = info only, no Add friend/Report (profile, requests). */
  showActions?: boolean
  /** With `to`, CLICKING the name navigates (like a normal link) and the card
      is hover-only — the behavior of the profile's friends list. */
  to?: string
  avatarUrl?: string | null
  children: React.ReactNode
}

function PlayerHoverCard({ username, isSelf = false, onReport, stats: realStats, showActions = true, to, avatarUrl, children }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [friendState, setFriendState] = useState<FriendState>('unknown')
  const [failed, setFailed] = useState(false)
  // Real stats from the server, fetched on the card's first open.
  const [fetched, setFetched] = useState<
    { rank: number; points: number; wins: number; matches: number } | null
  >(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  // Close with a small delay: gives the mouse time to move from the name to
  // the card (and the buttons) without it disappearing. Re-entering cancels it.
  const closeTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])
  const openCard = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const closeCard = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }

  // On touch there is no reliable mouseleave: tapping outside the card closes it.
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
        /* no session/network: the default values remain */
      })
    return () => {
      alive = false
    }
  }, [open, fetched, username])

  // Only on the first open: check whether they are already friends.
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

  // Priority: server (fetched) > real props > 0.
  const stats = {
    rank: fetched?.rank ?? realStats?.rank ?? 0,
    points: fetched?.points ?? realStats?.points ?? 0,
    wins: fetched?.wins ?? realStats?.wins ?? 0,
    matches: fetched?.matches ?? realStats?.matches ?? 0,
  }

  return (
    <span
      ref={rootRef}
      className="phc"
      onMouseEnter={canHover ? openCard : undefined}
      onMouseLeave={canHover ? closeCard : undefined}
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
            <span className="mini-avatar">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </span>
            {/* clicking the name opens the public profile (read-only) */}
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
