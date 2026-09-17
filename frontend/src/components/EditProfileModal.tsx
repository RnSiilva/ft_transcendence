import { useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { translateApiError } from '../utils/apiError'

const API = import.meta.env.VITE_API_URL ?? '/api'

// Tamanho (em px CSS) da pré-visualização redonda da foto.
const PREVIEW = 110

/**
 * Recorta a foto num quadrado, centrado onde o utilizador a arrastou, e é
 * ESSE recorte que fica guardado como avatar — assim a posição escolhida
 * vale em qualquer página e em qualquer dispositivo, sem campo extra na
 * base de dados. pos.x/pos.y são percentagens (50/50 = centro).
 */
function cropPhoto(src: string, pos: { x: number; y: number }): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const SIZE = 512
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(src)
        const scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight)
        const sw = img.naturalWidth * scale
        const sh = img.naturalHeight * scale
        ctx.drawImage(img, -(sw - SIZE) * (pos.x / 100), -(sh - SIZE) * (pos.y / 100), sw, sh)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      } catch {
        // Foto vinda de outro domínio não pode ser recortada: fica como está.
        resolve(src)
      }
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}

// O componente é montado de novo a cada abertura (ver Profile.tsx), por isso
// os campos começam sempre com os valores atuais do perfil.
type Props = {
  currentNickname: string
  currentEmail: string
  currentPhoto: string | null
  hasPassword?: boolean
  onClose: () => void
  onSave: (updatedUser: Record<string, unknown>) => void
}

function EditProfileModal({
  currentNickname,
  currentEmail,
  currentPhoto,
  hasPassword = true,
  onClose,
  onSave,
}: Props) {
  const { t } = useLanguage()
  const [nickname, setNickname] = useState(currentNickname)
  const [photo, setPhoto] = useState<string | null>(currentPhoto)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Posição da foto dentro do círculo (arrastada com o rato/dedo).
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [moved, setMoved] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
    if (file.size > MAX_SIZE) {
      setError(t('errors.avatarTooLarge'))
      e.target.value = '' // clear the input so the user can try again
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhoto(ev.target?.result as string)
      setPos({ x: 50, y: 50 })
      setMoved(false)
    }
    reader.readAsDataURL(file)
  }

  function dragStart(e: PointerEvent<HTMLDivElement>) {
    if (!photo) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y }
  }

  function dragMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    setPos({
      x: clamp(drag.posX - ((e.clientX - drag.startX) / PREVIEW) * 100),
      y: clamp(drag.posY - ((e.clientY - drag.startY) / PREVIEW) * 100),
    })
    setMoved(true)
  }

  function dragEnd() {
    dragRef.current = null
  }

  async function handleSave() {
    setError('')
    setSaving(true)

    // A foto só é recortada se for nova ou se a posição foi ajustada; caso
    // contrário o avatar guardado fica exatamente como estava.
    const avatarUrl =
      photo && (moved || photo !== currentPhoto) ? await cropPhoto(photo, pos) : photo

    const payload: Record<string, unknown> = {
      username: nickname.trim() || currentNickname,
      avatarUrl,
    }

    if (newPassword) {
      if (currentPassword) {
        payload.currentPassword = currentPassword
      }
      payload.newPassword = newPassword
    }

    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        // Mensagem do backend (inglês) → chave i18n → idioma do site.
        setError(translateApiError(t,
          data.errors?.username || data.errors?.currentPassword || data.errors?.newPassword || data.error))
        setSaving(false)
        return
      }

      onSave(data.user)
      onClose()
    } catch {
      setError(t('errors.networkError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay show">
      <div className="modal-panel">
        <h2>{t('editprofile.title')}</h2>

        {error && (
          <p role="alert" style={{ color: 'var(--red)', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="edit-avatar">
          <div
            className={photo ? 'edit-avatar-preview draggable' : 'edit-avatar-preview'}
            onPointerDown={dragStart}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onPointerCancel={dragEnd}
          >
            {photo ? (
              <img
                src={photo}
                alt=""
                draggable={false}
                style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
              />
            ) : (
              'U'
            )}
          </div>
          <label htmlFor="edit-profile-photo" className="edit-avatar-label edit-avatar-upload">
            {t('profile.editphoto')}
          </label>
          {photo && <span className="edit-avatar-hint">{t('editprofile.drag')}</span>}
          {/* Apagar o ficheiro carregado: volta ao avatar por omissão
              (a inicial). Grava avatarUrl null no PUT /auth/profile. */}
          {photo && (
            <button
              type="button"
              className="btn btn-ghost btn-sm remove-photo-btn"
              onClick={() => {
                setPhoto(null)
                setPos({ x: 50, y: 50 })
                setMoved(false)
              }}
            >
              🗑 {t('editprofile.removephoto')}
            </button>
          )}
          <input
            type="file"
            id="edit-profile-photo"
            accept="image/*"
            hidden
            onChange={handlePhoto}
          />
        </div>

        <div className="field-dark">
          <label>{t('editprofile.nickname')}</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="field-dark">
          <label>{t('login.email')}</label>
          <div className="field-readonly">{currentEmail}</div>
        </div>

        <div className="field-dark">
          <label>{t('profile.changepass')}</label>
          {hasPassword && (
            <input
              type="password"
              placeholder={t('profile.currentpass')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          )}
          <input
            type="password"
            placeholder={t('profile.newpass')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('room.create.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '…' : t('editprofile.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProfileModal
