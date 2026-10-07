"""TMS Data Accuracy – HCM Zone 1 & 3, chấm theo bộ 6 tiêu chí (mẫu dashboard Zone 4).
Chỉ cần file TMS Order Detail. Xuất DATA theo đúng cấu trúc giao diện mẫu, mỗi tháng một DATA.
"""
import math, re, datetime as dt
import numpy as np, pandas as pd

TH = {"username": 100.0, "distance_time": 100.0, "geo": 85.0, "ontime": 95.0, "successful": 95.0, "payload": 100.0,
      "dt_route_pct": 0.3, "dt_month_pct": 0.05, "dt_routes_month": 10, "dt_max_bad_outlets": 4, "dt_gap_min": 2,
      "geo_radius_m": 50, "geo_gap_min": 2, "payload_ratio": 1.5, "work_start": 6, "work_end": 20, "small_sample": 30}
BU, REGION = 'Greater HCM', 'HCM Zone 1 & 3'
EXCLUDE = [('16/09/2026', '23/09/2026')]
EK = ['Date', 'BU', 'Region', 'TenantName', 'PlanNumber', 'DriverName', 'Assigned_Weight', 'Assigned_Quantity', 'OutletCode',
      'OrderNumber', 'DeliverDate', 'DeliverDateTime', 'RouteConfirmDate', 'PromisedDate', 'TruckCategory', 'TruckCapacityWeight',
      'Status', 'TMS_Planned_Distance', 'TMS_Actual_Distance', 'distance_to_dropped', 'username', 'is_ontime', 'lat_to', 'long_to',
      'time_outlet_outlet', 'gap_prev_min', 'seq1', 'plan_orders', 'late_days', 'plan_ratio', 'dkey', 'loi', 'geo_why', 'OutletName']
CSV = [[k, k] for k in EK[:9]] + [['Outlet', 'OutletName']] + [[k, k] for k in EK[9:25]] + [
    ['gap_prev_min', 'Time outlet-outlet (phut)'], ['seq1', 'Don thu may cua chuyen'], ['plan_orders', 'Tong don cua chuyen'],
    ['late_days', 'So ngay tre so voi ngay hua'], ['plan_ratio', 'Ty le tai cua chuyen (lan)'], ['dkey', 'Ngay'],
    ['loi', 'Loai loi KPI'], ['geo_why', 'Ly do Geo khong dat'], ['Created', 'Created Date (Fill Rate)']]
DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
P = lambda ok: 'PASS' if ok else 'FAIL'
r2 = lambda x: None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 2)

def pct(a, b): return round(a / b * 100, 2) if b else 100.0

def wilson(k, n, z=1.96):
    if not n: return [0, 100]
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0, c - h) * 100, 2), round(min(1, c + h) * 100, 2) if c + h < 1 else 100]

def utype(u):
    s = str(u).strip()
    if 'DSA' in s.upper(): return 'DSA'
    if re.fullmatch(r'0\d{9}', s): return 'SĐT tài xế'
    if re.fullmatch(r'\d{2}[A-Z]{1,2}\d{4,6}', re.sub(r'[\s\-\.]', '', s).upper()): return 'Biển số xe'
    return 'Sai'

