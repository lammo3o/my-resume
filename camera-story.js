import * as THREE from './three.module.js';

export const shortestAngle=(from,to)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from));
export const cameraEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

// Owns the camera only during a sticker story; normal orbiting never resets its pose.
export class CameraStory {
 constructor({camera,controls,viewport,onPhase=()=>{},reducedMotion=()=>false}) {
  Object.assign(this,{camera,controls,viewport,onPhase,reducedMotion});this.phase='idle';this.flight=null;this.saved=null;
 }
 setPhase(phase){this.phase=phase;this.onPhase(phase);}
 snapshot(){const v=this.camera.view;return {position:this.camera.position.clone(),target:this.controls.target.clone(),offset:new THREE.Vector2(v?.enabled?v.offsetX/v.fullWidth:0,v?.enabled?v.offsetY/v.fullHeight:0)};}
 applyOffset(offset){const [w,h]=this.viewport();this.camera.setViewOffset(w,h,offset.x*w,offset.y*h,w,h);}
 fly(to,duration){
  this.flight?.resolve(false);
  const from=this.snapshot(),a=new THREE.Spherical().setFromVector3(from.position.clone().sub(from.target)),b=new THREE.Spherical().setFromVector3(to.position.clone().sub(to.target));b.theta=shortestAngle(a.theta,b.theta);
  return new Promise(resolve=>{this.flight={from,to,a,b,started:performance.now(),duration:this.reducedMotion()?80:duration,resolve};});
 }
 async enter(anchor,normal,distance){
  if(this.phase!=='idle')return false;
  const snapshot=this.snapshot();
  // Consume OrbitControls' residual deltas without changing the remembered view.
  this.controls.enableDamping=false;this.controls.update();this.camera.position.copy(snapshot.position);this.controls.target.copy(snapshot.target);this.controls.update();
  this.saved=snapshot;this.controls.enabled=false;this.setPhase('focusing');
  const position=anchor.clone().addScaledVector(normal,distance);
  const completed=await this.fly({position,target:anchor.clone(),offset:new THREE.Vector2()},1000);
  if(completed)this.setPhase('reading');return completed;
 }
 async leave(){
  if(!this.saved||this.phase==='returning')return false;
  this.setPhase('returning');const saved=this.saved;
  const complete=await this.fly(saved,850);
  if(complete){this.camera.position.copy(saved.position);this.controls.target.copy(saved.target);this.controls.update();this.controls.enableDamping=true;this.controls.enabled=true;this.saved=null;this.setPhase('idle');}
  return complete;
 }
 tick(now=performance.now()){
  const f=this.flight;if(!f)return;
  const t=Math.min(1,Math.max(0,(now-f.started)/f.duration)),e=cameraEase(t);
  this.controls.target.lerpVectors(f.from.target,f.to.target,e);
  const s=new THREE.Spherical(THREE.MathUtils.lerp(f.a.radius,f.b.radius,e),THREE.MathUtils.lerp(f.a.phi,f.b.phi,e),THREE.MathUtils.lerp(f.a.theta,f.b.theta,e));
  this.camera.position.setFromSpherical(s).add(this.controls.target);this.camera.lookAt(this.controls.target);
  this.applyOffset(new THREE.Vector2().lerpVectors(f.from.offset,f.to.offset,e));
  if(t===1){this.camera.position.copy(f.to.position);this.controls.target.copy(f.to.target);this.camera.lookAt(f.to.target);this.flight=null;f.resolve(true);}
 }
}
