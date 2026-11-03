import { describe, it, expect, vi, beforeEach } from 'vitest'

// Firebase mocks: each test controls when the redirect result resolves
const firebaseAuth = vi.hoisted(() => ({
  signInWithRedirect: vi.fn(),
  reauthenticateWithRedirect: vi.fn(),
  linkWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: {
    credentialFromResult: vi.fn(),
    credentialFromError: vi.fn()
  }
}))
vi.mock('firebase/auth', () => firebaseAuth)
vi.mock('../firebase', () => ({
  auth: {},
  googleProvider: { id: 'google-signin' },
  githubProvider: { id: 'github-signin' },
  facebookProvider: { id: 'facebook-signin' },
  xProvider: { id: 'x-signin' },
  youtubeProvider: { id: 'google-youtube' }
}))

const FLAG = 'tunecraft_youtube_connect_pending'

// Loads a fresh auth-client whose redirect result settles only when the test says so
async function loadClient({ signedInUser = null } = {}) {
  vi.resetModules()
  let settle
  firebaseAuth.getRedirectResult.mockReturnValue(new Promise((resolve, reject) => {
    settle = { resolve, reject }
  }))
  firebaseAuth.onAuthStateChanged.mockImplementation((_auth, callback) => callback(signedInUser))

  const client = await import('../auth-client')
  const tokens = []
  client.onOAuthToken(token => tokens.push(token))
  return { client, tokens, settle }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('auth-client YouTube token handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('does not keep the token from a plain Google sign-in', async () => {
    firebaseAuth.GoogleAuthProvider.credentialFromResult.mockReturnValue({ accessToken: 'signin-token' })
    const { tokens, settle } = await loadClient()

    settle.resolve({ user: { uid: 'u1' } })
    await flush()

    expect(tokens).toEqual([])
  })

  it('keeps the token when the redirect came from Connect YouTube', async () => {
    sessionStorage.setItem(FLAG, '1')
    firebaseAuth.GoogleAuthProvider.credentialFromResult.mockReturnValue({ accessToken: 'yt-token' })
    const { tokens, settle } = await loadClient()

    settle.resolve({ user: { uid: 'u1' } })
    await flush()

    expect(tokens).toEqual(['yt-token'])
    expect(sessionStorage.getItem(FLAG)).toBeNull()
  })

  it('keeps the token when YouTube was connected with a different Google account', async () => {
    sessionStorage.setItem(FLAG, '1')
    firebaseAuth.GoogleAuthProvider.credentialFromError.mockReturnValue({ accessToken: 'other-account-token' })
    const { tokens, settle } = await loadClient()

    settle.reject({ code: 'auth/user-mismatch', message: 'mismatch' })
    await flush()

    expect(tokens).toEqual(['other-account-token'])
  })
})

describe('auth-client sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it.each([
    ['google', 'google-signin'],
    ['github', 'github-signin'],
    ['facebook', 'facebook-signin'],
    ['x', 'x-signin']
  ])('sends the %s button to its own provider', async (name, providerId) => {
    const { client, settle } = await loadClient()
    settle.resolve(null)

    await client.authClient.signIn.social({ provider: name })

    expect(firebaseAuth.signInWithRedirect).toHaveBeenCalledWith({}, { id: providerId })
  })

  it('tells the user when the email already has an account under another button', async () => {
    const { client, settle } = await loadClient()
    const messages = []
    client.onRedirectError(message => messages.push(message))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    settle.reject({ code: 'auth/account-exists-with-different-credential', message: 'exists' })
    await flush()

    expect(messages).toEqual(['You already have a TuneCraft account with this email. Sign in with the button you used before.'])
  })
})

describe('auth-client connectYouTube', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('re-confirms the Google account for Google users and marks the redirect', async () => {
    const user = { uid: 'u1', providerData: [{ providerId: 'google.com' }] }
    const { client, settle } = await loadClient({ signedInUser: user })
    settle.resolve(null)

    await client.authClient.connectYouTube()

    expect(firebaseAuth.reauthenticateWithRedirect).toHaveBeenCalledWith(user, { id: 'google-youtube' })
    expect(firebaseAuth.linkWithRedirect).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(FLAG)).toBe('1')
  })

  it('links a Google account for users who signed in another way', async () => {
    const user = { uid: 'u2', providerData: [{ providerId: 'github.com' }] }
    const { client, settle } = await loadClient({ signedInUser: user })
    settle.resolve(null)

    await client.authClient.connectYouTube()

    expect(firebaseAuth.linkWithRedirect).toHaveBeenCalledWith(user, { id: 'google-youtube' })
  })

  it('clears the mark and reports an error when the redirect cannot start', async () => {
    const user = { uid: 'u1', providerData: [{ providerId: 'google.com' }] }
    firebaseAuth.reauthenticateWithRedirect.mockRejectedValue({ code: 'auth/network-request-failed' })
    const { client, settle } = await loadClient({ signedInUser: user })
    settle.resolve(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(client.authClient.connectYouTube()).rejects.toThrow('Network error')
    expect(sessionStorage.getItem(FLAG)).toBeNull()
  })
})
