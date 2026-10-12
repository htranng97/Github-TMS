"""Payload theo tháng: từ T9/2026 NPP đạt khi chuyến quá tải < 5% tổng chuyến; trước đó phải 0 chuyến.
Ngưỡng nằm ở DATA.thresholds.payload_month_pct (0 = phải 0 chuyến). Chạy SAU patch_text2."""
NEED = "(PL0()?x.payload_plans_fail:Math.max(1, Math.floor(x.payload_plans_fail - (T_PLM/100)*x.plans) + 1))"
HELP = """
/* Payload: từ T9/2026 được phép < 5% số chuyến; tháng trước đó phải 0 chuyến */
function PL0(){ return !(T_PLM>0); }
function plRule(){ return PL0() ? '0 chuyến quá tải' : 'dưới '+fmt(T_PLM)+'% số chuyến'; }
function plPass(fail,pctv){ return PL0() ? fail===0 : (pctv??0)<T_PLM; }
"""
R = [
 ("T_DTR_MONTH_PCT=(TH.dt_month_pct??0.05)*100,", "T_DTR_MONTH_PCT=(TH.dt_month_pct??0.05)*100, T_PLM=(TH.payload_month_pct??0)*100,"),
 ("/* ===================== helpers ===================== */", "/* ===================== helpers ===================== */" + HELP),
 ("v_payload: t.payload_plans_fail===0?'PASS':'FAIL'", "v_payload: plPass(t.payload_plans_fail,t.payload_fail_pct)?'PASS':'FAIL'"),
 ("  if(x.v_payload==='FAIL') g.push({k:'pl', n:x.payload_plans_fail, txt:`sửa <b>${fmt(x.payload_plans_fail)} chuyến</b> chở quá tải — cần 0 chuyến`});",
  "  if(x.v_payload==='FAIL'){ const needPl=" + NEED + ";\n    g.push({k:'pl', n:needPl, txt:PL0()?`sửa <b>${fmt(needPl)} chuyến</b> chở quá tải — cần 0 chuyến`:`cần bớt <b>${fmt(needPl)} chuyến</b> chở quá tải để xuống dưới ${fmt(T_PLM)}% số chuyến`}); }"),
 ("`Chở quá ${num(T_PLR,1)} lần tải trọng xe · cần 0 chuyến${M?' · '+(M.pl_margin===0?'<b style=\"color:var(--good)\">không chuyến nào quá tải</b>':`<b style=\"color:var(--crit)\">cần sửa ${fmt(-M.pl_margin)} chuyến</b>`):''}`",
  "`Chuyến quá tải (${pct(r.payload_fail_pct)}) · cần ${plRule()}${r.v_payload==='PASS'?' · <b style=\"color:var(--good)\">đang đạt</b>':' · <b style=\"color:var(--crit)\">cần sửa '+fmt((x=>" + NEED + ")(r))+' chuyến</b>'}`"),
 ("t:`không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng xe`}",
  "t:`${pct(r.payload_fail_pct)} số chuyến chở từ ${num(T_PLR,1)} lần tải trọng · cần ${plRule()}`}"),
 ("<td data-l=\"Ngưỡng\">${num(TH.payload,0)}%</td>", "<td data-l=\"Ngưỡng\">&lt;5% tổng chuyến/tháng (từ T9/2026) · 0 chuyến (trước T9)</td>"),
 ("{i:'',n:'PAYLOAD',q:'Xe có chở <b>quá tải</b> không?', th:'100%',", "{i:'',n:'PAYLOAD',q:'Xe có chở <b>quá tải</b> không?', th:'<5% tổng số chuyến/tháng (từ T9/2026)',"),
 ("ok:`Tổng hàng trên xe dưới <b>${num(T_PLR,1)} lần</b> tải trọng xe khai trong hệ thống.`",
  "ok:`Chuyến quá tải là chuyến chở từ <b>${num(T_PLR,1)} lần</b> tải trọng xe trở lên. <b>Từ tháng 9/2026:</b> mỗi tháng được phép <b>dưới 5% tổng số chuyến</b> quá tải. <b>Trước tháng 9:</b> không được có chuyến nào quá tải.`"),
 ("ex:'Chở 7,3 tấn trên xe khai 1,1 tấn → 6,6 lần → không đạt.'",
  "ex:`Chở 7,3 tấn trên xe khai 1,1 tấn → 6,6 lần → chuyến quá tải. Từ T9: tháng có 200 chuyến thì được tối đa 9 chuyến quá tải; 10 chuyến (5%) là rớt.`"),
 ("""          <li><b>Payload</b> — không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng xe</li></ul>
      <p class="tier-w">Chỉ cần <b>một</b> chuyến quá tải là rớt cả tiêu chí, kéo theo rớt toàn bộ Data Accuracy.</p></div>""",
  """          <li><b>Created Date</b> — không chuyến nào có đơn tạo sau giờ giao</li></ul>
      <p class="tier-w">Chỉ cần <b>một</b> lỗi là rớt cả tiêu chí, kéo theo không đạt tháng. (Payload trước tháng 9/2026 cũng thuộc nhóm này.)</p></div>"""),
 ("""      <ul><li><b>Distance &amp; Time</b> — hai điểm giao xác nhận quá sát giờ nhau</li></ul>""",
  """      <ul><li><b>Distance &amp; Time</b> — hai điểm giao xác nhận quá sát giờ nhau</li>
          <li><b>Payload</b> (từ T9/2026) — chuyến chở từ ${num(T_PLR,1)} lần tải trọng xe trở lên</li></ul>"""),
 ("Mỗi chuyến được phép sai tối đa ${fmt(T_DTR_ROUTE_PCT)}% điểm giao. Mỗi tháng được phép dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến lỗi — chuyến càng ít điểm giao càng dễ vượt ngưỡng đầu.",
  "Mỗi tháng được phép dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến lỗi. Riêng Distance &amp; Time: mỗi chuyến được sai tối đa ${fmt(T_DTR_ROUTE_PCT)}% điểm giao."),
 ("'Vì <b>Payload</b> và <b>User name</b> yêu cầu tuyệt đối 100%. Một chuyến quá tải là rớt Payload, kéo theo rớt toàn bộ.",
  "'Vì <b>User name</b> và <b>Created Date</b> không cho phép lỗi nào (Payload cũng vậy trước tháng 9/2026). Chỉ 1 lỗi là rớt tiêu chí đó, kéo theo không đạt tháng."),
 ("w:`Chở quá ${num(T_PLR,1)} lần tải trọng xe · cần 0 chuyến`});",
  "w:PL0()?`Chở quá ${num(T_PLR,1)} lần tải trọng xe · cần 0 chuyến`:`Hiện ${pct(x.payload_fail_pct)} số chuyến quá tải · cần dưới ${fmt(T_PLM)}%`});"),
 ("k:'Payload (không chở quá tải)',         n:x.payload_plans_fail,", "k:'Payload (không chở quá tải)',         n:" + NEED + ","),
 ("${fmt(nfOf('v_payload'))}/${fmt(nNpp)} NPP có chuyến quá tải", "${fmt(nfOf('v_payload'))}/${fmt(nNpp)} NPP không đạt Payload"),
 ("Payload không cho phép lỗi nào, nhưng tải trọng khai lại không thống nhất.", "Tải trọng xe khai không thống nhất nên số chuyến quá tải có thể bị tính sai."),
 ("User name, Payload, Created Date <b>không cho phép lỗi nào</b>; Distance &amp; Time cho phép dưới 5% số chuyến.",
  "User name, Created Date <b>không cho phép lỗi nào</b>; Distance &amp; Time cho phép <b>dưới 5% số chuyến</b>; Payload: ${PL0()?'<b>0 chuyến quá tải</b> (trước T9/2026)':'<b>dưới 5% số chuyến</b> (từ T9/2026)'}."),
 ("Tổng hàng của chuyến phải <b>dưới ${num(T_PLR,1)} lần</b> tải trọng xe. Không được có chuyến quá tải nào.",
  "Chuyến chở từ <b>${num(T_PLR,1)} lần</b> tải trọng xe trở lên là chuyến quá tải. ${PL0()?'Tháng này (trước T9/2026) <b>không được có chuyến quá tải nào</b>.':`Từ T9/2026, NPP đạt khi chuyến quá tải <b>dưới ${fmt(T_PLM)}% tổng số chuyến</b> trong tháng.`}"),
 ("<td data-l=\"Quá tải\">${m.pl_margin===0?`<span class=\"chip pass\"><span class=\"ic\">✓</span>0 quá tải</span>`:`<span class=\"chip fail\"><span class=\"ic\">✕</span>${fmt(-m.pl_margin)} quá tải</span>`}</td>",
  "<td data-l=\"Quá tải\">${x.v_payload==='PASS'?`<span class=\"chip pass\"><span class=\"ic\">✓</span>${fmt(x.payload_plans_fail)} quá tải (${pct(x.payload_fail_pct)})</span>`:`<span class=\"chip fail\"><span class=\"ic\">✕</span>${fmt(x.payload_plans_fail)} quá tải (${pct(x.payload_fail_pct)})</span>`}</td>"),
]
G = [  # thay mọi chỗ
 ("k:`<b>${pct(r.payload_pct)}</b> / ngưỡng ${num(TH.payload??100,0)}%`", "k:`<b>${pct(r.payload_fail_pct)}</b> quá tải / cần ${plRule()}`"),
 ("bar:'', thr:'ngưỡng 0 chuyến quá tải',\n     m: r.payload_plans_fail===0 ? 'không chuyến nào quá tải' : 'phải xử lý hết '+fmt(r.payload_plans_fail)+' chuyến',",
  "bar:PL0()?'':ovQuota(r.payload_fail_pct??0,T_PLM), thr:PL0()?'ngưỡng 0 chuyến quá tải':'ngưỡng < '+fmt(T_PLM)+'% tổng chuyến/tháng',\n     m: r.payload_plans_fail===0 ? 'không chuyến nào quá tải' : (PL0() ? 'phải xử lý hết '+fmt(r.payload_plans_fail)+' chuyến' : (M ? sgn(M.pl_margin,2)+' điểm %' : pct(r.payload_fail_pct)+' số chuyến')),"),
 ("sub: r.payload_plans_fail? 'tỷ lệ cao nhất '", "sub: r.payload_plans_fail? pct(r.payload_fail_pct)+' của '+fmt(r.plans)+' chuyến · cao nhất '"),
]
def patch(app):
    miss = []
    for a, b in R:
        if a in app: app = app.replace(a, b, 1)
        else: miss.append(a[:80])
    for a, b in G:
        if a in app: app = app.replace(a, b)
        else: miss.append('G:' + a[:80])
    return app, miss

if __name__ == '__main__':
    import patch_app, patch_ux, patch_text, patch_text2
    a, _ = patch_app.patch(open('z4ref/app.js').read()); a, _ = patch_ux.patch(a); a, _ = patch_text.patch(a); a, _ = patch_text2.patch(a)
    a, m = patch(a)
    print(len(R) + len(G), 'cặp · thiếu:', len(m)); [print('  -', x) for x in m]
