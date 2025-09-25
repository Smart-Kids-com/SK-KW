export default function ErrorIcon({ size = 22, color = "#EB001B" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke={color} fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2" />
      <path d="M8 8l8 8M16 8l-8 8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}