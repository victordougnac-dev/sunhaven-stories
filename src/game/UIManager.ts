import type { EasterEggDef, GameSettings, Interactable, QualityPreset, TimeMode, WeatherMode } from './types';

export interface UICallbacks {
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onMainMenu: () => void;
  onSave: () => void;
  onResetSave: () => void;
  onSettingsChange: (s: GameSettings) => void;
  onAbortMission: () => void;
  onToggleMap: () => void;
}

export class UIManager {
  public loadingScreen = document.getElementById('loading-screen')!;
  public loadingBar = document.getElementById('loading-bar')!;
  public loadingStatus = document.getElementById('loading-status')!;

  public mainMenu = document.getElementById('main-menu')!;
  public hud = document.getElementById('hud')!;
  public mapModal = document.getElementById('map-modal')!;
  public pauseModal = document.getElementById('pause-modal')!;
  public settingsModal = document.getElementById('settings-modal')!;
  public controlsModal = document.getElementById('controls-modal')!;
  public creditsModal = document.getElementById('credits-modal')!;
  public fadeCurtain = document.getElementById('fade-curtain')!;

  private hudDistrict = document.getElementById('hud-district')!;
  private hudTime = document.getElementById('hud-time')!;
  private hudWeather = document.getElementById('hud-weather')!;
  private hudCash = document.getElementById('hud-cash')!;
  private hudSecrets = document.getElementById('hud-secrets')!;

  private interactionPrompt = document.getElementById('interaction-prompt')!;
  private promptKey = document.getElementById('prompt-key')!;
  private promptText = document.getElementById('prompt-text')!;

  private vehicleHud = document.getElementById('vehicle-hud')!;
  private hudVehicleName = document.getElementById('hud-vehicle-name')!;
  private hudSpeed = document.getElementById('hud-speed')!;
  private hudSpeedUnit = document.getElementById('hud-speed-unit')!;
  private hudGear = document.getElementById('hud-gear')!;
  private hudAltitude = document.getElementById('hud-altitude')!;

  private missionPanel = document.getElementById('mission-panel')!;
  private missionTitle = document.getElementById('mission-title')!;
  private missionObjective = document.getElementById('mission-objective')!;
  private missionTimer = document.getElementById('mission-timer')!;

  private dialogueBox = document.getElementById('dialogue-box')!;
  private dialogueSpeaker = document.getElementById('dialogue-speaker')!;
  private dialogueText = document.getElementById('dialogue-text')!;
  public dialogueOpen = false;

  private districtBanner = document.getElementById('district-banner')!;
  private districtBannerName = document.getElementById('district-banner-name')!;
  private bannerTimeout: number | null = null;

  private toastContainer = document.getElementById('toast-container')!;
  private photoOverlay = document.getElementById('photo-overlay')!;
  private controlsStrip = document.getElementById('controls-strip')!;

  private settings: GameSettings;
  private cb: UICallbacks;

  constructor(settings: GameSettings, cb: UICallbacks) {
    this.settings = { ...settings };
    this.cb = cb;
    this.bindEvents();
    this.syncSettingsUI();
  }

