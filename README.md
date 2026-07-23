*This project has been created as part of the 42 curriculum by resilva, pebarbos, [membro3], [membro4], [membro5].*

# ft_transcendence — Gartic

## Descrição

**Gartic** é um jogo web de desenhar e adivinhar em tempo real, no estilo
Gartic / skribbl.io. Em cada rodada, um jogador recebe uma palavra secreta e a
desenha num quadro partilhado; os demais tentam adivinhar pelo chat. Quem
acerta mais depressa ganha mais pontos, e quem desenha também pontua pelos
acertos dos outros. Ao final das rodadas, vence quem tiver mais pontos.

**Principais funcionalidades:**
- Salas multiplayer com 3+ jogadores em tempo real
- Quadro de desenho partilhado via WebSocket*This project has been created as part of the 42 curriculum by resilva, pebarbos, [membro3], [membro4], [membro5].*

# ft_transcendence — Gartic

## Descrição

**Gartic** é um jogo web de desenhar e adivinhar em tempo real, no estilo
Gartic / skribbl.io. Em cada rodada, um jogador recebe uma palavra secreta e a
desenha num quadro partilhado; os demais tentam adivinhar pelo chat. Quem
acerta mais depressa ganha mais pontos, e quem desenha também pontua pelos
acertos dos outros. Ao final das rodadas, vence quem tiver mais pontos.

**Principais funcionalidades:**
- Salas multiplayer com 3+ jogadores em tempo real
- Quadro de desenho partilhado via WebSocket
- Chat de palpites com pontuação por velocidade de acerto
- Perfis de usuário, lista de amigos e histórico de partidas
- Leaderboard e sistema de gamificação (badges/XP)
- Modo espectador

> Pendente: preencher/expandir conforme o jogo evolui.

## Instruções

### Pré-requisitos
- Docker e Docker Compose instalados
- Git

### Configuração
1. Clonar o repositório:
   ```bash
   git clone <repo-url>
   cd ft_transcendence
   ```
2. Copiar o arquivo de variáveis de ambiente de exemplo e preencher os valores:
   ```bash
   cp .env.example .env
   ```
3. Subir o projeto com um único comando:
   ```bash
   docker compose up --build
   ```
4. Acessar a aplicação em `https://localhost`.

> Pendente: detalhar variáveis específicas do `.env.example` conforme forem criadas.

## Recursos

### Referências
- Documentação oficial do FastAPI: https://fastapi.tiangolo.com
- Documentação oficial do React: https://react.dev
- Documentação do PostgreSQL: https://www.postgresql.org/docs/
- MDN — WebSockets API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

> Pendente: adicionar artigos/tutoriais específicos usados durante o desenvolvimento.

### Uso de IA
Este projeto utilizou assistência de IA (Claude, Anthropic) durante o
planejamento, nas seguintes tarefas:
- Estruturação inicial do esboço do projeto e do README
- Avaliação de trade-offs na escolha de módulos do subject (pontuação,
  dependências entre módulos, riscos de sobreposição)
- Definição da ordem de construção do projeto (roadmap de desenvolvimento)
- Estrutura inicial de pastas do repositório

> Pendente: atualizar esta seção conforme IA for usada em tarefas específicas de
> código, para deixar claro exatamente quais partes tiveram assistência e quais
> foram feitas sem IA.

## Informações da equipe

| Nome | Login 42 | Papel(is) | Responsabilidades |
|------|----------|-----------|--------------------|
| Renan | resilva | — | — |
| Pedro | pebarbos | — | — |

> Pendente: preencher conforme o grupo fechar (4-5 membros exigidos pelo subject).

## Gestão do projeto

- **Organização do trabalho:** a definir
- **Ferramentas de gestão:** a definir (ex: GitHub Issues, Trello, GitHub Projects)
- **Canais de comunicação:** a definir (ex: Discord, WhatsApp)

> Pendente: preencher assim que o fluxo de trabalho da equipe for definido.

## Stack técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|----------------|
| Frontend | React + TypeScript | Framework reconhecido pelo subject, tipagem ajuda na validação de dados no cliente |
| Backend | FastAPI (Python) | Suporte nativo a WebSocket (via Starlette), assíncrono por padrão — importante para múltiplos usuários simultâneos |
| Banco de dados | PostgreSQL | Relacional, schema bem definido, atende à exigência de "clear schema and well-defined relations" |
| Real-time | WebSockets | Necessário para desenho ao vivo, chat e timers sincronizados |
| Containerização | Docker / Docker Compose | Deploy com um único comando, isolamento de serviços |
| Proxy / HTTPS | Nginx | Exigência de HTTPS em todas as conexões externas ao backend |

