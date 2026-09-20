// Text in the SketchGuess logo stroke style: outlined letters, one project
// color per letter, with the continuous drawing animation (used in the About
// us page title, with a reflection).

const LETTER_COLORS = ['#FF4B3E', '#3EC1D3', '#FFC93C', '#6BCB77']

function SketchText({ text }: { text: string }) {
  const width = Math.max(text.length * 46 + 24, 140)
  let colorIndex = 0
  return (
    <svg
      className="sketch-text"
      viewBox={`0 0 ${width} 78`}
      width={width}
      height={78}
      aria-hidden="true"
    >
      <text x={width / 2} y="64" textAnchor="middle">
        {text.split('').map((ch, i) => {
          if (ch === ' ') return <tspan key={i}>{' '}</tspan>
          const color = LETTER_COLORS[colorIndex++ % LETTER_COLORS.length]
          return (
            <tspan key={i} style={{ stroke: color }}>
              {ch}
            </tspan>
          )
        })}
      </text>
    </svg>
  )
}

export default SketchText
