"""
Generates the illustrated artwork used by the personal content (project covers, achievement tiles,
gallery "journey" cards and the social share image) by rendering HTML templates with Playwright.

    python3 scripts/art/generate-art.py          # needs: pip install playwright pillow  (+ a Chromium)

Edit the lists below and re-run to regenerate. Output goes to public/me/…
"""
import html, json, os, pathlib, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "me"
CONTENT = json.loads((ROOT / "content" / "vinay.json").read_text())

FONT = (ROOT / "node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2").as_uri()
FONT2 = (ROOT / "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2").as_uri()
MONO = (ROOT / "node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2").as_uri()

BASE_CSS = f"""
@font-face{{font-family:SG;src:url({FONT}) format('woff2');font-weight:300 700}}
@font-face{{font-family:IN;src:url({FONT2}) format('woff2');font-weight:100 900}}
@font-face{{font-family:JB;src:url({MONO}) format('woff2');font-weight:100 800}}
*{{box-sizing:border-box;margin:0}} body{{background:#000}}
.card{{position:relative;overflow:hidden;background:#07061a;color:#eeedf9;font-family:IN,sans-serif}}
.grid{{position:absolute;inset:0;background-image:linear-gradient(rgb(255 255 255/.045) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/.045) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at 70% 40%,#000 20%,transparent 75%)}}
.blob{{position:absolute;border-radius:50%;filter:blur(70px);opacity:.75}}
.eyebrow{{font-family:JB,monospace;letter-spacing:.28em;text-transform:uppercase;font-size:15px}}
.title{{font-family:SG,sans-serif;font-weight:700;letter-spacing:-.03em;line-height:1.02}}
.chip{{display:inline-block;font-family:JB,monospace;font-size:15px;padding:7px 12px;border-radius:9px;background:rgb(255 255 255/.07);border:1px solid rgb(255 255 255/.12);margin:0 8px 8px 0;color:#dcdaf5}}
.win{{position:absolute;border-radius:18px;background:rgb(13 12 34/.82);border:1px solid rgb(255 255 255/.12);box-shadow:0 40px 80px -20px rgb(0 0 0/.8);backdrop-filter:blur(6px);overflow:hidden}}
.bar{{height:34px;display:flex;align-items:center;gap:7px;padding:0 14px;border-bottom:1px solid rgb(255 255 255/.08)}}
.bar i{{width:11px;height:11px;border-radius:50%;display:block}}
.code{{font-family:JB,monospace;font-size:15px;line-height:1.75;padding:16px 20px;white-space:pre;color:#c9c7e8}}
.k{{color:#c084fc}}.s{{color:#5eead4}}.f{{color:#7dd3fc}}.c{{color:#6b6990}}.n{{color:#fbbf24}}
"""

PALETTES = {
    "agent": ("#8b5cf6", "#22d3ee"),
    "ml": ("#f59e0b", "#ef4444"),
    "web": ("#3b82f6", "#22d3ee"),
    "data": ("#10b981", "#3b82f6"),
    "bot": ("#06b6d4", "#8b5cf6"),
    "doc": ("#ec4899", "#8b5cf6"),
    "rag": ("#a855f7", "#f43f5e"),
    "term": ("#22c55e", "#06b6d4"),
}

def dots():
    return '<span class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span>'

