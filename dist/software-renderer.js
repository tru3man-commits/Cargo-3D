import * as T from 'three';

// Depth-buffered orthographic fallback. Shares geometry, picking and camera with WebGL.
export class SoftwareRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Canvas 2D unavailable');this.shadowMap={};this.ratio=1;this.dirty=true;this.last='';this.textures=new WeakMap();}
 setPixelRatio(r){this.ratio=Math.min(r,1.5);}
 setSize(w,h){this.width=w;this.height=h;this.canvas.width=Math.round(w*this.ratio);this.canvas.height=Math.round(h*this.ratio);this.dirty=true;}
 setClearColor(){}
 invalidate(){this.dirty=true;}
 setAnimationLoop(fn){const loop=()=>{fn();requestAnimationFrame(loop);};requestAnimationFrame(loop);}
 texture(image){if(this.textures.has(image))return this.textures.get(image);const data=image.getContext('2d').getImageData(0,0,image.width,image.height);this.textures.set(image,data);return data;}
 render(scene,camera){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const signature=camera.matrixWorld.elements.map(n=>n.toFixed(4)).join(',')+camera.zoom;if(!this.dirty&&signature===this.last)return;this.last=signature;this.dirty=false;
  const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height;if(!W||!H)return;const pixels=ctx.createImageData(W,H),data=pixels.data,depths=new Float32Array(W*H).fill(Infinity);const opaque=[],transparent=[],lines=[],overlays=[];
  const project=v=>{const p=v.clone().project(camera);return{x:(p.x+1)*W/2,y:(1-p.y)*H/2,z:p.z};},light=new T.Vector3(-.4,.85,.55).normalize();
  const rgb=(mat,normal)=>{const c=mat.color?.clone()||new T.Color(0x899b8a);if(!mat.isMeshBasicMaterial&&normal)c.multiplyScalar(.72+.38*Math.max(0,normal.dot(light)));const h=c.getHex(T.SRGBColorSpace);return[h>>16,(h>>8)&255,h&255];};
  scene.traverseVisible(obj=>{
   if(obj.isSprite){const p=project(obj.getWorldPosition(new T.Vector3())),scale=obj.getWorldScale(new T.Vector3()),px=H/(camera.top-camera.bottom)*camera.zoom;overlays.push({sprite:obj.material.map?.image,p,width:scale.x*px,height:scale.y*px});return;}
   const geom=obj.geometry;if(!geom||!obj.material)return;const pos=geom.attributes.position;if(!pos)return;const vertices=Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(obj.matrixWorld)),pts=vertices.map(project),idx=geom.index,index=i=>idx?idx.array[i]:i,count=idx?idx.count:pos.count;
   if(obj.isLine){const mat=obj.material;if(mat.visible===false)return;const step=obj.isLineSegments?2:1;for(let i=0;i<count-1;i+=step){const a=pts[index(i)],b=pts[index(i+1)];if(!a||!b||a.z>1||b.z>1)continue;lines.push({a,b,color:rgb(mat),alpha:mat.opacity,width:obj.isBox3Helper?1.7:1});}return;}
   if(!obj.isMesh)return;
   for(let i=0;i<count;i+=3){const indices=[index(i),index(i+1),index(i+2)],ps=indices.map(i=>pts[i]);if(ps.some(p=>!p||p.z>1||p.z< -1))continue;let material=obj.material;if(Array.isArray(material)){const group=geom.groups.find(g=>i>=g.start&&i<g.start+g.count);material=material[group?.materialIndex||0];}if(!material||material.isShadowMaterial||material.visible===false)continue;
    const [a,b,c]=ps,cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(cross)<.01||(material.side===T.FrontSide&&cross>=0)||(material.side===T.BackSide&&cross<0))continue;
    const normal=new T.Vector3().subVectors(vertices[indices[1]],vertices[indices[0]]).cross(new T.Vector3().subVectors(vertices[indices[2]],vertices[indices[0]])).normalize(),p={ps,depth:(a.z+b.z+c.z)/3,color:rgb(material,normal),alpha:material.opacity};
    if(material.map?.image&&geom.attributes.uv){p.texture=this.texture(material.map.image);const uv=geom.attributes.uv;p.uv=indices.map(i=>({x:uv.getX(i),y:1-uv.getY(i)}));}
    (p.alpha>=.99?opaque:transparent).push(p);
   }
  });
  const blend=(i,r,g,b,a)=>{const at=i*4;if(a>=.99){data[at]=r;data[at+1]=g;data[at+2]=b;data[at+3]=255;return;}const old=data[at+3]/255,newA=a+old*(1-a);if(!newA)return;data[at]=(r*a+data[at]*old*(1-a))/newA;data[at+1]=(g*a+data[at+1]*old*(1-a))/newA;data[at+2]=(b*a+data[at+2]*old*(1-a))/newA;data[at+3]=newA*255;};
  const triangle=p=>{const[a,b,c]=p.ps,minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(W-1,Math.ceil(Math.max(a.x,b.x,c.x))),minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(H-1,Math.ceil(Math.max(a.y,b.y,c.y))),den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<.001)return;
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/den,v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/den,w=1-u-v;if(u<-.00001||v<-.00001||w<-.00001)continue;const z=a.z*u+b.z*v+c.z*w,i=y*W+x;if(z>depths[i]+.0000005)continue;let[r,g,bv]=p.color,alpha=p.alpha;if(p.texture){const uv=p.uv,t=p.texture,tx=Math.min(t.width-1,Math.max(0,Math.floor((uv[0].x*u+uv[1].x*v+uv[2].x*w)*t.width))),ty=Math.min(t.height-1,Math.max(0,Math.floor((uv[0].y*u+uv[1].y*v+uv[2].y*w)*t.height))),at=(ty*t.width+tx)*4;r=t.data[at];g=t.data[at+1];bv=t.data[at+2];alpha*=t.data[at+3]/255;}if(alpha<.01)continue;blend(i,r,g,bv,alpha);if(alpha>.9)depths[i]=z;}
  };
  for(const p of opaque)triangle(p);transparent.sort((a,b)=>b.depth-a.depth);for(const p of transparent)triangle(p);
  for(const p of lines){let t0=0,t1=1;const dx=p.b.x-p.a.x,dy=p.b.y-p.a.y;const clip=(k,q)=>{if(k===0)return q>=0;const r=q/k;if(k<0){if(r>t1)return false;t0=Math.max(t0,r);}else{if(r<t0)return false;t1=Math.min(t1,r);}return true;};if(!clip(-dx,p.a.x)||!clip(dx,W-1-p.a.x)||!clip(-dy,p.a.y)||!clip(dy,H-1-p.a.y))continue;const steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*(t1-t0));for(let s=0;s<=steps;s++){const t=t0+(t1-t0)*s/Math.max(steps,1),x=Math.round(p.a.x+dx*t),y=Math.round(p.a.y+dy*t),z=p.a.z+(p.b.z-p.a.z)*t-.000025;if(x<0||x>=W||y<0||y>=H)continue;const i=y*W+x;if(z<=depths[i]+.00002){blend(i,...p.color,p.alpha);if(p.width>1&&x+1<W)blend(i+1,...p.color,p.alpha);}}}
  ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(pixels,0,0);const ground=project(new T.Vector3(-.4,-.68,0));ctx.save();ctx.globalCompositeOperation='destination-over';ctx.filter='blur(15px)';ctx.fillStyle='rgba(60,85,57,0.12)';ctx.beginPath();ctx.ellipse(ground.x,ground.y,W*.22*camera.zoom,H*.06*camera.zoom,0,0,Math.PI*2);ctx.fill();ctx.restore();for(const s of overlays)if(s.sprite)ctx.drawImage(s.sprite,s.p.x-s.width/2,s.p.y-s.height/2,s.width,s.height);
 }
}
