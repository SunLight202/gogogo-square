const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_W = 800, GAME_H = 400;
canvas.width = GAME_W; canvas.height = GAME_H;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function rnd(a, b) { return a + Math.random() * (b - a); }

// ── Focus & scroll fix ─────────────────────────────────────────────
document.body.setAttribute("tabindex","0");
window.addEventListener("load", () => document.body.focus());
window.addEventListener("keydown", e => {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
}, { passive: false });

// Prevent page scroll/zoom/bounce on mobile
document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
document.addEventListener("touchstart", e => {
    if (e.touches.length > 1) e.preventDefault(); // no pinch zoom
}, { passive: false });
document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", () => {
        keys.left=false; keys.right=false; keys.jump=false;
        player.wantsJump=false;
        document.body.focus();
    });
});

// ── Fullscreen ─────────────────────────────────────────────────────
function resizeCanvas() {
    const isFS     = !!document.fullscreenElement;
    const isMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    if (isMobile) {
        // On mobile, first render the touch bar at its natural size,
        // then use whatever height is left for the canvas.
        const hud   = document.getElementById("hud");
        const touch = document.getElementById("touch-controls");

        // Let the touch bar size itself naturally first
        if (touch) { touch.style.height = ""; }

        const screenW = window.innerWidth;
        const screenH = window.innerHeight
                     || document.documentElement.clientHeight;
        const hudH    = hud   ? hud.getBoundingClientRect().height   : 0;
        const touchH  = touch ? touch.getBoundingClientRect().height : 100;

        const availW = screenW;
        const availH = screenH - hudH - touchH;

        // Scale canvas to fill available area while keeping 2:1 ratio
        const scale = Math.min(availW / GAME_W, availH / GAME_H);
        const w = Math.floor(GAME_W * scale);
        const h = Math.floor(GAME_H * scale);

        canvas.style.width  = w + "px";
        canvas.style.height = h + "px";

        // Game container fills available height so canvas is centered
        const gc = document.getElementById("game-container");
        if (gc) {
            gc.style.width  = screenW + "px";
            gc.style.height = availH + "px";
        }

    } else if (isFS) {
        const hudH   = document.getElementById("hud").offsetHeight;
        const availH = window.innerHeight - hudH;
        const scale  = Math.min(window.innerWidth / GAME_W, availH / GAME_H);
        const w = Math.floor(GAME_W * scale);
        const h = Math.floor(GAME_H * scale);
        canvas.style.width  = w + "px";
        canvas.style.height = h + "px";
        document.getElementById("hud").style.width = w + "px";
        const gc = document.getElementById("game-container");
        if (gc) { gc.style.width = w + "px"; gc.style.height = h + "px"; }

    } else {
        canvas.style.width  = GAME_W + "px";
        canvas.style.height = GAME_H + "px";
        document.getElementById("hud").style.width = "";
        const gc = document.getElementById("game-container");
        if (gc) { gc.style.width = ""; gc.style.height = ""; }
    }
}
document.getElementById("btn-fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
    document.body.focus();
});
document.addEventListener("fullscreenchange", resizeCanvas);
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ══════════════════════════════════════════════════════════════════
// LEVEL DEFINITIONS
// Each level has: meta + platforms + coins + enemies + goal + special
// ══════════════════════════════════════════════════════════════════
const FLOOR_Y = 350;

