/**
 * Get the user's email from localStorage
 */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('user_email')
}

/**
 * Get the first letter of the user's email (uppercase)
 * Returns 'U' as default if email is not available
 */
export function getUserInitial(): string {
  const email = getUserEmail()
  if (!email || email.length === 0) return 'U'
  return email.charAt(0).toUpperCase()
}

