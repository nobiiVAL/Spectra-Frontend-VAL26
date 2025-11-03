import { Component, computed, inject, signal, effect } from "@angular/core";
import { DataModelService } from "../../../services/dataModel.service";

@Component({
  selector: "app-roundreasons-new",
  imports: [],
  templateUrl: "./roundreasons.component.html",
  styleUrl: "./roundreasons.component.css",
})
export class RoundreasonsComponent {
  dataModel = inject(DataModelService);

  animatingTeam = signal<number>(-1);
  animationStartCounts = signal<{ left: number; right: number }>({ left: 2, right: 2 });
  timeoutInGracePeriod = signal<boolean>(false);
  timeoutCancelledAfterGrace = signal<{ left: boolean; right: boolean }>({ left: false, right: false });

  constructor() {
    // Effect to detect timeout state changes and manage animation
    effect(() => {
      const timeoutState = this.dataModel.timeoutState();
      const timeoutCounter = this.dataModel.timeoutCounter();
      const gracePeriod = this.dataModel.timeoutCancellationGracePeriod();
      const timeoutDuration = 60;
      
      const inGracePeriod = timeoutState.timeRemaining >= (timeoutDuration - gracePeriod);
      this.timeoutInGracePeriod.set(inGracePeriod);
      
      if (timeoutState.leftTeam && this.animatingTeam() !== 0) {
        this.animationStartCounts.set({ left: timeoutCounter.left, right: timeoutCounter.right });
        this.animatingTeam.set(0);
        this.timeoutCancelledAfterGrace.set({ left: false, right: false });
      } else if (timeoutState.rightTeam && this.animatingTeam() !== 1) {
        this.animationStartCounts.set({ left: timeoutCounter.left, right: timeoutCounter.right });
        this.animatingTeam.set(1);
        this.timeoutCancelledAfterGrace.set({ left: false, right: false });
      } else if (!timeoutState.leftTeam && !timeoutState.rightTeam) {
        const wasAnimating = this.animatingTeam();
        
        if (wasAnimating !== -1 && timeoutState.timeRemaining > 0) {
          const cancelledAfterGrace = timeoutState.timeRemaining < (timeoutDuration - gracePeriod);
          
          if (cancelledAfterGrace) {
            const currentCancelled = this.timeoutCancelledAfterGrace();
            if (wasAnimating === 0) {
              this.timeoutCancelledAfterGrace.set({ ...currentCancelled, left: true });
            } else if (wasAnimating === 1) {
              this.timeoutCancelledAfterGrace.set({ ...currentCancelled, right: true });
            }
          }
        }
        
        // Clear animation state
        this.animatingTeam.set(-1);
        this.timeoutInGracePeriod.set(false);
      }
    });

    effect(() => {
      const timeoutCounter = this.dataModel.timeoutCounter();
      const cancelledAfterGrace = this.timeoutCancelledAfterGrace();
      
      if ((cancelledAfterGrace.left || cancelledAfterGrace.right)) {
        this.timeoutCancelledAfterGrace.set({ left: false, right: false });
      }
    });
  }

  isShown = computed(() => this.dataModel.match().roundPhase === "shopping" && this.dataModel.match().roundNumber > 1);

  isInOT = computed(() => this.dataModel.match().roundNumber >= (this.dataModel.match().firstOtRound || 25));

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

  // Get timeout count for a team (0 = left, 1 = right)
  getTimeoutCount(teamIndex: number): number {
    const counter = this.dataModel.timeoutCounter();
    return teamIndex === 0 ? counter.left : counter.right;
  }

  // Check if a timeout square should be filled
  // Rule: Filled square = timeout available to the team  
  // Bottom-up consumption: square 1 (bottom) consumed first, then square 0 (top)
  isTimeoutSquareFilled(teamIndex: number, squareIndex: number): boolean {
    const timeoutCount = this.getTimeoutCount(teamIndex);
    const cancelledAfterGrace = this.timeoutCancelledAfterGrace();
    const animatingTeam = this.animatingTeam();
    const animationStartCounts = this.animationStartCounts();
    
    // Check if this team had a timeout cancelled after grace period
    const teamCancelledAfterGrace = teamIndex === 0 ? cancelledAfterGrace.left : cancelledAfterGrace.right;
    
    if (teamCancelledAfterGrace && animatingTeam === -1) {
      // Timeout was cancelled after grace period - show reduced count immediately
      const startCount = teamIndex === 0 ? animationStartCounts.left : animationStartCounts.right;
      const adjustedCount = Math.max(0, startCount - 1); // Simulate timeout consumption
      
      if (squareIndex === 0) return adjustedCount >= 1; // Top square (consumed last)  
      if (squareIndex === 1) return adjustedCount >= 2; // Bottom square (consumed first)
    }
    
    // Fill pattern based on current timeout count (bottom-up consumption):
    // 2 timeouts: top=filled, bottom=filled [■, ■]  
    // 1 timeout:  top=filled, bottom=empty  [■, □] (bottom consumed first)
    // 0 timeouts: top=empty,  bottom=empty  [□, □]
    if (squareIndex === 0) return timeoutCount >= 1; // Top square (consumed last)  
    if (squareIndex === 1) return timeoutCount >= 2; // Bottom square (consumed first)
    
    return false;
  }

  // Check if a timeout square should animate  
  shouldTimeoutSquareAnimate(teamIndex: number, squareIndex: number): boolean {
    // Only animate if this team is currently timing out
    if (this.animatingTeam() !== teamIndex) return false;
    
    const startCounts = this.animationStartCounts();
    const currentCounts = this.dataModel.timeoutCounter();
    const startCount = teamIndex === 0 ? startCounts.left : startCounts.right;
    const currentCount = teamIndex === 0 ? currentCounts.left : currentCounts.right;
    
    // Animate the square that will be affected by this timeout
    // Consumption pattern: bottom-up (bottom consumed first, then top)
    
    if (startCount === 2) {
      // Team started with 2 timeouts, animate bottom square (2→1, bottom empties first)
      return squareIndex === 1;
    } else if (startCount === 1) {
      // Team started with 1 timeout, animate top square (1→0, top empties last)
      return squareIndex === 0;
    }
    
    return false;
  }
}
