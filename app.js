import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,addDoc,setDoc,updateDoc,deleteDoc,onSnapshot,arrayUnion} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
const auth=getAuth(initializeApp(firebaseConfig)),db=getFirestore(auth.app);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dk=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
let uid=null,unsubs=[],S={exams:[],tasks:[],cards:[],notes:[],quizzes:[],days:[]},deck='',ci=0,Q=null;
const col=n=>collection(db,'users',uid,n),ref=(n,id)=>doc(db,'users',uid,n,id);
/* data layer: cloud (Firebase) or local (browser only, used by "Skip login") */
let LS=JSON.parse(localStorage.sp_local||'{}');
const lsave=()=>localStorage.sp_local=JSON.stringify(LS);
const isL=()=>uid==='local',lid=()=>Math.random().toString(36).slice(2);
function lload(){['exams','tasks','cards','notes','quizzes'].forEach(n=>S[n]=LS[n]||[]);S.days=LS.days||[];render()}
const add=(n,d)=>{if(isL()){LS[n]=[...(LS[n]||[]),{id:lid(),...d}];lsave();lload();return}return addDoc(col(n),d)};
const del=(n,id)=>{if(isL()){LS[n]=(LS[n]||[]).filter(x=>x.id!==id);lsave();lload();return}return deleteDoc(ref(n,id))};
const upd=(n,id,d)=>{if(isL()){LS[n]=(LS[n]||[]).map(x=>x.id===id?{...x,...d}:x);lsave();lload();return}return updateDoc(ref(n,id),d)};
const logDay=()=>{const t=dk(new Date());if(isL()){LS.days=[...new Set([...(LS.days||[]),t])];lsave();lload();return}return setDoc(doc(db,'users',uid,'meta','stats'),{days:arrayUnion(t)},{merge:true})};

/* theme + nav */
document.documentElement.dataset.t=localStorage.t||'dark';
$('#theme').onclick=()=>{const t=document.documentElement.dataset.t==='dark'?'light':'dark';document.documentElement.dataset.t=t;localStorage.t=t};
$('#menu').onclick=()=>$('#side').classList.toggle('open');
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.toggle('on',x===b));$$('.view').forEach(v=>v.hidden=v.id!=='v-'+b.dataset.v);$('#side').classList.remove('open')});

/* auth */
const err=e=>$('#aerr').textContent=e.message.replace('Firebase: ','');
$('#login').onclick=()=>signInWithEmailAndPassword(auth,$('#em').value,$('#pw').value).catch(err);
$('#signup').onclick=()=>createUserWithEmailAndPassword(auth,$('#em').value,$('#pw').value).catch(err);
$('#google').onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(err);
$('#skip').onclick=()=>{uid='local';$('#app').hidden=false;$('#auth').hidden=true;lload()};
$('#out').onclick=()=>{if(isL()){uid=null;$('#app').hidden=true;$('#auth').hidden=false}else signOut(auth)};
onAuthStateChanged(auth,u=>{
  unsubs.forEach(f=>f());unsubs=[];
  if(!u){if(isL())return;uid=null;$('#app').hidden=true;$('#auth').hidden=false;return}
  uid=u.uid;$('#app').hidden=false;$('#auth').hidden=true;
  ['exams','tasks','cards','notes','quizzes'].forEach(n=>unsubs.push(onSnapshot(col(n),s=>{S[n]=s.docs.map(d=>({id:d.id,...d.data()}));render()})));
  unsubs.push(onSnapshot(doc(db,'users',uid,'meta','stats'),s=>{S.days=s.exists()?s.data().days||[]:[];render()}));
});

/* forms */
$('#examF').onsubmit=e=>{e.preventDefault();add('exams',{name:$('#exN').value,when:$('#exD').value});e.target.reset()};
$('#taskF').onsubmit=e=>{e.preventDefault();add('tasks',{text:$('#tkT').value,done:false,at:Date.now()});e.target.reset()};
$('#cardF').onsubmit=e=>{e.preventDefault();deck=$('#cdS').value.trim();ci=0;add('cards',{subject:deck,q:$('#cdQ').value,a:$('#cdA').value});$('#cdQ').value='';$('#cdA').value=''};
$('#noteF').onsubmit=e=>{e.preventDefault();add('notes',{subject:$('#ntS').value,title:$('#ntT').value,body:$('#ntB').value,at:Date.now()});e.target.reset()};
$('#qM').onchange=()=>{$('#qU').hidden=$('#qM').value==='none';$('#qU').required=!$('#qU').hidden};
const ytEmbed=u=>{const m=u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);return m?'https://www.youtube.com/embed/'+m[1]:''};
$('#quizF').onsubmit=e=>{e.preventDefault();
  const t=$('#qM').value;let url=$('#qU').value.trim();
  if(t==='yt'){url=ytEmbed(url);if(!url){alert('That does not look like a YouTube link.');return}}
  add('quizzes',{q:$('#qQ').value,type:t,url:t==='none'?'':url,opts:$$('.qo').map(i=>i.value),ans:+$('#qC').value});
  e.target.reset();$('#qU').hidden=true};

