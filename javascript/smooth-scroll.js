/* ==========================================================================
   SMOOTH SCROLLING (every page)
   Lenis (javascript/vendor/lenis.min.js) eases mouse-wheel and trackpad
   scrolling so the page glides instead of stepping. Touch scrolling is left
   native (phones already have momentum). In-page links (#contact etc.) glide
   too, stopping below the fixed header. Off for reduced motion.
   The instance is shared as window.lenis so other scripts (back to top) can
   scroll through it.
   ========================================================================== */

(function () {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const headerOffset = () =>
    -parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) * 16 || -80;

  const lenis = new Lenis({
    duration: 1.2, // seconds a wheel scroll takes to settle; higher = floatier
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // fast start, soft landing
    smoothWheel: true,
    anchors: { offset: headerOffset() },
  });

  window.lenis = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();
