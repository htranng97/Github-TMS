"""Dựng dashboard 6 tiêu chí cho HCM Zone 1 & 3 từ mọi file .xlsx trong repo/thư mục.
python run_z4.py  ->  site/index.html (GitHub Pages) + dist/z4_artifact.html
Mật khẩu: passwords.json (hoặc secret PASSWORDS_JSON trên GitHub).
"""
import glob, os, sys, json, copy, datetime as dt
import pandas as pd
import build as B, build_z4 as Z
from assemble import enc, gen_pw, ITER

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
CI = bool(os.environ.get('CI'))

def kind(path):
    raw = pd.read_excel(path, header=None, nrows=10); cols = set()
    for i in range(len(raw)): cols |= set(map(str, raw.iloc[i].dropna()))
    if {'PlanNumber', 'OrderNumber'} <= cols: return 'tms'
    if {'DocNo', 'Sent_To_distributor'} <= cols: return 'fr'

import pickle
CACHE = '.z4cache.pkl'
if os.environ.get('FAST') and os.path.exists(CACHE):
    REG, PER, order, cur, src, built, f = pickle.load(open(CACHE, 'rb'))
else:
    files = sorted([p for p in glob.glob('**/*.xlsx', recursive=True)
                    if not os.path.basename(p).startswith('~$') and not p.startswith(('site', 'dist', '.')) and 'tai_khoan' not in p],
                   key=lambda p: (os.path.basename(p), p))
    T, F = [], []
    for p in files:
        k = kind(p)
        if k == 'tms': T.append(B.read_x(p, dtype=B.TMS_DT))
        elif k == 'fr': F.append(B.read_x(p, dtype=B.FR_DT))
        print(f'{(k or "-").upper():3}  {p}')
    if not T:
        print('::error::Chưa có file TMS Order Detail (.xlsx) trong repo'); sys.exit(1)
    t = pd.concat(T, ignore_index=True).drop_duplicates('OrderNumber', keep='last')
    f = pd.concat(F, ignore_index=True).drop_duplicates('DocNo', keep='last') if F else None
    built = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime('%d/%m/%Y %H:%M')
    src = 'TMS Order Detail' + (' + Fill Rate' if F else '')
    X = Z.prep(t, f)
    months = Z.month_split(X)
    order = sorted(months)
    last = months[order[-1]]
    cur = order[-1] if last.Date.max() < last.Date.max() + pd.offsets.MonthEnd(0) else None

    REG, PER = {}, {}
    for m in order:
        x = months[m]
        D = Z.build(x, src, built); REG[m] = D
        for n in D['sentinel'] if False else [s['npp'] for s in D['scorecard']]:
            d = Z.build(x[x.npp == n], src, built)
            d['rank'] = {n: D['rank'][n]}
            PER.setdefault(n, {})[m] = d
        print(f"{m}: {D['meta']['period']} · {D['meta']['orders']} đơn · {sum(s['overall']=='PASS' for s in D['scorecard'])}/{len(D['scorecard'])} NPP đạt")

    if not CI: pickle.dump((REG, PER, order, cur, src, built, f), open(CACHE, 'wb'))

# mật khẩu
pw_path = 'passwords.json'
try:
    PW = json.load(open(pw_path, encoding='utf-8-sig')) if os.path.exists(pw_path) and os.path.getsize(pw_path) else {}
except ValueError as e:
    print(f'::error::Secret PASSWORDS_JSON sai định dạng: {e}'); sys.exit(1)
if 'admin' not in PW:
    if CI: print('::error::PASSWORDS_JSON thiếu tài khoản admin'); sys.exit(1)
    PW['admin'] = dict(npp='ALL', name='Admin', pw=gen_pw(12))
code_of = {v['npp']: k for k, v in PW.items() if k != 'admin'}
if f is not None:
    for _, r in f.drop_duplicates('DisCode').iterrows():
        n = B.short(r.Distributor_Name)
        if n in PER and n not in code_of:
            if CI: print(f'::warning::NPP {n} ({r.DisCode}) chưa có mật khẩu trong PASSWORDS_JSON: chỉ Admin xem được.'); continue
            PW[str(r.DisCode)] = dict(npp=n, name=str(r.Distributor_Name), pw=f'{n}@123'); code_of[n] = str(r.DisCode)
if not CI: json.dump(PW, open(pw_path, 'w'), ensure_ascii=False, indent=1)

ml = lambda m: f"T{int(m[5:])}/{m[:4]}"
done = [m for m in order if m != cur]
blobs = {'admin': enc(dict(order=order, completed=done, current=cur, months=REG, __role='admin'), PW['admin']['pw'])}
for n, md in PER.items():
    c = code_of.get(n)
    if not c: continue
    o = sorted(md)
    blobs[c.lower()] = enc(dict(order=o, completed=[m for m in o if m != cur], current=cur, months=md, __role=n), PW[c]['pw'])
ENC = dict(iter=ITER, period=', '.join(ml(m) for m in order), built=built, blobs=blobs)

app = open('z4ref/app.js').read()
app = app.replace('/*DATA*/', 'const DATA = window.__DATA;')
app = app.replace("const ADMIN_USER='admin', ADMIN_PASS='123123a@';", "const ADMIN_USER='admin', ADMIN_PASS=null;")
import patch_app
app, miss = patch_app.patch(app)
import patch_ux
app, miss2 = patch_ux.patch(app)
if miss or miss2: print('::warning::Không vá được:', miss + miss2)
tpl = open('template_z4.html').read()
loader = open('loader_z4.js').read()
page = (tpl.replace('/*CSS*/', open('z4ref/css.css').read() + patch_ux.CSS).replace('/*APP*/', app)
           .replace('/*ENC*/', 'const ENC = ' + json.dumps(ENC, separators=(',', ':')) + ';').replace('/*LOADER*/', loader))
os.makedirs('site', exist_ok=True); os.makedirs('dist', exist_ok=True)
full = ('<!doctype html>\n<html lang="vi" data-theme="light"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="robots" content="noindex,nofollow">\n'
        '</head><body class="locked">\n' + page + '\n</body></html>\n')
open('site/index.html', 'w').write(full); open('site/.nojekyll', 'w').close()
open('dist/z4_artifact.html', 'w').write(page.replace('HEINEKEN EverGreen 2030', 'EverGreen 2030'))
print('Xong: site/index.html', len(full) // 1024, 'KB ·', len(blobs), 'tài khoản')
