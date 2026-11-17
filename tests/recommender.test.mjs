import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rank,score,contributions,validateTaste,MODES} from '../dist/recommender.mjs';
const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url)));
const [model,fixture,report]=await Promise.all([load('../dist/data/model.json'),load('../reports/parity.json'),load('../dist/data/evaluation.json')]);
test('all six rankers match Python top-ten lists for every eligible test user',()=>{
 let worst=0;
 for(const mode of MODES)fixture.cases.forEach((c,j)=>{const r=rank(model,c.seeds,c.seen,mode,{limit:10}),expected=fixture.results[mode][j];assert.deepEqual(r.indices,expected.top);r.indices.forEach((i,k)=>worst=Math.max(worst,Math.abs(r.scores[i]-expected.scores[k])));});
 assert.ok(worst<1e-10);console.log('Ranking parity:',fixture.cases.length*MODES.length,'lists; max score difference',worst);
});
test('empty taste falls back to popularity in every mode',()=>{const expected=score(model,[],'popular');for(const mode of MODES)assert.deepEqual(score(model,[],mode),expected);});
test('seed order and duplicate favorites do not affect ranking',()=>assert.deepEqual(rank(model,[1,2,3],[],'blend75'),rank(model,[3,1,2,1],[],'blend75')));
test('seen and filtered-out films never appear; sparse/empty results remain valid',()=>{const allowed=new Set([10,11,12]),r=rank(model,[1],[10],'blend75',{limit:12,allowed});assert.ok(r.indices.every(i=>allowed.has(i)&&i!==10));assert.equal(rank(model,[],model.ids.map((_,i)=>i),'popular').indices.length,0);});
test('variety keeps filtering/exclusion constraints and deterministic unique results',()=>{const allowed=new Set(Array.from({length:50},(_,i)=>i));const a=rank(model,[3,5],[3,5],'blend75',{allowed,variety:true});assert.equal(new Set(a.indices).size,a.indices.length);assert.ok(a.indices.every(i=>allowed.has(i)&&i!==3&&i!==5));assert.deepEqual(a,rank(model,[3,5],[3,5],'blend75',{allowed,variety:true}));});
test('explanations are actual positive seed-to-target model edges',()=>{const seeds=[0,1,2,3];for(const target of rank(model,seeds,seeds,'blend75').indices)for(const c of contributions(model,seeds,target)){assert.ok(seeds.includes(c.index));assert.ok(model.neighbors[c.index].some(([j,w])=>j===target&&w===c.weight&&w>0));}});
test('taste imports validate IDs, mode, limits and copy only supported fields',()=>{const input={schema:'frame-taste-v1',favorites:[model.ids[0]],saved:[],dismissed:[],mode:'blend75',claim:'ignore'};const x=validateTaste(input,model.ids);assert.notEqual(x.favorites,input.favorites);assert.equal(x.claim,undefined);for(const patch of [{mode:'__proto__'},{favorites:[-1]},{saved:[NaN]},{favorites:Array(13).fill(model.ids[0])}])assert.throws(()=>validateTaste({...input,...patch},model.ids));});
test('full reported test NDCG and recall reconcile with reference rankings',()=>{for(const mode of MODES){const rows=fixture.results[mode],mean=k=>rows.reduce((a,b)=>a+b[k],0)/rows.length;assert.ok(Math.abs(mean('ndcg')-report.models[mode].test.ndcg10)<1e-12);assert.ok(Math.abs(mean('recall')-report.models[mode].test.recall10)<1e-12);}});
