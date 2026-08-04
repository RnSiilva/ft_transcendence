import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="rodape">
      <p>
        © 2026 Garatuja Games, Lda. — empresa fictícia, projeto académico
        ft_transcendence (42 Porto)
      </p>
      <p>
        <Link to="/privacidade">Política de Privacidade</Link> ·{' '}
        <Link to="/termos">Termos de Serviço</Link> ·{' '}
        <Link to="/regras">Regras do jogo</Link>
      </p>
    </footer>
  )
}

export default Footer
