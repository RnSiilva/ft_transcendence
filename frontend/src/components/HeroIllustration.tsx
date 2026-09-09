import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

const SLOT_X = [324, 351, 378, 405]

const TROPHY_D =
  'M62.11,53.93c22.582-3.125,22.304-23.471,18.152-29.929-4.166-6.444-10.36-2.153-10.36-2.153v-4.166H30.099v4.166s-6.194-4.291-10.36,2.153c-4.152,6.458-4.43,26.804,18.152,29.929l5.236,7.777v8.249s-.944,4.597-4.833,4.986c-3.903,.389-7.791,4.028-7.791,7.374h38.997c0-3.347-3.889-6.986-7.791-7.374-3.889-.389-4.833-4.986-4.833-4.986v-8.249l5.236-7.777Zm7.388-24.818s2.833-3.097,5.111-1.347c2.292,1.75,2.292,15.86-8.999,18.138l3.889-16.791Zm-44.108-1.347c2.278-1.75,5.111,1.347,5.111,1.347l3.889,16.791c-11.291-2.278-11.291-16.388-8.999-18.138Z'

const RANKS = [
  { n: 1, initial: 'G', name: 'garatuja_pro', pts: 140, tier: '#FFC93C' },
  { n: 2, initial: 'D', name: 'duck_master', pts: 120, tier: '#C7CDD6' },
  { n: 3, initial: 'P', name: 'pixel_ninja', pts: 95, tier: '#D8925A' },
]

