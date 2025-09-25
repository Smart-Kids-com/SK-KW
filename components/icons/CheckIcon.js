export default function CheckIcon({ size = 24, color = "#428445" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke={color} fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}