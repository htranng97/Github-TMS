"""TMS Data Accuracy – HCM Zone 1 & 3.
Đọc TMS Order Detail + Fill Rate, tính KPI, xuất bundle JSON.
Dùng: python build.py <tms.xlsx> <fill_rate.xlsx> [<tms2.xlsx> <fr2.xlsx> ...] -> bundle.json
Mỗi cặp file là 1 tháng; tháng mới nhất là Current nếu chưa hết tháng.
"""
import sys, json, math, re, datetime as dt
import numpy as np, pandas as pd

TH = dict(plan_err_pct=.30, npp_plan_tol=.05, dt_month_pct=.05, payload_tol=.05, payload_ratio=1.5,
          dt_gap_min=2, dt_dist_min=10, dt_route_pct=.30, geo=85, geo_radius_m=50, geo_gap_min=2,
          work_start=6, work_end=20, ontime=95, wh_end=20, sla_hours=24, send_cutoff=17)
FILL_GAP_PCT = 70          # cảnh báo khi < 70% đơn ghép được Fill Rate
# Khoảng ngày loại khỏi toàn bộ KPI (vd sự cố hệ thống): [('dd/mm/yyyy', 'dd/mm/yyyy', 'ghi chú'), ...]
EXCLUDE = [('16/09/2026', '23/09/2026', '')]
BU = 'HCM Zone 1 & 3'

TMS_DT = {'OutletCode': str, 'PlanNumber': str, 'OrderNumber': str, 'username': str}
FR_DT = {'DisCode': str, 'DocNo': str, 'SellTo': str, 'Calendar_Month': str}

def read_x(path, **kw):
    raw = pd.read_excel(path, header=None, nrows=10)
    hdr = next(i for i in range(10) if raw.iloc[i].notna().sum() > 5)
    return pd.read_excel(path, header=hdr, **kw)

def hav(la1, lo1, la2, lo2):
    r = 6371000; p = np.pi / 180
    a = np.sin((la2 - la1) * p / 2) ** 2 + np.cos(la1 * p) * np.cos(la2 * p) * np.sin((lo2 - lo1) * p / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))

def utype(u):
    s = str(u).strip()
    if 'DSA' in s.upper(): return 'DSA'
    if re.fullmatch(r'0\d{9}', s): return 'SĐT tài xế'
    if re.fullmatch(r'\d{2}[A-Z]{1,2}\d{4,6}', re.sub(r'[\s\-\.]', '', s).upper()): return 'Biển số xe'
    return 'Sai'

def short(name):  # 'P75(D)-CTY ...' -> 'P75D'
    return re.sub(r'[()\s]', '', str(name).split('-')[0]).upper()

def allow(n, tol):  # số lỗi tối đa vẫn < tol
    return max(0, math.ceil(n * tol) - 1) if n else 0

def f_dt(x, fmt='%d/%m/%Y %H:%M'):
    return None if pd.isna(x) else pd.Timestamp(x).strftime(fmt)

def pct(a, b): return round(a / b * 100, 4) if b else 0.0

def sla24(created, delivered, sunday_off):
    """Giờ SLA: đơn tạo từ 17:00 -> tính từ 00:00 hôm sau (thứ 7 -> thứ 2); trừ Chủ nhật nếu NPP không giao CN."""
    if pd.isna(created) or pd.isna(delivered): return None
    s = pd.Timestamp(created)
    if s.hour >= TH['send_cutoff'] and pd.Timestamp(delivered).normalize() > s.normalize():
        s = (s + pd.Timedelta(days=1)).normalize()
        if s.dayofweek == 6 and sunday_off: s += pd.Timedelta(days=1)
        if s > pd.Timestamp(delivered): s = pd.Timestamp(delivered).normalize()
    elif s.dayofweek == 6 and sunday_off and pd.Timestamp(delivered).normalize() > s.normalize():
        s = (s + pd.Timedelta(days=1)).normalize()
    h = (pd.Timestamp(delivered) - s).total_seconds() / 3600
    if sunday_off and h > 0:
        d = s.normalize() + pd.Timedelta(days=1)
        while d < pd.Timestamp(delivered):
            if d.dayofweek == 6: h -= 24
            d += pd.Timedelta(days=1)
    return h

