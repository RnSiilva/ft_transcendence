import { useState } from 'react'
import { Link } from 'react-router-dom'

function CookieBanner() {
  const [visivel, setVisivel] = useState(() => {
    try {
      return localStorage.getItem('cookiesAceites') !== 'sim'
    } catch {
      return true
    }
  })

  if (!visivel) return null

  function aceitar() {
    try {
      localStorage.setItem('cookiesAceites', 'sim')
    } catch {
      // Ignorar erros de storage (ex.: modo privado / storage bloqueado).
    }
    setVisivel(false)
  }

  return (
    <div className="faixa-cookies">
      <span>
        Este site usa apenas cookies essenciais (sessão de login).{' '}
        <Link to="/privacidade">Saber mais</Link>
      </span>
      <button type="button" onClick={aceitar}>Aceitar</button>
    </div>
  )
}

export default CookieBanner
