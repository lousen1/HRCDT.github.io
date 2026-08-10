const exercises=[
  {t:"热身",m:5,d:"跑步机快走 · 坡度 3 · 速度 4.5，微出汗即可",i:"↗"},
  {t:"基础有氧",m:30,d:"爬坡 · 坡度 9 · 速度 4.5",i:"∿"},
  {t:"慢跑",m:20,d:"坡度 1 · 速度 5",i:"▷"},
  {t:"走路",m:5,d:"坡度 1 · 速度 4",i:"→"},
  {t:"基础力量",m:50,d:"靠墙静蹲 · 臀桥 · 肩胛滑动 · 平板支撑",i:"◇"},
  {t:"拉伸放松",m:10,d:"胸大肌 · 髋腰肌 · 下犬式 · 婴儿式",i:"⌒"},
  {t:"结束整理",m:2,d:"补水、洗澡、放松呼吸",i:"·"}
];
const rewards=[
  {id:"milktea",icon:"🧋",title:"一杯奶茶",cost:200,note:"兑换一杯自己喜欢的奶茶"},
  {id:"dinner",icon:"🍽️",title:"周末外食特权",cost:500,note:"安心享受一顿喜欢的饭"},
  {id:"cart",icon:"🛒",title:"购物车清空券",cost:800,note:"可选一件，价格不超过 300 元"},
  {id:"concert",icon:"🎫",title:"汪苏泷演唱会看台票",cost:1000,note:"一张价值 680 元的看台票"}
];
const $=id=>document.getElementById(id);
const iso=d=>{const x=d||new Date(),o=x.getTimezoneOffset();return new Date(x-o*60000).toISOString().slice(0,10)};
const asDate=s=>new Date(s+"T12:00:00");
const addDays=(s,n)=>{const d=asDate(s);d.setDate(d.getDate()+n);return iso(d)};
const monday=s=>{const d=asDate(s),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return iso(d)};
const pretty=s=>{const d=asDate(s);return `${d.getMonth()+1}月${d.getDate()}日`};
const inRange=(s,start,end)=>s>=start&&s<end;

let records=[],completed={},safetyBackup=null;
try{safetyBackup=JSON.parse(localStorage.getItem("shou-safety-backup-v1")||"null")}catch(e){}
try{records=JSON.parse(localStorage.getItem("shou-records")||"[]");completed=JSON.parse(localStorage.getItem("shou-workouts")||"{}") }catch(e){}
if(!Array.isArray(records))records=[];
if(!completed||typeof completed!=="object"||Array.isArray(completed))completed={};
if(!records.length&&Array.isArray(safetyBackup?.records)&&safetyBackup.records.length)records=safetyBackup.records;
if(!Object.keys(completed).length&&safetyBackup?.completed&&typeof safetyBackup.completed==="object"&&!Array.isArray(safetyBackup.completed))completed=safetyBackup.completed;
const today=iso(),thisMonday=monday(today),startedMonday=monday(today);
const bankDefault={version:2,startedAt:today,firstFullWeek:today===startedMonday?startedMonday:addDays(startedMonday,7),ledger:[],water:{},partner:{},settlements:{},weightChecks:{},redemptions:[]};
let bank=bankDefault;
try{const old=JSON.parse(localStorage.getItem("shou-bank-v2")||"null");if(old)bank={...bankDefault,...old,ledger:old.ledger||[],water:old.water||{},partner:old.partner||{},settlements:old.settlements||{},weightChecks:old.weightChecks||{},redemptions:old.redemptions||[]}}catch(e){}
if(!bank.ledger.length&&Array.isArray(safetyBackup?.bank?.ledger)&&safetyBackup.bank.ledger.length){const old=safetyBackup.bank;bank={...bankDefault,...old,ledger:old.ledger||[],water:old.water||{},partner:old.partner||{},settlements:old.settlements||{},weightChecks:old.weightChecks||{},redemptions:old.redemptions||[]}}
bank.ledger.forEach(x=>{if(x.id?.startsWith('water:')&&x.label==="喝够 2 升水")x.label="喝够 1.5 升水"});

