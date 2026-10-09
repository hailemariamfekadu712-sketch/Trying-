const SUBJECTS={6:["math","english","science"],8:["math","english","science"],12:["math","english","physics","chemistry","biology"]};
const NAME={math:"Mathematics",english:"English",science:"Science",physics:"Physics",chemistry:"Chemistry",biology:"Biology",review:"Review"};
const K={s:"hec_settings",p:"hec_progress",a:"hec_attempts",b:"hec_bookmarks",v:"hec_version",u:"hec_unfinished"};
const $=s=>document.querySelector(s),app=$("#app"),cache={};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
function warn(m){const w=$("#warn");if(w){w.hidden=false;w.textContent=m||"Browser storage is unavailable or full. Progress cannot be saved."}}
const Store={
 get(k,d){try{const r=localStorage.getItem(k);if(r===null)return d;const v=JSON.parse(r);
  return (v!==null&&typeof v==="object"&&Array.isArray(v)===Array.isArray(d))?v:d}catch(e){return d}},
 set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){warn();return false}},
 del(k){try{localStorage.removeItem(k)}catch(e){}}
};
Store.set(K.v,{version:1});
let grade=[6,8,12].includes(Store.get(K.s,{}).grade)?Store.get(K.s,{}).grade:12,A=null,Q=[],T=null;
async function bank(f){if(cache[f])return cache[f];const r=await fetch(f+".json");if(!r.ok)throw new Error(f);const d=await r.json();if(!Array.isArray(d))throw new Error(f);return cache[f]=d}
async function getQs(ids){const fs=[...new Set(ids.map(i=>i.split("-").slice(0,2).join("-")))];
 const all=(await Promise.all(fs.map(bank))).flat(),m=new Map(all.map(q=>[q.id,q]));return ids.map(i=>m.get(i)).filter(Boolean)}
function setGrade(g){grade=g;Store.set(K.s,{grade:g});home()}
async function home(){
 clearInterval(T);A=null;const un=Store.get(K.u,null);
 let h=`<h2>Choose your grade</h2><div class="row">`+[6,8,12].map(g=>`<button class="chip ${g==grade?"on":""}" onclick="setGrade(${g})">Grade ${g}</button>`).join("")+`</div>`;
 if(un&&Array.isArray(un.qids))h+=`<div class="card">Unfinished: ${esc(un.label)} (${Object.keys(un.answers||{}).length}/${un.qids.length} answered)<br><button onclick="resume()">Resume</button><button class="ghost" onclick="discard()">Discard</button></div>`;
 app.innerHTML=h+`<h2>Subjects</h2><div class="grid" id="subs"></div>`;
 const g=grade;
 for(const s of SUBJECTS[g]){let n=null;try{n=(await bank(`g${g}-${s}`)).length}catch(e){}
  if(g!==grade)return;
  $("#subs").insertAdjacentHTML("beforeend",`<div class="card"><h3>${NAME[s]}</h3><p class="muted">${n===null?"Questions unavailable (serve the folder over http, e.g. GitHub Pages)":n+" questions"}</p><button ${n?"":"disabled"} onclick="begin('${s}','practice')">Practice</button><button ${n?"":"disabled"} onclick="begin('${s}','mock')">Mock exam</button></div>`)}
}
function discard(){if(confirm("Discard your unfinished attempt?")){Store.del(K.u);home()}}
async function begin(s,mode){
 if(Store.get(K.u,null)&&!confirm("Starting a new attempt will discard your unfinished one. Continue?"))return;
 let qs=[];try{qs=await bank(`g${grade}-${s}`)}catch(e){}
 if(!qs.length)return alert("No questions available.");
 await start({id:"a"+Date.now(),grade,subject:s,mode,label:`Grade ${grade} ${NAME[s]} (${mode})`,qids:qs.map(q=>q.id),answers:{},idx:0,start:Date.now(),limit:mode=="mock"?qs.length*60:0});
}
async function reviewIds(ids,label){
 if(!ids.length)return alert("Nothing to review yet.");
 if(Store.get(K.u,null)&&!confirm("This will discard your unfinished attempt. Continue?"))return;
 await start({id:"a"+Date.now(),grade,subject:"review",mode:"practice",label,qids:ids,answers:{},idx:0,start:Date.now(),limit:0});
}
async function start(a){A=a;try{Q=await getQs(a.qids)}catch(e){Q=[]}
 if(!Q.length){Store.del(K.u);alert("Could not load questions.");return home()}
 A.idx=Math.min(A.idx||0,Q.length-1);save();show()}
