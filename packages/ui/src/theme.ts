export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "veritas-theme";

/**
 * Runs inline in <head> before paint so the page never flashes the wrong
 * theme. Storage can throw (private mode, blocked site data), so it is guarded.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