$('date').value=today;
const currentDate=()=>$('date').value;
const currentRecord=()=>records.find(r=>r.date===currentDate())||{date:currentDate(),morning:"",evening:"",calories:""};
const hasEntry=id=>bank.ledger.some(x=>x.id===id);
const balance=()=>bank.ledger.reduce((sum,x)=>sum+Number(x.points||0),0);
const saveAll=()=>{const snapshot={version:1,savedAt:new Date().toISOString(),records,completed,bank};localStorage.setItem("shou-safety-backup-v1",JSON.stringify(snapshot));localStorage.setItem("shou-records",JSON.stringify(records));localStorage.setItem("shou-workouts",JSON.stringify(completed));localStorage.setItem("shou-bank-v2",JSON.stringify(bank))};
const addEntry=(id,points,label,icon,date,detail="")=>{if(hasEntry(id))return false;bank.ledger.push({id,points,label,icon,date:date||today,detail,createdAt:new Date().toISOString()});return true};

let toastTimer;
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function waterSound(){try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C();[0,.13,.25].forEach((delay,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=180-i*25;g.gain.setValueAtTime(.0001,ctx.currentTime+delay);g.gain.exponentialRampToValueAtTime(.16,ctx.currentTime+delay+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+.12);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+.14)})}catch(e){}}

function processWeightCheck(date){
  if(monday(date)!==date||bank.weightChecks[date])return 0;
  const now=records.find(r=>r.date===date),prevDate=addDays(date,-7),prev=records.find(r=>r.date===prevDate);
  if(!now?.morning||!prev?.morning)return 0;
  const drop=Math.max(0,Number(prev.morning)-Number(now.morning)),fifths=Math.floor(drop/0.2+1e-6),wholeJin=Math.floor(drop+1e-6),points=fifths*5+wholeJin*30;
  bank.weightChecks[date]={previous:Number(prev.morning),current:Number(now.morning),drop:Number(drop.toFixed(2)),points};
  if(points>0)addEntry(`loss:${date}`,points,`体重下降 ${drop.toFixed(1)}斤`,"↘",date,`比 ${pretty(prevDate)} 轻了`);
  return points;
}

function settleWeeks(){
  let week=bank.firstFullWeek,changed=false;
  while(addDays(week,7)<=thisMonday){
    if(!bank.settlements[week]){
      const end=addDays(week,7),count=bank.ledger.filter(x=>x.id.startsWith('workout:')&&inRange(x.date,week,end)).length;
      const rankPoints=count<2?-80:count>=3?60:0,rank=count<2?"青铜段位":count===2?"白银段位":"黄金段位";
      addEntry(`weekly:${week}`,rankPoints,`${rank}周结算`,rankPoints<0?"↓":"🏆",end,`共锻炼 ${count} 次`);
      const full=Array.from({length:7},(_,i)=>records.find(r=>r.date===addDays(week,i))).every(r=>r?.morning&&r?.evening);
      if(full)addEntry(`attendance:${week}`,20,"满勤王","👑",end,"一周早晚体重全勤");
      bank.settlements[week]={count,rank,rankPoints,full,settledAt:new Date().toISOString()};changed=true;
    }
    week=addDays(week,7);
  }
  if(changed)saveAll();
}

function bootstrapToday(){
  const r=records.find(x=>x.date===today);let changed=false;
  if(r?.morning)changed=addEntry(`morning:${today}`,10,"早体重","◔",today)||changed;
  if(r?.evening)changed=addEntry(`evening:${today}`,10,"晚体重","◑",today)||changed;
  const done=completed[today]||[],minutes=done.reduce((sum,x,i)=>sum+(x?exercises[i]?.m||0:0),0);
  if(minutes>=20)changed=addEntry(`workout:${today}`,30,"完成锻炼","◇",today,`${minutes} 分钟`)||changed;
  if(changed)saveAll();
}

