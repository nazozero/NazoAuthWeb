import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(116,205,255,0.92)');
    gradient.addColorStop(1, 'rgba(116,205,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildOrbit(count: number, radius: number, tilt: number): Float32Array {
  const points = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const wobble = Math.sin(angle * 3) * 0.08;
    points[index * 3] = Math.cos(angle) * (radius + wobble);
    points[index * 3 + 1] = Math.sin(angle) * tilt;
    points[index * 3 + 2] = Math.sin(angle) * (radius + wobble);
  }
  return points;
}

export default function IdentityCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 6.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const texture = createParticleTexture();
    const particleMaterial = new THREE.PointsMaterial({
      map: texture,
      color: 0x8edbff,
      size: 0.055,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const orbitA = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.BufferAttribute(buildOrbit(420, 2.1, 0.38), 3)
      ),
      particleMaterial
    );
    const orbitB = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.BufferAttribute(buildOrbit(360, 1.52, -0.44), 3)
      ),
      particleMaterial.clone()
    );
    orbitB.rotation.z = 0.92;
    scene.add(orbitA, orbitB);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.74, 3),
      new THREE.MeshBasicMaterial({
        color: 0x74cdff,
        wireframe: true,
        transparent: true,
        opacity: 0.34,
      })
    );
    scene.add(core);

    const nodeGeometry = new THREE.SphereGeometry(0.055, 18, 18);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xe8f7ff });
    const nodes = Array.from({ length: 8 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      const angle = (index / 8) * Math.PI * 2;
      node.position.set(Math.cos(angle) * 2.16, Math.sin(angle * 2) * 0.26, Math.sin(angle) * 2.16);
      scene.add(node);
      return node;
    });

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frameId = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      orbitA.rotation.y = elapsed * 0.16;
      orbitA.rotation.x = Math.sin(elapsed * 0.35) * 0.08;
      orbitB.rotation.y = -elapsed * 0.2;
      orbitB.rotation.x = 0.55 + Math.cos(elapsed * 0.28) * 0.07;
      core.rotation.x = elapsed * 0.23;
      core.rotation.y = elapsed * 0.31;
      nodes.forEach((node, index) => {
        node.scale.setScalar(1 + Math.sin(elapsed * 1.8 + index) * 0.22);
      });
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.dispose();
      texture.dispose();
      particleMaterial.dispose();
      orbitB.material.dispose();
      orbitA.geometry.dispose();
      orbitB.geometry.dispose();
      core.geometry.dispose();
      if (Array.isArray(core.material)) {
        core.material.forEach((material) => material.dispose());
      } else {
        core.material.dispose();
      }
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="identity-canvas" aria-hidden="true" />;
}