def motif(kind, slug, a, b):
    if kind in ("agent", "rag"):
        nodes = [(120, 90, "PLAN"), (330, 60, "TOOLS"), (430, 230, "ANALYSE"), (250, 330, "VERIFY"), (70, 260, "SUBMIT")] if kind == "agent" else [(110, 80, "QUERY"), (330, 70, "HYBRID"), (440, 240, "CACHE"), (240, 340, "LLM"), (70, 250, "RAGAS")]
        lines = "".join(f'<line x1="{nodes[i][0]}" y1="{nodes[i][1]}" x2="{nodes[(i+1)%5][0]}" y2="{nodes[(i+1)%5][1]}" stroke="url(#lg)" stroke-width="3" stroke-dasharray="8 8"/>' for i in range(5))
        lines += f'<line x1="{nodes[0][0]}" y1="{nodes[0][1]}" x2="{nodes[2][0]}" y2="{nodes[2][1]}" stroke="rgb(255 255 255/.15)" stroke-width="2"/>'
        circles = "".join(f'<g><circle cx="{x}" cy="{y}" r="40" fill="#0d0c22" stroke="{a if i%2 else b}" stroke-width="3"/><text x="{x}" y="{y+5}" text-anchor="middle" font-family="JB" font-size="13" fill="#fff" letter-spacing="1">{t}</text></g>' for i, (x, y, t) in enumerate(nodes))
        core = f'<circle cx="260" cy="190" r="56" fill="url(#lg)"/><text x="260" y="198" text-anchor="middle" font-family="SG" font-weight="700" font-size="24" fill="#fff">{"LLM" if kind=="agent" else "RAG"}</text>'
        return f'<svg style="position:absolute;right:50px;top:150px" width="520" height="420"><defs><linearGradient id="lg"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs>{lines}{core}{circles}</svg>'
    if kind == "ml":
        pts = [(0, 250), (60, 205), (120, 215), (180, 150), (240, 160), (300, 105), (360, 112), (420, 70), (480, 60)]
        path = "M" + " L".join(f"{x},{y}" for x, y in pts)
        bars = "".join(f'<rect x="{30+i*52}" y="{300-h}" width="30" height="{h}" rx="6" fill="url(#bg)" opacity=".55"/>' for i, h in enumerate([60, 95, 80, 130, 110, 160, 150, 190, 205]))
        return f'''<div class="win" style="right:56px;top:150px;width:560px;height:440px">{dots()}
        <svg width="560" height="400" style="padding:24px"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}" stop-opacity=".2"/></linearGradient></defs>
        {bars}<path d="{path}" fill="none" stroke="#fff" stroke-width="3.5"/>{"".join(f'<circle cx="{x}" cy="{y}" r="5" fill="{b}"/>' for x,y in pts)}
        <text x="0" y="330" font-family="JB" font-size="15" fill="#a3a1c2">validation score ↑   ·   loss ↓</text></svg></div>'''
    if kind == "data":
        return f'''<div class="win" style="right:56px;top:150px;width:560px;height:440px">{dots()}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:22px">
        {"".join(f'<div style="border-radius:14px;background:rgb(255 255 255/.05);padding:14px"><div class="eyebrow" style="font-size:11px;color:#a3a1c2">{t}</div><div class="title" style="font-size:30px;margin-top:6px">{v}</div></div>' for t,v in [("Revenue","₹ ▲"),("Turnover","x4.2"),("Margin","▲ 12%")])}
        <svg width="490" height="230" style="grid-column:span 3"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}" stop-opacity=".6"/><stop offset="1" stop-color="{a}" stop-opacity="0"/></linearGradient></defs>
        <path d="M0,170 C60,120 100,150 150,110 S250,40 300,80 S400,140 490,50 L490,230 L0,230Z" fill="url(#ar)"/><path d="M0,170 C60,120 100,150 150,110 S250,40 300,80 S400,140 490,50" fill="none" stroke="{b}" stroke-width="3"/></svg></div></div>'''
    if kind == "web":
        return f'''<div class="win" style="right:56px;top:140px;width:580px;height:470px">{dots()}
        <div style="display:flex;height:436px"><div style="width:130px;border-right:1px solid rgb(255 255 255/.08);padding:18px">{"".join(f'<div style="height:12px;border-radius:6px;margin-bottom:16px;background:{a if i==1 else "rgb(255 255 255/.12)"};width:{w}%"></div>' for i,w in enumerate([80,90,70,85,60,75]))}</div>
        <div style="flex:1;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start">
        {"".join(f'<div style="height:{h}px;border-radius:14px;background:linear-gradient(135deg,{a}33,{b}22);border:1px solid rgb(255 255 255/.08)"></div>' for h in [110,110,160,160])}
        <div style="grid-column:span 2;height:60px;border-radius:14px;background:rgb(255 255 255/.05)"></div></div></div></div>'''
    if kind == "bot":
        msgs = [("in", "🔥 FREE: Python for Data Science — 100% OFF"), ("out", "✔ coupon resolved · udemy.com/course/…"), ("in", "⚡ Deal: Machine Learning A–Z (expires 2h)"), ("out", "✔ enrolled · duplicate guard passed")]
        bubbles = "".join(f'<div style="max-width:80%;margin:{"0 0 14px auto" if d=="out" else "0 auto 14px 0"};padding:12px 16px;border-radius:16px;font-size:16px;background:{"linear-gradient(135deg,"+a+","+b+")" if d=="out" else "rgb(255 255 255/.08)"}">{html.escape(t)}</div>' for d, t in msgs)
        return f'<div class="win" style="right:56px;top:150px;width:540px;height:430px">{dots()}<div style="padding:24px">{bubbles}</div></div>'
    if kind == "term":
        lines = ['<span class="c">$</span> python api_scraper.py', '<span class="f">→</span> categories found: <span class="n">52</span>', '<span class="f">→</span> courses fetched: <span class="n">490+</span>  <span class="c">(&lt; 5 s)</span>', '<span class="f">→</span> outcome.json · outcome.md <span class="s">saved</span>', '<span class="c">$</span> python form_generator.py', '<span class="s">✔</span> Google Form script generated', '<span class="s">✔</span> branching enrollment form ready']
        return f'<div class="win" style="right:56px;top:150px;width:560px;height:400px">{dots()}<div class="code" style="font-size:17px">' + "\n".join(lines) + '</div></div>'
    if kind == "doc":
        return f'''<div style="position:absolute;right:70px;top:170px;width:560px;height:390px;perspective:1400px">
        <div style="position:absolute;left:0;top:0;width:280px;height:390px;background:#f6f4ee;border-radius:12px 0 0 12px;box-shadow:0 30px 60px -20px #000"></div>
        <div style="position:absolute;left:280px;top:0;width:280px;height:390px;background:#efece4;border-radius:0 12px 12px 0;transform-origin:left;transform:rotateY(-28deg);box-shadow:0 30px 60px -20px #000"></div>
        {"".join(f'<div style="position:absolute;left:{30 + (i//8)*280}px;top:{40+(i%8)*40}px;width:{220 - (i*37)%70}px;height:10px;border-radius:5px;background:#c9c4b5"></div>' for i in range(8))}
        <div style="position:absolute;left:30px;top:18px;width:120px;height:12px;border-radius:6px;background:{a}"></div></div>'''
    return ""

