import { Component, inject, OnDestroy, signal, effect, computed } from "@angular/core";
import { DataModelService } from "../../../../services/dataModel.service";

@Component({
  selector: "app-sponsor-box",
  imports: [],
  templateUrl: "./sponsor-box.component.html",
  styleUrl: "./sponsor-box.component.css",
})
export class SponsorBoxComponent implements OnDestroy {
  dataModel = inject(DataModelService);

  currentIndex = signal(0);
  private intervalId?: number;

  // Create a computed signal to track only the relevant sponsor config
  private sponsorConfig = computed(() => {
    const info = this.dataModel.sponsorInfo();
    return {
      enabled: info.enabled,
      duration: info.duration,
      sponsorCount: info.sponsors?.length || 0,
    };
  });

  constructor() {
    // Set up reactive sponsor rotation using effect
    effect(() => {
      // Read the computed config to track changes
      const config = this.sponsorConfig();
      this.setupSponsorRotation();
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private setupSponsorRotation(): void {
    const sponsorInfo = this.dataModel.sponsorInfo();
    
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Reset to first index when sponsors change
    this.currentIndex.set(0);
    
    // Check if sponsors exist and are enabled
    if (!sponsorInfo.enabled || !sponsorInfo.sponsors || sponsorInfo.sponsors.length === 0) {
      return;
    }

    // Ensure duration is valid (convert to milliseconds if needed)
    const duration = sponsorInfo.duration > 100 ? sponsorInfo.duration : sponsorInfo.duration * 1000;
    
    if (duration <= 0) {
      console.warn('Sponsor box: Invalid duration:', sponsorInfo.duration);
      return;
    }

    const sponsorCount = sponsorInfo.sponsors.length;

    // Only start rotation if there are multiple sponsors
    if (sponsorCount > 1) {
      this.intervalId = window.setInterval(() => {
        this.currentIndex.update((i) => (i + 1) % sponsorCount);
      }, duration);
    }
  }

  onImageError(event: Event, sponsorUrl: string, index: number): void {
    console.error(`Sponsor image failed to load: ${sponsorUrl} (index: ${index})`, event);
  }

  onImageLoad(sponsorUrl: string, index: number): void {
    console.log(`Sponsor image loaded successfully: ${sponsorUrl} (index: ${index})`);
  }
}
