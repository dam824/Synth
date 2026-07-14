"use client";

/**
 * MoonRealistic — lune 3D photoréaliste, arc supérieur uniquement.
 *
 * Netteté : mapping UV sphérique STANDARD sur cartes ÉQUIRECTANGULAIRES
 * (couleur 8K + displacement NASA LDEM). Aucune reprojection custom, aucun
 * triplanaire : le relief perçu vient de la lumière rasante sur le limbe.
 *
 * Textures attendues dans /public/textures/ :
 *   moon_color.jpg  — 8192×4096 équirectangulaire (Solar System Scope, CC-BY 4.0,
 *                     données NASA LRO) https://www.solarsystemscope.com/textures/
 *   moon_disp.jpg   — LDEM 8-bit équirectangulaire (NASA CGI Moon Kit)
 *                     https://svs.gsfc.nasa.gov/4720
 *   moon_normal.jpg — optionnel (CONFIG.normalPath: null si absent)
 *
 * Import SANS SSR :
 *   const MoonRealistic = dynamic(() => import("@/components/MoonRealistic"), { ssr: false });
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ─── Réglages ────────────────────────────────────────────────────────────────
const CONFIG = {
  colorPath: "/textures/moon_color.jpg",
  dispPath: "/textures/moon_disp.jpg",
  normalPath: null as string | null, // "/textures/moon_normal.jpg" si fournie
  speed: 0.00028,         // rotation lente mais perceptible (le bas de la surface remonte)
  rimStrength: 0.55,      // intensité du liseré (baisser si trop fort)
  rimPower: 10.0,         // exposant fresnel : plus haut = liseré plus fin/serré
  // Fondu latéral : plein éclat au sommet, s'évanouit vers les côtés (pas de
  // plateau saturé qui suit le relief et fait un bord "découpé").
  rimTopStart: 0.35,      // début du fondu (plus haut = liseré plus court)
  rimTopEnd: 0.95,        // où l'éclat max est atteint (proche du sommet)
  fov: 45,
  // Displacement très faible : à cette échelle il déchiquette la silhouette
  // (bosses contre le noir) sans rien apporter sur une surface quasi noire.
  displacementScale: 0.012,
  // Fondu du bord : l'extrême limbe s'estompe progressivement vers le noir
  // (masque les irrégularités restantes ; le liseré teal vient par-dessus).
  edgeSoftness: 0.15,     // largeur du fondu (0 = bord net, 0.3 = très doux)
  // Cadrage responsive (garantit : arc sur toute la largeur, aucun bord
  // latéral visible, quel que soit le ratio d'écran) :
  //   widthRadii = rayon apparent du limbe en demi-largeurs d'écran
  //   (1.0 = touche les bords · 1.25 = arc plat/étalé · 1.8+ = fine bande)
  widthRadii: 1.25,
  arcTopFraction: 0.58,   // sommet de l'arc à 58% de la hauteur (0=haut, 1=bas)
  // Éclairage — lune de NUIT : sphère quasi noire, relief juste devinable,
  // aucune zone claire hormis le liseré du limbe.
  directionalIntensity: 0.35, // sculpte les cratères, n'éclaire pas la face
  ambientIntensity: 0.01,     // quasi nul : les faces non éclairées tombent au noir
  albedoScalar: 0.05,         // écrase la map couleur (0.03 noir ↔ 0.14 plus clair)
  toneMappingExposure: 0.6,   // enfonce les noirs (n'affecte pas le rim, ajouté après)
  // Suivi souris : la lune s'incline vers le pointeur (offset d'orientation
  // amorti, en radians), pendant que le spin X continue. Le liseré (espace
  // vue/monde) et le cadrage ne sont pas affectés. 0 = rotation X pure.
  followAmountX: 0.22,        // inclinaison horizontale max (rad) — souris gauche/droite
  followAmountY: 0.12,        // inclinaison verticale max (rad) — souris haut/bas
  followEase: 0.05,           // amorti du suivi (plus petit = plus doux/lent)
};

// ─── Rim teal : injecté dans le MeshStandardMaterial via onBeforeCompile ────
// (préserve maps couleur/displacement ; le fresnel s'applique sur la surface
// déplacée elle-même — une passe séparée serait occluse par le displacement).
function addRim(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlowStrength = { value: CONFIG.rimStrength };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        varying vec3 vRimViewN;
        varying vec3 vRimWorldN;
        varying vec3 vRimViewPos;`,
      )
      .replace(
        "#include <worldpos_vertex>",
        /* glsl */ `#include <worldpos_vertex>
        vRimViewN = normalize(normalMatrix * normal);
        vRimWorldN = normalize(mat3(modelMatrix) * normal);
        vRimViewPos = -(modelViewMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform float uGlowStrength;
        varying vec3 vRimViewN;
        varying vec3 vRimWorldN;
        varying vec3 vRimViewPos;
        // Rampe : #FFFFFF -> #D8FFFB -> #80F0E8
        vec3 rimRamp(float t){
          vec3 cW = vec3(1.0);
          vec3 cI = vec3(0.847, 1.0, 0.984);
          vec3 cC = vec3(0.502, 0.941, 0.910);
          vec3 c = mix(cC, cI, smoothstep(0.35, 0.75, t));
          return mix(c, cW, smoothstep(0.75, 0.98, t));
        }`,
      )
      .replace(
        "#include <dithering_fragment>",
        /* glsl */ `
        float rimBase = 1.0 - max(dot(normalize(vRimViewN), normalize(vRimViewPos)), 0.0);
        float rimFres = pow(rimBase, ${CONFIG.rimPower.toFixed(2)});
        // Gate sur la normale MONDE : le liseré reste fixe au sommet malgré la
        // rotation, plein éclat au sommet seulement, fondu progressif vers les côtés.
        float rimTop = smoothstep(${CONFIG.rimTopStart.toFixed(2)}, ${CONFIG.rimTopEnd.toFixed(2)}, vRimWorldN.y);
        // Pas de multiplicateur avant le clamp : il re-saturait le fresnel et
        // étalait le liseré en voile sur toute la calotte.
        float rimT = clamp(rimFres, 0.0, 1.0) * rimTop;
        gl_FragColor.rgb += rimRamp(rimT) * rimT * uGlowStrength;
        // Estompe l'extrême bord vers le noir : masque les irrégularités de la
        // silhouette (le fondu emporte surface ET liseré, rendu doux).
        gl_FragColor.a *= 1.0 - smoothstep(${(1.0 - CONFIG.edgeSoftness).toFixed(2)}, 1.0, rimBase);
        #include <dithering_fragment>`,
      );
  };
  material.needsUpdate = true;
}

// ─── Composant ───────────────────────────────────────────────────────────────
type MoonRealisticProps = {
  className?: string;
  /** Callback pour brancher GSAP/ScrollTrigger sur le mesh et la caméra */
  onReady?: (ctx: { moon: THREE.Mesh; camera: THREE.PerspectiveCamera }) => void;
};

export default function MoonRealistic({ className, onReady }: MoonRealisticProps) {
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
    // Exposure basse pour enfoncer les noirs. Le rim est injecté APRÈS le tone
    // mapping dans le fragment : il garde toute sa luminosité.
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = CONFIG.toneMappingExposure;
    container.appendChild(renderer.domElement);

    // Textures équirectangulaires — UV sphériques standard, pas de reprojection
    const loader = new THREE.TextureLoader();
    const colorMap = loader.load(CONFIG.colorPath, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.minFilter = THREE.LinearMipmapLinearFilter;
    });
    const dispMap = loader.load(CONFIG.dispPath);
    const normalMap = CONFIG.normalPath ? loader.load(CONFIG.normalPath) : null;

    // Matériau standard : la netteté vient de la lumière rasante sur le relief
    const material = new THREE.MeshStandardMaterial({
      map: colorMap,
      displacementMap: dispMap,
      displacementScale: CONFIG.displacementScale,
      ...(normalMap ? { normalMap } : {}),
      roughness: 1,
      metalness: 0,
      // Nécessaire pour le fondu alpha du bord (edgeSoftness)
      transparent: true,
    });
    // Écrase l'albedo (multiplie la map) — le rim, ajouté après l'éclairage
    // dans le shader, garde toute sa luminosité.
    material.color.setScalar(CONFIG.albedoScalar);
    addRim(material);

    const SPHERE_R = 1;
    const geometry = new THREE.SphereGeometry(SPHERE_R, 256, 256);
    const moon = new THREE.Mesh(geometry, material);
    scene.add(moon);

    // Éclairage : directionnelle rasante depuis le haut (révèle les cratères
    // du limbe), ambiante très faible.
    const sun = new THREE.DirectionalLight(0xffffff, CONFIG.directionalIntensity);
    sun.position.set(0, 4, 1.2);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, CONFIG.ambientIntensity));

    // Cadrage : distance caméra fixe, rayon + position Y résolus ensemble pour
    // un arc large et peu bombé qui remplit la largeur à tout ratio.
    const CAM_Z = 2;
    function frame(w: number, h: number) {
      const aspect = w / h;
      const vFov = THREE.MathUtils.degToRad(CONFIG.fov);
      const vHalf = vFov / 2;
      const hHalf = Math.atan(Math.tan(vHalf) * aspect);
      const beta = Math.min(
        Math.atan(CONFIG.widthRadii * Math.tan(hHalf)),
        THREE.MathUtils.degToRad(72),
      );
      const fromCenterDown = (CONFIG.arcTopFraction - 0.5) * 2;
      const thetaTop = Math.atan(fromCenterDown * Math.tan(vHalf));
      const phi = thetaTop + beta;

      camera.aspect = aspect;
      camera.position.set(0, 0, CAM_Z);
      camera.updateProjectionMatrix();

      moon.position.y = -CAM_Z * Math.tan(phi);
      const radius = (CAM_Z * Math.sin(beta)) / Math.cos(phi);
      moon.scale.setScalar(radius / SPHERE_R);
    }
    frame(container.clientWidth, container.clientHeight);

    onReady?.({ moon, camera });

    // Suivi souris : la lune s'incline vers le pointeur (offsets d'orientation
    // amortis) pendant que le spin X continue. Seule l'orientation du mesh
    // change — cadrage, caméra et liseré (espace vue/monde) restent intacts.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const followOn =
      !reducedMotion && (CONFIG.followAmountX > 0 || CONFIG.followAmountY > 0);
    if (followOn) window.addEventListener("pointermove", onPointerMove);

    // Le hero est sticky : le panneau suivant le recouvre au scroll. Dès qu'il
    // est entièrement caché (scroll > 1 écran), on suspend le rendu WebGL —
    // laisser tourner un canvas plein écran invisible coûte cher en GPU.
    let covered = false;
    const onScroll = () => {
      covered = window.scrollY >= window.innerHeight;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Boucle
    let raf = 0;
    let spinAngle = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (covered) return;
      spinAngle -= CONFIG.speed; // le bas de la surface remonte
      if (followOn) {
        pointer.x += (pointer.tx - pointer.x) * CONFIG.followEase;
        pointer.y += (pointer.ty - pointer.y) * CONFIG.followEase;
      }
      moon.rotation.set(
        spinAngle + pointer.y * CONFIG.followAmountY,
        pointer.x * CONFIG.followAmountX,
        0,
      );
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

    // Cleanup (React 19 + StrictMode monte/démonte 2×)
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      if (followOn) window.removeEventListener("pointermove", onPointerMove);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      colorMap.dispose();
      dispMap.dispose();
      normalMap?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [onReady]);

  return <div ref={containerRef} className={className} />;
}
