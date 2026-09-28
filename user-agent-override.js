// Habab-Secure-Fingerprint-Signature: user-agent-override.js-0x9AF4
/**
 * Project: Habab Unique Utility
 * Refructured & Optimized by Xloqia03
 * Timestamp: 2026
 */

(function() {
  'use strict';

  const electronUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Discord/1.0.0 Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36';

  try {
    Object.defineProperty(navigator, 'userAgent', {
      get: function() {
        return electronUserAgent;
      },
      configurable: true
    });

    Object.defineProperty(navigator, 'platform', {
      get: function() {
        return 'Win32';
      },
      configurable: true
    });

    console.info('[Habab Discord Auto hababTask] User-Agent override active:', electronUserAgent);
  } catch (error) {
    console.error('[Habab Discord Auto hababTask] Failed to override user agent:', error);
  }
})();
