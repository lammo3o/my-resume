// Small, deterministic motions. No timers run while the scene is paused or hidden.
export function samplePortraitLife(time){
 const phase=time%5.7;
 const pulse=(t)=>t<0||t>.29?0:t<.085?Math.sin(t/.085*Math.PI/2):t<.115?1:Math.pow(Math.cos((t-.115)/.175*Math.PI/2),2);
 const blink=Math.max(pulse(phase-3.1),Math.floor(time/5.7)%3===2?pulse(phase-3.48):0);
 return {blink,breath:Math.sin(time*Math.PI*2/4.8)*.0025};
}
export function createPortraitLife(){
 let time=0;const blink={value:0};
 return {blink,breath:0,enabled:true,update(delta,enabled){
  this.enabled=enabled;
  if(!enabled){blink.value=0;this.breath=0;return;}
  time+=Math.min(Math.max(delta,0),.1);
  const pose=samplePortraitLife(time);blink.value=pose.blink;this.breath=pose.breath;
 }};
}