function refreshHeader(){const score=balance();$('headerScore').textContent=score;$('bankBalance').textContent=score}
function refreshRecord(){
  const r=currentRecord();$('morning').value=r.morning;$('evening').value=r.evening;$('calories').value=r.calories;
  $('recordTitle').textContent=currentDate()===today?"今日记录":pretty(currentDate());$('recordStatus').textContent=r.morning||r.evening||r.calories?"已填写":"待记录";
  const sorted=records.filter(x=>x.morning||x.evening).sort((a,b)=>a.date.localeCompare(b.date)),latest=sorted.at(-1),first=sorted[0],lw=latest&&(latest.evening||latest.morning),fw=first&&(first.morning||first.evening);
  $('latestWeight').textContent=lw||"--";const c=lw&&fw?Number(lw)-Number(fw):0;$('change').textContent=sorted.length>1?`${c>0?"+":""}${c.toFixed(1)} 斤`:"开始记录";
  const watered=!!bank.water[currentDate()];$('waterBtn').classList.toggle('done',watered);$('waterText').textContent=watered?"已喝完":"喝完了";$('waterBtn').disabled=watered;
  refreshWorkout();refreshHeader();
}

$('recordForm').addEventListener('submit',e=>{
  e.preventDefault();const old=currentRecord(),data={date:currentDate(),morning:$('morning').value,evening:$('evening').value,calories:$('calories').value},i=records.findIndex(r=>r.date===data.date);i<0?records.push(data):records[i]=data;
  let earned=0;if(data.morning&&!old.morning&&addEntry(`morning:${data.date}`,10,"早体重","◔",data.date)){earned+=10;if(data.date===today&&new Date().getHours()<7&&addEntry(`early:${data.date}`,3,"早鸟专属·早安吻","🌅",data.date))earned+=3}
  if(data.evening&&!old.evening&&addEntry(`evening:${data.date}`,10,"晚体重","◑",data.date))earned+=10;
  earned+=processWeightCheck(data.date);saveAll();refreshRecord();refreshBank();$('saveBtn').textContent="✓ 已保存";toast(earned?`已入账 +${earned} 积分`:"今日记录已保存");setTimeout(()=>$('saveBtn').textContent="保存今日记录",1500);
});
$('date').addEventListener('change',()=>{refreshRecord();refreshTrend()});
$('waterBtn').onclick=()=>{if(bank.water[currentDate()])return;bank.water[currentDate()]=true;addEntry(`water:${currentDate()}`,5,"喝够 1.5 升水","💧",currentDate(),"吨吨吨～");saveAll();waterSound();toast("吨吨吨～ +5 积分");refreshRecord();refreshBank()};

function refreshWorkout(){
  const done=completed[currentDate()]||exercises.map(()=>false),n=done.filter(Boolean).length,p=Math.round(n/exercises.length*100),minutes=done.reduce((sum,x,i)=>sum+(x?exercises[i].m:0),0);
  let justEarned=false;if(minutes>=20)justEarned=addEntry(`workout:${currentDate()}`,30,"完成锻炼","◇",currentDate(),`${minutes} 分钟`);if(justEarned){saveAll();toast("训练满 20 分钟，+30 积分")}
  $('miniDone').textContent=n;$('miniRing').style.setProperty('--p',`${p*3.6}deg`);$('miniText').textContent=n===exercises.length?"全部完成，你太棒了":`已完成 ${minutes} 分钟，还有 ${exercises.length-n} 项`;
  $('score').textContent=p;$('progressBar').style.width=p+'%';$('workoutMinutes').textContent=minutes;$('workoutDate').textContent=pretty(currentDate())+' · 完成就点一下';
  const workoutDone=hasEntry(`workout:${currentDate()}`),partnerDone=!!bank.partner[currentDate()];$('partnerBtn').disabled=!workoutDone||partnerDone;$('partnerBtn').classList.toggle('done',partnerDone);$('partnerText').textContent=partnerDone?"好老公勋章":"陪练 +1";
  $('encouragement').textContent=n===exercises.length?"今天全部完成。认真对待自己，就是最好的进步。":"不用一次完成所有，保持呼吸，按你的节奏来。";
  $('workoutList').innerHTML=exercises.map((x,i)=>`<button class="workout-item ${done[i]?'done':''}" data-i="${i}"><span class="wi">${x.i}</span><span class="wc"><span><b>${x.t}</b><em>${x.m} 分钟</em></span><small>${x.d}</small></span><i class="check">${done[i]?'✓':''}</i></button>`).join('');
  document.querySelectorAll('.workout-item').forEach(b=>b.onclick=()=>{const list=[...(completed[currentDate()]||exercises.map(()=>false))];list[Number(b.dataset.i)]=!list[Number(b.dataset.i)];completed[currentDate()]=list;saveAll();refreshWorkout();refreshHeader();refreshBank()});refreshHeader();
}
$('partnerBtn').onclick=()=>{if(!hasEntry(`workout:${currentDate()}`)||bank.partner[currentDate()])return;bank.partner[currentDate()]=true;addEntry(`partner:${currentDate()}`,10,"夫妻同心·陪练","🤝",currentDate(),"好老公勋章");saveAll();toast("夫妻同心，+10 积分");refreshWorkout();refreshBank()};

