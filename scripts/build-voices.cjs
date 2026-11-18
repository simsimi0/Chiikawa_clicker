// Original synthetic vocal reaction effects. No actor recordings or voice cloning.
const fs=require('node:fs'),path=require('node:path');
const rate=22050,dir=path.resolve(__dirname,'../assets/sounds');fs.mkdirSync(dir,{recursive:true});
const profiles={chiikawa:525,hachiware:470,usagi:620,kurimanju:255,shisa:435,momonga:555,furuhonya:490,rakko:300};
const vowels={a:[850,1450,2850],i:[330,2200,3050],u:[400,1050,2550],e:[550,2000,2900],o:[550,900,2600]};
const patterns=[[['a',.22,1,1.22]],[['u',.12,.98,1.1],['a',.22,1.15,.9]],[['i',.13,1.18,1.36],['a',.17,1.3,1.1]],[['o',.13,.95,1.08],['a',.13,1.1,1.28],['u',.2,1.2,.85]]];
for(const [id,fundamental] of Object.entries(profiles))for(let variation=0;variation<4;variation++){
  const chunks=[];for(const [vowel,duration,from,to] of patterns[variation]){const count=Math.floor(rate*duration),forms=vowels[vowel];let phase=0;for(let n=0;n<count;n++){const t=n/count,f0=fundamental*(from+(to-from)*t)*(1+.018*Math.sin(t*35));phase+=f0/rate;const envelope=Math.sin(Math.PI*t)**.8*Math.min(1,n/(rate*.015));let sample=0;for(let h=1;h<20&&h*f0<rate/2;h++){const f=h*f0;let weight=.10/(h**1.45);for(let j=0;j<3;j++)weight+=(j===0?.72:j===1?.36:.15)*Math.exp(-.5*((f-forms[j])/(j===0?180:260))**2)/(h**.28);sample+=weight*Math.sin(phase*Math.PI*2*h);}chunks.push(sample*envelope);}for(let gap=0;gap<rate*.04;gap++)chunks.push(0);}
  const peak=Math.max(...chunks.map(Math.abs)),data=Buffer.alloc(chunks.length*2);chunks.forEach((v,n)=>data.writeInt16LE(Math.round(v/Math.max(.01,peak)*.62*32767),n*2));
  const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);fs.writeFileSync(path.join(dir,`${id}-${variation+1}.wav`),Buffer.concat([header,data]));
}
console.log('Built 32 synthetic vocal reaction WAV files (4 per character).');
