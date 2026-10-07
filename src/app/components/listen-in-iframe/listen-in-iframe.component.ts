import {
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import type { SafeResourceUrl } from "@angular/platform-browser";

@Component({
  selector: "app-listen-in-iframe",
  templateUrl: "./listen-in-iframe.component.html",
  styleUrl: "./listen-in-iframe.component.css",
  host: {
    class: "contents",
    "(window:message)": "onMessage($event)",
  },
})
export class ListenInIframeComponent {
  src = input<SafeResourceUrl | undefined>();
  connectedChange = output<boolean>();
  loudness = output<number>();

  connected = signal(false);
  private frame = viewChild.required<ElementRef<HTMLIFrameElement>>("frame");

  constructor() {
    // a new src means a new connection attempt
    effect(() => {
      this.src();
      untracked(() => this.connected.set(false));
    });
    effect(() => this.connectedChange.emit(this.connected()));
  }

  protected onMessage(e: MessageEvent) {
    if (e.source !== this.frame().nativeElement.contentWindow) return;
    const data = e.data;
    if (!data || typeof data !== "object") return;

    switch (data.action) {
      case "view-connection":
        this.connected.set(data.value === true);
        break;
      case "loudness":
        if (data.loudness) {
          this.loudness.emit(Math.max(0, ...Object.values<number>(data.loudness).map(Number)));
        }
        break;
    }
  }
}
