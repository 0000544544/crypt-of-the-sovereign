/**
 * CRYPT OF THE SOVEREIGN - PROCEDURAL DUNGEON GENERATOR
 * Génération procédurale de donjons avec salles thématiques :
 * Départ, Combat, Trésor, Marchand PNJ, Pièges au sol, et Arène du Boss.
 */

const TILE_SIZE = 32;

const TILE = {
  VOID: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR_CLOSED: 3,
  DOOR_OPEN: 4,
  STAIRS: 5
};

class Room {
  constructor(x, y, w, h, type = 'combat') {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type; // 'start', 'combat', 'treasure', 'shop', 'trap', 'boss'
    this.cx = Math.floor(x + w / 2);
    this.cy = Math.floor(y + h / 2);
    this.connected = false;
    this.cleared = (type === 'start' || type === 'shop' || type === 'treasure');
    this.doors = [];
    this.torches = [];
  }

  intersects(other, margin = 2) {
    return (
      this.x - margin < other.x + other.w &&
      this.x + this.w + margin > other.x &&
      this.y - margin < other.y + other.h &&
      this.y + this.h + margin > other.y
    );
  }
}

class DungeonFloor {
  constructor(floorNumber = 1, width = 60, height = 60) {
    this.floorNumber = floorNumber;
    this.width = width;
    this.height = height;

    this.grid = Array.from({ length: height }, () => new Uint8Array(width));
    this.discovered = Array.from({ length: height }, () => new Uint8Array(width));
    this.visible = Array.from({ length: height }, () => new Uint8Array(width));

    this.rooms = [];
    this.startRoom = null;
    this.bossRoom = null;
    this.treasureRoom = null;
    this.shopRoom = null;

    // Entités interactives spécifiques au donjon
    this.chests = [];
    this.traps = [];
    this.shopkeeper = null;
    this.stairs = null;
    this.torches = [];

    this.generate();
  }

