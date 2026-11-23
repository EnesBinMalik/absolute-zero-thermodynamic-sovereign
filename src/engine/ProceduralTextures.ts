import * as THREE from 'three';

export interface ProceduralTextureSet {
  titaniumAlbedo: THREE.CanvasTexture;
  titaniumBump: THREE.CanvasTexture;
  copperCapillary: THREE.CanvasTexture;
  copperBump: THREE.CanvasTexture;
  siliconWafer: THREE.CanvasTexture;
  fractureNoise: THREE.DataTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Brushed aerospace titanium panel + machined rivet seams
  const [tiCanvas, tiCtx] = makeCanvas(512);
  const [tiBumpCanvas, tiBumpCtx] = makeCanvas(512);

  tiCtx.fillStyle = '#4e5b68';
  tiCtx.fillRect(0, 0, 512, 512);
  tiBumpCtx.fillStyle = '#808080';
  tiBumpCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y++) {
    const streak = 65 + Math.floor(Math.sin(y * 0.43) * 10 + Math.random() * 14);
    tiCtx.fillStyle = `rgb(${streak}, ${streak + 10}, ${streak + 20})`;
    tiCtx.fillRect(0, y, 512, 1);
    const bumpVal = 118 + Math.floor(Math.random() * 20);
    tiBumpCtx.fillStyle = `rgb(${bumpVal}, ${bumpVal}, ${bumpVal})`;
    tiBumpCtx.fillRect(0, y, 512, 1);
  }

  // Machined panel seams & bevel grooves
  tiCtx.strokeStyle = '#252e38';
  tiCtx.lineWidth = 3;
  tiBumpCtx.strokeStyle = '#282828';
  tiBumpCtx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 128) {
    tiCtx.beginPath();
    tiCtx.moveTo(i, 0);
    tiCtx.lineTo(i, 512);
    tiCtx.moveTo(0, i);
    tiCtx.lineTo(512, i);
    tiCtx.stroke();

    tiBumpCtx.beginPath();
    tiBumpCtx.moveTo(i, 0);
    tiBumpCtx.lineTo(i, 512);
    tiBumpCtx.moveTo(0, i);
    tiBumpCtx.lineTo(512, i);
    tiBumpCtx.stroke();
  }

  // Micro-hex rivets at panel corners
  for (let gx = 16; gx < 512; gx += 128) {
    for (let gy = 16; gy < 512; gy += 128) {
      [0, 96].forEach((ox) => {
        [0, 96].forEach((oy) => {
          tiCtx.fillStyle = '#6f7e8c';
          tiCtx.beginPath();
          tiCtx.arc(gx + ox, gy + oy, 3, 0, Math.PI * 2);
          tiCtx.fill();

          tiBumpCtx.fillStyle = '#dcdcdc';
          tiBumpCtx.beginPath();
          tiBumpCtx.arc(gx + ox, gy + oy, 3, 0, Math.PI * 2);
          tiBumpCtx.fill();
        });
      });
    }
  }

  const titaniumAlbedo = new THREE.CanvasTexture(tiCanvas);
  titaniumAlbedo.colorSpace = THREE.SRGBColorSpace;
  titaniumAlbedo.wrapS = THREE.RepeatWrapping;
  titaniumAlbedo.wrapT = THREE.RepeatWrapping;
  titaniumAlbedo.anisotropy = maxAnisotropy;

  const titaniumBump = new THREE.CanvasTexture(tiBumpCanvas);
  titaniumBump.wrapS = THREE.RepeatWrapping;
  titaniumBump.wrapT = THREE.RepeatWrapping;
  titaniumBump.anisotropy = maxAnisotropy;

  // 2. Hand-crafted hammered & micro-capillary copper cooling conduit texture
  const [cuCanvas, cuCtx] = makeCanvas(512);
  const [cuBumpCanvas, cuBumpCtx] = makeCanvas(512);

  cuCtx.fillStyle = '#a85a32';
  cuCtx.fillRect(0, 0, 512, 512);
  cuBumpCtx.fillStyle = '#808080';
  cuBumpCtx.fillRect(0, 0, 512, 512);

  for (let x = 0; x < 512; x += 8) {
    const shade = Math.sin(x * 0.15) * 14;
    cuCtx.fillStyle = `rgb(${168 + shade}, ${90 + shade * 0.6}, ${50 + shade * 0.3})`;
    cuCtx.fillRect(x, 0, 6, 512);
    cuCtx.fillStyle = '#5c2d16';
    cuCtx.fillRect(x + 6, 0, 2, 512);

    cuBumpCtx.fillStyle = '#b4b4b4';
    cuBumpCtx.fillRect(x, 0, 6, 512);
    cuBumpCtx.fillStyle = '#383838';
    cuBumpCtx.fillRect(x + 6, 0, 2, 512);
  }

  const copperCapillary = new THREE.CanvasTexture(cuCanvas);
  copperCapillary.colorSpace = THREE.SRGBColorSpace;
  copperCapillary.wrapS = THREE.RepeatWrapping;
  copperCapillary.wrapT = THREE.RepeatWrapping;
  copperCapillary.anisotropy = maxAnisotropy;

  const copperBump = new THREE.CanvasTexture(cuBumpCanvas);
  copperBump.wrapS = THREE.RepeatWrapping;
  copperBump.wrapT = THREE.RepeatWrapping;
  copperBump.anisotropy = maxAnisotropy;

  // 3. Cryogenic Supercomputer Silicon Wafer / Quantum Die Etching
  const [siCanvas, siCtx] = makeCanvas(512);
  siCtx.fillStyle = '#0d1520';
  siCtx.fillRect(0, 0, 512, 512);

  siCtx.strokeStyle = '#1e3a52';
  siCtx.lineWidth = 2;
  for (let i = 0; i < 512; i += 32) {
    siCtx.strokeRect(i + 4, 4, 24, 504);
    siCtx.strokeRect(4, i + 4, 504, 24);
  }

  siCtx.fillStyle = '#38bdf8';
  for (let x = 16; x < 512; x += 64) {
    for (let y = 16; y < 512; y += 64) {
      siCtx.fillRect(x, y, 12, 4);
      siCtx.fillRect(x + 20, y + 20, 4, 14);
    }
  }

  const siliconWafer = new THREE.CanvasTexture(siCanvas);
  siliconWafer.colorSpace = THREE.SRGBColorSpace;
  siliconWafer.wrapS = THREE.RepeatWrapping;
  siliconWafer.wrapT = THREE.RepeatWrapping;
  siliconWafer.anisotropy = maxAnisotropy;

  // 4. Dendritic thermal-shock Voronoi crack field (DataTexture for GLSL shader)
  const size = 256;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 42; i++) {
    pts.push({ x: Math.random(), y: Math.random() });
  }
  const data = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const v = py / size;
      let d1 = 999;
      let d2 = 999;
      for (let i = 0; i < pts.length; i++) {
        let dx = Math.abs(u - pts[i].x);
        let dy = Math.abs(v - pts[i].y);
        if (dx > 0.5) dx = 1 - dx;
        if (dy > 0.5) dy = 1 - dy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < d1) {
          d2 = d1;
          d1 = dist;
        } else if (dist < d2) {
          d2 = dist;
        }
      }
      const edge = Math.max(0, Math.min(255, Math.floor((1 - Math.min(1, (d2 - d1) * 28)) * 255)));
      const cell = Math.floor(Math.min(1, d1 * 4.5) * 255);
      const idx = (py * size + px) * 4;
      data[idx] = edge;     // R: crack ridge intensity
      data[idx + 1] = cell; // G: crystal facet depth
      data[idx + 2] = Math.floor((Math.sin(u * 38) * Math.cos(v * 38) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const fractureNoise = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  fractureNoise.wrapS = THREE.RepeatWrapping;
  fractureNoise.wrapT = THREE.RepeatWrapping;
  fractureNoise.needsUpdate = true;

  return {
    titaniumAlbedo,
    titaniumBump,
    copperCapillary,
    copperBump,
    siliconWafer,
    fractureNoise,
    dispose: () => {
      titaniumAlbedo.dispose();
      titaniumBump.dispose();
      copperCapillary.dispose();
      copperBump.dispose();
      siliconWafer.dispose();
      fractureNoise.dispose();
    },
  };
}
