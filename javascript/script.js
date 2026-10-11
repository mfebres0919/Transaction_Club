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
   HOMEPAGE — process card slider
   The row is a native horizontal scroller with snap points (styles.css), so
   on phones a swipe follows the finger with momentum and settles on a card.
   Every 6s it scrolls one card along; after the last card is fully in view
   it glides back to the first. Arrows step manually and restart the clock.
   Pauses on hover, keyboard focus and touch; no auto-play for reduced motion.
   ========================================================================== */

const process = document.querySelector('[data-process]');

if (process) {
  const viewport = process.querySelector('.process__viewport');
  const cards = viewport.querySelectorAll('.process-card');
  const PROCESS_DURATION = 6000;
  const RESUME_AFTER_TOUCH = 8000; // give a swiper time to read before auto-play resumes
  let processTimer = null;
  let resumeTimer = null;

  // Card nearest the left edge, worked out from where the row has scrolled to
  function currentIndex() {
    const start = cards[0].offsetLeft;
    let nearest = 0;
    cards.forEach((card, i) => {
      if (Math.abs(card.offsetLeft - start - viewport.scrollLeft) <
          Math.abs(cards[nearest].offsetLeft - start - viewport.scrollLeft)) nearest = i;
    });
    return nearest;
  }

  function atEnd() {
    return viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 4;
  }

  function goToCard(next) {
    if (next >= cards.length || (next > currentIndex() && atEnd())) next = 0;
    if (next < 0) next = cards.length - 1;
    viewport.scrollTo({
      left: cards[next].offsetLeft - cards[0].offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  function stopProcess() {
    clearInterval(processTimer);
    processTimer = null;
  }

  function startProcess() {
    if (reduceMotion || cards.length < 2) return;
    stopProcess();
    processTimer = setInterval(() => goToCard(currentIndex() + 1), PROCESS_DURATION);
  }

  function stepProcess(direction) {
    goToCard(currentIndex() + direction);
    startProcess();
  }

  process.querySelector('[data-process-prev]').addEventListener('click', () => stepProcess(-1));
  process.querySelector('[data-process-next]').addEventListener('click', () => stepProcess(1));

  // Touch: hold auto-play while the visitor is swiping and reading
  viewport.addEventListener('touchstart', () => {
    stopProcess();
    clearTimeout(resumeTimer);
  }, { passive: true });
  viewport.addEventListener('touchend', () => {
    resumeTimer = setTimeout(startProcess, RESUME_AFTER_TOUCH);
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

  startProcess();
}


/* ==========================================================================
   HOMEPAGE — closing gift form
   Sends the request to the Google Apps Script web app in the gift Sheet
   (google-apps-script/closing-gift.gs), which adds a row and emails
   Peter & Jiang. Then the card swaps to a thank-you message.
   ========================================================================== */

// The Apps Script "Web app" URL (Deploy → Manage deployments)
const GIFT_FORM_URL = 'https://script.google.com/macros/s/AKfycbw145n4Ixuruw6eSdg91M7JhUMoChwESSfHhlnoKrZoJ815-3zwnxzL99Oa3LkhcY0S2Q/exec';

const giftForm = document.getElementById('gift-form');

if (giftForm) {
  const submit = giftForm.querySelector('.gift-form__submit');
  const error = document.getElementById('gift-error');
  const success = document.getElementById('gift-success');

  giftForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Sending...';

    try {
      // Form-encoded so the browser sends it straight to Google (no preflight)
      const response = await fetch(GIFT_FORM_URL, {
        method: 'POST',
        body: new URLSearchParams(new FormData(giftForm)),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || 'Request failed');

      giftForm.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (err) {
      console.error('[Closing gift]', err);
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Claim My Gift';
    }
  });
}
