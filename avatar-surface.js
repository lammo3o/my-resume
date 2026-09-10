import * as THREE from 'three';

// Coordinates are in the delivered GLB's original mesh space, independent of camera framing.
// Each eye owns a gaze uniform; its iris is reconstructed on the existing curved eye surface.
export function bindFace(body) {
  const gaze = [new THREE.Vector2(), new THREE.Vector2()];
  const centers = [new THREE.Vector3(-.049, .757, .082), new THREE.Vector3(.046, .758, .083)];
  const material = body.material.clone();
  material.onBeforeCompile = shader => {
    shader.uniforms.eyeGazeL = {value:gaze[0]};
    shader.uniforms.eyeGazeR = {value:gaze[1]};
    shader.vertexShader = 'varying vec3 avatarPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\navatarPosition = position;');
    shader.fragmentShader = `varying vec3 avatarPosition;
      uniform vec2 eyeGazeL; uniform vec2 eyeGazeR;
      vec3 paintEye(vec3 base, vec2 p, vec2 gaze, vec2 radii) {
        float aperture = length(p / radii);
        float mask = (1. - smoothstep(.89, 1.03, aperture)) * smoothstep(.060, .073, avatarPosition.z);
        vec2 irisP = p - gaze;
        float r = length(irisP / vec2(.0102, .0108));
        float angle = atan(irisP.y, irisP.x);
        float fibers = sin(angle*61. + r*32.) * sin(angle*37.-r*19.);
        vec3 iris = mix(vec3(.045,.015,.006), vec3(.20,.076,.023), smoothstep(.25,.65,r));
        iris += fibers * .018;
        iris = mix(iris,vec3(.012,.007,.004),smoothstep(.80,1.,r));
        iris = mix(vec3(.003,.004,.004),iris,smoothstep(.34,.43,r));
        vec3 eye = mix(vec3(.80,.79,.72),iris,1.-smoothstep(.95,1.,r));
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
      diffuseColor.rgb = paintEye(diffuseColor.rgb,avatarPosition.xy-vec2(-.049,.757),eyeGazeL,vec2(.0228,.0113));
      diffuseColor.rgb = paintEye(diffuseColor.rgb,avatarPosition.xy-vec2(.046,.758),eyeGazeR,vec2(.0228,.0120));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float eyeSurface = max(1.-smoothstep(.87,1.07,length((avatarPosition.xy-vec2(-.049,.757))/vec2(.026,.012))),
        1.-smoothstep(.87,1.07,length((avatarPosition.xy-vec2(.046,.758))/vec2(.024,.012)))) * smoothstep(.06,.074,avatarPosition.z);
      normal = normalize(mix(normal,nonPerturbedNormal,max(eyeSurface,tongue*.9)));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.75,tongue);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\nmetalnessFactor*=1.-tongue;`);
  };
  material.customProgramCacheKey = () => 'lam-face-repair-gaze-v2';
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