  generate() {
    const maxAttempts = 50;
    const targetRoomCount = 7 + Math.min(4, Math.floor(this.floorNumber / 2));

    for (let attempt = 0; attempt < maxAttempts && this.rooms.length < targetRoomCount; attempt++) {
      const rw = Math.floor(Math.random() * 5) + 7; // 7 à 11 tiles
      const rh = Math.floor(Math.random() * 5) + 7;
      const rx = Math.floor(Math.random() * (this.width - rw - 6)) + 3;
      const ry = Math.floor(Math.random() * (this.height - rh - 6)) + 3;

      const newRoom = new Room(rx, ry, rw, rh);
      let overlaps = false;
      for (const r of this.rooms) {
        if (newRoom.intersects(r)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
      }
    }

    // Assignation des types de salles
    this.startRoom = this.rooms[0];
    this.startRoom.type = 'start';

    // Trouver la salle la plus éloignée pour le Boss
    let maxDist = -1;
    let bossIdx = 1;
    for (let i = 1; i < this.rooms.length; i++) {
      const d = Math.hypot(this.rooms[i].cx - this.startRoom.cx, this.rooms[i].cy - this.startRoom.cy);
      if (d > maxDist) {
        maxDist = d;
        bossIdx = i;
      }
    }
    this.bossRoom = this.rooms[bossIdx];
    this.bossRoom.type = 'boss';
    this.bossRoom.cleared = false;

    // Agrandir légèrement la salle du boss pour un combat d'arène digne
    this.bossRoom.w = Math.min(13, this.bossRoom.w + 2);
    this.bossRoom.h = Math.min(13, this.bossRoom.h + 2);

    // Assigner Trésor, Marchand, Pièges
    const remainingRooms = this.rooms.filter(r => r !== this.startRoom && r !== this.bossRoom);
    if (remainingRooms.length > 0) {
      this.treasureRoom = remainingRooms.shift();
      this.treasureRoom.type = 'treasure';
    }
    if (remainingRooms.length > 0) {
      this.shopRoom = remainingRooms.shift();
      this.shopRoom.type = 'shop';
    }
    if (remainingRooms.length > 0) {
      const trapRoom = remainingRooms.shift();
      trapRoom.type = 'trap';
    }

    // Creuser les salles dans la grille
    for (const r of this.rooms) {
      this.carveRoom(r);
    }

    // Connecter les salles avec des couloirs
    for (let i = 0; i < this.rooms.length - 1; i++) {
      const rA = this.rooms[i];
      const rB = this.rooms[i + 1];
      this.carveCorridor(rA.cx, rA.cy, rB.cx, rB.cy);
    }

    // Relier également la dernière salle à une salle aléatoire pour éviter les culs-de-sac
    if (this.rooms.length > 2) {
      const rLast = this.rooms[this.rooms.length - 1];
      const rMid = this.rooms[Math.floor(this.rooms.length / 2)];
      this.carveCorridor(rLast.cx, rLast.cy, rMid.cx, rMid.cy);
    }

    // Construire les murs entourant les sols
    this.buildWalls();

    // Placer les entités d'environnement
    this.populateEnvironment();
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x >= 1 && x < this.width - 1 && y >= 1 && y < this.height - 1) {
          this.grid[y][x] = TILE.FLOOR;
        }
      }
    }
  }

  carveCorridor(x1, y1, x2, y2) {
    let cx = x1;
    let cy = y1;

    // Déplacement d'abord en X puis en Y
    while (cx !== x2) {
      this.grid[cy][cx] = TILE.FLOOR;
      // Couloir de 2 tiles de large pour une circulation fluide
      if (cy + 1 < this.height - 1) this.grid[cy + 1][cx] = TILE.FLOOR;
      cx += cx < x2 ? 1 : -1;
    }

    while (cy !== y2) {
      this.grid[cy][cx] = TILE.FLOOR;
      if (cx + 1 < this.width - 1) this.grid[cy][cx + 1] = TILE.FLOOR;
      cy += cy < y2 ? 1 : -1;
    }
  }

  buildWalls() {
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] === TILE.VOID) {
          // Si une case adjacente est du sol, cette case devient un mur
          let adjacentToFloor = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (this.grid[y + dy]?.[x + dx] === TILE.FLOOR) {
                adjacentToFloor = true;
                break;
              }
            }
            if (adjacentToFloor) break;
          }
          if (adjacentToFloor) {
            this.grid[y][x] = TILE.WALL;
          }
        }
      }
    }
  }

  populateEnvironment() {
    // 1. Escaliers dans la salle du Boss
    if (this.bossRoom) {
      this.stairs = {
        x: this.bossRoom.cx * TILE_SIZE + TILE_SIZE / 2,
        y: this.bossRoom.cy * TILE_SIZE + TILE_SIZE / 2,
        locked: true // Se déverrouille une fois le Boss terrassé
      };
      this.grid[this.bossRoom.cy][this.bossRoom.cx] = TILE.STAIRS;
    }

    // 2. Coffres aux trésors
    if (this.treasureRoom) {
      const tr = this.treasureRoom;
      this.chests.push({
        x: (tr.cx - 1) * TILE_SIZE + TILE_SIZE / 2,
        y: tr.cy * TILE_SIZE + TILE_SIZE / 2,
        opened: false,
        loot: ItemGenerator.createItem(this.floorNumber, 'rare')
      });
      this.chests.push({
        x: (tr.cx + 1) * TILE_SIZE + TILE_SIZE / 2,
        y: tr.cy * TILE_SIZE + TILE_SIZE / 2,
        opened: false,
        loot: ItemGenerator.createItem(this.floorNumber, Math.random() < 0.4 ? 'epic' : 'rare')
      });
    }

    // Coffres aléatoires dans les salles de combat
    for (const r of this.rooms) {
      if (r.type === 'combat' && Math.random() < 0.35) {
        this.chests.push({
          x: r.cx * TILE_SIZE + TILE_SIZE / 2,
          y: r.cy * TILE_SIZE + TILE_SIZE / 2,
          opened: false,
          loot: ItemGenerator.createItem(this.floorNumber)
        });
      }
    }

    // 3. Marchand PNJ
    if (this.shopRoom) {
      const sr = this.shopRoom;
      this.shopkeeper = {
        x: sr.cx * TILE_SIZE + TILE_SIZE / 2,
        y: sr.cy * TILE_SIZE + TILE_SIZE / 2,
        name: 'Marius le Contrebandier',
        items: [
          ItemGenerator.createItem(this.floorNumber, 'rare'),
          ItemGenerator.createItem(this.floorNumber, 'epic'),
          ItemGenerator.createHealthPotion(),
          ItemGenerator.createManaPotion()
        ]
      };
    }

    // 4. Pièges au sol
    for (const r of this.rooms) {
      if (r.type === 'trap') {
        for (let py = r.y + 1; py < r.y + r.h - 1; py += 2) {
          for (let px = r.x + 1; px < r.x + r.w - 1; px += 2) {
            this.traps.push({
              x: px * TILE_SIZE + TILE_SIZE / 2,
              y: py * TILE_SIZE + TILE_SIZE / 2,
              damage: 18 + this.floorNumber * 4,
              activeCooldown: 0,
              triggered: false
            });
          }
        }
      }
    }

    // 5. Flambeaux muraux
    for (const r of this.rooms) {
      this.torches.push({
        x: (r.x + 1) * TILE_SIZE,
        y: r.y * TILE_SIZE,
        id: Math.random() * 10
      });
      this.torches.push({
        x: (r.x + r.w - 2) * TILE_SIZE,
        y: r.y * TILE_SIZE,
        id: Math.random() * 10
      });
    }
  }

  isWalkable(pixelX, pixelY, radius = 10) {
    // Vérifie les 4 coins de la boîte de collision
    const testPoints = [
      [pixelX - radius, pixelY - radius],
      [pixelX + radius, pixelY - radius],
      [pixelX - radius, pixelY + radius],
      [pixelX + radius, pixelY + radius]
    ];

    for (const [px, py] of testPoints) {
      const tx = Math.floor(px / TILE_SIZE);
      const ty = Math.floor(py / TILE_SIZE);
      if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
      const t = this.grid[ty][tx];
      if (t === TILE.WALL || t === TILE.VOID || t === TILE.DOOR_CLOSED) {
        return false;
      }
    }
    return true;
  }

  updateFog(playerX, playerY, sightRadius = 240) {
    const ptx = Math.floor(playerX / TILE_SIZE);
    const pty = Math.floor(playerY / TILE_SIZE);
    const rTiles = Math.ceil(sightRadius / TILE_SIZE);

    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        this.visible[ty][tx] = 0;
      }
    }

    for (let dy = -rTiles; dy <= rTiles; dy++) {
      for (let dx = -rTiles; dx <= rTiles; dx++) {
        const tx = ptx + dx;
        const ty = pty + dy;
        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
          const dist = Math.hypot(dx * TILE_SIZE, dy * TILE_SIZE);
          if (dist <= sightRadius) {
            this.visible[ty][tx] = 1;
            this.discovered[ty][tx] = 1;
          }
        }
      }
    }
  }
}

window.DungeonFloor = DungeonFloor;
window.TILE_SIZE = TILE_SIZE;
window.TILE = TILE;
