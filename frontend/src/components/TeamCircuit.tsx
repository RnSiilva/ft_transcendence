import type { CSSProperties } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import renanPhoto from '../assets/team/renan.png'
import pedroPhoto from '../assets/team/pedro.jpeg'
import thiagoPhoto from '../assets/team/thiago.png'
import carlosPhoto from '../assets/team/carlos.png'

// Secção "Equipa" da Home — mistura personalizada de 3 animações (Uiverse:
// Vosoone/circuito, Javierrocadev/cartão, vikas7754/LinkedIn em camadas):
// chip ao centro com traços a fluir na cor de cada membro até ao seu cartão.

type Member = {
  name: string
  login: string
  role: string
  linkedin: string
  color: string
  colorDark: string
  initial: string
  photo?: string // foto local (ex.: import de src/assets/team/); sem foto mostra a inicial
}

const MEMBERS: Member[] = [
  { name: 'Renan', login: 'resilva', role: 'Technical Lead', linkedin: 'https://www.linkedin.com/in/resilva00', color: '#FF4B3E', colorDark: '#A82E24', initial: 'R', photo: renanPhoto },
  { name: 'Pedro', login: 'pebarbos', role: 'Product Owner', linkedin: 'https://www.linkedin.com/in/pebarbosalves/', color: '#FFC93C', colorDark: '#C79420', initial: 'P', photo: pedroPhoto },
  { name: 'Thiago', login: 'thevaris', role: 'Project Manager', linkedin: 'https://www.linkedin.com/in/thiagothevaris/', color: '#3EC1D3', colorDark: '#2A8A98', initial: 'T', photo: thiagoPhoto },
  { name: 'Carlos', login: 'carlos-j', role: 'Developer', linkedin: 'https://www.linkedin.com/in/carlosjpereira', color: '#6BCB77', colorDark: '#3F9A4C', initial: 'C', photo: carlosPhoto },
]

const MASCOT_D =
  'M 50.4 51 C 40.5 49.1 40 46 40 44 v -1.2 a 18.9 18.9 0 0 0 5.7 -8.8 h 0.1 c 3 0 3.8 -6.3 3.8 -7.3 s 0.1 -4.7 -3 -4.7 C 53 4 30 0 22.3 6 c -5.4 0 -5.9 8 -3.9 16 c -3.1 0 -3 3.8 -3 4.7 s 0.7 7.3 3.8 7.3 c 1 3.6 2.3 6.9 4.7 9 v 1.2 c 0 2 0.5 5 -9.5 6.8 S 2 62 2 62 h 60 a 14.6 14.6 0 0 0 -11.6 -11 z'

const LINKEDIN_ICON_D =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'

// 2 traços por membro: começam na borda do SVG (lado do cartão) e entram nos
// pinos do chip. Cores = cor do membro; delays desfasados para "vida".
const TRACES = [
  { d: 'M8 90 H150 V210 H326', member: 0, delay: '0s', dot: [8, 90] },
  { d: 'M8 160 H190 V230 H326', member: 0, delay: '.5s', dot: [8, 160] },
  { d: 'M8 340 H190 V250 H326', member: 1, delay: '.25s', dot: [8, 340] },
  { d: 'M8 410 H150 V270 H326', member: 1, delay: '.75s', dot: [8, 410] },
  { d: 'M792 90 H650 V210 H474', member: 2, delay: '.15s', dot: [792, 90] },
  { d: 'M792 160 H610 V230 H474', member: 2, delay: '.65s', dot: [792, 160] },
  { d: 'M792 340 H610 V250 H474', member: 3, delay: '.4s', dot: [792, 340] },
  { d: 'M792 410 H650 V270 H474', member: 3, delay: '.9s', dot: [792, 410] },
] as const

const PIN_YS = [205, 225, 245, 265]

// Versão vertical do circuito (telemóvel): 2 cartões em cima, chip no meio
// (texto horizontal), 2 cartões em baixo. Traços sobem/descem para os pinos.
const V_TRACES = [
  { d: 'M90 8 V60 H160 V130', member: 0, delay: '0s', dot: [90, 8] },
  { d: 'M140 8 V95 H190 V130', member: 0, delay: '.5s', dot: [140, 8] },
  { d: 'M310 8 V60 H250 V130', member: 1, delay: '.25s', dot: [310, 8] },
  { d: 'M260 8 V95 H220 V130', member: 1, delay: '.75s', dot: [260, 8] },
  { d: 'M90 372 V320 H160 V250', member: 2, delay: '.15s', dot: [90, 372] },
  { d: 'M140 372 V285 H190 V250', member: 2, delay: '.65s', dot: [140, 372] },
  { d: 'M310 372 V320 H250 V250', member: 3, delay: '.4s', dot: [310, 372] },
  { d: 'M260 372 V285 H220 V250', member: 3, delay: '.9s', dot: [260, 372] },
] as const

const V_PIN_XS = [156, 186, 216, 246]

