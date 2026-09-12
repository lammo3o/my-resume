import * as THREE from 'three';
export function createOcean(){
 const uniforms={time:{value:0},aspect:{value:1}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
 precision highp float;varying vec2 v;uniform float time;uniform float aspect;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.01)*.12+noise(p*8.07)*.05;}
 void main(){vec2 uv=v;float horizon=.57;vec3 col;
 if(uv.y>horizon){float h=(uv.y-horizon)/(1.-horizon);col=mix(vec3(.78,.90,.92),vec3(.24,.66,.87),pow(h,.65));
 vec2 p=vec2(uv.x*aspect*2.8+time*.007,h*3.8);float n=fbm(p);float cloud=smoothstep(.49,.72,n)*smoothstep(.03,.22,h);col=mix(col,vec3(.99,.99,.94),cloud*.55);
 }else{float depth=(horizon-uv.y)/horizon;float x=(uv.x-.5)*aspect;float shore=.70+sin(x*2.7)*.035+sin(time*.53)*.028;float distance=shore-depth;
 vec3 sand=mix(vec3(.77,.67,.49),vec3(.94,.85,.66),1.-smoothstep(-.20,-.02,distance));sand+=(hash(uv*vec2(1800.,1100.))-.5)*.028;
 float persp=1./max(.10,depth+.11);vec2 p=vec2(x*persp*6.,persp*4.);float n=fbm(p*vec2(3.,8.)+vec2(time*.15,time*.31));
 vec3 sea=mix(vec3(.19,.51,.65),vec3(.29,.75,.72),pow(depth,.6));sea+=(n-.5)*.045;
 float phase=depth*45.-time*1.9+sin(x*7.)*.22+fbm(vec2(x*12.,depth*80.))*.8;
 float lace=fbm(vec2(x*70.,depth*190.+time*.7));float foam=pow(max(0.,sin(phase)),25.)*smoothstep(.18,.65,depth)*smoothstep(.02,.12,distance)*smoothstep(.3,.65,lace);
 foam=max(foam,exp(-abs(distance)*130.)*(.7+lace*.3));foam+=exp(-abs(distance)*28.)*smoothstep(.54,.7,lace)*.42;
 sea=mix(sea,vec3(.98,.99,.93),clamp(foam*.62,0.,.96));float shine=pow(max(0.,n),25.)*2.;sea+=shine;
 col=mix(sand,sea,smoothstep(-.01,.008,distance));col=mix(col,vec3(.71,.86,.88),pow(1.-depth,12.)*.6);
 }
 float luminance=dot(col,vec3(.2126,.7152,.0722));
 col=mix(vec3(luminance),col,.58);
 col=mix(col,vec3(.60,.70,.68),.23);
 float vignette=smoothstep(.20,.86,length((uv-vec2(.5,.57))*vec2(.85,1.)));
 col*=1.-vignette*.24;
 col=mix(col,col*vec3(.37,.45,.44),.46*(1.-smoothstep(.02,.39,uv.y)));
 gl_FragColor=vec4(col,1.);}`});
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));return {scene,camera:new THREE.Camera(),uniforms};
}
