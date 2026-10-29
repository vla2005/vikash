/**
 * ViKash Landing Page Animation & Interaction Engine
 * Matches exactly the 3D viewport calculations, scroll transforms, and animations of the original design.
 */
(() => {
  'use strict';

  // 1. Reveal Animations (data-reveal)
  const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => {
      const delay = el.dataset.reveal || 0;
      el.style.transitionDelay = `${delay}ms`;
      revealObserver.observe(el);
    });
  }

  // 2. Continuous Scroll Effects (data-rolagem)
  const rolagemTransitions = {
    passagem: (top, height, vh) => (vh - top) / (vh + height),
    saida: (top, height) => -top / height,
    entrada: (top, height, vh) => (vh - top) / (vh * 0.8)
  };

  const rolagemElements = Array.from(document.querySelectorAll('[data-rolagem]'));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp01(val) {
    return Math.min(1, Math.max(0, val));
  }

  function updateRolagem() {
    if (prefersReducedMotion) {
      rolagemElements.forEach((el) => el.style.setProperty('--p', '1'));
      return;
    }
    const vh = window.innerHeight;
    rolagemElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const fn = rolagemTransitions[el.dataset.rolagem] || rolagemTransitions.passagem;
      const progress = clamp01(fn(rect.top, rect.height, vh));
      el.style.setProperty('--p', progress.toFixed(4));
    });
  }

  // 3. Tour Section 3D Stage & Mobile Screens Controller
  const tourSection = document.querySelector('.tour');
  const tourPalco = document.querySelector('.tour__palco');
  const tourPassos = Array.from(document.querySelectorAll('.passo'));
  const tourIndiceLinks = Array.from(document.querySelectorAll('.tour__indice a'));
  const desktopLayers = tourPalco ? Array.from(tourPalco.querySelectorAll('.tour__celular .celular__camada')) : [];

  // Configuration for each step:
  // Step 0: Voz (2 screens) -> color lime
  // Step 1: Contas (1 screen) -> color sapphire
  // Step 2: IA (2 screens) -> color amber
  // Step 3: Extrato (2 screens) -> color sage
  const stepConfigs = [
    { id: 'voz', numScreens: 2, color: 'var(--color-lume)' },
    { id: 'contas', numScreens: 1, color: 'var(--color-sapphire)' },
    { id: 'ia', numScreens: 2, color: 'var(--color-amber)' },
    { id: 'extrato', numScreens: 2, color: 'var(--color-sage)' }
  ];

  // Cumulative screen offsets: [0, 2, 3, 5]
  const screenOffsets = stepConfigs.reduce((acc, curr, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + stepConfigs[idx - 1].numScreens);
    return acc;
  }, []);

  function getStepScreenProgress(numScreens, progress) {
    const clampedProgress = clamp01(progress);
    const totalPos = Math.min(numScreens - 1e-4, clampedProgress * numScreens);
    const screenIndex = Math.floor(totalPos);
    const scrollInside = clamp01((totalPos - screenIndex - 0.15) / 0.6);
    return {
      screenIndex,
      scrollInside
    };
  }

  const desktopMedia = window.matchMedia('(min-width: 1081px)');

  function updateTour() {
    if (!tourSection || tourPassos.length === 0) return;
    const vh = window.innerHeight;

    if (desktopMedia.matches) {
      // Desktop: sticky 3D phone stage
      const mid = vh / 2;
      const relativeProgresses = tourPassos.map((p) => {
        const rect = p.getBoundingClientRect();
        return (mid - rect.top) / rect.height;
      });

      let activeStepIdx = relativeProgresses.findLastIndex((val) => val >= 0);
      if (activeStepIdx < 0) activeStepIdx = 0;
      if (activeStepIdx >= tourPassos.length) activeStepIdx = tourPassos.length - 1;

      const currentProgress = relativeProgresses[activeStepIdx];
      const cfg = stepConfigs[activeStepIdx] || { numScreens: 1, color: 'var(--color-lume)' };
      const { screenIndex, scrollInside } = getStepScreenProgress(cfg.numScreens, currentProgress);

      const activeLayerIdx = (screenOffsets[activeStepIdx] || 0) + screenIndex;

      if (tourPalco) {
        tourPalco.style.setProperty('--cor', cfg.color);
        tourPalco.style.setProperty('--giro', activeStepIdx % 2 ? '14deg' : '-14deg');
        tourPalco.style.setProperty('--rolagem-tela', prefersReducedMotion ? '0' : scrollInside.toFixed(4));
        const arc = clamp01((activeStepIdx + clamp01(currentProgress)) / tourPassos.length);
        tourPalco.style.setProperty('--arco', arc.toFixed(4));
      }

      // Update active layer in sticky phone
      desktopLayers.forEach((layer, idx) => {
        if (idx === activeLayerIdx) {
          layer.setAttribute('data-ativa', 'true');
          layer.setAttribute('aria-hidden', 'false');
        } else {
          layer.removeAttribute('data-ativa');
          layer.setAttribute('aria-hidden', 'true');
        }
      });

      // Update tour index tab pills
      tourIndiceLinks.forEach((link, idx) => {
        if (idx === activeStepIdx) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      // Update passo active attribute
      tourPassos.forEach((p, idx) => {
        if (idx === activeStepIdx) {
          p.setAttribute('data-ativo', 'true');
        } else {
          p.removeAttribute('data-ativo');
        }
      });

    } else {
      // Mobile / Tablet: individual .passo__celular inside each article
      tourPassos.forEach((p, stepIdx) => {
        const celular = p.querySelector('.passo__celular');
        if (!celular) return;
        const rect = celular.getBoundingClientRect();
        const progress = (vh - rect.top) / (vh + rect.height);
        const cfg = stepConfigs[stepIdx] || { numScreens: 1, color: 'var(--color-lume)' };
        const { screenIndex, scrollInside } = getStepScreenProgress(cfg.numScreens, progress);

        celular.style.setProperty('--rolagem-tela', prefersReducedMotion ? '0' : scrollInside.toFixed(4));
        celular.style.setProperty('--arco', clamp01(progress).toFixed(4));

        const mobileLayers = Array.from(celular.querySelectorAll('.celular__camada'));
        mobileLayers.forEach((layer, idx) => {
          if (idx === screenIndex) {
            layer.setAttribute('data-ativa', 'true');
            layer.setAttribute('aria-hidden', 'false');
          } else {
            layer.removeAttribute('data-ativa');
            layer.setAttribute('aria-hidden', 'true');
          }
        });
      });
    }
  }

  // Combined animation tick
  let rafPending = false;
  function onScrollOrResize() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        updateRolagem();
        updateTour();
      });
    }
  }

  // Initial runs
  updateRolagem();
  updateTour();

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
  desktopMedia.addEventListener('change', onScrollOrResize);

  // 4. Mobile Menu Toggle
  const menuButton = document.querySelector('.nav__menu');
  const navContainer = document.querySelector('.nav');
  const navMenu = document.getElementById('nav-menu');
  if (menuButton && navContainer) {
    menuButton.addEventListener('click', () => {
      const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isExpanded));
      navContainer.classList.toggle('nav--aberto', !isExpanded);
    });

    // Close menu when clicking any nav link
    if (navMenu) {
      navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          menuButton.setAttribute('aria-expanded', 'false');
          navContainer.classList.remove('nav--aberto');
        });
      });
    }
  }

  // 5. Active Nav Section Tracker
  const navLinks = Array.from(document.querySelectorAll('.nav__links a[href^="#"]'));
  const trackedSections = navLinks
    .map((l) => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  if (trackedSections.length > 0) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((l) => {
            if (l.getAttribute('href') === `#${id}`) {
              l.setAttribute('aria-current', 'true');
            } else {
              l.removeAttribute('aria-current');
            }
          });
        }
      });
    }, {
      threshold: 0.25,
      rootMargin: '-60px 0px -40% 0px'
    });

    trackedSections.forEach((sec) => navObserver.observe(sec));
  }
})();