def prep(t, f=None):
    """Tính cờ lỗi theo từng đơn."""
    t = t.copy()
    t['Date'] = pd.to_datetime(t['Date'])
    t['npp'] = t.TenantName.astype(str).str.upper().str.replace(r'[()\s]', '', regex=True)
    t['utype'] = t.username.map(utype); t['dsa'] = t.utype.eq('DSA')
    if f is not None and len(f):
        t = t.merge(f[['DocNo', 'Sent_To_distributor']].drop_duplicates('DocNo'), how='left', left_on='OrderNumber', right_on='DocNo')
    else:
        t['Sent_To_distributor'] = pd.NaT
    t['Sent_To_distributor'] = pd.to_datetime(t['Sent_To_distributor'])
    t = t.sort_values(['PlanNumber', 'DeliverDateTime'], na_position='last').reset_index(drop=True)
    t['seq1'] = t.groupby('PlanNumber').cumcount() + 1
    g = t.groupby('PlanNumber')
    prev_t, prev_o = g.DeliverDateTime.shift(), g.OutletCode.shift()
    gap = (t.DeliverDateTime - prev_t).dt.total_seconds() / 60
    t['gap_prev_min'] = gap.where(prev_o.ne(t.OutletCode))          # đơn cùng outlet liền trước: không xét
    t['gap_lt2'] = t.gap_prev_min.notna() & (t.gap_prev_min < TH['dt_gap_min'])
    po = g.OrderNumber.transform('size'); t['plan_orders'] = po
    bad = t.groupby('PlanNumber').gap_lt2.transform('sum')
    t['dt_route_fail'] = bad / po > TH['dt_route_pct']
    t['dt_any'] = bad > 0
    pw = g.Assigned_Weight.transform('sum'); cap = g.TruckCapacityWeight.transform('max')
    t['plan_w'] = pw; t['plan_cap'] = cap
    t['plan_ratio'] = (pw / cap.replace(0, np.nan)).round(3)
    capmax = t.groupby('DriverName').TruckCapacityWeight.transform('max')
    t['plan_ratio_best'] = pw / t.groupby('PlanNumber').DriverName.transform(lambda s: s.iloc[0]).map(
        t.groupby('DriverName').TruckCapacityWeight.max()).replace(0, np.nan)
    t['pl_fail'] = t.plan_ratio >= TH['payload_ratio']
    hr = t.DeliverDateTime.dt.hour + t.DeliverDateTime.dt.minute / 60
    t['g_v'] = t.distance_to_dropped.isna() | (t.distance_to_dropped > TH['geo_radius_m'])
    t['g_w'] = t.gap_prev_min.notna() & (t.gap_prev_min <= TH['geo_gap_min'])
    t['g_x'] = t.DeliverDateTime.isna() | (hr < TH['work_start']) | (hr >= TH['work_end'])
    t['geo_fail'] = ~t.dsa & (t.g_v | t.g_w | t.g_x)
    t['ot_fail'] = t.is_ontime.fillna(0).astype(int).eq(0)
    t['un_fail'] = t.utype.eq('Sai')
    dd = t.DeliverDateTime.dt.normalize(); pd_ = pd.to_datetime(t.PromisedDate).dt.normalize()
    t['late_days'] = (dd - pd_).dt.days.astype('float')
    def loi(r):
        L = []
        if r.un_fail: L.append('Username')
        if r.gap_lt2: L.append('Distance&Time')
        if r.geo_fail: L.append('Geo')
        if r.ot_fail: L.append('On-time')
        if r.pl_fail: L.append('Payload')
        return ' + '.join(L)
    t['loi'] = t.apply(loi, axis=1)
    def why(r):
        if not r.geo_fail: return None
        w = []
        if r.g_v: w.append(f"Sai vi tri: lech {r.distance_to_dropped:.0f}m (nguong {TH['geo_radius_m']}m)" if pd.notna(r.distance_to_dropped) else 'Sai vi tri: khong co toa do')
        if r.g_w: w.append(f"Outlet toi outlet {r.gap_prev_min:.1f} phut (yeu cau tren {TH['geo_gap_min']} phut)")
        if r.g_x: w.append(f"Ngoai gio lam viec: hoan tat luc {r.DeliverDateTime:%H:%M} (chi tinh 06:00-20:00)" if pd.notna(r.DeliverDateTime) else 'Ngoai gio lam viec: thieu thoi diem giao de doi chieu gio')
        return '; '.join(w)
    t['geo_why'] = t.apply(why, axis=1)
    t['err'] = t.loi.ne('')
    t['dkey'] = t.Date.dt.strftime('%d/%m')
    t['cd_fail'] = (t.Sent_To_distributor > t.DeliverDateTime).fillna(False)
    t.loc[t.cd_fail, 'loi'] = t.loc[t.cd_fail, 'loi'].map(lambda v: (v + ' + ' if v else '') + 'Created Date')
    t['err'] = t.loi.ne('')
    return t

def score(x, key, extra=True):
    o = len(x); pl = x.PlanNumber.nunique(); nds = x[~x.dsa]; gs = len(nds); gf = int(nds.geo_fail.sum())
    dtf = x[x.dt_route_fail].PlanNumber.nunique()
    plf = x[x.pl_fail].PlanNumber.nunique()
    s = dict(npp=key, orders=o, plans=pl)
    if extra: s.update(date_min=f"{x.Date.min():%Y-%m-%d}", date_max=f"{x.Date.max():%Y-%m-%d}")
    s.update(username_pct=pct(o - int(x.un_fail.sum()), o), username_fail=int(x.un_fail.sum()),
             dt_orders_fail=int(x.gap_lt2.sum()), dt_pct=pct(o - int(x.gap_lt2.sum()), o),
             dt_routes_fail=dtf, dt_routes_any=x[x.dt_any].PlanNumber.nunique(), dt_route_fail_pct=pct(dtf, pl),
             geo_pct=pct(gs - gf, gs), geo_fail=gf, geo_scope_orders=gs, geo_excluded=int(x.dsa.sum()),
             geo_max=r2(nds.distance_to_dropped.max()) or 0, geo_out5k=int((nds.distance_to_dropped > 5000).sum()),
             geo_v_fail=int(nds.g_v.sum()), geo_w_fail=int(nds.g_w.sum()), geo_x_fail=int(nds.g_x.sum()),
             geo_x_only=int((nds.g_x & ~nds.g_v & ~nds.g_w).sum()),
             ot_pct=pct(o - int(x.ot_fail.sum()), o), ot_fail=int(x.ot_fail.sum()),
             payload_plans_fail=plf, payload_pct=pct(pl - plf, pl), payload_max_ratio=r2(x.plan_ratio.max()) or 0,
             wh_pct=pct(o - int(x.g_x.sum()), o), wh_fail=int(x.g_x.sum()),
             cd_fail=int(x.cd_fail.sum()), cd_routes_fail=x[x.cd_fail].PlanNumber.nunique(),
             cd_scope=int(x.Sent_To_distributor.notna().sum()))
    if extra:
        s['user_types'] = {k: int(v) for k, v in x.utype.value_counts().items()}
        s.update(v_username=P(s['username_fail'] == 0), v_dt=P(s['dt_route_fail_pct'] < TH['dt_month_pct'] * 100),
                 v_geo=P(s['geo_pct'] >= TH['geo']), v_ontime=P(s['ot_pct'] > TH['ontime']),
                 v_successful=P(s['ot_pct'] > TH['successful']), v_payload=P(plf == 0), v_created=P(s['cd_routes_fail'] == 0))
        v = [s[k] for k in ('v_username', 'v_dt', 'v_geo', 'v_ontime', 'v_successful', 'v_payload', 'v_created')]
        s['n_fail'] = v.count('FAIL'); s['overall'] = P(s['n_fail'] == 0)
    return s