  private bindEvents(): void {
    document.getElementById('btn-play')?.addEventListener('click', () => this.cb.onPlay());
    document.getElementById('btn-resume')?.addEventListener('click', () => this.cb.onResume());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.cb.onPause());
    document.getElementById('btn-pause-mainmenu')?.addEventListener('click', () => this.cb.onMainMenu());
    document.getElementById('btn-pause-save')?.addEventListener('click', () => this.cb.onSave());
    document.getElementById('btn-abort-mission')?.addEventListener('click', () => this.cb.onAbortMission());
    document.getElementById('btn-open-map')?.addEventListener('click', () => this.cb.onToggleMap());
    document.getElementById('btn-close-map')?.addEventListener('click', () => this.cb.onToggleMap());

    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    // Modals open/close
    document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
      this.settingsModal.classList.remove('hidden');
    });
    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.settingsModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
    });

    document.getElementById('btn-menu-controls')?.addEventListener('click', () => {
      this.controlsModal.classList.remove('hidden');
    });
    document.getElementById('btn-pause-controls')?.addEventListener('click', () => {
      this.controlsModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-controls')?.addEventListener('click', () => {
      this.controlsModal.classList.add('hidden');
    });

    document.getElementById('btn-menu-credits')?.addEventListener('click', () => {
      this.creditsModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-credits')?.addEventListener('click', () => {
      this.creditsModal.classList.add('hidden');
    });

    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      this.cb.onResetSave();
      this.showToast('Saved progress reset.', 'info');
    });

    this.dialogueBox.addEventListener('click', () => this.hideDialogue());

    // Settings inputs
    const qSel = document.getElementById('setting-quality') as HTMLSelectElement;
    qSel?.addEventListener('change', () => {
      this.settings.quality = qSel.value as QualityPreset;
      this.cb.onSettingsChange(this.settings);
    });

    const volIn = document.getElementById('setting-volume') as HTMLInputElement;
    volIn?.addEventListener('input', () => {
      this.settings.volume = Number(volIn.value) / 100;
      document.getElementById('val-volume')!.textContent = `${volIn.value}%`;
      this.cb.onSettingsChange(this.settings);
    });

    const sensIn = document.getElementById('setting-sensitivity') as HTMLInputElement;
    sensIn?.addEventListener('input', () => {
      this.settings.sensitivity = Number(sensIn.value) / 100;
      document.getElementById('val-sensitivity')!.textContent = `${this.settings.sensitivity.toFixed(1)}x`;
      this.cb.onSettingsChange(this.settings);
    });

    const timeSel = document.getElementById('setting-time') as HTMLSelectElement;
    timeSel?.addEventListener('change', () => {
      this.settings.timeMode = timeSel.value as TimeMode;
      this.cb.onSettingsChange(this.settings);
    });

    const weatherSel = document.getElementById('setting-weather') as HTMLSelectElement;
    weatherSel?.addEventListener('change', () => {
      this.settings.weatherMode = weatherSel.value as WeatherMode;
      this.cb.onSettingsChange(this.settings);
    });

    const hintsChk = document.getElementById('setting-hints') as HTMLInputElement;
    hintsChk?.addEventListener('change', () => {
      this.settings.showHints = hintsChk.checked;
      this.controlsStrip.classList.toggle('hidden', !hintsChk.checked);
      this.cb.onSettingsChange(this.settings);
    });

    const invChk = document.getElementById('setting-invert-y') as HTMLInputElement;
    invChk?.addEventListener('change', () => {
      this.settings.invertY = invChk.checked;
      this.cb.onSettingsChange(this.settings);
    });
  }

  private syncSettingsUI(): void {
    (document.getElementById('setting-quality') as HTMLSelectElement).value = this.settings.quality;
    (document.getElementById('setting-volume') as HTMLInputElement).value = String(Math.round(this.settings.volume * 100));
    document.getElementById('val-volume')!.textContent = `${Math.round(this.settings.volume * 100)}%`;
    (document.getElementById('setting-sensitivity') as HTMLInputElement).value = String(Math.round(this.settings.sensitivity * 100));
    document.getElementById('val-sensitivity')!.textContent = `${this.settings.sensitivity.toFixed(1)}x`;
    (document.getElementById('setting-time') as HTMLSelectElement).value = this.settings.timeMode;
    (document.getElementById('setting-weather') as HTMLSelectElement).value = this.settings.weatherMode;
    (document.getElementById('setting-hints') as HTMLInputElement).checked = this.settings.showHints;
    (document.getElementById('setting-invert-y') as HTMLInputElement).checked = this.settings.invertY;
    this.controlsStrip.classList.toggle('hidden', !this.settings.showHints);
  }

  setLoading(pct: number, text: string): void {
    this.loadingBar.style.width = `${pct}%`;
    this.loadingStatus.textContent = text;
    if (pct >= 100) {
      setTimeout(() => {
        this.loadingScreen.classList.remove('active');
        this.mainMenu.classList.add('active');
      }, 280);
    }
  }

  updateMenuStats(
    hasSave: boolean,
    districts: number,
    secrets: number,
    missions: number,
    cash: number
  ): void {
    document.getElementById('btn-play-sub')!.textContent = hasSave
      ? 'Continue Your Story'
      : 'Start New Story';
    document.getElementById('menu-stat-districts')!.textContent = `${districts} / 12`;
    document.getElementById('menu-stat-secrets')!.textContent = `${secrets} / 16`;
    document.getElementById('menu-stat-missions')!.textContent = `${missions} / 5`;
    document.getElementById('menu-stat-cash')!.textContent = `$${cash.toLocaleString()}`;
  }

  showMainMenu(): void {
    this.mainMenu.classList.add('active');
    this.hud.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.mapModal.classList.add('hidden');
  }

  showGameplay(): void {
    this.mainMenu.classList.remove('active');
    this.pauseModal.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showPause(paused: boolean): void {
    this.pauseModal.classList.toggle('hidden', !paused);
    if (!paused) {
      this.settingsModal.classList.add('hidden');
      this.controlsModal.classList.add('hidden');
    }
  }

  showMap(open: boolean): void {
    this.mapModal.classList.toggle('hidden', !open);
  }

  isMapOpen(): boolean {
    return !this.mapModal.classList.contains('hidden');
  }

  isPauseOpen(): boolean {
    return !this.pauseModal.classList.contains('hidden');
  }

  setPhotoMode(active: boolean): void {
    this.photoOverlay.classList.toggle('hidden', !active);
  }

  updateHUD(
    districtName: string,
    timeStr: string,
    weatherStr: string,
    cash: number,
    secretsFound: number,
    totalSecrets: number
  ): void {
    this.hudDistrict.textContent = districtName;
    this.hudTime.textContent = timeStr;
    this.hudWeather.textContent = weatherStr;
    this.hudCash.textContent = `$${cash.toLocaleString()}`;
    this.hudSecrets.textContent = `${secretsFound} / ${totalSecrets} Secrets`;
  }

  updatePrompt(item: Interactable | null, vehicleHint: { key: 'F'; label: string } | null): void {
    const active = item ?? (vehicleHint ? { key: vehicleHint.key, label: vehicleHint.label } : null);
    if (!active) {
      this.interactionPrompt.classList.add('hidden');
      return;
    }
    this.promptKey.textContent = active.key;
    this.promptText.textContent = active.label;
    this.interactionPrompt.classList.remove('hidden');
  }

  updateVehicleHUD(
    visible: boolean,
    name: string,
    speedMs: number,
    modeLabel: string,
    isAircraft: boolean,
    altitude: number
  ): void {
    this.vehicleHud.classList.toggle('hidden', !visible);
    if (!visible) return;
    this.hudVehicleName.textContent = name;
    const kmh = Math.round(Math.abs(speedMs) * 3.6);
    this.hudSpeed.textContent = String(kmh);
    this.hudSpeedUnit.textContent = isAircraft ? 'KTS' : 'KM/H';
    this.hudGear.textContent = modeLabel;
    this.hudAltitude.classList.toggle('hidden', !isAircraft);
    if (isAircraft) {
      this.hudAltitude.textContent = `ALT ${Math.max(0, Math.round(altitude))}m`;
    }
  }

  updateMissionHUD(active: boolean, title: string, objective: string, timeLeft: number): void {
    this.missionPanel.classList.toggle('hidden', !active);
    if (!active) return;
    this.missionTitle.textContent = title;
    this.missionObjective.textContent = objective;
    this.missionTimer.textContent = `${timeLeft.toFixed(1)}s`;
  }

  updateSecretsSidebar(secrets: EasterEggDef[], found: Set<string>): void {
    const list = document.getElementById('secrets-list')!;
    document.getElementById('map-secrets-count')!.textContent = `${found.size}/${secrets.length}`;
    list.innerHTML = '';
    for (const s of secrets) {
      const isFound = found.has(s.id);
      const div = document.createElement('div');
      div.className = `secret-item ${isFound ? 'found' : ''}`;
      div.innerHTML = `
        <div class="secret-item-title">${isFound ? '★ ' + s.title : '??? Undiscovered Secret'}</div>
        <div class="secret-item-clue">${s.clue}</div>
      `;
      list.appendChild(div);
    }
  }

  showDistrictBanner(name: string): void {
    this.districtBannerName.textContent = name.toUpperCase();
    this.districtBanner.classList.remove('hidden');
    if (this.bannerTimeout) window.clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => {
      this.districtBanner.classList.add('hidden');
    }, 2600);
  }

  showToast(msg: string, kind: 'info' | 'secret' | 'reward' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    this.toastContainer.appendChild(el);
    window.setTimeout(() => {
      el.remove();
    }, 3600);
  }

  showDialogue(speaker: string, text: string): void {
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueText.textContent = text;
    this.dialogueBox.classList.remove('hidden');
    this.dialogueOpen = true;
  }

  hideDialogue(): void {
    this.dialogueBox.classList.add('hidden');
    this.dialogueOpen = false;
  }

  flashTransition(midAction: () => void): void {
    this.fadeCurtain.classList.add('active');
    window.setTimeout(() => {
      midAction();
      window.setTimeout(() => {
        this.fadeCurtain.classList.remove('active');
      }, 110);
    }, 170);
  }
}
