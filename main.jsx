import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STATIONS = [
  ["Jurong East","JE",1.3331,103.7422],["Boon Lay","EW27",1.3387,103.7056],
  ["Clementi","EW23",1.3151,103.7652],["Buona Vista","EW21",1.3073,103.7906],
  ["Queenstown","EW19",1.2944,103.8060],["Tiong Bahru","EW17",1.2862,103.8271],
  ["Outram Park","EW16",1.2806,103.8390],["Tanjong Pagar","EW15",1.2764,103.8459],
  ["Raffles Place","EW14",1.2839,103.8515],["City Hall","EW13",1.2931,103.8520],
  ["Bugis","EW12",1.3009,103.8567],["Lavender","EW11",1.3074,103.8631],
  ["Kallang","EW10",1.3115,103.8714],["Paya Lebar","EW8",1.3179,103.8926],
  ["Bedok","EW5",1.3240,103.9300],["Tampines","EW2",1.3532,103.9451],
  ["Pasir Ris","EW1",1.3730,103.9493],["Woodlands","NS9",1.4368,103.7865],
  ["Yishun","NS13",1.4294,103.8350],["Khatib","NS14",1.4174,103.8329],
  ["Ang Mo Kio","NS16",1.3694,103.8497],["Bishan","NS17",1.3513,103.8491],
  ["Novena","NS20",1.3204,103.8438],["Newton","NS21",1.3123,103.8379],
  ["Orchard","NS22",1.3036,103.8320],["Dhoby Ghaut","NS24",1.2989,103.8462],
  ["Marina Bay","NS27",1.2761,103.8547],["HarbourFront","NE1",1.2653,103.8215],
  ["Chinatown","NE4",1.2844,103.8437],["Little India","NE7",1.3066,103.8490],
  ["Serangoon","NE12",1.3496,103.8738],["Sengkang","NE16",1.3916,103.8950],
  ["Punggol","NE17",1.4051,103.9020],["Pasir Panjang","CC26",1.2762,103.7915],
  ["Kent Ridge","CC24",1.2935,103.7846],["Haw Par Villa","CC25",1.2826,103.7819],
  ["Botanic Gardens","CC19",1.3221,103.8168],["Caldecott","CC17",1.3376,103.8395],
  ["MacPherson","CC10",1.3269,103.8896],["Dakota","CC8",1.3084,103.8886],
  ["Mountbatten","CC7",1.3063,103.8822],["Esplanade","CC3",1.2937,103.8558],
  ["Promenade","CC4",1.2930,103.8611],["Bayfront","CE1",1.2819,103.8591],
  ["Stevens","DT10",1.3201,103.8264],["Little India","DT12",1.3068,103.8503],
  ["Fort Canning","DT20",1.2925,103.8442],["Downtown","DT17",1.2794,103.8521],
  ["Telok Ayer","DT18",1.2820,103.8485],["Expo","CG1",1.3354,103.9616],
  ["Tampines West","DT31",1.3455,103.9380],["Bedok North","DT29",1.3347,103.9179],
  ["Springleaf","TE4",1.3973,103.8175],["Lentor","TE5",1.3857,103.8357],
  ["Great World","TE15",1.2930,103.8270],["Orchard Boulevard","TE13",1.3021,103.8238],
  ["Shenton Way","TE19",1.2763,103.8500],["Gardens by the Bay","TE22",1.2786,103.8675]
].map(([name,code,lat,lon]) => ({name,code,lat,lon}));

const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

function distanceKm(a,b) {
  const R = 6371;
  const p1 = rad(a.lat), p2 = rad(b.lat);
  const dp = rad(b.lat-a.lat), dl = rad(b.lon-a.lon);
  const x = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function bearing(a,b) {
  const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon-a.lon);
  const y = Math.sin(dl)*Math.cos(p2);
  const x = Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (deg(Math.atan2(y,x))+360)%360;
}
function hashDate(s) {
  let h=2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h,16777619); }
  return h >>> 0;
}
function dailyPair() {
  const date = new Date().toLocaleDateString("en-CA", {timeZone:"Asia/Singapore"});
  const h = hashDate(date);
  const i = h % STATIONS.length;
  const j = Math.floor(h / STATIONS.length) % STATIONS.length;
  return [STATIONS[i], STATIONS[j === i ? (j+1)%STATIONS.length : j]];
}
function scoreDistance(error) { return Math.max(0, 100 - error * 18); }
function scoreBearing(error) { return Math.max(0, 100 - error * 2); }

function App() {
  const [from,to] = useMemo(dailyPair,[]);
  const [distance,setDistance] = useState("");
  const [bearingGuess,setBearingGuess] = useState("");
  const [result,setResult] = useState(null);

  const actualDistance = distanceKm(from,to);
  const actualBearing = bearing(from,to);

  function submit(e) {
    e.preventDefault();
    const d = Number(distance), b = Number(bearingGuess);
    if (!Number.isFinite(d) || !Number.isFinite(b) || d < 0 || b < 0 || b > 360) return;
    const dErr = Math.abs(d-actualDistance);
    const bRaw = Math.abs(b-actualBearing);
    const bErr = Math.min(bRaw,360-bRaw);
    const ds = scoreDistance(dErr), bs = scoreBearing(bErr);
    setResult({dErr,bErr,ds,bs,total:Math.round((ds+bs)/2)});
  }
  function reset(){setDistance("");setBearingGuess("");setResult(null)}

  return <main>
    <header>
      <div className="brand"><span className="dot"/> MRT BEARINGS</div>
      <div className="date">DAILY CHALLENGE · SINGAPORE</div>
    </header>

    <section className="hero">
      <p className="eyebrow">NO MAP. JUST INSTINCT.</p>
      <h1>How well do you know<br/><em>Singapore?</em></h1>
      <p className="sub">Guess the straight-line distance and compass bearing between two MRT stations.</p>
    </section>

    <section className="card">
      <div className="route">
        <div><span>FROM</span><strong>{from.name}</strong><small>{from.code}</small></div>
        <div className="arrow">→</div>
        <div className="right"><span>TO</span><strong>{to.name}</strong><small>{to.code}</small></div>
      </div>

      {!result ? <form onSubmit={submit}>
        <div className="inputs">
          <label>STRAIGHT-LINE DISTANCE
            <div className="input"><input inputMode="decimal" placeholder="0.0" value={distance} onChange={e=>setDistance(e.target.value)}/><span>km</span></div>
          </label>
          <label>INITIAL BEARING
            <div className="input"><input inputMode="decimal" placeholder="000" value={bearingGuess} onChange={e=>setBearingGuess(e.target.value)}/><span>°</span></div>
          </label>
        </div>
        <button>LOCK IN GUESS <span>↗</span></button>
      </form> : <div className="results">
        <div className="score">{result.total}<span>/100</span></div>
        <div className="resultGrid">
          <div><span>DISTANCE</span><strong>{actualDistance.toFixed(2)} km</strong><small>{result.dErr.toFixed(2)} km off</small></div>
          <div><span>BEARING</span><strong>{Math.round(actualBearing)}°</strong><small>{result.bErr.toFixed(0)}° off</small></div>
        </div>
        <button onClick={reset} className="secondary">TRY AGAIN</button>
      </div>}
    </section>

    <footer><span>ONE CHALLENGE. EVERY DAY.</span><span>© {new Date().getFullYear()} MRT BEARINGS</span></footer>
  </main>
}

createRoot(document.getElementById("root")).render(<App />);