const LEVEL_DEFS = [
// ─── 0: PRAIRIE (intro) ────────────────────────────────────────────
{
    name: "Plaine Verte", levelWidth: 2400,
    theme: "prairie",
    bgColors: ["#1a1a2e","#16213e","#0f3460"], skyStars: true,
    groundColor: "#2d5016", groundTop: "#4a7c28",
    platformColor: "#5c3d2e", platformTopColor: "#7d5544",
    platforms: [
        {x:150,y:280,w:120,h:20},{x:350,y:200,w:120,h:20},{x:550,y:120,w:100,h:20},
        {x:800,y:240,w:150,h:20},{x:1100,y:170,w:100,h:20},{x:1350,y:110,w:120,h:20},
        {x:1600,y:250,w:200,h:20},{x:1950,y:180,w:150,h:20}
    ],
    coins:[
        {x:210,y:250},{x:410,y:170},{x:600,y:90},{x:140,y:70},{x:875,y:210},
        {x:1150,y:140},{x:1410,y:80},{x:1700,y:220},{x:2025,y:150},{x:2250,y:330}
    ],
    enemies:[
        {x:150,y:250,w:30,h:30,spd:2,dir:1,minX:150,maxX:240},
        {x:350,y:170,w:30,h:30,spd:3,dir:-1,minX:350,maxX:440},
        {x:800,y:210,w:30,h:30,spd:2,dir:1,minX:800,maxX:920},
        {x:1600,y:220,w:30,h:30,spd:4,dir:1,minX:1600,maxX:1770}
    ],
    goal:{x:2350,y:250},
    clouds:[{x:100,y:40,w:120,spd:0.2},{x:400,y:70,w:90,spd:0.15},
            {x:700,y:30,w:150,spd:0.25},{x:1100,y:55,w:110,spd:0.18},
            {x:1500,y:40,w:130,spd:0.22},{x:1900,y:65,w:95,spd:0.2}]
},
// ─── 1: NEIGE & GLACE ──────────────────────────────────────────────
{
    name: "Toundra Glacée", levelWidth: 2600,
    theme: "snow",
    bgColors: ["#1c2a3a","#2d4a6b","#3d6080"], skyStars: true,
    groundColor: "#e8f4f8", groundTop: "#ffffff",
    platformColor: "#b0d4e8", platformTopColor: "#ddeeff",
    iceFloor: true,  // floor is slippery
    icePlatforms: [3,5,7], // indices that are icy
    snowParticles: true,
    platforms: [
        {x:200,y:290,w:140,h:20,icy:true},{x:420,y:220,w:120,h:20,icy:false},
        {x:650,y:150,w:100,h:20,icy:true},{x:850,y:280,w:160,h:20,icy:false},
        {x:1100,y:200,w:130,h:20,icy:true},{x:1350,y:130,w:110,h:20,icy:true},
        {x:1600,y:260,w:180,h:20,icy:false},{x:1850,y:170,w:140,h:20,icy:true},
        {x:2100,y:110,w:120,h:20,icy:false},{x:2300,y:200,w:150,h:20,icy:true}
    ],
    coins:[
        {x:270,y:260},{x:480,y:190},{x:700,y:120},{x:920,y:250},{x:1165,y:170},
        {x:1405,y:100},{x:1690,y:230},{x:1920,y:140},{x:2160,y:80},{x:2375,y:170}
    ],
    enemies:[
        {x:200,y:260,w:30,h:30,spd:1.5,dir:1,minX:200,maxX:310},
        {x:850,y:250,w:30,h:30,spd:2,dir:-1,minX:850,maxX:980},
        {x:1600,y:230,w:30,h:30,spd:2.5,dir:1,minX:1600,maxX:1750},
        {x:2100,y:80,w:30,h:30,spd:3,dir:1,minX:2100,maxX:2190}
    ],
    goal:{x:2540,y:250},
    clouds:[{x:100,y:50,w:130,spd:0.3},{x:500,y:30,w:100,spd:0.25},
            {x:900,y:60,w:150,spd:0.28},{x:1400,y:40,w:120,spd:0.32},
            {x:1900,y:55,w:110,spd:0.27},{x:2300,y:35,w:100,spd:0.3}]
},
// ─── 2: PLUIE & VENT & LIANES ──────────────────────────────────────
{
    name: "Forêt Tropicale", levelWidth: 2800,
    theme: "jungle",
    bgColors: ["#0d1f0d","#1a3a1a","#143020"], skyStars: false,
    groundColor: "#1a3010", groundTop: "#2a5018",
    platformColor: "#3a6020", platformTopColor: "#5a8030",
    wind: 1.2,      // horizontal push
    rain: true,
    vines: [
        {x:500,y:0,len:160},{x:700,y:0,len:140},{x:950,y:0,len:170},
        {x:1200,y:0,len:150},{x:1500,y:0,len:180},{x:1800,y:0,len:160},
        {x:2100,y:0,len:170},{x:2400,y:0,len:150}
    ],
    platforms: [
        {x:150,y:290,w:100,h:20},{x:380,y:230,w:90,h:20},{x:600,y:170,w:80,h:20},
        {x:820,y:270,w:100,h:20},{x:1050,y:200,w:90,h:20},{x:1280,y:140,w:80,h:20},
        {x:1520,y:250,w:120,h:20},{x:1780,y:180,w:100,h:20},
        {x:2020,y:120,w:90,h:20},{x:2280,y:230,w:110,h:20},{x:2500,y:160,w:100,h:20}
    ],
    coins:[
        {x:200,y:260},{x:425,y:200},{x:640,y:140},{x:870,y:240},{x:1095,y:170},
        {x:1320,y:110},{x:1580,y:220},{x:1830,y:150},{x:2065,y:90},
        {x:2330,y:200},{x:2550,y:130}
    ],
    enemies:[
        {x:150,y:260,w:30,h:30,spd:2,dir:1,minX:150,maxX:220},
        {x:600,y:140,w:30,h:30,spd:3,dir:-1,minX:600,maxX:660},
        {x:1050,y:170,w:30,h:30,spd:2.5,dir:1,minX:1050,maxX:1120},
        {x:1780,y:150,w:30,h:30,spd:3,dir:-1,minX:1780,maxX:1850},
        {x:2280,y:200,w:30,h:30,spd:4,dir:1,minX:2280,maxX:2360}
    ],
    goal:{x:2750,y:250},
    clouds:[]
},
// ─── 3: VOLCAN & LAVE ──────────────────────────────────────────────
{
    name: "Volcan en Furie", levelWidth: 2800,
    theme: "volcano",
    bgColors: ["#1a0000","#3a0800","#5a1000"], skyStars: false,
    groundColor: "#2a0800", groundTop: "#4a1000",
    platformColor: "#4a2010", platformTopColor: "#6a3010",
    lavaRivers: [
        {x:400,y:330,w:120},{x:750,y:330,w:100},{x:1100,y:330,w:150},
        {x:1500,y:330,w:130},{x:1900,y:330,w:110},{x:2200,y:330,w:140}
    ],
    lavaParticles: true,
    platforms: [
        {x:150,y:290,w:120,h:20},{x:340,y:230,w:100,h:20},{x:560,y:170,w:90,h:20},
        {x:700,y:260,w:120,h:20},{x:920,y:190,w:110,h:20},{x:1150,y:120,w:100,h:20},
        {x:1380,y:260,w:120,h:20},{x:1620,y:190,w:100,h:20},{x:1800,y:120,w:90,h:20},
        {x:2050,y:260,w:110,h:20},{x:2280,y:180,w:100,h:20},{x:2500,y:120,w:120,h:20}
    ],
    coins:[
        {x:200,y:260},{x:390,y:200},{x:605,y:140},{x:760,y:230},{x:975,y:160},
        {x:1200,y:90},{x:1430,y:230},{x:1670,y:160},{x:1845,y:90},
        {x:2100,y:230},{x:2330,y:150},{x:2560,y:90}
    ],
    enemies:[
        {x:150,y:260,w:30,h:30,spd:3,dir:1,minX:150,maxX:270},
        {x:700,y:230,w:30,h:30,spd:4,dir:-1,minX:700,maxX:790},
        {x:1380,y:230,w:30,h:30,spd:4,dir:1,minX:1380,maxX:1470},
        {x:2050,y:230,w:30,h:30,spd:5,dir:1,minX:2050,maxX:2140},
        {x:2500,y:90,w:30,h:30,spd:4,dir:-1,minX:2500,maxX:2590}
    ],
    goal:{x:2740,y:250},
    clouds:[]
},
// ─── 4: EAU (zones aquatiques) ─────────────────────────────────────
{
    name: "Lagon Submergé", levelWidth: 2800,
    theme: "water",
    bgColors: ["#001830","#002848","#003860"], skyStars: false,
    groundColor: "#001020", groundTop: "#002030",
    platformColor: "#0a3050", platformTopColor: "#1a5070",
    waterZones: [
        {x:300,y:280,w:250,h:70},{x:700,y:260,w:200,h:90},
        {x:1100,y:270,w:300,h:80},{x:1600,y:250,w:250,h:100},
        {x:2000,y:260,w:350,h:90}
    ],
    platforms: [
        {x:100,y:290,w:180,h:20},{x:360,y:220,w:100,h:20},{x:580,y:290,w:100,h:20},
        {x:740,y:200,w:120,h:20},{x:1000,y:280,w:80,h:20},{x:1200,y:210,w:110,h:20},
        {x:1440,y:280,w:130,h:20},{x:1700,y:200,w:120,h:20},{x:1900,y:280,w:80,h:20},
        {x:2100,y:210,w:100,h:20},{x:2350,y:280,w:120,h:20},{x:2550,y:200,w:150,h:20}
    ],
    coins:[
        {x:190,y:260},{x:410,y:190},{x:630,y:260},{x:800,y:170},{x:1040,y:250},
        {x:1255,y:180},{x:1505,y:250},{x:1760,y:170},{x:1940,y:250},
        {x:2150,y:180},{x:2410,y:250},{x:2625,y:170}
    ],
    enemies:[
        {x:100,y:260,w:30,h:30,spd:2,dir:1,minX:100,maxX:250},
        {x:580,y:260,w:30,h:30,spd:2,dir:1,minX:580,maxX:650},
        {x:1000,y:250,w:30,h:30,spd:3,dir:-1,minX:1000,maxX:1060},
        {x:1440,y:250,w:30,h:30,spd:3,dir:1,minX:1440,maxX:1540},
        {x:2350,y:250,w:30,h:30,spd:4,dir:-1,minX:2350,maxX:2440}
    ],
    goal:{x:2740,y:250},
    clouds:[]
},
// ─── 5: GROTTE ─────────────────────────────────────────────────────
{
    name: "Grottes Profondes", levelWidth: 2600,
    theme: "cave",
    bgColors: ["#050508","#0a0a10","#0f0f18"], skyStars: false,
    groundColor: "#1a1a22", groundTop: "#2a2a35",
    platformColor: "#2a2a38", platformTopColor: "#3a3a50",
    stalactites: true,
    torches: [{x:300},{x:600},{x:900},{x:1200},{x:1500},{x:1800},{x:2100},{x:2400}],
    platforms: [
        {x:150,y:300,w:130,h:20},{x:370,y:240,w:110,h:20},{x:580,y:170,w:100,h:20},
        {x:780,y:290,w:140,h:20},{x:1000,y:210,w:120,h:20},{x:1220,y:140,w:100,h:20},
        {x:1440,y:280,w:130,h:20},{x:1660,y:200,w:120,h:20},{x:1880,y:130,w:110,h:20},
        {x:2100,y:280,w:140,h:20},{x:2330,y:190,w:120,h:20}
    ],
    coins:[
        {x:215,y:270},{x:425,y:210},{x:630,y:140},{x:850,y:260},{x:1060,y:180},
        {x:1270,y:110},{x:1505,y:250},{x:1720,y:170},{x:1935,y:100},
        {x:2170,y:250},{x:2390,y:160}
    ],
    enemies:[
        {x:150,y:270,w:30,h:30,spd:2,dir:1,minX:150,maxX:250},
        {x:580,y:140,w:30,h:30,spd:3,dir:-1,minX:580,maxX:650},
        {x:1000,y:180,w:30,h:30,spd:2.5,dir:1,minX:1000,maxX:1100},
        {x:1660,y:170,w:30,h:30,spd:3,dir:-1,minX:1660,maxX:1750},
        {x:2100,y:250,w:30,h:30,spd:4,dir:1,minX:2100,maxX:2220}
    ],
    goal:{x:2540,y:250},
    clouds:[]
},
// ─── 6: NUAGES & OISEAUX ───────────────────────────────────────────
{
    name: "Royaume des Nuages", levelWidth: 3000,
    theme: "sky",
    bgColors: ["#87ceeb","#aaddff","#c8eeff"], skyStars: false,
    groundColor: "#e0f0ff", groundTop: "#ffffff",
    platformColor: "#e8f8ff", platformTopColor: "#ffffff",
    cloudPlatforms: true,  // platforms look like clouds
    birds: [
        {x:400,y:120,spd:2.5,dir:1,minX:300,maxX:600,flap:0},
        {x:800,y:80,spd:3,dir:-1,minX:650,maxX:1000,flap:0},
        {x:1300,y:150,spd:2,dir:1,minX:1100,maxX:1500,flap:0},
        {x:1800,y:90,spd:3.5,dir:-1,minX:1600,maxX:2000,flap:0},
        {x:2300,y:130,spd:3,dir:1,minX:2100,maxX:2500,flap:0},
        {x:2700,y:100,spd:2.5,dir:-1,minX:2500,maxX:2900,flap:0}
    ],
    platforms: [
        {x:100,y:300,w:160,h:25},{x:360,y:240,w:140,h:25},{x:600,y:170,w:130,h:25},
        {x:840,y:280,w:150,h:25},{x:1080,y:200,w:140,h:25},{x:1330,y:130,w:130,h:25},
        {x:1580,y:260,w:160,h:25},{x:1840,y:180,w:150,h:25},{x:2100,y:120,w:140,h:25},
        {x:2360,y:250,w:160,h:25},{x:2620,y:170,w:150,h:25},{x:2860,y:110,w:130,h:25}
    ],
    coins:[
        {x:180,y:270},{x:430,y:210},{x:665,y:140},{x:915,y:250},{x:1150,y:170},
        {x:1395,y:100},{x:1660,y:230},{x:1915,y:150},{x:2170,y:90},
        {x:2440,y:220},{x:2695,y:140},{x:2925,y:80}
    ],
    enemies:[], // birds are the enemies
    goal:{x:2960,y:250},
    clouds:[
        {x:50,y:50,w:180,spd:0.15},{x:350,y:30,w:140,spd:0.12},
        {x:700,y:60,w:200,spd:0.18},{x:1100,y:40,w:160,spd:0.14},
        {x:1500,y:55,w:180,spd:0.16},{x:1900,y:35,w:150,spd:0.13},
        {x:2300,y:50,w:170,spd:0.17},{x:2700,y:40,w:160,spd:0.15}
    ]
},
// ─── 7: DESERT & SABLE ─────────────────────────────────────────────
{
    name: "Désert Brûlant", levelWidth: 2800,
    theme: "desert",
    bgColors: ["#4a2800","#7a4800","#aa6800"], skyStars: false,
    groundColor: "#c8a050", groundTop: "#e0b860",
    platformColor: "#a07040", platformTopColor: "#c09050",
    sandstorm: true,
    cacti: [{x:300,h:60},{x:550,h:80},{x:900,h:60},{x:1200,h:70},{x:1600,h:80},{x:2000,h:65},{x:2400,h:75}],
    platforms: [
        {x:150,y:285,w:130,h:20},{x:380,y:220,w:110,h:20},{x:600,y:155,w:100,h:20},
        {x:820,y:280,w:140,h:20},{x:1050,y:205,w:120,h:20},{x:1280,y:140,w:110,h:20},
        {x:1510,y:275,w:130,h:20},{x:1740,y:200,w:120,h:20},{x:1970,y:135,w:110,h:20},
        {x:2200,y:275,w:140,h:20},{x:2430,y:195,w:130,h:20},{x:2620,y:130,w:120,h:20}
    ],
    coins:[
        {x:215,y:255},{x:435,y:190},{x:650,y:125},{x:890,y:250},{x:1110,y:175},
        {x:1335,y:110},{x:1575,y:245},{x:1800,y:170},{x:2025,y:105},
        {x:2270,y:245},{x:2495,y:165},{x:2680,y:100}
    ],
    enemies:[
        {x:150,y:255,w:30,h:30,spd:3,dir:1,minX:150,maxX:250},
        {x:600,y:125,w:30,h:30,spd:3.5,dir:-1,minX:600,maxX:680},
        {x:1050,y:175,w:30,h:30,spd:4,dir:1,minX:1050,maxX:1150},
        {x:1510,y:245,w:30,h:30,spd:4,dir:-1,minX:1510,maxX:1610},
        {x:2200,y:245,w:30,h:30,spd:5,dir:1,minX:2200,maxX:2310}
    ],
    goal:{x:2740,y:250},
    clouds:[]
},
// ─── 8: NUIT & FANTÔMES ────────────────────────────────────────────
{
    name: "Manoir Hanté", levelWidth: 2800,
    theme: "haunted",
    bgColors: ["#050010","#0a0020","#100030"], skyStars: true,
    groundColor: "#100820", groundTop: "#1a1030",
    platformColor: "#1a1030", platformTopColor: "#2a2040",
    ghosts: [
        {x:500,y:200,spd:1.5,phase:0,amp:40},{x:900,y:150,spd:1.2,phase:1,amp:50},
        {x:1400,y:180,spd:1.8,phase:2,amp:35},{x:1900,y:160,spd:1.5,phase:0.5,amp:45},
        {x:2400,y:140,spd:2,phase:1.5,amp:40}
    ],
    platforms: [
        {x:150,y:295,w:130,h:20},{x:375,y:230,w:110,h:20},{x:590,y:160,w:100,h:20},
        {x:800,y:285,w:140,h:20},{x:1020,y:210,w:120,h:20},{x:1245,y:140,w:110,h:20},
        {x:1470,y:280,w:130,h:20},{x:1700,y:200,w:120,h:20},{x:1930,y:130,w:110,h:20},
        {x:2160,y:280,w:140,h:20},{x:2390,y:195,w:120,h:20},{x:2580,y:130,w:120,h:20}
    ],
    coins:[
        {x:215,y:265},{x:430,y:200},{x:640,y:130},{x:870,y:255},{x:1080,y:180},
        {x:1300,y:110},{x:1535,y:250},{x:1760,y:170},{x:1985,y:100},
        {x:2230,y:250},{x:2450,y:165},{x:2640,y:100}
    ],
    enemies:[
        {x:150,y:265,w:30,h:30,spd:2,dir:1,minX:150,maxX:250},
        {x:800,y:255,w:30,h:30,spd:3,dir:-1,minX:800,maxX:910},
        {x:1470,y:250,w:30,h:30,spd:3.5,dir:1,minX:1470,maxX:1570},
        {x:2160,y:250,w:30,h:30,spd:4,dir:-1,minX:2160,maxX:2270}
    ],
    goal:{x:2740,y:250},
    clouds:[]
},
// ─── 9: FINAL (espace / arc-en-ciel) ──────────────────────────────
{
    name: "NIVEAU FINAL", levelWidth: 3200,
    theme: "final",
    bgColors: ["#000010","#000030","#000050"], skyStars: true,
    groundColor: "#100030", groundTop: "#200050",
    platformColor: "#200040", platformTopColor: "#400080",
    rainbow: true,
    platforms: [
        {x:150,y:295,w:110,h:20},{x:360,y:230,w:100,h:20},{x:560,y:160,w:90,h:20},
        {x:760,y:280,w:120,h:20},{x:970,y:205,w:110,h:20},{x:1180,y:135,w:100,h:20},
        {x:1390,y:275,w:115,h:20},{x:1610,y:200,w:110,h:20},{x:1830,y:130,w:100,h:20},
        {x:2060,y:275,w:120,h:20},{x:2290,y:195,w:110,h:20},{x:2520,y:125,w:100,h:20},
        {x:2750,y:275,w:120,h:20},{x:2970,y:195,w:110,h:20}
    ],
    coins:[
        {x:205,y:265},{x:410,y:200},{x:605,y:130},{x:820,y:250},{x:1025,y:175},
        {x:1230,y:105},{x:1448,y:245},{x:1665,y:170},{x:1880,y:100},
        {x:2120,y:245},{x:2345,y:165},{x:2570,y:95},{x:2810,y:245},{x:3020,y:165}
    ],
    enemies:[
        {x:150,y:265,w:30,h:30,spd:3,dir:1,minX:150,maxX:230},
        {x:560,y:130,w:30,h:30,spd:4,dir:-1,minX:560,maxX:620},
        {x:970,y:175,w:30,h:30,spd:4,dir:1,minX:970,maxX:1050},
        {x:1390,y:245,w:30,h:30,spd:5,dir:-1,minX:1390,maxX:1475},
        {x:1830,y:100,w:30,h:30,spd:4,dir:1,minX:1830,maxX:1900},
        {x:2290,y:165,w:30,h:30,spd:5,dir:-1,minX:2290,maxX:2370},
        {x:2750,y:245,w:30,h:30,spd:6,dir:1,minX:2750,maxX:2840}
    ],
    goal:{x:3150,y:250},
    clouds:[]
}
];

