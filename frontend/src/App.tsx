import { useEffect, useMemo, useState } from "react";
import {
  Home, CalendarDays, ChartNoAxesColumn, Users, MoreHorizontal, Menu, X,
  ChevronRight, Megaphone, Trophy, Medal, Goal, ShieldCheck, Search,
  LockKeyhole, LogOut, RefreshCw, Plus, Pencil, Check, ArrowUpRight,
  CircleDot, Gamepad2, Star, ShieldAlert, RotateCcw, Trash2
} from "lucide-react";
import { api, adminLogin, getToken, TOKEN_KEY } from "./api";

type Page = "Home" | "Fixtures" | "Standings" | "Players" | "More" | "Playoffs" | "Awards" | "Tournament Info" | "Golden Boot Rankings" | "Golden Glove Rankings";
const nav = [
  { page: "Home" as Page, label: "Home", icon: Home },
  { page: "Fixtures" as Page, label: "Fixtures", icon: CalendarDays },
  { page: "Standings" as Page, label: "Standings", icon: ChartNoAxesColumn },
  { page: "Players" as Page, label: "Players", icon: Users },
  { page: "Awards" as Page, label: "Awards", icon: Medal },
  { page: "Tournament Info" as Page, label: "Rules", icon: Gamepad2 }
];
const desktopNav = [
  { page: "Home" as Page, label: "Home", icon: Home },
  { page: "Fixtures" as Page, label: "Fixtures", icon: CalendarDays },
  { page: "Standings" as Page, label: "Standings", icon: ChartNoAxesColumn },
  { page: "Players" as Page, label: "Players", icon: Users },
  { page: "Playoffs" as Page, label: "Playoffs", icon: Trophy },
  { page: "Awards" as Page, label: "Awards", icon: Medal },
  { page: "Tournament Info" as Page, label: "Rules", icon: Gamepad2 }
];


function unwrap<T>(value: any, key: string): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.[key])) return value[key];
  return [];
}

