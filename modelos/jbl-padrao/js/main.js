/* ---------- menu hambúrguer ---------- */
(()=>{const b=document.getElementById("burger"),m=document.getElementById("mnav");if(!b)return;
  const set=o=>{b.setAttribute("aria-expanded",o);b.setAttribute("aria-label",o?"Fechar menu":"Abrir menu");m.hidden=!o;};
  b.addEventListener("click",()=>set(m.hidden));
  m.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>set(false)));
})();

/* ---------- barra dourada de leitura ---------- */
(()=>{const p=document.getElementById("prog");const f=()=>{const h=document.documentElement;const m=h.scrollHeight-h.clientHeight;p.style.width=(m>0?Math.min(100,h.scrollTop/m*100):0)+"%";};addEventListener("scroll",f,{passive:true});f();})();


/* ---------- setas entre as contas do VGV ---------- */
function drawChain(doc){
  const ch=doc.getElementById("chain"); if(!ch) return;
  const g=doc.getElementById("chain-paths");
  const C=ch.getBoundingClientRect();
  g.innerHTML="";
  ch.querySelectorAll(".carry[data-from]").forEach(t=>{
    const src=doc.getElementById(t.dataset.from); if(!src) return;
    const sr=src.getBoundingClientRect(), tr=t.getBoundingClientRect();
    const srcCard=src.closest(".calc").getBoundingClientRect();
    const x1=sr.left+sr.width/2-C.left, y1=sr.bottom-C.top;
    const yg=srcCard.bottom-C.top+15;
    const lx=Math.max(6,tr.left-C.left-13);
    const ty=tr.top+tr.height/2-C.top, tx=tr.left-C.left-3;
    const r=8;
    const p=`M${x1},${y1} V${yg-r} Q${x1},${yg} ${x1-r},${yg} H${lx+r} Q${lx},${yg} ${lx},${yg+r} V${ty-r} Q${lx},${ty} ${lx+r},${ty} H${tx}`;
    g.insertAdjacentHTML("beforeend",`<circle cx="${x1}" cy="${y1}" r="3.5" fill="#C1943D"/><path class="ln" d="${p}" fill="none" stroke="#C1943D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arr)"/>`);
  });
}
(()=>{
  const ch=document.getElementById("chain"); if(!ch) return;
  const draw=()=>drawChain(document);
  draw();
  addEventListener("resize",draw);
  if(window.ResizeObserver) new ResizeObserver(draw).observe(ch);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(draw);
  addEventListener("load",draw);
})();

/* ---------- rótulos das tabelas (usados no celular) ---------- */
document.querySelectorAll(".tbl table").forEach(t=>{
  const hs=[...t.querySelectorAll("thead th")].map(th=>(th.firstChild?th.firstChild.textContent:th.textContent).trim());
  t.querySelectorAll("tbody tr").forEach(tr=>[...tr.children].forEach((td,i)=>td.setAttribute("data-label",hs[i]||"")));
});

/* ---------- simulador ---------- */
const data=[
  {l:"3 anos",m:36,p:4386.67,mes:602458.04,ult:763028.27,tot:24521911.19},
  {l:"5 anos",m:60,p:2632.00,mes:361474.83,ult:579836.70,tot:27853913.66},
  {l:"8 anos",m:96,p:1645.00,mes:225921.77,ult:516542.97,tot:34009156.59},
  {l:"10 anos",m:120,p:1316.00,mes:180737.41,ult:523371.73,tot:39068433.57},
  {l:"13 anos",m:156,p:1012.31,mes:139028.78,ult:573835.80,tot:48494357.05},
  {l:"15 anos",m:180,p:877.33,mes:120491.61,ult:629873.82,tot:56303194.59},
  {l:"18 anos",m:216,p:731.11,mes:100409.67,ult:748157.51,tot:70963329.26},
  {l:"20 anos",m:240,p:658.00,mes:90368.71,ult:852804.28,tot:83193993.54}
];
const brl=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const brl0=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const mi=v=>"R$ "+(v/1e6).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})+" mi";
const max=Math.max(...data.map(d=>d.tot));
const tabs=document.getElementById("tabs"),bars=document.getElementById("bars");
data.forEach((d,i)=>{
  const b=document.createElement("button");b.className="tab";b.id="tab-"+i;b.type="button";b.textContent=d.l;
  b.addEventListener("click",()=>pick(i));tabs.appendChild(b);
  const r=document.createElement("div");r.className="bar";r.id="bar-"+i;
  r.innerHTML=`<span>${d.l}</span><div class="track"><div class="fill" style="width:${(d.tot/max*100).toFixed(1)}%"></div></div><span class="val num">${mi(d.tot)}</span>`;
  r.addEventListener("click",()=>pick(i));bars.appendChild(r);
});
function pick(i){
  const d=data[i];
  document.querySelectorAll(".tab").forEach((t,j)=>t.setAttribute("aria-pressed",j===i));
  document.querySelectorAll(".bar").forEach((t,j)=>t.classList.toggle("on",j===i));
  document.getElementById("r-parcela").textContent=brl(d.p);
  document.getElementById("r-mes").textContent=brl0(d.mes);
  document.getElementById("r-ult").textContent=brl0(d.ult);
  document.getElementById("r-total").textContent=mi(d.tot);
  document.getElementById("r-total-d").textContent="em "+d.m+" meses";
}
pick(data.length-1);

const $=id=>document.getElementById(id);

/* ---------- download do PDF da proposta (versão pronta, sempre igual à última versão do site) ---------- */
let dl=null;
(async()=>{
  try{ dl=window.claude&&window.claude.use ? await window.claude.use("downloads") : null; }catch(e){ dl=null; }
  if(!dl) return;
  const msg=$("pdf-msg");
  document.querySelectorAll("a.js-pdf").forEach(a=>{
    a.addEventListener("click",async ev=>{
      if(a.dataset.fallback==="1") return;
      ev.preventDefault();
      try{
        const res=await fetch("proposta-jbl.pdf");
        if(!res.ok) throw {code:"unavailable"};
        await dl.save({filename:"Proposta JBL - Sao Judas Tadeu II.pdf",data:await res.blob()});
      }catch(err){
        const code=err&&err.code;
        if(code==="declined") return;
        if(code==="rate_limited"){msg.textContent="Aguarde um instante e toque de novo.";msg.hidden=false;return;}
        document.querySelectorAll("a.js-pdf").forEach(x=>x.dataset.fallback="1");
        msg.textContent="Toque de novo no botão para abrir o PDF numa nova aba.";msg.hidden=false;
      }
    });
  });
})();

(()=>{const run=()=>{document.querySelectorAll('.v-ext[data-center]').forEach(x=>{const t=document.getElementById(x.dataset.center),i=x.firstElementChild;if(!t||!i)return;i.style.marginLeft='0';const xr=x.getBoundingClientRect(),tr=t.getBoundingClientRect(),w=i.getBoundingClientRect().width;let m=(tr.left+tr.width/2)-xr.left-w/2;m=Math.max(0,Math.min(m,xr.width-w));i.style.marginLeft=m+'px';});};
addEventListener('load',run);addEventListener('resize',run);if(document.fonts)document.fonts.ready.then(run);run();})();