function resume(){const u=Store.get(K.u,null);if(u)start(u)}
function save(){Store.set(K.u,A)}
function show(){
 clearInterval(T);
 const left=()=>A.limit-Math.floor((Date.now()-A.start)/1000);
 if(A.limit){if(left()<=0)return finish();T=setInterval(()=>{const l=left();if(l<=0)finish();else if($("#tm"))$("#tm").textContent=fmt(l)},500)}
 const q=Q[A.idx],sel=A.answers[q.id],lock=A.mode!="mock"&&sel!==undefined,star=Store.get(K.b,[]).includes(q.id);
 let h=`<div class="bar"><span>${esc(A.label)}</span>${A.limit?`<b id="tm">${fmt(left())}</b>`:""}</div><p class="muted">Question ${A.idx+1}/${Q.length} · ${esc(q.topic)} <button class="star" onclick="toggleBm()">${star?"★":"☆"}</button></p><h3>${esc(q.question)}</h3>`;
 q.options.forEach((o,i)=>{let c="opt";if(lock){if(i==q.answer)c+=" good";else if(i==sel)c+=" bad"}else if(i===sel)c+=" on";
  h+=`<button class="${c}" ${lock?"disabled":""} onclick="pick(${i})">${"ABCD"[i]}. ${esc(o)}</button>`});
 if(lock)h+=`<div class="card"><b>${sel==q.answer?"Correct!":"Incorrect."}</b> ${esc(q.explanation)}</div>`;
 h+=`<div class="row"><button class="ghost" ${A.idx?"":"disabled"} onclick="go(-1)">Previous</button><button class="ghost" ${A.idx<Q.length-1?"":"disabled"} onclick="go(1)">Next</button><button onclick="ask()">Submit</button></div><div class="row">`+Q.map((x,i)=>`<button class="dot ${A.answers[x.id]!==undefined?"ans":""} ${i==A.idx?"cur":""}" onclick="jump(${i})">${i+1}</button>`).join("")+`</div>`;
 app.innerHTML=h;
}
function pick(i){const q=Q[A.idx];if(A.mode!="mock"&&A.answers[q.id]!==undefined)return;A.answers[q.id]=i;save();show()}
function go(d){A.idx=Math.max(0,Math.min(Q.length-1,A.idx+d));save();show()}
function jump(i){A.idx=i;save();show()}
function toggleBm(){let b=Store.get(K.b,[]);const id=Q[A.idx].id;b=b.includes(id)?b.filter(x=>x!==id):[...b,id];Store.set(K.b,b);show()}
function ask(){const n=Q.length-Object.keys(A.answers).length;if(confirm(n?`${n} question(s) unanswered. Submit now?`:"Submit your answers?"))finish()}
function finish(){
 if(!A||A.done)return;A.done=true;clearInterval(T);
 const end=Date.now(),prog=Object.assign({topics:{},wrong:[],best:{},last:{},days:{}},Store.get(K.p,{}));
 let c=0,w=0,u=0;
 Q.forEach(q=>{const s=A.answers[q.id];if(s===undefined){u++;return}
  const t=`${A.grade}|${A.subject=="review"?q.id.split("-")[1]:A.subject}|${q.topic}`,r=prog.topics[t]=prog.topics[t]||{c:0,n:0};r.n++;
  if(s==q.answer){c++;r.c++;prog.wrong=prog.wrong.filter(x=>x!==q.id)}else{w++;if(!prog.wrong.includes(q.id))prog.wrong.push(q.id)}});
 const pct=Q.length?Math.round(c/Q.length*1000)/10:0,secs=Math.min(Math.floor((end-A.start)/1000),A.limit||1e9);
 const att={id:A.id,grade:A.grade,subject:A.subject,mode:A.mode,label:A.label,total:Q.length,c,w,u,pct,secs,start:A.start,end};
 const key=`${A.grade}-${A.subject}`;prog.best[key]=Math.max(prog.best[key]||0,pct);prog.last[key]=pct;
 const day=new Date(end).toISOString().slice(0,10);prog.days[day]=(prog.days[day]||0)+1;
 const at=Store.get(K.a,[]);at.push(att);Store.set(K.a,at);Store.set(K.p,prog);Store.del(K.u);
 results(att);
}
function results(att){
 let h=`<h2>Results: ${esc(att.label)}</h2><div class="card"><p class="big">${att.pct}%</p><p>Score: ${att.c}/${att.total} · Correct ${att.c} · Incorrect ${att.w} · Unanswered ${att.u} · Time ${fmt(att.secs)}</p></div><div class="row"><button onclick="retry()">Retry</button><button onclick="reviewWrong()">Review mistakes</button><button class="ghost" onclick="home()">Home</button></div><h3>Answers</h3>`;
 Q.forEach((q,i)=>{const s=A.answers[q.id];h+=`<div class="card"><b>${i+1}. ${esc(q.question)}</b><br>Your answer: ${s===undefined?"—":esc(q.options[s])} ${s==q.answer?"✔":"✘"}<br>Correct: ${esc(q.options[q.answer])}<br><span class="muted">${esc(q.explanation)}</span></div>`});
 app.innerHTML=h;
}
function retry(){start({...A,id:"a"+Date.now(),answers:{},idx:0,start:Date.now(),done:false})}
function reviewWrong(){reviewIds(Store.get(K.p,{}).wrong||[],"Review: incorrect answers")}
function streak(days){let n=0,d=new Date();if(!days[d.toISOString().slice(0,10)])d.setDate(d.getDate()-1);
 while(days[d.toISOString().slice(0,10)]){n++;d.setDate(d.getDate()-1)}return n}