export default function App() {
  const [page, setPage] = useState<Page>("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [groupDetails, setGroupDetails] = useState<any[]>([]);
  const [playoffFixtures, setPlayoffFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [superStandings, setSuperStandings] = useState<any[]>([]);
  const [awards, setAwards] = useState<any>({goldenBoot:[],goldenGlove:[]});
  const [announcements, setAnnouncements] = useState<any[]>([
    { title: "Something big is coming.", message: "Stay tuned for updates from Regenta FC." }
  ]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<"qualifying" | "super_league">("qualifying");
  const [adminRoute, setAdminRoute] = useState(window.location.pathname === "/admin");
  const [adminAuthed, setAdminAuthed] = useState(!!getToken());
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminTab, setAdminTab] = useState("Overview");
  const [newPlayer, setNewPlayer] = useState("");
  const [newScore, setNewScore] = useState<Record<string, string>>({});
  const [adminMessage, setAdminMessage] = useState("");

  useEffect(() => {
    const onPop = () => setAdminRoute(window.location.pathname === "/admin");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function loadPublicData() {
    const [p, f, s, a, sl, gd, playoffFixturesResult, awardsResult] = await Promise.allSettled([
      api("/api/players"), api("/api/fixtures"),
      api("/api/standings?stage=qualifying"), api("/api/announcements"), api("/api/standings?stage=super_league"), api("/api/tournament/groups/details"), api("/api/playoffs"), api("/api/statistics/awards")
    ]);
    if (p.status === "fulfilled") {
      const rows = unwrap<any>(p.value, "players").map((x:any)=>({...x, name:x.displayName || x.name || x.playerName}));
      if (rows.length) setPlayers(rows);
    }
    if (f.status === "fulfilled") setFixtures(unwrap<any>(f.value, "fixtures"));
    if (s.status === "fulfilled") setStandings(Array.isArray(s.value) ? s.value : unwrap<any>(s.value, "standings"));
    if (sl.status === "fulfilled") setSuperStandings(Array.isArray(sl.value) ? sl.value : unwrap<any>(sl.value, "standings"));
    if (gd.status === "fulfilled") {
      const groups = unwrap<any>(gd.value, "groups");
      setGroupDetails(groups);
      const playerGroup = new Map<number,string>();
      groups.forEach((g:any)=> (g.players||[]).forEach((p:any)=>playerGroup.set(Number(p.id), `Group ${g.code}`)));
      setPlayers(old=>old.map((p:any)=>({...p, groupName:playerGroup.get(Number(p.id)) || p.groupName || "Group not assigned"})));
    }
    if (playoffFixturesResult.status === "fulfilled") setPlayoffFixtures(unwrap<any>(playoffFixturesResult.value,"fixtures"));
    if (awardsResult.status === "fulfilled") setAwards(awardsResult.value || {goldenBoot:[],goldenGlove:[]});
    if (a.status === "fulfilled") {
      const rows = unwrap<any>(a.value, "announcements");
      if (rows.length) setAnnouncements(rows);
    }
  }

  useEffect(() => { if (!adminRoute) loadPublicData(); }, [adminRoute, stage]);

  function go(next: Page) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const result = await adminLogin(email, password);
      const token = result?.token || result?.accessToken;
      if (!token) throw new Error("The backend did not return an authentication token.");
      sessionStorage.setItem(TOKEN_KEY, token);
      setAdminAuthed(true);
      setPassword("");
      await loadPublicData();
    } catch (error: any) {
      setLoginError(error?.message || "Login failed. Check the backend connection and password.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setAdminAuthed(false);
    setAdminMessage("");
  }

  async function addPlayer(event: React.FormEvent) {
    event.preventDefault();
    if (!newPlayer.trim()) return;
    try {
      await api("/api/players", { method: "POST", body: JSON.stringify({ displayName: newPlayer.trim() }) });
      setNewPlayer("");
      setAdminMessage("Player added.");
      await loadPublicData();
    } catch (error: any) {
      setAdminMessage(`Could not add player: ${error.message}`);
    }
  }

  async function saveScore(fixture: any, index: number) {
    const id = fixture.id;
    const raw = newScore[String(id)] || "";
    const parts = raw.split(/[-:]/).map(Number);
    if (parts.length !== 2 || parts.some(n => !Number.isFinite(n) || n < 0)) {
      setAdminMessage("Enter a score like 2-1.");
      return;
    }
    try {
      await api(`/api/fixtures/${id}/score`, {
        method: "PATCH",
        body: JSON.stringify({ goalsA: parts[0], goalsB: parts[1] })
      });
      setAdminMessage("Score saved.");
      await loadPublicData();
    } catch (error: any) {
      setAdminMessage(`Could not save score: ${error.message}`);
    }
  }

  const filteredPlayers = useMemo(() => players.filter(player =>
    String(player.name || player.playerName || "").toLowerCase().includes(search.toLowerCase())
  ), [players, search]);

  if (adminRoute) {
    if (!adminAuthed) return <AdminLogin email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} error={loginError} onSubmit={handleLogin} />;
    return <AdminDashboard
      players={players} fixtures={fixtures} playoffFixtures={playoffFixtures} standings={standings} groupDetails={groupDetails}
      tab={adminTab} setTab={setAdminTab} logout={logout}
      newPlayer={newPlayer} setNewPlayer={setNewPlayer} addPlayer={addPlayer}
      newScore={newScore} setNewScore={setNewScore} saveScore={saveScore}
      message={adminMessage} refresh={loadPublicData}
    />;
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" onClick={e => { e.preventDefault(); go("Home"); }}>
          <img className="brand-logo" src="/regenta-anniversary-logo.png" alt="Regenta FC 1st Anniversary logo"/>
          <span><b>REGENTA <i>FC</i></b><small>1ST ANNIVERSARY</small></span>
        </a>
        <nav className="desktop-nav">
          {desktopNav.map(item => <button key={item.label} className={page === item.page ? "active" : ""} onClick={() => go(item.page)}>
            <item.icon size={15}/><span>{item.label}</span>
          </button>)}
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">
          {menuOpen ? <X /> : <Menu />} <span>MENU</span>
        </button>
      </header>

      {menuOpen && <div className="menu-panel">
        {[
          { page: "Playoffs" as Page, label: "Playoffs", icon: Trophy },
          { page: "Tournament Info" as Page, label: "Rules", icon: Gamepad2 }
        ].map(item => <button key={item.label} onClick={() => go(item.page)}><item.icon size={17}/>{item.label}<ChevronRight size={15}/></button>)}
      </div>}

      {page === "Home" ? <HomePage
        playersCount={players.length} players={players} announcements={announcements} fixtures={fixtures} playoffFixtures={playoffFixtures} superStandings={superStandings}
        onNavigate={go}
      /> : <main className={`inner-main ${(page === "Golden Boot Rankings" || page === "Golden Glove Rankings") ? "award-rankings-main" : ""}`}>
        {(page !== "Golden Boot Rankings" && page !== "Golden Glove Rankings") && <div className={`inner-top ${({
          Fixtures: "page-banner fixtures-banner",
          Standings: "page-banner standings-banner",
          Players: "page-banner players-banner",
          Awards: "page-banner awards-banner",
          "Tournament Info": "page-banner rules-banner",
        } as Record<string, string>)[page] || ""}`} >
          <button className="back-home" onClick={() => go("Home")}>← HOME</button>
          <div className="eyebrow">REGENTA FC <span>✦</span> 1ST ANNIVERSARY</div>
          <h1>{page === "More" ? "Explore" : page}</h1>
        </div>}

        {page === "Players" && <>
          <div className="search-field"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players"/></div>
          <div className="player-list">{filteredPlayers.map((player, index) =>
            <button className="player-card" key={player.id || index} onClick={() => setSelectedPlayer(player)}>
              <div className="player-avatar">{String(player.name || player.playerName || "P").slice(0,1).toUpperCase()}</div>
              <div><b>{player.name || player.playerName || "Player"}</b><small>{player.groupName || player.group || "Group not assigned"}</small></div>
              <span className="player-seed">#{player.seed || index + 1}</span>
            </button>)}
          </div>
        </>}

        {page === "Standings" && <>
          {!selectedGroup ? <>
            <div className="standings-section-title super-title"><span>SUPER LEAGUE</span><small>32 QUALIFIERS · TOP 8 TO PLAYOFFS</small></div>
            <button className="super-card spotlight-super" onClick={()=>setSelectedGroup("SUPER")}><div><b>SUPER LEAGUE</b><small>{superStandings.length ? `${superStandings.length} PLAYERS QUALIFIED` : "AWAITING GROUP STAGE COMPLETION"}</small></div><div className="super-preview">{superStandings.slice(0,5).map((r:any,i:number)=><span key={r.playerId}>{i+1}. {r.playerName || players.find(p=>Number(p.id)===Number(r.playerId))?.name || `Player ${r.playerId}`}</span>)}{!superStandings.length && <span>32 qualifiers will appear here</span>}</div><em>VIEW SUPER LEAGUE TABLE →</em></button>
            <div className="standings-section-title"><span>GROUP STAGE TABLES</span><small>GROUP A–H · TOP 4 QUALIFY</small></div>
            <div className="group-card-grid">{Array.from({length:8},(_,i)=>String.fromCharCode(65+i)).map(code=>{
              const groupRow=standings.find((g:any)=>String(g.group).replace(/^Group\s*/i,"").toUpperCase()===code);
              const rows=groupRow?.standings || [];
              return <button className="group-tile" key={code} onClick={()=>setSelectedGroup(code)}><b>GROUP {code}</b><small>TOP 4 QUALIFIERS</small><div className="group-preview">{rows.slice(0,4).map((r:any,i:number)=><span key={r.playerId}>{r.playerName || players.find(p=>p.id===r.playerId)?.name || `Player ${r.playerId}`}</span>)}{rows.length===0 && <span>Standings pending</span>}</div><em>VIEW TABLE →</em></button>;
            })}</div>

          </> : <>
            <button className="back-home" onClick={()=>setSelectedGroup(null)}>← ALL STANDINGS</button>
            <div className="standings-section-title"><span>{selectedGroup==="SUPER"?"SUPER LEAGUE":`GROUP ${selectedGroup}`}</span><small>{selectedGroup==="SUPER"?"TOP 8 QUALIFY FOR PLAYOFFS":"TOP 4 QUALIFY FOR SUPER LEAGUE"}</small></div>
            <div className="standings-table"><div className="table-head standings-full-head"><span>PLAYER</span><span>MP</span><span>W</span><span>D</span><span>L</span><span className="points-heading">PTS</span><span>GF</span><span>GA</span><span>GD</span></div>
              {(()=>{const source=selectedGroup==="SUPER"?superStandings:(standings.find((g:any)=>String(g.group).replace(/^Group\s*/i,"").toUpperCase()===selectedGroup)?.standings||[]);return source.map((row:any,index:number)=><div className={`table-row standings-full-row ${index<(selectedGroup==="SUPER"?8:4)?"qualifier-row":""}`} key={row.playerId||index}><b><i>{index+1}</i>{row.playerName||players.find(p=>Number(p.id)===Number(row.playerId))?.name||`Player ${row.playerId}`}</b><span>{row.played??0}</span><span>{row.wins??0}</span><span>{row.draws??0}</span><span>{row.losses??0}</span><strong className="points-cell">{row.points??0}</strong><span>{row.goalsFor??0}</span><span>{row.goalsAgainst??0}</span><span>{row.goalDifference??0}</span></div>)})()}
            </div><p className="hint">Win 3 points · Draw 1 point · Loss 0 points</p>
          </>}
        </>}

        {page === "Fixtures" && <PublicFixtures fixtures={fixtures} playoffFixtures={playoffFixtures} players={players} groupDetails={groupDetails} />}

        {page === "Playoffs" && <div className="feature-panel"><Trophy/><h2>THE ROAD TO THE FINAL</h2><p>Top 8 players from the Super League advance to the knockout stage.</p><div className="round-list"><div><b>01</b> Quarter-finals <small>8 players</small></div><div><b>02</b> Semi-finals <small>4 players</small></div><div><b>03</b> Grand Final <small>2 players</small></div></div></div>}

        {page === "Awards" && <AwardsPage players={players} superStandings={superStandings} fixtures={fixtures} playoffFixtures={playoffFixtures} awards={awards} onBoot={()=>go("Golden Boot Rankings")} onGlove={()=>go("Golden Glove Rankings")} />}
        {(page === "Golden Boot Rankings" || page === "Golden Glove Rankings") && <AwardRankingsPage kind={page==="Golden Boot Rankings"?"boot":"glove"} players={players} fixtures={fixtures} playoffFixtures={playoffFixtures} onBack={()=>go("Awards")} onHome={()=>go("Home")} />}

        {page === "Tournament Info" && <RulebookPage />}

        {page === "More" && <div className="more-grid">
          {[["Playoffs",Trophy],["Awards",Medal],["Tournament Info",Gamepad2]].map(([label, Icon]: any) =>
            <button onClick={() => go(label)}><Icon/><b>{label}</b><ChevronRight/></button>)}
        </div>}
      </main>}

      {selectedPlayer && <PlayerDetail player={selectedPlayer} fixtures={fixtures} playoffFixtures={playoffFixtures} players={players} groupDetails={groupDetails} onClose={() => setSelectedPlayer(null)} />}
      <nav className="bottom-nav">
        {nav.map(item => <button key={item.label} className={page === item.page ? "active" : ""} onClick={() => go(item.page)}>
          <item.icon/><span>{item.label}</span>
        </button>)}
      </nav>
    </div>
  );
}

function PublicFixtures({fixtures,playoffFixtures,players,groupDetails}:any) {
  const [view,setView]=useState("all");
  const name=(id:any,f:any,side:string)=>{
    const player=players.find((p:any)=>Number(p.id)===Number(id));
    const stored=side==="a"?(f.player1Name||f.homePlayerName):(f.player2Name||f.awayPlayerName);
    return stored||player?.name||player?.displayName||(id?`Player ${id}`:"Awaiting winner");
  };
  const qualifying=fixtures.filter((f:any)=>String(f.stage).toLowerCase()==="qualifying");
  const superLeague=fixtures.filter((f:any)=>String(f.stage).toLowerCase()==="super_league");
  const playoffs=playoffFixtures||[];
  const activeStage=playoffs.length?"playoffs":superLeague.length?"super_league":"qualifying";
  const stageOrder=activeStage==="playoffs"?["playoffs","super_league","qualifying"]:activeStage==="super_league"?["super_league","qualifying","playoffs"]:["qualifying","super_league","playoffs"];
  const visible=(rows:any[])=>rows.filter(f=>view==="all"||(view==="completed"?String(f.status).toLowerCase()==="completed":String(f.status).toLowerCase()!=="completed"));
  const renderCard=(f:any,i:number,roundLabel?:string)=>{
    const done=String(f.status).toLowerCase()==="completed";
    const aWon=done&&Number(f.goalsA)>Number(f.goalsB), bWon=done&&Number(f.goalsB)>Number(f.goalsA);
    return <div className="fixture-card" key={f.id||`${roundLabel}-${i}`}>
      <div className="fixture-meta">{done?"COMPLETED":"UPCOMING"}<span>•</span>{roundLabel||(f.matchDay?`MATCHDAY ${f.matchDay}`:"GROUP MATCH")}</div>
      <div className="fixture-versus"><b className={aWon?"fixture-winner":""}>{name(f.playerAId,f,"a")}{aWon&&<small className="winner-tag">WINNER</small>}</b><strong>{f.goalsA??"–"} <i>:</i> {f.goalsB??"–"}</strong><b className={bWon?"fixture-winner":""}>{name(f.playerBId,f,"b")}{bWon&&<small className="winner-tag">WINNER</small>}</b></div>
    </div>;
  };
  const groupLabel=(id:any)=>groupDetails.find((g:any)=>Number(g.groupId)===Number(id))?.code||"?";
  const groupIds=[...new Set(qualifying.map((f:any)=>f.groupId).filter((x:any)=>x!=null))];
  const roundKey=(f:any)=>{
    const raw=String(f.round||f.stage||"").toLowerCase().replace(/[^a-z]/g,"");
    if(raw.includes("quarter")||raw==="qf")return "quarterfinal";
    if(raw.includes("semi")||raw==="sf")return "semifinal";
    if(raw==="final"||raw.includes("grandfinal"))return "final";
    return raw;
  };
  const roundNames:Record<string,string>={quarterfinal:"QUARTER-FINALS",semifinal:"SEMI-FINALS",final:"GRAND FINAL"};
  const groupSection=()=> <section className="fixture-stage-section"><div className="fixture-stage-heading"><h2>GROUP STAGE</h2><span>{qualifying.length} MATCHES</span></div>
    {groupIds.length?groupIds.map((gid:any)=>{const rows=visible(qualifying.filter((f:any)=>Number(f.groupId)===Number(gid)));return <details className="fixture-group" key={gid} open><summary><b>GROUP {groupLabel(gid)}</b><span>{rows.length} MATCHES</span></summary><div className="fixture-list">{rows.length?rows.map((f:any,i:number)=>renderCard(f,i)):<p className="fixture-empty-inline">No matches in this filter.</p>}</div></details>}):<p className="fixture-empty-inline">Group fixtures will appear here once generated.</p>}
  </section>;
  const superSection=()=> <section className="fixture-stage-section super-fixture-spotlight"><div className="fixture-stage-heading"><h2>SUPER LEAGUE</h2><span>{superLeague.length} MATCHES</span></div><div className="fixture-list">{visible(superLeague).length?visible(superLeague).map((f:any,i:number)=>renderCard(f,i)):<p className="fixture-empty-inline">No matches in this filter.</p>}</div></section>;
  const playoffSection=()=> <section className="fixture-stage-section playoff-fixture-section"><div className="fixture-stage-heading"><h2>PLAYOFFS</h2><span>{playoffs.length} FIXTURES</span></div>
    {playoffs.length?["quarterfinal","semifinal","final"].map(round=>{const all=playoffs.filter((f:any)=>roundKey(f)===round);if(!all.length)return null;const rows=visible(all).sort((a:any,b:any)=>Number(a.slot??a.position??a.id)-Number(b.slot??b.position??b.id));return <div className="playoff-round-block" key={round}><div className="playoff-round-heading"><h3>{roundNames[round]}</h3><span>{all.length} MATCHES</span></div><div className="fixture-list">{rows.length?rows.map((f:any,i:number)=>renderCard(f,i,roundNames[round])):<p className="fixture-empty-inline">No matches in this filter.</p>}</div></div>;}):<p className="fixture-empty-inline">Playoff fixtures will appear here once generated by Admin.</p>}
  </section>;
  const sections:Record<string,()=>any>={qualifying:groupSection,super_league:superSection,playoffs:playoffSection};
  return <div className="public-fixtures"><div className="fixture-view-tabs"><button className={view==="all"?"active":""} onClick={()=>setView("all")}>ALL MATCHES</button><button className={view==="live"?"active":""} onClick={()=>setView("live")}>UPCOMING / LIVE</button><button className={view==="completed"?"active":""} onClick={()=>setView("completed")}>COMPLETED</button></div>{stageOrder.map(key=><div className="fixture-stage-render" key={key}>{sections[key]()}</div>)}</div>;
}

function PlayerDetail({player,onClose,fixtures,playoffFixtures,players,groupDetails}:{player:any;onClose:()=>void;fixtures:any[];playoffFixtures:any[];players:any[];groupDetails:any[]}) {
 const pid=Number(player.id);
 const all=[...fixtures,...playoffFixtures].filter((f:any)=>Number(f.playerAId)===pid||Number(f.playerBId)===pid)
   .sort((a:any,b:any)=>(Number(a.matchDay||999)-Number(b.matchDay||999))||Number(a.id)-Number(b.id));
 const completed=all.filter((f:any)=>f.status==="completed"&&f.goalsA!=null&&f.goalsB!=null);
 let wins=0,draws=0,losses=0,scored=0,conceded=0,clean=0;
 for(const f of completed){const isA=Number(f.playerAId)===pid;const gf=Number(isA?f.goalsA:f.goalsB),ga=Number(isA?f.goalsB:f.goalsA);scored+=gf;conceded+=ga;if(gf>ga)wins++;else if(gf<ga)losses++;else draws++;if(ga===0)clean++;}
 const opponent=(f:any)=>{const oid=Number(f.playerAId)===pid?f.playerBId:f.playerAId;const p=players.find((x:any)=>Number(x.id)===Number(oid));return p?.name||p?.displayName||`Player ${oid}`;};
 const label=(f:any)=>f.round?String(f.round).replaceAll("_"," "):`${f.stage==="qualifying"?`Group ${String(groupName(f.groupId)??"?")}`:"Super League"} · Matchday ${f.matchDay||"—"}`;
 function groupName(groupId:any){return groupDetails.find((g:any)=>Number(g.groupId)===Number(groupId))?.code;}
 return <div className="player-detail-overlay" onClick={onClose}><section className="player-detail player-detail-expanded" onClick={e=>e.stopPropagation()}><button className="detail-close" onClick={onClose}>✕</button>
  <div className="player-profile-head"><div className="player-avatar large">{String(player.name||"P").slice(0,1).toUpperCase()}</div><div><h2>{player.name||player.displayName||"Player"}</h2><p>{player.groupName||"Group assignment pending"} · Player #{player.id}</p></div></div>
  <div className="player-stat-grid">{[["MP",completed.length],["W",wins],["D",draws],["L",losses],["GOALS SCORED",scored],["GOALS CONCEDED",conceded],["GOAL DIFF",scored-conceded],["CLEAN SHEETS",clean]].map(([k,v])=><div className="player-stat-box" key={String(k)}><b>{v}</b><small>{k}</small></div>)}</div>
  <div className="player-history-heading"><h3>MATCH HISTORY</h3><span>{all.length} matches</span></div>
  {all.length?all.map((f:any)=><div className="player-history-row" key={`${f.stage}-${f.id}`}><div><b>vs {opponent(f)}</b><small>{label(f)} · {f.status==="completed"?"Completed":"Upcoming"}</small></div><strong>{Number(f.playerAId)===pid?(f.goalsA??"–"):(f.goalsB??"–")} : {Number(f.playerAId)===pid?(f.goalsB??"–"):(f.goalsA??"–")}</strong><span className={`history-result ${f.status==="completed"?(Number(f.playerAId)===pid?(f.goalsA>f.goalsB?"win":f.goalsA<f.goalsB?"loss":"draw"):(f.goalsB>f.goalsA?"win":f.goalsB<f.goalsA?"loss":"draw")):"upcoming"}`}>{f.status==="completed"?(Number(f.playerAId)===pid?(f.goalsA>f.goalsB?"WIN":f.goalsA<f.goalsB?"LOSS":"DRAW"):(f.goalsB>f.goalsA?"WIN":f.goalsB<f.goalsA?"LOSS":"DRAW")):"UPCOMING"}</span></div>):<p className="detail-note">No fixtures assigned to this player yet.</p>}
  <p className="player-award-note">Player profile statistics include all stages. Golden Boot and Golden Glove count Super League and Playoffs only.</p>
 </section></div>;
}

function AwardsPage({players,superStandings,fixtures,playoffFixtures,awards,onBoot,onGlove}:any) {
 const playerName=(id:any)=>{const p=players.find((x:any)=>Number(x.id)===Number(id));return p?.name||p?.displayName||p?.playerName||"To be decided";};
 const leagueFixtures=(fixtures||[]).filter((f:any)=>String(f.stage).toLowerCase()==="super_league");
 const leagueDone=leagueFixtures.length>0&&leagueFixtures.every((f:any)=>String(f.status).toLowerCase()==="completed");
 const finalMatch=(playoffFixtures||[]).find((f:any)=>{const r=String(f.round||f.stage||"").toLowerCase().replace(/[^a-z]/g,"");return r.includes("final")&&!r.includes("semi")&&!r.includes("quarter");});
 const finalDone=!!finalMatch&&String(finalMatch.status).toLowerCase()==="completed"&&finalMatch.goalsA!=null&&finalMatch.goalsB!=null;
 const playoffWinner=finalDone?(Number(finalMatch.goalsA)>Number(finalMatch.goalsB)?finalMatch.playerAId:finalMatch.playerBId):null;
 const playoffRunner=finalDone?(Number(finalMatch.goalsA)>Number(finalMatch.goalsB)?finalMatch.playerBId:finalMatch.playerAId):null;
 return <div className="award-list">
  <button className="award-card-link" onClick={onBoot}><Goal/><span><b>Golden Boot</b><small>{awards.goldenBoot?.[0]?playerName(awards.goldenBoot[0].playerId):"Top goalscorer · Super League & Playoffs"}</small></span><strong>{awards.goldenBoot?.[0]?.goals??"—"} GOALS</strong><ChevronRight/></button>
  <button className="award-card-link" onClick={onGlove}><ShieldCheck/><span><b>Golden Glove</b><small>{awards.goldenGlove?.[0]?playerName(awards.goldenGlove[0].playerId):"Fewest goals conceded · clean sheets break ties"}</small></span><strong>{awards.goldenGlove?.[0]?`${awards.goldenGlove[0].goalsConceded} GA · ${awards.goldenGlove[0].cleanSheets} CS`:"—"}</strong><ChevronRight/></button>
  <div className="award-card-link"><Trophy/><span><b>Super League Winner</b><small>{leagueDone?`${playerName(superStandings?.[0]?.playerId)} · League award`:"Will be awarded after the Super League"}</small></span><strong>{leagueDone?"🏆":"—"}</strong></div>
  <div className="award-card-link"><Medal/><span><b>Super League Runner-up</b><small>{leagueDone?`${playerName(superStandings?.[1]?.playerId)} · League award`:"Will be awarded after the Super League"}</small></span><strong>{leagueDone?"🥈":"—"}</strong></div>
  <div className="award-card-link"><Trophy/><span><b>Playoff Winner</b><small>{finalDone?`${playerName(playoffWinner)} · Final winner`:"Will be awarded after the final"}</small></span><strong>{finalDone?"🏆":"—"}</strong></div>
  <div className="award-card-link"><Medal/><span><b>Playoff Runner-up</b><small>{finalDone?`${playerName(playoffRunner)} · Finalist`:"Will be awarded after the final"}</small></span><strong>{finalDone?"🥈":"—"}</strong></div>
  <p className="player-award-note">Golden Boot and Golden Glove count Super League and Playoff matches only. League and playoff honours are awarded separately.</p>
 </div>;
}

function AwardRankingsPage({kind,players,fixtures,playoffFixtures,onBack,onHome}:any) {
  const isBoot=kind==="boot";
  const eligibleFixtures=[...(fixtures||[]).filter((f:any)=>f.stage==="super_league"),...(playoffFixtures||[])];
  const eligibleIds=[...new Set(eligibleFixtures.flatMap((f:any)=>[f.playerAId,f.playerBId]).filter((id:any)=>id!=null).map(Number))];
  const stats=new Map<number,{goals:number;goalsConceded:number;cleanSheets:number;played:number}>();
  eligibleIds.forEach(id=>stats.set(id,{goals:0,goalsConceded:0,cleanSheets:0,played:0}));
  eligibleFixtures.forEach((f:any)=>{
    if(String(f.status).toLowerCase()!=="completed"||f.goalsA==null||f.goalsB==null||f.playerAId==null||f.playerBId==null)return;
    const a=Number(f.playerAId),b=Number(f.playerBId),sa=stats.get(a),sb=stats.get(b);
    if(!sa||!sb)return;
    sa.played++;sb.played++;
    sa.goals+=Number(f.goalsA);sb.goals+=Number(f.goalsB);
    sa.goalsConceded+=Number(f.goalsB);sb.goalsConceded+=Number(f.goalsA);
    if(Number(f.goalsB)===0)sa.cleanSheets++;
    if(Number(f.goalsA)===0)sb.cleanSheets++;
  });
  const rows=eligibleIds.map(id=>({playerId:id,...(stats.get(id)!),player:players.find((p:any)=>Number(p.id)===id)}))
    .sort((a,b)=>isBoot?(b.goals-a.goals||a.goalsConceded-b.goalsConceded||a.playerId-b.playerId):(a.goalsConceded-b.goalsConceded||b.cleanSheets-a.cleanSheets||a.playerId-b.playerId));
  const playerName=(r:any)=>r.player?.name||r.player?.displayName||r.player?.playerName||`Player ${r.playerId}`;
  return <section className="award-rankings-page">
    <div className="award-page-navigation">
      <button className="back-link" onClick={onBack}>← BACK TO AWARDS</button>
    </div>

    <div
      className={`award-feature-hero ${isBoot ? "boot-hero" : "glove-hero"}`}
      style={{
        position: "relative",
        width: "calc(100% + 32px)",
        height: "min(100svh, 850px)",
        minHeight: "620px",
        overflow: "hidden",
        borderRadius: "0 0 18px 18px",
        margin: "0 -16px 25px",
        background: "#100719",
        isolation: "isolate"
      }}
    >
      <img
        src={isBoot ? "/boot.jpg" : "/glove.jpg"}
        alt={isBoot ? "Golden Boot feature" : "Golden Glove feature"}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 22%",
          zIndex: -2
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background: "linear-gradient(180deg, rgba(8,3,16,0.02) 8%, rgba(8,3,16,0.08) 38%, rgba(8,3,16,0.72) 68%, rgba(8,3,16,0.97) 100%)"
        }}
      />
      <div
        className="award-feature-overlay"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: "clamp(20px, 5vw, 36px)",
          zIndex: 1,
          background: "transparent",
          textAlign: "left"
        }}
      >
        <span
          className="award-feature-tag"
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "fit-content",
            padding: "10px 16px",
            border: "1px solid rgba(235,185,255,.85)",
            borderRadius: "999px",
            color: "#fff",
            background: "rgba(103,35,143,.48)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "2px",
            marginBottom: "22px"
          }}
        >
          ✦ REGENTA FC PRESENTS
        </span>
        <h2
          style={{
            color: "#fff",
            fontSize: "clamp(42px, 9vw, 76px)",
            fontWeight: 950,
            lineHeight: 0.92,
            letterSpacing: "-2px",
            margin: 0,
            textShadow: "0 3px 24px rgba(0,0,0,.35)"
          }}
        >
          {isBoot ? <>GOLDEN<br />BOOT</> : <>GOLDEN<br />GLOVE</>}
        </h2>
        <h3
          style={{
            color: "#f4c66d",
            fontSize: "clamp(18px, 4vw, 28px)",
            fontWeight: 900,
            letterSpacing: "2px",
            margin: "16px 0 8px"
          }}
        >
          {isBoot ? "CHASE THE GOLD" : "DEFEND THE GLORY"}
        </h3>
        <p style={{ color: "#fff", fontSize: "14px", lineHeight: 1.6, margin: 0, maxWidth: "420px" }}>
          {isBoot ? "The race for the tournament's top scorer." : "The battle for the best defensive record."}
        </p>
        <div style={{ color: "#f4c9ff", fontSize: "10px", fontWeight: 900, letterSpacing: "2px", marginTop: "24px" }}>
          ✦ MORE THAN A GAME. IT'S A LEGACY.
        </div>
      </div>
    </div>

    <div className="award-rank-summary">{rows.length} ELIGIBLE PLAYERS · SUPER LEAGUE + PLAYOFFS ONLY</div>
    {rows.length===0?<div className="empty-state">Rankings will appear once Super League fixtures have been generated.</div>:
      <div className="award-rank-table-wrap"><table className="award-rank-table"><thead><tr><th>RANK</th><th>PLAYER</th><th>MP</th>{isBoot?<th>GOALS</th>:<><th>GA</th><th>CS</th></>}</tr></thead><tbody>
      {rows.map((r:any,i:number)=><tr key={r.playerId} className={i===0?"award-rank-first":""}><td><b>{String(i+1).padStart(2,"0")}</b></td><td><strong>{playerName(r)}</strong></td><td>{r.played}</td>{isBoot?<td className="award-rank-value">{r.goals}</td>:<><td className="award-rank-value">{r.goalsConceded}</td><td>{r.cleanSheets}</td></>}</tr>)}
      </tbody></table></div>}
    <p className="player-award-note">Only completed Super League and Playoff matches count. Qualifying-stage matches are excluded.</p>
  </section>;
}





