"""Build toàn bộ dashboard từ thư mục data/.
Thả file xuất TMS Order Detail và Fill Rate vào data/ (hoặc thư mục con bất kỳ), tên gì cũng được.
Script tự nhận loại file theo cột và tự chia tháng theo ngày trong dữ liệu.
Đơn trùng giữa các file: lấy bản ở file có tên xếp sau (tên file xuất có ngày giờ nên là file mới hơn).
Kết quả: site/index.html
"""
import glob, os, sys, shutil
import pandas as pd
import build, assemble

HERE = os.path.dirname(os.path.abspath(__file__))

def kind(path):
    raw = pd.read_excel(path, header=None, nrows=10)
    cols = set()
    for i in range(len(raw)): cols |= set(map(str, raw.iloc[i].dropna()))
    if {'PlanNumber', 'OrderNumber'} <= cols: return 'tms'
    if {'DocNo', 'Sent_To_distributor'} <= cols: return 'fr'
    return None

files = [p for p in glob.glob(os.path.join(HERE, '**', '*.xlsx'), recursive=True)
         if not os.path.basename(p).startswith('~$') and os.sep + '.' not in os.path.relpath(p, HERE)
         and not os.path.relpath(p, HERE).startswith(('site', 'dist'))]
files.sort(key=lambda p: (os.path.basename(p), p))
T, F = [], []
for p in files:
    k = kind(p)
    if k == 'tms': T.append(build.read_x(p, dtype=build.TMS_DT))
    elif k == 'fr': F.append(build.read_x(p, dtype=build.FR_DT))
    else: print('Bỏ qua (không nhận ra loại file):', os.path.relpath(p, HERE)); continue
    print(f'{k.upper():3}  {os.path.relpath(p, HERE)}')
if not T or not F:
    print('::error::Cần ít nhất 1 file TMS Order Detail và 1 file Fill Rate (.xlsx) trong repo. Đang có: '
          f'{len(T)} file TMS, {len(F)} file Fill Rate.'); sys.exit(1)

t = pd.concat(T, ignore_index=True).drop_duplicates('OrderNumber', keep='last')
f = pd.concat(F, ignore_index=True).drop_duplicates('DocNo', keep='last')
t['Date'] = pd.to_datetime(t['Date'])
t['_m'] = t.Date.dt.strftime('%Y-%m')
if 'Calendar_Month' in f: f['_m'] = f.Calendar_Month.astype(str).str[:4] + '-' + f.Calendar_Month.astype(str).str[4:6]
else: f['_m'] = pd.to_datetime(f.Delivered).dt.strftime('%Y-%m')

args = []
for m in sorted(t._m.unique()):
    tm = t[t._m == m].drop(columns='_m')
    fm = f[(f._m == m) | f.DocNo.isin(tm.OrderNumber)].drop(columns='_m')
    if fm.empty: print(f'Bỏ qua tháng {m}: chưa có Fill Rate'); continue
    args += [tm, fm]

os.chdir(HERE)
B = build.main(args, 'bundle.json')
for k, m in B['months'].items():
    np_ = sum(s['overall'] == 'PASS' for s in m['scorecard'])
    print(f"{k}: {m['meta']['period']} · {m['meta']['orders']} đơn · {np_}/{len(m['scorecard'])} NPP đạt")
assemble.main('bundle.json')
os.makedirs('site', exist_ok=True)
shutil.copy('dist/index.html', 'site/index.html')
open('site/.nojekyll', 'w').close()
print('Xong: site/index.html')