// ══════════════════════════════════════════════════════════════════
// GAME STATE
// ══════════════════════════════════════════════════════════════════
// ── Save / Load progression ───────────────────────────────────────
const SAVE_KEY = "jumper_save";
function saveProgress(){
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            level: currentLevel,
            lives: lives
        }));
        flashSave();
    } catch(e){}
}
function loadProgress(){
    try {
        const data = JSON.parse(localStorage.getItem(SAVE_KEY));
        if(data && typeof data.level === "number" && data.level >= 0 && data.level < LEVEL_DEFS.length){
            return data;
        }
    } catch(e){}
    return null;
}
function clearProgress(){
    try { localStorage.removeItem(SAVE_KEY); } catch(e){}
}

let currentLevel=0, lives=3, score=0;
let gameWon=false, gameOver=false, paused=false;
let levelComplete=false, levelCompleteTimer=0;
let cameraX=0;
let levelData, platforms, coins, enemies, goal;
let vines=[], waterZones=[], lavaRivers=[], birds=[], ghosts=[];
let weatherParticles=[], lavaParticles=[];
let grappledVine=null; // {vine, angle, swinging}
let starTime=0;

// ══════════════════════════════════════════════════════════════════
// PARTICLES
// ══════════════════════════════════════════════════════════════════
const particles=[];
function spawnCoinP(x,y){
    for(let i=0;i<8;i++){
        const a=(Math.PI*2/8)*i;
        particles.push({x,y,vx:Math.cos(a)*(2+rnd(0,2)),vy:Math.sin(a)*(2+rnd(0,2)),
            life:1,decay:0.04+rnd(0,0.03),size:4+rnd(0,4),color:`hsl(${45+rnd(0,20)},100%,${60+rnd(0,20)}%)`});
    }
}
function spawnDeathP(x,y){
    for(let i=0;i<12;i++){
        const a=Math.random()*Math.PI*2,s=3+rnd(0,4);
        particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,
            life:1,decay:0.03+rnd(0,0.02),size:5+rnd(0,8),color:`hsl(${rnd(0,30)},100%,60%)`});
    }
}
function spawnJumpP(x,y){
    for(let i=0;i<5;i++)
        particles.push({x:x+Math.random()*40,y:y+38,vx:(Math.random()-0.5)*3,vy:1+rnd(0,2),
            life:0.7,decay:0.05+rnd(0,0.03),size:3+rnd(0,4),color:`rgba(255,255,255,0.6)`});
}
function updateParticles(){
    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life-=p.decay;
        if(p.life<=0)particles.splice(i,1);
    }
}

// Stars background
const stars=Array.from({length:150},()=>({
    x:rnd(0,800),y:rnd(0,280),r:rnd(0.3,1.8),
    alpha:rnd(0.3,0.8),ts:rnd(0.01,0.03),to:rnd(0,Math.PI*2)
}));

// ══════════════════════════════════════════════════════════════════
// PLAYER
// ══════════════════════════════════════════════════════════════════
const player={
    x:50,y:280,width:40,height:40,
    vx:0,vy:0,jumpForce:-14,speed:5.5,
    isGrounded:false,facingRight:true,
    sx:1,sy:1,
    coyoteTimer:0,coyoteMax:8,
    jumpBuffer:0,jumpBufferMax:10,
    trail:[],invincible:0,invincibleMax:90,
    walkFrame:0,walkTimer:0,
    onIce:false,inWater:false,onVine:null,wantsJump:false,vineCD:0
};

