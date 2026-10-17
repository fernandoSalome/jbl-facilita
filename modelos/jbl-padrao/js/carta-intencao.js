/* ---------- carta de intenção ---------- */
const meses=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const hoje=()=>{const d=new Date();return d.getDate()+" de "+meses[d.getMonth()]+" de "+d.getFullYear();};
const g=id=>($(id).value||"").trim();
let protocolo="";
let anexo=null; /* {name,type,dataUrl} */
function fmtData(s){if(!s)return"";const [y,m,d]=s.split("-");return d+"/"+m+"/"+y;}
function vals(){
  return {
    nome:g("f-nome"),cpf:g("f-cpf"),rg:g("f-rg"),nac:g("f-nac"),prof:g("f-prof"),email:g("f-email"),tel:g("f-tel"),
    civil:g("f-civil"),mod:g("f-mod")||"quero avaliar as opções",prazo:g("f-prazo"),
    cdata:fmtData(g("c-data")),regime:g("c-regime"),cmatr:g("c-matr"),rcpn:g("c-rcpn"),cmun:g("c-mun"),
    cnome:g("c-nome"),ccpf:g("c-cpf"),crg:g("c-rg"),cnac:g("c-nac"),cprof:g("c-prof"),
    ha:g("i-ha"),zona:g("i-zona"),mun:g("i-mun")||"Martinópolis/SP",matr:g("i-matr"),cri:g("i-cri"),car:g("i-car"),
    obs:g("i-obs"),reuniao:g("f-reuniao"),end:g("f-end")
  };
}
function paragraphs(v,blank){
  const f=(x,ph)=>x||blank(ph);
  const low=s=>s?s.toLowerCase():"";
  const p=[];
  p.push("Ambas as partes reconhecem que esta carta de intenção de parceria não cria uma obrigação legal vinculativa entre elas. No entanto, caso as partes concordem em estabelecer uma parceria formal no futuro, esta carta será usada como base para as negociações e elaboração de um contrato formal. As partes reconhecem que podem desistir desta intenção de parceria a qualquer momento, respeitado o prazo de estudo de viabilidade, e antes da celebração de um contrato formal por meio de uma comunicação por escrito, sem qualquer penalidade ou responsabilidade perante a outra parte.");
  let q="**JBL INCORPORADORA URBANISMO E EMPREENDIMENTOS LTDA,** pessoa jurídica de direito privado, com nome fantasia, **GRUPO JBL INCORPORADORA E URBANISMO**, com sede jurídica na Alameda Rio Negro, n.º 503, Cj. 2011, 20º andar – Alphaville Empresarial, Barueri/SP, representada neste ato por seu sócio administrador, doravante **DENOMINADA EMPREENDEDORA PROPONENTE**, propõe nos termos a seguir, a presente carta de intenção, para formalização de uma parceria imobiliária com ";
  q+="**"+f(v.nome?v.nome.toUpperCase():"","nome completo")+"**";
  q+=", "+(v.nac?low(v.nac):"brasileiro(a)");
  const uniao=/uni/i.test(v.civil),casado=/casad/i.test(v.civil)||(!v.civil&&(v.cnome||v.cdata||v.regime));
  if(v.civil&&!casado&&!uniao)q+=", "+low(v.civil);
  if(v.prof)q+=", "+low(v.prof);
  q+=", RG: n.º "+f(v.rg,"RG")+", CPF: n.º "+f(v.cpf,"CPF");
  if(casado||uniao){
    q+=(uniao?", em união estável":", casado(a)")+(v.cdata?" em "+v.cdata:"")+(v.regime?", sob o regime de "+low(v.regime):"");
    if(v.cmatr)q+=", conforme certidão de casamento matriculada sob o n.º "+v.cmatr+(v.rcpn?" do "+v.rcpn:"")+(v.cmun?" da comarca de "+v.cmun:"");
    if(v.cnome){q+=(uniao?" com **":", com **")+v.cnome.toUpperCase()+"**";if(v.cnac)q+=", "+low(v.cnac);if(v.cprof)q+=", "+low(v.cprof);if(v.crg)q+=", RG: n.º "+v.crg;if(v.ccpf)q+=", CPF: n.º "+v.ccpf;}
  }
  q+=", residente(s) e domiciliado(s) na "+f(v.end,"endereço")+", **DENOMINADOS PROPRIETÁRIOS TERRENISTAS - COTISTA**.";
  p.push(q);
  p.push("§I – DA EMPRESA PROPONENTE");
  p.push("A empresa **PROPONENTE**, pessoa jurídica de direito privado, com nome fantasia, **GRUPO JBL INCORPORADORA E URBANISMO**, com atividade principal de incorporação de empreendimentos imobiliários, tendo experiência na implantação de Parcelamentos de Solos Urbano e Rural.");
  p.push("Atua no mercado imobiliário implantando empreendimentos de loteamentos e condomínios em todo o território nacional.");
  p.push("§II – DO PARCEIRO – PROPRIETÁRIOS TERRENISTAS - COTISTAS");
  let im="**OS PROPRIETÁRIOS** acima qualificados são legítimos proprietários e possuidores do imóvel rural com área total de "+f(v.ha,"área")+" hectares, denominado Gleba São Judas Tadeu II";
  if(v.zona)im+=", situado em "+v.zona;
  im+=", Município e Comarca de "+v.mun;
  im+=", registrado no "+f(v.cri,"Cartório de Registro de Imóveis")+", na matrícula n.º "+f(v.matr,"matrícula");
  if(v.car)im+=", CAR n.º "+v.car;
  p.push(im+".");
  p.push("§III – A EMPREENDEDORA PROPONENTE");
  p.push("Por meio desta carta de intenção, propõe a **EMPREENDEDORA PROPONENTE** firmar uma eventual parceria imobiliária com a **PROPRIETÁRIA TERRENISTA-COTISTA**, em que este figurará como **PARCEIRO PROPRIETÁRIO**, enquanto aquela figurará como **PARCEIRA EMPREENDEDORA**.");
  p.push("O **PARCEIRO PROPRIETÁRIO TERRENISTA-COTISTA** disponibilizará o imóvel para a **REALIZAÇÃO** de loteamento aberto de lotes residencial, industrial e chacreamento, ou seja, o que o estudo preliminar mostrou.");
  p.push("§IV – OS RESULTADOS");
  p.push("Os resultados auferidos na eventual parceria serão distribuídos nos percentuais fixados entre as partes no contrato de parceria, que será firmado por via da formalização de uma **sociedade de propósito específico (SPE)**, na forma da lei.");
  p.push("§V – PRAZO PARA O ESTUDO DE VIABILIDADE");
  p.push("Fixa-se o prazo de 30 (trinta) dias corridos para o complemento dos estudos necessários de viabilidade, bem como para as seguintes ações, independentemente de ordem cronológica, **dentre outras**, cujos gastos serão da **PARCEIRA EMPREENDEDORA:**\na) transformação da área rural para urbana, de expansão urbana ou de urbanização específica;\nb) eventual organização das matrículas (desmembramento, remembramento);\nc) aprovação pelo município, se necessária, da lei de loteamento de lotes e;\nd) reformulação do projeto urbanístico a pedido do Município etc.");
  p.push("**Dentro do prazo acima, bem como da prorrogação, os PROPRIETÁRIOS se comprometem a não oferecer a área para outro empreendedor.**");
  p.push("O prazo acima estipulado pode ser prorrogado por interesse das partes, por igual prazo de 30 (trinta) dias, quando assinarão um termo aditivo.");
  p.push("§VI – EM CASO DE INVIABILIDADE");
  p.push("Na hipótese de se verificar a **INVIABILIDADE** do projeto pela **PARCEIRA EMPREENDEDORA**, o presente acordo será extinto sem quaisquer ônus para as Partes, e sem que haja a obrigatoriedade da apresentação dos estudos pelo Parceiro Empreendedor.");
  p.push("§VII – EM CASO DE VIABILIDADE");
  p.push("Uma vez constatada a **VIABILIDADE** do projeto, a **PROPONENTE EMPREENDEDORA** apresentará aos **PROPRIETÁRIOS** uma proposta definitiva da minuta da SPE, que deverá ser livremente analisada, na qual estará prevista a responsabilidade da **EMPREENDEDORA** de aportar os recursos técnicos e financeiros e disponibilizar a sua estrutura e expertise para viabilização e execução e término do **projeto de loteamento** na área acima descrita, com a infraestrutura completa exigida pelo município.");
  p.push("Nesta hipótese de viabilidade do projeto, e enquanto não assinada a Parceria por intermédio da SPE, a **PROPONENTE EMPREENDEDORA** também não se obriga a apresentar os projetos/estudos realizados até então.");
  p.push(v.mun.split("/")[0]+", "+hoje()+".");
  return p;
}
function sigList(v){const s=[["JBL Incorporadora Urbanismo e Empreendimentos Ltda",""],[v.nome||"Proprietário(a)","CPF: n.º "+(v.cpf||"")]];if(v.cnome)s.push([v.cnome,"CPF: n.º "+(v.ccpf||"")]);return s;}
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const TITULO="CARTA DE INTENÇÃO - PARCERIA IMOBILIÁRIA";
const plain=t=>t.replace(/^§/,"").replace(/\*\*/g,"");
function letterText(v){
  let t=TITULO+"\n\n"+paragraphs(v,ph=>"["+ph+"]").map(plain).join("\n\n");
  t+="\n\n"+sigList(v).map(s=>"______________________________\n"+s[0]+(s[1]?"\n"+s[1]:"")).join("\n\n");
  const ex=["Contato: "+(v.tel||"[telefone]")+" · "+(v.email||"[e-mail]")];
  if(v.mod)ex.push("Modalidade de interesse: "+v.mod);if(v.prazo)ex.push("Prazo de vendas: "+v.prazo);
  if(v.reuniao)ex.push("Melhor dia/horário para reunião: "+v.reuniao);if(v.obs)ex.push("Observações: "+v.obs);
  if(anexo)ex.push("Anexo: matrícula atualizada ("+anexo.name+").");if(protocolo)ex.push("Protocolo: "+protocolo);
  return t+"\n\n"+ex.join("\n");
}
function render(){
  const v=vals();
  const ps=paragraphs(v,ph=>"\u0000"+ph+"\u0001");
  const html=ps.map(t=>{const h=t.startsWith("§");let x=esc(h?t.slice(1):t).replace(/\n/g,"<br>").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\u0000([^\u0001]*)\u0001/g,'<span class="fill empty">[$1]</span>');return h?'<p class="ci-h">'+x+"</p>":"<p>"+x+"</p>";}).join("");
  const sigs=sigList(v).map(s=>'<div class="sig"><strong>'+esc(s[0])+"</strong>"+(s[1]?"<br><small>"+esc(s[1])+"</small>":"")+"</div>").join("");
  $("preview").innerHTML="<h3>"+TITULO+"</h3>"+html+sigs;
  $("send-wa").href="https://wa.me/5511940091744?text="+encodeURIComponent(letterText(v));
}
function check(){
  const v=vals(),miss=[];
  if(!v.nome)miss.push("nome completo");
  if(!v.cpf)miss.push("CPF");
  if(!v.email)miss.push("e-mail");
  if(!v.tel)miss.push("telefone");
  if(!v.end)miss.push("endereço residencial");
  if(!v.ha)miss.push("área em hectares");
  if(!g("i-mun"))miss.push("município/UF");
  if(!v.matr)miss.push("matrícula do imóvel");
  if(!v.rg)miss.push("RG");
  if(!v.cri)miss.push("cartório de registro de imóveis");
  if(!$("f-ok").checked)miss.push("a confirmação de autorização");
  const e=$("f-err");
  if(miss.length){e.textContent="Falta preencher: "+miss.join(", ")+".";e.hidden=false;e.scrollIntoView({block:"center",behavior:"smooth"});return false;}
  e.hidden=true;return true;
}
function novoProtocolo(){
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  const r=Math.random().toString(36).slice(2,6).toUpperCase();
  return `SJT2-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}-${r}`;
}
document.querySelectorAll("#form input:not([type=file]),#form select,#form textarea").forEach(el=>{el.addEventListener("input",render);el.addEventListener("change",render);});
$("form").addEventListener("submit",e=>e.preventDefault());
$("i-file").addEventListener("change",()=>{
  const file=$("i-file").files[0],fe=$("file-err");fe.hidden=true;anexo=null;
  if(!file){render();return;}
  const ok=["application/pdf","image/png","image/jpeg"].includes(file.type);
  if(!ok){fe.textContent="Use um arquivo PDF, PNG ou JPEG.";fe.hidden=false;$("i-file").value="";render();return;}
  if(file.size>5*1024*1024){fe.textContent="O arquivo passa de 5 MB. Escolha um arquivo menor.";fe.hidden=false;$("i-file").value="";render();return;}
  if(file.type==="application/pdf"){anexo={name:file.name,type:file.type,dataUrl:null};render();return;}
  const rd=new FileReader();rd.onload=()=>{anexo={name:file.name,type:file.type,dataUrl:rd.result};render();};rd.readAsDataURL(file);
});
$("submit").addEventListener("click",()=>{
  if(!check())return;
  if(!protocolo)protocolo=novoProtocolo();
  $("proto-code").textContent=protocolo;
  $("protocol").hidden=false;
  render();
  $("protocol").scrollIntoView({block:"center",behavior:"smooth"});
});
$("send-wa").addEventListener("click",e=>{ if(!check()) e.preventDefault(); else render(); });
$("copy").addEventListener("click",async()=>{
  if(!check())return;
  const t=letterText(vals()),m=$("f-msg");
  try{await navigator.clipboard.writeText(t);m.textContent="Texto copiado. Agora é só colar no e-mail ou no WhatsApp.";}
  catch(err){const ta=document.createElement("textarea");ta.value=t;ta.style.width="100%";ta.rows=8;m.textContent="Selecione o texto abaixo e copie:";m.after(ta);ta.select();}
  m.hidden=false;
});
render();


