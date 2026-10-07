import {
  Component,
  afterRenderEffect,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { DataModelService } from "../../services/dataModel.service";
import type { SafeResourceUrl } from "@angular/platform-browser";
import { TranslateKeys } from "../../services/i18nHelper";
import { TranslateService } from "@ngx-translate/core";
import { DisplayNameService } from "../../services/displayName.service";
import { PlayercamStreamService } from "../../services/playercamStream.service";
import { Vibrant } from "node-vibrant/browser";
import type { IPlayercamsListenIn } from "../../services/Types";
import { ListenInIframeComponent } from "../../components/listen-in-iframe/listen-in-iframe.component";

const DEFAULT_COLOR = "#000000";
const SPEAKING_THRESHOLD = 10;
// loudness updates arrive every ~100ms, hold the indicator to avoid flicker
const SPEAKING_HOLD_MS = 400;
const COMMS_MAX_FONT_PX = 20;
const COMMS_MIN_FONT_PX = 8;

@Component({
  selector: "app-listen-in-overlay",
  imports: [ListenInIframeComponent],
  templateUrl: "./listen-in-overlay.component.html",
  styleUrl: "./listen-in-overlay.component.css",
})
export class ListenInOverlayComponent implements OnDestroy {
  protected dataModel = inject(DataModelService);
  protected displayNameService = inject(DisplayNameService);
  protected playercamStreamService = inject(PlayercamStreamService);
  getDisplayName = inject(DisplayNameService).getDisplayName;
  leftTeamColor = signal(DEFAULT_COLOR);
  rightTeamColor = signal(DEFAULT_COLOR);

  private translate = inject(TranslateService);
  commsText = toSignal(this.translate.stream(TranslateKeys.ListenIn_LiveComms), {
    initialValue: "",
  });
  private commsEl = viewChild<ElementRef<HTMLElement>>("comms");
  private fontsReady = signal(false);

  private speakingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  speaking = signal<ReadonlySet<string>>(new Set());

  onLoudness(player: string, loudness: number) {
    if (loudness > SPEAKING_THRESHOLD) this.markSpeaking(player);
  }

  private markSpeaking(player: string) {
    clearTimeout(this.speakingTimers.get(player));
    if (!this.speaking().has(player)) this.speaking.update((s) => new Set(s).add(player));
    this.speakingTimers.set(
      player,
      setTimeout(() => {
        this.speakingTimers.delete(player);
        this.speaking.update((s) => {
          const next = new Set(s);
          next.delete(player);
          return next;
        });
      }, SPEAKING_HOLD_MS),
    );
  }

  ngOnDestroy() {
    this.speakingTimers.forEach(clearTimeout);
  }

  private connectedPlayers = signal<ReadonlySet<string>>(new Set());

  private requestedSide = computed(() => this.dataModel.playercamsInfo().listenIn);

  // Lags behind requestedSide so the overlay stays mounted while the exit animation plays
  renderedSide = signal<IPlayercamsListenIn>(false);
  exiting = signal(false);

  private renderedTeam = computed(() => {
    const side = this.renderedSide();
    return side === false ? undefined : this.dataModel.teams()[side === "left" ? 0 : 1];
  });
  teamColor = computed(() =>
    this.renderedSide() === "left" ? this.leftTeamColor() : this.rightTeamColor(),
  );
  teamUrl = computed(() => this.renderedTeam()?.teamUrl);

  listenInPlayers = computed(() => this.renderedTeam()?.players ?? []);

  onAnimationEnd(e: AnimationEvent) {
    if (e.animationName !== "exit" || !this.exiting()) return;
    this.exiting.set(false);
    this.renderedSide.set(false);
  }

  allConnected = computed(() => {
    const players = this.listenInPlayers();
    const connected = this.connectedPlayers();
    return players.length > 0 && players.every((p) => connected.has(p.fullName));
  });

  onConnectedChange(playerFullName: string, connected: boolean) {
    this.connectedPlayers.update((s) => {
      const next = new Set(s);
      if (connected) next.add(playerFullName);
      else next.delete(playerFullName);
      return next;
    });
  }

  constructor() {
    document.fonts.ready.then(() => this.fontsReady.set(true));
    // fit the label to the space left of the team logo; the logo loading changes that width
    afterRenderEffect((onCleanup) => {
      this.commsText();
      this.fontsReady();
      const el = this.commsEl()?.nativeElement;
      if (!el) return;
      const fit = () => {
        let size = COMMS_MAX_FONT_PX;
        el.style.fontSize = `${size}px`;
        if (el.scrollWidth > el.clientWidth) {
          size = Math.floor((size * el.clientWidth) / el.scrollWidth);
          el.style.fontSize = `${size}px`;
          while (el.scrollWidth > el.clientWidth && size > COMMS_MIN_FONT_PX) {
            el.style.fontSize = `${--size}px`;
          }
        }
      };
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });
    effect(() => {
      const side = this.requestedSide();
      untracked(() => {
        if (side === false || side === undefined) {
          if (this.renderedSide() === false) return;
          // nothing was revealed, so there is nothing to animate out
          if (this.allConnected()) this.exiting.set(true);
          else this.renderedSide.set(false);
        } else {
          this.exiting.set(false);
          this.renderedSide.set(side);
        }
      });
    });
    // iframes are recreated when the rendered side changes, so reset connection state
    effect(() => {
      this.renderedSide();
      this.connectedPlayers.set(new Set());
      this.speaking.set(new Set());
    });
    effect(() => {
      const teams = this.dataModel.teams();
      this.extractColor(teams[0]?.teamUrl, this.leftTeamColor);
      this.extractColor(teams[1]?.teamUrl, this.rightTeamColor);
    });
  }

  private async extractColor(url: string | undefined, target: { set(value: string): void }) {
    if (!url) {
      target.set(DEFAULT_COLOR);
      return;
    }
    try {
      const palette = await Vibrant.from(url).getPalette();
      target.set(palette.Vibrant?.hex ?? DEFAULT_COLOR);
    } catch {
      target.set(DEFAULT_COLOR);
    }
  }

  getStream(playerFullName: string): SafeResourceUrl | undefined {
    return this.playercamStreamService.getStream(playerFullName, true);
  }
}