def verdict(x, geo_r=None, delivered=False, capfix=False):
    if delivered: x = x[x.Status.eq('Delivered')]
    if not len(x): return 'PASS'
    nds = x[~x.dsa]
    gv = nds.distance_to_dropped.isna() | (nds.distance_to_dropped > (geo_r or TH['geo_radius_m']))
    gf = int((~nds.dsa & (gv | nds.g_w | nds.g_x)).sum())
    geo = pct(len(nds) - gf, len(nds)) >= TH['geo']
    ot = pct(len(x) - int(x.ot_fail.sum()), len(x)) > TH['ontime']
    pl = x[(x.plan_ratio_best if capfix else x.plan_ratio) >= TH['payload_ratio']].PlanNumber.nunique() == 0
    dt_ = pct(x[x.dt_route_fail].PlanNumber.nunique(), x.PlanNumber.nunique()) < TH['dt_month_pct'] * 100
    un = int(x.un_fail.sum()) == 0
    cd = int(x.cd_fail.sum()) == 0
    return P(geo and ot and pl and dt_ and un and cd)

def fdt(v, f='%d/%m/%Y %H:%M:%S'):
    return None if pd.isna(v) else pd.Timestamp(v).strftime(f)

def build(t, src='TMS Order Detail', built=None, month_key=None):
    excluded = []
    for a, b in EXCLUDE:
        m = pd.to_datetime(t['Date']).between(pd.to_datetime(a, dayfirst=True), pd.to_datetime(b, dayfirst=True))
        if m.any():
            excluded.append(dict(start=a, end=b, orders=int(m.sum()), plans=int(t[m].PlanNumber.nunique()))); t = t[~m]
    npps = sorted(t.npp.unique(), key=lambda s: (re.sub(r'\d', '', s), int(re.sub(r'\D', '', s) or 0)))
    sub = lambda k: t if k == 'ALL' else t[t.npp == k]
    SC = [score(sub(n), n) for n in npps]
    tot = score(t, 'TỔNG', extra=False)
    d0, d1 = t.Date.min(), t.Date.max()
    days = (d1 - d0).days + 1
    mid = d0 + pd.Timedelta(days=days // 2)
    month_end = d1 + pd.offsets.MonthEnd(0)
    D = {}
    D['meta'] = dict(period=f"{d0:%d/%m/%Y} – {d1:%d/%m/%Y}", orders=len(t), plans=int(t.PlanNumber.nunique()), npps=len(npps),
                     bu=BU, region=REGION, source=src, days=int(t.Date.dt.normalize().nunique()), excluded=excluded)
    D['thresholds'] = TH; D['scorecard'] = SC; D['total'] = tot
    # đơn lỗi
    e = t[t.err].sort_values(['Date', 'npp', 'PlanNumber', 'seq1'])
    def row(r):
        out = []
        for k in EK:
            v = r.get(k)
            if k == 'TenantName': v = r.npp
            elif k in ('Date', 'DeliverDate', 'DeliverDateTime', 'RouteConfirmDate', 'PromisedDate'): v = fdt(v)
            elif k == 'OutletName': v = None
            elif k == 'time_outlet_outlet': v = r2(v)
            if isinstance(v, (np.bool_,)): v = bool(v)
            elif isinstance(v, (np.integer,)): v = int(v)
            elif isinstance(v, (float, np.floating)): v = None if pd.isna(v) else round(float(v), 5)
            elif v is pd.NaT: v = None
            out.append(v)
        return out
    D['err_keys'] = EK + ['Created']
    D['errors'] = [row(r) + [fdt(r.get('Sent_To_distributor'))] for _, r in e.iterrows()]
    D['csv_cols'] = CSV
    dtp = t[t.dt_any].groupby('PlanNumber').agg(TenantName=('npp', 'first'), truck=('DriverName', 'first'), user=('username', 'first'),
                                                 orders=('OrderNumber', 'size'), dt_fail=('gap_lt2', 'sum'), dt_route_fail=('dt_route_fail', 'first'),
                                                 date=('dkey', 'first')).reset_index()
    dtp = dtp.sort_values(['dt_route_fail', 'dt_fail'], ascending=False)
    D['dt_top'] = [dict(TenantName=r.TenantName, PlanNumber=r.PlanNumber, truck=r.truck, user=r.user, orders=int(r.orders),
                        dt_fail=int(r.dt_fail), dt_route_fail=bool(r.dt_route_fail), date=r.date) for r in dtp.itertuples()]
    plp = t[t.pl_fail].drop_duplicates('PlanNumber').sort_values('plan_ratio', ascending=False)
    D['pl_top'] = [dict(TenantName=r.npp, PlanNumber=r.PlanNumber, truck=r.DriverName, user=r.username, date=r.dkey,
                        orders=int(r.plan_orders), weight=r2(r.plan_w), cap=r2(r.plan_cap), ratio=r2(r.plan_ratio)) for r in plp.itertuples()]
    def daily(x):
        out = []
        for day, y in x.groupby(x.Date.dt.normalize()):
            n = y[~y.dsa]
            out.append(dict(day=f"{day:%d/%m}", orders=len(y), geo=pct(len(n) - int(n.geo_fail.sum()), len(n)),
                            ot=pct(len(y) - int(y.ot_fail.sum()), len(y)), dt=pct(len(y) - int(y.gap_lt2.sum()), len(y))))
        return out
    keys = ['ALL'] + npps
    D['daily'] = {k: daily(sub(k)) for k in keys}
    def gdist(x):
        v = x[~x.dsa].distance_to_dropped
        cuts = [('0–50m', -1, 50), ('50–200m', 50, 200), ('200m–1km', 200, 1000), ('1–5km', 1000, 5000), ('>5km', 5000, 1e15)]
        return [dict(label=l, n=int(((v > a) & (v <= b)).sum())) for l, a, b in cuts]
    D['geo_dist'] = {k: gdist(sub(k)) for k in keys}
    # chất lượng dữ liệu
    plate_ok = t.DriverName.astype(str).str.fullmatch(r'\d{2}[A-Z]{1,2}\d?-\d{4,5}')
    nb = t[~plate_ok & ~t.DriverName.astype(str).str.contains(' ')]
    D['dq'] = dict(total_rows_file=len(t), real_rows=len(t), ghost_rows=0, null_deliverdatetime=int(t.DeliverDateTime.isna().sum()),
                   status={k: int(v) for k, v in t.Status.value_counts().items()}, non_delivered=int((t.Status != 'Delivered').sum()),
                   geo_outlier_5km=int((t.distance_to_dropped > 5000).sum()), geo_max=r2(t.distance_to_dropped.max()) or 0,
                   v_label_max_pass=r2(t[t.distance_to_dropped <= TH['geo_radius_m']].distance_to_dropped.max()) or 0,
                   user_types={k: int(v) for k, v in t.utype.value_counts().items()}, geo_excluded_dsa=int(t.dsa.sum()),
                   geo_scope_orders=int((~t.dsa).sum()), gap_lt2_rows=int(t.gap_lt2.sum()), gap_measurable=int(t.gap_prev_min.notna().sum()),
                   dt_gap_1_4=int(t[t.dt_any].PlanNumber.nunique()),
                   name_bad_rows=len(nb), name_bad_vals=int(nb.DriverName.nunique()), name_total_vals=int(t.DriverName.nunique()),
                   name_examples=sorted(nb.DriverName.astype(str).unique())[:8],
                   outlet_no_coord=int(t[(t.lat_to.isna()) | (t.lat_to == 0)].OutletCode.nunique()),
                   outlet_no_coord_orders=int(((t.lat_to.isna()) | (t.lat_to == 0)).sum()),
                   time_col_null=int(t.time_outlet_outlet.isna().sum()), time_col_matches_calc=0, has_outlet=False)
    def geo_p(x, r):
        n = x[~x.dsa]; gv = n.distance_to_dropped.isna() | (n.distance_to_dropped > r)
        return pct(len(n) - int((gv | n.g_w | n.g_x).sum()), len(n))
    D['scen'] = []
    for s in SC:
        x = sub(s['npp']); g50, g200 = geo_p(x, 50), geo_p(x, 200)
        D['scen'].append(dict(npp=s['npp'], geo50=g50, geo200=g200, v50=P(g50 >= TH['geo']), v200=P(g200 >= TH['geo']),
                              overall50=s['overall'], overall200=verdict(x, geo_r=200)))
    D['scen_total'] = dict(geo50=geo_p(t, 50), geo200=geo_p(t, 200))
    def geo_all(x): return pct(len(x) - int((x.g_v | x.g_w | x.g_x).sum()), len(x))
    D['dsa_geo_scen'] = []
    for s in SC:
        x = sub(s['npp']); a, b = geo_all(x), s['geo_pct']
        D['dsa_geo_scen'].append(dict(npp=s['npp'], geo_with_dsa=a, v_with_dsa=P(a >= TH['geo']), geo_no_dsa=b, v_no_dsa=s['v_geo'],
                                      flip=P(a >= TH['geo']) != s['v_geo']))
    fl = [r['npp'] for r in D['dsa_geo_scen'] if r['flip']]
    D['dsa_geo_scen_total'] = dict(geo_with_dsa=geo_all(t), geo_no_dsa=tot['geo_pct'],
                                   fail_with_dsa=sum(r['v_with_dsa'] == 'FAIL' for r in D['dsa_geo_scen']),
                                   fail_no_dsa=sum(r['v_no_dsa'] == 'FAIL' for r in D['dsa_geo_scen']), flips=fl)
    D['auth'] = {}
    # tài khoản
    def users(x, with_npp):
        out = []
        for (n, u), y in x.groupby(['npp', 'username']):
            ys = y[~y.dsa]; err = int(y.err.sum())
            c = {'Geo': int(y.geo_fail.sum()), 'On-time': int(y.ot_fail.sum()), 'Distance&Time': int(y.gap_lt2.sum()), 'Payload': int(y.pl_fail.sum())}
            dom = max(c, key=c.get) if err else 'Không lỗi'
            r = dict(username=str(u), orders=len(y), utype=y.utype.iloc[0], plans=y.PlanNumber.nunique(), err=err,
                     dt=c['Distance&Time'], dt_plans=y[y.dt_route_fail].PlanNumber.nunique(), geo=c['Geo'], geo_scope=len(ys),
                     ot=c['On-time'], pl=c['Payload'], gap2=int(y.gap_lt2.sum()), trucks=y.DriverName.nunique(),
                     err_pct=pct(err, len(y)), geo_pct=pct(len(ys) - int(ys.geo_fail.sum()), len(ys)) if len(ys) else None,
                     ot_pct=pct(len(y) - c['On-time'], len(y)), dominant=dom)
            if with_npp: r = {'TenantName': n, **r}
            out.append(r)
        return sorted(out, key=lambda r: (-r['err'], -r['orders']))
    D['users'] = {n: users(sub(n), False) for n in npps}; D['users']['ALL'] = users(t, True)
    D['user_sum'] = {}
    for k in keys:
        U = D['users'][k]; et = sum(u['err'] for u in U); top = [u for u in U if u['err']][:3]
        D['user_sum'][k] = dict(users=len(U), users_err=sum(1 for u in U if u['err']), err_total=et,
                                top3_share=pct(sum(u['err'] for u in top), et) if et else 0.0, top3=[u['username'] for u in top])
    # OTIF
    of = t[t.ot_fail]; nod = of.DeliverDateTime.isna()
    D['otif_check'] = dict(rows=len(t), fail_rows=len(of), pass_rows=len(t) - len(of), fail_checkable=int((~nod).sum()),
                           fail_no_deliverdate=int(nod.sum()), fail_not_late=int((~nod & (of.late_days <= 0)).sum()),
                           pass_but_late=int((~t.ot_fail & (t.late_days > 0)).sum()),
                           pass_no_deliverdate=int((~t.ot_fail & t.DeliverDateTime.isna()).sum()),
                           nodate_status={k: int(v) for k, v in of[nod].Status.value_counts().items()},
                           nodate_by_npp={k: int(v) for k, v in of[nod].npp.value_counts().items()}, num_vs_text_mismatch=0)
    def late_by(x):
        y = x[x.ot_fail]; c = y.late_days.where(y.late_days > 0).value_counts(dropna=False)
        return sorted([dict(d=None if pd.isna(k) else int(k), n=int(v)) for k, v in c.items()], key=lambda r: (r['d'] is None, r['d'] or 0))
    D['late_by'] = {k: late_by(sub(k)) for k in keys}
    D['w_check'] = dict(plans=tot['plans'], plans_uniform=int((t.groupby('PlanNumber').TruckCapacityWeight.nunique() == 1).sum()),
                        plans_mixed=int((t.groupby('PlanNumber').TruckCapacityWeight.nunique() > 1).sum()),
                        plans_flagged=tot['dt_routes_fail'], plans_with_gap_lt2=tot['dt_routes_any'], flagged_and_gap=tot['dt_routes_fail'],
                        gap_not_flagged=tot['dt_routes_any'] - tot['dt_routes_fail'], flagged_no_gap=0,
                        orders_in_flagged=int(t.dt_route_fail.sum()), orders_gap_lt2=int(t.gap_lt2.sum()))
    D['dsa_split'] = {}
    for k in keys:
        x = sub(k); nd = x[~x.dsa]; rn = nd.PlanNumber.nunique()
        bad = nd.groupby('PlanNumber').gap_lt2.sum() / nd.groupby('PlanNumber').size()
        fn = int((bad > TH['dt_route_pct']).sum())
        r = dict(orders_dsa=int(x.dsa.sum()), ot_fail_dsa=int((x.dsa & x.ot_fail).sum()), ot_fail_all=int(x.ot_fail.sum()),
                 dt_orders_dsa=int((x.dsa & x.gap_lt2).sum()), dt_orders_all=int(x.gap_lt2.sum()),
                 dt_routes_now=x[x.dt_route_fail].PlanNumber.nunique(), dt_routes_nodsa=fn)
        if k != 'ALL': r.update(total_routes_nodsa=rn, dt_pct_nodsa=pct(fn, rn), ot_pct_nodsa=pct(len(nd) - int(nd.ot_fail.sum()), len(nd)))
        D['dsa_split'][k] = r
    # nửa kỳ & biên an toàn
    D['half_meta'] = dict(mid=f"{mid:%d/%m/%Y}", p1=f"{d0:%d/%m}–{mid - pd.Timedelta(days=1):%d/%m}", p2=f"{mid:%d/%m}–{d1:%d/%m}")
    D['ci_half'] = {}; D['margin'] = {}; D['dt_quota'] = {}
    for s in SC:
        x = sub(s['npp']); n = x[~x.dsa]; gok = s['geo_scope_orders'] - s['geo_fail']; ook = s['orders'] - s['ot_fail']
        gci, oci = wilson(gok, s['geo_scope_orders']), wilson(ook, s['orders'])
        h1, h2 = x[x.Date < mid], x[x.Date >= mid]
        gh = lambda y: (lambda m: pct(len(m) - int(m.geo_fail.sum()), len(m)) if len(m) else None)(y[~y.dsa])
        oh = lambda y: pct(len(y) - int(y.ot_fail.sum()), len(y)) if len(y) else None
        D['ci_half'][s['npp']] = dict(geo_ci=gci, ot_ci=oci, geo_h1=gh(h1), geo_h2=gh(h2), ot_h1=oh(h1), ot_h2=oh(h2), n_h1=len(h1), n_h2=len(h2))
        gneed = math.ceil(TH['geo'] / 100 * s['geo_scope_orders'] - 1e-9); oneed = math.floor(TH['ontime'] / 100 * s['orders']) + 1
        D['margin'][s['npp']] = dict(geo_ok=gok, geo_n=s['geo_scope_orders'], geo_need=gneed, geo_margin=gok - gneed, geo_ci=gci,
                                     geo_straddle=gci[0] < TH['geo'] < gci[1], ot_ok=ook, ot_n=s['orders'], ot_need=oneed,
                                     ot_margin=ook - oneed, ot_ci=oci, ot_straddle=oci[0] < TH['ontime'] < oci[1],
                                     dt_margin=round(TH['dt_month_pct'] * 100 - s['dt_route_fail_pct'], 2), pl_margin=-s['payload_plans_fail'])
        D['dt_quota'][s['npp']] = dict(fail_routes=s['dt_routes_fail'], total_routes=s['plans'], pct=s['dt_route_fail_pct'],
                                       pct_threshold=TH['dt_month_pct'] * 100, margin_pct=D['margin'][s['npp']]['dt_margin'],
                                       days_done=days, days_left=int((month_end - d1).days))
    # xếp hạng
    D['rank'] = {}
    metr = {'geo': ('Geo Compliance', '%', True, lambda s: s['geo_pct']), 'ot': ('On time', '%', True, lambda s: s['ot_pct']),
            'dt': ('Chuyến lỗi Distance & Time', ' chuyến', False, lambda s: s['dt_routes_fail']),
            'pl': ('Chuyến quá tải', ' chuyến', False, lambda s: s['payload_plans_fail']),
            'err': ('Tỷ lệ đơn có lỗi', '%', False, lambda s: pct(int(sub(s['npp']).err.sum()), s['orders']))}
    vals = {k: {s['npp']: f(s) for s in SC} for k, (_, _, _, f) in metr.items()}
    for s in SC:
        D['rank'][s['npp']] = {}
        for k, (lab, unit, hb, _) in metr.items():
            V = vals[k]; v = V[s['npp']]; arr = list(V.values())
            rk = 1 + sum(1 for w in arr if (w > v if hb else w < v))
            D['rank'][s['npp']][k] = dict(rank=rk, of=len(arr), v=v, median=round(float(np.median(arr)), 2),
                                          best=max(arr) if hb else min(arr), label=lab, unit=unit, hb=hb)
    # tải trọng
    tr = t.groupby('DriverName').agg(npp=('npp', 'first'), capmin=('TruckCapacityWeight', 'min'), capmax=('TruckCapacityWeight', 'max'),
                                     plans=('PlanNumber', 'nunique'), maxw=('plan_w', 'max'))
    trf = t[t.pl_fail].groupby('DriverName').PlanNumber.nunique()
    multi = tr[tr.capmin != tr.capmax]
    rows = [dict(truck=k, npp=r.npp, capmin=r2(r.capmin), capmax=r2(r.capmax), plans=int(r.plans), fail=int(trf.get(k, 0)), maxw=r2(r.maxw))
            for k, r in multi.sort_values('plans', ascending=False).iterrows()]
    best_fail = t[t.plan_ratio_best >= TH['payload_ratio']].PlanNumber.nunique()
    wmax = multi.maxw.idxmax() if len(multi) else None
    D['cap_check'] = dict(trucks=len(tr), trucks_multi=len(multi),
                          worst_ex=dict(truck=wmax, capmin=r2(multi.capmin[wmax]), capmax=r2(multi.capmax[wmax]), maxw=r2(multi.maxw[wmax])) if wmax else None,
                          fail_plans=tot['payload_plans_fail'], fail_on_multi=int(t[t.pl_fail & t.DriverName.isin(multi.index)].PlanNumber.nunique()),
                          ref_label=src, ref_orders=len(t), ref_days=days, ref_wider=False, fail_best=best_fail, rows=rows[:30],
                          by_npp=[dict(npp=n, now=s['payload_plans_fail'], best=sub(n)[sub(n).plan_ratio_best >= TH['payload_ratio']].PlanNumber.nunique(),
                                       trucks=int((tr.npp == n).sum()), trucks_multi=int((multi.npp == n).sum()),
                                       fail_on_multi=int(sub(n)[sub(n).pl_fail & sub(n).DriverName.isin(multi.index)].PlanNumber.nunique()),
                                       maxw_multi=r2(multi[multi.npp == n].maxw.max()) if (multi.npp == n).any() else None) for n, s in zip(npps, SC)],
                          cat_uniform=bool((t.groupby('TruckCategory').TruckCapacityWeight.nunique() == 1).all()),
                          cat_list=[dict(cat=c, cap=r2(v)) for c, v in t.groupby('TruckCategory').TruckCapacityWeight.median().sort_values().items()])
    def truck_by(x):
        p = x.drop_duplicates('PlanNumber')
        return [dict(cat=c, plans=len(y), cap=r2(y.plan_cap.median()), w=r2(y.plan_w.mean()), ratio=r2(y.plan_ratio.mean()),
                     fail=int(y.pl_fail.sum())) for c, y in sorted(p.groupby('TruckCategory'), key=lambda kv: -len(kv[1]))]
    D['truck_by'] = {k: truck_by(sub(k)) for k in keys}
    def dow(x):
        out = []
        for d, y in sorted(x.groupby(x.Date.dt.dayofweek)):
            n = y[~y.dsa]
            out.append(dict(d=DOW[d], orders=len(y), geo=pct(len(n) - int(n.geo_fail.sum()), len(n)), ot=pct(len(y) - int(y.ot_fail.sum()), len(y))))
        return out
    D['dow_by'] = {k: dow(sub(k)) for k in keys}
    D['bad_days'] = {k: sorted([{kk: r[kk] for kk in ('day', 'orders', 'geo', 'ot')} for r in D['daily'][k]], key=lambda r: r['geo'])[:3] for k in keys}
    p = t.drop_duplicates('PlanNumber')
    rl = []
    for lab, a, b in [('1–3', 1, 3), ('4–6', 4, 6), ('7–10', 7, 10), ('11–20', 11, 20), ('21–30', 21, 30), ('>30', 31, 10 ** 9)]:
        y = t[t.plan_orders.between(a, b)]; pp = p[p.plan_orders.between(a, b)]
        rl.append(dict(label=lab, orders=len(y), err=pct(int(y.err.sum()), len(y)) if len(y) else 0.0,
                       dt=pct(int(y.gap_lt2.sum()), len(y)) if len(y) else 0.0, plans=len(pp),
                       dt_route_pct=pct(int(pp.dt_route_fail.sum()), len(pp)) if len(pp) else 0.0))
    D['route_len'] = rl
    # điểm bán nghi sai toạ độ
    og = t.groupby('OutletCode').agg(npp=('npp', 'first'), n=('OrderNumber', 'size'), bad=('g_v', 'sum'),
                                     med=('distance_to_dropped', 'median'), mx=('distance_to_dropped', 'max'), lat=('lat_to', 'first'))
    sus = og[(og.n >= 2) & (og.bad == og.n)].sort_values('med', ascending=False)
    D['outlet'] = dict(outlets=len(og), orders=len(t), repeat=int((og.n > 1).sum()),
                       no_coord_outlets=int((og.lat.isna() | (og.lat == 0)).sum()), no_coord_orders=D['dq']['outlet_no_coord_orders'],
                       suspect_n=len(sus), suspect_orders=int(sus.n.sum()), once_bad=int(((og.n == 1) & (og.bad == 1)).sum()),
                       rows=[dict(code=str(k), npp=r.npp, n=int(r.n), bad=int(r.bad), med=r2(r.med), mx=r2(r.mx), coord=bool(pd.notna(r.lat) and r.lat != 0))
                             for k, r in sus.head(30).iterrows()],
                       by_npp=[dict(npp=n, outlets=int((og.npp == n).sum()), suspect=int((sus.npp == n).sum()), suspect_orders=int(sus[sus.npp == n].n.sum())) for n in npps])
    # đơn chưa giao xong
    rows = []
    for s in SC:
        x = sub(s['npp']); y = x[x.Status.eq('Delivered')]; yn = y[~y.dsa]
        g1 = pct(len(yn) - int(yn.geo_fail.sum()), len(yn)) if len(yn) else 100.0
        o1 = pct(len(y) - int(y.ot_fail.sum()), len(y)) if len(y) else 100.0
        rows.append(dict(npp=s['npp'], out=len(x) - len(y), geo0=s['geo_pct'], geo1=g1, ot0=s['ot_pct'], ot1=o1,
                         vg0=s['v_geo'], vg1=P(g1 >= TH['geo']), vo0=s['v_ontime'], vo1=P(o1 > TH['ontime'])))
    out = t[t.Status.ne('Delivered')]; y = t[t.Status.eq('Delivered')]; yn = y[~y.dsa]
    D['pop_scen'] = dict(rows=rows, n_out=len(out), ot_fail_in_out=int(out.ot_fail.sum()), geo_fail_in_out=int(out.geo_fail.sum()),
                         geo0=tot['geo_pct'], geo1=pct(len(yn) - int(yn.geo_fail.sum()), len(yn)), ot0=tot['ot_pct'],
                         ot1=pct(len(y) - int(y.ot_fail.sum()), len(y)),
                         flips_geo=[r['npp'] for r in rows if r['vg0'] != r['vg1']], flips_ot=[r['npp'] for r in rows if r['vo0'] != r['vo1']],
                         status={k: int(v) for k, v in out.Status.value_counts().items()})
    nd = t[~t.dsa]; xo = nd.g_x & ~nd.g_v & ~nd.g_w
    hrs = nd[nd.g_x & nd.DeliverDateTime.notna()].DeliverDateTime.dt.hour.value_counts().sort_index()
    D['wh_detail'] = dict(x_fail=int(nd.g_x.sum()), x_fail_nodate=int((nd.g_x & nd.DeliverDateTime.isna()).sum()), x_only=int(xo.sum()),
                          x_only_nodate=int((xo & nd.DeliverDateTime.isna()).sum()), hours=[dict(h=int(h), n=int(n)) for h, n in hrs.items()],
                          late_hour_1=int(hrs.get(TH['work_end'], 0)),
                          by_npp=[dict(npp=n, x_only=int((xo & nd.npp.eq(n)).sum()), nodate=int((nd.g_x & nd.DeliverDateTime.isna() & nd.npp.eq(n)).sum())) for n in npps])
    # độ nhạy
    SN = [('Hiện tại (đang áp dụng)', [], {}), ('Nếu ngưỡng vị trí là 200m', ['geo200'], dict(geo_r=200)),
          ('Nếu chỉ tính đơn đã Delivered', ['delivered'], dict(delivered=True)),
          ('Nếu dùng tải trọng lớn nhất từng khai của chính xe đó', ['capfix'], dict(capfix=True)),
          ('Nếu chốt cả 3 điểm mở theo hướng có lợi cho NPP', ['geo200', 'delivered', 'capfix'], dict(geo_r=200, delivered=True, capfix=True))]
    base = {s['npp']: s['overall'] for s in SC}
    D['sens'] = []
    for lab, kw, a in SN:
        v = base if not kw else {n: verdict(sub(n), **a) for n in npps}
        D['sens'].append(dict(label=lab, kw=kw, pass_=sum(x == 'PASS' for x in v.values()), flips=[n for n in npps if v[n] != base[n]], verdicts=v))
    for s in D['sens']: s['pass'] = s.pop('pass_')
    uns = [n for n in npps if any(s['verdicts'][n] != base[n] for s in D['sens'])]
    D['sens_meta'] = dict(stable=[n for n in npps if n not in uns], unstable=uns, npps=npps)
    D['build'] = dict(ver='Z13', date=built[:10], at=built, src=src, src_at=built)
    return D

def month_split(t):
    t = t.copy(); t['Date'] = pd.to_datetime(t['Date']); t['_m'] = t.Date.dt.strftime('%Y-%m')
    return {m: x.drop(columns='_m') for m, x in t.groupby('_m')}
