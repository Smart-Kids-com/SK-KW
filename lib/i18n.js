import ar from "../locales/ar.json";
import en from "../locales/en.json";

// Example usage: t("cart.empty", "ar")
export function t(key, locale = "ar") {
  const dict = locale === "ar" ? ar : en;
  return key.split(".").reduce((o, i) => (o ? o[i] : undefined), dict) || key;
}