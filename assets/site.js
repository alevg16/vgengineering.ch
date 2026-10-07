/* VG Engineering site behaviour: mobile menu, stage picker (tabs), draw-on-scroll,
   project galleries, copy-email. No dependencies. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile menu ---- */
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');
  if (header && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.querySelectorAll('.site-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('nav-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- stage picker: [data-stages] holds role=tab buttons that control panels ---- */
  document.querySelectorAll('[data-stages]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle('is-done', j < i);
        panels[j].hidden = !on;
      });
      root.style.setProperty('--progress', tabs.length > 1 ? i / (tabs.length - 1) : 1);
      root.style.setProperty('--step', i);
      if (focus) tabs[i].focus();
      var p = panels[i];
      p.classList.remove('is-in');
      void p.offsetWidth;
      p.classList.add('is-in');
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0);
  });

  /* ---- draw on scroll: drawn by default; armed (undrawn) only when below the fold ---- */
  var io = ('IntersectionObserver' in window) && !reduce
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); }
        });
      }, { threshold: 0.3 })
    : null;
  document.querySelectorAll('[data-draw]').forEach(function (el) {
    if (!io) return;
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    el.classList.add('is-armed');
    io.observe(el);
  });

  /* ---- gallery: scroll-snap track + step buttons + prev/next ---- */
  document.querySelectorAll('[data-gallery]').forEach(function (g) {
    var track = g.querySelector('.g-track');
    var slides = Array.prototype.slice.call(track.children);
    var steps = Array.prototype.slice.call(g.querySelectorAll('[data-step]'));
    var prev = g.querySelector('[data-prev]');
    var next = g.querySelector('[data-next]');
    var count = g.querySelector('[data-count]');
    var cur = 0, raf = 0;

    function mark(i) {
      cur = i;
      steps.forEach(function (s, j) { s.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      if (count) count.textContent = (i + 1) + ' / ' + slides.length;
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
      mark(i);
    }
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var best = 0, bd = Infinity, base = slides[0].offsetLeft;
        slides.forEach(function (s, j) {
          var d = Math.abs(s.offsetLeft - base - track.scrollLeft);
          if (d < bd) { bd = d; best = j; }
        });
        if (best !== cur) mark(best);
      });
    });
    steps.forEach(function (s, j) { s.addEventListener('click', function () { go(j); }); });
    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    mark(0);
  });

  /* ---- copy email: clipboard, falling back to selecting the address ---- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      function done(msg) { b.textContent = msg; setTimeout(function () { b.textContent = label; }, 1800); }
      function fallback() {
        var t = document.getElementById(b.getAttribute('data-target'));
        if (t) {
          var r = document.createRange(); r.selectNodeContents(t);
          var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        }
        done('Selected');
      }
      try { navigator.clipboard.writeText(text).then(function () { done('Copied'); }, fallback); }
      catch (e) { fallback(); }
    });
  });
})();
