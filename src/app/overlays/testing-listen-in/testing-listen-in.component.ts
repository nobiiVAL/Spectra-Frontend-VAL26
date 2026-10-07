import { Component, inject, Injectable, OnInit } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { PlayercamStreamService } from "../../services/playercamStream.service";
import { ListenInOverlayComponent } from "../listen-in-overlay/listen-in-overlay.component";
import { IPlayercamsListenIn } from "../../services/Types";
import { DataModelService } from "../../services/dataModel.service";

const REAL_PLAYER = "nobii#prod";

// Replaces VDO.Ninja feeds with a locally generated animated page, except for REAL_PLAYER which uses the real feed
@Injectable()
class MockPlayercamStreamService extends PlayercamStreamService {
  private readonly mockSanitizer = inject(DomSanitizer);
  private readonly mockCache = new Map<string, SafeResourceUrl>();

  override getStream(playerFullName: string, audio = false): SafeResourceUrl | undefined {
    if (playerFullName === REAL_PLAYER) return super.getStream(playerFullName, audio);
    const key = `${playerFullName}|${audio}`;
    let url = this.mockCache.get(key);
    if (!url) {
      const hue = [...playerFullName].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
      const name = playerFullName.split("#")[0].replace(/[<>&"']/g, "");
      const html = `<body style="margin:0;overflow:hidden;font-family:sans-serif;color:#fff;
        background:linear-gradient(135deg,hsl(${hue},70%,35%),hsl(${(hue + 60) % 360},70%,15%));
        background-size:300% 300%;animation:g 4s ease-in-out infinite alternate">
        <style>@keyframes g{to{background-position:100% 100%}}@keyframes p{50%{opacity:.2}}</style>
        <div style="position:absolute;top:6px;left:8px;font-size:12px;animation:p 1s infinite">● MOCK LIVE</div>
        <div style="display:flex;height:100vh;align-items:center;justify-content:center;font-size:7vw;font-weight:bold">${name}</div>
        ${audio ? `<script>
          // simulate VDO.Ninja &getloudness pushes: alternating talking / silent periods
          const phase = Math.random() * 4000;
          // simulate a staggered connection time per feed
          setTimeout(() => {
            parent.postMessage({ action: "view-connection", value: true }, "*");
            setInterval(() => {
              const talking = Math.sin((Date.now() + phase) / 1200) > 0.2;
              parent.postMessage({ action: "loudness", mode: "update", loudness: { mock: talking ? 20 + Math.random() * 40 : Math.random() * 3 } }, "*");
            }, 100);
          }, 500 + Math.random() * 2500);
        </script>` : ""}</body>`;
      url = this.mockSanitizer.bypassSecurityTrustResourceUrl(
        "data:text/html;charset=utf-8," + encodeURIComponent(html),
      );
      this.mockCache.set(key, url);
    }
    return url;
  }
}

const MOCK_NAMES = [
  ["Alpha1", "Alpha2", "Alpha3", "Alpha4", "Alpha5"],
  ["Omega1", "Omega2", "Omega3", "Omega4", "Omega5"],
];

@Component({
  selector: "app-testing-listen-in",
  imports: [ListenInOverlayComponent],
  templateUrl: "./testing-listen-in.component.html",
  styleUrl: "./testing-listen-in.component.css",
  providers: [{ provide: PlayercamStreamService, useClass: MockPlayercamStreamService }],
})
export class TestingListenInComponent implements OnInit {
  readonly dataModel = inject(DataModelService);

  ngOnInit(): void {
    this.dataModel.match.update((match) => ({
      ...match,
      teams: [
        this.mockTeam(match.teams[0], "Team Alpha", 0),
        this.mockTeam(match.teams[1], "Team Omega", 1),
      ],
      tools: {
        ...match.tools,
        playercamsInfo: {
          ...match.tools.playercamsInfo,
          enable: true,
          identifier: "SPPCDEBUG",
          secret: "DEBUG",
          listenIn: "left",
        },
      },
    }));
  }

  private mockTeam(team: any, teamName: string, index: number) {
    const template = team.players?.[0];
    return {
      ...team,
      teamName,
      teamUrl: "assets/misc/icon.webp",
      players: MOCK_NAMES[index].map((name, i) => ({
        ...template,
        name: index === 0 && i === 0 ? "nobii" : name,
        fullName: index === 0 && i === 0 ? REAL_PLAYER : `${name}#MOCK`,
        playerId: index * 5 + i,
      })),
    };
  }

  setListenIn(listenIn: IPlayercamsListenIn): void {
    this.dataModel.match.update((match) => ({
      ...match,
      tools: {
        ...match.tools,
        playercamsInfo: {
          ...match.tools.playercamsInfo,
          listenIn,
        },
      },
    }));
  }
}