function getTournamentProgress(fixtures:any[], playoffFixtures:any[]) {
  const qualifying=(fixtures||[]).filter((f:any)=>String(f.stage).toLowerCase()==="qualifying");
  const superLeague=(fixtures||[]).filter((f:any)=>String(f.stage).toLowerCase()==="super_league");
  const playoffs=playoffFixtures||[];
  const completed=(rows:any[])=>rows.length>0&&rows.every((f:any)=>String(f.status).toLowerCase()==="completed");
  const groupDone=completed(qualifying);
  const superDone=completed(superLeague);
  const playoffDone=completed(playoffs);
  const active=playoffs.length?"playoffs":superLeague.length?"super_league":"qualifying";
  return {qualifying,superLeague,playoffs,groupDone,superDone,playoffDone,active,
    groupCount:qualifying.length,groupCompleted:qualifying.filter((f:any)=>String(f.status).toLowerCase()==="completed").length,
    superCount:superLeague.length,superCompleted:superLeague.filter((f:any)=>String(f.status).toLowerCase()==="completed").length,
    playoffCount:playoffs.length,playoffCompleted:playoffs.filter((f:any)=>String(f.status).toLowerCase()==="completed").length};
}

function HomePage({ playersCount, players, announcements, fixtures, playoffFixtures, superStandings, onNavigate }: { playersCount:number; players:any[]; announcements:any[]; fixtures:any[]; playoffFixtures:any[]; superStandings:any[]; onNavigate:(page:Page)=>void }) {
  const progress=getTournamentProgress(fixtures,playoffFixtures);
  const stageLabel=progress.active==="playoffs"?"PLAYOFFS LIVE":progress.active==="super_league"?"SUPER LEAGUE LIVE":"GROUP STAGE LIVE";
  const stageCopy=progress.active==="playoffs"?"Knockout fixtures are underway. Follow the quarter-finals, semi-finals and final.":progress.active==="super_league"?"The 32 qualifiers are competing for the eight playoff spots.":"Players are competing in their groups. The top four from each group advance.";
  const stages=[
    {key:"qualifying",title:"Group Stage",copy:"8 groups · Top 4 qualify",count:progress.groupCount,done:progress.groupDone},
    {key:"super_league",title:"Super League",copy:"32 players · Top 8 qualify",count:progress.superCount,done:progress.superDone},
    {key:"playoffs",title:"Playoffs",copy:"Quarter-finals · Semi-finals · Grand Final",count:progress.playoffCount,done:progress.playoffDone}
  ];
  return <>
    <section className="hero"><img className="hero-image" src="/ron.jpg" alt="Cristiano Ronaldo"/><div className="hero-gradient"/><div className="hero-content"><div className="hero-tag">✦ REGENTA FC PRESENTS</div><h1>1ST<br/><span>ANNIVERSARY</span></h1><div className="hero-subtitle">SOLO CHAMPIONSHIP</div><p>One year of memories. Countless moments.<br/>A new chapter begins.</p><div className="hero-legacy">✦ MORE THAN A GAME. IT'S A LEGACY.</div></div></section>
    <main className="home-main">
      <section className="stats-grid"><div className="stat-card"><h2>{playersCount||"64+"}</h2><p>PLAYERS</p></div><div className="stat-card"><h2>08</h2><p>GROUPS</p></div><div className="stat-card"><h2>32</h2><p>QUALIFIERS</p></div></section>
      <section className="home-section stage-road-card"><div className="section-label">TOURNAMENT PROGRESSION</div><h2>{stageLabel}</h2><p>{stageCopy}</p><div className="stage-counts"><span><b>{progress.groupCompleted}/{progress.groupCount}</b> GROUP MATCHES</span><span><b>{progress.superCompleted}/{progress.superCount}</b> SUPER LEAGUE</span><span><b>{progress.playoffCompleted}/{progress.playoffCount}</b> PLAYOFFS</span></div></section>
      <section className="home-section"><div className="section-label">THE TOURNAMENT JOURNEY</div><h2>Stage-by-stage progress</h2><div className="journey-list">{stages.map((s,i)=><div className={`journey-card ${progress.active===s.key?"journey-active":""} ${s.done?"journey-done":""}`} key={s.key}><div className="journey-icon">{s.done?"✓":i===0?"⚽":i===1?"🏆":"🥇"}</div><div className="journey-copy"><h3>{s.title}</h3><p>{s.done?"Completed":progress.active===s.key?"Currently active":s.count?"Fixtures generated":"Awaiting previous stage" } · {s.copy}</p></div><div className="journey-number">{s.done?"DONE":progress.active===s.key?"LIVE":`0${i+1}`}</div></div>)}</div><button className="text-link" onClick={()=>onNavigate("Fixtures")}>VIEW CURRENT FIXTURES →</button></section>
      <section className="home-section super-home-panel"><div className="section-label">SUPER LEAGUE SPOTLIGHT</div><h2>Championship Race</h2><div className="super-podium"><div><small>LEADER</small><b>{superStandings?.[0]?.playerName||players.find((p:any)=>Number(p.id)===Number(superStandings?.[0]?.playerId))?.name||"To be decided"}</b></div><div><small>2ND PLACE</small><b>{superStandings?.[1]?.playerName||players.find((p:any)=>Number(p.id)===Number(superStandings?.[1]?.playerId))?.name||"To be decided"}</b></div></div><button className="text-link" onClick={()=>onNavigate("Standings")}>VIEW SUPER LEAGUE TABLE →</button></section>
      <section className="announcement-card"><div className="section-label">LATEST ANNOUNCEMENT</div><h3>📢 {announcements[0]?.title||"Something big is coming."}</h3><p>{announcements[0]?.body||announcements[0]?.message||announcements[0]?.description||"Stay tuned for updates from Regenta FC."}</p></section>
      <footer className="home-footer"><img className="footer-logo" src="/regenta-anniversary-logo.png" alt="Regenta FC 1st Anniversary logo"/><div>REGENTA FC</div><p>THE GAME NEVER STOPS.</p></footer>
    </main>
  </>;
}