def code_snippet(slug):
    return {
        "llm-quiz-solver-agent": '<span class="k">graph</span> = StateGraph(<span class="f">QuizState</span>)\ngraph.add_node(<span class="s">"plan"</span>, planner)\ngraph.add_node(<span class="s">"tools"</span>, ToolNode(toolbelt))',
    }.get(slug, "")

GLYPH = {
    "llm-quiz-solver-agent": "🧩", "heavy-equipment-price-prediction": "🚜", "parkeasy-vehicle-parking": "🅿️",
    "udemysync-telegram-coupon-bot": "🎓", "llm-web-app-generator-deployer": "🚀", "examination-management-portal": "📝",
    "placement-portal": "💼", "household-services-platform": "🏠", "bdm-capstone-starnet-computers": "🖥️",
    "oasis-infobyte-data-science": "🧪", "pw-ambassador-course-scraper": "🕷️", "courseview-pdf-flipbook": "📖",
    "ai-agent-suite": "☁️", "production-grade-rag": "📚", "recipe-rating-prediction": "🍲", "cinematic-portfolio": "🎬",
}

def project_cover(p):
    cat = p["category"]
    kind = {"AI & LLM Agents": "agent", "Machine Learning": "ml", "Full-Stack Web": "web", "Data Analytics": "data", "Automation": "bot", "Front-End": "web"}.get(cat, "web")
    if p["slug"] == "production-grade-rag": kind = "rag"
    if p["slug"] == "courseview-pdf-flipbook": kind = "doc"
    if p["slug"] == "pw-ambassador-course-scraper": kind = "term"
    a, b = PALETTES[kind]
    chips = "".join(f'<span class="chip">{html.escape(t)}</span>' for t in p["tech"][:5])
    title = html.escape(p["title"])
    size = 64 if len(p["title"]) < 26 else 54 if len(p["title"]) < 38 else 46
    return f'''<div class="card shot" data-out="projects/{p["slug"]}.webp" style="width:1280px;height:800px">
      <div class="blob" style="width:560px;height:560px;background:{a};left:-160px;top:-200px"></div>
      <div class="blob" style="width:520px;height:520px;background:{b};right:-140px;bottom:-220px;opacity:.55"></div>
      <div class="grid"></div>
      <div style="position:absolute;left:300px;top:20px;width:680px;height:620px;transform:scale(1.18);transform-origin:center">{motif(kind, p["slug"], a, b)}</div>
      <div class="eyebrow" style="position:absolute;left:56px;top:48px;color:{b}">{html.escape(cat)}</div>
      <div style="position:absolute;left:120px;bottom:110px;width:190px;height:190px;border-radius:44px;display:grid;place-items:center;font-size:100px;background:linear-gradient(135deg,{a}55,{b}33);border:1px solid rgb(255 255 255/.18);box-shadow:0 30px 60px -20px {a};backdrop-filter:blur(8px);transform:rotate(-8deg)">{GLYPH.get(p["slug"], "✨")}</div>
      <div style="position:absolute;right:56px;bottom:40px;font-family:JB;font-size:14px;color:#6b6990;letter-spacing:.2em">VSC · PROJECT</div>
    </div>'''

