import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { MapbanMapTestingComponent } from "./mapban-map/mapban-map.component";
import { ISessionTeam, SessionMap, Stage } from "../../services/Types";
import { createTimeline, Timeline } from "animejs";

// Seven-map pool used for the BO3 simulation.
const POOL_MAPS = ["Ascent", "Bind", "Haven", "Icebox", "Lotus", "Pearl", "Split"];

interface MapSlotState {
  isRotating: boolean;
  rotateMap: number;
  roateMapNames: [string, string];
  currentMapNameIndex: number;
  rotateNameCurrent: string;
  rotateMapTimeline?: Timeline;
  isInitialized: boolean;
}

type PlannedAction = "ban" | "pick";

@Component({
  selector: "app-testing-mapban",
  standalone: true,
  imports: [MapbanMapTestingComponent],
  templateUrl: "./testing-mapban.html",
  styleUrl: "./testing-mapban.css",
})
export class TestingMapban implements OnInit, AfterViewInit, OnDestroy {
  // ─── Overlay-bound state ─────────────────────────────────────────────────
  teams: ISessionTeam[] = [
    { name: "Team Alpha", tricode: "ALPH", url: "assets/misc/icon.webp" },
    { name: "Team Beta", tricode: "BETA", url: "assets/misc/icon.webp" },
  ];

  stage: Stage = "ban";
  actingTeam: 0 | 1 = 0;
  selectedMaps: SessionMap[] = [];
  availableMapNames: string[] = [];
  logoIndex = 1;
  mapCardAnimationRun = 0;

  /** Per-slot animation and display state (mirrors the per-instance state
   *  that would have lived inside each MapbanMapComponent instance). */
  slotStates: MapSlotState[] = [];

  /** Template helper — returns the slot state for a given index safely. */
  getState(index: number): MapSlotState | undefined {
    return this.slotStates[index];
  }

  private readonly plannedActions: PlannedAction[] = ["ban", "ban", "pick", "pick", "ban", "ban"];
  private readonly plannedTeams: (0 | 1)[] = [0, 1, 0, 1, 0, 1];

  getActionType(index: number, map: SessionMap, isLast: boolean): PlannedAction | "decider" {
    if (isLast) return "decider";
    if (map.bannedBy !== undefined) return "ban";
    if (map.pickedBy !== undefined) return "pick";
    return this.plannedActions[index] ?? "ban";
  }

  getActionTeam(index: number, map: SessionMap): 0 | 1 | undefined {
    if (map.bannedBy !== undefined) return map.bannedBy;
    if (map.pickedBy !== undefined) return map.pickedBy;
    return this.plannedTeams[index];
  }

  numSequence(n: number): number[] {
    return Array(n);
  }

  // ─── Internal simulation state ───────────────────────────────────────────
  private decidedMaps: SessionMap[] = [];
  private poolMaps: string[] = [];
  private stepIndex = 0;
  private timeoutId?: number;
  private steps!: { delay: number; action: () => void }[];

