const STORAGE_KEY = "jiaojiaohao:v1";
const SETTINGS_KEY = "jiaojiaohao:settings";
const SYNC_API = "https://vqeaflfiohcuaczudhgf.supabase.co/functions/v1/family-sync";

const catalog = [
  { name:"富贵竹", scientificName:"Dracaena sanderiana", cycle:3, trigger:"每 3 天检查水位，水位不足时补至刚好覆盖根系", light:"明亮散射光", notes:["每 3 天检查并按需补水","每 2–4 周换水并清洗容器"] },
  { name:"袖珍椰子", scientificName:"Chamaedorea elegans", cycle:7, trigger:"表土 2–3 厘米干燥", light:"中等至明亮散射光", notes:["浇透后倒掉托盘积水","避免长期湿涝"] },
  { name:"景天科多肉", scientificName:"Sedum spp.", cycle:14, trigger:"盆土完全干且花盆明显变轻", light:"明亮光照，可接受温和日照", notes:["一次浇透并排尽水","宁干勿频浇"] },
  { name:"巴西木", scientificName:"Dracaena fragrans", cycle:10, trigger:"检查碗碟水位，补水至没过根部约 3 厘米", light:"明亮散射光", notes:["放在碗碟中水养，水深以没过根部约 3 厘米为准","定期换水并清洗碗碟"] },
  { name:"罗汉松", scientificName:"Podocarpus macrophyllus", cycle:7, trigger:"表土约 2 厘米干燥", light:"明亮通风，宜有柔和日照", notes:["保持微润但不积水","通风差时延长间隔"] },
  { name:"文竹", scientificName:"Asparagus setaceus", cycle:5, trigger:"表土 1–2 厘米干燥", light:"明亮散射光", notes:["不要完全干透","空气干燥时适度加湿"] },
  { name:"小叶黄杨", scientificName:"Buxus sinica", cycle:7, trigger:"表土约 2 厘米干燥", light:"明亮通风", notes:["浇透后彻底沥水"] },
  { name:"银龙海芋苔球", scientificName:"Alocasia baginda 'Silver Dragon'", cycle:3, trigger:"苔球表面发干且整体变轻", light:"明亮散射光", notes:["连球浸水 5–10 分钟后沥干","不要长期泡在托盘里"] },
  { name:"姬龟背竹", scientificName:"Monstera adansonii", cycle:14, trigger:"水培时水位低于根系，或水变浑浊", light:"明亮散射光", notes:["水培约 14 天换水","换水时冲洗容器和根系"] },
  { name:"真柏盆景", scientificName:"Juniperus chinensis", cycle:2, trigger:"每 2 天检查，表层刚接近干、内部仍微润时浇透", light:"室外明亮通风并有日照", notes:["不适合长期放在封闭室内","细流浇透"] },
  { name:"观音竹", scientificName:"Bambusa multiplex", cycle:3, seasonalCycle:{springSummer:3,autumnWinter:5}, trigger:"春夏每 3 天、秋冬每 5 天检查；表土约 2 厘米干燥时再浇", light:"明亮散射光至柔和日照", notes:["春夏按 3 天周期，秋冬按 5 天周期","高盆要确认底部能排水"] },
  { name:"天堂鸟", scientificName:"Strelitzia reginae", cycle:10, trigger:"表土 3–5 厘米干燥", light:"明亮光照，可接受日照", notes:["浇透并倒掉托盘水"] },
  { name:"发财树", scientificName:"Pachira aquatica", cycle:14, trigger:"上半盆土已干且花盆明显变轻", light:"明亮散射光", notes:["粗干最怕频繁少量浇水","浇透后彻底沥水"] }
];

const sampleHistory = { "巴西木":"2026-08-01", "银龙海芋苔球":"2026-08-01", "姬龟背竹":"2026-08-01", "真柏盆景":"2026-08-01", "观音竹":"2026-08-01", "天堂鸟":"2026-08-01" };
const sampleFirstDue = { "发财树":"2026-08-04" };
let plants = loadJSON(STORAGE_KEY, []);
let settings = loadJSON(SETTINGS_KEY, { defaultTime:"09:00", imported:false, notified:{} });
settings = { defaultTime:"09:00", imported:false, notified:{}, familyCode:"", familyVersion:0, ...settings };
let installPrompt = null;
let currentFilter = "all";
let syncBusy = false;
let syncPushTimer = null;
let pendingLocalChange = false;

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const addDays = (iso, days) => {
  const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+Number(days));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const diffDays = (iso) => Math.ceil((new Date(`${iso}T12:00:00`) - new Date(`${todayISO()}T12:00:00`))/86400000);