// ══════════════════════════════════════════════════════════════════
// INPUT
// ══════════════════════════════════════════════════════════════════
const keys={left:false,right:false,jump:false};
document.addEventListener("keydown",e=>{
    if(e.code==="ArrowLeft")  keys.left=true;
    if(e.code==="ArrowRight") keys.right=true;
    if((e.code==="Space"||e.code==="ArrowUp")&&!e.repeat){
        player.jumpBuffer=player.jumpBufferMax;
        player.wantsJump=true;
    }
    if((e.code==="Escape"||e.code==="KeyP")&&!gameOver&&!gameWon) togglePause();
    if(e.code==="KeyR"&&(gameOver||gameWon)) restartGame();
});
document.addEventListener("keyup",e=>{
    if(e.code==="ArrowLeft")  keys.left=false;
    if(e.code==="ArrowRight") keys.right=false;
    if(e.code==="Space"||e.code==="ArrowUp"){
        keys.jump=false;
        if(player.vy<-4) player.vy=-4;
    }
});

// Reset all keys if window loses focus (prevents stuck keys)
window.addEventListener("blur", () => {
    keys.left=false; keys.right=false; keys.jump=false;
    player.wantsJump=false;
});

// Reset all keys if the page becomes hidden (tab switch)
document.addEventListener("visibilitychange", () => {
    if(document.hidden){
        keys.left=false; keys.right=false; keys.jump=false;
        player.wantsJump=false;
    }
});

document.getElementById("btn-pause").addEventListener("click",()=>{if(!gameOver&&!gameWon)togglePause();});
document.getElementById("btn-restart").addEventListener("click",restartGame);
document.getElementById("btn-clear-save").addEventListener("click",()=>{
    clearProgress();
    const el=document.getElementById("save-indicator");
    if(el){el.style.opacity="0.15";setTimeout(()=>el.style.opacity="",600);}
    document.body.focus();
});

function togglePause(){
    paused=!paused;
    document.getElementById("btn-pause").textContent=paused?"▶ Reprendre":"⏸ Pause";
    if(paused) bgMusicPause(); else bgMusicResume();
}
function restartGame(){
    clearProgress();
    bgMusic.pause(); bgMusic.currentTime=0; currentMusicFile='';
    currentLevel=0;lives=3;gameOver=false;gameWon=false;paused=false;
    particles.length=0;weatherParticles.length=0;lavaParticles.length=0;
    document.getElementById("btn-pause").textContent="⏸ Pause";
    loadLevel(0);spawnPlayer();updateHUD();
}

// ══════════════════════════════════════════════════════════════════
// LEVEL SETUP
// ══════════════════════════════════════════════════════════════════
function loadLevel(idx){
    const def=LEVEL_DEFS[idx];
    // Deep clone
    levelData=JSON.parse(JSON.stringify(def));
    platforms=levelData.platforms;
    coins=levelData.coins.map(c=>({...c,collected:false}));
    enemies=levelData.enemies.map(e=>({...e,alive:true}));
    goal=levelData.goal;

    // Specials
    vines=(levelData.vines||[]).map(v=>({...v,angle:0,angularVel:0}));
    waterZones=levelData.waterZones||[];
    lavaRivers=levelData.lavaRivers||[];
    birds=(levelData.birds||[]).map(b=>({...b,flap:0,flapTimer:0}));
    ghosts=(levelData.ghosts||[]).map(g=>({...g,t:0}));

    // Weather particles init
    weatherParticles=[];
    if(levelData.snowParticles){
        for(let i=0;i<120;i++)
            weatherParticles.push({x:rnd(0,800),y:rnd(0,400),spd:rnd(0.5,1.5),drift:rnd(-0.3,0.3),r:rnd(2,5),type:"snow"});
    }
    if(levelData.rain){
        for(let i=0;i<180;i++)
            weatherParticles.push({x:rnd(0,800),y:rnd(0,400),spd:rnd(12,18),len:rnd(8,18),type:"rain"});
    }

    lavaParticles=[];

    score=0;levelComplete=false;levelCompleteTimer=0;
    updateHUD();
    bgMusicPlay(levelData.theme);
}

function spawnPlayer(){
    player.x=50;player.y=280;player.vx=0;player.vy=0;
    player.isGrounded=false;player.sx=1;player.sy=1;
    player.trail=[];player.invincible=0;
    player.coyoteTimer=0;player.jumpBuffer=0;player.wantsJump=false;player.vineCD=0;
    player.onIce=false;player.inWater=false;player.onVine=null;
    grappledVine=null;
}

function resetToCheckpoint(){
    playSFX('death');
    lives--;updateHUD();
    if(lives<=0){gameOver=true;clearProgress();return;}
    spawnDeathP(player.x+20,player.y+20);
    saveProgress();
    loadLevel(currentLevel);spawnPlayer();
}

function updateHUD(){
    document.getElementById("score-value").textContent=score+" / "+coins.length;
    document.getElementById("level-value").textContent=(currentLevel+1);
    document.getElementById("lives-value").textContent="❤️".repeat(Math.max(0,lives));
    const sv=document.getElementById("score-value");
    sv.classList.remove("score-pop");void sv.offsetWidth;sv.classList.add("score-pop");
}
function flashSave(){
    const el=document.getElementById("save-indicator");
    if(!el)return;
    el.classList.remove("save-flash");
    void el.offsetWidth;
    el.classList.add("save-flash");
}

