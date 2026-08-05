import { useTranslation } from 'react-i18next'

type Message = { author: string; text: string }

const players = [
  { name: 'demo_user', points: 120, isDrawing: true },
  { name: 'renan', points: 250, isDrawing: false },
  { name: 'pedro', points: 180, isDrawing: false },
]

const exampleMessages: Message[] = [
  { author: 'renan', text: 'good luck!' },
  { author: 'pedro', text: 'is it an animal?' },
]

function Game() {
  const { t } = useTranslation()

  return (
    <main className="page">
      <div className="status-bar">
        <span className="player-row">
          <span className="avatar avatar-small">U</span>
          demo_user — 120 pts
        </span>
        <span>{t('game.round', { current: 1, total: 3 })}</span>
        <span>{t('game.word', { hint: '_ _ _ _ _' })}</span>
        <span>{t('game.time', { seconds: 80 })}</span>
      </div>

      <div className="game-area">
        <aside className="panel scoreboard-panel">
          <h2>{t('game.scoreboard')}</h2>
          <ul className="simple-list">
            {players.map((player) => (
              <li key={player.name}>
                <span className="player-row">
                  <span className="avatar avatar-small">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                  {player.name}
                  {player.isDrawing && ` ${t('game.drawing')}`}
                </span>
                <span>{player.points}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="panel canvas-panel">
          {/* Drawing canvas — Sprint 3 */}
          <canvas width={400} height={400} aria-label={t('game.canvas')} />
          <div className="submit-row">
            <input placeholder={t('game.guessPlaceholder')} />
            <button type="button">{t('game.submitGuess')}</button>
          </div>
        </section>

        <aside className="panel chat">
          <h2>{t('game.chat')}</h2>
          <div className="chat-messages">
            {exampleMessages.map((msg, i) => (
              <p key={i}>
                <strong>{msg.author}:</strong> {msg.text}
              </p>
            ))}
          </div>
          <div className="submit-row">
            <input placeholder={t('game.messagePlaceholder')} />
            <button type="button">{t('game.sendMessage')}</button>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default Game
