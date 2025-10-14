import { Component, computed, inject, input, Input } from "@angular/core";
import { AgentNameService } from "../../../services/agentName.service";
import { AgentRoleService } from "../../../services/agentRole.service";
import { DataModelService } from "../../../services/dataModel.service";
import { DisplayNameService } from "../../../services/displayName.service";
import { UltimateComponent } from "../../common/ultimate-tracker/ultimate-tracker.component";
import { AbilitiesComponent } from "../../common/abilities/abilities.component";

@Component({
  selector: "app-playerscore-new",
  imports: [AbilitiesComponent, UltimateComponent],
  templateUrl: "./player-scoreboard-card.component.html",
  styleUrl: "./player-scoreboard-card.component.css",
})
export class PlayerScoreboardCardComponent {
  dataModel = inject(DataModelService);
  getDisplayName = inject(DisplayNameService).getDisplayName;

  @Input() player!: any;

  @Input() right = false;
  // @Input() color: "attacker" | "defender" = "defender";
  color = input<string>();

  readonly textColor = computed(() =>
    this.color() == "attacker" ? "text-attacker-shield/80" : "text-defender-shield/80",
  );

  getAgentName(agent: string) {
    return AgentNameService.getAgentName(agent);
  }

  getAgentRole(agent: string): string {
    return AgentRoleService.getAgentRole(agent);
  }

  getTeamColor(): string {
    return this.color() === 'attacker' ? '#ff4557' : '#21fec2';
  }

  formatNumber(number: number): string {
    return this.dataModel.numberFormatter().format(number);
  }

  private static idCounter = 0;
  private _uniqueId?: string;
  
  get uniqueId(): string {
    if (!this._uniqueId) {
      PlayerScoreboardCardComponent.idCounter++;
      this._uniqueId = `player-${PlayerScoreboardCardComponent.idCounter}`;
    }
    return this._uniqueId;
  }
}

@Component({
  selector: "app-playerscore-minimal-new",
  imports: [],
  templateUrl: "./player-scoreboard-card-minimal.component.html",
  styleUrl: "./player-scoreboard-card.component.css",
})
export class PlayerScoreboardCardMinimalComponent extends PlayerScoreboardCardComponent {}
