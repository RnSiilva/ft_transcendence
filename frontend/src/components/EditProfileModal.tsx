import { useState, type ChangeEvent } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

const API = import.meta.env.VITE_API_URL ?? '/api'

// O componente é montado de novo a cada abertura (ver Profile.tsx), por isso
// os campos começam sempre com os valores atuais do perfil.
type Props = {
  currentNickname: string
  currentEmail: string
  currentPhoto: string | null
  onClose: () => void
  onSave: (updatedUser: Record<string, unknown>) => void
}

function EditProfileModal({
  currentNickname,
  currentEmail,
  currentPhoto,
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

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setError('')
    setSaving(true)

    const payload: Record<string, unknown> = {
      username: nickname.trim() || currentNickname,
      avatarUrl: photo,
    }

    if (newPassword) {
      if (!currentPassword) {
        setError(t('errors.fillAllFields'))
        setSaving(false)
        return
      }
      payload.currentPassword = currentPassword
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
        setError(data.errors?.username || data.errors?.currentPassword || data.errors?.newPassword || data.error || t('errors.networkError'))
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
          <label htmlFor="edit-profile-photo" className="edit-avatar-btn">
            <div className="edit-avatar-preview">
              {photo ? <img src={photo} alt="" /> : 'U'}
            </div>
            <span className="edit-avatar-label">{t('profile.editphoto')}</span>
          </label>
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
          <input
            type="password"
            placeholder={t('profile.currentpass')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
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
