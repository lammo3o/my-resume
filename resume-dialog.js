export function createResumeDialog({dialog,onClosed,onEdit}){
 const $=id=>document.getElementById(id);let closing=null,currentId=null,opening=null;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 async function close(){
  if(closing)return closing;if(!dialog.open)return;
  closing=(async()=>{
   opening?.cancel();dialog.classList.add('closing');
   const anim=dialog.animate([{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'},{opacity:0,transform:'translateY(24px) scale(.96)',filter:'blur(3px)'}],{duration:reduced()?70:270,easing:'cubic-bezier(.4,0,.8,.25)',fill:'forwards'});
   await anim.finished.catch(()=>{});dialog.close();anim.cancel();dialog.classList.remove('closing');
   await onClosed?.();closing=null;
  })();return closing;
 }
 function show(s,picture,origin){
  currentId=s.id;for(const key of ['label','title','organization','period','description'])$('experience-'+key).textContent=s[key];
  $('experience-image').src=picture;$('experience-image').alt=s.label+'配图';$('experience-category').textContent=s.kind==='school'?'教育与校园':'工作经历';
  $('experience-content-note').textContent=s.organization.startsWith('示例')?'公开预览 · 示例履历':'个人经历档案';
  const highlights=String(s.highlights||'').split('\n').map(t=>t.trim()).filter(Boolean);
  $('experience-highlights').replaceChildren(...highlights.map(t=>{const li=document.createElement('li');li.textContent=t.replace(/^[-•]\s*/,'');return li;}));$('highlights-section').hidden=!highlights.length;
  const skills=String(s.skills||'').split(/[,，、\n]/).map(t=>t.trim()).filter(Boolean);
  $('experience-skills').replaceChildren(...skills.map(t=>{const tag=document.createElement('span');tag.textContent=t;return tag;}));$('skills-section').hidden=!skills.length;
  dialog.classList.remove('closing');dialog.setAttribute('tabindex','-1');dialog.showModal();dialog.focus({preventScroll:true});dialog.scrollTop=0;
  const rect=dialog.getBoundingClientRect();dialog.style.transformOrigin=origin?`${Math.max(0,Math.min(rect.width,origin.x-rect.left))}px ${Math.max(0,Math.min(rect.height,origin.y-rect.top))}px`:'50% 50%';
  opening=dialog.animate([{opacity:0,transform:'translateY(38px) scale(.86)',filter:'blur(8px)',offset:0},{opacity:1,transform:'translateY(-2px) scale(1.008)',filter:'blur(0)',offset:.76},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)',offset:1}],{duration:reduced()?100:720,easing:'cubic-bezier(.2,.8,.2,1)'});
  if(!reduced())dialog.querySelectorAll('.resume-identity,.resume-heading,.resume-section,.resume-skills,.resume-footer').forEach((el,i)=>el.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:500,delay:140+i*45,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
 }
 dialog.querySelector('.close').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 if($('edit-current'))$('edit-current').onclick=async()=>{const id=currentId;await close();onEdit(id);};
 return {show,close};
}
