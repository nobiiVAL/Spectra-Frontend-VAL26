import { Config } from "../../../shared/config";
import { Component, Input, AfterViewInit, OnChanges, DoCheck, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy } from "@angular/core";
import { NgIf, NgFor, NgClass } from "@angular/common";

@Component({
  selector: "app-ultimate",
  standalone: true,
  imports: [NgIf, NgFor, NgClass],
  templateUrl: "ultimate-tracker.component.html",
  styleUrl: "ultimate-tracker.component.css",
})
export class UltimateComponent implements AfterViewInit, OnChanges, DoCheck, OnDestroy {
  public readonly assets: string = "../../../assets";

  private _player: any;
  private prevUltPoints: number = -1; // to track changes

  @Input()
  set player(val: any) {
    this._player = val;
    this.updateUltimateProgress();
    this.prevUltPoints = this._player?.currUltPoints;
  }
  get player() {
    return this._player;
  }

  @Input() color!: "attacker" | "defender";
  @Input() match!: any;
  @Input() side!: "left" | "right";
  @Input() hideAuxiliary = false;

  @ViewChild("svgContainer", { static: true }) svgContainerRef!: ElementRef<SVGSVGElement>;
  @ViewChild("ultimateVideo", { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private wasUltReady = false;
  private videoEventListeners: Array<{ event: string; handler: EventListener }> = [];
  private animationFrameId?: number;
  private isDestroyed = false;

  constructor(public config: Config, private cdRef: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.cleanupVideoEventListeners();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  ngAfterViewInit(): void {
    this.updateUltimateProgress();
    this.preloadVideo();
  }

  ngOnChanges(): void {
    this.updateUltimateProgress();
    this.handleUltimateStateChange();
  }

  ngDoCheck(): void {
    if (this.player && this.player.currUltPoints !== this.prevUltPoints) {
      this.prevUltPoints = this.player.currUltPoints;
      this.updateUltimateProgress();
      this.handleUltimateStateChange();
    }
  }

  public get dashes(): { collected: boolean; angle: number }[] {
    const dashSpan = (2 * Math.PI) / this.player.maxUltPoints;
    return Array.from({ length: this.player.maxUltPoints }, (_, i) => ({
        collected: i < this.player.currUltPoints,
        angle: i * dashSpan - Math.PI / 2 + dashSpan / 2,
    }));
  }

  public computePath(angle: number): string {
    const cx = 64, cy = 64, outerRadius = 18;
    const dashSpan = (2 * Math.PI) / this.player.maxUltPoints;
    const adjustedSpan = dashSpan * 0.8;
    const startAngle = angle - adjustedSpan / 2;
    const endAngle = angle + adjustedSpan / 2;
    const startX = cx + outerRadius * Math.cos(startAngle);
    const startY = cy + outerRadius * Math.sin(startAngle);
    const endX = cx + outerRadius * Math.cos(endAngle);
    const endY = cy + outerRadius * Math.sin(endAngle);
    return `M ${startX} ${startY} A ${outerRadius} ${outerRadius} 0 0 1 ${endX} ${endY}`;
  }

  private createDash(
    cx: number,
    cy: number,
    outerRadius: number,
    angle: number,
    originalSpan: number,
    collected: boolean
  ) {
    const dashCoverage = 0.8;
    const adjustedSpan = originalSpan * dashCoverage;
    const startAngle = angle - adjustedSpan / 2;
    const endAngle = angle + adjustedSpan / 2;
    const startX = cx + outerRadius * Math.cos(startAngle);
    const startY = cy + outerRadius * Math.sin(startAngle);
    const endX = cx + outerRadius * Math.cos(endAngle);
    const endY = cy + outerRadius * Math.sin(endAngle);
    const largeArcFlag = 0;
    const sweepFlag = 1;

    const pathData = `
      M ${startX} ${startY}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}
    `.trim();

    const dash = document.createElementNS("http://www.w3.org/2000/svg", "path");
    dash.setAttribute("d", pathData);

    // Use white for all collected dashes
    dash.setAttribute(
      "stroke",
      collected
        ? "#fff"
        : "rgba(163, 163, 163, 0.5)"
    );
    dash.setAttribute("stroke-width", "3");
    dash.setAttribute("fill", "none");
    dash.setAttribute("stroke-linecap", "butt");

    this.svgContainerRef.nativeElement.appendChild(dash);
  }

  private lastRenderedState: { ultReady: boolean; currUltPoints: number; maxUltPoints: number } = 
    { ultReady: false, currUltPoints: -1, maxUltPoints: -1 };

  private updateUltimateProgress(): void {
    if (!this.svgContainerRef || this.isDestroyed) {
      return;
    }

    // Avoid unnecessary DOM manipulation by checking if state actually changed
    const currentState = {
      ultReady: this.player?.ultReady || false,
      currUltPoints: this.player?.currUltPoints || 0,
      maxUltPoints: this.player?.maxUltPoints || 0
    };

    if (
      this.lastRenderedState.ultReady === currentState.ultReady &&
      this.lastRenderedState.currUltPoints === currentState.currUltPoints &&
      this.lastRenderedState.maxUltPoints === currentState.maxUltPoints
    ) {
      return; // No change needed
    }

    this.lastRenderedState = { ...currentState };

    // Use requestAnimationFrame to batch DOM updates
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      if (this.isDestroyed) return;

      const svgContainer = this.svgContainerRef.nativeElement;
      
      // More efficient cleanup - remove children instead of innerHTML
      while (svgContainer.firstChild) {
        svgContainer.removeChild(svgContainer.firstChild);
      }

      const cx = 64, cy = 64, outerRadius = 18;

      if (this.player.ultReady === true) {
        this.createUltimateReadyElements(svgContainer, cx, cy, outerRadius);
      } else {
        this.createProgressElements(svgContainer, cx, cy, outerRadius);
      }

      // Only trigger change detection if component is not destroyed
      if (!this.isDestroyed) {
        this.cdRef.detectChanges();
      }
    });
  }

  private createUltimateReadyElements(svgContainer: SVGSVGElement, cx: number, cy: number, outerRadius: number): void {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", "glow");
    filter.setAttribute("x", "-100%");
    filter.setAttribute("y", "-100%");
    filter.setAttribute("width", "300%");
    filter.setAttribute("height", "300%");

    const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
    feDropShadow.setAttribute("dx", "0");
    feDropShadow.setAttribute("dy", "0");
    feDropShadow.setAttribute("stdDeviation", "9");
    feDropShadow.setAttribute("flood-color", "white");
    feDropShadow.setAttribute("flood-opacity", "1");

    const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
    animate.setAttribute("attributeName", "stdDeviation");
    animate.setAttribute("values", "9;24;24;9");
    animate.setAttribute("keyTimes", "0;0.4;0.5;1");
    animate.setAttribute("calcMode", "spline");
    animate.setAttribute("keySplines", "0.42 0 0.58 1; 0 0 1 1; 0.42 0 0.58 1");
    animate.setAttribute("dur", "5s");
    animate.setAttribute("repeatCount", "indefinite");

    feDropShadow.appendChild(animate);
    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svgContainer.appendChild(defs);

    const glowingCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glowingCircle.setAttribute("cx", cx.toString());
    glowingCircle.setAttribute("cy", cy.toString());
    glowingCircle.setAttribute("r", outerRadius.toString());
    glowingCircle.setAttribute("stroke", "white");
    glowingCircle.setAttribute("stroke-width", "3");
    glowingCircle.setAttribute("fill", "none");
    glowingCircle.setAttribute("filter", "url(#glow)");

    svgContainer.appendChild(glowingCircle);
  }

  private createProgressElements(svgContainer: SVGSVGElement, cx: number, cy: number, outerRadius: number): void {
    const dashSpan = (2 * Math.PI) / this.player.maxUltPoints;
    for (let i = 0; i < this.player.maxUltPoints; i++) {
      const angle = i * dashSpan - Math.PI / 2 + dashSpan / 2;
      this.createDash(
        cx,
        cy,
        outerRadius,
        angle,
        dashSpan,
        i < this.player.currUltPoints,
      );
    }
  }

  private cleanupVideoEventListeners(): void {
    if (this.videoRef?.nativeElement) {
      this.videoEventListeners.forEach(({ event, handler }) => {
        this.videoRef.nativeElement.removeEventListener(event, handler);
      });
      this.videoEventListeners = [];
    }
  }

  private addVideoEventListener(event: string, handler: EventListener): void {
    if (this.videoRef?.nativeElement) {
      this.videoRef.nativeElement.addEventListener(event, handler);
      this.videoEventListeners.push({ event, handler });
    }
  }

  private preloadVideo(): void {
    if (this.videoRef?.nativeElement) {
      const video = this.videoRef.nativeElement;
      
      // Clean up existing listeners first
      this.cleanupVideoEventListeners();
      
      // Preload the video to eliminate delay
      video.load();
      
      // Set up event listeners with proper cleanup tracking
      const loadedDataHandler = () => {
        if (!this.isDestroyed) {
          console.log('Ultimate video preloaded successfully');
          // If ultimate is ready when video loads, start playing
          if (this.player?.ultReady) {
            this.playVideoSafely();
          }
        }
      };
      
      const errorHandler = (e: Event) => {
        if (!this.isDestroyed) {
          console.warn('Ultimate video preload failed:', e);
        }
      };

      // Enhanced pause handler to prevent stuttering
      const pauseHandler = (e: Event) => {
        if (!this.isDestroyed && this.player?.ultReady && !video.ended) {
          // Use requestAnimationFrame for better performance
          this.animationFrameId = requestAnimationFrame(() => {
            if (!this.isDestroyed && this.player?.ultReady) {
              this.playVideoSafely();
            }
          });
        }
      };

      // Memory cleanup on video end
      const endedHandler = () => {
        if (!this.isDestroyed) {
          video.currentTime = 0; // Reset for potential replay
        }
      };

      this.addVideoEventListener('loadeddata', loadedDataHandler);
      this.addVideoEventListener('error', errorHandler);
      this.addVideoEventListener('pause', pauseHandler);
      this.addVideoEventListener('ended', endedHandler);
    }
  }

  private playVideoSafely(): void {
    if (!this.videoRef?.nativeElement || this.isDestroyed) return;
    
    const video = this.videoRef.nativeElement;
    
    try {
      if (video.readyState >= 2) { // Video has loaded enough to play
        video.currentTime = 0;
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (!this.isDestroyed) {
              console.warn('Video play failed:', e);
            }
          });
        }
      } else {
        // Wait for video to be ready with a one-time listener
        const canplayHandler = () => {
          if (!this.isDestroyed && this.player?.ultReady) {
            video.currentTime = 0;
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                if (!this.isDestroyed) {
                  console.warn('Video play failed:', e);
                }
              });
            }
          }
        };
        
        video.addEventListener('canplay', canplayHandler, { once: true });
      }
    } catch (error) {
      if (!this.isDestroyed) {
        console.warn('Video play error:', error);
      }
    }
  }

  private handleUltimateStateChange(): void {
    if (!this.videoRef?.nativeElement || this.isDestroyed) return;
    
    const video = this.videoRef.nativeElement;
    const isUltReady = this.player?.ultReady;
    
    if (isUltReady && !this.wasUltReady) {
      // Ultimate just became ready - start playing
      this.playVideoSafely();
    } else if (!isUltReady && this.wasUltReady) {
      // Ultimate no longer ready - pause and reset video
      try {
        video.pause();
        video.currentTime = 0;
      } catch (error) {
        if (!this.isDestroyed) {
          console.warn('Video pause error:', error);
        }
      }
    }
    
    this.wasUltReady = isUltReady;
  }
}