function HeroIllustration() {
  const { t } = useLanguage()
  const word = t('promo.word') // 4 letras, traduzida (NAVE / SHIP / NAVE)

  // Cronómetro demo: 80 → 77 e volta a 80, em loop.
  const [seconds, setSeconds] = useState(80)
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 77 ? 80 : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <svg
      className="promo-illustration"
      viewBox="0 0 800 450"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Ilustração do jogo: um jogador desenha, os outros adivinham e há um ranking final"
    >
      {/* pílulas de estado: palavra a revelar-se letra a letra + cronómetro */}
      <g fontFamily="'JetBrains Mono',monospace" fontSize="17" fontWeight="700" textAnchor="middle">
        <rect x="290" y="24" width="150" height="34" rx="17" fill="#1B1D24" stroke="rgba(245,243,238,0.18)" />
        {word.split('').slice(0, 4).map((letter, i) => (
          <g key={i} fill="#FFC93C">
            <text x={SLOT_X[i]} y="49">_</text>
            <text className={`promo-letter promo-l${i + 1}`} x={SLOT_X[i]} y="46">{letter}</text>
          </g>
        ))}
        <rect x="620" y="24" width="76" height="34" rx="17" fill="#1B1D24" stroke="rgba(245,243,238,0.18)" />
        <text x="658" y="47" fill="#FF4B3E">{seconds}s</text>
      </g>

      {/* quadro de desenho */}
      <g transform="translate(290 245) rotate(-3)">
        <rect x="-180" y="-135" width="360" height="256" rx="18" fill="rgba(0,0,0,0.35)" transform="translate(8 10)" />
        <rect x="-180" y="-135" width="360" height="256" rx="18" fill="#FAF7F0" />

        {/* foguetão em garatuja — desenha-se em loop */}
        <g transform="translate(-14 -8) rotate(14)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="promo-doodle" pathLength={1} d="M0 -92 C 26 -62 32 -14 20 36 L -20 36 C -32 -14 -26 -62 0 -92 Z" stroke="#FF4B3E" strokeWidth="6.5" />
          <circle className="promo-doodle" pathLength={1} cx="0" cy="-30" r="13" stroke="#3EC1D3" strokeWidth="6" style={{ animationDelay: '.35s' }} />
          <path className="promo-doodle" pathLength={1} d="M-20 4 C -42 14 -48 36 -44 54 C -34 46 -26 42 -20 36" stroke="#FFC93C" strokeWidth="6" style={{ animationDelay: '.6s' }} />
          <path className="promo-doodle" pathLength={1} d="M20 4 C 42 14 48 36 44 54 C 34 46 26 42 20 36" stroke="#FFC93C" strokeWidth="6" style={{ animationDelay: '.75s' }} />
          <path className="promo-doodle" pathLength={1} d="M-10 40 C -13 64 13 64 10 40" stroke="#FFC93C" strokeWidth="6" style={{ animationDelay: '1s' }} />
          <path className="promo-doodle" pathLength={1} d="M-4 42 C -5 55 5 55 4 42" stroke="#FF4B3E" strokeWidth="5" style={{ animationDelay: '1.15s' }} />
        </g>

        {/* estrelinhas no papel */}
        <g strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path className="promo-doodle" pathLength={1} d="M108 -84 v18 M99 -75 h18" stroke="#3EC1D3" style={{ animationDelay: '1.4s' }} />
          <path className="promo-doodle" pathLength={1} d="M-124 62 v16 M-132 70 h16" stroke="#FF4B3E" style={{ animationDelay: '1.6s' }} />
          <path className="promo-doodle" pathLength={1} d="M-134 -90 v14 M-141 -83 h14" stroke="#FFC93C" style={{ animationDelay: '1.8s' }} />
        </g>
      </g>

      {/* lápis a desenhar (amarelo) */}
      <g transform="translate(452 352) rotate(-38)">
        <rect x="-9" y="-70" width="18" height="58" rx="4" fill="#FFC93C" />
        <rect x="-9" y="-78" width="18" height="10" rx="4" fill="#FF4B3E" />
        <path d="M-9 -12 L0 8 L9 -12 Z" fill="#FAF7F0" />
        <path d="M-3.5 0 L0 8 L3.5 0 Z" fill="#15161B" />
      </g>

      {/* balões de palpite dos 4 jogadores (P ?, R ✓, C …, T !) */}
      <g className="promo-bubble">
        <circle cx="70" cy="188" r="17" fill="#1B1D24" stroke="#3EC1D3" strokeWidth="2" />
        <text x="70" y="194" textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="15" fontWeight="700" fill="#F5F3EE">P</text>
        <rect x="50" y="110" width="72" height="46" rx="15" fill="#3EC1D3" />
        <path d="M72 156 L66 170 L86 156 Z" fill="#3EC1D3" />
        <text x="86" y="142" textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="26" fontWeight="800" fill="#15161B">?</text>
      </g>

      <g className="promo-bubble" style={{ animationDelay: '.8s' }}>
        <circle cx="44" cy="296" r="17" fill="#1B1D24" stroke="#6BCB77" strokeWidth="2" />
        <text x="44" y="302" textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="15" fontWeight="700" fill="#F5F3EE">R</text>
        <rect x="54" y="240" width="64" height="44" rx="14" fill="#6BCB77" />
        <path d="M76 284 L70 296 L90 284 Z" fill="#6BCB77" />
        <path d="M70 264 L80 274 L98 252" fill="none" stroke="#15161B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g className="promo-bubble" style={{ animationDelay: '1.6s' }}>
        <circle cx="96" cy="382" r="17" fill="#1B1D24" stroke="#FFC93C" strokeWidth="2" />
        <text x="96" y="388" textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="15" fontWeight="700" fill="#F5F3EE">C</text>
        <rect x="114" y="336" width="64" height="42" rx="14" fill="#FFC93C" />
        <path d="M132 378 L126 390 L146 378 Z" fill="#FFC93C" />
        <g fill="#15161B">
          <circle cx="132" cy="357" r="3.5" />
          <circle cx="146" cy="357" r="3.5" />
          <circle cx="160" cy="357" r="3.5" />
        </g>
      </g>

      <g className="promo-bubble" style={{ animationDelay: '2.4s' }}>
        <circle cx="200" cy="406" r="16" fill="#1B1D24" stroke="#FF4B3E" strokeWidth="2" />
        <text x="200" y="412" textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="14" fontWeight="700" fill="#F5F3EE">T</text>
        <rect x="218" y="352" width="58" height="40" rx="13" fill="#FF4B3E" />
        <path d="M238 392 L226 402 L256 392 Z" fill="#FF4B3E" />
        <text x="247" y="380" textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="23" fontWeight="800" fill="#15161B">!</text>
      </g>

      {/* troféu com estrela giratória (eco do fim de jogo) */}
      <g>
        <g className="promo-star">
          <rect x="617" y="106" width="70" height="70" fill="#FF4B3E" />
          <rect x="617" y="106" width="70" height="70" fill="#FF4B3E" transform="rotate(45 652 141)" />
        </g>
        <g transform="translate(607 96)">
          <path d={TROPHY_D} fill="#FFC93C" transform="scale(0.9)" />
        </g>
      </g>

      {/* ranking a aparecer lugar a lugar */}
      <g fontFamily="'Plus Jakarta Sans',sans-serif">
        {RANKS.map((rank, i) => {
          const y = 232 + i * 52
          return (
            <g key={rank.n} className={`promo-rank promo-rank-${i + 1}`}>
              <rect x="545" y={y} width="215" height="42" rx="12" fill="#1B1D24" stroke={rank.tier} strokeWidth="1.5" />
              <text x="568" y={y + 27} fontFamily="'JetBrains Mono',monospace" fontSize="15" fontWeight="700" fill={rank.tier} textAnchor="middle">#{rank.n}</text>
              <circle cx="596" cy={y + 21} r="13" fill="#121317" stroke="rgba(245,243,238,0.18)" strokeWidth="1.5" />
              <text x="596" y={y + 26} textAnchor="middle" fontFamily="'Baloo 2',sans-serif" fontSize="12" fontWeight="700" fill="#F5F3EE">{rank.initial}</text>
              <text x="618" y={y + 26} fontSize="14" fontWeight="600" fill="#F5F3EE">{rank.name}</text>
              <text x="748" y={y + 26} fontFamily="'JetBrains Mono',monospace" fontSize="13" fill="#A9A7B0" textAnchor="end">{rank.pts}</text>
            </g>
          )
        })}
      </g>

      {/* estrelinhas nas 4 cores (fora do quadro) */}
      <g strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M44 70 v20 M34 80 h20" stroke="#FF4B3E" />
        <path d="M770 76 v16 M762 84 h16" stroke="#FFC93C" />
        <path d="M508 96 v18 M499 105 h18" stroke="#3EC1D3" />
      </g>
    </svg>
  )
}

export default HeroIllustration
