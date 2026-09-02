document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     WEB AUDIO SFX SYNTHESIZER (CLICK & HOVER SOUNDS)
     ========================================================================== */
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('portfolio-sound') !== 'false';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playHoverSound() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, ctx.currentTime);

    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  function playClickSound() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  // Attach hover & click sounds to interactive elements
  const interactiveElements = document.querySelectorAll('a, button, .card-bossrod, .metric-block');
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', playHoverSound);
    el.addEventListener('click', playClickSound);
  });

  // Sound Toggle Control
  const soundBtns = document.querySelectorAll('.sound-toggle-btn');
  
  function updateSoundUI() {
    soundBtns.forEach((btn) => {
      const iconOn = btn.querySelector('.sound-icon-on');
      const iconOff = btn.querySelector('.sound-icon-off');

      if (soundEnabled) {
        btn.classList.remove('muted');
        if (iconOn) iconOn.style.display = 'block';
        if (iconOff) iconOff.style.display = 'none';
      } else {
        btn.classList.add('muted');
        if (iconOn) iconOn.style.display = 'none';
        if (iconOff) iconOff.style.display = 'block';
      }
    });
  }

  soundBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEnabled = !soundEnabled;
      localStorage.setItem('portfolio-sound', soundEnabled);
      updateSoundUI();
      if (soundEnabled) playClickSound();
    });
  });

  updateSoundUI();

  /* ==========================================================================
     SEGMENTED THEME SWITCHER (SYSTEM / LIGHT / DARK)
     ========================================================================== */
  const themeOpts = document.querySelectorAll('.theme-opt');
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function getStoredTheme() {
    return localStorage.getItem('portfolio-theme') || 'system';
  }

  function applyTheme(mode) {
    const isDark = mode === 'dark' || (mode === 'system' && mediaQuery.matches);

    if (isDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }

    // Update active pill UI state
    themeOpts.forEach((btn) => {
      if (btn.getAttribute('data-theme') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Handle system preference changes when set to 'system'
  mediaQuery.addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  });

  // Switcher option clicks
  themeOpts.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const selected = btn.getAttribute('data-theme');
      localStorage.setItem('portfolio-theme', selected);
      applyTheme(selected);
    });
  });

  // Initialize Theme on load
  applyTheme(getStoredTheme());

  /* ---------- Mobile Menu ---------- */
  const overlay = document.getElementById('mobile-overlay');
  const openBtn = document.getElementById('menu-open');
  const closeBtn = document.getElementById('menu-close');

  function openMenu() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  overlay?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

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
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.classList.remove('copied');
      }, 1800);
    });
  }

  /* ---------- ColorBends WebGL Canvas ---------- */
  (() => {
    const canvas = document.getElementById('color-bends-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#A855F7') },
        uSpeed: { value: 0.2 },
        uFrequency: { value: 1.0 },
        uNoise: { value: 0.15 },
        uBandWidth: { value: 0.14 },
        uIntensity: { value: 1.3 },
        uFadeTop: { value: 0.75 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uSpeed;
        uniform float uFrequency;
        uniform float uNoise;
        uniform float uBandWidth;
        uniform float uIntensity;
        uniform float uFadeTop;
        varying vec2 vUv;

        float rand(vec2 n) { 
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        void main() {
          vec2 st = vec2(vUv.y, 1.0 - vUv.x);
          float t = uTime * uSpeed;
          float wave = sin(st.x * uFrequency * 6.28318 + t) * uBandWidth;
          float noiseVal = (rand(st + vec2(t)) - 0.5) * uNoise;
          
          float dist = abs(st.y - 0.5 + wave + noiseVal);
          float bend = smoothstep(uBandWidth, 0.0, dist) * uIntensity;
          
          float fade = smoothstep(1.0, 1.0 - uFadeTop, vUv.y);
          vec3 finalColor = uColor * bend * fade;

          gl_FragColor = vec4(finalColor, bend * fade * 0.85);
        }
      `,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function animate(time) {
      material.uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  })();
});