  private cdr = inject(ChangeDetectorRef);

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.steps = this.buildSteps();
    this.initState();
    this.scheduleNext();
    console.log(this.selectedMaps);
  }

  ngAfterViewInit(): void {
    // Mark all slots as having a live DOM, then start any pending rotations.
    this.slotStates.forEach((state, i) => {
      state.isInitialized = true;
      if (state.isRotating) {
        this.startRotateAnimation(i);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
    }
    this.slotStates.forEach((_s, i) => this.stopRotateAnimation(i));
  }

  // ─── Simulation ──────────────────────────────────────────────────────────

  /**
   * Full BO3 ban/pick sequence (ban-ban-pick-pick-ban-ban-decider):
   *   Ban  : Team 0 bans Bind
   *   Ban  : Team 1 bans Pearl
   *   Pick : Team 0 picks Ascent  -> Team 1 on side (chose Attack)
   *   Pick : Team 1 picks Split   -> Team 0 on side (chose Defense)
   *   Ban  : Team 0 bans Haven
   *   Ban  : Team 1 bans Icebox
   *   Decider: Lotus              -> Team 0 on side (chose Attack)
   *   Scores revealed one-by-one
   *   5-second pause then loop
   */
  private buildSteps(): { delay: number; action: () => void }[] {
    return [
      // Phase 1: Bans
      { delay: 2500, action: () => this.ban("Bind", 0) },
      { delay: 2500, action: () => this.ban("Pearl", 1) },

      // Pick 1
      {
        delay: 2500,
        action: () => {
          this.stage = "pick";
          this.pick("Ascent", 0, 1);
        },
      },
      { delay: 2500, action: () => this.setSide(this.indexOf("Ascent"), true) },

      // Pick 2
      {
        delay: 2500,
        action: () => {
          this.stage = "pick";
          this.pick("Split", 1, 0);
        },
      },
      { delay: 2500, action: () => this.setSide(this.indexOf("Split"), false) },

      // Phase 2: Bans
      {
        delay: 2500,
        action: () => {
          this.stage = "ban";
          this.actingTeam = 0;
          this.ban("Haven", 0);
        },
      },
      { delay: 2500, action: () => this.ban("Icebox", 1) },

      // Decider
      {
        delay: 2500,
        action: () => {
          this.stage = "side";
          this.makeDecider(0);
        },
      },
      { delay: 2500, action: () => this.setSide(this.indexOf("Lotus"), true) },

      // Scores
      { delay: 3000, action: () => this.setScore(this.indexOf("Ascent"), 13, 9) },
      { delay: 3000, action: () => this.setScore(this.indexOf("Split"), 8, 13) },
      { delay: 3000, action: () => this.setScore(this.indexOf("Lotus"), 13, 11) },

      // Hold then loop
      {
        delay: 5000,
        action: () => undefined,
      },
    ];
  }

  private scheduleNext(): void {
    if (this.stepIndex >= this.steps.length) {
      this.initState();
    }
    const { delay, action } = this.steps[this.stepIndex++];
    this.timeoutId = window.setTimeout(() => {
      action();
      this.scheduleNext();
    }, delay);
  }

  private initState(): void {
    this.mapCardAnimationRun++;
    this.poolMaps = [...POOL_MAPS];
    this.decidedMaps = [];
    this.stage = "ban";
    this.actingTeam = 0;
    this.stepIndex = 0;
    this.resetSlotStates();
    this.refreshDisplay();
  }

  private resetSlotStates(): void {
    // Preserve isInitialized so the DOM-ready flag survives a loop restart.
    const wasInitialized = this.slotStates.map((s) => s.isInitialized);
    this.slotStates.forEach((_s, i) => this.stopRotateAnimation(i));
    this.slotStates = Array.from({ length: POOL_MAPS.length }, (_, i) => ({
      isRotating: false,
      rotateMap: 0,
      roateMapNames: ["", ""] as [string, string],
      currentMapNameIndex: 0,
      rotateNameCurrent: "",
      isInitialized: wasInitialized[i] ?? false,
    }));
  }

  // ─── State mutation helpers ───────────────────────────────────────────────

  private ban(mapName: string, by: 0 | 1): void {
    const map = new SessionMap(mapName);
    map.bannedBy = by;
    this.decidedMaps = [...this.decidedMaps, map];
    this.poolMaps = this.poolMaps.filter((m) => m !== mapName);
    this.actingTeam = by === 0 ? 1 : 0;
    this.refreshDisplay();
  }

  /**
   * sidePickedBy must be set simultaneously with pickedBy because the template
   * accesses teams[map.sidePickedBy!] as soon as pickedBy is defined.
   */
  private pick(mapName: string, by: 0 | 1, sidePickedBy: 0 | 1): void {
    const map = new SessionMap(mapName);
    map.pickedBy = by;
    map.sidePickedBy = sidePickedBy;
    this.decidedMaps = [...this.decidedMaps, map];
    this.poolMaps = this.poolMaps.filter((m) => m !== mapName);
    this.actingTeam = by === 0 ? 1 : 0;
    this.refreshDisplay();
  }

  private makeDecider(sidePickedBy: 0 | 1): void {
    if (this.poolMaps.length !== 1) return;
    const map = new SessionMap(this.poolMaps[0]);
    map.sidePickedBy = sidePickedBy;
    this.decidedMaps = [...this.decidedMaps, map];
    this.poolMaps = [];
    this.refreshDisplay();
  }

  private setSide(index: number, isAttack: boolean): void {
    this.decidedMaps = this.decidedMaps.map((m, i) =>
      i === index ? this.cloneWith(m, { pickedAttack: isAttack }) : m,
    );
    this.refreshDisplay();
  }

  private setScore(index: number, left: number, right: number): void {
    this.decidedMaps = this.decidedMaps.map((m, i) =>
      i === index ? this.cloneWith(m, { score: [left, right] }) : m,
    );
    this.refreshDisplay();
  }

  private indexOf(mapName: string): number {
    return this.decidedMaps.findIndex((m) => m.name === mapName);
  }

  private cloneWith(source: SessionMap, overrides: Partial<SessionMap>): SessionMap {
    const copy = new SessionMap(source.name);
    copy.bannedBy = source.bannedBy;
    copy.pickedBy = source.pickedBy;
    copy.sidePickedBy = source.sidePickedBy;
    copy.pickedAttack = source.pickedAttack;
    copy.score = [...source.score];
    Object.assign(copy, overrides);
    return copy;
  }

  private refreshDisplay(): void {
    this.availableMapNames = [...this.poolMaps];
    const maps = [...this.decidedMaps];
    for (let i = 0; i < this.poolMaps.length; i++) {
      maps.push(new SessionMap(i === 0 ? "upcoming" : ""));
    }
    this.selectedMaps = maps;
    this.logoIndex = this.decidedMaps.length > 0 ? this.decidedMaps.length + 1 : 1;
    this.updateSlotStates(this.selectedMaps);
  }

  // ─── Per-slot state update (mirrors MapbanMapComponent.ngOnChanges) ───────

  private updateSlotStates(maps: SessionMap[]): void {
    while (this.slotStates.length < maps.length) {
      this.slotStates.push({
        isRotating: false,
        rotateMap: 0,
        roateMapNames: ["", ""],
        currentMapNameIndex: 0,
        rotateNameCurrent: "",
        isInitialized: false,
      });
    }

    maps.forEach((map, i) => {
      const state = this.slotStates[i];
      const wasRotating = state.isRotating;

      if (map.name === "upcoming" && !wasRotating) {
        state.isRotating = true;
        if (state.isInitialized) {
          this.startRotateAnimation(i);
        }
      } else if (map.name !== "upcoming" && wasRotating) {
        this.stopRotateAnimation(i);
      }
    });
  }

  // ─── Animation (mirrors MapbanMapComponent private animation methods) ─────

  private setupRotateAnimation(index: number): Timeline {
    const state = this.slotStates[index];
    const tl = createTimeline({
      defaults: { duration: 400, ease: "outCubic" },
      autoplay: false,
      loop: true,
      loopDelay: 0,
    });

    const img1 = "#rotateImage1Index" + index;
    const img2 = "#rotateImage2Index" + index;
    const delay = "+=1000";

    tl.set(img1, { x: 0 });
    tl.set(img2, { zIndex: -1, x: "-100%" });

    // slide 1
    tl.set(img2, { zIndex: 1 }, delay);
    tl.add(img2, { x: 0 }, "<");
    tl.add(img1, { x: "+100%" }, "<<");
    tl.set(img1, { x: "-100%" }, "+=50");
    tl.call(() => {
      this.rotateMapName(index, 0);
      state.currentMapNameIndex = 0;
    }, "<<");

    // slide 2
    tl.set(img2, { zIndex: 1 }, delay);
    tl.add(img1, { x: 0 }, "<");
    tl.add(img2, { x: "+100%" }, "<<");
    tl.set(img2, { zIndex: -1 }, "+=50");
    tl.set(img2, { x: "-100%" }, "<");
    tl.call(() => {
      this.rotateMapName(index, 1);
      state.currentMapNameIndex = 1;
    }, "<<");

    return tl;
  }

  private rotateMapName(slotIndex: number, nameIndex: 0 | 1): void {
    const state = this.slotStates[slotIndex];
    if (!state) return;
    state.rotateMap = (state.rotateMap + 1) % this.availableMapNames.length;
    state.roateMapNames[nameIndex] = this.availableMapNames[state.rotateMap];
    state.rotateNameCurrent = state.roateMapNames[(nameIndex + 1) % 2];
    this.cdr.detectChanges();
  }

  private startRotateAnimation(index: number): void {
    const state = this.slotStates[index];
    if (!state?.isInitialized) return;
    this.rotateMapName(index, 0);
    this.rotateMapName(index, 1);
    if (!state.rotateMapTimeline) {
      state.rotateMapTimeline = this.setupRotateAnimation(index);
    }
    state.rotateMapTimeline.play();
  }

  private stopRotateAnimation(index: number): void {
    const state = this.slotStates[index];
    if (!state) return;
    state.isRotating = false;
    state.rotateMap = 0;
    state.roateMapNames = ["", ""];
    if (state.rotateMapTimeline) {
      state.rotateMapTimeline.cancel();
      state.rotateMapTimeline.revert();
      state.rotateMapTimeline = undefined;
    }
  }
}
