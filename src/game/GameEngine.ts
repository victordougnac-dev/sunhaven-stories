import * as THREE from 'three';
import { CrazyGamesManager } from './CrazyGamesManager';
import { SaveManager } from './SaveManager';
import { TextureFactory } from './TextureFactory';
import { AudioManager } from './AudioManager';
import { TimeManager } from './TimeManager';
import { WeatherManager } from './WeatherManager';
import { WorldManager } from './WorldManager';
import { StreetDetailsManager } from './StreetDetailsManager';
import { BuildingManager } from './BuildingManager';
import { PlayerController, type InputState } from './PlayerController';
import { CameraController } from './CameraController';
import { VehicleController } from './VehicleController';
import { AircraftController } from './AircraftController';
import { NPCManager } from './NPCManager';
import { TrafficManager } from './TrafficManager';
import { EasterEggManager } from './EasterEggManager';
import { MissionManager } from './MissionManager';
import { InteractionManager } from './InteractionManager';
import { MapUI } from './MapUI';
import { UIManager } from './UIManager';
import type { DistrictId, GameSettings, Interactable } from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private cg = new CrazyGamesManager();
  private saveMgr!: SaveManager;
  private texFactory = new TextureFactory();
  private audio = new AudioManager();
  private timeMgr!: TimeManager;
  private weatherMgr!: WeatherManager;
  private worldMgr!: WorldManager;
  private streetDetails!: StreetDetailsManager;
  private buildingMgr!: BuildingManager;
  private player!: PlayerController;
  private camCtrl = new CameraController();
  private vehicleCtrl!: VehicleController;
  private aircraftCtrl!: AircraftController;
  private npcMgr!: NPCManager;
  private trafficMgr!: TrafficManager;
  private eggMgr!: EasterEggManager;
  private missionMgr!: MissionManager;
  private interactMgr = new InteractionManager();
  private mapUI = new MapUI();
  private ui!: UIManager;

  private outdoorInteractables: Interactable[] = [];
  private currentDistrictId: DistrictId = 'bayside_shops';
  private playing = false;
  private paused = false;
  private photoMode = false;

  private input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    handbrake: false,
    yawLeft: false,
    yawRight: false,
    throttleUp: false,
    throttleDown: false,
  };

  private mouseDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private autoSaveTimer = 0;
  private hudTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xa6dcf5, 0.00095);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2600);
  }

  async init(): Promise<void> {
    await this.cg.init();
    this.saveMgr = new SaveManager(this.cg);

    this.ui = new UIManager(this.saveMgr.data.settings, {
      onPlay: () => this.startGame(),
      onResume: () => this.setPaused(false),
      onMainMenu: () => this.returnToMainMenu(),
      onSave: () => {
        this.syncSavePosition();
        this.saveMgr.save();
        this.ui.showToast('Progress saved!', 'info');
      },
      onResetSave: () => {
        this.saveMgr.reset();
        this.player.position.set(
          this.saveMgr.data.playerPos.x,
          this.saveMgr.data.playerPos.y,
          this.saveMgr.data.playerPos.z
        );
        this.player.yaw = this.saveMgr.data.playerYaw;
        this.eggMgr.foundSet.clear();
        this.missionMgr.completedSet.clear();
        this.ui.updateSecretsSidebar(this.eggMgr.secrets, this.eggMgr.foundSet);
        this.refreshMenuStats();
      },
      onSettingsChange: (s) => this.applySettings(s),
      onAbortMission: () => this.missionMgr.abortMission(),
      onToggleMap: () => this.toggleMap(),
    });

    this.ui.setLoading(20, 'Generating coastal PBR textures & reflections...');
    await this.nextFrame();
    this.setupEnvironmentMap();
    const palette = this.texFactory.buildPalette();

    this.ui.setLoading(42, 'Constructing Sunhaven districts, street details & marina...');
    await this.nextFrame();
    this.timeMgr = new TimeManager(this.scene);
    this.weatherMgr = new WeatherManager(this.scene);
    this.worldMgr = new WorldManager(this.scene, palette);
    this.streetDetails = new StreetDetailsManager(this.scene, (x, z) =>
      this.worldMgr.getGroundHeight(x, z)
    );

    this.ui.setLoading(65, 'Spawning articulated character, vehicles & aircraft...');
    await this.nextFrame();
    this.player = new PlayerController(this.scene);
    this.player.position.set(
      this.saveMgr.data.playerPos.x,
      this.saveMgr.data.playerPos.y,
      this.saveMgr.data.playerPos.z
    );
    this.player.yaw = this.saveMgr.data.playerYaw;

    this.vehicleCtrl = new VehicleController(this.scene, (x, z) =>
      this.worldMgr.getGroundHeight(x, z)
    );
    this.aircraftCtrl = new AircraftController(this.scene, (x, z) =>
      this.worldMgr.getGroundHeight(x, z)
    );

    this.ui.setLoading(82, 'Populating NPCs, road traffic, missions & secrets...');
    await this.nextFrame();
    this.npcMgr = new NPCManager(this.scene, (x, z) => this.worldMgr.getGroundHeight(x, z));
    this.trafficMgr = new TrafficManager(this.scene);

    this.eggMgr = new EasterEggManager(
      this.scene,
      (x, z) => this.worldMgr.getGroundHeight(x, z),
      this.saveMgr.data.foundSecrets,
      (egg) => {
        this.audio.playChime(true);
        this.cg.happytime();
        this.saveMgr.data.cash += egg.rewardCash;
        this.saveMgr.data.foundSecrets = Array.from(this.eggMgr.foundSet);
        this.saveMgr.save();
        this.ui.showToast(`Secret Discovered: ${egg.title} (+$${egg.rewardCash})`, 'secret');
        this.ui.updateSecretsSidebar(this.eggMgr.secrets, this.eggMgr.foundSet);
      }
    );

    this.missionMgr = new MissionManager(this.scene, this.saveMgr.data.completedMissions, {
      onStart: (m) => {
        this.audio.playClick();
        this.ui.showToast(`Started: ${m.title}`, 'info');
      },
      onComplete: (m) => {
        this.audio.playChime(true);
        this.cg.happytime();
        this.saveMgr.data.cash += m.rewardCash;
        this.saveMgr.data.completedMissions = Array.from(this.missionMgr.completedSet);
        this.saveMgr.save();
        this.ui.showToast(`Activity Complete: ${m.title} (+$${m.rewardCash})`, 'reward');
      },
      onFail: (m) => {
        this.ui.showToast(`Activity Cancelled: ${m.title}`, 'info');
      },
    });

    this.buildingMgr = new BuildingManager(this.scene, {
      onExit: (pos, yaw) => {
        this.ui.flashTransition(() => {
          this.buildingMgr.exitBuilding(this.worldMgr.group);
          this.streetDetails.group.visible = true;
          this.vehicleCtrl.setVisible(true);
          this.aircraftCtrl.setVisible(true);
          this.npcMgr.setVisible(true);
          this.player.position.copy(pos);
          this.player.yaw = yaw;
          this.player.velocity.set(0, 0, 0);
          this.camCtrl.setMode('foot');
          this.camCtrl.snap(yaw + Math.PI);
          this.audio.setInsideBuilding(false);
        });
      },
      onToast: (msg, kind) => this.ui.showToast(msg, kind),
      onDialogue: (speaker, text) => this.ui.showDialogue(speaker, text),
      onCash: (delta) => {
        this.saveMgr.data.cash = Math.max(0, this.saveMgr.data.cash + delta);
      },
      onSecret: (id) => {
        this.eggMgr.unlock(id);
      },
    });

    this.buildOutdoorInteractables();
    this.applySettings(this.saveMgr.data.settings);
    this.ui.updateSecretsSidebar(this.eggMgr.secrets, this.eggMgr.foundSet);
    this.refreshMenuStats();
    this.bindInputEvents();

    this.ui.setLoading(100, 'Welcome to Sunhaven!');
    this.cg.loadingStop();
    this.clock.start();
    this.animate();
  }

  private setupEnvironmentMap(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x8ecae6);
    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff5d6 })
    );
    sunOrb.position.set(18, 26, -12);
    const groundBounce = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshBasicMaterial({ color: 0x5d6d7e })
    );
    groundBounce.rotation.x = -Math.PI / 2;
    groundBounce.position.y = -10;
    envScene.add(sunOrb, groundBounce);
    const rt = pmrem.fromScene(envScene, 0.04);
    this.scene.environment = rt.texture;
    pmrem.dispose();
  }

  private nextFrame(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => r()));
  }

  private buildOutdoorInteractables(): void {
    // Enterable buildings
    for (const b of this.worldMgr.buildingEntries) {
      this.outdoorInteractables.push({
        id: `bld_${b.id}`,
        kind: 'building',
        key: 'E',
        label: b.isRooftopTeleport ? `Take Elevator to ${b.name}` : `Enter ${b.name}`,
        position: b.doorPos.clone(),
        radius: 3.4,
        onInteract: () => {
          this.audio.playClick();
          this.ui.flashTransition(() => {
            const res = this.buildingMgr.enterBuilding(
              b,
              this.player.position,
              this.player.yaw,
              this.worldMgr.group
            );
            this.player.position.copy(res.spawnPos);
            this.player.yaw = res.spawnYaw;
            this.player.velocity.set(0, 0, 0);
            if (!b.isRooftopTeleport) {
              this.streetDetails.group.visible = false;
              this.vehicleCtrl.setVisible(false);
              this.aircraftCtrl.setVisible(false);
              this.npcMgr.setVisible(false);
              this.camCtrl.setMode('interior');
              this.camCtrl.snap(0);
              this.audio.setInsideBuilding(true);
            } else {
              this.camCtrl.snap(0);
              this.audio.setInsideBuilding(false);
              this.eggMgr.unlock('egg_rooftop_lounge');
            }
          });
        },
      });
    }

    // Rooftop return elevator back down to street
    this.outdoorInteractables.push({
      id: 'rooftop_return_elev',
      kind: 'elevator',
      key: 'E',
      label: 'Take Elevator to Street Level',
      position: new THREE.Vector3(-26, 95.6, -180),
      radius: 3.5,
      onInteract: () => {
        this.audio.playClick();
        this.ui.flashTransition(() => {
          this.player.position.set(22, 0.2, -162);
          this.player.velocity.set(0, 0, 0);
          this.camCtrl.snap(0);
        });
      },
    });

    // Benches
    this.worldMgr.benchSpots.forEach((b, idx) => {
      this.outdoorInteractables.push({
        id: `bench_${idx}`,
        kind: 'bench',
        key: 'E',
        label: 'Sit on Bench',
        position: b.pos.clone(),
        radius: 2.3,
        onInteract: () => {
          this.player.position.copy(b.pos);
          this.player.yaw = b.yaw;
          this.player.sitting = true;
        },
      });
    });

    // ATMs
    this.worldMgr.atmSpots.forEach((pos, idx) => {
      this.outdoorInteractables.push({
        id: `atm_${idx}`,
        kind: 'atm',
        key: 'E',
        label: 'Use Sunhaven ATM',
        position: pos.clone(),
        radius: 2.4,
        onInteract: () => {
          this.audio.playClick();
          this.ui.showToast(`Sunhaven Bank Balance: $${this.saveMgr.data.cash.toLocaleString()}`, 'info');
        },
      });
    });

    // NPCs
    for (const npc of this.npcMgr.npcs) {
      this.outdoorInteractables.push({
        id: `talk_${npc.id}`,
        kind: 'npc',
        key: 'E',
        label: `Talk to ${npc.name}`,
        position: npc.position,
        radius: 2.8,
        onInteract: () => {
          this.audio.playClick();
          this.ui.showDialogue(npc.name, npc.dialogue);
          if (npc.isMysteryTraveler) {
            this.eggMgr.unlock('egg_pier_wanderer');
          }
        },
      });
    }

    // Missions & Easter eggs
    this.outdoorInteractables.push(...this.missionMgr.interactables);
    this.outdoorInteractables.push(...this.eggMgr.interactables);
  }

  private startGame(): void {
    this.audio.unlock();
    this.audio.playClick();
    this.playing = true;
    this.paused = false;
    this.camCtrl.setMode('foot');
    this.camCtrl.snap(this.player.yaw + Math.PI);
    this.ui.showGameplay();
    this.cg.gameplayStart();
  }

  private returnToMainMenu(): void {
    this.syncSavePosition();
    this.saveMgr.save();
    this.playing = false;
    this.paused = false;
    this.photoMode = false;
    this.ui.setPhotoMode(false);
    document.exitPointerLock?.();
    this.cg.gameplayStop();
    this.refreshMenuStats();
    this.ui.showMainMenu();
  }

  private refreshMenuStats(): void {
    this.ui.updateMenuStats(
      this.saveMgr.hasExistingSave,
      this.saveMgr.data.discoveredDistricts.length,
      this.eggMgr.foundSet.size,
      this.missionMgr.completedSet.size,
      this.saveMgr.data.cash
    );
  }

  private setPaused(p: boolean): void {
    if (!this.playing) return;
    this.paused = p;
    this.ui.showPause(p);
    this.audio.setMuted(p);
    if (p) {
      document.exitPointerLock?.();
      this.cg.gameplayStop();
    } else {
      this.cg.gameplayStart();
    }
  }

  private toggleMap(): void {
    if (!this.playing) return;
    const open = !this.ui.isMapOpen();
    this.ui.showMap(open);
    if (open) {
      document.exitPointerLock?.();
      this.mapUI.renderWorldMap(
        this.getFocusPosition(),
        this.worldMgr.buildingEntries,
        this.vehicleCtrl.vehicles,
        this.aircraftCtrl.aircrafts,
        this.missionMgr.missions,
        this.eggMgr.secrets,
        this.eggMgr.foundSet
      );
    }
  }

  private applySettings(s: GameSettings): void {
    this.saveMgr.data.settings = { ...s };
    this.saveMgr.save();
    this.audio.setVolume(s.volume);
    this.camCtrl.sensitivity = s.sensitivity;
    this.camCtrl.invertY = s.invertY;
    this.timeMgr.setMode(s.timeMode);
    this.weatherMgr.setMode(s.weatherMode);
    this.worldMgr.applyQuality(s.quality, this.renderer, this.timeMgr.sunLight);
    this.streetDetails.applyQuality(s.quality);
    this.npcMgr.applyQuality(s.quality);
    this.trafficMgr.applyQuality(s.quality);
  }

  private bindInputEvents(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing && !this.paused) {
        this.setPaused(true);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.playing) return;
      this.audio.unlock();

      const code = e.code;
      if (code === 'Escape') {
        if (this.ui.isMapOpen()) {
          this.toggleMap();
        } else {
          this.setPaused(!this.paused);
        }
        return;
      }

      if (code === 'KeyM' && !this.paused) {
        this.toggleMap();
        return;
      }

      if (this.paused || this.ui.isMapOpen()) return;

      if (code === 'KeyW' || code === 'ArrowUp') this.input.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        this.input.sprint = true;
        this.input.throttleUp = true;
      }
      if (code === 'ControlLeft' || code === 'ControlRight') {
        this.input.throttleDown = true;
      }
      if (code === 'Space') {
        this.input.jump = true;
        this.input.handbrake = true;
      }
      if (code === 'KeyQ') this.input.yawLeft = true;

      if (code === 'KeyE') {
        if (this.aircraftCtrl.activeAircraft) {
          this.input.yawRight = true;
        } else if (this.ui.dialogueOpen) {
          this.ui.hideDialogue();
        } else if (this.interactMgr.currentPrompt && this.interactMgr.currentPrompt.key === 'E') {
          this.interactMgr.currentPrompt.onInteract();
        }
      }

      if (code === 'KeyF') {
        this.handleVehicleToggle();
      }

      if (code === 'KeyC') {
        if (!this.vehicleCtrl.activeVehicle && !this.aircraftCtrl.activeAircraft) {
          this.photoMode = !this.photoMode;
          this.ui.setPhotoMode(this.photoMode);
          this.camCtrl.setMode(this.photoMode ? 'photo' : 'foot');
        }
      }

      if (code === 'KeyH' && this.vehicleCtrl.activeVehicle) {
        this.audio.playHorn();
      }
      if (code === 'KeyL' && this.vehicleCtrl.activeVehicle) {
        this.vehicleCtrl.toggleLights();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.input.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        this.input.sprint = false;
        this.input.throttleUp = false;
      }
      if (code === 'ControlLeft' || code === 'ControlRight') {
        this.input.throttleDown = false;
      }
      if (code === 'Space') {
        this.input.jump = false;
        this.input.handbrake = false;
      }
      if (code === 'KeyQ') this.input.yawLeft = false;
      if (code === 'KeyE') this.input.yawRight = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.playing || this.paused || this.ui.isMapOpen()) return;
      this.audio.unlock();

      if (this.photoMode && e.button === 0) {
        this.audio.playShutter();
        const hit = this.missionMgr.onPhotoTaken(this.player.position);
        this.ui.showToast(
          hit ? 'Landmark photographed! Progress updated.' : 'Snapshot captured!',
          hit ? 'reward' : 'info'
        );
        return;
      }

      this.mouseDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouseDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.playing || this.paused || this.ui.isMapOpen()) return;
      if (document.pointerLockElement === this.canvas) {
        this.camCtrl.onMouseMove(e.movementX, e.movementY);
      } else if (this.mouseDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.camCtrl.onMouseMove(dx, dy);
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.playing || this.paused || this.ui.isMapOpen()) return;
        this.camCtrl.onWheel(e.deltaY);
      },
      { passive: true }
    );
  }

  private handleVehicleToggle(): void {
    if (this.buildingMgr.isInside) return;

    if (this.vehicleCtrl.activeVehicle) {
      const exitPos = this.vehicleCtrl.exitVehicle();
      this.player.position.copy(exitPos);
      this.player.setVisible(true);
      this.camCtrl.setMode('foot');
      this.camCtrl.snap(this.player.yaw + Math.PI);
      return;
    }

    if (this.aircraftCtrl.activeAircraft) {
      if (!this.aircraftCtrl.canExit()) {
        this.ui.showToast('Land and slow down before exiting aircraft!', 'info');
        return;
      }
      const exitPos = this.aircraftCtrl.exitAircraft();
      this.player.position.copy(exitPos);
      this.player.setVisible(true);
      this.camCtrl.setMode('foot');
      this.camCtrl.snap(this.player.yaw + Math.PI);
      return;
    }

    const nearCar = this.vehicleCtrl.findNearestVehicle(this.player.position);
    if (nearCar) {
      this.audio.playClick();
      this.vehicleCtrl.enterVehicle(nearCar);
      this.player.setVisible(false);
      this.photoMode = false;
      this.ui.setPhotoMode(false);
      this.camCtrl.setMode(nearCar.spec.kind === 'boat' ? 'boat' : 'vehicle');
      this.camCtrl.snap(nearCar.yaw);
      if (nearCar.isSecret) {
        this.eggMgr.unlock('egg_midnight_solaris');
      }
      return;
    }

    const nearAir = this.aircraftCtrl.findNearestAircraft(this.player.position);
    if (nearAir) {
      this.audio.playClick();
      this.aircraftCtrl.enterAircraft(nearAir);
      this.player.setVisible(false);
      this.photoMode = false;
      this.ui.setPhotoMode(false);
      this.camCtrl.setMode('aircraft');
      this.camCtrl.snap(nearAir.yaw);
      this.ui.showToast('Hold SHIFT to throttle up, W/S pitch, A/D roll, Q/E yaw!', 'info');
    }
  }

  private pollGamepad(dt: number): void {
    const pads = navigator.getGamepads?.();
    const gp = pads?.[0];
    if (!gp) return;
    const ax0 = gp.axes[0] ?? 0;
    const ax1 = gp.axes[1] ?? 0;
    if (Math.abs(ax0) > 0.25) {
      this.input.left = ax0 < -0.25;
      this.input.right = ax0 > 0.25;
    }
    if (Math.abs(ax1) > 0.25) {
      this.input.forward = ax1 < -0.25;
      this.input.backward = ax1 > 0.25;
    }
    const rx = gp.axes[2] ?? 0;
    const ry = gp.axes[3] ?? 0;
    if (Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) {
      this.camCtrl.onMouseMove(rx * 550 * dt, ry * 400 * dt);
    }
  }

  private getFocusPosition(): THREE.Vector3 {
    if (this.vehicleCtrl.activeVehicle) return this.vehicleCtrl.activeVehicle.position;
    if (this.aircraftCtrl.activeAircraft) return this.aircraftCtrl.activeAircraft.position;
    return this.player.position;
  }

  private syncSavePosition(): void {
    if (!this.buildingMgr.isInside) {
      const p = this.getFocusPosition();
      this.saveMgr.data.playerPos = { x: p.x, y: p.y, z: p.z };
      this.saveMgr.data.playerYaw = this.player.yaw;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;

    if (!this.playing) {
      // Main Menu live golden-hour coastal aerial orbit!
      const orbitAngle = this.elapsed * 0.08;
      const focus = new THREE.Vector3(-40, 28, -40);
      this.camera.position.set(
        focus.x + Math.cos(orbitAngle) * 210,
        78 + Math.sin(this.elapsed * 0.3) * 10,
        focus.z + Math.sin(orbitAngle) * 210
      );
      this.camera.lookAt(focus);
      this.timeMgr.update(dt * 0.2, focus, this.weatherMgr.current, this.scene);
      this.worldMgr.update(dt, this.elapsed, this.timeMgr.nightFactor, this.weatherMgr.windStrength);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.pollGamepad(dt);

    const isInside = this.buildingMgr.isInside;
    const activeColliders = isInside
      ? this.buildingMgr.interiorColliders
      : this.worldMgr.colliders;
    const getGround = isInside
      ? () => this.buildingMgr.interiorOrigin.y
      : (x: number, z: number) => this.worldMgr.getGroundHeight(x, z);

    // Update Player / Vehicle / Aircraft
    let focusPos = this.player.position;
    let headingYaw = this.player.yaw;
    let focusSpeed = 0;

    if (this.vehicleCtrl.activeVehicle) {
      this.vehicleCtrl.update(dt, this.input, this.timeMgr.isNight(), activeColliders, getGround);
      const v = this.vehicleCtrl.activeVehicle;
      focusPos = v.position;
      headingYaw = v.yaw;
      focusSpeed = v.speed;
    } else if (this.aircraftCtrl.activeAircraft) {
      this.vehicleCtrl.update(dt, this.input, this.timeMgr.isNight(), activeColliders, getGround);
      this.aircraftCtrl.update(dt, this.input, getGround);
      const a = this.aircraftCtrl.activeAircraft;
      focusPos = a.position;
      headingYaw = a.yaw;
      focusSpeed = a.speed;
    } else {
      this.vehicleCtrl.update(dt, this.input, this.timeMgr.isNight(), activeColliders, getGround);
      this.aircraftCtrl.update(dt, this.input, getGround);
      const moveRes = this.player.update(
        dt,
        this.input,
        this.camCtrl.yaw,
        activeColliders,
        getGround,
        (x, z) => (isInside ? 'interior' : this.worldMgr.getSurfaceType(x, z)),
        isInside
      );
      focusPos = this.player.position;
      headingYaw = this.player.yaw;
      focusSpeed = moveRes.speed;
      this.audio.updateFootsteps(dt, moveRes.speed, this.player.grounded, moveRes.surface);
    }

    // Update world systems
    this.timeMgr.update(dt, focusPos, this.weatherMgr.current, this.scene);
    this.weatherMgr.update(
      dt,
      focusPos,
      isInside,
      this.texFactory.palette.asphalt,
      this.scene,
      this.audio
    );
    this.worldMgr.update(dt, this.elapsed, this.timeMgr.nightFactor, this.weatherMgr.windStrength);
    this.buildingMgr.update(dt, this.elapsed);
    this.npcMgr.update(dt, focusPos, isInside, getGround);
    this.trafficMgr.update(
      dt,
      isInside,
      this.timeMgr.isNight(),
      focusPos,
      this.worldMgr.trafficSignals
    );
    this.eggMgr.update(this.elapsed);
    this.missionMgr.update(dt, this.elapsed, focusPos, isInside);

    if (!isInside) {
      this.eggMgr.checkProximityAutoDiscover(focusPos);
    }

    // Audio spatial ambience
    const distToOcean = Math.max(0, focusPos.x + 215);
    const inVeh = Boolean(this.vehicleCtrl.activeVehicle || this.aircraftCtrl.activeAircraft);
    const isAir = Boolean(this.aircraftCtrl.activeAircraft);
    const speedNorm = isAir
      ? Math.min(1, Math.abs(focusSpeed) / 80)
      : Math.min(1, Math.abs(focusSpeed) / 50);
    this.audio.updateAmbience(
      dt,
      distToOcean,
      focusPos.y,
      this.weatherMgr.current,
      inVeh,
      speedNorm,
      isAir
    );

    // Camera update
    const autoFollow = !this.mouseDragging && document.pointerLockElement !== this.canvas;
    this.camCtrl.update(
      dt,
      this.camera,
      focusPos,
      headingYaw,
      focusSpeed,
      activeColliders,
      getGround,
      autoFollow
    );

    // District discovery & banner
    if (!isInside) {
      const dist = this.worldMgr.getDistrictAt(focusPos.x, focusPos.z);
      if (dist.id !== this.currentDistrictId) {
        this.currentDistrictId = dist.id;
        this.ui.showDistrictBanner(dist.name);
        if (!this.saveMgr.data.discoveredDistricts.includes(dist.id)) {
          this.saveMgr.data.discoveredDistricts.push(dist.id);
        }
      }
    }

    // Interactions check
    const allPrompts = isInside ? this.buildingMgr.interiorInteractables : this.outdoorInteractables;
    const prompt = this.interactMgr.findNearest(focusPos, isInside, inVeh, allPrompts);
    let vehHint: { key: 'F'; label: string } | null = null;
    if (!isInside && !inVeh) {
      const nc = this.vehicleCtrl.findNearestVehicle(focusPos);
      if (nc) vehHint = { key: 'F', label: `Drive ${nc.spec.name}` };
      else {
        const na = this.aircraftCtrl.findNearestAircraft(focusPos);
        if (na) vehHint = { key: 'F', label: `Fly ${na.spec.name}` };
      }
    }
    this.ui.updatePrompt(prompt, vehHint);

    // Throttled HUD & Minimap updates (30Hz)
    this.hudTimer += dt;
    if (this.hudTimer >= 0.033) {
      this.hudTimer = 0;
      const distName = isInside
        ? this.buildingMgr.currentBuilding?.name ?? 'Interior'
        : this.worldMgr.getDistrictAt(focusPos.x, focusPos.z).name;
      this.ui.updateHUD(
        distName,
        this.timeMgr.getFormattedTime(),
        this.weatherMgr.getLabel(),
        this.saveMgr.data.cash,
        this.eggMgr.foundSet.size,
        this.eggMgr.secrets.length
      );

      if (this.vehicleCtrl.activeVehicle) {
        const v = this.vehicleCtrl.activeVehicle;
        const gear = v.speed < -0.5 ? 'REV' : v.speed > 1 ? 'DRIVE' : 'PARK';
        this.ui.updateVehicleHUD(true, v.spec.name, v.speed, gear, false, 0);
      } else if (this.aircraftCtrl.activeAircraft) {
        const a = this.aircraftCtrl.activeAircraft;
        const thr = `THR ${Math.round(a.throttle * 100)}%`;
        this.ui.updateVehicleHUD(true, a.spec.name, a.speed, thr, true, a.position.y);
      } else {
        this.ui.updateVehicleHUD(false, '', 0, '', false, 0);
      }

      this.ui.updateMissionHUD(
        Boolean(this.missionMgr.activeMission),
        this.missionMgr.activeMission?.title ?? '',
        this.missionMgr.getObjectiveText(),
        this.missionMgr.timeLeft
      );

      this.mapUI.renderMinimap(
        focusPos,
        inVeh ? headingYaw : headingYaw + Math.PI,
        this.worldMgr.buildingEntries,
        this.vehicleCtrl.vehicles,
        this.missionMgr.getActiveTargetPos()
      );

      if (this.ui.isMapOpen()) {
        this.mapUI.renderWorldMap(
          focusPos,
          this.worldMgr.buildingEntries,
          this.vehicleCtrl.vehicles,
          this.aircraftCtrl.aircrafts,
          this.missionMgr.missions,
          this.eggMgr.secrets,
          this.eggMgr.foundSet
        );
      }
    }

    // Periodic autosave
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer > 20) {
      this.autoSaveTimer = 0;
      this.syncSavePosition();
      this.saveMgr.save();
    }

    this.renderer.render(this.scene, this.camera);
  };
}