function JourneyCard({icon,title,copy,number}:{icon:string;title:string;copy:string;number:string}) {
  return <div className="journey-card"><div className="journey-icon">{icon}</div><div className="journey-copy"><h3>{title}</h3><p>{copy}</p></div><div className="journey-number">{number}</div></div>;
}

function RulebookPage() {
  const rules = [
    { number: "01", tag: "INSTANT WALKOVER", title: "Kickoff Glitch Ban", body: "Goals scored through a kickoff glitch, if proven, will result in a walkover for the opponent without any second thought.", tone: "danger" },
    { number: "02", tag: "3-0 WALKOVER", title: "Time-Wasting & Backpassing", body: "Holding possession unnecessarily for over 10 minutes (in-game) will result in a 3-0 walkover for the opponent upon verification.", tone: "danger" },
    { number: "03", tag: "SEND PROOF", title: "Crossing Ban", body: "The use of crosses is banned. If a cross is used, send the proof.", details: [{ label: "Ground driven passes", status: "ALLOWED" }, { label: "Aerial crosses", status: "BANNED" }] },
    { number: "04", tag: "THUMBS UP SIGNAL", title: "Disconnection Rules", timeline: [{ time: "0–15 min", text: "Game must be restarted from 0-0. The disconnected player must immediately leave and send 👍👍 to signal the disconnect." }, { time: "15–75 min", text: "Match resumes from where it was interrupted. Remaining minutes must be played." }, { time: "After 75 min", text: "The opponent has discretion to either complete the remaining time or accept the current result." }] },
    { number: "05", tag: "SHOT REQUIREMENT", title: "Possession Rule", body: "If your possession exceeds the thresholds below, you must have taken the minimum required shots. Otherwise, you may face a rematch or walkover based on the scenario.", thresholds: [{ possession: "60–64%", shots: "2 shots minimum" }, { possession: "65–69%", shots: "4 shots minimum" }, { possession: "70%+", shots: "6 shots minimum" }] },
    { number: "06", tag: "GOAL CANCELLED", title: "Lob Passes", body: "If a player scores a goal through a lob inside the box, the goal will be cancelled and gameplay can continue normally.", details: [{ label: "Lob passes inside the penalty box", status: "BANNED" }, { label: "Lob passes received outside the penalty area", status: "ALLOWED" }] },
    { number: "07", tag: "PROOF REQUIRED", title: "Appeal Rule", body: "For any appeal, you must have a proper screen recording. Failure to provide proof will result in the decision being made against you.", note: "All disputes are subject to admin review. Screenshots or screen recordings from the opponent are also valid proof. For doubts contact any admin." }
  ];
  return <div className="rulebook-wrap">
    <div className="rulebook-hero"><div className="rulebook-kicker"><span/> OFFICIAL TOURNAMENT RULES <span/></div><h2>THE RULEBOOK</h2><p>REGENTA FC 1ST ANNIVERSARY SOLO CHAMPIONSHIP</p><div className="rulebook-count">07 RULES <i>·</i> FAIR PLAY IS NON-NEGOTIABLE</div></div>
    <div className="rulebook-grid">{rules.map(rule=><article className={`rule-card ${rule.tone||""}`} key={rule.number}>
      <div className="rule-card-top"><span className="rule-number">{rule.number}</span><span className="rule-tag">{rule.tag}</span></div>
      <h3>{rule.title}</h3>
      {rule.body && <p className="rule-body">{rule.body}</p>}
      {rule.details && <div className="rule-status-list">{rule.details.map(item=><div key={item.label}><span>{item.label}</span><b className={item.status === "BANNED" ? "status-banned" : "status-allowed"}>{item.status}</b></div>)}</div>}
      {rule.timeline && <div className="rule-timeline">{rule.timeline.map(item=><div key={item.time}><b>{item.time}</b><p>{item.text}</p></div>)}</div>}
      {rule.thresholds && <div className="rule-thresholds"><div className="rule-threshold-head"><span>POSSESSION</span><span>MINIMUM SHOTS</span></div>{rule.thresholds.map(item=><div key={item.possession}><b>{item.possession}</b><strong>{item.shots}</strong></div>)}</div>}
      {rule.note && <div className="rule-note"><b>IMPORTANT</b><p>{rule.note}</p></div>}
    </article>)}</div>
    <div className="rulebook-footer"><ShieldCheck size={18}/><span>PLAY FAIR. RESPECT YOUR OPPONENT. LET THE GAME DECIDE.</span></div>
  </div>;
}