def build_month(tms_paths, fr_paths):
    """Nhận 1 hoặc nhiều file mỗi loại (theo thứ tự cũ → mới); đơn trùng lấy bản ở file mới nhất."""
    if isinstance(tms_paths, pd.DataFrame):          # run_all đã đọc & gộp sẵn
        t, f, dup = tms_paths.copy(), fr_paths.copy(), 0
    else:
        tms_paths = [tms_paths] if isinstance(tms_paths, str) else tms_paths
        fr_paths = [fr_paths] if isinstance(fr_paths, str) else fr_paths
        ts = [read_x(p, dtype=TMS_DT) for p in tms_paths]
        dup = sum(int(x.OrderNumber.duplicated().sum()) for x in ts)
        t = pd.concat(ts, ignore_index=True).drop_duplicates('OrderNumber', keep='last')
        f = pd.concat([read_x(p, dtype=FR_DT) for p in fr_paths], ignore_index=True).drop_duplicates('DocNo', keep='last')
    t['Date'] = pd.to_datetime(t['Date']); t = t.sort_values(['Date', 'PlanNumber'])
    excluded = []
    for a, b, note in EXCLUDE:
        m = t.Date.between(pd.to_datetime(a, dayfirst=True), pd.to_datetime(b, dayfirst=True))
        if m.any():
            excluded.append(dict(start=a, end=b, note=note, orders=int(m.sum()), plans=int(t[m].PlanNumber.nunique())))
            t = t[~m]
    rows_tms = len(t) + dup
    t = t.copy()
    # thông tin NPP
    f['npp'] = f.Distributor_Name.map(short)
    info = {}
    for _, r in f.drop_duplicates('npp').iterrows():
        info[r.npp] = dict(code=str(r.DisCode), name=str(r.Distributor_Name).split('-', 1)[-1].strip(),
                           area=f"{r.Region_Name} · {r.Area_Name}")
    t['npp'] = t.TenantName.astype(str).str.upper().str.replace(r'[()\s]', '', regex=True)
    for n in t.npp.unique():
        info.setdefault(n, dict(code=None, name=n, area=str(t[t.npp == n].Region.iloc[0])))
    # ghép Fill Rate
    t = t.merge(f[['DocNo', 'Sent_To_distributor']], how='left', left_on='OrderNumber', right_on='DocNo')
    t['matched'] = t.DocNo.notna()
    t['utype'] = t.username.map(utype)
    t['dsa'] = t.utype.eq('DSA')
    # thứ tự & khoảng cách trong chuyến
    t = t.sort_values(['PlanNumber', 'DeliverDateTime'], na_position='last').reset_index(drop=True)
    t['seq'] = t.groupby('PlanNumber').cumcount() + 1
    g = t.groupby('PlanNumber')
    pt, pla, plo = g.DeliverDateTime.shift(), g.lat_to.shift(), g.long_to.shift()
    t['gap'] = ((t.DeliverDateTime - pt).dt.total_seconds() / 60).round(1)
    t['step_m'] = hav(pla, plo, t.lat_to, t.long_to).round(1)
    quick = t.gap.notna() & (t.gap < TH['dt_gap_min']) & (t.step_m > TH['dt_dist_min'])
    # --- D&T (không tính DSA)
    t['e_dt'] = quick & ~t.dsa
    nd = t[~t.dsa].groupby('PlanNumber').agg(o=('OrderNumber', 'size'), b=('e_dt', 'sum'))
    dt_fail_plans = set(nd[nd.b / nd.o > TH['dt_route_pct']].index)
    t['dt_plan_fail'] = t.PlanNumber.isin(dt_fail_plans)
    # --- Payload
    pw = t.groupby('PlanNumber').agg(w=('Assigned_Weight', 'sum'), cap=('TruckCapacityWeight', 'max'))
    pw['ratio'] = pw.w / pw.cap.replace(0, np.nan)
    t['plan_ratio'] = t.PlanNumber.map(pw.ratio).round(3)
    t['e_pl'] = t.plan_ratio >= TH['payload_ratio']
    # --- Created Date
    t['cd_h'] = (t.DeliverDateTime - t.Sent_To_distributor).dt.total_seconds() / 3600
    t['e_cd'] = t.Sent_To_distributor > t.DeliverDateTime
    # --- User
    t['e_us'] = t.utype.eq('Sai')
    # --- Geo (không tính DSA)
    hr = t.DeliverDateTime.dt.hour
    t['g_v'] = t.distance_to_dropped > TH['geo_radius_m']
    t['g_w'] = t.gap.notna() & (t.gap <= TH['geo_gap_min']) & (t.step_m > TH['dt_dist_min'])
    t['g_x'] = t.DeliverDateTime.isna() | (hr < TH['work_start']) | (hr >= TH['work_end'])
    t['e_geo'] = ~t.dsa & (t.g_v | t.g_w | t.g_x)
    # --- On time / 24H
    sun_on = set(t[t.DeliverDateTime.dt.dayofweek == 6].npp)
    t['h24_dur'] = [sla24(c, d, n not in sun_on) for c, d, n in zip(t.Sent_To_distributor, t.DeliverDateTime, t.npp)]
    t['h24_na'] = t.h24_dur.isna()
    t['h24_over'] = ~t.h24_na & ((t.h24_dur > TH['sla_hours']) | (t.h24_dur < 0))
    t['wh_late'] = ~t.h24_na & ~t.h24_over & (hr >= TH['wh_end'])
    t['ot_fail'] = t.is_ontime.fillna(0).astype(int).eq(0)
    # --- lỗi theo đơn & chuyến
    TYPES = [('e_dt', 'D&T'), ('e_pl', 'Payload'), ('e_cd', 'Created Date'), ('e_us', 'User'), ('e_geo', 'Geo')]
    t['loi'] = t.apply(lambda r: ' + '.join(n for c, n in TYPES if r[c]), axis=1)
    t['err'] = t.loi.ne('')
    pe = t.groupby('PlanNumber').agg(o=('OrderNumber', 'size'), e=('err', 'sum'))
    pe['r'] = pe.e / pe.o
    t['plan_orders'] = t.PlanNumber.map(pe.o); t['plan_err'] = t.PlanNumber.map(pe.e)
    t['plan_err_ratio'] = t.PlanNumber.map(pe.r).round(4)
    t['plan_fail'] = t.plan_err_ratio > TH['plan_err_pct']

    def why(r):
        w = []
        if r.e_dt: w.append(f"D&T: cách đơn trước {r.gap:g} phút, {r.step_m:,.0f}m".replace(',', '.'))
        if r.e_pl: w.append(f"Payload: chuyến chở {r.plan_ratio:.2f}× tải trọng")
        if r.e_cd: w.append(f"Created Date: tạo sau giao {abs(r.cd_h):.1f} giờ")
        if r.e_us: w.append(f"User: tài khoản '{r.username}' không hợp lệ")
        if r.e_geo:
            gg = []
            if r.g_v: gg.append(f"lệch {r.distance_to_dropped:,.0f}m".replace(',', '.'))
            if r.g_w: gg.append(f"cách đơn trước {r.gap:g} phút")
            if r.g_x: gg.append('ngoài giờ' if pd.notna(r.DeliverDateTime) else 'chưa có giờ giao')
            w.append('Geo: ' + ', '.join(gg))
        return '; '.join(w)
    t['ly_do'] = t.apply(why, axis=1)
    t['day'] = t.Date.dt.strftime('%d/%m')

    def score(d, key):
        plans = d.PlanNumber.nunique(); orders = len(d)
        pl_f = d[d.e_pl].PlanNumber.nunique()
        nds = d[~d.dsa]; dt_plans = nds.PlanNumber.nunique()
        dt_f = nds[nds.dt_plan_fail].PlanNumber.nunique()
        cd_r = d[d.e_cd].PlanNumber.nunique()
        us = d.drop_duplicates(['npp', 'username'])
        wrong = sorted(us[us.utype == 'Sai'].username.astype(str).unique())
        gs = nds; geo_fail = int(gs.e_geo.sum())
        pf = d[d.plan_fail].drop_duplicates('PlanNumber')
        drivers = {k: 0 for k in ['Geo', 'D&T', 'Payload', 'Created Date', 'User']}
        for p in pf.PlanNumber:
            l = set(' + '.join(d[d.PlanNumber == p].loi).split(' + '))
            for k in drivers:
                if k in l: drivers[k] += 1
        t24s = d[~d.h24_na]
        bins = [0] * 6
        for v in t24s.h24_dur:
            bins[0 if v < 0 else 1 if v <= 12 else 2 if v <= 24 else 3 if v <= 48 else 4 if v <= 72 else 5] += 1
        s = dict(npp=key, orders=orders, plans=plans,
                 payload_plans_fail=pl_f, payload_fail_pct=pct(pl_f, plans),
                 dt_plans=dt_plans, dt_routes_fail=dt_f, dt_route_fail_pct=pct(dt_f, dt_plans),
                 dt_excl_orders=int(d.dsa.sum()), dt_excl_plans=plans - dt_plans,
                 cd_fail=int(d.e_cd.sum()), cd_routes_fail=cd_r,
                 users_total=len(us), users_wrong=len(wrong), users_wrong_list=wrong,
                 user_types={k: int(v) for k, v in d.utype.value_counts().items()},
                 geo_scope=len(gs), geo_fail=geo_fail, geo_pct=pct(len(gs) - geo_fail, len(gs)) if len(gs) else 100.0,
                 geo_v=int((gs.g_v).sum()), geo_w=int(gs.g_w.sum()), geo_x=int(gs.g_x.sum()),
                 plan_fail=len(pf), plan_fail_pct=pct(len(pf), plans), plan_drivers=drivers,
                 ot_fail=int(d.ot_fail.sum()), ot_pct=pct(orders - int(d.ot_fail.sum()), orders),
                 t24_scope=len(t24s), h24_fail=int(t24s.h24_over.sum()), wh_fail=int(t24s.wh_late.sum()),
                 h24_na=int(d.h24_na.sum()), h24_bins=bins)
        s['t24_fail'] = s['h24_fail'] + s['wh_fail']
        s['t24_pct'] = pct(s['t24_scope'] - s['t24_fail'], s['t24_scope']) if s['t24_scope'] else 100.0
        P = lambda ok: 'PASS' if ok else 'FAIL'
        s['v_payload'] = P(s['payload_fail_pct'] < TH['payload_tol'] * 100)
        s['v_dt'] = P(s['dt_route_fail_pct'] < TH['dt_month_pct'] * 100)
        s['v_created'] = P(cd_r == 0); s['v_username'] = P(not wrong)
        s['v_geo'] = P(s['geo_pct'] >= TH['geo']); s['v_plan'] = P(s['plan_fail_pct'] <= TH['npp_plan_tol'] * 100)
        s['v_ontime'] = P(s['ot_pct'] > TH['ontime']); s['v_24'] = P(s['t24_pct'] > TH['ontime'])
        v4 = [s['v_payload'], s['v_dt'], s['v_created'], s['v_username']]
        s['n_fail'] = v4.count('FAIL'); s['overall'] = P(s['n_fail'] == 0)
        pa, da = allow(plans, TH['payload_tol']), allow(dt_plans, TH['dt_month_pct'])
        s['margin'] = dict(pl_allow=pa, pl_margin=pa - pl_f, dt_allow=da, dt_margin=da - dt_f)
        return s

    npps = sorted(t.npp.unique(), key=lambda x: (re.sub(r'\d', '', x), int(re.sub(r'\D', '', x) or 0)))
    scorecard = [score(t[t.npp == n], n) for n in npps]
    total = score(t, 'ALL')

    def daily(d):
        out = []
        for day, x in d.groupby(d.Date.dt.normalize()):
            nds = x[~x.dsa]; p = nds.PlanNumber.nunique(); f_ = nds[nds.dt_plan_fail].PlanNumber.nunique()
            g = x[~x.dsa]; s24 = x[~x.h24_na]
            out.append(dict(day=day.strftime('%d/%m'), plans=x.PlanNumber.nunique(), dtr=f_, dtr_pct=pct(f_, p),
                            cd=x[x.e_cd].PlanNumber.nunique(), orders=len(x), err=int(x.err.sum()),
                            geo=pct(len(g) - int(g.e_geo.sum()), len(g)) if len(g) else None,
                            ot=pct(len(x) - int(x.ot_fail.sum()), len(x)),
                            t24=pct(len(s24) - int((s24.h24_over | s24.wh_late).sum()), len(s24)) if len(s24) else None))
        return out
    def hours(d): return [int(v) for v in d.DeliverDateTime.dt.hour.value_counts().reindex(range(24), fill_value=0)]
    def gdist(d):
        x = d[~d.dsa].distance_to_dropped
        cuts = [('0–50m', 0, 50), ('50–200m', 50, 200), ('200m–1km', 200, 1000), ('1–5km', 1000, 5000), ('>5km', 5000, 1e12)]
        return [dict(label=l, n=int(((x > a) | ((a == 0) & (x >= 0))).__and__(x <= b).sum())) for l, a, b in cuts]
    scopes = ['ALL'] + npps
    sub = lambda k: t if k == 'ALL' else t[t.npp == k]

    # danh sách
    e = t[t.err].sort_values(['Date', 'npp', 'PlanNumber', 'seq'])
    EK = ['Date', 'TenantName', 'PlanNumber', 'OrderNumber', 'OutletCode', 'username', 'utype', 'DriverName', 'Status',
          'Sent_To_distributor', 'DeliverDateTime', 'PromisedDate', 'distance_to_dropped', 'gap', 'seq', 'plan_orders',
          'plan_err', 'plan_err_ratio', 'plan_fail', 'plan_ratio', 'TruckCategory', 'TruckCapacityWeight',
          'Assigned_Weight', 'h24_dur', 'loi', 'ly_do']
    def cell(r, k):
        v = r[k]
        if k == 'TenantName': return r.npp
        if k == 'Date': return f_dt(v, '%d/%m/%Y')
        if k in ('Sent_To_distributor', 'DeliverDateTime'): return f_dt(v)
        if k == 'PromisedDate': return f_dt(v, '%d/%m/%Y')
        if isinstance(v, (np.bool_, bool)): return bool(v)
        if isinstance(v, (float, np.floating)): return None if pd.isna(v) else round(float(v), 2)
        if isinstance(v, (np.integer,)): return int(v)
        return None if pd.isna(v) else v
    errors = [[cell(r, k) for k in EK] for _, r in e.iterrows()]

    pl = t[t.e_pl].drop_duplicates('PlanNumber').sort_values('plan_ratio', ascending=False)
    pl_top = [dict(plan=r.PlanNumber, npp=r.npp, date=r.day, truck=r.DriverName, orders=int(pe.o[r.PlanNumber]),
                   weight=round(float(pw.w[r.PlanNumber]), 2), cap=float(pw.cap[r.PlanNumber]), ratio=round(float(r.plan_ratio), 2)) for _, r in pl.iterrows()]
    dtp = t[t.dt_plan_fail].drop_duplicates('PlanNumber')
    dt_top = sorted([dict(plan=r.PlanNumber, npp=r.npp, date=r.day, user=r.username, orders=int(nd.o[r.PlanNumber]),
                          bad=int(nd.b[r.PlanNumber])) for _, r in dtp.iterrows()], key=lambda x: -x['bad'] / x['orders'])
    cd_list = [dict(order=r.OrderNumber, plan=r.PlanNumber, npp=r.npp, user=r.username, created=f_dt(r.Sent_To_distributor),
                    delivered=f_dt(r.DeliverDateTime), hours=round(abs(r.cd_h), 1)) for _, r in t[t.e_cd].iterrows()]
    pfl = t[t.plan_fail].drop_duplicates('PlanNumber')
    plan_list = []
    for _, r in pfl.iterrows():
        x = t[t.PlanNumber == r.PlanNumber]
        ty = [n for _, n in TYPES if n in set(' + '.join(x.loi).split(' + '))]
        plan_list.append(dict(plan=r.PlanNumber, npp=r.npp, date=r.day, user=r.username, orders=len(x), err=int(x.err.sum()),
                              ratio=round(r.plan_err_ratio * 100, 1), types=', '.join(ty)))
    plan_list.sort(key=lambda x: -x['ratio'])
    late = t[t.ot_fail | t.h24_over | t.wh_late]
    late_list = []
    for _, r in late.iterrows():
        w = []
        if r.ot_fail:
            if pd.isna(r.DeliverDateTime): w.append('On time: trễ chưa có giờ giao')
            else:
                dd = (r.DeliverDateTime.normalize() - pd.Timestamp(r.PromisedDate).normalize()).days
                w.append(f'On time: trễ {dd} ngày so với ngày hứa' if dd > 0 else 'On time: trễ trong ngày hứa (SLA giờ của TMS)')
        if r.h24_over: w.append(f'24H: {r.h24_dur:.1f} giờ SLA' if r.h24_dur >= 0 else '24H: tạo sau khi giao')
        if r.wh_late: w.append(f"24H: giao sau {TH['wh_end']}:00")
        late_list.append(dict(day=r.day, npp=r.npp, plan=r.PlanNumber, order=r.OrderNumber, user=r.username,
                              created=f_dt(r.Sent_To_distributor) or '', delivered=f_dt(r.DeliverDateTime),
                              promised=f_dt(r.PromisedDate, '%d/%m'), hours=None if pd.isna(r.h24_dur) else round(r.h24_dur, 1),
                              why=' · '.join(w), ot=bool(r.ot_fail), h24=bool(r.h24_over), wh=bool(r.wh_late)))
    users = []
    for (n, u), x in t.groupby(['npp', 'username']):
        users.append(dict(username=u, npp=n, utype=x.utype.iloc[0], orders=len(x), plans=x.PlanNumber.nunique(),
                          err=int(x.err.sum()), dt=int(x.e_dt.sum()), pl=int(x.e_pl.sum()), cd=int(x.e_cd.sum()),
                          geo=int(x.e_geo.sum()), ot=int(x.ot_fail.sum()), t24=int((x.h24_over | x.wh_late).sum())))
    users.sort(key=lambda u: (-u['err'], -u['orders']))

    # chất lượng dữ liệu
    d0, d1 = t.Date.min(), t.Date.max() + pd.Timedelta(days=1)
    unm = t[~t.matched]
    dq = dict(rows_tms=rows_tms, dup_orders=dup, rows_fr=len(f), matched=int(t.matched.sum()),
              tms_unmatched=len(unm), fr_unmatched=int((~f.DocNo.isin(t.OrderNumber)).sum()),
              tms_unmatched_rows=[dict(npp=r.npp, order=r.OrderNumber, status=f"{r.Status} · {r.day}") for _, r in unm.head(300).iterrows()],
              null_deliver=int(t.DeliverDateTime.isna().sum()),
              deliver_after_period=int((t.DeliverDateTime >= d1 + pd.Timedelta(days=1)).sum()),
              deliver_before_period=int((t.DeliverDateTime < d0).sum()),
              geo_out5k=int((t.distance_to_dropped > 5000).sum()), geo_max=float(t.distance_to_dropped.max()),
              plans_mixed_cap=int((t.groupby('PlanNumber').TruckCapacityWeight.nunique() > 1).sum()),
              cd_neg=int(t.e_cd.sum()), status={k: int(v) for k, v in t.Status.value_counts().items()})
    # so sánh cách tính (độ nhạy)
    def sens_v(gap=TH['dt_gap_min'], dist=TH['dt_dist_min'], rp=TH['dt_route_pct'], pr=TH['payload_ratio']):
        q = t.gap.notna() & (t.gap < gap) & (t.step_m > dist) & ~t.dsa
        b = t[~t.dsa].assign(q=q).groupby('PlanNumber').agg(o=('q', 'size'), b=('q', 'sum'))
        fp = set(b[b.b / b.o > rp].index); v = {}
        for s in scorecard:
            x = t[t.npp == s['npp']]; nds = x[~x.dsa]
            dtp_ = nds.PlanNumber.nunique(); dtf = nds[nds.PlanNumber.isin(fp)].PlanNumber.nunique()
            plf = x[x.plan_ratio >= pr].PlanNumber.nunique()
            ok = pct(dtf, dtp_) < TH['dt_month_pct'] * 100 and pct(plf, x.PlanNumber.nunique()) < TH['payload_tol'] * 100 \
                and s['v_created'] == 'PASS' and s['v_username'] == 'PASS'
            v[s['npp']] = 'PASS' if ok else 'FAIL'
        return v
    sens = []
    for lbl, kw in [('Đang áp dụng', {}), ('D&T: < 1 phút', dict(gap=1)), ('D&T: < 3 phút', dict(gap=3)),
                    ('D&T: > 50m', dict(dist=50)), ('D&T: chuyến lỗi > 20% đơn', dict(rp=.2)),
                    ('Payload: ≥ 1,2× tải trọng', dict(pr=1.2))]:
        v = sens_v(**kw); sens.append(dict(label=lbl, v=v, pass_=sum(x == 'PASS' for x in v.values())))
    for s in sens: s['pass'] = s.pop('pass_')

    fill_gap = []
    for n in npps:
        x = t[t.npp == n]; m = round(x.matched.mean() * 100, 1)
        if m < FILL_GAP_PCT: fill_gap.append(dict(npp=n, matched_pct=m))
    period = f"{t.Date.min():%d/%m/%Y} – {t.Date.max():%d/%m/%Y}"
    return dict(
        key=f"{t.Date.min():%Y-%m}", last_day=t.Date.max(),
        data=dict(thresholds=TH, npps=npps, err_keys=EK, errors=errors, scorecard=scorecard, total=total,
                  npp_info={n: info[n] for n in npps},
                  meta=dict(period=period, orders=len(t), plans=int(t.PlanNumber.nunique()), bu=BU,
                            src='TMS Order Detail + Fill Rate', built=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime('%d/%m/%Y %H:%M'),
                            excluded=excluded, fill_gap=fill_gap,
                            fr_last=f_dt(f.Delivered.max()) if 'Delivered' in f else None),
                  users=dict(ALL=users), pl_top=pl_top, dt_top=dt_top, cd_list=cd_list, plan_list=plan_list,
                  late_list=late_list, daily={k: daily(sub(k)) for k in scopes}, hours={k: hours(sub(k)) for k in scopes},
                  geo_dist={k: gdist(sub(k)) for k in scopes}, dq=dq, sens=sens))

