// Lossless sprite views. The embedded official PNG is never resampled or redrawn.
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../assets/characters'),png=fs.readFileSync(path.join(dir,'official-character-atlas.png'));
const width=png.readUInt32BE(16),height=png.readUInt32BE(20),data=png.toString('base64');
const boxes={chiikawa:[0,335,362],hachiware:[343,335,374],usagi:[690,335,463],momonga:[1035,419,391],kurimanju:[1457,308,365],rakko:[2289,340,362],shisa:[2636,400,355],furuhonya:[3456,310,424]};
for(const [id,[x,w,h]] of Object.entries(boxes)){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden"><title>${id} official character</title><defs><clipPath id="character-boundary" clipPathUnits="userSpaceOnUse"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#character-boundary)"><image x="-${x}" width="${width}" height="${height}" href="data:image/png;base64,${data}"/></g></svg>`;
 fs.writeFileSync(path.join(dir,id+'_0.svg'),svg);
}
console.log('Built 8 clipped standalone character views with embedded original pixels.');