function InfoCard({number,title,copy}:{number:string;title:string;copy:string}) {
  return <div className="info-card"><span>{number}</span><div><b>{title}</b><p>{copy}</p></div><ChevronRight/></div>;
}
function Empty({icon,title,copy}:{icon:any;title:string;copy:string}) {
  return <div className="empty-state">{icon}<h3>{title}</h3><p>{copy}</p></div>;
}

function AdminLogin({email,setEmail,password,setPassword,busy,error,onSubmit}:any) {
  return <div className="admin-login"><div className="login-card">
    <img className="admin-login-logo" src="/regenta-anniversary-logo.png" alt="Regenta FC 1st Anniversary logo"/><div className="section-label">REGENTA FC · PRIVATE ACCESS</div>
    <h1>ADMIN <em>PORTAL</em></h1><p>Only tournament administrators can access this area.</p>
    <form onSubmit={onSubmit}><label>ADMIN EMAIL</label><div className="password-wrap"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin email" required/></div><label style={{marginTop:12}}>ADMIN PASSWORD</label><div className="password-wrap"><LockKeyhole/><input type="password" inputMode="numeric" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/></div>
      {error && <div className="login-error">{error}</div>}
      <button className="primary-button full-width" disabled={busy}>{busy?"VERIFYING...":"UNLOCK DASHBOARD"} <ArrowUpRight size={15}/></button>
    </form>
    <a href="/" className="login-back">← Back to public website</a>
  </div></div>;
}

function AdminDashboard({players,fixtures,playoffFixtures,standings,groupDetails,tab,setTab,logout,newPlayer,setNewPlayer,addPlayer,newScore,setNewScore,saveScore,message,refresh}:any) {
  const tabs = ["Overview","Players","Groups","Fixtures","Announcements","Reset Tournament"];
  return <div className="admin-page">
    <aside className="admin-sidebar">
      <div className="admin-logo"><img className="brand-logo" src="/regenta-anniversary-logo.png" alt="Regenta FC 1st Anniversary logo"/><div><b>REGENTA FC</b><small>ADMIN CONSOLE</small></div></div>
      <div className="admin-online"><CircleDot/> SECURE SESSION</div>
      {tabs.map(t=><button className={tab===t?"chosen":""} onClick={()=>setTab(t)}>{t}</button>)}
      <button className="logout-button" onClick={logout}><LogOut/> LOG OUT</button>
    </aside>
    <main className="admin-content">
      <div className="admin-header"><div><div className="section-label">TOURNAMENT CONTROL</div><h1>{tab}</h1></div><button className="refresh-button" onClick={refresh}><RefreshCw/> Refresh</button></div>
      {message && <div className="admin-message">{message}</div>}
      {tab==="Overview" && <>
        <div className="admin-welcome"><div><div className="section-label">WELCOME BACK</div><h2>Manage the <em>game.</em></h2><p>Regenta FC 1st Anniversary Solo Championship</p></div><img className="admin-logo-art" src="/regenta-anniversary-logo.png" alt="Regenta FC 1st Anniversary logo"/></div>
        <div className="admin-stats"><div><b>{players.length}</b><small>PLAYERS</small></div><div><b>{fixtures.length}</b><small>FIXTURES</small></div><div><b>{standings.length}</b><small>TABLE ROWS</small></div></div>
        <AdminProgression fixtures={fixtures} playoffFixtures={playoffFixtures||[]} />
        <div className="admin-panel"><h3>QUICK ACTIONS</h3><div className="admin-actions">{["Players","Fixtures","Announcements"].map(t=><button onClick={()=>setTab(t)}>{t}<ChevronRight/></button>)}</div></div>
      </>}
      {tab==="Players" && <PlayersAdmin players={players} refresh={refresh} newPlayer={newPlayer} setNewPlayer={setNewPlayer} addPlayer={addPlayer} />}
      {tab==="Groups" && <GroupsAdmin players={players} refresh={refresh} setMessage={undefined} />}
      {tab==="Fixtures" && <FixturesAdmin players={players} fixtures={fixtures} groupDetails={groupDetails} newScore={newScore} setNewScore={setNewScore} saveScore={saveScore} refresh={refresh} />}
      {tab==="Announcements" && <AnnouncementsAdmin refresh={refresh} setMessage={undefined} />}
      {tab==="Reset Tournament" && <TournamentResetAdmin refresh={refresh} />}
    </main>
  </div>;
}


