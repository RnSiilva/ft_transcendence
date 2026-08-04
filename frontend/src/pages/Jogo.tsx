// Esqueleto da página do jogo — APENAS layout, sem lógica.
// Por implementar (não faz parte do esqueleto):
//  - Desenho: ferramentas (cor, espessura, borracha, limpar) e traços ao vivo
//    via Socket.IO — Sprint 3.
//  - Palpites: validação no servidor (só ele conhece a palavra) — Sprint 3.
//  - Chat da sala em tempo real — Sprint 4.

type Mensagem = { autor: string; texto: string }

const jogadores = [
  { nome: 'utilizador_demo', pontos: 120, aDesenhar: true },
  { nome: 'renan', pontos: 250, aDesenhar: false },
  { nome: 'pedro', pontos: 180, aDesenhar: false },
]

const mensagensExemplo: Mensagem[] = [
  { autor: 'renan', texto: 'boa sorte!' },
  { autor: 'pedro', texto: 'é um animal?' },
]

function Jogo() {
  return (
    <main className="pagina">
      <div className="barra-estado">
        <span className="linha-jogador">
          <span className="avatar avatar-pequeno">U</span>
          utilizador_demo — 120 pontos
        </span>
        <span>Ronda 1 / 3</span>
        <span>Palavra: _ _ _ _ _</span>
        <span>Tempo: 80s</span>
      </div>

      <div className="area-jogo">
        <aside className="painel placar">
          <h2>Placar</h2>
          <ul className="lista-simples">
            {jogadores.map((jogador) => (
              <li key={jogador.nome}>
                <span className="linha-jogador">
                  <span className="avatar avatar-pequeno">
                    {jogador.nome.charAt(0).toUpperCase()}
                  </span>
                  {jogador.nome}
                  {jogador.aDesenhar && ' (a desenhar)'}
                </span>
                <span>{jogador.pontos}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="painel quadro">
          {/* Área de desenho (vazia) — implementação na Sprint 3 */}
          <canvas width={400} height={400} />
          <div className="envio">
            <input placeholder="Escreve o teu palpite" />
            <button type="button">Enviar palpite</button>
          </div>
        </section>

        <aside className="painel chat">
          <h2>Chat da sala</h2>
          <div className="chat-mensagens">
            {mensagensExemplo.map((mensagem, i) => (
              <p key={i}>
                <strong>{mensagem.autor}:</strong> {mensagem.texto}
              </p>
            ))}
          </div>
          <div className="envio">
            <input placeholder="Mensagem" />
            <button type="button">Enviar</button>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default Jogo
