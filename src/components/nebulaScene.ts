import * as T from 'three';

/** A permanent starfield; a subset gathers into letters only at homepage anchors. */
export function createNebulaScene(element: HTMLDivElement, showFallback: () => void) {
  const canvas = document.createElement('canvas');
  canvas.width = 1500; canvas.height = 260;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Text sampling unavailable');
  ctx.font = 'bold 230px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText('NazoAuth', 750, 139);
  const pixels = ctx.getImageData(0, 0, 1500, 260).data;
  const samples: [number, number][] = [];
  for (let y = 0; y < 260; y += 2) for (let x = 0; x < 1500; x += 2) {
    if (pixels[(y * 1500 + x) * 4 + 3] > 150) samples.push([x, y]);
  }
  const minX = Math.min(...samples.map(p => p[0])), maxX = Math.max(...samples.map(p => p[0]));
  const minY = Math.min(...samples.map(p => p[1])), maxY = Math.max(...samples.map(p => p[1]));
  const textWidth = maxX - minX;
  let seed = 41871;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Shuffle once so a smaller mobile population still covers every letter uniformly.
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [samples[i], samples[j]] = [samples[j], samples[i]];
  }
  const narrow = element.clientWidth < 761;
  const letterCount = Math.min(samples.length, narrow ? 4200 : 8000);
  const fieldCount = narrow ? 850 : 1800;
  const positions: number[] = [], field: number[] = [], colors: number[] = [], phases: number[] = [], sizes: number[] = [], assembly: number[] = [];
  const blue = new T.Color('#90baff'), white = new T.Color('#e3eeff'), violet = new T.Color('#a897ff');
  for (let i = 0; i < letterCount + fieldCount; i++) {
    const isLetter = i < letterCount;
    const [x, y] = samples[i % samples.length];
    const px = (x - (minX + maxX) / 2) / textWidth;
    positions.push(px + (random() - .5) / textWidth, ((minY + maxY) / 2 - y + random() - .5) / textWidth, (random() - .5) * .6);
    // All stars inhabit the whole viewport. Letter particles rejoin that sky after dispersal.
    field.push((random() - .5) * 2.6, (random() - .5) * 2.6, (random() - .5) * 12);
    const color = white.clone().lerp(random() > .3 ? blue : violet, random());
    colors.push(color.r, color.g, color.b); phases.push(random() * Math.PI * 2);
    sizes.push(isLetter ? .7 + Math.pow(random(), 8) * 2.1 : .45 + Math.pow(random(), 5) * 5);
    assembly.push(isLetter ? 1 : 0);
  }
  const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x03060d); element.appendChild(renderer.domElement);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(45, 1, .1, 80);
  camera.position.z = 20;
  const uniforms = {
    uSpread: { value: 0 }, uTime: { value: 0 }, uScroll: { value: 0 }, uWordY: { value: 0 }, uWordWidth: { value: 1 },
    uAspect: { value: 1 }, uPixel: { value: 1 }, uAmbient: { value: 1 }, uPointer: { value: new T.Vector2() },
  };
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aField', new T.Float32BufferAttribute(field, 3));
  geometry.setAttribute('aAssemble', new T.Float32BufferAttribute(assembly, 1));
  geometry.setAttribute('aColor', new T.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aPhase', new T.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aSize', new T.Float32BufferAttribute(sizes, 1));
  const material = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms,
    vertexShader: `attribute vec3 aField;attribute vec3 aColor;attribute float aPhase;attribute float aSize;attribute float aAssemble;
      uniform float uSpread,uTime,uScroll,uWordY,uWordWidth,uAspect,uPixel,uAmbient;uniform vec2 uPointer;
      varying vec3 vColor;varying float vAlpha;
      void main(){float s=mix(1.,uSpread,aAssemble);float travel=sin(s*3.14159265);
        vec3 word=vec3(position.x*uWordWidth,position.y*uWordWidth*uAspect+uWordY,position.z);
        vec3 sky=aField;float proximity=(aField.z+6.)/12.;
        sky.x+=sin(uTime*.045+aPhase)*.012;
        // Absolute scroll distance makes travel reversible, with nearer stars moving faster.
        // Wrap outside the visible viewport, so long documents never exhaust the field.
        sky.y=mod(sky.y+uScroll*(.18+.38*proximity)+sin(uTime*.035+aPhase)*.018+1.3,2.6)-1.3;
        vec3 p=mix(word,sky,s);
        p.y+=sin(aPhase+p.x*3.)*travel*.19;
        p.z+=sin(aPhase)*travel*4.;
        p.xy+=uPointer*(.002+s*.005)*sin(aPhase);
        float depth=20.-p.z;float halfHeight=depth*.41421356;
        vec4 view=vec4(p.x*halfHeight*uAspect,p.y*halfHeight,-depth,1.);
        gl_Position=projectionMatrix*view;
        gl_PointSize=(2.1+aSize*1.6)*uPixel*(20./depth);
        vColor=aColor;vAlpha=mix(.92,mix(.85,.16,aAssemble),s)*(.82+.18*sin(uTime*.5+aPhase))*uAmbient;
      }`,
    fragmentShader: `varying vec3 vColor;varying float vAlpha;
      void main(){float r=length(gl_PointCoord-.5);float light=exp(-r*r*55.)+exp(-r*r*12.)*.10;
        gl_FragColor=vec4(vColor,light*vAlpha);
        #include <colorspace_fragment>
      }`,
  });
  const points = new T.Points(geometry, material); points.frustumCulled = false; scene.add(points);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopped = false, available = true, frame = 0, last = 0, elapsed = 0;
  let width = 1, height = 1, current = 0, target = 0, wordY = 0, scrollTarget = 0, scrollCurrent = 0;
  let start: HTMLElement | null = null, end: HTMLElement | null = null;
  const pointer = new T.Vector2();
  function measure() {
    scrollTarget = window.scrollY / height;
    const top = start?.getBoundingClientRect();
    const bottom = end?.getBoundingClientRect();
    const outgoing = top ? T.MathUtils.smoothstep(window.scrollY, 10, top.height * .95) : 1;
    const returning = bottom ? outgoing * (1 - T.MathUtils.smoothstep(bottom.top, height * .50, height * .99)) : 0;
    target = outgoing * (1 - returning);
    const anchor = returning > .01 ? bottom : top;
    wordY = anchor ? 1 - (anchor.top + anchor.height * .47) / height * 2 : 0;
    const maxWordWidth = returning > .01 ? 760 : 1080;
    uniforms.uWordWidth.value = Math.min(width * .84, maxWordWidth) / width * 2;
    element.dataset.phase = target < .05 ? 'formed' : target > .95 ? 'starfield' : 'transition';
  }
  function tick(now: number) {
    frame = 0;
    if (stopped || !available || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    const animate = !preference.matches;
    if (animate) elapsed += dt;
    const ease = 1 - Math.exp(-dt * 9);
    current = preference.matches ? target : current + (target - current) * ease;
    if (Math.abs(target - current) < .0005) current = target;
    scrollCurrent = animate ? scrollCurrent + (scrollTarget - scrollCurrent) * ease : 0;
    uniforms.uScroll.value = scrollCurrent;
    uniforms.uSpread.value = current; uniforms.uWordY.value = wordY; uniforms.uTime.value = elapsed;
    uniforms.uPointer.value.lerp(pointer, ease);
    renderer.render(scene, camera);
    if (animate || current !== target) frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame && !document.hidden && available && !stopped) frame = requestAnimationFrame(tick); }
  function scroll() { measure(); wake(); }
  function refresh() {
    const hadWord = Boolean(start);
    start = document.querySelector<HTMLElement>('.brand-stage'); end = document.querySelector<HTMLElement>('.brand-return');
    measure();
    uniforms.uAmbient.value = start ? 1 : .48;
    if (hadWord !== Boolean(start)) { current = target; scrollCurrent = preference.matches ? 0 : scrollTarget; }
    wake();
  }
  function resize() {
    width = element.clientWidth; height = element.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio, width < 761 ? 1 : 1.5);
    renderer.setPixelRatio(ratio); renderer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    uniforms.uAspect.value = camera.aspect; uniforms.uPixel.value = ratio;
    refresh();
  }
  function move(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || preference.matches) return;
    pointer.set(event.clientX / width * 2 - 1, 1 - event.clientY / height * 2); wake();
  }
  function visibility() { cancelAnimationFrame(frame); frame = 0; last = 0; if (!document.hidden) wake(); }
  function motionChange() { pointer.set(0, 0); scroll(); }
  function lost(event: Event) {
    event.preventDefault(); available = false; cancelAnimationFrame(frame); frame = 0;
    renderer.domElement.style.display = 'none'; showFallback();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resizeObserver.observe(document.body);
  const mutations = new MutationObserver(refresh);
  mutations.observe(document.querySelector('.site-frame')!, { childList: true, subtree: true });
  window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('visibilitychange', visibility); preference.addEventListener('change', motionChange);
  renderer.domElement.addEventListener('webglcontextlost', lost); resize(); current = target;
  scrollCurrent = preference.matches ? 0 : scrollTarget;
  return {
    refresh,
    dispose() {
      stopped = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); mutations.disconnect();
      window.removeEventListener('scroll', scroll); window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', motionChange);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
