import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConnectionsPanel from '../ConnectionsPanel.vue'

// Mock the API module
vi.mock('../../services/api', () => ({
  api: {
    getConnections: vi.fn(),
    connectService: vi.fn(),
    syncConnection: vi.fn(),
    disconnectService: vi.fn(),
    getSongs: vi.fn()
  }
}))

import { api } from '../../services/api'

function connection(overrides = {}) {
  return {
    id: 'c1',
    provider: 'lastfm',
    external_username: 'listener',
    status: 'ok',
    backfill_done: false,
    plays_imported: 0,
    provider_total_plays: 435,
    last_synced_at: null,
    last_error: null,
    ...overrides
  }
}

describe('ConnectionsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api.getSongs.mockResolvedValue({ songs: [], pagination: {} })
  })

  it('shows a connect form per service when nothing is connected', async () => {
    api.getConnections.mockResolvedValue([])
    const wrapper = mount(ConnectionsPanel)
    await flushPromises()

    expect(wrapper.findAll('form')).toHaveLength(2)
    expect(wrapper.text()).toContain('Last.fm')
    expect(wrapper.text()).toContain('ListenBrainz')
    expect(wrapper.text()).toContain('powered by AudioScrobbler')
  })

  it('tells Last.fm users upfront that their listening history must not be hidden', async () => {
    api.getConnections.mockResolvedValue([])
    const wrapper = mount(ConnectionsPanel)
    await flushPromises()

    // Only under the Last.fm form (ListenBrainz listens are always public)
    const notes = wrapper.findAll('p').filter((p) => p.text().includes('Hide recent listening information'))
    expect(notes).toHaveLength(1)
  })

  it('connects, then keeps syncing until the whole history is imported', async () => {
    api.getConnections.mockResolvedValue([])
    api.connectService.mockResolvedValue(connection({ status: 'pending' }))
    api.syncConnection
      .mockResolvedValueOnce({ busy: false, importedPlays: 200, complete: false, connection: connection({ plays_imported: 200 }) })
      .mockResolvedValueOnce({ busy: false, importedPlays: 235, complete: true, connection: connection({ plays_imported: 435, backfill_done: true }) })

    const wrapper = mount(ConnectionsPanel)
    await flushPromises()
    await wrapper.find('#username-lastfm').setValue('  listener ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.connectService).toHaveBeenCalledWith('lastfm', 'listener')
    expect(api.syncConnection).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('All 435 plays imported')
    // New plays imported -> library refreshed
    expect(api.getSongs).toHaveBeenCalled()
  })

  it('shows the provider message when connecting fails', async () => {
    api.getConnections.mockResolvedValue([])
    api.connectService.mockRejectedValue(new Error('Last.fm user not found. Check the spelling of the username.'))

    const wrapper = mount(ConnectionsPanel)
    await flushPromises()
    await wrapper.find('#username-lastfm').setValue('nobody')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain('Last.fm user not found')
    expect(api.syncConnection).not.toHaveBeenCalled()
  })

  it('resumes an unfinished import on load and stops on a temporary error', async () => {
    api.getConnections.mockResolvedValue([connection({ plays_imported: 200 })])
    api.syncConnection.mockResolvedValueOnce({
      busy: false,
      importedPlays: 0,
      complete: false,
      connection: connection({ plays_imported: 200, last_error: 'Sync failed. It will retry automatically.' })
    })

    const wrapper = mount(ConnectionsPanel)
    await flushPromises()

    expect(api.syncConnection).toHaveBeenCalledTimes(1)
    // Browsers collapse the template's whitespace; do the same here
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('200 of 435 plays imported')
    expect(wrapper.text()).toContain('It will retry automatically')
  })

  it('does not resume connections that need the user to act', async () => {
    api.getConnections.mockResolvedValue([connection({ status: 'error', last_error: 'This Last.fm profile hides its listening history.' })])

    const wrapper = mount(ConnectionsPanel)
    await flushPromises()

    expect(api.syncConnection).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Needs attention')
  })

  it('asks for confirmation before disconnecting', async () => {
    api.getConnections.mockResolvedValue([connection({ backfill_done: true, plays_imported: 435 })])
    api.disconnectService.mockResolvedValue({ disconnected: true })

    const wrapper = mount(ConnectionsPanel)
    await flushPromises()

    const disconnectButton = wrapper.findAll('button').find(b => b.text() === 'Disconnect')
    await disconnectButton.trigger('click')
    expect(api.disconnectService).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('stay in your library')

    await wrapper.findAll('button').find(b => b.text() === 'Yes, disconnect').trigger('click')
    await flushPromises()
    expect(api.disconnectService).toHaveBeenCalledWith('lastfm')
    expect(wrapper.find('#username-lastfm').exists()).toBe(true)
  })
})
