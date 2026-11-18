(function(root){
  'use strict';
  let lastSound=0,lastMotion=-1;
  const playing=new Set(),lastVariations={};
  const interjectionNames=['ah','oh','ah-long','oh-question'];
  const originalVoices={usagi:[1,2,3].map(n=>'assets/sounds/original/usagi-'+n+'.wav'),chiikawa:interjectionNames.map(n=>'assets/sounds/interjections/chiikawa-'+n+'.wav?v=4'),hachiware:interjectionNames.map(n=>'assets/sounds/interjections/hachiware-'+n+'.wav?v=4')};
  const voiceOverrides={};
  function play(person,volume=.45,preview=false){
    const now=Date.now();if(!preview&&(now-lastSound<120||playing.size>0))return;if(playing.size>=2)return;lastSound=now;
    const bank=voiceOverrides[person]||originalVoices[person]||[1,2,3,4].map(n=>'assets/sounds/'+person+'-'+n+'.wav');
    let n=Math.floor(Math.random()*bank.length);if(bank.length>1&&n===lastVariations[person])n=(n+1)%bank.length;lastVariations[person]=n;
    const voice=new Audio(bank[n]);voice.volume=Math.max(0,Math.min(1,volume));playing.add(voice);
    voice.onended=voice.onerror=()=>playing.delete(voice);voice.play().catch(()=>playing.delete(voice));
  }
  function animate(target,enabled){
    if(!enabled||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let n=Math.floor(Math.random()*3);if(n===lastMotion)n=(n+1)%3;lastMotion=n;
    target.classList.remove('react-hop','react-sway','react-bounce');void target.offsetWidth;
    target.classList.add(['react-hop','react-sway','react-bounce'][n]);
  }
  function setVoices(person,urls){if(urls?.length)voiceOverrides[person]=urls.slice(0,4);else delete voiceOverrides[person];}
  function voiceInfo(person){return {kind:voiceOverrides[person]?'직접 선택한 음성':['chiikawa','hachiware'].includes(person)?'원본 목소리 의성어 편집':originalVoices[person]?'원본 발성 편집':'임시 합성음',count:(voiceOverrides[person]||originalVoices[person]||[1,2,3,4]).length};}
  root.GameEffects={play,animate,setVoices,voiceInfo,stop:()=>{for(const voice of playing){voice.pause();voice.currentTime=0;}playing.clear();}};
})(globalThis);
