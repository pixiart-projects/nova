const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let points = [], bgBlobs = [], rotation = 0, rotationSpeed = 0.0005, hueBase = 200, hueDrift = 0.03;
let ballX, ballY, targetX, targetY, minSide;

const START_SCALE = 0.9;
let ballScale = START_SCALE;
let currentScale = START_SCALE;

let mouseX = 0, mouseY = 0;
let isDragging = false, currentMode = 'color', hasMovedManually = false;

const btnColor = document.getElementById('btn-color');
const btnMove = document.getElementById('btn-move');

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const label = document.getElementById('label-scroll');
  if(label) label.innerHTML = 'Skroluj <span class="mobile-only-text" style="display:inline;">(Gesty)</span>';
}

btnColor.onclick = (e) => {
  e.stopPropagation();
  currentMode = 'color';
  btnColor.classList.add('active');
  btnMove.classList.remove('active');
};

btnMove.onclick = (e) => {
  e.stopPropagation();
  currentMode = 'move';
  btnMove.classList.add('active');
  btnColor.classList.remove('active');
};

function keepInBounds(x, y) {
  const clampedX = Math.max(0, Math.min(window.innerWidth, x));
  const clampedY = Math.max(0, Math.min(window.innerHeight, y));
  return { x: clampedX, y: clampedY };
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  minSide = Math.min(window.innerWidth, window.innerHeight);

  if (!hasMovedManually) {
    ballX = targetX = window.innerWidth / 2;
    ballY = targetY = window.innerHeight / 2;
  } else {
    const bounds = keepInBounds(targetX, targetY);
    targetX = ballX = bounds.x;
    targetY = ballY = bounds.y;
  }
}

function rand(min, max) { return Math.random() * (max - min) + min; }

function generateForm(onlyColors = false) {
  hueBase = rand(0, 360);
  if (!onlyColors) {
    points = [];
    const layerCount = 6;
    for (let l = 0; l < layerCount; l++) {
      const count = Math.floor((100 + l * 40) * (minSide / 800));
      const layerScale = (l + 1) / layerCount;
      for (let i = 0; i < count; i++) {
        points.push({
          angle: Math.random() * Math.PI * 2,
          distFactor: Math.pow(Math.random(), 1.4),
          rSizeFactor: rand(0.01, 0.06) * layerScale,
          pulsePhase: Math.random() * 2 * Math.PI,
          lightness: 70 - (Math.pow(Math.random(), 1.4)) * 40,
          alpha: rand(0.03, 0.08),
          hueOffset: rand(-30, 30),
          sat: rand(50, 80)
        });
      }
    }

    bgBlobs = [];
    for (let i = 0; i < 20; i++) {
      bgBlobs.push({
        x: rand(0, window.innerWidth),
        y: rand(0, window.innerHeight),
        size: rand(150, 300),
        vx: rand(-0.3, 0.3),
        vy: rand(-0.3, 0.3),
        phase: rand(0, Math.PI * 2)
      });
    }
  }
}

function drawPoints(time, mainRadius) {
  for (const p of points) {
    const a = p.angle + rotation;
    const dist = p.distFactor * mainRadius * currentScale;
    const x = ballX + Math.cos(a) * dist;
    const y = ballY + Math.sin(a) * dist;
    const distToMouse = Math.hypot(mouseX - x, mouseY - y);
    const cursorInfluence = Math.max(0, 1 - distToMouse / (minSide * 0.25));
    const hue = (hueBase + p.hueOffset + hueDrift * performance.now() * 0.01) % 360;
    const r = (p.rSizeFactor * minSide) * (0.8 + 0.2 * Math.sin(time + p.pulsePhase)) * (1 + 0.6 * cursorInfluence) * currentScale;
    const light = p.lightness + (25 * cursorInfluence);
    const alpha = p.alpha + (0.25 * cursorInfluence);

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `hsla(${hue},${p.sat}%,${light}%,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  const w = window.innerWidth, h = window.innerHeight;
  const time = performance.now() * 0.003;
  const horizonY = h * 0.6;

  const bounds = keepInBounds(targetX, targetY);
  targetX = bounds.x;
  targetY = bounds.y;

  ballX += (targetX - ballX) * 0.1;
  ballY += (targetY - ballY) * 0.1;
  currentScale += (ballScale - currentScale) * 0.1;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);

  // gradient horizon
  ctx.save();
  const hGrad = ctx.createLinearGradient(0, horizonY - 100, 0, horizonY);
  hGrad.addColorStop(0, 'transparent');
  hGrad.addColorStop(1, `hsla(${hueBase}, 50%, 15%, 0.3)`);
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, horizonY - 100, w, 100);
  ctx.strokeStyle = `hsla(${hueBase}, 40%, 30%, 0.4)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.stroke();
  ctx.restore();

  // background blobs
  ctx.save();
  ctx.filter = 'blur(70px)';
  bgBlobs.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < 0 || b.x > w) b.vx *= -1;
    if (b.y < 0 || b.y > h) b.vy *= -1;
    const s = b.size * (0.8 + 0.2 * Math.sin(time * 0.3 + b.phase));
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, s);
    g.addColorStop(0, `hsla(${hueBase},60%,20%,0.15)`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // main ball halo
  const mainRadius = minSide * 0.27;
  const haloRadius = mainRadius * currentScale * 1.2;
  const halo = ctx.createRadialGradient(ballX, ballY, haloRadius * 0.7, ballX, ballY, haloRadius);
  halo.addColorStop(0, 'rgba(255,255,255,0)');
  halo.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(ballX, ballY, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  drawPoints(time, mainRadius);

  const distToBall = Math.hypot(mouseX - ballX, mouseY - ballY);
  const isInside = distToBall < mainRadius * currentScale;

  if (currentMode === 'move') {
    if (isDragging) canvas.className = 'grabbing';
    else if (isInside) canvas.className = 'can-grab';
    else canvas.className = '';
  } else {
    canvas.className = isInside ? 'pointer' : '';
  }

  rotation += rotationSpeed;
  requestAnimationFrame(draw);
}

const updateMouse = e => {
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  mouseX = clientX;
  mouseY = clientY;
}

function startDrag(e) {
  updateMouse(e);
  const dist = Math.hypot(mouseX - ballX, mouseY - ballY);
  if (dist < (minSide * 0.3 * currentScale)) {
    if (currentMode === 'move') {
      isDragging = true;
      hasMovedManually = true;
    } else {
      generateForm(true);
    }
  }
}

canvas.onmousedown = startDrag;
canvas.ontouchstart = e => { if(e.touches.length === 1) startDrag(e); };
window.onmousemove = e => { updateMouse(e); if(isDragging && currentMode === 'move'){ targetX = mouseX; targetY = mouseY; } };
canvas.ontouchmove = e => { if(e.touches.length === 1 && isDragging && currentMode === 'move'){ updateMouse(e); targetX = mouseX; targetY = mouseY; } };
window.onmouseup = window.ontouchend = () => { isDragging = false; lastDist = null; };
window.onwheel = e => { ballScale = Math.min(Math.max(ballScale + e.deltaY * -0.001, 0.2), 2.0); };

let lastDist = null;
canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (lastDist) {
      const diff = dist / lastDist;
      ballScale = Math.min(Math.max(ballScale * diff, 0.2), 2.0);
    }
    lastDist = dist;
  }
}, { passive: false });

window.onresize = () => { resize(); generateForm(); };
resize(); generateForm(); draw();