function dash(){
 clearInterval(T);const at=Store.get(K.a,[]),p=Object.assign({topics:{},wrong:[],best:{},last:{},days:{}},Store.get(K.p,{})),bm=Store.get(K.b,[]);
 let h=`<h2>Dashboard</h2><div class="card">Completed attempts: <b>${at.length}</b> · Study streak: <b>${streak(p.days)}</b> day(s) · Bookmarks: <b>${bm.length}</b> · Questions to review: <b>${p.wrong.length}</b><br><button onclick="reviewIds(Store.get(K.b,[]),'Review: bookmarks')">Review bookmarks</button><button onclick="reviewWrong()">Review mistakes</button></div>`;
 h+=`<h3>Best scores</h3><table><tr><th>Grade / subject</th><th>Best</th><th>Latest</th></tr>`+(Object.keys(p.best).map(k=>{const[g,s]=k.split("-");return`<tr><td>Grade ${esc(g)} ${esc(NAME[s]||s)}</td><td>${p.best[k]}%</td><td>${p.last[k]}%</td></tr>`}).join("")||`<tr><td colspan=3 class="muted">No completed attempts yet.</td></tr>`)+`</table>`;
 h+=`<h3>Topic performance</h3><table><tr><th>Topic</th><th>Correct</th></tr>`+(Object.keys(p.topics).map(k=>{const[g,s,t]=k.split("|"),r=p.topics[k];return`<tr><td>G${esc(g)} ${esc(NAME[s]||s)}: ${esc(t)}</td><td>${r.c}/${r.n} (${Math.round(r.c/r.n*100)}%)</td></tr>`}).join("")||`<tr><td colspan=2 class="muted">No data yet.</td></tr>`)+`</table>`;
 h+=`<h3>Recent attempts</h3><table><tr><th>Date</th><th>Exam</th><th>Score</th></tr>`+(at.slice(-10).reverse().map(a=>`<tr><td>${new Date(a.end).toLocaleDateString()}</td><td>${esc(a.label)}</td><td>${a.c}/${a.total} (${a.pct}%)</td></tr>`).join("")||`<tr><td colspan=3 class="muted">None yet.</td></tr>`)+`</table><p><button class="ghost" onclick="resetAll()">Reset all progress</button></p>`;
 app.innerHTML=h;
}
function resetAll(){if(confirm("This permanently deletes all attempts, bookmarks and progress in this browser. Continue?")){[K.a,K.p,K.b,K.u].forEach(Store.del);dash()}}
home();
