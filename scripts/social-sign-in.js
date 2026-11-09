#!/usr/bin/env node
/* global process, console */
// Social sign-in providers (GitHub, Facebook, X) in Firebase Auth for TuneCraft.
//
//   node scripts/social-sign-in.js status            which providers are switched on in Firebase
//   node scripts/social-sign-in.js enable github     switch one on with Marc's keys (github | facebook | x)
//
// Talks to the Identity Toolkit admin API with the Firebase service account from .env
// (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).
// Marc's keys come from a private file outside git (default below, override with
// SOCIAL_KEYS_FILE). Secrets are never printed.
//
// After "enable", add the provider to SIGN_IN_PROVIDERS in src/services/firebase.js
// and deploy, so its button shows on the landing page.

import 'dotenv/config'
import { readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { JWT } from 'google-auth-library'

const KEYS_FILE = process.env.SOCIAL_KEYS_FILE || join(homedir(), '.config', 'dizid-keys', 'tunecraft-social.env')

// Our button name -> Firebase provider id + the two key names in the keys file
const PROVIDERS = {
  github: { idpId: 'github.com', idKey: 'GITHUB_CLIENT_ID', secretKey: 'GITHUB_CLIENT_SECRET' },
  facebook: { idpId: 'facebook.com', idKey: 'FACEBOOK_APP_ID', secretKey: 'FACEBOOK_APP_SECRET' },
  // Firebase still calls X "twitter.com"; it takes the X app's API key and API key secret
  x: { idpId: 'twitter.com', idKey: 'X_API_KEY', secretKey: 'X_API_KEY_SECRET' },
}

function stop(message) {
  console.error(`social-sign-in: ${message}`)
  process.exit(1)
}

function apiBase() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId) stop('FIREBASE_PROJECT_ID is not set in .env')
  return `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/defaultSupportedIdpConfigs`
}

function adminClient() {
  const { FIREBASE_CLIENT_EMAIL: email, FIREBASE_PRIVATE_KEY: rawKey } = process.env
  if (!email || !rawKey) stop('FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are not set in .env')
  return new JWT({
    email,
    key: rawKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
}

// Read KEY=value lines from the private keys file (blank values and # comments are skipped)
function readKeysFile() {
  let text
  try {
    text = readFileSync(KEYS_FILE, 'utf8')
  } catch {
    stop(`keys file ${KEYS_FILE} not found`)
  }
  if ((statSync(KEYS_FILE).mode & 0o077) !== 0) {
    console.warn(`social-sign-in: warning: ${KEYS_FILE} is readable by others; run chmod 600 on it`)
  }
  const keys = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (match && match[2]) keys[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return keys
}

async function listConfigs(client) {
  const response = await client.request({ url: apiBase() })
  return response.data.defaultSupportedIdpConfigs || []
}

async function showStatus(client) {
  const configs = await listConfigs(client)
  const byId = Object.fromEntries(configs.map((config) => [config.name.split('/').pop(), config]))
  for (const idpId of ['google.com', ...Object.values(PROVIDERS).map((provider) => provider.idpId)]) {
    const config = byId[idpId]
    const state = !config ? 'not set up' : config.enabled ? 'on' : 'set up but off'
    console.log(`${idpId.padEnd(13)} ${state}`)
  }
}

async function enableProvider(client, name) {
  const provider = PROVIDERS[name]
  if (!provider) stop(`unknown provider '${name}'; use one of: ${Object.keys(PROVIDERS).join(', ')}`)
  const keys = readKeysFile()
  const clientId = keys[provider.idKey]
  const clientSecret = keys[provider.secretKey]
  if (!clientId || !clientSecret) stop(`${KEYS_FILE} needs both ${provider.idKey} and ${provider.secretKey}`)

  const body = { enabled: true, clientId, clientSecret }
  const exists = (await listConfigs(client)).some((config) => config.name.endsWith(`/${provider.idpId}`))
  if (exists) {
    await client.request({
      url: `${apiBase()}/${provider.idpId}?updateMask=enabled,clientId,clientSecret`,
      method: 'PATCH',
      data: body,
    })
  } else {
    await client.request({ url: `${apiBase()}?idpId=${provider.idpId}`, method: 'POST', data: body })
  }
  console.log(`${provider.idpId} is on in Firebase. Next: add '${name}' to SIGN_IN_PROVIDERS and deploy.`)
}

async function main() {
  const [command, name] = process.argv.slice(2)
  const client = adminClient()
  if (command === 'status') return showStatus(client)
  if (command === 'enable' && name) return enableProvider(client, name)
  stop('usage: node scripts/social-sign-in.js status | enable github|facebook|x')
}

main().catch((error) => {
  // API errors carry a readable message; never print the request (it holds the secret)
  const apiMessage = error.response?.data?.error?.message
  stop(apiMessage || error.message)
})
