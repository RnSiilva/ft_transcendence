# ATUALIZAÇÕES — Ponto de situação do SketchGuess

> Registo detalhado do trabalho de finalização feito na cópia do Thiago
> (sessões de 2026-09-15 a 2026-09-17): correções a código da equipa,
> ficheiros novos, ficheiros alterados, mecânicas do jogo, e o que falta.
> A secção 4 cobre a ronda de bugs apanhados no TESTE MULTI-MÁQUINA (dia 17,
> 3 dispositivos: 2 computadores + telemóvel) e as funcionalidades novas; a
> secção 5 é o que falta para concluir.
> O registo cronológico detalhado, entrada a entrada, está na Documentacao.md.
> **Nota:** este trabalho ainda NÃO foi enviado para o repositório git
> (decisão de envio pendente — ver secção 5).

---

## 1. Correções feitas a código da equipa

| Problema | Onde | Correção |
|---|---|---|
| A main **não compilava** (11 erros TS) | `Profile.tsx` (faltava `const API`), função `enterRoom` morta a referenciar variáveis removidas, `navigate` sem uso em `Login.tsx`/`Register.tsx` | Removido código morto, reposta a constante, imports limpos |
| Violação das **regras dos hooks** no guard de sessão | `Register.tsx` (branch register-login do Carlos) | `if (checkingSession) return null` movido para DEPOIS de todos os hooks |
| **Hover card dos amigos invisível** | CSS do Carlos: `.friend-row .who { overflow: hidden }` cortava o cartão | Ellipsis movido para `.phc-name { max-width: 190px }`; overflow removido da row |
| **Kick possível com 2 jogadores** (limiar `floor(1/2)+1 = 1` — um jogador expulsava o outro sozinho) | `backend/src/sockets/report.socket.js` | Limiar passou a `Math.max(2, floor(votantes/2)+1)` |
| **Cookie de sessão sem flag Secure** (reprovava no subject: HTTPS obrigatório) | `.env` e `.env.example` tinham `NODE_ENV=development` | `NODE_ENV=production` nos dois; verificado `Set-Cookie: HttpOnly; Secure; SameSite=Strict` |
| Com `NODE_ENV=production`, o `npm install` do compose **saltava as devDependencies** → `nodemon: not found` → backend em crash-loop | `docker-compose.yml` | `npm install --include=dev` com comentário a explicar |
| 3 `any` sem tipo no código novo da branch | Ficheiros do register-login | Tipados ao integrar |
| **Erros da API só em inglês** ("You are already friends with this user") | Respostas do backend mostradas cruas no frontend | Mapa local → chaves i18n (ver secção 2, `apiError.ts`) |
| **"401 /api/me" na consola** de qualquer visitante sem sessão (sujava a consola na avaliação) | `auth.routes.js` / `auth.controller.js` | Novo `optionalAuth` só no `/me`: sem sessão responde `200 {user:null}` (logged-out é um estado, não um erro); as restantes rotas mantêm o 401 |
| **Amigos sem tempo real**: pedido enviado/aceite só aparecia ao outro utilizador depois de F5 | `friends.controller.js`, `presence.js`, `index.js`, `Profile.tsx` | Servidor emite `friends:changed` por socket aos dois lados após enviar/aceitar/recusar/remover; o Perfil ouve e recarrega a lista — sino e pendentes atualizam sozinhos. Provado por E2E (5/5) |
| **Lobby: o último a entrar via a lista vazia** ("à espera de jogadores") — o room:state da entrada chegava antes de o modal estar a ouvir | `lobby.socket.js`, `RoomLobbyModal.tsx` | Novo `lobby:sync` (fotografia da sala por ack: membros, fase, criador); o modal sincroniza ao montar. Provado por E2E (9/9) |
| **Telemóvel em modo de espera ficava com o lobby "fantasma"** (fora da sala no servidor, mas o ecrã continuava a mostrá-la, mesmo após os 5 min) | `RoomLobbyModal.tsx` | Na reconexão do socket: `lobby:sync` → se fora da sala tenta `room:join` (reentra sozinho) → se a sala já não existe, overlay de sala terminada |
| **Escolha de palavra não aparecia** (1.º turno, visto no telemóvel): o `round:choices` ia para o socket antigo — o /game abre ligação nova ao navegar do lobby | `round.socket.js`, `room.socket.js` | `reclaimInGame` reenvia as escolhas (com tempo restante) e a palavra ao socket novo; desenhador nunca fica "sem dono". E2E 11/11 |
| **Sopro no chat**: quem já tinha acertado reescrevia a palavra e todos viam a resposta | `round.socket.js` | Em fase de desenho, mensagens de quem já acertou só chegam ao desenhador + quem também já acertou (regra Gartic) |
| **Canvas lentíssimo no telemóvel em ecrã inteiro** (+5 s de atraso) | `Game.tsx` | Cada 'resize' do browser móvel apagava e repintava o histórico inteiro; agora ignora tamanhos iguais + debounce 150 ms |
| **Jogo fantasma no telemóvel** (partida acabou mas ficava aberta, chat ativo, contador parado) | `useGameSocket.ts` | Reconexão falhada = fim de jogo (modal + sair), em vez de criar uma sala nova em silêncio |
| **Cursor branco invisível no quadro (Windows)** | `index.css` | Cursor SVG próprio (lápis com contorno escuro) em vez do crosshair invertido do sistema |
| **Bandeiras de idioma não apareciam no Windows** (emoji vira "PT EN" em letras) | `LanguageBar.tsx` | Bandeiras SVG desenhadas à mão, iguais em todos os sistemas |
| **No telemóvel não dava para abrir o cartão de jogador** (adicionar amigo/stats) — o toque abria e fechava no mesmo gesto | `PlayerHoverCard.tsx` | Hover só em ecrãs com hover verdadeiro; no tátil toque abre/fecha e tocar fora fecha |

