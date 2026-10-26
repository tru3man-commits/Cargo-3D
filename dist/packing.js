// All geometry is in centimetres. Each placement records the source axes along length, width and height.
export const EPS = 0.01;
export const MAX_UNITS = 160;
export const PALETTE = ['#21a58b','#6f7fce','#dfa253','#d87484','#53a9c5','#a18bc1'];
export const PRESETS = [
  {id:'van',name:'3,5 t ponyvás furgon',kind:'Furgon',l:440,w:220,h:240,maxWeight:1000,description:'Szerkeszthető mintaméretek'},
  {id:'sprinter',name:'Sprinter · zárt furgon',kind:'Furgon',l:430,w:178,h:194,maxWeight:1000,description:'Téglatestként kezelt raktér'},
  {id:'box',name:'7,5 t dobozos teherautó',kind:'Teherautó',l:610,w:245,h:240,maxWeight:2800,description:'Szerkeszthető mintaméretek'},
  {id:'semi',name:'13,6 m nyerges pótkocsi',kind:'Pótkocsi',l:1360,w:245,h:270,maxWeight:24000,description:'Szerkeszthető mintaméretek'},
  {id:'c20',name:'20 lábas konténer',kind:'Konténer',l:589,w:235,h:239,maxWeight:28000,description:'Szerkeszthető mintaméretek'},
  {id:'c40',name:'40 lábas konténer',kind:'Konténer',l:1203,w:235,h:239,maxWeight:26500,description:'Szerkeszthető mintaméretek'},
];
export function uid(){return globalThis.crypto?.randomUUID?.() || 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
export function examplePlan(){
 return {version:2,id:uid(),name:'Budaörs → Bécs',vehicle:{...PRESETS[0]},items:[
   {id:uid(),name:'EUR raklap',l:120,w:80,h:120,weight:120,qty:4,color:PALETTE[0],stackable:false,rotatable:true,tiltable:false,floorOnly:false,pallet:true},
   {id:uid(),name:'Félraklap',l:80,w:60,h:100,weight:65,qty:2,color:PALETTE[1],stackable:false,rotatable:true,tiltable:false,floorOnly:false,pallet:true},
   {id:uid(),name:'Doboz',l:60,w:40,h:50,weight:20,qty:3,color:PALETTE[2],stackable:true,rotatable:true,tiltable:false,floorOnly:false,pallet:false},
 ],placements:[]};
}
export function units(items){return items.flatMap(item=>Array.from({length:item.qty},(_,i)=>({...item,unitId:item.id+':'+i,index:i})));}
const orientationCache=new WeakMap();
export function orientations(item){
 const cached=orientationCache.get(item);
 if(cached&&['l','w','h','rotatable','tiltable'].every(k=>cached[k]===item[k]))return cached.options;
 const bases=item.tiltable===true?['lwh','hwl','lhw']:['lwh'];
 const options=bases.flatMap(code=>(item.rotatable?[code,code[1]+code[0]+code[2]]:[code])).map(orientation=>({orientation,l:item[orientation[0]],w:item[orientation[1]],h:item[orientation[2]]}));
 orientationCache.set(item,{l:item.l,w:item.w,h:item.h,rotatable:item.rotatable,tiltable:item.tiltable,options});return options;
}
export function matchingOrientation(item,p){
 return orientations(item).find(o=>(p.orientation===undefined||o.orientation===p.orientation)&&Math.abs(o.l-p.l)<EPS&&Math.abs(o.w-p.w)<EPS&&Math.abs(o.h-p.h)<EPS);
}
export function rotatedPlacement(item,p){
 if(!item.rotatable)return null;const o=matchingOrientation(item,p);if(!o)return null;
 const target=orientations(item).find(a=>a.orientation===o.orientation[1]+o.orientation[0]+o.orientation[2]);return target?{...p,...target}:null;
}
export function overlaps(a,b){return a.x<b.x+b.l-EPS&&a.x+a.l>b.x+EPS&&a.y<b.y+b.w-EPS&&a.y+a.w>b.y+EPS&&a.z<b.z+b.h-EPS&&a.z+a.h>b.z+EPS;}
export function unionArea(rects){
 if(!rects.length)return 0;
 const xs=[...new Set(rects.flatMap(r=>[r.x,r.x+r.l]))].sort((a,b)=>a-b);let area=0;
 for(let i=0;i<xs.length-1;i++){
  const mids=(xs[i]+xs[i+1])/2;const spans=rects.filter(r=>r.x<=mids&&r.x+r.l>=mids).map(r=>[r.y,r.y+r.w]).sort((a,b)=>a[0]-b[0]);
  let end=-Infinity,length=0;for(const [a,b] of spans){if(b>end){length+=b-Math.max(a,end);end=b;}}
  area+=(xs[i+1]-xs[i])*length;
 }return area;
}
export function supported(p,others,itemMap){
 if(p.z<EPS)return true;
 const supporting=others.filter(b=>Math.abs(b.z+b.h-p.z)<EPS&&itemMap.get(b.itemId)?.stackable).map(b=>{
   const x=Math.max(b.x,p.x),y=Math.max(b.y,p.y);return {x,y,l:Math.max(0,Math.min(b.x+b.l,p.x+p.l)-x),w:Math.max(0,Math.min(b.y+b.w,p.y+p.w)-y)};
 }).filter(r=>r.l>EPS&&r.w>EPS);
 return unionArea(supporting)>=p.l*p.w-EPS;
}
export function checkPosition(p,others,vehicle,itemMap){
 if([p.x,p.y,p.z,p.l,p.w,p.h].some(n=>!Number.isFinite(n)))return 'Érvénytelen koordináta.';
 const item=itemMap.get(p.itemId);if(!item)return 'Ismeretlen áru a tervben.';
 if(item.floorOnly&&Math.abs(p.z)>EPS)return 'Ez az áru csak a padlón helyezhető el (Z = 0 cm).';
 if(!matchingOrientation(item,p)){
   if(!item.tiltable&&p.orientation&&p.orientation[2]!=='h')return 'Ez az áru nem dönthető.';
   if(!item.rotatable&&p.orientation)return 'Ez az áru ebbe az irányba nem forgatható.';
   return 'Az áru mérete vagy tájolása nem megengedett.';
 }
 if(p.x<-EPS||p.y<-EPS||p.z<-EPS||p.x+p.l>vehicle.l+EPS||p.y+p.w>vehicle.w+EPS||p.z+p.h>vehicle.h+EPS)return 'Az áru kilógna a raktérből.';
 if(others.some(b=>overlaps(p,b)))return 'Itt már van egy másik áru.';
 if(!supported(p,others,itemMap))return 'Nincs teljes alátámasztás, vagy az alatta lévő áru nem halmozható.';
 return null;
}
export function validateLayout(plan){
 const items=new Map(plan.items.map(i=>[i.id,i])),seen=new Set();let weight=0;
 for(const p of plan.placements){
  const item=items.get(p.itemId);if(!item)return 'Ismeretlen áru a tervben.';
  if(!Number.isInteger(p.index)||p.index<0||p.index>=item.qty||p.unitId!==item.id+':'+p.index||seen.has(p.unitId))return 'Érvénytelen vagy ismétlődő áruegység.';
  seen.add(p.unitId);
  const err=checkPosition(p,plan.placements.filter(b=>b!==p),plan.vehicle,items);if(err)return err;
  weight+=item.weight;
 }if(weight>plan.vehicle.maxWeight+EPS)return 'A megengedett teherbírás túllépése.';
 return null;
}
function candidatePoints(placed,v){
 const points=[{x:0,y:0,z:0}],seen=new Set(['0,0,0']);
 function add(x,y,z){if(x>=v.l-EPS||y>=v.w-EPS||z>=v.h-EPS)return;const key=[x,y,z].map(n=>Math.round(n*100)).join(',');if(!seen.has(key)){seen.add(key);points.push({x,y,z});}}
 for(const b of placed){
   add(b.x+b.l,b.y,b.z);add(b.x,b.y+b.w,b.z);add(b.x,b.y,b.z+b.h);
   add(b.x+b.l,0,0);add(0,b.y+b.w,0);add(b.x,b.y,0);
   // Project extreme edges against each other to avoid holes between unlike footprints.
   for(const a of placed){add(b.x+b.l,a.y+a.w,0);if(Math.abs(a.z+a.h-b.z-b.h)<EPS)add(b.x+b.l,a.y,b.z+b.h);}
 }return points;
}
function greedy(plan,order,mode){
 const v=plan.vehicle,items=new Map(plan.items.map(i=>[i.id,i]));let placed=[],weight=0,usedX=0;
 for(const unit of order){
  if(weight+unit.weight>v.maxWeight+EPS)continue;
  const seenDims=new Set();const dims=orientations(unit).filter(o=>{const key=[o.l,o.w,o.h].join(',');if(seenDims.has(key))return false;seenDims.add(key);return true;});
  const points=candidatePoints(placed,v);let best=null,bestScore=Infinity;
  for(const pt of points)for(const dimensions of dims){
    if(unit.floorOnly&&pt.z>EPS)continue;
    const p={...pt,...dimensions,itemId:unit.id,unitId:unit.unitId,index:unit.index};const l=p.l;
    if(checkPosition(p,placed,v,items))continue;
    const score=mode===0?pt.z*1e8+Math.max(usedX,pt.x+l)*1e4+pt.x*10+pt.y:pt.z*1e8+pt.x*1e5+pt.y*100+l;
    if(score<bestScore){best=p;bestScore=score;}
  }
  if(best){placed.push(best);weight+=unit.weight;usedX=Math.max(usedX,best.x+best.l);}
 }return placed;
}
export function pack(plan){
 const all=units(plan.items);if(all.length>MAX_UNITS)throw Error('Egy tervben legfeljebb '+MAX_UNITS+' egység lehet.');
 const strategies=[all.toSorted((a,b)=>b.l*b.w-a.l*a.w||b.weight-a.weight),all.toSorted((a,b)=>b.l*b.w*b.h-a.l*a.w*a.h),all.toSorted((a,b)=>Math.max(b.l,b.w)-Math.max(a.l,a.w)||b.l*b.w-a.l*a.w),all];
 if(all.some(i=>i.floorOnly))strategies.push(all.toSorted((a,b)=>Number(!!b.floorOnly)-Number(!!a.floorOnly)||Number(!!b.stackable)-Number(!!a.stackable)||b.l*b.w-a.l*a.w));
 let best=[],bestScore=-Infinity;
 for(let i=0;i<strategies.length;i++){
  const result=greedy(plan,strategies[i],i%2);
  const score=result.length*1e12+result.reduce((a,p)=>a+p.l*p.w*p.h,0)*10-Math.max(0,...result.map(p=>p.x+p.l))*100-result.reduce((a,p)=>a+p.z,0);
  if(score>bestScore){best=result;bestScore=score;}
 }return best;
}
export function stats(plan){
 const items=new Map(plan.items.map(i=>[i.id,i]));const total=plan.items.reduce((n,i)=>n+i.qty,0),totalWeight=plan.items.reduce((n,i)=>n+i.weight*i.qty,0);
 const weight=plan.placements.reduce((n,p)=>n+(items.get(p.itemId)?.weight||0),0),volume=plan.placements.reduce((n,p)=>n+p.l*p.w*p.h/1e6,0),capacity=plan.vehicle.l*plan.vehicle.w*plan.vehicle.h/1e6;
 const length=Math.max(0,...plan.placements.map(p=>p.x+p.l));
 const floorArea=unionArea(plan.placements.map(p=>({x:p.x,y:p.y,l:p.l,w:p.w})));
 return {total,loaded:plan.placements.length,weight,totalWeight,volume,capacity,length,floorArea,freeLength:plan.vehicle.l-length};
}
export function axleLoads(plan){
 const v=plan.vehicle,keys=['frontAxleX','rearAxleX','frontAxleEmpty','rearAxleEmpty'];
 if(!keys.every(k=>Number.isFinite(v[k]))||v.rearAxleX<=v.frontAxleX)return null;
 const wheelbase=v.rearAxleX-v.frontAxleX;let front=v.frontAxleEmpty,rear=v.rearAxleEmpty;const items=new Map(plan.items.map(i=>[i.id,i]));
 for(const p of plan.placements){const mass=items.get(p.itemId)?.weight||0,cg=p.x+p.l/2;front+=mass*(v.rearAxleX-cg)/wheelbase;rear+=mass*(cg-v.frontAxleX)/wheelbase;}
 return {front,rear,frontLimit:v.frontAxleLimit,rearLimit:v.rearAxleLimit};
}
export function removeWithDependents(plan,unitId){
 let list=plan.placements.filter(p=>p.unitId!==unitId),again=true;const items=new Map(plan.items.map(i=>[i.id,i]));
 while(again){const keep=list.filter(p=>supported(p,list.filter(o=>o!==p),items));again=keep.length!==list.length;list=keep;}return list;
}
export function reconcilePlacements(plan){
 const map=new Map(plan.items.map(i=>[i.id,i]));
 let list=plan.placements.filter(p=>{const i=map.get(p.itemId);return i&&p.index<i.qty&&matchingOrientation(i,p)&&(!i.floorOnly||Math.abs(p.z)<=EPS);});
 let changed=true;while(changed){const keep=list.filter(p=>supported(p,list.filter(o=>o!==p),map));changed=keep.length!==list.length;list=keep;}return list;
}
export function parsePlan(raw){
 if(!raw||typeof raw!=='object'||![1,2].includes(raw.version)||!raw.vehicle||!Array.isArray(raw.items)||!Array.isArray(raw.placements))throw Error('Ez nem támogatott Raktér tervfájl.');
 const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Hibás méret, darabszám vagy tömeg a fájlban.');return v;};
 const str=(v,max=100)=>typeof v==='string'?v.slice(0,max):'';
 const vehicle={id:str(raw.vehicle.id),name:str(raw.vehicle.name)||'Egyedi raktér',kind:str(raw.vehicle.kind)||'Egyedi',l:number(raw.vehicle.l,1,3000),w:number(raw.vehicle.w,1,600),h:number(raw.vehicle.h,1,600),maxWeight:number(raw.vehicle.maxWeight,1,100000)};
 for(const key of ['frontAxleX','rearAxleX','frontAxleEmpty','rearAxleEmpty','frontAxleLimit','rearAxleLimit'])if(raw.vehicle[key]!==undefined&&raw.vehicle[key]!==null)vehicle[key]=number(raw.vehicle[key],0,100000);
 if((vehicle.frontAxleX!==undefined||vehicle.rearAxleX!==undefined)&&(!Number.isFinite(vehicle.frontAxleX)||!Number.isFinite(vehicle.rearAxleX)||vehicle.rearAxleX<=vehicle.frontAxleX))throw Error('A hátsó tengely helye legyen az első tengely mögött.');
 if(typeof raw.vehicle.description==='string')vehicle.description=str(raw.vehicle.description);
 const ids=new Set();const items=raw.items.map(i=>{
  if(!i||typeof i!=='object')throw Error('Hibás áru.');const id=str(i.id);if(!id||ids.has(id))throw Error('Ismétlődő vagy hiányzó áruazonosító.');ids.add(id);
  const qty=number(i.qty,1,MAX_UNITS);if(!Number.isInteger(qty))throw Error('A darabszám csak egész szám lehet.');
  for(const flag of ['stackable','rotatable','tiltable','floorOnly','pallet'])if(flag in i&&typeof i[flag]!=='boolean')throw Error('Hibás rakodási szabály: '+flag);
  return {id,name:str(i.name)||'Áru',l:number(i.l,1,3000),w:number(i.w,1,600),h:number(i.h,1,600),weight:number(i.weight,0.1,100000),qty,color:/^#[a-f0-9]{6}$/i.test(i.color)?i.color:PALETTE[0],stackable:i.stackable===true,rotatable:i.rotatable===true,tiltable:i.tiltable===true,floorOnly:i.floorOnly===true,pallet:i.pallet===true};
 });
 if(items.reduce((n,i)=>n+i.qty,0)>MAX_UNITS)throw Error('Legfeljebb '+MAX_UNITS+' egység importálható.');
 const itemMap=new Map(items.map(i=>[i.id,i]));
 const placements=raw.placements.map(p=>{
  const box={itemId:str(p.itemId),unitId:str(p.unitId,130),index:number(p.index,0,MAX_UNITS),x:number(p.x,0,3000),y:number(p.y,0,600),z:number(p.z,0,600),l:number(p.l,1,3000),w:number(p.w,1,3000),h:number(p.h,1,3000)};
  if(p.orientation!==undefined){if(typeof p.orientation!=='string'||!['lwh','wlh','hwl','whl','lhw','hlw'].includes(p.orientation))throw Error('Hibás tájolás a tervben.');box.orientation=p.orientation;}
  else{const i=itemMap.get(box.itemId);if(i)box.orientation=matchingOrientation(i,box)?.orientation;}
  return box;
 });
 const result={version:2,id:str(raw.id)||uid(),name:str(raw.name)||'Névtelen terv',vehicle,items,placements};const err=validateLayout(result);if(err)throw Error('Érvénytelen rakodási terv: '+err);return result;
}
