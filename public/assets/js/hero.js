// Script ini menangani animasi hero section dengan GSAP.
// Didesain responsif agar komposisi kartu proporsional di seluruh ukuran layar (Mobile, Tablet, Desktop).
gsap.registerPlugin(ScrollTrigger);
(function () {
  var cards = gsap.utils.toArray('.hero-card');
  var content = document.querySelector('#hero-content');
  if (!cards.length || !content) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(content, { opacity: 1, scale: 1, pointerEvents: 'auto' });
    return;
  }

  // Gunakan GSAP matchMedia untuk responsivitas multi-device
  var mm = gsap.matchMedia();

  // 1. Layar Ponsel (< 640px)
  mm.add('(max-width: 639px)', function () {
    var mobileCircle = [
      { xPercent: -80, yPercent: -80, rotation: -10, scale: 0.75 },
      { xPercent: -75, yPercent: 75, rotation: -6, scale: 0.75 },
      { xPercent: 80, yPercent: -80, rotation: 8, scale: 0.75 },
      { xPercent: 75, yPercent: 75, rotation: 12, scale: 0.75 }
    ];
    var timeline = gsap.timeline({
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true }
    });
    cards.forEach(function (card, index) {
      timeline.to(card, Object.assign({}, mobileCircle[index], { duration: 1, ease: 'power2.inOut' }), 0);
    });
    timeline.to(content, { opacity: 1, scale: 1, pointerEvents: 'auto', duration: 0.5, ease: 'back.out(1.5)' }, 0.4);
  });

  // 2. Layar Tablet & Desktop (>= 640px)
  mm.add('(min-width: 640px)', function () {
    var desktopCircle = [
      { xPercent: -155, yPercent: -115, rotation: -20, scale: 1 },
      { xPercent: -155, yPercent: 115, rotation: -12, scale: 1 },
      { xPercent: 155, yPercent: -115, rotation: 14, scale: 1 },
      { xPercent: 155, yPercent: 115, rotation: 22, scale: 1 }
    ];
    var timeline = gsap.timeline({
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true }
    });
    cards.forEach(function (card, index) {
      timeline.to(card, Object.assign({}, desktopCircle[index], { duration: 1, ease: 'power2.inOut' }), 0);
    });
    timeline.to(content, { opacity: 1, scale: 1, pointerEvents: 'auto', duration: 0.5, ease: 'back.out(1.5)' }, 0.42);
  });
})();
