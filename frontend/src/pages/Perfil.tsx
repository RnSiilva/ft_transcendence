import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const salasDisponiveis = [
  { codigo: 'ABC123', criador: 'renan', jogadores: 2 },
  { codigo: 'XYZ789', criador: 'pedro', jogadores: 4 },
]

const amigos = [
  { nome: 'renan', online: true },
  { nome: 'pedro', online: true },
  { nome: 'carlos', online: false },
]

function Perfil() {
  const [pesquisa, setPesquisa] = useState('')
  const [mensagem, setMensagem] = useState('')

  function adicionarAmigo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pesquisa) return
    // Pedido real de amizade (backend + estado online) — Sprint 4.
    setMensagem(`Pedido de amizade enviado a "${pesquisa}" (exemplo).`)
    setPesquisa('')
  }

  return (
    <main className="pagina">
      <div className="linha">
        <div className="avatar">U</div>
        <div>
          <h1>utilizador_demo</h1>
          <p>demo@example.com</p>
        </div>
      </div>

      <div className="cartao">
        <h2>Rank e estatísticas</h2>
        <p>Rank: #— · Pontos totais: 0 · Partidas jogadas: 0 · Vitórias: 0</p>
      </div>

      <div className="cartao">
        <h2>Salas disponíveis</h2>
        <ul className="lista-simples">
          {salasDisponiveis.map((sala) => (
            <li key={sala.codigo}>
              <span>
                Sala {sala.codigo} — criada por {sala.criador} ({sala.jogadores}{' '}
                jogadores)
              </span>
              <Link to="/jogo">
                <button type="button">Entrar</button>
              </Link>
            </li>
          ))}
        </ul>
        <button type="button">Criar sala</button>
      </div>

      <div className="cartao">
        <h2>Adicionar amigos</h2>
        <form className="envio" onSubmit={adicionarAmigo}>
          <input
            placeholder="Pesquisar por username"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
          <button type="submit">Adicionar</button>
        </form>
        {mensagem && <p>{mensagem}</p>}
      </div>

      <div className="cartao">
        <h2>Amigos</h2>
        <ul className="lista-simples">
          {amigos.map((amigo) => (
            <li key={amigo.nome}>
              <span className="linha-jogador">
                <span className="avatar avatar-pequeno">
                  {amigo.nome.charAt(0).toUpperCase()}
                </span>
                {amigo.nome}
              </span>
              <span className={amigo.online ? 'online' : 'offline'}>
                {amigo.online ? '● online' : '○ offline'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

export default Perfil
