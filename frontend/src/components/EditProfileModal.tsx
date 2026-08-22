import { useState, type ChangeEvent } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

// O componente é montado de novo a cada abertura (ver Profile.tsx), por isso
// os campos começam sempre com os valores atuais do perfil.
type Props = {
  currentNickname: string
  currentPhoto: string | null
  onClose: () => void
  onSave: (nickname: string, photo: string | null) => void
}

function EditProfileModal({
  currentNickname,
  currentPhoto,
  onClose,
  onSave,
}: Props) {
  const [nickname, setNickname] = useState(currentNickname)
  const [photo, setPhoto] = useState<string | null>(currentPhoto)

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleSave() {
    // AQUI O CODIGO DA BASE DE DADOS (guardar perfil real: nickname, nova
    // password com a password atual, avatar redimensionado no SERVIDOR)
    onSave(nickname.trim() || currentNickname, photo)
    onClose()
  }

  const { t } = useLanguage()

  return (
    <div className="modal-overlay show">
      <div className="modal-panel">
        <h2>{t('editprofile.title')}</h2>

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
          <div className="field-readonly">utilizador_demo@exemplo.com</div>
        </div>

        <div className="field-dark">
          <label>{t('profile.changepass')}</label>
          <input type="password" placeholder="••••••••" />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('room.create.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {t('editprofile.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProfileModal
