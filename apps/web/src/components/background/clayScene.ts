import {
  Color,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';

/** Colours per blob. Index 3 is the small contrasting ball. */
const LIGHT = ['#FFFFFF', '#F1F1EF', '#FAFAF8', '#1E1E20', '#E6E7E5', '#FFFFFF'];
const DARK = ['#2C2D31', '#1D1E21', '#26272B', '#E9E9E7', '#34353A', '#18191C'];

const BLOBS = [
  { position: [-5.2, 1.9, -1.5], scale: 2.6, amp: 0.32, freq: 0.9 },
  { position: [5.6, -1.6, -2.5], scale: 3.3, amp: 0.38, freq: 0.7 },
  { position: [1.4, 3.6, -4.0], scale: 2.0, amp: 0.3, freq: 1.0 },
  { position: [-2.4, -3.0, -0.5], scale: 1.05, amp: 0.18, freq: 1.3 },
  { position: [6.4, 3.2, -3.0], scale: 1.6, amp: 0.26, freq: 1.1 },
  { position: [-7.0, -2.2, -3.5], scale: 2.2, amp: 0.3, freq: 0.8 },
] as const;

export interface ClayScene {
  setTheme(dark: boolean): void;
  dispose(): void;
}

/**
 * Soft, slowly morphing clay shapes behind the app. Throws if WebGL is not
 * available, so the caller can show a static fallback instead.
 */
export function createClayScene(
  canvas: HTMLCanvasElement,
  options: { dark: boolean; animate: boolean },
): ClayScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const geometry = new IcosahedronGeometry(1, 48);
  const meshes = BLOBS.map((blob, i) => {
    const material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: blob.amp },
        uFreq: { value: blob.freq },
        uSeed: { value: i * 7.3 },
        uColor: { value: new Color((options.dark ? DARK : LIGHT)[i]) },
        uDark: { value: options.dark ? 1 : 0 },
      },
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(blob.position[0], blob.position[1], blob.position[2]);
    mesh.scale.setScalar(blob.scale);
    scene.add(mesh);
    return { mesh, material, base: blob.position, phase: i * 1.7 };
  });

  const pointer = { x: 0, y: 0 };
  const cam = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };

  const draw = (timeMs: number) => {
    const t = timeMs / 1000;
    for (const { mesh, material, base, phase } of meshes) {
      material.uniforms.uTime!.value = t;
      mesh.position.x = base[0] + Math.sin(t * 0.18 + phase) * 0.45;
      mesh.position.y = base[1] + Math.cos(t * 0.15 + phase) * 0.35;
      mesh.rotation.y = t * 0.05 + phase;
    }
    cam.x += (pointer.x * 0.7 - cam.x) * 0.04;
    cam.y += (-pointer.y * 0.45 - cam.y) * 0.04;
    camera.position.x = cam.x;
    camera.position.y = cam.y;
    camera.lookAt(0, 0, -2);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const { innerWidth: w, innerHeight: h } = window;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!options.animate) draw(0);
  };

  let frame = 0;
  const loop = (time: number) => {
    draw(time);
    frame = requestAnimationFrame(loop);
  };
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden && options.animate) frame = requestAnimationFrame(loop);
  };

  window.addEventListener('resize', resize);
  resize();
  if (options.animate) {
    window.addEventListener('pointermove', onPointer);
    document.addEventListener('visibilitychange', onVisibility);
    frame = requestAnimationFrame(loop);
  } else {
    draw(0);
  }

  return {
    setTheme(dark) {
      meshes.forEach(({ material }, i) => {
        material.uniforms.uColor!.value.set((dark ? DARK : LIGHT)[i]);
        material.uniforms.uDark!.value = dark ? 1 : 0;
      });
      if (!options.animate) draw(0);
    },
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      meshes.forEach(({ material }) => material.dispose());
      geometry.dispose();
      renderer.dispose();
    },
  };
}
