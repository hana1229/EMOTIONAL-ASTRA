import { records as DB, representatives as REP } from './storage.js';
import { BeadJar } from './jar.js';
export const EMOTIONS=['기쁨','평온','설렘','그리움','슬픔','불안','분노','무기력','기대','외로움'];
export const COLORS={'기쁨':'#f4c580','평온':'#9ccbbd','설렘':'#f0a9c1','그리움':'#a6b5dc','슬픔':'#879cce','불안':'#c3b0d9','분노':'#e69391','무기력':'#abaeb8','기대':'#c2a5f3','외로움':'#8aa7c7'};
const $=id=>document.getElementById(id), htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const today=()=>localDay(new Date());
const safeId=()=>globalThis.crypto?.randomUUID?.() || `ea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function setRangeFill(el){if(!el)return;const min=Number(el.min||0),max=Number(el.max||100),val=Number(el.value||0);const pct=((val-min)/(max-min))*100;el.style.setProperty('--fill',pct+'%')}
export function defaultStyle(key='composite') {
  const base = COLORS[key] || '#b7a4e9';
  const presets = {
    '기쁨': { material: 'jelly', size: 108, opacity: 90, density: 42, softness: 82 },
    '평온': { material: 'glass', size: 96, opacity: 74, density: 28, softness: 78 },
    '설렘': { material: 'jelly', size: 102, opacity: 88, density: 58, softness: 86 },
    '그리움': { material: 'glass', size: 100, opacity: 68, density: 36, softness: 63 },
    '슬픔': { material: 'glass', size: 94, opacity: 70, density: 62, softness: 38 },
    '불안': { material: 'glass', size: 90, opacity: 76, density: 68, softness: 24 },
    '분노': { material: 'matte', size: 110, opacity: 96, density: 82, softness: 12 },
    '무기력': { material: 'matte', size: 104, opacity: 18, density: 76, softness: 56 },
    '기대': { material: 'glass', size: 98, opacity: 78, density: 34, softness: 46 },
    '외로움': { material: 'messy', size: 96, opacity: 64, density: 57, softness: 38 },
    'composite': { material: 'jelly', size: 100, opacity: 72, density: 50, softness: 70 }
  };
  return { color: base, ...(presets[key] || presets.composite) };
}
// Explicit rule-based emotion suggestions. Unrecognized text must NEVER be labeled '평온'.
// This lightweight local heuristic is a suggestion, not an AI diagnosis or sentiment model.
const WORDS={
'기쁨':['기쁘','행복','웃었','웃음','웃다','웃겨','즐거','좋았','좋아','신나','성공','기분 좋','감사','고마','뿌듯','축하','재밌','재미있','뿌듯','행운','감동','기분 최고','최고였'],
'평온':['평화','차분','조용','편안','여유','안정','고요','휴식','쉬었','안심','따뜻','평온','편해','느긋','여유로','쉬면서','조용히'],
'설렘':['설레','두근','떨리지만 좋','신기','흥분','새로운 시작','두근거리','두근대','설렜','첫 데이트'],
'그리움':['보고싶','보고 싶','그립','추억','옛날','기억나','생각나','다시 만나','그리워','보고파','그때가'],
'슬픔':['슬프','눈물','울었','울었어','울었다','속상','이별','서운','상처','우울','마음 아파','허전','눈물이','울고 싶','슬퍼','울컥','기분 나빴','힘들었','별로였','상실','떠나'],
'불안':['불안','걱정','긴장','두렵','무서','초조','불면','막막','불확실','두려','떨렸','겁나','불편한 마음','마음이 불편','조마조마','심란','불안했'],
'분노':['화가','화났','짜증','열받','분노','억울','스트레스','화나','다투','답답','화났어','짜증나','분했','열받았','화내','참을 수 없','불공평'],
'무기력':['무기력','지쳤','피곤','번아웃','힘이 없','의욕 없','하기 싫','기운 없','침대만','지겨','지쳐','피곤해','힘들다','힘들어','무력','귀찮','축 처져','방전'],
'기대':['기대','기다려','곧','예정','준비','희망','바라','설레는 계획','기대돼','기대했','고대하'],
'외로움':['외롭','혼자','쓸쓸','고독','적막','외톨이','공허','소외','아무도 없','고립']
};
const EMOTION_VALUE={'기쁨':80,'평온':55,'설렘':67,'그리움':-22,'슬픔':-72,'불안':-51,'분노':-86,'무기력':-65,'기대':32,'외로움':-58};
const EMOTION_ENERGY={'기쁨':72,'평온':24,'설렘':88,'그리움':32,'슬픔':27,'불안':85,'분노':92,'무기력':13,'기대':64,'외로움':26};
// Basic negation guard for positive expressions, such as '행복하지 않았어'.
function negatedPositive(text,term,index){
  const positive= ['기쁨','평온','설렘','기대'];
  const following=text.slice(index+term.length,index+term.length+13);
  const preceding=text.slice(Math.max(0,index-6),index);
  return /^(?:하진?\s*않|하진?\s*못|하지\s*못|하지\s*않|지\s*않|지\s*못|이?\s*아니|없었|없어)/.test(following) || /(?:안|못|별로)\s*$/.test(preceding);
}
export function suggestEmotions(text){
  const input=String(text||'').normalize('NFC').toLowerCase().replace(/\s+/g,' ');
  if(!input.trim())return [];
  const scored=EMOTIONS.map(key=>{
    let score=0;
    for(const term of new Set(WORDS[key])){
      let pos=0;
      while((pos=input.indexOf(term,pos))!==-1){
        if(!(['기쁨','평온','설렘','기대'].includes(key)&&negatedPositive(input,term,pos))){
          score+=term.length>=4?1.25:1;
        }
        pos+=term.length;
      }
    }
    return {key,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||EMOTIONS.indexOf(a.key)-EMOTIONS.indexOf(b.key)).slice(0,3);
  // No matched phrase means 'unclassified', never automatically 'calm'.
  return scored.map(({key,score},i)=>({key,intensity:clamp(Math.round(48+Math.min(score,3)*13-i*2),20,95)}));
}
const SAMPLE_SENTENCES=[['기쁨','오늘은 평소보다 일이 잘 풀려서 뿌듯했다.'],['평온','따뜻한 차를 마시며 조용히 쉬었던 저녁.'],['설렘','오랜만에 새로운 일을 시작해서 설렜다.'],['그리움','오래된 사진을 보니 그때가 그리웠다.'],['슬픔','소중했던 시간이 지나가서 조금 서운했다.'],['불안','중요한 발표를 앞두고 긴장과 걱정이 많았다.'],['분노','계획이 어긋나서 순간적으로 짜증이 났다.'],['무기력','하루 종일 지쳤고 기운이 없었다.'],['기대','곧 다가올 일정이 은근히 기대됐다.'],['외로움','사람들 사이에 있었지만 문득 외로웠다.']];
function makeSamples(){const now=new Date();return Array.from({length:17},(_,i)=>{const d=new Date(now);d.setDate(now.getDate()-i*2);const [key,text]=SAMPLE_SENTENCES[(i*5)%SAMPLE_SENTENCES.length];return {id:`demo-${i}`,date:localDay(d),text,emotions:[{key,intensity:70-i%5*7},...(i%3===0?[{key:EMOTIONS[(i+4)%8],intensity:31}]:[])],valence:EMOTION_VALUE[key],energy:EMOTION_ENERGY[key],visuals:{composite:defaultStyle('composite'),[key]:defaultStyle(key)},createdAt:new Date(d).toISOString(),updatedAt:new Date(d).toISOString()}})}
function activate2D(){const canvas=$('organismCanvas'),box=$('organismFallback');canvas.style.display='none';box.hidden=false;box.innerHTML='<span class="fallback-orb" id="fallbackOrb" title="클릭하여 감정 표현 반응"></span><span>2D QUALI · 클릭해 보세요</span>';box.addEventListener('click',()=>{const orb=$('fallbackOrb');if(orb){orb.classList.remove('pop');void orb.offsetWidth;orb.classList.add('pop')}});render2D()}
function withAlpha(hex,a=.14){const c=(hex||'#b7a4e9').replace('#','');const full=c.length===3?c.split('').map(x=>x+x).join(''):c;const n=parseInt(full,16)||0;const r=(n>>16)&255,g=(n>>8)&255,b=n&255;return `rgba(${r},${g},${b},${a})`}
function mixHex(a,b,t=.5){const pa=(a||'#b7a4e9').replace('#','');const pb=(b||'#ffffff').replace('#','');const fa=pa.length===3?pa.split('').map(x=>x+x).join(''):pa;const fb=pb.length===3?pb.split('').map(x=>x+x).join(''):pb;const na=parseInt(fa,16)||0, nb=parseInt(fb,16)||0;const ar=(na>>16)&255,ag=(na>>8)&255,ab=na&255, br=(nb>>16)&255,bg=(nb>>8)&255,bb=nb&255;const rr=Math.round(ar+(br-ar)*t), rg=Math.round(ag+(bg-ag)*t), rb=Math.round(ab+(bb-ab)*t);return `#${[rr,rg,rb].map(v=>v.toString(16).padStart(2,'0')).join('')}`}
function render2D(){const el=$('fallbackOrb');if(!el)return;const s=getStyle();s.material=normalizeMaterial(s.material);const neg=Math.max(0,-state.valence/100);const clarity=(s.opacity??72)/100;const glassHigh=mixHex(s.color,'#ffffff',.64);const glassLow=mixHex(s.color,'#d9e4ff',.28);const bgByMaterial={jelly:`radial-gradient(circle at 30% 23%,#ffffffd8,transparent 34%), linear-gradient(145deg, ${mixHex(s.color,'#ffffff',.45)}, ${s.color})`,glass:`radial-gradient(circle at 30% 22%,#ffffffeb,transparent 28%), linear-gradient(160deg, ${glassHigh}, ${glassLow})`,matte:`linear-gradient(150deg, ${mixHex(s.color,'#ffffff',.12)}, ${mixHex(s.color,'#000000',.12)})`,messy:`radial-gradient(circle at 48% 45%, ${withAlpha('#ffffff',.72)}, transparent 38%), radial-gradient(circle at 35% 35%, ${withAlpha(mixHex(s.color,'#ffffff',.4),.85)}, transparent 30%), conic-gradient(from 120deg, ${withAlpha(s.color,.18)}, ${withAlpha(mixHex(s.color,'#ffffff',.58),.42)}, ${withAlpha(mixHex(s.color,'#000000',.12),.22)}, ${withAlpha(s.color,.18)})`};el.style.background=bgByMaterial[s.material]||bgByMaterial.jelly;el.innerHTML=materialIcon(s.material,s.color,'hero');el.style.opacity=s.material==='glass'?Math.min(.98,.78+clarity*.18):1;el.style.filter=s.material==='messy'?'blur(.25px) saturate(1.06)':'none';el.style.transform=`scale(${s.size/100})`;el.style.boxShadow=s.material==='matte'?'inset -8px -10px 14px rgba(0,0,0,.08), 0 16px 28px rgba(106,86,140,.18)':s.material==='messy'?'0 12px 30px rgba(93,74,135,.14), inset 0 0 34px rgba(255,255,255,.42)':'inset -14px -16px 22px rgba(54,42,90,.18), inset 10px 11px 18px rgba(255,255,255,.7), 0 18px 35px rgba(117,93,165,.18)';el.style.border= s.material==='glass' ? `1px solid ${withAlpha('#ffffff',.75)}` : '0';el.style.backdropFilter=(s.material==='glass')?`blur(${Math.round(clarity*9)}px)`:'';if(s.material==='messy'){el.style.borderRadius='50%';}else if(neg>.12){el.style.borderRadius=`22% 12% 28% 16% / 26% 14% 29% 16%`;}else{el.style.borderRadius=`${38+state.energy/10}% ${58-state.energy/10}% 51% 49% / 43% 52% 48% 57%`;}el.classList.toggle('is-angular',neg>.12&&s.material!=='messy')}
const state={saved:[],demo:false,demoRows:makeSamples(),reps:[],editing:null,emotions:[],valence:0,energy:50,visuals:{composite:defaultStyle()},object:'composite',calendar:new Date(),selectedDate:today(),organism:null,jar:null,booted:false};
const MATERIAL_TYPES=['jelly','glass','matte','messy'];
const EMOTION_ASSETS={'기쁨':'joy','평온':'calm','설렘':'excitement','그리움':'nostalgia','슬픔':'sadness','불안':'anxiety','분노':'anger','무기력':'lethargy','기대':'anticipation','외로움':'loneliness'};
const emotionIcon=(emotion,extra='')=>`<img src="./icons/${EMOTION_ASSETS[emotion]||'calm'}.png" class="emotion-icon ${extra}" loading="lazy" decoding="async" alt="" draggable="false">`;
const safeColor=(value,fallback)=>/^#[0-9a-fA-F]{6}$/.test(value||'')?value:fallback;
function savedStyle(record,key){
  const comp=record?.visuals?.composite||null;
  const specific=record?.visuals?.[key]||null;
  const base=defaultStyle(key),compBase=defaultStyle();
  // Unless manually recolored, the recorded day's representative emotion keeps its emotion color.
  const compColorChanged=comp?.color&&comp.color.toLowerCase()!==compBase.color.toLowerCase();
  const specificColorChanged=specific?.color&&specific.color.toLowerCase()!==base.color.toLowerCase();
  const color=specificColorChanged?specific.color:compColorChanged?comp.color:specific?.color||base.color;
  const compMaterialChanged=comp?.material&&comp.material!==compBase.material;
  const specificMaterialChanged=specific?.material&&specific.material!==base.material;
  const material=specificMaterialChanged?specific.material:compMaterialChanged?comp.material:specific?.material||base.material;
  return {...base,...(comp||{}),color,material};
}
function themeForRecord(record,key){const style=savedStyle(record,key);return {color:safeColor(style?.color,COLORS[key]||'#b7a4e9'),material:normalizeMaterial(style?.material)}}

