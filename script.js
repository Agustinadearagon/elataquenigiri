// ========== ESTADO ==========
let canvas, ctx, width, height;
let player, nigiris = [];
let score = 0, lives = 3, highScore = 0;
let gameRunning = false;
let keys = { left: false, right: false };
let touchSide = 0;
let lastSpawn = 0;
let spawnInterval = 900;
let fallSpeed = 2.2;
let caraImg = new Image();
let invuln = 0;
let dificultad = "normal";
let particles = [];

const FACE_SIZE = 90;
const NIGIRI_W = 48;
const NIGIRI_H = 38;

// DOM
const pantallaInicio = document.getElementById("pantalla-inicio");
const pantallaDificultad = document.getElementById("pantalla-dificultad");
const pantallaJuego = document.getElementById("pantalla-juego");
const btnEmpezar = document.getElementById("btn-empezar");
const btnFacil = document.getElementById("btn-facil");
const btnNormal = document.getElementById("btn-normal");
const btnDificil = document.getElementById("btn-dificil");
const btnVolver = document.getElementById("btn-volver");
const btnReiniciar = document.getElementById("btn-reiniciar");
const btnMenu = document.getElementById("btn-menu");
const puntosEl = document.getElementById("puntos");
const vidasEl = document.getElementById("vidas");
const recordEl = document.getElementById("record");
const recordInicioEl = document.getElementById("record-inicio");
const mensajeFin = document.getElementById("mensaje-fin");
const overlayFin = document.getElementById("overlay-fin");

function init() {
    highScore = parseInt(localStorage.getItem("nigiri-record") || "0", 10);
    recordInicioEl.textContent = highScore;
    recordEl.textContent = highScore;

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    caraImg.src = "cara.jpg";
    resize();
    window.addEventListener("resize", resize);
    setupControls();
}

function resize() {
    width = Math.min(window.innerWidth, 440);
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    if (player) player.x = Math.min(player.x, width - FACE_SIZE - 8);
}

function setupControls() {
    window.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    });
    window.addEventListener("keyup", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    });

    const onTouch = (e) => {
        if (!gameRunning) return;
        e.preventDefault();
        const t = e.touches[0] || e.changedTouches[0];
        if (t) touchSide = t.clientX < window.innerWidth / 2 ? -1 : 1;
    };
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchend", () => { touchSide = 0; });
    canvas.addEventListener("touchcancel", () => { touchSide = 0; });
}

// ========== NAV ==========
btnEmpezar.addEventListener("click", () => {
    pantallaInicio.classList.add("oculta");
    pantallaDificultad.classList.remove("oculta");
});
btnVolver.addEventListener("click", () => {
    pantallaDificultad.classList.add("oculta");
    pantallaInicio.classList.remove("oculta");
});
btnFacil.addEventListener("click", () => startDif("facil"));
btnNormal.addEventListener("click", () => startDif("normal"));
btnDificil.addEventListener("click", () => startDif("dificil"));
btnReiniciar.addEventListener("click", (e) => { e.stopPropagation(); startDif(dificultad); });
btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    gameRunning = false;
    overlayFin.classList.add("oculta");
    pantallaJuego.classList.add("oculta");
    pantallaInicio.classList.remove("oculta");
    highScore = parseInt(localStorage.getItem("nigiri-record") || "0", 10);
    recordInicioEl.textContent = highScore;
});

function startDif(dif) {
    dificultad = dif;
    if (dif === "facil") {
        spawnInterval = 1100; fallSpeed = 1.8; lives = 5;
    } else if (dif === "normal") {
        spawnInterval = 800; fallSpeed = 2.5; lives = 3;
    } else {
        spawnInterval = 520; fallSpeed = 3.4; lives = 3;
    }
    empezar();
}

function empezar() {
    pantallaDificultad.classList.add("oculta");
    pantallaInicio.classList.add("oculta");
    pantallaJuego.classList.remove("oculta");
    overlayFin.classList.add("oculta");

    score = 0;
    gameRunning = true;
    nigiris = [];
    particles = [];
    lastSpawn = 0;
    invuln = 0;
    keys.left = keys.right = false;
    touchSide = 0;

    player = {
        x: width / 2 - FACE_SIZE / 2,
        y: height - FACE_SIZE - 24,
        w: FACE_SIZE,
        h: FACE_SIZE
    };

    actualizarHUD();
    requestAnimationFrame(loop);
}

function actualizarHUD() {
    puntosEl.textContent = score;
    vidasEl.textContent = Math.max(0, lives);
    recordEl.textContent = highScore;
}

