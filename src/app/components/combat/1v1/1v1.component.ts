import { Component, computed, effect, inject, OnInit, signal } from "@angular/core";
import { SafeResourceUrl } from "@angular/platform-browser";
import { DataModelService } from "../../../services/dataModel.service";
import { PlayerCombatCardComponent } from "../player-combat-card/player-combat-card.component";
import { DisplayNameService } from "../../../services/displayName.service";
import { PlayercamStreamService } from "../../../services/playercamStream.service";

@Component({
    selector: "app-1v1",
    imports: [PlayerCombatCardComponent],
    templateUrl: "./1v1.component.html",
    styleUrls: ["./1v1.component.css"],
})
export class OneVersusOneComponent implements OnInit {
    dataModel = inject(DataModelService);
    getDisplayName = inject(DisplayNameService).getDisplayName;
    readonly streamService = inject(PlayercamStreamService);

    private lastRoundNumber = signal<number>(-1);
    private oneVersusOneTriggered = signal<boolean>(false);
    private storedLeftPlayer = signal<any>(null);
    private storedRightPlayer = signal<any>(null);
    private storedLeftPlayerIndex = signal<number>(2);
    private storedRightPlayerIndex = signal<number>(2);

    constructor() {
        effect(() => {
            const currentRound = this.dataModel.match().roundNumber;
            const previousRound = this.lastRoundNumber();

            if (currentRound !== previousRound) {
                this.oneVersusOneTriggered.set(false);
                this.storedLeftPlayer.set(null);
                this.storedRightPlayer.set(null);
                this.storedLeftPlayerIndex.set(2);
                this.storedRightPlayerIndex.set(2);
                this.lastRoundNumber.set(currentRound);
            }

            const teams = this.dataModel.teams();
            const aliveLeft = teams[0].players.filter((p: any) => p.isAlive).length;
            const aliveRight = teams[1].players.filter((p: any) => p.isAlive).length;

            if (aliveLeft === 1 && aliveRight === 1) {
                this.oneVersusOneTriggered.set(true);
                // Store the players and their indices when 1v1 triggers
                const leftPlayerIndex = teams[0].players.findIndex((p: any) => p.isAlive);
                const rightPlayerIndex = teams[1].players.findIndex((p: any) => p.isAlive);
                const leftPlayer = teams[0].players[leftPlayerIndex];
                const rightPlayer = teams[1].players[rightPlayerIndex];
                if (leftPlayer) {
                    this.storedLeftPlayer.set(leftPlayer);
                    this.storedLeftPlayerIndex.set(leftPlayerIndex);
                }
                if (rightPlayer) {
                    this.storedRightPlayer.set(rightPlayer);
                    this.storedRightPlayerIndex.set(rightPlayerIndex);
                }
            }
        });
    }

    isOneVersusOne = computed(() => this.oneVersusOneTriggered());

    leftPlayer = computed(() => {
        // Return stored player if 1v1 is active, otherwise return current alive player
        if (this.isOneVersusOne()) {
            return this.storedLeftPlayer();
        }
        return this.dataModel.teams()[0]?.players.find((p: any) => p.isAlive) || null;
    });

    rightPlayer = computed(() => {
        // Return stored player if 1v1 is active, otherwise return current alive player
        if (this.isOneVersusOne()) {
            return this.storedRightPlayer();
        }
        return this.dataModel.teams()[1]?.players.find((p: any) => p.isAlive) || null;
    });

    // Get animation class based on player position
    // Player list uses justify-end with gap-6, index 0 is at top
    // Cards should animate to the first (top) position
    // Player card height is ~82vh units + gap of 24px (~6 tailwind units)
    leftPlayerAnimationClass = computed(() => {
        const index = this.storedLeftPlayerIndex();
        if (index === 0) {
            return 'animate-1v1-stay'; // First player stays in place
        }
        // Return class based on slot position
        return `animate-1v1-from-slot-${index}`;
    });

    rightPlayerAnimationClass = computed(() => {
        const index = this.storedRightPlayerIndex();
        if (index === 0) {
            return 'animate-1v1-stay'; // First player stays in place
        }
        // Return class based on slot position
        return `animate-1v1-from-slot-${index}`;
    });

    leftTeam = computed(() => this.dataModel.teams()[0]);
    rightTeam = computed(() => this.dataModel.teams()[1]);

    // Check if playercams should be shown for both players in the 1v1
    shouldShowPlayercams = computed(() => {
        const playercamsInfo = this.dataModel.playercamsInfo();
        if (!playercamsInfo.enable) return false;
        
        const enabledPlayers = playercamsInfo.enabledPlayers ?? [];
        const leftPlayer = this.leftPlayer();
        const rightPlayer = this.rightPlayer();
        
        if (!leftPlayer || !rightPlayer) return false;
        
        return enabledPlayers.includes(leftPlayer.fullName) && enabledPlayers.includes(rightPlayer.fullName);
    });

    ngOnInit() {
        // Initialize streams for all players via shared service
        this.streamService.initializeFromTeams();
    }

    getStream(playerFullName: string): SafeResourceUrl | undefined {
        return this.streamService.getStream(playerFullName);
    }
}