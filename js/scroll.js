/* =========================================================================
   scroll.js — active nav highlight, scroll-progress bar, header state
   Smooth scrolling + header offset are handled in CSS.
   ========================================================================= */

// Leading + trailing throttle: runs immediately, and once more at the end of
// the window if events kept arriving — so the bar/nav never settle on a stale value.
function throttle(fn, wait) {
    let blocked = false, pending = false;
    const run = () => {
        fn();
        blocked = true;
        setTimeout(() => {
            blocked = false;
            if (pending) { pending = false; run(); }
        }, wait);
    };
    return () => {
        if (blocked) { pending = true; return; }
        run();
    };
}

// Highlight the nav link for the section currently in view.
function initActiveNavigation() {
    const sections = document.querySelectorAll('.section[id]');
    const navLinks = document.querySelectorAll('.nav__link');
    if (!sections.length || !navLinks.length) return;

    const update = () => {
        let current = '';
        const pos = window.scrollY + window.innerHeight * 0.32;
        sections.forEach((section) => {
            if (pos >= section.offsetTop && pos < section.offsetTop + section.offsetHeight) {
                current = section.id;
            }
        });
        navLinks.forEach((link) => {
            const active = link.getAttribute('href') === `#${current}`;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    };

    window.addEventListener('scroll', throttle(update, 100), { passive: true });
    update();
}

// Top progress bar driven by transform: scaleX (cheap, GPU-friendly).
function initScrollProgress() {
    let bar = document.querySelector('.scroll-indicator');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'scroll-indicator';
        document.body.appendChild(bar);
    }
    const update = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        bar.style.transform = `scaleX(${progress})`;
    };
    window.addEventListener('scroll', throttle(update, 40), { passive: true });
    update();
}

// Frost the header once the page is scrolled.
function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    const update = () => header.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', throttle(update, 100), { passive: true });
    update();
}

function initScrollFeatures() {
    initActiveNavigation();
    initScrollProgress();
    initHeaderScroll();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollFeatures);
} else {
    initScrollFeatures();
}
