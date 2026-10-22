import {setupMy} from './my.js';
import {setupWorld,onWorldShow,onWorldHide} from './world.js';
const $=id=>document.getElementById(id);
let initialisedWorld=false;
function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.hidden=true},3600)}
async function switchTab(tab){let world=tab==='world';$('viewMy').hidden=world;$('viewWorld').hidden=!world;$('navMy').classList.toggle('is-active',!world);$('navWorld').classList.toggle('is-active',world);$('navMy').setAttribute('aria-current',world?'false':'page');$('navWorld').setAttribute('aria-current',world?'page':'false');window.history.replaceState(null,'',world?'#world':'#my');if(world){if(!initialisedWorld){initialisedWorld=true;await setupWorld({toast})}requestAnimationFrame(onWorldShow)}else{onWorldHide();}window.scrollTo({top:0,behavior:'smooth'})}
for(const btn of document.querySelectorAll('[data-view]'))btn.addEventListener('click',()=>switchTab(btn.dataset.view));
$('brandLink').addEventListener('click',e=>{e.preventDefault();switchTab('my')});
try{await setupMy({toast})}catch(e){console.error('MY EMOTION init failure',e);toast('개인 기록 화면에서 오류가 발생했어요. 새로고침해 주세요.')}if(location.hash==='#world')switchTab('world');
