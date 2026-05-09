export default function ScoreRing({ score }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(score, 100) / 100) * circ;

  const color =
    score >= 80 ? "var(--green)" :
    score >= 60 ? "var(--yellow)" :
    score >= 40 ? "var(--orange)" : "var(--red)";

  return (
    <svg className="score-ring-svg" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={radius} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fill={color} fontSize="13" fontWeight="700">
        {score}%
      </text>
    </svg>
  );
}