## Schema do banco de dados

> Pendente: adicionar diagrama (ER) e detalhamento de tabelas assim que o
> schema for implementado. Rascunho inicial de entidades previstas:
> - `users` (id, email, password_hash, username, created_at, ...)
> - `friendships` (user_id, friend_id, status)
> - `rooms` (id, status, created_at, ...)
> - `games` (id, room_id, started_at, ended_at)
> - `rounds` (id, game_id, drawer_id, word, started_at, ended_at)
> - `round_guesses` (id, round_id, user_id, guessed_at, points_awarded)
> - `game_stats` (user_id, games_played, wins, total_points, ...)

## Lista de funcionalidades

> Pendente: preencher conforme as funcionalidades forem implementadas, com
> descrição breve e responsável(is) por cada uma.

| Funcionalidade | Descrição | Responsável(is) |
|----------------|-----------|------------------|
| — | — | — |

## Módulos

**Meta:** 14+ pontos

| Módulo | Categoria | Tipo | Pts | Justificativa | Responsável(is) |
|--------|-----------|------|-----|----------------|------------------|
| Jogo web completo (Gartic) | Gaming | Major | 2 | Core do projeto | — |
| Multiplayer 3+ jogadores | Gaming | Major | 2 | Salas com 3+ jogadores simultâneos | — |
| Remote players | Gaming | Major | 2 | Jogadores remotos em tempo real | — |
| Framework frontend + backend | Web | Major | 2 | React + FastAPI | — |
| WebSockets real-time | Web | Major | 2 | Base do jogo em tempo real | — |
| User interaction (chat + perfil + amigos) | Web | Major | 2 | Chat, perfis e sistema de amigos | — |
| Game statistics & match history | User Mgmt | Minor | 1 | Histórico de partidas por usuário | — |
| Gamification (badges, XP, leaderboard) | Gaming | Minor | 1 | Engajamento e progressão | — |
| Spectator mode | Gaming | Minor | 1 | Quem não desenha acompanha ao vivo | — |
| GDPR compliance (apagar conta/dados) | Data | Minor | 1 | Exclusão de conta/dados do usuário | — |

> Pendente: preencher "Como foi implementado" e responsáveis conforme o
> desenvolvimento avança. Módulos com risco de sobreposição (ex: Remote
> players vs Multiplayer 3+) terão a justificativa detalhada aqui para a defesa.

## Contribuições individuais

> Pendente: preencher ao final do projeto, com detalhamento por membro —
> funcionalidades/módulos implementados, desafios enfrentados e como foram
> superados.

## Privacidade e Termos

- [Política de Privacidade](./docs/privacy-policy.md)
- [Termos de Serviço](./docs/terms-of-service.md)

## Licença

A definir.
- Chat de palpites com pontuação por velocidade de acerto
- Perfis de usuário, lista de amigos e histórico de partidas
- Leaderboard e sistema de gamificação (badges/XP)
- Modo espectador

> Pendente: preencher/expandir conforme o jogo evolui.

## Instruções

### Pré-requisitos
- Docker e Docker Compose instalados
- Git

### Configuração
1. Clonar o repositório:
   ```bash
   git clone <repo-url>
   cd ft_transcendence
   ```
2. Copiar o arquivo de variáveis de ambiente de exemplo e preencher os valores:
   ```bash
   cp .env.example .env
   ```
3. Subir o projeto com um único comando:
   ```bash
   docker compose up --build
   ```
4. Acessar a aplicação em `https://localhost`.

> Pendente: detalhar variáveis específicas do `.env.example` conforme forem criadas.

## Recursos

### Referências
- Documentação oficial do FastAPI: https://fastapi.tiangolo.com
- Documentação oficial do React: https://react.dev
- Documentação do PostgreSQL: https://www.postgresql.org/docs/
- MDN — WebSockets API: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API

> Pendente: adicionar artigos/tutoriais específicos usados durante o desenvolvimento.

### Uso de IA
Este projeto utilizou assistência de IA (Claude, Anthropic) durante o
planejamento, nas seguintes tarefas:
- Estruturação inicial do esboço do projeto e do README
- Avaliação de trade-offs na escolha de módulos do subject (pontuação,
  dependências entre módulos, riscos de sobreposição)
