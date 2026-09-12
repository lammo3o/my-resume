/* Keep the résumé usable even when the 3D engine cannot start. No module dependency. */
(function () {
 var panel=document.getElementById('accessible-resume'),message=document.getElementById('load-message'),loader=document.getElementById('loading-screen'),loadingMessage=document.getElementById('loading-message');
 var timer,active=true,stop=function(){};
 function fallback(text){
  active=false;clearTimeout(timer);stop();document.body.setAttribute('data-experience','fallback');
  loader.hidden=true;panel.hidden=false;message.textContent=text;document.getElementById('retry-3d').hidden=false;
 }
 window.avatarBoot={
  alive:function(){return active;},
  onStop:function(fn){stop=fn;},
  progress:function(text){if(active)loadingMessage.textContent=text;},
  ready:function(){if(!active)return;clearTimeout(timer);document.body.setAttribute('data-experience','ready');panel.hidden=true;loader.hidden=true;},
  fail:function(){fallback('暂时无法展示三维肖像，你仍可以在这里阅读完整履历。');}
 };
 document.getElementById('read-resume').onclick=function(){fallback('图文履历 · 慢慢了解我');};
 document.getElementById('resume-mode').onclick=function(){fallback('图文履历 · 慢慢了解我');};
 document.getElementById('retry-3d').onclick=function(){var url=new URL(location.href);url.searchParams.set('quality','mobile');location.replace(url.href);};
 if(matchMedia('(pointer: coarse)').matches)document.querySelector('.hint').textContent='单指拖动 · 双指缩放 · 轻点贴纸看经历';
 var supports=false;
 try {
  var probe=document.createElement('canvas'),gl=probe.getContext('webgl2');
  supports=!!gl&&typeof WebAssembly==='object'&&typeof structuredClone==='function'&&typeof HTMLDialogElement!=='undefined'&&!!HTMLDialogElement.prototype.showModal&&!!Element.prototype.animate&&typeof HTMLScriptElement.supports==='function'&&HTMLScriptElement.supports('importmap');
  if(gl){var ext=gl.getExtension('WEBGL_lose_context');if(ext)ext.loseContext();}
 }catch(e){}
 if(!supports){fallback('当前浏览器暂不支持三维展示，图文履历可直接浏览。');return;}
 document.body.setAttribute('data-experience','loading');
 panel.hidden=true;loader.hidden=false;loadingMessage.textContent='正在加载三维肖像…';
 timer=setTimeout(function(){fallback('加载时间较长。你可以先阅读履历，或重试轻量三维版。');},45000);
 window.addEventListener('error',function(e){if(e.error)window.avatarBoot.fail();});
 window.addEventListener('unhandledrejection',function(){window.avatarBoot.fail();});
 var script=document.createElement('script');script.type='module';script.src='./portfolio.js?v=20260912show';script.onerror=window.avatarBoot.fail;document.body.appendChild(script);
}());
