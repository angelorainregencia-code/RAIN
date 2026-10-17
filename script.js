document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     SOUND ENGINE  (Web Audio API — every sound is synthesized, no audio files)
     - Stays silent until the visitor's first click / tap / keypress, because
       browsers refuse to start audio before a user gesture.
     - Hover ticks only run on devices with a real hover pointer (not touch).
     - The mute choice is remembered between visits.
     ========================================================================== */
  const Sound = (() => {
    const KEY = 'site-sound';
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let ctx = null;
    let master = null;
    let unlocked = false;
    let muted = false;
    let lastHover = 0;
    let lastSection = 0;

    try { muted = localStorage.getItem(KEY) === 'off'; } catch (e) {}

    function unlock() {
      if (unlocked) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      unlocked = true;
    }

    ['pointerdown', 'keydown', 'touchstart'].forEach((evt) =>
      window.addEventListener(evt, unlock, { capture: true, passive: true })
    );

    function tone({ freq, to, type = 'sine', dur = 0.08, gain = 0.06, delay = 0 }) {
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(env);
      env.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }

    const library = {
      click:   () => tone({ freq: 720, to: 520, type: 'triangle', dur: 0.07, gain: 0.07 }),
      hover:   () => tone({ freq: 1500, type: 'sine', dur: 0.03, gain: 0.018 }),
      section: () => {
        tone({ freq: 330, type: 'sine', dur: 0.12, gain: 0.04 });
        tone({ freq: 495, type: 'sine', dur: 0.14, gain: 0.03, delay: 0.05 });
      },
      open:    () => tone({ freq: 380, to: 760, type: 'triangle', dur: 0.12, gain: 0.06 }),
      close:   () => tone({ freq: 760, to: 380, type: 'triangle', dur: 0.12, gain: 0.06 }),
      theme:   () => {
        tone({ freq: 520, to: 780, type: 'sine', dur: 0.1, gain: 0.06 });
        tone({ freq: 780, to: 1040, type: 'sine', dur: 0.12, gain: 0.04, delay: 0.07 });
      },
      success: () => {
        tone({ freq: 660, type: 'triangle', dur: 0.09, gain: 0.07 });
        tone({ freq: 990, type: 'triangle', dur: 0.16, gain: 0.07, delay: 0.08 });
      },
      on:      () => {
        tone({ freq: 500, type: 'triangle', dur: 0.08, gain: 0.06 });
        tone({ freq: 750, type: 'triangle', dur: 0.12, gain: 0.06, delay: 0.07 });
      },
      off:     () => {
        tone({ freq: 750, type: 'triangle', dur: 0.08, gain: 0.06 });
        tone({ freq: 500, type: 'triangle', dur: 0.12, gain: 0.05, delay: 0.07 });
      }
    };

    function play(name, force = false) {
      if (!unlocked || (muted && !force)) return;
      const now = performance.now();
      if (name === 'hover') {
        if (!canHover || now - lastHover < 70) return;
        lastHover = now;
      }
      if (name === 'section') {
        if (now - lastSection < 350) return;
        lastSection = now;
      }
      if (library[name]) library[name]();
    }

    function syncButtons() {
      document.querySelectorAll('.sound-toggle-btn').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(muted));
        btn.setAttribute('aria-label', muted ? 'Unmute interface sounds' : 'Mute interface sounds');
      });
    }

    function setMuted(next) {
      muted = next;
      try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (e) {}
      syncButtons();
    }

    syncButtons();

    return { play, setMuted, isMuted: () => muted };
  })();

  /* ---------- Sound toggle buttons (header + mobile menu) ---------- */
  document.querySelectorAll('.sound-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (Sound.isMuted()) {
        Sound.setMuted(false);
        Sound.play('on');
      } else {
        Sound.play('off');
        Sound.setMuted(true);
      }
    });
  });

  /* ---------- Click sound for every link / button (those with their own sound are skipped) ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button, [role="button"]');
    if (!el) return;
    if (el.matches('[data-theme-choice], .sound-toggle-btn, #copy-email, #menu-open, #menu-close')) return;
    Sound.play('click');
  });

  /* ---------- Hover tick on interactive elements ---------- */
  let hoverTarget = null;
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('a, button, .card-bossrod, .skill-card');
    if (!el || el === hoverTarget || el.contains(e.relatedTarget)) return;
    hoverTarget = el;
    Sound.play('hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (hoverTarget && !hoverTarget.contains(e.relatedTarget)) hoverTarget = null;
  });

  /* ---------- Soft chime as you browse into a new section ---------- */
  const sectionEls = document.querySelectorAll('section[id]');
  if ('IntersectionObserver' in window && sectionEls.length) {
    let activeSection = null;
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (activeSection !== null && activeSection !== entry.target.id) Sound.play('section');
          activeSection = entry.target.id;
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sectionEls.forEach((el) => sectionObserver.observe(el));
  }

  /* ==========================================================================
     THEME  (system / light / dark)
     The saved choice is applied by an inline script in <head> before first
     paint; this keeps the buttons, the OS setting and storage in sync.
     ========================================================================== */
  const Theme = (() => {
    const KEY = 'site-theme';
    const root = document.documentElement;
    const systemQuery = window.matchMedia('(prefers-color-scheme: light)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let fadeTimer = null;

    function saved() {
      try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; }
    }

    function resolve(choice) {
      if (choice === 'light' || choice === 'dark') return choice;
      return systemQuery.matches ? 'light' : 'dark';
    }

    function apply(choice, { animate = false, persist = true } = {}) {
      if (animate && !reducedMotion) {
        root.classList.add('theme-transition');
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => root.classList.remove('theme-transition'), 500);
      }
      root.setAttribute('data-theme', resolve(choice));
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolve(choice) } }));
      if (persist) {
        try { localStorage.setItem(KEY, choice); } catch (e) {}
      }
      document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === choice));
      });
    }

    function onSystemChange() {
      if (saved() === 'system') apply('system', { animate: true, persist: false });
    }
    if (systemQuery.addEventListener) systemQuery.addEventListener('change', onSystemChange);
    else if (systemQuery.addListener) systemQuery.addListener(onSystemChange);

    apply(saved(), { persist: false });

    return { apply };
  })();

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Theme.apply(btn.dataset.themeChoice, { animate: true });
      Sound.play('theme');
    });
  });

  /* ---------- Mobile Menu ---------- */
  const overlay = document.getElementById('mobile-overlay');
  const openBtn = document.getElementById('menu-open');
  const closeBtn = document.getElementById('menu-close');

  function openMenu() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    Sound.play('open');
  }
  function closeMenu(silent) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (silent !== true) Sound.play('close');
  }

  if (openBtn) openBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', () => closeMenu());
  // Links already make the click sound, so closing from a link stays silent.
  overlay?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu(true)));

  /* ---------- Smooth Scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Scroll Reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('in-view'), i * 60);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Copy Email ---------- */
  const copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const email = copyBtn.getAttribute('data-email');
      const original = copyBtn.textContent;
      try {
        await navigator.clipboard.writeText(email);
        copyBtn.textContent = 'COPIED ✓';
      } catch (err) {
        const temp = document.createElement('textarea');
        temp.value = email;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        copyBtn.textContent = 'COPIED ✓';
      }
      Sound.play('success');
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.classList.remove('copied');
      }, 1800);
    });
  }

  /* ---------- Profile photo fallback ----------
     If profile.jpg is missing or the filename's capitalisation doesn't match
     (GitHub Pages is case-sensitive), show a monogram instead of a broken icon. */
  (() => {
    const img = document.querySelector('.dithered-portrait');
    if (!img) return;
    const fallback = () => {
      const box = img.parentElement;
      img.remove();
      const f = document.createElement('div');
      f.className = 'portrait-fallback';
      f.setAttribute('role', 'img');
      f.setAttribute('aria-label', 'Rain Regencia');
      f.textContent = 'RR';
      box.appendChild(f);
    };
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener('error', fallback, { once: true });
  })();

  /* ---------- Side Rays background (React Bits) ----------
     Mounted by siderays.js. Re-tints itself on theme change (see the
     "themechange" event from the Theme controller).
     Tweak the look here: colors, origin, intensity, spread, density, speed... */
  (() => {
    const host = document.getElementById('rays-bg');
    if (!host || !window.SideRays) return;

    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const base = {
      origin: 'top-right',   // top-right | top-left | bottom-right | bottom-left | right | left
      blend: 0.55,
      speed: 1.6,
      intensity: 2,          // lower this if you want the beams subtler
      spread: 2,
      density: 5,
      sharpness: 0.5,
      falloff: 1.8,
      glow: 1,
      dust: 0.25,
      intro: true,
      followMouse: !coarse,  // beams lean toward the cursor on desktop only
      mouseInfluence: 0.5,
      maxFps: 30,
      maxDevicePixelRatio: coarse ? 1.25 : 1.5
    };

    const looks = {
      dark:  { ...base, rayColor1: '#00f0ff', rayColor2: '#4f7cff', lightMode: false, opacity: 1 },
      light: { ...base, rayColor1: '#00707c', rayColor2: '#3b5bdb', lightMode: true,  opacity: 1 }
    };

    const currentLook = () =>
      document.documentElement.getAttribute('data-theme') === 'light' ? looks.light : looks.dark;

    const bg = window.SideRays.create(host, currentLook());
    if (!bg.supported) { host.remove(); return; } // no WebGL2: plain themed page remains

    document.addEventListener('themechange', (e) => {
      bg.update(e.detail.theme === 'light' ? looks.light : looks.dark);
    });
  })();
});