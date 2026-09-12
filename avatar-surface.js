import * as THREE from 'three';

// Coordinates are in the delivered GLB's original mesh space, independent of camera framing.
// Each eye owns a gaze uniform; its iris is reconstructed on the existing curved eye surface.
export function bindFace(body, mobile=false, blink={value:0}) {
  const gaze = [new THREE.Vector2(), new THREE.Vector2()];
  const centers = [new THREE.Vector3(-.049, .757, .082), new THREE.Vector3(.046, .758, .083)];
  const source = body.material;
  const material = new THREE.MeshPhysicalMaterial({
    map:source.map, normalMap:source.normalMap, roughnessMap:source.roughnessMap,
    aoMap:source.aoMap, aoMapIntensity:.65, color:source.color,
    roughness:.65, metalness:0, clearcoat:.06, clearcoatRoughness:.4,
    specularIntensity:.42, ior:1.42,
  });
  material.normalScale.copy(source.normalScale || new THREE.Vector2(1,1));
  material.onBeforeCompile = shader => {
    shader.uniforms.eyeGazeL = {value:gaze[0]};
    shader.uniforms.eyeGazeR = {value:gaze[1]};
    shader.uniforms.eyeSkinMap = {value:source.map};
    shader.uniforms.faceBlink = blink;
    shader.vertexShader = 'varying vec3 avatarPosition; varying vec3 avatarSurfaceNormal; varying vec3 avatarLidNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\navatarPosition = position; avatarSurfaceNormal=normal; avatarLidNormal=normalMatrix*normalize(vec3(position.x*2.,(position.y-.747)*6.,1.));');
    shader.fragmentShader = `varying vec3 avatarPosition; varying vec3 avatarSurfaceNormal; varying vec3 avatarLidNormal;
      uniform vec2 eyeGazeL; uniform vec2 eyeGazeR;
      uniform sampler2D eyeSkinMap;
      uniform float faceBlink;
      vec3 paintEye(vec3 base, vec2 p, vec2 gaze, vec2 radii) {
        if(abs(p.x)>.039 || abs(p.y)>.026 || avatarPosition.z<.045) return base;
        float aperture = length(p / radii);
        // Repaint the full opening inside the lids, not a small ellipse that exposes the baked iris.
        float u=p.x/radii.x;
        float dome=max(0.,1.-u*u);
        float lidBase=avatarPosition.x>0. ? -.0024+u*.0018 : -.0021-u*.0005;
        float upper=lidBase+.0130*pow(dome,.65);
        float lower=lidBase-.0070*sqrt(dome);
        float closedLid=lidBase-.0022*dome;
        upper=mix(upper,closedLid,faceBlink);
        lower=mix(lower,closedLid,faceBlink*.82+faceBlink*faceBlink*.18);
        float edge=min(upper-p.y,p.y-lower);
        float mask=smoothstep(.0001,.0010,edge)*(1.-smoothstep(.94,1.,abs(u))) * smoothstep(.045,.060,avatarPosition.z);
        // The generated atlas contains disconnected lash/iris fragments outside the eye opening.
        // Reconstruct that small socket region from four clean skin samples on this same face.
        bool rightEye=avatarPosition.x>0.;
        vec3 skinTL=texture2D(eyeSkinMap,rightEye?vec2(.808514,.520910):vec2(.818130,.863119)).rgb;
        vec3 skinTR=texture2D(eyeSkinMap,rightEye?vec2(.818429,.531808):vec2(.810718,.866518)).rgb;
        vec3 skinBL=texture2D(eyeSkinMap,rightEye?vec2(.775379,.546851):vec2(.806067,.841282)).rgb;
        vec3 skinBR=texture2D(eyeSkinMap,rightEye?vec2(.784711,.559556):vec2(.798957,.845613)).rgb;
        float skinX=clamp(.5+p.x/.036,0.,1.);
        vec3 socketSkin=mix(mix(skinBL,skinBR,skinX),mix(skinTL,skinTR,skinX),clamp(.5+p.y/.042,0.,1.));
        socketSkin=mix(socketSkin,sqrt(max(socketSkin,vec3(0.)))*vec3(.72,.69,.66),.2);
        float socket=length(p/vec2(.0315,.0205));
        float socketMask=(1.-smoothstep(.80,1.20,socket))*smoothstep(.045,.060,avatarPosition.z);
        base=mix(base,socketSkin,socketMask);
        // A single soft lid rim replaces the fragmented baked dark outline.
        float rim=(1.-smoothstep(.0003,.0017,abs(edge)))*(1.-smoothstep(.93,1.04,abs(u)));
        base=mix(base,socketSkin*vec3(.58,.46,.40),rim*.65*socketMask);
        float crease=exp(-pow((p.y-upper-.0020)/.0012,2.))*dome*(1.-faceBlink);
        base=mix(base,socketSkin*.77,crease*.22*socketMask);
        vec2 irisP = p - gaze;
        float r = length(irisP / vec2(.0102, .0108));
        float angle = atan(irisP.y, irisP.x);
        float fibers = sin(angle*61. + r*32.) * sin(angle*37.-r*19.);
        vec3 iris = mix(vec3(.012,.008,.006), vec3(.062,.036,.020), smoothstep(.25,.65,r));
        iris += fibers * .007;
        iris = mix(iris,vec3(.012,.007,.004),smoothstep(.80,1.,r));
        iris = mix(vec3(.003,.004,.004),iris,smoothstep(.34,.43,r));
        float lidShade=1.-smoothstep(.0003,.0045,edge);
        vec3 sclera = mix(vec3(.72,.73,.68),vec3(.30,.26,.23),lidShade*.5);
        vec3 eye = mix(sclera,iris,1.-smoothstep(.95,1.,r));
        float glint = (1.-smoothstep(.0010,.0020,length(irisP-vec2(-.003,.004)))) * (1.-smoothstep(.8,1.,r));
        eye = mix(eye,vec3(1.),glint*.9);
        return mix(base,eye,mask);
      }\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      // Remove the baked tooth-white spill only on the protruding tongue, below the real teeth.
      float tongue = smoothstep(.071,.084,avatarPosition.z)
        * (1.-smoothstep(.6660,.6682,avatarPosition.y))
        * smoothstep(.626,.642,avatarPosition.y)
        * (1.-smoothstep(.034,.043,abs(avatarPosition.x-.006)));
      float pale = smoothstep(.045,.12,min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b)));
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.56,.17,.205),tongue*pale);
      // Restore the existing mouth surface as one integrated dental arch.
      float archX=(avatarPosition.x+.001)/.040;
      float archCurve=archX*archX;
      float openingTop=.6768-.0040*archCurve;
      float openingBottom=.6650-.0070*archCurve;
      float mouthInside=smoothstep(openingBottom-.0005,openingBottom+.0005,avatarPosition.y)
        *(1.-smoothstep(openingTop-.0004,openingTop+.0005,avatarPosition.y))
        *(1.-smoothstep(.94,1.08,abs(archX)))
        *(1.-smoothstep(.104,.108,avatarPosition.z))*smoothstep(.025,.045,avatarPosition.z);
      // The protruding tongue retains its own colour; the recessed cavity absorbs light.
      float cavity=mouthInside*(1.-tongue);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.004,.0015,.0012),cavity);
      float toothTop=.6763-.0034*archCurve;
      float toothPhase=fract((avatarPosition.x+.001)/.0087);
      float toothBottom=.6706-.0027*archCurve+.00025*pow(abs(toothPhase-.5)*2.,4.);
      float enamelMask=smoothstep(toothBottom-.0003,toothBottom+.0004,avatarPosition.y)
        *(1.-smoothstep(toothTop-.0006,toothTop+.0003,avatarPosition.y))
        *(1.-smoothstep(.84,.98,abs(archX)))*smoothstep(.078,.094,avatarPosition.z);
      float crownHeight=clamp((avatarPosition.y-toothBottom)/(toothTop-toothBottom),0.,1.);
      float seam=1.-smoothstep(.015,.060,abs(fract((avatarPosition.x+.001)/.0087)-.5));
      vec3 enamelColour=mix(vec3(.78,.70,.56),vec3(.57,.48,.35),smoothstep(.55,1.,crownHeight));
      enamelColour*=1.-seam*.18;
      diffuseColor.rgb=mix(diffuseColor.rgb,enamelColour,enamelMask);
      float faceRegion = smoothstep(.59,.65,avatarPosition.y) * smoothstep(.015,.055,avatarPosition.z);
      float warmPixel = smoothstep(.018,.07,diffuseColor.r-diffuseColor.b);
      float skinRegion = faceRegion * warmPixel * (1.-tongue)*(1.-mouthInside)*(1.-enamelMask);
      float hairRegion = max(smoothstep(.835,.85,avatarPosition.y),smoothstep(.78,.84,avatarPosition.y) * (1.-smoothstep(.08,.2,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)))));
      // Fringe undersides project forward of the forehead and have side/downward normals.
      // Include those warm baked pixels instead of treating them as skin.
      float fringeHeight=smoothstep(.797,.813,avatarPosition.y);
      float forwardFringe=fringeHeight*smoothstep(.097,.105,avatarPosition.z);
      float undersideFringe=fringeHeight*smoothstep(.078,.089,avatarPosition.z)*(1.-smoothstep(.55,.80,normalize(avatarSurfaceNormal).z));
      hairRegion=max(hairRegion,max(forwardFringe,undersideFringe));
      // The fringe tips use separate UV islands from the forehead (which is near U=.4).
      // Include these islands even where the scanned albedo mistakenly contains skin colour.
      float fringeIsland=max(step(.90,vMapUv.x),1.-step(.06,vMapUv.y));
      hairRegion=max(hairRegion,fringeIsland*smoothstep(.790,.798,avatarPosition.y)*smoothstep(.045,.065,avatarPosition.z));
      skinRegion*=1.-hairRegion;
      // Prefilter only skin colour; eyes, hair and mouth keep their detailed boundaries.
      vec3 softSkin=texture2D(eyeSkinMap,vMapUv,1.8).rgb;
      diffuseColor.rgb=mix(diffuseColor.rgb,softSkin,skinRegion*.48);
      // Reduce baked colour contrast while preserving the user's facial texture and UVs.
      diffuseColor.rgb = mix(diffuseColor.rgb, sqrt(max(diffuseColor.rgb,vec3(0.)))*vec3(.72,.69,.66),skinRegion*.2);
      float cheeks=exp(-pow((abs(avatarPosition.x)-.063)/.032,2.)-pow((avatarPosition.y-.718)/.032,2.))*skinRegion;
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.055,.955,.925),cheeks*.55);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.022,.030,.037)+min(diffuseColor.rgb,vec3(.12))*.12,hairRegion*.94);
      float brows=smoothstep(.778,.785,avatarPosition.y)*(1.-smoothstep(.797,.801,avatarPosition.y))
        *smoothstep(.010,.024,abs(avatarPosition.x))*(1.-smoothstep(.080,.095,abs(avatarPosition.x)))
        *smoothstep(.045,.070,avatarPosition.z)*(1.-smoothstep(.065,.16,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))))*(1.-hairRegion);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.028,.019,.013),brows*.48);
      // Repaint the sweater with a clean woven cream/olive palette, keeping the dark collar and skin.
      float shirtSkin=smoothstep(.10,.23,(diffuseColor.r-diffuseColor.g)/max(diffuseColor.r,.01));
      float cloth=(1.-smoothstep(.535,.580,avatarPosition.y))*(1.-shirtSkin)*smoothstep(.025,.080,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
      float stripePhase=fract((avatarPosition.y+.006*avatarPosition.x*avatarPosition.x)/.063);
      float stripe=smoothstep(.11,.15,stripePhase)*(1.-smoothstep(.32,.36,stripePhase));
      vec3 cotton=mix(vec3(.68,.65,.54),vec3(.23,.29,.225),stripe);
      float weave=sin(avatarPosition.x*2900.)*sin(avatarPosition.y*3500.);
      cotton*=1.+weave*.018*(1.-smoothstep(.4,1.5,fwidth(avatarPosition.x*2900.)));
      diffuseColor.rgb=mix(diffuseColor.rgb,cotton,cloth*.9);
      diffuseColor.rgb = paintEye(diffuseColor.rgb,avatarPosition.xy-vec2(-.050,.757),eyeGazeL,vec2(.0220,.0113));
      diffuseColor.rgb = paintEye(diffuseColor.rgb,avatarPosition.xy-vec2(.0475,.758),eyeGazeR,vec2(.0220,.0107));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float eyeSurface = max(1.-smoothstep(.87,1.07,length((avatarPosition.xy-vec2(-.049,.757))/vec2(.026,.012))),
        1.-smoothstep(.87,1.07,length((avatarPosition.xy-vec2(.046,.758))/vec2(.024,.012)))) * smoothstep(.06,.074,avatarPosition.z);
      float smoothSurface = max(cloth*.65,max(brows*.8,max(enamelMask,max(max(eyeSurface,tongue*.97),max(skinRegion*${mobile?'.22':'.90'},hairRegion*.98)))));
      normal = normalize(mix(normal,nonPerturbedNormal,smoothSurface));
      // Closed lids cover the baked open-eye crease as well as the iris.
      float lidSurface=max(1.-smoothstep(.80,1.20,length((avatarPosition.xy-vec2(-.050,.757))/vec2(.0315,.0205))),
        1.-smoothstep(.80,1.20,length((avatarPosition.xy-vec2(.0475,.758))/vec2(.0315,.0205))))*smoothstep(.045,.060,avatarPosition.z);
      normal=normalize(mix(normal,normalize(avatarLidNormal),faceBlink*lidSurface*.92));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',THREE.ShaderChunk.aomap_fragment.replace('aoMapIntensity + 1.0','aoMapIntensity * (1.0-faceBlink*lidSurface*.95) + 1.0'));
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float wetEyes=max(1.-smoothstep(.80,1.,length((avatarPosition.xy-vec2(-.049,.757))/vec2(.0228,.0113))),1.-smoothstep(.80,1.,length((avatarPosition.xy-vec2(.046,.758))/vec2(.0228,.012))))*smoothstep(.06,.074,avatarPosition.z);
      wetEyes*=1.-faceBlink;
      roughnessFactor=mix(max(roughnessFactor,.7),.62,skinRegion);
      roughnessFactor=mix(roughnessFactor,.7,hairRegion);
      roughnessFactor=mix(roughnessFactor,.56,tongue);
      roughnessFactor=mix(roughnessFactor,.17,wetEyes);
      roughnessFactor=mix(roughnessFactor,.95,cavity);
      roughnessFactor=mix(roughnessFactor,.52,enamelMask);
      roughnessFactor=mix(roughnessFactor,.88,cloth);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      // A restrained warm fill approximates soft tissue light transport without a costly screen pass.
      reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(.11,.042,.022) * skinRegion;
      reflectedLight.directSpecular*=1.-cavity*(1.-enamelMask);
      reflectedLight.indirectSpecular*=1.-cavity*(1.-enamelMask);
      reflectedLight.directSpecular*=1.-enamelMask*.65;
      reflectedLight.indirectSpecular*=1.-enamelMask*.85;
      reflectedLight.directSpecular*=1.-cloth*.65;
      reflectedLight.indirectSpecular*=1.-cloth*.8;
    `);
  };
  material.customProgramCacheKey = () => 'lam-portrait-surface-v7-'+mobile;
  body.material = material;
  const world = new THREE.Vector3(), local = new THREE.Vector3();
  return {
    gaze, centers,
    update(target, delta, enabled=true, portrait=false) {
      for(let i=0;i<2;i++) {
        local.copy(target); body.worldToLocal(local); local.sub(centers[i]);
        const z = Math.max(.3,Math.abs(local.z));
        // A wider portrait gaze remains clipped by the existing eyelid aperture.
        const gain=portrait?1.65:1, limitX=portrait?.0105:.00675, limitY=portrait?.006:.0045;
        world.set(THREE.MathUtils.clamp(local.x/z*.009*gain,-limitX,limitX),
          THREE.MathUtils.clamp(local.y/z*.009*gain,-limitY,limitY),0);
        gaze[i].lerp(enabled ? new THREE.Vector2(world.x,world.y) : new THREE.Vector2(),1-Math.exp(-delta*9));
      }
    }
  };
}