function AdminProgression({fixtures,playoffFixtures}:any) {
  const p=getTournamentProgress(fixtures,playoffFixtures);
  const current=p.active==="playoffs"?"PLAYOFFS":p.active==="super_league"?"SUPER LEAGUE":"GROUP STAGE";
  const rows=[
    {name:"GROUP STAGE",done:p.groupDone,count:p.groupCount,completed:p.groupCompleted},
    {name:"SUPER LEAGUE",done:p.superDone,count:p.superCount,completed:p.superCompleted},
    {name:"PLAYOFFS",done:p.playoffDone,count:p.playoffCount,completed:p.playoffCompleted}
  ];
  return <section className="admin-panel admin-progression-flow">
    <div className="section-label">LIVE TOURNAMENT PROGRESSION</div>
    <h3>{current} {p.active==="playoffs"||p.active==="super_league"||p.active==="qualifying"?"ACTIVE":""}</h3>
    <div className="admin-progression-steps">{rows.map((r,i)=><div className={`admin-progression-step ${r.done?"is-done":r.name===current?"is-active":""}`} key={r.name}><span className="admin-step-index">{r.done?"✓":`0${i+1}`}</span><div><b>{r.name}</b><small>{r.count?`${r.completed}/${r.count} matches completed`:"Not generated yet"}</small></div><strong>{r.done?"COMPLETED":r.name===current?"ACTIVE":"UP NEXT"}</strong></div>)}</div>
  </section>;
}

function PlayersAdmin({players,refresh,newPlayer,setNewPlayer,addPlayer}:any) {
  const [bulkNames,setBulkNames]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  async function addNamesFromList() {
    const names=[...new Set(bulkNames.split(/[\n,;]+/).map((name:string)=>name.trim()).filter(Boolean))];
    if(!names.length){setError("Paste at least one player name, one per line.");return;}
    const existing=new Set(players.filter((p:any)=>p.isActive!==false).map((p:any)=>String(p.displayName||p.name||p.playerName||"").trim().toLowerCase()));
    const fresh=names.filter(name=>!existing.has(name.toLowerCase()));
    const duplicates=names.length-fresh.length;
    if(!fresh.length){setError("All names in this list already exist.");return;}
    setBusy(true);setError("");setNotice("");
    let added=0;const failed:string[]=[];
    for(const name of fresh){
      try{await api("/api/players",{method:"POST",body:JSON.stringify({displayName:name})});added++;}
      catch(e:any){failed.push(`${name}: ${e.message}`);}
    }
    await refresh();setBusy(false);setBulkNames("");
    setNotice(`${added} player(s) added${duplicates?`; ${duplicates} duplicate name(s) skipped`:""}${failed.length?`; ${failed.length} failed`:""}.`);
    if(failed.length)setError(failed.slice(0,5).join(" · "));
  }

  return <div className="players-admin-wrap">
    <section className="admin-panel">
      <h3>ADD A PLAYER</h3>
      <form className="add-player" onSubmit={addPlayer}><input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} placeholder="Enter one player name"/><button className="primary-button" disabled={busy}><Plus/> ADD PLAYER</button></form>
    </section>
    <section className="admin-panel">
      <h3>BULK ADD PLAYERS</h3>
      <p>Paste your player list below. Put each name on a new line. Commas and semicolons are also supported.</p>
      <textarea className="bulk-player-textarea" rows={8} value={bulkNames} onChange={e=>setBulkNames(e.target.value)} placeholder={'Suryah\\nVijay\\nArun\\nKarthik'} />
      <div className="bulk-player-actions"><small>{bulkNames.split(/[\n,;]+/).filter((x:string)=>x.trim()).length} names detected</small><button type="button" className="primary-button" disabled={busy||!bulkNames.trim()} onClick={addNamesFromList}><Plus size={15}/> ADD PLAYER LIST</button></div>
    </section>
    {notice&&<div className="admin-message">{notice}</div>}{error&&<div className="admin-message groups-alert">{error}</div>}
    <section className="admin-panel"><h3>PLAYER ROSTER</h3><p>{players.filter((p:any)=>p.isActive!==false).length} active players</p>
      <div className="admin-list">{players.filter((p:any)=>p.isActive!==false).map((p:any)=><div key={p.id}><span>{p.displayName||p.name||p.playerName||"Player"}</span><small>{p.groupName||p.group||"Unassigned"}</small></div>)}{!players.length&&<p className="empty-admin">No players added yet.</p>}</div>
    </section>
  </div>;
}

