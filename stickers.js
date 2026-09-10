import * as THREE from 'three';
import {DecalGeometry} from './DecalGeometry.js';

// Native vector artwork: sharp at all resolutions and independent of external image services.
export function stickerSVG(kind,cover=false){
  const school=kind==='school';
  const art=school?`<path d="M78 210V118h164v92" fill="#f8cf78" stroke="#174c51" stroke-width="8"/><path d="M65 119l95-62 95 62z" fill="#e78165" stroke="#174c51" stroke-linejoin="round" stroke-width="8"/><path d="M147 210v-48h26v48M100 140h18v24h-18zm102 0h18v24h-18z" fill="#428d9a" stroke="#174c51" stroke-width="5"/><circle cx="160" cy="105" r="15" fill="#fff9e8" stroke="#174c51" stroke-width="5"/><path d="M160 94v13h9M160 54V31h33l-8 12h-25" fill="#e78165" stroke="#174c51" stroke-width="5"/><path d="M57 215h206" stroke="#174c51" stroke-width="8" stroke-linecap="round"/>`
  :`<path d="M67 112h186v105H67z" fill="#766694" stroke="#253746" stroke-width="8"/><path d="M56 105l19-36h170l20 36z" fill="#e19b56" stroke="#253746" stroke-width="8" stroke-linejoin="round"/><rect x="120" y="133" width="63" height="84" rx="27" fill="#263647" stroke="#eadba7" stroke-width="6"/><circle cx="150" cy="164" r="9" fill="#f0be6f"/><path d="M147 170h7l4 18h-15z" fill="#f0be6f"/><path d="M83 135h20v27H83zm117 0h20v27h-20z" fill="#89c8be" stroke="#253746" stroke-width="5"/><path d="M46 219h229" stroke="#253746" stroke-width="8" stroke-linecap="round"/><path d="M264 50v19m-9-9h19M46 145v15m-7-7h14" stroke="#d89b4e" stroke-width="5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cover?960:512}" height="${cover?540:512}" viewBox="${cover?'-130 -20 580 326':'0 0 320 320'}">${cover?`<rect x="-130" y="-20" width="580" height="326" fill="${school?'#cfe7db':'#b6c5d4'}"/><circle cx="-40" cy="70" r="80" fill="${school?'#f4d697':'#d3d3e7'}"/><path d="M-130 249Q0 195 140 246T450 224v82h-580z" fill="${school?'#7dad9b':'#748c9d'}"/>`:''}<path d="M50 31Q160 7 264 39l24 40-3 161-28 37-166 9-51-28-8-165z" fill="#fffaf0" stroke="#fff" stroke-width="13" stroke-linejoin="round"/>${art}<text x="160" y="256" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" font-weight="900" letter-spacing="3" fill="#253746">${school?'CAMPUS':'ESCAPE'}</text></svg>`;
}
export const svgURL=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);

export class StickerLayer{
  constructor(body){this.body=body;this.items=[];this.textures={};for(const kind of ['school','escape']){const t=new THREE.TextureLoader().load(svgURL(stickerSVG(kind)));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;this.textures[kind]=t;}}
  rebuild(configs){
    for(const item of this.items){this.body.remove(item.mesh);item.mesh.geometry.dispose();item.mesh.material.dispose();}
    this.items=configs.map(config=>this.create(config));
  }
  create(config){
    const p=new THREE.Vector3().fromArray(config.position),n=new THREE.Vector3().fromArray(config.normal).normalize();
    // Preserve the avatar's up direction, including when the anchor faces backwards.
    const upHint=Math.abs(n.y)>.95?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
    const right=new THREE.Vector3().crossVectors(upHint,n).normalize();
    const up=new THREE.Vector3().crossVectors(n,right).normalize();
    const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,n));
    orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),THREE.MathUtils.degToRad(config.rotation)));
    // Only send nearby triangles to the projector; retain original dense geometry in the avatar.
    const source=this.body.geometry,positions=source.attributes.position,normals=source.attributes.normal,index=source.index;
    const radius=config.size*.9,localPositions=[],localNormals=[];
    for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);const cx=(positions.getX(a)+positions.getX(b)+positions.getX(c))/3,cy=(positions.getY(a)+positions.getY(b)+positions.getY(c))/3,cz=(positions.getZ(a)+positions.getZ(b)+positions.getZ(c))/3;
      if(Math.abs(cx-p.x)>radius||Math.abs(cy-p.y)>radius||Math.abs(cz-p.z)>radius)continue;
      const facing=(normals.getX(a)+normals.getX(b)+normals.getX(c))*n.x+(normals.getY(a)+normals.getY(b)+normals.getY(c))*n.y+(normals.getZ(a)+normals.getZ(b)+normals.getZ(c))*n.z;
      if(facing<.3)continue;
      for(const v of [a,b,c]){localPositions.push(positions.getX(v),positions.getY(v),positions.getZ(v));localNormals.push(normals.getX(v),normals.getY(v),normals.getZ(v));}
    }
    const subset=new THREE.BufferGeometry();subset.setAttribute('position',new THREE.Float32BufferAttribute(localPositions,3));subset.setAttribute('normal',new THREE.Float32BufferAttribute(localNormals,3));
    const proxy=new THREE.Mesh(subset);proxy.updateMatrixWorld(true);
    const geometry=new DecalGeometry(proxy,p,new THREE.Euler().setFromQuaternion(orientation),new THREE.Vector3(config.size,config.size,config.size*.7));subset.dispose();
    const gp=geometry.attributes.position,gn=geometry.attributes.normal;
    for(let i=0;i<gp.count;i++)gp.setXYZ(i,gp.getX(i)+gn.getX(i)*.0006,gp.getY(i)+gn.getY(i)*.0006,gp.getZ(i)+gn.getZ(i)*.0006);
    const material=new THREE.MeshStandardMaterial({map:this.textures[config.kind],transparent:true,alphaTest:.25,roughness:.62,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,emissive:0x58c8ac,emissiveIntensity:0});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`sticker:${config.id}`;mesh.renderOrder=3;mesh.userData.stickerId=config.id;this.body.add(mesh);
    return {config,mesh};
  }
  hover(id){for(const {config,mesh} of this.items)mesh.material.emissiveIntensity=config.id===id?.6:0;}
  pick(raycaster){
    const hits=raycaster.intersectObjects(this.items.map(i=>i.mesh),false);
    if(!hits.length)return null;
    // Real body depth prevents a sticker on the far cheek/back being clickable through the person.
    const bodyHit=raycaster.intersectObject(this.body,false)[0];
    return !bodyHit||hits[0].distance<=bodyHit.distance+.009 ? hits[0].object.userData.stickerId:null;
  }
}

