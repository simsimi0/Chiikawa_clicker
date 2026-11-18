(function (root) {
  'use strict';
  const CAP = 1e150;
  const PEOPLE = [
    ['chiikawa','치이카와',5,0.2,'#f6b8c9'],['hachiware','하치와레',15,1,'#a8d4ef'],
    ['usagi','우사기',100,5,'#f6df9d'],['kurimanju','쿠리만쥬',1100,25,'#d5bea9'],
    ['shisa','시사',12000,100,'#fac8a2'],['momonga','모몽가',130000,500,'#c4c1ef'],
    ['furuhonya','후루혼야',1400000,2500,'#edb2bd'],['rakko','라코',20000000,15000,'#b8dfce']
  ].map(([id,name,cost,cps,color])=>({id,name,cost,cps,color}));
  const TIERS = [
    {name:'기본',factor:1,price:0},
    {name:'후드',factor:100,price:2500},
    {name:'의상 02',factor:100000,price:25000000},
    {name:'의상 03',factor:100000000,price:250000000000}
  ];
  const ITEMS = TIERS.flatMap((tier,t)=>PEOPLE.map(p=>({id:p.id+'_'+t,person:p.id,tier:t,name:p.name+' · '+tier.name,cost:p.cost*tier.factor,cps:p.cps*tier.factor**0.88,color:p.color})));
  const MILESTONES=[10,25,50,100,150,200,300,500];
  const TREES=[
    {id:'click',name:'용기',desc:'레벨마다 클릭 수익 +25%',max:20},
    {id:'auto',name:'함께하는 힘',desc:'레벨마다 자동 생산 +25%',max:20},
    {id:'discount',name:'알뜰한 장보기',desc:'레벨마다 가격 ×0.97 (최대 약 26% 할인)',max:10},
    {id:'offline',name:'편안한 휴식',desc:'레벨마다 오프라인 효율 +5%p (최대 100%)',max:10},
    {id:'hours',name:'긴 나들이',desc:'레벨마다 오프라인 인정 시간 +2시간',max:8},
    {id:'collection',name:'소중한 옷장',desc:'레벨마다 컬렉션 보너스 효과 +20%',max:10}
  ];
  const QUESTS=[
    {id:'produce',name:'토벌 보수 모으기',metric:s=>s.total,goal:l=>1000*5**l,reward:2},
    {id:'click',name:'조금씩 용기 내기',metric:s=>s.clicks,goal:l=>50*2**l,reward:1},
    {id:'buy',name:'친구들과 함께하기',metric:s=>Object.values(s.bought).reduce((a,b)=>a+b,0),goal:l=>10*2**l,reward:2}
  ];
  const ACHIEVEMENTS=[
    ...[1,100,1000,10000].map(n=>({id:'click'+n,name:n===1?'첫 번째 용기':n.toLocaleString()+'번의 두근거림',value:s=>s.clicks,goal:n})),
    ...[1000,100000,1e6,1e9,1e12,1e15].map(n=>({id:'coin'+n,name:format(n)+' 보수의 추억',value:s=>s.total,goal:n})),
    ...[1,8,16,24,32].map(n=>({id:'collect'+n,name:'옷장의 추억 '+n+'종',value:s=>discovered(s),goal:n})),
    ...[1,5,10].map(n=>({id:'rebirth'+n,name:'다시 시작한 여행 '+n+'회',value:s=>s.rebirths,goal:n})),
    {id:'tree10',name:'깊게 내린 뿌리',value:s=>Object.values(s.tree).reduce((a,b)=>a+b,0),goal:10}
  ];
  function fresh(now=Date.now()) {return {version:1,coins:0,total:0,runTotal:0,clicks:0,playTime:0,outfits:[true,false,false,false],owned:Object.fromEntries(ITEMS.map(i=>[i.id,0])),bought:Object.fromEntries(ITEMS.map(i=>[i.id,0])),boosts:Object.fromEntries(ITEMS.map(i=>[i.id,0])),clickLevel:0,globalLevel:0,rebirths:0,earnedPoints:0,points:0,tree:Object.fromEntries(TREES.map(t=>[t.id,0])),quests:{produce:0,click:0,buy:0},stamps:0,achievements:{},settings:{motion:true,sound:false,theme:'rose',mainCharacter:'chiikawa_0',soundVolume:.45},createdAt:now,lastSeen:now};}
  const bounded=n=>Math.min(CAP,Math.max(0,n));
  function format(n) {if(!Number.isFinite(n))return '한도'; if(n<1000)return n.toLocaleString('en-US',{maximumFractionDigits:n<10?1:0});const units=['','K','M','B','T','Qa','Qi','Sx','Sp'];const t=Math.floor(Math.log10(n)/3);return t<units.length?(n/1000**t).toFixed(2).replace(/\.00$/,'')+units[t]:n.toExponential(2);}
  function discovered(s){return ITEMS.filter(i=>s.bought[i.id]>0||i.id==='chiikawa_0').length;}
  function unlocked(s,i){return s.outfits[i.tier]===true;}
  function canDisplay(s,id){const i=ITEMS.find(i=>i.id===id);return !!i&&unlocked(s,i)&&(id==='chiikawa_0'||s.bought[id]>0);}
  function selectCharacter(s,id){if(!canDisplay(s,id))return false;s.settings.mainCharacter=id;return true;}
  function buyOutfit(s,tier){const t=TIERS[tier];if(!t||tier===0||s.outfits[tier]||s.coins<t.price)return false;s.coins-=t.price;s.outfits[tier]=true;return true;}
  function milestone(n){return 2**MILESTONES.filter(m=>n>=m).length;}
  function collectionBonus(s){const varieties=ITEMS.filter(i=>s.bought[i.id]>0).length;const sets=TIERS.filter((t,n)=>PEOPLE.every(p=>s.bought[p.id+'_'+n]>0)).length;return 1+(varieties*0.01+sets*0.1)*(1+s.tree.collection*0.2);}
  function common(s){return (1+s.globalLevel*.1)*collectionBonus(s)*(1+Math.min(1,Math.sqrt(s.stamps)*.02))*(1+Object.keys(s.achievements).length*.005);}
  function itemCps(s,i){return bounded(i.cps*s.owned[i.id]*milestone(s.owned[i.id])*2**s.boosts[i.id]*(1+s.tree.auto*.25)*common(s));}
  function cps(s){return bounded(ITEMS.reduce((sum,i)=>sum+itemCps(s,i),0));}
  function clickValue(s){return bounded((1+s.clickLevel)*1.12**s.clickLevel*(1+s.tree.click*.25)*common(s)+(s.clickLevel>=5?cps(s)*Math.min(.1,s.clickLevel*.002):0));}
  function award(s,n){n=bounded(n);const actual=Math.min(n,CAP-s.total,CAP-s.runTotal,CAP-s.coins);s.coins=bounded(s.coins+actual);s.total=bounded(s.total+actual);s.runTotal=bounded(s.runTotal+actual);return actual;}
  function click(s){s.clicks=Math.min(1e12,s.clicks+1);return award(s,clickValue(s));}
  function advance(s,seconds){const t=Math.max(0,seconds);s.playTime=Math.min(1e12,s.playTime+t);return award(s,cps(s)*t);}
  function cost(s,i,n=s.owned[i.id]){return Math.min(CAP,Math.ceil(i.cost*.97**s.tree.discount*1.15**n));}
  function quote(s,i,amount){let total=0,n=0;const max=amount==='max'?5000:amount;while(n<max&&s.owned[i.id]+n<5000){const price=cost(s,i,s.owned[i.id]+n);if(price>=CAP||total+price>s.coins)break;total+=price;n++;}return {n,total};}
  function buy(s,id,amount){const i=ITEMS.find(i=>i.id===id);if(!i||!unlocked(s,i))return 0;const q=quote(s,i,amount);if(!q.n)return 0;if(amount!=='max'&&q.n!==amount)return 0;s.coins=Math.max(0,s.coins-q.total);s.owned[id]+=q.n;s.bought[id]=Math.min(1e12,s.bought[id]+q.n);return q.n;}
  function upgradeCost(s,id){if(id==='click')return Math.ceil(25*2.6**s.clickLevel);if(id==='global')return Math.ceil(500*4**s.globalLevel);const i=ITEMS.find(i=>i.id===id);return i?Math.ceil(i.cost*25*10**s.boosts[id]):CAP;}
  function upgrade(s,id){const i=ITEMS.find(i=>i.id===id);let level=id==='click'?s.clickLevel:id==='global'?s.globalLevel:s.boosts[id];if(level===undefined||level>=20||(i&&s.owned[id]<10*(level+1)))return false;const price=upgradeCost(s,id);if(s.coins<price)return false;s.coins-=price;if(id==='click')s.clickLevel++;else if(id==='global')s.globalLevel++;else s.boosts[id]++;return true;}
  function prestigeGain(s){return Math.max(0,Math.min(1e12,Math.floor(Math.sqrt(s.total/1e6)))-s.earnedPoints);}
  function prestige(s){const gain=prestigeGain(s);if(gain<1)return 0;s.points+=gain;s.earnedPoints+=gain;s.rebirths++;s.coins=0;s.runTotal=0;s.clickLevel=0;s.globalLevel=0;ITEMS.forEach(i=>{s.owned[i.id]=0;s.boosts[i.id]=0;});return gain;}
  function treeCost(s,id){return 1+Math.floor(s.tree[id]/3);}
  function buyTree(s,id){const t=TREES.find(t=>t.id===id);if(!t||s.tree[id]>=t.max||s.points<treeCost(s,id))return false;s.points-=treeCost(s,id);s.tree[id]++;return true;}
  function claim(s,id){const q=QUESTS.find(q=>q.id===id);if(!q||s.quests[id]>=100||q.metric(s)<q.goal(s.quests[id]))return false;s.quests[id]++;s.stamps+=q.reward;return true;}
  function checkAchievements(s,now=Date.now()){const added=[];ACHIEVEMENTS.forEach(a=>{if(!s.achievements[a.id]&&a.value(s)>=a.goal){s.achievements[a.id]=now;added.push(a.name);}});return added;}
  function offline(s,now=Date.now()){const elapsed=Math.min((8+s.tree.hours*2)*3600,Math.max(0,(now-s.lastSeen)/1000));const reward=award(s,cps(s)*elapsed*(.5+s.tree.offline*.05));s.lastSeen=now;return {elapsed,reward};}
  function validate(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1)throw Error('지원하지 않는 저장 형식입니다.');
    const out=fresh();
    const number=(v,max=CAP,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||(integer&&!Number.isInteger(v)))throw Error('저장 수치가 올바르지 않습니다.');return v;};
    for(const k of ['coins','total','runTotal'])out[k]=number(input[k]);
    if(!Array.isArray(input.outfits)||input.outfits.length!==TIERS.length||input.outfits.some(v=>typeof v!=='boolean')||input.outfits[0]!==true)throw Error('의상 해금 기록이 올바르지 않습니다.');
    out.outfits=[...input.outfits];
    for(const k of ['clicks','playTime'])out[k]=number(input[k],1e12);
    for(const k of ['rebirths','earnedPoints','points','stamps'])out[k]=number(input[k],1e12,true);
    for(const k of ['clickLevel','globalLevel'])out[k]=number(input[k],20,true);
    for(const field of ['owned','bought','boosts']){if(!input[field]||typeof input[field]!=='object')throw Error('구매 기록이 없습니다.');ITEMS.forEach(i=>{out[field][i.id]=number(input[field][i.id],field==='owned'?5000:field==='boosts'?20:1e12,true);});}
    TREES.forEach(t=>{out.tree[t.id]=number(input.tree?.[t.id],t.max,true);});
    QUESTS.forEach(q=>{out.quests[q.id]=number(input.quests?.[q.id],100,true);});
    for(const k of ['createdAt','lastSeen'])out[k]=number(input[k],8640000000000000,true);
    if(!input.achievements||typeof input.achievements!=='object')throw Error('업적 기록이 없습니다.');
    ACHIEVEMENTS.forEach(a=>{if(Object.hasOwn(input.achievements,a.id))out.achievements[a.id]=number(input.achievements[a.id],8640000000000000,true);});
    if(typeof input.settings?.motion!=='boolean'||typeof input.settings?.sound!=='boolean')throw Error('설정 형식이 올바르지 않습니다.');
    out.settings={motion:input.settings.motion,sound:input.settings.sound,theme:['rose','mint','night'].includes(input.settings.theme)?input.settings.theme:'rose',mainCharacter:canDisplay(out,input.settings.mainCharacter)?input.settings.mainCharacter:'chiikawa_0',soundVolume:typeof input.settings.soundVolume==='number'?number(input.settings.soundVolume,1):.45};
    if(out.coins>out.total||out.runTotal>out.total||out.points>out.earnedPoints)throw Error('누적 수치가 일치하지 않습니다.');
    let spent=0;TREES.forEach(t=>{for(let n=0;n<out.tree[t.id];n++)spent+=1+Math.floor(n/3);});
    if(out.points+spent!==out.earnedPoints)throw Error('환생 포인트 기록이 일치하지 않습니다.');
    ITEMS.forEach(i=>{if(out.owned[i.id]>out.bought[i.id]||(!out.outfits[i.tier]&&out.bought[i.id]>0))throw Error('구매 수량 또는 의상 해금 기록이 일치하지 않습니다.');});
    return out;
  }
  const api={CAP,PEOPLE,TIERS,ITEMS,MILESTONES,TREES,QUESTS,ACHIEVEMENTS,fresh,format,discovered,unlocked,canDisplay,selectCharacter,buyOutfit,milestone,collectionBonus,itemCps,cps,clickValue,award,click,advance,cost,quote,buy,upgradeCost,upgrade,prestigeGain,prestige,treeCost,buyTree,claim,checkAchievements,offline,validate};
  if(typeof module!=='undefined')module.exports=api;else root.GameCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
