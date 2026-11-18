(function(root){
  'use strict';
  let current,lastSound=0,lastMotion=-1,lastVariation=-1;
  const voiceOverrides={};
  function play(person,volume=.45,preview=false){
    const now=Date.now();if(!preview&&now-lastSound<120)return;lastSound=now;
    let n=Math.floor(Math.random()*4);if(n===lastVariation)n=(n+1)%4;lastVariation=n;
    if(current){current.pause();current.currentTime=0;}
    current=new Audio(voiceOverrides[person]?.[n]||'assets/sounds/'+person+'-'+(n+1)+'.wav');current.volume=Math.max(0,Math.min(1,volume));current.play().catch(()=>{});
  }
  function animate(target,enabled){
    if(!enabled||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let n=Math.floor(Math.random()*3);if(n===lastMotion)n=(n+1)%3;lastMotion=n;
    target.classList.remove('react-hop','react-sway','react-bounce');void target.offsetWidth;
    target.classList.add(['react-hop','react-sway','react-bounce'][n]);
  }
  function setVoices(person,urls){voiceOverrides[person]=urls;}
  root.GameEffects={play,animate,setVoices,stop:()=>{if(current)current.pause();}};
})(globalThis);
