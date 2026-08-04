import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="cabecalho">
      <Link to="/" className="logo">LOGO</Link>
      <nav>
        <Link to="/regras">Regras do jogo</Link>
        <a href="/#about-us">About us</a>
        <Link to="/login">
          <button type="button">Login</button>
        </Link>
      </nav>
    </header>
  )
}

export default Header
