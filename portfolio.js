import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js?v=20260910b';
import {DRACOLoader} from './DRACOLoader.js?v=20260910b';
import {chooseQuality,TapGesture} from './compatibility.js?v=20260910b';
import {OrbitControls} from './OrbitControls.js?v=20260910b';
import {createOcean} from './ocean.js?v=20260910b';
import {bindFace} from './avatar-surface.js?v=20260910b';
import {StickerLayer,stickerSVG,svgURL} from './stickers.js?v=20260910b';
import {DEFAULT_STICKERS,readPortfolio,isClick} from './portfolio-data.js?v=20260910b';
import {setupEditor} from './viewer.js?v=20260910b';
import {CameraStory} from './camera-story.js?v=20260910b';
const $=id=>document.getElementById(id),canvas=$('scene');
const quality=chooseQuality({coarse:matchMedia('(any-pointer: coarse)').matches,cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory,saveData:navigator.connection?.saveData,requested:new URLSearchParams(location.search).get('quality')});
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='mobile'?1.25:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.autoClear=false;
const scene=new THREE.Scene(),ocean=createOcean(),camera=new THREE.PerspectiveCamera(32,1,.1,30);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=1.15;controls.maxDistance=6.8;controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI*.82;controls.rotateSpeed=.55;
scene.add(new THREE.HemisphereLight(0xe5f4ff,0xb5a88d,2));
for(const [color,intensity,pos] of [[0xfff0df,2.2,[-3,4,5]],[0xc8e8ff,.65,[4,1,3]],[0xffffff,1.6,[2,3,-4]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.fromArray(pos);scene.add(light);}
let body,model,face,layer,stickers,loaded=false,activeView='portrait',hoverId=null,placement=null,down=null,toastTimer,eyeFollow=true;
let waves=!matchMedia('(prefers-reduced-motion: reduce)').matches;
try{stickers=structuredClone(DEFAULT_STICKERS);}catch{stickers=structuredClone(DEFAULT_STICKERS);setTimeout(()=>notify('已有配置无法读取，当前显示示例；原存储未被覆盖。'),1000);}
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function frame(name){if(story.phase!=='idle')return;activeView=name;document.body.dataset.view=name;const mobile=innerWidth<650;const views={portrait:[[0,mobile?.75:.64,mobile?2.65:2.9],[0,mobile?.70:.59,0]],half:[[0,0,mobile?5.5:4.7],[0,0,0]],back:[[0,.15,mobile?-5.5:-4.5],[0,.12,0]],face:[[0,.78,1.65],[0,.74,.04]]};const [p,t]=views[name];controls.enableDamping=false;controls.update();camera.position.fromArray(p);controls.target.fromArray(t);controls.update();controls.enableDamping=true;document.querySelectorAll('button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.clearViewOffset();if(innerWidth>850)camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.13,0,innerWidth,innerHeight);else if(innerWidth<650)camera.setViewOffset(innerWidth,innerHeight,0,-innerHeight*.055,innerWidth,innerHeight);camera.updateProjectionMatrix();ocean.uniforms.aspect.value=innerWidth/innerHeight;}
const story=new CameraStory({camera,controls,viewport:()=>[innerWidth,innerHeight],reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,onPhase:phase=>{document.body.dataset.story=phase;if(phase==='idle')resize();}});
addEventListener('resize',resize);resize();frame('portrait');
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>frame(b.dataset.view));document.querySelectorAll('[data-place-view]').forEach(b=>b.onclick=()=>frame(b.dataset.placeView));
function waveButton(){$('motion').textContent=waves?'海浪暂停':'海浪播放';$('motion').setAttribute('aria-pressed',String(waves));}waveButton();$('motion').onclick=()=>{waves=!waves;waveButton();};
$('gaze-toggle').onclick=()=>{eyeFollow=!eyeFollow;$('gaze-toggle').setAttribute('aria-pressed',String(eyeFollow));$('gaze-toggle').textContent=eyeFollow?'眼神跟随':'眼神固定';};
function quickNav(){const nav=$('quick-stickers');nav.replaceChildren();for(const s of stickers){const b=document.createElement('button'),img=document.createElement('img');img.src=svgURL(stickerSVG(s.kind));img.alt='';b.append(img,document.createTextNode(s.label));b.onclick=()=>openStory(s.id);nav.append(b);}}
function applyStickers(next){stickers=next;layer.rebuild(stickers);quickNav();}
const editor=setupEditor({getStickers:()=>stickers,onExperienceClosed:()=>story.leave()});
async function openStory(id){
 if(!loaded||placement||story.phase!=='idle')return;
 const s=stickers.find(s=>s.id===id);if(!s)return;clearHover();
 model.updateMatrixWorld(true);const anchor=body.localToWorld(new THREE.Vector3().fromArray(s.position));
 const normal=new THREE.Vector3().fromArray(s.normal).transformDirection(body.matrixWorld);
 const distance=THREE.MathUtils.clamp(s.size*model.scale.x*11,.85,1.65);
 if(await story.enter(anchor,normal,distance)){
  const projected=anchor.clone().project(camera);editor.show(id,{x:(projected.x+1)*innerWidth/2,y:(1-projected.y)*innerHeight/2});
 }
}
addEventListener('keydown',e=>{if(e.key==='Escape'&&story.phase==='focusing'){e.preventDefault();story.leave();}});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),gazePointer=new THREE.Vector2(),target=new THREE.Vector3(),plane=new THREE.Plane(),forward=new THREE.Vector3();
function rayAt(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);}
function clearHover(){hoverId=null;layer?.hover(null);$('tooltip').hidden=true;canvas.classList.remove('interactive');}
const gesture=new TapGesture();
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||story.phase!=='idle')return;gesture.start(e);down={x:e.clientX,y:e.clientY};canvas.dataset.pointerStart=JSON.stringify(down);canvas.classList.add('dragging');clearHover();});
let lastHover=0;
canvas.addEventListener('pointermove',e=>{
 gesture.move(e);
 const rect=canvas.getBoundingClientRect();gazePointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
 if(e.pointerType==='touch'||!loaded||down||placement||story.phase!=='idle'||performance.now()-lastHover<70)return;lastHover=performance.now();rayAt(e);const id=layer.pick(raycaster);hoverId=id;layer.hover(id);canvas.classList.toggle('interactive',!!id);$('tooltip').hidden=!id;if(id){$('tooltip').textContent=(stickers.find(s=>s.id===id)?.label||'经历')+' · 点击看看 ↗';$('tooltip').style.left=Math.min(e.clientX+15,innerWidth-190)+'px';$('tooltip').style.top=Math.max(12,e.clientY-48)+'px';}
});
canvas.addEventListener('pointerup',e=>{
 const tapped=gesture.end(e);if(!gesture.points.size)down=null;canvas.classList.toggle('dragging',!!down);if(!tapped||!loaded)return;
 rayAt(e);
 const id=layer.pick(raycaster);canvas.dataset.lastPick=String(id);if(id){clearHover();openStory(id);}
});
canvas.addEventListener('pointerleave',()=>{clearHover();gazePointer.set(0,0);});
function cancelGesture(){gesture.cancel();down=null;canvas.classList.remove('dragging');}
canvas.addEventListener('pointercancel',cancelGesture);addEventListener('blur',cancelGesture);addEventListener('pointerup',e=>{if(e.target!==canvas)cancelGesture();});
const draco=new DRACOLoader().setDecoderPath('./').setWorkerLimit(quality==='mobile'?1:2);
window.avatarBoot?.onStop(()=>{renderer.setAnimationLoop(null);controls.enabled=false;draco.dispose();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.avatarBoot?.fail();});
const modelURL=quality==='mobile'?'./character-mobile.glb':'./character-web.glb';
new GLTFLoader().setDRACOLoader(draco).load(modelURL,async g=>{
 if(window.avatarBoot&&!window.avatarBoot.alive())return;
 model=g.scene;const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=2.3/size.y;model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);scene.add(model);
 model.traverse(n=>{if(n.isMesh){if(!body||n.geometry.attributes.position.count>body.geometry.attributes.position.count)body=n;for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}});
 face=bindFace(body);layer=new StickerLayer(body);window.avatarBoot?.progress('正在贴上我的小故事…');
 try{await layer.ready;}catch(e){window.avatarBoot?.fail();console.error('Sticker textures failed',e);return;}
 if(window.avatarBoot&&!window.avatarBoot.alive())return;
 applyStickers(stickers);for(const t of Object.values(layer.textures))renderer.initTexture(t);
 loaded=true;$('status').hidden=true;window.avatarBoot?.ready();draco.dispose();
 window.avatarPortfolio={getState:()=>({loaded,quality,stickerCount:stickers.length,stickerTextures:Object.values(layer.textures).map(t=>({loaded:!!t.image?.complete,width:t.image?.width,height:t.image?.height})),eyes:face.gaze.map(v=>v.toArray()),hoverId,placement:!!placement,view:activeView,triangles:body.geometry.index.count/3}),project:(id)=>{const s=stickers.find(s=>s.id===id);if(!s)return null;const p=body.localToWorld(new THREE.Vector3().fromArray(s.position)).project(camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};
},e=>{const text=e.total?'正在准备三维肖像 · '+Math.round(e.loaded/e.total*100)+'%':'正在准备三维肖像…';$('status').textContent=text;window.avatarBoot?.progress(text);},e=>{window.avatarBoot?.fail();console.error(e);});
let lastDiagnostic=0,lastRender=0;
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{
 // Keep the last beach frame beneath dialogs, freeing the GPU for image decoding and form input.
 if(document.hidden||document.querySelector('dialog[open]'))return;
 const now=performance.now();if(now-lastRender<32)return;lastRender=now;
 const dt=Math.min(clock.getDelta(),.1);if(story.phase==='idle')controls.update();else story.tick(now);if(waves)ocean.uniforms.time.value+=dt;
 if(face){raycaster.setFromCamera(gazePointer,camera);camera.getWorldDirection(forward);plane.setFromNormalAndCoplanarPoint(forward,camera.position.clone().addScaledVector(forward,1.25));raycaster.ray.intersectPlane(plane,target);face.update(target,dt,eyeFollow,activeView==='portrait');if(performance.now()-lastDiagnostic>350){lastDiagnostic=performance.now();canvas.dataset.gaze=JSON.stringify(face.gaze.map(v=>[+v.x.toFixed(5),+v.y.toFixed(5)]));}}
 canvas.dataset.camera=JSON.stringify({position:camera.position.toArray().map(n=>+n.toFixed(5)),target:controls.target.toArray().map(n=>+n.toFixed(5)),phase:story.phase});
 renderer.clear();renderer.render(ocean.scene,ocean.camera);renderer.clearDepth();renderer.render(scene,camera);
});




