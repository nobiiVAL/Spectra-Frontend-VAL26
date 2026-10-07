import { computed, inject, Injectable, signal } from "@angular/core";
import { SocketService } from "./SocketService";
import { IMapbanSessionData, IMatchData, ISponsorInfo, ITournamentInfo } from "./Types";
import { ActivatedRoute } from "@angular/router";
import { Config } from "../shared/config";
import { isEqual } from "lodash";
import { i18nHelper } from "./i18nHelper";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class DataModelService {
  protected route = inject(ActivatedRoute);
  protected config = inject(Config);
  protected translate = inject(TranslateService);

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.groupCode.set(((params["groupCode"] as string) || "").toUpperCase());
      this.sessionId.set(params["sessionId"] || "");
      const paramLang = params["lang"]?.toLowerCase() || "en";
      console.log("Setting language to", paramLang);
      this.language.set(i18nHelper.resolveLanguageAlias(paramLang));
      this.translate.use(this.language());
      // drives the :lang() selectors in styles.css that pick the Noto Sans variant
      document.documentElement.lang = this.language().replace("_", "-");
      this.hideAuxiliary.set(params["hideAuxiliary"] === "true");
      this.hideAuxiliaryText.set(params["hideAuxiliaryText"] === "true");
    });

    if (this.route.firstChild && this.route.firstChild.firstChild) {
      this.route.firstChild!.firstChild!.data.subscribe((data) => {
        this.minimalMode.set(data["minimal"]);
      });
    }

    if (!this.config.serverEndpoint || this.config.serverEndpoint.length === 0) {
      console.error("No server endpoint configured, cannot connect to match data");
      return;
    }

    if (!this.groupCode() || this.groupCode().length === 0) {
      console.error("No group code provided, cannot connect to match data");
    } else {
      SocketService.getInstance().subscribeMatch(this.onMatchUpdate.bind(this));
      SocketService.getInstance().connectMatch(this.config.serverEndpoint, this.groupCode());
    }

    if (this.sessionId() && this.sessionId().length > 0) {
      if (!this.config.mapbanEndpoint || this.config.mapbanEndpoint.length === 0) {
        console.error("No mapban endpoint configured, cannot connect to mapban data");
      } else {
        SocketService.getInstance().subscribeMapban(this.onMapbanUpdate.bind(this));
        SocketService.getInstance().connectMapban(this.config.mapbanEndpoint, {
          sessionId: this.sessionId(),
        });
      }
    }
  }

  private onMatchUpdate(data: any) {
    // Construct map for name overrides if it's a string (from JSON).
    // The server keeps it as JSON to avoid having to (de)-serialize multiple times.
    const tempOverrides = data?.tools?.nameOverrides?.overrides || null;
    if (typeof tempOverrides === "string") {
      data.tools.nameOverrides.overrides = this.jsonToMap(tempOverrides);
    }
    this.match.set(data);
  }

  private jsonToMap(json: string): Map<string, string> {
    try {
      const obj = JSON.parse(json);
      if (Array.isArray(obj)) {
        return new Map(obj);
      } else {
        throw new Error("Invalid JSON format for Map");
      }
    } catch (error) {
      console.error("Failed to parse JSON to Map:", error);
      return new Map();
    }
  }

  public numberFormatter = computed<Intl.NumberFormat>(() => {
    try {
      return new Intl.NumberFormat([this.language(), "en"], { useGrouping: true });
    } catch (error) {
      console.warn(`Invalid locale "${this.language()}", falling back to "en"`, error);
      return new Intl.NumberFormat("en", { useGrouping: true });
    }
  });

  private onMapbanUpdate(data: any) {
    this.mapban.set(data);
  }

  public groupCode = signal("");
  public sessionId = signal("");
  public language = signal("en");
  public minimalMode = signal(false);
  public hideAuxiliary = signal(false);
  public hideAuxiliaryText = signal(false);

  private _tournamentInfoOverride = signal<ITournamentInfo | null>(null);
  private _sponsorInfoOverride = signal<ISponsorInfo | null>(null);

  public setTournamentInfo(info: ITournamentInfo) {
    this._tournamentInfoOverride.set(info);
  }

  public setSponsorInfo(info: ISponsorInfo) {
    this._sponsorInfoOverride.set(info);
  }

  public match = signal<IMatchData>(initialMatchData, { equal: () => false });
  public teams = computed(() => this.match().teams, { equal: () => false });
  public timeoutState = computed(() => this.match().timeoutState, {
    equal: () => false,
  });
  public timeoutCounter = computed(() => this.match().tools.timeoutCounter, {
    equal: isEqual,
  });
  public timeoutCancellationGracePeriod = computed(
    () => this.match().tools.timeoutCancellationGracePeriod,
  );

  public spikeState = computed(() => this.match().spikeState, {
    equal: isEqual,
  });
  public seriesInfo = computed(() => this.match().tools.seriesInfo);
  public seedingInfo = computed(() => this.match().tools.seedingInfo);
  public sponsorInfo = computed(
    () => this._sponsorInfoOverride() ?? this.match().tools.sponsorInfo,
  );
  public watermarkInfo = computed(() => this.match().tools.watermarkInfo);
  public tournamentInfo = computed(
    () => this._tournamentInfoOverride() ?? this.match().tools.tournamentInfo,
  );
  public toastInfo = computed(() => this.match().toastInfo, { equal: () => false });
  public playercamsInfo = computed(() => this.match().tools.playercamsInfo, {
    equal: () => false,
  });
  public readonly roundWinBox = computed(() => this.match().tools.roundWinBox);

  public mapban = signal<IMapbanSessionData>(initialMapbanData, { equal: () => false });
}

