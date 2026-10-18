// Development-only harness: real Guidance component, fictional journey and public stop coordinates.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Guidance from '../../src/Guidance.jsx';
import {guidanceSteps} from '../../src/guidance.js';
import '../../src/style.css';
let update;Object.defineProperty(navigator,'geolocation',{value:{watchPosition(callback){update=callback;return 1;},clearWatch(){update=null;}}});
let vibrations=0;Object.defineProperty(navigator,'vibrate',{value:()=>{vibrations++;document.getElementById('vibrations').textContent=String(vibrations);return true;}});
const from={name:'Gare Lille Flandres',lat:50.636,lon:3.069},to={name:'République Beaux-Arts',lat:50.6304,lon:3.0606};
const route={arrival:Date.now()/1000+600,legs:[{kind:'transit',mode:'metro',line:'M1',from,to,headsign:'CHU Eurasanté',start:Date.now()/1000+60,stopCount:2}]};
const steps=guidanceSteps(route,from,to),noop=()=>{};
function App(){const [index,setIndex]=useState(0);return <main style={{height:'100dvh',overflow:'auto',background:'#fff',padding:16}}><header style={{fontSize:12,paddingBottom:12,color:'#007f9b'}}>PASSAGE · DÉMO GPS SIMULÉ</header><Guidance route={route} steps={steps} index={index} onIndex={setIndex} onStop={()=>setIndex(0)} onPosition={noop} onReplan={noop} canAutoReplan={()=>false}/><section style={{borderTop:'1px solid #ddd',paddingTop:12,fontSize:12}}><p>Contrôles de test · aucun GPS réel</p><button onClick={()=>update?.({timestamp:Date.now(),coords:{latitude:to.lat,longitude:to.lon,accuracy:8}})}>Envoyer une position proche</button><p>Vibrations simulées : <span id="vibrations">0</span></p><small>Lieux publics · trajet de démonstration</small></section></main>}
createRoot(document.getElementById('root')).render(<App/>);