function TournamentResetAdmin({refresh}:any) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  async function reset(stage:string,label:string,warning:string) {
    const ok=window.confirm(`${label}?\n\n${warning}\n\nThis cannot be undone. Continue?`);
    if(!ok)return;
    const confirmText=stage==="all"?"DELETE PLAYERS":stage==="qualifying"?"GROUPS":stage==="super_league"?"SUPER LEAGUE":"PLAYOFFS";
    const typed=window.prompt(`Type ${confirmText} to confirm this reset.`);
    if(typed!==confirmText){setError("Reset cancelled: confirmation text did not match.");return;}
    setBusy(true);setError("");setNotice("");
    try {
      const result:any=await api(`/api/reset/${stage}`,{method:"POST",body:JSON.stringify({})});
      setNotice(result?.message||`${label} completed.`);
      await refresh();
    } catch(e:any) {setError(e.message||"Reset failed.");}
    finally {setBusy(false);}
  }
  const resetCards=[
    {step:"01",title:"Reset Group Stage",description:"Deletes qualifying fixtures and scores, plus all Super League and Playoff fixtures/results. Keeps players, groups and group assignments.",button:"RESET GROUP STAGE",stage:"qualifying",warning:"Qualifying scores and all later stages will be deleted. Group assignments remain.",tone:"stage"},
    {step:"02",title:"Reset Super League",description:"Deletes Super League fixtures/results and all Playoff fixtures/results. Keeps completed group-stage scores and group assignments.",button:"RESET SUPER LEAGUE",stage:"super_league",warning:"Super League and Playoff data will be deleted. Qualifying results remain.",tone:"stage"},
    {step:"03",title:"Reset Playoffs",description:"Deletes only quarter-final, semi-final and final fixtures/results. Super League standings and scores remain unchanged.",button:"RESET PLAYOFFS",stage:"playoffs",warning:"All playoff fixtures and results will be deleted. Super League results remain.",tone:"stage"}
  ];
  return <div className="reset-admin-wrap">
    <section className="reset-intro-card">
      <div className="reset-intro-icon"><ShieldAlert/></div>
      <div><div className="section-label">DANGER ZONE</div><h2>TOURNAMENT RESET CONTROL</h2>
        <p>Choose the stage you want to restart. Each action explains what will be removed and asks for confirmation before making changes.</p>
      </div>
    </section>
    {(error||notice)&&<div className={error?"reset-feedback error":"reset-feedback success"}>{error||notice}</div>}
    <div className="reset-stage-grid">
      {resetCards.map(card=><section className="reset-stage-card" key={card.stage}>
        <div className="reset-card-top"><span className="reset-step">STAGE RESET · {card.step}</span><span className="reset-card-icon"><RotateCcw/></span></div>
        <h3>{card.title}</h3><p>{card.description}</p>
        <button className="reset-action-button" disabled={busy} onClick={()=>reset(card.stage,card.title,card.warning)}>{busy?"PLEASE WAIT…":card.button}<ChevronRight/></button>
      </section>)}
    </div>
    <section className="reset-everything-card">
      <div className="reset-everything-head"><div><div className="section-label">FULL TOURNAMENT RESET</div><h3>RESET EVERYTHING</h3></div><div className="reset-danger-icon"><Trash2/></div></div>
      <p>Deletes all qualifying, Super League and Playoff fixtures/results, all player-to-group assignments, and the entire player roster including player names. Tournament setup, group definitions and announcements are kept. You must add players again, assign them to groups and regenerate fixtures.</p>
      <div className="reset-consequence"><ShieldAlert/><span><b>Permanent action</b><small>This removes the complete player roster. Make sure you really want to start over.</small></span></div>
      <button className="reset-action-button full-reset-button" disabled={busy} onClick={()=>reset("all","Reset Entire Tournament","ALL match fixtures/results, ALL group assignments, and EVERY player record/name will be permanently deleted. Tournament setup, group definitions and announcements will be kept. You must add the players again.")}>{busy?"PLEASE WAIT…":"RESET ENTIRE TOURNAMENT"}<Trash2/></button>
    </section>
    {busy&&<p className="admin-note reset-loading">Resetting tournament data…</p>}
  </div>;
}
function AnnouncementsAdmin({refresh}:any) {
  const [rows,setRows]=useState<any[]>([]);
  const [title,setTitle]=useState(""); const [body,setBody]=useState(""); const [published,setPublished]=useState(true);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  async function loadAnnouncements(){
    try{const data:any=await api("/api/announcements/admin");setRows(Array.isArray(data)?data:(data?.announcements||[]));}
    catch(err:any){setError(err.message||"Could not load announcements.");}
  }
  useEffect(()=>{loadAnnouncements();},[]);
  function clearForm(){setTitle("");setBody("");setPublished(true);setEditingId(null);}
  function beginEdit(row:any){setEditingId(Number(row.id));setTitle(row.title||"");setBody(row.body||row.message||"");setPublished(!!row.isPublished);setError("");setNotice("");window.scrollTo({top:0,behavior:"smooth"});}
  async function save(e:React.FormEvent){
    e.preventDefault();if(!title.trim()||!body.trim()){setError("Enter both a title and announcement.");return;}
    setBusy(true);setError("");setNotice("");
    try{
      const payload={title:title.trim(),body:body.trim(),isPublished:published};
      if(editingId!=null) await api(`/api/announcements/${editingId}`,{method:"PATCH",body:JSON.stringify(payload)});
      else await api("/api/announcements",{method:"POST",body:JSON.stringify(payload)});
      setNotice(editingId!=null?"Announcement updated successfully.":published?"Announcement published successfully.":"Announcement saved as draft.");
      clearForm();await loadAnnouncements();await refresh();
    }catch(err:any){setError(err.message||"Could not save announcement.");}
    finally{setBusy(false);}
  }
  async function remove(row:any){
    if(!window.confirm(`Delete "${row.title}"? This cannot be undone.`))return;
    setBusy(true);setError("");setNotice("");
    try{await api(`/api/announcements/${row.id}`,{method:"DELETE"});setNotice("Announcement deleted.");if(editingId===Number(row.id))clearForm();await loadAnnouncements();await refresh();}
    catch(err:any){setError(err.message||"Could not delete announcement.");}
    finally{setBusy(false);}
  }
  return <div className="announcement-admin-wrap">
    <section className="admin-panel announcement-editor-panel">
      <div className="announcement-editor-heading"><div><div className="section-label">{editingId!=null?"EDIT ANNOUNCEMENT":"CREATE UPDATE"}</div><h3>{editingId!=null?"UPDATE ANNOUNCEMENT":"ANNOUNCEMENTS"}</h3></div>{editingId!=null&&<button type="button" className="announcement-cancel" onClick={clearForm}>CANCEL EDIT</button>}</div>
      <p className="admin-note">Create tournament updates, edit existing posts, or remove announcements you no longer need.</p>
      <form className="announcement-form" onSubmit={save}>
        <label>ANNOUNCEMENT TITLE<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Announcement title" maxLength={160}/></label>
        <label>MESSAGE<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your announcement..."/></label>
        <label className="publish-toggle"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish immediately</label>
        {error&&<p className="admin-error">{error}</p>}{notice&&<p className="admin-success">{notice}</p>}
        <button className="primary-button" disabled={busy}>{busy?"SAVING…":editingId!=null?"SAVE CHANGES":published?"PUBLISH ANNOUNCEMENT":"SAVE DRAFT"}</button>
      </form>
    </section>
    <section className="admin-panel announcement-list-panel">
      <div className="announcement-list-heading"><div><div className="section-label">POST MANAGEMENT</div><h3>ALL ANNOUNCEMENTS</h3></div><button className="refresh-button" type="button" onClick={loadAnnouncements}><RefreshCw/> Refresh</button></div>
      {rows.length===0?<div className="empty-admin announcement-empty">No announcements found yet.</div>:<div className="announcement-admin-list">
        {rows.map((row:any)=><article className="announcement-admin-item" key={row.id}>
          <div className="announcement-admin-copy"><div className="announcement-admin-meta"><span className={row.isPublished?"published-pill":"draft-pill"}>{row.isPublished?"PUBLISHED":"DRAFT"}</span>{row.createdAt&&<small>{new Date(row.createdAt).toLocaleDateString()}</small>}</div><h4>{row.title}</h4><p>{row.body||row.message}</p></div>
          <div className="announcement-admin-actions"><button type="button" onClick={()=>beginEdit(row)} disabled={busy}><Pencil size={15}/> EDIT</button><button type="button" className="delete-announcement" onClick={()=>remove(row)} disabled={busy}><Trash2 size={15}/> DELETE</button></div>
        </article>)}
      </div>}
    </section>
  </div>;
}
function FixturesAdmin({players,fixtures,groupDetails,newScore,setNewScore,saveScore,refresh}:any) {
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [playoffRows,setPlayoffRows]=useState<any[]>([]);
  const [playoffScores,setPlayoffScores]=useState<Record<string,string>>({});
  async function loadPlayoffs(){try{const data:any=await api("/api/playoffs");setPlayoffRows(Array.isArray(data)?data:(data?.fixtures||[]));}catch{}}
  useEffect(()=>{loadPlayoffs();},[]);
  async function savePlayoffScore(f:any){
    const raw=playoffScores[String(f.id)]??(f.goalsA!=null&&f.goalsB!=null?`${f.goalsA}-${f.goalsB}`:"");
    const parts=raw.split(/[-:]/).map(Number);
    if(parts.length!==2||parts.some(n=>!Number.isInteger(n)||n<0)){setError("Enter a playoff score like 2-1.");return;}
    setBusy(true);setError("");setNotice("");
    try{await api(`/api/playoffs/${f.id}/score`,{method:"PATCH",body:JSON.stringify({goalsA:parts[0],goalsB:parts[1]})});setNotice("Playoff score saved.");await loadPlayoffs();await refresh();}
    catch(e:any){setError(e.message||"Could not save playoff score.");}finally{setBusy(false);}
  }
  async function generate(path:string,label:string) {
    if(!window.confirm(`${label}? This action will create fixtures and cannot be repeated if fixtures already exist.`)) return;
    setBusy(true);setError("");setNotice("");
    try {
      const result:any=await api(path,{method:"POST",body:JSON.stringify({})});
      const count=result?.created ?? result?.fixtureCount ?? result?.fixtures?.length ?? result?.qualifiedPlayers ?? 0;
      setNotice(`${label} completed. ${count} record(s) created/qualified.`);
      await refresh();
    } catch(e:any) { setError(e.message||`${label} failed.`); }
    finally { setBusy(false); }
  }
  const stages=[
    {key:"qualifying",label:"GROUP FIXTURES",path:"/api/fixtures/generate/qualifying",help:"Generate round-robin fixtures for all assigned groups."},
{key:"playoffs",label:"PLAYOFFS",path:"/api/playoffs/generate",help:"Generate quarter-finals for the top 8 after all Super League matches are completed."}
  ];
  const qualifyingRows=fixtures.filter((f:any)=>f.stage==="qualifying");
  const superRows=fixtures.filter((f:any)=>f.stage==="super_league");
  const allGroupsComplete=qualifyingRows.length>0&&qualifyingRows.every((f:any)=>f.status==="completed");
  const alreadyPromoted=superRows.length>0;
  const grouped=stages.map(st=>({ ...st, count:fixtures.filter((f:any)=>f.stage===st.key).length }));
  const [filter,setFilter]=useState("all");
  const [resultTab,setResultTab]=useState("pending");
  const stageRows=fixtures.filter((f:any)=>filter==="all"||f.stage===filter);
  const shown=stageRows.filter((f:any)=>resultTab==="all"||(resultTab==="completed"?String(f.status).toLowerCase()==="completed":String(f.status).toLowerCase()!=="completed"));
  return <div className="fixture-admin-wrap">
    <section className="admin-panel progression-panel">
      <div><div className="section-label">GROUP STAGE PROGRESSION</div><h3>{alreadyPromoted?"SUPER LEAGUE CREATED":allGroupsComplete?"ALL GROUP FIXTURES COMPLETED":"GROUP STAGE IN PROGRESS"}</h3><p>{alreadyPromoted?"The 32 qualified players have been moved into the Super League.":allGroupsComplete?"All group matches are complete. You can now qualify the top 4 from each group.":"Complete every qualifying fixture to unlock progression."}</p></div>
      <div className="progression-action"><span>{qualifyingRows.filter((f:any)=>f.status==="completed").length} / {qualifyingRows.length} completed</span>{allGroupsComplete&&!alreadyPromoted&&<button className="primary-button" disabled={busy} onClick={()=>generate("/api/fixtures/generate/super-league","MOVE TO SUPER LEAGUE")}><Trophy size={15}/>MOVE TO SUPER LEAGUE</button>}{alreadyPromoted&&<span className="promotion-complete-label">✓ SUPER LEAGUE CREATED</span>}</div>
    </section>
    <div className="fixture-generation-grid">{grouped.map(st=><section className="admin-panel fixture-generation-card" key={st.key}>
      <div className="section-label">{st.label}</div><b className="fixture-generation-count">{st.count}</b><p>{st.help}</p>
      <button className="primary-button" disabled={busy} onClick={()=>generate(st.path,st.label)}><CalendarDays size={15}/>{st.count?"GENERATE / CHECK":"GENERATE FIXTURES"}</button>
    </section>)}</div>
    {notice&&<div className="admin-message">{notice}</div>}{error&&<div className="admin-message groups-alert">{error}</div>}
    <div className="admin-panel">
      <div className="fixture-admin-heading"><h3>FIXTURE RESULTS & SCORE EDITOR</h3><button className="refresh-button" onClick={refresh}><RefreshCw size={15}/> Refresh</button></div>
      <div className="fixture-filter-row">
        <button className={filter==="all"?"selected":""} onClick={()=>setFilter("all")}>ALL STAGES</button>
        <button className={filter==="qualifying"?"selected":""} onClick={()=>setFilter("qualifying")}>GROUPS</button>
        <button className={filter==="super_league"?"selected":""} onClick={()=>setFilter("super_league")}>SUPER LEAGUE</button>
      </div>
      <div className="fixture-view-tabs admin-result-tabs"><button className={resultTab==="pending"?"active":""} onClick={()=>setResultTab("pending")}>LIVE / PENDING ({stageRows.filter((f:any)=>String(f.status).toLowerCase()!=="completed").length})</button><button className={resultTab==="completed"?"active":""} onClick={()=>setResultTab("completed")}>COMPLETED ({stageRows.filter((f:any)=>String(f.status).toLowerCase()==="completed").length})</button><button className={resultTab==="all"?"active":""} onClick={()=>setResultTab("all")}>ALL ({stageRows.length})</button></div>
      {shown.length?shown.map((f:any,i:number)=>{
        const a=players.find((p:any)=>Number(p.id)===Number(f.playerAId));
        const b=players.find((p:any)=>Number(p.id)===Number(f.playerBId));
        const key=String(f.id);
        const groupCode=groupDetails?.find((g:any)=>Number(g.groupId)===Number(f.groupId))?.code;
        return <div className="fixture-score-row" key={f.id}>
          <div className="fixture-score-info"><small>{f.stage==="qualifying"?`GROUP ${groupCode||"?"} · `:""}{String(f.stage||"").replace("_"," ").toUpperCase()} {f.matchDay?`· MATCHDAY ${f.matchDay}`:""} · {String(f.status||"UPCOMING").toUpperCase()}</small>
            <b><em className={String(f.status).toLowerCase()==="completed"&&Number(f.goalsA)>Number(f.goalsB)?"admin-winner":""}>{a?.name||a?.displayName||f.player1Name||"Player A"}</em> <span>vs</span> <em className={String(f.status).toLowerCase()==="completed"&&Number(f.goalsB)>Number(f.goalsA)?"admin-winner":""}>{b?.name||b?.displayName||f.player2Name||"Player B"}</em></b>
          </div>
          <div className="fixture-score-controls">
            <input aria-label="Score, for example 2-1" value={newScore[key]??(f.goalsA!=null&&f.goalsB!=null?`${f.goalsA}-${f.goalsB}`:"")} onChange={e=>setNewScore((old:any)=>({...old,[key]:e.target.value}))} placeholder="2-1"/>
            <button className="primary-button" onClick={()=>saveScore(f,i)}><Check size={15}/> SAVE SCORE</button>
          </div>
        </div>;
      }):<p className="empty-admin">No fixtures in this stage yet. Generate group fixtures after assigning players.</p>}
    </div>
    <div className="admin-panel">
      <h3>PLAYOFF SCORE EDITOR</h3>
      {playoffRows.length?playoffRows.map((f:any)=>{const a=players.find((p:any)=>Number(p.id)===Number(f.playerAId));const b=players.find((p:any)=>Number(p.id)===Number(f.playerBId));return <div className="fixture-score-row" key={`po-${f.id}`}>
        <div className="fixture-score-info"><small>{String(f.round||"PLAYOFF").toUpperCase()} · {String(f.status||"UPCOMING").toUpperCase()}</small><b>{a?.name||a?.displayName||"TBD"} <span>vs</span> {b?.name||b?.displayName||"TBD"}</b></div>
        <div className="fixture-score-controls"><input value={playoffScores[String(f.id)]??(f.goalsA!=null&&f.goalsB!=null?`${f.goalsA}-${f.goalsB}`:"")} onChange={e=>setPlayoffScores(old=>({...old,[String(f.id)]:e.target.value}))} placeholder="2-1"/><button className="primary-button" disabled={busy||!f.playerAId||!f.playerBId} onClick={()=>savePlayoffScore(f)}><Check size={15}/> SAVE SCORE</button></div>
      </div>}):<p className="empty-admin">Playoff fixtures will appear here after generation.</p>}
    </div>
    <p className="admin-note">Saving a group or Super League score recalculates the corresponding standings. Playoff results advance winners to the next round. Qualifying-stage results do not count toward Golden Boot or Golden Glove.</p>
  </div>;
}



