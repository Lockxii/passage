import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import JourneyResults from '../../src/JourneyResults.jsx';
import {rankJourneys,readPreference} from '../../src/journey-preferences.js';
import '../../src/style.css';
const base=Date.now()/1000;
const journeys=[{id:'fast',duration:1200,walking:600,changes:1,boardings:2},{id:'walk',duration:1500,walking:180,changes:0,boardings:1}].map(j=>({...j,departure:base,arrival:base+j.duration,legs:Array.from({length:j.boardings},(_,i)=>({kind:'transit',mode:'metro',line:i?'M2':'M1',from:{name:'Gare Lille Flandres'},to:{name:'République Beaux-Arts'}}))}));
function App(){const [route,setRoute]=useState(()=>rankJourneys(journeys,readPreference())[0]);return <main style={{height:'100dvh',overflow:'auto',padding:16,background:'white'}}><small style={{color:'#007f9b'}}>PASSAGE · TRAJETS DE DÉMONSTRATION</small><h2>Votre itinéraire</h2><JourneyResults journeys={journeys} route={route} onSelect={setRoute} onMap={()=>{}} onRefresh={()=>{}} onStart={()=>{}}/><small>Scénarios fictifs · aucune position personnelle</small></main>}
createRoot(document.getElementById('root')).render(<App/>);
