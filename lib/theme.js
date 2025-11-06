// lib/theme.js

export const theme = {
  colors: {
    // ألوان واجهة SK الأساسية (متوافقة مع globals.css)
    bg: "#370e3e",
    text: "#ffffff",
    button: "#9422af",
    buttonLabel: "#ffffff",

    // إضافية
    primary: "#5a0664",
    secondary: "#6c50b5",
    gold: "#FFC033",
    lavender1: "#cfc9ff",
    lavender2: "#bdb7ff",
    navy1: "#081a36",
    navy2: "#122a52",

    // قديمة (للتوافق مع استخدامات سابقة)
    accent: "#ffd94d",
    light: "#f7e8ff",
    dark: "#1b043d",
    white: "#ffffff",
    error: "#EB001B",
    success: "#2ee86c",
  },

  fonts: {
    heading: "'Assistant', system-ui, Arial, sans-serif",
    body: "'Amiri', system-ui, Arial, sans-serif",
  },

  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },

  borderRadius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    card: "14px",
    button: "9999px", // pill
    media: "10px",
  },

  border: {
    width: "2px",
    color: "rgba(255,255,255,.35)",
    colorDark: "rgba(0,0,0,.12)",
  },

  boxShadow: {
    sm: "0 2px 8px rgba(0,0,0,.08)",
    md: "0 6px 20px rgba(0,0,0,.14)",
    lg: "0 12px 32px rgba(0,0,0,.24)",
    soft: "0 2px 16px #8b5d9e1a",
    strong: "0 4px 18px #6c50b555",
  },

  focus: {
    ring: "0 0 0 3px rgba(147, 51, 234, .35)",
  },
};

/**
 * يحقن قيم الثيم كـ CSS Variables على :root
 * استدعِه مرة واحدة في layout أو عند تحميل الصفحة (Client فقط).
 */
export function applyThemeVars(t = theme) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  const set = (k, v) => r.style.setProperty(k, String(v));

  // ألوان
  set("--bg", t.colors.bg);
  set("--text", t.colors.text);
  set("--btn", t.colors.button);
  set("--btn-label", t.colors.buttonLabel);
  set("--color-primary", t.colors.primary);
  set("--color-secondary", t.colors.secondary);
  set("--color-white", t.colors.white);
  set("--color-gray", "#6b7280");
  set("--color-gray-light", "#e5e7eb");

  // SK design tokens
  set("--sk-gold", t.colors.gold);
  set("--sk-purple-1", t.colors.primary);
  set("--sk-purple-2", t.colors.secondary);
  set("--sk-lavender-1", t.colors.lavender1);
  set("--sk-lavender-2", t.colors.lavender2);
  set("--sk-navy-1", t.colors.navy1);
  set("--sk-navy-2", t.colors.navy2);

  // تايبوجرافي
  set("--font-head", t.fonts.heading);
  set("--font-body", t.fonts.body);
  set("--body-scale", "120%");
  set("--head-scale", "110%");

  // لياوت
  set("--page-w", "1600px");
  set("--grid-x", "28px");
  set("--grid-y", "28px");
  set("--section-space", "4rem");

  // Inputs
  set("--input-radius", t.borderRadius.md);
  set("--input-border", "2px");
  set("--input-border-color", t.border.color);
  set("--input-shadow", t.boxShadow.md);

  // Cards / Media
  set("--card-radius", t.borderRadius.lg);
  set("--card-shadow", t.boxShadow.lg);
  set("--media-radius", t.borderRadius.media);
  set("--media-shadow", t.boxShadow.sm);

  // Drawer / Popup
  set("--drawer-border", `1px solid ${t.border.color}`);
  set("--drawer-shadow", "4px 4px 5px rgba(0,0,0,.80)");
  set("--popup-radius", "4px");
  set("--popup-border", "2px solid rgba(255,255,255,.25)");
  set("--popup-shadow", "16px 16px 5px rgba(0,0,0,.50)");

  // Badges
  set("--badge-radius", "2px");

  // Radii & Shadows الموحدة (utilities)
  set("--radius-sm", t.borderRadius.sm);
  set("--radius-md", t.borderRadius.md);
  set("--radius-lg", t.borderRadius.lg);
  set("--radius-xl", t.borderRadius.xl);

  set("--border-width", t.border.width);
  set("--border-color", t.border.color);
  set("--border-color-dark", t.border.colorDark);

  set("--shadow-sm", t.boxShadow.sm);
  set("--shadow-md", t.boxShadow.md);
  set("--shadow-lg", t.boxShadow.lg);

  set("--focus-ring", t.focus.ring);
}

/**
 * لو محتاج SSR: ترجع string تقدر تحطها داخل <style> في layout
 * (مفيدة لو عايز المتغيرات قبل hydration)
 */
export function themeVarsAsCss(t = theme) {
  const entries = {
    "--bg": t.colors.bg,
    "--text": t.colors.text,
    "--btn": t.colors.button,
    "--btn-label": t.colors.buttonLabel,
    "--color-primary": t.colors.primary,
    "--color-secondary": t.colors.secondary,
    "--color-white": t.colors.white,
    "--color-gray": "#6b7280",
    "--color-gray-light": "#e5e7eb",
    "--sk-gold": t.colors.gold,
    "--sk-purple-1": t.colors.primary,
    "--sk-purple-2": t.colors.secondary,
    "--sk-lavender-1": t.colors.lavender1,
    "--sk-lavender-2": t.colors.lavender2,
    "--sk-navy-1": t.colors.navy1,
    "--sk-navy-2": t.colors.navy2,
    "--font-head": t.fonts.heading,
    "--font-body": t.fonts.body,
    "--body-scale": "120%",
    "--head-scale": "110%",
    "--page-w": "1600px",
    "--grid-x": "28px",
    "--grid-y": "28px",
    "--section-space": "4rem",
    "--input-radius": t.borderRadius.md,
    "--input-border": "2px",
    "--input-border-color": t.border.color,
    "--input-shadow": t.boxShadow.md,
    "--card-radius": t.borderRadius.lg,
    "--card-shadow": t.boxShadow.lg,
    "--media-radius": t.borderRadius.media,
    "--media-shadow": t.boxShadow.sm,
    "--drawer-border": `1px solid ${t.border.color}`,
    "--drawer-shadow": "4px 4px 5px rgba(0,0,0,.80)",
    "--popup-radius": "4px",
    "--popup-border": "2px solid rgba(255,255,255,.25)",
    "--popup-shadow": "16px 16px 5px rgba(0,0,0,.50)",
    "--badge-radius": "2px",
    "--radius-sm": t.borderRadius.sm,
    "--radius-md": t.borderRadius.md,
    "--radius-lg": t.borderRadius.lg,
    "--radius-xl": t.borderRadius.xl,
    "--border-width": t.border.width,
    "--border-color": t.border.color,
    "--border-color-dark": t.border.colorDark,
    "--shadow-sm": t.boxShadow.sm,
    "--shadow-md": t.boxShadow.md,
    "--shadow-lg": t.boxShadow.lg,
    "--focus-ring": t.focus.ring,
  };

  const css = Object.entries(entries)
    .map(([k, v]) => `${k}:${v};`)
    .join("");

  return `:root{${css}}`;
}