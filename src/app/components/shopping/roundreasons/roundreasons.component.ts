import { Component, computed, inject } from "@angular/core";
import { DataModelService } from "../../../services/dataModel.service";

@Component({
  selector: "app-roundreasons-new",
  imports: [],
  templateUrl: "./roundreasons.component.html",
  styleUrl: "./roundreasons.component.css",
})
export class RoundreasonsComponent {
  dataModel = inject(DataModelService);

  isShown = computed(() => this.dataModel.match().roundPhase === "shopping" && this.dataModel.match().roundNumber > 1);

  // Check if we're in overtime
  isInOT = computed(() => this.dataModel.match().roundNumber >= (this.dataModel.match().firstOtRound || 25));

  // Get the number of rounds to show in OT
  otRoundsToShow = computed(() => {
    if (!this.isInOT()) return 0;
    const currentRound = this.dataModel.match().roundNumber;
    const firstOtRound = this.dataModel.match().firstOtRound || 25;
    const roundsIntoOT = currentRound - firstOtRound + 1;
    return Math.ceil(roundsIntoOT / 2) * 2; // Show in pairs of 2
  });

  // Get the starting index for OT rounds
  otStartIndex = computed(() => {
    if (!this.isInOT()) return 0;
    return (this.dataModel.match().firstOtRound || 25) - 1; // Convert to 0-based index
  });

  // Get the number of rounds to show (regular or OT logic)
  maxRoundsToShow = computed(() => {
    if (this.isInOT()) {
      return this.otRoundsToShow();
    }
    return this.dataModel.match().roundNumber > 12 ? 24 : 12;
  });

  // Get background width based on rounds shown
  backgroundWidth = computed(() => {
    if (this.isInOT()) {
      const roundsToShow = this.otRoundsToShow();
      const firstPairWidth = 114 + (2 * 94); // Width for first pair (rounds 25-26)
      
      if (roundsToShow <= 2) {
        // First pair: use original calculation
        return `${114 + (roundsToShow * 94)}px`;
      } else {
        // Subsequent pairs: first pair + additional pairs with different increment
        const additionalPairs = (roundsToShow - 2) / 2;
        const subsequentPairIncrement = 42; // Change this value to adjust width increase for pairs after first
        return `${firstPairWidth + (additionalPairs * subsequentPairIncrement * 2)}px`;
      }
    }
    return this.dataModel.match().roundNumber > 12 ? '1168px' : '664px';
  });

  // Get bottom rectangle width
  bottomRectangleWidth = computed(() => {
    if (this.isInOT()) {
      const roundsToShow = this.otRoundsToShow();
      const firstPairWidth = (2 * 56 + 22); // Width for first pair (rounds 25-26)
      
      if (roundsToShow <= 2) {
        // First pair: use original calculation
        return `${(roundsToShow * 56 + 22)}px`;
      } else {
        // Subsequent pairs: first pair + additional pairs with different increment
        const additionalPairs = (roundsToShow - 2) / 2;
        const subsequentPairIncrement = 40; // Change this value to adjust width increase for pairs after first
        return `${firstPairWidth + (additionalPairs * subsequentPairIncrement * 2)}px`;
      }
    }
    return this.dataModel.match().roundNumber > 12 ? '992px' : '494px';
  });

  // Get background left position - increases by 44px every 2 rounds after first OT round
  backgroundLeft = computed(() => {
    if (this.isInOT()) {
      const currentRound = this.dataModel.match().roundNumber;
      const firstOtRound = this.dataModel.match().firstOtRound || 25;
      const roundsIntoOT = currentRound - firstOtRound;
      const pairsCompleted = Math.floor(roundsIntoOT / 2);
      return `${94 + (pairsCompleted * 44)}px`;
    }
    return this.dataModel.match().roundNumber > 12 ? '53%' : '50%';
  });

  getBackgroundClass(record: any, team: any): string {
    if (record.type === "lost" || record.type === "upcoming") {
      return "";
    }
    return `bg-roundwin-${record.wasAttack ? "attacker" : "defender"}-${team == this.dataModel.teams()[0] ? "top" : "bottom"}`;
  }
}
