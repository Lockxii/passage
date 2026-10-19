import {readPreference,rankJourneys} from './journey-preferences';
import NearbyDepartures from './NearbyDepartures.jsx';
import HomeFavorites from './HomeFavorites.jsx';
import {findStops} from './stop-search.js';
import Account from './Account.jsx';
import {UserRound} from 'lucide-react';
import {reportIcon,destinationIcon} from './map-icons';
import DeparturePicker from './DeparturePicker.jsx';
import PhotoEvidence from './PhotoEvidence.jsx';
import React, { useState, useEffect, useRef, useMemo } from "react";

import L from "leaflet";

import JourneyResults from "./JourneyResults";

import SheetHandle from "./SheetHandle";

import Guidance from "./Guidance.jsx";

import {guidanceSteps} from "./guidance";

import { distance } from "./distance";

import {

  Menu,

  Map as MapIcon,

  Route,

  LoaderCircle,

  Search,

  ArrowUpDown,

  LocateFixed,

  Plus,

  Minus,

  Layers,

  Footprints,

  MapPin,

  Clock,

  ChevronRight,

  X,

  Bus,

  TrainFront,

  TramFront,

  Flag,

  Check,

  ThumbsUp,

  EyeOff,

  Navigation,

  WifiOff,

  Settings,

  ShieldCheck,

  ArrowUpRight,

  RefreshCw,

  Info,

} from "lucide-react";

import { Geolocation } from "@capacitor/geolocation";

import { request, native, serverURL, configureServer } from "./api";

import "leaflet/dist/leaflet.css";

import "@fontsource/rubik/latin-400.css";

import "@fontsource/rubik/latin-500.css";

import "@fontsource/rubik/latin-600.css";

import "@fontsource/rubik/latin-700.css";

import "./style.css";

const centre = [50.636, 3.063];

const modes = {

  metro: { label: "Métro", Icon: TrainFront },

  bus: { label: "Bus", Icon: Bus },

  tram: { label: "Tram", Icon: TramFront },

};

function groupStops(stops) {

  const groups = new Map();

  for (const s of stops) {

    const key = normalize(s.name),

      nearby = groups.get(key) || [];

    const g = nearby.find((g) => distance(g, s) < 250);

    if (g) {

      g.lines = [...new Set([...g.lines, ...s.lines])];

      g.members.push(s);

    } else {

      nearby.push({ ...s, members: [s] });

      groups.set(key, nearby);

    }

  }

  return [...groups.values()].flat();

}

const normalize = (s) =>

  s

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase();

function IconButton({ label, children, ...props }) {

  return (

    <button className="icon-button" aria-label={label} title={label} {...props}>

      {children}

    </button>

  );

}

function Line({ name }) {

  return <span className="line">{name}</span>;

}

function Modal({ title, children, onClose, closeDisabled=false }) {

  const ref = useRef();

  useEffect(() => {

    ref.current.showModal();

    return () => ref.current?.close();

  }, []);

  return (

    <dialog

      aria-label={title}

      ref={ref}

      onCancel={e=>{e.preventDefault();if(!closeDisabled)onClose();}}

      onClick={(e) => {

        if (e.target === e.currentTarget) onClose();

      }}

    >

      <header className="modal-header">

        <h2>{title}</h2>

        <IconButton label="Fermer" disabled={closeDisabled} onClick={onClose}>

          <X />

        </IconButton>

      </header>

      {children}

    </dialog>

  );

}

function SearchField({ label, value, onSelect, transit, routes }) {

  const [text, setText] = useState(value?.name || "");

  const [active, setActive] = useState(false);

  const [external, setExternal] = useState([]);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const seq = useRef(0),

    editing = useRef(false);

  useEffect(() => {

    if (value) setText(value.name);

    else if (!editing.current) setText("");

    editing.current = false;

  }, [value]);

  const results = useMemo(()=>text.length<2?[]:findStops(transit,text),[text,transit]);

  const pick = (p) => {

    seq.current++;

    editing.current = false;

    const selected={...p,name:p.city?p.name+' · '+p.city:p.name};
    onSelect(selected);
    setText(selected.name);

    setActive(false);

    setExternal([]);

    setError("");

  };

  async function search() {

    const id = ++seq.current;

    setBusy(true);

    setError("");

    try {

      const result = await request(

        "/search?q=" + encodeURIComponent(text),

        {},

        false,

      );

      if (seq.current === id) setExternal(result);

    } catch (e) {

      if (seq.current === id) setError(e.message);

    } finally {

      if (seq.current === id) setBusy(false);

    }

  }

  return (

    <div className="search-field">

      <div className="input-wrap">

        <input

          aria-label={label}

          spellCheck={false}
          placeholder={label}

          value={text}

          onFocus={() => setActive(true)}

          onChange={(e) => {

            seq.current++;

            editing.current = true;

            setText(e.target.value);

            onSelect(null);

            setExternal([]);

            setActive(true);

            setBusy(false);

          }}

          onKeyDown={(e) => {

            if (e.key === "Escape") setActive(false);

            if (e.key === "Enter") {

              e.preventDefault();

              if (results[0]) pick(results[0]);

              else if (text.length >= 3) search();

            }

          }}

        />

        <button type="button"

          aria-label={"Rechercher " + label.toLowerCase()}

          onClick={() => {

            setActive(true);

            search();

          }}

          disabled={busy || text.length < 3}

        >

          <Search size={18} />

        </button>

      </div>

      {active && text.length >= 2 && (

        <div className="suggestions">

          <div className="suggestion-heading">

            {external.length ? "ADRESSES" : "ARRÊTS"}

            <button type="button"

              onClick={() => setActive(false)}

              aria-label="Fermer les suggestions"

            >

              <X size={16} />

            </button>

          </div>

          {(external.length ? external : results).map((p) => (

            <button type="button" key={p.id} onClick={() => pick(p)} className="suggestion">

              <MapPin size={19} />

              <span>

                {p.name}{p.city?' · '+p.city:''}

                <small>

                  {p.lines

                    ?.map((id) => routes.get(id)?.name)

                    .filter(Boolean)

                    .slice(0, 5)

                    .join(" · ") || "Adresse"}

                </small>

              </span>

              <ChevronRight size={16} />

            </button>

          ))}

          {!external.length && (

            <button type="button"

              className="search-all"

              onClick={search}

              disabled={busy || text.length < 3}

            >

              {busy ? "Recherche…" : "Rechercher cette adresse"}

              <ArrowUpRight size={16} />

            </button>

          )}

          {error && <p className="inline-error">{error}</p>}

        </div>

      )}

    </div>

  );

}

