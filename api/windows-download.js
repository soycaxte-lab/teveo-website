import {readFileSync} from 'node:fs';
import {createPublicKey, verify} from 'node:crypto';

const key = createPublicKey({
  key: Buffer.from('MCowBQYDK2VwAyEA1OH14mso7Btk3UESiDuWc4SrnbGnMcrlAiBXe9LR+cg=', 'base64'),
  format: 'der', type: 'spki'
});

export function installerUrl(envelope, now = Date.now()) {
  const bytes = Buffer.from(envelope.payload, 'base64');
  if (!verify(null, bytes, key, Buffer.from(envelope.signature, 'base64'))) throw Error('Invalid signature');
  const release = JSON.parse(bytes.toString('utf8'));
  if (release.schema !== 1 || release.platform !== 'windows-x64' ||
      !/^\d+\.\d+\.\d+$/.test(release.version) ||
      !Number.isFinite(release.expiresAt) || release.expiresAt <= now) throw Error('Invalid release');
  const expected = `https://github.com/soycaxte-lab/teveo-website/releases/download/windows-v${release.version}/TEVEO-Windows-${release.version}.exe`;
  if (release.url !== expected) throw Error('Invalid installer URL');
  return expected;
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  try {
    const envelope = JSON.parse(readFileSync(new URL('../updates/windows-stable.json', import.meta.url), 'utf8'));
    res.setHeader('Location', installerUrl(envelope));
    return res.status(302).end();
  } catch {
    return res.status(503).send('La descarga de Windows no está disponible temporalmente. Vuelve a intentarlo en unos minutos.');
  }
}
