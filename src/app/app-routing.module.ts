import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { TestingComponent } from "./overlays/testing/testing.component";
import { AutoswitchComponent } from "./autoswitch/autoswitch.component";
import { MatchOverlayComponent } from "./overlays/match-overlay/match-overlay.component";
import { AgentSelectOverlayComponent } from "./overlays/agent-select-overlay/agent-select-overlay.component";
import { TestingAgentSelectComponent } from "./overlays/testing-agent-select/testing-agent-select.component";
import { RedirectComponent } from "./components/common/redirect/redirect.component";
import { TimeoutComponent } from "./components/common/timeout/timeout.component";

const routes: Routes = [
  {
    path: "",
    component: RedirectComponent,
  },
  {
    path: "overlay",
    children: [
      {
        path: "",
        component: MatchOverlayComponent,
      },
      {
        path: "minimal",
        component: MatchOverlayComponent,
        data: {
          minimal: true,
        },
      },
    ],
  },
  {
    path: "testing",
    children: [
      {
        path: "",
        component: TestingComponent,
      },
      {
        path: "minimal",
        component: TestingComponent,
        data: {
          minimal: true,
        },
      },
      {
        path: "agent-select",
        component: TestingAgentSelectComponent,
      },
      {
        path: "listen-in",
        loadComponent: () =>
          import("./overlays/testing-listen-in/testing-listen-in.component").then(
            (m) => m.TestingListenInComponent,
          ),
      },
      {
        path: "team-breakdown",
        loadComponent: () =>
          import("./overlays/testing-team-breakdown/testing-team-breakdown").then(
            (m) => m.TestingTeamBreakdown,
          ),
      },
      {
        path: "map-breakdown",
        loadComponent: () =>
          import("./overlays/testing-map-breakdown/testing-map-breakdown").then(
            (m) => m.TestingMapBreakdown,
          ),
      },
      {
        path: "mapban",
        loadComponent: () =>
          import("./overlays/testing-mapban/testing-mapban").then(
            (m) => m.TestingMapban,
          ),
      },
    ],
  },
  {
    path: "agent-select",
    component: AgentSelectOverlayComponent,
  },
  {
    path: "autoswitch",
    children: [
      {
        path: "",
        component: AutoswitchComponent,
      },
      {
        path: "minimal",
        component: AutoswitchComponent,
        data: {
          minimal: true,
        },
      },
    ],
  },
  {
    path: "timeout",
    component: TimeoutComponent,
  },
  {
    path: "mapban",
    loadComponent: () =>
      import("./overlays/mapban-overlay/mapban-overlay.component").then((m) => m.MapbanUiComponent),
  },
  {
    path: "mapban-fs",
    loadComponent: () =>
      import("./overlays/mapban-fs-overlay/mapban-fs-overlay.component").then((m) => m.MapbanFsOverlayComponent),
  },
  {
    path: "playercams",
    loadComponent: () =>
      import("./components/combat/playercams/playercams.component").then(
        (m) => m.PlayercamsComponent,
      ),
  },
  {
    path: "playercams-alt",
    loadComponent: () =>
      import("./components/combat/playercams-alt/playercams-alt.component").then(
        (m) => m.PlayercamsAltComponent,
      ),
  },
  {
    path: "team-breakdown",
    loadComponent: () =>
      import("./overlays/team-breakdown/team-breakdown.component").then((m) => m.TeamBreakdown),
  },
  {
    path: "map-breakdown",
    loadComponent: () =>
      import("./overlays/map-breakdown/map-breakdown.component").then((m) => m.MapBreakdown),
  },
  {
    path: "toast",
    loadComponent: () =>
      import("./overlays/toast-overlay/toast.component").then((m) => m.LiveToastComponent),
  },
  {
    path: "roundwinbox",
    loadComponent: () =>
      import("./components/combat/endround-banner/endround-banner.component").then(
        (m) => m.EndroundBannerComponent,
      ),
  },
  {
    path: "listen-in",
    loadComponent: () =>
      import("./overlays/listen-in-overlay/listen-in-overlay.component").then((m) => m.ListenInOverlayComponent),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
