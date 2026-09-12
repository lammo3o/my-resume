import * as THREE from 'three';

// A small, prefiltered studio reflection rig. Generated locally, so there is no HDR download.
export function lightPortrait(renderer, scene, mobile) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x555f63);
  const panels = [];
  for (const [color, intensity, position, size] of [
    [0xffe7d1, 5, [-3, 3, 4], [3, 4]],
    [0xc9e7ef, 2.2, [4, 1, 2], [2, 4]],
    [0xffffff, 4, [1, 4, -3], [3, 2]],
  ]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide}));
    panel.material.color.multiplyScalar(intensity);
    panel.position.fromArray(position); panel.lookAt(0, 0, 0); studio.add(panel); panels.push(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromScene(studio, .08, .1, 30, {size:mobile?128:256});
  scene.environment = environment.texture;
  scene.environmentIntensity = .28;
  generator.dispose();
  for (const panel of panels) {panel.geometry.dispose();panel.material.dispose();}
  scene.add(new THREE.HemisphereLight(0xdcecf0, 0x80735e, .72));
  for (const [color, intensity, position] of [
    [0xffe7d5, 2.65, [-3.5, 3, 3]],
    [0xd5e7ed, .58, [3, .8, 3]],
    [0xc7e4ed, 3.1, [2.5, 2.3, -2.5]],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.fromArray(position);scene.add(light);
  }
  return environment;
}
