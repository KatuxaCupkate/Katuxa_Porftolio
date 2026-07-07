/* =========================================================================
   shaders.js — tiny live WebGL fragment shaders for the "Shaders & VFX"
   gallery. Each <canvas data-shader="…"> renders its own effect. Loops pause
   when off-screen or the tab is hidden, and fall back to a static gradient with
   no WebGL. The shaders are core to the page's identity, so they keep animating
   regardless of prefers-reduced-motion.
   ========================================================================= */
(function () {
    const canvases = document.querySelectorAll('canvas[data-shader]');
    if (!canvases.length) return;

    const VERT = `
        attribute vec2 a_pos;
        void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const HELPERS = `
        float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        vec2 hash22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
        float vnoise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.02; a *= 0.5; } return s; }
        vec3 pal(float t){
            vec3 c0 = vec3(0.055, 0.039, 0.086);
            vec3 c1 = vec3(1.0, 0.239, 0.545);
            vec3 c2 = vec3(1.0, 0.420, 0.290);
            vec3 c3 = vec3(1.0, 0.698, 0.290);
            vec3 col = mix(c0, c1, smoothstep(0.0, 0.40, t));
            col = mix(col, c2, smoothstep(0.35, 0.70, t));
            col = mix(col, c3, smoothstep(0.65, 1.00, t));
            return col;
        }
    `;

    const BODIES = {
        flow: `
            vec2 uv = gl_FragCoord.xy / u_res;
            vec2 p = uv * 2.4; p.x *= u_res.x / u_res.y;
            float t = u_time * 0.06;
            vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));
            vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + 2.0 * q + vec2(8.3, 2.8) - 0.12 * t));
            float f = fbm(p + 2.5 * r);
            float v = clamp(f * 1.15, 0.0, 1.0);
            vec3 col = pal(v);
            col = mix(col, vec3(0.18, 0.90, 0.84), smoothstep(0.0, 0.18, 1.0 - v) * 0.18 * (1.0 - v));
            col += 0.04;
            gl_FragColor = vec4(col, 1.0);
        `,
        light: `
            vec2 uv = gl_FragCoord.xy / u_res;
            float aspect = u_res.x / u_res.y;
            vec2 p = uv; p.x *= aspect;
            float t = u_time;
            vec2 l1 = vec2(0.5 * aspect, 0.5) + vec2(cos(t * 0.5), sin(t * 0.62)) * 0.28 * vec2(aspect, 1.0);
            float d1 = length(p - l1);
            float i1 = 0.16 / (d1 * d1 + 0.02);
            vec2 l2 = vec2(0.5 * aspect, 0.5) + vec2(cos(t * 0.4 + 2.1), sin(t * 0.5 + 1.3)) * 0.34 * vec2(aspect, 1.0);
            float d2 = length(p - l2);
            float i2 = 0.10 / (d2 * d2 + 0.03);
            vec3 bg = vec3(0.055, 0.039, 0.086);
            vec3 warm = vec3(1.0, 0.36, 0.42);
            vec3 cool = vec3(0.30, 0.78, 1.0);
            vec3 col = bg + warm * i1 + cool * i2;
            col = col / (col + 0.7);
            col = pow(col, vec3(0.85));
            gl_FragColor = vec4(col, 1.0);
        `,
        voronoi: `
            vec2 uv = gl_FragCoord.xy / u_res;
            float aspect = u_res.x / u_res.y;
            vec2 p = uv * 4.0; p.x *= aspect;
            float t = u_time * 0.4;
            vec2 g = floor(p), f = fract(p);
            float f1 = 8.0, f2 = 8.0;
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 o = vec2(float(x), float(y));
                    vec2 pt = hash22(g + o); pt = 0.5 + 0.5 * sin(t + 6.2831 * pt);
                    float d = length(o + pt - f);
                    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
                }
            }
            float edge = smoothstep(0.0, 0.06, f2 - f1);
            float cell = f1;
            vec3 col = pal(0.3 + 0.6 * cell);
            col = mix(vec3(0.18, 0.95, 0.86), col, edge);
            col *= 0.6 + 0.6 * (1.0 - cell);
            gl_FragColor = vec4(col, 1.0);
        `,
        ripple: `
            vec2 uv = gl_FragCoord.xy / u_res;
            float aspect = u_res.x / u_res.y;
            vec2 p = (uv - 0.5); p.x *= aspect;
            float t = u_time;
            vec2 s1 = vec2(cos(t * 0.5), sin(t * 0.4)) * 0.18;
            vec2 s2 = vec2(cos(t * 0.33 + 2.0), sin(t * 0.45 + 1.0)) * 0.22;
            float d1 = length(p - s1), d2 = length(p - s2);
            float w = sin(d1 * 38.0 - t * 2.4) * 0.5 + 0.5;
            w *= sin(d2 * 30.0 - t * 1.8) * 0.5 + 0.5;
            float ring = pow(w, 1.5);
            vec3 cool = vec3(0.18, 0.90, 0.92);
            vec3 violet = vec3(0.54, 0.42, 1.0);
            vec3 bg = vec3(0.06, 0.045, 0.10);
            vec3 col = bg + mix(violet, cool, ring) * ring * 0.9;
            col += vec3(1.0, 0.4, 0.5) * smoothstep(0.4, 0.0, d1) * 0.25;
            gl_FragColor = vec4(col, 1.0);
        `,
    };

    function fallback(canvas) {
        const fig = canvas.closest('.shader-tile') || canvas;
        canvas.style.display = 'none';
        fig.style.background =
            'radial-gradient(120% 120% at 20% 20%, rgba(255,61,139,0.5), transparent 60%),' +
            'radial-gradient(120% 120% at 90% 80%, rgba(46,230,214,0.4), transparent 60%),' +
            'linear-gradient(135deg, #221735, #0e0a16)';
    }

    function compile(gl, type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.warn('shader compile error:', gl.getShaderInfoLog(sh));
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }

    function setup(canvas) {
        const kind = canvas.getAttribute('data-shader');
        const body = BODIES[kind];
        if (!body) return;

        const opts = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' };
        const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
        if (!gl) { fallback(canvas); return; }

        const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        const hasHighp = !!(hp && hp.precision > 0);
        // The noise-based tiles (flow, voronoi) rely on highp hashing; on
        // mediump-only GPUs they degrade to flat banding — show the gradient instead.
        if (!hasHighp && (kind === 'flow' || kind === 'voronoi')) { fallback(canvas); return; }
        const precision = hasHighp ? 'highp' : 'mediump';
        const frag = `precision ${precision} float;\nuniform float u_time;\nuniform vec2 u_res;\n${HELPERS}\nvoid main(){\n${body}\n}`;

        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
        if (!vs || !fs) { fallback(canvas); return; }

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fallback(canvas); return; }
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uRes = gl.getUniformLocation(prog, 'u_res');

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
            const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
            const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w; canvas.height = h;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        function render(t) {
            if (gl.isContextLost()) return;
            resize();
            gl.uniform1f(uTime, t);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        // `elapsed` accumulates run time so the effect resumes smoothly instead
        // of snapping back to t=0 every time the tile re-enters view.
        let rafId = null, visible = false, elapsed = 0, start = performance.now();
        function loop() {
            render((elapsed + performance.now() - start) / 1000);
            rafId = requestAnimationFrame(loop);
        }
        function play() {
            if (rafId === null) { start = performance.now(); rafId = requestAnimationFrame(loop); }
        }
        function stop() {
            if (rafId !== null) { elapsed += performance.now() - start; cancelAnimationFrame(rafId); rafId = null; }
        }

        canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); fallback(canvas); }, false);

        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                visible = e.isIntersecting;
                if (visible) play(); else stop();
            });
        }, { rootMargin: '120px 0px' });
        io.observe(canvas);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else if (visible) play();
        });
        // Repaint once on resize if currently paused (offscreen/hidden).
        window.addEventListener('resize', () => { if (visible && rafId === null) render(8.0); }, { passive: true });
    }

    canvases.forEach(setup);
})();