/* clicks */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;const {a,id}=b.dataset;
  if(a==='dx')del('exams',id);
  if(a==='td'){const t=S.tasks.find(x=>x.id===id);upd('tasks',id,{done:!t.done});if(!t.done)logDay()}
  if(a==='dt')del('tasks',id);
  if(a==='dc'&&confirm('Delete this card?'))del('cards',id);
  if(a==='ec'){const c=S.cards.find(x=>x.id===id),q=prompt('Question',c.q);if(q===null)return;const an=prompt('Answer',c.a);if(an===null)return;upd('cards',id,{q,a:an})}
  if(a==='dn'&&confirm('Delete this note?'))del('notes',id);
  if(a==='en'){const n=S.notes.find(x=>x.id===id),t=prompt('Title',n.title);if(t===null)return;const bd=prompt('Note',n.body);if(bd===null)return;upd('notes',id,{title:t,body:bd})}
  if(a==='dq'&&confirm('Delete this question?'))del('quizzes',id);
});

/* render */
function render(){
  const today=dk(new Date());
  // streak
  let s=0,d=new Date();if(!S.days.includes(dk(d)))d.setDate(d.getDate()-1);
  while(S.days.includes(dk(d))){s++;d.setDate(d.getDate()-1)}
  $('#streak').textContent=s;
  const open=S.tasks.filter(t=>!t.done);
  $('#pend').innerHTML=open.length?open.slice(0,6).map(t=>`<li><span>${esc(t.text)}</span></li>`).join(''):'<li><span class="mut">Nothing pending. Add a task to get started.</span></li>';
  $('#tasks').innerHTML=S.tasks.sort((a,b)=>a.at-b.at).map(t=>`<li class="${t.done?'done':''}"><button class="alt" data-a="td" data-id="${t.id}">${t.done?'↩':'✓'}</button><span>${esc(t.text)}</span><button class="alt" data-a="dt" data-id="${t.id}">✕</button></li>`).join('')||'<li><span class="mut">No tasks yet.</span></li>';
  let h='';for(let i=27;i>=0;i--){const x=new Date();x.setDate(x.getDate()-i);h+=`<b class="${S.days.includes(dk(x))?'y':''}" title="${dk(x)}"></b>`}
  $('#habit').style.gridTemplateColumns='repeat(14,1fr)';$('#habit').innerHTML=h;
  renderExams();
  // cards
  const subs=[...new Set(S.cards.map(c=>c.subject))].sort();
  if(!subs.includes(deck))deck=subs[0]||'';
  $('#deck').innerHTML=subs.map(x=>`<option ${x===deck?'selected':''}>${esc(x)}</option>`).join('');
  showCard();
  $('#cardL').innerHTML=S.cards.filter(c=>c.subject===deck).map(c=>`<li><span>${esc(c.q)} → ${esc(c.a)}</span><button class="alt" data-a="ec" data-id="${c.id}">Edit</button><button class="alt" data-a="dc" data-id="${c.id}">✕</button></li>`).join('')||'<li><span class="mut">Add your first card above.</span></li>';
  renderNotes();
  $('#qL').innerHTML=S.quizzes.map(q=>`<li><span>${esc(q.q)}</span><button class="alt" data-a="dq" data-id="${q.id}">✕</button></li>`).join('')||'<li><span class="mut">No questions saved yet.</span></li>';
  if(!Q||Q.idle)playHome();
}
function renderExams(){
  const now=Date.now();
  $('#exams').innerHTML=S.exams.slice().sort((a,b)=>a.when.localeCompare(b.when)).map(x=>{
    let ms=new Date(x.when)-now,t;
    if(ms<=0)t='Exam time!';else{const m=Math.floor(ms/6e4);t=`${Math.floor(m/1440)}d ${Math.floor(m%1440/60)}h ${m%60}m`}
    return `<div class="glass card"><div class="mut">${esc(x.name)}</div><div class="cd">${t}</div><button class="alt" data-a="dx" data-id="${x.id}">Remove</button></div>`}).join('')||'<p class="mut">Add an exam to start a countdown.</p>';
}
setInterval(renderExams,20000);
$('#deck').onchange=()=>{deck=$('#deck').value;ci=0;render()};
function showCard(){
  const l=S.cards.filter(c=>c.subject===deck);$('#flip').classList.remove('on');
  if(ci>=l.length)ci=0;
  $('#ff').textContent=l[ci]?l[ci].q:'No cards yet';$('#fb').textContent=l[ci]?l[ci].a:'';
  $('#cn').textContent=l.length?`${ci+1} / ${l.length}`:'';
}
$('#flip').onclick=()=>$('#flip').classList.toggle('on');
$('#cx').onclick=()=>{ci++;showCard()};
$('#cp').onclick=()=>{const n=S.cards.filter(c=>c.subject===deck).length;ci=(ci-1+n)%(n||1);showCard()};
function renderNotes(){
  const f=$('#srch').value.toLowerCase();
  $('#notes').innerHTML=S.notes.filter(n=>(n.subject+n.title+n.body).toLowerCase().includes(f)).sort((a,b)=>b.at-a.at).map(n=>`<div class="glass card"><div class="mut">${esc(n.subject)}</div><h3>${esc(n.title)}</h3><p style="white-space:pre-wrap">${esc(n.body)}</p><div class="row" style="margin:12px 0 0"><button class="alt" data-a="en" data-id="${n.id}">Edit</button><button class="alt" data-a="dn" data-id="${n.id}">Delete</button></div></div>`).join('')||'<p class="mut">No notes match.</p>';
}
$('#srch').oninput=renderNotes;

