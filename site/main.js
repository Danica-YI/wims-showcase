(function () {
  'use strict';

  var AUTO_ADVANCE_MS = 4000;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* ---------- Step players (walkthrough + adjustments) ---------- */

  function setupPlayer(player) {
    var stepEls = Array.prototype.slice.call(player.querySelectorAll('[data-step]'));
    var steps = stepEls.map(function (el) {
      return {
        el: el,
        src: el.getAttribute('data-src'),
        pill: el.getAttribute('data-pill'),
        text: el.querySelector('.step-text').textContent.trim()
      };
    });
    var total = steps.length;
    var img = player.querySelector('[data-player-img]');
    var pill = player.querySelector('[data-player-pill]');
    var count = player.querySelector('[data-player-count]');
    var bar = player.querySelector('[data-player-bar]');
    var openBtn = player.querySelector('.shot-open');
    var prevBtn = player.querySelector('[data-prev]');
    var nextBtn = player.querySelector('[data-next]');
    var toggleBtn = player.querySelector('[data-toggle]');

    var index = clamp(parseInt(player.getAttribute('data-active'), 10) || 0, 0, total - 1);
    var timer = null;
    var inView = false;
    var hovered = false;
    var focused = false;
    var paused = false;

    function canAutoAdvance() {
      return inView && !paused && !hovered && !focused && !reduceMotion.matches && total > 1;
    }

    function schedule() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (canAutoAdvance()) {
        timer = setTimeout(function () {
          timer = null;
          go(index + 1);
        }, AUTO_ADVANCE_MS);
      }
    }

    function render() {
      var step = steps[index];
      player.setAttribute('data-active', String(index));
      if (img.getAttribute('src') !== step.src) {
        img.setAttribute('src', step.src);
      }
      img.setAttribute('alt', step.text);
      if (openBtn) { openBtn.setAttribute('data-caption', step.text); }
      if (pill) { pill.textContent = step.pill; }
      if (count) { count.textContent = (index + 1) + ' of ' + total; }
      if (bar) { bar.style.width = ((index + 1) / total * 100) + '%'; }
      steps.forEach(function (s, i) {
        if (i === index) {
          s.el.setAttribute('aria-current', 'step');
        } else {
          s.el.removeAttribute('aria-current');
        }
      });
    }

    function go(i) {
      index = (i % total + total) % total;
      render();
      schedule();
    }

    steps.forEach(function (s, i) {
      s.el.addEventListener('click', function () { go(i); });
    });
    if (prevBtn) { prevBtn.addEventListener('click', function () { go(index - 1); }); }
    if (nextBtn) { nextBtn.addEventListener('click', function () { go(index + 1); }); }

    if (toggleBtn) {
      if (reduceMotion.matches) { toggleBtn.hidden = true; }
      toggleBtn.addEventListener('click', function () {
        paused = !paused;
        toggleBtn.textContent = paused ? 'Play' : 'Pause';
        toggleBtn.setAttribute('aria-pressed', String(paused));
        schedule();
      });
    }

    player.addEventListener('mouseenter', function () { hovered = true; schedule(); });
    player.addEventListener('mouseleave', function () { hovered = false; schedule(); });

    player.addEventListener('focusin', function (e) {
      focused = !!(e.target.matches && e.target.matches(':focus-visible'));
      schedule();
    });
    player.addEventListener('focusout', function (e) {
      if (!player.contains(e.relatedTarget)) {
        focused = false;
        schedule();
      }
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
        });
        schedule();
      }, { threshold: 0.35 });
      observer.observe(player);
    } else {
      inView = true;
    }

    reduceMotion.addEventListener('change', function () {
      if (toggleBtn) { toggleBtn.hidden = reduceMotion.matches; }
      schedule();
    });

    render();
  }

  document.querySelectorAll('[data-player]').forEach(setupPlayer);

  /* ---------- Thumbnail galleries ---------- */

  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var img = gallery.querySelector('[data-gallery-img]');
    var pill = gallery.querySelector('[data-gallery-pill]');
    var caption = gallery.querySelector('[data-gallery-caption]');
    var openBtn = gallery.querySelector('.shot-open');
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('.thumb'));

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        img.setAttribute('src', thumb.getAttribute('data-src'));
        img.setAttribute('alt', thumb.getAttribute('data-alt') || '');
        if (pill) { pill.textContent = thumb.getAttribute('data-pill'); }
        if (caption) { caption.textContent = thumb.getAttribute('data-label'); }
        if (openBtn) { openBtn.setAttribute('data-caption', thumb.getAttribute('data-label')); }
        thumbs.forEach(function (t) {
          t.setAttribute('aria-pressed', t === thumb ? 'true' : 'false');
        });
      });
    });
  });

  /* ---------- Lightbox ---------- */

  var dialog = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  var lbCaption = document.getElementById('lightbox-caption');
  var lbClose = dialog ? dialog.querySelector('.lb-close') : null;

  function openLightbox(btn) {
    var img = btn.querySelector('img');
    if (!img || !dialog) { return; }
    lbImg.setAttribute('src', img.getAttribute('src'));
    lbImg.setAttribute('alt', img.getAttribute('alt') || '');
    lbCaption.textContent = btn.getAttribute('data-caption') || img.getAttribute('alt') || '';
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }
  }

  function closeLightbox() {
    if (!dialog) { return; }
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.shot-open') : null;
    if (btn) { openLightbox(btn); }
  });

  if (dialog) {
    if (lbClose) { lbClose.addEventListener('click', closeLightbox); }
    // A click that lands on the dialog element itself (not its inner box) is a backdrop click.
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) { closeLightbox(); }
    });
  }
})();