// ══════════════════════════════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════════════════════════════
function update(){
    if(paused||gameOver||gameWon)return;
    if(levelComplete){
        levelCompleteTimer++;
        if(levelCompleteTimer>120){
            if(currentLevel<LEVEL_DEFS.length-1){
                currentLevel++;loadLevel(currentLevel);spawnPlayer();
                levelComplete=false;updateHUD();
                saveProgress();
            } else { gameWon=true; clearProgress(); }
        }
        return;
    }

    starTime+=0.016;

    // ── Theme-specific physics ─────────────────────────────
    const theme=levelData.theme;
    const gravity=player.inWater?0.18:0.55;
    const maxFall=player.inWater?3:15;
    const jumpF=player.inWater?-7:player.jumpForce;
    const windX=levelData.wind||0;

    // ── Physics ────────────────────────────────────────────
    if(player.onVine){
        // Real pendulum: angular accel = -g/L * sin(angle)
        const v=player.onVine;
        const G=0.004;
        let pump=0;
        if(keys.right) pump=0.003;
        if(keys.left)  pump=-0.003;
        v.angularVel += -G * Math.sin(v.angle) + pump;
        v.angularVel *= 0.995;
        v.angle += v.angularVel;
        v.angle = clamp(v.angle, -1.3, 1.3);
        player.x = v.x + Math.sin(v.angle)*v.len - player.width/2;
        player.y = v.y + Math.cos(v.angle)*v.len - player.height;
        player.vx = 0; player.vy = 0;
        // Detach on jump — use wantsJump so it's never missed
        if(player.wantsJump){
            player.wantsJump = false;
            const speed = v.angularVel * v.len;
            // Launch: tangential velocity + upward boost
            player.vx = speed * Math.cos(v.angle) * 1.6;
            player.vy = -Math.abs(v.angularVel) * v.len * 0.9 - 6;
            player.onVine = null;
            player.vineCD = 30;  // 30 frames = 0.5s cooldown before re-grabbing
            player.jumpBuffer = 0;
            player.sx=0.7; player.sy=1.4;
            spawnJumpP(player.x, player.y);
            playSFX('jump');
        }
    } else {
        player.vy=Math.min(player.vy+gravity,maxFall);
        player.vy+=0; // wind affects only X

        // Horizontal
        const spd=player.inWater?player.speed*0.45:player.speed;
        const acc=player.onIce?0.04:player.inWater?0.12:0.25;
        const fric=player.onIce?0.98:player.inWater?0.88:0.7;

        if(keys.left){
            player.vx=lerp(player.vx,-spd,acc);
            player.facingRight=false;
        } else if(keys.right){
            player.vx=lerp(player.vx,spd,acc);
            player.facingRight=true;
        } else {
            player.vx*=fric;
            if(Math.abs(player.vx)<0.1)player.vx=0;
        }

        // Wind push
        player.vx+=windX*0.06;

        player.x+=player.vx;
        player.y+=player.vy;
        player.x=clamp(player.x,0,levelData.levelWidth-player.width);

        if(player.y>500){resetToCheckpoint();return;}
    }

    // ── Ground & Platform collision ───────────────────────
    let onGround=false;
    player.onIce=false;

    if(player.onVine===null){
        if(player.y+player.height>=FLOOR_Y){
            if(player.vy>5){player.sx=1.4;player.sy=0.6;}
            player.y=FLOOR_Y-player.height;player.vy=0;onGround=true;
            if(levelData.iceFloor)player.onIce=true;
        }

        for(const plat of platforms){
            const pw=plat.w||plat.width||80, ph=plat.h||plat.height||20;
            if(player.x+player.width>plat.x&&player.x<plat.x+pw&&
               player.vy>=0&&
               player.y+player.height>=plat.y&&
               player.y+player.height<=plat.y+ph+Math.max(player.vy+1,10)){
                if(player.vy>5){player.sx=1.4;player.sy=0.6;}
                player.y=plat.y-player.height;player.vy=0;onGround=true;
                if(plat.icy)player.onIce=true;
            }
        }
    }

    player.coyoteTimer=onGround?player.coyoteMax:Math.max(0,player.coyoteTimer-1);
    player.isGrounded=onGround;

    // Jump
    player.jumpBuffer=Math.max(0,player.jumpBuffer-1);
    if(player.jumpBuffer>0&&player.coyoteTimer>0&&player.onVine===null){
        player.vy=jumpF;
        player.coyoteTimer=0;player.jumpBuffer=0;player.wantsJump=false;player.vineCD=0;player.isGrounded=false;
        player.sx=0.7;player.sy=1.4;
        spawnJumpP(player.x,player.y);
    }

    // Squash/stretch
    player.sx=lerp(player.sx,1,0.2);player.sy=lerp(player.sy,1,0.2);
    if(!player.isGrounded&&player.onVine===null){
        if(player.vy<-2){player.sy=lerp(player.sy,1.3,0.1);player.sx=lerp(player.sx,0.8,0.1);}
        if(player.vy>4) player.sy=lerp(player.sy,1.15,0.1);
    }

    // Trail
    if(Math.abs(player.vy)>3||Math.abs(player.vx)>3){
        player.trail.push({x:player.x,y:player.y,alpha:0.35});
        if(player.trail.length>6)player.trail.shift();
    } else if(player.trail.length>0)player.trail.shift();
    for(const t of player.trail)t.alpha-=0.04;

    // Walk anim
    if(onGround&&Math.abs(player.vx)>0.5){
        if(++player.walkTimer>8){player.walkFrame=(player.walkFrame+1)%4;player.walkTimer=0;}
    } else player.walkFrame=0;

    if(player.invincible>0)player.invincible--;

    // ── Water zones ───────────────────────────────────────
    player.inWater=false;
    for(const wz of waterZones){
        if(player.x+player.width>wz.x&&player.x<wz.x+wz.w&&
           player.y+player.height>wz.y&&player.y<wz.y+wz.h){
            player.inWater=true;
        }
    }

    // ── Vine grab ─────────────────────────────────────────
    if(player.vineCD>0) player.vineCD--;
    if(player.onVine===null&&!player.isGrounded&&player.vineCD===0){
        for(const v of vines){
            const px=player.x+player.width/2, py=player.y+player.height/2;
            // Distance from player center to vine anchor
            const dx=px-v.x, dy=py-v.y;
            const distToAnchor=Math.sqrt(dx*dx+dy*dy);
            // Vine tip position
            const tipX=v.x+Math.sin(v.angle)*v.len;
            const tipY=v.y+Math.cos(v.angle)*v.len;
            // Distance from player to vine tip
            const ex=px-tipX, ey=py-tipY;
            const distToTip=Math.sqrt(ex*ex+ey*ey);
            // Grab if player is close to the tip area and within vine length
            if(distToTip<28 && distToAnchor>30){
                player.onVine=v;
                v.angle=Math.atan2(px-v.x, py-v.y);
                // Initial angular velocity from player momentum
                v.angularVel=(player.vx/v.len)*0.6;
                // Always give a minimum swing so pendulum starts moving
                if(Math.abs(v.angularVel)<0.015)
                    v.angularVel = v.angle>=0 ? 0.025 : -0.025;
                break;
            }
        }
    }

    // ── Vines physics (idle — drift back to rest) ──────────────────
    for(const v of vines){
        if(player.onVine!==v){
            v.angularVel=lerp(v.angularVel||0, 0, 0.06);
            v.angle=lerp(v.angle, 0, 0.04);
        }
    }

    // ── Lava ──────────────────────────────────────────────
    for(const lr of lavaRivers){
        if(player.x+player.width>lr.x&&player.x<lr.x+lr.w&&
           player.y+player.height>lr.y&&player.y+player.height<=lr.y+30){
            if(player.invincible===0){resetToCheckpoint();return;}
        }
    }
    // Lava particles
    if(levelData.lavaParticles&&Math.random()<0.3){
        for(const lr of lavaRivers){
            if(sx(lr.x)<GAME_W&&sx(lr.x+lr.w)>0){
                lavaParticles.push({
                    x:rnd(lr.x,lr.x+lr.w),y:lr.y,
                    vx:rnd(-0.5,0.5),vy:rnd(-3,-1),
                    life:0.8,decay:0.04+rnd(0,0.02),size:rnd(2,6),
                    color:`hsl(${rnd(0,40)},100%,${rnd(50,70)}%)`
                });
            }
        }
    }
    for(let i=lavaParticles.length-1;i>=0;i--){
        const p=lavaParticles[i];
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.life-=p.decay;
        if(p.life<=0)lavaParticles.splice(i,1);
    }

    // ── Coins ─────────────────────────────────────────────
    for(const coin of coins){
        if(!coin.collected){
            const r=10;
            if(player.x<coin.x+r&&player.x+player.width>coin.x-r&&
               player.y<coin.y+r&&player.y+player.height>coin.y-r){
                coin.collected=true;score++;
                spawnCoinP(coin.x,coin.y);updateHUD();
                playSFX('coin');
            }
        }
    }

    // ── Enemies ───────────────────────────────────────────
    for(const e of enemies){
        if(!e.alive)continue;
        e.x+=e.spd*e.dir;
        if(e.x<=e.minX||e.x+e.w>=e.maxX+e.w)e.dir*=-1;
        if(player.invincible===0){
            if(player.x<e.x+e.w-4&&player.x+player.width>e.x+4&&
               player.y<e.y+e.h&&player.y+player.height>e.y){
                if(player.vy>1&&player.y+player.height<e.y+20){
                    spawnDeathP(e.x+15,e.y+15);
                    e.alive=false;player.vy=player.jumpForce*0.6;score++;updateHUD();
                    playSFX('stomp');
                } else {
                    player.invincible=player.invincibleMax;
                    resetToCheckpoint();return;
                }
            }
        }
    }

    // ── Birds (level 6) ───────────────────────────────────
    for(const b of birds){
        b.x+=b.spd*b.dir;
        if(b.x<=b.minX||b.x+40>=b.maxX)b.dir*=-1;
        b.flap=(b.flap+0.15)%(Math.PI*2);
        if(player.invincible===0){
            if(player.x<b.x+40&&player.x+player.width>b.x&&
               player.y<b.y+20&&player.y+player.height>b.y-10){
                if(player.vy>1&&player.y+player.height<b.y+10){
                    spawnDeathP(b.x+20,b.y);
                    b.x=-9999;player.vy=player.jumpForce*0.6;score++;updateHUD();
                } else {
                    player.invincible=player.invincibleMax;
                    resetToCheckpoint();return;
                }
            }
        }
    }

    // ── Ghosts (level 8) ──────────────────────────────────
    for(const g of ghosts){
        g.t+=0.02;
        const gx=g.x+(Math.sin(g.t*0.8)*200);
        const gy=g.y+Math.sin(g.t+g.phase)*g.amp;
        if(player.invincible===0){
            if(Math.abs(player.x+20-gx)<30&&Math.abs(player.y+20-gy)<30){
                player.invincible=player.invincibleMax;
                resetToCheckpoint();return;
            }
        }
    }

    // ── Weather particles ─────────────────────────────────
    for(const p of weatherParticles){
        if(p.type==="snow"){
            p.x+=p.drift+(windX*0.5);p.y+=p.spd;
            if(p.y>420)p.y=-5;
            if(p.x>820)p.x=-5;if(p.x<-5)p.x=820;
        } else if(p.type==="rain"){
            p.x+=windX*0.5+1;p.y+=p.spd;
            if(p.y>420){p.y=rnd(-20,0);p.x=rnd(0,820);}
            if(p.x>820)p.x=0;
        }
    }

    // ── Goal ──────────────────────────────────────────────
    if(score>=coins.length){
        if(player.x<goal.x+15+20&&player.x+player.width>goal.x-10&&
           player.y<goal.y+100&&player.y+player.height>goal.y){
            if(!levelComplete) playSFX('win');
            levelComplete=true;levelCompleteTimer=0;
        }
    }

    // Camera
    cameraX=clamp(player.x-GAME_W/3,0,levelData.levelWidth-GAME_W);

    updateParticles();
}

// ══════════════════════════════════════════════════════════════════
// DRAW HELPERS
// ══════════════════════════════════════════════════════════════════
function sx(worldX){return worldX-cameraX;}