function drawChart(points){
  const c=$('chart'),ratio=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;c.width=w*ratio;c.height=h*ratio;const x=c.getContext('2d');x.scale(ratio,ratio);
  const vals=points.flatMap(p=>[p.morning,p.evening]).filter(Boolean).map(Number),mn=Math.floor(Math.min(...vals)-1),mx=Math.ceil(Math.max(...vals)+1),pad={l:12,r:12,t:18,b:25};
  const px=i=>pad.l+(points.length===1?(w-pad.l-pad.r)/2:i*(w-pad.l-pad.r)/(points.length-1)),py=v=>pad.t+(mx-v)*(h-pad.t-pad.b)/Math.max(mx-mn,1);
  x.strokeStyle='#e8e7e0';x.lineWidth=1;for(let i=0;i<4;i++){const y=pad.t+i*(h-pad.t-pad.b)/3;x.beginPath();x.moveTo(pad.l,y);x.lineTo(w-pad.r,y);x.stroke()}
  function line(k,color){const a=points.map((p,i)=>({i,v:p[k]})).filter(z=>z.v);if(!a.length)return;x.strokeStyle=color;x.lineWidth=3;x.lineCap='round';x.lineJoin='round';x.beginPath();a.forEach((z,j)=>j?x.lineTo(px(z.i),py(Number(z.v))):x.moveTo(px(z.i),py(Number(z.v))));x.stroke();a.forEach(z=>{x.fillStyle='#fff';x.beginPath();x.arc(px(z.i),py(Number(z.v)),4.5,0,Math.PI*2);x.fill();x.strokeStyle=color;x.stroke()})}
  line('morning','#bddb39');line('evening','#20231d');x.fillStyle='#898d82';x.font='10px sans-serif';x.textAlign='center';points.forEach((p,i)=>{if(i===0||i===points.length-1||points.length<7)x.fillText(pretty(p.date),px(i),h-6)});
}
function refreshTrend(){
  const points=records.filter(r=>r.morning||r.evening).sort((a,b)=>a.date.localeCompare(b.date)).slice(-14),sorted=records.filter(r=>r.morning||r.evening).sort((a,b)=>a.date.localeCompare(b.date));
  $('chart').style.display=points.length?'block':'none';$('chartEmpty').style.display=points.length?'none':'grid';if(points.length)requestAnimationFrame(()=>drawChart(points));
  const first=sorted[0],last=sorted.at(-1),fw=first&&(first.morning||first.evening),lw=last&&(last.evening||last.morning),ch=fw&&lw?Number(lw)-Number(fw):null;
  $('startWeight').textContent=fw||'--';$('totalChange').textContent=ch===null?'--':`${ch>0?'+':''}${ch.toFixed(1)}`;$('recordDays').textContent=sorted.length;
  const rows=[...records].filter(r=>r.morning||r.evening||r.calories).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);$('historyList').innerHTML=rows.length?rows.map(r=>`<div class="history-row"><span>${pretty(r.date)}</span><b>${r.morning||'--'} / ${r.evening||'--'} 斤</b><em>${r.calories||'--'} kcal</em></div>`).join(''):'<p class="history-empty">还没有记录，从今天开始吧。</p>';
}

