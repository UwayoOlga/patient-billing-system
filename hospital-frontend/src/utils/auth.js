// Authentication utility using sessionStorage for enhanced security in a medical environment.
// sessionStorage ensures the session is cleared when the tab/browser is closed.

export function getUser() {
  try {
    const raw = sessionStorage.getItem('hb_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUser(data) {
  sessionStorage.setItem('hb_user', JSON.stringify(data))
}

export function getToken() {
  return getUser()?.token ?? null
}

export function logout() {
  sessionStorage.removeItem('hb_user')
  // Clear any other session data
  sessionStorage.clear()
}