const formatDate = (iso, withWeek=false) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getMonth()+1}月${d.getDate()}日${withWeek ? ` 周${"日一二三四五六"[d.getDay()]}` : ""}`;
};
function loadJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function persistLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(plants)); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function save({sync=true}={}){ persistLocal(); if(sync && settings.familyCode) scheduleFamilyPush(); }
function uid(){ return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }

function cycleFor(plant, dateValue=new Date()){
  if(!plant.seasonalCycle)return Number(plant.cycle);
  const date=typeof dateValue==="string"?new Date(`${dateValue}T12:00:00`):dateValue;
  const month=date.getMonth()+1;
  return month>=3&&month<=8 ? Number(plant.seasonalCycle.springSummer) : Number(plant.seasonalCycle.autumnWinter);
}

function cycleLabel(plant){
  return plant.seasonalCycle ? `春夏 ${plant.seasonalCycle.springSummer} 天 · 秋冬 ${plant.seasonalCycle.autumnWinter} 天` : `每 ${plant.cycle} 天`;
}

function applyCarePlanCorrections(){
  let changed=false;
  const update=(plant,values)=>{ Object.entries(values).forEach(([key,value])=>{ if(JSON.stringify(plant[key])!==JSON.stringify(value)){plant[key]=value;changed=true;} }); };
  plants.forEach(plant=>{
    const oldCycle=Number(plant.cycle);
    if(plant.name==="富贵竹") update(plant,{cycle:3,trigger:"每 3 天检查水位，水位不足时补至刚好覆盖根系",notes:["每 3 天检查并按需补水","每 2–4 周换水并清洗容器"]});
    if(plant.name==="巴西木") update(plant,{trigger:"检查碗碟水位，补水至没过根部约 3 厘米",notes:["放在碗碟中水养，水深以没过根部约 3 厘米为准","定期换水并清洗碗碟"]});
    if(plant.name==="银龙海芋苔球") update(plant,{cycle:3});
    if(plant.name==="真柏盆景") update(plant,{cycle:2,trigger:"每 2 天检查，表层刚接近干、内部仍微润时浇透"});
    if(plant.name==="观音竹") update(plant,{cycle:3,seasonalCycle:{springSummer:3,autumnWinter:5},trigger:"春夏每 3 天、秋冬每 5 天检查；表土约 2 厘米干燥时再浇",notes:["春夏按 3 天周期，秋冬按 5 天周期","高盆要确认底部能排水"]});
    if(plant.lastWatered && oldCycle!==Number(plant.cycle)) plant.nextDue=addDays(plant.lastWatered,cycleFor(plant,plant.lastWatered));
  });
  return changed;
}

function familySnapshot(){
  return { plants, settings:{ defaultTime:settings.defaultTime, imported:Boolean(settings.imported) } };
}

async function familyRequest(payload){
  const response = await fetch(SYNC_API, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
  let data={};
  try { data=await response.json(); } catch {}
  if(!response.ok){ const error=new Error(data.error||"同步失败"); error.status=response.status; error.data=data; throw error; }
  return data;
}

function setSyncStatus(message, state=""){
  const text=$("#syncStatus"), dot=$("#syncDot");
  if(text) text.textContent=message;
  if(dot) dot.className=`sync-dot${state?` ${state}`:""}`;
}

function renderFamilySettings(){
  const connected=Boolean(settings.familyCode);
  $("#familyDisconnected")?.classList.toggle("hidden",connected);
  $("#familyConnected")?.classList.toggle("hidden",!connected);
  if($("#familyCode")) $("#familyCode").textContent=settings.familyCode||"----";
  if(!connected) setSyncStatus("尚未开启，只保存在本机");
  else if(!syncBusy && $("#syncStatus")?.textContent==="尚未开启，只保存在本机") setSyncStatus("已连接 · 自动同步中","online");
}

function setFamilyButtons(disabled){
  ["#createFamily","#joinFamily","#syncNow","#leaveFamily"].forEach(id=>{ const el=$(id); if(el)el.disabled=disabled; });
}

function applyFamilySnapshot(snapshot, version){
  if(!snapshot || !Array.isArray(snapshot.plants)) throw new Error("云端数据格式不正确");
  plants=snapshot.plants;
  if(snapshot.settings && typeof snapshot.settings==="object"){
    settings.defaultTime=snapshot.settings.defaultTime||settings.defaultTime;
    settings.imported=Boolean(snapshot.settings.imported);
  }
  settings.familyVersion=Number(version)||0;
  const corrected=applyCarePlanCorrections();
  pendingLocalChange=false;
  persistLocal();
  if(corrected) scheduleFamilyPush();
  if($("#defaultTime")) $("#defaultTime").value=settings.defaultTime;
  renderToday();
  if($("[data-view='plants']")?.classList.contains("active")) renderPlants();
}

function scheduleFamilyPush(){
  pendingLocalChange=true;
  clearTimeout(syncPushTimer);
  syncPushTimer=setTimeout(pushFamily,700);
}

async function pushFamily(){
  if(!settings.familyCode || syncBusy || !pendingLocalChange)return;
  syncBusy=true; setFamilyButtons(true); setSyncStatus("正在上传本机更新…","busy");
  try{
    const data=await familyRequest({action:"put",code:settings.familyCode,expectedVersion:Number(settings.familyVersion)||0,snapshot:familySnapshot()});
    settings.familyVersion=Number(data.version)||settings.familyVersion;
    pendingLocalChange=false; persistLocal();
    setSyncStatus("已同步到另一台手机","online");
  }catch(error){
    if(error.status===409 && error.data?.snapshot){
      applyFamilySnapshot(error.data.snapshot,error.data.version);
      toast("另一台手机刚有更新，已载入最新记录");
      setSyncStatus("已载入家人的最新记录","online");
    }else{
      setSyncStatus("网络暂时不可用，本机记录会稍后重试","error");
      clearTimeout(syncPushTimer); syncPushTimer=setTimeout(pushFamily,15000);
    }
  }finally{ syncBusy=false; setFamilyButtons(false); renderFamilySettings(); }
}

async function pullFamily({silent=true}={}){
  if(!settings.familyCode || syncBusy)return;
  if(pendingLocalChange){ await pushFamily(); return; }
  syncBusy=true; setFamilyButtons(true); setSyncStatus("正在检查家人的更新…","busy");
  try{
    const data=await familyRequest({action:"get",code:settings.familyCode});
    if(Number(data.version)>Number(settings.familyVersion)){
      applyFamilySnapshot(data.snapshot,data.version);
      if(!silent) toast("已收到家人的最新记录");
    }
    setSyncStatus("已是最新记录","online");
  }catch(error){ setSyncStatus(error.message||"同步失败，请稍后重试","error"); }
  finally{ syncBusy=false; setFamilyButtons(false); renderFamilySettings(); }
}

async function createFamily(){
  if(syncBusy)return;
  syncBusy=true; setFamilyButtons(true); setSyncStatus("正在创建家庭…","busy");
  try{
    const data=await familyRequest({action:"create",displayName:"我的绿植家庭",snapshot:familySnapshot()});
    settings.familyCode=data.code; settings.familyVersion=Number(data.version)||1; pendingLocalChange=false; persistLocal();
    setSyncStatus("家庭已创建并完成同步","online"); renderFamilySettings(); toast("家庭已创建，把邀请码发给家人即可");
  }catch(error){ setSyncStatus(error.message||"创建失败，请稍后重试","error"); toast(error.message||"创建失败"); }
  finally{ syncBusy=false; setFamilyButtons(false); renderFamilySettings(); }
}

async function joinFamily(){
  const input=prompt("请输入家人发给你的 16 位家庭邀请码");
  if(!input)return;
  const code=String(input).toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(code.length!==16){toast("邀请码应为 16 位");return;}
  if(plants.length && !confirm("加入后将使用家庭中的植物和浇水记录，替换这台手机当前的记录。是否继续？"))return;
  syncBusy=true; setFamilyButtons(true); setSyncStatus("正在加入家庭…","busy");
  try{
    const data=await familyRequest({action:"get",code});
    settings.familyCode=data.code; applyFamilySnapshot(data.snapshot,data.version); setSyncStatus("已加入家庭并完成同步","online"); renderFamilySettings(); toast("已加入家庭，记录已同步");
  }catch(error){ setSyncStatus(error.message||"加入失败，请检查邀请码","error"); toast(error.message||"加入失败"); }
  finally{ syncBusy=false; setFamilyButtons(false); renderFamilySettings(); }
}

async function copyFamilyCode(){
  if(!settings.familyCode)return;
  try{ await navigator.clipboard.writeText(settings.familyCode); toast("邀请码已复制"); }
  catch{ prompt("长按复制这个家庭邀请码",settings.familyCode); }
}

function leaveFamily(){
  if(!confirm("退出后，这台手机将停止同步；云端家庭和家人的记录不会删除。是否继续？"))return;
  settings.familyCode=""; settings.familyVersion=0; pendingLocalChange=false; clearTimeout(syncPushTimer); persistLocal(); renderFamilySettings(); toast("这台手机已退出家庭");
}

function showView(name){
  $$(".view").forEach(v=>v.classList.toggle("active",v.dataset.view===name));
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.target===name));
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="plants") renderPlants();
  if(name==="today") renderToday();
  if(name==="settings") { renderFamilySettings(); pullFamily(); }
}

function renderToday(){
  const now = new Date();
  $("#todayLabel").textContent = `${now.getMonth()+1}月${now.getDate()}日 · 周${"日一二三四五六"[now.getDay()]}`;
  $("#importBanner").classList.toggle("hidden", settings.imported || plants.length>0);
  const due = plants.filter(p=>diffDays(p.nextDue)<=0).sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
  $("#dueCount").textContent = due.length;
  $("#dueList").innerHTML = due.length ? due.map(dueCard).join("") : `<div class="empty-card"><strong>今天没有到期的植物</strong><p>看看叶片状态就好，不需要为了打卡而浇水。</p></div>`;
  const upcoming = plants.filter(p=>diffDays(p.nextDue)>0 && diffDays(p.nextDue)<=7).sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
  $("#upcomingList").innerHTML = upcoming.length ? groupUpcoming(upcoming) : `<div class="timeline-item"><time>未来7天</time><p>暂无安排</p></div>`;
  bindPlantActions();
  maybeNotify(due);
}

function dueCard(p){
  const overdue = Math.abs(Math.min(diffDays(p.nextDue),0));
  return `<article class="plant-card" data-id="${p.id}"><div class="plant-avatar"></div><div><h3>${escapeHTML(p.name)}</h3><div class="meta"><span class="tag warn">${overdue ? `已过 ${overdue} 天` : "今天到期"}</span><span class="tag">${cycleLabel(p)}判断</span></div><p class="trigger">${escapeHTML(p.trigger)}</p></div><div class="card-actions"><button class="skip-button" data-action="skip">明天再看</button><button class="water-button" data-action="water">今天已浇水</button></div></article>`;
}

function groupUpcoming(list){
  const groups = new Map();
  list.forEach(p=>{ const key=p.nextDue; groups.set(key,[...(groups.get(key)||[]),p.name]); });
  return [...groups].map(([date,names])=>`<div class="timeline-item"><time>${formatDate(date,true)}</time><p>${names.map(escapeHTML).join("、")}</p></div>`).join("");
}

function renderPlants(){
  let list=[...plants].sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
  if(currentFilter==="due") list=list.filter(p=>diffDays(p.nextDue)<=0);
  if(currentFilter==="soon") list=list.filter(p=>diffDays(p.nextDue)>0&&diffDays(p.nextDue)<=7);
  $("#plantSummary").textContent = plants.length ? `${plants.length} 盆植物 · ${plants.filter(p=>diffDays(p.nextDue)<=0).length} 盆待判断` : "还没有植物，点击下方“添加”开始吧。";
  $("#plantGrid").innerHTML = list.length ? list.map(p=>`<button class="plant-tile" data-detail="${p.id}"><span class="due-dot ${diffDays(p.nextDue)<=0?"overdue":""}"></span><div class="plant-avatar"></div><h3>${escapeHTML(p.name)}</h3><p>${diffDays(p.nextDue)<=0?"现在可以判断":`${formatDate(p.nextDue)}再判断`}</p></button>`).join("") : `<div class="empty-card" style="grid-column:1/-1"><strong>这里还空着</strong><p>点击下方“添加”认识第一盆植物。</p></div>`;
  $$('[data-detail]').forEach(el=>el.onclick=()=>openDetail(el.dataset.detail));
}

function bindPlantActions(){
  $$(".plant-card").forEach(card=>{
    card.querySelector('[data-action="water"]').onclick=()=>markWatered(card.dataset.id);
    card.querySelector('[data-action="skip"]').onclick=()=>postpone(card.dataset.id);
  });
}

function markWatered(id){
  const p=plants.find(x=>x.id===id); if(!p)return;
  p.lastWatered=todayISO(); p.nextDue=addDays(todayISO(),cycleFor(p)); save();
  toast(`${p.name} 已记录，下次 ${formatDate(p.nextDue)}`); renderToday();
}
function postpone(id){ const p=plants.find(x=>x.id===id); if(!p)return; p.nextDue=addDays(todayISO(),1); save(); toast(`${p.name} 调整到明天`); renderToday(); }

function openDetail(id){
  const p=plants.find(x=>x.id===id); if(!p)return;
  $("#detailContent").innerHTML=`<div class="detail-card"><div class="dialog-head"><div><p class="eyebrow">植物档案</p><h2>${escapeHTML(p.name)}</h2><p class="detail-meta">${escapeHTML(p.scientificName||"")} · ${cycleLabel(p)}判断一次</p></div><button data-close>×</button></div><div class="detail-section"><strong>下次判断</strong><p>${formatDate(p.nextDue,true)} ${p.reminderTime||settings.defaultTime}</p></div><div class="detail-section"><strong>真正需要浇水的信号</strong><p>${escapeHTML(p.trigger)}</p></div><div class="detail-section"><strong>光照</strong><p>${escapeHTML(p.light||"明亮散射光")}</p></div><div class="detail-section"><strong>注意事项</strong><ul>${(p.notes||[]).map(n=>`<li>${escapeHTML(n)}</li>`).join("")}</ul></div><div class="dialog-actions"><button class="skip-button" data-delete>删除</button><button class="water-button" data-detail-water>今天已浇水</button></div></div>`;
  const dialog=$("#detailDialog"); dialog.showModal();
  $("[data-close]",dialog).onclick=()=>dialog.close();
  $("[data-detail-water]",dialog).onclick=()=>{dialog.close();markWatered(id);renderPlants();};
  $("[data-delete]",dialog).onclick=()=>{ if(confirm(`删除 ${p.name} 的档案？`)){plants=plants.filter(x=>x.id!==id);save();dialog.close();renderPlants();toast("已删除");} };
}

function importSamples(){
  const today=todayISO();
  plants=catalog.map(item=>{
    const last=sampleHistory[item.name]||null;
    return { id:uid(), name:item.name, scientificName:item.scientificName, cycle:item.cycle, seasonalCycle:item.seasonalCycle, trigger:item.trigger, light:item.light, notes:item.notes, lastWatered:last, nextDue:last?addDays(last,cycleFor(item,last)):(sampleFirstDue[item.name]||today), reminderTime:settings.defaultTime, source:"imported" };
  });
  settings.imported=true; save(); renderToday(); toast("13 盆植物已导入");
}

function openManual(){
  $("#catalogList").innerHTML=[...catalog,{name:"自定义植物",scientificName:"",cycle:7,trigger:"表层介质干燥后再浇水",light:"明亮散射光",notes:[]}].map((p,i)=>`<button class="catalog-item" value="cancel" data-catalog="${i}"><strong>${p.name}</strong><span>${p.cycle} 天</span></button>`).join("");
  const dialog=$("#manualDialog"); dialog.showModal();
  $$('[data-catalog]',dialog).forEach(b=>b.onclick=()=>{ const list=[...catalog,{name:"自定义植物",scientificName:"",cycle:7,trigger:"表层介质干燥后再浇水",light:"明亮散射光",notes:[]}]; fillForm(list[Number(b.dataset.catalog)]); dialog.close(); });
}

function fillForm(data){
  const form=$("#plantForm"); form.classList.remove("hidden");
  form.elements.name.value=data.name||""; form.elements.scientificName.value=data.scientificName||""; form.elements.wateringDays.value=data.wateringDays||data.cycle||7; form.elements.reminderTime.value=settings.defaultTime; form.elements.wateringTrigger.value=data.wateringTrigger||data.trigger||""; form.elements.light.value=data.light||""; form.elements.notes.value=(data.notes||[]).join("\n");
  $("#confidenceBadge").textContent="手动添加";
  form.scrollIntoView({behavior:"smooth",block:"start"});
}

function submitPlant(event){
  event.preventDefault(); const f=new FormData(event.currentTarget); const cycle=Number(f.get("wateringDays")); const today=todayISO();
  plants.push({id:uid(),name:String(f.get("name")),scientificName:String(f.get("scientificName")),cycle,trigger:String(f.get("wateringTrigger")),light:String(f.get("light")),notes:String(f.get("notes")).split(/\n+/).filter(Boolean),lastWatered:null,nextDue:today,reminderTime:String(f.get("reminderTime")),source:"manual"});
  save(); event.currentTarget.reset(); event.currentTarget.classList.add("hidden"); toast("已保存，今天先判断一次"); showView("today");
}

async function enableNotifications(){
  if(!("Notification" in window)){toast("当前浏览器不支持通知，请使用日历提醒");return;}
  const permission=await Notification.requestPermission(); updatePermission();
  if(permission==="granted"){toast("提醒已开启");renderToday();}
}
function updatePermission(){ const p=("Notification" in window)?Notification.permission:"unsupported"; $("#permissionText").textContent=p==="granted"?"已开启，到期会在打开应用时提醒":p==="denied"?"已被浏览器拒绝，可改用日历":"尚未开启"; }
async function maybeNotify(due){
  if(!due.length||!("Notification" in window)||Notification.permission!=="granted")return; const key=todayISO(); if(settings.notified[key])return;
  const names=due.slice(0,3).map(p=>p.name).join("、"); const reg=await navigator.serviceWorker?.ready; const options={body:`${names}${due.length>3?` 等 ${due.length} 盆`:""}今天可以判断是否需要浇水。`,tag:`plants-${key}`};
  reg?.showNotification?await reg.showNotification("浇浇好 · 今日提醒",options):new Notification("浇浇好 · 今日提醒",options); settings.notified[key]=true; save({sync:false});
}

function exportCalendar(){
  if(!plants.length){toast("先添加植物再导出日历");return;}
  const esc=s=>String(s).replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n");
  const events=plants.map(p=>{ const dt=p.nextDue.replaceAll("-","")+String(p.reminderTime||settings.defaultTime).replace(":","")+"00"; return ["BEGIN:VEVENT",`UID:${p.id}@jiaojiaohao`,`DTSTART;TZID=Asia/Shanghai:${dt}`,`RRULE:FREQ=DAILY;INTERVAL=${cycleFor(p)}`,`SUMMARY:${esc(p.name)}浇水判断`, `DESCRIPTION:${esc(p.trigger)}`,"BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY",`DESCRIPTION:${esc(p.name)}今天是否需要浇水？`,"END:VALARM","END:VEVENT"].join("\r\n"); }).join("\r\n");
  const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//JiaoJiaoHao//Plant Reminder//ZH\r\nCALSCALE:GREGORIAN\r\n${events}\r\nEND:VCALENDAR`;
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));a.download="浇浇好-绿植提醒.ics";a.click();URL.revokeObjectURL(a.href);toast("日历文件已生成");
}

