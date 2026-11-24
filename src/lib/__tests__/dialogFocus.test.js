import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick, h } from 'vue'
import { useDialogFocus } from '../dialogFocus'

// jsdom has no layout, so every element reports no boxes; the helper skips controls without
// boxes (display:none). Give every element one box here.
beforeAll(() => {
  Element.prototype.getClientRects = function () { return [{ width: 10, height: 10 }] }
})

// A page with an opener button and a dialog (v-if) holding 3 controls, like the tag editor
function makePage(onEscape) {
  return defineComponent({
    setup() {
      const open = ref(false)
      const panel = ref(null)
      useDialogFocus(panel, () => { onEscape(); open.value = false })
      return () => h('div', [
        h('button', { id: 'opener', onClick: () => { open.value = true } }, 'Edit tags'),
        h('button', { id: 'behind' }, 'Play'),
        open.value
          ? h('div', { ref: panel, id: 'panel', tabindex: '-1' }, [
              h('button', { id: 'close' }, 'Close'),
              h('button', { id: 'disabled', disabled: true }, 'Save'),
              h('input', { id: 'field' }),
              h('button', { id: 'cancel', onClick: () => { open.value = false } }, 'Cancel'),
            ])
          : null,
      ])
    },
  })
}

function tab(shift = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

let wrapper
afterEach(() => wrapper?.unmount())

async function openDialog(onEscape = vi.fn()) {
  wrapper = mount(makePage(onEscape), { attachTo: document.body })
  const opener = wrapper.find('#opener').element
  opener.focus()
  await wrapper.find('#opener').trigger('click')
  await nextTick()
  return { opener, onEscape }
}

describe('useDialogFocus', () => {
  it('moves focus onto the dialog box when it opens', async () => {
    await openDialog()
    expect(document.activeElement.id).toBe('panel')
  })

  it('Tab on the last control wraps to the first (disabled controls skipped)', async () => {
    await openDialog()
    document.getElementById('cancel').focus()
    const event = tab()
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement.id).toBe('close')
  })

  it('Shift+Tab on the first control or on the box itself wraps to the last', async () => {
    await openDialog()
    expect(tab(true).defaultPrevented).toBe(true)
    expect(document.activeElement.id).toBe('cancel')
    document.getElementById('close').focus()
    tab(true)
    expect(document.activeElement.id).toBe('cancel')
  })

  it('Tab in the middle is left to the browser', async () => {
    await openDialog()
    document.getElementById('close').focus()
    expect(tab().defaultPrevented).toBe(false)
  })

  it('focus outside the dialog is pulled back in on Tab', async () => {
    await openDialog()
    document.getElementById('behind').focus()
    tab()
    expect(document.activeElement.id).toBe('close')
  })

  it('Escape calls the close function and focus returns to the opener', async () => {
    const { onEscape } = await openDialog()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await nextTick()
    await nextTick()
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(wrapper.find('#panel').exists()).toBe(false)
    expect(document.activeElement.id).toBe('opener')
  })

  it('after closing, keys are no longer handled', async () => {
    const { onEscape } = await openDialog()
    await wrapper.find('#cancel').trigger('click')
    await nextTick()
    await nextTick()
    expect(document.activeElement.id).toBe('opener')
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.dispatchEvent(escape)
    expect(onEscape).not.toHaveBeenCalled()
    expect(escape.defaultPrevented).toBe(false)
    expect(tab().defaultPrevented).toBe(false)
  })

  it('unmounting the page while the dialog is open removes the key handler', async () => {
    const { onEscape } = await openDialog()
    wrapper.unmount()
    wrapper = null
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEscape).not.toHaveBeenCalled()
  })
})
