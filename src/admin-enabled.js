/** Client-side: exposed via Vite envPrefix ENABLE_ */
export function isAdminEnabled() {
  return import.meta.env.ENABLE_ADMIN === "true";
}
