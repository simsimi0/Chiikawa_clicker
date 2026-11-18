(function(root){
  'use strict';
  const KEY='chiikawa-clicker-v1',BACKUP=KEY+'-backup',LOCK=KEY+'-lock',ASSETS=KEY+'-assets';
  const id=crypto.randomUUID?crypto.randomUUID():String(Math.random());
  let memory=false;
  const read=k=>{try{return localStorage.getItem(k);}catch{memory=true;return null;}};
  function lockInfo(){try{return JSON.parse(read(LOCK)||'null');}catch{return null;}}
  function hasLock(){const l=lockInfo();return memory||!!l&&l.id===id;}
  function acquire(){const l=lockInfo();if(l&&l.id!==id&&Date.now()-l.at<15000)return false;try{localStorage.setItem(LOCK,JSON.stringify({id,at:Date.now()}));return hasLock();}catch{memory=true;return true;}}
  function heartbeat(){if(!hasLock())return false;try{localStorage.setItem(LOCK,JSON.stringify({id,at:Date.now()}));}catch{memory=true;}return true;}
  function release(){if(hasLock())try{localStorage.removeItem(LOCK);}catch{}}
  function load(){let damaged=false;for(const key of [KEY,BACKUP]){const raw=read(key);if(!raw)continue;try{return {state:GameCore.validate(JSON.parse(raw)),recovered:key===BACKUP,damaged};}catch{damaged=true;}}return {state:GameCore.fresh(),recovered:false,damaged};}
  function save(s){if(!hasLock())return {ok:false,error:'다른 탭에서 실행 중입니다.'};try{const data=JSON.stringify(GameCore.validate(s));const old=read(KEY);if(old){try{GameCore.validate(JSON.parse(old));localStorage.setItem(BACKUP,old);}catch{}}localStorage.setItem(KEY,data);return {ok:true};}catch(e){return {ok:false,error:'브라우저 저장 실패: JSON 백업을 내려받아 주세요.'};}}
  function assets(){try{const a=JSON.parse(read(ASSETS)||'{}');return a&&typeof a==='object'&&!Array.isArray(a)?a:{};}catch{return {};}}
  function saveAssets(a){try{localStorage.setItem(ASSETS,JSON.stringify(a));return true;}catch{return false;}}
  root.GameSave={KEY,LOCK,ASSETS,acquire,hasLock,heartbeat,release,load,save,assets,saveAssets,isMemory:()=>memory};
})(globalThis);