const normalizeMaterial=m=>m==='crystal'?'glass':(MATERIAL_TYPES.includes(m)?m:'jelly');
const actualRows=()=>state.demo?state.demoRows:state.saved;
function notify(message='',isError=false){
  const el=$('journalMessage');
  if(!el)return;
  el.textContent=message;
  el.classList.toggle('is-error',Boolean(isError));
  el.style.color=isError?'#a54c77':'#7c6ab1';
}

function objectLabel(key){return key==='composite'?'QUALI 합성체':key}
function materialLabel(m){const type=normalizeMaterial(m);return ({jelly:'JELLY',glass:'GLASS',matte:'MATTE',messy:'SMOKE'})[type]||String(type).toUpperCase()}
function materialIcon(m,color='#aa9bd3',size='sm'){const type=normalizeMaterial(m);return `<span class="material-badge ${type} ${size}" style="--material:${color}" aria-hidden="true"><span class="material-core"></span></span>`}
function renderObjectSelector(){
  const selector=$('organismSelector');
  state.object='composite';
  if(selector){selector.innerHTML='';selector.hidden=true;}
}
function setChipUI(){document.querySelectorAll('.emotion-chip').forEach(b=>{b.classList.toggle('active',state.emotions.some(x=>x.key===b.dataset.key));b.setAttribute('aria-pressed',state.emotions.some(x=>x.key===b.dataset.key)?'true':'false')});$('intensityControls').innerHTML=state.emotions.map(e=>`<label class="intensity-row"><span>${e.key}</span><input type="range" min="0" max="100" value="${e.intensity}" data-intensity="${e.key}" aria-label="${e.key} 강도"><b>${e.intensity}</b></label>`).join('');$('intensityControls').querySelectorAll('[data-intensity]').forEach(b=>{setRangeFill(b);b.addEventListener('input',()=>{let item=state.emotions.find(x=>x.key===b.dataset.intensity);if(item)item.intensity=+b.value;b.nextElementSibling.textContent=b.value;setRangeFill(b);renderObjectSelector();renderOrganism()})});refreshObjects()}
function addEmotion(key){const index=state.emotions.findIndex(x=>x.key===key);if(index>=0){state.emotions.splice(index,1);if(state.object===key)state.object='composite';}
 else{if(state.emotions.length>=3){notify('한 기록에는 최대 3개의 감정을 선택할 수 있어요.',true);return;}state.emotions.push({key,intensity:65});if(!state.visuals[key])state.visuals[key]=defaultStyle(key)}setChipUI()}
function refreshObjects(){const opts=['composite',...state.emotions.map(x=>x.key)];if(!opts.includes(state.object))state.object='composite';renderObjectSelector();fillStyleControls();renderOrganism()}
function getStyle(){const k=state.object;return state.visuals[k]||(state.visuals[k]=defaultStyle(k))}
function updateStageTheme(){const s=getStyle(),stage=$('organismStage');if(!stage)return;stage.style.setProperty('--quali-color',s.color||'#b7a4e9');stage.style.setProperty('--quali-fog',withAlpha(s.color||'#b7a4e9',.4));stage.style.setProperty('--quali-soft',withAlpha(mixHex(s.color||'#b7a4e9','#ffffff',.5),.78));stage.dataset.material=s.material||'jelly'}
function fillStyleControls(){const v=getStyle();if(v.material==='crystal')v.material='glass';$('objectColor').value=v.color||'#b7a4e9';$('objectMaterial').value=v.material||'jelly';$('objectSize').value=v.size;$('objectOpacity').value=v.opacity;$('objectDensity').value=v.density;$('objectSoftness').value=v.softness;$('sizeVal').textContent=(v.size/100).toFixed(2);$('opacityVal').textContent=`${v.opacity}%`;$('densityVal').textContent=v.density;$('softnessVal').textContent=v.softness;['objectSize','objectOpacity','objectDensity','objectSoftness'].forEach(id=>setRangeFill($(id)))}
function renderOrganism(){let intensity=state.emotions.length?state.emotions.reduce((a,b)=>a+b.intensity,0)/state.emotions.length:50;if(state.object!=='composite')intensity=state.emotions.find(x=>x.key===state.object)?.intensity||50;updateStageTheme();try{state.organism?.setEmotion({intensity,valence:state.valence,energy:state.energy},getStyle())}catch(e){console.warn(e)}render2D()}
function fillForm(r){state.editing=r.id;state.emotions=structuredClone(r.emotions);state.valence=r.valence;state.energy=r.energy;state.visuals=structuredClone(r.visuals||{composite:defaultStyle()});state.object='composite';$('journalDate').value=r.date;$('journalText').value=r.text;$('valenceRange').value=r.valence;$('energyRange').value=r.energy;$('valenceVal').textContent=r.valence;$('energyVal').textContent=r.energy;setRangeFill($('valenceRange'));setRangeFill($('energyRange'));setChipUI();$('saveRecordBtn').innerHTML='수정 내용 저장 <span>↗</span>';notify('기존 기록을 수정하고 있어요.');document.getElementById('viewMy').scrollIntoView({behavior:'smooth',block:'start'})}
function resetForm(){state.editing=null;state.emotions=[];state.valence=0;state.energy=50;state.visuals={composite:defaultStyle()};state.object='composite';$('journalDate').value=today();$('journalText').value='';$('valenceRange').value=0;$('energyRange').value=50;$('valenceVal').textContent=0;$('energyVal').textContent=50;setRangeFill($('valenceRange'));setRangeFill($('energyRange'));$('saveRecordBtn').innerHTML='감정 기록 저장 <span>↗</span>';setChipUI();notify('')}
function getDateFilteredRows(){const rows=actualRows();const p=$('periodFilter').value;const now=new Date();const beginning=new Date(now);if(p==='30')beginning.setDate(now.getDate()-29);return rows.filter(r=>p==='all'||(p==='month'?r.date.startsWith(localDay(now).slice(0,7)):r.date>=localDay(beginning)))}
function representative(group,date){const rep=(state.demo?[]:state.reps).find(x=>x.date===date);const validKeys=new Set(group.flatMap(r=>r.emotions.map(e=>e.key)));if(rep&&validKeys.has(rep.key))return rep.key;const totals=new Map();const recents=new Map();group.forEach(r=>r.emotions.forEach(e=>{totals.set(e.key,(totals.get(e.key)||0)+e.intensity);recents.set(e.key,Math.max(recents.get(e.key)||0,new Date(r.updatedAt||r.createdAt||0).getTime()))}));return [...totals.keys()].sort((a,b)=>totals.get(b)-totals.get(a)||recents.get(b)-recents.get(a))[0]||null}
function renderCalendar(){
  const date=state.calendar,year=date.getFullYear(),month=date.getMonth();
  $('calendarMonth').textContent=`${year}.${String(month+1).padStart(2,'0')}`;
  const data=actualRows(),byDay=new Map();
  data.forEach(r=>{const list=byDay.get(r.date)||[];list.push(r);byDay.set(r.date,list)});
  const starts=new Date(year,month,1).getDay(),total=new Date(year,month+1,0).getDate();
  const items=Array.from({length:starts},()=>'<span class="calendar-spacer" aria-hidden="true"></span>');
  for(let day=1;day<=total;day++){
    const key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const rows=byDay.get(key)||[],rep=rows.length?representative(rows,key):null;
    // The background uses the actual selected QUALI color, not a hardcoded emotion color.
    const matching=rows.filter(r=>r.emotions.some(e=>e.key===rep));
    const ref=matching.at(-1)||rows.at(-1),visual=themeForRecord(ref,rep);
    const recorded=Boolean(rep);
    items.push(`<button type="button" class="${state.selectedDate===key?'active':''} ${recorded?'recorded':'unrecorded'}" data-calendar="${key}" style="${recorded?`--day-color:${visual.color};`:''}" aria-label="${key} ${recorded?`대표 감정 ${rep}, 기록 ${rows.length}개`:'기록 없음'}"><span class="day-number">${day}</span>${recorded?`<span class="calendar-emotion-art">${emotionIcon(rep)}</span><span class="calendar-material" title="${materialLabel(visual.material)}">${materialIcon(visual.material,visual.color,'sm')}</span>`:''}</button>`);
  }
  $('calendarGrid').innerHTML=items.join('');
  $('calendarGrid').querySelectorAll('[data-calendar]').forEach(b=>b.addEventListener('click',()=>{state.selectedDate=b.dataset.calendar;renderCalendar()}));
  const chosen=byDay.get(state.selectedDate)||[];
  $('selectedDayRecords').innerHTML=chosen.length?chosen.map(r=>{
    const rep=representative([r],r.date)||r.emotions[0]?.key||'평온';
    const v=themeForRecord(r,rep);
    return `<div class="day-record"><span class="day-record-main"><span class="day-record-icon" style="--record-color:${v.color}">${emotionIcon(rep)}</span><span>${r.emotions.map(e=>e.key).join(' · ')} · ${htmlEscape(r.text.slice(0,36))}</span><span class="day-record-material" title="${materialLabel(v.material)}">${materialIcon(v.material,v.color,'sm')}</span></span><span class="day-actions"><button data-rep="${r.id}" title="이 기록의 첫 감정을 해당 날짜의 대표 감정으로 지정">대표 지정</button><button data-edit="${r.id}">수정</button></span></div>`;
  }).join(''):'선택한 날짜에 기록이 없어요.';
  $('selectedDayRecords').querySelectorAll('[data-rep]').forEach(b=>b.addEventListener('click',async()=>{
    const r=actualRows().find(x=>x.id===b.dataset.rep);if(!r||state.demo)return;
    const key=r.emotions[0]?.key;if(key){await REP.put({date:r.date,key});state.reps=state.reps.filter(x=>x.date!==r.date).concat({date:r.date,key});refreshArchive()}
  }));
  $('selectedDayRecords').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const r=actualRows().find(x=>x.id===b.dataset.edit);if(r)fillForm(r)}));
}
function visibleStats(){const rows=getDateFilteredRows();if($('statMode').value==='all')return rows.flatMap(r=>r.emotions.map(e=>({key:e.key,intensity:e.intensity})));const groups=Object.groupBy?Object.groupBy(rows,r=>r.date):rows.reduce((a,r)=>((a[r.date]??=[]).push(r),a),{});return Object.keys(groups).map(d=>({key:representative(groups[d],d),intensity:1})).filter(x=>x.key)}
function renderPersonalStats(){const rows=getDateFilteredRows();const stats=visibleStats();$('recordCount').textContent=`${rows.length} RECORDS`;const counts=Object.fromEntries(EMOTIONS.map(e=>[e,stats.filter(x=>x.key===e).length]));let max=Math.max(1,...Object.values(counts));$('personalBars').innerHTML=EMOTIONS.map(key=>`<div class="personal-bar-row"><span>${key}</span><div class="bar-track"><div class="bar-fill" style="width:${counts[key]/max*100}%;background:${COLORS[key]}"></div></div><b>${counts[key]}회</b></div>`).join('');if(!stats.length){$('personalInsights').textContent='아직 기록이 없어요. 첫 감정을 남기면 나만의 패턴이 나타나요.';return;}const main=EMOTIONS.slice().sort((a,b)=>counts[b]-counts[a])[0];$('personalInsights').textContent=`${$('statMode').value==='all'?'전체 기록의 선택된 감정':'기록한 날짜의 대표 감정'}을 기준으로 ${main}이(가) 가장 자주 나타났어요. 기록한 날의 패턴이지 감정의 좋고 나쁨을 판단하는 지표는 아니에요.`}
function renderCollection(){
  const data=getDateFilteredRows().slice().sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
  $('recordCollection').innerHTML=data.length?data.map(r=>{
    const rep=representative([r],r.date)||r.emotions[0]?.key||'평온',visual=themeForRecord(r,rep);
    return `<article class="record-item"><span class="record-emotion-thumb" style="--record-color:${visual.color}" title="${rep}">${emotionIcon(rep)}</span><div><div class="record-date">${r.date}</div><strong>${r.emotions.map(e=>e.key).join(' · ')}</strong><p>${htmlEscape(r.text.slice(0,75))}</p><div class="record-item-actions"><button data-edit="${r.id}">열기 / 수정</button><button data-delete="${r.id}">삭제</button></div></div></article>`;
  }).join(''):'<div class="empty-state">아직 수집된 감정이 없어요.<br>오늘의 기록이 여기에 차곡차곡 쌓일 거예요.</div>';
  $('recordCollection').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const r=actualRows().find(x=>x.id===b.dataset.edit);if(r)fillForm(r)}));
  $('recordCollection').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{
    if(!confirm('이 기록을 삭제할까요?'))return;
    const id=b.dataset.delete;
    if(state.demo)state.demoRows=state.demoRows.filter(x=>x.id!==id);
    else{await DB.remove(id);state.saved=state.saved.filter(x=>x.id!==id)}
    refreshArchive();notify('기록을 삭제했어요.');
  }));
  renderScatter(data);
}
function renderScatter(data){const target=$('personalScatter');if($('archiveLayout').value!=='scatter'){target.hidden=true;$('recordCollection').hidden=false;return;}target.hidden=false;$('recordCollection').hidden=true;const W=980,H=320,p=38;let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="감정 방향과 에너지 분포"><line x1="${p}" y1="${H/2}" x2="${W-p}" y2="${H/2}" stroke="#e9e3ef"/><line x1="${W/2}" y1="20" x2="${W/2}" y2="${H-30}" stroke="#e9e3ef"/><text x="${p}" y="${H-8}" class="axis-label">불쾌 ←</text><text x="${W-p-45}" y="${H-8}" class="axis-label">→ 유쾌</text><text x="10" y="16" class="axis-label">활동적 ↑</text><text x="10" y="${H-30}" class="axis-label">차분함 ↓</text>`;for(const r of data){const x=p+((r.valence+100)/200)*(W-2*p),y=H-30-r.energy/100*(H-52);const color=COLORS[r.emotions[0]?.key]||'#aa9bcb';svg+=`<circle data-scatter="${r.id}" cx="${x}" cy="${y}" r="${9+(r.emotions[0]?.intensity||50)/25}" fill="${color}" fill-opacity=".72" stroke="#fff" stroke-width="2" style="cursor:pointer"><title>${r.date} · ${r.emotions.map(e=>e.key).join(' / ')}</title></circle>`}svg+='</svg>';target.innerHTML=svg;target.querySelectorAll('[data-scatter]').forEach(x=>x.addEventListener('click',()=>{const r=actualRows().find(r=>r.id===x.dataset.scatter);if(r)fillForm(r)}))}
function renderJar(){
  const end=today(),first=new Date();first.setDate(first.getDate()-29);
  const start=localDay(first),groups=new Map();
  actualRows().filter(x=>x.date>=start&&x.date<=end).forEach(r=>{const rows=groups.get(r.date)||[];rows.push(r);groups.set(r.date,rows)});
  const beads=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([day,entries],i)=>{
    const key=representative(entries,day),ref=entries.filter(r=>r.emotions.some(e=>e.key===key)).at(-1)||entries.at(-1);
    const s=savedStyle(ref,key),theme=themeForRecord(ref,key);
    const strength=Math.max(...entries.flatMap(r=>r.emotions.filter(e=>e.key===key).map(e=>e.intensity)),35);
    const size=22+strength/8;
    const weight=(Number(s.density??50))*.62+(Number(s.size??100))*.38;
    return {day,key,value:strength,i,size,weight,color:theme.color,material:theme.material};
  });
  $('jarCount').textContent=`기록된 날짜 ${beads.length}일 / 30일`;
  state.jar?.setBeads(beads);
}
function refreshArchive(){renderCalendar();renderPersonalStats();renderCollection();renderJar()}
function validateImported(input){if(!input||input.schemaVersion!==1||!Array.isArray(input.records))throw new Error('지원하지 않는 백업 형식이에요.');return input.records.map(x=>{if(!x||typeof x.text!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x.date)||!Array.isArray(x.emotions))throw new Error('기록 형식이 올바르지 않아요.');if(!x.emotions.length||x.emotions.length>3||x.emotions.some(e=>!EMOTIONS.includes(e.key)||!Number.isFinite(e.intensity)||e.intensity<0||e.intensity>100))throw new Error('감정 분류 정보가 올바르지 않아요.');return {id:String(x.id||safeId()),date:x.date,text:x.text.slice(0,10000),emotions:x.emotions.map(e=>({key:e.key,intensity:+e.intensity})),valence:clamp(Number(x.valence)||0,-100,100),energy:clamp(Number(x.energy)||0,0,100),visuals:typeof x.visuals==='object'&&x.visuals?x.visuals:{composite:defaultStyle()},createdAt:x.createdAt||new Date().toISOString(),updatedAt:x.updatedAt||new Date().toISOString()}})}
export async function setupMy({toast}){
  if(state.booted)return;state.booted=true;state.saved=await DB.all();state.reps=await REP.all();$('journalDate').value=today();
  $('emotionChips').innerHTML=EMOTIONS.map(key=>`<button type="button" class="emotion-chip" data-key="${key}" style="--chip:${COLORS[key]}">${key}</button>`).join('');$('emotionChips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>addEmotion(b.dataset.key)));
  import('./organism.js').then(({EmotionOrganism})=>{state.organism=new EmotionOrganism($('organismCanvas'));renderOrganism()}).catch(e=>{console.warn('Three.js unavailable',e);$('graphicsQuality').value='2d';activate2D()});
  $('analyzeBtn').addEventListener('click',()=>{
    const text=$('journalText').value.trim();
    if(!text){notify('먼저 일기를 작성해주세요.',true);return;}
    const proposed=suggestEmotions(text);
    if(!proposed.length){
      // Do not overwrite a manual selection or infer that unfamiliar text is calm.
      notify('일기 속 감정을 충분히 파악하지 못했어요. 아래 감정 중 1~3개를 직접 선택해 주세요. 자동으로 평온으로 처리하지 않아요.',true);
      return;
    }
    state.emotions=proposed;
    const weighted=state.emotions.reduce((a,x)=>a+x.intensity,0);
    state.valence=Math.round(state.emotions.reduce((a,x)=>a+(EMOTION_VALUE[x.key]||0)*x.intensity,0)/weighted);
    state.energy=Math.round(state.emotions.reduce((a,x)=>a+(EMOTION_ENERGY[x.key]||0)*x.intensity,0)/weighted);
    $('valenceRange').value=state.valence;$('energyRange').value=state.energy;
    $('valenceVal').textContent=state.valence;$('energyVal').textContent=state.energy;
    setRangeFill($('valenceRange'));setRangeFill($('energyRange'));setChipUI();
    notify(`규칙 기반 추천: ${proposed.map(x=>x.key).join(' · ')}. 문맥을 완전히 이해한 결과는 아니므로 직접 바꿀 수 있어요. 일기는 외부로 전송되지 않아요.`);
  });
  for(const [id,field] of [['valenceRange','valence'],['energyRange','energy']])$(id).addEventListener('input',e=>{state[field]=+e.target.value;$(field+'Val').textContent=e.target.value;setRangeFill(e.target);renderObjectSelector();renderOrganism()});
  for(const [id,field,output] of [['objectColor','color',null],['objectMaterial','material',null],['objectSize','size','sizeVal'],['objectOpacity','opacity','opacityVal'],['objectDensity','density','densityVal'],['objectSoftness','softness','softnessVal']])$(id).addEventListener('input',e=>{getStyle()[field]=['size','opacity','density','softness'].includes(field)?+e.target.value:e.target.value;if(output){$(output).textContent=field==='size'?(getStyle().size/100).toFixed(2):field==='opacity'?getStyle().opacity+'%':String(getStyle()[field])}if(e.target.type==='range')setRangeFill(e.target);renderObjectSelector();renderOrganism()});
  $('graphicsQuality').addEventListener('change',e=>{const use2D=e.target.value==='2d';$('organismCanvas').style.display=use2D?'none':'block';$('organismFallback').hidden=!use2D;if(use2D)activate2D();else if(state.organism)state.organism.setQuality(e.target.value);else activate2D();});
  $('objectReset').addEventListener('click',()=>{state.visuals[state.object]=defaultStyle(state.object);fillStyleControls();renderObjectSelector();renderOrganism()});
  $('resetFormBtn').addEventListener('click',resetForm);
  $('saveRecordBtn').addEventListener('click',async()=>{const text=$('journalText').value.trim(),date=$('journalDate').value;if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)){notify('기록 날짜를 확인해주세요.',true);return;}if(!text){notify('오늘의 기록을 먼저 입력해주세요.',true);return;}if(!state.emotions.length){notify('감정을 한 가지 이상 선택해주세요.',true);return;}
    const prev=actualRows().find(r=>r.id===state.editing);const now=new Date().toISOString();const r={id:state.editing||safeId(),date,text,emotions:structuredClone(state.emotions),valence:state.valence,energy:state.energy,visuals:structuredClone(state.visuals),createdAt:prev?.createdAt||now,updatedAt:now};
    if(state.demo){if(state.editing){state.demoRows=state.demoRows.map(x=>x.id===r.id?r:x)}else state.demoRows.push({...r,id:'demo-'+r.id})}else{try{await DB.put(r);state.saved=state.saved.filter(x=>x.id!==r.id).concat(r)}catch(e){notify('저장 공간 오류: 브라우저 저장소를 확인해주세요.',true);return;}}
    resetForm();state.selectedDate=date;const [y,m]=date.split('-').map(Number);state.calendar=new Date(y,m-1,1);refreshArchive();toast(state.demo?'샘플 모드에 기록했어요. 실제 기록에는 저장되지 않아요.':'감정 기록을 안전하게 저장했어요.');
  });
  $('periodFilter').addEventListener('change',refreshArchive);$('statMode').addEventListener('change',refreshArchive);$('archiveLayout').addEventListener('change',renderCollection);
  $('calendarPrev').addEventListener('click',()=>{state.calendar.setMonth(state.calendar.getMonth()-1);renderCalendar()});$('calendarNext').addEventListener('click',()=>{state.calendar.setMonth(state.calendar.getMonth()+1);renderCalendar()});
  $('demoToggle').addEventListener('click',()=>{state.demo=!state.demo;if(state.demo)state.demoRows=makeSamples();$('demoToggle').textContent=state.demo?'실제 기록으로 돌아가기':'샘플 데이터 체험';$('demoToggle').classList.toggle('is-active',state.demo);resetForm();refreshArchive();toast(state.demo?'샘플 데이터를 보고 있어요. 내 기록과 분리돼요.':'실제 개인 기록 화면으로 돌아왔어요.')});
  $('exportBtn').addEventListener('click',()=>{const json=JSON.stringify({app:'EMOTIONAL ATLAS',schemaVersion:1,exportedAt:new Date().toISOString(),records:state.saved,representatives:state.reps},null,2),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`emotional-atlas-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('JSON 백업 파일을 저장했어요.')});
  $('importInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>8*1024*1024)throw new Error('백업 파일이 너무 커요. (최대 8MB)');const obj=JSON.parse(await f.text());const imported=validateImported(obj);if(!confirm(`${imported.length}개의 기록을 가져올까요? 같은 ID의 기존 기록은 새 ID로 보관합니다.`))return;const ids=new Set(state.saved.map(r=>r.id));for(const r of imported){if(ids.has(r.id))r.id=safeId();ids.add(r.id);await DB.put(r);state.saved.push(r)}if(Array.isArray(obj.representatives)){for(const rep of obj.representatives){if(rep&&typeof rep.date==='string'&&EMOTIONS.includes(rep.key)){await REP.put({date:rep.date,key:rep.key});state.reps=state.reps.filter(x=>x.date!==rep.date).concat({date:rep.date,key:rep.key})}}}state.demo=false;$('demoToggle').textContent='샘플 데이터 체험';refreshArchive();toast(`${imported.length}개의 기록을 가져왔어요.`)}catch(err){toast(`복원 오류: ${err.message}`)}finally{e.target.value=''}});
  setRangeFill($('valenceRange'));setRangeFill($('energyRange'));state.jar=new BeadJar($('jarBody'));setChipUI();refreshArchive();
}
