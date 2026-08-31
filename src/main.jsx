import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { STATIONS } from './stations';

const TOTAL_ROUNDS = 5;
const MAX_DISTANCE = 30;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

function distanceKm(a,b){
  const R=6371,p1=rad(a.lat),p2=rad(b.lat),dp=rad(b.lat-a.lat),dl=rad(b.lon-a.lon);
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function bearing(a,b){
  const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lon-a.lon);
  const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (deg(Math.atan2(y,x))+360)%360;
}
function destinationPoint(start,bearingDeg,distance){
  const R=6371,d=distance/R,br=rad(bearingDeg),p1=rad(start.lat),l1=rad(start.lon);
  const p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(br));
  const l2=l1+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));
  return [deg(p2),((deg(l2)+540)%360)-180];
}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function singaporeDate(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Singapore'})}
function pairForRound(date,round){
  const h=hash(`${date}-round-${round}`);
  const ai=h%STATIONS.length;
  let bi=Math.floor(h/STATIONS.length)%STATIONS.length;
  if(bi===ai) bi=(bi+17)%STATIONS.length;
  return [STATIONS[ai],STATIONS[bi]];
}
const scoreDistance=e=>Math.max(0,100-e*18);
const scoreBearing=e=>Math.max(0,100-e*2);
function directionName(b){
  const dirs=['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(b/45)%8];
}

function Compass({value,onChange,interactive=true,actual=null,guess=null}){
  const ref=useRef(null);
  const dragging=useRef(false);
  const setFromPointer=(e)=>{
    if(!ref.current||!interactive)return;
    const r=ref.current.getBoundingClientRect();
    const x=e.clientX-(r.left+r.width/2), y=e.clientY-(r.top+r.height/2);
    const angle=(deg(Math.atan2(x,-y))+360)%360;
    onChange(Math.round(angle));
  };
  const down=e=>{if(!interactive)return;dragging.current=true;ref.current?.setPointerCapture?.(e.pointerId);setFromPointer(e)};
  const move=e=>{if(dragging.current)setFromPointer(e)};
  const up=()=>{dragging.current=false};
  return <div className={`compass ${interactive?'interactive':''}`} ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
    <div className="compassTicks">{Array.from({length:36},(_,i)=><i key={i} style={{transform:`rotate(${i*10}deg)`}} className={i%3===0?'major':''}/>)}</div>
    <div className="compassLabels"><b>N</b><b>E</b><b>S</b><b>W</b><span className="degree top">0°</span><span className="degree right">90°</span><span className="degree bottom">180°</span><span className="degree left">270°</span></div>
    {actual!==null && <div className="needle actualNeedle" style={{transform:`translate(-50%,-100%) rotate(${actual}deg)`}}><span/></div>}
    {guess!==null && <div className="needle guessNeedle" style={{transform:`translate(-50%,-100%) rotate(${guess}deg)`}}><span/></div>}
    {actual===null && <div className="needle guessNeedle" style={{transform:`translate(-50%,-100%) rotate(${value}deg)`}}><span/></div>}
    <div className="compassCenter"><strong>{Math.round(value)}°</strong><small>{directionName(value)}</small></div>
  </div>;
}

function DistanceSlider({value,onChange,actual=null,guess=null}){
  return <div className="distanceControl">
    <div className="distanceValue">{Number(value).toFixed(1)} <small>km</small></div>
    <div className="sliderWrap">
      {actual!==null && <div className="actualMarker" style={{left:`${Math.min(100,(actual/MAX_DISTANCE)*100)}%`}}><span>ACTUAL</span></div>}
      {guess!==null && <div className="guessMarker" style={{left:`${Math.min(100,(guess/MAX_DISTANCE)*100)}%`}}><span>YOUR GUESS</span></div>}
      <input type="range" min="0.1" max={MAX_DISTANCE} step="0.1" value={value} onChange={e=>onChange(Number(e.target.value))}/>
    </div>
    <div className="rangeLabels"><span>0.1 km</span><span>{MAX_DISTANCE} km</span></div>
  </div>;
}

function MapReveal({from,to,result}){
  const ref=useRef(null),mapRef=useRef(null);
  useEffect(()=>{
    if(!ref.current||mapRef.current)return;
    const map=L.map(ref.current,{zoomControl:true}).setView([1.3521,103.8198],11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    mapRef.current=map; setTimeout(()=>map.invalidateSize(),50);
    return()=>{map.remove();mapRef.current=null};
  },[]);
  useEffect(()=>{
    const map=mapRef.current;if(!map||!result)return;
    const layers=[];
    const actual=L.polyline([[from.lat,from.lon],[to.lat,to.lon]],{weight:5,opacity:.95}).addTo(map);
    const guessEnd=destinationPoint(from,result.guessBearing,result.guessDistance);
    const guess=L.polyline([[from.lat,from.lon],guessEnd],{weight:3,opacity:.85,dashArray:'8 9'}).addTo(map);
    const a=L.circleMarker([from.lat,from.lon],{radius:8,weight:3,fillOpacity:1}).addTo(map);
    const b=L.circleMarker([to.lat,to.lon],{radius:8,weight:3,fillOpacity:1}).addTo(map);
    a.bindTooltip(`${from.name} · ${from.codes}`,{direction:'top'});b.bindTooltip(`${to.name} · ${to.codes}`,{direction:'top'});
    layers.push(actual,guess,a,b);
    map.fitBounds(L.featureGroup(layers).getBounds().pad(.22),{animate:true,duration:.6});
    return()=>layers.forEach(x=>map.removeLayer(x));
  },[from,to,result]);
  return <div className="mapWrap"><div ref={ref} className="map"/><div className="mapLegend"><span><i className="legendActual"/> Actual route</span><span><i className="legendGuess"/> Your guessed route</span></div></div>;
}

function loadDay(date){
  try{return JSON.parse(localStorage.getItem(`mrt-bearings-${date}`)||'{}')}catch{return {}}
}
function saveDay(date,data){localStorage.setItem(`mrt-bearings-${date}`,JSON.stringify(data))}

function App(){
  const date=useMemo(singaporeDate,[]);
  const [day,setDay]=useState(()=>loadDay(date));
  const completed=day.completed||{};
  const firstOpen=Array.from({length:TOTAL_ROUNDS},(_,i)=>i).find(i=>!completed[i]);
  const [round,setRound]=useState(firstOpen ?? TOTAL_ROUNDS-1);
  const [bearingGuess,setBearingGuess]=useState(0);
  const [distance,setDistance]=useState(5);
  const [showResult,setShowResult]=useState(Boolean(completed[round]));
  const [justSubmitted,setJustSubmitted]=useState(false);
  const [from,to]=useMemo(()=>pairForRound(date,round),[date,round]);
  const actualDistance=distanceKm(from,to), actualBearing=bearing(from,to);
  const result=completed[round]||null;

  useEffect(()=>{
    const r=completed[round];
    if(r){setBearingGuess(r.guessBearing);setDistance(r.guessDistance);setShowResult(true)}
    else{setBearingGuess(0);setDistance(Math.min(10,Math.max(.1,Math.round(actualDistance/2*10)/10)));setShowResult(false)}
    setJustSubmitted(false);
  },[round]);

  const totalScore=Object.values(completed).reduce((s,r)=>s+(r?.total||0),0);
  const finished=Object.keys(completed).length>=TOTAL_ROUNDS;

  function submit(e){
    e?.preventDefault();
    if(completed[round])return;
    const d=Number(distance),b=Number(bearingGuess);
    const dErr=Math.abs(d-actualDistance),bErr=Math.min(Math.abs(b-actualBearing),360-Math.abs(b-actualBearing));
    const r={dErr,bErr,total:Math.round((scoreDistance(dErr)+scoreBearing(bErr))/2),guessDistance:d,guessBearing:b};
    const next={...day,completed:{...completed,[round]:r}};
    saveDay(date,next);setDay(next);setShowResult(true);setJustSubmitted(true);
  }
  function nextRound(){if(round<TOTAL_ROUNDS-1){setRound(round+1)}else{window.scrollTo({top:0,behavior:'smooth'})}}
  const currentResult=showResult?result:null;

  return <main>
    <header><div className="brand"><span className="dot"/> MRT BEARINGS</div><div className="daily">DAILY CHALLENGE <span>5 ROUNDS</span></div><div className="progress">{[0,1,2,3,4].map(i=><i key={i} className={completed[i]?'done':i===round?'current':''}/> )}</div></header>
    <section className="hero compact"><div><p className="eyebrow">ROUND {round+1} OF {TOTAL_ROUNDS} · {date}</p><h1>How well do you know <em>Singapore?</em></h1><p className="sub">Guess the straight-line distance and initial compass bearing between these two MRT stations.</p></div><div className="dayScore"><span>TODAY</span><strong>{totalScore}</strong><small>/ 500</small></div></section>

    <section className="card challengeCard">
      <div className="route"><div><span>FROM</span><strong>{from.name}</strong><small>{from.codes}</small></div><div className="arrow">→</div><div className="right"><span>TO</span><strong>{to.name}</strong><small>{to.codes}</small></div></div>
      {!currentResult ? <form onSubmit={submit}>
        <div className="guessGrid">
          <div className="guessPanel"><div className="panelTitle">1. DIRECTION <small>DRAG TO ROTATE</small></div><Compass value={bearingGuess} onChange={setBearingGuess}/><div className="tip">Bearings increase clockwise from North.</div></div>
          <div className="guessPanel"><div className="panelTitle">2. DISTANCE <small>SLIDE TO SET</small></div><DistanceSlider value={distance} onChange={setDistance}/><div className="tip distanceTip">Straight-line distance, not MRT travel distance.</div></div>
        </div>
        <button>SUBMIT GUESS <span>↗</span></button><p className="oneShot">You can only submit once per round.</p>
      </form> : <>
        <div className="resultsHead"><div><span>ROUND SCORE</span><strong>{currentResult.total}<small>/100</small></strong></div><div className="roundMessage">{currentResult.total>=90?'Excellent!':currentResult.total>=70?'Great guess!':'Good effort!'}</div></div>
        <div className="resultVisuals">
          <div className="resultPanel"><div className="panelTitle">CORRECT BEARING <small>YOUR GUESS SHOWN IN AMBER</small></div><Compass value={actualBearing} actual={actualBearing} guess={currentResult.guessBearing} interactive={false}/><div className="compareLine"><span className="legendDot actualDot"/> Actual <strong>{Math.round(actualBearing)}°</strong><span className="legendDot guessDot"/> Your guess <strong>{Math.round(currentResult.guessBearing)}°</strong></div></div>
          <div className="resultPanel"><div className="panelTitle">CORRECT DISTANCE <small>YOUR GUESS SHOWN IN AMBER</small></div><DistanceSlider value={actualDistance} actual={actualDistance} guess={currentResult.guessDistance} onChange={()=>{}}/><div className="compareLine"><span className="legendDot actualDot"/> Actual <strong>{actualDistance.toFixed(2)} km</strong><span className="legendDot guessDot"/> Your guess <strong>{currentResult.guessDistance.toFixed(1)} km</strong></div></div>
        </div>
        <MapReveal from={from} to={to} result={currentResult}/>
        <div className="resultGrid"><div><span>DISTANCE ERROR</span><strong>{currentResult.dErr.toFixed(2)} km</strong></div><div><span>BEARING ERROR</span><strong>{currentResult.bErr.toFixed(0)}°</strong></div></div>
        {round<TOTAL_ROUNDS-1 ? <button onClick={nextRound}>NEXT ROUND <span>→</span></button> : <div className="finalDay"><strong>{finished?'DAILY COMPLETE':'DAY COMPLETE'}</strong><span>{totalScore} / 500</span><small>Come back tomorrow for a new five-round challenge.</small></div>}
      </>}
    </section>
    <footer><span>5 ROUNDS · ONE DAILY CHALLENGE</span><span>143 MRT STATIONS · OPENSTREETMAP</span></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
