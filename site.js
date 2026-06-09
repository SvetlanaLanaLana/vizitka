(function () {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  const stickyCta = document.querySelector('.sticky-cta');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav--open');
      burger.setAttribute('aria-expanded', isOpen);
    });

    document.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  if (stickyCta) {
    const toggleSticky = () => {
      const show = window.scrollY > 480;
      stickyCta.classList.toggle('sticky-cta--visible', show);
    };
    window.addEventListener('scroll', toggleSticky, { passive: true });
    toggleSticky();
  }

  const revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('reveal--visible'));
  }
})();
