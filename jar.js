/** Interactive 30-day bead jar. Visual-only interaction; journal records are never changed by dragging. */
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export class BeadJar {
  constructor(el){
    this.el=el;this.balls=[];this.drag=null;this.frame=0;this.last=0;
    this.width=el.clientWidth||205;this.height=el.clientHeight||232;
    this.down=e=>this.onDown(e);this.move=e=>this.onMove(e);this.up=e=>this.onUp(e);
    el.addEventListener('pointerdown',this.down);
    el.addEventListener('pointermove',this.move);
    el.addEventListener('pointerup',this.up);
    el.addEventListener('pointercancel',this.up);
    el.addEventListener('lostpointercapture',this.up);
    this.resizer=typeof ResizeObserver==='function'?new ResizeObserver(()=>this.resize()):null;
    this.resizer?.observe(el);
  }
  resize(){
    const w=this.el.clientWidth||this.width,h=this.el.clientHeight||this.height;
    if(w===this.width&&h===this.height)return;
    this.width=w;this.height=h;
    this.balls.forEach((b,i)=>{this.setHome(b,i);b.x=clamp(b.x,b.radius,w-b.radius);b.y=clamp(b.y,b.radius,h-b.radius)});
  }
  setHome(b,index){
    const cols=5,slot=index%cols,row=Math.floor(index/cols),usable=this.width-40;
    b.homeX=20+((slot+.5)/cols)*usable+Math.sin(index*2.4)*3;
    b.homeY=clamp(this.height-19-b.radius-row*37,b.radius+8,this.height-b.radius-8);
  }
  setBeads(beads){
    this.stop();this.drag=null;this.resize();this.el.replaceChildren();
    if(!beads.length){this.el.innerHTML='<span class="jar-empty">한 달의 첫 번째 감정을 기록해 보세요.</span>';return}
    const list=[...beads].sort((a,b)=>b.weight-a.weight||b.size-a.size);
    const frag=document.createDocumentFragment();
    this.balls=list.map((item,i)=>{
      const node=document.createElement('span');node.className=`jar-bead ${item.material}`;
      node.style.setProperty('--bead',item.color);
      node.style.width=node.style.height=`${item.size}px`;
      node.dataset.day=item.day;
      node.title=`${item.day} · ${item.key} · 드래그해서 움직이기`;
      node.setAttribute('role','img');node.setAttribute('aria-label',`${item.day} ${item.key} 감정 구슬`);
      frag.appendChild(node);
      const ball={...item,el:node,radius:item.size/2,vx:0,vy:0,x:0,y:0,homeX:0,homeY:0,grabbed:false};
      this.setHome(ball,i);
      ball.x=ball.homeX;ball.y=ball.homeY-10;
      return ball;
    });
    this.el.appendChild(frag);
    this.last=performance.now();this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  findBall(node){return this.balls.find(b=>b.el===node)}
  local(e){const r=this.el.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
  onDown(e){
    if(this.drag||e.button!==0)return;
    const target=e.target.closest?.('.jar-bead');if(!target||!this.el.contains(target))return;
    const b=this.findBall(target);if(!b)return;
    e.preventDefault();const point=this.local(e);
    b.grabbed=true;b.vx=0;b.vy=0;
    b.el.classList.add('is-dragging');b.el.style.zIndex='20';
    this.drag={ball:b,pointer:e.pointerId,dx:b.x-point.x,dy:b.y-point.y,px:point.x,py:point.y};
    this.el.setPointerCapture?.(e.pointerId);
  }
  onMove(e){
    if(!this.drag||this.drag.pointer!==e.pointerId)return;
    e.preventDefault();const b=this.drag.ball,point=this.local(e);
    const newX=clamp(point.x+this.drag.dx,b.radius+3,this.width-b.radius-3);
    const newY=clamp(point.y+this.drag.dy,b.radius+3,this.height-b.radius-3);
    b.vx=clamp((newX-b.x)*.6,-9,9);b.vy=clamp((newY-b.y)*.6,-9,9);
    b.x=newX;b.y=newY;
    this.drag.px=point.x;this.drag.py=point.y;
  }
  onUp(e){
    if(!this.drag||this.drag.pointer!==e.pointerId)return;
    const b=this.drag.ball;b.grabbed=false;b.el.classList.remove('is-dragging');b.el.style.zIndex='';
    this.drag=null;
    if(this.el.hasPointerCapture?.(e.pointerId))this.el.releasePointerCapture(e.pointerId);
  }
  tick(now){
    const dt=clamp((now-this.last)/16.667,.5,2);this.last=now;
    if(!document.hidden&&this.el.isConnected){
      for(const b of this.balls){
        if(b.grabbed)continue;
        // A light bead seeks a higher layer; a dense bead settles lower.
        b.vx+=(b.homeX-b.x)*.011*dt;
        b.vy+=(b.homeY-b.y)*.012*dt;
        b.vx*=Math.pow(.91,dt);b.vy*=Math.pow(.91,dt);
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        const edge=3;
        if(b.x<b.radius+edge){b.x=b.radius+edge;b.vx=Math.abs(b.vx)*.35}
        if(b.x>this.width-b.radius-edge){b.x=this.width-b.radius-edge;b.vx=-Math.abs(b.vx)*.35}
        if(b.y<b.radius+edge){b.y=b.radius+edge;b.vy=Math.abs(b.vy)*.35}
        if(b.y>this.height-b.radius-edge){b.y=this.height-b.radius-edge;b.vy=-Math.abs(b.vy)*.35}
      }
      // Soft circle collisions make nearby beads yield when one is dragged.
      for(let i=0;i<this.balls.length;i++)for(let j=i+1;j<this.balls.length;j++){
        const a=this.balls[i],b=this.balls[j],dx=b.x-a.x,dy=b.y-a.y;
        const minDist=(a.radius+b.radius)*.84,dist=Math.hypot(dx,dy)||.001;
        if(dist>=minDist)continue;
        const nx=dx/dist,ny=dy/dist,overlap=(minDist-dist)*.47;
        if(!a.grabbed){a.x-=nx*overlap*(b.grabbed?2:1);a.y-=ny*overlap*(b.grabbed?2:1);a.vx-=nx*.09;a.vy-=ny*.09}
        if(!b.grabbed){b.x+=nx*overlap*(a.grabbed?2:1);b.y+=ny*overlap*(a.grabbed?2:1);b.vx+=nx*.09;b.vy+=ny*.09}
      }
      for(const b of this.balls){
        b.x=clamp(b.x,b.radius+2,this.width-b.radius-2);
        b.y=clamp(b.y,b.radius+2,this.height-b.radius-2);
        b.el.style.transform=`translate3d(${(b.x-b.radius).toFixed(1)}px,${(b.y-b.radius).toFixed(1)}px,0)`;
      }
    }
    this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0}
  destroy(){this.stop();this.resizer?.disconnect();this.el.removeEventListener('pointerdown',this.down);this.el.removeEventListener('pointermove',this.move);this.el.removeEventListener('pointerup',this.up);this.el.removeEventListener('pointercancel',this.up);this.el.removeEventListener('lostpointercapture',this.up)}
}
