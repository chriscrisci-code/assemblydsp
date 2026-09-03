/** Server-side: admin UI/API only when ENABLE_ADMIN=true */
export function isAdminEnabled() {
  return process.env.ENABLE_ADMIN === "true";
}
