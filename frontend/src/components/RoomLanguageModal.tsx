import { useLanguage } from '../i18n/LanguageContext'
import type { Lang } from '../i18n/translations'

// Notice shown when entering a room whose language differs from the user's
// language: it states which language the words will be in and asks for
// confirmation. Follows the visual pattern of the design's modals (overlay + panel).

type Props = {
  roomLang: Lang
  onConfirm: () => void
  onClose: () => void
}

function RoomLanguageModal({ roomLang, onConfirm, onClose }: Props) {
  const { t } = useLanguage()

  return (
    <div className="modal-overlay show">
      <div className="modal-panel">
        <h2>{t('roomlang.title')}</h2>
        <p className="roomlang-text">
          {t('roomlang.text1')} <b>{t(`lang.${roomLang}`)}</b>.{' '}
          {t('roomlang.text2')}
        </p>
        <p className="roomlang-confirm">{t('roomlang.confirm')}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('roomlang.leave')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {t('roomlang.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomLanguageModal
