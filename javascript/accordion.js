/* ==========================================================================
   ACCORDIONS — About (How It Works) and Our Process (FAQ)
   Any <details class="accordion__item"> with .accordion__summary and
   .accordion__body. Native <details> snap open and shut; this slides each panel down and up
   instead, in every browser. One panel open at a time: opening one slides
   the open one shut. Clicking again mid-slide reverses from where it is.
   Without JavaScript the panels still work (they just snap), and the shared
   name="" keeps one open. Reduced motion: no slide, they simply toggle.
   ========================================================================== */

const accordionItems = document.querySelectorAll('.accordion__item');
const ACCORDION_DURATION = 350; // ms
const accordionAnimations = new WeakMap();
const accordionReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function slideAccordion(item, opening) {
  const body = item.querySelector('.accordion__body');

  // Start from the panel's current height, so a reversal mid-slide never jumps
  const from = item.open ? body.getBoundingClientRect().height : 0;
  accordionAnimations.get(item)?.cancel();

  // .is-closing flips the chevron back straight away; [open] stays on until
  // the slide ends so the text is still there to slide away
  item.classList.toggle('is-closing', !opening);
  item.open = true;

  const finish = () => {
    accordionAnimations.delete(item);
    if (!opening) {
      item.open = false;
      item.classList.remove('is-closing');
    }
  };

  if (accordionReduceMotion) {
    finish();
    return;
  }

  const to = opening ? body.scrollHeight : 0;
  const animation = body.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration: ACCORDION_DURATION, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
  );
  accordionAnimations.set(item, animation);
  animation.onfinish = finish;
}

accordionItems.forEach((item) => {
  // Script takes over one-open-at-a-time; with name="" the browser would shut
  // the other panel instantly instead of letting it slide
  item.removeAttribute('name');

  item.querySelector('.accordion__summary').addEventListener('click', (event) => {
    event.preventDefault();
    const opening = !item.open || item.classList.contains('is-closing');

    if (opening) {
      accordionItems.forEach((other) => {
        if (other !== item && other.open && !other.classList.contains('is-closing')) {
          slideAccordion(other, false);
        }
      });
    }

    slideAccordion(item, opening);
  });
});
