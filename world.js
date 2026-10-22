/* World Values Survey static aggregates + accessible globe/chart interactions. */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PALETTE=['#ac91d9','#7caeaa','#efa98b'];
const HAPPY_COLORS=['#dfb8fd','#b8b7fd','#b8ceff','#f6ddff'];
const nfmt=n=>Number(n).toLocaleString('ko-KR');
const num=n=>typeof n==='number'&&Number.isFinite(n);
const hexToRgb=s=>{const n=parseInt(s.replace('#',''),16);return [(n>>16)&255,(n>>8)&255,n&255]};
const lerp=(a,b,t)=>a+(b-a)*t;
const mixHex=(a,b,t=.5)=>{const pa=(a||'#ffffff').replace('#',''),pb=(b||'#ffffff').replace('#','');const fa=pa.length===3?pa.split('').map(x=>x+x).join(''):pa;const fb=pb.length===3?pb.split('').map(x=>x+x).join(''):pb;const na=parseInt(fa,16)||0,nb=parseInt(fb,16)||0;const ar=(na>>16)&255,ag=(na>>8)&255,ab=na&255,br=(nb>>16)&255,bg=(nb>>8)&255,bb=nb&255;const rr=Math.round(ar+(br-ar)*t),rg=Math.round(ag+(bg-ag)*t),rb=Math.round(ab+(bb-ab)*t);return `#${[rr,rg,rb].map(v=>v.toString(16).padStart(2,'0')).join('')}`};
const pct=(x,dp=1)=>num(x)?`${x.toFixed(dp)}%`:'자료 없음';
const say=(text)=>{let el=$('worldNotice');el.textContent=text;el.style.color='#846eaf'};
const state={raw:null,geo:null,byCode:new Map(),byNumeric:new Map(),selected:[],wave:'latest',surveyId:null,band:'18+',ageMin:18,ageMax:110,globe:null,hover:null,trendMetrics:new Set(['satisfactionMean','veryHappy']),matrixBins:4,globalView:false,globalMetric:'satisfactionMean',beforeGlobal:null,ready:false,visible:false,resize:null};
function survey(c){if(!c)return null;if(state.wave==='latest')return c.surveys.at(-1)||null;const found=c.surveys.filter(s=>String(s.wave)===state.wave);return found.find(s=>s.id===state.surveyId)||found.at(-1)||null}
function bandStats(c,band=state.band){return survey(c)?.bands?.[band]||null}
function availableCountry(c){return Boolean(survey(c))}
function rgbaColor(mean){if(!num(mean))return 'rgba(168,177,196,.43)';const t=Math.max(0,Math.min(1,(mean-3)/6));return `rgba(${Math.round(lerp(94,194,t))},${Math.round(lerp(121,158,t))},${Math.round(lerp(175,229,t))},.93)`}
function globeColor(feat){const c=state.byCode.get(feat.properties.code);if(!state.globalView&&state.selected.includes(c?.code))return '#dcc9ff';if(state.hover===feat)return '#e7d9ff';const b=c?(state.globalView?globalSurvey(c)?.bands?.[state.band]:bandStats(c)):null;if(state.globalView&&state.globalMetric==='veryHappy'&&num(b?.happinessPct?.[0])){const v=Math.min(1,Math.max(0,b.happinessPct[0]/100));return `rgba(${Math.round(141+78*v)},${Math.round(151-21*v)},${Math.round(211+21*v)},.9)`}return rgbaColor(b?.satisfactionMean)}
function countryName(feat){return state.byCode.get(feat.properties.code)?.name||feat.properties.name||feat.properties.code}
function geoPolyProjected(g){let arr=[];if(g.type==='Polygon')arr=[g.coordinates];else if(g.type==='MultiPolygon')arr=g.coordinates;let out='';for(const polys of arr){for(const ring of polys){ring.forEach(([lng,lat],i)=>{let x=(lng+180)/360*960,y=(90-lat)/180*470;out+=(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)});out+='Z'}}return out}
function fallbackMap(){const mount=$('flatMap');let svg='<svg viewBox="0 0 960 470" role="img" aria-label="국가 선택 지도">';for(const feat of state.geo.features){const c=state.byCode.get(feat.properties.code);svg+=`<path data-map="${esc(feat.properties.code)}" d="${geoPolyProjected(feat.geometry)}" fill="${globeColor(feat)}" stroke="#22304b" stroke-width=".65" style="cursor:pointer"><title>${esc(countryName(feat))}</title></path>`}svg+='</svg>';mount.innerHTML=svg;mount.querySelectorAll('[data-map]').forEach(el=>el.addEventListener('click',()=>{const c=state.byCode.get(el.dataset.map);if(c)selectCountry(c.code);else say('선택한 국가는 현재 WVS 데이터에 없어요.')}));}
function refreshGlobe(){if(state.globe){state.globe.polygonCapColor(globeColor).polygonAltitude(f=>state.hover===f?.035:(!state.globalView&&state.selected.includes(state.byCode.get(f.properties.code)?.code))?.027:.012).polygonStrokeColor(f=>(!state.globalView&&state.selected.includes(state.byCode.get(f.properties.code)?.code))?'#faf0ff':'#34465e');}else fallbackMap()}
function initGlobe(){const mount=$('globeMount'),fallback=$('globeFallback');if(!state.geo)return;
  if(typeof window.Globe!=='function'){fallback.hidden=false;mount.style.display='none';fallbackMap();return}
  try{
    const w=mount.clientWidth,h=mount.clientHeight;if(w<50||h<50)throw Error('globe dimensions not ready');
    const globe=new window.Globe(mount,{rendererConfig:{antialias:true,alpha:true}});
    globe.width(w).height(h).backgroundColor('rgba(0,0,0,0)').showGlobe(false).showAtmosphere(false)
      .polygonsData(state.geo.features)
      .polygonCapColor(globeColor)
      .polygonSideColor(()=> 'rgba(116,142,193,.35)')
      .polygonStrokeColor(()=> '#39465f')
      .polygonAltitude(.012).polygonsTransitionDuration(350)
      .polygonLabel(f=>`<div style="background:#21283b;color:#f4f0ff;border:1px solid #515878;border-radius:9px;padding:10px 13px;font-size:11px;font-family:sans-serif">${esc(countryName(f))}<div style="font-size:9px;color:#aab6cc;margin-top:3px">${state.byCode.has(f.properties.code)?'클릭하여 통계 보기':'WVS 자료 없음'}</div></div>`)
      .onPolygonHover(f=>{state.hover=f;refreshGlobe();mount.style.cursor=f?'pointer':'grab'})
      .onPolygonClick(f=>{const c=state.byCode.get(f.properties.code);if(c)selectCountry(c.code);else say('선택한 나라의 WVS 통계를 찾지 못했어요.')});
    const material=globe.globeMaterial();if(material){material.transparent=true;material.opacity=0.01;material.depthWrite=false;material.needsUpdate=true}
    try{const controls=globe.controls();controls.autoRotate=true;controls.autoRotateSpeed=.28;controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=135;controls.maxDistance=470}catch{}
    globe.pointOfView({lat:26,lng:109,altitude:2.1},0);state.globe=globe;
    state.resize=new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;if(w>20&&h>20)globe.width(w).height(h)});state.resize.observe(mount);
    fallback.hidden=true;
  }catch(e){console.warn('Globe rendering fallback:',e);fallback.hidden=false;mount.style.display='none';fallbackMap()}
}
function selectCountry(code){if(!state.byCode.has(code))return;if(state.globalView){setGlobalMode(false,true);state.selected=[];}const c=state.byCode.get(code);if(!state.selected.includes(code)){if(state.selected.length>=3){say('동시에 비교할 수 있는 국가는 최대 3개입니다. 먼저 한 국가를 해제해주세요.');return}state.selected.push(code)}refreshSelection();refreshGlobe();if(state.globe&&num(c.lat)&&num(c.lng)){state.globe.pointOfView({lat:c.lat,lng:c.lng,altitude:1.95},950)}if(!availableCountry(c))say(`${c.name}의 선택된 조사 차수에는 자료가 없어요. 다른 차수를 선택해 주세요.`);else if(!bandStats(c))say(`${c.name}의 선택 연령대에서 제공 가능한 표본이 부족해요.`);else say(`${c.name} 통계를 불러왔어요.`)}
function removeCountry(code){state.selected=state.selected.filter(x=>x!==code);refreshSelection();refreshGlobe();}
function selectedCountries(){return state.selected.map(code=>state.byCode.get(code)).filter(Boolean)}
function refreshSelection(){const selected=selectedCountries();$('worldSelection').innerHTML=selected.map((c,i)=>`<span class="selected-chip" style="--country-color:${PALETTE[i]}"><i></i>${esc(c.name)}<button aria-label="${esc(c.name)} 선택 해제" data-remove="${c.code}">×</button></span>`).join('');$('worldSelection').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeCountry(b.dataset.remove)));renderAll()}
function renderWaveTimeline(){
  const timeline=$('waveTimeline');if(!timeline)return;
  const primary=selectedCountries()[0];
  const allBtn=$('waveAllBtn');
  if(!primary){timeline.innerHTML=noData('지구본이나 검색창에서 국가를 선택해 주세요.');$('waveTimelineCountry').textContent='';if(allBtn)allBtn.classList.remove('is-active');return;}
  $('waveTimelineCountry').textContent=`${primary.name} · ${primary.surveys.length}회 조사`;
  if(allBtn)allBtn.classList.toggle('is-active',state.wave==='latest'&&!state.surveyId);
  const surveys=[...primary.surveys].sort((a,b)=>a.year-b.year);
  const years=surveys.map(s=>s.year),span=Math.max(1,Math.max(...years)-Math.min(...years));
  timeline.innerHTML=`<div class="wave-axis" aria-hidden="true"><span>${Math.min(...years)}년</span><span>${Math.max(...years)}년</span></div>`+
    `<div class="wave-points">${surveys.map(s=>{
      const current=survey(primary),active=state.wave!=='latest'&&current?.id===s.id;
      const b=s.bands?.[state.band];
      const available=typeof b?.satisfactionMean==='number'||typeof b?.happinessPct?.[0]==='number';
      return `<button type="button" class="wave-moment ${active?'active':''} ${available?'':'limited'}" data-survey-id="${s.id}" data-wave="${s.wave}" style="--year-position:${(s.year-Math.min(...years))/span*100}%" aria-pressed="${active}" aria-label="${primary.name} ${s.year}년 ${s.wave}차 조사 선택"><span class="wave-moment-dot"></span><strong>${s.year}</strong><small>W${s.wave}</small></button>`;
    }).join('')}</div>`;
  timeline.querySelectorAll('[data-wave]').forEach(btn=>btn.addEventListener('click',()=>{
    state.wave=btn.dataset.wave;
    state.surveyId=btn.dataset.surveyId;
    $('waveFilter').value=state.wave;
    renderAll();refreshGlobe();
    say(`${primary.name} ${btn.querySelector('strong')?.textContent||''}년 조사 통계로 변경했어요.`);
  }));
}
function miniHead(c,i){const s=survey(c);return `<div class="country-mini-title" style="--country-color:${PALETTE[i]}"><strong>${esc(c.name)}</strong><span>${s?`${s.year}년 · ${s.wave}차`:'해당 조사 없음'}</span></div>`}
function noData(message){return `<div class="chart-empty">${message||'표시할 수 있는 자료가 없어요.'}</div>`}
function summaryCards(){const cs=selectedCountries();$('summaryCards').innerHTML=cs.length?cs.map((c,i)=>{const s=survey(c),b=bandStats(c),mean=b?.satisfactionMean;const first=c.surveys?.[0],last=c.surveys?.[c.surveys.length-1];return `<div class="summary-card summary-card-v2" style="--country-color:${PALETTE[i]}"><div class="summary-topline"><span class="summary-country-name">${esc(c.name)}</span><span class="soft-pill">${s?`${s.wave}차`:'미조사'}</span></div><div class="summary-stat-wrap"><div class="summary-stat-label">삶의 만족도 가중평균</div><div class="summary-stat">${num(mean)?mean.toFixed(2):'—'}<small> / 10</small></div></div><div class="summary-survey">${s?`${s.year}년 실제 조사 · ${state.band==='all'?'전체 응답 연령':state.band+'세'}`:'선택한 차수에 데이터 없음'}</div><div class="summary-meta"><span>매우 행복 ${pct(b?.happinessPct?.[0])}</span><span>유효 응답 ${b?nfmt(b.nSatisfaction)+'명':'—'}</span></div><div class="summary-timeline"><span>관측 범위</span><strong>${first&&last?`${first.year}–${last.year}`:'—'}</strong><em>${c.surveys?.length||0} waves</em></div></div>`}).join('')+(cs.length===1?`<div class="summary-empty-slot" aria-label="두 번째 국가 요약 카드 자리"><span class="empty-slot-glyph">✧</span><strong>다른 국가와 함께 보기</strong><p>지구본이나 검색창에서 두 번째 국가를 선택하면<br>이 자리에 나란히 비교할 수 있어요.</p></div>`:''):noData('국가를 선택하면 실제 설문 통계가 나타나요.');}
function happinessCharts(){const cs=selectedCountries();$('happyCharts').innerHTML=cs.length?cs.map((c,i)=>{const b=bandStats(c);if(!b?.happinessPct)return `<div class="data-country-block">${miniHead(c,i)}${noData('이 연령 구간의 행복감 분포를 제공할 수 없어요.')}</div>`;return `<div class="data-country-block">${miniHead(c,i)}<div class="happy-stack" role="img" aria-label="${esc(c.name)} 행복감 응답 분포">${b.happinessPct.map((v,j)=>`<span style="width:${v}%;background:linear-gradient(135deg,${mixHex(HAPPY_COLORS[j],'#ffffff',.08)},${mixHex(HAPPY_COLORS[j],'#ffffff',.38)})" title="${state.raw.happinessLabels[j]} ${v}%"></span>`).join('')}</div><div class="happy-legend">${b.happinessPct.map((v,j)=>`<div><i class="legend-dot" style="--legend-color:${HAPPY_COLORS[j]}"></i>${state.raw.happinessLabels[j]}<b>${pct(v)}</b></div>`).join('')}</div></div>`}).join(''):noData('먼저 국가를 선택해주세요.');}
function satisfactionCharts(){const cs=selectedCountries();$('satisfactionCharts').innerHTML=cs.length?cs.map((c,i)=>{const b=bandStats(c);if(!b?.satisfactionPct)return `<div class="data-country-block">${miniHead(c,i)}${noData('만족도 분포의 유효 표본이 부족하거나 문항이 조사되지 않았어요.')}</div>`;const max=Math.max(...b.satisfactionPct,1);const base=PALETTE[i],light=mixHex(base,'#ffffff',.42),dark=mixHex(base,'#8bbef0',.18);return `<div class="data-country-block">${miniHead(c,i)}<div class="score-chart">${b.satisfactionPct.map((x,j)=>`<div class="score-col" title="${j+1}점 ${pct(x)}"><div class="score-box"><div class="score-bar" style="height:${Math.max(2,x/max*96)}%;background:linear-gradient(180deg,${light},${base},${dark})"></div></div><span>${j+1}</span></div>`).join('')}</div><div class="score-mean"><i></i> 평균 <strong>${b.satisfactionMean?.toFixed(2)??'—'}</strong> / 10 · 유효 응답 ${nfmt(b.nSatisfaction)}명</div></div>`}).join(''):noData('먼저 국가를 선택해주세요.');}
function trendCharts(){
  const cs=selectedCountries();
  if(!cs.length){$('trendChart').innerHTML=noData('국가를 선택하면 시계열 변화가 나타나요.');return;}
  const metrics=[...state.trendMetrics];
  if(!metrics.length){$('trendChart').innerHTML=noData('하나 이상의 지표를 선택해 주세요.');return;}
  const metricInfo={
    satisfactionMean:{label:'삶의 만족도 평균',unit:'/10점',scale:v=>v*10,format:v=>v.toFixed(2)+'점'},
    veryHappy:{label:'매우 행복 응답률',unit:'%',scale:v=>v,format:v=>v.toFixed(1)+'%'}
  };
  // The same survey timestamps are used as before; curves are visual connectors only.
  // Distinct pastel shades separate the two indicators without hiding country identity.
  const tintSets=[{s:'#b86ddf',h:'#9bc4f5'},{s:'#70b9ae',h:'#7da6e2'},{s:'#e99db5',h:'#f4b593'}];
  const series=[];
  cs.forEach((c,i)=>{
    metrics.forEach(metric=>{
      const points=c.surveys.map(s=>{
        const b=s.bands?.[state.band];
        const raw=metric==='satisfactionMean'?b?.satisfactionMean:b?.happinessPct?.[0];
        return {year:s.year,wave:s.wave,id:s.id,raw,value:num(raw)?metricInfo[metric].scale(raw):null};
      }).filter(p=>num(p.value)).sort((a,b)=>a.year-b.year);
      if(points.length)series.push({country:c,metric,meta:metricInfo[metric],color:metric==='satisfactionMean'?tintSets[i%3].s:tintSets[i%3].h,points});
    });
  });
  const all=series.flatMap(s=>s.points);
  if(!all.length){$('trendChart').innerHTML=noData('선택 연령 구간의 추이를 제공할 수 없어요.');return;}
  const W=1040,H=360,P={l:58,r:64,t:40,b:54};
  let minYear=Math.min(...all.map(p=>p.year)),maxYear=Math.max(...all.map(p=>p.year));
  if(minYear===maxYear){minYear-=1;maxYear+=1;}
  const x=v=>P.l+(v-minYear)/(maxYear-minYear)*(W-P.l-P.r);
  const y=v=>P.t+(100-v)/100*(H-P.t-P.b);
  const coord=v=>Number(v).toFixed(2);
  // Smooth Bézier interpolation never creates additional data points. No curves are
  // drawn across missing survey waves; single observations remain points only.
  const curvePath=piece=>{
    if(!piece.length)return '';
    let d=`M${coord(x(piece[0].year))} ${coord(y(piece[0].value))}`;
    for(let i=1;i<piece.length;i++){
      const a=piece[i-1],b=piece[i];
      const x0=x(a.year),x1=x(b.year),yy0=y(a.value),yy1=y(b.value);
      const mid=(x0+x1)/2;
      d+=` C${coord(mid)} ${coord(yy0)} ${coord(mid)} ${coord(yy1)} ${coord(x1)} ${coord(yy1)}`;
    }
    return d;
  };
  let svg=`<svg viewBox="0 0 ${W} ${H}" class="trend-svg trend-svg-overlay trend-svg-v8" role="img" aria-label="실제 조사연도별 삶의 만족도와 매우 행복 응답률의 변화"><defs>
    <linearGradient id="v8-plot-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f7f5ff"/><stop offset="60%" stop-color="#f5f6ff"/><stop offset="100%" stop-color="#ffffff"/></linearGradient>
    ${series.map((s,i)=>`<linearGradient id="v8-fill-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${s.color}" stop-opacity="${s.metric==='satisfactionMean'?.54:.47}"/><stop offset="54%" stop-color="${s.color}" stop-opacity=".24"/><stop offset="100%" stop-color="${s.color}" stop-opacity=".015"/></linearGradient>`).join('')}
    <filter id="v8-soft-area" x="-15%" y="-15%" width="130%" height="135%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="v8-dot-shadow" x="-90%" y="-90%" width="280%" height="280%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#9b83ca" flood-opacity=".17"/></filter>
  </defs><rect x="0" y="0" width="${W}" height="${H}" rx="21" fill="url(#v8-plot-ground)"/>`;
  for(let j=0;j<=5;j++){
    const v=j*20,py=y(v);
    svg+=`<line x1="${P.l}" y1="${coord(py)}" x2="${W-P.r}" y2="${coord(py)}" stroke="#e5e4f1" stroke-width="1"/><text x="${P.l-16}" y="${coord(py+4)}" text-anchor="end" class="axis-label">${v/10}</text><text x="${W-P.r+14}" y="${coord(py+4)}" text-anchor="start" class="axis-label">${v}%</text>`;
  }
  for(let j=0;j<=5;j++){
    const yr=minYear+(maxYear-minYear)*j/5;
    svg+=`<text x="${coord(x(yr))}" y="${H-17}" text-anchor="middle" class="axis-label">${Math.round(yr)}</text>`;
  }
  svg+=`<text x="${P.l}" y="23" class="plot-axis-heading">삶의 만족도 · 0–10</text><text x="${W-P.r}" y="23" text-anchor="end" class="plot-axis-heading">매우 행복 · 0–100%</text>`;
  // Paint filled ribbons first, then strokes and measured dots, preserving visible lines.
  for(const [i,s] of series.entries()){
    const segments=[];let chunk=[];
    for(let j=0;j<s.points.length;j++){
      if(j>0&&s.points[j].wave-s.points[j-1].wave>1){if(chunk.length)segments.push(chunk);chunk=[];}
      chunk.push(s.points[j]);
    }
    if(chunk.length)segments.push(chunk);
    for(const seg of segments){
      if(seg.length<2)continue;
      const d=curvePath(seg),base=y(0);
      const area=`${d} L${coord(x(seg.at(-1).year))} ${coord(base)} L${coord(x(seg[0].year))} ${coord(base)} Z`;
      svg+=`<path d="${area}" fill="url(#v8-fill-${i})" filter="url(#v8-soft-area)" opacity=".7"/>`;
      svg+=`<path d="${area}" fill="url(#v8-fill-${i})" opacity=".92"/>`;
    }
  }
  for(const s of series){
    const segments=[];let chunk=[];
    for(let j=0;j<s.points.length;j++){
      if(j>0&&s.points[j].wave-s.points[j-1].wave>1){if(chunk.length)segments.push(chunk);chunk=[];}
      chunk.push(s.points[j]);
    }
    if(chunk.length)segments.push(chunk);
    for(const seg of segments){
      if(seg.length<2)continue;
      const d=curvePath(seg);
      svg+=`<path d="${d}" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="6" stroke-linecap="round"/>`;
      svg+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.metric==='satisfactionMean'?3.6:3.1}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    for(const point of s.points){
      svg+=`<circle cx="${coord(x(point.year))}" cy="${coord(y(point.value))}" r="5.6" fill="#fff" stroke="${s.color}" stroke-width="2.9" filter="url(#v8-dot-shadow)" class="trend-dot"><title>${esc(s.country.name)} · ${point.year}년 · ${point.wave}차 · ${s.meta.label}: ${s.meta.format(point.raw)}</title></circle>`;
    }
  }
  svg+='</svg>';
  const countryLegend=cs.map((c,i)=>`<span class="trend-country"><i style="background:${tintSets[i%3].s}"></i>${esc(c.name)}</span>`).join('');
  const metricLegend=metrics.map(m=>`<span class="trend-metric ${m}"><i></i>${metricInfo[m].label}</span>`).join('');
  $('trendChart').innerHTML=svg+`<div class="trend-legend-wrap"><div class="trend-legend">${countryLegend}</div><div class="trend-legend trend-legend-metrics">${metricLegend}</div></div>`;
}
function matrixCharts(){const cs=selectedCountries();if(!cs.length){$('matrixCharts').innerHTML=noData('국가를 선택하면 관계 행렬을 볼 수 있어요.');return}
 let out='';for(let i=0;i<cs.length;i++){const c=cs[i],b=bandStats(c),s=survey(c),key=state.matrixBins===10?'matrix10':'matrix4',rows=b?.[key],N=state.matrixBins;out+=`<div class="matrix-card"><div class="matrix-title">${esc(c.name)} <span style="font-weight:400;color:#a29cab">${s?s.year+'년 조사':''}</span></div>`;
 if(!rows||!rows.some(Boolean)){out+=noData('해당 범위의 모든 세부 칸이 최소 표본 기준을 충족하지 못했어요. 다른 연령대를 선택하거나 4개 구간 보기를 이용해보세요.');out+='</div>';continue}
 out+=`<div class="matrix-table" style="--columns:${N}"><div></div>${Array.from({length:N},(_,j)=>`<div class="matrix-axis">${N===10?j+1:state.raw.matrix4Bins[j]}</div>`).join('')}`;
 rows.forEach((row,j)=>{out+=`<div class="row-name">${state.raw.happinessLabels[j]}</div>`;if(row){row.forEach(v=>{const opacity=.06+Math.min(.82,v/44);out+=`<div class="matrix-cell" style="background:rgba(151,115,210,${opacity.toFixed(3)})" title="${state.raw.happinessLabels[j]} 응답자 중 ${pct(v)}">${v.toFixed(0)}%</div>`})}else out+=Array.from({length:N},()=>`<div class="matrix-cell no-data">—</div>`).join('')});out+='</div><div class="matrix-annotation">행별 조건부 비율입니다. 최소 인원이나 희소 셀 기준에 미달한 행은 표시하지 않았어요. 셀 비율은 반올림되어 합계가 정확히 100%가 아닐 수 있습니다.</div></div>'}
 $('matrixCharts').innerHTML=out;}
function ageCharts(){const cs=selectedCountries();if(!cs.length){$('ageCharts').innerHTML=noData('국가를 선택하면 연령 비교가 나타나요.');return}let out='';for(let i=0;i<cs.length;i++){const c=cs[i],s=survey(c);out+=`<div class="data-country-block">${miniHead(c,i)}<div class="age-small-grid">`;for(const key of ['18-29','30-44','45-59','60+']){let b=s?.bands?.[key],v=b?.satisfactionMean;out+=`<div class="age-small-card"><h4>${key==='60+'?'60세 이상':key+'세'}</h4>${num(v)?`<strong>${v.toFixed(2)}</strong><small> / 10 · ${nfmt(b.nSatisfaction)}명</small>`:'<strong>—</strong><small>자료 부족</small>'}</div>`}out+='</div></div>'}$('ageCharts').innerHTML=out;}
function dataArt(){}
function insights(){const cs=selectedCountries().filter(c=>bandStats(c));let arr=[];
 if(cs.length>=2){const sorted=cs.filter(c=>num(bandStats(c)?.satisfactionMean)).sort((a,b)=>bandStats(b).satisfactionMean-bandStats(a).satisfactionMean);if(sorted.length>=2){let hi=sorted[0],lo=sorted.at(-1),delta=bandStats(hi).satisfactionMean-bandStats(lo).satisfactionMean;arr.push({head:'01 · 국가 비교',text:`선택 조건에서 ${hi.name}의 삶의 만족도 평균은 ${lo.name}보다 약 ${delta.toFixed(2)}점 높아요. 단, 국가별 조사연도는 서로 다를 수 있어요.`})}}
 if(cs.length){let c=cs[0],p=c.surveys.map(s=>({year:s.year,mean:s.bands?.[state.band]?.satisfactionMean})).filter(x=>num(x.mean));if(p.length>=2){const a=p[0],b=p.at(-1),d=b.mean-a.mean;arr.push({head:'02 · 시간의 변화',text:`${c.name}의 첫 관측 ${a.year}년과 최근 관측 ${b.year}년 사이 만족도 평균은 ${Math.abs(d).toFixed(2)}점 ${d>=0?'높아졌어요':'낮아졌어요'}. 두 시점은 서로 다른 설문 표본이에요.`})}const bm=bandStats(c),m=bm?.matrix4||bm?.matrix10;if(m?.some(Boolean)){arr.push({head:'03 · 행복과 만족도',text:`${c.name}의 관계 행렬에서 행복감 범주별 삶의 만족도 분포를 확인할 수 있어요. 표본이 적은 범주는 표시하지 않으며, 이 관계만으로 원인과 결과를 설명할 수는 없어요.`})}}
 const defaults=[{head:'01 · 국가의 차이',text:'국가를 두 개 이상 선택하면 조사 시점별 삶의 만족도 차이를 비교할 수 있어요.'},{head:'02 · 시간의 흐름',text:'여러 조사 차수가 있는 나라를 선택해 시간에 따른 변화를 탐색해 보세요.'},{head:'03 · 두 가지 질문',text:'행복감 4단계와 삶의 만족도 10점은 같은 질문이 아니에요. 함께 비교할수록 새로운 패턴이 보여요.'}];while(arr.length<3)arr.push(defaults[arr.length]);$('worldInsights').innerHTML=arr.slice(0,3).map(x=>`<div class="insight-card"><strong>${x.head}</strong>${esc(x.text)}</div>`).join('')}
// WORLD SNAPSHOT: equal-country descriptive summaries across the countries that actually
// participated in a single WVS wave. Never treat this as a global population estimate.
function globalSurvey(country) {
  if(!country || state.wave==='latest') return null;
  const candidates=country.surveys.filter(s=>String(s.wave)===state.wave);
  const hasData=s=>{
    const b=s.bands?.[state.band];
    return Number(num(b?.satisfactionMean))+Number(Array.isArray(b?.happinessPct)&&b.happinessPct.every(num));
  };
  return [...candidates].sort((a,b)=>hasData(b)-hasData(a)||b.year-a.year)[0]||null;
}
function globalRows(){
  return (state.raw?.countries||[]).map(country=>{
    const survey=globalSurvey(country);
    return survey?{country,survey,stats:survey.bands?.[state.band]||null}:null;
  }).filter(Boolean);
}
const average=values=>{const good=values.filter(num);return good.length?good.reduce((a,b)=>a+b,0)/good.length:null};
function globalValue(row,metric=state.globalMetric){
  return metric==='veryHappy'?row.stats?.happinessPct?.[0]:row.stats?.satisfactionMean;
}
function globalRanking(){
  const target=$('globalRanking');if(!target)return;
  const metric=state.globalMetric;
  const items=globalRows().sort((a,b)=>{
    const va=globalValue(a,metric),vb=globalValue(b,metric);
    if(num(va)&&num(vb))return vb-va||a.country.name.localeCompare(b.country.name,'ko');
    if(num(va))return -1;
    if(num(vb))return 1;
    return a.country.name.localeCompare(b.country.name,'ko');
  });
  if(!items.length){target.innerHTML=noData('이 차수에 해당하는 WVS 조사를 찾지 못했어요.');return}
  let rank=0;
  target.innerHTML=items.map(row=>{
    const value=globalValue(row,metric),valid=num(value);
    if(valid)rank++;
    const width=valid?Math.min(100,Math.max(0,metric==='veryHappy'?value:value/10*100)):0;
    const label=valid?(metric==='veryHappy'?`${value.toFixed(1)}%`:`${value.toFixed(2)}점`):'자료 없음';
    return `<button class="global-rank-row ${valid?'':'unavailable'}" type="button" data-global-country="${esc(row.country.code)}" aria-label="${esc(row.country.name)}, ${row.survey.year}년 조사, ${label}, 국가 상세 보기"><span class="rank">${valid?String(rank).padStart(2,'0'):'—'}</span><span class="country">${esc(row.country.name)}</span><span class="bar" aria-hidden="true"><i style="width:${width.toFixed(2)}%"></i></span><span class="metric">${label}</span><span class="year">${row.survey.year} · W${row.survey.wave}</span></button>`;
  }).join('');
  target.querySelectorAll('[data-global-country]').forEach(button=>button.addEventListener('click',()=>selectCountry(button.dataset.globalCountry)));
}
function globalScatter(rows){
  const mount=$('globalDotPlot');if(!mount)return;
  const items=rows.filter(r=>num(r.stats?.satisfactionMean)&&num(r.stats?.happinessPct?.[0]));
  if(!items.length){mount.innerHTML=noData('두 문항 모두 유효한 국가가 없어요. 다른 조사 차수나 연령대를 선택해주세요.');return}
  const W=760,H=333,pad={left:58,right:24,top:22,bottom:48};
  const left=pad.left,right=W-pad.right,top=pad.top,bottom=H-pad.bottom;
  const x=value=>left+(value-1)/9*(right-left);
  const y=value=>bottom-value/100*(bottom-top);
  let svg=`<svg class="global-dot-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(state.wave)}차 WVS 참여국 ${items.length}개 국가, 각 국가 만족도 평균과 매우 행복 비율 비교">`;
  for(const value of [0,25,50,75,100]){
    svg+=`<line class="global-chart-gridline" x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}"/><text class="global-axis" x="${left-13}" y="${y(value)+4}" text-anchor="end">${value}%</text>`;
  }
  for(const value of [1,3,5,7,9,10]){
    svg+=`<line class="global-chart-gridline" x1="${x(value)}" y1="${top}" x2="${x(value)}" y2="${bottom}"/><text class="global-axis" x="${x(value)}" y="${bottom+20}" text-anchor="middle">${value}</text>`;
  }
  svg+=`<text class="global-axis" x="${W/2}" y="${H-7}" text-anchor="middle">삶의 만족도 평균 / 10점</text><text class="global-axis" x="${left}" y="13">매우 행복 비율 ↑</text>`;
  items.forEach(row=>{
    const sat=row.stats.satisfactionMean,happy=row.stats.happinessPct[0],color=rgbaColor(sat);
    // A deterministic sub-2px overlap nudge is visual only; the numeric values remain unchanged.
    const hash=[...row.country.code].reduce((v,c)=>v*31+c.charCodeAt(0),7);
    const jitter=((hash%5)-2)*0.6;
    svg+=`<circle class="global-plot-dot" data-global-country="${esc(row.country.code)}" cx="${(x(sat)+jitter).toFixed(1)}" cy="${(y(happy)-jitter).toFixed(1)}" r="6.5" fill="${color}" stroke="#fff" stroke-width="1.5" tabindex="0" role="button" aria-label="${esc(row.country.name)} ${row.survey.year}년: 만족도 ${sat.toFixed(2)}점, 매우 행복 ${happy.toFixed(1)}%. 국가 상세 보기"><title>${esc(row.country.name)} · ${row.survey.year}년 · 만족도 ${sat.toFixed(2)}점 / 매우 행복 ${happy.toFixed(1)}%</title></circle>`;
  });
  svg+='</svg>';
  mount.innerHTML=svg;
  mount.querySelectorAll('[data-global-country]').forEach(el=>{
    const open=()=>selectCountry(el.dataset.globalCountry);
    el.addEventListener('click',open);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
}
function globalHappiness(rows){
  const node=$('globalHappiness');if(!node)return;
  const valid=rows.filter(r=>Array.isArray(r.stats?.happinessPct)&&r.stats.happinessPct.length===4&&r.stats.happinessPct.every(num));
  if(!valid.length){node.innerHTML=noData('행복감 분포를 제공할 수 있는 국가가 없습니다.');return}
  const values=[0,1,2,3].map(i=>average(valid.map(r=>r.stats.happinessPct[i])));
  const total=values.reduce((a,b)=>a+b,0);
  const labels=state.raw.happinessLabels;
  node.innerHTML=`<div class="global-happy-stack" role="img" aria-label="${valid.length}개국의 행복감 분포를 나라별 동일 가중으로 평균">${values.map((v,i)=>`<span style="width:${v/total*100}%;background:${HAPPY_COLORS[i]}" title="${esc(labels[i])} ${v.toFixed(1)}%"></span>`).join('')}</div><div class="global-happy-legend">${values.map((v,i)=>`<div class="global-happy-legend-row"><i style="--happy-color:${HAPPY_COLORS[i]}"></i><span>${esc(labels[i])}</span><b>${v.toFixed(1)}%</b></div>`).join('')}</div><p class="global-chart-footnote">행복감 분포를 제공하는 ${valid.length}개국 기준 · 국가별 동일 가중</p>`;
}
function renderGlobalOverview(){
  if(!state.globalView||!state.raw)return;
  const rows=globalRows(),satRows=rows.filter(r=>num(r.stats?.satisfactionMean)),happyRows=rows.filter(r=>num(r.stats?.happinessPct?.[0]));
  const years=rows.map(r=>r.survey.year).filter(num);
  const meanSat=average(satRows.map(r=>r.stats.satisfactionMean)),meanHappy=average(happyRows.map(r=>r.stats.happinessPct[0]));
  const range=years.length?`${Math.min(...years)}–${Math.max(...years)}년`:'조사연도 없음';
  $('globalWaveBadge').textContent=`WAVE ${String(state.wave).padStart(2,'0')}`;
  $('globalSubtitle').textContent=`WVS ${state.wave}차 · 실제 조사연도 ${range} · ${rows.length}개 국가·지역 참여`;
  const cards=[
    {title:'참여 국가·지역',value:String(rows.length),unit:'곳',foot:'이 차수의 WVS 조사 수록 범위'},
    {title:'참여국 만족도 평균',value:num(meanSat)?meanSat.toFixed(2):'—',unit:'/ 10',foot:`값이 있는 ${satRows.length}개국 · 동일 비중 평균`},
    {title:'참여국 매우 행복 평균',value:num(meanHappy)?meanHappy.toFixed(1):'—',unit:'%',foot:`값이 있는 ${happyRows.length}개국 · 동일 비중 평균`},
    {title:'실제 조사 시점',value:range,unit:'',foot:'WVS 차수는 동일해도 조사연도는 다릅니다'}
  ];
  $('globalSummaryCards').innerHTML=cards.map(c=>`<div class="global-summary-card"><span class="kicker">${c.title}</span><div class="value">${c.value}<small> ${c.unit}</small></div><p>${c.foot}</p></div>`).join('');
  globalScatter(rows);globalHappiness(rows);globalRanking();
  $('globalMethod').textContent=`자료: World Values Survey Time Series v5.0 · ${state.wave}차 조사. 비교 범위는 전 세계 모든 나라가 아니라 해당 조사 차수에 참여한 ${rows.length}개 국가·지역입니다. 국가별 지표는 S017 가중 통계이고, 참여국 평균은 결측 국가를 제외한 국가별 지표의 단순 산술평균입니다(인구 가중 세계 평균이 아님). 응답 문항별 유효 국가 수는 다를 수 있고, 조사연도도 나라마다 다릅니다. 소표본 또는 미조사 값은 별도로 표시하지 않습니다.`;
}
function setGlobalMode(enabled,keepWave=false){
  if(enabled===state.globalView)return;
  if(enabled){
    state.beforeGlobal={wave:state.wave,surveyId:state.surveyId};
    state.globalView=true;
    if(state.wave==='latest')state.wave='7';
    state.surveyId=null;
  }else{
    state.globalView=false;
    if(!keepWave&&state.beforeGlobal){state.wave=state.beforeGlobal.wave;state.surveyId=state.beforeGlobal.surveyId}
    else state.surveyId=null;
    state.beforeGlobal=null;
  }
  $('waveFilter').value=state.wave;
  const latest=$('waveFilter').querySelector('option[value="latest"]');if(latest)latest.disabled=state.globalView;
  $('worldControls').dataset.globalMode=String(state.globalView);
  $('worldGlobal').hidden=!state.globalView;
  $('worldData').hidden=state.globalView;
  const button=$('globalModeBtn');
  button.classList.toggle('is-active',state.globalView);
  button.setAttribute('aria-pressed',String(state.globalView));
  button.innerHTML=state.globalView?'← 개별 국가 보기':'◎ 전 세계 한눈에 보기 <span aria-hidden="true">↗</span>';
  renderAll();refreshGlobe();
  say(state.globalView?`WVS ${state.wave}차에 참여한 국가 전체를 비교하고 있어요. 위의 조사 차수를 변경할 수 있어요.`:'국가별 조사 이력 보기로 돌아왔어요.');
}
function renderAll(){if(state.globalView){renderGlobalOverview();return}renderWaveTimeline();summaryCards();happinessCharts();satisfactionCharts();trendCharts();matrixCharts();ageCharts();insights();}
function setAgeBand(key){state.band=key;const pairs={'all':['',''],'18+':[18,110],'18-29':[18,29],'30-44':[30,44],'45-59':[45,59],'60+':[60,110]};const [min,max]=pairs[key]||[18,110];$('ageMin').value=min;$('ageMax').value=max;document.querySelectorAll('[data-age]').forEach(b=>b.classList.toggle('is-active',b.dataset.age===key));renderAll();refreshGlobe();say(`연령 범위를 '${key==='all'?'전체 응답 연령':key==='60+'?'60세 이상':key+'세'}'으로 변경했어요.`)}
function applyCustomAge(){const m=+$('ageMin').value,n=+$('ageMax').value;if(!Number.isFinite(m)||!Number.isFinite(n)||m>n||m<13||n>110){say('연령 범위를 13~110세 사이로 올바르게 입력해주세요.');return}const key=Object.keys({'18+':[18,110],'18-29':[18,29],'30-44':[30,44],'45-59':[45,59],'60+':[60,110]}).find(k=>({'18+':[18,110],'18-29':[18,29],'30-44':[30,44],'45-59':[45,59],'60+':[60,110]})[k].join()===`${m},${n}`);
 if(key){setAgeBand(key);return}const ranges=[['18-29',18,29],['30-44',30,44],['45-59',45,59],['60+',60,110],['18+',18,110]];const [near,a,b]=ranges.sort((x,y)=>Math.abs(x[1]-m)+Math.abs(x[2]-n)-Math.abs(y[1]-m)-Math.abs(y[2]-n))[0];say(`${m}–${n}세는 사전 검증된 집계 구간이 아니어서 수치를 제공하지 않아요. 가까운 지원 구간 '${a}–${b}세'를 이용할 수 있어요. 위의 빠른 선택 버튼을 직접 눌러주세요.`);state.band='unsupported';document.querySelectorAll('[data-age]').forEach(b=>b.classList.remove('is-active'));renderAll();refreshGlobe()}
export async function setupWorld({toast}){if(state.ready)return;try{const [raw,geo]=await Promise.all([fetch(new URL('./wvs-summary.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('WVS data missing');return r.json()}),fetch(new URL('./world.geojson',import.meta.url)).then(r=>{if(!r.ok)throw Error('Geographic data missing');return r.json()})]);state.raw=raw;state.geo=geo;for(const c of raw.countries){state.byCode.set(c.code,c);state.byNumeric.set(c.numeric,c)}$('countryOptions').innerHTML=raw.countries.slice().sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(c=>`<option value="${esc(c.name)}">${esc(c.code)}</option>`).join('');state.ready=true;}
 catch(e){console.error('World data load error',e);$('worldNotice').textContent='통계 데이터를 읽지 못했어요. 파일을 직접 더블클릭하지 말고 로컬 서버 또는 GitHub Pages에서 열어주세요.';$('worldData').innerHTML='<div class="chart-empty">WVS 요약 데이터 파일을 불러올 수 없어요.</div>';return}
 $('globalModeBtn').addEventListener('click',()=>setGlobalMode(!state.globalView));
 $('waveAllBtn')?.addEventListener('click',()=>{state.wave='latest';state.surveyId=null;$('waveFilter').value='latest';renderAll();refreshGlobe();say('선택 국가의 전체 조사 흐름을 다시 보고 있어요.');});
 $('countryAddBtn').addEventListener('click',()=>{let val=$('countrySearch').value.trim();const c=state.raw.countries.find(x=>x.name===val||x.code.toLowerCase()===val.toLowerCase()||x.nameEn.toLowerCase()===val.toLowerCase())||state.raw.countries.find(x=>x.name.includes(val)&&val.length>=2);if(c){selectCountry(c.code);$('countrySearch').value=''}else say('일치하는 국가를 찾지 못했어요. 국가 이름을 다시 확인해주세요.')});
 $('countrySearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('countryAddBtn').click()}});
 $('waveFilter').addEventListener('change',e=>{state.wave=e.target.value;if(state.globalView&&state.wave==='latest'){state.wave='7';e.target.value='7'}state.surveyId=null;renderAll();refreshGlobe();say(state.globalView?`WVS ${state.wave}차 전체 참여국의 통계로 갱신했어요.`:'선택한 조사 차수로 갱신했어요. 시간의 흐름은 아래 선 그래프에서 이어서 확인할 수 있어요.')});
 document.querySelectorAll('[data-age]').forEach(b=>b.addEventListener('click',()=>setAgeBand(b.dataset.age)));
 $('ageApplyBtn').addEventListener('click',applyCustomAge);
 document.querySelectorAll('#globalRankMetric [data-global-metric]').forEach(b=>b.addEventListener('click',()=>{state.globalMetric=b.dataset.globalMetric;document.querySelectorAll('#globalRankMetric button').forEach(x=>x.classList.toggle('active',x===b));globalRanking();refreshGlobe()}));
 document.querySelectorAll('#trendMetric [data-trend-metric]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.trendMetric;if(state.trendMetrics.has(key)&&state.trendMetrics.size>1){state.trendMetrics.delete(key);b.classList.remove('active');b.setAttribute('aria-pressed','false');}else{state.trendMetrics.add(key);b.classList.add('active');b.setAttribute('aria-pressed','true');}trendCharts();}));
 document.querySelectorAll('#matrixMode [data-bins]').forEach(b=>b.addEventListener('click',()=>{state.matrixBins=+b.dataset.bins;document.querySelectorAll('#matrixMode button').forEach(x=>x.classList.toggle('active',x===b));matrixCharts()}));
 state.selected=['KOR'];refreshSelection();requestAnimationFrame(initGlobe);
}
export function onWorldShow(){state.globe?.resumeAnimation?.();state.globe?.width?.($('globeMount').clientWidth);state.globe?.height?.($('globeMount').clientHeight)}
export function onWorldHide(){state.globe?.pauseAnimation?.()}
