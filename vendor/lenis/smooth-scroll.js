/*!
 * Selective smooth scrolling (Lenis 1.3.26, MIT) — marketing/storytelling pages only.
 *
 * Design rules, in priority order:
 *  1. prefers-reduced-motion wins absolutely. Lenis is never constructed, so the
 *     page keeps the browser's own scrolling with zero extra JS on the hot path.
 *  2. Touch stays native (syncTouch:false). Hijacking touch is the single most
 *     common way smooth-scroll libraries make phones feel worse.
 *  3. Exactly one animation loop. autoRaf:true lets Lenis own its rAF; no page
 *     code adds a second ticker.
 *  4. Anchor links and nested scrollers are handled by Lenis's own `anchors` and
 *     `data-lenis-prevent` support rather than re-implemented here.
 *  5. Every failure path falls back to native scrolling, never to a broken page.
 */
(function () {
  'use strict';

  var html = document.documentElement;

  // ── Opt-outs, evaluated before anything is constructed ────────────────────
  if (html.hasAttribute('data-lenis-disable')) return;
  try {
    // ?lenis=off — lets anyone reproduce a scroll bug against native behaviour
    // without a deploy.
    if (new URLSearchParams(window.location.search).get('lenis') === 'off') return;
  } catch (e) { /* no URLSearchParams: fall through, not a reason to bail */ }

  var mq = null;
  try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  if (mq && mq.matches) return;

  if (typeof window.Lenis !== 'function') return; // vendored file absent → native

  // Anchor offset: clear whatever fixed header this page has, measured rather
  // than hard-coded so a nav height change cannot silently break deep links.
  var nav = document.getElementById('nav') ||
            document.querySelector('[data-site-nav], header[class*="nav"], .nav, .site-header');
  var navH = nav ? Math.round(nav.getBoundingClientRect().height) : 0;

  var lenis;
  try {
    lenis = new window.Lenis({
      autoRaf: true,
      lerp: 0.1,
      syncTouch: false,
      allowNestedScroll: true,
      overscroll: true,
      anchors: { offset: -(navH + 12) },
    });
  } catch (e) {
    return; // construction failed → leave native scrolling completely alone
  }

  // Published so page code can route its own programmatic scrolls through Lenis
  // instead of window.scrollTo, which Lenis would otherwise fight.
  window.__lenis = lenis;

  // Reduced motion can be switched on while the page is open. Stand down, and
  // restore the page's own scrolling, rather than requiring a reload.
  if (mq && typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', function (e) {
      if (e.matches && window.__lenis) {
        window.__lenis.destroy();
        window.__lenis = null;
      }
    });
  }

  // Native scroll restoration has already run by the time this executes; tell
  // Lenis where the page actually is so the first frame does not animate from 0.
  if (window.scrollY > 0) lenis.scrollTo(window.scrollY, { immediate: true });
})();
