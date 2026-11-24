import { watch, onUnmounted } from 'vue'

// Everything a keyboard user can Tab to inside a dialog
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keyboard handling for a modal dialog (T-0636 round 7).
 * While the element in `panelRef` is on the page:
 *  - focus moves onto the panel (give it tabindex="-1"), so the next Tab lands on its first control
 *    instead of on the page behind it; the panel itself, not a text field, so phones don't pop
 *    their keyboard up
 *  - Tab / Shift+Tab cycle through the panel's controls only
 *  - Escape calls `onEscape` (the dialog's own close/cancel function)
 * When the panel goes away (v-if false, or the component unmounts), focus returns to the
 * element that had it before (the button that opened the dialog).
 * Mouse and touch behaviour is unchanged.
 */
export function useDialogFocus(panelRef, onEscape) {
  let opener = null
  let active = false

  function onKeydown(event) {
    const panel = panelRef.value
    if (!panel) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return
    }
    if (event.key !== 'Tab') return
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement
    const outside = !panel.contains(current)
    if (event.shiftKey && (outside || current === first || current === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (outside || current === last)) {
      event.preventDefault()
      first.focus()
    }
  }

  function activate(panel) {
    if (active) return
    active = true
    opener = document.activeElement
    document.addEventListener('keydown', onKeydown)
    panel.focus({ preventScroll: true })
  }

  function deactivate() {
    if (!active) return
    active = false
    document.removeEventListener('keydown', onKeydown)
    // Back to the opener, if it is still on the page (not after a page change)
    if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') {
      opener.focus({ preventScroll: true })
    }
    opener = null
  }

  // flush 'post': runs after the DOM update, when the template ref is set (or cleared)
  watch(panelRef, (panel) => (panel ? activate(panel) : deactivate()), { flush: 'post' })
  // A component's watchers stop when it unmounts, so clean up here too
  onUnmounted(deactivate)
}
