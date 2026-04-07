const canvas = document.getElementById('c');
const H = 520, W = canvas.clientWidth || 720;
canvas.width = W; canvas.height = H;

const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
R.setSize(W, H); R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.shadowMap.enabled = true;

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
cam.position.set(5, 3.5, 6); cam.lookAt(0, 0.2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const kl = new THREE.DirectionalLight(0xffffff, 1.1);
kl.position.set(5,8,5); kl.castShadow = true; scene.add(kl);
const fl = new THREE.DirectionalLight(0xaaccff, 0.4);
fl.position.set(-4,2,-3); scene.add(fl);

const mat = (c,m,r) => new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const S = mat(0xc8cdd8,.85,.2), D = mat(0x555e6e,.8,.3), G = mat(0xc8922a,.85,.25), F = mat(0x9aa4b4,.7,.35);

const mk = (geo, m, parent, rx, rz, py, sh) => {
  const mesh = new THREE.Mesh(geo, m);
  if (rx) mesh.rotation.x = rx;
  if (rz) mesh.rotation.z = rz;
  if (py) mesh.position.y = py;
  if (sh) mesh.castShadow = true;
  parent.add(mesh); return mesh;
};

const PG = new THREE.Group(), GG = new THREE.Group(), WG = new THREE.Group();
scene.add(PG); PG.add(GG); GG.add(WG);

mk(new THREE.TorusGeometry(1.05,.055,18,72), S, PG, Math.PI/2, 0, 0, true);
mk(new THREE.TorusGeometry(0.85,.045,16,64), D, GG, 0, 0, 0, true);

[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]].forEach(([x,y,z]) => {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.18,10), G);
  p.position.set(x*1.05,y*1.05,z*1.05); if(x) p.rotation.z = Math.PI/2; PG.add(p);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.042,14,14), G);
  b.position.set(x*1.05,y*1.05,z*1.05); PG.add(b);
});

[-1,1].forEach(x => {
  const p = mk(new THREE.CylinderGeometry(.022,.022,.15,10), G, GG, 0, Math.PI/2);
  p.position.x = x*.85;
  const b = mk(new THREE.SphereGeometry(.035,12,12), G, GG);
  b.position.x = x*.85;
});

mk(new THREE.CylinderGeometry(.62,.62,.14,64), F, WG, 0, Math.PI/2, 0, true);
mk(new THREE.TorusGeometry(.62,.07,14,72), S, WG, 0,0,0, true);
for(let i=0;i<8;i++){
  const a=(i/8)*Math.PI*2, s=mk(new THREE.CylinderGeometry(.016,.016,.58,8),D,WG,0,Math.PI/2);
  s.position.set(Math.cos(a)*.29,0,Math.sin(a)*.29); s.rotation.y=-a;
}
mk(new THREE.CylinderGeometry(.1,.1,.2,28), G, WG, 0, Math.PI/2);
[-0.11,0.11].forEach(x => { const c=mk(new THREE.SphereGeometry(.072,16,16),G,WG); c.position.x=x; });
mk(new THREE.CylinderGeometry(.026,.026,1.8,14), S, WG, 0, Math.PI/2);

mk(new THREE.CylinderGeometry(.035,.035,1.45,14), D, scene, 0,0,-0.83, true);
mk(new THREE.CylinderGeometry(.16,.22,.1,32),     D, scene, 0,0,-1.58, true);
mk(new THREE.SphereGeometry(.065,16,16),          G, scene, 0,0,-0.06);
const fl2 = mk(new THREE.PlaneGeometry(12,12), mat(0x1e2228,.05,.9), scene, -Math.PI/2,0,-1.64);
fl2.receiveShadow = true;

const arrow = (color, len) => {
  const m = mat(color,.1,.6), g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,len,10), m);
  sh.position.y = len/2;
  const hd = new THREE.Mesh(new THREE.ConeGeometry(.045,.14,12), m);
  hd.position.y = len+.07;
  g.add(sh,hd); return g;
};
const wA = arrow(0x3a7acc,1.3); wA.rotation.z=-Math.PI/2; wA.position.x=.7;PG.add(wA);     

const pA = arrow(0xcc3a3a,1.0); pA.position.y=1.15; PG.add(pA);     


const cPivot = new THREE.Group(); PG.add(cPivot); 
const cA = arrow(0xe8960a,1.0); cA.rotation.x=Math.PI/2; cPivot.add(cA);

let sa=0, pa=0, ss=5, ps=.55, running=false, id=null;
const draw3D = () => R.render(scene,cam);

function loop() {
  id = requestAnimationFrame(loop);
  sa+=ss*.016; pa+=ps*.016;
  PG.rotation.y=pa; GG.rotation.z=Math.sin(pa*.5)*.06; WG.rotation.x=sa;
  draw3D();
}

draw3D();
window.addEventListener('resize', () => {
  const w=canvas.clientWidth; cam.aspect=w/H; cam.updateProjectionMatrix(); R.setSize(w,H);
});

