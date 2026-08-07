const exercises=[
  {t:"热身",m:"5 分钟",d:"跑步机快走 · 坡度 3 · 速度 4.5，微出汗即可",i:"↗"},
  {t:"基础有氧",m:"25 分钟",d:"爬坡 · 坡度 9 · 速度 4.5",i:"∿"},
  {t:"慢跑",m:"15 分钟",d:"坡度 1 · 速度 5",i:"▷"},
  {t:"走路",m:"5 分钟",d:"坡度 1 · 速度 4",i:"→"},
  {t:"基础力量",m:"15 分钟",d:"靠墙静蹲 · 臀桥 · 肩胛滑动 · 平板支撑",i:"◇"},
  {t:"拉伸放松",m:"10 分钟",d:"胸大肌 · 髋腰肌 · 下犬式 · 婴儿式",i:"⌒"},
  {t:"结束整理",m:"2 分钟",d:"补水、洗澡、放松呼吸",i:"·"}
];
const $=id=>document.getElementById(id);
const iso=d=>{const x=d||new Date(),o=x.getTimezoneOffset();return new Date(x-o*60000).toISOString().slice(0,10)};
const pretty=s=>{const d=new Date(s+"T00:00:00");return `${d.getMonth()+1}月${d.getDate()}日`};
let records=[],completed={};
try{records=JSON.parse(localStorage.getItem("shou-records")||"[]");completed=JSON.parse(localStorage.getItem("shou-workouts")||"{}") }catch(e){}
$('date').value=iso();
const currentDate=()=>$('date').value;
const currentRecord=()=>records.find(r=>r.date===currentDate())||{date:currentDate(),morning:"",evening:"",calories:""};
const saveAll=()=>{localStorage.setItem("shou-records",JSON.stringify(records));localStorage.setItem("shou-workouts",JSON.stringify(completed))};

function refreshRecord(){
  const r=currentRecord(); $('morning').value=r.morning;$('evening').value=r.evening;$('calories').value=r.calories;
  $('recordTitle').textContent=currentDate()===iso()?"今日记录":pretty(currentDate());
  $('recordStatus').textContent=r.morning||r.evening||r.calories?"已填写":"待记录";
  const sorted=records.filter(x=>x.morning||x.evening).sort((a,b)=>a.date.localeCompare(b.date));
  const latest=sorted.at(-1),first=sorted[0],lw=latest&&(latest.evening||latest.morning),fw=first&&(first.morning||first.evening);
  $('latestWeight').textContent=lw||"--";
  const c=lw&&fw?Number(lw)-Number(fw):0;$('change').textContent=sorted.length>1?`${c>0?"+":""}${c.toFixed(1)} kg`:"开始记录";
  refreshWorkout();
}

$('recordForm').addEventListener('submit',e=>{
  e.preventDefault();const data={date:currentDate(),morning:$('morning').value,evening:$('evening').value,calories:$('calories').value};
  const i=records.findIndex(r=>r.date===data.date);i<0?records.push(data):records[i]=data;saveAll();refreshRecord();
  $('saveBtn').textContent="✓ 已保存";setTimeout(()=>$('saveBtn').textContent="保存今日记录",1500);
});
$('date').addEventListener('change',()=>{refreshRecord();refreshTrend()});

function refreshWorkout(){
  const done=completed[currentDate()]||exercises.map(()=>false),n=done.filter(Boolean).length,p=Math.round(n/exercises.length*100);
  $('miniDone').textContent=n;$('miniRing').style.setProperty('--p',`${p*3.6}deg`);$('miniText').textContent=n===exercises.length?"全部完成，你太棒了":`还有 ${exercises.length-n} 项，一点点来`;
  $('score').textContent=p;$('progressBar').style.width=p+'%';$('workoutDate').textContent=pretty(currentDate())+' · 完成就点一下';
  $('encouragement').textContent=n===exercises.length?"今天全部完成。认真对待自己，就是最好的进步。":"不用一次完成所有，保持呼吸，按你的节奏来。";
  $('workoutList').innerHTML=exercises.map((x,i)=>`<button class="workout-item ${done[i]?'done':''}" data-i="${i}"><span class="wi">${x.i}</span><span class="wc"><span><b>${x.t}</b><em>${x.m}</em></span><small>${x.d}</small></span><i class="check">${done[i]?'✓':''}</i></button>`).join('');
  document.querySelectorAll('.workout-item').forEach(b=>b.onclick=()=>{const list=[...(completed[currentDate()]||exercises.map(()=>false))];list[Number(b.dataset.i)]=!list[Number(b.dataset.i)];completed[currentDate()]=list;saveAll();refreshWorkout()});
}

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
  const rows=[...records].filter(r=>r.morning||r.evening||r.calories).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
  $('historyList').innerHTML=rows.length?rows.map(r=>`<div class="history-row"><span>${pretty(r.date)}</span><b>${r.morning||'--'} / ${r.evening||'--'} kg</b><em>${r.calories||'--'} kcal</em></div>`).join(''):'<p class="history-empty">还没有记录，从今天开始吧。</p>';
}

function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));if(id==='trend')refreshTrend()}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('goWorkout').onclick=()=>showPage('workout');window.addEventListener('resize',()=>{if($('trend').classList.contains('active'))refreshTrend()});
refreshRecord();refreshTrend();
