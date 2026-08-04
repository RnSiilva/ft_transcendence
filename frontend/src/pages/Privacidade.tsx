function Privacidade() {
  return (
    <main className="pagina">
      <h1>Política de Privacidade</h1>
      <p>
        <em>
          Documento de exemplo com empresa fictícia, para fins académicos
          (ft_transcendence, 42 Porto). Última atualização: 4 de agosto de 2026.
        </em>
      </p>

      <h2>1. Quem somos</h2>
      <p>
        O Gartic é operado pela Garatuja Games, Lda. (empresa fictícia), Rua da
        Imaginação 42, 4000-000 Porto, Portugal. Contacto para questões de
        privacidade: privacidade@garatuja.example.
      </p>

      <h2>2. Dados que recolhemos</h2>
      <ul>
        <li>Email e nome de utilizador (registo da conta);</li>
        <li>Password guardada apenas como hash (bcrypt) — nunca em texto simples;</li>
        <li>Foto de perfil (avatar), se fizeres upload;</li>
        <li>Estatísticas de jogo: rank, pontos totais, partidas jogadas e vitórias;</li>
        <li>Idioma preferido (PT/EN/ES).</li>
      </ul>

      <h2>3. Para que usamos os dados</h2>
      <p>
        Autenticação e manutenção da sessão, funcionamento do jogo (placar,
        leaderboard, sistema de amigos) e comunicação essencial sobre a conta.
        Não vendemos nem partilhamos dados com terceiros.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos apenas cookies essenciais: um cookie de sessão (httpOnly) para
        manter o login. Não usamos cookies de publicidade nem de rastreamento.
      </p>

      <h2>5. Conservação e segurança</h2>
      <p>
        Os dados ficam guardados na nossa base de dados enquanto a conta
        existir. Toda a comunicação entre o browser e o servidor é feita por
        HTTPS.
      </p>

      <h2>6. Os teus direitos</h2>
      <p>
        Podes aceder, corrigir ou apagar os teus dados (incluindo apagar a
        conta) através do teu perfil ou contactando
        privacidade@garatuja.example.
      </p>

      <h2>7. Chat das salas</h2>
      <p>
        As mensagens do chat existem apenas durante a partida e não são
        guardadas na base de dados.
      </p>
    </main>
  )
}

export default Privacidade
