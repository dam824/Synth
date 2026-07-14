"use client";

/**
 * MoonHero — sphère lunaire 3D, arc supérieur uniquement.
 *
 * Installation :
 *   1. Copier moon-texture-2k.jpg dans /public/textures/moon.jpg
 *   2. Placer ce fichier dans components/MoonHero.tsx
 *   3. Importer SANS SSR (Three.js a besoin de window) :
 *
 *      import dynamic from "next/dynamic";
 *      const MoonHero = dynamic(() => import("@/components/MoonHero"), { ssr: false });
 *
 *      <section className="relative h-screen bg-black overflow-hidden">
 *        <MoonHero className="absolute inset-0" />
 *        <h1 className="relative z-10 ...">MOON</h1>
 *      </section>
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Réglages ────────────────────────────────────────────────────────────────
const CONFIG = {
  texturePath: "/texture/moon-texture-2k.jpg",
  speed: 0.0002,        // rotation TRÈS lente (négatif = le bas de la surface remonte)
  glowStrength: 1.35,   // intensité du liseré cyan
  fov: 45,
  // Cadrage : arc LARGE et peu bombé (réf. "21hrs on the Moon"). On ne voit
  // qu'une fine calotte d'une sphère bien plus grande que l'écran.
  //   widthRadii = rayon apparent du limbe, en demi-largeurs d'écran.
  //   1.0 = hémisphère plein (très rond) · 1.3 = plat/étalé · 1.8+ = fine bande.
  widthRadii: 0.9,
  arcTopFraction: 0.5, // hauteur du sommet de l'arc (0 = haut, 1 = bas)
};

// ─── Shaders (identiques au prototype validé) ────────────────────────────────
const vertexShader = /* glsl */ `
  varying vec3 vP;
  varying vec3 vNv;
  varying vec3 vWn;
  varying vec3 vV;
  void main(){
    vP  = normalize(position);
    vNv = normalize(normalMatrix * normal);
    vWn = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV  = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vP;
  varying vec3 vNv;
  varying vec3 vWn;
  varying vec3 vV;
  uniform sampler2D uMap;
  uniform float uGlowStrength;

  // Rampe du gradient : #FFFFFF -> #D8FFFB -> #80F0E8
  vec3 glowRamp(float t){
    vec3 cWhite = vec3(1.000, 1.000, 1.000);
    vec3 cIce   = vec3(0.847, 1.000, 0.984);
    vec3 cCyan  = vec3(0.502, 0.941, 0.910);
    vec3 c = mix(cCyan, cIce, smoothstep(0.35, 0.75, t));
    return  mix(c, cWhite, smoothstep(0.75, 0.98, t));
  }

  // Tuilage miroir sans couture, confiné à la zone centrale de l'image
  vec2 mirrorUV(vec2 p){
    vec2 t = abs(fract(p * 0.5) * 2.0 - 1.0);
    return t * 0.5 + 0.25;
  }

  // Échantillonnage triplanaire du micro-détail dans la texture elle-même
  vec3 detailSample(vec3 p, float scale){
    vec3 w = abs(normalize(p));
    w = pow(w, vec3(4.0));
    w /= (w.x + w.y + w.z);
    vec3 sx = texture2D(uMap, mirrorUV(p.zy * scale)).rgb;
    vec3 sy = texture2D(uMap, mirrorUV(p.xz * scale)).rgb;
    vec3 sz = texture2D(uMap, mirrorUV(p.xy * scale)).rgb;
    return sx * w.x + sy * w.y + sz * w.z;
  }

  void main(){
    // Projection principale : l'image d'origine, pixel-perfect de face
    vec2 uv = vP.xy * 0.490 + 0.5;
    vec3 base = texture2D(uMap, uv).rgb;

    // Zone nette (face/dos) vs bande étirée
    float sharpW = smoothstep(0.10, 0.45, abs(vP.z));

    // Réinjection de détail haute fréquence (à somme nulle) dans la bande
    const vec3 MEAN = vec3(0.0148, 0.0210, 0.0195);
    vec3 det1 = detailSample(vP, 1.6) - MEAN;
    vec3 det2 = detailSample(vP, 3.7) - MEAN;
    vec3 det3 = detailSample(vP, 7.5) - MEAN;
    vec3 detail = det1 * 0.85 + det2 * 0.55 + det3 * 0.35;

    vec3 col = max(base + detail * (1.0 - sharpW), vec3(0.0));

    // Liseré cyan sur le limbe supérieur — fixe, ne tourne pas avec la surface
    float fres = pow(1.0 - max(dot(normalize(vNv), normalize(vV)), 0.0), 3.2);
    float top  = smoothstep(-0.05, 0.72, vWn.y);
    float t    = clamp(fres * 1.5, 0.0, 1.0) * top;
    col += glowRamp(t) * t * uGlowStrength;

    // Léger voile lumineux qui lèche la surface près du sommet
    float wash = pow(max(vWn.y, 0.0), 6.0) * fres;
    col += vec3(0.502, 0.941, 0.910) * wash * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Composant ───────────────────────────────────────────────────────────────
type MoonHeroProps = {
  className?: string;
  /** Callback pour brancher GSAP/ScrollTrigger sur le mesh et la caméra */
  onReady?: (ctx: { moon: THREE.Mesh; camera: THREE.PerspectiveCamera }) => void;
};

export default function MoonHero({ className, onReady }: MoonHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scène
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CONFIG.fov,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Texture
    const texture = new THREE.TextureLoader().load(CONFIG.texturePath, (t) => {
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    // Sphère
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uGlowStrength: { value: CONFIG.glowStrength },
      },
      vertexShader,
      fragmentShader,
    });
    const SPHERE_R = 1;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_R, 256, 256), material);
    scene.add(moon);

    // Cadre la scène : sphère bien plus grande que l'écran, dont on ne voit que
    // la calotte haute → arc large et peu bombé. La distance caméra est fixe ;
    // on ajuste le RAYON et la POSITION Y de la sphère (calcul cohérent, sinon
    // en la descendant elle rapetisse et sort de l'écran).
    const CAM_Z = 2; // distance caméra (échelle) — la sphère est mise à l'échelle
    function frame(w: number, h: number) {
      const aspect = w / h;
      const vFov = THREE.MathUtils.degToRad(CONFIG.fov);
      const vHalf = vFov / 2;
      const hHalf = Math.atan(Math.tan(vHalf) * aspect);
      // beta = rayon angulaire du limbe. widthRadii = rayon apparent en
      // demi-largeurs d'écran (1 = touche les bords, >1 = déborde => plus plat).
      const beta = Math.min(
        Math.atan(CONFIG.widthRadii * Math.tan(hHalf)),
        THREE.MathUtils.degToRad(72),
      );
      // Sommet de l'arc à arcTopFraction de la hauteur (0 = haut, 1 = bas).
      const fromCenterDown = (CONFIG.arcTopFraction - 0.5) * 2;
      const thetaTop = Math.atan(fromCenterDown * Math.tan(vHalf));
      const phi = thetaTop + beta; // angle (vers le bas) du centre de la sphère

      camera.aspect = aspect;
      camera.position.set(0, 0, CAM_Z);
      camera.updateProjectionMatrix();

      moon.position.y = -CAM_Z * Math.tan(phi);
      const radius = (CAM_Z * Math.sin(beta)) / Math.cos(phi);
      moon.scale.setScalar(radius / SPHERE_R);
    }
    frame(container.clientWidth, container.clientHeight);

    onReady?.({ moon, camera });

    // Boucle
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      moon.rotation.x -= CONFIG.speed; // le bas de la surface remonte
      renderer.render(scene, camera);
    };
    tick();

    // Resize (suit le conteneur, pas la fenêtre)
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      frame(w, h);
    });
    ro.observe(container);

    // Cleanup (indispensable : React 19 + StrictMode monte/démonte 2x en dev)
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      moon.geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [onReady]);

  return <div ref={containerRef} className={className} />;
}
