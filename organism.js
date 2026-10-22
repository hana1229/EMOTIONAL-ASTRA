import * as THREE from 'three';
const smooth=(a,b,t)=>a+(b-a)*t;
export class EmotionOrganism {
  constructor(canvas){
    this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.9));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0xffffff,0);
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.1,100);this.camera.position.set(0,0,5.75);
    this.scene.add(new THREE.HemisphereLight('#f5eaff','#a5a7cf',2));
    let l=new THREE.DirectionalLight('#ffffff',2.3);l.position.set(-3,4,5);this.scene.add(l);
    l=new THREE.DirectionalLight('#9c82db',1.8);l.position.set(4,-3,-2);this.scene.add(l);
    this.geometry=new THREE.SphereGeometry(1,64,44);this.base=new Float32Array(this.geometry.attributes.position.array);
    this.motion=new Float32Array(this.base.length/3);this.velocity=new Float32Array(this.motion.length);
    this.material=new THREE.MeshPhysicalMaterial({color:'#b7a4e9',roughness:.18,metalness:.02,transparent:true,opacity:.92,clearcoat:1,clearcoatRoughness:.12,transmission:.08,thickness:1.4,side:THREE.DoubleSide});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.scene.add(this.mesh);
    // Gentle orbiting accents make the geometry read as a sculptural object rather than a flat icon.
    this.satelliteGroup=new THREE.Group();this.scene.add(this.satelliteGroup);
    for(let i=0;i<3;i++){const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.35+i*.1,.006,5,128),new THREE.MeshBasicMaterial({color:i===1?'#d5c1ef':'#ffffff',transparent:true,opacity:.26,depthWrite:false}));orbit.rotation.set(.5+i*.5,.2+i*.8,i*1.1);this.satelliteGroup.add(orbit)}
    this.settings={color:'#b7a4e9',material:'jelly',size:100,opacity:92,density:50,softness:70};
    this.intensity=55;this.energy=50;this.valence=0;this.timer=0;this.clickDir=new THREE.Vector3(0,0,1);this.pressEnergy=0;this.dragging=false;this.rotY=.2;this.rotX=.1;this.startXY=null;this.frame=0;this.quality='high';this.active=true;
    this._down=e=>{this.startXY=[e.clientX,e.clientY];this.dragging=false;canvas.setPointerCapture?.(e.pointerId)};
    this._move=e=>{if(!this.startXY)return;const dx=e.clientX-this.startXY[0],dy=e.clientY-this.startXY[1];if(Math.abs(dx)+Math.abs(dy)>3)this.dragging=true;this.rotY+=dx*.006;this.rotX=Math.max(-1.2,Math.min(1.2,this.rotX+dy*.006));this.startXY=[e.clientX,e.clientY]};
    this._up=e=>{if(!this.dragging){const r=canvas.getBoundingClientRect();const coord=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(coord,this.camera);const hit=ray.intersectObject(this.mesh);this.clickDir=hit.length?hit[0].point.clone().normalize():new THREE.Vector3(coord.x,coord.y,.8).normalize();this.pressEnergy=1.1;}
      this.startXY=null;this.dragging=false};
    canvas.addEventListener('pointerdown',this._down);canvas.addEventListener('pointermove',this._move);canvas.addEventListener('pointerup',this._up);canvas.addEventListener('pointercancel',this._up);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);
    this.resize();this.prev=performance.now();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
  }
  resize(){const rect=this.canvas.parentElement.getBoundingClientRect();if(rect.width<10||rect.height<10)return;this.renderer.setSize(rect.width,rect.height,false);this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix()}
  setEmotion(data,settings){this.intensity=Number(data?.intensity??55);this.energy=Number(data?.energy??50);this.valence=Number(data?.valence??0);this.settings={...this.settings,...settings};this.updateMaterial()}
  setQuality(q){this.quality=q;this.renderer.setPixelRatio(Math.min(devicePixelRatio,q==='high'?1.9:q==='standard'?1.4:1));this.resize()}
  updateMaterial(){const s=this.settings;this.material.color.set(s.color||'#b7a4e9');const type=s.material||'jelly';this.material.roughness=type==='matte'?.75:type==='crystal'?.07:.2;this.material.metalness=type==='crystal'?.12:.02;this.material.clearcoat=type==='matte'?.08:1;this.material.transmission=type==='glass'?.7:type==='crystal'?.3:.04;this.material.opacity=Number(s.opacity??92)/100;this.material.transparent=true;this.material.depthWrite=this.material.opacity>.98;this.material.needsUpdate=true;this.mesh.scale.setScalar(Number(s.size??100)/100)}
  loop(t){requestAnimationFrame(this.loop);if(document.hidden||!this.canvas.isConnected||this.canvas.closest('[hidden]')){this.prev=t;return;}const dt=Math.min((t-this.prev)/1000,.05);this.prev=t;this.timer+=dt;this.frame++;
    const s=this.settings,soft=Number(s.softness??70)/100,density=Number(s.density??50)/100,amplitude=.028+(this.intensity/100)*.105+(Math.abs(this.valence)/100)*.032;
    const arr=this.geometry.attributes.position.array,base=this.base;const f=this.quality==='low'?12:1;
    if(this.frame%f===0){for(let i=0;i<base.length;i+=3){const idx=i/3,x=base[i],y=base[i+1],z=base[i+2];const organic=Math.sin(x*3.2+y*1.5+this.timer*.55)*Math.cos(y*2.8-z*2.1-this.timer*.38)+.46*Math.sin(z*5.2+x*3.1+.4+this.timer*.31)+.2*Math.cos(y*9.4+x*8.1+this.timer*.23);
      const texture=(Math.sin(x*13+y*11+z*9+this.timer*.45)*.011)*density;
      const target=(organic*.72+texture)*amplitude;
      const proximity=Math.pow(Math.max(0,x*this.clickDir.x+y*this.clickDir.y+z*this.clickDir.z),9);
      const impulse=this.pressEnergy*proximity*.055*(.3+soft);
      const spring=(target+impulse-this.motion[idx])*(.04+(1-soft)*.1);
      this.velocity[idx]=(this.velocity[idx]+spring)*(0.81+soft*.13);
      this.motion[idx]+=this.velocity[idx];const radial=1+this.motion[idx];arr[i]=x*radial;arr[i+1]=y*radial;arr[i+2]=z*radial;
    }this.geometry.attributes.position.needsUpdate=true;if(this.frame%4===0)this.geometry.computeVertexNormals();}
    this.pressEnergy*=Math.pow(.92,dt*60);this.rotY+=this.dragging?0:dt*.11;this.mesh.rotation.set(this.rotX,this.rotY,0);this.satelliteGroup.rotation.y=this.rotY*.25;this.satelliteGroup.rotation.z=this.timer*.022;
    this.mesh.position.y=Math.sin(this.timer*(.8+this.energy/100))*.05;
    this.renderer.render(this.scene,this.camera);
  }
}
