import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { STATIONS } from './stations';

const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
function distanceKm(a,b){const R=6371,p1=rad(a.lat),p2=rad(b.lat),dp=rad(b.lat-a.lat),dl=rad(b.lon-a.lon);const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function bearing(a,b){const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lon-a.lon),y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return (deg(Math.atan2(y,x))+360)%360;}
function destinationPoint(start,bearingDeg,distance){const R=6371,d=distance/R,br=rad(bearingDeg),p1=rad(start.lat),l1=rad(start.lon),p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(br)),l2=l1+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));return [deg(p2),((deg(l2)+540)%360)-180];}
function hashDate(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function dailyPair(){const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Singapore'}),h=hashDate(date),a=STATIONS[h%STATIONS.length],b=STATIONS[Math.floor(h/STATIONS.length)%STATIONS.length];return [a,b.name===a.name?STATIONS[(STATIONS.indexOf(b)+1)%STATIONS.length]:b];}
const scoreDistance=e=>Math.max(0,100-e*18),scoreBearing=e=>Math.max(0,100-e*2);

function MapReveal({from,to,result}){
  const ref=useRef(null),mapRef=useRef(null);
  useEffect(()=>{if(!ref.current||mapRef.current)return;const map=L.map(ref.current,{zoomControl:true}).setView([1.3521,103.8198],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);mapRef.current=map;setTimeout(()=>map.invalidateSize(),50);return()=>{map.remove();mapRef.current=null}},[]);
  useEffect(()=>{const map=mapRef.current;if(!map||!result)return;const layers=[];const actual=L.polyline([[from.lat,from.lon],[to.lat,to.lon]],{weight:5,opacity:.95}).addTo(map);const guessEnd=destinationPoint(from,result.guessBearing,distanceKm(from,to));const guess=L.polyline([[from.lat,from.lon],guessEnd],{weight:3,opacity:.85,dashArray:'8 9'}).addTo(map);const a=L.circleMarker([from.lat,from.lon],{radius:8,weight:3,fillOpacity:1}).addTo(map),b=L.circleMarker([to.lat,to.lon],{radius:8,weight:3,fillOpacity:1}).addTo(map);a.bindTooltip(`${from.name} · ${from.codes}`,{direction:'top'});b.bindTooltip(`${to.name} · ${to.codes}`,{direction:'top'});layers.push(actual,guess,a,b);map.fitBounds(L.featureGroup(layers).getBounds().pad(.22),{animate:true,duration:.6});return()=>layers.forEach(x=>map.removeLayer(x));},[from,to,result]);
  return <div className="mapWrap"><div ref={ref} className="map"/>{result&&<div className="mapLegend"><span><i className="legendActual"/> Actual route</span><span><i className="legendGuess"/> Your bearing</span></div>}</div>;
}

function App(){
 const [from,to]=useMemo(dailyPair,[]),[distance,setDistance]=useState(''),[bearingGuess,setBearingGuess]=useState(''),[result,setResult]=useState(null);const actualDistance=distanceKm(from,to),actualBearing=bearing(from,to);
 function submit(e){e.preventDefault();const d=Number(distance),b=Number(bearingGuess);if(!Number.isFinite(d)||!Number.isFinite(b)||d<0||b<0||b>360)return;const dErr=Math.abs(d-actualDistance),bErr=Math.min(Math.abs(b-actualBearing),360-Math.abs(b-actualBearing));setResult({dErr,bErr,total:Math.round((scoreDistance(dErr)+scoreBearing(bErr))/2),guessDistance:d,guessBearing:b});}
 function reset(){setDistance('');setBearingGuess('');setResult(null)}
 return <main><header><div className="brand"><span className="dot"/> MRT BEARINGS</div><div className="date">DAILY CHALLENGE · SINGAPORE</div></header><section className="hero"><p className="eyebrow">NO MAP. JUST INSTINCT.</p><h1>How well do you know<br/><em>Singapore?</em></h1><p className="sub">Guess the straight-line distance and compass bearing between two MRT stations.</p></section><section className="card"><div className="route"><div><span>FROM</span><strong>{from.name}</strong><small>{from.codes}</small></div><div className="arrow">→</div><div className="right"><span>TO</span><strong>{to.name}</strong><small>{to.codes}</small></div></div><MapReveal from={from} to={to} result={result}/>{!result?<form onSubmit={submit}><div className="inputs"><label>STRAIGHT-LINE DISTANCE<div className="input"><input required inputMode="decimal" placeholder="0.0" value={distance} onChange={e=>setDistance(e.target.value)}/><span>km</span></div></label><label>INITIAL BEARING<div className="input"><input required inputMode="decimal" placeholder="000" value={bearingGuess} onChange={e=>setBearingGuess(e.target.value)}/><span>°</span></div></label></div><button>LOCK IN GUESS <span>↗</span></button></form>:<div className="results"><div className="score">{result.total}<span>/100</span></div><div className="resultGrid"><div><span>DISTANCE</span><strong>{actualDistance.toFixed(2)} km</strong><small>Your guess {result.guessDistance.toFixed(2)} km · {result.dErr.toFixed(2)} km off</small></div><div><span>BEARING</span><strong>{Math.round(actualBearing)}°</strong><small>Your guess {Math.round(result.guessBearing)}° · {result.bErr.toFixed(0)}° off</small></div></div><button onClick={reset} className="secondary">TRY AGAIN</button></div>}</section><footer><span>ONE CHALLENGE. EVERY DAY.</span><span>143 MRT STATIONS · OPENSTREETMAP MAP</span></footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
