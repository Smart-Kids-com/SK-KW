export default function CartIcon({ size = 28, color = "currentColor" }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" width={size} height={size} stroke={color}>
      <circle cx="8.5" cy="20.5" r="1.5" fill={color} />
      <circle cx="18.5" cy="20.5" r="1.5" fill={color} />
      <path stroke={color} strokeWidth="1.5" d="M2 3h2l3.6 10.59a2 2 0 002 1.41h8.72a2 2 0 001.82-1.18l3.04-6.09A1 1 0 0022 7H6" />
    </svg>
  );
}