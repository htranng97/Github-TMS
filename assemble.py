"""Mã hoá bundle theo từng NPP + admin rồi ghép vào trang dashboard.
python assemble.py bundle.json  -> dist/index.html (bản đầy đủ, host GitHub Pages) + dist/artifact.html
Mật khẩu lưu ở passwords.json: giữ file này để lần cập nhật sau mật khẩu không đổi.
"""
import sys, os, json, gzip, base64, secrets, string, copy, re, datetime as dt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 200000
HERE = os.path.dirname(os.path.abspath(__file__))
b64 = lambda b: base64.b64encode(b).decode()

def enc(obj, pw):
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(pw.encode())
    ct = AESGCM(key).encrypt(iv, gzip.compress(json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode(), 9), None)
    return dict(salt=b64(salt), iv=b64(iv), ct=b64(ct))

def gen_pw(n=10):
    a = string.ascii_letters.replace('l', '').replace('I', '').replace('O', '') + '23456789'
    return ''.join(secrets.choice(a) for _ in range(n))

def npp_view(B, npp):
    """Bundle chỉ chứa số liệu của 1 NPP."""
    out = dict(order=[], completed=[], current=B['current'], months={}, __role=npp)
    for m in B['order']:
        D = B['months'][m]
        if npp not in D['npps']: continue
        d = copy.deepcopy(D)
        own = lambda arr, k='npp': [r for r in arr if r.get(k) == npp]
        d['npps'] = [npp]
        d['scorecard'] = own(D['scorecard']); d['total'] = d['scorecard'][0]
        d['npp_info'] = {npp: D['npp_info'][npp]}
        ti = D['err_keys'].index('TenantName')
        d['errors'] = [r for r in D['errors'] if r[ti] == npp]
        for k in ('pl_top', 'dt_top', 'cd_list', 'plan_list', 'late_list'): d[k] = own(D[k])
        d['users'] = dict(ALL=own(D['users']['ALL']))
        for k in ('daily', 'hours', 'geo_dist'): d[k] = {npp: D[k][npp], 'ALL': D[k][npp]}
        d['dq'] = None; d['sens'] = []
        d['meta'] = dict(D['meta'], orders=d['scorecard'][0]['orders'], plans=d['scorecard'][0]['plans'],
                         fill_gap=[x for x in D['meta']['fill_gap'] if x['npp'] == npp])
        out['order'].append(m); out['months'][m] = d
        if m in B['completed']: out['completed'].append(m)
    return out

def main(bundle_path):
    B = json.load(open(bundle_path))
    pw_path = os.path.join(HERE, 'passwords.json')
    try:
        PW = json.load(open(pw_path, encoding='utf-8-sig')) if os.path.exists(pw_path) and os.path.getsize(pw_path) else {}
    except ValueError as e:
        print(f'::error::Secret PASSWORDS_JSON sai định dạng (thiếu dấu phẩy/ngoặc kép?): {e}'); sys.exit(1)
    CI = bool(os.environ.get('CI'))  # chạy trên GitHub: không tự tạo mật khẩu mới (sẽ bị mất)
    if CI and 'admin' not in PW: print('::error::Secret PASSWORDS_JSON thiếu tài khoản admin hoặc dán sai định dạng'); sys.exit(1)
    PW.setdefault('admin', dict(npp='ALL', name='Admin HCM Zone 1 & 3', pw=gen_pw(12)))
    info = {}
    for m in B['order']: info.update(B['months'][m]['npp_info'])
    alias, blobs = {}, {}
    for n, i in sorted(info.items()):
        code = i.get('code') or n.lower()
        if code not in PW:
            if CI:
                print(f'::warning::NPP mới {n} ({code}) chưa có mật khẩu: thêm vào secret PASSWORDS_JSON. Tạm thời chỉ Admin xem được.')
                continue
            PW[code] = dict(npp=n, name=i['name'], pw=gen_pw())
        alias[n.lower()] = code
    if not CI: json.dump(PW, open(pw_path, 'w'), ensure_ascii=False, indent=1)
    blobs['admin'] = enc(dict(B, __role='admin'), PW['admin']['pw'])
    for code, v in PW.items():
        if code == 'admin' or v['npp'] not in info: continue
        blobs[code] = enc(npp_view(B, v['npp']), v['pw'])
    ml = lambda m: f"T{int(m[5:])}/{m[:4]}"
    built = B['months'][B['order'][-1]]['meta']['built']
    ENC = dict(iter=ITER, period=', '.join(ml(m) for m in B['order']), built=built, blobs=blobs)  # đăng nhập chỉ bằng mã NPP 8 số

    css = open(os.path.join(HERE, 'ref/css.txt')).read()
    app = open(os.path.join(HERE, 'ref/app.js')).read()
    app = app.replace("['months',`${DONE.length||3} tháng`,pMonths]", "['months',DONE.length?`${DONE.length} tháng`:'Nhiều tháng',pMonths]")
    tpl = open(os.path.join(HERE, 'template.html')).read()
    loader = open(os.path.join(HERE, 'loader.js')).read()
    logo_big = open(os.path.join(HERE, 'ref/img0.txt')).read()
    logo_sm = open(os.path.join(HERE, 'ref/img1.txt')).read()
    page = (tpl.replace('/*CSS*/', css)
               .replace('/*ENC*/', 'const ENC = ' + json.dumps(ENC, separators=(',', ':')) + ';')
               .replace('/*LOADER*/', loader).replace('/*APP*/', app))
    os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
    full = page.replace('<!--EG-->', f'<img class="eg" src="{logo_big}" alt="HEINEKEN EverGreen 2030">') \
               .replace('<!--MARK-->', f'<img src="{logo_sm}" alt="EverGreen 2030">')
    full = '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="robots" content="noindex,nofollow">\n</head><body>\n' + full + '\n</body></html>\n'
    open(os.path.join(HERE, 'dist/index.html'), 'w').write(full)
    art = page.replace('<!--EG-->', '').replace('<!--MARK-->', '<b style="color:var(--brand-deep);font-family:var(--f-head);font-size:.9rem">DA</b>') \
              .replace('HEINEKEN EverGreen 2030', 'EverGreen 2030')
    open(os.path.join(HERE, 'dist/artifact.html'), 'w').write(art)
    print('blobs', len(blobs), 'size', len(full) // 1024, 'KB')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'bundle.json')