function weekWorkoutCount(){const start=monday(today),end=addDays(start,7);return bank.ledger.filter(x=>x.id.startsWith('workout:')&&inRange(x.date,start,end)).length}
function refreshBank(){
  refreshHeader();const count=weekWorkoutCount(),rank=count<2?"青铜段位":count===2?"白银段位":"黄金段位";$('rankName').textContent=rank;$('rankCount').textContent=`${count} / 3 次`;$('rankBar').style.width=Math.min(count/3*100,100)+'%';$('rankHint').textContent=count<2?`本周再训练 ${2-count} 次即可保级。`:count===2?"已成功保级，再练 1 次晋级黄金。":"黄金达成，周结算可获 +60 分。";
  const money=balance();$('rewardList').innerHTML=rewards.map(r=>`<article class="reward"><span>${r.icon}</span><h3>${r.title}</h3><p>${r.note}</p><button data-reward="${r.id}" ${money<r.cost?'disabled':''}>兑换 <b>${r.cost}</b> 分</button></article>`).join('');document.querySelectorAll('[data-reward]').forEach(b=>b.onclick=()=>redeem(b.dataset.reward));
  const rows=[...bank.ledger].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30);$('ledgerList').innerHTML=rows.length?rows.map(x=>`<div class="ledger-row"><span>${x.icon||'🪙'}</span><div><b>${x.label}</b><small>${pretty(x.date)}${x.detail?' · '+x.detail:''}</small></div><strong class="${x.points<0?'minus':''}">${x.points>0?'+':''}${x.points}</strong></div>`).join(''):'<p class="ledger-empty">还没有流水，从今天开始赚第一笔吧。</p>';
}
function redeem(id){
  const r=rewards.find(x=>x.id===id);if(!r||balance()<r.cost){toast("积分还不够，再赚一点点");return}if(!confirm(`确认用 ${r.cost} 积分兑换“${r.title}”吗？`))return;
  const code='SHOU-'+Date.now().toString(36).slice(-6).toUpperCase(),entryId='redeem:'+Date.now();addEntry(entryId,-r.cost,`兑换·${r.title}`,r.icon,today,code);bank.redemptions.push({id:entryId,rewardId:r.id,title:r.title,code,date:today});saveAll();refreshBank();showVoucher(r,code);toast(`兑换成功 -${r.cost} 积分`);
}
function showVoucher(r,code){const payload=`瘦APP兑换凭证|${r.title}|${code}|${today}`;$('voucherTitle').textContent=r.title;$('voucherCode').textContent=code;$('voucherNote').textContent=r.note;$('voucherQr').src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data='+encodeURIComponent(payload);$('voucherModal').classList.add('open');$('voucherModal').setAttribute('aria-hidden','false')}
$('closeVoucher').onclick=()=>{$('voucherModal').classList.remove('open');$('voucherModal').setAttribute('aria-hidden','true')};$('voucherModal').onclick=e=>{if(e.target===$('voucherModal'))$('closeVoucher').click()};
document.querySelectorAll('[data-bank-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-bank-tab]').forEach(x=>x.classList.toggle('active',x===b));['store','ledger','rules'].forEach(x=>$('bank'+x[0].toUpperCase()+x.slice(1)).classList.toggle('active',x===b.dataset.bankTab))});

function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));if(id==='trend')refreshTrend();if(id==='bank')refreshBank()}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('goWorkout').onclick=()=>showPage('workout');$('scorePill').onclick=()=>showPage('bank');window.addEventListener('resize',()=>{if($('trend').classList.contains('active'))refreshTrend()});

$('exportBackup').onclick=()=>{const payload={version:1,exportedAt:new Date().toISOString(),records,completed,bank};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`shou-backup-${today}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('备份已导出，请保存到“文件”')};
$('importBackup').onchange=event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const payload=JSON.parse(String(reader.result||'')),validRecords=Array.isArray(payload.records),validCompleted=payload.completed&&typeof payload.completed==='object'&&!Array.isArray(payload.completed),validBank=payload.bank&&Array.isArray(payload.bank.ledger);if(!validRecords||!validCompleted||!validBank)throw new Error('invalid backup');if(!confirm('恢复备份会用文件中的记录和积分替换当前数据，确认继续吗？'))return;records=payload.records;completed=payload.completed;const old=payload.bank;bank={...bankDefault,...old,ledger:old.ledger||[],water:old.water||{},partner:old.partner||{},settlements:old.settlements||{},weightChecks:old.weightChecks||{},redemptions:old.redemptions||[]};saveAll();alert('恢复成功，页面将重新打开。');location.reload()}catch(e){toast('备份文件无法识别')}finally{event.target.value=''}};reader.readAsText(file,'utf-8')};

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=2').catch(()=>{}));

bootstrapToday();settleWeeks();processWeightCheck(today);saveAll();refreshRecord();refreshTrend();refreshBank();
