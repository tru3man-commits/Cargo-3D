import test from 'node:test';
import assert from 'node:assert/strict';
import {pack,validateLayout,parsePlan,orientations,rotatedPlacement,reconcilePlacements} from '../dist/packing.js';

const item=(overrides={})=>({id:'a',name:'Áru',l:100,w:100,h:100,qty:1,weight:10,color:'#21a58b',stackable:true,rotatable:true,tiltable:false,floorOnly:false,pallet:false,...overrides});
const plan=(items,vehicle={})=>({version:2,id:'handling-test',name:'Szabályok',vehicle:{id:'custom',name:'Teszt',kind:'Egyedi',l:200,w:200,h:300,maxWeight:1000,...vehicle},items,placements:[]});
const at=(i,x=0,y=0,z=0,index=0)=>({itemId:i.id,unitId:i.id+':'+index,index,x,y,z,l:i.l,w:i.w,h:i.h,orientation:'lwh'});

test('floor-only units cannot stack themselves but may support other cargo',()=>{
 const base=item({qty:2,floorOnly:true}),top=item({id:'top',stackable:false});
 const s=plan([base,top],{l:100,w:100});s.placements=pack(s);
 assert.equal(s.placements.length,2);
 assert.equal(s.placements.find(p=>p.itemId===base.id).z,0);
 assert.equal(s.placements.find(p=>p.itemId===top.id).z,100);
 assert.equal(validateLayout(s),null);
});

test('floor-only rejects a fully supported elevated manual position and import',()=>{
 const base=item(),top=item({id:'top',floorOnly:true});
 const s=plan([base,top]);s.placements=[at(base),at(top,0,0,100)];
 assert.match(validateLayout(s),/csak a padlón/);
 assert.throws(()=>parsePlan(s),/csak a padlón/);
});

test('non-stackable cargo may be on top but cannot support a further layer',()=>{
 const base=item(),top=item({id:'top',stackable:false}),third=item({id:'third'});
 const s=plan([base,top,third]);s.placements=[at(base),at(top,0,0,100)];
 assert.equal(validateLayout(s),null);
 s.placements.push(at(third,0,0,200));assert.match(validateLayout(s),/nem halmozható/);
});

test('no rotation rejects yaw even when a cube has unchanged dimensions',()=>{
 for(const dims of [{l:120,w:80,h:60},{l:100,w:100,h:100}]){
  const i=item({...dims,rotatable:false}),s=plan([i]);
  s.placements=[{...at(i),l:i.w,w:i.l,orientation:'wlh'}];
  assert.match(validateLayout(s),/nem forgatható/);
  assert.equal(rotatedPlacement(i,at(i)),null);
 }
});

test('tipping is necessary to fit tall cargo and is independently switchable',()=>{
 const i=item({l:80,w:60,h:180,rotatable:false}),s=plan([i],{l:180,w:60,h:80});
 assert.equal(pack(s).length,0);
 i.tiltable=true;s.placements=pack(s);
 assert.equal(s.placements.length,1);assert.equal(s.placements[0].orientation,'hwl');
 assert.equal(validateLayout(s),null);
 i.tiltable=false;assert.match(validateLayout(s),/nem dönthető/);
 assert.throws(()=>parsePlan(s),/nem dönthető/);
});

test('rotation and tipping flags expose exactly their permitted orientations',()=>{
 const i=item({l:120,w:80,h:60,rotatable:false});
 assert.deepEqual(orientations(i).map(o=>o.orientation),['lwh']);
 i.rotatable=true;assert.deepEqual(orientations(i).map(o=>o.orientation),['lwh','wlh']);
 i.tiltable=true;assert.equal(new Set(orientations(i).map(o=>o.orientation)).size,6);
 i.rotatable=false;assert.deepEqual(orientations(i).map(o=>o.orientation),['lwh','hwl','lhw']);
 const s=plan([i]);s.placements=[{...at(i),l:80,w:60,h:120,orientation:'whl'}];
 assert.match(validateLayout(s),/nem forgatható/);
});

