"use client";

import Link, { useRouter } from 'next/navigation'
export default function LanguageSwitcher() {
  const router = useRouter()
  const { locale, asPath } = router

  const switchTo = locale === 'ar' ? 'en' : 'ar'
  const label = switchTo === 'ar' ? 'العربية' : 'English'
  return (
    <button
      onClick={() => router.push(asPath, asPath, { locale: switchTo })}
      style={{
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '1rem'
      }}
      aria-label={`Switch to ${label}`}
    >
      {label}
    </button>
  )
}