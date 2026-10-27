import { Component, Input, OnChanges, SimpleChanges, OnInit } from "@angular/core";
import {
  IMapbanSessionData,
  ISessionTeam,
  SessionMap,
  Stage,
  ICustomFormatData,
} from "../../services/Types";
import { MapbanMapComponent } from "./mapban-map/mapban-map.component";

type PlannedAction = "ban" | "pick";

@Component({
  selector: "app-mapban-component",
  standalone: true,
  imports: [MapbanMapComponent],
  templateUrl: "./mapban-component.html",
  styleUrl: "./mapban-component.css",
})
export class MapbanComponent implements OnChanges, OnInit {
  @Input({ required: true }) data!: IMapbanSessionData;

  teams: ISessionTeam[] = [];
  stage: Stage = "ban";
  actingTeam: 0 | 1 = 0;

  customData: ICustomFormatData | undefined = undefined;

  selectedMaps: SessionMap[] = [];
  availableMapNames: string[] = [];
  mapCardAnimationRun = 0;
  cardPlanPositions: number[] = [];
  effectivePickBanStates: ("pick" | "ban" | "decider")[] = [];
  resolvedSelectorTeams: (0 | 1)[] = [];
  hasDecider = true;

  ngOnInit(): void {
    console.log(this.customData);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["data"]?.currentValue) {
      this.updateFromData(changes["data"].currentValue as IMapbanSessionData);
    }
  }

  getActionType(index: number, map: SessionMap): PlannedAction | "decider" {
    if (map.bannedBy !== undefined) return "ban";
    if (map.pickedBy !== undefined) return "pick";

    const planned = this.getPlannedStateAtCardIndex(index);
    if (planned === "decider" && this.hasDecider) return "decider";
    if (planned === "pick" || planned === "ban") return planned;

    return "ban";
  }

  getActionTeam(index: number, map: SessionMap): 0 | 1 {
    if (map.bannedBy !== undefined) return map.bannedBy;
    if (map.pickedBy !== undefined) return map.pickedBy;

    const planPosition = this.cardPlanPositions[index] ?? index;
    const selector = this.resolvedSelectorTeams[planPosition];
    if (selector === 0 || selector === 1) return selector;

    return 0;
  }

  private updateFromData(data: IMapbanSessionData): void {
    this.mapCardAnimationRun++;

    this.teams = data.teams ?? [];
    this.stage = data.stage ?? "ban";
    this.actingTeam = data.actingTeam ?? 0;
    this.availableMapNames = (data.availableMaps ?? []).map((map) => map.name);
    const totalCardCount = (data.selectedMaps?.length ?? 0) + this.availableMapNames.length;
    this.effectivePickBanStates = this.buildEffectivePickBanStates(data, totalCardCount);
    this.hasDecider =
      data.customFormatData?.hasDecider ?? (data.format !== "bo1" && data.format !== undefined);
    this.resolvedSelectorTeams = this.resolveSelectorTeams(
      data,
      this.effectivePickBanStates.length,
    );

    console.debug("[MapbanComponent] updateFromData start", {
      format: data.format,
      stage: this.stage,
      selectedCount: data.selectedMaps?.length ?? 0,
      availableCount: data.availableMaps?.length ?? 0,
      selectedNames: (data.selectedMaps ?? []).map((m) => m.name),
      availableNames: this.availableMapNames,
      hasCustomFormatData: !!data.customFormatData,
      pickBanStates: this.effectivePickBanStates,
    });

    const reconstructedCompleted = this.tryRebuildCompletedSequence(data);
    if (reconstructedCompleted) {
      this.selectedMaps = reconstructedCompleted;
      this.availableMapNames = [];
      this.cardPlanPositions = this.buildCardPlanPositions(this.selectedMaps);
      console.debug("[MapbanComponent] using reconstructed completed sequence", {
        reconstructedCount: reconstructedCompleted.length,
        reconstructedNames: reconstructedCompleted.map((m) => m.name),
      });
      return;
    }

    const decidedMaps = [...(data.selectedMaps ?? [])];

    for (let i = 0; i < this.availableMapNames.length; i++) {
      decidedMaps.push(new SessionMap(i === 0 ? "upcoming" : ""));
    }

    this.selectedMaps = decidedMaps;
    this.cardPlanPositions = this.buildCardPlanPositions(this.selectedMaps);
    console.debug("[MapbanComponent] using live sequence with placeholders", {
      selectedCount: this.selectedMaps.length,
      selectedNames: this.selectedMaps.map((m) => m.name),
      availableMapNames: this.availableMapNames,
    });
  }

  private getPlannedStateAtCardIndex(index: number): "pick" | "ban" | "decider" | undefined {
    const states = this.effectivePickBanStates;
    if (!states || states.length === 0) {
      return undefined;
    }

    const planPosition = this.cardPlanPositions[index] ?? index;
    return states[Math.min(planPosition, states.length - 1)];
  }

  private buildCardPlanPositions(maps: SessionMap[]): number[] {
    const states = this.effectivePickBanStates;
    if (!states || states.length === 0) {
      return maps.map((_, index) => index);
    }

    const positions: number[] = [];
    let cursor = 0;

    for (const map of maps) {
      const resolvedType: PlannedAction | undefined =
        map.bannedBy !== undefined ? "ban" : map.pickedBy !== undefined ? "pick" : undefined;

      if (resolvedType) {
        let match = -1;
        for (let i = cursor; i < states.length; i++) {
          if (states[i] === resolvedType) {
            match = i;
            break;
          }
        }

        if (match === -1) {
          match = Math.min(cursor, states.length - 1);
        }

        positions.push(match);
        cursor = Math.min(match + 1, states.length);
        continue;
      }

      positions.push(Math.min(cursor, states.length - 1));
      cursor = Math.min(cursor + 1, states.length);
    }

    return positions;
  }

  private tryRebuildCompletedSequence(data: IMapbanSessionData): SessionMap[] | undefined {
    const states = this.effectivePickBanStates;
    if (!states || states.length === 0) {
      console.debug("[MapbanComponent] reconstruct skipped: no states");
      return undefined;
    }

    const selectedMaps = data.selectedMaps ?? [];
    const availableMaps = data.availableMaps ?? [];

    const expectedBans = states.filter((state) => state === "ban").length;
    const selectedBans = selectedMaps.filter((map) => map.bannedBy !== undefined).length;

    // If bans are already present in selected maps, normal rendering path is correct.
    if (selectedBans >= expectedBans) {
      console.debug("[MapbanComponent] reconstruct skipped: selected maps already include bans", {
        expectedBans,
        selectedBans,
      });
      return undefined;
    }

    const missingBans = expectedBans - selectedBans;
    if (availableMaps.length < missingBans) {
      console.debug(
        "[MapbanComponent] reconstruct failed: insufficient available maps for missing bans",
        {
          expectedBans,
          selectedBans,
          missingBans,
          availableCount: availableMaps.length,
        },
      );
      return undefined;
    }

    const selectors = data.customFormatData?.selectorTeam ?? [];
    const playableMaps = selectedMaps.filter((map) => map.bannedBy === undefined);

    const rebuilt: SessionMap[] = [];
    let banIndex = 0;
    let playableIndex = 0;
    let fallbackBanTurn: 0 | 1 = 0;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];

      if (state === "ban") {
        const source = availableMaps[banIndex++];
        if (!source) {
          return undefined;
        }

        const bannedMap = this.cloneMap(source);
        const selector = selectors[i];
        if (selector === 0 || selector === 1) {
          bannedMap.bannedBy = selector;
        } else {
          bannedMap.bannedBy = fallbackBanTurn;
          fallbackBanTurn = fallbackBanTurn === 0 ? 1 : 0;
        }
        rebuilt.push(bannedMap);
        continue;
      }

      const playable = playableMaps[playableIndex++];
      if (!playable) {
        return undefined;
      }

      rebuilt.push(this.cloneMap(playable));
    }

    if (rebuilt.length !== states.length) {
      return undefined;
    }

    return rebuilt;
  }

  private buildEffectivePickBanStates(
    data: IMapbanSessionData,
    totalCardCount: number,
  ): ("pick" | "ban" | "decider")[] {
    if (data.format === "bo1") {
      return this.materializeSequence(
        ["ban", "ban", "ban", "ban", "ban", "ban", "decider"],
        totalCardCount,
        "ban",
      );
    }

    if (data.format === "bo3") {
      return this.materializeSequence(
        ["ban", "ban", "pick", "pick", "ban", "ban", "decider"],
        totalCardCount,
        "ban",
      );
    }

    if (data.format === "bo5") {
      return this.materializeSequence(
        ["ban", "ban", "pick", "pick", "pick", "pick", "decider"],
        totalCardCount,
        "pick",
      );
    }

    if (data.format === "custom" || !!data.customFormatData) {
      const explicitStates = data.customFormatData?.pickBanStates ?? [];
      if (explicitStates.length > 0) {
        return this.materializeSequence(
          explicitStates,
          totalCardCount,
          data.stage === "pick" ? "pick" : "ban",
        );
      }

      return this.buildInferredCustomStates(data, totalCardCount);
    }

    return this.buildInferredCustomStates(data, totalCardCount);
  }

  private materializeSequence(
    baseSequence: ("pick" | "ban" | "decider")[],
    totalCardCount: number,
    defaultAction: PlannedAction,
  ): ("pick" | "ban" | "decider")[] {
    if (totalCardCount <= 0) {
      return [];
    }

    const hasDecider = baseSequence.includes("decider");
    const nonDeciderBase = baseSequence.filter((state) => state !== "decider");

    if (!hasDecider) {
      const out = [...nonDeciderBase];
      while (out.length < totalCardCount) {
        out.push(defaultAction);
      }
      return out.slice(0, totalCardCount);
    }

    if (totalCardCount === 1) {
      return ["decider"];
    }

    const nonDeciderSlots = totalCardCount - 1;
    const out: ("pick" | "ban" | "decider")[] = [];

    for (let i = 0; i < nonDeciderSlots; i++) {
      out.push(nonDeciderBase[i] ?? defaultAction);
    }

    out.push("decider");
    return out;
  }

  private buildInferredCustomStates(
    data: IMapbanSessionData,
    totalCardCount: number,
  ): ("pick" | "ban" | "decider")[] {
    if (totalCardCount <= 0) {
      return [];
    }

    const resolvedStates = (data.selectedMaps ?? [])
      .map((map) => {
        if (map.bannedBy !== undefined) return "ban" as const;
        if (map.pickedBy !== undefined) return "pick" as const;
        return undefined;
      })
      .filter((state): state is "pick" | "ban" => state !== undefined);

    const targetBans = data.customFormatData?.banAmount ?? 0;
    const targetPicks = data.customFormatData?.pickAmount ?? 0;
    const hasDecider = data.customFormatData?.hasDecider ?? true;

    let remainingBans = Math.max(0, targetBans - resolvedStates.filter((s) => s === "ban").length);
    let remainingPicks = Math.max(
      0,
      targetPicks - resolvedStates.filter((s) => s === "pick").length,
    );

    const nonDeciderSlots = Math.max(0, totalCardCount - (hasDecider ? 1 : 0));
    const states: ("pick" | "ban" | "decider")[] = [...resolvedStates.slice(0, nonDeciderSlots)];

    while (states.length < nonDeciderSlots) {
      let next: "pick" | "ban";

      if (data.stage === "pick" && remainingPicks > 0) {
        next = "pick";
      } else if (data.stage === "ban" && remainingBans > 0) {
        next = "ban";
      } else if (remainingBans > 0) {
        next = "ban";
      } else if (remainingPicks > 0) {
        next = "pick";
      } else {
        next = data.stage === "pick" ? "pick" : "ban";
      }

      states.push(next);
      if (next === "ban") {
        remainingBans = Math.max(0, remainingBans - 1);
      } else {
        remainingPicks = Math.max(0, remainingPicks - 1);
      }
    }

    if (hasDecider) {
      states.push("decider");
    }

    return states.slice(0, totalCardCount);
  }

  private resolveSelectorTeams(data: IMapbanSessionData, stateCount: number): (0 | 1)[] {
    const custom = data.customFormatData?.selectorTeam;
    if (custom && custom.length > 0) {
      const padded: (0 | 1)[] = [...custom];
      while (padded.length < stateCount) {
        padded.push((padded.length % 2) as 0 | 1);
      }
      return padded.slice(0, stateCount);
    }

    return Array.from({ length: stateCount }, (_, i) => (i % 2) as 0 | 1);
  }

  private cloneMap(source: SessionMap): SessionMap {
    const copy = new SessionMap(source.name);
    copy.bannedBy = source.bannedBy;
    copy.pickedBy = source.pickedBy;
    copy.sidePickedBy = source.sidePickedBy;
    copy.pickedAttack = source.pickedAttack;
    copy.score = [...source.score];
    return copy;
  }
}