async function salvarCarta(){
  if(!check())return;
  if(!protocolo){protocolo=novoProtocolo();$("proto-code").textContent=protocolo;$("protocol").hidden=false;render();}
  const m=$("f-msg");
  if(!window.jspdf){m.textContent="Não foi possível gerar o PDF aqui. Use “Copiar texto” ou envie pelo WhatsApp.";m.hidden=false;return;}
  const v=vals();
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});
  const W=210,H=297,L=22,R=22,maxW=W-L-R;let y=26;
  const head=()=>{doc.setFillColor(14,42,71);doc.rect(0,0,W,12,"F");doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(201,154,62);doc.text("GRUPO JBL INCORPORADORA · SÃO JUDAS TADEU II",L,8);doc.text(protocolo,W-R,8,{align:"right"});};
  head();
  doc.setTextColor(14,42,71);doc.setFont("helvetica","bold");doc.setFontSize(13.5);doc.text(TITULO,W/2,y,{align:"center"});y+=12;
  const set=b=>{doc.setFont("times",b?"bold":"normal");doc.setFontSize(11.5);doc.setTextColor(27,42,58);};
  paragraphs(v,ph=>"["+ph+"]").forEach(t=>{
    const h=t.startsWith("§")||/^\*\*[^*]+\*\*$/.test(t);set(h);
    const lines=doc.splitTextToSize(plain(t),maxW);
    if(y+lines.length*5.6>270){doc.addPage();head();set(h);y=24;}
    doc.text(lines,L,y,h?{}:{align:"justify",maxWidth:maxW});y+=lines.length*5.6+4;
  });
  sigList(v).forEach(s=>{
    y+=16;if(y>262){doc.addPage();head();y=50;}
    doc.setDrawColor(27,42,58);doc.line(W/2-50,y,W/2+50,y);set(true);doc.setFontSize(10.5);doc.text(s[0],W/2,y+6,{align:"center"});set(false);doc.setFontSize(10);if(s[1])doc.text(s[1],W/2,y+11,{align:"center"});y+=12;
  });
  if(anexo&&anexo.dataUrl){
    doc.addPage();head();
    doc.setTextColor(14,42,71);doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text("ANEXO · Matrícula atualizada",L,24);
    try{
      const img=new Image();img.src=anexo.dataUrl;await img.decode();
      const bw=W-L-R,bh=H-40-16;const s=Math.min(bw/img.width,bh/img.height);
      doc.addImage(anexo.dataUrl,anexo.type==="image/png"?"PNG":"JPEG",L,32,img.width*s,img.height*s);
    }catch(e){doc.setFont("times","normal");doc.text("Não foi possível incluir a imagem.",L,34);}
  }
  try{
    const nomeArq="Carta de Intencao - Parceria Imobiliaria - Sao Judas Tadeu II - "+protocolo+".pdf";
    if(dl) await dl.save({filename:nomeArq,data:doc.output("blob")}); else doc.save(nomeArq);
    m.textContent="Carta salva. Assine e envie para o Marcelo"+(anexo&&!anexo.dataUrl?", junto com o PDF da matrícula.":".");m.hidden=false;
  }catch(err){
    if(err&&err.code==="declined")return;
    m.textContent="Não foi possível salvar o PDF. Use “Copiar texto” ou envie pelo WhatsApp.";m.hidden=false;
  }
}
$("save-pdf").addEventListener("click",salvarCarta);
$("save-pdf2").addEventListener("click",salvarCarta);


