// Confere se o index.html continua IDÊNTICO ao site original (referencia/site-original-arquivo-unico.html).
// Uso: node tools/comparar.js   (requer playwright: npm i -D playwright && npx playwright install chromium)
// Tira prints da página inteira nas larguras 1440, 1024 e 390 px e compara byte a byte.
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(__dirname,'prints');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch();let ok=true;
  for(const w of [1440,1024,390]){
    const shots={};
    for(const [n,f] of [['novo','index.html'],['original','referencia/site-original-arquivo-unico.html']]){
      const p=await b.newPage({viewport:{width:w,height:900}});
      await p.goto('file://'+path.join(ROOT,f),{waitUntil:'load'});
      await p.addStyleTag({content:'*{animation:none!important;transition:none!important}'});
      await p.waitForTimeout(500);
      shots[n]=await p.screenshot({path:path.join(OUT,`${n}-${w}.png`),fullPage:true});
      await p.close();
    }
    const igual=Buffer.compare(shots.novo,shots.original)===0;
    if(!igual)ok=false;
    console.log(`${w}px: ${igual?'IDÊNTICO':'DIFERENTE — compare tools/prints/novo-'+w+'.png com original-'+w+'.png'}`);
  }
  await b.close();process.exit(ok?0:1);
})();
