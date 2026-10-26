// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

(() => {
  // This script intentionally runs synchronously in <head>, before the game
  // module. A Web launch uses a named window for singleton/focus behavior;
  // disown its launcher immediately so the game cannot retain a bridge back to
  // the Harness page. Cross-origin separation remains the primary boundary.
  try {
    window.opener = null
  } catch {
    window.stop()
    window.location.replace('about:blank')
    return
  }

  // The game is a top-level application, never an embeddable Harness surface.
  // HTTP response headers enforce this in Electron; this fail-closed check also
  // covers ordinary static Web hosting where meta CSP cannot set frame-ancestors.
  if (window.top !== window.self) {
    window.stop()
    window.location.replace('about:blank')
    return
  }

  if (window.location.protocol !== 'file:') return
  const revealFileProtocolNotice = () => {
    const notice = document.querySelector('#protocol-notice')
    if (notice) notice.hidden = false
    document.documentElement.dataset.protocol = 'file'
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealFileProtocolNotice, { once: true })
  } else {
    revealFileProtocolNotice()
  }
})()