ACH = {
    "microsoft.webp": ("DP-600", "Microsoft Certified", "Fabric Analytics Engineer Associate", "#3b82f6", "#22d3ee"),
    "iitm.webp": ("2×", "IIT Madras Diplomas", "Programming + Data Science · CGPA 8.5", "#f59e0b", "#ef4444"),
    "kaggle.webp": ("0.187", "RMSLE on Kaggle", "LightGBM + CatBoost ensemble", "#22d3ee", "#8b5cf6"),
    "sebi.webp": ("50/50", "Perfect score", "SEBI–NISM Investor Certification", "#10b981", "#3b82f6"),
    "school.webp": ("10", "CGPA in Class X", "and 93% in Class XII (PCM)", "#a855f7", "#ec4899"),
}

def achievement(name, big, t1, t2, a, b):
    return f'''<div class="card shot" data-out="achievements/{name}" style="width:900px;height:900px">
      <div class="blob" style="width:600px;height:600px;background:{a};left:-150px;top:-150px"></div>
      <div class="blob" style="width:500px;height:500px;background:{b};right:-160px;bottom:-160px;opacity:.6"></div><div class="grid"></div>
      <svg style="position:absolute;inset:0" width="900" height="900"><circle cx="450" cy="400" r="250" fill="none" stroke="rgb(255 255 255/.14)" stroke-width="2" stroke-dasharray="4 10"/><circle cx="450" cy="400" r="300" fill="none" stroke="rgb(255 255 255/.07)" stroke-width="1.5"/></svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px">
        <div class="title" style="font-size:{200 if len(big)<=3 else 150}px;background:linear-gradient(135deg,#fff,{b});-webkit-background-clip:text;color:transparent">{big}</div>
        <div class="title" style="font-size:52px;margin-top:20px">{t1}</div>
        <div style="font-size:26px;margin-top:16px;color:#c9c7e8">{t2}</div>
      </div></div>'''

ART = [
    ("art-iitm.webp", "IIT MADRAS · BS DATA SCIENCE", ["Foundation", "Diploma · Programming", "Diploma · Data Science", "Degree level"], [True, True, True, False], "#f59e0b", "#8b5cf6"),
    ("art-fabric.webp", "MICROSOFT FABRIC", ["OneLake", "Lakehouse · Delta", "Medallion: Bronze → Silver → Gold", "Semantic model → Power BI"], [True]*4, "#3b82f6", "#22d3ee"),
    ("art-ml.webp", "MACHINE LEARNING", ["EDA & features", "LightGBM · CatBoost", "Cross-validation", "Ensemble → 0.18732"], [True]*4, "#ef4444", "#f59e0b"),
    ("art-agents.webp", "LLM AGENTS", ["Plan", "Use tools", "Verify", "Deploy"], [True]*4, "#8b5cf6", "#ec4899"),
]