test('horizontal rotation of tilted cargo preserves its vertical source axis',()=>{
 const i=item({l:120,w:80,h:60,tiltable:true});
 const tilted={...at(i),l:60,w:80,h:120,orientation:'hwl'};
 const turned=rotatedPlacement(i,tilted);
 assert.equal(turned.orientation,'whl');assert.equal(turned.h,120);
 assert.deepEqual([turned.l,turned.w],[80,60]);
 assert.deepEqual(rotatedPlacement(i,turned),tilted);
});

test('version 1 migrates without tipping, floor restrictions or lost placements',()=>{
 const i=item({l:150,w:100}),s=plan([i],{l:100,w:150});
 s.placements=pack(s);s.version=1;
 delete i.tiltable;delete i.floorOnly;delete s.placements[0].orientation;
 const migrated=parsePlan(JSON.parse(JSON.stringify(s)));
 assert.equal(migrated.version,2);assert.equal(migrated.items[0].tiltable,false);
 assert.equal(migrated.items[0].floorOnly,false);assert.equal(migrated.placements.length,1);
 assert.equal(migrated.placements[0].orientation,'wlh');
 assert.deepEqual([migrated.placements[0].x,migrated.placements[0].y,migrated.placements[0].z],[0,0,0]);
});

test('all handling flags and tilted placements survive JSON round trip',()=>{
 const s=plan([item({l:80,w:60,h:180,tiltable:true,rotatable:false,floorOnly:true,stackable:false})],{l:180,w:60,h:80});
 s.placements=pack(s);assert.equal(s.placements.length,1);
 assert.deepEqual(parsePlan(JSON.parse(JSON.stringify(s))),s);
 for(const flag of ['stackable','rotatable','tiltable','floorOnly']){
  const bad=structuredClone(s);bad.items[0][flag]='false';
  assert.throws(()=>parsePlan(bad),/Hibás rakodási szabály/);
 }
});

test('a newly non-stackable base removes dependent layers while retaining floor cargo',()=>{
 const base=item(),mid=item({id:'mid'}),top=item({id:'top'}),other=item({id:'other'});
 const s=plan([base,mid,top,other]);s.placements=[at(base),at(mid,0,0,100),at(top,0,0,200),at(other,100,0)];
 base.stackable=false;s.placements=reconcilePlacements(s);
 assert.deepEqual(s.placements.map(p=>p.itemId),['a','other']);
 assert.equal(validateLayout(s),null);
});

test('floor-only and no-tilt edits requeue only incompatible cargo and dependents',()=>{
 const base=item(),mid=item({id:'mid'}),top=item({id:'top'}),other=item({id:'other'});
 const s=plan([base,mid,top,other]);s.placements=[at(base),at(mid,0,0,100),at(top,0,0,200),at(other,100,0)];
 mid.floorOnly=true;s.placements=reconcilePlacements(s);
 assert.deepEqual(s.placements.map(p=>p.itemId),['a','other']);
 const tilted=item({id:'tilted',l:60,w:80,h:120,tiltable:true});s.items.push(tilted);
 s.placements.push({...at(tilted,0,100),l:120,w:80,h:60,orientation:'hwl'});
 assert.equal(validateLayout(s),null);tilted.tiltable=false;
 s.placements=reconcilePlacements(s);
 assert.deepEqual(s.placements.map(p=>p.itemId),['a','other']);
 assert.equal(validateLayout(s),null);
});

test('mixed handling flags remain valid across deterministic packing scenarios',()=>{
 let seed=26;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let trial=0;trial<12;trial++){
  const items=Array.from({length:6},(_,j)=>item({id:'item'+j,l:30+Math.floor(random()*130),w:30+Math.floor(random()*90),h:30+Math.floor(random()*160),qty:1+Math.floor(random()*4),rotatable:random()>.5,tiltable:random()>.5,stackable:random()>.5,floorOnly:random()>.5}));
  const s=plan(items,{l:440,w:220,h:240});s.placements=pack(s);
  assert.equal(validateLayout(s),null);assert.deepEqual(parsePlan(s),s);
 }
});
