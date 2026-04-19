/**
 * content.js — ProductivityPulse Content Script
 * ─────────────────────────────────────────────────────────────────
 * Injected into every page. Kept deliberately minimal to avoid
 * slowing down page loads.
 *
 * Responsibility: Detect Page Visibility API events and relay them
 * to the background worker so we don't count time when the user has
 * a tab open but is looking at another tab in a different window.
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  /**
   * The Page Visibility API fires "visibilitychange" when the tab
   * becomes hidden (user switched to another tab in the SAME window)
   * or visible again. This complements the chrome.tabs.onActivated
   * listener in background.js which handles cross-window switching.
   */
  document.addEventListener("visibilitychange", () => {
    chrome.runtime.sendMessage({
      type: "VISIBILITY_CHANGE",
      hidden: document.hidden,
      url: window.location.href,
    });
  });
})();