def main(args, out='bundle.json'):
    """args: [tms, fr, tms, fr, ...]; mỗi phần tử là đường dẫn hoặc danh sách đường dẫn."""
    months = [build_month(args[i], args[i + 1]) for i in range(0, len(args), 2)]
    months.sort(key=lambda m: m['key'])
    order = [m['key'] for m in months]
    last = months[-1]
    month_end = (pd.Timestamp(last['key'] + '-01') + pd.offsets.MonthEnd(0))
    cur = last['key'] if last['last_day'] < month_end else None
    bundle = dict(order=order, completed=[k for k in order if k != cur], current=cur,
                  months={m['key']: m['data'] for m in months})
    json.dump(bundle, open(out, 'w'), ensure_ascii=False, default=str)
    return bundle

if __name__ == '__main__':
    b = main(sys.argv[1:])
    for k, m in b['months'].items():
        print(k, m['meta']['period'], m['meta']['orders'], 'đơn', m['meta']['plans'], 'chuyến')
        for s in m['scorecard'] + [m['total']]:
            print(f"{s['npp']:5} {s['overall']:4} PL {s['payload_fail_pct']:.2f} DT {s['dt_route_fail_pct']:.2f} ({s['dt_routes_fail']}/{s['dt_plans']}) CD {s['cd_routes_fail']} U {s['users_wrong']} "
                  f"Geo {s['geo_pct']:.1f} Plan {s['plan_fail_pct']:.1f} OT {s['ot_pct']:.1f} 24H {s['t24_pct']:.1f} na {s['h24_na']} DSA {s['user_types'].get('DSA',0)}")
        print('fill_gap', m['meta']['fill_gap'], 'errors', len(m['errors']))
