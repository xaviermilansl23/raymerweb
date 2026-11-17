'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';

// Equipo ilustrativo construido con geometría local: no descarga modelos ni
// representa un SKU específico del catálogo.
export default function GamingSetup({ paused, fallback }: { paused: boolean; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  const [available, setAvailable] = useState(false);
  useEffect(() => { pause.current = paused; }, [paused]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
    camera.position.set(4.0, 2.5, 7.7);
    camera.lookAt(0, -.05, 0);
    const setup = new THREE.Group(); scene.add(setup);
    const resources = new Set<{ dispose(): void }>();
    const material = (color: number, metalness = .35, roughness = .38) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness }); resources.add(m); return m;
    };
    const glow = (color: number) => { const m = new THREE.MeshBasicMaterial({ color }); resources.add(m); return m; };
    const dark = material(0x14182b, .6, .3);
    const edge = material(0x333953, .7, .3);
    const cyan = glow(0x37d4ff); const purple = glow(0xa377ff); const orange = glow(0xffa143); const red = glow(0xff586c);
    const black = glow(0x080c1a);
    const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Group = setup) => {
      resources.add(geometry); const item = new THREE.Mesh(geometry, mat); item.position.set(x,y,z); parent.add(item); return item;
    };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = dark) => mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);

    // Monitor, soporte y pantalla con el logo original de Raymer.
    box(2.85,1.78,.15,-.82,.35,0);
    box(2.7,1.60,.012,-.82,.36,.083,black);
    box(.14,.55,.16,-.82,-.8,0,edge);
    box(.9,.065,.6,-.82,-1.1,.05,edge);
    box(2.72,.018,.02,-.82,-.42,.105,purple);
    box(.12,.015,.02,.35,-.48,.09,cyan);
    let alive = true; let dirty = true;
    const logo = new THREE.TextureLoader().load('/favicon.png', () => { if (!alive) logo.dispose(); else dirty = true; });
    logo.colorSpace = THREE.SRGBColorSpace; resources.add(logo);
    const logoMaterial = new THREE.MeshBasicMaterial({ map: logo, transparent: true }); resources.add(logoMaterial);
    mesh(new THREE.PlaneGeometry(.9,.9),logoMaterial,-1.53,.40,.104);
    const textCanvas = document.createElement('canvas'); textCanvas.width = 768; textCanvas.height = 400;
    const context = textCanvas.getContext('2d');
    if (context) {
      context.fillStyle = '#f6f7ff'; context.font = '800 92px Arial'; context.fillText('RAYMER',20,165);
      context.fillStyle = '#78ceff'; context.font = '500 21px Arial'; context.fillText('TECNOLOGÍA EN TUS MANOS',24,216);
      const gradient = context.createLinearGradient(20,0,490,0);
      [[0,'#28bbff'],[.2,'#7271ff'],[.4,'#bc8cff'],[.6,'#ffe26c'],[.8,'#ff9c43'],[1,'#ff5066']].forEach(([stop,color]) => gradient.addColorStop(Number(stop),String(color)));
      context.fillStyle = gradient; context.fillRect(24,255,470,5);
      const texture = new THREE.CanvasTexture(textCanvas); resources.add(texture);
      const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); resources.add(textMaterial);
      mesh(new THREE.PlaneGeometry(1.75,.91),textMaterial,-.22,.34,.105);
    }

    // Torre de PC, panel lateral e interiores.
    const tx = 1.46;
    box(1.00,.08,1.26,tx,-1.08,0);
    box(1.00,.08,1.26,tx,1.08,0);
    box(.06,2.10,.07,tx-.47,0,.59,edge);
    box(.06,2.10,.07,tx+.47,0,.59,edge);
    box(.06,2.10,.07,tx-.47,0,-.59,edge);
    box(.06,2.10,.07,tx+.47,0,-.59,edge);
    box(.90,2.10,.07,tx,0,-.59);
    box(.90,2.02,.055,tx,0,.62,black);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x7f90d8, transparent: true, opacity: .11, metalness: .05, roughness: .18, depthWrite: false, side: THREE.DoubleSide }); resources.add(glass);
    box(.025,2.00,1.1,tx+.49,0,.01,glass);
    box(.7,.05,.3,tx,-1.18,.3,edge); box(.7,.05,.3,tx,-1.18,-.35,edge);
    box(.025,1.4,.85,tx+.05,.16,-.03,material(0x242b40));
    box(.6,.16,.86,tx,-.3,.03,edge);
    box(.02,.025,.82,tx+.44,-.2,.04,cyan);
    box(.02,.025,.82,tx+.44,-.45,.04,purple);
    for (let n = 0; n < 2; n++) box(.05,.65,.08,tx+.1+n*.12,.25,.27,n ? purple : cyan);
    const fanBlades: THREE.Group[] = [];
    [cyan,purple,orange].forEach((color,i) => {
      const y = .67-i*.66;
      mesh(new THREE.TorusGeometry(.235,.028,8,48),color,tx,y,.663);
      mesh(new THREE.CircleGeometry(.193,32),glow(0x11152a),tx,y,.666);
      const blades = new THREE.Group(); blades.position.set(tx,y,.679); setup.add(blades);
      for (let j=0;j<6;j++) {
        const blade = mesh(new THREE.BoxGeometry(.055,.15,.015),edge,0,0,0,blades);
        const angle = j*Math.PI/3; blade.position.set(Math.sin(angle)*.09,Math.cos(angle)*.09,0); blade.rotation.z = -angle+.45;
      }
      mesh(new THREE.CircleGeometry(.048,16),color,tx,y,.695); fanBlades.push(blades);
    });
    mesh(new THREE.CircleGeometry(.024,12),cyan,tx+.3,.96,.667);

    // Teclado con retroiluminación, mouse y mousepad.
    const keyboard = box(1.94,.10,.65,-.77,-1.10,1.07,edge); keyboard.rotation.x = .035;
    box(1.92,.025,.02,-.77,-1.13,1.40,purple);
    for (let row=0;row<4;row++) for (let col=0;col<13;col++) {
      box(.119,.04,.107,-1.61+col*.139,-1.035,.85+row*.142,material(0x252a43));
      if (row===3 && col%2===0) box(.07,.004,.007,-1.61+col*.139,-1.01,.85+row*.142,[cyan,purple,orange,red][col%4]);
    }
    box(.95,.025,.85,.87,-1.15,1.07,black);
    box(.95,.015,.018,.87,-1.13,1.49,cyan);
    const mouse = mesh(new THREE.SphereGeometry(.18,24,14),dark,.87,-1.02,1.05); mouse.scale.set(.73,.57,1.15);
    box(.014,.015,.14,.87,-.916,1.04,purple);
    // Plataforma y líneas de luz discretas del escenario.
    box(4.6,.07,2.70,-.02,-1.25,.35,material(0x10162b,.4,.6));
    box(4.55,.008,.018,-.02,-1.215,1.69,purple);
    box(.018,.008,2.66,2.27,-1.215,.35,cyan);
    scene.add(new THREE.HemisphereLight(0xcdd9ff,0x1b123e,3.5));
    const lighting: [number,number,number,number,number][] = [[0x50cbff,35,-3,4,4],[0x9771ff,40,3,3,2],[0xffb352,22,2,1,-3],[0xffffff,18,-1,5,5]];
    lighting.forEach(([color,intensity,x,y,z]) => { const light = new THREE.PointLight(color,intensity,15); light.position.set(x,y,z); scene.add(light); });

    let pointerX=0, pointerY=0, frame=0, previous=0, elapsed=0, visible=true, lost=false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const move = (e: PointerEvent) => { const r=el.getBoundingClientRect(); pointerX=((e.clientX-r.left)/r.width-.5)*.25; pointerY=((e.clientY-r.top)/r.height-.5)*.10; };
    const leave = () => { pointerX=0; pointerY=0; };
    el.addEventListener('pointermove',move,{passive:true}); el.addEventListener('pointerleave',leave);
    const resize = () => {
      const w=el.clientWidth,h=el.clientHeight; if (!w||!h) return;
      renderer.setSize(w,h); camera.aspect=w/h;
      camera.position.set(4,2.5,7.7); if(w/h<1.05) camera.position.multiplyScalar(1.15);
      camera.lookAt(0,-.05,0); camera.updateProjectionMatrix(); dirty=true;
    };
    const size = new ResizeObserver(resize); size.observe(el); resize();
    const observer = new IntersectionObserver(entries => { visible=entries[0].isIntersecting; dirty=true; },{rootMargin:'80px'}); observer.observe(el);
    const draw = (now:number) => {
      frame=requestAnimationFrame(draw); if(now-previous<33) return;
      const dt=Math.min((now-previous)/1000,.05); previous=now;
      if(!visible||document.hidden||lost) return;
      const moving=!pause.current&&!reduced.matches;
      if(!moving&&!dirty) return;
      if(moving) {
        elapsed+=dt;
        setup.rotation.y+=(pointerX-setup.rotation.y)*.06;
        setup.rotation.x+=(pointerY-setup.rotation.x)*.06;
        fanBlades.forEach((fan,i)=>fan.rotation.z=elapsed*(1.5+i*.15));
      }
      dirty=false; renderer.render(scene,camera);
    };
    const contextLost=(e:Event)=>{e.preventDefault();lost=true;setAvailable(false);};
    const restored=()=>{lost=false;dirty=true;setAvailable(true);};
    renderer.domElement.addEventListener('webglcontextlost',contextLost); renderer.domElement.addEventListener('webglcontextrestored',restored);
    frame=requestAnimationFrame(draw); setAvailable(true);
    return ()=>{
      alive=false; cancelAnimationFrame(frame); size.disconnect(); observer.disconnect();
      el.removeEventListener('pointermove',move); el.removeEventListener('pointerleave',leave);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost); renderer.domElement.removeEventListener('webglcontextrestored',restored);
      resources.forEach(r=>r.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className={`setup-renderer ${available?'is-rendered':''}`} ref={host}>{!available&&fallback}</div>;
}
