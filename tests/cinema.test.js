import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized,candidates,normalizeTitle,refreshFeed,publicFeed,safeFeed} from '../lib/cinema-feed.js';
import handler from '../api/cinema-refresh.js';
test('authentication fails closed',()=>{assert.equal(authorized(undefined,undefined),false);assert.equal(authorized('Bearer bad','good'),false);assert.equal(authorized('Bearer good','good'),true);});
test('normalizes provider variants',()=>assert.equal(normalizeTitle('ES - Película [MULTI-SUB] - 2026'),'pelicula'));
test('sorts by timestamps and excludes adult categories and duplicates',()=>{
 const rows=[{name:'Old',added:1},{name:'Newest',added:5},{name:'ES - Newest',added:4},{name:'Adult',added:9,category_id:1}];
 assert.deepEqual(candidates(rows,[{category_id:1,category_name:'Adult'}],'movie').map(x=>x.name),['Newest','Old']);
});
function fixtures(){return {provider:async action=>action.endsWith('categories')?[]:Array.from({length:7},(_,i)=>({name:`Title ${i}`,added:i+1,last_modified:i+1})),tmdb:async(kind,name)=>({results:[{id:Number(name.split(' ').pop())+1,title:name,poster_path:'/valid.jpg'}]}),verifyPoster:async()=>true};}
test('creates exactly five recent titles of each type with safe fields',async()=>{const feed=await refreshFeed(fixtures());assert.equal(safeFeed(feed),true);assert.equal(feed.items[0].title,'Title 6');assert.equal(feed.items[4].title,'Title 2');assert.equal(feed.items[5].kind,'series');const copy=publicFeed({...feed,password:'secret',items:feed.items.map(x=>({...x,play_url:'secret'}))});assert.equal(JSON.stringify(copy).includes('secret'),false);});
test('rejects insufficient posters instead of publishing partial selection',async()=>{await assert.rejects(refreshFeed({...fixtures(),verifyPoster:async()=>false}),/insufficient/);});
test('ambiguous matches never select arbitrary posters',async()=>{const f=fixtures(),original=f.tmdb;f.tmdb=async(...args)=>{const r=await original(...args);return {results:[...r.results,...r.results]};};await assert.rejects(refreshFeed(f),/insufficient/);});
test('refresh endpoint rejects unauthorized request before storage or provider',async()=>{let code,data;const res={setHeader(){},status(n){code=n;return this;},json(x){data=x;return this;}};await handler({method:'GET',headers:{}},res);assert.equal(code,401);assert.equal(data.error,'unauthorized');});
