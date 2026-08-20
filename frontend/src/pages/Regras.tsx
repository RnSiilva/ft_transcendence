function Regras() {
  return (
    <main className="pagina">
      <h1>Regras do jogo</h1>
      <ul>
        <li>Cada sala precisa de pelo menos 3 jogadores para começar.</li>
        <li>
          Em cada ronda, cada jogador desenha exatamente uma vez; os restantes
          adivinham.
        </li>
        <li>Quem vai desenhar recebe 3 palavras e escolhe 1.</li>
        <li>O desenho tem um tempo limite de 80 segundos (configurável na sala).</li>
        <li>
          Os palpites escrevem-se no campo próprio; palpites errados aparecem no
          chat da sala.
        </li>
        <li>
          Quem acerta mais depressa ganha mais pontos; quem desenha ganha pontos
          por cada acerto dos outros.
        </li>
        <li>
          A ronda termina quando o tempo esgota ou quando todos acertaram; no
          fim é revelada a palavra.
        </li>
        <li>No fim de todas as rondas, vence quem tiver mais pontos.</li>
        <li>
          Jogadores inativos ou com desenhos fora do padrão podem ser
          reportados: à 1.ª ocorrência recebem um aviso; em caso de reincidência
          são expulsos da sala.
        </li>
        <li>
          Se um jogador se desconectar e não voltar a tempo, o seu turno é
          saltado e a partida continua.
        </li>
      </ul>
    </main>
  )
}

export default Regras
