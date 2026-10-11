/* ==========================================================================
   OUR PROCESS PAGE — process cards (see css/process.css)

   Desktop (1024px+): the section pins while you scroll through its tall
   track. The cards start stacked like a fanned deck: each sits one strip
   further right, all tilted back, with 01 at the front. Scroll progress
   becomes a stage from -1 to 4:
     -1 → 0  card 01 straightens and comes forward
      0 → 3  each next card rises from the deck to the top; the one before
             tilts back into a strip on the left with its number showing
      3 → 4  the stack spreads into four equal cards side by side
   Every position comes from the stage, so scrolling up reverses it exactly.

   Phones/tablets: a horizontal snap scroller; each card tilts in 3D by how
   far it is from the centre.

   Reduced motion (or no JavaScript): the plain row of cards from the CSS.
   ========================================================================== */

(function () {
  const section = document.querySelector('.process-cards');
  if (!section) return;

  const track = section.querySelector('.process-cards__track');
  const sticky = section.querySelector('.process-cards__sticky');
  const list = section.querySelector('.process-cards__list');
  const cards = [...section.querySelectorAll('.process-card')];
  const LAST = cards.length - 1;

  const desktop = window.matchMedia('(min-width: 1024px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const STRIP = 0.13; // width of a covered card's visible strip, share of the row
  const GAP = 24; // px between cards once they spread out

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  let mode = '';
  let queued = false;
  let measuredKey = '';

  /* The cards are as tall as the tallest one needs, stacked or spread, so
     text never runs into an edge. On short screens the whole row scales
     down to fit under the heading, so it always sits centred with room
     around it. */
  const head = section.querySelector('.process-cards__head');
  const BREATHING = 48; // px kept free above and below the row

  const PHOTO_MAX = 144; // px, the spread cards' photo band at its tallest
  const PHOTO_MIN = 80;

  // Tallest card at a width, with the photo band at a given height
  function tallestAt(width, spread, photoHeight) {
    let tallest = 0;
    cards.forEach((card) => {
      card.style.width = `${width}px`;
      card.style.height = 'auto';
      card.style.setProperty('--spread', spread);
      card.style.setProperty('--photo-height', `${photoHeight}px`);
      tallest = Math.max(tallest, card.offsetHeight);
    });
    return tallest;
  }

  function sizeRow(rowWidth, [stackedWidth, spreadWidth]) {
    const key = `${rowWidth}x${sticky.clientHeight}`;
    if (key === measuredKey) return;
    measuredKey = key;

    const headSpace = head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom);
    const room = sticky.clientHeight - headSpace - BREATHING;

    // The spread photo band takes whatever height is left, within limits
    const textOnly = Math.max(tallestAt(stackedWidth, 0, 0), tallestAt(spreadWidth, 1, 0));
    const photoHeight = clamp(room - textOnly, PHOTO_MIN, PHOTO_MAX);
    const tallest = Math.max(tallestAt(stackedWidth, 0, photoHeight), tallestAt(spreadWidth, 1, photoHeight));
    cards.forEach((card) => card.style.removeProperty('height'));

    // Last resort on very short screens: scale the whole row down to fit
    const fit = Math.min(1, room / tallest);
    list.style.setProperty('--card-height', `${Math.ceil(tallest)}px`);
    list.style.setProperty('--photo-height', `${photoHeight}px`);
    list.style.height = `${Math.ceil(tallest * fit)}px`;
    list.style.transform = fit < 1 ? `scale(${fit})` : '';
  }

  /* ---------- Desktop: pinned stack ---------- */

  function layoutStack() {
    const range = track.offsetHeight - sticky.offsetHeight;
    const progress = range > 0 ? clamp(-track.getBoundingClientRect().top / range) : 1;
    // A hold at both ends: the deck settles before 01 comes forward, and the
    // spread stays pinned and centred for a while before the page moves on
    const stage = clamp(progress * 6.25 - 1.25, -1, LAST + 1);

    const rowWidth = list.clientWidth;
    const strip = rowWidth * STRIP;
    const stackedWidth = rowWidth - strip * LAST; // each card spans the row less the strips
    const spreadWidth = (rowWidth - GAP * LAST) / cards.length;
    const spread = ease(clamp(stage - LAST)); // 0 while stacked, 1 once spread
    sizeRow(rowWidth, [stackedWidth, spreadWidth]);

    cards.forEach((card, i) => {
      // Distance from being the front card: negative = still in the deck on
      // the right, positive = already shown and tucked away on the left
      const away = clamp(Math.min(stage, LAST) - i, -1, 1);
      const depth = ease(Math.abs(away)) * (1 - spread);
      // Tilt away from the front card: deck cards hinge on their right edge,
      // shown cards on their left
      const tilt = away < 0 ? -depth * 14 : depth * 14;

      card.style.left = `${lerp(i * strip, i * (spreadWidth + GAP), spread)}px`;
      card.style.width = `${lerp(stackedWidth, spreadWidth, spread)}px`;
      // Nearest the front sits on top (unclamped, so the deck stays in order: 01, 02, 03, 04)
      card.style.zIndex = 100 - Math.round(Math.abs(Math.min(stage, LAST) - i) * 10);
      card.style.transformOrigin = away < 0 ? 'right center' : 'left center';
      card.style.transform = `rotateY(${tilt}deg) scale(${1 - depth * 0.06})`;
      card.style.filter = depth ? `brightness(${1 - depth * 0.18})` : '';
      card.style.setProperty('--spread', spread.toFixed(3));
      // The photo fades out as it leaves the side and back in at the bottom,
      // so it never slides across the text
      card.style.setProperty('--photo-fade', Math.abs(1 - 2 * spread).toFixed(3));
      card.style.removeProperty('--photo-height');
    });
  }

  /* ---------- Phones/tablets: 3D swipe row ---------- */

  function tiltRow() {
    const box = list.getBoundingClientRect();
    const centre = box.left + box.width / 2;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const offset = clamp((rect.left + rect.width / 2 - centre) / rect.width, -1.5, 1.5);
      card.style.transform = `rotateY(${offset * -18}deg) scale(${1 - Math.abs(offset) * 0.08})`;
      card.style.filter = `brightness(${1 - Math.min(Math.abs(offset), 1) * 0.12})`;
    });
  }

  function update() {
    queued = false;
    if (mode === 'stack') layoutStack();
    else if (mode === 'swipe') tiltRow();
  }

  function requestUpdate() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  function setMode() {
    const next = reduceMotion.matches ? 'static' : desktop.matches ? 'stack' : 'swipe';
    if (next === mode) return requestUpdate();
    mode = next;

    section.classList.toggle('is-stacking', mode === 'stack');
    section.classList.toggle('is-swiping', mode === 'swipe');
    cards.forEach((card) => card.removeAttribute('style'));
    list.removeAttribute('style');
    measuredKey = '';
    update();
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  list.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', setMode);
  desktop.addEventListener('change', setMode);
  reduceMotion.addEventListener('change', setMode);
  setMode();
})();
