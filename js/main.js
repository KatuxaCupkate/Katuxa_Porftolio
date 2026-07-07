/* =========================================================================
   main.js — menu, link wiring (from config.js), email copy, lazy video, reveal
   ========================================================================= */

// Wire every [data-link] button to a URL from window.PORTFOLIO_LINKS.
// Empty value -> the button shows "Link soon" and is disabled, so the page
// never ships a dead link.
// Turn loosely-typed config values into real, openable URLs:
//   "@KatuXaKru" -> https://t.me/KatuXaKru,  "github.com/x" -> https://github.com/x
function normalizeUrl(key, raw) {
    let v = (raw || '').trim();
    if (!v) return v;
    if (/^https?:\/\//i.test(v)) return v;
    if (key === 'telegram') {
        if (v.startsWith('@')) return 'https://t.me/' + v.slice(1);
        if (/^t\.me\//i.test(v)) return 'https://' + v;
        if (!v.includes('/') && !v.includes('.')) return 'https://t.me/' + v;
    }
    if (key === 'github' && v.startsWith('@')) return 'https://github.com/' + v.slice(1);
    if (/^[\w-]+\.[\w.-]+/.test(v)) return 'https://' + v;   // bare domain
    return v;
}

function initLinks() {
    const links = window.PORTFOLIO_LINKS || {};

    // Keep the displayed/copied email in sync with the config.
    const emailValue = document.getElementById('email-value');
    if (emailValue && links.email) emailValue.textContent = links.email;

    document.querySelectorAll('[data-link]').forEach((el) => {
        const key = el.getAttribute('data-link');
        const url = normalizeUrl(key, links[key] || '');
        const labelEl = el.querySelector('.btn__label');

        if (url) {
            el.setAttribute('href', url);
            el.classList.remove('is-pending');
            const external = /^https?:\/\//i.test(url);
            if (external) el.setAttribute('target', '_blank');
            el.removeAttribute('aria-disabled');
        } else {
            // stays focusable so aria-disabled is announced; click is inert
            el.classList.add('is-pending');
            el.setAttribute('href', '#');
            el.setAttribute('aria-disabled', 'true');
            if (labelEl) labelEl.textContent = 'Link soon';
            el.addEventListener('click', (e) => e.preventDefault());
        }
    });
}

// Mobile navigation: open/close with outside-click, Escape and resize handling.
function initMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (!navToggle || !navMenu) return;

    const closeMenu = () => {
        navMenu.classList.remove('show');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('show');
        navToggle.classList.toggle('active', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navMenu.querySelectorAll('.nav__link').forEach((link) =>
        link.addEventListener('click', closeMenu)
    );

    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('show')) {
            closeMenu();
            navToggle.focus();
        }
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 900) closeMenu();
    });
}

// Copy the e-mail to the clipboard with a graceful fallback.
function initEmailCopy() {
    const copyButton = document.getElementById('copy-email');
    const emailValue = document.getElementById('email-value');
    if (!copyButton || !emailValue) return;

    copyButton.addEventListener('click', async () => {
        const email = emailValue.textContent.trim();
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(email);
            } else {
                fallbackCopyText(email);
            }
            copyButton.classList.add('copied');
            setTimeout(() => copyButton.classList.remove('copied'), 2000);
        } catch (err) {
            console.error('Failed to copy email:', err);
            const label = copyButton.querySelector('.btn-text');
            if (label) {
                const original = label.textContent;
                label.textContent = 'Copy failed';
                setTimeout(() => { label.textContent = original; }, 2000);
            }
        }
    });
}

function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-999999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
}

// Lazily load + play the gameplay clips only near the viewport; pause off-screen.
function initLazyVideos() {
    const videos = document.querySelectorAll('video[data-lazy]');
    if (!videos.length) return;

    // The gameplay clips are portfolio content, so they always autoplay (muted,
    // looping) and cannot be paused; they only pause off-screen to save power.
    if (!('IntersectionObserver' in window)) {
        videos.forEach(loadVideo);
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
                loadVideo(video);
                video.play().catch((err) => console.debug('autoplay blocked', err));
            } else {
                video.pause();
            }
        });
    }, { rootMargin: '250px 0px' });

    videos.forEach((v) => observer.observe(v));
}

// Show a real photo in the About blob when one is set in config.js (photo:).
function initAvatar() {
    const links = window.PORTFOLIO_LINKS || {};
    const img = document.getElementById('about-photo');
    if (!img || !links.photo) return;
    img.addEventListener('load', () => {
        img.hidden = false;
        const mono = img.parentElement && img.parentElement.querySelector('.about__monogram');
        if (mono) mono.style.display = 'none';
    });
    img.addEventListener('error', () => { img.hidden = true; });
    img.src = links.photo;
}

function loadVideo(video) {
    const source = video.querySelector('source[data-src]');
    if (source && !source.getAttribute('src')) {
        video.addEventListener('error', () => {
            console.warn('video failed to load:', source.dataset.src);
            const box = video.closest('.play-card__media, .duo-video, .base-card__media');
            if (box) box.classList.add('video-error');
        }, { once: true });
        source.setAttribute('src', source.dataset.src);
        video.load();
    }
}

// Fade/rise elements in as they enter the viewport.
function initScrollReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('is-visible'));
        return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach((el) => observer.observe(el));
}

function initEasterEgg() {
    console.log('%c✦ Katia — Creative Technical Artist', 'font:600 18px Space Grotesk,sans-serif;color:#ff5c7a');
    console.log('%cthe shaders on the page are real, by the way :)', 'color:#2ee6d6');
}

// Click a [data-zoom] video to open it enlarged in a lightbox (a bit larger
// than the inline preview). Close on backdrop click, the ✕ button, or Escape.
function initVideoZoom() {
    const zoomables = document.querySelectorAll('video[data-zoom]');
    if (!zoomables.length) return;

    const box = document.createElement('div');
    box.className = 'video-lightbox';
    box.hidden = true;
    box.innerHTML =
        '<div class="video-lightbox__inner">' +
        '<button class="video-lightbox__close" type="button" aria-label="Close">✕</button>' +
        '<video class="video-lightbox__el" muted loop playsinline controls></video>' +
        '<p class="video-lightbox__cap"></p>' +
        '</div>';
    document.body.appendChild(box);

    const bigVideo = box.querySelector('.video-lightbox__el');
    const cap = box.querySelector('.video-lightbox__cap');

    function open(src, label) {
        if (!src) return;
        bigVideo.src = src;
        cap.textContent = label || '';
        cap.hidden = !label;
        box.hidden = false;
        document.body.classList.add('no-scroll');
        bigVideo.play().catch(() => {});
    }
    function close() {
        box.hidden = true;
        bigVideo.pause();
        bigVideo.removeAttribute('src');
        bigVideo.load();
        document.body.classList.remove('no-scroll');
    }

    zoomables.forEach((v) => {
        v.addEventListener('click', () => {
            const source = v.querySelector('source[data-src]');
            const src = (source && (source.getAttribute('src') || source.dataset.src)) || v.currentSrc;
            open(src, v.dataset.zoomLabel);
        });
    });

    box.addEventListener('click', (e) => {
        if (e.target === box || e.target.closest('.video-lightbox__close')) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !box.hidden) close();
    });
}

function initApp() {
    initLinks();
    initAvatar();
    initMobileMenu();
    initEmailCopy();
    initLazyVideos();
    initScrollReveal();
    initVideoZoom();
    initEasterEgg();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
