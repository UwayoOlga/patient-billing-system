export function getUser() {
  try {
    const raw = localStorage.getItem('hb_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUser(data) {
  localStorage.setItem('hb_user', JSON.stringify(data))
}

export function getToken() {
  return getUser()?.token ?? null
}

export function logout() {
  localStorage.removeItem('hb_user')
}
