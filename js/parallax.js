/* =========================================================================
   parallax.js — subtle pointer parallax on the living background.
   Gives the lava-lamp a little depth as the cursor moves. The rAF loop runs
   only while the pointer is moving and stops once it settles. Respects
   prefers-reduced-motion and skips touch devices.
   ========================================================================= */
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const bg = document.querySelector('.lava-bg');
    if (!bg || reduce || coarse) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0, rafId = null;
    const MAX = 22; // px of travel

    function animate() {
        curX += (targetX - curX) * 0.08;
        curY += (targetY - curY) * 0.08;
        bg.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;

        if (Math.abs(targetX - curX) < 0.05 && Math.abs(targetY - curY) < 0.05) {
            rafId = null;
            return;
        }
        rafId = requestAnimationFrame(animate);
    }

    document.addEventListener('mousemove', (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * MAX;
        targetY = (e.clientY / window.innerHeight - 0.5) * MAX;
        if (rafId === null) rafId = requestAnimationFrame(animate);
    }, { passive: true });
})();
