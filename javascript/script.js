/* ==========================================================================
   HOMEPAGE — hero slideshow (fade + slow zoom handled in styles.css)
   ========================================================================== */

const heroSlides = document.querySelectorAll('.hero__slide');
const SLIDE_DURATION = 6000; // ms each photo stays before the next fades in
const FADE_DURATION = 1800;  // keep in sync with .hero__slide transition

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (heroSlides.length > 1 && !reduceMotion) {
  let current = 0;

  setInterval(() => {
    const outgoing = heroSlides[current];
    current = (current + 1) % heroSlides.length;
    const incoming = heroSlides[current];

    outgoing.classList.remove('is-active');
    outgoing.classList.add('is-leaving');
    incoming.classList.add('is-active');

    setTimeout(() => outgoing.classList.remove('is-leaving'), FADE_DURATION);
  }, SLIDE_DURATION);
}


/* ==========================================================================
   HOMEPAGE — testimonials slider
   Advances every 4s; the arrows step manually and restart the clock.
   Pauses while the pointer is over the reviews or keyboard focus is inside
   them, so nobody loses a review mid-sentence. Off for reduced motion.
   ========================================================================== */

const reviews = document.querySelector('[data-reviews]');

if (reviews) {
  const slides = reviews.querySelectorAll('.review');
  const track = reviews.querySelector('.reviews__track');
  const counter = reviews.querySelector('[data-reviews-current]');
  const REVIEW_DURATION = 4000;
  let index = 0;
  let timer = null;

  function showReview(next) {
    slides[index].classList.remove('is-active');
    slides[index].setAttribute('aria-hidden', 'true');
    slides[index].inert = true;

    index = (next + slides.length) % slides.length;

    slides[index].classList.add('is-active');
    slides[index].removeAttribute('aria-hidden');
    slides[index].inert = false;
    if (counter) counter.textContent = index + 1;
  }

  function stopReviews() {
    clearInterval(timer);
    timer = null;
  }

  function startReviews() {
    if (reduceMotion || slides.length < 2) return;
    stopReviews();
    timer = setInterval(() => showReview(index + 1), REVIEW_DURATION);
  }

  function step(direction) {
    // Announce manual changes to screen readers; stay quiet while auto-playing
    track.setAttribute('aria-live', 'polite');
    showReview(index + direction);
    startReviews();
  }

  reviews.querySelector('[data-reviews-prev]').addEventListener('click', () => step(-1));
  reviews.querySelector('[data-reviews-next]').addEventListener('click', () => step(1));

  reviews.addEventListener('mouseenter', stopReviews);
  reviews.addEventListener('mouseleave', startReviews);
  reviews.addEventListener('focusin', stopReviews);
  reviews.addEventListener('focusout', (event) => {
    if (!reviews.contains(event.relatedTarget)) startReviews();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopReviews();
    else startReviews();
  });

  startReviews();
}


/* ==========================================================================
   HOMEPAGE — process card slider
   Every 6s the row slides one card left; after the last card is fully in
   view it glides back to the first. Arrows (and a swipe on touch screens)
   step manually and restart the clock. Pauses on hover / keyboard focus;
   no auto-play for reduced motion.
   ========================================================================== */

const process = document.querySelector('[data-process]');

if (process) {
  const viewport = process.querySelector('.process__viewport');
  const track = process.querySelector('.process__track');
  const cards = track.querySelectorAll('.process-card');
  const PROCESS_DURATION = 6000;
  let current = 0;
  let processTimer = null;

  // How far the row can travel before the last card is flush with the edge
  function maxOffset() {
    return Math.max(0, track.scrollWidth - viewport.clientWidth);
  }

  function lastIndex() {
    const max = maxOffset();
    const i = Array.prototype.findIndex.call(cards, (card) => card.offsetLeft >= max);
    return i === -1 ? cards.length - 1 : i;
  }

  function goToCard(next) {
    const last = lastIndex();
    if (next > last) next = 0;
    if (next < 0) next = last;
    current = next;
    track.style.transform = `translateX(-${Math.min(cards[current].offsetLeft, maxOffset())}px)`;
  }

  function stopProcess() {
    clearInterval(processTimer);
    processTimer = null;
  }

  function startProcess() {
    if (reduceMotion || cards.length < 2) return;
    stopProcess();
    processTimer = setInterval(() => goToCard(current + 1), PROCESS_DURATION);
  }

  function stepProcess(direction) {
    goToCard(current + direction);
    startProcess();
  }

  process.querySelector('[data-process-prev]').addEventListener('click', () => stepProcess(-1));
  process.querySelector('[data-process-next]').addEventListener('click', () => stepProcess(1));

  // Swipe on touch screens
  let touchStartX = null;
  viewport.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });
  viewport.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 40) stepProcess(distance < 0 ? 1 : -1);
    touchStartX = null;
  });

  process.addEventListener('mouseenter', stopProcess);
  process.addEventListener('mouseleave', startProcess);
  process.addEventListener('focusin', stopProcess);
  process.addEventListener('focusout', (event) => {
    if (!process.contains(event.relatedTarget)) startProcess();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopProcess();
    else startProcess();
  });

  // Card widths change across breakpoints; re-align the current card
  window.addEventListener('resize', () => goToCard(current));

  startProcess();
}
