import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Firebase is not loaded in tests: stub the auth client
vi.mock('../../services/auth-client', () => ({
  authClient: { signOut: vi.fn(async () => {}), clearSession: vi.fn() },
  waitForAuthReady: vi.fn(async () => {}),
  onOAuthToken: vi.fn(),
  onRedirectError: vi.fn()
}))

import { authClient } from '../../services/auth-client'
import { useAuthStore } from '../auth'

describe('handleUnauthorized', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('signs out of Firebase too, so a reload cannot sign the user straight back in (reload loop)', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'u1', email: 'a@b.c' }
    await auth.handleUnauthorized()
    expect(authClient.signOut).toHaveBeenCalledTimes(1)
    expect(auth.user).toBeNull()
    expect(auth.error).toMatch(/sign in again/)
  })

  it('acts once when several API calls fail together', async () => {
    const auth = useAuthStore()
    await Promise.all([auth.handleUnauthorized(), auth.handleUnauthorized(), auth.handleUnauthorized()])
    expect(authClient.signOut).toHaveBeenCalledTimes(1)
  })
})