- Definição da ordem de construção do projeto (roadmap de desenvolvimento)
- Estrutura inicial de pastas do repositório

> Pendente: atualizar esta seção conforme IA for usada em tarefas específicas de
> código, para deixar claro exatamente quais partes tiveram assistência e quais
> foram feitas sem IA.

## Informações da equipe

| Nome | Login 42 | Papel(is) | Responsabilidades |
|------|----------|-----------|--------------------|
| Renan | resilva | Technical Lead | — |
| Pedro | pebarbos | Product Owner | — |
| Thiago | thevaris | Project Manager | -|
| Carlos | carlos-j  | Developer | - |    



> Pendente: preencher conforme o grupo fechar (4-5 membros exigidos pelo subject).

## Gestão do projeto

- **Organização do trabalho:** a definir
- **Ferramentas de gestão:** a definir (ex: GitHub Issues, Trello, GitHub Projects)
- **Canais de comunicação:** a definir (ex: Discord, WhatsApp)

> Pendente: preencher assim que o fluxo de trabalho da equipe for definido.

## Stack técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|----------------|
| Frontend | React + TypeScript | Framework reconhecido pelo subject, tipagem ajuda na validação de dados no cliente |
| Backend | FastAPI (Python) | Suporte nativo a WebSocket (via Starlette), assíncrono por padrão — importante para múltiplos usuários simultâneos |
| Banco de dados | PostgreSQL | Relacional, schema bem definido, atende à exigência de "clear schema and well-defined relations" |
| Real-time | WebSockets | Necessário para desenho ao vivo, chat e timers sincronizados |
| Containerização | Docker / Docker Compose | Deploy com um único comando, isolamento de serviços |
| Proxy / HTTPS | Nginx | Exigência de HTTPS em todas as conexões externas ao backend |

## Schema do banco de dados

> Pendente: adicionar diagrama (ER) e detalhamento de tabelas assim que o
> schema for implementado. Rascunho inicial de entidades previstas:
> - `users` (id, email, password_hash, username, created_at, ...)
> - `friendships` (user_id, friend_id, status)
> - `rooms` (id, status, created_at, ...)
> - `games` (id, room_id, started_at, ended_at)
> - `rounds` (id, game_id, drawer_id, word, started_at, ended_at)
> - `round_guesses` (id, round_id, user_id, guessed_at, points_awarded)
> - `game_stats` (user_id, games_played, wins, total_points, ...)

## Lista de funcionalidades

> Pendente: preencher conforme as funcionalidades forem implementadas, com
> descrição breve e responsável(is) por cada uma.

| Funcionalidade | Descrição | Responsável(is) |
|----------------|-----------|------------------|
| — | — | — |

## Módulos

**Meta:** 14+ pontos

| Módulo | Categoria | Tipo | Pts | Justificativa | Responsável(is) |
|--------|-----------|------|-----|----------------|------------------|
| Jogo web completo (Gartic) | Gaming | Major | 2 | Core do projeto | — |
| Multiplayer 3+ jogadores | Gaming | Major | 2 | Salas com 3+ jogadores simultâneos | — |
| Remote players | Gaming | Major | 2 | Jogadores remotos em tempo real | — |
| Framework frontend + backend | Web | Major | 2 | React + FastAPI | — |
| WebSockets real-time | Web | Major | 2 | Base do jogo em tempo real | — |
| User interaction (chat + perfil + amigos) | Web | Major | 2 | Chat, perfis e sistema de amigos | — |
| Game statistics & match history | User Mgmt | Minor | 1 | Histórico de partidas por usuário | — |
| Gamification (badges, XP, leaderboard) | Gaming | Minor | 1 | Engajamento e progressão | — |
| Spectator mode | Gaming | Minor | 1 | Quem não desenha acompanha ao vivo | — |
| GDPR compliance (apagar conta/dados) | Data | Minor | 1 | Exclusão de conta/dados do usuário | — |

> Pendente: preencher "Como foi implementado" e responsáveis conforme o
> desenvolvimento avança. Módulos com risco de sobreposição (ex: Remote
> players vs Multiplayer 3+) terão a justificativa detalhada aqui para a defesa.

## Contribuições individuais

> Pendente: preencher ao final do projeto, com detalhamento por membro —
> funcionalidades/módulos implementados, desafios enfrentados e como foram
> superados.

## Privacidade e Termos

- [Política de Privacidade](./docs/privacy-policy.md)
- [Termos de Serviço](./docs/terms-of-service.md)

## Licença

A definir.
