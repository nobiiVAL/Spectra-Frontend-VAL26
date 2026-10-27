export class i18nHelper {
  // Keys are lowercase because the lang param is lowercased before lookup; values match the file names in public/langs
  static LanguageAliases: Record<string, string> = {
    jp: "ja",
    zh_cn: "zh_HANS",
    zh_hans: "zh_HANS",
    zh_tw: "zh_HANT",
    zh_hant: "zh_HANT",
  };

  public static resolveLanguageAlias(alias: string) {
    return this.LanguageAliases[alias.toLowerCase()] || alias;
  }
}

export enum TranslateKeys {
  Playercard_Kills = "playercard.kills",
  Playercard_Deaths = "playercard.deaths",
  Playercards_Assists = "playercard.assists",
  Endround_RoundWin = "endround.round_win",
  Endround_Winner = "endround.win",
  Endround_Attacker = "endround.attacker",
  Endround_Defender = "endround.defender",
  Endround_Round = "endround.round",
  Endround_RoundAce = "endround.roundAce",
  Endround_RoundTeamAce = "endround.roundTeamAce",
  Endround_RoundClutch = "endround.roundClutch",
  Endround_RoundFlawless = "endround.roundFlawless",
  Endround_RoundThrifty = "endround.roundThrifty",
  Mapinfo_Live = "mapinfo.live",
  Mapinfo_Decider = "mapinfo.decider",
  Mapinfo_Next = "mapinfo.next",
  Watermark_Text = "topinfo.watermark",
  Top_RoundNumber = "topscore.round",
  Top_Overtime = "topscore.overtime",
  Team_Is_Attacker = "team.attacker",
  Team_Is_Defender = "team.defender",
  Scoreboard_Spent = "scoreboard.spent",
  Scoreboard_Kills = "scoreboard.kills",
  Scoreboard_Deaths = "scoreboard.deaths",
  Scoreboard_Assists = "scoreboard.assists",
  Timeout_Techpause = "timeout.technical_pause",
  Timeout_Tactical = "timeout.tactical_timeout",
  Breakdown_MVP = "breakdown.mvp",
  Breakdown_ACS = "breakdown.acs",
  Breakdown_KDA = "breakdown.kda",
  Breakdown_FirstKills = "breakdown.first_kills",
  Breakdown_Thrifties = "breakdown.thrifties",
  Breakdown_Aces = "breakdown.aces",
  Breakdown_Clutches = "breakdown.clutches",
  Breakdown_Flawless = "breakdown.flawless",
  Breakdown_PostPlants = "breakdown.post_plants",
  Breakdown_HeadshotPercentage = "breakdown.headshot_percentage",
  Breakdown_AverageACS = "breakdown.average_acs",
  Breakdown_TotalKills = "breakdown.total_kills",
  Breakdown_AverageLoadoutValue = "breakdown.average_loadout_value",
  Breakdown_RetakeSuccessRate = "breakdown.retake_success_rate",
  Breakdown_TradeSuccessRate5s = "breakdown.trade_success_rate_5s",
  Breakdown_Win = "breakdown.win",
  Breakdown_Loss = "breakdown.loss",
  ListenIn_LiveComms = "listenin.livecomms",
}
