/**
 * CRYPT OF THE SOVEREIGN - ASSET DOWNLOADER & HD PIXEL ART GENERATOR V3
 * Générateur Pixel Art HD 32x32 (et 64x64 pour le Boss) avec auto-contouring sombre
 * et ombrage 3 tons (style Enter the Gungeon / Nuclear Throne).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.join(__dirname, 'assets', 'sprites');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// 1. Encodeur PNG natif Node.js
function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc ^ byte) & 1 ? 0xEDB88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  let srcOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[offset++] = 0;
    for (let x = 0; x < width; x++) {
      scanlines[offset++] = rgbaBuffer[srcOffset++];
      scanlines[offset++] = rgbaBuffer[srcOffset++];
      scanlines[offset++] = rgbaBuffer[srcOffset++];
      scanlines[offset++] = rgbaBuffer[srcOffset++];
    }
  }

  const idat = chunk('IDAT', zlib.deflateSync(scanlines));
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function isValidPng(buffer) {
  if (!buffer || buffer.length < 8) return false;
  const header = buffer.slice(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return header.equals(expected);
}

// 2. Toile Pixel Art avec support d'ombres et contours professionnels
class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4, 0);
  }

  set(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 4;
    this.data[idx] = r;
    this.data[idx + 1] = g;
    this.data[idx + 2] = b;
    this.data[idx + 3] = a;
  }

  hex(x, y, hexStr, a = 255) {
    let clean = hexStr.replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    this.set(x, y, r, g, b, a);
  }

  rect(x, y, w, h, hexStr, a = 255) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        this.hex(px, py, hexStr, a);
      }
    }
  }

  // Contour noir automatique (1px) entourant la silhouette
  applyOutline(outlineColor = '#0d0914') {
    const copy = Buffer.from(this.data);
    const getAlpha = (px, py) => {
      if (px < 0 || px >= this.w || py < 0 || py >= this.h) return 0;
      return copy[(py * this.w + px) * 4 + 3];
    };

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const a = getAlpha(x, y);
        if (a === 0) {
          // Si pixel transparent adjacent à un pixel opaque, on met un contour
          const hasOpaqueNeighbor =
            getAlpha(x + 1, y) > 0 ||
            getAlpha(x - 1, y) > 0 ||
            getAlpha(x, y + 1) > 0 ||
            getAlpha(x, y - 1) > 0;
          if (hasOpaqueNeighbor) {
            this.hex(x, y, outlineColor, 255);
          }
        }
      }
    }
  }

  toPng() {
    return createPng(this.w, this.h, this.data);
  }
}

// 3. Générateurs Procéduraux HD 32x32 & 64x64
const generators = {
  // --- HÉROS EN 32x32 ---
  'hero_knight.png': () => {
    const c = new PixelCanvas(32, 32);
    // Cape royale avec plis
    c.rect(6, 12, 20, 16, '#14213d');
    c.rect(7, 14, 18, 14, '#1d3557');
    c.rect(9, 15, 14, 13, '#457b9d');
    // Armure de plates complète
    c.rect(10, 10, 12, 14, '#495057');
    c.rect(11, 11, 10, 12, '#6c757d');
    c.rect(13, 12, 6, 10, '#adb5bd'); // Highlight lumière
    // Heaume avec visière cyan luminescente
    c.rect(10, 4, 12, 8, '#343a40');
    c.rect(11, 5, 10, 6, '#495057');
    c.rect(13, 3, 6, 2, '#ffb703'); // Cimier en or massif
    c.rect(12, 7, 8, 2, '#00f0ff'); // Visière lumineuse
    c.rect(14, 7, 4, 2, '#ffffff'); // Centre éclatant
    // Épée sacrée sculptée
    for (let i = 0; i < 16; i++) {
      c.rect(23, 2 + i, 2, 1, '#f8f9fa');
      c.rect(25, 2 + i, 1, 1, '#64dfdf'); // Lueur runique
    }
    c.rect(21, 18, 7, 2, '#ffb703'); // Garde d'or
    c.rect(23, 20, 2, 4, '#582f0e'); // Poignée cuir
    c.rect(23, 24, 2, 2, '#ffb703'); // Pommeau
    // Jambières d'acier
    c.rect(10, 24, 4, 7, '#343a40');
    c.rect(18, 24, 4, 7, '#343a40');
    c.rect(11, 25, 2, 5, '#6c757d');
    c.rect(19, 25, 2, 5, '#6c757d');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'hero_mage.png': () => {
    const c = new PixelCanvas(32, 32);
    // Robe céleste astrale
    c.rect(8, 12, 16, 17, '#1b0638');
    c.rect(10, 13, 12, 16, '#2e1065');
    c.rect(12, 14, 8, 15, '#4c1d95');
    c.rect(14, 15, 4, 14, '#7c3aed'); // Pli central lumineux
    // Capuche de sorcier mystique
    c.rect(10, 3, 12, 10, '#1e1035');
    c.rect(11, 4, 10, 8, '#2e1065');
    c.rect(13, 7, 6, 3, '#0b0416'); // Ombre du visage
    c.rect(13, 8, 2, 1, '#38bdf8'); // Regard éthéré
    c.rect(17, 8, 2, 1, '#38bdf8');
    // Bâton d'éther orné
    for (let i = 0; i < 24; i++) {
      c.rect(5, 5 + i, 2, 1, '#78350f');
      c.rect(6, 5 + i, 1, 1, '#92400e');
    }
    // Cristal arcanique en lévitation
    c.rect(3, 2, 6, 6, '#7c3aed');
    c.rect(4, 3, 4, 4, '#38bdf8');
    c.rect(5, 4, 2, 2, '#ffffff'); // Cœur d'énergie
    // Orbe magique dans l'autre main
    c.rect(22, 14, 4, 4, '#38bdf8');
    c.rect(23, 15, 2, 2, '#ffffff');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'hero_rogue.png': () => {
    const c = new PixelCanvas(32, 32);
    // Manteau d'ombre et cuir clouté
    c.rect(8, 11, 16, 17, '#111827');
    c.rect(10, 13, 12, 14, '#1f2937');
    c.rect(12, 14, 8, 12, '#374151');
    // Capuche et masque de ninja des ténèbres
    c.rect(10, 3, 12, 9, '#030712');
    c.rect(11, 4, 10, 7, '#111827');
    c.rect(12, 6, 8, 3, '#000000');
    c.rect(13, 7, 2, 1, '#10b981'); // Yeux de prédateur émeraude
    c.rect(17, 7, 2, 1, '#10b981');
    // Dagues doubles courbées (gauche & droite)
    for (let i = 0; i < 10; i++) {
      c.rect(4 + i, 20 - i, 2, 2, '#e2e8f0');
      c.rect(5 + i, 20 - i, 1, 1, '#10b981'); // Venin ruisselant
    }
    c.rect(3, 21, 3, 3, '#ffb703');
    for (let i = 0; i < 10; i++) {
      c.rect(26 - i, 20 - i, 2, 2, '#e2e8f0');
      c.rect(25 - i, 20 - i, 1, 1, '#10b981');
    }
    c.rect(26, 21, 3, 3, '#ffb703');
    // Bottes de cuir silencieuses
    c.rect(10, 24, 4, 7, '#1f2937');
    c.rect(18, 24, 4, 7, '#1f2937');
    c.applyOutline('#050508');
    return c.toPng();
  },

  // --- ENNEMIS EN 32x32 ---
  'enemy_swarmer.png': () => {
    const c = new PixelCanvas(32, 32);
    // Goule sanguinaire
    c.rect(6, 8, 20, 16, '#5c0000');
    c.rect(8, 10, 16, 13, '#9d0208');
    c.rect(10, 12, 12, 10, '#d00000');
    // Yeux démoniaques embrasés
    c.rect(10, 12, 3, 3, '#ffba08');
    c.rect(19, 12, 3, 3, '#ffba08');
    c.rect(11, 13, 1, 1, '#ffffff');
    c.rect(20, 13, 1, 1, '#ffffff');
    // Crocs et mâchoire dégoulinante
    c.rect(11, 18, 10, 4, '#370617');
    c.rect(12, 18, 2, 3, '#ffffff');
    c.rect(15, 18, 2, 3, '#ffffff');
    c.rect(18, 18, 2, 3, '#ffffff');
    // Griffes voraces
    c.rect(4, 18, 4, 8, '#6a040f');
    c.rect(24, 18, 4, 8, '#6a040f');
    c.rect(4, 26, 2, 3, '#ffffff');
    c.rect(26, 26, 2, 3, '#ffffff');
    c.applyOutline('#1c0005');
    return c.toPng();
  },

  'enemy_archer.png': () => {
    const c = new PixelCanvas(32, 32);
    // Crâne squelettique fissuré
    c.rect(10, 3, 12, 10, '#d1d5db');
    c.rect(11, 4, 10, 8, '#e5e7eb');
    c.rect(12, 6, 3, 3, '#000000'); // Orbites vides
    c.rect(17, 6, 3, 3, '#000000');
    c.rect(14, 10, 4, 2, '#4b5563'); // Dents
    // Cage thoracique
    c.rect(11, 13, 10, 9, '#9ca3af');
    c.rect(12, 14, 8, 2, '#d1d5db');
    c.rect(12, 17, 8, 2, '#d1d5db');
    c.rect(12, 20, 8, 2, '#d1d5db');
    // Grand arc recourbé en bois sombre
    for (let i = 0; i < 20; i++) {
      c.rect(4, 5 + i, 2, 1, '#78350f');
    }
    c.rect(5, 4, 3, 2, '#92400e');
    c.rect(5, 24, 3, 2, '#92400e');
    c.rect(7, 5, 1, 20, '#fefae0'); // Corde
    // Flèche en os prête à tirer
    c.rect(7, 14, 16, 2, '#e5e7eb');
    c.rect(22, 13, 3, 4, '#6b7280'); // Pointe
    // Jambes osseuses
    c.rect(11, 22, 3, 9, '#9ca3af');
    c.rect(18, 22, 3, 9, '#9ca3af');
    c.applyOutline('#0a0a0f');
    return c.toPng();
  },

  'enemy_mage.png': () => {
    const c = new PixelCanvas(32, 32);
    // Tunique de nécromancien
    c.rect(8, 10, 16, 19, '#1a052e');
    c.rect(10, 12, 12, 16, '#2d0c4e');
    c.rect(12, 14, 8, 14, '#48137a');
    // Capuche ténébreuse avec halo maudit
    c.rect(10, 2, 12, 10, '#1a052e');
    c.rect(12, 6, 8, 4, '#080112');
    c.rect(13, 7, 2, 2, '#e0aaff');
    c.rect(17, 7, 2, 2, '#e0aaff');
    // Crâne d'ombre flottant
    c.rect(23, 4, 7, 7, '#e0aaff');
    c.rect(24, 6, 2, 2, '#ff0055');
    c.rect(27, 6, 2, 2, '#ff0055');
    c.applyOutline('#080112');
    return c.toPng();
  },

  'enemy_tank.png': () => {
    const c = new PixelCanvas(32, 32);
    // Armure colossale de garde d'élite
    c.rect(7, 6, 18, 22, '#212529');
    c.rect(9, 8, 14, 19, '#343a40');
    c.rect(11, 10, 10, 16, '#495057');
    // Heaume avec visière rouge sang
    c.rect(10, 2, 12, 8, '#1b1e23');
    c.rect(12, 5, 8, 2, '#ff0033');
    c.rect(14, 5, 4, 2, '#ffffff');
    // Bouclier tour massif d'acier à croix gravée
    c.rect(2, 8, 8, 20, '#495057');
    c.rect(3, 9, 6, 18, '#6c757d');
    c.rect(3, 17, 6, 3, '#e63946');
    c.rect(5, 11, 2, 14, '#e63946');
    // Masse d'armes
    c.rect(24, 10, 4, 16, '#343a40');
    c.rect(23, 8, 6, 6, '#ff0033');
    c.applyOutline('#0a0b0d');
    return c.toPng();
  },

  // --- BOSS : LE SOUVERAIN DÉCHU EN 64x64 ---
  'enemy_boss.png': () => {
    const c = new PixelCanvas(64, 64);
    // Aura majestueuse et tourbillon spectral
    for (let y = 6; y < 58; y++) {
      for (let x = 6; x < 58; x++) {
        const d = Math.hypot(x - 32, y - 32);
        if (d < 28) {
          c.hex(x, y, '#240046', Math.round(180 * (1 - d / 28)));
        }
      }
    }
    // Cape impériale en lambeaux royaux
    c.rect(16, 24, 32, 34, '#1b0638');
    c.rect(20, 26, 24, 30, '#3c096c');
    c.rect(24, 28, 16, 26, '#5a189a');
    // Armure spectrale du Roi
    c.rect(22, 22, 20, 18, '#212529');
    c.rect(24, 24, 16, 14, '#343a40');
    c.rect(28, 26, 8, 10, '#ffb703'); // Sceau royal gravé
    // Grande couronne d'or massif sertie de joyaux
    c.rect(20, 6, 24, 10, '#ffb703');
    c.rect(22, 2, 4, 5, '#fb8500');
    c.rect(30, 0, 4, 7, '#fb8500'); // Pointe centrale
    c.rect(38, 2, 4, 5, '#fb8500');
    c.rect(24, 10, 3, 3, '#d90429'); // Rubis
    c.rect(30, 10, 4, 4, '#00f0ff'); // Saphir royal
    c.rect(37, 10, 3, 3, '#7209b7'); // Améthyste
    // Visage spectral sans chair avec flammes azur
    c.rect(22, 14, 20, 12, '#0d1b2a');
    c.rect(25, 17, 4, 4, '#00f0ff');
    c.rect(26, 18, 2, 2, '#ffffff');
    c.rect(35, 17, 4, 4, '#00f0ff');
    c.rect(36, 18, 2, 2, '#ffffff');
    // Mâchoire terrifiante
    c.rect(28, 22, 8, 3, '#415a77');
    // Lames spectrales en lévitation autour du souverain
    // Lame Gauche
    for (let i = 0; i < 28; i++) {
      c.rect(8, 14 + i, 3, 1, '#e0aaff');
      c.rect(9, 14 + i, 1, 1, '#ffffff');
    }
    c.rect(6, 38, 7, 3, '#ffb703');
    // Lame Droite
    for (let i = 0; i < 28; i++) {
      c.rect(53, 14 + i, 3, 1, '#e0aaff');
      c.rect(54, 14 + i, 1, 1, '#ffffff');
    }
    c.rect(51, 38, 7, 3, '#ffb703');
    c.applyOutline('#0a0014');
    return c.toPng();
  },

  // --- TUILES EN 32x32 & VARIANTES ---
  'tile_floor.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#181920');
    // Pavés sculptés
    c.rect(2, 2, 13, 13, '#2a2c35');
    c.rect(3, 3, 11, 11, '#343844');
    c.rect(17, 2, 13, 13, '#2a2c35');
    c.rect(18, 3, 11, 11, '#343844');
    c.rect(2, 17, 13, 13, '#2a2c35');
    c.rect(3, 18, 11, 11, '#343844');
    c.rect(17, 17, 13, 13, '#2a2c35');
    c.rect(18, 18, 11, 11, '#343844');
    // Mortier et fissures
    c.rect(0, 15, 32, 2, '#111216');
    c.rect(15, 0, 2, 32, '#111216');
    c.hex(7, 8, '#434958');
    c.hex(22, 23, '#434958');
    return c.toPng();
  },

  'tile_floor_cracked.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#181920');
    c.rect(2, 2, 28, 28, '#2a2c35');
    c.rect(3, 3, 26, 26, '#343844');
    // Fissure runique luminescente
    const cracks = [[6, 8], [8, 10], [9, 12], [11, 13], [14, 15], [17, 18], [20, 22], [24, 25]];
    cracks.forEach(([px, py]) => {
      c.rect(px, py, 2, 2, '#7c3aed');
      c.hex(px, py, '#c084fc');
    });
    return c.toPng();
  },

  'tile_floor_moss.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#181920');
    c.rect(2, 2, 28, 28, '#26292b');
    c.rect(3, 3, 26, 26, '#2f3435');
    // Mousse ancienne et feuillage
    c.rect(4, 5, 8, 6, '#14532d');
    c.rect(5, 6, 6, 4, '#16a34a');
    c.rect(18, 19, 9, 7, '#14532d');
    c.rect(19, 20, 7, 5, '#16a34a');
    c.hex(21, 22, '#4ade80');
    return c.toPng();
  },

  'tile_wall.png': () => {
    const c = new PixelCanvas(32, 32);
    // Dessus de mur 2.5D sombre
    c.rect(0, 0, 32, 6, '#0f1115');
    c.rect(1, 1, 30, 4, '#1c1f26');
    // Briques gothiques en façade avec relief
    c.rect(0, 6, 32, 26, '#181a20');
    // Rangée 1
    c.rect(1, 7, 14, 6, '#373b47');
    c.rect(16, 7, 15, 6, '#373b47');
    c.rect(2, 8, 12, 4, '#474c5b');
    c.rect(17, 8, 13, 4, '#474c5b');
    // Rangée 2
    c.rect(1, 14, 30, 7, '#2f333e');
    c.rect(8, 14, 15, 7, '#373b47');
    c.rect(9, 15, 13, 5, '#474c5b');
    // Rangée 3
    c.rect(1, 22, 14, 6, '#373b47');
    c.rect(16, 22, 15, 6, '#373b47');
    c.rect(2, 23, 12, 4, '#474c5b');
    c.rect(17, 23, 13, 4, '#474c5b');
    // Base et ombre portée au sol
    c.rect(0, 29, 32, 3, '#0b0c0f');
    return c.toPng();
  },

  'tile_door_closed.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#181920');
    c.rect(3, 2, 26, 28, '#451a03');
    c.rect(5, 4, 22, 24, '#78350f');
    // Cerclages de fer forgé
    c.rect(3, 8, 26, 3, '#334155');
    c.rect(3, 20, 26, 3, '#334155');
    // Heurtoir en tête de lion dorée
    c.rect(14, 12, 4, 6, '#ffb703');
    c.rect(15, 17, 2, 3, '#fb8500');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_door_open.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#0f172a');
    c.rect(4, 2, 24, 28, '#030712'); // Abîme sombre du passage
    c.rect(2, 2, 4, 28, '#582f0e'); // Battant gauche ouvert
    c.rect(26, 2, 4, 28, '#582f0e'); // Battant droit ouvert
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_stairs.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#181920');
    // Marches descendantes en spirale
    c.rect(3, 3, 26, 6, '#64748b');
    c.rect(4, 4, 24, 4, '#94a3b8');
    c.rect(5, 9, 22, 6, '#475569');
    c.rect(6, 10, 20, 4, '#64748b');
    c.rect(7, 15, 18, 6, '#334155');
    c.rect(8, 16, 16, 4, '#475569');
    c.rect(9, 21, 14, 5, '#1e293b');
    c.rect(11, 26, 10, 5, '#020617'); // Ténèbres du sous-sol
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_torch.png': () => {
    const c = new PixelCanvas(32, 32);
    // Support en fer forgé travaillé
    c.rect(14, 14, 4, 14, '#334155');
    c.rect(12, 24, 8, 4, '#1e293b');
    // Brasier et flamme ardente
    c.rect(12, 10, 8, 5, '#d97706');
    c.rect(11, 4, 10, 8, '#f59e0b');
    c.rect(13, 1, 6, 6, '#fbbf24');
    c.rect(14, 3, 4, 3, '#ffffff'); // Cœur blanc chaud
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_chest_closed.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(4, 8, 24, 18, '#582f0e');
    c.rect(6, 10, 20, 14, '#7f4f24');
    c.rect(4, 12, 24, 4, '#ffb703'); // Cerclage or
    c.rect(14, 14, 4, 5, '#ffd166'); // Serrure
    c.rect(15, 16, 2, 2, '#000000');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_chest_open.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(4, 12, 24, 14, '#582f0e');
    c.rect(2, 4, 28, 7, '#7f4f24'); // Couvercle ouvert relevé
    // Joyaux et or brillant
    c.rect(6, 10, 20, 4, '#ffb703');
    c.rect(8, 10, 3, 3, '#ef4444'); // Rubis
    c.rect(14, 9, 4, 4, '#3b82f6'); // Saphir
    c.rect(21, 10, 3, 3, '#10b981'); // Émeraude
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_spikes.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(0, 0, 32, 32, '#1e293b');
    const spikes = [[6, 6], [20, 6], [13, 13], [6, 20], [20, 20]];
    spikes.forEach(([sx, sy]) => {
      c.rect(sx, sy + 2, 6, 6, '#64748b');
      c.rect(sx + 1, sy, 4, 4, '#94a3b8');
      c.rect(sx + 2, sy - 2, 2, 2, '#f8fafc'); // Pointe tranchante
      c.hex(sx + 2, sy - 1, '#dc2626'); // Sang
    });
    c.applyOutline('#0f172a');
    return c.toPng();
  },

  'tile_shopkeeper.png': () => {
    const c = new PixelCanvas(32, 32);
    // Marchand avec manteau vert et sac d'or
    c.rect(8, 10, 16, 18, '#14532d');
    c.rect(10, 12, 12, 14, '#166534');
    // Grand chapeau pourpre de contrebandier
    c.rect(6, 2, 20, 8, '#701a75');
    c.rect(10, 0, 12, 4, '#86198f');
    c.rect(13, 7, 6, 4, '#fcd34d'); // Visage
    c.rect(14, 8, 2, 2, '#000000'); // Yeux
    c.rect(18, 8, 2, 2, '#000000');
    // Bourse d'or étincelante
    c.rect(20, 18, 8, 8, '#ffb703');
    c.rect(22, 16, 4, 3, '#fb8500');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  // --- NOUVEAUX ÉLÉMENTS DE DÉCOR, DESTRUCTIBLES & GOUFFRES V4 ---
  'tile_barrel.png': () => {
    const c = new PixelCanvas(32, 32);
    // Corps en chêne foncé
    c.rect(6, 4, 20, 24, '#5c3317');
    c.rect(5, 8, 22, 16, '#78421a');
    c.rect(7, 6, 18, 20, '#8f5223');
    // Cerclages de fer forgé
    c.rect(5, 7, 22, 3, '#334155');
    c.rect(5, 22, 22, 3, '#334155');
    c.rect(6, 14, 20, 2, '#1e293b');
    // Lattes de bois et rivets
    c.rect(11, 4, 1, 24, '#3d200f');
    c.rect(16, 4, 1, 24, '#3d200f');
    c.rect(21, 4, 1, 24, '#3d200f');
    c.rect(6, 8, 1, 1, '#94a3b8');
    c.rect(25, 8, 1, 1, '#94a3b8');
    c.rect(6, 23, 1, 1, '#94a3b8');
    c.rect(25, 23, 1, 1, '#94a3b8');
    // Reflet bois
    c.rect(8, 10, 3, 12, '#a7632e');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_urn.png': () => {
    const c = new PixelCanvas(32, 32);
    // Vase / Urne funéraire en terre cuite antique
    c.rect(10, 4, 12, 4, '#9c6644'); // Bord supérieur
    c.rect(12, 8, 8, 4, '#7f4f24');  // Col resserré
    c.rect(6, 12, 20, 14, '#b07d62'); // Panse large
    c.rect(8, 14, 16, 10, '#c78d6c'); // Reflet terre cuite
    c.rect(9, 26, 14, 4, '#7f4f24');  // Pied
    // Motifs grecs / runes dorées
    c.rect(8, 16, 16, 2, '#ffd166');
    c.rect(10, 15, 2, 4, '#ffd166');
    c.rect(15, 15, 2, 4, '#ffd166');
    c.rect(20, 15, 2, 4, '#ffd166');
    // Fissure d'âge
    c.rect(13, 19, 1, 5, '#4a2810');
    c.rect(14, 22, 2, 1, '#4a2810');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_chasm.png': () => {
    const c = new PixelCanvas(32, 32);
    // Abîme abyssal sans fond avec brume sombre et lueur du vide
    c.rect(0, 0, 32, 32, '#030206');
    // Dégradé de falaise plongeante
    c.rect(0, 0, 32, 4, '#120f1c');
    c.rect(0, 4, 32, 4, '#0c0a14');
    c.rect(0, 8, 32, 4, '#08060e');
    // Éclats d'âmes tourbillonnant dans l'abîme
    c.rect(8, 14, 2, 2, '#38165c');
    c.rect(22, 18, 3, 3, '#2a0845');
    c.rect(14, 24, 2, 2, '#18042b');
    c.hex(23, 19, '#7209b7');
    c.hex(9, 15, '#4cc9f0');
    return c.toPng();
  },

  'tile_bridge.png': () => {
    const c = new PixelCanvas(32, 32);
    // Pont de pierre ancienne traversant le gouffre
    c.rect(0, 0, 32, 32, '#181920');
    // Dalles centrales solides
    c.rect(2, 2, 28, 28, '#2d303a');
    c.rect(4, 4, 24, 24, '#3b3f4d');
    // Rainures de blocs
    c.rect(2, 15, 28, 2, '#1a1b22');
    c.rect(15, 2, 2, 14, '#1a1b22');
    c.rect(15, 17, 2, 13, '#1a1b22');
    // Bordures en relief (parapets)
    c.rect(0, 0, 3, 32, '#4d5366');
    c.rect(29, 0, 3, 32, '#4d5366');
    c.rect(1, 1, 1, 30, '#69728c');
    c.rect(30, 1, 1, 30, '#333744');
    // Gravures runiques bleutées de stabilisation
    c.hex(8, 8, '#38bdf8');
    c.hex(22, 22, '#38bdf8');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_altar.png': () => {
    const c = new PixelCanvas(32, 32);
    // Socle de marbre noir runique
    c.rect(4, 18, 24, 12, '#181224');
    c.rect(2, 26, 28, 6, '#0f0a17');
    c.rect(6, 14, 20, 6, '#281a3d');
    // Table de sacrifice
    c.rect(4, 10, 24, 5, '#3c255c');
    c.rect(6, 8, 20, 3, '#563882');
    // Bol de sang rituel / flamme violette
    c.rect(11, 4, 10, 5, '#d90429');
    c.rect(12, 2, 8, 4, '#ef233c');
    c.rect(14, 0, 4, 4, '#9d4edd');
    c.rect(15, 1, 2, 2, '#ffffff');
    // Yeux ou runes infernales sur la pierre
    c.rect(8, 20, 3, 3, '#ff0055');
    c.rect(21, 20, 3, 3, '#ff0055');
    c.rect(14, 22, 4, 4, '#ffb703');
    c.applyOutline('#06020a');
    return c.toPng();
  },

  'tile_decor_bones.png': () => {
    const c = new PixelCanvas(32, 32);
    // Tas d'ossements et crânes au sol
    c.rect(6, 12, 6, 6, '#d1d5db');
    c.rect(7, 13, 2, 2, '#111827'); // Orbite crâne 1
    c.rect(10, 13, 2, 2, '#111827');
    c.rect(16, 16, 5, 5, '#9ca3af');
    c.rect(17, 17, 1, 1, '#111827');
    c.rect(19, 17, 1, 1, '#111827');
    // Fémurs croisés
    for (let i = 0; i < 14; i++) {
      c.rect(8 + i, 8 + i, 2, 1, '#e5e7eb');
      c.rect(22 - i, 8 + i, 2, 1, '#e5e7eb');
    }
    c.rect(7, 7, 3, 3, '#d1d5db');
    c.rect(21, 7, 3, 3, '#d1d5db');
    c.rect(7, 21, 3, 3, '#9ca3af');
    c.rect(21, 21, 3, 3, '#9ca3af');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'tile_decor_chains.png': () => {
    const c = new PixelCanvas(32, 32);
    // Chaînes en fer rouillé fixées au sol
    c.rect(4, 4, 6, 6, '#475569'); // Anneau d'ancrage
    c.rect(6, 6, 2, 2, '#0f172a');
    for (let i = 0; i < 8; i++) {
      const cx = 8 + i * 2;
      const cy = 8 + Math.floor(i * 2.2);
      c.rect(cx, cy, 4, 3, i % 2 === 0 ? '#64748b' : '#334155');
      c.hex(cx + 1, cy + 1, '#94a3b8');
    }
    // Menotte ou boulet brisé
    c.rect(20, 22, 8, 8, '#334155');
    c.rect(22, 24, 4, 4, '#64748b');
    c.applyOutline('#080b12');
    return c.toPng();
  },

  'tile_decor_puddle.png': () => {
    const c = new PixelCanvas(32, 32);
    // Flaque d'eau sombre avec reflets
    c.rect(4, 8, 24, 16, '#0f172a');
    c.rect(6, 6, 20, 20, '#1e293b');
    c.rect(8, 9, 16, 14, '#1e3a5f');
    c.rect(10, 11, 12, 10, '#2563eb');
    c.rect(12, 13, 8, 5, '#38bdf8');
    c.rect(14, 14, 4, 2, '#ffffff'); // Reflet étincelant
    c.applyOutline('#030712');
    return c.toPng();
  },

  // --- RUNES & GEMMES V4 ---
  'item_rune_fire.png': () => {
    const c = new PixelCanvas(32, 32);
    // Tablette runique taillée dans l'obsidienne
    c.rect(6, 4, 20, 24, '#1f1315');
    c.rect(7, 5, 18, 22, '#331a1d');
    c.rect(8, 6, 16, 20, '#4d1e22');
    // Symbole runique de Flamme ardente
    c.rect(15, 8, 2, 16, '#ff0033');
    c.rect(13, 12, 6, 3, '#ff5400');
    c.rect(11, 16, 10, 3, '#ff9e00');
    c.rect(14, 10, 4, 8, '#ffbd00');
    c.rect(15, 12, 2, 4, '#ffffff'); // Cœur ardent
    c.applyOutline('#0d0506');
    return c.toPng();
  },

  'item_rune_lifesteal.png': () => {
    const c = new PixelCanvas(32, 32);
    // Tablette runique sanglante
    c.rect(6, 4, 20, 24, '#1a050d');
    c.rect(7, 5, 18, 22, '#2d0918');
    c.rect(8, 6, 16, 20, '#470c26');
    // Goutte de sang vampirique & rune
    c.rect(15, 8, 2, 2, '#d90429');
    c.rect(14, 10, 4, 3, '#ef233c');
    c.rect(12, 13, 8, 6, '#d90429');
    c.rect(13, 19, 6, 3, '#a00020');
    c.rect(14, 13, 2, 2, '#ffffff'); // Reflet
    c.applyOutline('#0d0207');
    return c.toPng();
  },

  'item_rune_haste.png': () => {
    const c = new PixelCanvas(32, 32);
    // Tablette runique éolienne / tempête
    c.rect(6, 4, 20, 24, '#0f172a');
    c.rect(7, 5, 18, 22, '#1e293b');
    c.rect(8, 6, 16, 20, '#334155');
    // Éclair doré / plumes de vitesse
    c.rect(17, 8, 3, 5, '#ffd166');
    c.rect(14, 12, 6, 3, '#ffb703');
    c.rect(12, 15, 6, 3, '#fb8500');
    c.rect(15, 17, 3, 6, '#ffb703');
    c.rect(16, 10, 1, 4, '#ffffff');
    c.applyOutline('#060912');
    return c.toPng();
  },

  'item_rune_frost.png': () => {
    const c = new PixelCanvas(32, 32);
    // Tablette runique de glace éternelle
    c.rect(6, 4, 20, 24, '#081c24');
    c.rect(7, 5, 18, 22, '#0f3342');
    c.rect(8, 6, 16, 20, '#164e63');
    // Flocon de givre céleste
    c.rect(15, 8, 2, 16, '#67e8f9');
    c.rect(8, 15, 16, 2, '#67e8f9');
    c.rect(11, 11, 2, 2, '#a5f3fc');
    c.rect(19, 11, 2, 2, '#a5f3fc');
    c.rect(11, 19, 2, 2, '#a5f3fc');
    c.rect(19, 19, 2, 2, '#a5f3fc');
    c.rect(15, 15, 2, 2, '#ffffff');
    c.applyOutline('#030b0e');
    return c.toPng();
  },

  'item_gem_ruby.png': () => {
    const c = new PixelCanvas(32, 32);
    // Gemme Rubis taillée en poire
    c.rect(13, 8, 6, 4, '#d90429');
    c.rect(10, 12, 12, 8, '#ef233c');
    c.rect(12, 20, 8, 4, '#d90429');
    c.rect(14, 24, 4, 2, '#9d0208');
    // Facettes étincelantes
    c.rect(12, 11, 4, 4, '#ff758f');
    c.rect(13, 12, 2, 2, '#ffffff');
    c.applyOutline('#0d0205');
    return c.toPng();
  },

  'item_gem_sapphire.png': () => {
    const c = new PixelCanvas(32, 32);
    // Gemme Saphir royale
    c.rect(11, 8, 10, 4, '#1d4ed8');
    c.rect(8, 12, 16, 8, '#2563eb');
    c.rect(11, 20, 10, 4, '#1d4ed8');
    c.rect(13, 24, 6, 2, '#1e3a8a');
    // Facettes étincelantes
    c.rect(11, 11, 4, 4, '#60a5fa');
    c.rect(12, 12, 2, 2, '#ffffff');
    c.applyOutline('#030b1e');
    return c.toPng();
  },

  'item_gem_emerald.png': () => {
    const c = new PixelCanvas(32, 32);
    // Gemme Émeraude octogonale
    c.rect(12, 8, 8, 4, '#047857');
    c.rect(9, 12, 14, 8, '#059669');
    c.rect(12, 20, 8, 4, '#047857');
    c.rect(13, 24, 6, 2, '#064e3b');
    // Facettes étincelantes
    c.rect(11, 11, 4, 4, '#34d399');
    c.rect(12, 12, 2, 2, '#ffffff');
    c.applyOutline('#020f0a');
    return c.toPng();
  },

  // --- OBJETS EN 32x32 ---
  'item_sword.png': () => {
    const c = new PixelCanvas(32, 32);
    for (let i = 0; i < 18; i++) {
      c.rect(24 - i, 4 + i, 3, 2, '#f8fafc');
      c.rect(25 - i, 4 + i, 1, 1, '#00f0ff'); // Lueur runique
    }
    c.rect(8, 20, 7, 3, '#ffb703'); // Garde
    c.rect(6, 23, 4, 4, '#582f0e'); // Poignée
    c.rect(5, 26, 3, 3, '#ffb703'); // Pommeau
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_staff.png': () => {
    const c = new PixelCanvas(32, 32);
    for (let i = 0; i < 22; i++) {
      c.rect(6 + i, 26 - i, 2, 2, '#78350f');
    }
    // Cristal arcanique
    c.rect(23, 3, 7, 7, '#7c3aed');
    c.rect(25, 5, 4, 4, '#38bdf8');
    c.rect(26, 6, 2, 2, '#ffffff');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_dagger.png': () => {
    const c = new PixelCanvas(32, 32);
    for (let i = 0; i < 12; i++) {
      c.rect(22 - i, 6 + i, 3, 2, '#e2e8f0');
      c.rect(23 - i, 6 + i, 1, 1, '#10b981'); // Poison
    }
    c.rect(11, 17, 5, 3, '#ffb703');
    c.rect(9, 20, 3, 4, '#1f2937');
    c.rect(8, 24, 3, 3, '#ffb703');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_armor_heavy.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(6, 6, 20, 20, '#475569');
    c.rect(8, 8, 16, 16, '#64748b');
    c.rect(12, 10, 8, 12, '#ffb703'); // Sceau d'or
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_armor_robe.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(6, 4, 20, 24, '#2e1065');
    c.rect(9, 6, 14, 20, '#4c1d95');
    c.rect(13, 8, 6, 16, '#38bdf8'); // Voile arcanique
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_armor_leather.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(6, 6, 20, 20, '#451a03');
    c.rect(8, 8, 16, 16, '#78350f');
    c.rect(11, 11, 10, 10, '#10b981'); // Écusson vert d'ombre
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_ring.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(8, 10, 16, 16, '#ffb703');
    c.rect(12, 14, 8, 8, '#000000', 0); // Centre creux
    c.rect(12, 6, 8, 6, '#ec4899'); // Joyau rubis étincelant
    c.hex(14, 8, '#ffffff');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_potion_health.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(13, 3, 6, 4, '#d4a373'); // Bouchon
    c.rect(14, 7, 4, 4, '#94a3b8'); // Goulot
    c.rect(8, 11, 16, 17, '#dc2626'); // Potion rouge
    c.rect(10, 13, 12, 13, '#ef4444');
    c.rect(10, 13, 3, 3, '#ffffff'); // Reflet
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_potion_mana.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(13, 3, 6, 4, '#d4a373');
    c.rect(14, 7, 4, 4, '#94a3b8');
    c.rect(8, 11, 16, 17, '#2563eb'); // Potion bleue
    c.rect(10, 13, 12, 13, '#3b82f6');
    c.rect(10, 13, 3, 3, '#93c5fd');
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_coin.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(7, 5, 18, 22, '#d97706');
    c.rect(9, 4, 14, 24, '#d97706');
    c.rect(9, 6, 14, 20, '#ffb703');
    c.rect(11, 8, 10, 16, '#ffd166');
    c.rect(14, 11, 4, 10, '#b45309'); // Sceau royal gravé
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'item_soul_gem.png': () => {
    const c = new PixelCanvas(32, 32);
    c.rect(11, 4, 10, 24, '#581c87');
    c.rect(7, 9, 18, 14, '#581c87');
    c.rect(10, 8, 12, 16, '#a855f7');
    c.rect(13, 11, 6, 10, '#f472b6');
    c.hex(15, 13, '#ffffff'); // Lueur spirituelle
    c.applyOutline('#0a0812');
    return c.toPng();
  },

  'icon.png': () => {
    const c = new PixelCanvas(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 32, y - 32);
        if (d < 30) {
          c.hex(x, y, '#10002b');
        }
      }
    }
    c.rect(18, 14, 28, 14, '#ffb703');
    c.rect(20, 18, 24, 8, '#ffd166');
    c.rect(18, 8, 6, 8, '#fb8500');
    c.rect(29, 6, 6, 10, '#fb8500');
    c.rect(40, 8, 6, 8, '#fb8500');
    c.rect(20, 18, 3, 3, '#d90429');
    c.rect(30, 18, 4, 4, '#4cc9f0');
    c.rect(41, 18, 3, 3, '#7209b7');
    c.rect(24, 32, 16, 16, '#e0aaff');
    c.rect(26, 36, 4, 4, '#00f0ff');
    c.rect(34, 36, 4, 4, '#00f0ff');
    c.rect(28, 44, 8, 4, '#3c096c');
    c.applyOutline('#05000a');
    return c.toPng();
  }
};

async function main() {
  console.log('========================================================');
  console.log('🎨 GÉNÉRATION DES ASSETS HD 32x32 & 64x64 AVEC OUTLINES');
  console.log('========================================================');

  let success = 0;
  for (const [name, gen] of Object.entries(generators)) {
    const targetPath = path.join(ASSETS_DIR, name);
    const buf = gen();
    if (isValidPng(buf)) {
      fs.writeFileSync(targetPath, buf);
      console.log(`✅ [SPRITE HD] ${name} (${buf.length} octets)`);
      success++;
    } else {
      console.error(`❌ Échec pour ${name}`);
    }
  }

  console.log('========================================================');
  console.log(`🎉 100% DES ASSETS HD SONT VALIDES (${success}/${Object.keys(generators).length})`);
  console.log('========================================================');
}

main();
