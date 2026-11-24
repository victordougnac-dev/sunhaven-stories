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
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export interface MaterialPalette {
  asphalt: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  mountainRock: THREE.MeshStandardMaterial;
  woodPlank: THREE.MeshStandardMaterial;
  runway: THREE.MeshStandardMaterial;
  glassTowerDay: THREE.MeshStandardMaterial[];
  glassTowerEmissive: THREE.CanvasTexture[];
  stuccoMaterials: THREE.MeshStandardMaterial[];
  industrialMetal: THREE.MeshStandardMaterial;
  waterNormal: THREE.CanvasTexture;
}

export class TextureFactory {
  public palette!: MaterialPalette;
  private textures: THREE.Texture[] = [];

  buildPalette(): MaterialPalette {
    const asphaltTex = this.createAsphaltTexture();
    const asphaltRough = this.createNoiseRoughnessTexture(128, 128, 190, 45);
    const asphalt = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughnessMap: asphaltRough,
      roughness: 0.88,
      metalness: 0.05,
    });

    const sidewalkTex = this.createSidewalkTexture();
    const sidewalk = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.82,
      metalness: 0.04,
    });

    const sandTex = this.createSandTexture();
    const sand = new THREE.MeshStandardMaterial({
      map: sandTex,
      roughness: 0.94,
      metalness: 0.0,
    });

    const grassTex = this.createGrassTexture();
    const grass = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.9,
      metalness: 0.0,
    });

    const rockTex = this.createRockTexture();
    const mountainRock = new THREE.MeshStandardMaterial({
      map: rockTex,
      roughness: 0.92,
      metalness: 0.04,
    });

    const woodTex = this.createWoodTexture();
    const woodPlank = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.78,
      metalness: 0.05,
    });

    const runwayTex = this.createRunwayTexture();
    const runway = new THREE.MeshStandardMaterial({
      map: runwayTex,
      roughness: 0.84,
      metalness: 0.08,
    });

    // 4 varied skyscraper curtain wall styles (teal glass, deep slate glass, warm bronze glass, modern limestone)
    const towerSpecs = [
      { base: '#345e7d', frame: '#7d9cb2', glow: '#ffdca8' },
      { base: '#2c4159', frame: '#6b7e96', glow: '#9be7ff' },
      { base: '#574a42', frame: '#98887b', glow: '#ffe29c' },
      { base: '#465e6b', frame: '#b8c5cf', glow: '#ffdfbe' },
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
          roughness: 0.32,
          metalness: 0.42,
        })
      );
    }

    // Coastal pastel & warm stucco facades for shops, suburbs, hotels
    const stuccoColors = [
      '#f2e6d8',
      '#f7cbb8',
      '#cfe8e4',
      '#f4dea6',
      '#e2d4c8',
      '#d9e4ec',
      '#f0b7a4',
      '#d8e8cb',
    ];
    const stuccoMaterials = stuccoColors.map((col) => {
      const tex = this.createStuccoFacadeTexture(col);
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.78,
        metalness: 0.04,
      });
    });

    const metalTex = this.createCorrugatedMetalTexture();
    const industrialMetal = new THREE.MeshStandardMaterial({
      map: metalTex,
      roughness: 0.55,
      metalness: 0.45,
    });

    const waterNormal = this.createWaterNormalTexture();

    this.palette = {
      asphalt,
      sidewalk,
      sand,
      grass,
      mountainRock,
      woodPlank,
      runway,
      glassTowerDay,
      glassTowerEmissive,
      stuccoMaterials,
      industrialMetal,
      waterNormal,
    };

    return this.palette;
  }

  private track(tex: THREE.CanvasTexture): THREE.CanvasTexture {
    this.textures.push(tex);
    return tex;
  }

  private createAsphaltTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#2a2e35';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = 32 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(x, y, 2, 2);
    }
    return this.track(makeTexture(c, 1, 1, true));
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
    return this.track(makeTexture(c, 4, 4, false));
  }

  private createSidewalkTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#b9b4ab';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#928c83';
    ctx.lineWidth = 3;
    const step = 64;
    for (let x = 0; x <= 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    for (let i = 0; i < 2000; i++) {
      const v = 160 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${v},${v - 4},${v - 10},0.25)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    return this.track(makeTexture(c, 2, 2, true));
  }

  private createSandTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#e7cfa1';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 6) {
      ctx.fillStyle = 'rgba(210, 180, 130, 0.2)';
      ctx.fillRect(0, y + Math.sin(y * 0.2) * 2, 256, 2);
    }
    for (let i = 0; i < 3500; i++) {
      const v = Math.random() > 0.5 ? '#f4e0b9' : '#cfb382';
      ctx.fillStyle = v;
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
    // Edge lines
    ctx.fillStyle = '#e8edf2';
    ctx.fillRect(10, 0, 6, 512);
    ctx.fillRect(240, 0, 6, 512);
    // Dashed centerline
    for (let y = 16; y < 512; y += 64) {
      ctx.fillRect(123, y, 10, 36);
    }
    return this.track(makeTexture(c, 1, 8, true));
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

        // Subtle variation in window glass reflection
        const shade = Math.random();
        ctxDay.fillStyle = shade > 0.7 ? '#3b647e' : baseColor;
        ctxDay.fillRect(wx, wy, ww, wh);

        // Floor slab accent
        ctxDay.fillStyle = 'rgba(255,255,255,0.12)';
        ctxDay.fillRect(wx, wy, ww, 3);

        // Night lit windows (~48% lit)
        if (Math.random() < 0.48) {
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

    // Subtle stucco grain
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    // Window trim & shutters
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 3; col++) {
        const x = 24 + col * 78;
        const y = 26 + r * 116;
        ctx.fillStyle = '#334656';
        ctx.fillRect(x, y, 48, 66);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, 48, 66);
        ctx.beginPath();
        ctx.moveTo(x + 24, y);
        ctx.lineTo(x + 24, y + 66);
        ctx.moveTo(x, y + 33);
        ctx.lineTo(x + 48, y + 33);
        ctx.stroke();
      }
    }
    return this.track(makeTexture(c, 1, 1, true));
  }

  private createCorrugatedMetalTexture(): THREE.CanvasTexture {
    const [c, ctx] = createCanvas(256, 256);
    ctx.fillStyle = '#606d78';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.fillRect(x, 0, 3, 256);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
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
        const dx =
          Math.cos(u * 4 + v * 2) * 0.4 + Math.cos(u * 7 - v * 5) * 0.25;
        const dy =
          Math.sin(v * 4 + u * 3) * 0.4 + Math.sin(v * 6 + u * 5) * 0.25;
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
