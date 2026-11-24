import * as THREE from 'three';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function makeTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  srgb = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export interface MaterialPalette {
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  plazaTile: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  mountainRock: THREE.MeshStandardMaterial;
  woodPlank: THREE.MeshStandardMaterial;
  runway: THREE.MeshStandardMaterial;
  brickWall: THREE.MeshStandardMaterial;
  concreteTrim: THREE.MeshStandardMaterial;
  glassTowerDay: THREE.MeshStandardMaterial[];
  glassTowerEmissive: THREE.CanvasTexture[];
  stuccoMaterials: THREE.MeshStandardMaterial[];
  artDecoMaterials: THREE.MeshStandardMaterial[];
  muralMaterials: THREE.MeshStandardMaterial[];
  mediterraneanMaterials: THREE.MeshStandardMaterial[];
  sidingMaterials: THREE.MeshStandardMaterial[];
  loftBrickMaterials: THREE.MeshStandardMaterial[];
  billboardMaterials: THREE.MeshStandardMaterial[];
  industrialMetal: THREE.MeshStandardMaterial;
  waterNormal: THREE.CanvasTexture;
}

export class TextureFactory {
  public palette!: MaterialPalette;
  private textures: THREE.Texture[] = [];

  buildPalette(): MaterialPalette {
    const asphaltTex = this.createAsphaltTexture();
    const asphaltBump = this.createNoiseRoughnessTexture(256, 256, 140, 90);
    const asphalt = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      bumpMap: asphaltBump,
      bumpScale: 0.04,
      roughnessMap: asphaltBump,
      roughness: 0.86,
      metalness: 0.06,
    });

    const sidewalkTex = this.createSidewalkTexture();
    const sidewalkBump = this.createSidewalkBumpTexture();
    const sidewalk = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      bumpMap: sidewalkBump,
      bumpScale: 0.05,
      roughness: 0.84,
      metalness: 0.03,
    });

    const plazaTex = this.createPlazaTileTexture();
    const plazaTile = new THREE.MeshStandardMaterial({
      map: plazaTex,
      bumpMap: sidewalkBump,
      bumpScale: 0.03,
      roughness: 0.72,
      metalness: 0.05,
    });

    const sand = new THREE.MeshStandardMaterial({
      map: this.createSandTexture(),
      roughness: 0.94,
      metalness: 0.0,
    });

    const grass = new THREE.MeshStandardMaterial({
      map: this.createGrassTexture(),
      roughness: 0.9,
      metalness: 0.0,
    });

    const mountainRock = new THREE.MeshStandardMaterial({
      map: this.createRockTexture(),
      roughness: 0.92,
      metalness: 0.04,
    });

    const woodPlank = new THREE.MeshStandardMaterial({
      map: this.createWoodTexture(),
      roughness: 0.76,
      metalness: 0.05,
    });

    const runway = new THREE.MeshStandardMaterial({
      map: this.createRunwayTexture(),
      roughness: 0.82,
      metalness: 0.08,
    });

    const brickWall = new THREE.MeshStandardMaterial({
      map: this.createBrickTexture('#8b4b3c'),
      bumpMap: asphaltBump,
      bumpScale: 0.03,
      roughness: 0.88,
      metalness: 0.04,
    });

    const concreteTrim = new THREE.MeshStandardMaterial({
      color: 0xd9d5cc,
      bumpMap: asphaltBump,
      bumpScale: 0.02,
      roughness: 0.78,
      metalness: 0.05,
    });

    const towerSpecs = [
      { base: '#345e7d', frame: '#8eaab8', glow: '#ffdca8' },
      { base: '#2c4159', frame: '#75899e', glow: '#9be7ff' },
      { base: '#574a42', frame: '#a8998c', glow: '#ffe29c' },
      { base: '#465e6b', frame: '#c4cfd6', glow: '#ffdfbe' },
      { base: '#235952', frame: '#94b5ae', glow: '#ffe8b8' },
    ];
    const glassTowerDay: THREE.MeshStandardMaterial[] = [];
    const glassTowerEmissive: THREE.CanvasTexture[] = [];

    for (const spec of towerSpecs) {
      const { map, emissive } = this.createSkyscraperTextures(spec.base, spec.frame, spec.glow);
      glassTowerEmissive.push(emissive);
      glassTowerDay.push(
        new THREE.MeshStandardMaterial({
          map,
          emissiveMap: emissive,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.0,
          roughness: 0.2,
          metalness: 0.62,
          envMapIntensity: 1.45,
        })
      );
    }

    const stuccoColors = [
      '#efe2d3',
      '#f2c4b0',
      '#c5dfdb',
      '#ecd49e',
      '#d9ccc0',
      '#cedbe5',
      '#e4ae9a',
      '#cfe0c3',
    ];
    const stuccoMaterials = stuccoColors.map((col) => {
      return new THREE.MeshStandardMaterial({
        map: this.createStuccoFacadeTexture(col),
        bumpMap: asphaltBump,
        bumpScale: 0.015,
        roughness: 0.8,
        metalness: 0.04,
      });
    });

    const artDecoSpecs = [
      { wall: '#f6e7d8', trim: '#ff7b6b', accent: '#36c7bd' },
      { wall: '#dff2ec', trim: '#f2b857', accent: '#ff7062' },
      { wall: '#fce1d4', trim: '#ffffff', accent: '#2fb8b0' },
      { wall: '#e4ecf4', trim: '#ff905c', accent: '#355c7d' },
    ];
    const artDecoMaterials = artDecoSpecs.map((s) => {
      return new THREE.MeshStandardMaterial({
        map: this.createArtDecoTexture(s.wall, s.trim, s.accent),
        bumpMap: asphaltBump,
        bumpScale: 0.02,
        roughness: 0.72,
        metalness: 0.05,
      });
    });

    const muralPalettes = [
      ['#ff6b4a', '#1fd1c5', '#ffd166', '#162838'],
      ['#3a86ff', '#ff006e', '#ffbe0b', '#fb5607'],
      ['#2ec4b6', '#ff9f1c', '#e71d36', '#011627'],
    ];
    const muralMaterials = muralPalettes.map((pal) => {
      return new THREE.MeshStandardMaterial({
        map: this.createMuralTexture(pal),
        roughness: 0.82,
        metalness: 0.03,
      });
    });

    const medColors = ['#f0dfc8', '#e6c39c', '#ead5c1'];
    const mediterraneanMaterials = medColors.map((col) => {
      return new THREE.MeshStandardMaterial({
        map: this.createMediterraneanTexture(col),
        bumpMap: asphaltBump,
        bumpScale: 0.02,
        roughness: 0.84,
      });
    });

    const sidingColors = ['#cfdce3', '#dce4d2', '#ebe4d1', '#e8d0c3'];
    const sidingMaterials = sidingColors.map((col) => {
      return new THREE.MeshStandardMaterial({
        map: this.createSidingTexture(col),
        roughness: 0.78,
      });
    });

    const loftBrickMaterials = ['#7a3e33', '#524947'].map((col) => {
      return new THREE.MeshStandardMaterial({
        map: this.createLoftBrickTexture(col),
        bumpMap: asphaltBump,
        bumpScale: 0.03,
        roughness: 0.85,
      });
    });

    const billboardSpecs = [
      { bg: '#0c2338', title: 'VISIT SUNHAVEN', sub: 'OCEAN DRIVE & CORAL KEYS', col: '#1fd1c5' },
      { bg: '#26141a', title: 'SOLARIS GT', sub: 'COASTAL PERFORMANCE MOTORS', col: '#ff6b4a' },
      { bg: '#152218', title: 'SUNBIRD AIR', sub: 'DAILY ISLAND CHARTERS', col: '#ffb84d' },
    ];
    const billboardMaterials = billboardSpecs.map((b) => {
      return new THREE.MeshStandardMaterial({
        map: this.createBillboardTexture(b.bg, b.title, b.sub, b.col),
        emissive: new THREE.Color(0xffffff),
        emissiveMap: this.createBillboardTexture(b.bg, b.title, b.sub, b.col),
        emissiveIntensity: 0.25,
        roughness: 0.4,
      });
    });

    const industrialMetal = new THREE.MeshStandardMaterial({
      map: this.createCorrugatedMetalTexture(),
      roughness: 0.48,
      metalness: 0.55,
    });

    const waterNormal = this.createWaterNormalTexture();

    this.palette = {
      asphalt,
      sidewalk,
      plazaTile,
      sand,
      grass,
      mountainRock,
      woodPlank,
      runway,
      brickWall,
      concreteTrim,
      glassTowerDay,
      glassTowerEmissive,
      stuccoMaterials,
      artDecoMaterials,
      muralMaterials,
      mediterraneanMaterials,
      sidingMaterials,
      loftBrickMaterials,
      billboardMaterials,
      industrialMetal,
      waterNormal,
    };

    return this.palette;
  }

  private track(tex: THREE.CanvasTexture): THREE.CanvasTexture {
    this.textures.push(tex);
    return tex;
  }

  private createArtDecoTexture(wall: string, trim: string, accent: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 256, 256);

    // Fluted vertical Art Deco pilasters
    ctx.fillStyle = trim;
    for (const x of [0, 78, 170, 244]) {
      ctx.fillRect(x, 0, 12, 256);
    }

    // Horizontal Art Deco speedlines
    ctx.fillStyle = accent;
    ctx.fillRect(0, 118, 256, 7);
    ctx.fillRect(0, 240, 256, 8);

    // Rounded-corner coastal windows with horizontal eyebrow shades
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 3; col++) {
        const x = 22 + col * 80;
        const y = 26 + r * 120;
        ctx.fillStyle = trim;
        ctx.fillRect(x - 5, y - 8, 60, 7);
        ctx.fillStyle = '#244559';
        ctx.fillRect(x, y, 50, 62);
        ctx.fillStyle = 'rgba(200,240,255,0.22)';
        ctx.fillRect(x + 4, y + 4, 16, 54);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 50, 62);
      }
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createMuralTexture(pal: string[]): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = pal[3];
    ctx.fillRect(0, 0, 256, 256);
    // Bold geometric Wynwood-style art blocks & diagonal stripes
    ctx.fillStyle = pal[0];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(180, 0);
    ctx.lineTo(90, 256);
    ctx.lineTo(0, 256);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal[1];
    ctx.beginPath();
    ctx.arc(170, 130, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal[2];
    ctx.fillRect(24, 150, 200, 28);
    ctx.beginPath();
    ctx.arc(65, 72, 34, 0, Math.PI * 2);
    ctx.fill();

    // Industrial warehouse window band along top
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#1b2b38';
      ctx.fillRect(16 + i * 60, 18, 42, 32);
      ctx.strokeStyle = '#dce2e8';
      ctx.lineWidth = 2;
      ctx.strokeRect(16 + i * 60, 18, 42, 32);
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createMediterraneanTexture(wall: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 256, 256);

    // Stone corner quoins
    ctx.fillStyle = '#d3c2aa';
    for (let y = 0; y < 256; y += 24) {
      ctx.fillRect(0, y, 16, 18);
      ctx.fillRect(240, y, 16, 18);
    }

    // Arched Mediterranean windows with dark wood shutters
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 2; col++) {
        const cx = 68 + col * 120;
        const cy = 60 + r * 122;
        ctx.fillStyle = '#5c402c';
        ctx.fillRect(cx - 32, cy - 16, 12, 58);
        ctx.fillRect(cx + 20, cy - 16, 12, 58);

        ctx.fillStyle = '#253c4d';
        ctx.beginPath();
        ctx.arc(cx, cy - 12, 20, Math.PI, 0);
        ctx.lineTo(cx + 20, cy + 42);
        ctx.lineTo(cx - 20, cy + 42);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f2eadc';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createSidingTexture(wall: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 256, 256);
    // Clapboard horizontal siding planks
    for (let y = 0; y < 256; y += 10) {
      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, y, 256, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, y + 2, 256, 2);
    }
    // Windows with shutters
    for (const cx of [66, 190]) {
      for (const cy of [48, 162]) {
        ctx.fillStyle = '#2d4759';
        ctx.fillRect(cx - 20, cy, 40, 52);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(cx - 20, cy, 40, 52);
        ctx.fillStyle = '#3c515c';
        ctx.fillRect(cx - 32, cy, 10, 52);
        ctx.fillRect(cx + 22, cy, 10, 52);
      }
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createLoftBrickTexture(brickHex: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#9c938a';
    ctx.fillRect(0, 0, 256, 256);
    const base = new THREE.Color(brickHex);
    for (let r = 0; r < 24; r++) {
      const off = (r % 2) * 14;
      for (let col = -1; col < 10; col++) {
        const shade = base.clone().multiplyScalar(0.82 + Math.random() * 0.35);
        ctx.fillStyle = `rgb(${Math.floor(shade.r * 255)},${Math.floor(shade.g * 255)},${Math.floor(shade.b * 255)})`;
        ctx.fillRect(col * 28 + off + 1, r * 11 + 1, 26, 9);
      }
    }
    // Tall black-steel industrial loft windows
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 3; col++) {
        const x = 22 + col * 80;
        const y = 24 + r * 120;
        ctx.fillStyle = '#213647';
        ctx.fillRect(x, y, 48, 72);
        ctx.strokeStyle = '#1d2228';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, 48, 72);
        ctx.beginPath();
        ctx.moveTo(x + 24, y);
        ctx.lineTo(x + 24, y + 72);
        ctx.moveTo(x, y + 24);
        ctx.lineTo(x + 48, y + 24);
        ctx.moveTo(x, y + 48);
        ctx.lineTo(x + 48, y + 48);
        ctx.stroke();
      }
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createBillboardTexture(bg: string, title: string, sub: string, col: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(512, 256);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 240, 512, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 122);

    ctx.fillStyle = col;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(sub, 256, 166);
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createAsphaltTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(56,62,70,0.22)' : 'rgba(22,25,30,0.22)';
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512,
        Math.random() * 512,
        24 + Math.random() * 55,
        14 + Math.random() * 35,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(18, 20, 24, 0.25)';
    ctx.fillRect(95, 0, 38, 512);
    ctx.fillRect(185, 0, 38, 512);
    ctx.fillRect(290, 0, 38, 512);
    ctx.fillRect(380, 0, 38, 512);

    ctx.strokeStyle = 'rgba(16, 18, 21, 0.72)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 48;
        y += (Math.random() - 0.5) * 48;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 14000; i++) {
      const v = 30 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    return this.track(makeTexture(c, 2, 10, true));
  }

  private createNoiseRoughnessTexture(
    w: number,
    h: number,
    base: number,
    variance: number
  ): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(w, h);
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * variance));
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return this.track(makeTexture(c, 6, 6, false));
  }

  private createSidewalkTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#c4beb3';
    ctx.fillRect(0, 0, 512, 512);
    const step = 64;
    for (let x = 0; x < 512; x += step) {
      for (let y = 0; y < 512; y += step) {
        const shade = 186 + Math.floor((Math.random() - 0.5) * 18);
        ctx.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      }
    }
    ctx.strokeStyle = '#7e786f';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    for (let i = 0; i < 65; i++) {
      const gx = Math.floor(Math.random() * 8) * step + (Math.random() - 0.5) * 6;
      const gy = Math.random() * 512;
      ctx.fillStyle = 'rgba(72, 108, 56, 0.55)';
      ctx.fillRect(gx, gy, 3, 5);
    }
    return this.track(makeTexture(c, 2, 22, true));
  }

  private createSidewalkBumpTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    return this.track(makeTexture(c, 4, 18, false));
  }

  private createPlazaTileTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(512, 512);
    ctx.fillStyle = '#9e978b';
    ctx.fillRect(0, 0, 512, 512);
    const step = 64;
    for (let x = 0; x < 512; x += step) {
      for (let y = 0; y < 512; y += step) {
        const jitter = Math.floor((Math.random() - 0.5) * 14);
        ctx.fillStyle = `rgb(${188 + jitter},${181 + jitter},${170 + jitter})`;
        ctx.fillRect(x + 2, y + 2, step - 3, step - 3);
      }
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    return this.track(makeTexture(c, 22, 22, true));
  }

  private createBrickTexture(baseHex: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#cfc7bc';
    ctx.fillRect(0, 0, 256, 256);
    const rows = 16;
    const cols = 8;
    const rh = 256 / rows;
    const cw = 256 / cols;
    const baseCol = new THREE.Color(baseHex);
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw * 0.5);
      for (let col = -1; col <= cols; col++) {
        const tint = 0.85 + Math.random() * 0.3;
        const colRgb = baseCol.clone().multiplyScalar(tint);
        ctx.fillStyle = `rgb(${Math.floor(colRgb.r * 255)},${Math.floor(colRgb.g * 255)},${Math.floor(colRgb.b * 255)})`;
        ctx.fillRect(col * cw + offset + 2, r * rh + 2, cw - 3, rh - 3);
      }
    }
    return this.track(makeTexture(c, 3, 3, true));
  }

  private createSandTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#e7cfa1';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 6) {
      ctx.fillStyle = 'rgba(210, 180, 130, 0.22)';
      ctx.fillRect(0, y + Math.sin(y * 0.2) * 2, 256, 2);
    }
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#f4e0b9' : '#cfb382';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    return this.track(makeTexture(c, 18, 18, true));
  }

  private createGrassTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#3f6e3a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4500; i++) {
      const g = 85 + Math.floor(Math.random() * 55);
      const r = 45 + Math.floor(Math.random() * 35);
      ctx.fillStyle = `rgb(${r},${g},42)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 3);
    }
    return this.track(makeTexture(c, 32, 32, true));
  }

  private createRockTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#5e625c';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const v = 70 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgb(${v},${v + 2},${v - 2})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
    }
    return this.track(makeTexture(c, 12, 12, true));
  }

  private createWoodTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#8b6343';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = '#5c3f28';
      ctx.fillRect(0, y, 256, 3);
      ctx.fillStyle = `rgba(165,122,86,${0.18 + (y % 64) * 0.002})`;
      ctx.fillRect(0, y + 3, 256, 29);
    }
    return this.track(makeTexture(c, 4, 12, true));
  }

  private createRunwayTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 512);
    ctx.fillStyle = '#24272c';
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 4000; i++) {
      const v = 28 + Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
    }
    ctx.fillStyle = '#e8edf2';
    ctx.fillRect(10, 0, 6, 512);
    ctx.fillRect(240, 0, 6, 512);
    for (let y = 16; y < 512; y += 64) {
      ctx.fillRect(123, y, 10, 36);
    }
    return this.track(makeTexture(c, 1, 10, true));
  }

  private createSkyscraperTextures(
    baseColor: string,
    frameColor: string,
    glowColor: string
  ): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
    const [cDay, ctxDay] = createCanvas(256, 512);
    const [cNight, ctxNight] = createCanvas(256, 512);

    ctxDay.fillStyle = frameColor;
    ctxDay.fillRect(0, 0, 256, 512);
    ctxNight.fillStyle = '#000000';
    ctxNight.fillRect(0, 0, 256, 512);

    const cols = 8;
    const rows = 16;
    const cw = 256 / cols;
    const rh = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const wx = col * cw + 4;
        const wy = r * rh + 5;
        const ww = cw - 8;
        const wh = rh - 10;

        const shade = Math.random();
        ctxDay.fillStyle = shade > 0.72 ? '#5a8ba8' : shade > 0.4 ? baseColor : '#28455c';
        ctxDay.fillRect(wx, wy, ww, wh);
        ctxDay.fillStyle = 'rgba(255,255,255,0.16)';
        ctxDay.fillRect(wx, wy, ww, 3);
        if (shade > 0.5) {
          ctxDay.fillStyle = 'rgba(210,235,250,0.18)';
          ctxDay.fillRect(wx + 2, wy + 4, ww - 4, wh * 0.35);
        }

        if (Math.random() < 0.52) {
          ctxNight.fillStyle = glowColor;
          ctxNight.globalAlpha = 0.55 + Math.random() * 0.45;
          ctxNight.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
          ctxNight.globalAlpha = 1;
        }
      }
    }

    return {
      map: this.track(makeTexture(cDay, 1, 1, true)),
      emissive: this.track(makeTexture(cNight, 1, 1, true)),
    };
  }

  private createStuccoFacadeTexture(wallColor: string): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(0, 122, 256, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 127, 256, 3);

    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 3; col++) {
        const x = 22 + col * 78;
        const y = 24 + r * 118;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x - 3, y - 3, 54, 70);
        ctx.fillStyle = '#2b4459';
        ctx.fillRect(x, y, 48, 64);
        ctx.fillStyle = 'rgba(180,220,245,0.22)';
        ctx.fillRect(x + 4, y + 4, 18, 56);
        ctx.strokeStyle = '#f2efe9';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, 48, 64);
        ctx.beginPath();
        ctx.moveTo(x + 24, y);
        ctx.lineTo(x + 24, y + 64);
        ctx.moveTo(x, y + 32);
        ctx.lineTo(x + 48, y + 32);
        ctx.stroke();
        ctx.fillStyle = '#e5dfd5';
        ctx.fillRect(x - 4, y + 64, 56, 6);
      }
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createCorrugatedMetalTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#606d78';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x, 0, 3, 256);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 4, 0, 3, 256);
    }
    return this.track(makeTexture(c, 2, 2, true));
  }

  private createWaterNormalTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    const img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const u = (x / 256) * Math.PI * 2;
        const v = (y / 256) * Math.PI * 2;
        const dx = Math.cos(u * 4 + v * 2) * 0.4 + Math.cos(u * 7 - v * 5) * 0.25;
        const dy = Math.sin(v * 4 + u * 3) * 0.4 + Math.sin(v * 6 + u * 5) * 0.25;
        const idx = (y * 256 + x) * 4;
        img.data[idx] = Math.floor((dx * 0.5 + 0.5) * 255);
        img.data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
        img.data[idx + 2] = 240;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this.track(makeTexture(c, 16, 16, false));
  }

  dispose(): void {
    for (const t of this.textures) t.dispose();
  }
}
