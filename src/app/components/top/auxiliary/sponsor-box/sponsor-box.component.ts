import { Component, inject, OnInit, OnDestroy, signal } from "@angular/core";
import { DataModelService } from "../../../../services/dataModel.service";

@Component({
  selector: "app-sponsor-box",
  imports: [],
  templateUrl: "./sponsor-box.component.html",
  styleUrl: "./sponsor-box.component.css",
})
export class SponsorBoxComponent implements OnInit, OnDestroy {
  dataModel = inject(DataModelService);

  currentIndex = signal(0);
  private intervalId?: number;

  ngOnInit(): void {
    this.setupSponsorRotation();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private setupSponsorRotation(): void {
    const sponsorInfo = this.dataModel.sponsorInfo();
    
    // Check if sponsors exist and are enabled
    if (!sponsorInfo.enabled || !sponsorInfo.sponsors || sponsorInfo.sponsors.length === 0) {
      console.warn('Sponsor box: No sponsors available or not enabled');
      return;
    }

    // Ensure duration is valid (convert to milliseconds if needed)
    const duration = sponsorInfo.duration > 100 ? sponsorInfo.duration : sponsorInfo.duration * 1000;
    
    if (duration <= 0) {
      console.warn('Sponsor box: Invalid duration:', sponsorInfo.duration);
      return;
    }

    console.log('Sponsor box: Setting up rotation with', sponsorInfo.sponsors.length, 'sponsors, duration:', duration);

    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Only start rotation if there are multiple sponsors
    if (sponsorInfo.sponsors.length > 1) {
      this.intervalId = window.setInterval(() => {
        this.currentIndex.update((i) => {
          const nextIndex = (i + 1) % sponsorInfo.sponsors.length;
          console.log('Sponsor box: Switching from index', i, 'to', nextIndex);
          return nextIndex;
        });
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