const $ = id => document.getElementById(id);
const vals = () => [
  parseFloat($('inp-I').value),
  parseFloat($('inp-rpm').value),
  parseFloat($('inp-prec').value)
];
const box = $('result-box');

// ── Graph setup ──
let graphChart = null;
let graphAnimId = null;
let graphRunning = false;
let graphT = 0;

function buildGraph() {
  const ctx = document.getElementById('couple-graph').getContext('2d');

  const logTicks = [100, 1000, 10000, 100000, 1000000];

  graphChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'C vs ω',
          data: [],
          borderColor: '#e8960a',
          backgroundColor: 'rgba(232,150,10,0.12)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Current',
          data: [],
          borderColor: '#3a7acc',
          backgroundColor: '#3a7acc',
          borderWidth: 0,
          pointRadius: 7,
          pointHoverRadius: 9,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => 'C = ' + ctx.parsed.y.toFixed(2) + ' N·m'
          }
        }
      },
      scales: {
        x: {
          type: 'logarithmic',
          title: { display: true, text: 'ω (rpm)', color: '#8a9ab0', font: { size: 11 } },
          min: 0,
          max: 6000,
          ticks: {
            color: '#8a9ab0',
            font: { size: 10 },
            callback: v => {
            const map = { 
              0: '0',
              100: '100', 
              1000: '1k', 
              8000: '8k'
                };
              return map[v] || '';
            },
            autoSkip: false,
            includeBounds: true,
            maxTicksLimit: 6
          },
          grid: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          title: { display: true, text: 'Couple C (N·m)', color: '#8a9ab0', font: { size: 11 } },
          min: 0,
          ticks: { color: '#8a9ab0', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  });
}

function computeCoupleCurve(I, prec) {
  const points = [];
  const omegaValues = [0,50,100,200,500,1000,2000,5000,8000];
  for (const rpm of omegaValues) {
    const omega = rpm * 2 * Math.PI / 60;
    const C = I * omega * prec;
    points.push({ x: rpm, y: parseFloat(C.toFixed(4)) });
  }
  return points;
}

function updateGraph(I, rpm, prec) {
  if (!graphChart) return;
  const curve = computeCoupleCurve(I, prec);
  graphChart.data.datasets[0].data = curve;

  const omega = rpm * 2 * Math.PI / 60;
  const C = I * omega * prec;
  graphChart.data.datasets[1].data = [{ x: rpm, y: parseFloat(C.toFixed(4)) }];

  // Auto-scale y max
  const maxC = I * (8000 * 2 * Math.PI / 60) * prec;
  graphChart.options.scales.y.max = maxC > 0 ? parseFloat((maxC * 1.1).toFixed(2)) : 10;

  graphChart.update('none');
}

function resetGraph() {
  if (!graphChart) return;
  graphChart.data.datasets[0].data = [];
  graphChart.data.datasets[1].data = [];
  graphChart.options.scales.y.max = 10;
  graphChart.update('none');
}

// ── Controls ──
$('btn-calc').onclick = () => {
  const [I,rpm,prec]=vals();
  if (vals().some(isNaN)) { box.textContent='Fill all fields'; return; }
  const C = (I * rpm * 2 * Math.PI / 60 * prec).toFixed(2);
  box.textContent = 'C = ' + C + ' N·m';
  updateGraph(I, rpm, prec);
};

$('btn-apply').onclick = () => {
  const [I,rpm,prec]=vals();
  if(vals().some(isNaN)){box.textContent='Fill all fields first';return;}
  ss = rpm * 0.05;
  ps = prec * 1.0;
  const C = (I * rpm * 2 * Math.PI / 60 * prec).toFixed(2);
  box.textContent = 'C = ' + C + ' N·m';

  updateGraph(I, rpm, prec);

  if(!running){running=true;loop();}
};

$('btn-stop').onclick = () => {
  if(running){ cancelAnimationFrame(id); running=false; }
};

$('btn-reset').onclick = () => {
  $('inp-I').value = 0;
  $('inp-rpm').value = 0;
  $('inp-prec').value = 0;
  $('val-I').textContent = '0 kg·m²';
  $('val-rpm').textContent = '0 rpm';
  $('val-prec').textContent = '0 rad/s';
  box.textContent = 'Couple (C)';

  ss = 0; ps = 0; sa = 0; pa = 0;

  if (running) { cancelAnimationFrame(id); running = false; }

  PG.rotation.y = 0; GG.rotation.z = 0; WG.rotation.x = 0;
  cPivot.rotation.y = Math.PI / 2;
  draw3D();

  resetGraph();
};

const updateVal = (id, out, unit) => {
  const el = $(id), o = $(out);
  const fn = () => o.textContent = el.value + ' ' + unit;
  el.addEventListener('input', fn);
  fn();
};

updateVal('inp-I', 'val-I', 'kg·m²');
updateVal('inp-rpm', 'val-rpm', 'rpm');
updateVal('inp-prec', 'val-prec', 'rad/s');

// Init graph after Chart.js loads
window.addEventListener('load', () => {
  if (window.Chart) buildGraph();
});
