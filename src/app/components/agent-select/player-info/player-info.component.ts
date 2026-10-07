import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  inject,
  signal,
  AfterViewInit,
} from "@angular/core";
import { AgentRoleService } from "../../../services/agentRole.service";
import { DataModelService } from "../../../services/dataModel.service";
import { AgentNameService } from "../../../services/agentName.service";

@Component({
  selector: "app-agent-select-player-info",
  imports: [],
  templateUrl: "./player-info.component.html",
  styleUrl: "./player-info.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[style.--player-animation-delay-ms]": "animationDelayMs()" },
})
export class AgentSelectPlayerInfoComponent implements AfterViewInit {
  readonly dataModel = inject(DataModelService);

  coverAnimation = signal(false);
  reveal = signal(false);

  agent = input<string>("");
  locked = input<boolean>(false);
  playerName = input<string>();

  color = input<string>();
  down = input<boolean>(false);
  animationDelayMs = input<number>(0);

  previousAgent = "";
  prevLocked = false;
  animateSwitch = signal(false);
  showLockPulse = signal(false);

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.coverAnimation.set(true);
      this.reveal.set(true);
    });
  }

  switchEffect = effect(() => {
    if (this.agent() !== this.previousAgent) {
      this.previousAgent = this.agent();
      this.animateSwitch.set(true);

      setTimeout(() => {
        this.animateSwitch.set(false);
      }, 100);
    }
  });

  lockEffect = effect(() => {
    const currentLocked = this.locked();
    if (currentLocked && !this.prevLocked) {
      this.showLockPulse.set(false);
      setTimeout(() => {
        this.showLockPulse.set(true);
      }, 0);
    }

    if (!currentLocked) {
      this.showLockPulse.set(false);
    }

    this.prevLocked = currentLocked;
  });

  onLockPulseAnimationEnd(): void {
    this.showLockPulse.set(false);
  }

  getAgentRole(name: string): string {
    return AgentRoleService.getAgentRole(name);
  }
  getAgentName(name: string): string {
    return AgentNameService.getAgentName(name);
  }
}
