const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 1. Dimensions Dynamiques (On lâche le 800x400 rigide)
let GAME_W = 800;
let GAME_H = 400;

function CW() { return GAME_W; }
function CH() { return Math.max(GAME_H, 400); }
// On fige le sol absolu à 350 pour que tes plateformes restent à la bonne hauteur !
function FLOOR() { return 350; }

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function rnd(a, b) { return a + Math.random() * (b - a); }

// ── Focus & scroll fix ─────────────────────────────────────────────
document.body.setAttribute("tabindex","0");
window.addEventListener("load", () => document.body.focus());
window.addEventListener("keydown", e => {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();
}, { passive: false });

document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
document.addEventListener("touchstart", e => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", () => {
        keys.left=false; keys.right=false; keys.jump=false;
        player.wantsJump=false;
        document.body.focus();
    });
});

// ── Fullscreen & Responsive (Le correctif HD et plein écran) ────────
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
    const isFS     = !!document.fullscreenElement;
    const isMobile = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    const hud   = document.getElementById("hud");
    const touch = document.getElementById("touch-controls");

    const hudH   = hud ? hud.offsetHeight : 0;
    const touchH = (isMobile && touch && getComputedStyle(touch).display !== 'none') ? touch.offsetHeight : 0;

    const availW = window.innerWidth;
    const availH = window.innerHeight - (isFS ? 0 : hudH) - touchH;

    // A. Aspect Ratio Dynamique (Fini les bandes noires !)
    if (availW > availH) {
        // Mode Paysage : on bloque la hauteur, on élargit le champ de vision
        GAME_H = 400;
        GAME_W = availW * (GAME_H / availH);
    } else {
        // Mode Portrait : on garde une largeur de base, et on affiche plus de ciel et de sous-sol
        GAME_W = 600;
        GAME_H = availH * (GAME_W / availW);
    }

    // B. Haute Définition via DevicePixelRatio (Fini le jeu pixelisé !)
    dpr = window.devicePixelRatio || 1;
    canvas.width  = GAME_W * dpr;
    canvas.height = GAME_H * dpr;

    // C. Étirement de l'interface (Prend toute la place de l'écran)
    canvas.style.width  = availW + "px";
    canvas.style.height = availH + "px";

    // Application du zoom net sur le contexte de dessin
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const wrapper = document.getElementById("wrapper");
    if (wrapper) wrapper.style.width = "100%";
    if (hud) hud.style.width = "100%";

    const gc = document.getElementById("game-container");
    if (gc) { gc.style.width = availW + "px"; gc.style.height = availH + "px"; }
}

document.getElementById("btn-fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
    document.body.focus();
});
document.addEventListener("fullscreenchange", resizeCanvas);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 200));
requestAnimationFrame(() => requestAnimationFrame(resizeCanvas));