function drawBackground(){
    const c=levelData.bgColors;
    const g=ctx.createLinearGradient(0,0,0,GAME_H);
    g.addColorStop(0,c[0]);g.addColorStop(0.6,c[1]);g.addColorStop(1,c[2]);
    ctx.fillStyle=g;ctx.fillRect(0,0,GAME_W,GAME_H);

    const theme=levelData.theme;

    // Stars
    if(levelData.skyStars){
        for(const s of stars){
            const tw=0.5+0.5*Math.sin(starTime*s.ts*60+s.to);
            ctx.globalAlpha=s.alpha*tw;
            ctx.fillStyle="white";
            ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }

    // Theme-specific backgrounds
    if(theme==="volcano"){
        const lg=ctx.createRadialGradient(GAME_W/2,GAME_H,0,GAME_W/2,GAME_H,GAME_H*0.9);
        lg.addColorStop(0,"rgba(255,80,0,0.4)");lg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=lg;ctx.fillRect(0,0,GAME_W,GAME_H);
        // Volcano silhouette
        const vx=sx(1400);
        ctx.fillStyle="#1a0500";
        ctx.beginPath();ctx.moveTo(vx-200,FLOOR_Y);ctx.lineTo(vx,FLOOR_Y-200);ctx.lineTo(vx+200,FLOOR_Y);ctx.fill();
        // Crater glow
        ctx.fillStyle="rgba(255,100,0,0.3)";
        ctx.beginPath();ctx.ellipse(vx,FLOOR_Y-195,40,15,0,0,Math.PI*2);ctx.fill();
    }
    if(theme==="haunted"){
        // Moon
        ctx.fillStyle="rgba(220,220,180,0.9)";
        ctx.beginPath();ctx.arc(650,60,35,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(180,180,150,0.4)";
        ctx.beginPath();ctx.arc(665,55,35,0,Math.PI*2);ctx.fill();
    }
    if(theme==="final"&&levelData.rainbow){
        const rx=sx(3150/2);
        for(let i=0;i<7;i++){
            ctx.strokeStyle=`hsla(${i*50},100%,60%,0.15)`;
            ctx.lineWidth=18;
            ctx.beginPath();
            ctx.arc(rx,FLOOR_Y+50,250+i*20,-Math.PI,0);
            ctx.stroke();
        }
    }
    if(theme==="cave"){
        // Stalactites
        ctx.fillStyle="#1a1a22";
        for(let i=0;i<20;i++){
            const bx=(i*140+50)-cameraX*0.5;
            const bh=30+Math.sin(i*2.3)*20;
            ctx.beginPath();
            ctx.moveTo(bx,0);ctx.lineTo(bx-12,bh);ctx.lineTo(bx+12,bh);ctx.fill();
        }
    }
    if(theme==="sky"){
        // Fluffy cloud BG layer
        ctx.fillStyle="rgba(255,255,255,0.08)";
        for(let i=0;i<6;i++){
            const bx=((i*280+120)-cameraX*0.2+GAME_W*2)%( GAME_W*2)-GAME_W*0.5;
            ctx.beginPath();
            ctx.ellipse(bx,80+i*30,90,30,0,0,Math.PI*2);ctx.fill();
        }
    }

    // Clouds (parallax 30%)
    const clouds=levelData.clouds||[];
    for(const c of clouds){
        const rx=c.x-cameraX*0.3;
        ctx.fillStyle=theme==="sky"?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.ellipse(rx,c.y,c.w*0.5,18,0,0,Math.PI*2);
        ctx.ellipse(rx-c.w*0.2,c.y+8,c.w*0.3,14,0,0,Math.PI*2);
        ctx.ellipse(rx+c.w*0.22,c.y+8,c.w*0.28,12,0,0,Math.PI*2);
        ctx.fill();
    }
    if(clouds.length>0) for(const c of clouds){c.x+=c.spd;if(c.x>levelData.levelWidth+200)c.x=-200;}
}

function drawGround(){
    ctx.fillStyle=levelData.groundColor;
    ctx.fillRect(0,FLOOR_Y,GAME_W,GAME_H-FLOOR_Y);
    ctx.fillStyle=levelData.groundTop;
    ctx.fillRect(0,FLOOR_Y,GAME_W,8);

    const theme=levelData.theme;
    if(theme==="snow"){
        // Snow drifts
        for(let i=0;i<12;i++){
            const bx=(i*120+80)-cameraX%120;
            ctx.fillStyle="rgba(255,255,255,0.6)";
            ctx.beginPath();ctx.ellipse(bx,FLOOR_Y+4,40+i%3*10,10,0,0,Math.PI*2);ctx.fill();
        }
    }
    if(theme==="cave"){
        // Grid
        ctx.strokeStyle="rgba(255,255,255,0.04)";ctx.lineWidth=1;
        const t=40,off=cameraX%t;
        for(let x=-off;x<GAME_W;x+=t){ctx.beginPath();ctx.moveTo(x,FLOOR_Y);ctx.lineTo(x,GAME_H);ctx.stroke();}
    }
    if(theme==="desert"){
        // Sand ripples
        ctx.strokeStyle="rgba(180,160,80,0.3)";ctx.lineWidth=1;
        for(let i=0;i<6;i++){
            const ry=FLOOR_Y+12+i*6;
            const off=cameraX*0.4%80;
            ctx.beginPath();
            for(let x=0;x<GAME_W+80;x+=80){
                ctx.moveTo(x-off,ry);
                ctx.quadraticCurveTo(x-off+20,ry-4,x-off+40,ry);
            }
            ctx.stroke();
        }
    }
}

function drawPlatforms(){
    const theme=levelData.theme;
    for(const plat of platforms){
        const pw=plat.w||plat.width||80,ph=plat.h||plat.height||20;
        const rx=sx(plat.x);
        if(rx>GAME_W+10||rx+pw<-10)continue;

        if(theme==="sky"||levelData.cloudPlatforms){
            // Cloud-shaped platform
            ctx.fillStyle="rgba(255,255,255,0.9)";
            ctx.beginPath();
            ctx.ellipse(rx+pw/2,plat.y+ph/2,pw*0.5+10,ph+6,0,0,Math.PI*2);
            ctx.ellipse(rx+pw*0.25,plat.y,pw*0.25,ph,0,0,Math.PI*2);
            ctx.ellipse(rx+pw*0.75,plat.y,pw*0.2,ph-2,0,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle="rgba(200,230,255,0.5)";
            ctx.fillRect(rx,plat.y+ph-4,pw,4);
        } else {
            // Shadow
            ctx.fillStyle="rgba(0,0,0,0.3)";
            ctx.fillRect(rx+4,plat.y+4,pw,ph);
            // Body
            ctx.fillStyle=levelData.platformColor;
            ctx.fillRect(rx,plat.y,pw,ph);
            // Top
            ctx.fillStyle=plat.icy?"#c8eeff":levelData.platformTopColor;
            ctx.fillRect(rx,plat.y,pw,5);
            // Ice sheen
            if(plat.icy){
                ctx.fillStyle="rgba(200,240,255,0.5)";
                ctx.fillRect(rx,plat.y,pw,3);
            }
            // Shine
            ctx.fillStyle="rgba(255,255,255,0.1)";
            ctx.fillRect(rx,plat.y,3,ph);
        }
    }
}

function drawSpecials(){
    const theme=levelData.theme;

    // Water zones
    for(const wz of waterZones){
        const rx=sx(wz.x);
        if(rx>GAME_W||rx+wz.w<0)continue;
        const wg=ctx.createLinearGradient(rx,wz.y,rx,wz.y+wz.h);
        wg.addColorStop(0,"rgba(0,100,200,0.55)");
        wg.addColorStop(1,"rgba(0,60,150,0.75)");
        ctx.fillStyle=wg;
        ctx.fillRect(rx,wz.y,wz.w,wz.h);
        // Bubbles
        const bt=Date.now()/600;
        ctx.fillStyle="rgba(150,220,255,0.3)";
        for(let i=0;i<4;i++){
            const bx=rx+((i*37+Math.sin(bt+i)*15)%wz.w);
            const by=wz.y+wz.h-((bt*20*((i+1)*0.5))%(wz.h));
            ctx.beginPath();ctx.arc(bx,by,3,0,Math.PI*2);ctx.fill();
        }
        // Surface shimmer
        ctx.fillStyle="rgba(100,200,255,0.2)";
        for(let i=0;i<5;i++){
            const wx2=rx+((i*wz.w/5+Date.now()/400)%(wz.w+20))-10;
            ctx.fillRect(wx2,wz.y,20,3);
        }
    }

    // Lava rivers
    const lt=Date.now()/300;
    for(const lr of lavaRivers){
        const rx=sx(lr.x);
        if(rx>GAME_W||rx+lr.w<0)continue;
        const lg=ctx.createLinearGradient(rx,lr.y,rx,lr.y+20);
        lg.addColorStop(0,`hsl(${20+Math.sin(lt)*10},100%,55%)`);
        lg.addColorStop(1,"#400");
        ctx.fillStyle=lg;
        ctx.fillRect(rx,lr.y,lr.w,20);
        // Glow
        ctx.shadowColor="rgba(255,100,0,0.8)";ctx.shadowBlur=15;
        ctx.fillStyle=`hsla(${20+Math.sin(lt)*10},100%,50%,0.4)`;
        ctx.fillRect(rx,lr.y-4,lr.w,6);
        ctx.shadowBlur=0;
        // Lava particles
        for(const p of lavaParticles){
            ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
            ctx.beginPath();ctx.arc(sx(p.x),p.y,p.size,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }

    // Vines
    for(const v of vines){
        const rx=sx(v.x);
        if(Math.abs(rx)>GAME_W+50)continue;
        const tipX=rx+Math.sin(v.angle)*v.len;
        const tipY=v.y+Math.cos(v.angle)*v.len;
        // Vine rope (segmented)
        const segs=8;
        ctx.strokeStyle="#2d6020";ctx.lineWidth=4;
        ctx.beginPath();ctx.moveTo(rx,v.y);
        for(let i=1;i<=segs;i++){
            const t=i/segs;
            const vx2=rx+Math.sin(v.angle*t)*v.len*t;
            const vy2=v.y+Math.cos(v.angle*t)*v.len*t*0.98;
            ctx.lineTo(vx2,vy2);
        }
        ctx.stroke();
        // Leaf at tip
        ctx.fillStyle="#3a8020";
        ctx.beginPath();ctx.ellipse(tipX,tipY,8,12,v.angle,0,Math.PI*2);ctx.fill();
    }

    // Torches (cave)
    if(theme==="cave"){
        const ft=Date.now()/100;
        for(const torch of (levelData.torches||[])){
            const rx=sx(torch.x);
            if(Math.abs(rx)>GAME_W+20)continue;
            // Base
            ctx.fillStyle="#5a3a1a";ctx.fillRect(rx-4,FLOOR_Y-30,8,30);
            // Flame
            ctx.shadowColor="rgba(255,150,0,0.9)";ctx.shadowBlur=20;
            const fg=ctx.createRadialGradient(rx,FLOOR_Y-38,0,rx,FLOOR_Y-30,16);
            fg.addColorStop(0,`rgba(255,${200+Math.sin(ft)*30},0,0.95)`);
            fg.addColorStop(0.5,`rgba(255,${80+Math.sin(ft+1)*20},0,0.7)`);
            fg.addColorStop(1,"rgba(255,0,0,0)");
            ctx.fillStyle=fg;
            ctx.beginPath();
            ctx.ellipse(rx+Math.sin(ft)*2,FLOOR_Y-38,8,14,Math.sin(ft)*0.2,0,Math.PI*2);
            ctx.fill();
            ctx.shadowBlur=0;
        }
    }

    // Cacti (desert)
    if(theme==="desert"){
        for(const c of (levelData.cacti||[])){
            const rx=sx(c.x);
            if(Math.abs(rx)>GAME_W+20)continue;
            ctx.fillStyle="#3a6020";
            ctx.fillRect(rx-6,FLOOR_Y-c.h,12,c.h);
            ctx.fillRect(rx-20,FLOOR_Y-c.h*0.6,14,8);
            ctx.fillRect(rx+6,FLOOR_Y-c.h*0.7,14,8);
        }
    }

    // Ghosts (haunted)
    for(const g of ghosts){
        const gx=sx(g.x+(Math.sin(g.t*0.8)*200));
        const gy=g.y+Math.sin(g.t+g.phase)*g.amp;
        if(Math.abs(gx)>GAME_W+50)continue;
        const pulse=0.5+0.5*Math.sin(g.t*3);
        ctx.globalAlpha=0.3+pulse*0.4;
        ctx.fillStyle="#c0c0ff";
        ctx.beginPath();ctx.ellipse(gx,gy,20,26,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#fff";
        ctx.beginPath();ctx.arc(gx-7,gy-5,5,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(gx+7,gy-5,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#8888ff";
        ctx.beginPath();ctx.arc(gx-7,gy-5,3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(gx+7,gy-5,3,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
    }

    // Birds
    for(const b of birds){
        if(b.x<-100)continue;
        const rx=sx(b.x);
        if(rx>GAME_W+20)continue;
        const flapY=Math.sin(b.flap)*8;
        ctx.fillStyle="#2a1a10";
        // Body
        ctx.beginPath();ctx.ellipse(rx+20,b.y+8,14,8,0,0,Math.PI*2);ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(rx+10,b.y+6);
        ctx.quadraticCurveTo(rx,b.y-12+flapY,rx+8,b.y+2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(rx+30,b.y+6);
        ctx.quadraticCurveTo(rx+40,b.y-12+flapY,rx+32,b.y+2);
        ctx.fill();
        // Beak
        ctx.fillStyle="#e8a020";
        ctx.beginPath();
        ctx.moveTo(b.dir>0?rx+34:rx+6,b.y+8);
        ctx.lineTo(b.dir>0?rx+42:rx-2,b.y+10);
        ctx.lineTo(b.dir>0?rx+34:rx+6,b.y+12);
        ctx.fill();
        // Eye
        ctx.fillStyle="white";ctx.beginPath();ctx.arc(b.dir>0?rx+28:rx+12,b.y+7,3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#000";ctx.beginPath();ctx.arc(b.dir>0?rx+29:rx+11,b.y+7,1.5,0,Math.PI*2);ctx.fill();
    }
}

function drawCoins(){
    const t=Date.now()/400;
    for(let i=0;i<coins.length;i++){
        const coin=coins[i];if(coin.collected)continue;
        const rx=sx(coin.x);
        if(rx<-20||rx>GAME_W+20)continue;
        const bob=Math.sin(t+i*1.2)*3,cy=coin.y+bob,r=10;
        const grd=ctx.createRadialGradient(rx,cy,0,rx,cy,r*2);
        grd.addColorStop(0,"rgba(255,220,60,0.5)");grd.addColorStop(1,"rgba(255,200,0,0)");
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(rx,cy,r*2,0,Math.PI*2);ctx.fill();
        const sh=Math.sin(t*2+i)*0.5+0.5;
        const cg=ctx.createRadialGradient(rx-3,cy-3,1,rx,cy,r);
        cg.addColorStop(0,`hsl(${50+sh*10},100%,${75+sh*10}%)`);
        cg.addColorStop(1,"hsl(40,100%,45%)");
        ctx.fillStyle=cg;ctx.beginPath();ctx.arc(rx,cy,r,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,0.5)";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(rx,cy,r*0.6,0,Math.PI*2);ctx.stroke();
    }
}

function drawEnemies(){
    const t=Date.now()/200;
    for(const e of enemies){
        if(!e.alive)continue;
        const rx=sx(e.x);
        if(rx>GAME_W+10||rx+e.w<-10)continue;
        ctx.fillStyle="rgba(0,0,0,0.2)";
        ctx.beginPath();ctx.ellipse(rx+15,e.y+e.h+3,15,4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#e53935";ctx.fillRect(rx,e.y,e.w,e.h);
        ctx.fillStyle="#b71c1c";ctx.fillRect(rx+2,e.y+2,e.w-4,e.h-4);
        ctx.fillStyle="#fff176";
        ctx.fillRect(rx+4,e.y+6,7,6);ctx.fillRect(rx+19,e.y+6,7,6);
        ctx.fillStyle="#000";
        const po=e.dir>0?3:1;
        ctx.fillRect(rx+4+po,e.y+8,4,4);ctx.fillRect(rx+19+po,e.y+8,4,4);
        const ls=Math.sin(t*e.spd*e.dir)*5;
        ctx.fillStyle="#c62828";
        ctx.fillRect(rx+4,e.y+e.h,8,4+ls);ctx.fillRect(rx+18,e.y+e.h,8,4-ls);
    }
}

function drawWeather(){
    const theme=levelData.theme;
    if(theme==="snow"){
        ctx.fillStyle="rgba(255,255,255,0.85)";
        for(const p of weatherParticles){
            ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
        }
    }
    if(theme==="jungle"&&levelData.rain){
        ctx.strokeStyle="rgba(150,200,255,0.35)";ctx.lineWidth=1;
        for(const p of weatherParticles){
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+2,p.y+p.len);ctx.stroke();
        }
    }
    if(theme==="desert"&&levelData.sandstorm){
        // Sand streaks
        ctx.strokeStyle="rgba(200,170,80,0.15)";ctx.lineWidth=1;
        const st=Date.now()/500;
        for(let i=0;i<30;i++){
            const sy=50+i*12;
            const sw=100+Math.sin(st+i)*50;
            const sx2=((st*150+i*200)%(GAME_W+300))-150;
            ctx.beginPath();ctx.moveTo(sx2,sy);ctx.lineTo(sx2+sw,sy);ctx.stroke();
        }
    }
}

function drawFlag(){
    const rx=sx(goal.x);
    if(Math.abs(rx)>GAME_W+100)return;
    const t=Date.now()/300;
    ctx.fillStyle="#b0bec5";ctx.fillRect(rx,goal.y,6,100);
    for(let seg=0;seg<5;seg++){
        const wave=Math.sin(t+seg*0.8)*4;
        ctx.fillStyle=score>=coins.length?"#f1c40f":"#e74c3c";
        ctx.fillRect(rx+6+seg*8,goal.y+wave,9,28);
    }
    if(score<coins.length){
        ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(rx-10,goal.y-30,36,24);
        ctx.fillStyle="#e74c3c";ctx.font="bold 11px sans-serif";ctx.textAlign="center";
        ctx.fillText("🔒 "+score+"/"+coins.length,rx+8,goal.y-13);ctx.textAlign="left";
    }
}

function drawParticles(){
    for(const p of particles){
        ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;
        ctx.beginPath();ctx.arc(sx(p.x),p.y,p.size,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
}

function drawPlayer(){
    if(player.invincible>0&&Math.floor(player.invincible/5)%2===0)return;

    // Water tint overlay
    if(player.inWater){
        ctx.globalAlpha=0.3;ctx.fillStyle="#0080ff";
        ctx.fillRect(sx(player.x),player.y,player.width,player.height);
        ctx.globalAlpha=1;
    }

    for(const t of player.trail){
        ctx.globalAlpha=Math.max(0,t.alpha);ctx.fillStyle="#ff5252";
        ctx.fillRect(sx(t.x),t.y,player.width,player.height);
    }
    ctx.globalAlpha=1;

    const dw=player.width*player.sx,dh=player.height*player.sy;
    const dx=sx(player.x)+(player.width-dw)/2;
    const dy=player.y+(player.height-dh);

    ctx.fillStyle="rgba(0,0,0,0.2)";ctx.beginPath();
    ctx.ellipse(sx(player.x)+player.width/2,player.y+player.height+2,dw*0.5,4,0,0,Math.PI*2);ctx.fill();

    const bg=ctx.createLinearGradient(dx,dy,dx+dw,dy+dh);
    bg.addColorStop(0,"#ff7070");bg.addColorStop(1,"#c62828");
    ctx.fillStyle=bg;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(dx,dy,dw,dh,6*player.sx);
    else ctx.rect(dx,dy,dw,dh);
    ctx.fill();

    ctx.fillStyle="rgba(255,255,255,0.2)";ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(dx+3,dy+3,dw*0.4,dh*0.25,3);
    else ctx.rect(dx+3,dy+3,dw*0.4,dh*0.25);
    ctx.fill();

    const eb=player.facingRight?dw*0.5:0,ey=dy+dh*0.2;
    ctx.fillStyle="white";
    ctx.fillRect(dx+eb+3,ey,6*player.sx,6*player.sy);
    ctx.fillRect(dx+eb+13,ey,6*player.sx,6*player.sy);
    ctx.fillStyle="#1a1a2e";
    const ld=player.facingRight?2:-1;
    ctx.fillRect(dx+eb+3+ld,ey+1,3*player.sx,4*player.sy);
    ctx.fillRect(dx+eb+13+ld,ey+1,3*player.sx,4*player.sy);

    if(player.isGrounded&&player.onVine===null){
        const lf=[0,5,0,-5][player.walkFrame];
        ctx.fillStyle="#c62828";
        ctx.fillRect(dx+4,dy+dh,10,5+lf);ctx.fillRect(dx+dw-14,dy+dh,10,5-lf);
    }

    // On vine: show grip hands
    if(player.onVine){
        ctx.fillStyle="#8B4513";
        ctx.fillRect(dx+2,dy+4,8,6);ctx.fillRect(dx+dw-10,dy+4,8,6);
    }
}

function drawPause(){
    ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,GAME_W,GAME_H);
    ctx.textAlign="center";
    ctx.font="bold 48px 'Press Start 2P'";ctx.fillStyle="#f7c948";
    ctx.fillText("PAUSE",GAME_W/2,GAME_H/2-30);
    ctx.font="12px 'Press Start 2P'";ctx.fillStyle="#ccc";
    ctx.fillText("P ou ESC pour reprendre",GAME_W/2,GAME_H/2+20);
    ctx.textAlign="left";
}
function drawLevelComplete(){
    const t=levelCompleteTimer/120;
    ctx.fillStyle=`rgba(0,0,0,${Math.min(t*1.5,0.7)})`;ctx.fillRect(0,0,GAME_W,GAME_H);
    ctx.textAlign="center";
    ctx.font="bold 36px 'Press Start 2P'";
    ctx.fillStyle=`hsl(${50+Math.sin(Date.now()/200)*15},100%,65%)`;
    ctx.fillText(levelData.name+" ✓",GAME_W/2,GAME_H/2-30);
    if(currentLevel<LEVEL_DEFS.length-1){
        ctx.font="12px 'Press Start 2P'";ctx.fillStyle="white";
        ctx.fillText("→ "+LEVEL_DEFS[currentLevel+1].name,GAME_W/2,GAME_H/2+25);
    }
    ctx.textAlign="left";
}
function drawGameWon(){
    ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,GAME_W,GAME_H);
    // Rainbow
    for(let i=0;i<7;i++){
        ctx.strokeStyle=`hsl(${i*52},100%,60%)`;ctx.lineWidth=8;
        ctx.beginPath();ctx.arc(GAME_W/2,GAME_H+20,180+i*20,-Math.PI,0);ctx.stroke();
    }
    ctx.textAlign="center";
    const hue=((Date.now()/600)*60)%360;
    ctx.font="bold 52px 'Press Start 2P'";ctx.fillStyle=`hsl(${hue},100%,65%)`;
    ctx.fillText("VICTOIRE !",GAME_W/2,GAME_H/2-40);
    ctx.font="12px 'Press Start 2P'";ctx.fillStyle="white";
    ctx.fillText("10 niveaux terminés !",GAME_W/2,GAME_H/2+15);
    ctx.font="9px 'Press Start 2P'";ctx.fillStyle="#aaa";
    ctx.fillText("R pour rejouer",GAME_W/2,GAME_H/2+60);
    ctx.textAlign="left";
}
function drawGameOver(){
    ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,GAME_W,GAME_H);
    ctx.textAlign="center";
    ctx.font="bold 52px 'Press Start 2P'";ctx.fillStyle="#e53935";
    ctx.fillText("GAME OVER",GAME_W/2,GAME_H/2-30);
    ctx.font="11px 'Press Start 2P'";ctx.fillStyle="#aaa";
    ctx.fillText("R pour recommencer",GAME_W/2,GAME_H/2+35);
    ctx.textAlign="left";
}

// ══════════════════════════════════════════════════════════════════
// MAIN DRAW
// ══════════════════════════════════════════════════════════════════
function draw(){
    ctx.clearRect(0,0,GAME_W,GAME_H);
    drawBackground();
    drawGround();
    drawSpecials();
    drawPlatforms();
    drawCoins();
    drawEnemies();
    drawFlag();
    drawParticles();
    drawWeather();
    drawPlayer();
    if(levelComplete)drawLevelComplete();
    if(paused&&!gameOver&&!gameWon)drawPause();
    if(gameWon)drawGameWon();
    if(gameOver)drawGameOver();
}

function gameLoop(){update();draw();requestAnimationFrame(gameLoop);}

// ══════════════════════════════════════════════════════════════════
// MOTEUR AUDIO RÉTRO
// ══════════════════════════════════════════════════════════════════
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSFX(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'death') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        osc.frequency.setValueAtTime(800, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    } else if (type === 'stomp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    }
}

// ══════════════════════════════════════════════════════════════════
// MUSIQUE DE FOND MP3 — un fichier par thème
// ══════════════════════════════════════════════════════════════════
const THEME_MUSIC = {
    prairie: 'prairie.mp3',
    snow:    'neige.mp3',
    jungle:  'jungle.mp3',
    volcano: 'volcan.mp3',
    water:   'eau.mp3',
    cave:    'grotte.mp3',
    sky:     'prairie.mp3',   // ciel → douce comme prairie
    desert:  'volcan.mp3',    // désert → tension comme volcan
    haunted: 'grotte.mp3',    // hanté → mystérieux comme grotte
    final:   'final.mp3'
};

const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.volume = 0.45;
let currentMusicFile = '';
let musicUnlocked = false;

function bgMusicPlay(theme) {
    const file = THEME_MUSIC[theme] || 'prairie.mp3';
    if (file === currentMusicFile) return; // already playing this one
    currentMusicFile = file;
    bgMusic.pause();
    bgMusic.src = file;
    bgMusic.currentTime = 0;
    if (musicUnlocked) {
        bgMusic.play().catch(() => {});
    }
}

function bgMusicPause() {
    bgMusic.pause();
}

function bgMusicResume() {
    if (musicUnlocked && currentMusicFile) {
        bgMusic.play().catch(() => {});
    }
}

// Unlock audio on first keypress (browser autoplay policy)
document.addEventListener('keydown', () => {
    if (!musicUnlocked) {
        musicUnlocked = true;
        bgMusic.play().catch(() => {});
    }
}, { passive: true });

// ══════════════════════════════════════════════════════════════════
// CONTRÔLES TACTILES MOBILE
// ══════════════════════════════════════════════════════════════════
(function setupTouchControls() {
    const btnLeft  = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const btnJump  = document.getElementById("btn-jump");
    if (!btnLeft || !btnRight || !btnJump) return;

    function press(btn, action) {
        btn.classList.add("pressed");
        if (action === "left")  { keys.left = true;  player.facingRight = false; }
        if (action === "right") { keys.right = true; player.facingRight = true; }
        if (action === "jump")  {
            player.jumpBuffer = player.jumpBufferMax;
            player.wantsJump = true;
            // Unlock audio on first touch
            if (!musicUnlocked) {
                musicUnlocked = true;
                bgMusic.play().catch(() => {});
            }
        }
    }

    function release(btn, action) {
        btn.classList.remove("pressed");
        if (action === "left")  keys.left = false;
        if (action === "right") keys.right = false;
        // jump releases are handled by variable jump height in keyup
        // here just clear wantsJump after a delay so it registers
    }

    function addTouch(btn, action) {
        btn.addEventListener("touchstart",  e => { e.preventDefault(); press(btn, action); },   { passive: false });
        btn.addEventListener("touchend",    e => { e.preventDefault(); release(btn, action); }, { passive: false });
        btn.addEventListener("touchcancel", e => { e.preventDefault(); release(btn, action); }, { passive: false });
        // Mouse fallback for testing on desktop
        btn.addEventListener("mousedown",  e => { e.preventDefault(); press(btn, action); });
        btn.addEventListener("mouseup",    e => { e.preventDefault(); release(btn, action); });
        btn.addEventListener("mouseleave", e => { release(btn, action); });
    }

    addTouch(btnLeft,  "left");
    addTouch(btnRight, "right");
    addTouch(btnJump,  "jump");

    // Also resize touch controls container to match canvas
    const origResize = resizeCanvas;
    window.resizeCanvas = function() {
        origResize();
        // touch overlay matches canvas size automatically via position:absolute
    };
})();

// ── Démarrage du jeu ─────────────────────────────────────────────
const saved = loadProgress();
if(saved){
    currentLevel = saved.level;
    lives = saved.lives > 0 ? saved.lives : 3;
}
loadLevel(currentLevel);
spawnPlayer();
updateHUD();
gameLoop();
