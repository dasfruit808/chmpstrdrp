import * as Phaser from "phaser";
class PerformanceManager {
  constructor(scene) {
    this.scene = scene;
    this.frameCount = 0;
    this.lastTime = 0;
    this.fps = 60;
    this.targetFPS = 60;
    this.qualityLevel = 1;
    this.fpsHistory = [];
    this.maxHistoryLength = 60;
    this.autoOptimize = true;
  }
  update(time) {
    this.frameCount++;
    if (time - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = time;
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }
      if (this.autoOptimize && this.fpsHistory.length >= 10) {
        this.adjustQuality();
      }
    }
  }
  adjustQuality() {
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    if (avgFPS < 40 && this.qualityLevel > 0) {
      this.qualityLevel--;
      this.applyQualitySettings();
    } else if (avgFPS > 58 && this.qualityLevel < 2) {
      this.qualityLevel++;
      this.applyQualitySettings();
    }
  }
  applyQualitySettings() {
    const settings = this.getQualitySettings();
    if (this.scene.game.events) {
      this.scene.game.events.emit('quality-changed', settings);
    }
  }
  getQualitySettings() {
    const settings = [{
      particles: 0.25,
      effects: 0.4,
      shadows: false,
      grid: false
    }, {
      particles: 0.65,
      effects: 0.75,
      shadows: true,
      grid: true
    }, {
      particles: 1.0,
      effects: 1.0,
      shadows: true,
      grid: true
    }];
    return settings[this.qualityLevel];
  }
}
class ObjectPool {
  constructor(scene, createFunc, resetFunc, initialSize = 10, maxCapacity, key) {
    this.scene = scene;
    this.createFunc = createFunc;
    this.resetFunc = resetFunc;
    this.pool = [];
    this.active = [];
    this.key = key;
    this.totalCreated = 0;
    this.lastWarningTime = 0;
    this.warningInterval = 2000;
    this.maxCapacity = typeof maxCapacity === 'number' ? maxCapacity : initialSize * 2;
    const initialCount = Math.min(initialSize, this.maxCapacity);
    for (let i = 0; i < initialCount; i++) {
      const obj = this.createManagedObject();
      obj.setActive(false);
      obj.setVisible(false);
      this.pool.push(obj);
    }
  }
  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else if (this.hasCapacityAvailable()) {
      obj = this.createManagedObject();
    } else {
      obj = this.recycleOldest();
      this.reportCapacityWarning('Pool at capacity; recycling oldest object.');
    }
    if (!obj) {
      obj = this.createManagedObject();
      this.reportCapacityWarning('Pool exceeded capacity; allocating additional object.');
    }
    obj.setActive(true);
    obj.setVisible(true);
    this.active.push(obj);
    return obj;
  }
  release(obj) {
    const index = this.active.indexOf(obj);
    if (index !== -1) {
      this.active.splice(index, 1);
      this.resetFunc(obj);
      obj.setActive(false);
      obj.setVisible(false);
      this.pool.push(obj);
    }
  }
  clear() {
    this.active.forEach(obj => {
      if (obj.destroy) obj.destroy();
    });
    this.pool.forEach(obj => {
      if (obj.destroy) obj.destroy();
    });
    this.active = [];
    this.pool = [];
    this.totalCreated = 0;
  }
  recycleOldest() {
    const oldest = this.active.shift();
    if (!oldest) return null;
    oldest.setActive(false);
    oldest.setVisible(false);
    this.resetFunc(oldest);
    return oldest;
  }
  hasCapacityAvailable() {
    return this.active.length + this.pool.length < this.maxCapacity;
  }
  createManagedObject() {
    const obj = this.createFunc();
    this.totalCreated++;
    return obj;
  }
  reportCapacityWarning(message) {
    const now = Date.now();
    if (now - this.lastWarningTime < this.warningInterval) return;
    this.lastWarningTime = now;
    const details = `${message} (key: ${this.key || 'unknown'}, active: ${this.active.length}, pooled: ${this.pool.length}, created: ${this.totalCreated}, max: ${this.maxCapacity}).`;
    if (this.scene?.events) {
      this.scene.events.emit('pool-warning', {
        key: this.key,
        message: details,
        metrics: this.getMetrics()
      });
    }
    console.warn(details);
  }
  getMetrics() {
    return {
      created: this.totalCreated,
      active: this.active.length,
      pooled: this.pool.length,
      max: this.maxCapacity
    };
  }
}
const STORAGE_KEYS = {
  HIGH_SCORE: `dropkeeper_highscore`,
  ACHIEVEMENTS: `dropkeeper_achievements`,
  STATS: `dropkeeper_stats`,
  LEADERBOARD: `dropkeeper_leaderboard`,
  SKIN: `dropkeeper_skin`,
  AURA: `dropkeeper_aura`,
  CURRENCY: `dropkeeper_currency`,
  UPGRADES: `dropkeeper_upgrades`,
  CHALLENGES: `dropkeeper_challenges`,
  DIFFICULTY: `dropkeeper_difficulty`,
  OWNED_SKINS: `dropkeeper_owned_skins`,
  GEAR: `dropkeeper_gear`,
  EQUIPPED_GEAR: `dropkeeper_equipped_gear`,
  PLAYER_LEVEL: `dropkeeper_player_level`,
  PLAYER_XP: `dropkeeper_player_xp`,
  CATCH_EFFECT: `dropkeeper_catch_effect`,
  PLAYER_TRAIL: `dropkeeper_player_trail`,
  WEAPON_VISUAL: `dropkeeper_weapon_visual`,
  UI_THEME: `dropkeeper_ui_theme`,
  PLAY_COUNT: `dropkeeper_play_count`,
  PLAY_RESET_TIME: `dropkeeper_play_reset_time`,
  SCORE_SUBMISSIONS: `dropkeeper_score_submissions`
};
const COLORS = {
  PRIMARY: 0x0054e3,
  SECONDARY: 0x3c8dd9,
  ACCENT: 0x5eac24,
  GOLD: 0xffdd00,
  SUCCESS: 0x5eac24,
  DANGER: 0xd93c3c,
  BG: 0x3a6ea5,
  WINDOW_BLUE: 0x0054e3,
  WINDOW_TITLE: 0xffffff,
  BUTTON_FACE: 0xece9d8,
  BUTTON_LIGHT: 0xffffff,
  BUTTON_SHADOW: 0x808080
};
const CUSTOMIZATION_OPTIONS = {
  catchEffects: {
    default: {
      name: 'Default',
      tint: [0x00ffff, 0xff00ff],
      cost: 0
    },
    fire: {
      name: 'Fire Burst',
      tint: [0xff6600, 0xff0066],
      cost: 150
    },
    ice: {
      name: 'Ice Crystal',
      tint: [0x00ddff, 0x66ffff],
      cost: 150
    },
    electric: {
      name: 'Lightning',
      tint: [0xffff00, 0x00ffff],
      cost: 150
    },
    rainbow: {
      name: 'Rainbow',
      tint: [0xff0000, 0xff6600, 0xffff00, 0x00ff00, 0x00ffff, 0xff00ff],
      cost: 250
    },
    toxic: {
      name: 'Toxic',
      tint: [0x00ff00, 0x88ff00],
      cost: 200
    }
  },
  playerTrails: {
    default: {
      name: 'Default',
      type: 'smooth',
      tint: 0x00ff88,
      cost: 0
    },
    solid: {
      name: 'Solid Line',
      type: 'solid',
      tint: 0x00ffff,
      cost: 100
    },
    glitch: {
      name: 'Glitchy',
      type: 'glitch',
      tint: 0xff00ff,
      cost: 200
    },
    echo: {
      name: 'Echo',
      type: 'echo',
      tint: 0xffdd00,
      cost: 150
    },
    neon: {
      name: 'Neon',
      type: 'neon',
      tint: 0xff0066,
      cost: 180
    },
    stars: {
      name: 'Starfield',
      type: 'stars',
      tint: 0xffffff,
      cost: 220
    }
  },
  weaponVisuals: {
    default: {
      name: 'Default',
      bulletColor: 0x00ffff,
      netColor: 0xffdd00,
      cost: 0
    },
    fire: {
      name: 'Flame',
      bulletColor: 0xff6600,
      netColor: 0xff0066,
      cost: 120
    },
    ice: {
      name: 'Frost',
      bulletColor: 0x66ffff,
      netColor: 0x00ddff,
      cost: 120
    },
    plasma: {
      name: 'Plasma',
      bulletColor: 0xff00ff,
      netColor: 0xbb00ff,
      cost: 150
    },
    laser: {
      name: 'Laser',
      bulletColor: 0x00ff00,
      netColor: 0x88ff00,
      cost: 140
    },
    void: {
      name: 'Void',
      bulletColor: 0x660066,
      netColor: 0x330033,
      cost: 180
    }
  },
  uiThemes: {
    cyber: {
      name: 'Cyber',
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffdd00',
      cost: 0
    },
    fire: {
      name: 'Inferno',
      primary: '#ff6600',
      secondary: '#ff0066',
      accent: '#ffdd00',
      cost: 100
    },
    ice: {
      name: 'Frozen',
      primary: '#00ddff',
      secondary: '#66ffff',
      accent: '#ffffff',
      cost: 100
    },
    toxic: {
      name: 'Toxic',
      primary: '#00ff00',
      secondary: '#88ff00',
      accent: '#ffff00',
      cost: 120
    },
    dark: {
      name: 'Dark Mode',
      primary: '#666666',
      secondary: '#999999',
      accent: '#ffffff',
      cost: 80
    },
    gold: {
      name: 'Golden',
      primary: '#ffdd00',
      secondary: '#ff8800',
      accent: '#ffffff',
      cost: 150
    }
  }
};
class GlobalLeaderboard {
  static async submitScore(name, score, level, combo) {
    try {
      const StateClient = (await import('@devfunlabs/state-client')).StateClient;
      const client = new StateClient({
        baseURL: 'https://state.dev.fun',
        appId: 'faa6ba68b43144a937f0'
      });
      const id = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await client.createEntity('leaderboard', {
        id,
        name: name || 'PLAYER',
        score,
        level,
        combo,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Failed to submit score:', error);
      return false;
    }
  }
  static async getTopScores(limit = 50) {
    try {
      const StateClient = (await import('@devfunlabs/state-client')).StateClient;
      const client = new StateClient({
        baseURL: 'https://state.dev.fun',
        appId: 'faa6ba68b43144a937f0'
      });
      const scores = await client.getEntities('leaderboard');
      return scores.sort((a, b) => b.score - a.score).slice(0, limit).map(entry => ({
        name: entry.name,
        score: entry.score,
        level: entry.level,
        combo: entry.combo,
        timestamp: entry.timestamp
      }));
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }
}
class LevelingSystem {
  static getXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }
  static calculateXP(gameData) {
    const baseXP = Math.floor(gameData.score / 8);
    const comboBonus = Math.floor(gameData.maxCombo * 8);
    const levelBonus = gameData.level * 15;
    const goldBonus = gameData.goldCaught * 5;
    const timeBonus = Math.floor((gameData.gameTime || 0) / 8);
    const perfectBonus = gameData.itemsCaught > 0 && gameData.missedItems === 0 ? 100 : 0;
    const bombBonus = (gameData.bombsDestroyed || 0) * 7;
    return baseXP + comboBonus + levelBonus + goldBonus + timeBonus + perfectBonus + bombBonus;
  }
  static getLevelPerks(level) {
    const perks = [];
    if (level >= 3) perks.push({
      name: `Speed Boost I`,
      desc: `+5% movement speed`,
      type: `speed`,
      value: 0.05
    });
    if (level >= 5) perks.push({
      name: `XP Boost I`,
      desc: `+10% XP gained`,
      type: `xp`,
      value: 0.10
    });
    if (level >= 7) perks.push({
      name: `Lucky Strike I`,
      desc: `+5% currency drop`,
      type: `currency`,
      value: 0.05
    });
    if (level >= 10) perks.push({
      name: `Speed Boost II`,
      desc: `+10% movement speed`,
      type: `speed`,
      value: 0.05
    });
    if (level >= 12) perks.push({
      name: `Shield Mastery`,
      desc: `Shields last +1 hit`,
      type: `shield`,
      value: 1
    });
    if (level >= 15) perks.push({
      name: `XP Boost II`,
      desc: `+20% XP gained`,
      type: `xp`,
      value: 0.10
    });
    if (level >= 17) perks.push({
      name: `Lucky Strike II`,
      desc: `+10% currency drop`,
      type: `currency`,
      value: 0.05
    });
    if (level >= 20) perks.push({
      name: `Speed Boost III`,
      desc: `+15% movement speed`,
      type: `speed`,
      value: 0.05
    });
    if (level >= 22) perks.push({
      name: `Combo Expert`,
      desc: `+25% combo score`,
      type: `combo`,
      value: 0.25
    });
    if (level >= 25) perks.push({
      name: `Master Collector`,
      desc: `+15% to speed, currency & combo bonuses`,
      type: `master`,
      value: 0.15
    });
    if (level >= 30) perks.push({
      name: `Legendary Status`,
      desc: `+25% to all stats (speed, XP, currency, combo)`,
      type: `legendary`,
      value: 0.25
    });
    return perks;
  }
  static getLevelReward(level) {
    const rewards = {
      5: {
        type: 'currency',
        amount: 150,
        name: '150 Data Chips'
      },
      10: {
        type: 'currency',
        amount: 300,
        name: '300 Data Chips'
      },
      15: {
        type: 'currency',
        amount: 500,
        name: '500 Data Chips'
      },
      20: {
        type: 'currency',
        amount: 750,
        name: '750 Data Chips'
      },
      25: {
        type: 'currency',
        amount: 1000,
        name: '1000 Data Chips'
      },
      30: {
        type: 'currency',
        amount: 1500,
        name: '1500 Data Chips'
      },
      35: {
        type: 'currency',
        amount: 2000,
        name: '2000 Data Chips'
      },
      40: {
        type: 'currency',
        amount: 3000,
        name: '3000 Data Chips'
      },
      50: {
        type: 'currency',
        amount: 5000,
        name: '5000 Data Chips'
      }
    };
    return rewards[level] || null;
  }
  static getStatBonuses(level) {
    const perks = this.getLevelPerks(level);
    const bonuses = {
      speedMultiplier: 1,
      xpMultiplier: 1,
      currencyMultiplier: 1,
      shieldBonus: 0,
      comboMultiplier: 1
    };
    perks.forEach(perk => {
      if (perk.type === 'speed') bonuses.speedMultiplier += perk.value;
      if (perk.type === 'xp') bonuses.xpMultiplier += perk.value;
      if (perk.type === 'currency') bonuses.currencyMultiplier += perk.value;
      if (perk.type === 'shield') bonuses.shieldBonus += perk.value;
      if (perk.type === 'combo') bonuses.comboMultiplier += perk.value;
      if (perk.type === 'master') {
        bonuses.speedMultiplier += perk.value;
        bonuses.currencyMultiplier += perk.value;
        bonuses.comboMultiplier += perk.value;
      }
      if (perk.type === 'legendary') {
        bonuses.speedMultiplier += perk.value;
        bonuses.xpMultiplier += perk.value;
        bonuses.currencyMultiplier += perk.value;
        bonuses.comboMultiplier += perk.value;
      }
    });
    return bonuses;
  }
  static getRankTitle(level) {
    if (level >= 50) return {
      title: 'LEGEND',
      color: '#ff00ff'
    };
    if (level >= 40) return {
      title: 'MASTER',
      color: '#ffdd00'
    };
    if (level >= 30) return {
      title: 'EXPERT',
      color: '#ff6600'
    };
    if (level >= 20) return {
      title: 'VETERAN',
      color: '#00ffff'
    };
    if (level >= 10) return {
      title: 'SKILLED',
      color: '#00ff00'
    };
    return {
      title: 'ROOKIE',
      color: '#888888'
    };
  }
}
class PlayLimitManager {
  static CHMPSTR_CONTRACT = '0x3ca20831ebea5c99aa6e574d83f0a7c733f7e4d0';
  static COST_PER_PLAY = '100';
  static MAX_FREE_PLAYS = 2;
  static RESET_PERIOD = 24 * 60 * 60 * 1000;
  static checkAndResetPlays() {
    const resetTime = StorageManager.getInt(STORAGE_KEYS.PLAY_RESET_TIME, 0);
    const now = Date.now();
    if (now >= resetTime) {
      StorageManager.set(STORAGE_KEYS.PLAY_COUNT, 0);
      StorageManager.set(STORAGE_KEYS.SCORE_SUBMISSIONS, []);
      StorageManager.set(STORAGE_KEYS.PLAY_RESET_TIME, now + this.RESET_PERIOD);
    }
  }
  static getPlaysRemaining() {
    this.checkAndResetPlays();
    const playCount = StorageManager.getInt(STORAGE_KEYS.PLAY_COUNT, 0);
    return Math.max(0, this.MAX_FREE_PLAYS - playCount);
  }
  static canPlay() {
    return this.getPlaysRemaining() > 0;
  }
  static recordPlay() {
    this.checkAndResetPlays();
    const playCount = StorageManager.getInt(STORAGE_KEYS.PLAY_COUNT, 0);
    StorageManager.set(STORAGE_KEYS.PLAY_COUNT, playCount + 1);
  }
  static recordScoreSubmission(score) {
    const submissions = StorageManager.get(STORAGE_KEYS.SCORE_SUBMISSIONS, []);
    submissions.push({
      score,
      timestamp: Date.now()
    });
    StorageManager.set(STORAGE_KEYS.SCORE_SUBMISSIONS, submissions);
  }
  static getTimeUntilReset() {
    const resetTime = StorageManager.getInt(STORAGE_KEYS.PLAY_RESET_TIME, Date.now() + this.RESET_PERIOD);
    const now = Date.now();
    const diff = Math.max(0, resetTime - now);
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor(diff % (60 * 60 * 1000) / (60 * 1000));
    return {
      hours,
      minutes,
      totalMs: diff
    };
  }
  static async purchasePlay() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask to purchase plays');
    }
    try {
      const {
        ethers
      } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const erc20Abi = ['function transfer(address to, uint256 value) returns (bool)', 'function balanceOf(address owner) view returns (uint256)', 'function decimals() view returns (uint8)'];
      const contract = new ethers.Contract(this.CHMPSTR_CONTRACT, erc20Abi, signer);
      const decimals = await contract.decimals();
      const amount = ethers.parseUnits(this.COST_PER_PLAY, decimals);
      const burnAddress = '0x000000000000000000000000000000000000dEaD';
      const tx = await contract.transfer(burnAddress, amount);
      await tx.wait();
      const playCount = StorageManager.getInt(STORAGE_KEYS.PLAY_COUNT, 0);
      StorageManager.set(STORAGE_KEYS.PLAY_COUNT, Math.max(0, playCount - 1));
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }
}
class StorageManager {
  static get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      const jsonKeys = [`achievements`, `stats`, `upgrades`, `challenges`, `leaderboard`, `owned_skins`, `loadout_presets`, `score_submissions`];
      const shouldParseJSON = jsonKeys.some(jsonKey => key.includes(jsonKey));
      if (!value) {
        return defaultValue;
      }
      if (shouldParseJSON) {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          console.error(`JSON parse error for key (${key}):`, parseError);
          return defaultValue;
        }
      }
      return value;
    } catch (e) {
      console.error(`Storage error (${key}):`, e);
      return defaultValue;
    }
  }
  static getJson(key, defaultValue = {}) {
    try {
      const value = localStorage.getItem(key);
      if (!value) {
        return defaultValue;
      }
      try {
        return JSON.parse(value);
      } catch (parseError) {
        console.error(`JSON parse error for key (${key}):`, parseError);
        return defaultValue;
      }
    } catch (e) {
      console.error(`Storage error (${key}):`, e);
      return defaultValue;
    }
  }
  static set(key, value) {
    try {
      const stringValue = typeof value === `object` ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, stringValue);
    } catch (e) {
      console.error(`Storage error (${key}):`, e);
    }
  }
  static getInt(key, defaultValue = 0) {
    return parseInt(this.get(key, defaultValue));
  }
  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Storage error (${key}):`, e);
    }
  }
}
class TextureManager {
  constructor(scene) {
    this.scene = scene;
    this.textureCache = new Map();
    this.qualitySettings = {
      particles: 1.0,
      effects: 1.0
    };
  }
  createOptimizedTexture(key, size, drawFunc) {
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }
    const graphics = this.scene.make.graphics({
      x: 0,
      y: 0
    });
    drawFunc(graphics, size);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
    this.textureCache.set(key, key);
    return key;
  }
  setQualitySettings(settings) {
    this.qualitySettings = settings;
  }
  cleanup() {
    this.textureCache.clear();
  }
}
class BaseScene extends Phaser.Scene {
  constructor(config) {
    super(config);
    this.performanceManager = null;
    this.textureManager = null;
    this.objectPools = new Map();
  }
  create() {
    this.performanceManager = new PerformanceManager(this);
    this.textureManager = new TextureManager(this);
    this.game.events.on('quality-changed', this.onQualityChanged, this);
  }
  onQualityChanged(settings) {
    const defaultSettings = {
      particles: 1.0,
      effects: 1.0,
      shadows: true,
      grid: true
    };
    settings = settings || defaultSettings;
    if (this.textureManager?.setQualitySettings) {
      this.textureManager.setQualitySettings(settings);
    }
  }
  createOptimizedPool(key, createFunc, resetFunc, initialSize = 10, maxCapacity) {
    const pool = new ObjectPool(this, createFunc, resetFunc, initialSize, maxCapacity, key);
    this.objectPools.set(key, pool);
    return pool;
  }
  getPool(key) {
    if (!this.objectPools || !(this.objectPools instanceof Map)) {
      return null;
    }
    const pool = this.objectPools.get(key);
    if (!pool) {
      return null;
    }
    return pool;
  }
  createCyberpunkBackground() {
    const camera = this.cameras?.main;
    if (!camera) return;
    const {
      width,
      height
    } = camera;
    if (this.backgroundGraphics?.width === width && this.backgroundGraphics?.height === height) {
      return this.backgroundGraphics;
    }
    this.backgroundGraphics?.destroy();
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x5698d8, 0x5698d8, 0x3a6ea5, 0x3a6ea5, 1);
    graphics.fillRect(0, 0, width, height);
    const quality = this.performanceManager?.getQualitySettings();
    if (quality?.grid) {
      graphics.lineStyle(1, 0x00ffff, 0.08);
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        graphics.lineBetween(x, 0, x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        graphics.lineBetween(0, y, width, y);
      }
    }
    this.backgroundGraphics = graphics;
    this.backgroundGraphics.width = width;
    this.backgroundGraphics.height = height;
    return this.backgroundGraphics;
  }
  createButton(x, y, text, callback, fontSize = '24px') {
    const buttonBg = this.add.graphics();
    const w = 240;
    const h = 50;
    const drawBg = (hover = false, pressed = false) => {
      buttonBg.clear();
      buttonBg.fillStyle(hover ? 0x00ffff : 0x000000, hover ? 0.2 : 0.7);
      buttonBg.fillRect(x - w / 2, y - h / 2, w, h);
      buttonBg.lineStyle(2, hover ? 0xff00ff : 0x00ffff, 0.8);
      buttonBg.strokeRect(x - w / 2, y - h / 2, w, h);
    };
    drawBg();
    const button = this.add.text(x, y, text, {
      fontSize,
      color: `#00ffff`,
      stroke: `#ff00ff`,
      strokeThickness: 1
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    });
    button.on(`pointerover`, () => {
      button.setColor(`#ff00ff`).setStroke(`#00ffff`, 1).setScale(1.05);
      drawBg(true);
    });
    button.on(`pointerout`, () => {
      button.setColor(`#00ffff`).setStroke(`#ff00ff`, 1).setScale(1);
      drawBg(false);
    });
    button.on(`pointerdown`, () => {
      this.game.sounds?.click?.();
      callback();
    });
    return {
      bg: buttonBg,
      text: button
    };
  }
  update(time, delta) {
    this.performanceManager?.update?.(time);
  }
  destroy() {
    this.textureManager?.cleanup();
    this.objectPools?.forEach(pool => pool?.clear?.());
    this.objectPools?.clear();
    this.backgroundGraphics?.destroy();
    this.bgGraphicsCache?.destroy();
    this.game?.events?.off('quality-changed', this.onQualityChanged, this);
    this.input?.keyboard?.removeAllListeners();
    this.textureManager = null;
    this.objectPools = null;
    this.backgroundGraphics = null;
    this.bgGraphicsCache = null;
    super.destroy();
  }
}
class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene"
    });
    this.sounds = {};
  }
  preload() {
    const logoImageUrl = `https://cdn.dev.fun/asset/faa6ba68b43144a937f0/ChatGPT Image Nov 13, 2025, 07_21_41 AM_d087118f.png`;
    this.load.image('loading_logo', `https://proxy.dev.fun?url=${encodeURIComponent(logoImageUrl)}`);
    const menuBgUrl = `https://cdn.dev.fun/asset/faa6ba68b43144a937f0/Screenshot 2025-11-13 at 2.54.40 PM_66f6db68.png`;
    this.load.image('menu_background', `https://proxy.dev.fun?url=${encodeURIComponent(menuBgUrl)}`);
    this.createSounds();
    const playerImageUrl = `https://cdn.dev.fun/asset/faa6ba68b43144a937f0/Untitled_Artwork 5_3f43f229.png`;
    this.load.image('player_default', `https://proxy.dev.fun?url=${encodeURIComponent(playerImageUrl)}`);
    this.load.on('complete', () => {
      this.createSpecialItemTextures();
      this.createTextures();
    });
  }
  createTextures() {
    const playerSkins = [{
      name: 'default',
      colors: [COLORS.PRIMARY, 0x0099ff]
    }, {
      name: 'fire',
      colors: [COLORS.ACCENT, 0xff3399]
    }, {
      name: 'ice',
      colors: [0x00ddff, 0x66ffff]
    }, {
      name: 'gold',
      colors: [COLORS.GOLD, 0xffff66]
    }, {
      name: 'purple',
      colors: [COLORS.SECONDARY, 0xcc66ff]
    }];
    playerSkins.forEach(skin => {
      if (skin.name === 'default') return;
      const g = this.make.graphics({
        x: 0,
        y: 0
      });
      g.fillStyle(skin.colors[0], 0.8).fillRect(0, 0, 60, 20);
      g.lineStyle(2, skin.colors[1], 1).strokeRect(0, 0, 60, 20);
      g.generateTexture(`player_${skin.name}`, 60, 20);
      g.destroy();
    });
    const createSimpleItem = (size, color, textureName) => {
      const graphics = this.make.graphics({
        x: 0,
        y: 0
      });
      graphics.fillStyle(color, 0.8);
      graphics.fillRect(0, 0, size, size);
      graphics.lineStyle(1, 0xffffff, 0.6);
      graphics.strokeRect(0, 0, size, size);
      graphics.generateTexture(textureName, size, size);
      graphics.destroy();
    };
    createSimpleItem(30, 0x00ffff, `item_regular`);
    createSimpleItem(30, 0xcccccc, `item_silver`);
    createSimpleItem(30, 0xffdd00, `item_gold`);
    createSimpleItem(60, 0xff00ff, `item_giant`);
    const bombGraphics = this.make.graphics({
      x: 0,
      y: 0
    });
    bombGraphics.fillStyle(0xff0066, 0.8);
    bombGraphics.fillCircle(15, 15, 12);
    bombGraphics.lineStyle(2, 0xff0000, 1);
    bombGraphics.strokeCircle(15, 15, 12);
    bombGraphics.generateTexture(`item_bomb`, 30, 30);
    bombGraphics.destroy();
    const particleGraphics = this.make.graphics({
      x: 0,
      y: 0
    });
    particleGraphics.fillStyle(0xffffff, 1);
    particleGraphics.fillCircle(4, 4, 4);
    particleGraphics.generateTexture(`particle`, 8, 8);
    particleGraphics.destroy();
    const powerupGraphics = this.make.graphics({
      x: 0,
      y: 0
    });
    powerupGraphics.fillStyle(0x00ffff, 0.8);
    powerupGraphics.fillCircle(20, 20, 15);
    powerupGraphics.lineStyle(2, 0xffdd00, 1);
    powerupGraphics.strokeCircle(20, 20, 15);
    powerupGraphics.generateTexture(`powerup`, 40, 40);
    powerupGraphics.destroy();
    const createPowerupVariant = (color, name) => {
      const g = this.make.graphics({
        x: 0,
        y: 0
      });
      g.fillStyle(color, 0.8);
      g.fillCircle(20, 20, 15);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeCircle(20, 20, 15);
      g.generateTexture(name, 40, 40);
      g.destroy();
    };
    createPowerupVariant(0x00ffff, `powerup_timewarp`);
    createPowerupVariant(0xffdd00, `powerup_converter`);
    createPowerupVariant(0xff00ff, `powerup_hyperdash`);
    createPowerupVariant(0x9900ff, `powerup_gravity`);
    createPowerupVariant(0x000000, `powerup_blackhole`);
    const bulletGraphics = this.make.graphics({
      x: 0,
      y: 0
    });
    bulletGraphics.fillStyle(0x00ffff, 1);
    bulletGraphics.fillRect(3, 0, 4, 12);
    bulletGraphics.generateTexture(`bullet`, 10, 12);
    bulletGraphics.destroy();
    const netGraphics = this.make.graphics({
      x: 0,
      y: 0
    });
    netGraphics.lineStyle(2, 0xffdd00, 1);
    netGraphics.strokeCircle(20, 20, 18);
    netGraphics.fillStyle(0xffdd00, 0.2);
    netGraphics.fillCircle(20, 20, 18);
    netGraphics.generateTexture(`net`, 40, 40);
    netGraphics.destroy();
  }
  createSpecialItemTextures() {
    const createSpecialItem = (color, name) => {
      const graphics = this.make.graphics({
        x: 0,
        y: 0
      });
      graphics.fillStyle(color, 0.8);
      graphics.fillCircle(15, 15, 12);
      graphics.lineStyle(2, 0xffffff, 1);
      graphics.strokeCircle(15, 15, 12);
      graphics.generateTexture(name, 30, 30);
      graphics.destroy();
    };
    createSpecialItem(0x00ddff, `item_freeze`);
    createSpecialItem(0xff0066, `item_health`);
    createSpecialItem(0xff00ff, `item_mystery`);
    createSpecialItem(0xff00ff, `item_glitch`);
    createSpecialItem(0x00ff00, `item_multiplier`);
    createSpecialItem(0x660066, `item_virus`);
    const spikeGraphics = this.make.graphics({
      x: 0,
      y: 0
    });
    spikeGraphics.fillStyle(0xff0066, 0.8);
    spikeGraphics.fillTriangle(15, 0, 0, 30, 30, 30);
    spikeGraphics.generateTexture(`spike`, 30, 30);
    spikeGraphics.destroy();
  }
  createSounds() {
    let audioContext;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Audio context not available');
      audioContext = null;
    }
    const createSound = (freq, type = 'sine', duration = 0.1) => {
      return () => {
        if (!audioContext) return;
        try {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = type;
          gain.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + duration);
        } catch (e) {}
      };
    };
    this.sounds.catch = createSound(800);
    this.sounds.miss = createSound(200, 'sawtooth', 0.2);
    this.sounds.powerup = createSound(1200, 'square', 0.15);
    this.sounds.shoot = createSound(1000, 'square', 0.05);
    this.sounds.click = createSound(600);
    this.game.sounds = this.sounds;
  }
  create() {
    const {
      width,
      height
    } = this.cameras.main;
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1A1A28);
    bg.setOrigin(0.5);
    const logo = this.add.image(width / 2, height / 2, 'loading_logo');
    logo.setOrigin(0.5);
    logo.setScale(0.8);
    this.tweens.add({
      targets: logo,
      scale: {
        from: 0.475,
        to: 0.525
      },
      alpha: {
        from: 0.8,
        to: 1
      },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.time.delayedCall(1500, () => {
      this.scene.start(`MenuScene`);
    });
    this.scale.on('resize', gameSize => {
      const width = gameSize.width;
      const height = gameSize.height;
      if (this.cameras && this.cameras.main) {
        this.cameras.main.setSize(width, height);
      }
    });
  }
}
class MenuScene extends BaseScene {
  constructor() {
    super({
      key: "MenuScene"
    });
  }
  create() {
    super.create();
    this.initializeData();
    PlayLimitManager.checkAndResetPlays();
    const {
      width
    } = this.cameras.main;
    this.gameModeModal = null;
    this.bgGraphics = this.add.graphics();
    this.createCyberpunkBackground();
    this.staticOverlay = this.add.graphics();
    this.staticOverlay.setDepth(5);
    this.createStaticSweep();
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    this.particles = this.add.particles(0, 0, `particle`, {
      x: {
        min: 0,
        max: this.cameras.main.width
      },
      y: {
        min: 0,
        max: this.cameras.main.height
      },
      speedY: {
        min: 20,
        max: 50
      },
      scale: {
        start: 0.4 * quality.particles,
        end: 0
      },
      alpha: {
        start: 0.6 * quality.particles,
        end: 0
      },
      lifespan: 3000,
      frequency: Math.floor(150 / quality.particles),
      tint: [0x00ffff, 0xff00ff, 0xff0066]
    });
    this.titleGlow = this.add.text(0, 0, `CHMPSTR DRP`, {
      fontSize: `56px`,
      color: `#000080`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    }).setOrigin(0.5).setAlpha(0.3);
    this.title = this.add.text(0, 0, `CHMPSTR DRP`, {
      fontSize: `56px`,
      color: `#000080`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.tweens.add({
      targets: this.titleGlow,
      alpha: {
        from: 0.3,
        to: 0.5
      },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    this.titlePulseTween = this.tweens.add({
      targets: this.title,
      scale: {
        from: 1,
        to: 1.02
      },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.subtitle = this.add.text(0, 0, `Catch the falling chaos`, {
      fontSize: `20px`,
      color: `#000000`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.createPlayerAvatar();
    this.startMenuOpen = false;
    this.startMenuContainer = null;
    this.createStartButton();
    const highScore = StorageManager.getInt(STORAGE_KEYS.HIGH_SCORE);
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const playerLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const rankInfo = LevelingSystem.getRankTitle(playerLevel);
    this.statsBox = this.add.graphics();
    this.highScoreText = this.add.text(0, 0, `HIGH SCORE: ${highScore}`, {
      fontSize: `16px`,
      color: `#000000`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.currencyText = this.add.text(width / 2, 80, `💎 DATA CHIPS: ${currency}`, {
      fontSize: `16px`,
      color: `#000000`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    const playsRemaining = PlayLimitManager.getPlaysRemaining();
    const playLimitBox = this.add.graphics();
    playLimitBox.fillStyle(COLORS.BUTTON_FACE, 1);
    playLimitBox.fillRect(20, 20, 200, 60);
    playLimitBox.lineStyle(2, COLORS.BUTTON_LIGHT, 1);
    playLimitBox.lineBetween(20, 20, 220, 20);
    playLimitBox.lineBetween(20, 20, 20, 80);
    playLimitBox.lineStyle(2, COLORS.BUTTON_SHADOW, 1);
    playLimitBox.lineBetween(220, 20, 220, 80);
    playLimitBox.lineBetween(20, 80, 220, 80);
    this.playLimitText = this.add.text(30, 30, `PLAYS TODAY: ${playsRemaining}/2`, {
      fontSize: `16px`,
      color: playsRemaining > 0 ? `#008000` : `#800000`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    });
    if (playsRemaining === 0) {
      const resetInfo = PlayLimitManager.getTimeUntilReset();
      this.resetTimerText = this.add.text(30, 52, `Reset: ${resetInfo.hours}h ${resetInfo.minutes}m`, {
        fontSize: `12px`,
        color: `#ffdd00`
      });
      this.time.addEvent({
        delay: 60000,
        callback: () => {
          const info = PlayLimitManager.getTimeUntilReset();
          if (this.resetTimerText) {
            this.resetTimerText.setText(`Reset: ${info.hours}h ${info.minutes}m`);
          }
          if (PlayLimitManager.getPlaysRemaining() > 0) {
            this.scene.restart();
          }
        },
        loop: true
      });
    } else {
      this.add.text(30, 52, `Free score submissions`, {
        fontSize: `12px`,
        color: `#888888`
      });
    }
    this.playerLevelText = this.add.text(0, 0, `LEVEL ${playerLevel}`, {
      fontSize: `18px`,
      color: `#000080`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.rankText = this.add.text(0, 0, `${rankInfo.title}`, {
      fontSize: `14px`,
      color: `#000000`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    this.xpBar = this.add.graphics();
    this.xpBarBg = this.add.graphics();
    this.repositionUI();
    this.scale.on('resize', () => {
      this.repositionUI();
      if (this.startMenuContainer) {
        this.closeStartMenu();
      }
    }, this);
    this.fpsText = this.add.text(10, 10, 'FPS: 60', {
      fontSize: '14px',
      color: '#ffffff'
    });
  }
  update(time, delta) {
    super.update(time, delta);
    if (this.performanceManager && this.fpsText) {
      this.fpsText.setText(`FPS: ${this.performanceManager.fps} Q: ${this.performanceManager.qualityLevel}`);
    }
  }
  createPlayerAvatar() {
    if (this.avatarAura && this.avatarAura.active) {
      this.avatarAura.destroy();
      this.avatarAura = null;
    }
    const {
      width,
      height
    } = this.cameras.main;
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    const currentAura = StorageManager.get(STORAGE_KEYS.AURA, `none`);
    const avatarContainer = this.add.container(width / 2, height / 2 - 50);
    avatarContainer.setDepth(10);
    const holoBase = this.add.graphics();
    holoBase.lineStyle(2, 0x00ffff, 0.4);
    holoBase.strokeCircle(0, 0, 60);
    holoBase.lineStyle(1, 0xff00ff, 0.3);
    holoBase.strokeCircle(0, 0, 55);
    avatarContainer.add(holoBase);
    this.avatarGlow = this.add.circle(0, 0, 70, 0x00ffff, 0);
    this.avatarGlow.setBlendMode(Phaser.BlendModes.ADD);
    avatarContainer.add(this.avatarGlow);
    this.playerAvatar = this.add.sprite(0, 0, `player_${currentSkin}`);
    this.playerAvatar.setScale(0.6);
    avatarContainer.add(this.playerAvatar);
    this.avatarIdleTween = this.tweens.add({
      targets: this.playerAvatar,
      y: {
        from: -5,
        to: 5
      },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    if (currentAura !== `none`) {
      const quality = this.performanceManager && this.performanceManager.getQualitySettings ? this.performanceManager.getQualitySettings() : {
        particles: 1.0
      };
      const auraConfigs = {
        flame: {
          tint: [0xff0066, 0xff6600],
          frequency: Math.floor(30 / quality.particles)
        },
        frost: {
          tint: [0x00ddff, 0x66ffff],
          frequency: Math.floor(40 / quality.particles)
        },
        electric: {
          tint: [0xffff00, 0x00ffff],
          frequency: Math.floor(20 / quality.particles)
        }
      };
      if (auraConfigs[currentAura]) {
        const config = auraConfigs[currentAura];
        this.avatarAura = this.add.particles(width / 2, height / 2 - 20, `particle`, {
          scale: {
            start: 0.4 * quality.particles,
            end: 0
          },
          speed: {
            min: 20,
            to: 60
          },
          lifespan: 500,
          blendMode: Phaser.BlendModes.ADD,
          tint: config.tint,
          frequency: config.frequency,
          alpha: {
            start: 0.8 * quality.particles,
            end: 0
          }
        });
        this.avatarAura.setDepth(9);
        this.avatarAuraConfig = config;
      }
    }
    const skinNameBg = this.add.graphics();
    skinNameBg.fillStyle(0x00ffff, 0.15);
    skinNameBg.fillRoundedRect(-60, 68, 120, 28, 6);
    skinNameBg.lineStyle(2, 0x00ffff, 0.6);
    skinNameBg.strokeRoundedRect(-60, 68, 120, 28, 6);
    avatarContainer.add(skinNameBg);
    const avatarLabel = this.add.text(0, 82, `${currentSkin.toUpperCase()}`, {
      fontSize: `16px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    avatarContainer.add(avatarLabel);
    this.tweens.add({
      targets: skinNameBg,
      alpha: {
        from: 1,
        to: 0.7
      },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });
    if (currentAura !== `none`) {
      const auraLabel = this.add.text(0, 104, `[${currentAura.toUpperCase()} AURA]`, {
        fontSize: `12px`,
        color: `#ff00ff`,
        fontStyle: `italic`
      }).setOrigin(0.5);
      avatarContainer.add(auraLabel);
    }
    this.avatarContainer = avatarContainer;
  }
  createStaticSweep() {
    this.time.addEvent({
      delay: Phaser.Math.Between(5000, 8000),
      callback: () => {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.staticOverlay.clear();
        const sweepY = Phaser.Math.Between(0, height);
        const sweepHeight = Phaser.Math.Between(5, 15);
        this.staticOverlay.fillStyle(0xffffff, 0.1);
        this.staticOverlay.fillRect(0, sweepY, width, sweepHeight);
        for (let i = 0; i < 10; i++) {
          const x = Phaser.Math.Between(0, width);
          const y = Phaser.Math.Between(sweepY - 50, sweepY + 50);
          const w = Phaser.Math.Between(2, 8);
          const h = Phaser.Math.Between(1, 3);
          this.staticOverlay.fillStyle(0x00ffff, Phaser.Math.FloatBetween(0.1, 0.3));
          this.staticOverlay.fillRect(x, y, w, h);
        }
        this.tweens.add({
          targets: this.staticOverlay,
          alpha: {
            from: 1,
            to: 0
          },
          duration: 300,
          onComplete: () => {
            this.staticOverlay.clear();
            this.createStaticSweep();
          }
        });
      },
      loop: false
    });
  }
  createSubtleBackgroundAnimations() {
    if (!this.cameras || !this.cameras.main) {
      return;
    }
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(0, width);
      const startY = Phaser.Math.Between(-height, 0);
      const stream = this.add.graphics();
      stream.lineStyle(1, 0x00ffff, 0.1 * quality.particles);
      stream.lineBetween(0, 0, 0, Phaser.Math.Between(40, 100));
      stream.setPosition(x, startY);
      stream.setDepth(-1);
      this.tweens.add({
        targets: stream,
        y: height + 100,
        duration: Phaser.Math.Between(8000, 15000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
        onRepeat: () => {
          stream.x = Phaser.Math.Between(0, width);
          stream.y = -100;
        }
      });
    }
    for (let i = 0; i < 5; i++) {
      const debris = this.add.graphics();
      debris.fillStyle(0xff00ff, 0.08 * quality.particles);
      debris.fillRect(0, 0, Phaser.Math.Between(3, 8), Phaser.Math.Between(3, 8));
      debris.setPosition(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height));
      debris.setDepth(-1);
      this.tweens.add({
        targets: debris,
        x: `+=${Phaser.Math.Between(-100, 100)}`,
        y: `+=${Phaser.Math.Between(50, 150)}`,
        alpha: {
          from: 0.08,
          to: 0
        },
        duration: Phaser.Math.Between(10000, 20000),
        repeat: -1,
        yoyo: true
      });
    }
  }
  createStartButton() {
    const height = this.cameras.main.height;
    const buttonWidth = 120;
    const buttonHeight = 45;
    this.startButtonBg = this.add.graphics();
    this.startButtonBg.setDepth(1000);
    this.drawStartButton(10, height - buttonHeight - 10, buttonWidth, buttonHeight, false);
    this.startButtonText = this.add.text(10 + buttonWidth / 2, height - buttonHeight / 2 - 10, `Start`, {
      fontSize: `22px`,
      color: `#ffffff`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(1001);
    const windowsLogo = this.add.graphics();
    windowsLogo.setDepth(1001);
    const logoX = 25;
    const logoY = height - buttonHeight / 2 - 10;
    windowsLogo.fillStyle(0xff0000, 1);
    windowsLogo.fillRect(logoX - 8, logoY - 8, 7, 7);
    windowsLogo.fillStyle(0x00ff00, 1);
    windowsLogo.fillRect(logoX + 1, logoY - 8, 7, 7);
    windowsLogo.fillStyle(0x0000ff, 1);
    windowsLogo.fillRect(logoX - 8, logoY + 1, 7, 7);
    windowsLogo.fillStyle(0xffff00, 1);
    windowsLogo.fillRect(logoX + 1, logoY + 1, 7, 7);
    this.startButtonText.x = logoX + 25;
    const hitArea = this.add.rectangle(10, height - buttonHeight - 10, buttonWidth, buttonHeight, 0x000000, 0);
    hitArea.setOrigin(0);
    hitArea.setInteractive({
      useHandCursor: true
    });
    hitArea.setDepth(1001);
    hitArea.on('pointerover', () => {
      this.drawStartButton(10, height - buttonHeight - 10, buttonWidth, buttonHeight, true);
    });
    hitArea.on('pointerout', () => {
      if (!this.startMenuOpen) {
        this.drawStartButton(10, height - buttonHeight - 10, buttonWidth, buttonHeight, false);
      }
    });
    hitArea.on('pointerdown', () => {
      if (this.startMenuOpen) {
        this.closeStartMenu();
      } else {
        this.openStartMenu();
      }
    });
    this.startButton = hitArea;
  }
  drawStartButton(x, y, w, h, hover) {
    this.startButtonBg.clear();
    if (hover || this.startMenuOpen) {
      this.startButtonBg.fillStyle(0x316ac5, 1);
    } else {
      this.startButtonBg.fillGradientStyle(0x3c8dd9, 0x3c8dd9, 0x0054e3, 0x0054e3, 1);
    }
    this.startButtonBg.fillRoundedRect(x, y, w, h, 3);
    this.startButtonBg.lineStyle(1, 0x000000, 0.3);
    this.startButtonBg.strokeRoundedRect(x, y, w, h, 3);
    if (!hover && !this.startMenuOpen) {
      this.startButtonBg.lineStyle(1, COLORS.BUTTON_LIGHT, 0.5);
      this.startButtonBg.lineBetween(x + 2, y + 2, x + w - 2, y + 2);
      this.startButtonBg.lineBetween(x + 2, y + 2, x + 2, y + h - 2);
    }
  }
  openStartMenu() {
    this.startMenuOpen = true;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.drawStartButton(10, height - 55, 120, 45, false);
    this.startMenuContainer = this.add.container(0, 0);
    this.startMenuContainer.setDepth(2000);
    const menuWidth = 260;
    const menuHeight = 360;
    const menuX = 10;
    const menuY = height - 55 - menuHeight;
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0xd4d0c8, 1);
    menuBg.fillRect(menuX, menuY, menuWidth, menuHeight);
    menuBg.lineStyle(2, COLORS.BUTTON_LIGHT, 1);
    menuBg.lineBetween(menuX, menuY, menuX + menuWidth, menuY);
    menuBg.lineBetween(menuX, menuY, menuX, menuY + menuHeight);
    menuBg.lineStyle(2, COLORS.BUTTON_SHADOW, 1);
    menuBg.lineBetween(menuX + menuWidth, menuY, menuX + menuWidth, menuY + menuHeight);
    menuBg.lineBetween(menuX, menuY + menuHeight, menuX + menuWidth, menuY + menuHeight);
    this.startMenuContainer.add(menuBg);
    const headerBg = this.add.graphics();
    headerBg.fillGradientStyle(0x0054e3, 0x3c8dd9, 0x0054e3, 0x3c8dd9, 1);
    headerBg.fillRect(menuX, menuY, 55, menuHeight);
    this.startMenuContainer.add(headerBg);
    const userText = this.add.text(menuX + 8, menuY + menuHeight - 25, `Player`, {
      fontSize: `15px`,
      color: `#ffffff`,
      fontStyle: `bold`,
      fontFamily: 'Arial'
    }).setOrigin(0, 0.5).setAngle(-90);
    this.startMenuContainer.add(userText);
    const menuItems = [{
      text: `PLAY`,
      icon: `▶`,
      callback: () => {
        this.closeStartMenu();
        if (!PlayLimitManager.canPlay()) {
          this.showPurchaseModal();
        } else {
          this.showGameModeModal();
        }
      }
    }, {
      text: `PLAYER HUB`,
      icon: `👤`,
      callback: () => {
        this.closeStartMenu();
        this.scene.start(`PlayerHubScene`);
      }
    }, {
      text: `MARKET`,
      icon: `🛒`,
      callback: () => {
        this.closeStartMenu();
        this.scene.start(`MarketScene`);
      }
    }, {
      text: `TUTORIAL`,
      icon: `📖`,
      callback: () => {
        this.closeStartMenu();
        this.scene.start(`TutorialScene`);
      }
    }, {
      text: `SETTINGS`,
      icon: `⚙`,
      callback: () => {
        this.closeStartMenu();
        this.scene.start(`SettingsScene`);
      }
    }];
    let itemY = menuY + 15;
    const itemHeight = 50;
    menuItems.forEach((item, index) => {
      const itemBg = this.add.graphics();
      this.startMenuContainer.add(itemBg);
      const itemText = this.add.text(menuX + 90, itemY + itemHeight / 2, item.text, {
        fontSize: `15px`,
        color: `#000000`,
        fontFamily: 'Arial',
        fontStyle: `bold`
      }).setOrigin(0, 0.5);
      this.startMenuContainer.add(itemText);
      const icon = this.add.text(menuX + 68, itemY + itemHeight / 2, item.icon, {
        fontSize: `18px`
      }).setOrigin(0.5);
      this.startMenuContainer.add(icon);
      const hitArea = this.add.rectangle(menuX + 55, itemY, menuWidth - 55, itemHeight, 0x000000, 0);
      hitArea.setOrigin(0);
      hitArea.setInteractive({
        useHandCursor: true
      });
      this.startMenuContainer.add(hitArea);
      hitArea.on('pointerover', () => {
        itemBg.clear();
        itemBg.fillStyle(0x316ac5, 1);
        itemBg.fillRect(menuX + 55, itemY, menuWidth - 55, itemHeight);
        itemText.setColor(`#ffffff`);
      });
      hitArea.on('pointerout', () => {
        itemBg.clear();
        itemText.setColor(`#000000`);
      });
      hitArea.on('pointerdown', () => {
        if (this.game.sounds?.click) this.game.sounds.click();
        item.callback();
      });
      itemY += itemHeight;
    });
    const separatorY = menuY + menuHeight - 45;
    const separator = this.add.graphics();
    separator.lineStyle(1, COLORS.BUTTON_SHADOW, 1);
    separator.lineBetween(menuX + 55, separatorY, menuX + menuWidth - 5, separatorY);
    this.startMenuContainer.add(separator);
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    overlay.setOrigin(0);
    overlay.setInteractive();
    overlay.setDepth(1999);
    overlay.on('pointerdown', () => {
      this.closeStartMenu();
    });
    this.startMenuContainer.add(overlay);
    this.startMenuContainer.sendToBack(overlay);
  }
  closeStartMenu() {
    if (this.startMenuContainer) {
      this.startMenuContainer.destroy();
      this.startMenuContainer = null;
    }
    this.startMenuOpen = false;
    const height = this.cameras.main.height;
    this.drawStartButton(10, height - 55, 120, 45, false);
  }
  repositionUI() {
    if (!this.cameras || !this.cameras.main) return;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (this.startButton) {
      this.startButton.destroy();
      this.startButtonBg.destroy();
      this.startButtonText.destroy();
      this.createStartButton();
    }
    if (!this.backgroundAnimationsCreated) {
      this.createSubtleBackgroundAnimations();
      this.backgroundAnimationsCreated = true;
    }
    if (this.backgroundGraphics) {
      if (this.backgroundGraphics.width !== width || this.backgroundGraphics.height !== height) {
        this.createCyberpunkBackground();
      }
    } else {
      this.createCyberpunkBackground();
    }
    if (!this.particles) return;
    this.particles.setConfig({
      x: {
        min: 0,
        max: width
      },
      y: {
        min: 0,
        max: height
      }
    });
    this.titleGlow.setPosition(width / 2, 60);
    this.title.setPosition(width / 2, 60);
    this.subtitle.setPosition(width / 2, 110);
    const avatarCenterY = height / 2 - 50;
    if (this.avatarContainer) {
      this.avatarContainer.setPosition(width / 2, avatarCenterY);
    }
    if (this.avatarAura) {
      this.avatarAura.setPosition(width / 2, avatarCenterY);
    }
    const playerLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const playerXP = StorageManager.getInt(STORAGE_KEYS.PLAYER_XP, 0);
    const xpForNextLevel = LevelingSystem.getXPForLevel(playerLevel + 1);
    const xpProgress = playerXP / xpForNextLevel;
    const rankInfo = LevelingSystem.getRankTitle(playerLevel);
    const statsBoxY = avatarCenterY + 130;
    const statsBoxWidth = 420;
    this.statsBox.clear();
    this.statsBox.fillStyle(0xd4d0c8, 1);
    this.statsBox.fillRect(width / 2 - statsBoxWidth / 2, statsBoxY, statsBoxWidth, 120);
    this.statsBox.lineStyle(2, COLORS.BUTTON_LIGHT, 1);
    this.statsBox.lineBetween(width / 2 - statsBoxWidth / 2, statsBoxY, width / 2 + statsBoxWidth / 2, statsBoxY);
    this.statsBox.lineBetween(width / 2 - statsBoxWidth / 2, statsBoxY, width / 2 - statsBoxWidth / 2, statsBoxY + 120);
    this.statsBox.lineStyle(2, COLORS.BUTTON_SHADOW, 1);
    this.statsBox.lineBetween(width / 2 + statsBoxWidth / 2, statsBoxY, width / 2 + statsBoxWidth / 2, statsBoxY + 120);
    this.statsBox.lineBetween(width / 2 - statsBoxWidth / 2, statsBoxY + 120, width / 2 + statsBoxWidth / 2, statsBoxY + 120);
    this.playerLevelText.setPosition(width / 2, statsBoxY + 18);
    this.playerLevelText.setFontSize('20px');
    this.rankText.setPosition(width / 2, statsBoxY + 40);
    this.rankText.setText(`[${rankInfo.title}]`);
    this.rankText.setColor(rankInfo.color);
    const xpBarWidth = 340;
    const xpBarX = width / 2 - xpBarWidth / 2;
    const xpBarY = statsBoxY + 60;
    this.xpBarBg.clear();
    this.xpBarBg.fillStyle(0xffffff, 1);
    this.xpBarBg.fillRect(xpBarX, xpBarY, xpBarWidth, 14);
    this.xpBarBg.lineStyle(1, 0x808080, 1);
    this.xpBarBg.strokeRect(xpBarX, xpBarY, xpBarWidth, 14);
    this.xpBar.clear();
    this.xpBar.fillGradientStyle(0x0054e3, 0x0054e3, 0x3c8dd9, 0x3c8dd9, 1);
    this.xpBar.fillRect(xpBarX + 2, xpBarY + 2, Math.max(0, (xpBarWidth - 4) * xpProgress), 10);
    if (!this.xpBarAnimated) {
      this.tweens.add({
        targets: this.xpBar,
        alpha: {
          from: 0.9,
          to: 1
        },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
      this.xpBarAnimated = true;
    }
    this.highScoreText.setPosition(width / 2, statsBoxY + 85);
    this.currencyText.setPosition(width / 2, statsBoxY + 105);
  }
  initializeData() {
    this.backgroundAnimationsCreated = false;
    this.xpBarAnimated = false;
    const defaultAchievements = {
      combo_master: {
        unlocked: false,
        name: `Combo Master`,
        desc: `Reach 10x combo`
      },
      speed_demon: {
        unlocked: false,
        name: `Speed Demon`,
        desc: `Reach level 10`
      },
      survivor: {
        unlocked: false,
        name: `Survivor`,
        desc: `Score 1000 points`
      },
      gold_collector: {
        unlocked: false,
        name: `Gold Collector`,
        desc: `Catch 50 gold items`
      },
      untouchable: {
        unlocked: false,
        name: `Untouchable`,
        desc: `Catch 20 items without missing`
      }
    };
    const defaultUpgrades = {
      moveSpeed: 0,
      dashCooldown: 0,
      fireRate: 0,
      extraLife: false,
      startShield: false
    };
    const defaultChallenges = {
      daily: {
        type: `gold_collector`,
        target: 50,
        progress: 0,
        reward: 100,
        lastReset: Date.now()
      },
      weekly: {
        type: `level_master`,
        target: 10,
        progress: 0,
        reward: 500,
        lastReset: Date.now()
      }
    };
    if (!StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS)) {
      StorageManager.set(STORAGE_KEYS.ACHIEVEMENTS, defaultAchievements);
    }
    if (!StorageManager.get(STORAGE_KEYS.LEADERBOARD)) {
      StorageManager.set(STORAGE_KEYS.LEADERBOARD, []);
    }
    if (!StorageManager.get(STORAGE_KEYS.CURRENCY)) {
      StorageManager.set(STORAGE_KEYS.CURRENCY, 0);
    }
    if (!StorageManager.get(STORAGE_KEYS.UPGRADES)) {
      StorageManager.set(STORAGE_KEYS.UPGRADES, defaultUpgrades);
    }
    if (!StorageManager.get(STORAGE_KEYS.CHALLENGES)) {
      StorageManager.set(STORAGE_KEYS.CHALLENGES, defaultChallenges);
    }
    if (!StorageManager.get(STORAGE_KEYS.PLAYER_LEVEL)) {
      StorageManager.set(STORAGE_KEYS.PLAYER_LEVEL, 1);
    }
    if (!StorageManager.get(STORAGE_KEYS.PLAYER_XP)) {
      StorageManager.set(STORAGE_KEYS.PLAYER_XP, 0);
    }
  }
  createButton(x, y, text, callback, index = 0) {
    const buttonBg = this.add.graphics();
    const buttonGlitch = this.add.graphics();
    const buttonText = this.add.text(x, y, `${text}`, {
      fontSize: `24px`,
      color: `#00ffff`,
      stroke: `#ff00ff`,
      strokeThickness: 1
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    }).setAlpha(0.7);
    const buttonContainer = {
      bg: buttonBg,
      glitch: buttonGlitch,
      text: buttonText,
      index: index,
      reposition: (newX, newY, btnWidth = 200) => {
        buttonText.setPosition(newX, newY);
        const halfWidth = btnWidth / 2;
        buttonBg.clear();
        buttonBg.fillStyle(0x000000, 0.3);
        buttonBg.fillRect(newX - halfWidth, newY - 22, btnWidth, 44);
        buttonBg.lineStyle(2, 0x00ffff, 0.4);
        buttonBg.strokeRect(newX - halfWidth, newY - 22, btnWidth, 44);
        buttonBg.lineStyle(1, 0xff00ff, 0.2);
        buttonBg.strokeRect(newX - halfWidth + 2, newY - 20, btnWidth - 4, 40);
      }
    };
    buttonText.on(`pointerover`, () => {
      this.onButtonHover(index);
      if (this.game.sounds?.click) this.game.sounds.click();
      const hoverColors = ['#ffffff', '#ffdd00', '#ff00ff', '#00ff00', '#ff6600', '#66ffff'];
      const strokeColors = ['#00ffff', '#ff0066', '#ffdd00', '#00ffff', '#ff00ff', '#00ffff'];
      buttonText.setColor(hoverColors[index % hoverColors.length]);
      buttonText.setStroke(strokeColors[index % strokeColors.length], 2);
      buttonText.setScale(1.05);
      buttonText.setAlpha(1);
      const halfWidth = 100;
      buttonBg.clear();
      buttonBg.fillStyle(0x00ffff, 0.15);
      buttonBg.fillRect(buttonText.x - halfWidth, buttonText.y - 22, halfWidth * 2, 44);
      buttonBg.lineStyle(2, 0x00ffff, 1);
      buttonBg.strokeRect(buttonText.x - halfWidth, buttonText.y - 22, halfWidth * 2, 44);
      buttonBg.lineStyle(1, 0xffffff, 0.6);
      buttonBg.strokeRect(buttonText.x - halfWidth + 2, buttonText.y - 20, halfWidth * 2 - 4, 40);
      const quality = this.performanceManager?.getQualitySettings() || {
        effects: 1.0
      };
      if (quality.effects > 0.5) {
        const glitchColors = [0xff00ff, 0x00ffff, 0xffdd00, 0xff0066];
        const glitchColor = glitchColors[index % glitchColors.length];
        const glitchEffect = this.time.addEvent({
          delay: 150,
          callback: () => {
            buttonGlitch.clear();
            if (Math.random() > 0.7) {
              const offset = Phaser.Math.Between(-2, 2);
              buttonGlitch.fillStyle(glitchColor, 0.25);
              buttonGlitch.fillRect(buttonText.x - halfWidth + offset, buttonText.y - 22, halfWidth * 2, 44);
              if (Math.random() > 0.8) {
                const lineY = buttonText.y + Phaser.Math.Between(-15, 15);
                buttonGlitch.fillRect(buttonText.x - halfWidth, lineY, halfWidth * 2, 2);
              }
            }
          },
          repeat: 4
        });
        buttonText.once(`pointerout`, () => {
          glitchEffect.destroy();
          buttonGlitch.clear();
          this.onButtonOut();
        });
      }
    });
    buttonText.on(`pointerout`, () => {
      buttonText.setColor(`#00ffff`);
      buttonText.setStroke(`#ff00ff`, 1);
      buttonText.setScale(1);
      buttonText.setAlpha(0.7);
      const halfWidth = 100;
      buttonBg.clear();
      buttonBg.fillStyle(0x000000, 0.3);
      buttonBg.fillRect(buttonText.x - halfWidth, buttonText.y - 22, halfWidth * 2, 44);
      buttonBg.lineStyle(2, 0x00ffff, 0.4);
      buttonBg.strokeRect(buttonText.x - halfWidth, buttonText.y - 22, halfWidth * 2, 44);
      buttonBg.lineStyle(1, 0xff00ff, 0.2);
      buttonBg.strokeRect(buttonText.x - halfWidth + 2, buttonText.y - 20, halfWidth * 2 - 4, 40);
      buttonGlitch.clear();
      this.onButtonOut();
    });
    buttonText.on(`pointerdown`, () => {
      this.createRippleEffect(buttonText.x, buttonText.y, index);
      this.tweens.add({
        targets: buttonText,
        scale: 0.95,
        duration: 100,
        yoyo: true
      });
      callback();
    });
    return buttonContainer;
  }
  onButtonHover(buttonIndex) {
    if (this.avatarGlow) {
      const glowColors = [0x00ffff, 0xff00ff, 0xffdd00, 0xff0066, 0x00ff00, 0xff6600];
      this.avatarGlow.setFillStyle(glowColors[buttonIndex % glowColors.length], 1);
      this.tweens.add({
        targets: this.avatarGlow,
        alpha: 0.5,
        radius: 80,
        duration: 200
      });
    }
    if (this.avatarAura && this.avatarAura.active && this.avatarAuraConfig) {
      const quality = this.performanceManager?.getQualitySettings() || {
        particles: 1.0
      };
      const tintColors = [[0x00ffff, 0xff00ff], [0xff0066, 0xffdd00], [0x00ff00, 0x00ffff], [0xff6600, 0xffdd00], [0xff00ff, 0x9900ff], [0x00ffff, 0x66ffff]];
      this.avatarAura.setConfig({
        frequency: Math.floor(10 / quality.particles),
        scale: {
          start: 0.8 * quality.particles,
          end: 0
        },
        tint: tintColors[buttonIndex % tintColors.length],
        speed: {
          min: 40,
          max: 100
        }
      });
    }
    this.titlePulseTween.timeScale = 3;
    const gridPulse = buttonIndex % 3;
    if (gridPulse === 0 && this.backgroundGraphics) {
      this.tweens.add({
        targets: this.backgroundGraphics,
        alpha: 0.3,
        duration: 150,
        yoyo: true
      });
    }
    this.createTitleReaction(buttonIndex);
  }
  showPurchaseModal() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const modal = this.add.container(0, 0);
    modal.setDepth(3000);
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9);
    overlay.setOrigin(0);
    overlay.setInteractive();
    modal.add(overlay);
    const modalWidth = 600;
    const modalHeight = 400;
    const modalX = width / 2 - modalWidth / 2;
    const modalY = height / 2 - modalHeight / 2;
    const modalBox = this.add.graphics();
    modalBox.fillStyle(0x000000, 0.95);
    modalBox.fillRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(3, 0xff0066, 0.9);
    modalBox.strokeRect(modalX, modalY, modalWidth, modalHeight);
    modal.add(modalBox);
    const title = this.add.text(width / 2, modalY + 40, `PLAY LIMIT REACHED`, {
      fontSize: `32px`,
      color: `#ff0066`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    modal.add(title);
    const resetInfo = PlayLimitManager.getTimeUntilReset();
    const infoText = this.add.text(width / 2, modalY + 100, `You've used your 2 free plays for today.\n\nReset in: ${resetInfo.hours}h ${resetInfo.minutes}m\n\nPurchase additional play with $CHMPSTR tokens:`, {
      fontSize: `18px`,
      color: `#ffffff`,
      align: `center`,
      lineSpacing: 8
    }).setOrigin(0.5);
    modal.add(infoText);
    const priceBox = this.add.graphics();
    priceBox.fillStyle(0x220033, 0.8);
    priceBox.fillRect(width / 2 - 150, modalY + 180, 300, 60);
    priceBox.lineStyle(2, 0xffdd00, 0.8);
    priceBox.strokeRect(width / 2 - 150, modalY + 180, 300, 60);
    modal.add(priceBox);
    const priceText = this.add.text(width / 2, modalY + 210, `100 $CHMPSTR\n(Ethereum Network)`, {
      fontSize: `20px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      align: `center`
    }).setOrigin(0.5);
    modal.add(priceText);
    const purchaseBtn = this.add.text(width / 2, modalY + 280, `PURCHASE PLAY`, {
      fontSize: `24px`,
      color: `#ffffff`,
      backgroundColor: `#00ff00`,
      padding: {
        x: 30,
        y: 12
      }
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    });
    modal.add(purchaseBtn);
    const statusText = this.add.text(width / 2, modalY + 330, ``, {
      fontSize: `14px`,
      color: `#ffdd00`,
      align: `center`
    }).setOrigin(0.5);
    modal.add(statusText);
    purchaseBtn.on(`pointerover`, () => {
      purchaseBtn.setScale(1.05);
      purchaseBtn.setStyle({
        backgroundColor: `#00dd00`
      });
    });
    purchaseBtn.on(`pointerout`, () => {
      purchaseBtn.setScale(1);
      purchaseBtn.setStyle({
        backgroundColor: `#00ff00`
      });
    });
    purchaseBtn.on(`pointerdown`, async () => {
      purchaseBtn.disableInteractive();
      statusText.setText(`Processing transaction...\nPlease confirm in MetaMask`);
      try {
        await PlayLimitManager.purchasePlay();
        statusText.setText(`✓ Purchase successful!\nYou can now play!`);
        statusText.setColor(`#00ff00`);
        this.time.delayedCall(1500, () => {
          modal.destroy();
          this.scene.restart();
        });
      } catch (error) {
        statusText.setText(`❌ Purchase failed: ${error.message}`);
        statusText.setColor(`#ff0066`);
        purchaseBtn.setInteractive();
      }
    });
    const closeBtn = this.add.text(width / 2, modalY + modalHeight - 30, `CLOSE`, {
      fontSize: `18px`,
      color: `#888888`,
      backgroundColor: `#222222`,
      padding: {
        x: 20,
        y: 8
      }
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    });
    modal.add(closeBtn);
    closeBtn.on(`pointerover`, () => closeBtn.setColor(`#ffffff`));
    closeBtn.on(`pointerout`, () => closeBtn.setColor(`#888888`));
    closeBtn.on(`pointerdown`, () => modal.destroy());
    this.purchaseModal = modal;
  }
  showUnlockedGameModeModal() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.gameModeModal = this.add.container(0, 0);
    this.gameModeModal.setDepth(2000);
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    overlay.setOrigin(0);
    overlay.setInteractive();
    this.gameModeModal.add(overlay);
    const modesLocked = false;
    const modalWidth = 680;
    const modalHeight = modesLocked ? 660 : 560;
    const modalX = width / 2 - modalWidth / 2;
    const modalY = height / 2 - modalHeight / 2;
    const modalBox = this.add.graphics();
    modalBox.fillStyle(0x000000, 0.95);
    modalBox.fillRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(3, 0x00ffff, 0.9);
    modalBox.strokeRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(1, 0xff00ff, 0.4);
    modalBox.strokeRect(modalX + 3, modalY + 3, modalWidth - 6, modalHeight - 6);
    this.gameModeModal.add(modalBox);
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x00ffff, 0.12);
    headerBg.fillRect(modalX, modalY, modalWidth, 65);
    headerBg.lineStyle(1, 0x00ffff, 0.3);
    headerBg.lineBetween(modalX, modalY + 65, modalX + modalWidth, modalY + 65);
    this.gameModeModal.add(headerBg);
    const modalTitle = this.add.text(width / 2, modalY + 32, `SELECT GAME MODE`, {
      fontSize: `32px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    }).setOrigin(0.5);
    this.gameModeModal.add(modalTitle);
    const modeData = [{
      name: `NORMAL MODE`,
      desc: `Classic gameplay with lives and progression\nCatch items, avoid bombs, level up!`,
      color: 0x00ffff,
      locked: false,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`GameScene`);
      }
    }, {
      name: `TIME ATTACK`,
      desc: `Score as much as possible in 60 seconds\nNo lives - pure speed and skill!`,
      color: 0xffdd00,
      locked: modesLocked,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`TimeAttackScene`);
      }
    }, {
      name: `SURVIVAL`,
      desc: `Infinite lives but difficulty increases rapidly\nHow long can you last?`,
      color: 0xff00ff,
      locked: modesLocked,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`SurvivalScene`);
      }
    }, {
      name: `PRECISION MODE`,
      desc: `Smaller catch area, 2x score multiplier\nPerfect timing required!`,
      color: 0xff0066,
      locked: modesLocked,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`PrecisionScene`);
      }
    }];
    let yPos = modalY + 90;
    const cardWidth = modalWidth - 60;
    const cardHeight = 95;
    const cardSpacing = 10;
    modeData.forEach((mode, index) => {
      const cardY = yPos + index * (cardHeight + cardSpacing);
      const modeBox = this.add.graphics();
      const hoverBox = this.add.graphics();
      const isLocked = mode.locked;
      const drawCard = isHover => {
        modeBox.clear();
        hoverBox.clear();
        const bgOpacity = isLocked ? 0.3 : isHover ? 0.8 : 0.6;
        const borderColor = isLocked ? 0x555555 : mode.color;
        const borderOpacity = isLocked ? 0.3 : isHover ? 0.9 : 0.5;
        modeBox.fillStyle(0x0a0a1a, bgOpacity);
        modeBox.fillRect(leftPanelX + 10, yPos, boxWidth, itemHeight);
        modeBox.fillRect(modalX + 30, cardY, cardWidth, cardHeight);
        modeBox.lineStyle(2, borderColor, borderOpacity);
        modeBox.strokeRect(leftPanelX + 10, yPos, boxWidth, itemHeight);
        if (isHover && !isLocked) {
          hoverBox.fillStyle(mode.color, 0.08);
          hoverBox.fillRect(leftPanelX + 10, yPos, boxWidth, itemHeight);
          modeBox.lineStyle(1, 0xffffff, 0.3);
          modeBox.strokeRect(leftPanelX + 12, yPos + 2, boxWidth - 4, itemHeight - 4);
        }
      };
      drawCard(false);
      this.gameModeModal.add(modeBox);
      this.gameModeModal.add(hoverBox);
      const colorHex = `#${mode.color.toString(16).padStart(6, '0')}`;
      const nameColor = isLocked ? `#555555` : colorHex;
      const nameText = this.add.text(width / 2, cardY + 20, mode.name, {
        fontSize: `18px`,
        color: nameColor,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 2
      }).setOrigin(0.5);
      this.gameModeModal.add(nameText);
      if (isLocked) {
        const lockIcon = this.add.text(width / 2 + 150, cardY + 20, `🔒`, {
          fontSize: `18px`
        }).setOrigin(0.5);
        this.gameModeModal.add(lockIcon);
      }
      const descColor = isLocked ? `#555555` : `#bbbbbb`;
      const descText = this.add.text(width / 2, cardY + 46, isLocked ? `COMING SOON - 12/1/2025` : mode.desc, {
        fontSize: `14px`,
        color: descColor,
        align: `center`,
        lineSpacing: 2,
        fontStyle: isLocked ? `italic` : `normal`
      }).setOrigin(0.5);
      this.gameModeModal.add(descText);
      const playButton = this.add.text(width / 2, cardY + 72, isLocked ? `LOCKED` : `▶ PLAY`, {
        fontSize: `15px`,
        color: isLocked ? `#444444` : `#ffffff`,
        backgroundColor: isLocked ? `#1a1a1a` : `#000000`,
        padding: {
          x: 24,
          y: 5
        }
      }).setOrigin(0.5);
      this.gameModeModal.add(playButton);
      const cardInteractiveArea = this.add.zone(modalX + 30, cardY, cardWidth, cardHeight).setOrigin(0).setInteractive({
        useHandCursor: !isLocked
      });
      this.gameModeModal.add(cardInteractiveArea);
      if (!isLocked) {
        cardInteractiveArea.on(`pointerover`, () => {
          playButton.setColor(colorHex);
          playButton.setStyle({
            backgroundColor: mode.color.toString(16).padStart(6, '0')
          });
          playButton.setScale(1.08);
          drawCard(true);
          nameText.setScale(1.03);
        });
        cardInteractiveArea.on(`pointerout`, () => {
          playButton.setColor(`#ffffff`);
          playButton.setStyle({
            backgroundColor: `#000000`
          });
          playButton.setScale(1);
          drawCard(false);
          nameText.setScale(1);
        });
        cardInteractiveArea.on(`pointerdown`, () => {
          if (this.game.sounds?.click) this.game.sounds.click();
          this.cameras.main.flash(100, ...this.hexToRgb(mode.color));
          PlayLimitManager.recordPlay();
          mode.callback();
        });
      }
    });
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.4);
    footerBg.fillRect(modalX, modalY + modalHeight - 65, modalWidth, 65);
    footerBg.lineStyle(1, 0x00ffff, 0.2);
    footerBg.lineBetween(modalX, modalY + modalHeight - 65, modalX + modalWidth, modalY + modalHeight - 65);
    this.gameModeModal.add(footerBg);
    const closeButton = this.add.text(width / 2, modalY + modalHeight - 32, `← BACK`, {
      fontSize: `20px`,
      color: `#888888`,
      backgroundColor: `#1a1a1a`,
      padding: {
        x: 32,
        y: 8
      }
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    });
    this.gameModeModal.add(closeButton);
    closeButton.on(`pointerover`, () => {
      closeButton.setColor(`#ff0066`);
      closeButton.setScale(1.05);
    });
    closeButton.on(`pointerout`, () => {
      closeButton.setColor(`#888888`);
      closeButton.setScale(1);
    });
    closeButton.on(`pointerdown`, () => {
      if (this.game.sounds?.click) this.game.sounds.click();
      this.closeGameModeModal();
    });
    this.tweens.add({
      targets: this.gameModeModal,
      alpha: {
        from: 0,
        to: 1
      },
      duration: 200,
      ease: 'Power2'
    });
  }
  showGameModeModal() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.gameModeModal = this.add.container(0, 0);
    this.gameModeModal.setDepth(2000);
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    overlay.setOrigin(0);
    overlay.setInteractive();
    this.gameModeModal.add(overlay);
    const RELEASE_DATE = new Date('2025-12-01T00:00:00');
    const currentDate = new Date();
    const isBeforeRelease = currentDate < RELEASE_DATE;
    const modesLocked = isBeforeRelease;
    const modalWidth = 680;
    const modalHeight = modesLocked ? 660 : 560;
    const modalX = width / 2 - modalWidth / 2;
    const modalY = height / 2 - modalHeight / 2;
    const modalBox = this.add.graphics();
    modalBox.fillStyle(0x000000, 0.95);
    modalBox.fillRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(3, 0x00ffff, 0.9);
    modalBox.strokeRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(1, 0xff00ff, 0.4);
    modalBox.strokeRect(modalX + 3, modalY + 3, modalWidth - 6, modalHeight - 6);
    this.gameModeModal.add(modalBox);
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x00ffff, 0.12);
    headerBg.fillRect(modalX, modalY, modalWidth, 65);
    headerBg.lineStyle(1, 0x00ffff, 0.3);
    headerBg.lineBetween(modalX, modalY + 65, modalX + modalWidth, modalY + 65);
    this.gameModeModal.add(headerBg);
    const modalTitle = this.add.text(width / 2, modalY + 32, `SELECT GAME MODE`, {
      fontSize: `32px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    }).setOrigin(0.5);
    this.gameModeModal.add(modalTitle);
    const modeData = [{
      name: `NORMAL MODE`,
      desc: `Classic gameplay with lives and progression\nCatch items, avoid bombs, level up!`,
      color: 0x00ffff,
      locked: false,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`GameScene`);
      }
    }, {
      name: `TIME ATTACK`,
      desc: `Score as much as possible in 60 seconds\nNo lives - pure speed and skill!`,
      color: 0xffdd00,
      locked: modesLocked,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`TimeAttackScene`);
      }
    }, {
      name: `SURVIVAL`,
      desc: `Infinite lives but difficulty increases rapidly\nHow long can you last?`,
      color: 0xff00ff,
      locked: modesLocked,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`SurvivalScene`);
      }
    }, {
      name: `PRECISION MODE`,
      desc: `Smaller catch area, 2x score multiplier\nPerfect timing required!`,
      color: 0xff0066,
      locked: modesLocked,
      callback: () => {
        this.closeGameModeModal();
        this.scene.start(`PrecisionScene`);
      }
    }];
    let yPos = modalY + 90;
    const cardWidth = modalWidth - 60;
    const cardHeight = 95;
    const cardSpacing = 10;
    modeData.forEach((mode, index) => {
      const cardY = yPos + index * (cardHeight + cardSpacing);
      const modeBox = this.add.graphics();
      const hoverBox = this.add.graphics();
      const isLocked = mode.locked;
      const drawCard = isHover => {
        modeBox.clear();
        hoverBox.clear();
        const bgOpacity = isLocked ? 0.3 : isHover ? 0.8 : 0.6;
        const borderColor = isLocked ? 0x555555 : mode.color;
        const borderOpacity = isLocked ? 0.3 : isHover ? 0.9 : 0.5;
        modeBox.fillStyle(0x0a0a1a, bgOpacity);
        modeBox.fillRect(modalX + 30, cardY, cardWidth, cardHeight);
        modeBox.lineStyle(2, borderColor, borderOpacity);
        modeBox.strokeRect(modalX + 30, cardY, cardWidth, cardHeight);
        if (isHover && !isLocked) {
          hoverBox.fillStyle(mode.color, 0.08);
          hoverBox.fillRect(modalX + 30, cardY, cardWidth, cardHeight);
          modeBox.lineStyle(1, 0xffffff, 0.3);
          modeBox.strokeRect(modalX + 32, cardY + 2, cardWidth - 4, cardHeight - 4);
        }
      };
      drawCard(false);
      this.gameModeModal.add(modeBox);
      this.gameModeModal.add(hoverBox);
      const colorHex = `#${mode.color.toString(16).padStart(6, '0')}`;
      const nameColor = isLocked ? `#555555` : colorHex;
      const nameText = this.add.text(width / 2, cardY + 20, mode.name, {
        fontSize: `18px`,
        color: nameColor,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 2
      }).setOrigin(0.5);
      this.gameModeModal.add(nameText);
      if (isLocked) {
        const lockIcon = this.add.text(width / 2 + 150, cardY + 20, `🔒`, {
          fontSize: `18px`
        }).setOrigin(0.5);
        this.gameModeModal.add(lockIcon);
      }
      const descColor = isLocked ? `#555555` : `#bbbbbb`;
      const descText = this.add.text(width / 2, cardY + 46, isLocked ? `COMING SOON - 12/1/2025` : mode.desc, {
        fontSize: `14px`,
        color: descColor,
        align: `center`,
        lineSpacing: 2,
        fontStyle: isLocked ? `italic` : `normal`
      }).setOrigin(0.5);
      this.gameModeModal.add(descText);
      const playButton = this.add.text(width / 2, cardY + 72, isLocked ? `LOCKED` : `▶ PLAY`, {
        fontSize: `15px`,
        color: isLocked ? `#444444` : `#ffffff`,
        backgroundColor: isLocked ? `#1a1a1a` : `#000000`,
        padding: {
          x: 24,
          y: 5
        }
      }).setOrigin(0.5);
      this.gameModeModal.add(playButton);
      const cardInteractiveArea = this.add.zone(modalX + 30, cardY, cardWidth, cardHeight).setOrigin(0).setInteractive({
        useHandCursor: !isLocked
      });
      this.gameModeModal.add(cardInteractiveArea);
      if (!isLocked) {
        cardInteractiveArea.on(`pointerover`, () => {
          playButton.setColor(colorHex);
          playButton.setStyle({
            backgroundColor: mode.color.toString(16).padStart(6, '0')
          });
          playButton.setScale(1.08);
          drawCard(true);
          nameText.setScale(1.03);
        });
        cardInteractiveArea.on(`pointerout`, () => {
          playButton.setColor(`#ffffff`);
          playButton.setStyle({
            backgroundColor: `#000000`
          });
          playButton.setScale(1);
          drawCard(false);
          nameText.setScale(1);
        });
        cardInteractiveArea.on(`pointerdown`, () => {
          if (this.game.sounds?.click) this.game.sounds.click();
          this.cameras.main.flash(100, ...this.hexToRgb(mode.color));
          PlayLimitManager.recordPlay();
          mode.callback();
        });
      }
    });
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.4);
    footerBg.fillRect(modalX, modalY + modalHeight - (modesLocked ? 165 : 65), modalWidth, modesLocked ? 165 : 65);
    footerBg.lineStyle(1, 0x00ffff, 0.2);
    footerBg.lineBetween(modalX, modalY + modalHeight - (modesLocked ? 165 : 65), modalX + modalWidth, modalY + modalHeight - (modesLocked ? 165 : 65));
    this.gameModeModal.add(footerBg);
    if (modesLocked) {
      const passwordLabel = this.add.text(width / 2, modalY + modalHeight - 135, `Early Access Password:`, {
        fontSize: `16px`,
        color: `#ffdd00`,
        fontStyle: `bold`
      }).setOrigin(0.5);
      this.gameModeModal.add(passwordLabel);
      const passwordInputBg = this.add.graphics();
      passwordInputBg.fillStyle(0x000000, 0.9);
      passwordInputBg.fillRect(width / 2 - 150, modalY + modalHeight - 115, 300, 35);
      passwordInputBg.lineStyle(2, 0x00ffff, 0.6);
      passwordInputBg.strokeRect(width / 2 - 150, modalY + modalHeight - 115, 300, 35);
      this.gameModeModal.add(passwordInputBg);
      let passwordValue = '';
      const passwordDisplay = this.add.text(width / 2, modalY + modalHeight - 97, `Enter password...`, {
        fontSize: `16px`,
        color: `#888888`,
        fontStyle: `italic`
      }).setOrigin(0.5);
      this.gameModeModal.add(passwordDisplay);
      const errorText = this.add.text(width / 2, modalY + modalHeight - 70, ``, {
        fontSize: `14px`,
        color: `#ff0066`
      }).setOrigin(0.5);
      this.gameModeModal.add(errorText);
      const passwordHandler = event => {
        if (event.key === 'Enter') {
          if (passwordValue === 'CHMPSTRDRP') {
            this.input.keyboard.off('keydown', passwordHandler);
            this.cameras.main.flash(200, 0, 255, 0);
            errorText.setText(`✓ ACCESS GRANTED!`);
            errorText.setColor(`#00ff00`);
            this.time.delayedCall(800, () => {
              this.closeGameModeModal();
              this.showUnlockedGameModeModal();
            });
          } else {
            errorText.setText(`❌ INCORRECT PASSWORD`);
            this.tweens.add({
              targets: [passwordInputBg, passwordDisplay],
              x: `+=${10}`,
              duration: 50,
              yoyo: true,
              repeat: 3
            });
          }
        } else if (event.key === 'Backspace') {
          passwordValue = passwordValue.slice(0, -1);
          passwordDisplay.setText(passwordValue || 'Enter password...');
          passwordDisplay.setColor(passwordValue ? `#ffffff` : `#888888`);
          passwordDisplay.setStyle({
            fontStyle: passwordValue ? `normal` : `italic`
          });
          errorText.setText('');
        } else if (event.key.length === 1 && passwordValue.length < 20) {
          passwordValue += event.key;
          passwordDisplay.setText(passwordValue);
          passwordDisplay.setColor(`#ffffff`);
          passwordDisplay.setStyle({
            fontStyle: `normal`
          });
          errorText.setText('');
        }
      };
      this.input.keyboard.on('keydown', passwordHandler);
      this.gameModeModal.once('destroy', () => {
        this.input.keyboard.off('keydown', passwordHandler);
      });
    }
    const closeButton = this.add.text(width / 2, modalY + modalHeight - 32, `← BACK`, {
      fontSize: `20px`,
      color: `#888888`,
      backgroundColor: `#1a1a1a`,
      padding: {
        x: 32,
        y: 8
      }
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    });
    this.gameModeModal.add(closeButton);
    closeButton.on(`pointerover`, () => {
      closeButton.setColor(`#ff0066`);
      closeButton.setScale(1.05);
    });
    closeButton.on(`pointerout`, () => {
      closeButton.setColor(`#888888`);
      closeButton.setScale(1);
    });
    closeButton.on(`pointerdown`, () => {
      if (this.game.sounds?.click) this.game.sounds.click();
      this.closeGameModeModal();
    });
    this.tweens.add({
      targets: this.gameModeModal,
      alpha: {
        from: 0,
        to: 1
      },
      duration: 200,
      ease: 'Power2'
    });
  }
  hexToRgb(color) {
    const r = color >> 16 & 0xFF;
    const g = color >> 8 & 0xFF;
    const b = color & 0xFF;
    return [r, g, b];
  }
  closeGameModeModal() {
    if (this.gameModeModal) {
      this.gameModeModal.destroy();
      this.gameModeModal = null;
    }
    if (this.input && this.input.keyboard) {
      this.input.keyboard.removeAllListeners('keydown');
    }
  }
  onButtonOut() {
    if (this.playerAvatar) {
      this.tweens.killTweensOf(this.playerAvatar);
      if (this.avatarIdleTween && this.avatarIdleTween.isPlaying && this.avatarIdleTween.isPlaying()) {
        this.avatarIdleTween.stop();
        this.avatarIdleTween = null;
      }
      this.tweens.add({
        targets: this.playerAvatar,
        scale: 0.6,
        scaleX: 0.6,
        scaleY: 0.6,
        y: 0,
        rotation: 0,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.avatarIdleTween = this.tweens.add({
            targets: this.playerAvatar,
            y: {
              from: -5,
              to: 5
            },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });
    }
    if (this.avatarGlow) {
      this.tweens.add({
        targets: this.avatarGlow,
        alpha: 0,
        radius: 70,
        duration: 300
      });
    }
    if (this.avatarAura && this.avatarAuraConfig) {
      const quality = this.performanceManager?.getQualitySettings() || {
        particles: 1.0
      };
      this.avatarAura.setConfig({
        frequency: this.avatarAuraConfig.frequency,
        scale: {
          start: 0.4 * quality.particles,
          end: 0
        },
        tint: this.avatarAuraConfig.tint,
        speed: {
          min: 20,
          max: 60
        }
      });
    }
    if (this.titlePulseTween) {
      this.titlePulseTween.timeScale = 1;
    }
  }
  createRippleEffect(x, y, buttonIndex) {
    const rippleColors = [0x00ffff, 0xff00ff, 0xffdd00, 0xff0066, 0x00ff00, 0xff6600];
    const rippleColor = rippleColors[buttonIndex % rippleColors.length];
    for (let i = 0; i < 3; i++) {
      const ripple = this.add.circle(x, y, 10, rippleColor, 0.5 - i * 0.15);
      ripple.setBlendMode(Phaser.BlendModes.ADD);
      ripple.setDepth(5);
      this.tweens.add({
        targets: ripple,
        scale: 15 + i * 3,
        alpha: 0,
        duration: 800 + i * 200,
        ease: 'Cubic.easeOut',
        delay: i * 100,
        onComplete: () => ripple.destroy()
      });
    }
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0,
      effects: 1.0
    };
    if (quality.effects > 0.5) {
      const burstEmitter = this.add.particles(x, y, 'particle', {
        speed: {
          min: 100,
          max: 300
        },
        scale: {
          start: 0.6 * quality.particles,
          end: 0
        },
        blendMode: Phaser.BlendModes.ADD,
        lifespan: 600,
        tint: rippleColor,
        emitting: false,
        angle: {
          min: 0,
          max: 360
        }
      });
      burstEmitter.explode(Math.floor(20 * quality.particles));
      this.time.delayedCall(800, () => burstEmitter.destroy());
    }
    this.cameras.main.shake(100, 0.003);
    if (this.backgroundGraphics) {
      this.tweens.add({
        targets: this.backgroundGraphics,
        alpha: 0.25,
        duration: 150,
        yoyo: true,
        repeat: 1
      });
    }
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const scanlineEffect = this.add.graphics();
    scanlineEffect.setDepth(6);
    const scanY = Phaser.Math.Between(0, height);
    scanlineEffect.fillStyle(rippleColor, 0.3);
    scanlineEffect.fillRect(0, scanY, width, 3);
    this.tweens.add({
      targets: scanlineEffect,
      alpha: 0,
      duration: 300,
      onComplete: () => scanlineEffect.destroy()
    });
  }
  createTitleGlitch() {
    const quality = this.performanceManager?.getQualitySettings() || {
      effects: 1.0
    };
    if (quality.effects < 0.5) return;
    const originalX = this.title.x;
    const originalY = this.title.y;
    this.tweens.add({
      targets: this.title,
      x: originalX + Phaser.Math.Between(-5, 5),
      y: originalY + Phaser.Math.Between(-2, 2),
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.title.setPosition(originalX, originalY);
      }
    });
    const glitchColors = ['#00ffff', '#ff00ff', '#ffffff'];
    let glitchCount = 0;
    const glitchInterval = this.time.addEvent({
      delay: 50,
      callback: () => {
        this.title.setColor(glitchColors[glitchCount % glitchColors.length]);
        glitchCount++;
        if (glitchCount >= 6) {
          this.title.setColor('#00ffff');
          glitchInterval.destroy();
        }
      },
      repeat: 5
    });
  }
  createTitleReaction(buttonIndex) {
    const quality = this.performanceManager?.getQualitySettings() || {
      effects: 1.0
    };
    if (quality.effects < 0.5) return;
    const reactions = [() => {
      this.tweens.add({
        targets: [this.title, this.titleGlow],
        scaleX: 1.05,
        duration: 150,
        yoyo: true
      });
    }, () => {
      const originalY = this.title.y;
      this.tweens.add({
        targets: [this.title, this.titleGlow],
        y: originalY - 5,
        duration: 200,
        ease: 'Back.easeOut',
        yoyo: true
      });
    }, () => {
      this.tweens.add({
        targets: [this.title, this.titleGlow],
        rotation: 0.05,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }, () => {
      const colors = ['#00ffff', '#ff00ff', '#ffdd00'];
      this.title.setColor(colors[buttonIndex % colors.length]);
      this.time.delayedCall(200, () => this.title.setColor('#00ffff'));
    }, () => {
      this.tweens.add({
        targets: this.title,
        scaleY: 1.08,
        duration: 100,
        yoyo: true,
        repeat: 1
      });
    }, () => {
      this.tweens.add({
        targets: [this.title, this.titleGlow],
        alpha: 0.7,
        duration: 100,
        yoyo: true
      });
    }];
    const reactionIndex = buttonIndex % reactions.length;
    reactions[reactionIndex]();
  }
  onQualityChanged(settings) {
    super.onQualityChanged(settings);
    if (this.particles && this.particles.active) {
      this.particles.setConfig({
        frequency: Math.floor(150 / settings.particles),
        scale: {
          start: 0.4 * settings.particles,
          end: 0
        },
        alpha: {
          start: 0.6 * settings.particles,
          end: 0
        }
      });
    }
    if (this.avatarAura && this.avatarAura.active) {
      this.avatarAura.setConfig({
        scale: {
          start: 0.4 * settings.particles,
          end: 0
        },
        alpha: {
          start: 0.8 * settings.particles,
          end: 0
        }
      });
    }
  }
}
class AchievementsScene extends BaseScene {
  constructor() {
    super({
      key: "AchievementsScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.currentPreset > 0) {
        this.currentPreset--;
        StorageManager.set(`dropkeeper_current_preset`, this.currentPreset);
        this.scene.restart();
      }
    });
    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.currentPreset < 2) {
        this.currentPreset++;
        StorageManager.set(`dropkeeper_current_preset`, this.currentPreset);
        this.scene.restart();
      }
    });
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 60, `[ACHIEVEMENTS]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const achievements = StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS, {});
    const achievementsBox = this.add.graphics();
    achievementsBox.fillStyle(0x000000, 0.5);
    achievementsBox.fillRect(width / 2 - 300, 120, 600, 450);
    achievementsBox.lineStyle(2, 0x00ffff, 0.6);
    achievementsBox.strokeRect(width / 2 - 300, 120, 600, 450);
    const unlockedCount = Object.values(achievements).filter(a => a.unlocked).length;
    const totalCount = Object.keys(achievements).length;
    const progressText = this.add.text(width / 2, 150, `${unlockedCount}/${totalCount} UNLOCKED`, {
      fontSize: `18px`,
      color: `#00ffff`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    progressText.setOrigin(0.5);
    let yPos = 190;
    Object.entries(achievements).forEach(([key, achievement]) => {
      const color = achievement.unlocked ? `#ffdd00` : `#555555`;
      const prefix = achievement.unlocked ? `✓` : `✗`;
      const itemBox = this.add.graphics();
      itemBox.fillStyle(achievement.unlocked ? 0x003300 : 0x111111, 0.5);
      itemBox.fillRect(width / 2 - 270, yPos - 10, 540, 60);
      itemBox.lineStyle(1, achievement.unlocked ? 0x00ff00 : 0x333333, 0.8);
      itemBox.strokeRect(width / 2 - 270, yPos - 10, 540, 60);
      const text = this.add.text(width / 2 - 250, yPos, `${prefix} ${achievement.name}`, {
        fontSize: `18px`,
        color: color,
        fontStyle: `bold`
      });
      text.setOrigin(0, 0);
      const desc = this.add.text(width / 2 - 250, yPos + 25, achievement.desc, {
        fontSize: `14px`,
        color: achievement.unlocked ? `#888888` : `#555555`
      });
      desc.setOrigin(0, 0);
      yPos += 75;
    });
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    const skinText = this.add.text(width / 2, height - 120, `CURRENT SKIN: ${currentSkin.toUpperCase()}`, {
      fontSize: `16px`,
      color: `#ffdd00`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    skinText.setOrigin(0.5);
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
}
class LeaderboardScene extends BaseScene {
  constructor() {
    super({
      key: "LeaderboardScene"
    });
    this.globalScores = [];
    this.loading = true;
  }
  async create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 40, `[GLOBAL LEADERBOARD]`, {
      fontSize: `42px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const subtitle = this.add.text(width / 2, 85, `>> WORLDWIDE HIGH SCORES <<`, {
      fontSize: `16px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    });
    subtitle.setOrigin(0.5);
    const leaderboardBox = this.add.graphics();
    leaderboardBox.fillStyle(0x000000, 0.5);
    leaderboardBox.fillRect(width / 2 - 300, 120, 600, 450);
    leaderboardBox.lineStyle(2, 0x00ffff, 0.6);
    leaderboardBox.strokeRect(width / 2 - 300, 120, 600, 450);
    const loadingText = this.add.text(width / 2, height / 2, `LOADING GLOBAL SCORES...`, {
      fontSize: `20px`,
      color: `#00ffff`,
      fontStyle: `bold`
    });
    loadingText.setOrigin(0.5);
    this.tweens.add({
      targets: loadingText,
      alpha: {
        from: 1,
        to: 0.3
      },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
    try {
      this.globalScores = await GlobalLeaderboard.getTopScores(50);
      this.loading = false;
      loadingText.destroy();
      this.displayLeaderboard(width, height);
    } catch (e) {
      loadingText.setText(`FAILED TO LOAD SCORES`);
      loadingText.setColor(`#ff0066`);
      this.time.delayedCall(2000, () => {
        loadingText.destroy();
        this.displayLeaderboard(width, height);
      });
    }
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
  displayLeaderboard(width, height) {
    const localHighScore = StorageManager.getInt(STORAGE_KEYS.HIGH_SCORE);
    let yPos = 150;
    if (this.globalScores.length === 0) {
      const emptyText = this.add.text(width / 2, height / 2, `No global scores yet!\nBe the first to set a record!`, {
        fontSize: `18px`,
        color: `#888888`,
        align: `center`
      });
      emptyText.setOrigin(0.5);
      return;
    }
    this.globalScores.slice(0, 10).forEach((entry, index) => {
      const medal = index === 0 ? `🥇` : index === 1 ? `🥈` : index === 2 ? `🥉` : `${index + 1}.`;
      const isPersonalBest = entry.score === localHighScore;
      const entryBox = this.add.graphics();
      const boxColor = isPersonalBest ? 0x003333 : index < 3 ? 0x332200 : 0x111111;
      entryBox.fillStyle(boxColor, 0.6);
      entryBox.fillRect(width / 2 - 280, yPos - 5, 560, 38);
      entryBox.lineStyle(2, isPersonalBest ? 0x00ffff : index < 3 ? 0xffdd00 : 0x333333, 0.6);
      entryBox.strokeRect(width / 2 - 280, yPos - 5, 560, 38);
      const nameText = this.add.text(width / 2 - 260, yPos + 5, `${medal} ${entry.name}`, {
        fontSize: `16px`,
        color: isPersonalBest ? `#00ffff` : index < 3 ? `#ffdd00` : `#ffffff`,
        fontStyle: isPersonalBest || index < 3 ? `bold` : `normal`
      });
      nameText.setOrigin(0, 0);
      if (isPersonalBest) {
        this.add.text(width / 2 - 260, yPos + 22, `YOU`, {
          fontSize: `10px`,
          color: `#00ffff`,
          fontStyle: `bold`
        }).setOrigin(0, 0);
      }
      const scoreText = this.add.text(width / 2 + 260, yPos + 5, `${entry.score}`, {
        fontSize: `16px`,
        color: isPersonalBest ? `#00ffff` : index < 3 ? `#ffdd00` : `#00ffff`,
        fontStyle: `bold`
      });
      scoreText.setOrigin(1, 0);
      if (entry.combo) {
        this.add.text(width / 2 + 260, yPos + 22, `${entry.combo}x`, {
          fontSize: `11px`,
          color: `#ff00ff`
        }).setOrigin(1, 0);
      }
      yPos += 42;
    });
  }
}
class SettingsScene extends BaseScene {
  constructor() {
    super({
      key: "SettingsScene"
    });
    this.currentTab = 'basic';
  }
  getUnlockedSkins() {
    const achievements = StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS, {});
    const skins = [`default`];
    const unlockMap = {
      fire: 'combo_master',
      ice: 'speed_demon',
      gold: 'survivor',
      purple: 'untouchable'
    };
    Object.entries(unlockMap).forEach(([skin, achievement]) => {
      if (achievements[achievement]?.unlocked) skins.push(skin);
    });
    return skins;
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 40, `[SETTINGS]`, {
      fontSize: `42px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    this.createTabs(width);
    this.contentContainer = this.add.container(0, 0);
    if (this.currentTab === 'basic') {
      this.createBasicSettings(width, height);
    } else if (this.currentTab === 'visuals') {
      this.createVisualsSettings(width, height);
    }
    this.createButton(width / 2, height - 60, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
  createTabs(width) {
    const tabY = 90;
    const tabs = [{
      id: 'basic',
      label: 'BASIC',
      x: width / 2 - 120
    }, {
      id: 'visuals',
      label: 'VISUALS',
      x: width / 2 + 120
    }];
    tabs.forEach(tab => {
      const isSelected = this.currentTab === tab.id;
      const tabBg = this.add.graphics();
      if (isSelected) {
        tabBg.fillStyle(0x00ffff, 0.2);
      } else {
        tabBg.fillStyle(0x000000, 0.5);
      }
      tabBg.fillRect(tab.x - 80, tabY - 15, 160, 35);
      tabBg.lineStyle(2, isSelected ? 0x00ffff : 0x666666, 0.8);
      tabBg.strokeRect(tab.x - 80, tabY - 15, 160, 35);
      const tabText = this.add.text(tab.x, tabY, tab.label, {
        fontSize: `18px`,
        color: isSelected ? `#00ffff` : `#888888`,
        fontStyle: isSelected ? `bold` : `normal`
      }).setOrigin(0.5).setInteractive({
        useHandCursor: true
      });
      tabText.on('pointerdown', () => {
        this.currentTab = tab.id;
        this.scene.restart();
      });
    });
  }
  createBasicSettings(width, height) {
    const settingsBox = this.add.graphics();
    settingsBox.fillStyle(0x000000, 0.5);
    settingsBox.fillRect(width / 2 - 300, 140, 600, 440);
    settingsBox.lineStyle(2, 0x00ffff, 0.6);
    settingsBox.strokeRect(width / 2 - 300, 140, 600, 440);
    const unlockedSkins = this.getUnlockedSkins();
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    const skinLabel = this.add.text(width / 2, 165, `PLAYER SKIN`, {
      fontSize: `16px`,
      color: `#00ffff`,
      fontStyle: `bold`
    });
    skinLabel.setOrigin(0.5);
    const skinText = this.add.text(width / 2, 190, `${currentSkin.toUpperCase()}`, {
      fontSize: `20px`,
      color: `#ffdd00`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    skinText.setOrigin(0.5);
    let skinIndex = unlockedSkins.indexOf(currentSkin);
    this.createButton(width / 2, 230, `CHANGE SKIN`, () => {
      skinIndex = (skinIndex + 1) % unlockedSkins.length;
      const newSkin = unlockedSkins[skinIndex];
      StorageManager.set(STORAGE_KEYS.SKIN, newSkin);
      skinText.setText(`${newSkin.toUpperCase()}`);
    });
    const unlockedAuras = this.getUnlockedAuras();
    const currentAura = StorageManager.get(STORAGE_KEYS.AURA, `none`);
    const auraLabel = this.add.text(width / 2, 280, `PLAYER AURA`, {
      fontSize: `16px`,
      color: `#00ffff`,
      fontStyle: `bold`
    });
    auraLabel.setOrigin(0.5);
    const auraText = this.add.text(width / 2, 305, `${currentAura.toUpperCase()}`, {
      fontSize: `20px`,
      color: `#ffdd00`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    auraText.setOrigin(0.5);
    let auraIndex = unlockedAuras.indexOf(currentAura);
    this.createButton(width / 2, 345, `CHANGE AURA`, () => {
      auraIndex = (auraIndex + 1) % unlockedAuras.length;
      const newAura = unlockedAuras[auraIndex];
      StorageManager.set(STORAGE_KEYS.AURA, newAura);
      auraText.setText(`${newAura.toUpperCase()}`);
    });
    const difficulty = StorageManager.get(STORAGE_KEYS.DIFFICULTY, `normal`);
    const diffLabel = this.add.text(width / 2, 395, `DIFFICULTY`, {
      fontSize: `16px`,
      color: `#00ffff`,
      fontStyle: `bold`
    });
    diffLabel.setOrigin(0.5);
    const difficultyText = this.add.text(width / 2, 420, `${difficulty.toUpperCase()}`, {
      fontSize: `20px`,
      color: difficulty === `easy` ? `#00ff00` : difficulty === `hard` ? `#ff0066` : `#ffdd00`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    difficultyText.setOrigin(0.5);
    const difficulties = [`easy`, `normal`, `hard`];
    let currentIndex = difficulties.indexOf(difficulty);
    this.createButton(width / 2, 460, `CHANGE DIFFICULTY`, () => {
      currentIndex = (currentIndex + 1) % difficulties.length;
      const newDifficulty = difficulties[currentIndex];
      StorageManager.set(STORAGE_KEYS.DIFFICULTY, newDifficulty);
      const diffColor = newDifficulty === `easy` ? `#00ff00` : newDifficulty === `hard` ? `#ff0066` : `#ffdd00`;
      difficultyText.setText(`${newDifficulty.toUpperCase()}`);
      difficultyText.setColor(diffColor);
    });
    this.createButton(width / 2, 510, `RESET ALL DATA`, () => {
      const keys = Object.values(STORAGE_KEYS);
      keys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`Failed to remove ${key}:`, e);
        }
      });
      this.scene.restart();
    });
  }
  createVisualsSettings(width, height) {
    const leftPanelWidth = 420;
    const rightPanelWidth = 240;
    const leftPanelX = 310;
    const rightPanelX = leftPanelX + leftPanelWidth + 10;
    const settingsBox = this.add.graphics();
    settingsBox.fillStyle(0x000000, 0.5);
    settingsBox.fillRect(leftPanelX, 140, leftPanelWidth, height - 230);
    settingsBox.lineStyle(2, 0x00ffff, 0.6);
    settingsBox.strokeRect(leftPanelX, 140, leftPanelWidth, height - 230);
    const previewBox = this.add.graphics();
    previewBox.fillStyle(0x0a0a1a, 0.8);
    previewBox.fillRect(rightPanelX, 140, rightPanelWidth, height - 230);
    previewBox.lineStyle(2, 0xff00ff, 0.6);
    previewBox.strokeRect(rightPanelX, 140, rightPanelWidth, height - 230);
    this.add.text(rightPanelX + rightPanelWidth / 2, 155, `LIVE PREVIEW`, {
      fontSize: `16px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0.5, 0);
    this.createPreviewArea(rightPanelX, rightPanelWidth, height);
    const scrollContainer = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(leftPanelX, 165, leftPanelWidth, height - 250);
    const mask = maskShape.createGeometryMask();
    scrollContainer.setMask(mask);
    let yPos = 175;
    yPos = this.createEnhancedCategory(scrollContainer, leftPanelX, leftPanelWidth, yPos, 'Catch Effects', 'catchEffects', STORAGE_KEYS.CATCH_EFFECT, `✨`);
    yPos += 15;
    yPos = this.createEnhancedCategory(scrollContainer, leftPanelX, leftPanelWidth, yPos, 'Player Trails', 'playerTrails', STORAGE_KEYS.PLAYER_TRAIL, `💫`);
    yPos += 15;
    yPos = this.createEnhancedCategory(scrollContainer, leftPanelX, leftPanelWidth, yPos, 'Weapon Visuals', 'weaponVisuals', STORAGE_KEYS.WEAPON_VISUAL, `🔫`);
    yPos += 15;
    yPos = this.createEnhancedCategory(scrollContainer, leftPanelX, leftPanelWidth, yPos, 'UI Themes', 'uiThemes', STORAGE_KEYS.UI_THEME, `🎨`);
    this.scrollContainer = scrollContainer;
    let scrollY = 0;
    const maxScroll = Math.max(0, yPos - (height - 265));
    this.input.on(`wheel`, (pointer, gameObjects, deltaX, deltaY) => {
      scrollY = Phaser.Math.Clamp(scrollY + deltaY * 0.3, -maxScroll, 0);
      scrollContainer.y = scrollY;
    });
  }
  createPreviewArea(x, width, height) {
    const centerX = x + width / 2;
    const centerY = 280;
    const previewBg = this.add.graphics();
    previewBg.fillStyle(0x000000, 0.3);
    previewBg.fillCircle(centerX, centerY, 60);
    previewBg.lineStyle(2, 0x00ffff, 0.3);
    previewBg.strokeCircle(centerX, centerY, 60);
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    this.previewPlayer = this.add.sprite(centerX, centerY, `player_${currentSkin}`);
    this.previewPlayer.setScale(0.45);
    this.setupPreviewEffects(centerX, centerY);
    this.add.text(centerX, centerY + 90, `Your Character`, {
      fontSize: `14px`,
      color: `#888888`,
      fontStyle: `italic`
    }).setOrigin(0.5);
    const statsY = centerY + 130;
    this.previewStatsContainer = this.add.container(0, 0);
    this.updatePreviewStats(centerX, statsY);
  }
  setupPreviewEffects(x, y) {
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    const catchEffect = StorageManager.get(STORAGE_KEYS.CATCH_EFFECT, 'default');
    const catchConfig = CUSTOMIZATION_OPTIONS.catchEffects[catchEffect];
    this.previewCatchEmitter = this.add.particles(x, y - 40, `particle`, {
      speed: {
        min: 50,
        max: 100
      },
      scale: {
        start: 0.4 * quality.particles,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 600,
      tint: catchConfig.tint,
      frequency: 800,
      alpha: {
        start: 0.8,
        end: 0
      }
    });
    const trailEffect = StorageManager.get(STORAGE_KEYS.PLAYER_TRAIL, 'default');
    const trailConfig = CUSTOMIZATION_OPTIONS.playerTrails[trailEffect];
    this.previewTrailEmitter = this.add.particles(x, y, `particle`, {
      follow: this.previewPlayer,
      scale: {
        start: 0.3 * quality.particles,
        end: 0
      },
      speed: 30,
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: trailConfig.tint,
      frequency: 60
    });
  }
  updatePreviewStats(centerX, startY) {
    this.previewStatsContainer.removeAll(true);
    const categories = [{
      key: STORAGE_KEYS.CATCH_EFFECT,
      label: 'Catch'
    }, {
      key: STORAGE_KEYS.PLAYER_TRAIL,
      label: 'Trail'
    }, {
      key: STORAGE_KEYS.WEAPON_VISUAL,
      label: 'Weapon'
    }, {
      key: STORAGE_KEYS.UI_THEME,
      label: 'Theme'
    }];
    let y = startY;
    categories.forEach(cat => {
      const value = StorageManager.get(cat.key, 'default');
      const text = this.add.text(centerX, y, `${cat.label}: ${value}`, {
        fontSize: `11px`,
        color: `#00ffff`,
        align: `center`
      }).setOrigin(0.5);
      this.previewStatsContainer.add(text);
      y += 18;
    });
  }
  createEnhancedCategory(container, startX, panelWidth, startY, title, category, storageKey, icon) {
    const currentSelection = StorageManager.get(storageKey, 'default');
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0xff00ff, 0.1);
    headerBg.fillRect(startX + 15, startY, panelWidth - 30, 35);
    headerBg.lineStyle(1, 0xff00ff, 0.3);
    headerBg.strokeRect(startX + 15, startY, panelWidth - 30, 35);
    container.add(headerBg);
    const headerText = this.add.text(startX + 30, startY + 18, `${icon} ${title}`, {
      fontSize: `16px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0, 0.5);
    container.add(headerText);
    let yPos = startY + 45;
    const options = Object.keys(CUSTOMIZATION_OPTIONS[category]);
    options.forEach(optionKey => {
      const option = CUSTOMIZATION_OPTIONS[category][optionKey];
      const isOwned = this.isOwned(category, optionKey);
      const isEquipped = currentSelection === optionKey;
      const itemBg = this.add.graphics();
      const bgColor = isEquipped ? 0x003333 : isOwned ? 0x001111 : 0x0a0a0a;
      const borderColor = isEquipped ? 0x00ffff : isOwned ? 0x00ff00 : 0x444444;
      itemBg.fillStyle(bgColor, 0.8);
      itemBg.fillRect(startX + 20, yPos, panelWidth - 40, 60);
      itemBg.lineStyle(2, borderColor, isEquipped ? 1 : 0.5);
      itemBg.strokeRect(startX + 20, yPos, panelWidth - 40, 60);
      container.add(itemBg);
      if (isEquipped) {
        const glow = this.add.graphics();
        glow.fillStyle(0x00ffff, 0.1);
        glow.fillRect(startX + 22, yPos + 2, panelWidth - 44, 56);
        container.add(glow);
      }
      const nameText = this.add.text(startX + 35, yPos + 12, option.name, {
        fontSize: `15px`,
        color: isEquipped ? `#00ffff` : `#ffffff`,
        fontStyle: isEquipped ? `bold` : `normal`
      });
      container.add(nameText);
      if (isEquipped) {
        const equippedBadge = this.add.text(startX + panelWidth - 35, yPos + 12, `✓`, {
          fontSize: `18px`,
          color: `#00ffff`,
          fontStyle: `bold`
        }).setOrigin(1, 0);
        container.add(equippedBadge);
      }
      this.createVisualPreview(container, startX + 35, yPos + 35, category, optionKey, option);
      const buttonY = yPos + 35;
      const buttonX = startX + panelWidth - 35;
      if (!isOwned) {
        const canAfford = currency >= option.cost;
        const buyButton = this.add.text(buttonX, buttonY, `💎${option.cost}`, {
          fontSize: `14px`,
          color: canAfford ? `#ffdd00` : `#666666`,
          fontStyle: `bold`,
          backgroundColor: canAfford ? `#332200` : `#1a1a1a`,
          padding: {
            x: 8,
            y: 4
          }
        }).setOrigin(1, 0).setInteractive({
          useHandCursor: canAfford
        });
        container.add(buyButton);
        if (canAfford) {
          buyButton.on(`pointerover`, () => {
            buyButton.setColor(`#ffffff`);
            buyButton.setScale(1.1);
          });
          buyButton.on(`pointerout`, () => {
            buyButton.setColor(`#ffdd00`);
            buyButton.setScale(1);
          });
          buyButton.on(`pointerdown`, () => {
            StorageManager.set(STORAGE_KEYS.CURRENCY, currency - option.cost);
            this.markOwned(category, optionKey);
            this.scene.restart();
          });
        }
      } else if (!isEquipped) {
        const equipButton = this.add.text(buttonX, buttonY, `EQUIP`, {
          fontSize: `13px`,
          color: `#00ff00`,
          fontStyle: `bold`,
          backgroundColor: `#002200`,
          padding: {
            x: 10,
            y: 4
          }
        }).setOrigin(1, 0).setInteractive({
          useHandCursor: true
        });
        container.add(equipButton);
        equipButton.on(`pointerover`, () => {
          equipButton.setColor(`#ffffff`);
          equipButton.setScale(1.1);
        });
        equipButton.on(`pointerout`, () => {
          equipButton.setColor(`#00ff00`);
          equipButton.setScale(1);
        });
        equipButton.on(`pointerdown`, () => {
          StorageManager.set(storageKey, optionKey);
          this.updateLivePreview(category, optionKey, option);
          this.scene.restart();
        });
      }
      yPos += 70;
    });
    return yPos;
  }
  createVisualPreview(container, x, y, category, optionKey, option) {
    if (category === 'catchEffects' || category === 'playerTrails') {
      const colors = Array.isArray(option.tint) ? option.tint : [option.tint];
      const swatchSize = 12;
      const swatchSpacing = 4;
      colors.slice(0, 4).forEach((color, index) => {
        const swatch = this.add.graphics();
        swatch.fillStyle(color, 1);
        swatch.fillCircle(x + index * (swatchSize + swatchSpacing), y, swatchSize / 2);
        swatch.lineStyle(1, 0xffffff, 0.3);
        swatch.strokeCircle(x + index * (swatchSize + swatchSpacing), y, swatchSize / 2);
        container.add(swatch);
      });
    } else if (category === 'weaponVisuals') {
      const bulletSwatch = this.add.graphics();
      bulletSwatch.fillStyle(option.bulletColor, 1);
      bulletSwatch.fillRect(x, y - 4, 16, 8);
      bulletSwatch.lineStyle(1, 0xffffff, 0.3);
      bulletSwatch.strokeRect(x, y - 4, 16, 8);
      container.add(bulletSwatch);
      const netSwatch = this.add.graphics();
      netSwatch.fillStyle(option.netColor, 1);
      netSwatch.fillRect(x + 20, y - 4, 16, 8);
      netSwatch.lineStyle(1, 0xffffff, 0.3);
      netSwatch.strokeRect(x + 20, y - 4, 16, 8);
      container.add(netSwatch);
    } else if (category === 'uiThemes') {
      const themeSwatch = this.add.text(x, y, `${option.primary} ${option.secondary}`, {
        fontSize: `10px`,
        color: option.primary,
        fontStyle: `italic`
      });
      container.add(themeSwatch);
    }
  }
  updateLivePreview(category, optionKey, option) {
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    if (category === 'catchEffects') {
      if (this.previewCatchEmitter) {
        this.previewCatchEmitter.setConfig({
          tint: option.tint
        });
      }
    } else if (category === 'playerTrails') {
      if (this.previewTrailEmitter) {
        this.previewTrailEmitter.destroy();
        const centerX = this.previewPlayer.x;
        const centerY = this.previewPlayer.y;
        this.previewTrailEmitter = this.add.particles(centerX, centerY, `particle`, {
          follow: this.previewPlayer,
          scale: {
            start: 0.3 * quality.particles,
            end: 0
          },
          speed: 30,
          lifespan: 300,
          blendMode: Phaser.BlendModes.ADD,
          tint: option.tint,
          frequency: 60
        });
      }
    }
    this.cameras.main.flash(100, 0, 255, 255, 0.2);
  }
  isOwned(category, option) {
    const ownedKey = `dropkeeper_owned_${category}`;
    const owned = StorageManager.get(ownedKey, ['default']);
    if (owned.includes(option)) return true;
    const optionConfig = CUSTOMIZATION_OPTIONS[category]?.[option];
    return option === 'default' || optionConfig && optionConfig.cost === 0;
  }
  markOwned(category, option) {
    const ownedKey = `dropkeeper_owned_${category}`;
    const owned = StorageManager.get(ownedKey, ['default']);
    if (!owned.includes(option)) {
      owned.push(option);
      StorageManager.set(ownedKey, owned);
    }
  }
}
class PlayerHubScene extends BaseScene {
  constructor() {
    super({
      key: "PlayerHubScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 60, `[PLAYER HUB]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const progressOptions = [{
      text: `ACHIEVEMENTS`,
      desc: `Unlock rewards and track milestones`,
      icon: `🏆`,
      color: 0xffdd00,
      callback: () => this.scene.start(`AchievementsScene`)
    }, {
      text: `CHALLENGES`,
      desc: `Complete daily and weekly tasks`,
      icon: `🎯`,
      color: 0xff0066,
      callback: () => this.scene.start(`ChallengesScene`)
    }, {
      text: `GEAR LOADOUT`,
      desc: `Customize your equipment setup`,
      icon: `⚙️`,
      color: 0x00ffff,
      callback: () => this.scene.start(`GearScene`)
    }];
    const statsOptions = [{
      text: `LEADERBOARD`,
      desc: `Compete with top players`,
      icon: `📊`,
      color: 0xff00ff,
      callback: () => this.scene.start(`LeaderboardScene`)
    }, {
      text: `STATISTICS`,
      desc: `View detailed performance data`,
      icon: `📈`,
      color: 0x00ff00,
      callback: () => this.scene.start(`StatsScene`)
    }, {
      text: `PROGRESSION`,
      desc: `View level perks and bonuses`,
      icon: `⭐`,
      color: 0xffdd00,
      callback: () => this.scene.start(`ProgressionScene`)
    }];
    const cardWidth = 260;
    const cardHeight = 140;
    const cardSpacing = 25;
    const sectionSpacing = 60;
    const progressCardsPerRow = 3;
    const progressTotalWidth = cardWidth * progressCardsPerRow + cardSpacing * (progressCardsPerRow - 1);
    const progressStartX = (width - progressTotalWidth) / 2;
    const contentStartY = 140;
    this.add.text(width / 2, contentStartY, `>> PROGRESS <<`, {
      fontSize: `24px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    let currentY = contentStartY + 45;
    progressOptions.forEach((option, index) => {
      const col = index % progressCardsPerRow;
      const currentX = progressStartX + col * (cardWidth + cardSpacing);
      this.createCard(currentX, currentY, cardWidth, cardHeight, option);
    });
    currentY += cardHeight + sectionSpacing;
    this.add.text(width / 2, currentY, `>> STATISTICS <<`, {
      fontSize: `24px`,
      color: `#ff00ff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    currentY += 45;
    const statsCardsPerRow = 3;
    const statsTotalWidth = cardWidth * statsCardsPerRow + cardSpacing * (statsCardsPerRow - 1);
    const statsStartX = (width - statsTotalWidth) / 2;
    statsOptions.forEach((option, index) => {
      const col = index % statsCardsPerRow;
      const currentX = statsStartX + col * (cardWidth + cardSpacing);
      this.createCard(currentX, currentY, cardWidth, cardHeight, option);
    });
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
  createCard(x, y, cardWidth, cardHeight, option) {
    const cardContainer = this.add.container(x, y);
    const cardBg = this.add.graphics();
    const cardBorder = this.add.graphics();
    const cardGlow = this.add.graphics();
    const drawCard = (hover = false) => {
      cardBg.clear();
      cardBorder.clear();
      cardGlow.clear();
      if (hover) {
        cardGlow.fillStyle(option.color, 0.15);
        cardGlow.fillRect(-5, -5, cardWidth + 10, cardHeight + 10);
      }
      cardBg.fillStyle(0x000000, 0.7);
      cardBg.fillRect(0, 0, cardWidth, cardHeight);
      cardBg.fillStyle(option.color, 0.1);
      cardBg.fillRect(0, 0, cardWidth, 50);
      const borderColor = hover ? option.color : 0x00ffff;
      const borderAlpha = hover ? 1 : 0.5;
      cardBorder.lineStyle(2, borderColor, borderAlpha);
      cardBorder.strokeRect(0, 0, cardWidth, cardHeight);
      if (hover) {
        cardBorder.lineStyle(1, 0xffffff, 0.3);
        cardBorder.strokeRect(3, 3, cardWidth - 6, cardHeight - 6);
      }
    };
    drawCard(false);
    cardContainer.add([cardGlow, cardBg, cardBorder]);
    const iconText = this.add.text(cardWidth / 2, 30, option.icon, {
      fontSize: `48px`
    });
    iconText.setOrigin(0.5);
    cardContainer.add(iconText);
    const titleText = this.add.text(cardWidth / 2, 75, option.text, {
      fontSize: `16px`,
      color: `#ffffff`,
      fontStyle: `bold`
    });
    titleText.setOrigin(0.5);
    cardContainer.add(titleText);
    const descText = this.add.text(cardWidth / 2, 100, option.desc, {
      fontSize: `14px`,
      color: `#888888`,
      align: `center`,
      wordWrap: {
        width: cardWidth - 20
      }
    });
    descText.setOrigin(0.5);
    cardContainer.add(descText);
    const hitArea = new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight);
    cardContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, {
      useHandCursor: true
    });
    cardContainer.setSize(cardWidth, cardHeight);
    cardContainer.on(`pointerover`, () => {
      drawCard(true);
      this.tweens.add({
        targets: cardContainer,
        y: y - 5,
        duration: 200,
        ease: `Power2`
      });
      titleText.setColor(this.rgbToHex(option.color));
      if (this.game.sounds?.click) this.game.sounds.click();
    });
    cardContainer.on(`pointerout`, () => {
      drawCard(false);
      this.tweens.add({
        targets: cardContainer,
        y: y,
        duration: 200,
        ease: `Power2`
      });
      titleText.setColor(`#ffffff`);
    });
    cardContainer.on(`pointerdown`, () => {
      this.cameras.main.flash(100, ...this.hexToRgb(option.color));
      option.callback();
    });
  }
  rgbToHex(color) {
    const r = color >> 16 & 0xFF;
    const g = color >> 8 & 0xFF;
    const b = color & 0xFF;
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  hexToRgb(color) {
    const r = color >> 16 & 0xFF;
    const g = color >> 8 & 0xFF;
    const b = color & 0xFF;
    return [r, g, b];
  }
}
class ProgressionScene extends BaseScene {
  constructor() {
    super({
      key: "ProgressionScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const playerLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const playerXP = StorageManager.getInt(STORAGE_KEYS.PLAYER_XP, 0);
    const rankInfo = LevelingSystem.getRankTitle(playerLevel);
    const perks = LevelingSystem.getLevelPerks(playerLevel);
    const bonuses = LevelingSystem.getStatBonuses(playerLevel);
    const levelBox = this.add.graphics();
    levelBox.fillStyle(0x000000, 0.85);
    levelBox.fillRect(width / 2 - 400, 80, 800, 140);
    levelBox.lineStyle(3, parseInt(rankInfo.color.replace('#', '0x')), 0.9);
    levelBox.strokeRect(width / 2 - 400, 80, 800, 140);
    levelBox.lineStyle(1, 0xffffff, 0.2);
    levelBox.strokeRect(width / 2 - 397, 83, 794, 134);
    this.add.text(width / 2, 110, `LEVEL ${playerLevel}`, {
      fontSize: `42px`,
      color: rankInfo.color,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 3
    }).setOrigin(0.5);
    this.add.text(width / 2, 150, `[${rankInfo.title}]`, {
      fontSize: `22px`,
      color: rankInfo.color,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 1
    }).setOrigin(0.5);
    const xpForNext = LevelingSystem.getXPForLevel(playerLevel + 1);
    const xpProgress = playerXP / xpForNext;
    const xpBarBg = this.add.graphics();
    xpBarBg.fillStyle(0x000000, 0.9);
    xpBarBg.fillRect(width / 2 - 300, 185, 600, 24);
    xpBarBg.lineStyle(2, 0xff00ff, 0.9);
    xpBarBg.strokeRect(width / 2 - 300, 185, 600, 24);
    const xpBar = this.add.graphics();
    xpBar.fillStyle(0xff00ff, 0.9);
    xpBar.fillRect(width / 2 - 300, 185, 600 * xpProgress, 24);
    xpBar.fillStyle(0xffffff, 0.3);
    xpBar.fillRect(width / 2 - 300, 185, 600 * xpProgress, 8);
    this.add.text(width / 2, 197, `${playerXP} / ${xpForNext} XP`, {
      fontSize: `15px`,
      color: `#ffffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    const bonusesBox = this.add.graphics();
    bonusesBox.fillStyle(0x001122, 0.8);
    bonusesBox.fillRect(width / 2 - 400, 240, 380, 180);
    bonusesBox.lineStyle(2, 0x00ffff, 0.7);
    bonusesBox.strokeRect(width / 2 - 400, 240, 380, 180);
    bonusesBox.fillStyle(0x00ffff, 0.1);
    bonusesBox.fillRect(width / 2 - 400, 240, 380, 35);
    this.add.text(width / 2 - 210, 257, `ACTIVE BONUSES`, {
      fontSize: `20px`,
      color: `#00ffff`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    let bonusY = 290;
    const bonusTexts = [`Speed: +${((bonuses.speedMultiplier - 1) * 100).toFixed(0)}%`, `XP Gain: +${((bonuses.xpMultiplier - 1) * 100).toFixed(0)}%`, `Currency: +${((bonuses.currencyMultiplier - 1) * 100).toFixed(0)}%`, `Combo: +${((bonuses.comboMultiplier - 1) * 100).toFixed(0)}%`];
    bonusTexts.forEach(text => {
      this.add.text(width / 2 - 375, bonusY, text, {
        fontSize: `16px`,
        color: `#ffdd00`,
        stroke: `#000000`,
        strokeThickness: 1
      });
      bonusY += 28;
    });
    if (bonuses.shieldBonus > 0) {
      this.add.text(width / 2 - 375, bonusY, `Shield: +${bonuses.shieldBonus} hits`, {
        fontSize: `16px`,
        color: `#ffdd00`,
        stroke: `#000000`,
        strokeThickness: 1
      });
    }
    const perksBox = this.add.graphics();
    perksBox.fillStyle(0x220011, 0.8);
    perksBox.fillRect(width / 2 + 20, 240, 380, 180);
    perksBox.lineStyle(2, 0xff00ff, 0.7);
    perksBox.strokeRect(width / 2 + 20, 240, 380, 180);
    perksBox.fillStyle(0xff00ff, 0.1);
    perksBox.fillRect(width / 2 + 20, 240, 380, 35);
    this.add.text(width / 2 + 210, 257, `UNLOCKED PERKS`, {
      fontSize: `20px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    const scrollContainer = this.add.container(0, 0);
    const perkStartY = 290;
    perks.slice(0, 4).forEach((perk, index) => {
      const y = perkStartY + index * 28;
      const perkText = this.add.text(width / 2 + 45, y, `✓ ${perk.name}`, {
        fontSize: `15px`,
        color: `#00ff00`,
        stroke: `#000000`,
        strokeThickness: 1
      });
      scrollContainer.add(perkText);
      const descText = this.add.text(width / 2 + 65, y + 15, perk.desc, {
        fontSize: `11px`,
        color: `#888888`
      });
      scrollContainer.add(descText);
    });
    if (perks.length > 4) {
      this.add.text(width / 2 + 45, perkStartY + 115, `+${perks.length - 4} more perks...`, {
        fontSize: `13px`,
        color: `#888888`,
        fontStyle: `italic`
      });
    }
    const milestonesBox = this.add.graphics();
    milestonesBox.fillStyle(0x000000, 0.7);
    milestonesBox.fillRect(width / 2 - 400, 440, 800, 140);
    milestonesBox.lineStyle(2, 0xffdd00, 0.7);
    milestonesBox.strokeRect(width / 2 - 400, 440, 800, 140);
    milestonesBox.fillStyle(0xffdd00, 0.1);
    milestonesBox.fillRect(width / 2 - 400, 440, 800, 35);
    this.add.text(width / 2, 457, `UPCOMING MILESTONES`, {
      fontSize: `22px`,
      color: `#ffdd00`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    const nextMilestones = [5, 10, 15, 20, 25, 30, 40, 50].filter(level => level > playerLevel);
    let milestoneY = 490;
    nextMilestones.slice(0, 3).forEach(level => {
      const reward = LevelingSystem.getLevelReward(level);
      const perkCount = LevelingSystem.getLevelPerks(level).length;
      const milestoneItem = this.add.graphics();
      milestoneItem.fillStyle(0x111111, 0.6);
      milestoneItem.fillRect(width / 2 - 375, milestoneY, 750, 24);
      milestoneItem.lineStyle(1, 0xffdd00, 0.5);
      milestoneItem.strokeRect(width / 2 - 375, milestoneY, 750, 24);
      this.add.text(width / 2 - 355, milestoneY + 5, `Level ${level}`, {
        fontSize: `15px`,
        color: `#ffffff`,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 1
      });
      let rewardText = `${perkCount} perks`;
      if (reward) {
        rewardText += ` • ${reward.name}`;
      }
      this.add.text(width / 2 + 355, milestoneY + 5, rewardText, {
        fontSize: `14px`,
        color: `#00ffff`,
        stroke: `#000000`,
        strokeThickness: 1
      }).setOrigin(1, 0);
      milestoneY += 28;
    });
    this.createButton(width / 2, height - 60, `BACK TO HUB`, () => {
      this.scene.start(`PlayerHubScene`);
    });
  }
}
class GearScene extends BaseScene {
  constructor() {
    super({
      key: "GearScene"
    });
    this.currentPreset = StorageManager.getInt(`dropkeeper_current_preset`, 0);
    this.selectedTab = `all`;
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 25, `[GEAR LOADOUT]`, {
      fontSize: `36px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const currencyBox = this.add.graphics();
    currencyBox.fillStyle(0x000000, 0.7);
    currencyBox.fillRect(width / 2 - 120, 65, 240, 30);
    currencyBox.lineStyle(2, 0x00ffff, 0.8);
    currencyBox.strokeRect(width / 2 - 120, 65, 240, 30);
    this.currencyText = this.add.text(width / 2, 80, `💎 ${currency}`, {
      fontSize: `18px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.currencyText.setOrigin(0.5);
    const gearData = StorageManager.get(STORAGE_KEYS.GEAR, {});
    let equippedGear = this.loadCurrentPreset();
    const gearConfigs = [{
      id: `wide_net`,
      name: `Wide Net`,
      type: `net`,
      cost: 300,
      rarity: `rare`,
      desc: `50% larger catch radius for net weapon`,
      icon: `🌐`,
      effect: `net_range`,
      stats: {
        netRange: `+50%`
      }
    }, {
      id: `piercing_gun`,
      name: `Piercing Gun`,
      type: `gun`,
      cost: 350,
      rarity: `epic`,
      desc: `Bullets pierce through multiple targets`,
      icon: `🔫`,
      effect: `gun_pierce`,
      stats: {
        piercing: `Enabled`
      }
    }, {
      id: `speed_boots`,
      name: `Speed Boots`,
      type: `utility`,
      cost: 250,
      rarity: `common`,
      desc: `+30% movement speed`,
      icon: `👟`,
      effect: `move_speed`,
      stats: {
        speed: `+30%`
      }
    }, {
      id: `double_dash`,
      name: `Double Dash`,
      type: `utility`,
      cost: 400,
      rarity: `rare`,
      desc: `Dash twice before cooldown`,
      icon: `⚡`,
      effect: `dash_double`,
      stats: {
        dashes: `2`
      }
    }, {
      id: `magnet_gloves`,
      name: `Magnet Gloves`,
      type: `utility`,
      cost: 320,
      rarity: `rare`,
      desc: `Passive item attraction (weak)`,
      icon: `🧲`,
      effect: `passive_magnet`,
      stats: {
        magnetRange: `120px`
      }
    }, {
      id: `rapid_fire`,
      name: `Rapid Fire`,
      type: `gun`,
      cost: 280,
      rarity: `common`,
      desc: `25% faster fire rate`,
      icon: `💨`,
      effect: `fire_rate`,
      stats: {
        fireRate: `+25%`
      }
    }, {
      id: `explosive_rounds`,
      name: `Explosive Rounds`,
      type: `gun`,
      cost: 450,
      rarity: `epic`,
      desc: `Bullets explode on impact, damaging nearby items`,
      icon: `💥`,
      effect: `gun_explosive`,
      stats: {
        aoe: `80px`
      }
    }, {
      id: `mega_net`,
      name: `Mega Net`,
      type: `net`,
      cost: 500,
      rarity: `legendary`,
      desc: `Massive net with 2x size and duration`,
      icon: `🕸️`,
      effect: `net_mega`,
      stats: {
        netRange: `+100%`,
        duration: `+50%`
      }
    }, {
      id: `turbo_dash`,
      name: `Turbo Dash`,
      type: `utility`,
      cost: 380,
      rarity: `epic`,
      desc: `50% faster dash speed and -30% cooldown`,
      icon: `🚀`,
      effect: `dash_turbo`,
      stats: {
        dashSpeed: `+50%`,
        cooldown: `-30%`
      }
    }, {
      id: `shield_generator`,
      name: `Shield Generator`,
      type: `utility`,
      cost: 600,
      rarity: `legendary`,
      desc: `Start each game with a 5-hit shield`,
      icon: `🛡️`,
      effect: `shield_start`,
      stats: {
        shield: `5 hits`
      }
    }, {
      id: `chain_lightning`,
      name: `Chain Lightning`,
      type: `gun`,
      cost: 420,
      rarity: `epic`,
      desc: `Bullets chain to 2 nearby targets`,
      icon: `⚡`,
      effect: `gun_chain`,
      stats: {
        chains: `2`,
        range: `100px`
      }
    }, {
      id: `fortune_aura`,
      name: `Fortune Aura`,
      type: `utility`,
      cost: 550,
      rarity: `legendary`,
      desc: `+50% score multiplier and double currency`,
      icon: `💰`,
      effect: `fortune_boost`,
      stats: {
        scoreBonus: `+50%`,
        currency: `2x`
      }
    }, {
      id: `time_dilation`,
      name: `Time Dilation`,
      type: `utility`,
      cost: 480,
      rarity: `epic`,
      desc: `Slow items by 20% permanently`,
      icon: `⏰`,
      effect: `slow_items`,
      stats: {
        itemSpeed: `-20%`
      }
    }, {
      id: `homing_net`,
      name: `Homing Net`,
      type: `net`,
      cost: 380,
      rarity: `rare`,
      desc: `Net auto-aims toward nearest item cluster`,
      icon: `🎯`,
      effect: `net_homing`,
      stats: {
        autoAim: `Enabled`
      }
    }];
    const rarityColors = {
      common: {
        border: 0x888888,
        bg: 0x222222,
        text: `#888888`
      },
      rare: {
        border: 0x00ffff,
        bg: 0x001133,
        text: `#00ffff`
      },
      epic: {
        border: 0xff00ff,
        bg: 0x220033,
        text: `#ff00ff`
      },
      legendary: {
        border: 0xffdd00,
        bg: 0x332200,
        text: `#ffdd00`
      }
    };
    this.createLoadoutPanel(width, height, equippedGear, gearConfigs, rarityColors);
    const tabHeaderBg = this.add.graphics();
    tabHeaderBg.fillStyle(0x000000, 0.5);
    tabHeaderBg.fillRect(width / 2 - 30, 110, 710, 45);
    tabHeaderBg.lineStyle(2, 0x00ffff, 0.6);
    tabHeaderBg.strokeRect(width / 2 - 30, 110, 710, 45);
    this.add.text(width / 2 + 25, 122, `GEAR INVENTORY`, {
      fontSize: `14px`,
      color: `#00ffff`,
      fontStyle: `bold`
    });
    const tabY = 132;
    const tabTypes = [{
      type: `all`,
      label: `ALL`,
      x: width / 2 + 360
    }, {
      type: `gun`,
      label: `GUN`,
      x: width / 2 + 440
    }, {
      type: `net`,
      label: `NET`,
      x: width / 2 + 520
    }, {
      type: `utility`,
      label: `UTIL`,
      x: width / 2 + 600
    }];
    const tabTexts = [];
    tabTypes.forEach(tab => {
      const isSelected = this.selectedTab === tab.type;
      const tabText = this.add.text(tab.x, tabY, tab.label, {
        fontSize: `13px`,
        color: isSelected ? `#ffdd00` : `#888888`,
        fontStyle: isSelected ? `bold` : `normal`,
        backgroundColor: isSelected ? `#332200` : `transparent`,
        padding: {
          x: 10,
          y: 4
        }
      });
      tabText.setOrigin(0.5);
      tabText.setInteractive({
        useHandCursor: true
      });
      tabText.on(`pointerover`, () => {
        if (!isSelected) {
          tabText.setColor(`#00ffff`);
        }
      });
      tabText.on(`pointerout`, () => {
        if (!isSelected) {
          tabText.setColor(`#888888`);
        }
      });
      tabText.on(`pointerdown`, () => {
        this.selectedTab = tab.type;
        tabTexts.forEach(t => {
          t.setColor(`#888888`);
          t.setStyle({
            backgroundColor: `transparent`,
            fontStyle: `normal`
          });
        });
        tabText.setColor(`#ffdd00`);
        tabText.setStyle({
          backgroundColor: `#332200`,
          fontStyle: `bold`
        });
        this.scene.restart();
      });
      tabTexts.push(tabText);
    });
    const scrollContainer = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(width / 2 - 30, 165, 710, height - 290);
    const mask = maskShape.createGeometryMask();
    scrollContainer.setMask(mask);
    const boxWidth = 620;
    let yPos = 175;
    const itemHeight = 95;
    const filteredGear = this.selectedTab === `all` ? gearConfigs : gearConfigs.filter(g => g.type === this.selectedTab);
    filteredGear.forEach(gear => {
      const owned = gearData[gear.id] || false;
      const equipped = equippedGear[gear.type] === gear.id;
      const rarity = rarityColors[gear.rarity];
      const itemBox = this.add.graphics();
      const boxColor = equipped ? 0x003300 : owned ? rarity.bg : 0x0a0a0a;
      itemBox.fillStyle(boxColor, 0.8);
      itemBox.fillRect(width / 2 - 20, yPos, boxWidth, itemHeight);
      const borderColor = equipped ? 0x00ff00 : owned ? rarity.border : 0x333333;
      itemBox.lineStyle(2, borderColor, equipped ? 1 : 0.6);
      itemBox.strokeRect(width / 2 - 20, yPos, boxWidth, itemHeight);
      scrollContainer.add(itemBox);
      const iconText = this.add.text(width / 2 + 5, yPos + 12, gear.icon, {
        fontSize: `28px`
      });
      iconText.setOrigin(0, 0);
      scrollContainer.add(iconText);
      const nameText = this.add.text(width / 2 + 50, yPos + 12, gear.name, {
        fontSize: `16px`,
        color: rarity.text,
        fontStyle: `bold`
      });
      nameText.setOrigin(0, 0);
      scrollContainer.add(nameText);
      const rarityBadge = this.add.text(width / 2 + 50, yPos + 32, gear.rarity.toUpperCase(), {
        fontSize: `10px`,
        color: rarity.text,
        backgroundColor: `#000000`,
        padding: {
          x: 5,
          y: 2
        }
      });
      rarityBadge.setOrigin(0, 0);
      scrollContainer.add(rarityBadge);
      const descText = this.add.text(width / 2 + 50, yPos + 52, gear.desc, {
        fontSize: `13px`,
        color: `#aaaaaa`,
        wordWrap: {
          width: 380
        }
      });
      descText.setOrigin(0, 0);
      scrollContainer.add(descText);
      const statsText = this.add.text(width / 2 + 50, yPos + 76, Object.entries(gear.stats).map(([k, v]) => `${k}: ${v}`).join(` • `), {
        fontSize: `11px`,
        color: `#00ff88`,
        fontStyle: `italic`
      });
      statsText.setOrigin(0, 0);
      scrollContainer.add(statsText);
      if (equipped) {
        const equippedLabel = this.add.text(width / 2 + boxWidth - 30, yPos + 12, `✓ EQUIPPED`, {
          fontSize: `14px`,
          color: `#00ff00`,
          fontStyle: `bold`,
          backgroundColor: `#002200`,
          padding: {
            x: 8,
            y: 4
          }
        });
        equippedLabel.setOrigin(1, 0);
        scrollContainer.add(equippedLabel);
      } else if (owned) {
        const equipButton = this.add.text(width / 2 + boxWidth - 30, yPos + 12, `EQUIP`, {
          fontSize: `14px`,
          color: `#00ffff`,
          fontStyle: `bold`,
          backgroundColor: `#002233`,
          padding: {
            x: 12,
            y: 5
          }
        });
        equipButton.setOrigin(1, 0);
        equipButton.setInteractive({
          useHandCursor: true
        });
        scrollContainer.add(equipButton);
        const currentEquipped = equippedGear[gear.type];
        const currentGear = currentEquipped ? gearConfigs.find(g => g.id === currentEquipped) : null;
        equipButton.on(`pointerover`, () => {
          equipButton.setColor(`#ffdd00`);
          equipButton.setScale(1.05);
          equipButton.setStyle({
            backgroundColor: `#554400`
          });
          if (currentGear) {
            this.showComparisonTooltip(equipButton.x - 200, equipButton.y, currentGear, gear, rarity);
          }
        });
        equipButton.on(`pointerout`, () => {
          equipButton.setColor(`#00ffff`);
          equipButton.setScale(1);
          equipButton.setStyle({
            backgroundColor: `#003333`
          });
          this.hideComparisonTooltip();
        });
        equipButton.on(`pointerdown`, () => {
          equippedGear[gear.type] = gear.id;
          this.saveCurrentPreset(equippedGear);
          if (this.game.sounds?.powerup) this.game.sounds.powerup();
          this.cameras.main.flash(100, 0, 255, 0);
          this.scene.restart();
        });
        const unequipButton = this.add.text(width / 2 + boxWidth - 140, yPos + 12, `REMOVE`, {
          fontSize: `13px`,
          color: `#ff6666`,
          backgroundColor: `#220000`,
          padding: {
            x: 10,
            y: 5
          }
        });
        unequipButton.setOrigin(1, 0);
        unequipButton.setInteractive({
          useHandCursor: true
        });
        scrollContainer.add(unequipButton);
        unequipButton.on(`pointerover`, () => {
          unequipButton.setColor(`#ff0000`);
          unequipButton.setScale(1.05);
        });
        unequipButton.on(`pointerout`, () => {
          unequipButton.setColor(`#ff6666`);
          unequipButton.setScale(1);
        });
        unequipButton.on(`pointerdown`, () => {
          delete equippedGear[gear.type];
          this.saveCurrentPreset(equippedGear);
          this.scene.restart();
        });
      } else {
        const canAfford = currency >= gear.cost;
        const buyButton = this.add.text(width / 2 + boxWidth - 30, yPos + 12, `BUY ${gear.cost} 💎`, {
          fontSize: `14px`,
          color: canAfford ? `#ffdd00` : `#555555`,
          fontStyle: `bold`,
          backgroundColor: canAfford ? `#332200` : `#1a1a1a`,
          padding: {
            x: 12,
            y: 5
          }
        });
        buyButton.setOrigin(1, 0);
        scrollContainer.add(buyButton);
        if (canAfford) {
          buyButton.setInteractive({
            useHandCursor: true
          });
          buyButton.on(`pointerover`, () => {
            buyButton.setColor(`#ffffff`);
            buyButton.setScale(1.05);
            buyButton.setStyle({
              backgroundColor: `#554400`
            });
            const tooltip = this.add.graphics();
            tooltip.fillStyle(0x000000, 0.9);
            tooltip.fillRect(buyButton.x - 180, buyButton.y - 40, 170, 30);
            tooltip.lineStyle(1, 0xffdd00, 1);
            tooltip.strokeRect(buyButton.x - 180, buyButton.y - 40, 170, 30);
            const tooltipText = this.add.text(buyButton.x - 95, buyButton.y - 25, `Click to purchase`, {
              fontSize: `14px`,
              color: `#ffdd00`
            });
            tooltipText.setOrigin(0.5);
            buyButton.once(`pointerout`, () => {
              tooltip.destroy();
              tooltipText.destroy();
            });
          });
          buyButton.on(`pointerout`, () => {
            buyButton.setColor(`#ffdd00`);
            buyButton.setScale(1);
            buyButton.setStyle({
              backgroundColor: `#332200`
            });
          });
          buyButton.on(`pointerdown`, () => {
            StorageManager.set(STORAGE_KEYS.CURRENCY, currency - gear.cost);
            gearData[gear.id] = true;
            StorageManager.set(STORAGE_KEYS.GEAR, gearData);
            if (this.game.sounds?.powerup) this.game.sounds.powerup();
            this.cameras.main.flash(150, 255, 221, 0);
            const purchaseText = this.add.text(width / 2, height / 2, `${gear.icon} ${gear.name} ACQUIRED!`, {
              fontSize: `32px`,
              color: rarity.text,
              fontStyle: `bold`,
              stroke: `#000000`,
              strokeThickness: 3
            });
            purchaseText.setOrigin(0.5);
            this.tweens.add({
              targets: purchaseText,
              y: height / 2 - 50,
              alpha: 0,
              duration: 1500,
              onComplete: () => {
                purchaseText.destroy();
                this.scene.restart();
              }
            });
          });
        } else {
          buyButton.on(`pointerover`, () => {
            const needed = gear.cost - currency;
            const tooltip = this.add.graphics();
            tooltip.fillStyle(0x330000, 0.9);
            tooltip.fillRect(buyButton.x - 200, buyButton.y - 40, 190, 30);
            tooltip.lineStyle(1, 0xff0066, 1);
            tooltip.strokeRect(buyButton.x - 200, buyButton.y - 40, 190, 30);
            const tooltipText = this.add.text(buyButton.x - 105, buyButton.y - 25, `Need ${needed} more chips`, {
              fontSize: `14px`,
              color: `#ff0066`
            });
            tooltipText.setOrigin(0.5);
            buyButton.once(`pointerout`, () => {
              tooltip.destroy();
              tooltipText.destroy();
            });
          });
        }
      }
      yPos += itemHeight + 10;
    });
    let scrollY = 0;
    const maxScroll = Math.max(0, yPos - (height - 310));
    this.input.on(`wheel`, (pointer, gameObjects, deltaX, deltaY) => {
      scrollY = Phaser.Math.Clamp(scrollY + deltaY * 0.5, -maxScroll, 0);
      scrollContainer.y = scrollY;
    });
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.8);
    footerBg.fillRect(0, height - 80, width, 80);
    footerBg.lineStyle(2, 0x00ffff, 0.3);
    footerBg.lineBetween(0, height - 80, width, height - 80);
    const statsInfo = this.add.text(width / 2, height - 60, `💡 Hover over EQUIP to compare stats`, {
      fontSize: `13px`,
      color: `#888888`,
      fontStyle: `italic`
    });
    statsInfo.setOrigin(0.5);
    this.createButton(width / 2, height - 30, `BACK TO HUB`, () => {
      this.scene.start(`PlayerHubScene`);
    });
  }
  createLoadoutPanel(width, height, equippedGear, gearConfigs, rarityColors) {
    const panelX = 20;
    const panelY = 110;
    const panelWidth = 280;
    const panelHeight = height - 200;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.BG, 0.8);
    panelBg.fillRect(panelX, panelY, panelWidth, panelHeight);
    panelBg.lineStyle(2, COLORS.PRIMARY, 0.3);
    panelBg.strokeRect(panelX, panelY, panelWidth, panelHeight);
    panelBg.lineStyle(1, COLORS.SECONDARY, 0.2);
    panelBg.strokeRect(panelX + 3, panelY + 3, panelWidth - 6, panelHeight - 6);
    const headerBg = this.add.graphics();
    headerBg.fillStyle(COLORS.PRIMARY, 0.1);
    headerBg.fillRect(panelX, panelY, panelWidth, 35);
    this.add.text(panelX + panelWidth / 2, panelY + 18, `LOADOUT MANAGEMENT`, {
      fontSize: `18px`,
      color: `#00ffff`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(0x000000, 0.5);
    avatarBg.fillCircle(panelX + panelWidth / 2, panelY + 70, 40);
    avatarBg.lineStyle(2, COLORS.SECONDARY, 0.4);
    avatarBg.strokeCircle(panelX + panelWidth / 2, panelY + 70, 40);
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    const previewSprite = this.add.sprite(panelX + panelWidth / 2, panelY + 70, `player_${currentSkin}`);
    previewSprite.setScale(0.4);
    this.createGearVisualEffects(previewSprite.x, previewSprite.y, equippedGear, gearConfigs);
    let gearY = panelY + 125;
    [`gun`, `net`, `utility`].forEach(type => {
      const equippedId = equippedGear[type];
      const gearInfo = equippedId ? gearConfigs.find(g => g.id === equippedId) : null;
      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x000000, 0.5);
      slotBg.fillRect(panelX + 10, gearY, panelWidth - 20, 35);
      slotBg.lineStyle(1, gearInfo ? rarityColors[gearInfo.rarity].border : 0x444444, 0.5);
      slotBg.strokeRect(panelX + 10, gearY, panelWidth - 20, 35);
      this.add.text(panelX + 18, gearY + 3, type.toUpperCase(), {
        fontSize: `9px`,
        color: `#888888`
      });
      if (gearInfo) {
        this.add.text(panelX + 18, gearY + 16, `${gearInfo.icon} ${gearInfo.name}`, {
          fontSize: `11px`,
          color: rarityColors[gearInfo.rarity].text,
          fontStyle: `bold`
        });
      } else {
        this.add.text(panelX + 18, gearY + 16, `[ EMPTY ]`, {
          fontSize: `11px`,
          color: `#444444`,
          fontStyle: `italic`
        });
      }
      gearY += 40;
    });
    const setBonus = this.calculateSetBonus(equippedGear, gearConfigs);
    if (setBonus) {
      this.add.text(panelX + panelWidth / 2, gearY + 5, `SET BONUS`, {
        fontSize: `10px`,
        color: `#ffdd00`,
        fontStyle: `bold`,
        backgroundColor: `#332200`,
        padding: {
          x: 5,
          y: 2
        }
      }).setOrigin(0.5, 0);
      gearY += 22;
    } else {
      gearY += 8;
    }
    const presetHeaderY = gearY;
    const presetHeaderBg = this.add.graphics();
    presetHeaderBg.fillStyle(COLORS.SECONDARY, 0.1);
    presetHeaderBg.fillRect(panelX, presetHeaderY, panelWidth, 25);
    this.add.text(panelX + panelWidth / 2, presetHeaderY + 12, `PRESETS`, {
      fontSize: `12px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    const presets = StorageManager.get(`dropkeeper_loadout_presets`, [{}, {}, {}]);
    const slotStartY = presetHeaderY + 30;
    const slotWidth = panelWidth - 20;
    const slotHeight = 32;
    const slotSpacing = 6;
    for (let i = 0; i < 3; i++) {
      const slotY = slotStartY + i * (slotHeight + slotSpacing);
      const presetBox = this.add.graphics();
      const isActive = this.currentPreset === i;
      const hasData = Object.keys(presets[i]).length > 0;
      const boxColor = isActive ? 0x003333 : 0x001111;
      const borderColor = isActive ? COLORS.PRIMARY : hasData ? COLORS.SUCCESS : 0x444444;
      presetBox.fillStyle(boxColor, 0.9);
      presetBox.fillRect(panelX + 10, slotY, slotWidth, slotHeight);
      presetBox.lineStyle(2, borderColor, isActive ? 1 : 0.7);
      presetBox.strokeRect(panelX + 10, slotY, slotWidth, slotHeight);
      if (isActive) {
        presetBox.lineStyle(1, 0xffffff, 0.3);
        presetBox.strokeRect(panelX + 12, slotY + 2, slotWidth - 4, slotHeight - 4);
      }
      this.add.text(panelX + 18, slotY + 9, `SLOT ${i + 1}`, {
        fontSize: `11px`,
        color: isActive ? `#ffffff` : `#888888`
      });
      if (isActive) {
        const saveBtn = this.add.text(panelX + slotWidth - 8, slotY + 16, `💾`, {
          fontSize: `11px`,
          color: `#ffdd00`,
          fontStyle: `bold`,
          backgroundColor: `#332200`,
          padding: {
            x: 6,
            y: 3
          }
        }).setOrigin(1, 0.5).setInteractive({
          useHandCursor: true
        });
        saveBtn.on(`pointerover`, () => saveBtn.setColor(`#ffffff`).setScale(1.05));
        saveBtn.on(`pointerout`, () => saveBtn.setColor(`#ffdd00`).setScale(1));
        saveBtn.on(`pointerdown`, () => {
          const current = StorageManager.get(STORAGE_KEYS.EQUIPPED_GEAR, {});
          this.savePreset(this.currentPreset, current);
          this.cameras.main.flash(100, 255, 221, 0);
          const savedText = this.add.text(saveBtn.x - 50, saveBtn.y - 30, `SAVED!`, {
            fontSize: `12px`,
            color: `#00ff00`
          }).setOrigin(0.5);
          this.tweens.add({
            targets: savedText,
            y: savedText.y - 20,
            alpha: 0,
            duration: 800,
            onComplete: () => savedText.destroy()
          });
          this.scene.restart();
        });
      }
      const hitArea = new Phaser.Geom.Rectangle(panelX + 10, slotY, slotWidth, slotHeight);
      const container = this.add.container(0, 0).setInteractive(hitArea, Phaser.Geom.Rectangle.Contains).setSize(slotWidth, slotHeight);
      container.on(`pointerdown`, () => {
        if (!isActive) {
          this.currentPreset = i;
          StorageManager.set(`dropkeeper_current_preset`, this.currentPreset);
          this.scene.restart();
        }
      });
    }
    this.add.text(panelX + panelWidth / 2, slotStartY + 3 * (slotHeight + slotSpacing) + 5, `← → switch`, {
      fontSize: `9px`,
      color: `#888888`,
      fontStyle: `italic`
    }).setOrigin(0.5);
  }
  loadCurrentPreset() {
    const presets = StorageManager.get(`dropkeeper_loadout_presets`, [{}, {}, {}]);
    const preset = presets[this.currentPreset] || {};
    if (Object.keys(preset).length > 0) {
      StorageManager.set(STORAGE_KEYS.EQUIPPED_GEAR, preset);
      return preset;
    }
    return StorageManager.get(STORAGE_KEYS.EQUIPPED_GEAR, {});
  }
  saveCurrentPreset(gear) {
    StorageManager.set(STORAGE_KEYS.EQUIPPED_GEAR, gear);
    this.savePreset(this.currentPreset, gear);
  }
  savePreset(index, gear) {
    const presets = StorageManager.get(`dropkeeper_loadout_presets`, [{}, {}, {}]);
    presets[index] = {
      ...gear
    };
    StorageManager.set(`dropkeeper_loadout_presets`, presets);
  }
  createGearVisualEffects(x, y, equippedGear, gearConfigs) {
    Object.values(equippedGear).forEach((gearId, index) => {
      const gear = gearConfigs.find(g => g.id === gearId);
      if (!gear) return;
      const offset = (index - 1) * 25;
      if (gear.type === `gun`) {
        const gunGraphics = this.add.graphics();
        gunGraphics.fillStyle(0x00ffff, 0.6);
        gunGraphics.fillRect(x + 30, y - 10 + offset, 8, 3);
        gunGraphics.fillStyle(0xff00ff, 0.4);
        gunGraphics.fillCircle(x + 38, y - 8 + offset, 2);
      } else if (gear.type === `net`) {
        const netGraphics = this.add.graphics();
        netGraphics.lineStyle(1, 0xffdd00, 0.5);
        netGraphics.strokeCircle(x, y + offset, 35);
        netGraphics.strokeCircle(x, y + offset, 30);
      } else if (gear.type === `utility`) {}
    });
  }
  calculateSetBonus(equippedGear, gearConfigs) {
    const equippedItems = Object.values(equippedGear).map(id => gearConfigs.find(g => g.id === id)).filter(g => g);
    const rarities = equippedItems.map(g => g.rarity);
    const legendaryCount = rarities.filter(r => r === `legendary`).length;
    if (legendaryCount >= 2) return `LEGENDARY SET: +25% All Stats`;
    const epicCount = rarities.filter(r => r === `epic`).length;
    if (epicCount >= 2) return `EPIC SET: +15% All Stats`;
    const rareCount = rarities.filter(r => r === `rare`).length;
    if (rareCount >= 3) return `RARE SET: +10% All Stats`;
    const types = equippedItems.map(g => g.type);
    if (types.includes(`gun`) && types.includes(`net`) && types.includes(`utility`)) {
      return `BALANCED SET: +5% All Stats`;
    }
    return null;
  }
  showComparisonTooltip(x, y, currentGear, newGear, rarityColors) {
    this.hideComparisonTooltip();
    this.tooltipContainer = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.fillRect(0, 0, 350, 160);
    bg.lineStyle(2, 0x00ffff, 0.8);
    bg.strokeRect(0, 0, 350, 160);
    this.tooltipContainer.add(bg);
    this.tooltipContainer.add(this.add.text(175, 10, `COMPARISON`, {
      fontSize: `14px`,
      color: `#00ffff`,
      fontStyle: `bold`
    }).setOrigin(0.5, 0));
    const currentHeader = this.add.text(20, 35, `CURRENT: ${currentGear.name}`, {
      fontSize: `12px`,
      color: rarityColors[currentGear.rarity].text
    });
    this.tooltipContainer.add(currentHeader);
    const newHeader = this.add.text(20, 95, `NEW: ${newGear.name}`, {
      fontSize: `12px`,
      color: rarityColors[newGear.rarity].text
    });
    this.tooltipContainer.add(newHeader);
    let currentY = 50;
    Object.entries(currentGear.stats).forEach(([key, value]) => {
      this.tooltipContainer.add(this.add.text(25, currentY, `${key}: ${value}`, {
        fontSize: `11px`,
        color: `#cccccc`
      }));
      currentY += 15;
    });
    let newY = 110;
    Object.entries(newGear.stats).forEach(([key, value]) => {
      const isBetter = this.compareStats(currentGear.stats[key], value);
      this.tooltipContainer.add(this.add.text(25, newY, `${key}: ${value}`, {
        fontSize: `11px`,
        color: isBetter ? `#00ff00` : `#cccccc`
      }));
      newY += 15;
    });
    this.tooltipContainer.setDepth(1000);
  }
  compareStats(current, newStat) {
    const currentNum = parseFloat(current);
    const newNum = parseFloat(newStat);
    if (!isNaN(currentNum) && !isNaN(newNum)) {
      return newNum > currentNum;
    }
    return false;
  }
  hideComparisonTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }
}
class MarketScene extends BaseScene {
  constructor() {
    super({
      key: "MarketScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const modalWidth = 680;
    const modalHeight = height - 200;
    const modalX = width / 2 - modalWidth / 2;
    const modalY = 100;
    const modalBox = this.add.graphics();
    modalBox.fillStyle(0x000000, 0.95);
    modalBox.fillRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(3, 0x00ffff, 0.9);
    modalBox.strokeRect(modalX, modalY, modalWidth, modalHeight);
    modalBox.lineStyle(1, 0xff00ff, 0.4);
    modalBox.strokeRect(modalX + 3, modalY + 3, modalWidth - 6, modalHeight - 6);
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x00ffff, 0.12);
    headerBg.fillRect(modalX, modalY, modalWidth, 70);
    headerBg.lineStyle(1, 0x00ffff, 0.3);
    headerBg.lineBetween(modalX, modalY + 70, modalX + modalWidth, modalY + 70);
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const currencyBox = this.add.graphics();
    currencyBox.fillStyle(0x000000, 0.8);
    currencyBox.fillRect(width / 2 - 120, modalY + 50, 240, 30);
    currencyBox.lineStyle(2, 0xffdd00, 0.8);
    currencyBox.strokeRect(width / 2 - 120, modalY + 50, 240, 30);
    this.currencyText = this.add.text(width / 2, modalY + 65, `💎 ${currency}`, {
      fontSize: `18px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    const options = [{
      text: `COSMETIC SHOP`,
      desc: `Purchase unique player skins, auras, and visual effects`,
      icon: `🎨`,
      color: 0xff00ff,
      callback: () => {
        this.cameras.main.flash(100, 255, 0, 255, 0.2);
        this.scene.start(`ShopScene`);
      }
    }, {
      text: `UPGRADES`,
      desc: `Enhance abilities, boost stats, and unlock new powers`,
      icon: `⚡`,
      color: 0xffdd00,
      callback: () => {
        this.cameras.main.flash(100, 255, 221, 0, 0.2);
        this.scene.start(`UpgradesScene`);
      }
    }];
    const cardWidth = modalWidth - 60;
    const cardHeight = 120;
    const cardSpacing = 20;
    let yPos = modalY + 110;
    options.forEach((option, index) => {
      const cardY = yPos + index * (cardHeight + cardSpacing);
      this.createMarketCard(modalX + 30, cardY, cardWidth, cardHeight, option);
    });
    const footerBg = this.add.graphics();
    footerBg.fillStyle(0x000000, 0.4);
    footerBg.fillRect(modalX, modalY + modalHeight - 70, modalWidth, 70);
    footerBg.lineStyle(1, 0x00ffff, 0.2);
    footerBg.lineBetween(modalX, modalY + modalHeight - 70, modalX + modalWidth, modalY + modalHeight - 70);
    this.createButton(width / 2, modalY + modalHeight - 35, `BACK TO MENU`, () => {
      if (this.game.sounds?.click) this.game.sounds.click();
      this.scene.start(`MenuScene`);
    });
  }
  createMarketCard(x, y, cardWidth, cardHeight, option) {
    const cardContainer = this.add.container(x, y);
    const cardBg = this.add.graphics();
    const cardBorder = this.add.graphics();
    const cardGlow = this.add.graphics();
    const drawCard = (hover = false) => {
      cardBg.clear();
      cardBorder.clear();
      cardGlow.clear();
      if (hover) {
        cardGlow.fillStyle(option.color, 0.15);
        cardGlow.fillRect(-5, -5, cardWidth + 10, cardHeight + 10);
      }
      cardBg.fillStyle(0x0a0a1a, hover ? 0.9 : 0.7);
      cardBg.fillRect(0, 0, cardWidth, cardHeight);
      cardBg.fillStyle(option.color, 0.1);
      cardBg.fillRect(0, 0, cardWidth, 40);
      cardBorder.lineStyle(2, option.color, hover ? 0.9 : 0.5);
      cardBorder.strokeRect(0, 0, cardWidth, cardHeight);
      if (hover) {
        cardBorder.lineStyle(1, 0xffffff, 0.3);
        cardBorder.strokeRect(2, 2, cardWidth - 4, cardHeight - 4);
      }
    };
    drawCard(false);
    cardContainer.add([cardGlow, cardBg, cardBorder]);
    const iconBg = this.add.graphics();
    iconBg.fillStyle(option.color, 0.15);
    iconBg.fillCircle(50, 60, 28);
    iconBg.lineStyle(2, option.color, 0.4);
    iconBg.strokeCircle(50, 60, 28);
    const iconText = this.add.text(50, 60, option.icon, {
      fontSize: `40px`
    }).setOrigin(0.5);
    const colorHex = `#${option.color.toString(16).padStart(6, '0')}`;
    const titleText = this.add.text(100, 45, option.text, {
      fontSize: `20px`,
      color: `#ffffff`,
      fontStyle: `bold`
    }).setOrigin(0, 0.5);
    const enterButton = this.add.text(cardWidth - 20, 60, `VISIT →`, {
      fontSize: `16px`,
      color: colorHex,
      fontStyle: `bold`,
      backgroundColor: `#000000`,
      padding: {
        x: 15,
        y: 8
      }
    }).setOrigin(1, 0.5);
    cardContainer.add([iconBg, iconText, titleText, enterButton]);
    const hitArea = new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight);
    cardContainer.setSize(cardWidth, cardHeight);
    cardContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    cardContainer.input.cursor = 'pointer';
    cardContainer.on(`pointerover`, () => {
      drawCard(true);
      titleText.setColor(colorHex);
      enterButton.setColor(`#ffffff`);
      enterButton.setScale(1.08);
      this.tweens.add({
        targets: iconText,
        scale: 1.15,
        duration: 200,
        ease: `Back.easeOut`
      });
      if (this.game.sounds?.click) this.game.sounds.click();
    });
    cardContainer.on(`pointerout`, () => {
      drawCard(false);
      titleText.setColor(`#ffffff`);
      enterButton.setColor(colorHex);
      enterButton.setScale(1);
      this.tweens.add({
        targets: iconText,
        scale: 1,
        duration: 200,
        ease: `Back.easeIn`
      });
    });
    cardContainer.on(`pointerdown`, () => {
      this.cameras.main.flash(80, ...this.hexToRgb(option.color));
      option.callback();
    });
  }
  hexToRgb(color) {
    const r = color >> 16 & 0xFF;
    const g = color >> 8 & 0xFF;
    const b = color & 0xFF;
    return [r, g, b];
  }
  createButton(x, y, text, callback) {
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x000000, 0.7);
    buttonBg.fillRect(x - 120, y - 25, 240, 50);
    buttonBg.lineStyle(2, 0x00ffff, 0.8);
    buttonBg.strokeRect(x - 120, y - 25, 240, 50);
    const button = this.add.text(x, y, `${text}`, {
      fontSize: `24px`,
      color: `#00ffff`,
      stroke: `#ff00ff`,
      strokeThickness: 1
    });
    button.setOrigin(0.5);
    button.setInteractive({
      useHandCursor: true
    });
    button.on(`pointerover`, () => {
      button.setColor(`#ff00ff`);
      button.setStroke(`#00ffff`, 1);
      button.setScale(1.05);
      buttonBg.clear();
      buttonBg.fillStyle(0x00ffff, 0.2);
      buttonBg.fillRect(x - 120, y - 25, 240, 50);
      buttonBg.lineStyle(2, 0xff00ff, 1);
      buttonBg.strokeRect(x - 120, y - 25, 240, 50);
    });
    button.on(`pointerout`, () => {
      button.setColor(`#00ffff`);
      button.setStroke(`#ff00ff`, 1);
      button.setScale(1);
      buttonBg.clear();
      buttonBg.fillStyle(0x000000, 0.7);
      buttonBg.fillRect(x - 120, y - 25, 240, 50);
      buttonBg.lineStyle(2, 0x00ffff, 0.8);
      buttonBg.strokeRect(x - 120, y - 25, 240, 50);
    });
    button.on(`pointerdown`, callback);
  }
}
class GameModesScene extends BaseScene {
  constructor() {
    super({
      key: "GameModesScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 60, `[GAME MODES]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const subtitle = this.add.text(width / 2, 110, `>> TESTING PHASE <<`, {
      fontSize: `18px`,
      color: `#ff0066`,
      fontStyle: `bold`
    });
    subtitle.setOrigin(0.5);
    const modesBox = this.add.graphics();
    modesBox.fillStyle(0x000000, 0.5);
    modesBox.fillRect(width / 2 - 350, 150, 700, 400);
    modesBox.lineStyle(2, 0x00ffff, 0.6);
    modesBox.strokeRect(width / 2 - 350, 150, 700, 400);
    let yPos = 180;
    const modeData = [{
      name: `TIME ATTACK`,
      desc: `Score as much as possible in 60 seconds\nNo lives - pure speed and skill!`,
      callback: () => this.scene.start(`TimeAttackScene`)
    }, {
      name: `SURVIVAL`,
      desc: `Infinite lives but difficulty increases rapidly\nHow long can you last?`,
      callback: () => this.scene.start(`SurvivalScene`)
    }, {
      name: `PRECISION MODE`,
      desc: `Smaller catch area, 2x score multiplier\nPerfect timing required!`,
      callback: () => this.scene.start(`PrecisionScene`)
    }];
    modeData.forEach(mode => {
      const modeBox = this.add.graphics();
      modeBox.fillStyle(0x001122, 0.6);
      modeBox.fillRect(width / 2 - 320, yPos - 5, 640, 110);
      modeBox.lineStyle(2, 0x00ffff, 0.6);
      modeBox.strokeRect(width / 2 - 320, yPos - 5, 640, 110);
      const nameText = this.add.text(width / 2, yPos + 15, mode.name, {
        fontSize: `20px`,
        color: `#00ffff`,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 2
      });
      nameText.setOrigin(0.5);
      const descText = this.add.text(width / 2, yPos + 45, mode.desc, {
        fontSize: `16px`,
        color: `#ffffff`,
        align: `center`
      });
      descText.setOrigin(0.5);
      const playButton = this.add.text(width / 2, yPos + 80, `PLAY`, {
        fontSize: `18px`,
        color: `#00ffff`,
        backgroundColor: `#000000`,
        padding: {
          x: 30,
          y: 8
        }
      });
      playButton.setOrigin(0.5);
      playButton.setInteractive({
        useHandCursor: true
      });
      playButton.on(`pointerover`, () => {
        playButton.setColor(`#ffdd00`);
        playButton.setScale(1.05);
      });
      playButton.on(`pointerout`, () => {
        playButton.setColor(`#00ffff`);
        playButton.setScale(1);
      });
      playButton.on(`pointerdown`, mode.callback);
      yPos += 125;
    });
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
}
class TimeAttackScene extends BaseScene {
  constructor() {
    super({
      key: "TimeAttackScene"
    });
  }
  create() {
    super.create();
    this.score = 0;
    this.timeRemaining = 60;
    this.gameMode = `timeattack`;
    this.combo = 0;
    this.maxCombo = 0;
    this.itemsCaught = 0;
    this.goldCaught = 0;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.createCyberpunkBackground();
    this.setupObjectPools();
    this.createHUD(width, height);
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    this.player = this.add.sprite(width / 2, height - 50, `player_${currentSkin}`);
    this.player.setScale(0.25);
    this.player.speed = 500;
    this.cursors = this.input.keyboard.createCursorKeys();
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    this.catchEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 150,
        max: 250
      },
      scale: {
        start: 0.8 * quality.particles,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 800,
      emitting: false,
      tint: [0xffdd00, 0xff00ff]
    });
    this.trailEmitter = this.add.particles(0, 0, `particle`, {
      follow: this.player,
      scale: {
        start: 0.3 * quality.particles,
        end: 0
      },
      speed: 50,
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x00ff88,
      frequency: Math.floor(50 / quality.particles)
    });
    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true
    });
    this.input.keyboard.on(`keydown-ESC`, () => {
      this.scene.start(`MenuScene`);
    });
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        this.timerText.setText(`TIME: ${this.timeRemaining}s`);
        if (this.timeRemaining <= 10) {
          this.timerText.setColor(`#ff0066`);
        }
        if (this.timeRemaining <= 0) {
          this.gameOver();
        }
      },
      loop: true
    });
  }
  setupObjectPools() {
    const qualityLevel = this.performanceManager?.qualityLevel || 1;
    const maxItems = qualityLevel === 0 ? 8 : 15;
    const itemPoolSize = Math.max(maxItems + 5, qualityLevel === 0 ? 15 : qualityLevel === 1 ? 25 : 30);
    this.createOptimizedPool('items', () => {
      const item = this.add.sprite(0, 0, 'item_regular');
      item.setVisible(false);
      return item;
    }, item => {
      item.setPosition(0, -100);
      item.setVisible(false);
      item.speed = 0;
      item.itemType = null;
      item.value = 0;
    }, itemPoolSize);
  }
  spawnItem() {
    const width = this.cameras.main.width;
    const itemPool = this.getPool('items');
    if (itemPool.active.length >= 20) return;
    const x = Phaser.Math.Between(50, width - 50);
    const rand = Math.random();
    let itemType, itemValue, speed;
    if (rand < 0.35) {
      itemType = `gold`;
      itemValue = 50;
      speed = 280;
    } else if (rand < 0.6) {
      itemType = `silver`;
      itemValue = 20;
      speed = 320;
    } else {
      itemType = `regular`;
      itemValue = 10;
      speed = 350;
    }
    const item = itemPool.get();
    item.setPosition(x, -30);
    item.setTexture(`item_${itemType}`);
    item.speed = speed;
    item.itemType = itemType;
    item.value = itemValue;
  }
  update(time, delta) {
    super.update(time, delta);
    if (!this.cameras || !this.cameras.main) {
      return;
    }
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (this.cursors.left.isDown) {
      this.player.x -= this.player.speed * delta / 1000;
    } else if (this.cursors.right.isDown) {
      this.player.x += this.player.speed * delta / 1000;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
    const itemPool = this.getPool('items');
    if (itemPool && itemPool.active) {
      itemPool.active.forEach(item => {
        if (!item.active) return;
        item.y += item.speed * delta / 1000;
        if (Math.abs(item.x - this.player.x) < 40 && Math.abs(item.y - this.player.y) < 30) {
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.itemsCaught++;
          if (item.itemType === `gold`) this.goldCaught++;
          const comboMultiplier = Math.min(Math.floor(this.combo / 5) + 1, 5);
          const points = item.value * comboMultiplier;
          this.score += points;
          this.scoreText.setText(`SCORE: ${this.score}`);
          if (this.combo >= 5) {
            const comboColor = this.combo >= 15 ? `#ff0066` : this.combo >= 10 ? `#ff00ff` : `#ffdd00`;
            this.comboText.setText(`${this.combo}x COMBO!`);
            this.comboText.setColor(comboColor);
          } else {
            this.comboText.setText(``);
          }
          this.catchEmitter.setPosition(item.x, item.y);
          this.catchEmitter.setConfig({
            tint: item.itemType === `gold` ? [0xffdd00, 0xff8800] : [0x00ffff, 0xff00ff]
          });
          this.catchEmitter.explode(item.itemType === `gold` ? 30 : 20);
          if (this.game.sounds?.catch) this.game.sounds.catch();
          itemPool.release(item);
        }
        if (item.y > height) {
          this.missItem(item);
        }
      });
    }
  }
  createHUD(width, height) {
    const uiTheme = StorageManager.get(STORAGE_KEYS.UI_THEME, 'cyber');
    const themeConfig = CUSTOMIZATION_OPTIONS.uiThemes[uiTheme];
    const hudBg = this.add.graphics();
    const primaryColor = parseInt(themeConfig.primary.replace('#', '0x'));
    hudBg.lineStyle(2, primaryColor, 0.6);
    hudBg.strokeRect(10, 10, 250, 100);
    hudBg.strokeRect(width - 260, 10, 250, 100);
    this.scoreText = this.add.text(20, 20, `[SCORE: 0]`, {
      fontSize: `22px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.timerBg = this.add.graphics();
    this.updateTimerDisplay();
    this.timerText = this.add.text(width - 20, 20, `TIME: 60s`, {
      fontSize: `28px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(1, 0);
    this.comboText = this.add.text(width / 2, 30, ``, {
      fontSize: `32px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#00ffff`,
      strokeThickness: 3
    }).setOrigin(0.5, 0);
    this.add.text(width / 2, 70, `⏱️ SCORE AS MUCH AS POSSIBLE!`, {
      fontSize: `16px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0.5, 0);
    this.add.text(20, 55, `ITEMS: 0`, {
      fontSize: `16px`,
      color: `#ffffff`
    });
  }
  updateTimerDisplay() {
    const width = this.cameras.main.width;
    this.timerBg.clear();
    const progress = this.timeRemaining / 60;
    const color = this.timeRemaining <= 10 ? 0xff0066 : this.timeRemaining <= 30 ? 0xffdd00 : 0x00ff00;
    this.timerBg.fillStyle(color, 0.2);
    this.timerBg.fillRect(width - 250, 50, 230 * progress, 20);
    this.timerBg.lineStyle(2, color, 0.8);
    this.timerBg.strokeRect(width - 250, 50, 230, 20);
  }
  gameOver() {
    this.objectPools.forEach(pool => pool.clear());
    this.scene.start(`GameOverScene`, {
      score: this.score,
      level: 1,
      maxCombo: this.maxCombo,
      goldCaught: this.goldCaught,
      earnedCurrency: Math.floor(this.score / 8),
      itemsCaught: this.itemsCaught,
      gameTime: 60,
      gameMode: `timeattack`,
      missedItems: 0,
      earnedXP: Math.floor(this.score / 5)
    });
  }
}
class SurvivalScene extends BaseScene {
  constructor() {
    super({
      key: "SurvivalScene"
    });
  }
  create() {
    super.create();
    this.score = 0;
    this.survivalTime = 0;
    this.itemSpeed = 150;
    this.spawnRate = 1500;
    this.gameMode = `survival`;
    this.combo = 0;
    this.maxCombo = 0;
    this.itemsCaught = 0;
    this.goldCaught = 0;
    this.difficultyLevel = 1;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.createCyberpunkBackground();
    this.setupObjectPools();
    this.createHUD(width, height);
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    this.player = this.add.sprite(width / 2, height - 50, `player_${currentSkin}`);
    this.player.setScale(0.25);
    this.player.speed = 400;
    this.cursors = this.input.keyboard.createCursorKeys();
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    this.catchEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 150,
        max: 250
      },
      scale: {
        start: 0.8 * quality.particles,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 800,
      emitting: false,
      tint: [0xff0066, 0xff00ff]
    });
    this.trailEmitter = this.add.particles(0, 0, `particle`, {
      follow: this.player,
      scale: {
        start: 0.3 * quality.particles,
        end: 0
      },
      speed: 50,
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x00ff88,
      frequency: Math.floor(50 / quality.particles)
    });
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true
    });
    this.survivalTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.survivalTime++;
        this.timeText.setText(`TIME: ${this.survivalTime}s`);
        this.updateTimerDisplay();
        if (this.survivalTime % 10 === 0) {
          this.difficultyLevel++;
          this.itemSpeed += 25;
          this.spawnRate = Math.max(400, this.spawnRate - 100);
          this.spawnTimer.delay = this.spawnRate;
          this.showDifficultyIncrease();
        }
      },
      loop: true
    });
    this.input.keyboard.on(`keydown-ESC`, () => {
      this.scene.start(`MenuScene`);
    });
  }
  setupObjectPools() {
    const qualityLevel = this.performanceManager?.qualityLevel || 1;
    const itemPoolSize = qualityLevel === 0 ? 15 : qualityLevel === 1 ? 25 : 30;
    this.createOptimizedPool('items', () => {
      const item = this.add.sprite(0, 0, 'item_regular');
      item.setVisible(false);
      return item;
    }, item => {
      item.setPosition(0, -100);
      item.setVisible(false);
      item.speed = 0;
      item.itemType = null;
      item.value = 0;
    }, itemPoolSize);
  }
  showDifficultyIncrease() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.cameras.main.flash(200, 255, 0, 102);
    const diffText = this.add.text(width / 2, height / 2, `DIFFICULTY ${this.difficultyLevel}`, {
      fontSize: `42px`,
      color: `#ff0066`,
      fontStyle: `bold`,
      stroke: `#00ffff`,
      strokeThickness: 3
    }).setOrigin(0.5);
    this.tweens.add({
      targets: diffText,
      alpha: {
        from: 1,
        to: 0
      },
      scale: {
        from: 1,
        to: 1.5
      },
      duration: 1500,
      onComplete: () => diffText.destroy()
    });
  }
  spawnItem() {
    const width = this.cameras.main.width;
    const itemPool = this.getPool('items');
    if (itemPool.active.length >= 25) return;
    const spawnCount = this.difficultyLevel >= 5 ? 2 : 1;
    for (let i = 0; i < spawnCount; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const rand = Math.random();
      let itemType, itemValue;
      const bombChance = Math.min(0.25, 0.1 + this.difficultyLevel * 0.02);
      if (rand < bombChance) {
        itemType = `bomb`;
        itemValue = -100;
      } else if (rand < bombChance + 0.2) {
        itemType = `gold`;
        itemValue = 50;
      } else if (rand < bombChance + 0.35) {
        itemType = `silver`;
        itemValue = 20;
      } else {
        itemType = `regular`;
        itemValue = 10;
      }
      const item = itemPool.get();
      item.setPosition(x, -30);
      item.setTexture(`item_${itemType}`);
      item.speed = this.itemSpeed;
      item.itemType = itemType;
      item.value = itemValue;
    }
  }
  update(time, delta) {
    super.update(time, delta);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (this.cursors.left.isDown) {
      this.player.x -= this.player.speed * delta / 1000;
    } else if (this.cursors.right.isDown) {
      this.player.x += this.player.speed * delta / 1000;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
    const itemPool = this.getPool('items');
    itemPool.active.forEach(item => {
      if (!item.active) return;
      item.y += item.speed * delta / 1000;
      if (Math.abs(item.x - this.player.x) < 40 && Math.abs(item.y - this.player.y) < 30) {
        if (item.itemType === `bomb`) {
          this.gameOver();
          return;
        }
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.itemsCaught++;
        if (item.itemType === `gold`) this.goldCaught++;
        const comboMultiplier = Math.min(Math.floor(this.combo / 5) + 1, 5);
        const points = item.value * comboMultiplier;
        this.score += points;
        this.scoreText.setText(`[SCORE: ${this.score}]`);
        this.itemsText.setText(`ITEMS: ${this.itemsCaught}`);
        if (this.combo >= 5) {
          const comboColor = this.combo >= 15 ? `#ff0066` : this.combo >= 10 ? `#ff00ff` : `#ffdd00`;
          this.comboText.setText(`${this.combo}x COMBO!`);
          this.comboText.setColor(comboColor);
        } else {
          this.comboText.setText(``);
        }
        this.catchEmitter.setPosition(item.x, item.y);
        this.catchEmitter.setConfig({
          tint: item.itemType === `gold` ? [0xffdd00, 0xff8800] : [0x00ffff, 0xff00ff]
        });
        this.catchEmitter.explode(item.itemType === `gold` ? 30 : 20);
        if (this.game.sounds?.catch) this.game.sounds.catch();
        itemPool.release(item);
      }
      if (item.y > height) {
        if (item.itemType !== `bomb`) {
          this.combo = 0;
          this.comboText.setText(``);
        }
        itemPool.release(item);
      }
    });
  }
  createHUD(width, height) {
    const hudBg = this.add.graphics();
    hudBg.lineStyle(2, 0xff0066, 0.6);
    hudBg.strokeRect(10, 10, 250, 80);
    hudBg.strokeRect(width - 260, 10, 250, 80);
    this.scoreText = this.add.text(20, 20, `[SCORE: 0]`, {
      fontSize: `22px`,
      color: `#ff0066`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.itemsText = this.add.text(20, 50, `ITEMS: 0`, {
      fontSize: `16px`,
      color: `#ffffff`
    });
    this.timerBg = this.add.graphics();
    this.updateTimerDisplay();
    this.timeText = this.add.text(width - 20, 20, `TIME: 0s`, {
      fontSize: `28px`,
      color: `#00ff00`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(1, 0);
    this.difficultyText = this.add.text(width - 20, 55, `LEVEL 1`, {
      fontSize: `16px`,
      color: `#ffdd00`,
      fontStyle: `bold`
    }).setOrigin(1, 0);
    this.comboText = this.add.text(width / 2, 30, ``, {
      fontSize: `32px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#ff0066`,
      strokeThickness: 3
    }).setOrigin(0.5, 0);
    this.add.text(width / 2, 70, `💀 DODGE BOMBS - SURVIVE AS LONG AS POSSIBLE!`, {
      fontSize: `16px`,
      color: `#ff0066`,
      fontStyle: `bold`
    }).setOrigin(0.5, 0);
  }
  updateTimerDisplay() {
    const width = this.cameras.main.width;
    this.timerBg.clear();
    const progress = this.survivalTime % 10 / 10;
    const color = 0x00ff00;
    this.timerBg.fillStyle(color, 0.2);
    this.timerBg.fillRect(width - 250, 50, 230 * progress, 20);
    this.timerBg.lineStyle(2, color, 0.8);
    this.timerBg.strokeRect(width - 250, 50, 230, 20);
    this.difficultyText.setText(`LEVEL ${this.difficultyLevel}`);
  }
  gameOver() {
    this.objectPools.forEach(pool => pool.clear());
    this.scene.start(`GameOverScene`, {
      score: this.score,
      level: this.difficultyLevel,
      maxCombo: this.maxCombo,
      goldCaught: this.goldCaught,
      earnedCurrency: Math.floor(this.score / 8 + this.survivalTime * 2),
      itemsCaught: this.itemsCaught,
      gameTime: this.survivalTime,
      gameMode: `survival`,
      missedItems: 0,
      earnedXP: Math.floor(this.score / 5 + this.survivalTime * 3)
    });
  }
}
class PrecisionScene extends BaseScene {
  constructor() {
    super({
      key: "PrecisionScene"
    });
  }
  create() {
    super.create();
    this.score = 0;
    this.lives = 3;
    this.catchRadius = 20;
    this.gameMode = `precision`;
    this.combo = 0;
    this.maxCombo = 0;
    this.itemsCaught = 0;
    this.goldCaught = 0;
    this.perfectCatches = 0;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.createCyberpunkBackground();
    this.setupObjectPools();
    this.createHUD(width, height);
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    this.player = this.add.sprite(width / 2, height - 50, `player_${currentSkin}`);
    this.player.speed = 350;
    this.cursors = this.input.keyboard.createCursorKeys();
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    this.catchEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 200,
        max: 300
      },
      scale: {
        start: 1.0 * quality.particles,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 800,
      emitting: false,
      tint: [0xffdd00, 0xff00ff]
    });
    this.trailEmitter = this.add.particles(0, 0, `particle`, {
      follow: this.player,
      scale: {
        start: 0.3 * quality.particles,
        end: 0
      },
      speed: 50,
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0xff00ff,
      frequency: Math.floor(50 / quality.particles)
    });
    this.catchZone = this.add.circle(this.player.x, this.player.y, this.catchRadius);
    this.catchZone.setStrokeStyle(3, 0xff00ff, 0.8);
    this.catchZone.setFillStyle(0xff00ff, 0.15);
    this.catchZone.setDepth(10);
    this.tweens.add({
      targets: this.catchZone,
      alpha: {
        from: 0.8,
        to: 0.4
      },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    this.spawnTimer = this.time.addEvent({
      delay: 1500,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true
    });
    this.input.keyboard.on(`keydown-ESC`, () => {
      this.scene.start(`MenuScene`);
    });
  }
  setupObjectPools() {
    const qualityLevel = this.performanceManager?.qualityLevel || 1;
    const itemPoolSize = qualityLevel === 0 ? 10 : qualityLevel === 1 ? 15 : 20;
    this.createOptimizedPool('items', () => {
      const item = this.add.sprite(0, 0, 'item_regular');
      item.setVisible(false);
      return item;
    }, item => {
      item.setPosition(0, -100);
      item.setVisible(false);
      item.speed = 0;
      item.itemType = null;
      item.value = 0;
    }, itemPoolSize);
  }
  spawnItem() {
    const width = this.cameras.main.width;
    const itemPool = this.getPool('items');
    if (itemPool.active.length >= 12) return;
    const x = Phaser.Math.Between(80, width - 80);
    const rand = Math.random();
    let itemType, itemValue;
    if (rand < 0.3) {
      itemType = `gold`;
      itemValue = 100;
    } else if (rand < 0.5) {
      itemType = `silver`;
      itemValue = 40;
    } else {
      itemType = `regular`;
      itemValue = 20;
    }
    const item = itemPool.get();
    item.setPosition(x, -30);
    item.setTexture(`item_${itemType}`);
    item.speed = 180;
    item.itemType = itemType;
    item.value = itemValue;
  }
  update(time, delta) {
    super.update(time, delta);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (this.cursors.left.isDown) {
      this.player.x -= this.player.speed * delta / 1000;
    } else if (this.cursors.right.isDown) {
      this.player.x += this.player.speed * delta / 1000;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
    this.catchZone.setPosition(this.player.x, this.player.y);
    const itemPool = this.getPool('items');
    itemPool.active.forEach(item => {
      if (!item.active) return;
      item.y += item.speed * delta / 1000;
      const distance = Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y);
      if (distance < this.catchRadius) {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.itemsCaught++;
        if (item.itemType === `gold`) this.goldCaught++;
        const isPerfect = distance < this.catchRadius * 0.5;
        if (isPerfect) this.perfectCatches++;
        const comboMultiplier = Math.min(Math.floor(this.combo / 3) + 1, 10);
        const precisionBonus = isPerfect ? 3 : 2;
        const points = item.value * comboMultiplier * precisionBonus;
        this.score += points;
        this.scoreText.setText(`[SCORE: ${this.score}]`);
        this.perfectText.setText(`PERFECT: ${this.perfectCatches}`);
        if (this.combo >= 3) {
          const comboColor = this.combo >= 15 ? `#ff0066` : this.combo >= 10 ? `#ff00ff` : `#ffdd00`;
          this.comboText.setText(`${this.combo}x ${isPerfect ? 'PERFECT!' : 'COMBO!'}`);
          this.comboText.setColor(comboColor);
        } else {
          this.comboText.setText(isPerfect ? `PERFECT!` : ``);
        }
        this.catchEmitter.setPosition(item.x, item.y);
        this.catchEmitter.setConfig({
          tint: isPerfect ? [0xffffff, 0xffdd00] : item.itemType === `gold` ? [0xffdd00, 0xff8800] : [0xff00ff, 0x00ffff]
        });
        this.catchEmitter.explode(isPerfect ? 50 : 30);
        if (this.game.sounds?.catch) this.game.sounds.catch();
        this.cameras.main.flash(80, 255, isPerfect ? 255 : 221, 0, isPerfect ? 0.4 : 0.2);
        itemPool.release(item);
      }
      if (item.y > height) {
        this.lives--;
        this.combo = 0;
        this.comboText.setText(``);
        this.livesText.setText(`LIVES: ${`❤️`.repeat(Math.max(0, this.lives))}`);
        this.cameras.main.shake(200, 0.005);
        itemPool.release(item);
        if (this.lives <= 0) {
          this.gameOver();
        }
      }
    });
  }
  createHUD(width, height) {
    const hudBg = this.add.graphics();
    hudBg.lineStyle(2, 0xff00ff, 0.6);
    hudBg.strokeRect(10, 10, 280, 80);
    hudBg.strokeRect(width - 260, 10, 250, 80);
    this.scoreText = this.add.text(20, 20, `[SCORE: 0]`, {
      fontSize: `22px`,
      color: `#ff00ff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.perfectText = this.add.text(20, 50, `PERFECT: 0`, {
      fontSize: `16px`,
      color: `#ffdd00`,
      fontStyle: `bold`
    });
    this.livesText = this.add.text(width - 20, 20, `LIVES: ❤️❤️❤️`, {
      fontSize: `24px`,
      color: `#ff0066`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(1, 0);
    this.add.text(width - 20, 55, `CATCH RADIUS: ${this.catchRadius}px`, {
      fontSize: `14px`,
      color: `#888888`
    }).setOrigin(1, 0);
    this.comboText = this.add.text(width / 2, 30, ``, {
      fontSize: `36px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 3
    }).setOrigin(0.5, 0);
    this.add.text(width / 2, 70, `🎯 PRECISION REQUIRED - UP TO 10X MULTIPLIER!`, {
      fontSize: `16px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0.5, 0);
  }
  gameOver() {
    this.objectPools.forEach(pool => pool.clear());
    this.scene.start(`GameOverScene`, {
      score: this.score,
      level: 1,
      maxCombo: this.maxCombo,
      goldCaught: this.goldCaught,
      earnedCurrency: Math.floor(this.score / 6),
      itemsCaught: this.itemsCaught,
      gameTime: 0,
      gameMode: `precision`,
      missedItems: 3 - this.lives,
      earnedXP: Math.floor(this.score / 4 + this.perfectCatches * 5)
    });
  }
}
class GameScene extends BaseScene {
  constructor() {
    super({
      key: "GameScene"
    });
    this.resetGameState();
  }
  create() {
    super.create();
    this.resetGameState();
    this.currentAura = StorageManager.get(STORAGE_KEYS.AURA, `none`);
    const upgrades = StorageManager.get(STORAGE_KEYS.UPGRADES, {});
    const equippedGear = StorageManager.get(STORAGE_KEYS.EQUIPPED_GEAR, {});
    this.equippedGear = equippedGear;
    const playerLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const bonuses = LevelingSystem.getStatBonuses(playerLevel);
    this.lives = upgrades.extraLife ? 4 : 3;
    if (upgrades.startShield) {
      this.activePowerups.add(`shield`);
      this.shieldUses = 3 + bonuses.shieldBonus;
    }
    this.setDifficultyParams();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    this.createDynamicBackground();
    this.createHUD(width, height);
    this.setupObjectPools();
    this.chaosModeText = this.add.text(width / 2, height - 40, ``, {
      fontSize: `36px`,
      color: `#ff0066`,
      fontStyle: `bold`,
      stroke: `#00ffff`,
      strokeThickness: 2
    });
    this.chaosModeText.setOrigin(0.5);
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    this.player = this.add.sprite(width / 2, height - 50, `player_${currentSkin}`);
    this.player.setScale(0.15);
    const baseSpeed = 400;
    const speedUpgrade = upgrades.moveSpeed || 0;
    let speedBonus = 0;
    if (equippedGear.utility === `speed_boots`) {
      speedBonus = baseSpeed * 0.3;
    }
    const levelSpeedBonus = baseSpeed * (bonuses.speedMultiplier - 1);
    const fireRateUpgrade = upgrades.fireRate || 0;
    let fireRateBonus = 0;
    const dashUpgrade = upgrades.dashCooldown || 0;
    let dashCooldownBonus = 0;
    if (equippedGear.gun === `rapid_fire`) {
      fireRateBonus = 75;
    } else if (equippedGear.gun === `chain_lightning`) {
      fireRateBonus = 30;
    }
    if (equippedGear.utility === `turbo_dash`) {
      dashCooldownBonus = 300;
    }
    this.player.speed = baseSpeed + speedUpgrade * 50 + speedBonus + levelSpeedBonus;
    this.baseFireRate = Math.max(100, 300 - fireRateUpgrade * 50 - fireRateBonus);
    this.dashCooldownTime = Math.max(200, 1000 - dashUpgrade * 150 - dashCooldownBonus);
    let baseDashCharges = 1;
    if (equippedGear.utility === `double_dash`) {
      baseDashCharges = 2;
    }
    this.dashCharges = baseDashCharges;
    this.dashChargesRemaining = this.dashCharges;
    this.dashSpeedMultiplier = equippedGear.utility === `turbo_dash` ? 1.5 : 1;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors.left.on(`down`, () => this.handleDoubleTap(`left`));
    this.cursors.right.on(`down`, () => this.handleDoubleTap(`right`));
    this.cursors.left.on(`up`, () => this.endDash(`left`));
    this.cursors.right.on(`up`, () => this.endDash(`right`));
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on(`down`, () => this.onSpaceDown());
    this.spaceKey.on(`up`, () => this.onSpaceUp());
    this.input.keyboard.on(`keydown-ONE`, () => this.switchWeapon(`gun`));
    this.input.keyboard.on(`keydown-TWO`, () => this.switchWeapon(`net`));
    const itemPool = this.getPool('items');
    const projectilePool = this.getPool('projectiles');
    const powerupPool = this.getPool('powerups');
    this.items = itemPool ? itemPool.active : [];
    this.projectiles = projectilePool ? projectilePool.active : [];
    this.powerups = powerupPool ? powerupPool.active : [];
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0,
      effects: 1.0
    };
    const particleScale = Math.max(0.3, quality.particles);
    this.catchEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 150,
        max: 250
      },
      scale: {
        start: 0.8 * quality.particles,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 800 * quality.effects,
      emitting: false,
      alpha: {
        start: 1 * quality.particles,
        end: 0
      }
    });
    this.missEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 50,
        max: 150
      },
      scale: {
        start: 0.5 * quality.particles,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 400,
      emitting: false,
      tint: 0xff0000
    });
    this.trailEmitter = this.add.particles(0, 0, `particle`, {
      follow: this.player,
      scale: {
        start: 0.3 * quality.particles,
        end: 0
      },
      speed: 50,
      lifespan: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x00ff88,
      frequency: Math.max(30, Math.floor(50 / quality.particles))
    });
    this.setupAuraEffect();
    this.setupDebrisSystem();
    this.dashEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 100,
        max: 200
      },
      scale: {
        start: 0.6 * particleScale,
        end: 0
      },
      lifespan: 400,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x00ffff, 0xff00ff],
      emitting: false,
      maxParticles: quality.particles > 0.5 ? 50 : 25
    });
    this.nearMissEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 20,
        max: 50
      },
      scale: {
        start: 0.4 * quality.particles,
        end: 0
      },
      lifespan: 300,
      emitting: false,
      tint: 0xffff00
    });
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnRate,
      callback: this.spawnItem,
      callbackScope: this,
      loop: true
    });
    this.powerupTimer = this.time.addEvent({
      delay: 8000,
      callback: this.spawnPowerup,
      callbackScope: this,
      loop: true
    });
    this.hazardTimer = this.time.addEvent({
      delay: 12000,
      callback: this.spawnEnvironmentalHazard,
      callbackScope: this,
      loop: true
    });
    this.input.keyboard.on(`keydown-ESC`, () => {
      this.scene.pause();
      this.scene.launch(`PauseScene`);
    });
    this.netSprite = this.add.sprite(this.player.x, this.player.y - 40, `net`);
    this.netSprite.setVisible(false);
    this.netSprite.setAlpha(0.6);
    this.netSprite.setScale(1);
    this.netSprite.setDepth(100);
  }
  setupObjectPools() {
    const qualityLevel = this.performanceManager?.qualityLevel || 1;
    const poolSizes = {
      items: [15, 25, 30],
      projectiles: [8, 12, 15],
      powerups: [3, 5, 8]
    };
    const createPool = (key, texture, resetFunc, sizes) => {
      this.createOptimizedPool(key, () => this.add.sprite(0, 0, texture).setVisible(false), resetFunc, sizes[qualityLevel] || sizes[1]);
    };
    createPool('items', 'item_regular', item => {
      Object.assign(item, {
        x: 0,
        y: -100,
        visible: false,
        speed: 0,
        itemType: null,
        value: 0
      });
    }, poolSizes.items);
    createPool('projectiles', 'bullet', proj => {
      Object.assign(proj, {
        x: 0,
        y: -100,
        visible: false,
        speed: 0
      });
    }, poolSizes.projectiles);
    createPool('powerups', 'powerup', pow => {
      Object.assign(pow, {
        x: 0,
        y: -100,
        visible: false,
        speed: 0,
        type: 0
      });
    }, poolSizes.powerups);
  }
  onSpaceDown() {
    if (this.currentWeapon === `gun`) {
      this.fireGun();
    } else if (this.currentWeapon === `net`) {
      const currentTime = this.time.now;
      if (currentTime - this.projectileCooldown < 5000) {
        return;
      }
      this.netCharging = true;
      this.netCharge = 0;
      this.netSprite.setVisible(true);
      this.netSprite.setPosition(this.player.x, this.player.y - 40);
      this.netSprite.setScale(0.5);
      this.netSprite.setAlpha(0.8);
    }
  }
  onSpaceUp() {
    if (this.currentWeapon === `net` && this.netCharging) {
      this.launchNet();
    }
  }
  fireGun() {
    const currentTime = this.time.now;
    if (currentTime - this.projectileCooldown < this.baseFireRate) {
      return;
    }
    if (this.game.sounds?.shoot) this.game.sounds.shoot();
    this.projectileCooldown = currentTime;
    const weaponVisual = StorageManager.get(STORAGE_KEYS.WEAPON_VISUAL, 'default');
    const weaponConfig = CUSTOMIZATION_OPTIONS.weaponVisuals[weaponVisual];
    const bullet = this.getPool('projectiles').get();
    bullet.setPosition(this.player.x, this.player.y - 20);
    bullet.setTexture('bullet');
    bullet.setTint(weaponConfig.bulletColor);
    bullet.speed = 600;
    bullet.piercing = this.equippedGear.gun === `piercing_gun`;
    bullet.explosive = this.equippedGear.gun === `explosive_rounds`;
    bullet.chain = this.equippedGear.gun === `chain_lightning`;
    bullet.chainCount = 0;
    bullet.isChaining = false;
    bullet.vx = 0;
    bullet.vy = 0;
    const r = weaponConfig.bulletColor >> 16 & 0xFF;
    const g = weaponConfig.bulletColor >> 8 & 0xFF;
    const b = weaponConfig.bulletColor & 0xFF;
    this.cameras.main.flash(50, r, g, b, 0.1);
    this.catchEmitter.setPosition(this.player.x, this.player.y - 20);
    this.catchEmitter.setConfig({
      tint: weaponConfig.bulletColor
    });
    this.catchEmitter.explode(5);
  }
  launchNet() {
    this.netCharging = false;
    this.projectileCooldown = this.time.now;
    const weaponVisual = StorageManager.get(STORAGE_KEYS.WEAPON_VISUAL, 'default');
    const weaponConfig = CUSTOMIZATION_OPTIONS.weaponVisuals[weaponVisual];
    let finalScale = 0.5 + this.netCharge / this.netMaxCharge * 2.5;
    if (this.equippedGear.net === `wide_net`) {
      finalScale *= 1.5;
    } else if (this.equippedGear.net === `mega_net`) {
      finalScale *= 2;
    }
    this.netSprite.setScale(finalScale);
    this.netSprite.setTint(weaponConfig.netColor);
    this.launchedNet = {
      sprite: this.netSprite,
      speed: 400,
      scale: finalScale,
      radius: finalScale * 40
    };
    const r = weaponConfig.netColor >> 16 & 0xFF;
    const g = weaponConfig.netColor >> 8 & 0xFF;
    const b = weaponConfig.netColor & 0xFF;
    this.cameras.main.flash(100, r, g, b, 0.2);
    this.catchEmitter.setPosition(this.netSprite.x, this.netSprite.y);
    this.catchEmitter.setConfig({
      tint: weaponConfig.netColor
    });
    this.catchEmitter.explode(20);
  }
  switchWeapon(weaponType) {
    this.currentWeapon = weaponType;
    this.weaponText.setText(`[${weaponType.toUpperCase()}]`);
    this.weaponText.setColor(weaponType === `gun` ? `#00ffff` : `#ffdd00`);
    this.cameras.main.flash(80, weaponType === `gun` ? 0 : 255, weaponType === `gun` ? 255 : 221, weaponType === `gun` ? 255 : 0, 0.2);
  }
  spawnItem() {
    const width = this.cameras.main.width;
    const spawnCount = this.isChaosMode ? Phaser.Math.Between(1, 2) : 1;
    const maxItems = this.performanceManager?.qualityLevel === 0 ? 8 : 15;
    if (this.items.length >= maxItems) return;
    for (let i = 0; i < spawnCount; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      let itemType = `regular`;
      let itemValue = 10;
      let speed = this.itemSpeed;
      const rand = Math.random();
      if (rand < 0.13) {
        itemType = `bomb`;
        itemValue = -50;
      } else if (rand < 0.22) {
        itemType = `gold`;
        itemValue = 50;
      } else if (rand < 0.35) {
        itemType = `silver`;
        itemValue = 20;
      } else if (rand < 0.40) {
        itemType = `giant`;
        itemValue = 100;
        speed = this.itemSpeed * 0.6;
      } else if (rand < 0.43) {
        itemType = `glitch`;
        itemValue = 30;
      } else if (rand < 0.46) {
        itemType = `multiplier`;
        itemValue = 20;
      } else if (rand < 0.48) {
        itemType = `virus`;
        itemValue = -30;
      } else if (rand < 0.50) {
        itemType = `freeze`;
        itemValue = 25;
      } else if (rand < 0.52) {
        itemType = `health`;
        itemValue = 0;
      } else if (rand < 0.54) {
        itemType = `mystery`;
        itemValue = 0;
      }
      const item = this.getPool('items').get();
      item.setPosition(x, -30);
      item.setTexture(`item_${itemType}`);
      item.speed = speed;
      item.itemType = itemType;
      item.value = itemValue;
      item.affectedByGravity = true;
      if (itemType === `giant`) {
        item.setScale(1);
      }
      if (this.isChaosMode) {
        this.time.delayedCall(i * 150, () => {});
      }
    }
  }
  spawnPowerup() {
    const width = this.cameras.main.width;
    const x = Phaser.Math.Between(50, width - 50);
    const adjustedSpawnRate = Math.max(5000, 8000 - this.performanceScore * 100);
    this.powerupTimer.delay = adjustedSpawnRate;
    const powerupTypes = [{
      type: 0,
      texture: `powerup`
    }, {
      type: 1,
      texture: `powerup`
    }, {
      type: 2,
      texture: `powerup`
    }, {
      type: 3,
      texture: `powerup_timewarp`
    }, {
      type: 4,
      texture: `powerup_converter`
    }, {
      type: 5,
      texture: `powerup_hyperdash`
    }, {
      type: 6,
      texture: `powerup_blackhole`
    }];
    const selected = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];
    const powerup = this.getPool('powerups').get();
    powerup.setPosition(x, -40);
    powerup.setTexture(selected.texture);
    powerup.speed = 150;
    powerup.type = selected.type;
  }
  handleDoubleTap(direction) {
    const currentTime = this.time.now;
    const doubleTapWindow = 300;
    if (currentTime - this.dashCooldown < this.dashCooldownTime) {
      return;
    }
    if (direction === `left`) {
      if (currentTime - this.lastLeftTap < doubleTapWindow && !this.isDashing) {
        this.startDash(`left`);
        this.lastLeftTap = 0;
      } else {
        this.lastLeftTap = currentTime;
      }
    } else if (direction === `right`) {
      if (currentTime - this.lastRightTap < doubleTapWindow && !this.isDashing) {
        this.startDash(`right`);
        this.lastRightTap = 0;
      } else {
        this.lastRightTap = currentTime;
      }
    }
  }
  startDash(direction) {
    if (this.dashChargesRemaining <= 0) return;
    this.isDashing = true;
    this.dashDirection = direction;
    this.dashChargesRemaining--;
    this.cameras.main.flash(80, 0, 255, 255, 0.2);
    this.trailEmitter.setFrequency(15);
    this.trailEmitter.setConfig({
      scale: {
        start: 0.5,
        end: 0
      },
      tint: [0x00ffff, 0xff00ff]
    });
  }
  endDash(direction) {
    if (this.isDashing && this.dashDirection === direction) {
      this.isDashing = false;
      this.dashDirection = null;
      this.dashCooldown = this.time.now;
      this.trailEmitter.setFrequency(50);
      this.trailEmitter.setConfig({
        scale: {
          start: 0.3,
          end: 0
        },
        tint: 0x00ff88
      });
    }
  }
  updateDashCharges() {
    if (!this.isDashing) {
      const currentTime = this.time.now;
      if (this.dashChargesRemaining < this.dashCharges && currentTime - this.dashCooldown > this.dashCooldownTime) {
        this.dashChargesRemaining = this.dashCharges;
      }
    }
  }
  setupAuraEffect() {
    if (this.auraEmitter && this.auraEmitter.active) {
      this.auraEmitter.destroy();
      this.auraEmitter = null;
    }
    const quality = this.performanceManager && typeof this.performanceManager.getQualitySettings === 'function' ? this.performanceManager.getQualitySettings() : {
      particles: 1.0
    };
    const auraConfigs = {
      none: null,
      flame: {
        tint: [0xff0066, 0xff6600],
        scale: {
          start: 0.4 * quality.particles,
          end: 0
        },
        frequency: Math.floor(30 / quality.particles),
        lifespan: 400
      },
      frost: {
        tint: [0x00ddff, 0x66ffff],
        scale: {
          start: 0.3 * quality.particles,
          end: 0
        },
        frequency: Math.floor(40 / quality.particles),
        lifespan: 500
      },
      electric: {
        tint: [0xffff00, 0x00ffff],
        scale: {
          start: 0.5 * quality.particles,
          end: 0
        },
        frequency: Math.floor(20 / quality.particles),
        lifespan: 300
      }
    };
    if (this.currentAura !== `none` && auraConfigs[this.currentAura]) {
      const config = auraConfigs[this.currentAura];
      this.auraEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: config.scale,
        speed: {
          min: 20,
          max: 60
        },
        lifespan: config.lifespan,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: config.frequency,
        alpha: {
          start: 0.8 * quality.particles,
          end: 0
        }
      });
    }
  }
  resetGameState() {
    Object.assign(this, {
      score: 0,
      level: 1,
      lives: 3,
      combo: 0,
      maxCombo: 0,
      goldCaught: 0,
      bombsDestroyed: 0,
      perfectStreak: 0,
      itemsCaught: 0,
      earnedCurrency: 0,
      scoreMultiplier: 1,
      overcharge: 0,
      missedItems: 0,
      itemSpeed: 200,
      spawnRate: 1500,
      performanceScore: 0,
      missStreak: 0,
      isChaosMode: false,
      lastLeftTap: 0,
      lastRightTap: 0,
      dashCooldown: 0,
      currentWeapon: 'gun',
      projectileCooldown: 0,
      netCharge: 0,
      netMaxCharge: 2000,
      currentAura: 'none',
      blackHoleX: 0,
      blackHoleY: 0,
      isDashing: false,
      dashDirection: null,
      netActive: false,
      netCharging: false,
      glitchActive: false,
      virusActive: false,
      overchargeActive: false,
      blackHoleActive: false,
      controlsReversed: false,
      launchedNet: null,
      activePowerups: new Set(),
      powerupsCollected: {},
      recentCatches: [],
      environmentalHazards: [],
      debrisObjects: [],
      gameStartTime: Date.now()
    });
  }
  setDifficultyParams() {
    const difficulty = StorageManager.get(STORAGE_KEYS.DIFFICULTY, `normal`);
    const params = {
      easy: {
        speed: 150,
        spawn: 2000
      },
      normal: {
        speed: 200,
        spawn: 1500
      },
      hard: {
        speed: 250,
        spawn: 1000
      }
    };
    const {
      speed,
      spawn
    } = params[difficulty] || params.normal;
    this.itemSpeed = speed;
    this.spawnRate = spawn;
  }
  getDifficulty() {
    return StorageManager.get(STORAGE_KEYS.DIFFICULTY, `normal`);
  }
  getSkin() {
    return StorageManager.get(STORAGE_KEYS.SKIN, `default`);
  }
  spawnEnvironmentalHazard() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const hazardType = Math.random() > 0.5 ? `spike` : `gravity`;
    if (hazardType === `spike`) {
      const x = Phaser.Math.Between(100, width - 100);
      const warningZone = this.add.graphics();
      warningZone.lineStyle(2, 0xff0066, 0.6);
      warningZone.strokeRect(x - 20, height - 70, 40, 40);
      warningZone.setDepth(-1);
      this.tweens.add({
        targets: warningZone,
        alpha: {
          from: 0,
          to: 1
        },
        duration: 500,
        yoyo: true,
        repeat: 2
      });
      this.time.delayedCall(1500, () => {
        warningZone.destroy();
      });
      const spike = this.add.sprite(x, height - 30, `spike`);
      spike.setAlpha(0);
      spike.hazardType = `spike`;
      spike.active = false;
      this.tweens.add({
        targets: spike,
        alpha: 0.8,
        y: height - 50,
        duration: 500,
        onComplete: () => {
          spike.active = true;
          this.time.delayedCall(2000, () => {
            this.tweens.add({
              targets: spike,
              alpha: 0,
              y: height - 30,
              duration: 300,
              onComplete: () => {
                const index = this.environmentalHazards.indexOf(spike);
                if (index > -1) this.environmentalHazards.splice(index, 1);
                spike.destroy();
              }
            });
          });
        }
      });
      this.environmentalHazards.push(spike);
    }
  }
  createDynamicBackground() {
    if (!this.cameras || !this.cameras.main) {
      return;
    }
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    for (let i = 0; i < 2; i++) {
      const building = this.add.graphics();
      building.fillStyle(0x001133, 0.3);
      const bWidth = Phaser.Math.Between(80, 150);
      const bHeight = Phaser.Math.Between(200, 400);
      const bX = Phaser.Math.Between(0, width);
      building.fillRect(bX, height - bHeight, bWidth, bHeight);
      building.setDepth(-2);
    }
    this.vehicleSpawnTimer = this.time.addEvent({
      delay: 20000,
      callback: () => this.spawnFlyingVehicle(),
      loop: true
    });
  }
  spawnFlyingVehicle() {
    const width = this.cameras.main.width;
    const vehicle = this.add.graphics();
    const startX = -50;
    const y = Phaser.Math.Between(50, 200);
    vehicle.fillStyle(0x00ffff, 0.4);
    vehicle.fillRect(0, 0, 40, 15);
    vehicle.x = startX;
    vehicle.y = y;
    vehicle.setDepth(-1);
    this.tweens.add({
      targets: vehicle,
      x: width + 50,
      duration: 10000,
      onComplete: () => vehicle.destroy()
    });
  }
  setupDebrisSystem() {
    this.debrisSpawnTimer = this.time.addEvent({
      delay: Phaser.Math.Between(8000, 15000),
      callback: () => this.spawnDebris(),
      loop: true
    });
  }
  spawnDebris() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const startFromLeft = Math.random() > 0.5;
    const startX = startFromLeft ? -100 : width + 100;
    const endX = startFromLeft ? width + 100 : -100;
    const y = Phaser.Math.Between(100, height - 200);
    const debris = this.add.graphics();
    debris.fillStyle(0x666666, 0.3);
    const size = Phaser.Math.Between(20, 50);
    debris.fillRect(0, 0, size, size);
    debris.setPosition(startX, y);
    debris.setDepth(-1);
    debris.setAlpha(Phaser.Math.FloatBetween(0.2, 0.4));
    const rotationSpeed = Phaser.Math.FloatBetween(-0.3, 0.3);
    const duration = Phaser.Math.Between(15000, 25000);
    const verticalDrift = Phaser.Math.Between(-50, 50);
    this.debrisObjects.push(debris);
    this.tweens.add({
      targets: debris,
      x: endX,
      y: y + verticalDrift,
      rotation: rotationSpeed * Math.PI * 4,
      alpha: {
        from: debris.alpha,
        to: 0
      },
      duration: duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        const index = this.debrisObjects.indexOf(debris);
        if (index > -1) {
          this.debrisObjects.splice(index, 1);
        }
        debris.destroy();
      }
    });
    this.debrisSpawnTimer.delay = Phaser.Math.Between(8000, 15000);
  }
  update(time, delta) {
    super.update(time, delta);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (this.combo >= 5 && !this.comboWarningTween) {
      const timeSinceLastCatch = Date.now() - (this.lastCatchTime || Date.now());
      if (timeSinceLastCatch > 3000) {
        this.comboWarningText.setText(`COMBO FADING!`);
        this.comboWarningTween = this.tweens.add({
          targets: this.comboWarningText,
          alpha: {
            from: 1,
            to: 0.3
          },
          duration: 300,
          yoyo: true,
          repeat: -1
        });
      }
    }
    this.environmentalHazards = this.environmentalHazards.filter(h => h.active === true || h.hazardType === `gravity`);
    if (this.currentWeapon === `net`) {
      const timeSinceLastShot = time - this.projectileCooldown;
      const cooldownTime = 5000;
      if (timeSinceLastShot < cooldownTime) {
        this.cooldownBarBg.setVisible(true);
        this.cooldownBar.setVisible(true);
        const progress = timeSinceLastShot / cooldownTime;
        const barWidth = 200 * progress;
        this.cooldownBar.clear();
        const colorProgress = progress;
        const red = Math.floor(255 * (1 - colorProgress));
        const green = Math.floor(221 * colorProgress);
        const color = red << 16 | green << 8 | 0;
        this.cooldownBar.fillStyle(color, 0.8);
        this.cooldownBar.fillRect(width / 2 - 100, height - 65, barWidth, 8);
        this.cooldownBar.lineStyle(2, 0xffdd00, progress);
        this.cooldownBar.strokeRect(width / 2 - 100, height - 65, barWidth, 8);
      } else {
        this.cooldownBarBg.setVisible(false);
        this.cooldownBar.setVisible(false);
      }
    } else {
      this.cooldownBarBg.setVisible(false);
      this.cooldownBar.setVisible(false);
    }
    if (this.netCharging) {
      this.netCharge = Math.min(this.netCharge + delta, this.netMaxCharge);
      const scale = 0.5 + this.netCharge / this.netMaxCharge * 2.5;
      this.netSprite.setScale(scale);
      this.netSprite.setPosition(this.player.x, this.player.y - 40);
      const alpha = 0.4 + this.netCharge / this.netMaxCharge * 0.4;
      this.netSprite.setAlpha(alpha);
    }
    if (this.launchedNet) {
      this.launchedNet.sprite.y -= this.launchedNet.speed * delta / 1000;
      this.items.forEach(item => {
        if (item.itemType !== `bomb`) {
          const distance = Phaser.Math.Distance.Between(this.launchedNet.sprite.x, this.launchedNet.sprite.y, item.x, item.y);
          if (distance < this.launchedNet.radius) {
            this.catchItem(item);
          }
        }
      });
      if (this.launchedNet.sprite.y < -100) {
        this.launchedNet.sprite.setVisible(false);
        this.launchedNet.sprite.setScale(1);
        this.launchedNet.sprite.setAlpha(0.6);
        this.launchedNet = null;
        this.netSprite.setVisible(false);
      }
    }
    const moveSpeed = this.activePowerups.has(`hyperdash`) ? this.player.speed * 2 : this.player.speed;
    if (this.isDashing) {
      const dashSpeed = moveSpeed * 2.5 * this.dashSpeedMultiplier;
      const direction = this.dashDirection === `left` ? -1 : 1;
      this.player.x += direction * dashSpeed * delta / 1000;
      this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
      if (time % 100 < 50) {
        this.dashEmitter.setPosition(this.player.x, this.player.y);
        this.dashEmitter.explode(3);
      }
    } else {
      const leftPressed = this.controlsReversed ? this.cursors.right.isDown : this.cursors.left.isDown;
      const rightPressed = this.controlsReversed ? this.cursors.left.isDown : this.cursors.right.isDown;
      if (leftPressed) {
        this.player.x -= moveSpeed * delta / 1000;
      } else if (rightPressed) {
        this.player.x += moveSpeed * delta / 1000;
      }
      this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
    }
    let hasPassiveMagnet = this.equippedGear.utility === `magnet_gloves`;
    const projectilePool = this.getPool('projectiles');
    projectilePool.active.forEach(projectile => {
      if (!projectile.active) return;
      projectile.y -= projectile.speed * delta / 1000;
      let hitSomething = false;
      this.items.forEach(item => {
        if (!item.active) return;
        if (item.itemType === `bomb` && Math.abs(projectile.x - item.x) < 20 && Math.abs(projectile.y - item.y) < 20) {
          this.destroyBomb(item, projectile);
          if (projectile.explosive) {
            this.items.forEach(nearbyItem => {
              const distance = Phaser.Math.Distance.Between(item.x, item.y, nearbyItem.x, nearbyItem.y);
              if (distance < 80 && nearbyItem.itemType === `bomb` && nearbyItem !== item) {
                this.destroyBomb(nearbyItem, projectile);
              }
            });
          }
          if (projectile.chain && projectile.chainCount < 2) {
            let nearestBomb = null;
            let nearestDist = 100;
            this.items.forEach(nearbyItem => {
              if (nearbyItem.itemType === `bomb` && nearbyItem !== item) {
                const distance = Phaser.Math.Distance.Between(item.x, item.y, nearbyItem.x, nearbyItem.y);
                if (distance < nearestDist) {
                  nearestDist = distance;
                  nearestBomb = nearbyItem;
                }
              }
            });
            if (nearestBomb) {
              const chainBullet = projectilePool.get();
              chainBullet.setPosition(item.x, item.y);
              chainBullet.setTexture('bullet');
              const weaponVisual = StorageManager.get(STORAGE_KEYS.WEAPON_VISUAL, 'default');
              const weaponConfig = CUSTOMIZATION_OPTIONS.weaponVisuals[weaponVisual];
              chainBullet.setTint(weaponConfig.bulletColor);
              chainBullet.speed = 800;
              chainBullet.chain = true;
              chainBullet.chainCount = projectile.chainCount + 1;
              chainBullet.piercing = false;
              chainBullet.explosive = false;
              const angle = Phaser.Math.Angle.Between(item.x, item.y, nearestBomb.x, nearestBomb.y);
              chainBullet.targetX = nearestBomb.x;
              chainBullet.targetY = nearestBomb.y;
              chainBullet.vx = Math.cos(angle) * chainBullet.speed;
              chainBullet.vy = Math.sin(angle) * chainBullet.speed;
              chainBullet.isChaining = true;
            }
          }
          if (!projectile.piercing) {
            hitSomething = true;
          }
        }
      });
      if (projectile.isChaining) {
        projectile.x += projectile.vx * delta / 1000;
        projectile.y += projectile.vy * delta / 1000;
      }
      if (projectile.y < -20 || hitSomething && !projectile.piercing) {
        projectilePool.release(projectile);
      }
    });
    this.updateDashCharges();
    let baseSpeedMultiplier = 1;
    if (this.activePowerups.has(`slowmo`)) baseSpeedMultiplier *= 0.3;
    if (this.activePowerups.has(`timewarp`)) baseSpeedMultiplier *= 0.15;
    if (this.equippedGear.utility === `time_dilation`) baseSpeedMultiplier *= 0.8;
    const chaosMultiplier = this.isChaosMode ? 1.3 : 1;
    const speedMultiplier = baseSpeedMultiplier * chaosMultiplier;
    const itemPool = this.getPool('items');
    itemPool.active.forEach(item => {
      if (!item.active) return;
      let itemSpeedMult = speedMultiplier;
      if (this.blackHoleActive) {
        const distance = Phaser.Math.Distance.Between(item.x, item.y, this.blackHoleX, this.blackHoleY);
        if (distance < 300) {
          const angle = Phaser.Math.Angle.Between(item.x, item.y, this.blackHoleX, this.blackHoleY);
          const pull = (1 - distance / 300) * 400;
          item.x += Math.cos(angle) * pull * delta / 1000;
          item.y += Math.sin(angle) * pull * delta / 1000;
          if (distance < 30) {
            this.catchItem(item);
            return;
          }
        }
      }
      item.y += item.speed * itemSpeedMult * delta / 1000;
      const hasMagnetPowerup = this.activePowerups.has(`magnet`);
      if ((hasMagnetPowerup || hasPassiveMagnet) && item.itemType !== `bomb`) {
        const magnetRange = hasMagnetPowerup ? 200 : 120;
        const magnetStrength = hasMagnetPowerup ? 300 : 150;
        const distance = Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y);
        if (distance < magnetRange) {
          const angle = Phaser.Math.Angle.Between(item.x, item.y, this.player.x, this.player.y);
          item.x += Math.cos(angle) * magnetStrength * delta / 1000;
          item.y += Math.sin(angle) * magnetStrength * delta / 1000;
        }
      }
      const catchRadius = item.itemType === `giant` ? 60 : 40;
      const catchHeight = item.itemType === `giant` ? 50 : 30;
      if (this.netActive && item.itemType !== `bomb`) {
        const netDistance = Phaser.Math.Distance.Between(item.x, item.y, this.netSprite.x, this.netSprite.y);
        if (netDistance < 100) {
          this.catchItem(item);
          return;
        }
      }
      if (Math.abs(item.x - this.player.x) < catchRadius && Math.abs(item.y - this.player.y) < catchHeight) {
        this.catchItem(item);
      } else if (item.y > height - 40 && item.y < height && Math.abs(item.x - this.player.x) > 60) {
        this.nearMiss(item);
      }
      if (item.y > height) {
        this.missItem(item);
      }
      this.environmentalHazards.forEach(hazard => {
        if (hazard.hazardType === `spike` && hazard.active) {
          if (Math.abs(item.x - hazard.x) < 20 && item.y > height - 80 && item.y < height - 40) {
            this.catchEmitter.setPosition(item.x, item.y);
            this.catchEmitter.setConfig({
              tint: 0xff0066
            });
            this.catchEmitter.explode(20);
            itemPool.release(item);
          }
        }
      });
    });
    this.environmentalHazards.forEach(hazard => {
      if (hazard.hazardType === `spike` && hazard.active) {
        if (Math.abs(this.player.x - hazard.x) < 30 && !this.isDashing) {
          if (!this.activePowerups.has(`shield`)) {
            this.lives--;
            this.livesText.setText(`LIVES: ${`❤️`.repeat(Math.max(0, this.lives))}`);
            this.cameras.main.shake(300, 0.008);
            hazard.active = false;
            if (this.lives <= 0) {
              this.gameOver();
            }
          } else {
            this.shieldUses--;
            if (this.shieldUses <= 0) {
              this.activePowerups.delete(`shield`);
              this.updatePowerupDisplay();
            }
            hazard.active = false;
          }
        }
      }
    });
    const powerupPool = this.getPool('powerups');
    if (powerupPool && powerupPool.active) {
      powerupPool.active.forEach(powerup => {
        if (!powerup.active) return;
        powerup.y += powerup.speed * delta / 1000;
        powerup.rotation += delta / 1000;
        if (Math.abs(powerup.x - this.player.x) < 50 && Math.abs(powerup.y - this.player.y) < 35) {
          this.collectPowerup(powerup);
        }
        if (powerup.y > height) {
          powerupPool.release(powerup);
        }
      });
    }
  }
  destroyBomb(bomb, projectile) {
    this.score += 25;
    this.bombsDestroyed++;
    this.earnedCurrency += 2;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.updateChallenges();
    this.catchEmitter.setPosition(bomb.x, bomb.y);
    this.catchEmitter.setConfig({
      tint: 0xff0066
    });
    this.catchEmitter.explode(40);
    this.cameras.main.shake(150, 0.005);
    this.cameras.main.flash(100, 255, 0, 102, 0.3);
    this.getPool('items').release(bomb);
    this.getPool('projectiles').release(projectile);
  }
  catchItem(item) {
    if (this.comboWarningTween) {
      this.tweens.remove(this.comboWarningTween);
      this.comboWarningTween = null;
      this.comboWarningText.setText(``);
    }
    if (item.itemType === `freeze`) {
      this.activateFreeze();
      this.getPool('items').release(item);
      return;
    } else if (item.itemType === `health`) {
      this.lives = Math.min(this.lives + 1, 5);
      this.livesText.setText(`LIVES: ${`❤️`.repeat(Math.max(0, this.lives))}`);
      if (this.game.sounds?.powerup) this.game.sounds.powerup();
      this.catchEmitter.setPosition(item.x, item.y);
      this.catchEmitter.setConfig({
        tint: 0xff0066
      });
      this.catchEmitter.explode(30);
      this.getPool('items').release(item);
      return;
    } else if (item.itemType === `mystery`) {
      this.activateMystery(item);
      return;
    }
    if (item.itemType === `bomb`) {
      if (this.activePowerups.has(`converter`)) {
        item.itemType = `gold`;
        item.value = 50;
        item.setTexture(`item_gold`);
      } else {
        if (this.game.sounds?.miss) this.game.sounds.miss();
        this.lives--;
        this.combo = 0;
        this.comboText.setText(``);
        this.missStreak = 0;
        this.perfectStreak = 0;
        this.livesText.setText(`LIVES: ${`❤️`.repeat(Math.max(0, this.lives))}`);
        this.cameras.main.shake(400, 0.01);
        this.cameras.main.flash(200, 255, 0, 0);
        this.missEmitter.setPosition(item.x, item.y);
        this.missEmitter.explode(30, item.x, item.y);
        this.getPool('items').release(item);
        if (this.lives <= 0) {
          this.gameOver();
        }
        return;
      }
    }
    if (item.itemType === `glitch`) {
      this.activateGlitchEffect();
    } else if (item.itemType === `multiplier`) {
      this.activateMultiplier();
    } else if (item.itemType === `virus`) {
      this.activateVirusEffect();
      this.getPool('items').release(item);
      return;
    }
    if (this.game.sounds?.catch) this.game.sounds.catch();
    this.itemsCaught++;
    this.combo++;
    this.recentCatches.push({
      time: Date.now(),
      value: item.value
    });
    this.recentCatches = this.recentCatches.filter(c => Date.now() - c.time < 10000);
    this.updatePerformanceScore();
    this.perfectStreak++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.missStreak = 0;
    if (item.itemType === `gold`) {
      this.goldCaught++;
    }
    const overchargeGain = item.itemType === `gold` ? 15 : item.itemType === `giant` ? 25 : 5;
    this.overcharge = Math.min(100, this.overcharge + overchargeGain);
    this.updateOverchargeDisplay();
    const playerLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const bonuses = LevelingSystem.getStatBonuses(playerLevel);
    const comboMultiplier = Math.min(Math.floor(this.combo / 5) + 1, 5);
    const overchargeBonus = this.overchargeActive ? 2 : 1;
    const fortuneBonus = this.equippedGear.utility === `fortune_aura` ? 1.5 : 1;
    const points = Math.floor(item.value * this.level * comboMultiplier * this.scoreMultiplier * overchargeBonus * fortuneBonus * bonuses.comboMultiplier);
    this.score += points;
    const currencyMultiplier = (this.equippedGear.utility === `fortune_aura` ? 2 : 1) * bonuses.currencyMultiplier;
    this.earnedCurrency += Math.floor(points / 20 * currencyMultiplier);
    this.scoreText.setText(`SCORE: ${this.score}`);
    if (this.combo >= 5) {
      const comboColor = this.combo >= 20 ? `#ff0066` : this.combo >= 10 ? `#ff00ff` : `#ffdd00`;
      this.comboText.setText(`${this.combo}x COMBO!`);
      this.comboText.setColor(comboColor);
      this.comboText.setScale(1 + Math.min(this.combo * 0.02, 0.5));
      this.comboMultiplierText.setText(`${comboMultiplier}x SCORE`);
      this.comboMultiplierText.setColor(comboColor);
      const intensity = Math.min(this.combo * 0.001, 0.01);
      this.cameras.main.shake(100, intensity);
      if (this.combo % 5 === 0) {
        const width = this.cameras.main.width;
        const quality = this.performanceManager?.getQualitySettings() || {
          particles: 1.0
        };
        const burstEmitter = this.add.particles(width / 2, 80, `particle`, {
          speed: {
            min: 100,
            max: 200
          },
          scale: {
            start: 0.8 * quality.particles,
            end: 0
          },
          blendMode: Phaser.BlendModes.ADD,
          lifespan: 800,
          tint: this.combo >= 20 ? 0xff0066 : this.combo >= 10 ? 0xff00ff : 0xffdd00,
          emitting: false
        });
        burstEmitter.explode(Math.floor(30 * quality.particles));
        this.time.delayedCall(1000, () => burstEmitter.destroy());
      }
    } else {
      this.comboText.setText(``);
      this.comboMultiplierText.setText(``);
    }
    this.lastCatchTime = Date.now();
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    const particleCount = Math.floor((item.itemType === `giant` ? 50 : item.itemType === `gold` ? 30 : 20) * quality.particles);
    this.catchEmitter.setPosition(item.x, item.y);
    this.catchEmitter.setConfig({
      tint: item.itemType === `gold` ? 0xffdd00 : item.itemType === `silver` ? 0xcccccc : 0x00ffff
    });
    this.catchEmitter.explode(particleCount, item.x, item.y);
    if (item.itemType === `gold`) {
      this.cameras.main.flash(100, 255, 221, 0, 0.3);
    }
    this.getPool('items').release(item);
    if (this.score % 100 === 0 && this.score > 0) {
      this.levelUp();
    }
    this.checkAchievements();
  }
  showDifficultyChange(oldSpeed, newSpeed) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const diffText = this.add.text(width / 2, height / 2 + 50, `⚠️ DIFFICULTY INCREASED`, {
      fontSize: `24px`,
      color: `#ff0066`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(999);
    this.tweens.add({
      targets: diffText,
      y: height / 2 + 20,
      alpha: {
        from: 1,
        to: 0
      },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => diffText.destroy()
    });
  }
  nearMiss(item) {
    if (!item.nearMissTriggered) {
      item.nearMissTriggered = true;
      this.nearMissEmitter.setPosition(item.x, item.y);
      this.nearMissEmitter.explode(10);
    }
  }
  missItem(item) {
    if (item.itemType === `bomb`) {
      this.getPool('items').release(item);
      return;
    }
    if (this.game.sounds?.miss) this.game.sounds.miss();
    if (this.activePowerups.has(`shield`)) {
      this.shieldUses--;
      if (this.shieldUses <= 0) {
        this.activePowerups.delete(`shield`);
        this.updatePowerupDisplay();
      }
      this.getPool('items').release(item);
      return;
    }
    this.combo = 0;
    this.comboText.setText(``);
    this.perfectStreak = 0;
    this.missStreak++;
    this.lives--;
    this.missedItems++;
    this.updatePerformanceScore();
    this.livesText.setText(`LIVES: ${`❤️`.repeat(Math.max(0, this.lives))}`);
    this.missEmitter.setPosition(item.x, item.y);
    this.missEmitter.explode(15, item.x, item.y);
    this.cameras.main.shake(200, 0.005);
    this.getPool('items').release(item);
    if (this.lives <= 0) {
      this.gameOver();
    }
  }
  collectPowerup(powerup) {
    if (this.game.sounds?.powerup) this.game.sounds.powerup();
    const types = [`shield`, `magnet`, `slowmo`, `timewarp`, `converter`, `hyperdash`, `blackhole`];
    const type = types[powerup.type];
    this.activePowerups.add(type);
    this.powerupsCollected[type] = (this.powerupsCollected[type] || 0) + 1;
    this.showPowerupActivation(type, powerup.x, powerup.y);
    const playerLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const bonuses = LevelingSystem.getStatBonuses(playerLevel);
    if (type === `shield`) {
      this.shieldUses = 3 + bonuses.shieldBonus;
    } else if (type === `magnet`) {
      this.time.delayedCall(5000, () => {
        this.activePowerups.delete(`magnet`);
        this.updatePowerupDisplay();
      });
    } else if (type === `slowmo`) {
      this.time.delayedCall(4000, () => {
        this.activePowerups.delete(`slowmo`);
        this.updatePowerupDisplay();
      });
    } else if (type === `timewarp`) {
      this.time.delayedCall(6000, () => {
        this.activePowerups.delete(`timewarp`);
        this.updatePowerupDisplay();
      });
    } else if (type === `converter`) {
      this.time.delayedCall(8000, () => {
        this.activePowerups.delete(`converter`);
        this.updatePowerupDisplay();
      });
    } else if (type === `hyperdash`) {
      this.dashCooldown = 0;
      this.time.delayedCall(10000, () => {
        this.activePowerups.delete(`hyperdash`);
        this.updatePowerupDisplay();
      });
    } else if (type === `blackhole`) {
      this.blackHoleActive = true;
      this.blackHoleX = this.player.x;
      this.blackHoleY = this.player.y - 200;
      this.cameras.main.flash(300, 0, 0, 0);
      const blackHoleSprite = this.add.sprite(this.blackHoleX, this.blackHoleY, `powerup_blackhole`);
      blackHoleSprite.setScale(3);
      blackHoleSprite.setAlpha(0.8);
      this.tweens.add({
        targets: blackHoleSprite,
        rotation: Math.PI * 4,
        duration: 5000
      });
      this.time.delayedCall(5000, () => {
        this.blackHoleActive = false;
        blackHoleSprite.destroy();
        this.activePowerups.delete(`blackhole`);
        this.updatePowerupDisplay();
      });
    }
    this.updatePowerupDisplay();
    this.catchEmitter.setPosition(powerup.x, powerup.y);
    this.catchEmitter.explode(30, powerup.x, powerup.y);
    this.getPool('powerups').release(powerup);
  }
  showPowerupActivation(type, x, y) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const powerupNames = {
      shield: `🛡️ SHIELD ACTIVE`,
      magnet: `🧲 MAGNET PULL`,
      slowmo: `⏱️ SLOW MOTION`,
      timewarp: `⏰ TIME WARP`,
      converter: `🔄 CONVERTER`,
      hyperdash: `⚡ HYPER DASH`,
      blackhole: `⚫ BLACK HOLE`
    };
    const activationText = this.add.text(width / 2, height / 2 - 100, powerupNames[type], {
      fontSize: `32px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1000);
    this.tweens.add({
      targets: activationText,
      y: height / 2 - 150,
      alpha: {
        from: 1,
        to: 0
      },
      scale: {
        from: 1,
        to: 1.3
      },
      duration: 1500,
      ease: 'Power2',
      onComplete: () => activationText.destroy()
    });
    const powerupColors = {
      shield: 0x00ff00,
      magnet: 0xff00ff,
      slowmo: 0x00ffff,
      timewarp: 0x9900ff,
      converter: 0xffdd00,
      hyperdash: 0xff0066,
      blackhole: 0x000000
    };
    const color = powerupColors[type] || 0xffffff;
    const r = color >> 16 & 0xFF;
    const g = color >> 8 & 0xFF;
    const b = color & 0xFF;
    this.cameras.main.flash(200, r, g, b, 0.4);
  }
  updatePowerupDisplay() {
    const powerupLabels = {
      shield: `🛡️ SHIELD`,
      magnet: `🧲 MAGNET`,
      slowmo: `⏱️ SLOW-MO`,
      timewarp: `⏰ TIME-WARP`,
      converter: `🔄 CONVERTER`,
      hyperdash: `⚡ HYPER-DASH`,
      blackhole: `⚫ BLACK-HOLE`
    };
    const active = Array.from(this.activePowerups).map(p => powerupLabels[p]).join(` `);
    this.powerupText.setText(active);
  }
  activateGlitchEffect() {
    if (this.glitchActive) return;
    this.glitchActive = true;
    this.controlsReversed = true;
    this.cameras.main.flash(200, 255, 0, 255, 0.5);
    const quality = this.performanceManager?.getQualitySettings() || {
      effects: 1.0
    };
    if (quality.effects > 0.5) {
      const glitchOverlay = this.add.graphics();
      glitchOverlay.setDepth(1000);
      const glitchInterval = this.time.addEvent({
        delay: 200,
        callback: () => {
          glitchOverlay.clear();
          if (Math.random() > 0.7) {
            glitchOverlay.fillStyle(0xff00ff, 0.2);
            glitchOverlay.fillRect(Phaser.Math.Between(0, this.cameras.main.width), Phaser.Math.Between(0, this.cameras.main.height), Phaser.Math.Between(50, 200), Phaser.Math.Between(10, 50));
          }
        },
        loop: true
      });
      this.time.delayedCall(4000, () => {
        this.glitchActive = false;
        this.controlsReversed = false;
        glitchInterval.destroy();
        glitchOverlay.destroy();
      });
    } else {
      this.time.delayedCall(4000, () => {
        this.glitchActive = false;
        this.controlsReversed = false;
      });
    }
  }
  activateFreeze() {
    const originalSpeed = this.itemSpeed;
    this.itemSpeed = this.itemSpeed * 0.2;
    this.cameras.main.flash(300, 0, 221, 255, 0.5);
    this.time.delayedCall(4000, () => {
      this.itemSpeed = originalSpeed;
    });
  }
  activateMystery(item) {
    const outcomes = [() => {
      this.score += 100;
    }, () => {
      this.lives = Math.min(this.lives + 1, 5);
      this.livesText.setText(`LIVES: ${`❤️`.repeat(Math.max(0, this.lives))}`);
    }, () => {
      this.scoreMultiplier = 3;
      this.time.delayedCall(3000, () => {
        this.scoreMultiplier = 1;
      });
    }, () => {
      this.earnedCurrency += 50;
    }];
    const outcome = outcomes[Phaser.Math.Between(0, outcomes.length - 1)];
    outcome();
    this.catchEmitter.setPosition(item.x, item.y);
    this.catchEmitter.setConfig({
      tint: 0xff00ff
    });
    this.catchEmitter.explode(40);
    if (this.game.sounds?.powerup) this.game.sounds.powerup();
    this.getPool('items').release(item);
  }
  activateMultiplier() {
    this.scoreMultiplier = 2;
    this.cameras.main.flash(200, 0, 255, 0, 0.4);
    this.time.delayedCall(5000, () => {
      this.scoreMultiplier = 1;
    });
  }
  updatePerformanceScore() {
    const recentValue = this.recentCatches.reduce((sum, c) => sum + c.value, 0);
    const catchRate = this.recentCatches.length / 10;
    this.performanceScore = Math.min(10, (catchRate + this.combo * 0.1 + recentValue * 0.01) / 3);
    const speedAdjustment = 1 + this.performanceScore * 0.05;
    const baseSpeed = this.getDifficulty() === `easy` ? 150 : this.getDifficulty() === `hard` ? 250 : 200;
    this.itemSpeed = baseSpeed * speedAdjustment;
    const spawnAdjustment = Math.max(0.7, 1 - this.performanceScore * 0.03);
    const baseSpawn = this.getDifficulty() === `easy` ? 2000 : this.getDifficulty() === `hard` ? 1000 : 1500;
    this.spawnRate = Math.max(500, baseSpawn * spawnAdjustment);
    this.spawnTimer.delay = this.spawnRate;
  }
  activateVirusEffect() {
    if (this.virusActive) return;
    this.virusActive = true;
    const quality = this.performanceManager?.getQualitySettings() || {
      effects: 1.0
    };
    if (quality.effects > 0.5) {
      const virusOverlay = this.add.graphics();
      virusOverlay.setDepth(999);
      const blurInterval = this.time.addEvent({
        delay: 300,
        callback: () => {
          virusOverlay.clear();
          const blurAmount = Phaser.Math.Between(5, 15);
          virusOverlay.fillStyle(0x660066, 0.15);
          for (let i = 0; i < 2; i++) {
            virusOverlay.fillRect(Phaser.Math.Between(-blurAmount, blurAmount), Phaser.Math.Between(0, this.cameras.main.height), this.cameras.main.width, Phaser.Math.Between(2, 8));
          }
        },
        loop: true
      });
      this.cameras.main.flash(300, 102, 0, 102, 0.5);
      this.time.delayedCall(5000, () => {
        this.virusActive = false;
        blurInterval.destroy();
        virusOverlay.destroy();
      });
    } else {
      this.cameras.main.flash(300, 102, 0, 102, 0.5);
      this.time.delayedCall(5000, () => {
        this.virusActive = false;
      });
    }
  }
  activateOvercharge() {
    if (this.overcharge < 100 || this.overchargeActive) return;
    this.overcharge = 0;
    this.overchargeActive = true;
    this.updateOverchargeDisplay();
    this.cameras.main.flash(400, 255, 221, 0);
    const width = this.cameras.main.width;
    const overchargeText = this.add.text(width / 2, 150, `<<< OVERCHARGE >>>`, {
      fontSize: `48px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#ff0066`,
      strokeThickness: 3
    });
    overchargeText.setOrigin(0.5);
    overchargeText.setDepth(1000);
    this.tweens.add({
      targets: overchargeText,
      alpha: {
        from: 1,
        to: 0
      },
      scale: {
        from: 1,
        to: 1.5
      },
      duration: 1500,
      onComplete: () => overchargeText.destroy()
    });
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0
    };
    if (this.auraEmitter) {
      this.auraEmitter.setConfig({
        frequency: Math.floor(10 / quality.particles),
        scale: {
          start: 0.8 * quality.particles,
          end: 0
        },
        tint: [0xffdd00, 0xff6600]
      });
    }
    this.time.delayedCall(8000, () => {
      this.overchargeActive = false;
      this.setupAuraEffect();
    });
  }
  updateOverchargeDisplay() {
    if (!this.overchargeBar) return;
    this.overchargeBar.clear();
    const barWidth = 150 * (this.overcharge / 100);
    const color = this.overcharge >= 100 ? 0xffdd00 : 0x00ffff;
    this.overchargeBar.fillStyle(color, 0.6);
    this.overchargeBar.fillRect(20, 90, barWidth, 8);
    this.overchargeBar.lineStyle(2, color, this.overcharge >= 100 ? 1 : 0.6);
    this.overchargeBar.strokeRect(20, 90, 150, 8);
    this.overchargeGlow.clear();
    if (this.overcharge >= 100 && !this.overchargeActive) {
      this.overchargeGlow.lineStyle(3, 0xffdd00, 0.4);
      this.overchargeGlow.strokeRect(18, 88, 154, 12);
      this.overchargeText.setText(`[PRESS O TO OVERCHARGE]`);
      this.overchargeText.setColor(`#ffdd00`);
      this.tweens.add({
        targets: this.overchargeText,
        alpha: {
          from: 1,
          to: 0.5
        },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      this.overchargeText.setText(`OVERCHARGE: ${Math.floor(this.overcharge)}%`);
      this.overchargeText.setColor(`#00ffff`);
      this.tweens.killTweensOf(this.overchargeText);
      this.overchargeText.setAlpha(1);
    }
  }
  onQualityChanged(settings) {
    super.onQualityChanged(settings);
    if (this.catchEmitter) {
      this.catchEmitter.setConfig({
        scale: {
          start: 0.8 * settings.particles,
          end: 0
        },
        alpha: {
          start: 1 * settings.particles,
          end: 0
        },
        lifespan: 800 * settings.effects
      });
    }
    if (this.trailEmitter) {
      this.trailEmitter.setConfig({
        scale: {
          start: 0.3 * settings.particles,
          end: 0
        },
        frequency: Math.floor(50 / settings.particles)
      });
    }
    if (this.auraEmitter) {
      this.setupAuraEffect();
    }
  }
  createHUD(width, height) {
    const uiTheme = StorageManager.get(STORAGE_KEYS.UI_THEME, 'cyber');
    const themeConfig = CUSTOMIZATION_OPTIONS.uiThemes[uiTheme];
    const hudGraphics = this.add.graphics();
    const primaryColor = parseInt(themeConfig.primary.replace('#', '0x'));
    hudGraphics.lineStyle(2, primaryColor, 0.6);
    hudGraphics.strokeRect(10, 10, 250, 100);
    hudGraphics.strokeRect(width - 260, 10, 250, 100);
    this.scoreText = this.add.text(20, 20, `[SCORE: 0]`, {
      fontSize: `20px`,
      color: themeConfig.primary,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.levelText = this.add.text(width - 20, 20, `[LVL: 1]`, {
      fontSize: `20px`,
      color: themeConfig.secondary,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.levelText.setOrigin(1, 0);
    this.livesText = this.add.text(20, 60, `[LIVES: ❤️❤️❤️]`, {
      fontSize: `20px`,
      color: `#ff0066`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.powerupText = this.add.text(width - 20, 60, ``, {
      fontSize: `16px`,
      color: themeConfig.accent,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.powerupText.setOrigin(1, 0);
    this.comboText = this.add.text(width / 2, 30, ``, {
      fontSize: `36px`,
      color: themeConfig.secondary,
      fontStyle: `bold`,
      stroke: themeConfig.primary,
      strokeThickness: 3
    });
    this.comboText.setOrigin(0.5, 0);
    this.comboMultiplierText = this.add.text(width / 2, 70, ``, {
      fontSize: `18px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.comboMultiplierText.setOrigin(0.5, 0);
    this.comboWarningText = this.add.text(width / 2, 95, ``, {
      fontSize: `14px`,
      color: `#ff0066`,
      fontStyle: `italic`
    });
    this.comboWarningText.setOrigin(0.5, 0);
    this.overchargeBar = this.add.graphics();
    this.overchargeBar.fillStyle(0x000000, 0.8);
    this.overchargeBar.fillRect(20, 90, 150, 8);
    this.overchargeBar.lineStyle(1, primaryColor, 0.6);
    this.overchargeBar.strokeRect(20, 90, 150, 8);
    this.overchargeText = this.add.text(95, 85, `OVERCHARGE: 0%`, {
      fontSize: `12px`,
      color: themeConfig.primary,
      stroke: `#000000`,
      strokeThickness: 1
    });
    this.overchargeText.setOrigin(0.5, 1);
    this.overchargeGlow = this.add.graphics();
    this.overchargeGlow.setDepth(5);
    this.input.keyboard.on(`keydown-O`, () => {
      this.activateOvercharge();
    });
    this.weaponText = this.add.text(width / 2, height - 40, `[GUN]`, {
      fontSize: `24px`,
      color: themeConfig.primary,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.weaponText.setOrigin(0.5);
    const weaponHint = this.add.text(width / 2, height - 15, `1: GUN | 2: NET | SPACE: FIRE | O: OVERCHARGE`, {
      fontSize: `14px`,
      color: `#888888`
    });
    weaponHint.setOrigin(0.5);
    this.cooldownBarBg = this.add.graphics();
    this.cooldownBarBg.fillStyle(0x000000, 0.8);
    this.cooldownBarBg.fillRect(width / 2 - 100, height - 65, 200, 8);
    this.cooldownBarBg.lineStyle(1, primaryColor, 0.6);
    this.cooldownBarBg.strokeRect(width / 2 - 100, height - 65, 200, 8);
    this.cooldownBarBg.setVisible(false);
    this.cooldownBar = this.add.graphics();
    this.cooldownBar.setVisible(false);
  }
  levelUp() {
    this.level++;
    this.levelText.setText(`[LVL: ${this.level}]`);
    const oldSpeed = this.itemSpeed;
    this.itemSpeed += 20;
    this.spawnRate = Math.max(500, this.spawnRate - 100);
    this.spawnTimer.delay = this.spawnRate;
    this.showDifficultyChange(oldSpeed, this.itemSpeed);
    if (this.level % 5 === 0) {
      this.activateChaosMode();
    }
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.cameras.main.flash(300, 0, 255, 255);
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 50, () => {
        this.cameras.main.shake(100, 0.003);
      });
    }
    const glitchText = this.add.text(width / 2, height / 2, `>>LEVEL_${this.level}<<`, {
      fontSize: `72px`,
      color: `#ff00ff`,
      fontStyle: `bold`,
      stroke: `#00ffff`,
      strokeThickness: 4
    });
    glitchText.setOrigin(0.5);
    glitchText.setAlpha(0);
    this.tweens.add({
      targets: glitchText,
      alpha: 1,
      scale: {
        from: 0.3,
        to: 1.3
      },
      duration: 400,
      yoyo: true,
      onComplete: () => glitchText.destroy()
    });
    this.checkAchievements();
  }
  activateChaosMode() {
    this.isChaosMode = true;
    this.chaosModeText.setText(`<<<CHAOS_MODE>>>`);
    this.cameras.main.flash(500, 255, 0, 102);
    this.tweens.add({
      targets: this.chaosModeText,
      alpha: {
        from: 1,
        to: 0.5
      },
      scale: {
        from: 1,
        to: 1.1
      },
      duration: 500,
      yoyo: true,
      repeat: 19
    });
    this.time.delayedCall(10000, () => {
      this.isChaosMode = false;
      this.chaosModeText.setText(``);
    });
  }
  checkAchievements() {
    const achievements = StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS, {});
    let updated = false;
    if (this.combo >= 10 && !achievements.combo_master?.unlocked) {
      achievements.combo_master.unlocked = true;
      this.unlockSkin(`fire`);
      updated = true;
    }
    if (this.level >= 10 && !achievements.speed_demon?.unlocked) {
      achievements.speed_demon.unlocked = true;
      this.unlockSkin(`ice`);
      updated = true;
    }
    if (this.score >= 1000 && !achievements.survivor?.unlocked) {
      achievements.survivor.unlocked = true;
      this.unlockSkin(`gold`);
      updated = true;
    }
    if (this.goldCaught >= 50 && !achievements.gold_collector?.unlocked) {
      achievements.gold_collector.unlocked = true;
      updated = true;
    }
    if (this.perfectStreak >= 20 && !achievements.untouchable?.unlocked) {
      achievements.untouchable.unlocked = true;
      this.unlockSkin(`purple`);
      updated = true;
    }
    if (updated) {
      StorageManager.set(STORAGE_KEYS.ACHIEVEMENTS, achievements);
    }
  }
  unlockSkin(skinName) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const unlockText = this.add.text(width / 2, height / 2 + 100, `🎨 NEW SKIN UNLOCKED: ${skinName.toUpperCase()}!`, {
      fontSize: `32px`,
      color: `#ffdd00`,
      fontStyle: `bold`,
      backgroundColor: `#000000`,
      padding: {
        x: 20,
        y: 10
      }
    });
    unlockText.setOrigin(0.5);
    this.time.delayedCall(3000, () => unlockText.destroy());
  }
  updateChallenges() {
    const challenges = StorageManager.get(STORAGE_KEYS.CHALLENGES, {});
    if (challenges.daily) {
      if (challenges.daily.type === `gold_collector`) {
        challenges.daily.progress = this.goldCaught;
      } else if (challenges.daily.type === `bomb_destroyer`) {
        challenges.daily.progress = this.bombsDestroyed;
      }
    }
    if (challenges.weekly) {
      if (challenges.weekly.type === `level_master`) {
        challenges.weekly.progress = Math.max(challenges.weekly.progress, this.level);
      } else if (challenges.weekly.type === `perfect_run`) {
        challenges.weekly.progress = Math.max(challenges.weekly.progress, this.perfectStreak);
      }
    }
    StorageManager.set(STORAGE_KEYS.CHALLENGES, challenges);
  }
  gameOver() {
    [this.debrisSpawnTimer, this.vehicleSpawnTimer, this.spawnTimer, this.powerupTimer, this.hazardTimer].forEach(timer => {
      if (timer && !timer.hasDispatched) timer.destroy();
    });
    this.debrisObjects.forEach(debris => debris?.destroy?.());
    this.debrisObjects = [];
    this.score = typeof this.score === 'number' ? this.score : 0;
    const highScore = StorageManager.getInt(STORAGE_KEYS.HIGH_SCORE);
    if (this.score > highScore) {
      StorageManager.set(STORAGE_KEYS.HIGH_SCORE, this.score);
    }
    const gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
    const stats = StorageManager.get(STORAGE_KEYS.STATS, {});
    stats.totalScore = (stats.totalScore || 0) + this.score;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.maxCombo = Math.max(stats.maxCombo || 0, this.maxCombo);
    stats.goldCaught = (stats.goldCaught || 0) + this.goldCaught;
    stats.totalItemsCaught = (stats.totalItemsCaught || 0) + this.itemsCaught;
    stats.totalTimePlayed = (stats.totalTimePlayed || 0) + gameTime;
    stats.bombsDestroyed = (stats.bombsDestroyed || 0) + this.bombsDestroyed;
    stats.longestSession = Math.max(stats.longestSession || 0, gameTime);
    Object.entries(this.powerupsCollected).forEach(([type, count]) => {
      if (!stats.powerupsCollected) stats.powerupsCollected = {};
      stats.powerupsCollected[type] = (stats.powerupsCollected[type] || 0) + count;
    });
    StorageManager.set(STORAGE_KEYS.STATS, stats);
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    StorageManager.set(STORAGE_KEYS.CURRENCY, currency + this.earnedCurrency);
    const earnedXP = LevelingSystem.calculateXP({
      score: this.score,
      maxCombo: this.maxCombo,
      level: this.level,
      goldCaught: this.goldCaught,
      gameTime: gameTime,
      itemsCaught: this.itemsCaught,
      missedItems: this.missedItems,
      bombsDestroyed: this.bombsDestroyed
    });
    this.updateChallenges();
    if (this.objectPools && this.objectPools instanceof Map) {
      this.objectPools.forEach(pool => {
        if (pool && typeof pool.clear === 'function') {
          try {
            pool.clear();
          } catch (e) {
            console.warn('Error clearing pool:', e);
          }
        }
      });
    }
    this.scene.start(`GameOverScene`, {
      score: this.score,
      level: this.level,
      maxCombo: this.maxCombo,
      goldCaught: this.goldCaught,
      earnedCurrency: this.earnedCurrency,
      itemsCaught: this.itemsCaught,
      gameTime: gameTime,
      earnedXP: earnedXP,
      missedItems: this.missedItems,
      bombsDestroyed: this.bombsDestroyed
    });
  }
}
class PauseScene extends Phaser.Scene {
  constructor() {
    super({
      key: "PauseScene"
    });
  }
  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    bg.setOrigin(0);
    const pauseBox = this.add.graphics();
    pauseBox.fillStyle(0x000000, 0.8);
    pauseBox.fillRect(width / 2 - 250, height / 2 - 180, 500, 340);
    pauseBox.lineStyle(3, 0x00ffff, 0.8);
    pauseBox.strokeRect(width / 2 - 250, height / 2 - 180, 500, 340);
    const pauseGlow = this.add.text(width / 2, height / 2 - 100, `[PAUSED]`, {
      fontSize: `72px`,
      color: `#00ffff`,
      fontStyle: `bold`
    });
    pauseGlow.setOrigin(0.5);
    pauseGlow.setAlpha(0.3);
    const pauseText = this.add.text(width / 2, height / 2 - 100, `[PAUSED]`, {
      fontSize: `64px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 3
    });
    pauseText.setOrigin(0.5);
    this.tweens.add({
      targets: pauseGlow,
      alpha: {
        from: 0.3,
        to: 0.6
      },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    const hint = this.add.text(width / 2, height / 2 - 20, `Press ESC to resume`, {
      fontSize: `16px`,
      color: `#888888`
    });
    hint.setOrigin(0.5);
    this.createButton(width / 2, height / 2 + 40, `RESUME`, () => {
      this.scene.stop();
      this.scene.resume(`GameScene`);
    });
    this.createButton(width / 2, height / 2 + 110, `MAIN MENU`, () => {
      this.scene.stop(`GameScene`);
      this.scene.stop();
      this.scene.start(`MenuScene`);
    });
  }
  createButton(x, y, text, callback) {
    const button = this.add.text(x, y, text, {
      fontSize: `24px`,
      color: `#ffffff`,
      backgroundColor: `#333344`,
      padding: {
        x: 20,
        y: 10
      }
    });
    button.setOrigin(0.5);
    button.setInteractive({
      useHandCursor: true
    });
    button.on(`pointerover`, () => {
      button.setColor(`#00ff88`);
    });
    button.on(`pointerout`, () => {
      button.setColor(`#ffffff`);
    });
    button.on(`pointerdown`, callback);
  }
}
class ChallengesScene extends BaseScene {
  constructor() {
    super({
      key: "ChallengesScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 60, `[CHALLENGES]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const challenges = StorageManager.get(STORAGE_KEYS.CHALLENGES, {});
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const currencyBox = this.add.graphics();
    currencyBox.fillStyle(0x000000, 0.7);
    currencyBox.fillRect(width / 2 - 150, 110, 300, 40);
    currencyBox.lineStyle(2, 0x00ffff, 0.8);
    currencyBox.strokeRect(width / 2 - 150, 110, 300, 40);
    const currencyText = this.add.text(width / 2, 130, `💎 ${currency}`, {
      fontSize: `22px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    currencyText.setOrigin(0.5);
    this.resetChallenges(challenges);
    const challengesContainer = this.add.graphics();
    challengesContainer.fillStyle(0x000000, 0.4);
    challengesContainer.fillRect(width / 2 - 320, 170, 640, 400);
    challengesContainer.lineStyle(2, 0x00ffff, 0.5);
    challengesContainer.strokeRect(width / 2 - 320, 170, 640, 400);
    let yPos = 200;
    const challengeTypes = {
      gold_collector: `Catch {target} gold items`,
      bomb_destroyer: `Destroy {target} bombs`,
      level_master: `Reach level {target}`,
      perfect_run: `Catch {target} items without missing`
    };
    if (challenges.daily) {
      const dailyBox = this.add.graphics();
      dailyBox.fillStyle(0x221100, 0.5);
      dailyBox.fillRect(width / 2 - 290, yPos - 10, 580, 140);
      dailyBox.lineStyle(2, 0xffdd00, 0.6);
      dailyBox.strokeRect(width / 2 - 290, yPos - 10, 580, 140);
      const dailyText = this.add.text(width / 2, yPos + 10, `DAILY CHALLENGE`, {
        fontSize: `20px`,
        color: `#ffdd00`,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 2
      });
      dailyText.setOrigin(0.5);
      yPos += 45;
      const desc = challengeTypes[challenges.daily.type].replace(`{target}`, challenges.daily.target);
      const descText = this.add.text(width / 2, yPos, desc, {
        fontSize: `18px`,
        color: `#ffffff`
      });
      descText.setOrigin(0.5);
      yPos += 30;
      const progress = Math.min(challenges.daily.progress, challenges.daily.target);
      const progressPercent = (progress / challenges.daily.target * 100).toFixed(0);
      const progressBar = this.add.graphics();
      progressBar.fillStyle(0x000000, 0.8);
      progressBar.fillRect(width / 2 - 200, yPos - 5, 400, 20);
      progressBar.fillStyle(progress >= challenges.daily.target ? 0x00ff00 : 0xffdd00, 0.8);
      progressBar.fillRect(width / 2 - 200, yPos - 5, 400 * (progress / challenges.daily.target), 20);
      progressBar.lineStyle(2, 0xffffff, 0.6);
      progressBar.strokeRect(width / 2 - 200, yPos - 5, 400, 20);
      const progressText = this.add.text(width / 2, yPos + 5, `${progress}/${challenges.daily.target} (${progressPercent}%)`, {
        fontSize: `14px`,
        color: `#000000`,
        fontStyle: `bold`
      });
      progressText.setOrigin(0.5);
      yPos += 30;
      const rewardText = this.add.text(width / 2, yPos, `💎 ${challenges.daily.reward}`, {
        fontSize: `16px`,
        color: `#00ffff`,
        fontStyle: `bold`
      });
      rewardText.setOrigin(0.5);
      yPos += 30;
      if (progress >= challenges.daily.target && !challenges.daily.claimed) {
        this.createButton(width / 2, yPos - 35, `CLAIM REWARD`, () => {
          try {
            const newCurrency = currency + challenges.daily.reward;
            localStorage.setItem(`dropkeeper_currency`, newCurrency.toString());
            challenges.daily.claimed = true;
            challenges.daily.progress = 0;
            localStorage.setItem(`dropkeeper_challenges`, JSON.stringify(challenges));
            this.scene.restart();
          } catch (e) {
            console.error(`Failed to claim reward:`, e);
          }
        });
      }
    }
    yPos += 30;
    if (challenges.weekly) {
      const weeklyBox = this.add.graphics();
      weeklyBox.fillStyle(0x110022, 0.5);
      weeklyBox.fillRect(width / 2 - 290, yPos - 10, 580, 140);
      weeklyBox.lineStyle(2, 0xff00ff, 0.6);
      weeklyBox.strokeRect(width / 2 - 290, yPos - 10, 580, 140);
      const weeklyText = this.add.text(width / 2, yPos + 10, `WEEKLY CHALLENGE`, {
        fontSize: `20px`,
        color: `#ff00ff`,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 2
      });
      weeklyText.setOrigin(0.5);
      yPos += 45;
      const desc = challengeTypes[challenges.weekly.type].replace(`{target}`, challenges.weekly.target);
      const descText = this.add.text(width / 2, yPos, desc, {
        fontSize: `18px`,
        color: `#ffffff`
      });
      descText.setOrigin(0.5);
      yPos += 30;
      const progress = Math.min(challenges.weekly.progress, challenges.weekly.target);
      const progressPercent = (progress / challenges.weekly.target * 100).toFixed(0);
      const progressBar = this.add.graphics();
      progressBar.fillStyle(0x000000, 0.8);
      progressBar.fillRect(width / 2 - 200, yPos - 5, 400, 20);
      progressBar.fillStyle(progress >= challenges.weekly.target ? 0x00ff00 : 0xff00ff, 0.8);
      progressBar.fillRect(width / 2 - 200, yPos - 5, 400 * (progress / challenges.weekly.target), 20);
      progressBar.lineStyle(2, 0xffffff, 0.6);
      progressBar.strokeRect(width / 2 - 200, yPos - 5, 400, 20);
      const progressText = this.add.text(width / 2, yPos + 5, `${progress}/${challenges.weekly.target} (${progressPercent}%)`, {
        fontSize: `14px`,
        color: `#000000`,
        fontStyle: `bold`
      });
      progressText.setOrigin(0.5);
      yPos += 30;
      const rewardText = this.add.text(width / 2, yPos, `💎 ${challenges.weekly.reward}`, {
        fontSize: `16px`,
        color: `#00ffff`,
        fontStyle: `bold`
      });
      rewardText.setOrigin(0.5);
      yPos += 30;
      if (progress >= challenges.weekly.target && !challenges.weekly.claimed) {
        this.createButton(width / 2, yPos - 35, `CLAIM REWARD`, () => {
          try {
            const newCurrency = currency + challenges.weekly.reward;
            localStorage.setItem(`dropkeeper_currency`, newCurrency.toString());
            challenges.weekly.claimed = true;
            challenges.weekly.progress = 0;
            localStorage.setItem(`dropkeeper_challenges`, JSON.stringify(challenges));
            this.scene.restart();
          } catch (e) {
            console.error(`Failed to claim reward:`, e);
          }
        });
      }
    }
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
  resetChallenges(challenges) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    if (challenges.daily && now - challenges.daily.lastReset > oneDay) {
      const types = [`gold_collector`, `bomb_destroyer`];
      challenges.daily = {
        type: types[Phaser.Math.Between(0, 1)],
        target: Phaser.Math.Between(30, 60),
        progress: 0,
        reward: 100,
        lastReset: now,
        claimed: false
      };
    }
    if (challenges.weekly && now - challenges.weekly.lastReset > oneWeek) {
      const types = [`level_master`, `perfect_run`];
      challenges.weekly = {
        type: types[Phaser.Math.Between(0, 1)],
        target: Phaser.Math.Between(10, 20),
        progress: 0,
        reward: 500,
        lastReset: now,
        claimed: false
      };
    }
    localStorage.setItem(`dropkeeper_challenges`, JSON.stringify(challenges));
  }
}
class UpgradesScene extends BaseScene {
  constructor() {
    super({
      key: "UpgradesScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 60, `[UPGRADE SHOP]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const currencyBox = this.add.graphics();
    currencyBox.fillStyle(0x000000, 0.7);
    currencyBox.fillRect(width / 2 - 150, 110, 300, 40);
    currencyBox.lineStyle(2, 0x00ffff, 0.8);
    currencyBox.strokeRect(width / 2 - 150, 110, 300, 40);
    this.currencyText = this.add.text(width / 2, 130, `💎 ${currency}`, {
      fontSize: `22px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.currencyText.setOrigin(0.5);
    const upgradesBox = this.add.graphics();
    upgradesBox.fillStyle(0x000000, 0.4);
    upgradesBox.fillRect(width / 2 - 350, 170, 700, 440);
    upgradesBox.lineStyle(2, 0x00ffff, 0.5);
    upgradesBox.strokeRect(width / 2 - 350, 170, 700, 440);
    const upgrades = StorageManager.get(STORAGE_KEYS.UPGRADES, {});
    let yPos = 190;
    const upgradeConfigs = [{
      key: `moveSpeed`,
      name: `Movement Speed`,
      maxLevel: 5,
      cost: level => 50 + level * 50,
      desc: `+50 speed per level`
    }, {
      key: `dashCooldown`,
      name: `Dash Cooldown`,
      maxLevel: 5,
      cost: level => 75 + level * 75,
      desc: `-150ms per level`
    }, {
      key: `fireRate`,
      name: `Fire Rate`,
      maxLevel: 5,
      cost: level => 60 + level * 60,
      desc: `-50ms per level`
    }, {
      key: `extraLife`,
      name: `Extra Life`,
      maxLevel: 1,
      cost: () => 300,
      desc: `Start with 4 lives`
    }, {
      key: `startShield`,
      name: `Shield Start`,
      maxLevel: 1,
      cost: () => 250,
      desc: `Begin with shield`
    }];
    upgradeConfigs.forEach(config => {
      const currentLevel = upgrades[config.key] || 0;
      const maxed = typeof config.maxLevel === `number` && currentLevel >= config.maxLevel || typeof upgrades[config.key] === `boolean` && upgrades[config.key];
      const levelText = typeof upgrades[config.key] === `boolean` ? upgrades[config.key] ? `OWNED` : `NOT OWNED` : `LVL ${currentLevel}/${config.maxLevel}`;
      const upgradeBox = this.add.graphics();
      upgradeBox.fillStyle(maxed ? 0x002200 : 0x111111, 0.6);
      upgradeBox.fillRect(width / 2 - 320, yPos - 5, 640, 75);
      upgradeBox.lineStyle(1, maxed ? 0x00ff00 : 0x00ffff, 0.6);
      upgradeBox.strokeRect(width / 2 - 320, yPos - 5, 640, 75);
      const nameText = this.add.text(width / 2 - 300, yPos + 5, `${config.name}`, {
        fontSize: `18px`,
        color: `#ffffff`,
        fontStyle: `bold`
      });
      nameText.setOrigin(0, 0);
      const levelDisplay = this.add.text(width / 2 + 300, yPos + 5, levelText, {
        fontSize: `16px`,
        color: maxed ? `#00ff00` : `#ffdd00`,
        fontStyle: `bold`
      });
      levelDisplay.setOrigin(1, 0);
      const descText = this.add.text(width / 2 - 300, yPos + 28, config.desc, {
        fontSize: `14px`,
        color: `#888888`
      });
      descText.setOrigin(0, 0);
      if (!maxed) {
        const cost = config.cost(currentLevel);
        const canAfford = currency >= cost;
        const buyButton = this.add.text(width / 2 + 300, yPos + 50, `BUY (💎 ${cost})`, {
          fontSize: `16px`,
          color: canAfford ? `#00ffff` : `#555555`,
          fontStyle: `bold`
        });
        buyButton.setOrigin(1, 0);
        if (canAfford) {
          buyButton.setInteractive({
            useHandCursor: true
          });
          buyButton.on(`pointerover`, () => {
            buyButton.setColor(`#ffdd00`);
            buyButton.setScale(1.05);
          });
          buyButton.on(`pointerout`, () => {
            buyButton.setColor(`#00ffff`);
            buyButton.setScale(1);
          });
          buyButton.on(`pointerdown`, () => {
            StorageManager.set(STORAGE_KEYS.CURRENCY, currency - cost);
            if (typeof upgrades[config.key] === `boolean`) {
              upgrades[config.key] = true;
            } else {
              upgrades[config.key] = (upgrades[config.key] || 0) + 1;
            }
            StorageManager.set(STORAGE_KEYS.UPGRADES, upgrades);
            this.scene.restart();
          });
        }
      }
      yPos += 85;
    });
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
}
class TutorialScene extends BaseScene {
  constructor() {
    super({
      key: "TutorialScene"
    });
  }
  create() {
    super.create();
    this.initializeTutorialState();
    this.setupPlayer();
    this.setupControls();
    this.setupParticles();
    this.createTutorialUI();
    this.showOverview();
  }
  initializeTutorialState() {
    this.tutorialStep = -1;
    this.movementComplete = false;
    this.dashComplete = false;
    this.catchComplete = 0;
    this.weaponComplete = false;
    this.lastLeftTap = 0;
    this.lastRightTap = 0;
    this.dashCooldown = 0;
    this.isDashing = false;
    this.dashDirection = null;
    this.currentWeapon = `gun`;
    this.projectileCooldown = 0;
    this.overviewElements = [];
  }
  setupPlayer() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const currentSkin = StorageManager.get(STORAGE_KEYS.SKIN, `default`);
    this.player = this.add.sprite(width / 2, height - 100, `player_${currentSkin}`);
    this.player.setScale(0.25);
    this.player.speed = 400;
  }
  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.cursors.left.on(`down`, () => this.handleDoubleTap(`left`));
    this.cursors.right.on(`down`, () => this.handleDoubleTap(`right`));
    this.cursors.left.on(`up`, () => this.endDash(`left`));
    this.cursors.right.on(`up`, () => this.endDash(`right`));
    this.input.keyboard.on(`keydown-ONE`, () => {
      if (this.tutorialStep === 4) {
        this.switchWeapon(`gun`);
      }
    });
    this.input.keyboard.on(`keydown-TWO`, () => {
      if (this.tutorialStep === 4) {
        this.switchWeapon(`net`);
        this.weaponComplete = true;
      }
    });
  }
  setupParticles() {
    const quality = this.performanceManager?.getQualitySettings() || {
      particles: 1.0,
      effects: 1.0
    };
    const particleScale = Math.max(0.3, quality.particles);
    const effectDuration = Math.max(400, 800 * quality.effects);
    const catchEffect = StorageManager.get(STORAGE_KEYS.CATCH_EFFECT, 'default');
    const catchConfig = CUSTOMIZATION_OPTIONS.catchEffects[catchEffect];
    this.catchEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 150,
        max: 250
      },
      scale: {
        start: 0.8 * particleScale,
        end: 0
      },
      blendMode: Phaser.BlendModes.ADD,
      lifespan: effectDuration,
      emitting: false,
      alpha: {
        start: 1 * particleScale,
        end: 0
      },
      tint: catchConfig.tint
    });
    const trailEffect = StorageManager.get(STORAGE_KEYS.PLAYER_TRAIL, 'default');
    const trailConfig = CUSTOMIZATION_OPTIONS.playerTrails[trailEffect];
    this.setupTrailEffect(trailConfig, quality);
    this.dashEmitter = this.add.particles(0, 0, `particle`, {
      speed: {
        min: 100,
        max: 200
      },
      scale: {
        start: 0.6 * quality.particles,
        end: 0
      },
      lifespan: 400,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x00ffff, 0xff00ff],
      emitting: false
    });
  }
  setupTrailEffect(config, quality) {
    if (this.trailEmitter && this.trailEmitter.active) {
      this.trailEmitter.destroy();
      this.trailEmitter = null;
    }
    if (!quality || typeof quality !== 'object' || typeof quality.particles !== 'number') {
      quality = {
        particles: 1.0
      };
    }
    const particleScale = Math.max(0.1, Math.min(1.0, quality.particles));
    if (!config || !config.tint) {
      config = {
        tint: 0x00ff88,
        type: 'smooth'
      };
    }
    if (config.type === 'solid') {
      this.trailEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: {
          start: 0.6 * particleScale,
          end: 0.4 * particleScale
        },
        speed: 0,
        lifespan: 200,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: 20,
        alpha: {
          start: 0.8,
          end: 0
        }
      });
    } else if (config.type === 'glitch') {
      this.trailEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: {
          start: 0.5 * particleScale,
          end: 0
        },
        speed: {
          min: 20,
          max: 60
        },
        lifespan: 250,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: 40,
        alpha: {
          start: 1,
          end: 0
        },
        angle: {
          min: 0,
          max: 360
        }
      });
    } else if (config.type === 'echo') {
      this.trailEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: {
          start: 0.7 * particleScale,
          end: 0.2 * particleScale
        },
        speed: 10,
        lifespan: 400,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: 60,
        alpha: {
          start: 0.6,
          end: 0
        }
      });
    } else if (config.type === 'neon') {
      this.trailEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: {
          start: 0.4 * particleScale,
          end: 0
        },
        speed: 30,
        lifespan: 350,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: 25,
        alpha: {
          start: 1,
          end: 0
        }
      });
    } else if (config.type === 'stars') {
      this.trailEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: {
          start: 0.2 * particleScale,
          end: 0
        },
        speed: {
          min: 10,
          max: 40
        },
        lifespan: 500,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: 30,
        alpha: {
          start: 0.9,
          end: 0
        }
      });
    } else {
      this.trailEmitter = this.add.particles(0, 0, `particle`, {
        follow: this.player,
        scale: {
          start: 0.3 * particleScale,
          end: 0
        },
        speed: 50,
        lifespan: 300,
        blendMode: Phaser.BlendModes.ADD,
        tint: config.tint,
        frequency: Math.floor(50 / quality.particles)
      });
    }
  }
  createTutorialUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.title = this.add.text(width / 2, 40, `[INTERACTIVE TUTORIAL]`, {
      fontSize: `38px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    }).setOrigin(0.5);
    this.instructionBox = this.add.graphics();
    this.drawInstructionBox(width);
    this.instructionText = this.add.text(width / 2, 130, ``, {
      fontSize: `18px`,
      color: `#ffffff`,
      align: `center`,
      wordWrap: {
        width: 550
      }
    }).setOrigin(0.5);
    this.items = this.add.group();
    this.projectiles = this.add.group();
    this.weaponText = this.add.text(width / 2, height - 40, `[GUN]`, {
      fontSize: `24px`,
      color: `#00ffff`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    this.progressText = this.add.text(width / 2, height - 20, ``, {
      fontSize: `16px`,
      color: `#ffdd00`
    }).setOrigin(0.5);
    this.skipButton = this.add.text(width - 20, height - 20, `SKIP TUTORIAL`, {
      fontSize: `18px`,
      color: `#888888`,
      backgroundColor: `#222222`,
      padding: {
        x: 10,
        y: 5
      }
    }).setOrigin(1, 1).setInteractive({
      useHandCursor: true
    });
    this.skipButton.on(`pointerdown`, () => this.scene.start(`MenuScene`));
    this.controlHighlights = this.add.container(0, 0);
    this.controlHighlights.setDepth(100);
  }
  drawInstructionBox(width) {
    this.instructionBox.clear();
    this.instructionBox.fillStyle(0x000000, 0.7);
    this.instructionBox.fillRect(width / 2 - 300, 80, 600, 100);
    this.instructionBox.lineStyle(2, 0x00ffff, 0.8);
    this.instructionBox.strokeRect(width / 2 - 300, 80, 600, 100);
  }
  switchWeapon(weaponType) {
    this.currentWeapon = weaponType;
    this.weaponText.setText(`[${weaponType.toUpperCase()}]`);
    this.weaponText.setColor(weaponType === `gun` ? `#00ffff` : `#ffdd00`);
  }
  showOverview() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.title.setText(`[HOW TO PLAY]`);
    this.instructionBox.clear();
    this.instructionBox.fillStyle(0x000000, 0.6);
    this.instructionBox.fillRect(width / 2 - 350, 70, 700, height - 180);
    this.instructionBox.lineStyle(2, 0x00ffff, 0.8);
    this.instructionBox.strokeRect(width / 2 - 350, 70, 700, height - 180);
    this.overviewElements = [];
    const controlsTitle = this.add.text(width / 2, 95, `>> CONTROLS <<`, {
      fontSize: `24px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    this.overviewElements.push(controlsTitle);
    const instructions = [`← → ARROW KEYS - Move left/right`, `DOUBLE-TAP + HOLD - Dash`, `SPACE - Fire weapon`, `1 / 2 - Switch weapons`, `O - Activate Overcharge`, ``, `>> OBJECTIVE <<`, `Catch falling items before they hit the ground!`, `Avoid bombs or shoot them with your weapon!`, ``, `>> POWER-UPS <<`, `🛡️ Shield - Forgive 3 missed items`, `🧲 Magnet - Auto-attract positive items`, `⏱️ Slow-Mo - Slow down time`, ``, `Miss 3 items = GAME OVER!`];
    let yPos = 130;
    instructions.forEach(line => {
      const isHeader = line.includes(`>>`);
      const isHighlight = line.includes(`🛡️`) || line.includes(`←`);
      const text = this.add.text(width / 2, yPos, line, {
        fontSize: isHeader ? `20px` : `16px`,
        color: isHeader ? `#00ffff` : isHighlight ? `#ffdd00` : `#ffffff`,
        align: `center`,
        fontStyle: isHeader ? `bold` : `normal`
      }).setOrigin(0.5);
      this.overviewElements.push(text);
      yPos += line === `` ? 15 : 24;
    });
    this.instructionText.setText(`Ready to try it yourself?`).setY(height - 90);
    this.progressText.setText(`Press SPACE to start interactive tutorial`).setY(height - 65);
    this.spaceKey.once(`down`, () => this.clearOverviewAndStart());
  }
  clearOverviewAndStart() {
    this.overviewElements.forEach(element => element.destroy());
    this.overviewElements = [];
    const width = this.cameras.main.width;
    this.drawInstructionBox(width);
    this.instructionText.setY(130);
    this.title.setText(`[INTERACTIVE TUTORIAL]`);
    this.startTutorialStep(1);
  }
  startTutorialStep(step) {
    this.tutorialStep = step;
    const width = this.cameras.main.width;
    this.controlHighlights.removeAll(true);
    const stepConfigs = {
      1: {
        instruction: `Use ← → ARROW KEYS to move left and right\nTry moving in both directions!`,
        progress: `Step 1/5: Learn Movement`,
        highlight: () => this.highlightArrowKeys()
      },
      2: {
        instruction: `DOUBLE-TAP and HOLD an arrow key to DASH\nTry dashing left or right!`,
        progress: `Step 2/5: Learn Dashing`,
        highlight: () => this.highlightArrowKeys()
      },
      3: {
        instruction: `Catch the falling items by moving under them!\nCatch 3 items to continue`,
        progress: `Step 3/5: Catch Items (0/3)`,
        setup: () => this.setupItemSpawner(width),
        highlight: () => this.highlightArrowKeys()
      },
      4: {
        instruction: `Press 1 for GUN, 2 for NET\nTry switching to NET weapon!`,
        progress: `Step 4/5: Switch Weapons`,
        setup: () => this.cleanupStep3(),
        highlight: () => this.highlightNumberKeys()
      },
      5: {
        instruction: `Press SPACE to fire your weapon!\nDestroy the bomb to complete the tutorial`,
        progress: `Step 5/5: Use Weapons`,
        setup: () => this.setupBombTarget(width),
        highlight: () => this.highlightSpaceKey()
      }
    };
    const config = stepConfigs[step];
    if (config) {
      this.instructionText.setText(config.instruction);
      this.progressText.setText(config.progress);
      if (config.setup) config.setup();
      if (config.highlight) config.highlight();
    }
  }
  highlightArrowKeys() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const leftKey = this.add.text(width / 2 - 80, height - 120, `←`, {
      fontSize: `48px`,
      color: `#00ffff`,
      backgroundColor: `#000000`,
      padding: {
        x: 15,
        y: 10
      }
    });
    const rightKey = this.add.text(width / 2 + 80, height - 120, `→`, {
      fontSize: `48px`,
      color: `#00ffff`,
      backgroundColor: `#000000`,
      padding: {
        x: 15,
        y: 10
      }
    }).setOrigin(1, 0);
    this.tweens.add({
      targets: [leftKey, rightKey],
      alpha: {
        from: 1,
        to: 0.3
      },
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    this.controlHighlights.add([leftKey, rightKey]);
  }
  highlightNumberKeys() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const key1 = this.add.text(width / 2 - 60, height - 120, `1`, {
      fontSize: `48px`,
      color: `#00ffff`,
      backgroundColor: `#000000`,
      padding: {
        x: 20,
        y: 10
      }
    });
    const key2 = this.add.text(width / 2 + 60, height - 120, `2`, {
      fontSize: `48px`,
      color: `#ffdd00`,
      backgroundColor: `#000000`,
      padding: {
        x: 20,
        y: 10
      }
    }).setOrigin(1, 0);
    this.tweens.add({
      targets: [key1, key2],
      alpha: {
        from: 1,
        to: 0.3
      },
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    this.controlHighlights.add([key1, key2]);
  }
  highlightSpaceKey() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const spaceKey = this.add.text(width / 2, height - 120, `SPACE`, {
      fontSize: `36px`,
      color: `#ff00ff`,
      backgroundColor: `#000000`,
      padding: {
        x: 30,
        y: 15
      }
    }).setOrigin(0.5);
    this.tweens.add({
      targets: spaceKey,
      alpha: {
        from: 1,
        to: 0.3
      },
      scale: {
        from: 1,
        to: 1.1
      },
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    this.controlHighlights.add(spaceKey);
  }
  setupItemSpawner(width) {
    if (this.spawnTutorialItem) {
      this.spawnTutorialItem.destroy();
      this.spawnTutorialItem = null;
    }
    this.spawnTutorialItem = this.time.addEvent({
      delay: 3500,
      callback: () => {
        if (this.tutorialStep === 3 && this.catchComplete < 3) {
          const activeItems = this.items && this.items.children ? this.items.children.entries.length : 0;
          if (activeItems < 2) {
            const x = Phaser.Math.Between(100, width - 100);
            const item = this.add.sprite(x, -30, `item_regular`);
            item.speed = 150;
            item.itemType = `regular`;
            if (this.items) {
              this.items.add(item);
            }
          }
        }
      },
      loop: true
    });
  }
  cleanupStep3() {
    if (this.spawnTutorialItem && !this.spawnTutorialItem.hasDispatched) {
      this.spawnTutorialItem.destroy();
      this.spawnTutorialItem = null;
    }
    if (this.items && this.items.clear) {
      this.items.clear(true, true);
    }
  }
  setupBombTarget(width) {
    const bomb = this.add.sprite(width / 2, 150, `item_bomb`);
    bomb.itemType = `bomb`;
    bomb.speed = 0;
    this.items.add(bomb);
    this.projectileCooldown = 0;
  }
  handleDoubleTap(direction) {
    if (this.tutorialStep !== 2) return;
    const currentTime = this.time.now;
    const doubleTapWindow = 300;
    if (currentTime - this.dashCooldown < 1000) return;
    const tapProperty = direction === `left` ? `lastLeftTap` : `lastRightTap`;
    if (currentTime - this[tapProperty] < doubleTapWindow && !this.isDashing) {
      this.activateDash(direction);
      this[tapProperty] = 0;
    } else {
      this[tapProperty] = currentTime;
    }
  }
  activateDash(direction) {
    this.isDashing = true;
    this.dashDirection = direction;
    this.dashComplete = true;
    this.trailEmitter.setFrequency(15);
    this.trailEmitter.setConfig({
      scale: {
        start: 0.5,
        end: 0
      },
      tint: [0x00ffff, 0xff00ff]
    });
  }
  endDash(direction) {
    if (this.isDashing && this.dashDirection === direction) {
      this.isDashing = false;
      this.dashDirection = null;
      this.dashCooldown = this.time.now;
      this.trailEmitter.setFrequency(50);
      this.trailEmitter.setConfig({
        scale: {
          start: 0.3,
          end: 0
        },
        tint: 0x00ff88
      });
    }
  }
  handlePlayerMovement(delta, width) {
    const moveSpeed = this.isDashing ? this.player.speed * 2.5 : 400;
    if (this.cursors.left.isDown) {
      this.player.x -= (this.isDashing && this.dashDirection === `left` ? moveSpeed : 400) * delta / 1000;
      if (this.tutorialStep === 1) this.movementComplete = true;
    } else if (this.cursors.right.isDown) {
      this.player.x += (this.isDashing && this.dashDirection === `right` ? moveSpeed : 400) * delta / 1000;
      if (this.tutorialStep === 1) this.movementComplete = true;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
  }
  updateStep1() {
    if (this.movementComplete) {
      this.time.delayedCall(500, () => this.startTutorialStep(2));
    }
  }
  updateStep2(time) {
    if (this.isDashing && time % 100 < 50) {
      this.dashEmitter.setPosition(this.player.x, this.player.y);
      this.dashEmitter.explode(3);
    }
    if (this.dashComplete) {
      this.time.delayedCall(1000, () => this.startTutorialStep(3));
    }
  }
  updateStep3(delta, height) {
    if (!this.items || !this.items.children) return;
    this.items.children.entries.forEach(item => {
      if (!item || !item.active) return;
      item.y += item.speed * delta / 1000;
      if (Math.abs(item.x - this.player.x) < 40 && Math.abs(item.y - this.player.y) < 30) {
        if (this.catchEmitter) {
          this.catchEmitter.setPosition(item.x, item.y);
          this.catchEmitter.setConfig({
            tint: 0x00ffff
          });
          this.catchEmitter.explode(20);
        }
        item.destroy();
        this.catchComplete++;
        const progressBar = `[${'█'.repeat(this.catchComplete)}${'░'.repeat(3 - this.catchComplete)}]`;
        if (this.progressText) {
          this.progressText.setText(`Step 3/5: Catch Items ${progressBar} ${this.catchComplete}/3`);
        }
        if (this.catchComplete >= 3) {
          this.time.delayedCall(500, () => this.startTutorialStep(4));
        }
      }
      if (item.y > height && item.active) {
        item.destroy();
      }
    });
  }
  updateStep4() {
    if (this.weaponComplete) {
      this.time.delayedCall(500, () => this.startTutorialStep(5));
    }
  }
  updateStep5(time) {
    if (this.spaceKey.isDown && time - this.projectileCooldown > 300) {
      this.projectileCooldown = time;
      this.fireProjectile();
    }
    this.updateProjectiles();
  }
  fireProjectile() {
    const bullet = this.add.sprite(this.player.x, this.player.y - 20, `bullet`);
    bullet.speed = 600;
    this.projectiles.add(bullet);
    this.catchEmitter.setPosition(this.player.x, this.player.y - 20);
    this.catchEmitter.setConfig({
      tint: 0x00ffff
    });
    this.catchEmitter.explode(5);
  }
  updateProjectiles() {
    if (!this.projectiles || !this.projectiles.children) return;
    this.projectiles.children.entries.forEach(projectile => {
      if (!projectile || !projectile.active) return;
      projectile.y -= projectile.speed * this.game.loop.delta / 1000;
      if (this.items && this.items.children) {
        this.items.children.entries.forEach(item => {
          if (!item || !item.active) return;
          if (item.itemType === `bomb` && Math.abs(projectile.x - item.x) < 20 && Math.abs(projectile.y - item.y) < 20) {
            this.handleBombDestruction(item, projectile);
          }
        });
      }
      if (projectile.y < -20 && projectile.active) {
        projectile.destroy();
      }
    });
  }
  handleBombDestruction(item, projectile) {
    this.catchEmitter.setPosition(item.x, item.y);
    this.catchEmitter.setConfig({
      tint: 0xff0066
    });
    this.catchEmitter.explode(40);
    this.cameras.main.flash(100, 255, 0, 102, 0.3);
    item.destroy();
    projectile.destroy();
    this.time.delayedCall(1000, () => this.completeTutorial());
  }
  update(time, delta) {
    super.update(time, delta);
    if (this.tutorialStep === -1) return;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (this.tutorialStep >= 1 && this.tutorialStep <= 3 || this.tutorialStep === 5) {
      this.handlePlayerMovement(delta, width);
    }
    switch (this.tutorialStep) {
      case 1:
        this.updateStep1();
        break;
      case 2:
        this.updateStep2(time);
        break;
      case 3:
        this.updateStep3(delta, height);
        break;
      case 4:
        this.updateStep4();
        break;
      case 5:
        this.updateStep5(time);
        break;
    }
  }
  completeTutorial() {
    if (this.spawnTutorialItem && !this.spawnTutorialItem.hasDispatched) {
      this.spawnTutorialItem.destroy();
      this.spawnTutorialItem = null;
    }
    if (this.input && this.input.keyboard) {
      try {
        this.input.keyboard.removeAllListeners();
      } catch (e) {
        console.warn('Error removing keyboard listeners:', e);
      }
    }
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const completeBox = this.add.graphics();
    completeBox.fillStyle(0x000000, 0.9);
    completeBox.fillRect(width / 2 - 250, height / 2 - 100, 500, 200);
    completeBox.lineStyle(3, 0x00ff00, 1);
    completeBox.strokeRect(width / 2 - 250, height / 2 - 100, 500, 200);
    this.add.text(width / 2, height / 2 - 50, `✓ TUTORIAL COMPLETE!`, {
      fontSize: `36px`,
      color: `#00ff00`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2, `You're ready to play!`, {
      fontSize: `20px`,
      color: `#ffffff`
    }).setOrigin(0.5);
    const continueButton = this.add.text(width / 2, height / 2 + 50, `BACK TO MENU`, {
      fontSize: `24px`,
      color: `#00ffff`,
      backgroundColor: `#000000`,
      padding: {
        x: 20,
        y: 10
      }
    }).setOrigin(0.5).setInteractive({
      useHandCursor: true
    });
    continueButton.on(`pointerover`, () => continueButton.setColor(`#ffdd00`));
    continueButton.on(`pointerout`, () => continueButton.setColor(`#00ffff`));
    continueButton.on(`pointerdown`, () => this.scene.start(`MenuScene`));
  }
}
class ShopScene extends BaseScene {
  constructor() {
    super({
      key: "ShopScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 60, `[COSMETIC SHOP]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const currency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
    const currencyBox = this.add.graphics();
    currencyBox.fillStyle(0x000000, 0.7);
    currencyBox.fillRect(width / 2 - 150, 110, 300, 40);
    currencyBox.lineStyle(2, 0x00ffff, 0.8);
    currencyBox.strokeRect(width / 2 - 150, 110, 300, 40);
    this.currencyText = this.add.text(width / 2, 130, `💎 ${currency}`, {
      fontSize: `22px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    });
    this.currencyText.setOrigin(0.5);
    const shopBox = this.add.graphics();
    shopBox.fillStyle(0x000000, 0.4);
    shopBox.fillRect(width / 2 - 350, 170, 700, 440);
    shopBox.lineStyle(2, 0x00ffff, 0.5);
    shopBox.strokeRect(width / 2 - 350, 170, 700, 440);
    const skins = [{
      name: `fire`,
      price: 200,
      unlocked: false
    }, {
      name: `ice`,
      price: 200,
      unlocked: false
    }, {
      name: `gold`,
      price: 300,
      unlocked: false
    }, {
      name: `purple`,
      price: 250,
      unlocked: false
    }];
    const achievements = StorageManager.get(STORAGE_KEYS.ACHIEVEMENTS, {});
    if (achievements.combo_master?.unlocked) skins.find(s => s.name === `fire`).unlocked = true;
    if (achievements.speed_demon?.unlocked) skins.find(s => s.name === `ice`).unlocked = true;
    if (achievements.survivor?.unlocked) skins.find(s => s.name === `gold`).unlocked = true;
    if (achievements.untouchable?.unlocked) skins.find(s => s.name === `purple`).unlocked = true;
    const ownedSkins = StorageManager.get(STORAGE_KEYS.OWNED_SKINS, [`default`]);
    let yPos = 200;
    this.add.text(width / 2, 190, `PLAYER SKINS`, {
      fontSize: `24px`,
      color: `#ffdd00`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    yPos += 30;
    skins.forEach(skin => {
      const owned = ownedSkins.includes(skin.name) || skin.unlocked;
      const itemBox = this.add.graphics();
      itemBox.fillStyle(owned ? 0x002200 : 0x111111, 0.6);
      itemBox.fillRect(width / 2 - 320, yPos - 5, 640, 60);
      itemBox.lineStyle(1, owned ? 0x00ff00 : 0x00ffff, 0.6);
      itemBox.strokeRect(width / 2 - 320, yPos - 5, 640, 60);
      this.add.text(width / 2 - 300, yPos + 10, `${skin.name.toUpperCase()} SKIN`, {
        fontSize: `16px`,
        color: `#ffffff`,
        fontStyle: `bold`
      }).setOrigin(0, 0);
      if (owned) {
        this.add.text(width / 2 + 300, yPos + 10, `OWNED`, {
          fontSize: `16px`,
          color: `#00ff00`,
          fontStyle: `bold`
        }).setOrigin(1, 0);
      } else {
        const canAfford = currency >= skin.price;
        const buyButton = this.add.text(width / 2 + 300, yPos + 10, `BUY (💎 ${skin.price})`, {
          fontSize: `16px`,
          color: canAfford ? `#00ffff` : `#555555`,
          fontStyle: `bold`
        }).setOrigin(1, 0);
        if (canAfford) {
          buyButton.setInteractive({
            useHandCursor: true
          });
          buyButton.on(`pointerover`, () => {
            buyButton.setColor(`#ffdd00`);
            buyButton.setScale(1.05);
          });
          buyButton.on(`pointerout`, () => {
            buyButton.setColor(`#00ffff`);
            buyButton.setScale(1);
          });
          buyButton.on(`pointerdown`, () => {
            StorageManager.set(STORAGE_KEYS.CURRENCY, currency - skin.price);
            ownedSkins.push(skin.name);
            StorageManager.set(STORAGE_KEYS.OWNED_SKINS, ownedSkins);
            if (this.game.sounds?.powerup) this.game.sounds.powerup();
            this.scene.restart();
          });
        }
      }
      yPos += 70;
    });
    this.createButton(width / 2, height - 70, `BACK TO MENU`, () => {
      if (this.game.sounds?.click) this.game.sounds.click();
      this.scene.start(`MenuScene`);
    });
  }
}
class StatsScene extends BaseScene {
  constructor() {
    super({
      key: "StatsScene"
    });
  }
  create() {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const title = this.add.text(width / 2, 50, `[STATISTICS]`, {
      fontSize: `48px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#ff00ff`,
      strokeThickness: 2
    });
    title.setOrigin(0.5);
    const stats = StorageManager.get(STORAGE_KEYS.STATS, {});
    const boxWidth = Math.min(800, width - 40);
    const boxHeight = height - 180;
    const statsBox = this.add.graphics();
    statsBox.fillStyle(0x000000, 0.5);
    statsBox.fillRect(width / 2 - boxWidth / 2, 100, boxWidth, boxHeight);
    statsBox.lineStyle(2, 0x00ffff, 0.6);
    statsBox.strokeRect(width / 2 - boxWidth / 2, 100, boxWidth, boxHeight);
    const leftColX = width / 2 - boxWidth / 2 + 30;
    const rightColX = width / 2 + 30;
    const labelWidth = boxWidth / 2 - 80;
    let leftY = 130;
    let rightY = 130;
    const spacing = 28;
    const sectionSpacing = 45;
    const createStat = (x, y, label, value, valueColor = `#00ffff`) => {
      this.add.text(x, y, label, {
        fontSize: `16px`,
        color: `#ffffff`
      });
      this.add.text(x + labelWidth, y, `${value}`, {
        fontSize: `16px`,
        color: valueColor,
        fontStyle: `bold`
      }).setOrigin(1, 0);
      return y + spacing;
    };
    const createHeader = (x, y, text) => {
      this.add.text(x + labelWidth / 2, y, text, {
        fontSize: `20px`,
        color: `#ff00ff`,
        fontStyle: `bold`
      }).setOrigin(0.5, 0);
      return y + 32;
    };
    leftY = createHeader(leftColX, leftY, `>> GAMEPLAY <<`);
    const gamesPlayed = stats.gamesPlayed || 0;
    leftY = createStat(leftColX, leftY, `Games Played`, gamesPlayed);
    const totalScore = stats.totalScore || 0;
    leftY = createStat(leftColX, leftY, `Total Score`, totalScore);
    const avgScore = gamesPlayed > 0 ? Math.floor(totalScore / gamesPlayed) : 0;
    leftY = createStat(leftColX, leftY, `Average Score`, avgScore, `#ffdd00`);
    const highScore = StorageManager.getInt(STORAGE_KEYS.HIGH_SCORE);
    leftY = createStat(leftColX, leftY, `High Score`, highScore, `#ff0066`);
    leftY += sectionSpacing - spacing;
    leftY = createHeader(leftColX, leftY, `>> COLLECTION <<`);
    const totalItemsCaught = stats.totalItemsCaught || 0;
    leftY = createStat(leftColX, leftY, `Items Caught`, totalItemsCaught);
    const goldCaught = stats.goldCaught || 0;
    leftY = createStat(leftColX, leftY, `Gold Items`, goldCaught, `#ffdd00`);
    const bombsDestroyed = stats.bombsDestroyed || 0;
    leftY = createStat(leftColX, leftY, `Bombs Destroyed`, bombsDestroyed, `#ff0066`);
    const maxCombo = stats.maxCombo || 0;
    leftY = createStat(leftColX, leftY, `Best Combo`, `${maxCombo}x`, `#ff00ff`);
    rightY = createHeader(rightColX, rightY, `>> TIME PLAYED <<`);
    const totalTimePlayed = stats.totalTimePlayed || 0;
    const hours = Math.floor(totalTimePlayed / 3600);
    const minutes = Math.floor(totalTimePlayed % 3600 / 60);
    const seconds = totalTimePlayed % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    rightY = createStat(rightColX, rightY, `Total Time`, timeStr);
    const longestSession = stats.longestSession || 0;
    const longMin = Math.floor(longestSession / 60);
    const longSec = longestSession % 60;
    const longStr = longMin > 0 ? `${longMin}m ${longSec}s` : `${longSec}s`;
    rightY = createStat(rightColX, rightY, `Longest Session`, longStr, `#ffdd00`);
    rightY += sectionSpacing - spacing;
    rightY = createHeader(rightColX, rightY, `>> POWERUPS <<`);
    const powerupsCollected = stats.powerupsCollected || {};
    let mostUsedPowerup = `None`;
    let maxCount = 0;
    Object.entries(powerupsCollected).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedPowerup = type.toUpperCase();
      }
    });
    rightY = createStat(rightColX, rightY, `Favorite`, mostUsedPowerup, `#ff00ff`);
    const totalPowerups = Object.values(powerupsCollected).reduce((a, b) => a + b, 0);
    rightY = createStat(rightColX, rightY, `Total Collected`, totalPowerups);
    this.createButton(width / 2, height - 60, `BACK TO MENU`, () => {
      this.scene.start(`MenuScene`);
    });
  }
}
class GameOverScene extends BaseScene {
  constructor() {
    super({
      key: "GameOverScene"
    });
  }
  create(data) {
    super.create();
    const {
      width,
      height
    } = this.cameras.main;
    this.createCyberpunkBackground();
    const currentLevel = StorageManager.getInt(STORAGE_KEYS.PLAYER_LEVEL, 1);
    const currentXP = StorageManager.getInt(STORAGE_KEYS.PLAYER_XP, 0);
    const bonuses = LevelingSystem.getStatBonuses(currentLevel);
    const earnedXP = Math.floor((data.earnedXP || 0) * bonuses.xpMultiplier);
    let newXP = currentXP + earnedXP;
    let newLevel = currentLevel;
    const levelUps = [];
    while (newXP >= LevelingSystem.getXPForLevel(newLevel + 1)) {
      newXP -= LevelingSystem.getXPForLevel(newLevel + 1);
      newLevel++;
      levelUps.push(newLevel);
    }
    StorageManager.set(STORAGE_KEYS.PLAYER_LEVEL, newLevel);
    StorageManager.set(STORAGE_KEYS.PLAYER_XP, newXP);
    const hasLevelUp = levelUps.length > 0;
    const highScore = StorageManager.getInt(STORAGE_KEYS.HIGH_SCORE);
    const isNewRecord = data.score >= highScore;
    const modalHeight = 380 + (hasLevelUp ? 110 : 0) + (isNewRecord ? 70 : 0);
    const modalY = Math.max(60, (height - modalHeight) / 2);
    const resultsBox = this.add.graphics();
    resultsBox.fillStyle(0x000000, 0.85);
    resultsBox.fillRect(width / 2 - 350, modalY, 700, modalHeight);
    resultsBox.lineStyle(3, 0xff0066, 0.9);
    resultsBox.strokeRect(width / 2 - 350, modalY, 700, modalHeight);
    resultsBox.lineStyle(1, 0xff00ff, 0.3);
    resultsBox.strokeRect(width / 2 - 347, modalY + 3, 694, modalHeight - 6);
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0xff0066, 0.15);
    headerBg.fillRect(width / 2 - 350, modalY, 700, 70);
    headerBg.lineStyle(1, 0xff0066, 0.4);
    headerBg.lineBetween(width / 2 - 350, modalY + 70, width / 2 + 350, modalY + 70);
    const gameOverGlow = this.add.text(width / 2, modalY + 35, `[GAME_OVER]`, {
      fontSize: `56px`,
      color: `#ff0066`,
      fontStyle: `bold`
    }).setOrigin(0.5).setAlpha(0.3);
    this.tweens.add({
      targets: gameOverGlow,
      scale: {
        from: 1,
        to: 1.05
      },
      alpha: {
        from: 0.3,
        to: 0.5
      },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    let currentY = modalY + 90;
    const scoreBox = this.add.graphics();
    scoreBox.fillStyle(0x001122, 0.7);
    scoreBox.fillRect(width / 2 - 320, currentY, 640, 50);
    scoreBox.lineStyle(2, 0x00ffff, 0.8);
    scoreBox.strokeRect(width / 2 - 320, currentY, 640, 50);
    this.add.text(width / 2, currentY + 25, `SCORE: ${data.score}`, {
      fontSize: `32px`,
      color: `#00ffff`,
      fontStyle: `bold`,
      stroke: `#000000`,
      strokeThickness: 2
    }).setOrigin(0.5);
    currentY += 65;
    const statsBox = this.add.graphics();
    statsBox.fillStyle(0x000000, 0.5);
    statsBox.fillRect(width / 2 - 320, currentY, 640, 120);
    statsBox.lineStyle(1, 0x00ffff, 0.5);
    statsBox.strokeRect(width / 2 - 320, currentY, 640, 120);
    const statItems = [{
      label: `LEVEL`,
      value: data.level,
      color: `#ffffff`,
      x: -280
    }, {
      label: `MAX COMBO`,
      value: `${data.maxCombo}x`,
      color: `#ff00ff`,
      x: -90
    }, {
      label: `GOLD`,
      value: data.goldCaught,
      color: `#ffdd00`,
      x: 90
    }, {
      label: `EARNED`,
      value: `💎 ${data.earnedCurrency}`,
      color: `#00ffff`,
      x: 200
    }];
    statItems.forEach(stat => {
      this.add.text(width / 2 + stat.x, currentY + 25, stat.label, {
        fontSize: `12px`,
        color: `#888888`
      }).setOrigin(0.5, 0);
      this.add.text(width / 2 + stat.x, currentY + 45, stat.value, {
        fontSize: `18px`,
        color: stat.color,
        fontStyle: `bold`
      }).setOrigin(0.5, 0);
    });
    const minutes = Math.floor((data.gameTime || 0) / 60);
    const seconds = (data.gameTime || 0) % 60;
    this.add.text(width / 2 - 280, currentY + 80, `ITEMS: ${data.itemsCaught || 0}`, {
      fontSize: `14px`,
      color: `#cccccc`
    });
    this.add.text(width / 2 - 90, currentY + 80, `TIME: ${minutes}:${seconds.toString().padStart(2, '0')}`, {
      fontSize: `14px`,
      color: `#cccccc`
    });
    this.add.text(width / 2 + 90, currentY + 80, `XP: +${earnedXP}`, {
      fontSize: `14px`,
      color: `#ff00ff`,
      fontStyle: `bold`
    });
    currentY += 135;
    if (hasLevelUp) {
      const levelUpBox = this.add.graphics();
      levelUpBox.fillStyle(0x220033, 0.9);
      levelUpBox.fillRect(width / 2 - 320, currentY, 640, 95);
      levelUpBox.lineStyle(2, 0xff00ff, 1);
      levelUpBox.strokeRect(width / 2 - 320, currentY, 640, 95);
      this.add.text(width / 2, currentY + 20, `★ LEVEL UP! ★`, {
        fontSize: `24px`,
        color: `#ff00ff`,
        fontStyle: `bold`,
        stroke: `#ffffff`,
        strokeThickness: 2
      }).setOrigin(0.5);
      const newRank = LevelingSystem.getRankTitle(newLevel);
      const levelInfo = this.add.text(width / 2, currentY + 48, `${currentLevel} → ${newLevel} [${newRank.title}]`, {
        fontSize: `20px`,
        color: newRank.color,
        fontStyle: `bold`
      }).setOrigin(0.5);
      const newPerks = LevelingSystem.getLevelPerks(newLevel);
      this.add.text(width / 2, currentY + 73, `${newPerks.length} Active Perks`, {
        fontSize: `14px`,
        color: `#00ff00`
      }).setOrigin(0.5);
      this.tweens.add({
        targets: levelInfo,
        scale: {
          from: 0.95,
          to: 1.05
        },
        duration: 600,
        yoyo: true,
        repeat: 2
      });
      levelUps.forEach(level => {
        const reward = LevelingSystem.getLevelReward(level);
        if (reward && reward.type === 'currency') {
          const currentCurrency = StorageManager.getInt(STORAGE_KEYS.CURRENCY);
          StorageManager.set(STORAGE_KEYS.CURRENCY, currentCurrency + reward.amount);
        }
      });
      currentY += 110;
    }
    this.saveToLeaderboard(`PLAYER`, data.score, data.level, data.maxCombo);
    if (isNewRecord) {
      const recordBox = this.add.graphics();
      recordBox.fillStyle(0x332200, 0.9);
      recordBox.fillRect(width / 2 - 320, currentY, 640, 55);
      recordBox.lineStyle(2, 0xffdd00, 1);
      recordBox.strokeRect(width / 2 - 320, currentY, 640, 55);
      const newHighText = this.add.text(width / 2, currentY + 28, `★ NEW PERSONAL RECORD ★`, {
        fontSize: `20px`,
        color: `#ffdd00`,
        fontStyle: `bold`,
        stroke: `#000000`,
        strokeThickness: 2
      }).setOrigin(0.5);
      this.tweens.add({
        targets: newHighText,
        scale: {
          from: 1,
          to: 1.08
        },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
      this.promptForName(data.score, data.level, data.maxCombo, modalY + modalHeight + 10);
    }
    const buttonY = Math.min(height - 70, modalY + modalHeight + 70);
    this.createButton(width / 2 - 130, buttonY, `PLAY AGAIN`, () => {
      if (this.game.sounds?.click) this.game.sounds.click();
      this.scene.start(`GameScene`);
    });
    this.createButton(width / 2 + 130, buttonY, `MAIN MENU`, () => {
      if (this.game.sounds?.click) this.game.sounds.click();
      this.scene.start(`MenuScene`);
    });
  }
  promptForName(score, level, combo, startY) {
    const width = this.cameras.main.width;
    const inputY = startY || 520;
    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x000000, 0.9);
    inputBg.fillRect(width / 2 - 250, inputY, 500, 100);
    inputBg.lineStyle(2, 0x00ffff, 0.8);
    inputBg.strokeRect(width / 2 - 250, inputY, 500, 100);
    const promptText = this.add.text(width / 2, inputY + 20, `ENTER NAME FOR GLOBAL LEADERBOARD`, {
      fontSize: `14px`,
      color: `#00ffff`,
      fontStyle: `bold`
    }).setOrigin(0.5);
    const inputBox = this.add.text(width / 2, inputY + 50, `PLAYER`, {
      fontSize: `22px`,
      color: `#ffdd00`,
      backgroundColor: `#1a1a1a`,
      padding: {
        x: 20,
        y: 8
      }
    }).setOrigin(0.5);
    const hintText = this.add.text(width / 2, inputY + 78, `Press ENTER to submit`, {
      fontSize: `12px`,
      color: `#888888`,
      fontStyle: `italic`
    }).setOrigin(0.5);
    let playerName = `PLAYER`;
    let submitted = false;
    const keyHandler = event => {
      if (submitted) return;
      if (event.key === `Enter`) {
        submitted = true;
        this.updateLeaderboardEntry(playerName, score, level, combo);
        this.input.keyboard.off(`keydown`, keyHandler);
        promptText.destroy();
        inputBox.destroy();
        hintText.destroy();
        inputBg.destroy();
        const successText = this.add.text(width / 2, 560, `✓ Submitted to global leaderboard!`, {
          fontSize: `16px`,
          color: `#00ff00`,
          fontStyle: `bold`,
          backgroundColor: `#002200`,
          padding: {
            x: 15,
            y: 8
          }
        }).setOrigin(0.5);
        this.tweens.add({
          targets: successText,
          alpha: {
            from: 1,
            to: 0
          },
          y: 540,
          duration: 2000,
          delay: 1000,
          onComplete: () => successText.destroy()
        });
      } else if (event.key === `Backspace`) {
        playerName = playerName.slice(0, -1);
        inputBox.setText(playerName || `_`);
      } else if (event.key.length === 1 && playerName.length < 12) {
        playerName += event.key.toUpperCase();
        inputBox.setText(playerName);
      }
    };
    this.input.keyboard.on(`keydown`, keyHandler);
  }
  async saveToLeaderboard(name, score, level, combo) {
    const leaderboard = StorageManager.get(STORAGE_KEYS.LEADERBOARD, []);
    leaderboard.push({
      name: name || `PLAYER`,
      score: score,
      date: Date.now()
    });
    leaderboard.sort((a, b) => b.score - a.score);
    StorageManager.set(STORAGE_KEYS.LEADERBOARD, leaderboard.slice(0, 50));
    PlayLimitManager.recordScoreSubmission(score);
    try {
      const success = await GlobalLeaderboard.submitScore(name, score, level, combo);
      if (!success) {
        console.warn('Failed to submit to global leaderboard');
      }
    } catch (error) {
      console.error('Error submitting to leaderboard:', error);
    }
  }
  async updateLeaderboardEntry(name, score, level, combo) {
    const leaderboard = StorageManager.get(STORAGE_KEYS.LEADERBOARD, []);
    const entry = leaderboard.find(e => e.score === score && e.name === `PLAYER`);
    if (entry) {
      entry.name = name || `PLAYER`;
    }
    leaderboard.sort((a, b) => b.score - a.score);
    StorageManager.set(STORAGE_KEYS.LEADERBOARD, leaderboard.slice(0, 50));
    await GlobalLeaderboard.submitScore(name, score, level, combo);
  }
  createButton(x, y, text, callback) {
    const button = this.add.text(x, y, text, {
      fontSize: `24px`,
      color: `#ffffff`,
      backgroundColor: `#333344`,
      padding: {
        x: 20,
        y: 10
      }
    });
    button.setOrigin(0.5);
    button.setInteractive({
      useHandCursor: true
    });
    button.on(`pointerover`, () => {
      button.setColor(`#00ff88`);
    });
    button.on(`pointerout`, () => {
      button.setColor(`#ffffff`);
    });
    button.on(`pointerdown`, callback);
  }
}
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: `app`,
    width: 1024,
    height: 1024,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  backgroundColor: `#1A1A28`,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        y: 0
      },
      debug: false
    }
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  scene: [BootScene, MenuScene, PlayerHubScene, ProgressionScene, GearScene, MarketScene, GameModesScene, TimeAttackScene, SurvivalScene, PrecisionScene, ShopScene, TutorialScene, AchievementsScene, LeaderboardScene, SettingsScene, ChallengesScene, UpgradesScene, StatsScene, GameScene, PauseScene, GameOverScene]
};
export const game = new Phaser.Game(config);
