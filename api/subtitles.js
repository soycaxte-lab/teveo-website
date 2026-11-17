import { createHash } from 'node:crypto';

const API = 'https://api.opensubtitles.com/api/v1';
const USER_AGENT = 'TEVEO v0.20.13';
const PREFIX = 'teveo:admin:v1:sports:subtitles:v1:';
const hash = value => createHash('sha256').update(value).digest('hex');
class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function queryParameters(query) {
  const kind = query.get('kind');
  if (!['movie', 'episode'].includes(kind)) throw new ServiceError(400, 'Tipo de contenido inválido.');
  const title = (query.get('title') || '').trim().toLowerCase();
  if (title.length > 200) throw new ServiceError(400, 'Título inválido.');
  const number = name => {
    const value = query.get(name);
    if (!value) return 0;
    if (!/^[0-9]{1,9}$/.test(value)) throw new ServiceError(400, 'Identificador inválido.');
    return Number(value);
  };
  const id = number('tmdb');
  if (!id && !title) throw new ServiceError(400, 'Falta el título.');
  const parameters = { languages: 'ea,es', type: kind };
  if (id) parameters[kind === 'episode' ? 'parent_tmdb_id' : 'tmdb_id'] = id;
  else parameters.query = title;
  if (kind === 'episode') {
    parameters.season_number = number('season');
    parameters.episode_number = number('episode');
    if (parameters.season_number > 200 || parameters.episode_number < 1 || parameters.episode_number > 2000)
      throw new ServiceError(400, 'Episodio inválido.');
  } else {
    const year = number('year');
    if (!id && year >= 1880 && year <= 2200) parameters.year = year;
  }
  return parameters;
}
export function normalizeResults(data, parameters) {
  const results = { ea: [], es: [] };
  const seen = new Set();
  for (const row of data.data || []) {
    const attributes = row.attributes || {};
    const language = attributes.language;
    if (!results[language] || results[language].length >= 5) continue;
    const files = attributes.files || [];
    if (files.length !== 1 || !Number.isSafeInteger(files[0].file_id) || files[0].file_id < 1) continue;
    const feature = attributes.feature_details || {};
    if (parameters.type === 'episode' &&
        (Number(feature.season_number) !== parameters.season_number ||
         Number(feature.episode_number) !== parameters.episode_number)) continue;
    if (seen.has(files[0].file_id)) continue;
    seen.add(files[0].file_id);
    results[language].push({
      id: files[0].file_id, language,
      release: String(attributes.release || files[0].file_name || '').slice(0, 90)
    });
  }
  return [...results.ea, ...results.es];
}
export function allowedDownloadUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      (!parsed.port || parsed.port === '443') &&
      ['opensubtitles.com', 'opensubtitles.org'].some(domain =>
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
  } catch { return false; }
}
async function boundedBytes(response, maximum) {
  if (!response.ok) throw new ServiceError(502, 'No se pudo descargar el subtítulo.');
  if (Number(response.headers.get('content-length')) > maximum)
    throw new ServiceError(502, 'Archivo demasiado grande.');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximum) {
      await reader.cancel();
      throw new ServiceError(502, 'Archivo demasiado grande.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function createService({ env = process.env, fetcher = fetch, command, now = Date.now } = {}) {
  command ??= async (...args) => {
    if (!env.SPORTS_REDIS_URL || !env.SPORTS_REDIS_TOKEN) throw new ServiceError(503, 'Servicio temporalmente no disponible.');
    const response = await fetcher(env.SPORTS_REDIS_URL, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { Authorization: 'Bearer ' + env.SPORTS_REDIS_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const data = JSON.parse((await boundedBytes(response, 512 * 1024)).toString());
    if (data.error) throw new ServiceError(503, 'Servicio temporalmente no disponible.');
    return data.result;
  };
  const cached = async key => {
    const value = await command('GET', PREFIX + key);
    return value ? JSON.parse(value) : null;
  };
  const save = (key, value, seconds) => command('SET', PREFIX + key, JSON.stringify(value), 'EX', seconds);
  // One atomic counter per time window, shared by all function instances.
  const counter = "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n>=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],n+1,'EX',ARGV[2]); return 1";
  async function budget(key, maximum, seconds) {
    if (!await command('EVAL', counter, 1, PREFIX + key, maximum, seconds))
      throw new ServiceError(429, 'Se alcanzó el límite temporal de subtítulos. Intenta más tarde.');
  }
  async function upstream(path, body) {
    if (!env.OPENSUBTITLES_API_KEY) throw new ServiceError(503, 'Subtítulos temporalmente no disponibles.');
    await budget('upstream:' + Math.floor(now() / 1000), 4, 3);
    const response = await fetcher(API + path, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(12000),
      headers: { 'Api-Key': env.OPENSUBTITLES_API_KEY, 'User-Agent': USER_AGENT,
        Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if ([406, 429].includes(response.status))
      throw new ServiceError(429, 'Se alcanzó el límite de OpenSubtitles. Intenta más tarde.');
    if (!response.ok) throw new ServiceError(502, 'OpenSubtitles temporalmente no disponible.');
    return JSON.parse((await boundedBytes(response, 1024 * 1024)).toString());
  }
  return async function service(query, ip) {
    if (!env.OPENSUBTITLES_API_KEY) throw new ServiceError(503, 'Subtítulos temporalmente no disponibles.');
    const day = Math.floor(now() / 86400000);
    await budget('ip:' + hash(ip) + ':' + Math.floor(now() / 60000), 20, 120);
    if (query.get('action') === 'search') {
      const parameters = queryParameters(query);
      const canonical = new URLSearchParams(Object.entries(parameters).sort()).toString();
      const key = 'search:' + hash(canonical);
      const old = await cached(key);
      if (old) return { json: { results: old } };
      await budget('search:' + Math.floor(now() / 3600000), 150, 7200);
      const results = normalizeResults(await upstream('/subtitles?' + canonical), parameters);
      await save(key, results, 3600);
      for (const result of results) await save('file:' + result.id, true, 7200);
      return { json: { results } };
    }
    if (query.get('action') !== 'file' || !/^[1-9][0-9]{0,9}$/.test(query.get('id') || ''))
      throw new ServiceError(400, 'Solicitud inválida.');
    const id = Number(query.get('id'));
    if (!await cached('file:' + id)) throw new ServiceError(400, 'Vuelve a buscar este subtítulo.');
    let link = await cached('link:' + id);
    if (!link) {
      if (!await command('SET', PREFIX + 'lock:' + id, '1', 'NX', 'EX', 20))
        throw new ServiceError(429, 'Descarga en curso. Intenta en unos segundos.');
      const configuredLimit = Number(env.OPENSUBTITLES_DAILY_DOWNLOADS || 5);
      const limit = Number.isInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 1000 ? configuredLimit : 5;
      await budget('downloads:' + day, limit, 172800);
      const response = await upstream('/download', { file_id: id, sub_format: 'srt' });
      link = response.link;
      if (!allowedDownloadUrl(link)) throw new ServiceError(502, 'Descarga inválida.');
      await save('link:' + id, link, 120);
    }
    const response = await fetcher(link, {
      headers: { 'User-Agent': USER_AGENT }, redirect: 'error', signal: AbortSignal.timeout(12000)
    });
    const bytes = await boundedBytes(response, 1024 * 1024);
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { text = new TextDecoder('windows-1252').decode(bytes); }
    if (!/[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}\s+-->\s+[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}/.test(text))
      throw new ServiceError(502, 'Subtítulo inválido.');
    return { srt: text };
  };
}
export function createHandler(service = createService()) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
    try {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const data = await service(new URL(req.url, 'https://www.kingmediaglobal.com').searchParams, ip);
      if (data.json) return res.status(200).json(data.json);
      res.setHeader('Content-Type', 'application/x-subrip; charset=utf-8');
      return res.status(200).send(data.srt);
    } catch (error) {
      const status = error instanceof ServiceError ? error.status : 503;
      if (status === 429) res.setHeader('Retry-After', '30');
      return res.status(status).json({ error: error instanceof ServiceError ? error.message : 'Subtítulos temporalmente no disponibles.' });
    }
  };
}
export default createHandler();
