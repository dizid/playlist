import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// The Import page talks to the API, push notifications and Firebase auth: stub them
vi.mock('../../services/api', () => ({
  api: {
    getActiveImportJob: vi.fn(),
    createImportJob: vi.fn(),
    getImportJobStatus: vi.fn(),
    getConnections: vi.fn(),
    getSongs: vi.fn()
  }
}))
vi.mock('../../services/push-notifications', () => ({
  isPushSupported: () => false,
  getPermissionStatus: () => 'default',
  subscribeToPush: vi.fn(),
  isSubscribed: async () => false,
  initializePush: vi.fn()
}))
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({
    isYouTubeTokenValid: false,
    hasYouTubeAccess: false,
    youtubeToken: null,
    error: null,
    connectYouTube: vi.fn(),
    disconnectYouTube: vi.fn()
  })
}))

import { api } from '../../services/api'
import Import from '../Import.vue'

const FILE = [
  ['YouTube Music', 'music.', 'AAAAAAAAAAA', 'Bohemian Rhapsody', 'Queen - Topic'],
  ['YouTube', 'www.', 'BBBBBBBBBBB', 'How interest rates work', 'Money Explained'],
  ['YouTube Music', 'music.', 'AAAAAAAAAAA', 'Bohemian Rhapsody', 'Queen - Topic']
].map(([header, host, id, title, channel]) =>
  `<div class="outer-cell mdl-cell"><div class="mdl-grid"><div class="header-cell"><p class="mdl-typography--title">${header}<br></p></div>` +
  `<div class="content-cell">Watched&nbsp;<a href="https://${host}youtube.com/watch?v=${id}">${title}</a><br>` +
  `<a href="https://www.youtube.com/channel/UC1">${channel}</a><br>Nov 1, 2026, 10:00:00 AM GMT+07:00<br></div></div></div>`
).join('')

async function uploadTakeout(wrapper) {
  await wrapper.findAll('button').find(b => b.text().includes('Google Takeout')).trigger('click')
  const input = wrapper.find('input[type="file"][accept=".html"]')
  const file = new File([FILE], 'watch-history.html', { type: 'text/html' })
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  // FileReader is async in jsdom: wait until the import was sent or a message shows
  await vi.waitFor(() => {
    if (!api.createImportJob.mock.calls.length && !wrapper.text().includes('No YouTube Music')) throw new Error('not yet')
  })
  await flushPromises()
}

describe('Import page: Google Takeout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api.getActiveImportJob.mockResolvedValue({ active: false })
    api.getConnections.mockResolvedValue([])
    api.getSongs.mockResolvedValue({ songs: [], pagination: {} })
    api.createImportJob.mockImplementation(async ({ songs }) => ({ jobId: 'j1', status: 'pending', totalItems: songs.length }))
    api.getImportJobStatus.mockResolvedValue({ id: 'j1', status: 'pending', total_items: 1, processed_items: 0 })
  })

  it('sends real titles, artists and play counts, music only by default', async () => {
    const wrapper = mount(Import)
    await flushPromises()
    await uploadTakeout(wrapper)

    expect(api.createImportJob).toHaveBeenCalledTimes(1)
    const { type, songs } = api.createImportJob.mock.calls[0][0]
    expect(type).toBe('takeout')
    expect(songs).toEqual([expect.objectContaining({
      youtubeId: 'AAAAAAAAAAA', title: 'Bohemian Rhapsody', artist: 'Queen', playCount: 2
    })])
    expect(wrapper.text()).toContain('1 regular video skipped')
    wrapper.unmount()
  })

  it('also sends regular videos when "Only music" is unticked', async () => {
    const wrapper = mount(Import)
    await flushPromises()
    await wrapper.findAll('button').find(b => b.text().includes('Google Takeout')).trigger('click')
    await wrapper.find('input[type="checkbox"]').setValue(false)
    await uploadTakeout(wrapper)

    const { songs } = api.createImportJob.mock.calls[0][0]
    expect(songs.map(s => s.youtubeId).sort()).toEqual(['AAAAAAAAAAA', 'BBBBBBBBBBB'])
    wrapper.unmount()
  })
})