function TeamCard({ member }: { member: Member }) {
  return (
    <div
      className="team-slot"
      style={{
        '--member-color': member.color,
        '--member-color-dark': member.colorDark,
      } as CSSProperties}
    >
      <div className="team-card">
        <div className="team-card-top">
          <span className="team-card-initial">{member.role}</span>
          <p className="team-card-login">{member.login}</p>
        </div>
        <div className="team-card-links">
          <span className="team-photo">
            <span className="team-photo-inner">
              {member.photo ? <img src={member.photo} alt={member.name} /> : member.initial}
            </span>
          </span>
          <div className="team-linkedin-container">
            <div className="team-tooltip">
              <div className="profile">
                <div className="user">
                  <div className="img">
                    {member.photo ? <img src={member.photo} alt="" /> : member.initial}
                  </div>
                  <div className="details">
                    <div className="name">{member.name}</div>
                    <div className="username">@{member.login}</div>
                  </div>
                </div>
                <div className="connections">500+ Connections</div>
              </div>
            </div>
            <a
              className="team-icon-in"
              href={member.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label={`LinkedIn de ${member.name}`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d={LINKEDIN_ICON_D} />
              </svg>
            </a>
          </div>
        </div>
        <div className="team-mascot-clip" aria-hidden="true">
          <svg className="team-mascot back" viewBox="0 0 64 64">
            <path d={MASCOT_D} strokeMiterlimit={10} strokeWidth={5} />
          </svg>
          <svg className="team-mascot front" viewBox="0 0 64 64">
            <path d={MASCOT_D} strokeMiterlimit={10} strokeWidth={2} />
          </svg>
        </div>
      </div>

      <div className="team-caption">
        <b>{member.name}</b>
        <span>{member.role}</span>
      </div>
    </div>
  )
}

function TeamCircuit() {
  const { t } = useLanguage()

  return (
    <div className="team-section">
      <div className="team-circuit">
        <div className="team-col">
          <TeamCard member={MEMBERS[0]} />
          <TeamCard member={MEMBERS[1]} />
        </div>

        <div className="team-chip">
          <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="teamChipGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d2d2d" />
                <stop offset="100%" stopColor="#0f0f0f" />
              </linearGradient>
              <linearGradient id="teamTextGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eeeeee" />
                <stop offset="100%" stopColor="#888888" />
              </linearGradient>
              <linearGradient id="teamPinGradient" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#bbbbbb" />
                <stop offset="50%" stopColor="#888888" />
                <stop offset="100%" stopColor="#555555" />
              </linearGradient>
            </defs>

            <g>
              {TRACES.map((trace, i) => (
                <g key={i}>
                  <path className="trace-bg" d={trace.d} />
                  <path
                    className="trace-flow"
                    d={trace.d}
                    style={{
                      stroke: MEMBERS[trace.member].color,
                      color: MEMBERS[trace.member].color,
                      animationDelay: trace.delay,
                    }}
                  />
                </g>
              ))}
            </g>

            <rect
              x="330"
              y="190"
              width="140"
              height="100"
              rx="20"
              ry="20"
              fill="url(#teamChipGradient)"
              stroke="#222"
              strokeWidth="3"
              filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))"
            />

            {PIN_YS.map((y) => (
              <rect key={`l${y}`} x="322" y={y} width="8" height="10" fill="url(#teamPinGradient)" rx="2" />
            ))}
            {PIN_YS.map((y) => (
              <rect key={`r${y}`} x="470" y={y} width="8" height="10" fill="url(#teamPinGradient)" rx="2" />
            ))}

            <text
              x="400"
              y="248"
              fontFamily="'Baloo 2', system-ui, sans-serif"
              fontSize="26"
              fontWeight="700"
              fill="url(#teamTextGradient)"
              textAnchor="middle"
            >
              {t('team.title')}
            </text>

            {TRACES.map((trace, i) => (
              <circle
                key={`dot${i}`}
                cx={trace.dot[0]}
                cy={trace.dot[1]}
                r="5"
                fill={MEMBERS[trace.member].color}
              />
            ))}
          </svg>
        </div>

        <div className="team-chip-vertical">
          <svg viewBox="0 0 400 380" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="teamChipGradientV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d2d2d" />
                <stop offset="100%" stopColor="#0f0f0f" />
              </linearGradient>
              <linearGradient id="teamTextGradientV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eeeeee" />
                <stop offset="100%" stopColor="#888888" />
              </linearGradient>
              <linearGradient id="teamPinGradientV" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#bbbbbb" />
                <stop offset="50%" stopColor="#888888" />
                <stop offset="100%" stopColor="#555555" />
              </linearGradient>
            </defs>

            <g>
              {V_TRACES.map((trace, i) => (
                <g key={i}>
                  <path className="trace-bg" d={trace.d} />
                  <path
                    className="trace-flow"
                    d={trace.d}
                    style={{
                      stroke: MEMBERS[trace.member].color,
                      color: MEMBERS[trace.member].color,
                      animationDelay: trace.delay,
                    }}
                  />
                </g>
              ))}
            </g>

            <rect
              x="130"
              y="140"
              width="140"
              height="100"
              rx="20"
              ry="20"
              fill="url(#teamChipGradientV)"
              stroke="#222"
              strokeWidth="3"
              filter="drop-shadow(0 0 6px rgba(0,0,0,0.8))"
            />

            {V_PIN_XS.map((x) => (
              <rect key={`t${x}`} x={x - 4} y="129" width="8" height="10" fill="url(#teamPinGradientV)" rx="2" />
            ))}
            {V_PIN_XS.map((x) => (
              <rect key={`b${x}`} x={x - 4} y="241" width="8" height="10" fill="url(#teamPinGradientV)" rx="2" />
            ))}

            <text
              x="200"
              y="198"
              fontFamily="'Baloo 2', system-ui, sans-serif"
              fontSize="24"
              fontWeight="700"
              fill="url(#teamTextGradientV)"
              textAnchor="middle"
            >
              {t('team.title')}
            </text>

            {V_TRACES.map((trace, i) => (
              <circle
                key={`dot${i}`}
                cx={trace.dot[0]}
                cy={trace.dot[1]}
                r="5"
                fill={MEMBERS[trace.member].color}
              />
            ))}
          </svg>
        </div>

        <div className="team-col team-col-right">
          <TeamCard member={MEMBERS[2]} />
          <TeamCard member={MEMBERS[3]} />
        </div>
      </div>
    </div>
  )
}

export default TeamCircuit
