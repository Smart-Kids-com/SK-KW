import '../styles/globals.css'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  const { locale } = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    }
  }, [locale])

  return <Component {...pageProps} />
}