import { Component, computed, inject } from "@angular/core";
import { DataModelService } from "../../../services/dataModel.service";
import { TranslatePipe } from "@ngx-translate/core";
import { TranslateKeys } from "../../../services/i18nHelper";
import {
  PlayerScoreboardCardComponent,
  PlayerScoreboardCardMinimalComponent,
} from "../player-scoreboard-card/player-scoreboard-card.component";

@Component({
  selector: "app-scoreboard-new",
  imports: [PlayerScoreboardCardComponent, PlayerScoreboardCardMinimalComponent],
  templateUrl: "./scoreboard.component.html",
  styleUrl: "./scoreboard.component.css",
})
export class ScoreboardComponent {
  dataModel = inject(DataModelService);
  TranslateKeys = TranslateKeys;

  isShown = computed(() => this.dataModel.match().roundPhase === "shopping");

  // sort player list by KDA
  sortedTeams = computed(() => {
    return this.dataModel.teams().map(team => ({
      ...team,
      players: [...team.players].sort((a, b) => {
        if (a.kills !== b.kills) {
          return b.kills - a.kills;
        }
        if (a.deaths !== b.deaths) {
          return a.deaths - b.deaths;
        }
        
        return b.assists - a.assists;
      })
    }));
  });
}
