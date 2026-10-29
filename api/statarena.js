import {randomUUID} from 'node:crypto';

// This namespace is separate from device, profile and playlist records.
const ROOT='teveo:admin:v1:sports:statarena:v1:';
const HOST='https://live.statarena-api.com';
const UA='TEVEO-StatArena/1.0';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function normalize(m,leagues={}) {
  const home=m.teams?.find(t=>t.location==='home'),away=m.teams?.find(t=>t.location==='away');
  if(!home?.name||!away?.name)return null;
  const stamp=m.starting_at_timestamp_utc;
  const raw=m.starting_at;
  const time=stamp!=null?Number(stamp)*1000:(typeof raw==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(raw)?Date.parse(raw):NaN);
  if(!Number.isFinite(time)||!Number.isSafeInteger(Number(m.id)))return null;
  const team=t=>({id:0,name:t.name,shortName:t.short_code||t.name,crest:typeof t.image_url==='string'&&t.image_url.startsWith('https://cdn.statarena-api.com/')?t.image_url:''});
  const state=m.state?.name||m.state_name||'Programado';
  const labels={'Not Started':'Programado','1st Half':'En vivo · 1.ª parte','2nd Half':'En vivo · 2.ª parte','Half Time':'Descanso',Finished:'Finalizado',Cancelled:'Cancelado',Postponed:'Aplazado'};
  const score=m.scores?.find(s=>s.description==='CURRENT')?.score;
  return {id:Number(m.id),homeTeam:team(home),awayTeam:team(away),competition:{name:m.league?.name||leagues[m.league_id]||'Fútbol'},utcDate:new Date(time).toISOString().replace('.000Z','Z'),status:labels[state]||state,score:score?.home!=null&&score?.away!=null?`${score.home} – ${score.away}`:''};
}
export function redisCommand(env=process.env,fetcher=fetch) {
  return async (...args)=>{
    if(!env.SPORTS_REDIS_URL||!env.SPORTS_REDIS_TOKEN)throw Error('Cache unavailable');
    const r=await fetcher(env.SPORTS_REDIS_URL,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.SPORTS_REDIS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
    if(!r.ok)throw Error('Cache unavailable');
    const data=await r.json();if(data.error)throw Error('Cache unavailable');return data.result;
  };
}
export function createService({command=redisCommand(),fetcher=fetch,token=()=>process.env.STATARENA_TOKEN,now=Date.now,wait=sleep}={}) {
  const read=async key=>{const raw=await command('GET',ROOT+key);return raw?JSON.parse(raw):null;};
  const write=(key,value,seconds)=>command('SET',ROOT+key,JSON.stringify(value),'EX',seconds);
  // Sliding-hour budget shared by all instances; fail closed if cache fails.
  const budget="local a=cjson.decode(redis.call('GET',KEYS[1]) or '[]'); local b={}; for _,v in ipairs(a) do if v>tonumber(ARGV[1])-3600000 then table.insert(b,v) end end; if #b>=80 then return 0 end; table.insert(b,tonumber(ARGV[1])); redis.call('SET',KEYS[1],cjson.encode(b),'EX',3600); return 1";
  async function upstream(path,ttl,deadline) {
    const old=await read('path:'+path);
    if(old&&now()-old.at<ttl)return {data:old.data,stale:false};
    try {
      if(now()>deadline-12000||await command('GET',ROOT+'cooldown'))throw Error('Retry later');
      const last=Number(await command('GET',ROOT+'last-call')||0);
      await wait(Math.max(0,2000-(now()-last)));
      if(!await command('EVAL',budget,1,ROOT+'budget',now()))throw Error('Budget exhausted');
      await command('SET',ROOT+'last-call',String(now()),'EX',3600);
      const key=token();if(!key)throw Error('Not configured');
      const r=await fetcher(HOST+path,{headers:{'X-API-Key':key,Accept:'application/json','User-Agent':UA},redirect:'error',signal:AbortSignal.timeout(10000)});
      if(r.status===429){const seconds=Math.min(3600,Math.max(60,Number(r.headers.get('Retry-After'))||60));await command('SET',ROOT+'cooldown','1','EX',seconds);}
      if(!r.ok)throw Error('Provider unavailable');
      if(Number(r.headers.get('content-length'))>4*1024*1024)throw Error('Oversized');
      const reader=r.body.getReader();let length=0;const chunks=[];
      for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4*1024*1024){await reader.cancel();throw Error('Oversized');}chunks.push(value);}
      const data=JSON.parse(Buffer.concat(chunks).toString()).data;
      if(!Array.isArray(data))throw Error('Invalid data');
      await write('path:'+path,{at:now(),data},86400);
      return {data,stale:false};
    }catch{
      // A provider outage must not trigger a retry from every television.
      await command('SET',ROOT+'cooldown','1','EX',60,'NX');
      if(old&&now()-old.at<86400000)return {data:old.data,stale:true};
      throw Error('Provider unavailable');
    }
  }
  return async function agenda(){
    const cached=await read('agenda');
    if(cached&&now()-cached.at<60000)return cached.data;
    const owner=randomUUID();
    if(!await command('SET',ROOT+'lock',owner,'NX','EX',65)) {
      if(cached)return {...cached.data,notice:'Actualizando agenda. Los datos pueden estar retrasados.'};
      // Cold concurrent requests wait briefly; no duplicate provider requests.
      for(let i=0;i<12;i++){await wait(2000);const ready=await read('agenda');if(ready)return ready.data;}
      throw Error('Updating agenda');
    }
    try {
      const deadline=now()+48000;
      const leaguesResult=await upstream('/v1/leagues',86400000,deadline);
      const leagues=Object.fromEntries(leaguesResult.data.slice(0,16).filter(l=>/^\d+$/.test(String(l.id))).map(l=>[l.id,l.name]));
      const rows=new Map();let partial=leaguesResult.stale;
      for(const id of Object.keys(leagues)) {
        try{const r=await upstream(`/v1/matches/upcoming/leagues/${id}?addons=teams`,3600000,deadline);partial ||= r.stale;for(const m of r.data)rows.set(m.id,m);}catch{partial=true;}
      }
      try{const r=await upstream('/v1/matches/live?addons=teams,league,state,scores',120000,deadline);partial ||= r.stale;for(const m of r.data)rows.set(m.id,m);}catch{partial=true;}
      const matches=[...rows.values()].map(m=>normalize(m,leagues)).filter(Boolean).sort((a,b)=>a.utcDate.localeCompare(b.utcDate));
      if(!matches.length)throw Error('No agenda');
      const data={matches,provider:'StatArena',updatedAt:new Date(now()).toISOString(),notice:partial?'Cobertura parcial: algunos datos pueden estar retrasados.':''};
      await write('agenda',{at:now(),data},86400);return data;
    }catch{
      if(cached&&now()-cached.at<86400000)return {...cached.data,notice:'Agenda guardada. No se pudo actualizar; los datos pueden estar retrasados.'};
      throw Error('Agenda unavailable');
    }finally{
      await command('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],'','EX',1); return 1 end return 0",1,ROOT+'lock',owner);
    }
  };
}
export function createHandler(service=createService()) {
  return async(req,res)=>{
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    if(new URL(req.url,'https://www.kingmediaglobal.com').search)return res.status(400).json({error:'No query parameters'});
    try{const data=await service();res.setHeader('Cache-Control','public, max-age=30, s-maxage=60');return res.status(200).json(data);}
    catch{res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After','60');return res.status(503).json({error:'Agenda temporalmente no disponible'});}
  };
}
export default createHandler();