**Erros de lint (RESOLVIDOS em 2026-09-17):** eram 2 avisos
`react-hooks/set-state-in-effect` (`useAuth.ts` e o efeito do `Profile.tsx`),
ferramenta de terminal (ESLint), sem relação com a consola do browser (F12)
nem impacto no funcionamento. Corrigidos com autorização do Thiago:
- **useAuth.ts** — a verificação da sessão ao montar passou a INLINE (fetch
  no efeito, setState só após o await, com flag `alive` anti-desmonte); antes
  chamava `refresh()`, que fazia `setLoading(true)` síncrono no efeito.
- **Profile.tsx** — `loadFriends` ganhou proteção `alive` e só faz setState
  após o await; a regra dá falso-positivo por não seguir o await através de
  uma função partilhada (usada em 4 handlers), silenciado só nessa linha com
  justificação.
`npm run lint` agora dá **0 erros, 0 avisos**; `tsc` + build limpos.

---

## 2. Ficheiros CRIADOS

### Frontend
- **`frontend/src/utils/apiError.ts`** — mapa local (17 entradas) das mensagens
  de erro em inglês do backend → chaves do nosso `translations.ts`.
  `translateApiError(t, msg)` com fallback. Zero rede — é só i18n.
- **`frontend/src/components/AchievementsPanel.tsx`** — painel de conquistas
  partilhado (20 badges, progresso, abas desbloqueadas/todas). Usado pelo
  Perfil próprio E pelo perfil público — antes o código estava duplicado.
- **`frontend/src/utils/demoStats.ts`** — stats de exemplo extraídas do
  componente (exigência do lint react-refresh).
- **`frontend/public/favicon.svg`** — substituído o raio roxo do Vite pelo
  lápis do SketchGuess (Ctrl+Shift+R no browser se ainda vires o antigo).