// ========== LOOP ==========
function loop(ts) {
    if (!gameRunning) return;

    const speed = 5.5;
    if (keys.left || touchSide === -1) player.x -= speed;
    if (keys.right || touchSide === 1) player.x += speed;
    player.x = Math.max(4, Math.min(width - FACE_SIZE - 4, player.x));

    // Spawn nigiris
    if (ts - lastSpawn > spawnInterval) {
        spawnNigiri();
        lastSpawn = ts;
        // Acelerar un poco con el tiempo
        if (spawnInterval > 350) spawnInterval -= 3;
    }

    // Mover nigiris
    nigiris.forEach(n => {
        n.y += n.vy;
        n.rot += n.rotSpeed;
    });

    // Colisión cara ↔ nigiri (zona de la boca = mitad inferior de la cara)
    const boca = {
        x: player.x + 15,
        y: player.y + FACE_SIZE * 0.55,
        w: FACE_SIZE - 30,
        h: FACE_SIZE * 0.4
    };

    nigiris.forEach(n => {
        if (n.comido) return;
        if (colision(n, boca)) {
            n.comido = true;
            score += 10;
            actualizarHUD();
            // Partículas de "ñam"
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: n.x + n.w / 2,
                    y: n.y + n.h / 2,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6 - 2,
                    life: 30,
                    color: Math.random() < 0.5 ? "#ff6b4a" : "#fff"
                });
            }
        }
    });

    // Nigiris que se escapan por abajo
    nigiris.forEach(n => {
        if (!n.comido && n.y > height + 10) {
            n.comido = true;
            if (invuln <= 0) {
                lives--;
                actualizarHUD();
                invuln = 40;
                if (lives <= 0) {
                    lives = 0;
                    finJuego();
                    return;
                }
            }
        }
    });

    nigiris = nigiris.filter(n => !n.comido && n.y < height + 40);

    // Partículas
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    if (invuln > 0) invuln--;

    dibujar();
    if (gameRunning) requestAnimationFrame(loop);
}

function spawnNigiri() {
    const x = 10 + Math.random() * (width - NIGIRI_W - 20);
    nigiris.push({
        x: x,
        y: -NIGIRI_H - 5,
        w: NIGIRI_W,
        h: NIGIRI_H,
        vy: fallSpeed + Math.random() * 1.2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        comido: false,
        tipo: Math.random() < 0.15 ? 1 : 0 // 1 = especial (más puntos visual)
    });
}

function finJuego() {
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("nigiri-record", highScore);
        recordEl.textContent = highScore;
        recordInicioEl.textContent = highScore;
        mensajeFin.textContent = "¡NUEVO RÉCORD! 🍣 " + score;
    } else {
        mensajeFin.textContent = "Se acabó el hambre · " + score;
    }
    overlayFin.classList.remove("oculta");
}

function colision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ========== DIBUJO ==========
function dibujar() {
    // Fondo
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, "#1a1028");
    g.addColorStop(1, "#2e1a3a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Nigiris
    nigiris.forEach(n => dibujarNigiri(n));

    // Partículas
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Cara de la jugadora
    if (player && (invuln <= 0 || Math.floor(invuln / 5) % 2 === 0)) {
        dibujarCara();
    }
}

function dibujarCara() {
    ctx.save();
    // Círculo de recorte
    ctx.beginPath();
    ctx.arc(player.x + FACE_SIZE / 2, player.y + FACE_SIZE / 2, FACE_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (caraImg.complete && caraImg.naturalWidth) {
        // Cover-fit
        const scale = Math.max(FACE_SIZE / caraImg.naturalWidth, FACE_SIZE / caraImg.naturalHeight);
        const sw = FACE_SIZE / scale;
        const sh = FACE_SIZE / scale;
        const sx = (caraImg.naturalWidth - sw) / 2;
        const sy = (caraImg.naturalHeight - sh) / 2;
        ctx.drawImage(caraImg, sx, sy, sw, sh, player.x, player.y, FACE_SIZE, FACE_SIZE);
    } else {
        ctx.fillStyle = "#ffb3a0";
        ctx.fillRect(player.x, player.y, FACE_SIZE, FACE_SIZE);
    }
    ctx.restore();

    // Borde circular
    ctx.strokeStyle = "#ff6b4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + FACE_SIZE / 2, player.y + FACE_SIZE / 2, FACE_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();
}

function dibujarNigiri(n) {
    ctx.save();
    ctx.translate(n.x + n.w / 2, n.y + n.h / 2);
    ctx.rotate(n.rot);

    // Arroz (base blanca)
    ctx.fillStyle = "#f5f0e6";
    ctx.beginPath();
    ctx.ellipse(0, 6, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Salmón (arriba naranja)
    ctx.fillStyle = n.tipo === 1 ? "#ff3344" : "#ff7a45";
    ctx.beginPath();
    ctx.ellipse(0, -4, 18, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rayas del salmón
    ctx.strokeStyle = "rgba(255,200,150,0.7)";
    ctx.lineWidth = 1.5;
    for (let i = -10; i <= 10; i += 5) {
        ctx.beginPath();
        ctx.moveTo(i, -10);
        ctx.lineTo(i + 3, 2);
        ctx.stroke();
    }

    // Carita del nigiri (ojos cerrados felices)
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-6, 8, 2, 0, Math.PI * 2);
    ctx.arc(6, 8, 2, 0, Math.PI * 2);
    ctx.fill();
    // Sonrisa
    ctx.beginPath();
    ctx.arc(0, 10, 4, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
}

document.addEventListener("touchmove", e => {
    if (gameRunning) e.preventDefault();
}, { passive: false });

init();
