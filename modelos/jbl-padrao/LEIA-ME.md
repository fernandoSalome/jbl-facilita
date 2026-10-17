# Como usar esta pasta no Claude Code

1. Descompacte o `.zip` e abra a pasta `jbl-site` no Claude Code (`cd jbl-site` e depois `claude`).
2. O Claude Code lê o arquivo `CLAUDE.md` sozinho. Ele explica que o site deve ficar idêntico, como está organizado e o que não pode ser mexido.
3. Peça, por exemplo:
   > "Publique este site exatamente como está. Antes, rode `node tools/comparar.js` para confirmar que está idêntico ao original."
4. Para conferir o resultado, abra `index.html` no navegador. Deve ficar igual ao site que fizemos.

Arquivos principais: `index.html` (página), `css/style.css` (visual), `js/main.js` e `js/carta-intencao.js` (interações), `assets/img/` (logos e foto aérea), `proposta-jbl.pdf` (PDF de 12 páginas).
A pasta `referencia/` guarda o site original em um arquivo único. É o gabarito para comparação, e não deve ser apagada.