def art(name, eyebrow, steps, done, a, b):
    rows = "".join(f'''<div style="display:flex;align-items:center;gap:30px">
        <div style="flex:none;width:86px;height:86px;border-radius:50%;display:grid;place-items:center;font-family:JB;font-size:34px;{'background:linear-gradient(135deg,'+a+','+b+');box-shadow:0 0 50px -10px '+a if d else 'border:3px dashed rgb(255 255 255/.45)'}">{"✓" if d else "…"}</div>
        <div><div class="eyebrow" style="font-size:16px;color:#a3a1c2">Step {i+1:02d}</div><div class="title" style="font-size:52px;margin-top:6px">{html.escape(s)}</div></div></div>''' for i, (s, d) in enumerate(zip(steps, done)))
    return f'''<div class="card shot" data-out="gallery/{name}" style="width:1000px;height:1250px">
      <div class="blob" style="width:700px;height:700px;background:{a};left:-250px;top:-250px"></div>
      <div class="blob" style="width:600px;height:600px;background:{b};right:-250px;bottom:-200px;opacity:.6"></div><div class="grid"></div>
      <div style="position:absolute;inset:110px 90px;display:flex;flex-direction:column;justify-content:space-between">
        <div class="eyebrow" style="color:#fff;font-size:24px">{eyebrow}</div>
        <div style="position:relative;display:flex;flex-direction:column;gap:70px">
          <div style="position:absolute;left:42px;top:40px;bottom:40px;width:3px;background:linear-gradient({a},{b});opacity:.5"></div>{rows}</div>
        <div style="font-family:JB;letter-spacing:.3em;color:#a3a1c2;font-size:18px">VSC · JOURNEY</div>
      </div></div>'''

def og():
    photo = (OUT / "photos/portrait-front.webp").as_uri()
    logo = (OUT / "brand/logo-1-monogram.svg").as_uri()
    p = CONTENT["settings"]["profile"]
    return f'''<div class="card shot" data-out="brand/og.png" style="width:1200px;height:630px">
      <div class="blob" style="width:600px;height:600px;background:#8b5cf6;left:-200px;top:-250px"></div>
      <div class="blob" style="width:500px;height:500px;background:#22d3ee;right:200px;bottom:-300px;opacity:.5"></div><div class="grid"></div>
      <img src="{photo}" style="position:absolute;right:0;top:0;height:630px;width:504px;object-fit:cover;mask-image:linear-gradient(90deg,transparent,#000 35%)">
      <div style="position:absolute;left:70px;top:70px;width:660px">
        <img src="{logo}" width="72" height="72">
        <div class="title" style="font-size:66px;margin-top:36px">{html.escape(p["name"])}</div>
        <div class="eyebrow" style="color:#22d3ee;margin-top:20px;font-size:17px;letter-spacing:.18em">{html.escape(p["headline"])}</div>
        <p style="margin-top:26px;font-size:23px;line-height:1.45;color:#c9c7e8">Machine learning · Microsoft Fabric · LLM agents · Full-stack apps</p>
      </div></div>'''

def main():
    projects = next(s for s in CONTENT["sections"] if s["key"] == "projects")["items"]
    cards = [project_cover(p) for p in projects]
    cards += [achievement(k, *v) for k, v in ACH.items()]
    cards += [art(*a) for a in ART]
    cards.append(og())
    page = f"<html><head><style>{BASE_CSS}</style></head><body>{''.join(cards)}</body></html>"
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(page)
        path = f.name
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page(viewport={"width": 1400, "height": 1000})
        pg.goto(pathlib.Path(path).as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(500)
        for el in pg.query_selector_all(".shot"):
            out = OUT / el.get_attribute("data-out")
            out.parent.mkdir(parents=True, exist_ok=True)
            tmp = out.with_suffix(".tmp.png")
            el.screenshot(path=str(tmp))
            im = Image.open(tmp).convert("RGB")
            if out.suffix == ".png":
                im.save(out, optimize=True)
            else:
                im.save(out, "WEBP", quality=86, method=6)
            tmp.unlink()
            print("✔", out.relative_to(ROOT))
        br.close()
    os.unlink(path)

if __name__ == "__main__":
    main()
