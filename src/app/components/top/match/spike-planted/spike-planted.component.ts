import { Component, computed, inject, effect } from "@angular/core";
import { DataModelService } from "../../../../services/dataModel.service";

@Component({
  selector: "app-spike-icon",
  imports: [],
  templateUrl: "./spike-planted.component.html",
  styleUrl: "./spike-planted.component.css",
})
export class SpikePlantedComponent {
  dataModel = inject(DataModelService);

  readonly show = computed(() => {
    return (
      this.dataModel.match().roundPhase === "combat" &&
      this.dataModel.spikeState().planted &&
      !this.dataModel.spikeState().detonated &&
      !this.dataModel.spikeState().defused
    );
  });

  readonly effectRef = effect(() => {
    if (this.show() && !this.isBlinking) {
      this.startBlink();
    } else {
      this.endBlink();
    }
  });

  blinkTimerRef?: NodeJS.Timeout;
  pulseTimerRef?: NodeJS.Timeout;
  blinkState = true;
  pulseState = false;
  isBlinking = false;
  blinkStartTime = 0;
  blinkLastTime = 0;

  protected startBlink() {
    this.isBlinking = true;
    this.blinkStartTime = Date.now();
    this.blinkLastTime = this.blinkStartTime;
    this.timeoutFunction(45 * 1000, 0);
  }

  protected endBlink() {
    clearInterval(this.blinkTimerRef);
    clearTimeout(this.pulseTimerRef);
    this.blinkTimerRef = undefined;
    this.pulseTimerRef = undefined;
    this.blinkState = true;
    this.pulseState = false;
    this.isBlinking = false;
  }

  protected timeoutFunction(durationLeft: number, lastTimeout: number) {
    this.blinkState = !this.blinkState;
    
    // Trigger a short pulse effect
    this.triggerPulse();

    const now = Date.now();
    const timeDiff = now - this.blinkLastTime;
    durationLeft -= timeDiff;
    this.blinkLastTime = now;

    if (durationLeft <= 0) {
      this.endBlink();
      return; //recursion exit
    }

    let nextTimeout = 0;
    if (durationLeft > 20 * 1000) nextTimeout = 1000;
    else if (durationLeft > 10 * 1000) nextTimeout = 500;
    else if (durationLeft > 5 * 1000) nextTimeout = 250;
    else if (durationLeft > 1 * 1000) nextTimeout = 250;
    else {
      this.endBlink();
      return; //another recursion exit
    }

    //adjust next timeout depending on the call delay of the last iteration
    nextTimeout -= timeDiff - lastTimeout;

    this.blinkTimerRef = setTimeout(() => {
      this.timeoutFunction(durationLeft, nextTimeout);
    }, nextTimeout);
  }

  protected triggerPulse() {
    // Clear any existing pulse timer
    clearTimeout(this.pulseTimerRef);
    
    // Start pulse effect
    this.pulseState = true;
    
    // End pulse effect after a short duration (200ms)
    this.pulseTimerRef = setTimeout(() => {
      this.pulseState = false;
    }, 200);
  }
}
