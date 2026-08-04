import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Autenticação real (bcrypt + JWT, validação no backend) — Sprint 2.
    navigate('/perfil')
  }

  return (
    <main className="pagina centro">
      <h1>Login</h1>
      <form className="formulario" onSubmit={entrar}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button type="submit">Entrar</button>
      </form>
      <p>Ainda não tens conta? Criar conta</p>
    </main>
  )
}

export default Login
