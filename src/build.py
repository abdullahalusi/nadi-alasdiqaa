#!/usr/bin/env python3
"""يبني public/index.html من الأجزاء في src/parts. شغّله من جذر المستودع: python3 src/build.py"""
import os, re
R = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(R, 'parts') + '/'
css = open(P+'base.css').read() + open(P+'extra.css').read()
js = open(P+'standalone.js').read() + "\n'use strict';\n" + open(P+'core.js').read().replace("'use strict';\n", "", 1)
for f in ['fw.js','bj.js','rl.js','pk.js','dm.js','cnwords.js','cn.js','bg.js','boot.js']: js += '\n' + open(P+f).read()
js = re.sub(r"const GAME_URL = '[^']*';", "const GAME_URL = location.origin + location.pathname;", js)
body = '<div class="bgl menu"></div><div class="bgl bj"></div><div class="bgl pk"></div><div class="bgl rl"></div><div class="bgl dm"></div><div class="bgl cn"></div><div class="bgl bgb"></div>\n<div class="bgsuits" id="bgsuits"></div>\n<div id="toasts"></div>\n' + open(P+'auth.html').read() + open(P+'body.html').read()
html = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>نادي الأصدقاء — صالة الألعاب</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Reem+Kufi:wght@600;700&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body data-theme="">
{body}
<script>
{js}
</script>
</body>
</html>
'''
html = html.replace('افتح اللعبة من رابطها على claude.ai وأنت مسجّل الدخول لتلعب مع أصدقائك. يمكنك اللعب الفردي الآن.', 'تعذّر الاتصال بالخادم. تأكد من الإنترنت ثم حاول مجدداً، أو العب فردياً الآن.')
open(os.path.join(R, '..', 'public', 'index.html'), 'w').write(html)
print('built public/index.html', len(html))