### Backend
- **`backend/src/routes/users.routes.js`** — `GET /api/users/:username` com
  sessão obrigatória; devolve SÓ campos visíveis (username, avatar, rank,
  pontos, partidas, vitórias, conquistas). Alimenta: pesquisa de amigos em
  2 passos, perfil público de qualquer utilizador, e stats reais no cartão
  de hover. Verificado por curl: dados ✔ 404 ✔ 401 sem sessão ✔.
- **`backend/scripts/lobby-test.js`** + script `test:lobby` no package.json —
  suite E2E com sockets reais e 4 contas descartáveis, **18/18 a passar**
  (`docker exec backend npm run test:lobby`): não inicia com 1 ou 2
  jogadores; fase chega a todos; "pronto" só ao criador com 3; iniciar/kick
  só o criador e nunca a si próprio; expulso é notificado; início chega a
  todos; expiração da sala aos 5 min (unit test via `sweepOnce`).

### Raiz / infra
- **`README-draft.md`** — rascunho completo do README em inglês (Cap. VI do
  subject novo: crítico + IA por tarefa), com marcadores [FILL] para a
  equipa. Módulos: Core 14 pts, Bónus +5 (teto), tabela de bónus extra
  trocáveis. O README.md real fica intocado até validarmos em equipa.
