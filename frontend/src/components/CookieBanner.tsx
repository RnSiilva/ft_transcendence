import { useState } from 'react'
import { Link } from 'react-router-dom'

function CookieBanner() {
  const [visivel, setVisivel] = useState(
    () => localStorage.getItem('cookiesAceites') !== 'sim'
  )

  if (!visivel) return null

  function aceitar() {
    localStorage.setItem('cookiesAceites', 'sim')
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
