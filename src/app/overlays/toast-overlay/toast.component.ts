import { Component, computed, effect, inject, signal } from "@angular/core";
import { DataModelService } from "../../services/dataModel.service";
import { IToastInfo } from "../../services/Types";

@Component({
  selector: "app-live-toast",
  imports: [],
  templateUrl: "./toast.component.html",
  styleUrl: "./toast.component.css",
})
export class LiveToastComponent {
  dataModel = inject(DataModelService);
  roundPhase = computed(() => this.dataModel.match().roundPhase);

  // Local copy held so the out-animation still renders the previous content
  toastInfo = signal(Object.assign({}, this.dataModel.toastInfo()));

  tournamentIconUrl = computed(() => {
    const logo = this.dataModel.tournamentInfo().logoUrl;
    if (logo && logo !== "") return logo;
    else return "assets/misc/logo.webp";
  });

  hide = true;
  inAnimation = false;
  outAnimation = false;
  cardExpanding = false;
  cardCollapsing = false;

  private wasActive = false;
  private lastToastKey = "";
  private inAnimationTimeoutRef?: ReturnType<typeof setTimeout>;
  private expandAnimationTimeoutRef?: ReturnType<typeof setTimeout>;
  private outAnimationTimeoutRef?: ReturnType<typeof setTimeout>;
  private delayUpdateTimeoutRef?: ReturnType<typeof setTimeout>;

  hideEffect = effect(() => {
    const toast = this.dataModel.toastInfo();
    const active = toast.active && this.roundPhase() === "shopping";
    const toastKey = this.getToastKey(toast);
    const becameActive = active && !this.wasActive;
    const becameInactive = !active && this.wasActive;
    const changedWhileActive = active && this.wasActive && toastKey !== this.lastToastKey;

    if (becameInactive) {
      this.clearEnterAnimationTimeouts();
      this.cardCollapsing = true;
      this.outAnimation = true;

      if (this.outAnimationTimeoutRef) {
        clearTimeout(this.outAnimationTimeoutRef);
      }

      this.outAnimationTimeoutRef = setTimeout(() => {
        this.outAnimationTimeoutRef = undefined;
        this.inAnimation = false;
        this.outAnimation = false;
        this.cardCollapsing = false;
        this.hide = true;
      }, 667);
    } else if (becameActive || changedWhileActive) {
      if (this.outAnimationTimeoutRef) {
        clearTimeout(this.outAnimationTimeoutRef);
        this.outAnimationTimeoutRef = undefined;
      }

      this.clearEnterAnimationTimeouts();
      this.hide = false;
      this.inAnimation = true;
      this.outAnimation = false;
      this.cardExpanding = true;

      this.inAnimationTimeoutRef = setTimeout(() => {
        this.inAnimationTimeoutRef = undefined;
        this.inAnimation = false;
      }, 283);

      this.expandAnimationTimeoutRef = setTimeout(() => {
        this.expandAnimationTimeoutRef = undefined;
        this.cardExpanding = false;
      }, 667);
    } else if (!active) {
      this.hide = true;
    }

    this.lastToastKey = toastKey;
    this.wasActive = active;
  });

  // Delay data update so the slide-out animation still shows the old content
  delayUpdateEffect = effect(() => {
    const latestToast = this.dataModel.toastInfo();

    if (this.delayUpdateTimeoutRef) {
      clearTimeout(this.delayUpdateTimeoutRef);
      this.delayUpdateTimeoutRef = undefined;
    }

    if (!latestToast.active) {
      this.delayUpdateTimeoutRef = setTimeout(() => {
        this.delayUpdateTimeoutRef = undefined;
        this.toastInfo.set(Object.assign({}, this.dataModel.toastInfo()));
      }, 700);
    } else {
      this.toastInfo.set(Object.assign({}, latestToast));
    }
  });

  private getToastKey(toast: IToastInfo): string {
    return [
      toast.active,
      toast.title,
      toast.message,
      toast.duration ?? "null",
      toast.eventLogoEnabled,
      toast.selectedTeam,
    ].join("|");
  }

  private clearEnterAnimationTimeouts(): void {
    if (this.inAnimationTimeoutRef) {
      clearTimeout(this.inAnimationTimeoutRef);
      this.inAnimationTimeoutRef = undefined;
    }

    if (this.expandAnimationTimeoutRef) {
      clearTimeout(this.expandAnimationTimeoutRef);
      this.expandAnimationTimeoutRef = undefined;
    }
  }
}