- **`.github/workflows/ci.yml`** — CI nos PRs para main: frontend
  (npm ci + tsc + build) e backend (compose com mariadb, espera "Backend
  running", corre todas as suites `test:*`, logs em falha, `down -v` sempre).
- **`docs/privacy-policy.md`** e **`docs/terms-of-service.md`** — reescritos
  para espelhar os textos do site (RGPD, ver secção 4).

### Apagados (autorizado pelo Thiago, após verificar zero referências no código)
`DESIGN_FRONTEND/`, `backend/prisma/migrations/`, `backend/scripts/rooms-demo.js`
— alinhado com o que a main já tinha apagado.

---

## 3. Ficheiros ALTERADOS e mecânicas do jogo

### Jogo 100% real (zero simulações) — `Game.tsx`, `useGameSocket.ts`
Removidos TODOS os botões de teste e dados fictícios. Agora tudo vem do
servidor: palavras, cronómetro, rondas, pontuação, fim de partida.
- **Escolha de palavra 1-de-3**: o desenhador recebe 3 opções e tem 10 s
  para escolher (modal com contagem); só ele as vê.
- **Palavra mascarada** para quem adivinha; a palavra real só ao desenhador.
- **Banner de acerto + confetes** só para quem acertou; pontos por posição.
- **Chat**: o desenhador está bloqueado de escrever durante a sua vez
  (servidor recusa — anti-batota); mensagens de sistema ("X acertou! +N",
  "A palavra era: Y", "X foi expulso") agora em i18n (padrão tRef no hook).
- **Report/expulsão** via servidor com votação; o denunciado nunca vê a
  contagem de votos.
- Guards de saída (beforeunload + captura de links), restauro de sala por
  sessionStorage, quadro em fullscreen, rodapé de pontuações colapsável.

### Regras de jogadores (decisão final da equipa) — `lobby.socket.js`, `round.socket.js`
- **3 jogadores no mínimo para INICIAR** (`READY_MIN_PLAYERS = 3`).
- **A meio da partida pode continuar com 2** (se um dos 3 sair).
- **Se ficar só 1 → a sala fecha imediatamente** (`game:aborted`) e
  **ninguém guarda os pontos**. Modal no frontend → volta às salas.
- Tolerância de 15 s para reconexão mantida ("— desligou-se, Ns" na lista,
  agora em i18n); quem volta retoma o lugar (incluindo como desenhador).

### Lobby 100% servidor — `RoomLobbyModal.tsx`, `Rooms.tsx`, `lobby.socket.js`
- Membros, timer e criador vêm de `room:state` / `lobby:tick`.
- **`lobby:phase`** (waiting_players / waiting_creator) emitido a TODOS;
  o botão Iniciar só ativa em `waiting_creator` (e o servidor revalida).
- Prompt de decisão ao criador com beep + notificação; kick/fechar sala só
  o criador; expulsos e expiração (5 min) com overlays próprios.
- `Rooms.tsx`: lista real com ack+broadcast, criação com definições,
  `lobby:open` emitido após criar (bug: antes só o teste E2E o emitia).

### Perfil e social — `Profile.tsx`, `PublicProfile.tsx`, `PlayerHoverCard.tsx`, `EditProfileModal.tsx`
- **Sino de notificações** sobre a foto com contagem de pedidos pendentes;
  clique faz scroll ao painel de amigos com aceitar/recusar.
- **Pesquisa de amigos em 2 passos**: Pesquisar → caixa de pré-visualização
  com avatar/rank/pontos → Adicionar.
- **Cartão de hover** nos amigos e no jogo: stats REAIS (busca à rota nova
  ao abrir); no perfil é só informativo (`showActions=false`); clique no
  nome navega para o perfil público (`to` prop — hover mostra o cartão,
  clique é Link).
- **Perfil público** real para QUALQUER utilizador: stats + conquistas +
  posições nos rankings geral/semanal/diário; amizade só acrescenta o
  estado online.
- **Editar perfil**: arrastar a foto para posicionar, recorte 512 px,
  limite 2 MB, e **botão "🗑 Remover foto"** (grava `avatarUrl: null`).
- `friends.service.js`: select alargado (partidas, vitórias, conquistas).

### i18n completo — `translations.ts` (PT/EN/ES ×3)
Blocos novos/reescritos: salas, lobby (fases, expulso), rankings, jogo
(vez, escolha, acerto, abortado, report, fullscreen, desligado, chat),
cartão de jogador, editar perfil, pedidos/pesquisa de amigos, erros da API,
**Regras do jogo** (reescritas: 3 para iniciar, continua com 2, fecha com 1,
batota/votação), **Termos** (com "O que armazenamos") e **Política de
Privacidade conforme o RGPD** (responsável, dados, fundamentos do art. 6.º,
cookies, partilha, conservação, direitos + CNPD, segurança, alterações).
Exceção deliberada: nomes de sala "Sala de X" são dados do servidor, iguais
para todos — não se traduzem.

### Infra — `docker-compose.yml`, `backend/src/index.js`, `.env.example`
- Compose backend: `npm install --include=dev` + prisma generate/db push +
  seed + dev (comentário explica o porquê).
- `index.js`: rota `/users` montada; **ordem de registo comentada** (lobby
  DEPOIS dos handlers de sala — a ordem dos listeners do Socket.IO conta);
  sweepers do lobby e do report arrancados.
- `.env.example`: `NODE_ENV=production` com comentário (a linha antiga
  ensinava a configuração errada).

---

## 4. Ronda do teste multi-máquina (2026-09-17)

Teste real com 3 dispositivos (2 computadores + 1 telemóvel) em rede local.
Apanhou bugs que só aparecem com jogadores reais, telemóveis que adormecem
e ligações que caem sem se despedir. Todos corrigidos e verificados.

### 4.1 Correções (bugs encontrados no teste)

| Problema | Onde | Correção |
|---|---|---|
| **"Pedido enviado a X" ficava para sempre** no perfil | `Profile.tsx` | A confirmação verde apaga-se sozinha aos 5 s (timer com ref, limpo em novo envio e ao desmontar) |
| **Sala sem criador ficava aberta** (criador sai sem "Fechar" → os outros presos até aos 5 min) | `lobby.socket.js` | Sala em espera sem criador entre os membros → `lobby:closed` a todos e sala esvaziada; criador só ausente (reload) sobrevive à tolerância |
| **Jogador "fantasma" ao Sair do lobby** (regressão minha do resync): clicar Sair com uma reentrada automática em voo reentrava na sala | `RoomLobbyModal.tsx` | `haltedRef` trava o resync no instante do clique (Sair/expulso/expirado/fechar/iniciar); reentrada em voo é desfeita |
| **Sair da partida NUNCA avisava o servidor** (era um comentário placeholder sem código): a saída parecia queda de rede → lugar guardado 15 s, o outro via um fantasma e a regra 1-fecha-tudo contava-o | `useGameSocket.ts`, `Game.tsx` | `leaveRoom()` emite `room:leave` e espera o ack antes de navegar (teto de 1,5 s) |
| **Conta trancada fora da sala por ligação zombie** (telemóvel que adormeceu): o dono do lugar recebia `ALREADY_IN_ROOM` | `rooms.js` (`seizeSeat`), `room.socket.js` | A conta **retoma o próprio lugar**: ligação nova fica com ele (pontos/vez preservados), a antiga recebe `room:replaced` e sai. Continua 1 lugar por conta. E2E 6/6 |
| **Rank sempre #0** (a coluna nascia a 0 e nunca era recalculada) | `games.repository.js` + frontend | `saveGame` recalcula o rank de todos (pontos, desempate por vitórias) na mesma transação; quem nunca jogou mostra "—" em vez de "#0" |
| **Telemóvel preso no jogo depois do fim** (o anúncio de "acabou" era enviado 1 vez e perdia-se se o ecrã estivesse suspenso) | `round.socket.js` | O estado final é reanunciado a cada segundo enquanto a sala em fim de jogo tiver gente — quem acorda recebe-o |
| **Fechar o troféu não saía / prendia no tabuleiro** (o `navigate` vinha depois de um `await` que podia ser interrompido por um recarregamento do Vite) | `Game.tsx` | `navigate('/rooms')` movido para `finally` — corre sempre, mesmo com o await interrompido, rede lenta ou erro |
| **Chat crescia sem barra de rolagem** (empurrava o Enviar para baixo, no desktop) | `index.css` | Caixa do chat escrava da altura do quadro (`height:0;min-height:100%`) + teto do registo `calc(100vh - 320px)`; ganha barra em vez de esticar |
| **Ligações mortas demoravam ~45-60 s a detetar** (fantasmas de telemóvel) | `index.js` | `pingInterval` 10 s / `pingTimeout` 5 s no Socket.IO → deteção em ~15 s |
| **`/auth/me` dava 401 na consola** de qualquer visitante sem sessão (já na secção 1) | — | (ver secção 1) |

### 4.2 Funcionalidades novas (pedidas no teste)

- **Salas privadas com senha** (`rooms.js`, `room.socket.js`, `lobby.socket.js`,
  `CreateRoomModal.tsx`, `Rooms.tsx`, `translations.ts`): o checkbox+campo que
  já existiam no front eram decorativos; ligados de ponta a ponta. A senha
  fica FORA das settings (nunca é serializada para os clientes); a lista
  pública marca a sala com 🔒 (`locked`); ao entrar pede a senha (validada no
  servidor — `WRONG_PASSWORD`); quem já está dentro e quem retoma o lugar não
  a repete. Chaves `rooms.locked.*` ×3. E2E 6/6.
- **Listas do perfil com scroll** (`Profile.tsx`, `index.css`): últimas
  partidas e amigos mostram no máximo ~8 linhas; acima disso ganham barra de
  rolagem interna (`.scroll-list.scrolls`) para o perfil não crescer sem fim.
- **Rankings clicáveis** (`Profile.tsx`, `index.css`): clicar num jogador do
  ranking (geral/semanal/diário) abre o perfil dele — o próprio → `/profile`,
  outros → `/user/:username`; acessível por teclado. Antes só os amigos.
- **Perfil público abre no topo** (`PublicProfile.tsx`): `window.scrollTo(0,0)`
  ao abrir — vindo do ranking (a meio da página) já não começava a meio.
- **Cursor-lápis só na vez de desenhar** (`Game.tsx`, `index.css`): a classe
  `.drawing` aplica o cursor próprio apenas ao desenhador; quem adivinha vê a
  seta normal.

### 4.3 Melhorias de robustez e de processo

- **Autorreparação** do lobby e da lista de salas (resync periódico + na
  reconexão + ao voltar a ecrã visível): telemóveis que adormecem recuperam o
  estado sozinhos em segundos, em vez de ficarem congelados.
- **`nodemon --ignore scripts`** (`package.json`): os scripts de teste deixam
  de reiniciar o servidor. Scripts temporários passaram a correr de `/tmp` do
  container (via `docker cp`), nunca na pasta do projeto.
- **Lição de processo aprendida:** não gravar ficheiros durante os testes ao
  vivo do Thiago — cada gravação recarrega o Vite/reinicia o backend e
  remonta componentes a meio, o que gerava sintomas erráticos confundidos com
  regressões. Protocolo: "vou testar" → congelamento total das gravações.

### 4.4 Verificação

- Suites do servidor todas verdes: rooms 13, scoring 22, words 22, round 50,
  report 13, lobby 18 (**138 verificações**). E2E de fluxo: amigos em tempo
  real 5/5, lobby-sync 9/9, criador-sai 4/4, chat-sem-sopro 11/11,
  arranque-1.º-turno 10/10, retomar-lugar 6/6, sala-privada 6/6.
- `tsc` limpo; `lint` só com os 2 erros conhecidos da equipa.

---

## 5. O que FALTA para concluir

### Bloqueador principal
- [ ] **Enviar tudo para o repositório original** — nada disto está no git
  ainda. Decisão pendente: (A) sincronizar para a main, ou (B) sincronizar
  para a register-login, que já tem os badges do Carlos → um único PR
  entrega tudo (recomendada a B).

### Precisa da equipa
- [ ] **Credenciais da 42** (`FORTYTWO_UID`/`FORTYTWO_SECRET` no `.env`) —
  Carlos. Sem elas o login 42 dá "Client authentication failed".
- [ ] **PR dos badges → main** (ou resolve-se com a opção B acima).
- [ ] Preencher os **[FILL] do README-draft.md** em equipa (secção de IA por
  tarefa é obrigatória no subject novo) e só depois passar para o README.md.
- [ ] `NODE_ENV=production` no `.env` de todos (o `.env.example` já está).
- [ ] **Ensaiar a modificação de código ao vivo** — o subject novo prevê que
  o avaliador peça alterações durante a defesa.
- [ ] Validar o CI partindo um teste de propósito num PR.
- [ ] **Segredos fortes no `.env` DA MÁQUINA DE ENTREGA** (não vai para o
  git — decisão do Thiago: gerar na entrega). Antes da defesa, no `.env`
  real: `JWT_SECRET` aleatório (`openssl rand -hex 32`) e trocar
  `MARIADB_PASSWORD`/`MARIADB_ROOT_PASSWORD` dos valores de exemplo. Fazer
  ANTES de mostrar (mudar o JWT_SECRET desloga sessões) e garantir que o
  `.env` existe nessa máquina (o `make` não arranca sem ele). O
  `.env.example` fica com placeholders, como deve.

### Do Thiago
- [x] Passagem de **F12/consola com sessão iniciada** (perfil, salas,
  partida) — FEITO pelo Thiago (2026-09-17): percorreu tudo logado no
  inspetor → consola sem erros.
- [x] **Teste multi-máquina** — FEITO (2026-09-17, 3 dispositivos). Os bugs
  encontrados estão todos corrigidos na secção 4.
- [ ] Decisão final sobre **modo espetador** (estimativa: baixo-médio,
  ~meio dia; por agora fica de fora).

### Limitação conhecida
- Login 42 só funciona em `localhost` (callback registado na intra); nos
  testes em rede usa-se o registo normal.