function toast(message){ const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove("show"),2200); }
function escapeHTML(value){ const div=document.createElement("div");div.textContent=value??"";return div.innerHTML; }

function init(){
  const carePlanChanged=applyCarePlanCorrections();
  if(carePlanChanged) save();
  $$(".bottom-nav button").forEach(b=>b.onclick=()=>showView(b.dataset.target));
  $$(".chip").forEach(b=>b.onclick=()=>{$$(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentFilter=b.dataset.filter;renderPlants();});
  $("#importPlants").onclick=importSamples; $("#manualAdd").onclick=openManual; $("#plantForm").onsubmit=submitPlant;
  $("#notificationButton").onclick=enableNotifications; $("#enableNotifications").onclick=enableNotifications; $("#exportCalendar").onclick=exportCalendar;
  $("#createFamily").onclick=createFamily; $("#joinFamily").onclick=joinFamily; $("#copyFamilyCode").onclick=copyFamilyCode; $("#syncNow").onclick=()=>pullFamily({silent:false}); $("#leaveFamily").onclick=leaveFamily;
  $("#defaultTime").value=settings.defaultTime; $("#defaultTime").onchange=e=>{settings.defaultTime=e.target.value;save();toast("默认时间已更新");};
  $("#resetData").onclick=()=>{if(confirm(settings.familyCode?"清空后会同步到家人的手机，确定清空全部植物档案吗？":"清空所有植物档案和设置？")){plants=[];settings={...settings,defaultTime:"09:00",imported:false,notified:{}};save();renderToday();toast("植物档案已清空");}};
  $("#installApp").onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else toast("请在浏览器菜单中选择“添加到主屏幕”");};
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#installText").textContent="已准备好安装到桌面";});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){renderToday();pullFamily();}});
  window.addEventListener("online",()=>pullFamily({silent:false}));
  setInterval(()=>{if(!document.hidden)pullFamily();},15000);
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
  updatePermission();renderFamilySettings();renderToday();pullFamily();
}
document.addEventListener("DOMContentLoaded",init);

