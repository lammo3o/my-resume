export function chooseQuality({coarse=false,cores=8,memory=8,saveData=false,requested}={}){
 if(requested==='high'||requested==='mobile')return requested;
 return coarse||cores<=4||memory<=4||saveData?'mobile':'high';
}
export class TapGesture{
 constructor(){this.points=new Set();this.first=null;this.blocked=false;}
 start(e){
  if(!this.points.size){this.blocked=false;this.first={id:e.pointerId,x:e.clientX,y:e.clientY,limit:e.pointerType==='touch'?12:6};}
  this.points.add(e.pointerId);if(this.points.size>1)this.blocked=true;
 }
 move(e){const p=this.first;if(p&&p.id===e.pointerId&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>=p.limit)this.blocked=true;}
 end(e){this.move(e);const hit=this.points.has(e.pointerId)&&this.points.size===1&&!this.blocked&&this.first?.id===e.pointerId;this.points.delete(e.pointerId);if(!this.points.size)this.first=null;return hit;}
 cancel(){this.points.clear();this.first=null;this.blocked=false;}
}
