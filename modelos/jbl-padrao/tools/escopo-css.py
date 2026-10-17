"""Coloca o CSS do site da proposta dentro de .jblt e troca as cores fixas por variaveis.
uso: python -I scope_css.py style.css saida.css
"""
import re
import sys

raw = open(sys.argv[1], encoding="utf8").read()
src = raw.split("/*----*/")[1] if "/*----*/" in raw else raw  # arquivo do artifact (2 <style>) ou style.css do site
src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
P = ".jblt"
COLORS = {
    "#C1943D": "var(--gold)",
    "#122A45": "var(--navy)",
    "#A2782F": "var(--gold-deep)",
    "#8F6B28": "var(--gold-ink)",
    "#F7F2E7": "var(--gold-soft)",
    "#ECE1C4": "var(--gold-line)",
    "#D4AA55": "color-mix(in srgb,var(--gold) 82%,#fff)",
    "#A9802F": "color-mix(in srgb,var(--gold) 86%,#000)",
    "#E2B85F": "color-mix(in srgb,var(--gold) 80%,#fff)",
}


def recolor(body):
    for k, v in COLORS.items():
        body = re.sub(re.escape(k), v, body, flags=re.I)
    return body


def scope_sel(sel):
    out = []
    for s in sel.split(","):
        s = s.strip()
        if not s:
            continue
        if s in (":root", "html", "body"):
            out.append(P)
            continue
        s = re.sub(r"^(:root|html|body)\b", P, s)
        out.append(s if s.startswith(P) else P + " " + s)
    return ",".join(out)


def walk(css):
    out, i = [], 0
    while i < len(css):
        j = css.find("{", i)
        if j < 0:
            break
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while depth:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
            k += 1
        body = css[j + 1 : k - 1]
        if head.startswith("@media") or head.startswith("@supports"):
            out.append(head + "{" + walk(body) + "}")
        elif head.startswith("@keyframes") or head.startswith("@font-face"):
            out.append(head + "{" + body + "}")
        else:
            sel = scope_sel(head)
            # as definicoes das variaveis (:root) ficam com os valores originais
            out.append(sel + "{" + (body if head == ":root" else recolor(body)) + "}")
        i = k
    return "\n".join(out)


with open(sys.argv[2], "w", encoding="utf8") as f:
    f.write("/* Estilo do site original da proposta, com escopo .jblt e cores em variaveis.\n")
    f.write("   Gerado por script (scope_css.py). Ajustes do portal ficam em jbl-padrao-extra.css */\n")
    f.write(walk(src))
