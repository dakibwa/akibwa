// Run after static export. The restricted browser identifier belongs in the
// deployment artifact, never the repository or command output.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function configureGoogle(html,key){
  const marker='<meta name="trek-google-maps-key" content="">';
  if(!html.includes(marker))throw Error('The Trek Google configuration marker is missing');
  if(!key)return html;
  if(!/^[A-Za-z0-9_-]{20,200}$/.test(key))throw Error('The restricted Google browser key has an invalid format');
  return html.replace(marker,`<meta name="trek-google-maps-key" content="${key}">`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const target=new URL('../out/trek/index.html',import.meta.url);
  const key=process.env.TREK_GOOGLE_MAPS_BROWSER_KEY||'';
  const html=readFileSync(target,'utf8');
  writeFileSync(target,configureGoogle(html,key));
  console.log(key?'Trek Google imagery configured for deployment.':'Trek uses the terrain renderer; Google imagery is not configured.');
}
