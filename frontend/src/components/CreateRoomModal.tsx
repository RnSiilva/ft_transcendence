import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

type Props = {
  open: boolean
  onClose: () => void
  onCreate: () => void
}

function CreateRoomModal({ open, onClose, onCreate }: Props) {
  const { t } = useLanguage()
  const [players, setPlayers] = useState(6)
  const [isPrivate, setIsPrivate] = useState(false)

  function handleCreate() {
    // AQUI O CODIGO DO SERVIDOR (criar sala real: gerar código de convite,
    // room do Socket.IO, guardar configurações da sala)
    onClose()
    onCreate()
  }

  return (
    <div className={open ? 'modal-overlay show' : 'modal-overlay'}>
      <div className="modal-panel">
        <h2>{t('room.create.title')}</h2>

        <div className="field-dark">
          <label>{t('room.create.name')}</label>
          <input type="text" placeholder="Sala do utilizador_demo" />
        </div>

        <div className="field-dark">
          <label>
            <span>{t('room.create.players')}</span>: <span>{players}</span>
          </label>
          <input
            type="range"
            min={2}
            max={6}
            value={players}
            onChange={(e) => setPlayers(Number(e.target.value))}
          />
        </div>

        <div className="field-row">
          <div className="field-dark">
            <label>{t('room.create.rounds')}</label>
            <select defaultValue="3">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="field-dark">
            <label>{t('room.create.time')}</label>
            <select defaultValue="80">
              <option value="30">30s</option>
              <option value="60">60s</option>
              <option value="80">80s</option>
              <option value="120">120s</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field-dark">
            <label>{t('room.create.chatlang')}</label>
            <select defaultValue="pt">
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div className="field-dark">
            <label>{t('room.create.category')}</label>
            <select defaultValue="general">
              <option value="general">{t('room.cat.general')}</option>
              <option value="animals">{t('room.cat.animals')}</option>
              <option value="food">{t('room.cat.food')}</option>
              <option value="movies">{t('room.cat.movies')}</option>
              <option value="objects">{t('room.cat.objects')}</option>
            </select>
          </div>
        </div>

        <label className="signup-terms" style={{ marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <span>{t('room.create.private')}</span>
        </label>
        {isPrivate && (
          <div className="field-dark">
            <label>{t('room.create.password')}</label>
            <input type="password" placeholder="••••••" />
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('room.create.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            {t('room.create.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateRoomModal
