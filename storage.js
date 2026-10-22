/** Local journal persistence. Demo records are NEVER written here. */
const DB_NAME='emotional-atlas-v1'; const DB_STORE='records'; const REP_STORE='representatives';
let opening=null;
function openDB(){
  if(!('indexedDB' in window))return Promise.resolve(null);
  if(opening)return opening;
  opening=new Promise(resolve=>{
    try{
      const r=indexedDB.open(DB_NAME,1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE,{keyPath:'id'});if(!r.result.objectStoreNames.contains(REP_STORE))r.result.createObjectStore(REP_STORE,{keyPath:'date'});};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);r.onblocked=()=>resolve(null);
    }catch{resolve(null)}
  });return opening;
}
const fallbackKey=name=>`emotional-atlas-${name}-v1`;
async function getAll(name){
  const db=await openDB();
  if(!db){try{return JSON.parse(localStorage.getItem(fallbackKey(name))||'[]')}catch{return []}}
  return new Promise(resolve=>{try{const r=db.transaction(name,'readonly').objectStore(name).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>resolve([])}catch{resolve([])}});
}
async function put(name,value){
  const db=await openDB();
  if(!db){const data=await getAll(name);const key=name===DB_STORE?'id':'date';const idx=data.findIndex(x=>x[key]===value[key]);if(idx>=0)data[idx]=value;else data.push(value);localStorage.setItem(fallbackKey(name),JSON.stringify(data));return;}
  return new Promise((resolve,reject)=>{try{const r=db.transaction(name,'readwrite').objectStore(name).put(value);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)}catch(e){reject(e)}})
}
async function remove(name,key){
  const db=await openDB();if(!db){const data=await getAll(name);localStorage.setItem(fallbackKey(name),JSON.stringify(data.filter(x=>(name===DB_STORE?x.id:x.date)!==key)));return;}
  return new Promise((resolve,reject)=>{try{const r=db.transaction(name,'readwrite').objectStore(name).delete(key);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)}catch(e){reject(e)}})
}
export const records={all:()=>getAll(DB_STORE),put:value=>put(DB_STORE,value),remove:id=>remove(DB_STORE,id)};
export const representatives={all:()=>getAll(REP_STORE),put:value=>put(REP_STORE,value),remove:date=>remove(REP_STORE,date)};