/* quiz player */
function playHome(){
  Q=Q||{};Q.idle=true;
  $('#qplay').innerHTML=`<h3>Play</h3><p class="mut">${S.quizzes.length} saved question(s)</p><button id="qgo" ${S.quizzes.length?'':'disabled'}>Start shuffled quiz</button>`;
  const g=$('#qgo');if(g)g.onclick=()=>{Q={idle:false,list:[...S.quizzes].sort(()=>Math.random()-.5),i:0,sc:0,locked:false};playQ()};
}
function playQ(){
  if(Q.i>=Q.list.length){const n=Q.list.length;$('#qplay').innerHTML=`<h3>Final score</h3><div class="big">${Q.sc} / ${n}</div><p class="mut">${Math.round(Q.sc/n*100)}% correct</p><button id="qagain">Play again</button>`;$('#qagain').onclick=()=>{Q=null;playHome()};return}
  const q=Q.list[Q.i];Q.locked=false;
  const media=q.type==='image'?`<img class="media" src="${esc(q.url)}" alt="Question image">`:q.type==='yt'?`<iframe class="media" src="${esc(q.url)}" allowfullscreen></iframe>`:'';
  $('#qplay').innerHTML=`<div class="mut">Question ${Q.i+1} of ${Q.list.length}</div>${media}<h3>${esc(q.q)}</h3>${q.opts.map((o,i)=>`<button class="alt opt" data-o="${i}">${'ABCD'[i]}. ${esc(o)}</button>`).join('')}<div id="qfb" class="mut"></div>`;
  $$('.opt').forEach(b=>b.onclick=()=>{
    if(Q.locked)return;Q.locked=true;const i=+b.dataset.o;
    $$('.opt')[q.ans].classList.add('ok');if(i!==q.ans)b.classList.add('no'); else Q.sc++;
    $('#qfb').innerHTML=(i===q.ans?'Correct! 🎉':'Not quite. The right answer is highlighted.')+'<br><button id="qn" style="margin-top:10px">'+(Q.i+1<Q.list.length?'Next question':'See score')+'</button>';
    $('#qn').onclick=()=>{Q.i++;playQ()};
  });
}

/* pomodoro */
const L={f:'#mf',s:'#ms',l:'#ml'};let mode='f',rem=1500,end=0,run=false;
const secs=()=>Math.max(1,+$(L[mode]).value||1)*60;
const paint=()=>{$('#clock').textContent=String(Math.floor(rem/60)).padStart(2,'0')+':'+String(rem%60).padStart(2,'0');document.title=run?$('#clock').textContent+' · StudyPal':'StudyPal'};
$$('.m').forEach(b=>b.onclick=()=>{$$('.m').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;run=false;rem=secs();paint()});
$('#tgo').onclick=()=>{if(run)return;run=true;end=Date.now()+rem*1000};
$('#tpa').onclick=()=>{if(run){rem=Math.ceil((end-Date.now())/1000);run=false;paint()}};
$('#trs').onclick=()=>{run=false;rem=secs();paint()};
['#mf','#ms','#ml'].forEach(i=>$(i).onchange=()=>{if(!run){rem=secs();paint()}});
setInterval(()=>{if(!run)return;rem=Math.max(0,Math.ceil((end-Date.now())/1000));paint();
  if(rem===0){run=false;beep();if(mode==='f'&&uid)logDay();rem=secs();paint()}},250);

/* sounds (Web Audio, no external files) */
let ac,nodes={};
const beep=()=>{ac=ac||new AudioContext();const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=880;g.gain.setValueAtTime(.2,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.2);o.start();o.stop(ac.currentTime+1.2)};
function noise(kind){
  const buf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),d=buf.getChannelData(0);let last=0;
  for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(kind==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5}else d[i]=w}
  const s=ac.createBufferSource();s.buffer=buf;s.loop=true;const f=ac.createBiquadFilter(),g=ac.createGain();
  if(kind==='rain'){f.type='bandpass';f.frequency.value=3000;f.Q.value=.4;g.gain.value=.5}else{f.type='lowpass';f.frequency.value=kind==='brown'?400:8000;g.gain.value=kind==='white'?.15:.6}
  s.connect(f);f.connect(g);g.connect(ac.destination);s.start();return s;
}
$$('.snd').forEach(b=>b.onclick=()=>{
  ac=ac||new AudioContext();ac.resume();const k=b.dataset.s;
  if(nodes[k]){nodes[k].stop();delete nodes[k];b.classList.remove('on')}else{nodes[k]=noise(k);b.classList.add('on')}
});
