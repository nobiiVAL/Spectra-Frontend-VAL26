import { Component, Input } from "@angular/core";

@Component({
    selector: "app-mapban-map",
    standalone: true,
    imports: [],
    templateUrl: "./mapban-fs-map.component.html",
    styleUrl: "./mapban-fs-map.component.css",
})
export class MapbanMapComponent {
  @Input({ required: true }) index!: number;
    @Input({ required: true }) mapName!: string;
    @Input({ required: true }) teams!: { tricode: string; url: string }[];
    @Input() mapScore: (number | undefined)[] = [undefined, undefined];
    @Input() pickedBy: 0 | 1 | undefined = undefined;
    @Input() sidePickedBy: 0 | 1 | undefined = undefined;
    @Input() pickedAttack: boolean | undefined = undefined;
    @Input() format: "bo1" | "bo3" | "bo5" | "custom" | undefined = undefined;

    get displayMapName(): string {
        return this.mapName ? this.mapName.charAt(0).toUpperCase() + this.mapName.slice(1) : "";
    }

    get hasScore(): boolean {
        const left = this.mapScore[0];
        const right = this.mapScore[1];

        if (typeof left !== "number" || typeof right !== "number") {
            return false;
        }

        // Backend can send 0-0 as a placeholder for "no final score yet".
        return !(left === 0 && right === 0);
    }

    get winnerIndex(): 0 | 1 | undefined {
        if (!this.hasScore) {
            return undefined;
        }

        if ((this.mapScore[0] ?? 0) > (this.mapScore[1] ?? 0)) {
            return 0;
        }

        if ((this.mapScore[1] ?? 0) > (this.mapScore[0] ?? 0)) {
            return 1;
        }

        return undefined;
    }

    get winnerFirstScoreText(): string {
        if (!this.hasScore) {
            return "";
        }

        const left = this.mapScore[0] as number;
        const right = this.mapScore[1] as number;

        if (this.winnerIndex === 1) {
            return `${right}-${left}`;
        }

        return `${left}-${right}`;
    }

        get detailsMarginLeft(): string {
                // BO5 has more columns, so we pull details slightly left.
                return this.format === "bo5" ? "4%" : "2.5%";
        }

  get defTeamTricode(): string {
    const picker = this.sidePickedBy ?? 0;
    const defIndex = this.pickedAttack ? 1 - picker : picker;
    return this.teams[defIndex].tricode;
  }
}
