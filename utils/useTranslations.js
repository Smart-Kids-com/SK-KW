import { useRouter } from 'next/router'
import en from '../public/locales/en/default.json'
import ar from '../public/locales/ar/default.json'
const translations = { en, ar }
export function useTranslations() {
  const { locale } = useRouter()
  return (key) => translations[locale][key] || key
}