import { Link } from 'react-router-dom'

function Home() {
  return (
    <main className="pagina centro">
      <h1>Gartic</h1>
      <p>
        Gartic é um jogo multiplayer de desenhar e adivinhar em tempo real. Em
        cada ronda, um jogador recebe uma palavra secreta e desenha-a no quadro
        partilhado; os restantes tentam adivinhar escrevendo palpites. Quem
        acerta mais depressa ganha mais pontos — e quem desenha também pontua
        por cada acerto dos outros. No fim de todas as rondas, vence quem tiver
        mais pontos.
      </p>

      <p>
        <img
          src="/jogo-placeholder.svg"
          alt="Imagem de demonstração do jogo"
          className="foto-jogo"
        />
      </p>

      <Link to="/login">
        <button type="button">Jogar</button>
      </Link>

      <section id="about-us">
        <h2>About us</h2>
        <p>
          Somos a equipa do ft_transcendence da 42 Porto: Renan (resilva),
          Pedro (pebarbos), Thiago (thevaris) e Carlos (carlos-j). Este site é
          um projeto académico desenvolvido para fins de aprendizagem.
        </p>
      </section>
    </main>
  )
}

export default Home
