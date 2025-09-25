export default function SearchIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" width={size} height={size} stroke={color}>
      <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}