const LEVEL_DEFS = [
// ─── 0: PRAIRIE (intro) ────────────────────────────────────────────
{
    name: "Plaine Verte", levelWidth: 2400,
    theme: "prairie",
    bgColors: ["#f5d0a0","#e8a878","#c87850"], skyStars: true,
    groundColor: "#5a8a20", groundTop: "#7ab028",
    platformColor: "#c08050", platformTopColor: "#d4a070",
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
    bonusCoins:[{x:480,y:155},{x:1280,y:85},{x:1850,y:135}],
    checkpoint:{x:1200,y:290,reached:false},
    goal:{x:2350,y:250},
    clouds:[{x:100,y:40,w:120,spd:0.2},{x:400,y:70,w:90,spd:0.15},
            {x:700,y:30,w:150,spd:0.25},{x:1100,y:55,w:110,spd:0.18},
            {x:1500,y:40,w:130,spd:0.22},{x:1900,y:65,w:95,spd:0.2}]
},
// ─── 1: NEIGE & GLACE ──────────────────────────────────────────────
{
    name: "Toundra Glacée", levelWidth: 2600,
    theme: "snow",
    bgColors: ["#eef5fc","#d8eaf8","#c0d8f0"], skyStars: true,
    groundColor: "#e8f4fc", groundTop: "#ffffff",
    platformColor: "#b0c8e0", platformTopColor: "#d0e4f0",
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
    bonusCoins:[{x:500,y:135},{x:1200,y:65},{x:2000,y:85}],
    checkpoint:{x:1300,y:290,reached:false},
    bonusCoins:[{x:450,y:105},{x:1100,y:75},{x:2200,y:105}],
    checkpoint:{x:1300,y:290,reached:false},
    goal:{x:2540,y:250},
    clouds:[{x:100,y:50,w:130,spd:0.3},{x:500,y:30,w:100,spd:0.25},
            {x:900,y:60,w:150,spd:0.28},{x:1400,y:40,w:120,spd:0.32},
            {x:1900,y:55,w:110,spd:0.27},{x:2300,y:35,w:100,spd:0.3}]
},
// ─── 2: PLUIE & VENT & LIANES ──────────────────────────────────────
{
    name: "Forêt Tropicale", levelWidth: 2800,
    theme: "jungle",
    bgColors: ["#2a5a1a","#1e4212","#12280a"], skyStars: false,
    groundColor: "#2a5010", groundTop: "#3a7018",
    platformColor: "#4a7828", platformTopColor: "#6a9840",
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
    bonusCoins:[{x:560,y:125},{x:1300,y:75},{x:2200,y:75}],
    checkpoint:{x:1400,y:290,reached:false},
    goal:{x:2750,y:250},
    clouds:[]
},
// ─── 3: VOLCAN & LAVE ──────────────────────────────────────────────
{
    name: "Volcan en Furie", levelWidth: 2800,
    theme: "volcano",
    bgColors: ["#2a0a00","#580c00","#8a1800"], skyStars: false,
    groundColor: "#2a1008", groundTop: "#481808",
    platformColor: "#7a3010", platformTopColor: "#a04820",
    movingPlatforms:[
        {x:300,y:270,w:90,h:14,vx:1.5,minX:200,maxX:500,vy:0,minY:0,maxY:0},
        {x:900,y:250,w:90,h:14,vx:-2,minX:750,maxX:1050,vy:0,minY:0,maxY:0},
        {x:1800,y:200,w:80,h:14,vx:0,vy:1,minY:150,maxY:270,minX:0,maxX:0}
    ],
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
    bonusCoins:[{x:420,y:155},{x:1350,y:165},{x:2200,y:165}],
    checkpoint:{x:1400,y:290,reached:false},
    bonusCoins:[{x:490,y:125},{x:1130,y:95},{x:2000,y:95}],
    checkpoint:{x:1400,y:290,reached:false},
    bonusCoins:[{x:500,y:125},{x:1200,y:65},{x:2300,y:85}],
    checkpoint:{x:1400,y:290,reached:false},
    bonusCoins:[{x:520,y:110},{x:1150,y:95},{x:2300,y:150}],
    checkpoint:{x:1400,y:290,reached:false},
    goal:{x:2740,y:250},
    clouds:[]
},
// ─── 4: EAU (zones aquatiques) ─────────────────────────────────────
{
    name: "Lagon Submergé", levelWidth: 2800,
    theme: "water",
    bgColors: ["#a0c8e8","#78a8d0","#5080b0"], skyStars: false,
    groundColor: "#3860a0", groundTop: "#5888c0",
    platformColor: "#4878b0", platformTopColor: "#6898c8",
    movingPlatforms:[
        {x:500,y:240,w:80,h:14,vx:1.8,minX:360,maxX:580,vy:0,minY:0,maxY:0},
        {x:1200,y:220,w:80,h:14,vx:0,vy:1.2,minY:180,maxY:290,minX:0,maxX:0},
        {x:2100,y:240,w:80,h:14,vx:2,minX:2000,maxX:2300,vy:0,minY:0,maxY:0}
    ],
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
    bgColors: ["#1a1008","#251810","#301e12"], skyStars: false,
    groundColor: "#2a1c10", groundTop: "#3a2818",
    platformColor: "#4a3020", platformTopColor: "#6a4830",
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
    bgColors: ["#fde8d8","#f8c8a8","#f0a888"], skyStars: false,
    groundColor: "#c0e0ff", groundTop: "#ffffff",
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
    bonusCoins:[{x:500,y:115},{x:1150,y:95},{x:2250,y:120}],
    checkpoint:{x:1500,y:290,reached:false},
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
    bgColors: ["#f0c878","#e8a840","#c87820"], skyStars: false,
    groundColor: "#c8901a", groundTop: "#e0b030",
    platformColor: "#c08050", platformTopColor: "#d4a070",
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
    bgColors: ["#1a0818","#2a1028","#3a1838"], skyStars: true,
    groundColor: "#1a0c18", groundTop: "#2a1828",
    platformColor: "#3a2030", platformTopColor: "#5a3848",
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
    bgColors: ["#0a0510","#18082a","#280a40"], skyStars: true,
    groundColor: "#100808", groundTop: "#201018",
    platformColor: "#3a1828", platformTopColor: "#5a2840",
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
    bonusCoins:[{x:480,y:115},{x:1100,y:90},{x:2400,y:80}],
    checkpoint:{x:1600,y:290,reached:false},
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
function loadBestTime(){
    try { return parseFloat(localStorage.getItem('gogogo_best'))||null; } catch(e){ return null; }
}
function saveBestTime(t){
    try { localStorage.setItem('gogogo_best', t); } catch(e){}
}

let currentLevel=0, lives=3, score=0;
let titleScreen=true; // show title screen first
let titleAnim=0;
let totalBonusCoins=0;
let checkpointX=null, checkpointY=null;
let gameWon=false, gameOver=false, paused=false;
let levelComplete=false, levelCompleteTimer=0;
let cameraX=0;
let shakeTimer=0, shakeMag=0;
let speedrunTime=0, speedrunActive=false, speedrunBest=null;
let speedrunStartTime=0;
let levelData, platforms, coins, enemies, goal;
let bonusCoins=[];
let movingPlatforms=[];  // platforms with movement
let floatingTexts=[];    // floating text FX
let boss=null;           // boss object for level 10
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
    x:rnd(0,3000),y:rnd(-1500,400),r:rnd(0.3,1.8),
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
    onIce:false,inWater:false,onVine:null,wantsJump:false,vineCD:0,
    wallSliding:false,     // currently wall-sliding
    wallDir:0,             // which wall: -1=left, 1=right
    wallJumpCD:0,          // cooldown after wall jump
    dashTimer:0,           // frames of dash active
    dashCD:0,              // cooldown frames
    dashDir:1,             // direction of last dash
    canDoubleJump:false,
    blinkTimer:rnd(60,200)|0,  // frames until next blink
    blinkFrame:0,              // 0=open, 1-3=closing/closed
    scarfPoints:[]             // physics points for scarf
};

// ══════════════════════════════════════════════════════════════════
// INPUT
// ══════════════════════════════════════════════════════════════════
const keys={left:false,right:false,jump:false};
document.addEventListener("keydown",e=>{
    if(titleScreen && (e.code==="Space"||e.code==="ArrowLeft"||e.code==="ArrowRight"||e.code==="ArrowUp"||e.code==="Enter")){
        dismissTitle(); return;
    }
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
document.addEventListener("keydown",e=>{
    if((e.code==="ShiftLeft"||e.code==="ShiftRight")&&!e.repeat) triggerDash();
});

function dismissTitle(){
    titleScreen=false;
    // Unlock audio
    if(!musicUnlocked){ musicUnlocked=true; bgMusic.play().catch(()=>{}); }
    if(audioCtx.state==='suspended') audioCtx.resume();
    bgMusicPlay(levelData.theme);
}

function triggerDash(){
    if(player.dashCD>0||player.dashTimer>0||player.onVine)return;
    player.dashDir = player.facingRight?1:-1;
    player.dashTimer=12; // 12 frames of dash
    player.dashCD=40;    // 40 frames cooldown
    triggerShake(4,8);
    playSFX('jump');
    // Fire trail burst
    for(let i=0;i<8;i++){
        particles.push({x:player.x+20,y:player.y+20,
            vx:-player.dashDir*(3+Math.random()*3),vy:(Math.random()-0.5)*2,
            life:0.9,decay:0.05,size:5+Math.random()*5,
            color:`hsl(${Math.random()*40},100%,60%)`});
    }
}

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
    clearProgress(); speedrunActive=false; speedrunTime=0; speedrunBest=loadBestTime();
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
    bonusCoins=(levelData.bonusCoins||[]).map(c=>({...c,collected:false}));
    movingPlatforms=(levelData.movingPlatforms||[]).map(p=>({...p}));
    boss=null;
    if(idx===9) setTimeout(spawnBoss, 1000); // boss spawns on final level
    waterZones=levelData.waterZones||[];
    lavaRivers=levelData.lavaRivers||[];
    birds=(levelData.birds||[]).map(b=>({...b,flap:0,flapTimer:0}));
    ghosts=(levelData.ghosts||[]).map(g=>({...g,t:0}));

    // Weather particles init
    weatherParticles=[];
    if(levelData.snowParticles){
        for(let i=0;i<120;i++)
            weatherParticles.push({x:rnd(0,3000),y:rnd(-1500,400),spd:rnd(0.5,1.5),drift:rnd(-0.3,0.3),r:rnd(2,5),type:"snow"});
    }
    if(levelData.rain){
        for(let i=0;i<180;i++)
            weatherParticles.push({x:rnd(0,3000),y:rnd(-1500,400),spd:rnd(12,18),len:rnd(8,18),type:"rain"});
    }

    lavaParticles=[];

    score=0;levelComplete=false;levelCompleteTimer=0;
    checkpointX=null;checkpointY=null;
    if(idx===0){ speedrunTime=0; speedrunActive=true; speedrunStartTime=performance.now(); }
    updateHUD();
    bgMusicPlay(levelData.theme);
}

function spawnPlayer(){
    player.x = checkpointX !== null ? checkpointX : 50;
    player.y = checkpointY !== null ? checkpointY : FLOOR()-player.height-2;player.vx=0;player.vy=0;
    player.isGrounded=false;player.sx=1;player.sy=1;
    player.trail=[];player.invincible=0;
    player.coyoteTimer=0;player.jumpBuffer=0;player.wantsJump=false;player.vineCD=0;
    player.canDoubleJump=false;player.dashTimer=0;player.dashCD=0;
    player.wallSliding=false;player.wallDir=0;player.wallJumpCD=0;
    player.scarfPoints=[{x:player.x+20,y:player.y+8},{x:player.x+20,y:player.y+8},{x:player.x+20,y:player.y+8},{x:player.x+20,y:player.y+8}];
    player.blinkTimer=(60+Math.random()*140)|0; player.blinkFrame=0;
    player.onIce=false;player.inWater=false;player.onVine=null;
    grappledVine=null;
}

function resetToCheckpoint(){
    playSFX('death'); triggerShake(10,20);
    lives--;updateHUD();
    if(lives<=0){gameOver=true;clearProgress();return;}
    spawnDeathP(player.x+20,player.y+20);
    saveProgress();
    if(checkpointX!==null){
        spawnPlayer(); // respawn at checkpoint, no reload
    } else {
        loadLevel(currentLevel);spawnPlayer();
    }
}

function updateHUD(){
    document.getElementById("score-value").textContent=score+" / "+coins.length;
    document.getElementById("level-value").textContent=(currentLevel+1);
    const bonusEl=document.getElementById("bonus-value");
    if(bonusEl) bonusEl.textContent='★'+totalBonusCoins+(totalBonusCoins%10>0?' ('+(10-totalBonusCoins%10)+')':'');
    document.getElementById("lives-value").textContent=lives>0?'❤ ×'+lives:'☠';
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

function spawnText(x, y, text, color){
    floatingTexts.push({x, y, text, color: color||'#f7c948',
        vy: -1.5, life: 1.0, decay: 0.018, size: Math.round(CW()*0.022)});
}
function updateFloatingTexts(){
    for(let i=floatingTexts.length-1;i>=0;i--){
        const t=floatingTexts[i];
        t.y+=t.vy; t.vy*=0.95; t.life-=t.decay;
        if(t.life<=0) floatingTexts.splice(i,1);
    }
}
function drawFloatingTexts(){
    ctx.textAlign='center';
    for(const t of floatingTexts){
        ctx.globalAlpha=t.life;
        ctx.font=`bold ${t.size}px 'Press Start 2P'`;
        ctx.fillStyle=t.color;
        ctx.shadowColor=t.color; ctx.shadowBlur=8;
        ctx.fillText(t.text, sx(t.x), t.y);
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.textAlign='left';
}


// ══════════════════════════════════════════════════════════════════
// BOSS — Le Roi Square
// ══════════════════════════════════════════════════════════════════
function spawnBoss(){
    boss = {
        x: 2800, y: 200,
        width: 80, height: 80,
        vx: -2, vy: 0,
        hp: 3,           // 3 stomps to defeat
        maxHp: 3,
        state: 'walk',   // 'walk' | 'jump' | 'hurt' | 'dead'
        hurtTimer: 0,
        jumpTimer: 120,  // jumps every 120 frames
        t: 0,
        dead: false,
        minX: 2500, maxX: 3100
    };
}

function updateBoss(){
    if(!boss||boss.dead)return;
    boss.t++;
    boss.hurtTimer=Math.max(0,boss.hurtTimer-1);

    // AI
    boss.jumpTimer--;
    if(boss.jumpTimer<=0){
        boss.vy=-13; boss.jumpTimer=rnd(80,140);
        boss.state='jump';
        triggerShake(8,14);
        playSFX('stomp');
        // Shockwave particles
        for(let i=0;i<14;i++){
            const a=(Math.PI*2/14)*i;
            particles.push({x:boss.x+40,y:boss.y+80,
                vx:Math.cos(a)*5,vy:Math.sin(a)*3,
                life:0.8,decay:0.05,size:6,color:'#e74c3c'});
        }
    }
    // Gravity
    boss.vy=Math.min(boss.vy+0.6,15);
    boss.y+=boss.vy;
    boss.x+=boss.vx;
    // Floor
    if(boss.y+boss.height>=FLOOR()){
        boss.y=FLOOR()-boss.height;
        if(boss.vy>8) triggerShake(10,18);
        boss.vy=0; boss.state='walk';
    }
    // Bounce horizontally
    if(boss.x<=boss.minX||boss.x+boss.width>=boss.maxX){ boss.vx*=-1; }

    // Player stomps boss
    if(boss.hurtTimer===0){
        if(player.x<boss.x+boss.width-6 && player.x+player.width>boss.x+6 &&
           player.y<boss.y+boss.height && player.y+player.height>boss.y){
            if(player.vy>1 && player.y+player.height<boss.y+25){
                // HIT!
                boss.hp--;
                boss.hurtTimer=50;
                player.vy=player.jumpForce*0.7;
                triggerShake(12,20);
                playSFX('stomp');
                spawnText(boss.x+40,boss.y,'TOUCHE!','#e74c3c');
                for(let i=0;i<16;i++){
                    const a=Math.random()*Math.PI*2;
                    particles.push({x:boss.x+40,y:boss.y+20,
                        vx:Math.cos(a)*rnd(3,7),vy:Math.sin(a)*rnd(3,7)-2,
                        life:1,decay:0.04,size:rnd(4,10),
                        color:`hsl(${rnd(0,40)},100%,60%)`});
                }
                if(boss.hp<=0){
                    boss.dead=true;
                    boss.state='dead';
                    triggerShake(20,40);
                    playSFX('win');
                    spawnText(boss.x+40,boss.y-20,'VAINCU!','#f1c40f');
                    for(let i=0;i<30;i++){
                        const a=Math.random()*Math.PI*2, sp=rnd(3,10);
                        particles.push({x:boss.x+40,y:boss.y+40,
                            vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-3,
                            life:1.2,decay:0.025,size:rnd(5,14),
                            color:`hsl(${rnd(40,60)},100%,65%)`});
                    }
                    // Spawn the goal flag after boss is defeated
                    goal = {x:boss.x+60,y:FLOOR()-110};
                }
            } else if(player.invincible===0){
                player.invincible=player.invincibleMax;
                resetToCheckpoint(); return;
            }
        }
    }
}

function drawBoss(){
    if(!boss||boss.dead)return;
    const rx=sx(boss.x);
    if(Math.abs(rx-CW()/2)>CW())return;

    const t=Date.now()/300;
    const hurt=boss.hurtTimer>0;
    const pulse=1+Math.sin(boss.t*0.15)*0.05;

    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(rx+40,FLOOR()+4,35,8,0,0,Math.PI*2); ctx.fill();

    // Body
    ctx.save(); ctx.translate(rx+40,boss.y+40); ctx.scale(pulse,pulse);
    const bg=ctx.createLinearGradient(-40,-40,40,40);
    bg.addColorStop(0, hurt?'#ff6060':'#2c2c2c');
    bg.addColorStop(1, hurt?'#cc0000':'#111');
    ctx.fillStyle=bg;
    ctx.shadowColor=hurt?'rgba(255,0,0,0.8)':'rgba(0,0,0,0.5)';
    ctx.shadowBlur=20;
    if(ctx.roundRect) ctx.roundRect(-40,-40,80,80,8);
    else ctx.rect(-40,-40,80,80);
    ctx.fill();
    ctx.shadowBlur=0;

    // Crown
    ctx.fillStyle='#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-30,-42);ctx.lineTo(-30,-55);
    ctx.lineTo(-15,-48);ctx.lineTo(0,-60);
    ctx.lineTo(15,-48);ctx.lineTo(30,-55);ctx.lineTo(30,-42);ctx.closePath();ctx.fill();

    // Eyes — menacing
    ctx.fillStyle='#ff0000';
    ctx.beginPath();ctx.ellipse(-14,-8,10,8,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(14,-8,10,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='white';
    ctx.beginPath();ctx.arc(-14,-8,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(14,-8,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath();ctx.arc(-12,-8,2.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(16,-8,2.5,0,Math.PI*2);ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle='#ff0000'; ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(-24,-18);ctx.lineTo(-4,-14);ctx.stroke();
    ctx.beginPath();ctx.moveTo(24,-18);ctx.lineTo(4,-14);ctx.stroke();

    // Mouth
    ctx.strokeStyle='#ff0000'; ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,15,15,0.2,Math.PI-0.2);ctx.stroke();

    ctx.restore();

    // HP bar above boss
    const barW=100, barX=rx-10;
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(barX-2,boss.y-24,barW+4,14);
    const hpColor=boss.hp>1?'#e74c3c':'#ff0000';
    ctx.fillStyle=hpColor;
    ctx.fillRect(barX,boss.y-22,barW*(boss.hp/boss.maxHp),10);
    ctx.font=`bold 8px 'Press Start 2P'`;
    ctx.fillStyle='white';ctx.textAlign='center';
    ctx.fillText('ROI SQUARE',rx+40,boss.y-28);
    ctx.textAlign='left';
}

function triggerShake(magnitude,duration){shakeMag=magnitude;shakeTimer=duration;}

function update(){
    pollGamepad();
    if(titleScreen)return;
    if(speedrunActive && !paused && !levelComplete) speedrunTime = (performance.now()-speedrunStartTime)/1000;
    if(paused||gameOver||gameWon)return;
    if(levelComplete){
        levelCompleteTimer++;
        if(levelCompleteTimer>120){
            if(currentLevel<LEVEL_DEFS.length-1){
                currentLevel++;loadLevel(currentLevel);spawnPlayer();
                levelComplete=false;updateHUD();
                saveProgress();
                if(currentLevel===9) spawnText(player.x+20,player.y-40,'⚠️ BOSS !','#e74c3c');
            } else {
                gameWon=true; clearProgress();
                speedrunActive=false;
                speedrunBest=loadBestTime();
                if(speedrunBest===null||speedrunTime<speedrunBest){ speedrunBest=speedrunTime; saveBestTime(speedrunTime); }
            }
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

        // Dash override
        if(player.dashTimer>0){
            player.vx=player.dashDir*18;
            player.vy=Math.max(player.vy,-2);
            player.dashTimer--;
        }
        if(player.dashCD>0) player.dashCD--;
        player.x+=player.vx;
        player.y+=player.vy;
        player.x=clamp(player.x,0,levelData.levelWidth-player.width);

        if(player.y>CH()+100){resetToCheckpoint();return;}
    }

    // ── Ground & Platform collision ───────────────────────
    let onGround=false;
    player.onIce=false;

    if(player.onVine===null){
        if(player.y+player.height>=FLOOR()){
            if(player.vy>5){player.sx=1.4;player.sy=0.6;}
            player.y=FLOOR()-player.height;player.vy=0;onGround=true;
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
    if(onGround) player.canDoubleJump=false; // reset on landing

    // ── Wall Slide & Wall Jump ────────────────────────────
    player.wallSliding=false;
    player.wallJumpCD=Math.max(0,player.wallJumpCD-1);
    if(!player.isGrounded && !player.inWater && player.onVine===null && player.dashTimer===0){
        // Check left wall
        const checkWallL = platforms.some(p=>{
            const pw=p.w||p.width||80;const ph=p.h||p.height||20;
            return player.x<=p.x+pw+2 && player.x>=p.x+pw-6 &&
                   player.y+player.height>p.y+4 && player.y<p.y+ph;
        }) || player.x<=2;
        const checkWallR = platforms.some(p=>{
            const pw=p.w||p.width||80;const ph=p.h||p.height||20;
            return player.x+player.width>=p.x-2 && player.x+player.width<=p.x+6 &&
                   player.y+player.height>p.y+4 && player.y<p.y+ph;
        }) || player.x+player.width>=levelData.levelWidth-2;

        if((checkWallL&&keys.left)||(checkWallR&&keys.right)){
            player.wallSliding=true;
            player.wallDir=checkWallL?-1:1;
            // Slow fall while sliding
            player.vy=Math.min(player.vy, 1.5);
            // Dust particles
            if(Math.random()<0.25){
                particles.push({
                    x:player.x+(player.wallDir<0?0:player.width),
                    y:player.y+player.height*0.6,
                    vx:player.wallDir*rnd(0.5,2),vy:rnd(-0.5,0.5),
                    life:0.6,decay:0.06,size:rnd(2,5),color:'rgba(220,200,160,0.7)'
                });
            }
        }

        // Wall jump!
        if(player.wallSliding && player.wantsJump && player.wallJumpCD===0){
            player.vy=player.jumpForce*0.9;
            player.vx=-player.wallDir*player.speed*1.8; // kick away from wall
            player.wantsJump=false; player.jumpBuffer=0;
            player.wallJumpCD=15; player.wallSliding=false;
            player.canDoubleJump=true;
            player.sx=0.6;player.sy=1.3;
            spawnJumpP(player.x,player.y);
            playSFX('jump');
            spawnText(player.x+20,player.y,'WALL!','#3498db');
            triggerShake(3,6);
        }
    }


    // Jump + Double Jump
    player.jumpBuffer=Math.max(0,player.jumpBuffer-1);
    if(player.jumpBuffer>0&&player.coyoteTimer>0&&player.onVine===null){
        player.vy=jumpF;
        player.coyoteTimer=0;player.jumpBuffer=0;player.wantsJump=false;player.vineCD=0;
    player.canDoubleJump=false;player.dashTimer=0;player.dashCD=0;
    player.wallSliding=false;player.wallDir=0;player.wallJumpCD=0;
    player.scarfPoints=[{x:player.x+20,y:player.y+8},{x:player.x+20,y:player.y+8},{x:player.x+20,y:player.y+8},{x:player.x+20,y:player.y+8}];
    player.blinkTimer=(60+Math.random()*140)|0; player.blinkFrame=0;player.isGrounded=false;
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
            if(player.invincible===0){triggerShake(8,15);resetToCheckpoint();return;}
        }
    }
    // Lava particles
    if(levelData.lavaParticles&&Math.random()<0.3){
        for(const lr of lavaRivers){
            if(sx(lr.x)<CW()&&sx(lr.x+lr.w)>0){
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

    // ── Bonus Coins ───────────────────────────────────────────
    for(const bc of bonusCoins){
        if(!bc.collected){
            const r=12;
            if(player.x<bc.x+r&&player.x+player.width>bc.x-r&&
               player.y<bc.y+r&&player.y+player.height>bc.y-r){
                bc.collected=true;
                totalBonusCoins++;
                spawnCoinP(bc.x,bc.y);
                playSFX('coin');
                // Every 10 bonus coins = +1 life !
                if(totalBonusCoins%10===0){
                    lives++;
                    updateHUD();
                    spawnCoinP(player.x+20,player.y); spawnCoinP(player.x,player.y-10);
                    playSFX('win');
                    spawnText(player.x+20,player.y-20,'+1 VIE ❤️','#e74c3c');
                }
            }
        }
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
                spawnText(coin.x,coin.y-10,'+1',  '#f1c40f');
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
                    playSFX('stomp'); triggerShake(6,12);
                    spawnText(e.x+15,e.y,'BOOM!','#e74c3c');
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
    const topY = -(CH() > 400 ? CH() - 400 : 0) - 50; // vrai sommet du ciel
    for(const p of weatherParticles){
        if(p.type==="snow"){
            p.x+=p.drift+(windX*0.5);p.y+=p.spd;
            if(p.y>420) p.y=topY;
            if(p.x>CW()+200)p.x=-5;if(p.x<-5)p.x=CW()+200;
        } else if(p.type==="rain"){
            p.x+=windX*0.5+1;p.y+=p.spd;
            if(p.y>420){p.y=topY;p.x=rnd(0,CW()+200);}
            if(p.x>CW()+200)p.x=0;
        }
    }

    // ── Boss ──────────────────────────────────────────────
    updateBoss();

    // ── Checkpoint ────────────────────────────────────────
    if(levelData.checkpoint && !levelData.checkpoint.reached){
        const cp = levelData.checkpoint;
        if(player.x > cp.x && player.x < cp.x + 30){
            cp.reached = true;
            checkpointX = cp.x - player.width/2;
            checkpointY = FLOOR() - player.height - 2;
            spawnCoinP(cp.x+15, cp.y-20); // visual sparkle
            playSFX('coin');
        }
    }

    // ── Goal ──────────────────────────────────────────────
    if(currentLevel===9&&boss&&!boss.dead){}else
    if(score>=coins.length){
        if(player.x<goal.x+15+20&&player.x+player.width>goal.x-10&&
           player.y<goal.y+100&&player.y+player.height>goal.y){
            if(!levelComplete) playSFX('win');
            levelComplete=true;levelCompleteTimer=0;
        }
    }


    // ── Moving Platforms ──────────────────────────────────
    for(const mp of movingPlatforms){
        const prevX=mp.x, prevY=mp.y;
        if(mp.vx){
            mp.x+=mp.vx;
            if(mp.x<=mp.minX||mp.x+mp.w>=mp.maxX){mp.vx*=-1;}
        }
        if(mp.vy){
            mp.y+=mp.vy;
            if(mp.y<=mp.minY||mp.y+mp.h>=mp.maxY){mp.vy*=-1;}
        }
        // Carry the player if standing on this platform
        if(player.isGrounded){
            const pw=mp.w,ph=mp.h;
            if(player.x+player.width>mp.x&&player.x<mp.x+pw&&
               Math.abs(player.y+player.height-mp.y)<6){
                player.x+=mp.x-prevX;
                player.y+=mp.y-prevY;
            }
        }
        // Collision (treat like normal platform)
        const pw=mp.w,ph=mp.h;
        if(player.x+player.width>mp.x&&player.x<mp.x+pw&&
           player.vy>=0&&
           player.y+player.height>=mp.y&&
           player.y+player.height<=mp.y+ph+Math.max(player.vy+1,10)){
            if(player.vy>5){player.sx=1.4;player.sy=0.6;}
            player.y=mp.y-player.height;player.vy=0;
            player.isGrounded=true;player.coyoteTimer=player.coyoteMax;
        }
    }

    updateFloatingTexts();
    // Camera
    cameraX=clamp(player.x-CW()/3,0,levelData.levelWidth-CW());

    updateParticles();
}

// ══════════════════════════════════════════════════════════════════
// DRAW HELPERS
// ══════════════════════════════════════════════════════════════════
function sx(worldX){return worldX-cameraX;}

function drawBackground(){
    let offsetY = CH() > 400 ? CH() - 400 : 0;
    const c=levelData.bgColors;
    const g=ctx.createLinearGradient(0,-offsetY,0,400);
    g.addColorStop(0,c[0]);g.addColorStop(0.6,c[1]);g.addColorStop(1,c[2]);
    ctx.fillStyle=g;ctx.fillRect(0,-offsetY,CW(),400+offsetY);

    const theme=levelData.theme;

    if(levelData.skyStars){
        for(const s of stars){
            const tw=0.5+0.5*Math.sin(starTime*s.ts*60+s.to);
            ctx.globalAlpha=s.alpha*tw;
            ctx.fillStyle="white";
            ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    } else {
        const lg=ctx.createRadialGradient(CW()/2,400,0,CW()/2,400,400);
        if(theme==="volcano"){
            lg.addColorStop(0,"rgba(255,80,0,0.4)");lg.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=lg;ctx.fillRect(0,-offsetY,CW(),400+offsetY);
            const vx=sx(1400);
            ctx.fillStyle="#1a0500";
            ctx.beginPath();ctx.moveTo(vx-200,FLOOR());ctx.lineTo(vx,FLOOR()-200);ctx.lineTo(vx+200,FLOOR());ctx.fill();
            ctx.fillStyle="rgba(255,100,0,0.3)";
            ctx.beginPath();ctx.ellipse(vx,FLOOR()-195,40,15,0,0,Math.PI*2);ctx.fill();
        }
    }
    if(theme==="haunted"){
        ctx.fillStyle="rgba(220,220,180,0.9)";
        ctx.beginPath();ctx.arc(650,60,35,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(180,180,150,0.4)";
        ctx.beginPath();ctx.arc(665,55,35,0,Math.PI*2);ctx.fill();
    }
    if(theme==="final"&&levelData.rainbow){
        const rx=sx(3150/2);
        for(let i=0;i<7;i++){
            ctx.strokeStyle=`hsla(${i*50},100%,60%,0.15)`;ctx.lineWidth=18;
            ctx.beginPath();ctx.arc(rx,FLOOR()+50,250+i*20,-Math.PI,0);ctx.stroke();
        }
    }
    if(theme==="cave"){
        ctx.fillStyle="#1a1a22";
        for(let i=0;i<20;i++){
            const bx=(i*140+50)-cameraX*0.5;
            const bh=30+Math.sin(i*2.3)*20;
            ctx.beginPath();
            ctx.moveTo(bx,-offsetY);ctx.lineTo(bx-12,bh);ctx.lineTo(bx+12,bh);ctx.fill();
        }
    }
    if(theme==="sky"){
        ctx.fillStyle="rgba(255,255,255,0.08)";
        for(let i=0;i<6;i++){
            const bx=((i*280+120)-cameraX*0.2+CW()*2)%(CW()*2)-CW()*0.5;
            ctx.beginPath();ctx.ellipse(bx,80+i*30,90,30,0,0,Math.PI*2);ctx.fill();
        }
    }
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
    ctx.fillRect(0,FLOOR(),CW(),800);
    ctx.fillStyle=levelData.groundTop;
    ctx.fillRect(0,FLOOR(),CW(),8);

    const theme=levelData.theme;
    if(theme==="snow"){
        for(let i=0;i<12;i++){
            const bx=(i*120+80)-cameraX%120;
            ctx.fillStyle="rgba(255,255,255,0.6)";
            ctx.beginPath();ctx.ellipse(bx,FLOOR()+4,40+i%3*10,10,0,0,Math.PI*2);ctx.fill();
        }
    }
    if(theme==="cave"){
        ctx.strokeStyle="rgba(255,255,255,0.04)";ctx.lineWidth=1;
        const t=40,off=cameraX%t;
        for(let x=-off;x<CW();x+=t){ctx.beginPath();ctx.moveTo(x,FLOOR());ctx.lineTo(x,800);ctx.stroke();}
    }
    if(theme==="desert"){
        ctx.strokeStyle="rgba(180,160,80,0.3)";ctx.lineWidth=1;
        for(let i=0;i<6;i++){
            const ry=FLOOR()+12+i*6;
            const off=cameraX*0.4%80;
            ctx.beginPath();
            for(let x=0;x<CW()+80;x+=80){
                ctx.moveTo(x-off,ry);ctx.quadraticCurveTo(x-off+20,ry-4,x-off+40,ry);
            }
            ctx.stroke();
        }
    }
}


function drawMovingPlatforms(){
    for(const mp of movingPlatforms){
        const rx=sx(mp.x);
        if(rx>CW()+10||rx+mp.w<-10)continue;
        // Glow outline to show it's special
        ctx.shadowColor='rgba(255,200,50,0.6)'; ctx.shadowBlur=8;
        ctx.fillStyle='rgba(0,0,0,0.25)';
        ctx.fillRect(rx+3,mp.y+3,mp.w,mp.h);
        ctx.fillStyle='#c8960a';
        ctx.fillRect(rx,mp.y,mp.w,mp.h);
        ctx.fillStyle='#f0c030';
        ctx.fillRect(rx,mp.y,mp.w,5);
        // Arrow hint showing direction
        ctx.fillStyle='rgba(255,255,200,0.5)';
        ctx.font='10px sans-serif'; ctx.textAlign='center';
        ctx.fillText(mp.vx>0?'→':mp.vx<0?'←':mp.vy>0?'↓':'↑', rx+mp.w/2, mp.y+12);
        ctx.textAlign='left'; ctx.shadowBlur=0;
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
            ctx.fillStyle="#5a3a1a";ctx.fillRect(rx-4,FLOOR()-30,8,30);
            // Flame
            ctx.shadowColor="rgba(255,150,0,0.9)";ctx.shadowBlur=20;
            const fg=ctx.createRadialGradient(rx,FLOOR()-38,0,rx,FLOOR()-30,16);
            fg.addColorStop(0,`rgba(255,${200+Math.sin(ft)*30},0,0.95)`);
            fg.addColorStop(0.5,`rgba(255,${80+Math.sin(ft+1)*20},0,0.7)`);
            fg.addColorStop(1,"rgba(255,0,0,0)");
            ctx.fillStyle=fg;
            ctx.beginPath();
            ctx.ellipse(rx+Math.sin(ft)*2,FLOOR()-38,8,14,Math.sin(ft)*0.2,0,Math.PI*2);
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
            ctx.fillRect(rx-6,FLOOR()-c.h,12,c.h);
            ctx.fillRect(rx-20,FLOOR()-c.h*0.6,14,8);
            ctx.fillRect(rx+6,FLOOR()-c.h*0.7,14,8);
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

function drawBonusCoins(){
    const t = Date.now()/300;
    for(let i=0;i<bonusCoins.length;i++){
        const bc = bonusCoins[i];
        if(bc.collected) continue;
        const rx = sx(bc.x);
        if(rx<-20||rx>CW()+20) continue;
        const bob = Math.sin(t+i*1.5)*4;
        const cy = bc.y + bob;
        // Sparkle glow
        ctx.globalAlpha = 0.5+0.3*Math.sin(t*2+i);
        const grd = ctx.createRadialGradient(rx,cy,0,rx,cy,18);
        grd.addColorStop(0,"rgba(255,100,200,0.7)");
        grd.addColorStop(1,"rgba(255,50,150,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();ctx.arc(rx,cy,18,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha = 1;
        // Star shape
        ctx.fillStyle = "#ff69b4";
        ctx.beginPath();
        for(let p=0;p<5;p++){
            const a1 = (p*4*Math.PI/5) - Math.PI/2 + Math.sin(t)*0.1;
            const a2 = ((p*4+2)*Math.PI/5) - Math.PI/2 + Math.sin(t)*0.1;
            const op = p===0 ? "moveTo" : "lineTo";
            ctx[op](rx+Math.cos(a1)*10, cy+Math.sin(a1)*10);
            ctx.lineTo(rx+Math.cos(a2)*4, cy+Math.sin(a2)*4);
        }
        ctx.closePath();ctx.fill();
        // Inner white dot
        ctx.fillStyle="rgba(255,255,255,0.8)";
        ctx.beginPath();ctx.arc(rx,cy,2,0,Math.PI*2);ctx.fill();
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
        grd.addColorStop(0,"rgba(210,160,60,0.6)");grd.addColorStop(1,"rgba(190,130,30,0)");
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(rx,cy,r*2,0,Math.PI*2);ctx.fill();
        const sh=Math.sin(t*2+i)*0.5+0.5;
        const cg=ctx.createRadialGradient(rx-3,cy-3,1,rx,cy,r);
        cg.addColorStop(0,"#e8c878");
        cg.addColorStop(1,"#c9943a");
        ctx.fillStyle=cg;ctx.beginPath();ctx.arc(rx,cy,r,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="rgba(255,240,200,0.6)";ctx.lineWidth=1.5;
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
        ctx.fillStyle="#7a4520";ctx.fillRect(rx,e.y,e.w,e.h);
        ctx.fillStyle="#5a3010";ctx.fillRect(rx+2,e.y+2,e.w-4,e.h-4);
        ctx.fillStyle="#fff176";
        ctx.fillRect(rx+4,e.y+6,7,6);ctx.fillRect(rx+19,e.y+6,7,6);
        ctx.fillStyle="#000";
        const po=e.dir>0?3:1;
        ctx.fillRect(rx+4+po,e.y+8,4,4);ctx.fillRect(rx+19+po,e.y+8,4,4);
        const ls=Math.sin(t*e.spd*e.dir)*5;
        ctx.fillStyle="#c62828";
        ctx.fillStyle="#8a5028";ctx.fillRect(rx+4,e.y+e.h,8,4+ls);ctx.fillRect(rx+18,e.y+e.h,8,4-ls);
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
            const sx2=((st*150+i*200)%(CW()+300))-150;
            ctx.beginPath();ctx.moveTo(sx2,sy);ctx.lineTo(sx2+sw,sy);ctx.stroke();
        }
    }
}

function drawCheckpoint(){
    if(!levelData || !levelData.checkpoint) return;
    const cp = levelData.checkpoint;
    const rx = sx(cp.x);
    if(Math.abs(rx) > CW()+50) return;
    const reached = cp.reached;
    const t = Date.now()/400;
    // Pole
    ctx.fillStyle = reached ? "#27ae60" : "#95a5a6";
    ctx.fillRect(rx, FLOOR()-70, 5, 70);
    // Flag
    for(let seg=0;seg<4;seg++){
        const wave = Math.sin(t+seg*0.9)*3;
        ctx.fillStyle = reached ? "#2ecc71" : "#bdc3c7";
        ctx.fillRect(rx+5+seg*8, FLOOR()-70+wave, 9, 22);
    }
    // CP label
    ctx.font = "bold 10px 'Press Start 2P'";
    ctx.fillStyle = reached ? "#2ecc71" : "#bdc3c7";
    ctx.textAlign = "center";
    ctx.fillText(reached ? "✓" : "CP", rx+2, FLOOR()-75);
    ctx.textAlign = "left";
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

    // ── Scarf physics simulation ─────────────────────────
    // ── Foulard ninja — physique en coordonnées MONDE ──────
    // Anchor = côté opposé à la direction de marche (le foulard flotte derrière)
    const anchorWX = player.x + (player.facingRight ? player.width*0.25 : player.width*0.75);
    const anchorWY = player.y + player.height*0.18;

    if(!player.scarfPoints||player.scarfPoints.length<4)
        player.scarfPoints=[
            {x:anchorWX,y:anchorWY,vx:0,vy:0},
            {x:anchorWX,y:anchorWY,vx:0,vy:0},
            {x:anchorWX,y:anchorWY,vx:0,vy:0},
            {x:anchorWX,y:anchorWY,vx:0,vy:0}
        ];
    const sp=player.scarfPoints;

    // Point 0 suit l'ancre exactement
    sp[0].x=anchorWX; sp[0].y=anchorWY;

    // Vélocité de référence du joueur (force opposée = le foulard traîne derrière)
    const dragX = -player.vx * 0.35;  // oppose le mouvement horizontal
    const dragY = -player.vy * 0.15 + 0.4; // légère gravité + oppose le mouvement vertical
    const wind  = (levelData&&levelData.wind?levelData.wind:0)*0.4;

    const SEG_LEN = 11; // longueur cible de chaque segment

    for(let i=1;i<4;i++){
        const prev=sp[i-1];
        // Appliquer forces : drag + vent + gravité légère
        sp[i].vx += (dragX + wind) * 0.18;
        sp[i].vy += dragY * 0.18 + 0.05;
        // Amortissement (air resistance)
        sp[i].vx *= 0.82;
        sp[i].vy *= 0.82;
        // Déplacer
        sp[i].x += sp[i].vx;
        sp[i].y += sp[i].vy;
        // Contrainte de longueur : garder chaque segment à SEG_LEN px du précédent
        const dx2=sp[i].x-prev.x, dy2=sp[i].y-prev.y;
        const dist=Math.sqrt(dx2*dx2+dy2*dy2)||1;
        const diff=(dist-SEG_LEN)/dist;
        sp[i].x -= dx2*diff*0.5;
        sp[i].y -= dy2*diff*0.5;
    }

    // Dessin du foulard (convertir world→screen uniquement ici)
    ctx.save();
    ctx.lineCap='round';
    for(let i=1;i<4;i++){
        const t=(i-1)/3;
        ctx.strokeStyle=`rgba(240,190,0,${0.92-t*0.25})`; // JAUNE DORÉ
        ctx.lineWidth=Math.max(1,5-i*1.2);
        ctx.beginPath();
        ctx.moveTo(sx(sp[i-1].x),sp[i-1].y);
        ctx.lineTo(sx(sp[i].x),sp[i].y);
        ctx.stroke();
    }
    // Embout du foulard
    ctx.fillStyle='rgba(255,210,0,0.85)';
    ctx.beginPath();ctx.arc(sx(sp[3].x),sp[3].y,2.5,0,Math.PI*2);ctx.fill();
    ctx.restore();

    // Water tint
    if(player.inWater){ctx.globalAlpha=0.3;ctx.fillStyle="#0080ff";ctx.fillRect(sx(player.x),player.y,player.width,player.height);ctx.globalAlpha=1;}

    // Trail
    for(const t of player.trail){ctx.globalAlpha=Math.max(0,t.alpha);ctx.fillStyle="#ff5252";ctx.fillRect(sx(t.x),t.y,player.width,player.height);}
    ctx.globalAlpha=1;

    const dw=player.width*player.sx,dh=player.height*player.sy;
    const dx=sx(player.x)+(player.width-dw)/2;
    const dy=player.y+(player.height-dh);

    // Shadow
    ctx.fillStyle="rgba(0,0,0,0.2)";ctx.beginPath();
    ctx.ellipse(sx(player.x)+player.width/2,player.y+player.height+2,dw*0.5,4,0,0,Math.PI*2);ctx.fill();

    // Body
    const bg=ctx.createLinearGradient(dx,dy,dx+dw,dy+dh);
    bg.addColorStop(0,"#f04870");bg.addColorStop(1,"#e8204a");
    ctx.fillStyle=bg;
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(dx,dy,dw,dh,6*player.sx);else ctx.rect(dx,dy,dw,dh);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.18)";ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(dx+3,dy+3,dw*0.4,dh*0.22,3);else ctx.rect(dx+3,dy+3,dw*0.4,dh*0.22);ctx.fill();

    // ── Blink animation ──────────────────────────────────
    player.blinkTimer--;
    if(player.blinkTimer<=0){
        player.blinkFrame++;
        if(player.blinkFrame>=5){player.blinkFrame=0;player.blinkTimer=(80+Math.random()*160)|0;}
        else player.blinkTimer=3;
    }
    const blinking=player.blinkFrame>0&&player.blinkFrame<4;
    const eyeH=blinking?Math.max(1,6*player.sy*(1-player.blinkFrame*0.3)):6*player.sy;

    // Eyes
    const eb=player.facingRight?dw*0.5:0,ey=dy+dh*0.2;
    ctx.fillStyle="white";
    if(!blinking){
        ctx.fillRect(dx+eb+3,ey,6*player.sx,eyeH);
        ctx.fillRect(dx+eb+13,ey,6*player.sx,eyeH);
    } else {
        ctx.fillRect(dx+eb+3,ey+eyeH/2,6*player.sx,Math.max(1,eyeH));
        ctx.fillRect(dx+eb+13,ey+eyeH/2,6*player.sx,Math.max(1,eyeH));
    }
    if(!blinking){
        ctx.fillStyle="#1a1a2e";
        const ld=player.facingRight?2:-1;
        ctx.fillRect(dx+eb+3+ld,ey+1,3*player.sx,4*player.sy);
        ctx.fillRect(dx+eb+13+ld,ey+1,3*player.sx,4*player.sy);
    }

    // Ninja headband — jaune doré comme le foulard
    ctx.fillStyle='#d4a017';
    ctx.fillRect(dx+2,dy+dh*0.08,dw-4,5*player.sy);
    ctx.fillStyle='rgba(255,230,80,0.6)';
    ctx.fillRect(dx+2,dy+dh*0.08,dw-4,2);

    // Legs
    if(player.isGrounded&&player.onVine===null){
        const lf=[0,5,0,-5][player.walkFrame];
        ctx.fillStyle="#c62828";
        ctx.fillRect(dx+4,dy+dh,10,5+lf);ctx.fillRect(dx+dw-14,dy+dh,10,5-lf);
    }
    if(player.onVine){ctx.fillStyle="#8B4513";ctx.fillRect(dx+2,dy+4,8,6);ctx.fillRect(dx+dw-10,dy+4,8,6);}

    // Wall slide dust
    if(player.wallSliding){
        ctx.fillStyle='rgba(255,220,160,0.6)';
        ctx.beginPath();ctx.arc(dx+(player.wallDir<0?0:dw),dy+dh*0.7,4+Math.random()*3,0,Math.PI*2);ctx.fill();
    }
}

function drawPause(){
    ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,CW(),CH());
    ctx.textAlign="center";
    ctx.font="bold 48px 'Press Start 2P'";ctx.fillStyle="#f7c948";
    ctx.fillText("PAUSE",CW()/2,CH()/2-30);
    ctx.font="12px 'Press Start 2P'";ctx.fillStyle="#ccc";
    ctx.fillText("P ou ESC pour reprendre",CW()/2,CH()/2+20);
    ctx.textAlign="left";
}
function drawLevelComplete(){
    const t=levelCompleteTimer/120;
    ctx.fillStyle=`rgba(0,0,0,${Math.min(t*1.5,0.7)})`;ctx.fillRect(0,0,CW(),CH());
    ctx.textAlign="center";
    ctx.font="bold 36px 'Press Start 2P'";
    ctx.fillStyle=`hsl(${50+Math.sin(Date.now()/200)*15},100%,65%)`;
    ctx.fillText(levelData.name+" ✓",CW()/2,CH()/2-30);
    if(currentLevel<LEVEL_DEFS.length-1){
        ctx.font="12px 'Press Start 2P'";ctx.fillStyle="white";
        ctx.fillText("→ "+LEVEL_DEFS[currentLevel+1].name,CW()/2,CH()/2+25);
    }
    ctx.textAlign="left";
}
function drawGameWon(){
    ctx.fillStyle="rgba(0,0,0,0.8)";ctx.fillRect(0,0,CW(),CH());
    for(let i=0;i<7;i++){
        ctx.strokeStyle=`hsl(${i*52},100%,60%)`;ctx.lineWidth=8;
        ctx.beginPath();ctx.arc(CW()/2,CH()+20,180+i*20,-Math.PI,0);ctx.stroke();
    }
    ctx.textAlign="center";
    const hue=((Date.now()/600)*60)%360;
    ctx.font="bold 52px 'Press Start 2P'";ctx.fillStyle=`hsl(${hue},100%,65%)`;
    ctx.fillText("VICTOIRE !",CW()/2,CH()/2-50);
    ctx.font="12px 'Press Start 2P'";ctx.fillStyle="white";
    ctx.fillText("10 niveaux terminés !",CW()/2,CH()/2+5);
    if(speedrunBest!==null){
        const mm=String(Math.floor(speedrunBest/60)).padStart(2,'0');
        const ss=String(Math.floor(speedrunBest%60)).padStart(2,'0');
        const ms=String(Math.floor((speedrunBest%1)*100)).padStart(2,'0');
        ctx.font=`${Math.round(CW()*0.018)}px 'Press Start 2P'`;ctx.fillStyle='#f7c948';
        ctx.fillText('⏱ '+mm+':'+ss+'.'+ms,CW()/2,CH()/2+32);
    }
    const isMob=window.matchMedia("(hover:none) and (pointer:coarse)").matches;
    ctx.font="9px 'Press Start 2P'";ctx.fillStyle="#aaa";
    ctx.fillText(isMob?"Appuie sur Restart":"R pour rejouer",CW()/2,CH()/2+35);
    // Big tap button
    const bx=CW()/2-100, by=CH()/2+50, bw=200, bh=50;
    ctx.fillStyle="rgba(241,196,15,0.9)";
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,12);
    else ctx.rect(bx,by,bw,bh);
    ctx.fill();
    ctx.fillStyle="#1a1a2e";ctx.font="bold 11px 'Press Start 2P'";
    ctx.fillText("↺  REJOUER",CW()/2,by+bh/2+5);
    ctx.textAlign="left";
}
function drawGameOver(){
    ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,CW(),CH());
    ctx.textAlign="center";
    ctx.font="bold 52px 'Press Start 2P'";ctx.fillStyle="#e53935";
    ctx.fillText("GAME OVER",CW()/2,CH()/2-40);
    const isMob=window.matchMedia("(hover:none) and (pointer:coarse)").matches;
    ctx.font="10px 'Press Start 2P'";ctx.fillStyle="#aaa";
    ctx.fillText(isMob?"Appuie sur Restart":"R pour recommencer",CW()/2,CH()/2+10);
    // Big tap button on mobile
    const bx=CW()/2-100, by=CH()/2+30, bw=200, bh=50;
    ctx.fillStyle="rgba(229,57,53,0.9)";
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(bx,by,bw,bh,12);
    else ctx.rect(bx,by,bw,bh);
    ctx.fill();
    ctx.fillStyle="white";ctx.font="bold 11px 'Press Start 2P'";
    ctx.fillText("↺  REJOUER",CW()/2,by+bh/2+5);
    ctx.textAlign="left";
}


// ══════════════════════════════════════════════════════════════════
// GAMEPAD API — Xbox / PlayStation / Switch Pro
// ══════════════════════════════════════════════════════════════════
let gamepadIndex = null;
window.addEventListener("gamepadconnected",    e => { gamepadIndex = e.gamepad.index; });
window.addEventListener("gamepaddisconnected", e => { if(e.gamepad.index === gamepadIndex) gamepadIndex = null; });

function pollGamepad(){
    if(gamepadIndex === null) return;
    const gp = navigator.getGamepads()[gamepadIndex];
    if(!gp) return;

    // Left stick or D-pad
    const axisX   = gp.axes[0] || 0;
    const dLeft   = gp.buttons[14]?.pressed || axisX < -0.3;
    const dRight  = gp.buttons[15]?.pressed || axisX >  0.3;
    // A (Xbox) / Cross (PS) / B (Switch) = jump
    const jumpBtn = gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
    // Start / Options = pause
    const startBtn= gp.buttons[9]?.pressed || gp.buttons[8]?.pressed;

    keys.left  = dLeft;
    keys.right = dRight;
    if(jumpBtn && !gamepadPrevJump){
        player.jumpBuffer = player.jumpBufferMax;
        player.wantsJump  = true;
        if(!musicUnlocked){ musicUnlocked=true; bgMusic.play().catch(()=>{}); }
    }
    if(startBtn && !gamepadPrevStart && !gameOver && !gameWon) togglePause();

    gamepadPrevJump  = jumpBtn;
    gamepadPrevStart = startBtn;
}
let gamepadPrevJump=false, gamepadPrevStart=false;

// ══════════════════════════════════════════════════════════════════
// PARALLAX BACKGROUNDS — mountain / tree silhouettes per theme
// ══════════════════════════════════════════════════════════════════
const PARALLAX_LAYERS = {
    prairie: { color:"rgba(80,120,40,0.35)", peaks:[
        {x:0,w:200,h:120},{x:180,w:180,h:90},{x:340,w:220,h:140},{x:520,w:160,h:80},
        {x:660,w:240,h:160},{x:880,w:180,h:100},{x:1040,w:200,h:130},{x:1220,w:160,h:90},
        {x:1350,w:220,h:150},{x:1560,w:180,h:110},{x:1720,w:200,h:130},{x:1900,w:160,h:95}
    ]},
    snow: { color:"rgba(180,210,240,0.3)", peaks:[
        {x:0,w:240,h:160},{x:220,w:180,h:110},{x:380,w:260,h:180},{x:620,w:200,h:120},
        {x:800,w:240,h:150},{x:1020,w:180,h:100},{x:1180,w:260,h:170},{x:1420,w:200,h:130}
    ]},
    jungle: { color:"rgba(20,80,20,0.45)", peaks:[
        {x:0,w:80,h:200,tree:true},{x:100,w:70,h:180,tree:true},{x:190,w:90,h:220,tree:true},
        {x:300,w:80,h:190,tree:true},{x:400,w:70,h:210,tree:true},{x:490,w:90,h:200,tree:true},
        {x:600,w:80,h:185,tree:true},{x:700,w:70,h:215,tree:true}
    ]},
    volcano: { color:"rgba(80,20,0,0.5)", peaks:[
        {x:0,w:300,h:200},{x:280,w:260,h:160},{x:520,w:320,h:240},{x:820,w:280,h:180},
        {x:1080,w:300,h:220},{x:1360,w:260,h:160}
    ]},
    water: { color:"rgba(0,40,100,0.3)", peaks:[
        {x:0,w:200,h:100},{x:180,w:180,h:80},{x:340,w:220,h:120},{x:540,w:160,h:70},
        {x:680,w:240,h:110},{x:900,w:200,h:90}
    ]},
    cave: { color:"rgba(40,30,20,0.6)", peaks:[
        {x:0,w:180,h:140},{x:160,w:160,h:110},{x:300,w:200,h:160},{x:480,w:180,h:120},
        {x:640,w:200,h:150},{x:820,w:160,h:100}
    ]},
    sky: { color:"rgba(255,255,255,0.12)", peaks:[
        {x:0,w:300,h:80},{x:280,w:260,h:60},{x:520,w:320,h:90},{x:820,w:280,h:70},
        {x:1080,w:300,h:85},{x:1360,w:260,h:65}
    ]},
    desert: { color:"rgba(180,120,20,0.3)", peaks:[
        {x:0,w:200,h:80},{x:180,w:180,h:60},{x:340,w:220,h:90},{x:540,w:160,h:70},
        {x:680,w:240,h:85},{x:900,w:200,h:65}
    ]},
    haunted: { color:"rgba(40,20,60,0.5)", peaks:[
        {x:0,w:80,h:220,tree:true},{x:100,w:60,h:200,tree:true},{x:180,w:80,h:240,tree:true},
        {x:280,w:70,h:210,tree:true},{x:370,w:80,h:230,tree:true},{x:460,w:60,h:200,tree:true}
    ]},
    final: { color:"rgba(60,0,100,0.4)", peaks:[
        {x:0,w:200,h:160},{x:180,w:180,h:120},{x:340,w:220,h:180},{x:540,w:200,h:140},
        {x:720,w:240,h:170},{x:940,w:180,h:130}
    ]}
};

function drawParallax(){
    const theme = levelData.theme;
    const layer = PARALLAX_LAYERS[theme];
    if(!layer) return;
    ctx.fillStyle = layer.color;
    const parallaxOffset = cameraX * 0.4; // moves at 40% camera speed
    const repeatW = 1200; // tile the pattern
    for(const p of layer.peaks){
        for(let rep = -1; rep <= Math.ceil(levelData.levelWidth / repeatW); rep++){
            const rx = p.x + rep * repeatW - parallaxOffset;
            if(rx > CW() + 100 || rx + p.w < -100) continue;
            const baseY = FLOOR();
            if(p.tree){
                // Draw dead/leafy tree silhouette
                ctx.fillRect(rx + p.w/2 - 5, baseY - p.h, 10, p.h);
                ctx.beginPath();
                ctx.ellipse(rx + p.w/2, baseY - p.h - 20, p.w/2, p.h*0.4, 0, 0, Math.PI*2);
                ctx.fill();
            } else {
                // Mountain triangle with slight curve
                ctx.beginPath();
                ctx.moveTo(rx, baseY);
                ctx.lineTo(rx + p.w/2, baseY - p.h);
                ctx.lineTo(rx + p.w, baseY);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}
// ══════════════════════════════════════════════════════════════════
// MAIN DRAW
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// GAMEPAD API — Xbox / PlayStation / Switch Pro
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// PARALLAX BACKGROUNDS — mountain / tree silhouettes per theme
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════


function drawLivingDecor(){
    const theme=levelData?levelData.theme:'prairie';
    const t=Date.now()/1000;
    const wind=levelData&&levelData.wind?levelData.wind:0;

    if(theme==='prairie'||theme==='jungle'){
        // Grass blades along ground and platform tops
        ctx.strokeStyle=theme==='jungle'?'rgba(30,160,30,0.7)':'rgba(80,160,40,0.65)';
        const bladeCount=Math.ceil(CW()/12);
        for(let i=0;i<bladeCount;i++){
            const bx=(i*12-(cameraX%12));
            const sway=Math.sin(t*2+i*0.7+wind)*3+wind*2;
            const h=4+Math.sin(i*3.7)*3;
            ctx.lineWidth=1.5;
            ctx.beginPath();ctx.moveTo(bx,FLOOR());
            ctx.quadraticCurveTo(bx+sway,FLOOR()-h*0.5,bx+sway*1.5,FLOOR()-h);
            ctx.stroke();
        }
        // Grass on platform tops
        for(const plat of platforms){
            const rx=sx(plat.x);
            const pw=plat.w||plat.width||80;
            if(rx>CW()+10||rx+pw<-10)continue;
            for(let i=0;i<Math.ceil(pw/10);i++){
                const bx=rx+i*10+5;
                const sway=Math.sin(t*2+bx*0.5+wind)*2;
                const h=3+Math.sin(bx)*2;
                ctx.beginPath();ctx.moveTo(bx,plat.y);
                ctx.quadraticCurveTo(bx+sway,plat.y-h*0.5,bx+sway*1.2,plat.y-h);
                ctx.stroke();
            }
        }
    }

    if(theme==='volcano'){
        // Cracks on platforms
        ctx.strokeStyle='rgba(80,20,0,0.5)';ctx.lineWidth=1;
        for(const plat of platforms){
            const rx=sx(plat.x);
            const pw=plat.w||plat.width||80;
            if(rx>CW()||rx+pw<0)continue;
            // Deterministic cracks based on position
            const seed=plat.x;
            for(let c=0;c<3;c++){
                const cx=rx+pw*(0.2+c*0.3+Math.sin(seed+c)*0.1);
                const cy=plat.y+3;
                ctx.beginPath();ctx.moveTo(cx,cy);
                ctx.lineTo(cx+Math.sin(seed+c*2)*6,cy+5);
                ctx.lineTo(cx+Math.sin(seed+c*3)*4,cy+9);ctx.stroke();
            }
        }
    }

    if(theme==='cave'){
        // Moss patches on platforms
        ctx.fillStyle='rgba(40,100,40,0.35)';
        for(const plat of platforms){
            const rx=sx(plat.x);
            const pw=plat.w||plat.width||80;
            if(rx>CW()||rx+pw<0)continue;
            const seed=plat.x*0.01;
            for(let m=0;m<4;m++){
                const mx=rx+pw*(0.1+m*0.22+Math.sin(seed+m)*0.08);
                const mw=8+Math.sin(seed*m)*4;
                ctx.beginPath();ctx.ellipse(mx,plat.y+2,mw,4,0,0,Math.PI*2);ctx.fill();
            }
        }
        // Water drips from ceiling
        ctx.fillStyle='rgba(100,180,255,0.4)';
        const drip=Math.floor(t*3)%20;
        for(let i=0;i<8;i++){
            const dx=(i*137+50-cameraX*0.3)%CW();
            const dy=(t*60+i*50)%200;
            ctx.beginPath();ctx.ellipse(dx,dy,2,4+Math.sin(t+i)*2,0,0,Math.PI*2);ctx.fill();
        }
    }

    if(theme==='snow'){
        // Ice sparkles on platforms
        const sparkT=Math.floor(t*4);
        for(const plat of platforms){
            const rx=sx(plat.x);
            const pw=plat.w||plat.width||80;
            if(rx>CW()||rx+pw<0)continue;
            for(let s=0;s<3;s++){
                const sx2=rx+pw*(0.25+s*0.25);
                const sparkle=(sparkT+plat.x+s)%6===0;
                if(sparkle){
                    ctx.fillStyle='rgba(200,240,255,0.9)';
                    ctx.beginPath();ctx.arc(sx2,plat.y-2,3,0,Math.PI*2);ctx.fill();
                    ctx.strokeStyle='rgba(200,240,255,0.6)';ctx.lineWidth=1;
                    ctx.beginPath();
                    ctx.moveTo(sx2-5,plat.y-2);ctx.lineTo(sx2+5,plat.y-2);ctx.stroke();
                    ctx.moveTo(sx2,plat.y-7);ctx.lineTo(sx2,plat.y+3);ctx.stroke();
                }
            }
        }
    }
}

function drawDynamicLights(){
    const theme=levelData?levelData.theme:'prairie';
    const px=sx(player.x)+player.width/2;
    const py=player.y+player.height/2;

    // ── Dark levels: player halo ─────────────────────────
    if(theme==='cave'||theme==='haunted'){
        // Darken entire scene then punch hole with radial gradient
        ctx.save();
        ctx.fillStyle='rgba(0,0,0,0.72)';
        ctx.fillRect(0,-500,CW(),CH()+1000);
        // Light halo around player
        const radius=Math.round(CW()*0.22)+Math.sin(Date.now()/600)*8;
        const haloGrad=ctx.createRadialGradient(px,py,0,px,py,radius);
        haloGrad.addColorStop(0,'rgba(0,0,0,0)');
        haloGrad.addColorStop(0.55,'rgba(0,0,0,0)');
        haloGrad.addColorStop(1,'rgba(0,0,0,0.72)');
        ctx.globalCompositeOperation='destination-out';
        ctx.fillStyle=haloGrad;
        ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();
        ctx.globalCompositeOperation='source-over';
        // Warm light tint
        const warmGrad=ctx.createRadialGradient(px,py,0,px,py,radius*0.6);
        warmGrad.addColorStop(0,theme==='cave'?'rgba(255,180,80,0.12)':'rgba(180,100,255,0.1)');
        warmGrad.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=warmGrad;
        ctx.beginPath();ctx.arc(px,py,radius*0.6,0,Math.PI*2);ctx.fill();
        // Torch lights for cave
        if(theme==='cave'){
            for(const torch of (levelData.torches||[])){
                const tx=sx(torch.x);
                if(Math.abs(tx-px)>CW())continue;
                const tGrad=ctx.createRadialGradient(tx,FLOOR()-30,0,tx,FLOOR()-30,120);
                tGrad.addColorStop(0,'rgba(255,160,40,0.18)');
                tGrad.addColorStop(1,'rgba(0,0,0,0)');
                ctx.fillStyle=tGrad;
                ctx.beginPath();ctx.arc(tx,FLOOR()-30,120,0,Math.PI*2);ctx.fill();
            }
        }
        ctx.restore();
    }

    // ── Bright levels: God Rays ───────────────────────────
    if(theme==='jungle'||theme==='sky'||theme==='prairie'){
        const t=Date.now()/4000;
        ctx.save();
        ctx.globalAlpha=0.07;
        for(let i=0;i<5;i++){
            const angle=-0.3+i*0.15+Math.sin(t+i*1.2)*0.05;
            const startX=CW()*(0.2+i*0.15)+Math.sin(t*0.7+i)*30;
            const len=CH()*1.8;
            const width=CW()*0.08+Math.sin(t+i)*20;
            const grad=ctx.createLinearGradient(startX,-200,startX+Math.sin(angle)*len,len);
            grad.addColorStop(0,'rgba(255,255,200,0.9)');
            grad.addColorStop(1,'rgba(255,255,200,0)');
            ctx.fillStyle=grad;
            ctx.save();
            ctx.translate(startX,-200);
            ctx.rotate(angle);
            ctx.fillRect(-width/2,0,width,len);
            ctx.restore();
        }
        ctx.restore();
    }

    // ── Volcano: lava glow pulses ─────────────────────────
    if(theme==='volcano'){
        const t=Date.now()/800;
        for(const lr of lavaRivers){
            const rx=sx(lr.x);
            if(rx>CW()+200||rx+lr.w<-200)continue;
            const pulse=0.25+Math.sin(t)*0.1;
            const lavGrad=ctx.createLinearGradient(rx,lr.y-60,rx,lr.y);
            lavGrad.addColorStop(0,'rgba(255,80,0,0)');
            lavGrad.addColorStop(1,`rgba(255,80,0,${pulse})`);
            ctx.fillStyle=lavGrad;
            ctx.fillRect(rx,lr.y-60,lr.w,60);
        }
    }
}

// MAIN DRAW
// ══════════════════════════════════════════════════════════════════
function draw(){
    ctx.clearRect(0,0,CW(),CH());

    // Offset : aligne le sol en bas de l'écran, ciel infini au-dessus
    let offsetY = CH() > 400 ? CH() - 400 : 0;

    // Screen shake
    let shakeX=0, shakeY=0;
    if(shakeTimer>0){ shakeX=(Math.random()-0.5)*shakeMag*2; shakeY=(Math.random()-0.5)*shakeMag; shakeTimer--; shakeMag*=0.85; }
    ctx.save();
    ctx.translate(shakeX, offsetY+shakeY);

    drawBackground();
    drawGround();
    drawParallax();
    drawSpecials();
    drawPlatforms();
    drawMovingPlatforms();
    drawLivingDecor();
    drawBonusCoins();
    drawCoins();
    drawEnemies();
    drawBoss();
    drawCheckpoint();
    drawFlag();
    drawParticles();
    drawWeather();
    drawPlayer();
    drawDynamicLights();
    drawFloatingTexts();
    ctx.restore(); // annule le décalage pour l'UI


    // ── Speedrun timer ────────────────────────────────────
    if(speedrunActive||speedrunTime>0){
        const t2=speedrunTime;
        const mm=String(Math.floor(t2/60)).padStart(2,'0');
        const ss=String(Math.floor(t2%60)).padStart(2,'0');
        const ms=String(Math.floor((t2%1)*100)).padStart(2,'0');
        ctx.font=`bold ${Math.round(CW()*0.018)}px 'Press Start 2P'`;
        ctx.textAlign="right";
        ctx.fillStyle="rgba(255,255,255,0.55)";
        ctx.fillText(`⏱ ${mm}:${ss}.${ms}`, CW()-10, 22);
        ctx.textAlign="left";
    }
    if(levelComplete)drawLevelComplete();
    if(paused&&!gameOver&&!gameWon)drawPause();
    if(gameWon)drawGameWon();
    if(gameOver)drawGameOver();
}


function drawTitleScreen(){
    titleAnim += 0.02;
    ctx.clearRect(0,0,CW(),CH());

    // Animated gradient background
    const t = Date.now()/1000;
    const g = ctx.createLinearGradient(0,0,0,CH());
    g.addColorStop(0, `hsl(${220+Math.sin(t*0.3)*20},60%,15%)`);
    g.addColorStop(1, `hsl(${10+Math.sin(t*0.2)*15},50%,10%)`);
    ctx.fillStyle=g; ctx.fillRect(0,0,CW(),CH());

    // Stars
    ctx.fillStyle="white";
    for(const s of stars){
        const tw=0.5+0.5*Math.sin(t*s.ts*60+s.to);
        ctx.globalAlpha=s.alpha*tw*0.5;
        ctx.beginPath();ctx.arc(s.x%CW(),s.y%CH(),s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    // Bouncing squares decoration
    for(let i=0;i<6;i++){
        const bx=CW()*0.15+i*(CW()*0.14);
        const by=CH()*0.2+Math.sin(t*1.5+i*0.8)*20;
        const hue=i*50;
        const bg2=ctx.createLinearGradient(bx,by,bx+30,by+30);
        bg2.addColorStop(0,`hsl(${hue},90%,65%)`);
        bg2.addColorStop(1,`hsl(${hue+30},90%,40%)`);
        ctx.fillStyle=bg2;
        ctx.save();
        ctx.translate(bx+15,by+15);
        ctx.rotate(Math.sin(t+i)*0.3);
        if(ctx.roundRect) ctx.roundRect(-15,-15,30,30,5);
        else ctx.rect(-15,-15,30,30);
        ctx.fill();
        ctx.restore();
    }

    // GOGOGO SQUARE title — big, colorful, pulsing
    const pulse = 1+Math.sin(t*3)*0.04;
    ctx.save();
    ctx.translate(CW()/2, CH()*0.42);
    ctx.scale(pulse, pulse);
    ctx.textAlign="center";

    // Shadow
    ctx.shadowColor="rgba(232,32,74,0.6)";
    ctx.shadowBlur=30;
    ctx.font=`bold ${Math.round(CW()*0.09)}px 'Press Start 2P'`;
    const hue2 = (t*40)%360;
    ctx.fillStyle=`hsl(${hue2},100%,68%)`;
    ctx.fillText("GOGOGO",0,-CW()*0.05);
    ctx.fillStyle=`hsl(${(hue2+120)%360},100%,68%)`;
    ctx.fillText("SQUARE",0, CW()*0.02);
    ctx.shadowBlur=0;
    ctx.restore();

    // Subtitle
    ctx.textAlign="center";
    ctx.font=`${Math.round(CW()*0.018)}px 'Press Start 2P'`;
    ctx.fillStyle="rgba(240,210,160,0.7)";
    ctx.fillText("10 niveaux · 4 thèmes · musiques & effets", CW()/2, CH()*0.58);

    // Press to start — blink
    if(Math.floor(t*2)%2===0){
        ctx.font=`${Math.round(CW()*0.022)}px 'Press Start 2P'`;
        const isMob=window.matchMedia("(hover:none) and (pointer:coarse)").matches;
        ctx.fillStyle="#f7c948";
        ctx.fillText(isMob?"TOUCHE L'ÉCRAN":"APPUIE SUR ESPACE", CW()/2, CH()*0.7);
    }

    // Best speedrun time
    const best=loadBestTime();
    if(best){
        const mm=String(Math.floor(best/60)).padStart(2,'0');
        const ss=String(Math.floor(best%60)).padStart(2,'0');
        const ms=String(Math.floor((best%1)*100)).padStart(2,'0');
        ctx.font=`${Math.round(CW()*0.016)}px 'Press Start 2P'`;
        ctx.fillStyle="rgba(201,148,58,0.8)";
        ctx.fillText(`★ Meilleur temps : ${mm}:${ss}.${ms}`, CW()/2, CH()*0.82);
    }

    // Controls hint
    ctx.font=`${Math.round(CW()*0.013)}px 'Press Start 2P'`;
    ctx.fillStyle="rgba(255,255,255,0.25)";
    ctx.fillText("← → Déplacer  |  ESPACE Sauter  |  SHIFT Dash", CW()/2, CH()*0.91);
    ctx.textAlign="left";
}

function gameLoop(){if(titleScreen){drawTitleScreen();}else{update();draw();}
requestAnimationFrame(gameLoop);}

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
    const btnDash=document.getElementById("btn-dash");
    if(btnDash){
        btnDash.addEventListener("touchstart",e=>{e.preventDefault();triggerDash();},{passive:false});
        btnDash.addEventListener("mousedown",e=>{e.preventDefault();triggerDash();});
    }

    // Also resize touch controls container to match canvas
    const origResize = resizeCanvas;
    window.resizeCanvas = function() {
        origResize();
        // touch overlay matches canvas size automatically via position:absolute
    };
})();

// Tap canvas to restart on mobile (game over / win screens)
canvas.addEventListener("touchstart", e => {
    if(titleScreen){ e.preventDefault(); dismissTitle(); return; }
    if (!gameOver && !gameWon) return;
    const touch = e.touches[0];
    const rect  = canvas.getBoundingClientRect();
    // Canvas CSS size === canvas internal size on mobile (no scaling)
    // Map screen touch → game coords (dynamic resolution)
    const tx = (touch.clientX - rect.left) * (GAME_W / rect.width);
    const ty = (touch.clientY - rect.top)  * (GAME_H / rect.height);
    const btnY = gameWon ? CH()/2+50 : CH()/2+30;
    if(tx > CW()/2-100 && tx < CW()/2+100 && ty > btnY && ty < btnY+50){
        e.preventDefault();
        restartGame();
    }
}, { passive: false });

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
