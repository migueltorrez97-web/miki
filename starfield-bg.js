// ============================================================================
// JARVIS Landing — Campo de estrellas Three.js de fondo (full-page)
// ----------------------------------------------------------------------------
// Canvas fixed cubriendo todo el viewport (z-index 0, detras de todo el
// contenido). Renderiza ~2400 estrellas en un volumen 3D con rotacion muy
// lenta — da la sensacion cinematografica de profundidad y movimiento
// suave que Danny vio en la seccion del nucleo, ahora en toda la pagina.
// Cero conflicto con el orb principal (que vive en su propio canvas).
// ============================================================================
import * as THREE from 'three';

const canvas = document.getElementById('lp-starfield-canvas');
if (canvas) {
    // Marca al body — las estrellas CSS estaticas (body::before/after)
    // se atenuan en este modo para no competir con el campo dinamico.
    document.body.classList.add('has-starfield-3d');
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
    );
    camera.position.z = 60;

    // Textura circular generada dinamicamente — sin esto, los puntos de
    // WebGL se renderizan como cuadrados (efecto Minecraft pixelado).
    // Gradiente radial: centro brillante, bordes feathered hasta alpha 0.
    function makeStarTexture() {
        const size = 64;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2,
        );
        grad.addColorStop(0.00, 'rgba(255,255,255,1.0)');
        grad.addColorStop(0.25, 'rgba(255,255,255,0.65)');
        grad.addColorStop(0.55, 'rgba(255,255,255,0.18)');
        grad.addColorStop(1.00, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    }
    const starTexture = makeStarTexture();

    // Tres capas de estrellas con distinta profundidad y color — parallax
    // sutil: las "lejanas" se mueven menos en cada frame, las cercanas mas.
    function makeStarLayer({ count, range, depth, size, color, opacity }) {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * range;
            positions[i * 3 + 1] = (Math.random() - 0.5) * range;
            positions[i * 3 + 2] = (Math.random() - 0.5) * depth;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            map: starTexture,
            size,
            color,
            transparent: true,
            opacity,
            sizeAttenuation: true,
            depthWrite: false,
            alphaTest: 0.001,
            blending: THREE.AdditiveBlending,
        });
        return new THREE.Points(geom, mat);
    }

    const farStars  = makeStarLayer({ count: 1600, range: 280, depth: 120, size: 0.55, color: 0xffffff, opacity: 0.80 });
    const midStars  = makeStarLayer({ count: 700,  range: 220, depth: 90,  size: 0.85, color: 0xc7f0ff, opacity: 0.85 });
    const nearStars = makeStarLayer({ count: 220,  range: 160, depth: 60,  size: 1.30, color: 0x7ee8ff, opacity: 0.95 });
    scene.add(farStars, midStars, nearStars);

    // Twinkle: variar la opacidad global de cada capa con seno desfasado.
    // Sin shader: tres setOpacity al material son baratos y dan la respiracion.
    let mounted = true;
    let lastFrame = performance.now();

    function animate(now) {
        if (!mounted) return;
        const dt = (now - lastFrame) * 0.001;
        lastFrame = now;
        farStars.rotation.y  += dt * 0.008;
        farStars.rotation.x  += dt * 0.003;
        midStars.rotation.y  += dt * 0.014;
        midStars.rotation.x  += dt * 0.006;
        nearStars.rotation.y += dt * 0.022;
        nearStars.rotation.x += dt * 0.010;
        const tSec = now * 0.001;
        farStars.material.opacity  = 0.65 + 0.20 * Math.sin(tSec * 0.6);
        midStars.material.opacity  = 0.70 + 0.20 * Math.sin(tSec * 0.9 + 1.5);
        nearStars.material.opacity = 0.80 + 0.20 * Math.sin(tSec * 1.2 + 3.0);
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // Si la pestaña se oculta, detener el loop (ahorra bateria/CPU).
    document.addEventListener('visibilitychange', () => {
        mounted = !document.hidden;
        if (mounted) {
            lastFrame = performance.now();
            requestAnimationFrame(animate);
        }
    });
}