//setting up with empty match state so certain ui parts dont complain
export const initialMatchData: IMatchData = {
  groupCode: "A",
  isRanked: false,
  isRunning: true,
  roundNumber: 0,
  roundPhase: "LOBBY",
  agentSelectStartTime: 0,
  teams: [
    {
      teamName: "",
      teamUrl: "",
      teamTricode: "",
      spentThisRound: 0,
      isAttacking: false,
      roundsWon: 0,
      players: [],
    },
    {
      teamName: "",
      teamUrl: "",
      teamTricode: "",
      spentThisRound: 0,
      isAttacking: false,
      roundsWon: 0,
      players: [],
    },
  ],
  spikeState: { planted: false, defused: false, detonated: false },
  map: "Ascent",
  tools: {
    seriesInfo: {
      needed: 1,
      wonLeft: 0,
      wonRight: 0,
      mapInfo: [],
    },
    seedingInfo: {
      left: "",
      right: "",
    },
    tournamentInfo: {
      name: "",
      logoUrl: "",
      backdropUrl: "",
    },
    timeoutDuration: 60,
    timeoutCancellationGracePeriod: 10,
    timeoutCounter: {
      max: 2,
      left: 2,
      right: 2,
    },
    sponsorInfo: {
      enabled: false,
      duration: 5000,
      sponsors: [],
    },
    // Disabling the watermark/setting a custom text without Spectra Plus is against the License terms and strictly forbidden
    watermarkInfo: {
      spectraWatermark: true,
      customTextEnabled: false,
      customText: "",
    },
    playercamsInfo: { 
      enable: false,
      removeTricodes: false,
      identifier: "",
      secret: "",
      endTime: 0,
      enabledPlayers: [],
      listenIn: false, 
    },
    nameOverrides: { overrides: [] },
    roundWinBox: {
      type: "disabled",
      sponsors: [],
    },
    agentSelectActive: false,
  },
  toastInfo: {
    active: false,
    duration: 10000,
    title: "",
    message: "",
    eventLogoEnabled: true,
    selectedTeam: "none",
  },
  timeoutState: {
    techPause: false,
    leftTeam: false,
    rightTeam: false,
    timeRemaining: 0,
  },
  showAliveKDA: false,
  switchRound: 12,
  firstOtRound: 25,
  attackersWon: false,
};

const initialMapbanData: IMapbanSessionData = {
  sessionIdentifier: "",
  organizationName: "",
  isSupporter: false,
  teams: [],
  format: undefined,
  availableMaps: [],
  selectedMaps: [],
  stage: "ban",
  actingTeamCode: "",
  actingTeam: 0,
};