function GroupsAdmin({ players, refresh }: { players:any[]; refresh:()=>Promise<void> }) {
  const [groups,setGroups] = useState<any[]>([]);
  const [assigned,setAssigned] = useState<Record<number,any[]>>({});
  const [selected,setSelected] = useState<Record<number,string>>({});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [initialized,setInitialized] = useState(false);
  const assignedIds = new Set(Object.values(assigned).flat().map((p:any)=>Number(p.id)));
  const unassigned = players.filter((p:any)=>p.isActive!==false && !assignedIds.has(Number(p.id)));

  async function loadGroups() {
    setLoading(true); setError("");
    try {
      const data:any = await api("/api/tournament");
      const gs = Array.isArray(data?.groups) ? data.groups : [];
      setGroups(gs); setInitialized(!!data?.tournament);
      const detail:any = await api("/api/tournament/groups/details");
      const map:Record<number,any[]> = {};
      for (const g of (Array.isArray(detail) ? detail : [])) map[Number(g.groupId)] = g.players || [];
      setAssigned(map);
    } catch(e:any) { setError(e.message || "Could not load groups."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ loadGroups(); },[]);

  async function initialize() {
    setLoading(true); setError(""); setNotice("");
    try {
      await api("/api/tournament/setup",{method:"POST",body:JSON.stringify({name:"Regenta FC 1st Anniversary Solo Tournament",groupCount:8,qualifiersPerGroup:4,playoffSlots:8})});
      setNotice("Tournament initialized with Groups A–H."); await loadGroups();
    } catch(e:any) { setError(e.message || "Could not initialize tournament."); }
    finally { setLoading(false); }
  }
  async function autoAssign() {
    if(!window.confirm("Auto-assign all unassigned players evenly across Groups A–H?")) return;
    setLoading(true); setError(""); setNotice("");
    try { const result:any=await api("/api/tournament/groups/auto-assign",{method:"POST",body:JSON.stringify({})}); setNotice(`Assigned ${result.assigned} players. Total players: ${result.totalPlayers}.`); await loadGroups(); await refresh(); }
    catch(e:any){setError(e.message||"Auto assignment failed.");} finally{setLoading(false);}
  }
  async function assignPlayer(groupId:number) {
    const playerId=Number(selected[groupId]); if(!playerId) return;
    setLoading(true); setError(""); setNotice("");
    try { await api(`/api/tournament/groups/${groupId}/players`,{method:"POST",body:JSON.stringify({playerId})}); setSelected(old=>({...old,[groupId]:""})); setNotice("Player assigned successfully."); await loadGroups(); await refresh(); }
    catch(e:any){setError(e.message||"Could not assign player.");} finally{setLoading(false);}
  }
  return <div className="groups-admin-wrap">
    <div className="admin-panel groups-intro"><div><h3>GROUP ASSIGNMENT</h3><p>Manually place players into Groups A–H, or distribute all unassigned players evenly.</p></div><div className="groups-count"><b>{Object.values(assigned).flat().length}</b><small>ASSIGNED / {players.filter((p:any)=>p.isActive!==false).length}</small></div></div>
    {error && <div className="admin-message groups-alert">{error}</div>}{notice && <div className="admin-message">{notice}</div>}
    {!initialized ? <div className="admin-panel groups-empty"><h3>TOURNAMENT NOT INITIALIZED</h3><p>Create the eight groups before assigning players.</p><button className="primary-button" disabled={loading} onClick={initialize}><Plus size={15}/> INITIALIZE 8 GROUPS</button></div> : <>
      <div className="groups-toolbar"><div><b>{unassigned.length}</b><span> players unassigned</span></div><button className="primary-button" disabled={loading||unassigned.length===0} onClick={autoAssign}><Users size={15}/> AUTO ASSIGN</button></div>
      <div className="groups-admin-grid">{groups.map(g=>{const members=assigned[Number(g.id)]||[];return <section className="admin-panel group-admin-card" key={g.id}>
        <div className="group-admin-heading"><div><h3>GROUP {g.code}</h3><small>{members.length} PLAYERS · TOP 4 QUALIFY</small></div><span>{members.length}/8</span></div>
        <div className="group-member-list">{members.map((p:any,i:number)=><div key={p.id}><span className="group-member-number">{i+1}</span><b>{p.displayName||p.name}</b></div>)}{!members.length&&<p className="empty-admin">No players assigned yet.</p>}</div>
        <div className="group-assign-control"><select value={selected[Number(g.id)]||""} onChange={e=>setSelected(old=>({...old,[Number(g.id)]:e.target.value}))}><option value="">Select unassigned player</option>{unassigned.map((p:any)=><option key={p.id} value={p.id}>{p.displayName||p.name}</option>)}</select><button disabled={loading||!selected[Number(g.id)]} onClick={()=>assignPlayer(Number(g.id))}><Plus size={15}/> ADD</button></div>
      </section>})}</div>
      <p className="admin-note groups-footnote">Manual assignment is the default. Auto Assign only fills currently unassigned active players and does not move players already placed in a group.</p>
    </>}
  </div>;
}
