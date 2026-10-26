let cached=null, pending=null, retryAfter=0;
const TTL=6*60*60*1000;
export function windowDates(now){
  const d=new Date(now);d.setUTCHours(0,0,0,0);
  return {from:new Date(+d-86400000).toISOString().slice(0,10),to:new Date(+d+8*86400000).toISOString().slice(0,10)};
}
export function clean(data){
  if(!Array.isArray(data.matches))throw Error('Invalid calendar');
  const team=t=>({id:t?.id,name:t?.name,shortName:t?.shortName,crest:typeof t?.crest==='string'&&t.crest.startsWith('https://crests.football-data.org/')?t.crest:null});
  return {matches:data.matches.slice(0,1500).map(m=>({id:m.id,utcDate:m.utcDate,status:m.status,competition:{name:m.competition?.name},homeTeam:team(m.homeTeam),awayTeam:team(m.awayTeam)}))};
}
export function createHandler({fetcher=fetch,now=Date.now,token=()=>process.env.FOOTBALL_DATA_TOKEN}={}){
  return async function handler(req,res){
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
    if(new URL(req.url,'https://www.kingmediaglobal.com').search)return res.status(400).json({error:'No query parameters'});
    const time=now();
    try {
      if(!cached||time-cached.at>=TTL){
        if(time<retryAfter)throw Error('Backoff');
        if(!pending)pending=(async()=>{
          const key=token();if(!key)throw Error('Not configured');
          const {from,to}=windowDates(time);
          const upstream=await fetcher(`https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`,{headers:{'X-Auth-Token':key},redirect:'error',signal:AbortSignal.timeout(15000)});
          if(!upstream.ok)throw Error('Upstream unavailable');
          const body=await upstream.text();if(body.length>4*1024*1024)throw Error('Oversized');
          cached={at:time,data:{...clean(JSON.parse(body)),updatedAt:new Date(time).toISOString(),source:'football-data.org'}};
        })().finally(()=>{pending=null;});
        await pending;
      }
      res.setHeader('Cache-Control','public, max-age=300, s-maxage=21600, stale-while-revalidate=3600');
      return res.status(200).json(cached.data);
    }catch{
      retryAfter=time+5*60000;
      res.setHeader('Cache-Control','no-store');
      return res.status(503).json({error:'Agenda temporalmente no disponible'});
    }
  };
}
export default createHandler();