export function App() {

  const mapEl = useRef(),

    map = useRef(),

    reportLayer = useRef(),

    stopLayer = useRef(),

    routeLayer = useRef(),

    positionLayer = useRef();

  const [transit, setTransit] = useState({ stops: [], routes: [] });

  const [dataError, setDataError] = useState("");

  const routes = useMemo(

    () => new Map(transit.routes.map((r) => [r.id, r])),

    [transit],

  );

  const [from, setFrom] = useState(null),

    [to, setTo] = useState(null),

    [route, setRoute] = useState(null),

    [routing, setRouting] = useState(false),

    [routeError, setRouteError] = useState("");

  const [journeys,setJourneys]=useState([]), [journeyWarning,setJourneyWarning]=useState(""), [departAt,setDepartAt]=useState(""), [showDeparture,setShowDeparture]=useState(false);

  const [view,setView]=useState("map");

  const [accountGuard,setAccountGuard]=useState(false);
  const [followGPS,setFollowGPS]=useState(true);

  const [sheetSize,setSheetSize]=useState('normal'),[guideIndex,setGuideIndex]=useState(null),[guidePosition,setGuidePosition]=useState(null);

  useEffect(()=>{if(guideIndex===null)return;setFollowGPS(true);const stop=()=>setFollowGPS(false);map.current?.on('dragstart',stop);return()=>map.current?.off('dragstart',stop);},[guideIndex===null]);

  const guideSteps=useMemo(()=>guidanceSteps(route,from,to),[route,from,to]);

  useEffect(()=>setSheetSize('normal'),[view]);

  useEffect(()=>{

    if(!guidePosition){positionLayer.current?.clearLayers();return;}

    positionLayer.current?.clearLayers();

    L.circleMarker([guidePosition.lat,guidePosition.lon],{radius:8,color:'#fff',weight:3,fillColor:'#00a8e8',fillOpacity:1}).addTo(positionLayer.current);

    if(followGPS&&guidePosition.accuracy<=50&&Date.now()-guidePosition.timestamp<=10000){const mobile=window.innerWidth<=760,zoom=Math.max(16,map.current.getZoom()),p=map.current.project([guidePosition.lat,guidePosition.lon],zoom),height=document.querySelector('.guiding')?.getBoundingClientRect().height||250;map.current.setView(map.current.unproject(L.point(p.x-(mobile?0:200),p.y+(mobile?height/2:0)),zoom),zoom,{animate:true});}

  },[guidePosition,followGPS]);

  useEffect(()=>{if(guideIndex!==null)document.querySelector('.route-workspace')?.scrollTo({top:0});},[guideIndex]);

  const resumeGuidance=useRef(false),lastAutoReplan=useRef(0);

  const routeSeq = useRef(0);

  const [reports, setReports] = useState([]),

    [loadError, setLoadError] = useState(""),

    [loading, setLoading] = useState(true),

    [refresh, setRefresh] = useState(0),

    [bbox, setBbox] = useState(null),

    [filters, setFilters] = useState(["metro", "bus", "tram"]),

    [showStops, setShowStops] = useState(true);

  const [sheetHeight, setSheetHeight] = useState(170);

  const [modal, setModal] = useState(null),

    [selected, setSelected] = useState(null),

    [toast, setToast] = useState(""),

    [busy, setBusy] = useState(false),

    [reportError, setReportError] = useState("");

  const [reportMode, setReportMode] = useState("metro"),

    [stopQuery, setStopQuery] = useState(""),

    [chosenStop, setChosenStop] = useState(null),

    [chosenRoute, setChosenRoute] = useState(""),

    [locating, setLocating] = useState(false),

    [server, setServer] = useState(serverURL),

    [menu, setMenu] = useState(false),

    [now, setNow] = useState(Date.now());

  useEffect(() => {

    fetch("./transit.json")

      .then((r) => {

        if (!r.ok) throw Error();

        return r.json();

      })

      .then(setTransit)

      .catch(() =>

        setDataError(

          "Les arrêts n’ont pas pu être chargés. Rechargez la page.",

        ),

      );

  }, []);

  useEffect(() => {

    const m = L.map(mapEl.current, {

      zoomControl: false,

      attributionControl: true,

    }).setView(centre, 15);

    map.current = m;

    L.tileLayer(

      import.meta.env.VITE_TILE_URL ||

        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

      {

        maxZoom: 19,

        attribution:

          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',

      },

    ).addTo(m);

    reportLayer.current = L.layerGroup().addTo(m);

    stopLayer.current = L.layerGroup().addTo(m);

    routeLayer.current = L.layerGroup().addTo(m);

    positionLayer.current = L.layerGroup().addTo(m);

    let timer;

    const update = () => {

      clearTimeout(timer);

      timer = setTimeout(() => {

        const b = m.getBounds();

        setBbox(

          [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(","),

        );

      }, 350);

    };

    m.on("moveend", update);

    update();

    const observer = new ResizeObserver(() => m.invalidateSize());

    observer.observe(mapEl.current);

    return () => {

      clearTimeout(timer);

      observer.disconnect();

      m.remove();

    };

  }, []);

  useEffect(() => {

    let cancelled = false;

    async function poll() {

      if (document.hidden) return;

      try {

        const d = await request("/reports" + (bbox ? "?bbox=" + bbox : ""));

        if (!cancelled) {

          setReports(d.reports);

          setLoadError("");

          setLoading(false);

        }

      } catch (e) {

        if (!cancelled) {

          setLoadError(e.message);

          setLoading(false);

        }

      }

    }

    poll();

    const t = setInterval(poll, 15000);

    const wake = () => poll();

    document.addEventListener("visibilitychange", wake);

    window.addEventListener("online", wake);

    return () => {

      cancelled = true;

      clearInterval(t);

      document.removeEventListener("visibilitychange", wake);

      window.removeEventListener("online", wake);

    };

  }, [bbox, refresh]);

  useEffect(() => {

    const t = setInterval(() => setNow(Date.now()), 10000);

    return () => clearInterval(t);

  }, []);

  useEffect(() => {

    if (!toast) return;

    const t = setTimeout(() => setToast(""), 4500);

    return () => clearTimeout(t);

  }, [toast]);

  useEffect(() => {

    const el = document.querySelector(view === "route" ? ".route-workspace" : view === "reports" ? ".activity" : ".map-home");

    if (!el) return;

    const observer = new ResizeObserver(() =>

      setSheetHeight(el.getBoundingClientRect().height),

    );

    observer.observe(el);

    return () => observer.disconnect();

  }, [view, route, routing]);

  useEffect(() => {

    setSelected((s) =>

      s ? reports.find((r) => r.id === s.id && r.expires > now) || null : null,

    );

  }, [reports, now]);

  const visible = reports.filter(

    (r) => filters.includes(r.mode) && r.expires > now,

  );

  useEffect(() => {

    reportLayer.current?.clearLayers();

    visible.forEach((r) => {

      const icon = L.divIcon({

        className: "report-marker",

        html: reportIcon(r.mode,!!r.hasPhoto),

        iconSize: [48, 54],

        iconAnchor: [24, 54],

      });

      const marker = L.marker([r.lat, r.lon], {

        icon,

        title: "Contrôle signalé · " + r.place,

        keyboard: true,

      }).addTo(reportLayer.current);

      marker

        .getElement()

        ?.setAttribute(

          "aria-label",

          "Contrôle signalé : " + r.place + " · " + r.line,

        );

      marker.on("click", () => setSelected(r));

    });

  }, [reports, filters, now]);

  useEffect(() => {

    stopLayer.current?.clearLayers();

    if (!showStops || !map.current) return;

    const bounds = map.current.getBounds();

    transit.stops

      .filter(

        (s) =>

          bounds.contains([s.lat, s.lon]) &&

          s.lines.some((id) => routes.get(id)?.mode === "metro"),

      )

      .slice(0, 90)

      .forEach((s) => {

        const marker = L.circleMarker([s.lat, s.lon], {

          radius: 5,

          color: "#fff",

          weight: 2,

          fillColor: "#9262d8",

          fillOpacity: 1,

        }).addTo(stopLayer.current);

        const text = document.createElement("span");

        text.textContent = s.name;

        marker.bindTooltip(text);

        marker.on("click", () => {

          changeTo(s);

        });

      });

  }, [transit, showStops, bbox, routes]);

  useEffect(() => {

    routeLayer.current?.clearLayers();

    if (!route) return;

    if(guideIndex===null)for(const alternative of journeys.filter(j=>j.id!==route.id)){
      for(const leg of alternative.legs){L.geoJSON(leg.geometry,{style:{color:'#ffffff',weight:9,opacity:.9}}).addTo(routeLayer.current);const layer=L.geoJSON(leg.geometry,{style:{color:'#829bae',weight:5,opacity:.85,dashArray:leg.kind==='walk'?'4 7':null}}).addTo(routeLayer.current);layer.on('click',()=>setRoute(alternative));const label=document.createElement('span');label.textContent=Math.ceil(alternative.duration/60)+' min · Autre trajet';layer.bindTooltip(label,{sticky:true});}
    }
    const line = L.featureGroup().addTo(routeLayer.current);

    for (const leg of route.legs) {

      const color=leg.kind==='walk'?'#637894':'#00b8f0';

      L.geoJSON(leg.geometry,{style:{color:'#ffffff',weight:13,opacity:1,lineCap:'round',lineJoin:'round'}}).addTo(line);
      if(leg.kind!=='walk')L.geoJSON(leg.geometry,{style:{color:'#16779b',weight:9,opacity:1,lineCap:'round',lineJoin:'round'}}).addTo(line);

      L.geoJSON(leg.geometry,{style:{color,weight:6,dashArray:leg.kind==='walk'?'5 8':null}}).addTo(line);      if(leg.kind==='transit')for(const stop of leg.viaStops||[]){

        const marker=L.circleMarker([stop.lat,stop.lon],{radius:4,color:'#0086bd',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(routeLayer.current);

        const label=document.createElement('span');label.textContent=stop.name;marker.bindTooltip(label);

      }

    }

    for (const [p, cls] of [

      [from, "start-pin"],

      [to, "end-pin"],

    ])

      if (p)

        L.marker([p.lat, p.lon], {

          keyboard: false,

          interactive: false,

          title: p.name,

          icon: L.divIcon({

            className: cls,

            html: cls==='end-pin'?destinationIcon:"<span></span>",

            iconSize: [32, 32],

            iconAnchor: [16, 16],

          }),

        }).addTo(routeLayer.current);

    const step=guideIndex===null?null:guideSteps[guideIndex];

    let focus=line;

    if(step?.geometry)focus=L.geoJSON(step.geometry,{style:{color:'#00b5ee',weight:7}}).addTo(routeLayer.current);

    else if(step?.coordinate)focus=L.featureGroup([L.circleMarker([step.coordinate[1],step.coordinate[0]],{radius:10,color:'#087fa0',fillColor:'#fff',fillOpacity:1})]).addTo(routeLayer.current);

    const fit = () => {

      const sheet = document.querySelector(view==='route'?'.route-workspace':view==='reports'?'.activity':'.map-home');

      const mobile = window.innerWidth <= 760;

      map.current.fitBounds(focus.getBounds(), {

        paddingTopLeft: mobile ? [32, 90] : [460, 80],

        paddingBottomRight: [mobile ? 32 : 70, mobile ? Math.min((sheet?.getBoundingClientRect().height||250)+106,window.innerHeight-200) : 90],

        maxZoom: 17,

      });

    };

    fit();

    window.addEventListener('resize',fit);

    return () => window.removeEventListener('resize',fit);

  }, [route,journeys,view,guideIndex,sheetSize]);

  function launchFavorite(favorite){changeFrom(favorite.from||null);changeTo(favorite.to);setDepartAt('');setView('route');setModal(null);if(!favorite.from)locate();}

  function changeFrom(p) {

    routeSeq.current++;

    setRouting(false);

    resumeGuidance.current=false;

    setFrom(p);

    setRoute(null);

    setGuideIndex(null);

    setRouteError("");

  }

  function changeTo(p) {

    routeSeq.current++;

    setRouting(false);

    resumeGuidance.current=false;

    setTo(p);

    setRoute(null);

    setGuideIndex(null);

    setRouteError("");

  }

  useEffect(() => {

    if (!from || !to) return;

    const timer = setTimeout(() => calculate(), 450);

    return () => clearTimeout(timer);

  }, [from, to, departAt]);

  async function calculate() {

    const id = ++routeSeq.current;

    setRouting(true);

    setRoute(null);

    setGuideIndex(null);

    setJourneyWarning("");

    setRouteError("");

    try {

      const r = await request(

        "/journeys",

        { method: "POST", body: { from, to, mode:"all", ...(departAt?{departAt:new Date(departAt).toISOString()}: {}) } },

        false,

      );

      if (id === routeSeq.current) {setJourneys(r.journeys);setRoute(rankJourneys(r.journeys,readPreference())[0]);setJourneyWarning(r.warning||"");if(resumeGuidance.current){setGuideIndex(0);resumeGuidance.current=false;}}

    } catch (e) {

      if (id === routeSeq.current) setRouteError(e.message);

    } finally {

      if (id === routeSeq.current) setRouting(false);

    }

  }

  async function locate() {

    setLocating(true);

    try {

      const p = native

        ? await Geolocation.getCurrentPosition({

            enableHighAccuracy: true,

            timeout: 12000,

          })

        : await new Promise((resolve, reject) =>

            navigator.geolocation

              ? navigator.geolocation.getCurrentPosition(resolve, reject, {

                  enableHighAccuracy: true,

                  timeout: 12000,

                })

              : reject(Error()),

          );

      const pos = {

        name: "Ma position",

        lat: p.coords.latitude,

        lon: p.coords.longitude,

      };

      changeFrom(pos);

      positionLayer.current.clearLayers();

      L.circleMarker([pos.lat, pos.lon], {

        radius: 8,

        color: "#fff",

        weight: 3,

        fillColor: "#00a8e8",

        fillOpacity: 1,

      }).addTo(positionLayer.current);

      map.current.setView([pos.lat, pos.lon], 16);

      setToast("Position trouvée");

    } catch {

      setToast("Position indisponible. Choisissez un arrêt ou une adresse.");

    } finally {

      setLocating(false);

    }

  }

  const [reportPhoto,setReportPhoto]=useState(null),[photoBusy,setPhotoBusy]=useState(false);
  const [reportIntent,setReportIntent]=useState(false);
  function startReport() {
    setReportPhoto(null);setPhotoBusy(false);

    setSelected(null);

    setReportError("");

    setChosenStop(null);

    setChosenRoute("");

    setStopQuery("");

    const signedIn=!!sessionStorage.getItem('passage-account:'+serverURL);
    setReportIntent(!signedIn);
    setModal(signedIn?'report':'report-login');

  }

  async function publish() {

    if (!chosenStop || !chosenRoute || photoBusy || busy) return;

    setBusy(true);

    setReportError("");

    try {

      await request("/reports", {

        method: "POST",

        body: {

          mode: reportMode,

          stopId:

            chosenStop.members?.find((s) => s.lines.includes(chosenRoute))

              ?.id || chosenStop.id,

          routeId: chosenRoute,
          ...(reportPhoto?{photo:reportPhoto}:{}),

        },

      });

      setReportIntent(false);
      setModal(null);

      setRefresh((n) => n + 1);

      map.current.setView([chosenStop.lat, chosenStop.lon], 16);

      setToast("Merci ! Signalement partagé pendant 15 minutes.");

    } catch (e) {

      setReportError(e.message);
      if(e.code==='ACCOUNT_REQUIRED'||e.code==='REPORT_SESSION_CONFLICT') {
        if(e.code==='ACCOUNT_REQUIRED')sessionStorage.removeItem('passage-account:'+serverURL);
        setReportIntent(true);setModal('report-login');
      }

    } finally {

      setBusy(false);

    }

  }

  async function vote(value) {

    setBusy(true);

    try {

      await request("/reports/" + selected.id + "/votes", {

        method: "POST",

        body: { value },

      });

      setSelected(null);

      setRefresh((n) => n + 1);

      setToast("Merci pour votre confirmation.");

    } catch (e) {

      setToast(e.message);

    } finally {

      setBusy(false);

    }

  }

  async function remove() {

    setBusy(true);

    try {

      await request("/reports/" + selected.id, { method: "DELETE" });

      setSelected(null);

      setRefresh((n) => n + 1);

      setToast("Votre signalement a été retiré.");

    } catch (e) {

      setToast(e.message);

    } finally {

      setBusy(false);

    }

  }

  const stopResults = useMemo(() => {

    return groupStops(

      transit.stops.filter((s) =>

        s.lines.some((id) => routes.get(id)?.mode === reportMode),

      ),

    )

      .filter((s) => normalize(s.name).includes(normalize(stopQuery)))

      .sort(

        (a, b) =>

          distance(a, from || { lat: centre[0], lon: centre[1] }) -

          distance(b, from || { lat: centre[0], lon: centre[1] }),

      )

      .slice(0, 6);

  }, [transit, routes, reportMode, stopQuery, from]);

  const age = (r) => Math.max(0, Math.floor((now - r.created) / 60000));

  return (

    <main className={"view-"+view+" sheet-"+sheetSize} style={{ "--sheet-height": sheetHeight + "px" }}>

      <div ref={mapEl} id="map" aria-label="Carte interactive de Lille" />

      <aside className="panel">

        <header className="brand-row">

          <IconButton label="Ouvrir le menu" onClick={() => setMenu(!menu)}>

            <Menu />

          </IconButton>

          <a className="brand" href="./">

            passage<span>.</span>

          </a>

          <span className="beta">LILLE</span>

        </header>

        {menu && (

          <nav className="menu" aria-label="Menu principal">
<button onClick={()=>{setModal("account");setMenu(false);}}><UserRound size={19}/>Mon compte</button>

            {[['map','Carte',MapIcon],['route','Itinéraires',Route],['reports','Signalements',Flag]].map(([id,label,Icon])=><button key={id} onClick={()=>{setView(id);setMenu(false);}} aria-current={view===id?'page':undefined}><Icon size={19}/>{label}</button>)}

            <button

              onClick={() => {

                setModal("settings");

                setMenu(false);

              }}

            >

              <Settings size={19} />

              Réglages

            </button>

            <button

              onClick={() => {

                setModal("about");

                setMenu(false);

              }}

            >

              <Info size={19} />À propos et confidentialité

            </button>

          </nav>

        )}

        {view === 'map' && <section className="map-home" aria-label="Explorer Lille">

          <div className="home-heading"><div><h1>On va où ?</h1></div><span className="home-symbol"><Footprints size={26}/></span></div>

          <SearchField label="Où allez-vous ?" value={to} onSelect={p=>{changeTo(p);if(p)setView('route');}} transit={transit.stops} routes={routes}/>

          <HomeFavorites refresh={modal} onLaunch={launchFavorite} onConfigure={()=>setModal('account')} renderSearch={props=><SearchField {...props} transit={transit.stops} routes={routes}/>} renderDialog={props=><Modal {...props}/>}/>

          <NearbyDepartures stops={transit.stops} routes={routes}/>

          {route ? <button className="resume-journey" onClick={()=>setView('route')}><Navigation size={20}/><span><strong>{to?.name}</strong><small>{Math.ceil(route.duration/60)} min · Reprendre l’itinéraire</small></span><ChevronRight size={18}/></button> : null}

          <button className="community-preview" onClick={()=>setView('reports')}><span className="community-dot"/><span>{loadError?'Infos du quartier indisponibles':`${visible.length} signalement${visible.length>1?'s':''} autour de vous`}</span><ChevronRight size={16}/></button>

        </section>}

        {view === 'route' && <div className={"route-workspace "+(guideIndex!==null?"guiding":"")} tabIndex={0} aria-label="Recherche et résultats d’itinéraires">

        <SheetHandle size={sheetSize} onChange={setSheetSize}/>

        <button className="collapsed-route" onClick={()=>setSheetSize('normal')}><Navigation size={20}/><span><strong>{to?.name||'Votre itinéraire'}</strong><small>{route?Math.ceil(route.duration/60)+' min · Afficher le trajet':'Choisir un départ et une destination'}</small></span><ChevronRight size={18}/></button>

        <div className="journey">

          <div className="journey-title">

            <h1>Votre itinéraire</h1><button className="close-route" aria-label="Revenir à la carte" onClick={()=>setView("map")}><X size={20}/></button>

          </div>

          <div className="journey-fields">

            <div className="journey-dots">

              <span />

              <i />

              <MapPin size={23} />

            </div>

            <div className="fields">

              <SearchField

                label="Choisissez un départ"

                value={from}

                onSelect={changeFrom}

                transit={transit.stops}

                routes={routes}

              />

              <SearchField

                label="Choisissez une destination"

                value={to}

                onSelect={changeTo}

                transit={transit.stops}

                routes={routes}

              />

            </div>

            <IconButton

              label="Inverser le trajet"

              onClick={() => {

                changeFrom(to);

                changeTo(from);

              }}

            >

              <ArrowUpDown size={20} />

            </IconButton>

          </div>

          <div className="departure">

            <button onClick={()=>setShowDeparture(!showDeparture)} aria-expanded={showDeparture}><Clock size={17}/>{departAt?new Date(departAt).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Partir maintenant'}</button>

            <button onClick={locate} disabled={locating}>

              <LocateFixed size={16} />

              {locating ? "Recherche…" : "Ma position"}

            </button>

          </div>

          {showDeparture&&<DeparturePicker value={departAt} onChange={value=>{setDepartAt(value);setRoute(null);setShowDeparture(false);routeSeq.current++;setRouting(false);}} onNow={()=>{setDepartAt('');setRoute(null);setShowDeparture(false);routeSeq.current++;setRouting(false);}}/>}

          <div hidden={!routing} className={'auto-routing '+(routing?'calculating':'')} role="status" aria-live="polite">{routing?<><LoaderCircle size={17} className="spin"/><span>On compare les meilleurs trajets…<small>Marche, bus, métro et tram</small></span></>:<><Route size={16}/><span>Le meilleur trajet, automatiquement.</span></>}</div>

          {resumeGuidance.current&&<button className="cancel-guidance" onClick={()=>{resumeGuidance.current=false;routeSeq.current++;setRouting(false);setRouteError('Guidage arrêté. Vous pouvez relancer la recherche.');}}>Arrêter le recalcul et le guidage</button>}

          {routeError && (

            <p className="inline-error" role="alert">

              {routeError} <button onClick={calculate} disabled={routing||!from||!to}>Réessayer</button>

            </p>

          )}

          {dataError && (

            <p className="inline-error" role="alert">

              {dataError}

            </p>

          )}

        </div>

        {route && guideIndex===null && <JourneyResults onStart={()=>{setGuideIndex(0);setSheetSize('normal');}} journeys={journeys} route={route} onSelect={r=>{setRoute(r);setGuideIndex(null);}} onMap={()=>setView('map')} onRefresh={calculate} from={from} to={to} warning={journeyWarning}/>}

        {route&&guideIndex!==null&&<Guidance route={route} steps={guideSteps} index={guideIndex} onIndex={setGuideIndex} canAutoReplan={()=>Date.now()-lastAutoReplan.current>90000} onStop={()=>{resumeGuidance.current=false;setGuideIndex(null);setSheetSize('normal');}} onPosition={setGuidePosition} onReplan={(position,place,automatic=false)=>{setGuideIndex(null);setDepartAt('');changeFrom(position?{...position}:place?{...place}:null);if(automatic){resumeGuidance.current=true;lastAutoReplan.current=Date.now();}setSheetSize('normal');}}/>}

        {!route&&!routing&&!routeError&&<div className="route-placeholder"><span><TrainFront size={25}/><Bus size={25}/><Footprints size={25}/></span><h2>{to&&!from?'D’où partez-vous ?':'Où allez-vous ?'}</h2><p>{to&&!from?'Choisissez votre départ ou utilisez votre position.':'Choisissez votre départ et votre destination.'}</p></div>}

        </div>}

        {view === 'reports' && <section className="activity" tabIndex={0} aria-label="Signalements du quartier">



          <div className="section-label">

            <span>AUTOUR DE VOUS</span>

            <span className={"live " + (loadError ? "disconnected" : "")}>

              <i />

              {loadError ? "Hors connexion" : "En direct"}

            </span>

          </div>

          <h2>

            Les infos du quartier <span>{visible.length}</span>

          </h2>

          <div className="filters">

            {Object.entries(modes).map(([id, { label, Icon }]) => (

              <button

                key={id}

                aria-pressed={filters.includes(id)}

                onClick={() =>

                  setFilters((f) =>

                    f.includes(id) ? f.filter((x) => x !== id) : [...f, id],

                  )

                }

              >

                <Icon size={16} />

                {label}

              </button>

            ))}

          </div>

          {loadError ? (

            <div className="connection-error">

              <WifiOff size={22} />

              <p>{loadError}</p>

              <button onClick={() => setRefresh((n) => n + 1)}>

                <RefreshCw size={15} />

                Réessayer

              </button>

            </div>

          ) : loading ? (

            <p className="muted loading">Chargement des signalements…</p>

          ) : visible.length ? (

            <div className="report-list">

              {visible.map((r) => {

                const Icon = modes[r.mode].Icon;

                return (

                  <button

                    className="report-row"

                    key={r.id}

                    onClick={() => {

                      setSelected(r);

                      map.current.panTo([r.lat, r.lon]);

                    }}

                  >

                    <span className="report-symbol">

                      <Icon size={20} />

                    </span>

                    <span>

                      <strong>Contrôle · {r.place}</strong>

                      <small>

                        {modes[r.mode].label} {r.line} ·{" "}

                        {age(r) === 0 ? "À l’instant" : `Il y a ${age(r)} min`}

                      </small>

                    </span>

                    <ChevronRight size={17} />

                  </button>

                );

              })}

            </div>

          ) : (

            <div className="empty">

              <span>

                <ShieldCheck size={29} />

              </span>

              <strong>Aucun contrôle signalé ici</strong>

              <p>

                Vous avez une info ? Partagez-la

                <br />

                avec les autres voyageurs.

              </p>

            </div>

          )}

          <p className="community-note">

            <Info size={13} />

            Les signalements ne garantissent pas l’absence de contrôle.

          </p>

        </section>}

        <footer className="panel-footer">

          <span>Fait pour ceux qui marchent.</span>

          <button onClick={() => setModal("about")}>

            À propos <ArrowUpRight size={13} />

          </button>

        </footer>

      </aside>

      {guideIndex!==null&&!followGPS&&<button className="navigation-recenter" onClick={()=>setFollowGPS(true)}><LocateFixed size={17}/>Recentrer</button>}
      <nav className="app-dock" aria-label="Navigation principale">{[['map','Carte',MapIcon],['route','Itinéraires',Route],['reports','Signalements',Flag]].map(([id,label,Icon])=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>{setView(id);setMenu(false);}}><Icon size={22}/><span>{label}</span></button>)}</nav>

      <div className="map-top">

        <span className="city-pill">

          <MapPin size={16} />

          Lille <span>· Métropole</span>

        </span>

        <button className="desktop-about" onClick={() => setModal("about")}>

          La ville se partage <ArrowUpRight size={16} />

        </button>

      </div>

      <div className="map-controls">

        <IconButton

          label="Couches de la carte"

          onClick={() => setModal("layers")}

        >

          <Layers />

        </IconButton>

        <IconButton label="Me localiser" onClick={locate} disabled={locating}>

          <LocateFixed />

        </IconButton>

        <div className="zoom">

          <IconButton label="Zoom avant" onClick={() => map.current.zoomIn()}>

            <Plus />

          </IconButton>

          <IconButton

            label="Zoom arrière"

            onClick={() => map.current.zoomOut()}

          >

            <Minus />

          </IconButton>

        </div>

      </div>

      <button className="report-fab" aria-label="Signaler un contrôle" onClick={startReport}>

        <Flag size={23} />

        <span>Signaler un contrôle</span>

        <Plus size={20} />

      </button>

      <div className="map-credit">

        <a

          href="https://www.openstreetmap.org/fixthemap"

          target="_blank"

          rel="noreferrer"

        >

          Corriger la carte

        </a>

        <span>Arrêts © Ilévia / MEL</span>

      </div>

      {toast && (

        <div role="status" className="toast">

          {toast}

          <button onClick={() => setToast("")} aria-label="Fermer le message">

            <X size={16} />

          </button>

        </div>

      )}

      {selected && (

        <Modal title="Contrôle signalé" onClose={() => setSelected(null)}>

          <div className="report-detail">

            <span className="report-symbol large">

              {React.createElement(modes[selected.mode].Icon, { size: 30 })}

            </span>

            <h3>{selected.place}</h3>
            {selected.author&&<div className="report-author"><span>{selected.author.hasAvatar?<img src={(serverURL||'')+'/api/reports/'+selected.id+'/avatar'} alt="" onError={e=>{e.currentTarget.style.display='none';}}/>:selected.author.name.slice(0,1).toUpperCase()}</span><div><small>Signalé par</small><strong>{selected.author.name}</strong></div></div>}
            {!!selected.hasPhoto&&<figure className="report-photo"><img src={(serverURL||'')+'/api/reports/'+selected.id+'/photo'} alt="Photo jointe à ce signalement"/><figcaption>Photo partagée · non vérifiée</figcaption></figure>}

            <p>

              <Line name={selected.line} />

              {modes[selected.mode].label} ·{" "}

              {age(selected) === 0

                ? "À l’instant"

                : `Il y a ${age(selected)} min`}

            </p>

            <div className="detail-meta">

              <span>

                <ThumbsUp size={17} />

                {selected.confirmations} confirmation

                {selected.confirmations !== 1 ? "s" : ""}

              </span>

              <span>

                <Clock size={17} />

                Expire dans{" "}

                {Math.max(0, Math.ceil((selected.expires - now) / 60000))} min

              </span>

            </div>

            {selected.own ? (

              <>

                <p className="muted">Vous avez partagé ce signalement.</p>

                <button

                  className="secondary full"

                  onClick={remove}

                  disabled={busy}

                >

                  Retirer mon signalement

                </button>

              </>

            ) : selected.vote !== null ? (

              <p className="confirmation-note">

                <Check size={18} />

                Votre avis est enregistré.

              </p>

            ) : (

              <>

                <h4>Toujours sur place ?</h4>

                <div className="vote-actions">

                  <button

                    className="primary"

                    onClick={() => vote(1)}

                    disabled={busy}

                  >

                    <ThumbsUp size={18} />

                    Toujours là

                  </button>

                  <button

                    className="secondary"

                    onClick={() => vote(-1)}

                    disabled={busy}

                  >

                    <EyeOff size={18} />

                    Plus là

                  </button>

                </div>

              </>

            )}

          </div>

        </Modal>

      )}

      {modal === 'report-login' && <Modal title="Partager une info" onClose={()=>{setReportIntent(false);setModal(null);}}>
        <div className="report-login"><div className="account-avatar"><UserRound size={30}/></div><h2>Un compte pour signaler</h2><p>Connectez-vous ou créez un compte pour publier et retrouver vos signalements.</p><p className="report-login-note">La carte et les signalements restent consultables sans compte.</p>{reportError&&<p className="inline-error" role="alert">{reportError} Votre brouillon reste disponible ici.</p>}<button className="primary account-submit" onClick={()=>setModal('account')}><UserRound size={18}/>Se connecter ou créer un compte</button><button className="account-logout" onClick={()=>{setReportIntent(false);setModal(null);}}>Revenir à la carte</button></div>
      </Modal>}

      {modal === "report" && (

        <Modal

          title="Partager une info"

          onClose={() => !busy && setModal(null)}

        >

          <div className="modal-body">

            <p className="muted">Vous venez de voir un contrôle ? Votre pseudo et votre photo de profil seront visibles avec ce signalement.</p>

            <div className="transport-choice">

              {Object.entries(modes).map(([id, { label, Icon }]) => (

                <button

                  key={id}

                  className={reportMode === id ? "chosen" : ""}

                  aria-pressed={reportMode === id}

                  onClick={() => {

                    setReportMode(id);

                    setChosenStop(null);

                    setChosenRoute("");

                  }}

                >

                  <Icon size={28} />

                  {label}

                </button>

              ))}

            </div>

            <label className="label" htmlFor="stop-search">

              À quel arrêt ?

            </label>

            <div className="input-wrap">

              <Search size={18} />

              <input

                id="stop-search"

                placeholder="Rechercher un arrêt à Lille"

                value={stopQuery}

                onChange={(e) => {

                  setStopQuery(e.target.value);

                  setChosenStop(null);

                  setChosenRoute("");

                }}

              />

            </div>

            <div className="stop-list">

              {!chosenStop ? (

                stopResults.map((s) => (

                  <button

                    key={s.id}

                    onClick={() => {

                      setChosenStop(s);

                      setStopQuery(s.name);

                      setChosenRoute(

                        s.lines.find(

                          (id) => routes.get(id)?.mode === reportMode,

                        ) || "",

                      );

                    }}

                  >

                    <MapPin size={18} />

                    <span>{s.name}</span>

                    <ChevronRight size={16} />

                  </button>

                ))

              ) : (

                <div className="selected-stop">

                  <Check size={18} />

                  {chosenStop.name}

                </div>

              )}

              {!chosenStop && !stopResults.length && (

                <p className="muted">Aucun arrêt trouvé pour ce transport.</p>

              )}

            </div>

            {chosenStop && (

              <>

                <label className="label" htmlFor="report-line">

                  Sur quelle ligne ?

                </label>

                <div id="report-line" className="line-picker" role="group" aria-label="Sur quelle ligne ?">{chosenStop.lines.filter(id=>routes.get(id)?.mode===reportMode).map(id=><button type="button" key={id} aria-pressed={chosenRoute===id} onClick={()=>setChosenRoute(id)}><span className="line">{routes.get(id).name}</span><span>{routes.get(id).title}</span>{chosenRoute===id&&<Check size={17}/>}</button>)}</div>

              </>

            )}

            <PhotoEvidence value={reportPhoto} onChange={setReportPhoto} onBusy={setPhotoBusy} disabled={busy||photoBusy}/>
            <p className="report-hint">

              <Clock size={18} />

              Visible 15 minutes, puis prolongé si confirmé.

            </p>

            {reportError && (

              <p className="inline-error" role="alert">

                {reportError}

              </p>

            )}

            <button

              className="primary full"

              onClick={publish}

              disabled={!chosenStop || !chosenRoute || busy || photoBusy}

            >

              <Flag size={18} />

              {busy ? "Envoi…" : "Partager le signalement"}

            </button>

            <p className="small-print">

              Signalez une présence observée. La photo est facultative et non vérifiée.

            </p>

          </div>

        </Modal>

      )}

      {modal === "layers" && (

        <Modal title="Afficher sur la carte" onClose={() => setModal(null)}>

          <div className="modal-body">

            <label className="toggle-row">

              <span>

                <TrainFront />

                Stations de métro

              </span>

              <input

                type="checkbox"

                checked={showStops}

                onChange={(e) => setShowStops(e.target.checked)}

              />

            </label>

            <p className="muted">

              Touchez une station pour la choisir comme destination.

            </p>

            {Object.entries(modes).map(([id, { label, Icon }]) => (

              <label className="toggle-row" key={id}>

                <span>

                  <Icon />

                  Contrôles {label.toLowerCase()}

                </span>

                <input

                  type="checkbox"

                  checked={filters.includes(id)}

                  onChange={() =>

                    setFilters((f) =>

                      f.includes(id) ? f.filter((x) => x !== id) : [...f, id],

                    )

                  }

                />

              </label>

            ))}

          </div>

        </Modal>

      )}

      {modal === "account" && <Modal title="Mon compte" closeDisabled={accountGuard} onClose={()=>{if(!accountGuard){setReportIntent(false);setModal(null);}}}><Account onGuard={setAccountGuard} onContinue={reportIntent?()=>{setReportIntent(false);setReportError('');setModal('report');}:undefined} currentTrip={{from,to,steps:guideSteps}} renderSearch={props=><SearchField {...props} transit={transit.stops} routes={routes}/>} onLaunch={launchFavorite}/></Modal>}

      {modal === "settings" && (

        <Modal title="Réglages" onClose={() => setModal(null)}>

          <div className="modal-body">

            <h3>Lille & sa métropole</h3>

            <p className="muted">

              {transit.stops.length.toLocaleString("fr-FR")} arrêts ·{" "}

              {transit.routes.length} lignes Ilévia.

              <br />

              Données importées le {transit.imported}.

            </p>

            {native && (

              <>

                <label className="label" htmlFor="server">

                  Adresse du serveur Passage

                </label>

                <input

                  id="server"

                  className="plain-input"

                  type="url"

                  placeholder="https://votre-serveur.fr"

                  value={server}

                  onChange={(e) => setServer(e.target.value)}

                />

                <p className="muted">

                  Le site et l’application doivent utiliser le même serveur pour

                  partager les signalements.

                </p>

                <button

                  className="primary full"

                  onClick={() => {

                    try {

                      configureServer(server);

                    } catch (e) {

                      setToast(e.message);

                    }

                  }}

                >

                  Connecter le serveur

                </button>

              </>

            )}

            <button

              className="secondary full"

              onClick={() => setModal("about")}

            >

              Confidentialité et données

            </button>

          </div>

        </Modal>

      )}

      {modal === "about" && (

        <Modal title="Bienvenue sur Passage" onClose={() => setModal(null)}>

          <div className="modal-body about">

            <div className="brand">

              passage<span>.</span>

            </div>

            <p>

              Votre carte à pied de Lille et des infos partagées par les

              voyageurs du bus, du métro et du tram.

            </p>

            <h3>Des informations éphémères</h3>

            <p>

              Un signalement dure 15 minutes, jusqu’à 30 minutes après

              confirmations. Deux avis « Plus là » le retirent. Une session peut

              donner un avis par signalement. Les informations restent

              déclaratives.

            </p>

            <h3>Vos données</h3>

            <p>

              Pas de compte ni de suivi en arrière-plan. La localisation n’est

              demandée qu’à votre initiative. Les recherches d’adresses sont

              envoyées à Nominatim, les points de trajet à FOSSGIS / OSRM et les

              zones de carte à OpenStreetMap. Les signalements sont publics,

              sans votre identité. Un identifiant aléatoire mémorise votre

              session pendant 30 jours. Si vous créez un compte, votre pseudo, votre e-mail et un hachage de votre mot de passe sont conservés sur le serveur. La session de compte expire après 7 jours. Les signalements expirés sont supprimés

              du serveur sous 24 heures.

            </p>

            <h3>Sources et crédits</h3>

            <p>

              Arrêts et lignes : Ilévia / Métropole Européenne de Lille (GTFS).

              Carte : contributeurs OpenStreetMap. Itinéraires : OSRM / FOSSGIS.

              Distances : Turf, adapté du dépôt wazeHQ/turf (MIT). Passage est

              un projet indépendant.

            </p>

            <a href="./licenses/turf-MIT.txt" target="_blank" rel="noreferrer">

              Licence Turf <ArrowUpRight size={14} />

            </a>

            <a

              href="https://transport.data.gouv.fr/datasets/ilevia-localisation-des-arrets-bus-metro-et-tram-gtfs"

              target="_blank"

              rel="noreferrer"

            >

              Données du réseau <ArrowUpRight size={14} />

            </a>

            <p className="small-print">

              Version de développement 0.2 · Horaires théoriques Ilévia, sans

              guidage vocal.

            </p>

          </div>

        </Modal>

      )}

    </main>

  );

}







