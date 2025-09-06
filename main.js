// main.js — minimal working game wired to editor's params

// --- parse URL & theme ---
const P = new URLSearchParams(location.search);
const mode = P.get('mode') || 'side'; // reserved
const THEME = {
  bg: P.get('bg') || '#0b0b10',
  bgAlpha: parseFloat(P.get('bgAlpha')||'0.7'),
  borderOn: (P.get('border')||'1')==='1',
  borderColor: P.get('borderColor') || '#ffffff40',
  text: P.get('text') || '#ffffff',
  font: P.get('font') || 'Inter, system-ui, sans-serif',
  fontSize: (P.get('fontSize')||'16') + 'px',
  neon: (P.get('neon')||'0')==='1',
  neonColor: P.get('neonColor') || '#66e0ff'
};

applyTheme(THEME);

function applyTheme(t){
  document.documentElement.style.setProperty('--card-bg', t.bg);
  document.documentElement.style.setProperty('--card-border', t.borderColor);
  document.documentElement.style.setProperty('--card-has-border', t.borderOn? '1':'0');
  document.documentElement.style.setProperty('--card-text', t.text);
  document.documentElement.style.setProperty('--card-font', t.font);
  document.documentElement.style.setProperty('--card-font-size', t.fontSize);
  document.documentElement.style.setProperty('--neon-color', t.neonColor);
}

// --- load tasks ---
async function loadTasks(){
  // priority: tasksZ -> tasksUrl -> single fallback
  const z = P.get('tasksZ');
  if (z){
    try{ const json = LZString.decompressFromEncodedURIComponent(z); return JSON.parse(json); }catch(e){ console.warn('tasksZ parse fail', e); }
  }
  const url = P.get('tasksUrl');
  if (url){ try{ const r=await fetch(url); return await r.json(); }catch(e){ console.warn('tasksUrl fail', e); } }
  // fallback default
  return [{type:'questionQuiz', question:'Where is the armchair?', options:['In the bedroom','In the living room','In the kitchen'], answers:[1], image:'https://placekitten.com/800/800'}];
}

let TASKS = [];
let current = -1;

loadTasks().then(list=>{ TASKS = Array.isArray(list)? list : []; init(); });

function init(){
  document.getElementById('progress').textContent = `0/${TASKS.length}`;
  renderBubbles(TASKS.length || 6);
  bindActions();
}

function bindActions(){
  document.getElementById('close').onclick = hideOverlay;
  document.getElementById('hint').onclick = ()=> alert('🙂 Think again!');
  document.getElementById('check').onclick = checkAnswer;
}

function renderBubbles(n){
  const box = document.getElementById('bubbles');
  box.innerHTML = '';
  const total = Math.max(n, 6);
  for(let i=0;i<total;i++){
    const b = document.createElement('div'); b.className='bubble'; b.textContent= i < n ? (i+1) : '';
    if (i < n){ b.onclick = ()=> openTask(i); }
    box.appendChild(b);
  }
}

function openTask(i){
  current = i;
  const t = TASKS[i];
  const overlay = document.getElementById('overlay');
  const card = document.getElementById('card');
  const right = document.getElementById('cardRight');
  const img = document.getElementById('img');
  const title = document.getElementById('title');
  const content = document.getElementById('content');

  // theme / neon
  card.classList.toggle('neon', THEME.neon);
  right.classList.toggle('neon', THEME.neon);

  // image presence
  const hasImage = t.image && t.type.startsWith('image');
  img.style.display = hasImage ? 'block' : 'none';
  if (hasImage) img.style.backgroundImage = `url(${t.image})`;

  // title + content
  title.textContent = headingByType(t);
  content.innerHTML = '';

  switch(t.type){
    case 'text':
    case 'imageText':
      content.append(p(t.text || ''));
      break;
    case 'questionQuiz':
    case 'imageQuiz':
    case 'imageQuestionQuiz':
      if (t.question) content.append(p(t.question));
      const multi = Array.isArray(t.answers) && t.answers.length > 1;
      (t.options||[]).forEach((o,idx)=>{
        const label = div('opt');
        const input = document.createElement('input');
        input.type = multi ? 'checkbox' : 'radio';
        input.name = 'q';
        input.dataset.index = String(idx);
        label.appendChild(input);
        label.appendChild(span(o));
        content.appendChild(label);
      });
      break;
    case 'imageInput':
    case 'questionInput':
      if (t.question) content.append(p(t.question));
      const inp = document.createElement('input');
      inp.placeholder = t.prompt || 'Type the answer…';
      inp.style.padding = '10px';
      inp.style.borderRadius = '12px';
      inp.style.border = '1px solid #ffffff22';
      inp.style.background = '#ffffff10';
      inp.style.color = 'var(--card-text)';
      inp.id = 'answerInput';
      content.appendChild(inp);
      break;
  }

  localizeButtons(t);
  document.getElementById('progress').textContent = `${i+1}/${TASKS.length}`;
  overlay.style.display = 'flex';
}

function hideOverlay(){ document.getElementById('overlay').style.display='none'; }

function p(text){ const e=document.createElement('p'); e.textContent=text||''; return e; }
function span(t){ const e=document.createElement('span'); e.textContent=t; return e; }
function div(c){ const e=document.createElement('div'); e.className=c; return e; }

function headingByType(t){
  const ru = /[А-Яа-яЁё]/.test([t.text,t.question].join(' '));
  if (t.type==='text') return ru?'Задание':'Task';
  if (t.type==='imageText') return ru?'Опиши картинку':'Describe the picture';
  if (t.type==='questionQuiz') return ru?'Вопрос':'Question';
  if (t.type==='imageQuiz') return 'Quiz';
  if (t.type==='imageQuestionQuiz') return ru?'Вопрос + квиз':'Question + quiz';
  if (t.type==='imageInput') return ru?'Впиши ответ':'Type the answer';
  if (t.type==='questionInput') return ru?'Вопрос':'Question';
  return ru?'Задание':'Task';
}

function localizeButtons(t){
  const ru = /[А-Яа-яЁё]/.test([t.text,t.question].join(' '));
  document.getElementById('hint').textContent = ru ? 'Подсказка' : 'Hint';
  document.getElementById('check').textContent = ru ? 'Проверить' : 'Check';
}

function checkAnswer(){
  const t = TASKS[current];
  if (!t) return;

  if (['questionQuiz','imageQuiz','imageQuestionQuiz'].includes(t.type)){
    const inputs = Array.from(document.querySelectorAll('input[name="q"]'));
    const chosen = inputs.map((el,idx)=> el.checked? idx : -1).filter(i=>i>=0);
    const correct = (t.answers||[]).slice().sort().join(',');
    const me = chosen.slice().sort().join(',');
    alert(me===correct ? '✅ Correct!' : '❌ Try again.');
    return;
  }
  if (['imageInput','questionInput'].includes(t.type)){
    const v = (document.getElementById('answerInput')?.value||'').trim();
    if (!t.answerPattern){ alert('✅ Saved'); return; }
    try{
      const re = new RegExp(t.answerPattern,'i');
      alert(re.test(v) ? '✅ Correct!' : '❌ Try again.');
    }catch(e){ alert('Pattern error'); }
    return;
  }
  // plain text / imageText
  alert('👍');
}
