import { Component, Input } from "@angular/core";
import { IMapbanSessionData, SessionMap } from "../../services/Types";
import { MapbanBanIconComponent } from "./mapban-map/mapban-ban-icon/mapban-fs-ban-icon.component";
import { MapbanMapComponent } from "./mapban-map/mapban-fs-map.component";

@Component({
  standalone: true,
  selector: "app-mapban-fs-component",
  imports: [MapbanBanIconComponent, MapbanMapComponent],
  templateUrl: "./mapban-fs-component.html",
  styleUrl: "./mapban-fs-component.css",
})
export class MapbanFsComponent {
  @Input({ required: true }) data!: IMapbanSessionData;

  get bannedMapNames(): string[] {
    return this.data.selectedMaps
      .filter((map) => map.bannedBy !== undefined)
      .map((map) => (map.name ? map.name.charAt(0).toUpperCase() + map.name.slice(1) : map.name));
  }

  get bannedTeamTricodes(): string[] {
    return this.data.selectedMaps
      .filter((map) => map.bannedBy !== undefined)
      .map((map) => {
        const teamIndex = map.bannedBy;
        return teamIndex !== undefined && this.data.teams[teamIndex]
          ? this.data.teams[teamIndex].tricode
          : "";
      });
  }

  get pickedAndDeciderMaps(): SessionMap[] {
    return this.data.selectedMaps.filter(
      (map) =>
        map.pickedBy !== undefined || (map.bannedBy === undefined && map.pickedBy === undefined),
    );
  }

  get isMapbanComplete(): boolean {
    if (this.data.format === "bo1") {
      return false;
    }

    const playableMaps = this.data.selectedMaps.filter((map) => map.bannedBy === undefined);

    if (playableMaps.length === 0) {
      return false;
    }

    // Fullscreen should show once every playable map has side selection finalized.
    return playableMaps.every(
      (map) => map.sidePickedBy !== undefined && map.pickedAttack !== undefined,
    );
  }
}
