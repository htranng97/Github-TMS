"""Vá giao diện mẫu (6 tiêu chí) để chấm thêm Created Date thành 7 tiêu chí."""

CD_TH = "0 chuyến"
P = [
 # tổng vùng
 ("v_payload: t.payload_plans_fail===0?'PASS':'FAIL',",
  "v_payload: t.payload_plans_fail===0?'PASS':'FAIL', v_created: (t.cd_routes_fail||0)===0?'PASS':'FAIL',"),
 # phần còn thiếu để đạt
 ("  if(x.v_payload==='FAIL') g.push({k:'pl', n:x.payload_plans_fail,",
  "  if(x.v_created==='FAIL') g.push({k:'cd', n:x.cd_routes_fail, txt:`rà <b>${fmt(x.cd_fail)} đơn</b> tạo sau khi giao (${fmt(x.cd_routes_fail)} chuyến) — tiêu chí này yêu cầu 0 chuyến`});\n  if(x.v_payload==='FAIL') g.push({k:'pl', n:x.payload_plans_fail,"),
 ("const KPI_LABEL={geo:L.kpiGeo, ot:'Giao trong cam kết 24h/48h', dt:L.kpiDT, pl:'Xe chở quá tải'};",
  "const KPI_LABEL={geo:L.kpiGeo, ot:'Giao trong cam kết 24h/48h', dt:L.kpiDT, pl:'Xe chở quá tải', cd:'Created Date', un:'User name'};"),
 ("  x.v_dt==='FAIL'&&'dt', x.v_payload==='FAIL'&&'pl' ].filter(Boolean); }",
  "  x.v_dt==='FAIL'&&'dt', x.v_payload==='FAIL'&&'pl', x.v_created==='FAIL'&&'cd', x.v_username==='FAIL'&&'un' ].filter(Boolean); }"),
 # ma trận NPP
 ("<th scope=\"col\">User name</th>\n   <th scope=\"col\">Cần kiểm",
  "<th scope=\"col\">User name</th><th scope=\"col\">Created Date <span class=\"ovmx-h\">chuyến lỗi</span></th>\n   <th scope=\"col\">Cần kiểm"),
 ("     <td data-l=\"User name\">${cell(x,'v_username',pct(x.username_pct),'accuracy','')}</td>\n",
  "     <td data-l=\"User name\">${cell(x,'v_username',pct(x.username_pct),'accuracy','')}</td>\n     <td data-l=\"Created Date\">${cell(x,'v_created',fmt(x.cd_routes_fail),'errors','Created Date')}</td>\n"),
 # thẻ KPI tổng quan
 ("    ['CREATED DATE', 'GAP', '–', `Thiếu cột thời điểm tạo đơn trong nguồn`],",
  "    ['CREATED DATE', r.v_created, fmt(r.cd_routes_fail)+' chuyến', `${fmt(r.cd_fail)} đơn tạo sau giờ giao (Created Date lấy từ Fill Rate) · ngưỡng 0 chuyến`],"),
 # tóm tắt điều hành
 ("    {f:'Payload',       n:'Payload',          v:r.v_payload, c:r.payload_plans_fail, u:'chuyến quá tải',\n     t:`ngưỡng 100% — không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng`}\n  ];",
  "    {f:'Payload',       n:'Payload',          v:r.v_payload, c:r.payload_plans_fail, u:'chuyến quá tải',\n     t:`ngưỡng 100% — không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng`},\n    {f:'Created Date',  n:'Created Date',     v:r.v_created, c:r.cd_routes_fail,     u:'chuyến có đơn tạo sau giao',\n     t:`ngưỡng 0 chuyến — ${fmt(r.cd_fail)} đơn tạo sau giờ giao`}\n  ];"),
 # tab chi tiết KPI
 ("                ['dt','Distance & Time'],['payload','Payload'],['username','User name']];",
  "                ['dt','Distance & Time'],['payload','Payload'],['username','User name'],['created','Created Date']];"),
 ("  const KEY={geo:'v_geo', ontime:'v_ontime', successful:'v_successful', dt:'v_dt', payload:'v_payload', username:'v_username'}[sel];\n  const NAME={geo:L.kpiGeo, ontime:'On time', successful:'Successful', dt:L.kpiDT, payload:'Payload', username:'User name'}[sel];",
  "  const KEY={geo:'v_geo', ontime:'v_ontime', successful:'v_successful', dt:'v_dt', payload:'v_payload', username:'v_username', created:'v_created'}[sel];\n  const NAME={geo:L.kpiGeo, ontime:'On time', successful:'Successful', dt:L.kpiDT, payload:'Payload', username:'User name', created:'Created Date'}[sel];"),
 ("  const MERGED=['dt','payload','username'];", "  const MERGED=['dt','payload','username','created'];"),
 ("  if(MERGED.includes(sel)) h+=`<p class=\"kpisel-n\">Ba tiêu chí <b>Distance &amp; Time · Payload · User name</b> nằm chung một trang —",
  "  if(MERGED.includes(sel)) h+=`<p class=\"kpisel-n\">Bốn tiêu chí <b>Distance &amp; Time · Payload · User name · Created Date</b> nằm chung một trang —"),
 ("    <b>Created Date hiện chưa chấm</b> nên không nằm trong 6 tiêu chí quyết định DIP.</div>`;",
  "    <b>Created Date</b> được chấm: đơn có <span class=\"formula\">Sent_To_distributor</span> (Fill Rate) muộn hơn <span class=\"formula\">DeliverDateTime</span> là đơn lỗi; 1 đơn lỗi là chuyến lỗi; ngưỡng 0 chuyến.</div>`;"),
 # thẻ Created Date trong trang Accuracy
 ("""  h+=`<div class="card"><h2>4 · CREATED DATE — ${chip('GAP')}</h2>
    <p class="cap">Quy tắc gốc: <span class="formula">Created Date (on DIS) &lt; DeliverDate</span>, ngưỡng 100% — nhằm phát hiện tài xế chỉnh giờ điện thoại.</p>
    <ul class="tight"><li>Nguồn hiện có <b>DeliverDate, DeliverDateTime, RouteConfirmDate, PromisedDate</b> nhưng <b>không có thời điểm tạo đơn trên DIS</b>.</li>
    <li>Theo nguyên tắc dự án — <b>không suy đoán quy tắc thiếu</b> — tiêu chí này để trạng thái chưa chấm, không quy kết NPP.</li>
    <li>Đề xuất: bổ sung cột <span class="formula">CreatedDate</span> từ DIS vào file trích xuất TMS để bật lại tiêu chí.</li></ul></div>`;""",
  """  { const CR=DATA.errors.filter(e=>String(e.loi||'').split(' + ').includes('Created Date') && (cur==='ALL'||e.TenantName===cur));
    h+=`<div class="card" id="created"><h2>4 · CREATED DATE — ${chip(r.v_created||'PASS')}</h2>
    <p class="cap">Quy tắc: <span class="formula">Created Date &lt; DeliverDateTime</span>. Created Date lấy từ cột <span class="formula">Sent_To_distributor</span> của file Fill Rate, ghép theo <span class="formula">DocNo = OrderNumber</span>. Đơn tạo sau giờ giao là đơn lỗi; 1 đơn lỗi là chuyến lỗi; ngưỡng <b>0 chuyến</b> — nhằm phát hiện tài xế chỉnh giờ điện thoại.</p>
    <p class="cap"><b>${fmt(r.cd_fail||0)} đơn</b> tạo sau khi giao, thuộc <b>${fmt(r.cd_routes_fail||0)} chuyến</b>. Đơn chưa có trong Fill Rate thì chưa xét.</p>
    <div class="wrap"><table class="rt"><thead><tr><th>NPP</th><th>Chuyến</th><th>Đơn</th><th>Tạo lúc</th><th>Giao lúc</th></tr></thead><tbody>
    ${CR.slice(0,200).map(e=>`<tr><td>${esc(e.TenantName)}</td><td>${esc(e.PlanNumber)}</td><td>${esc(e.OrderNumber)}</td><td>${esc(String(e.Created||'').slice(0,16))}</td><td>${esc(String(e.DeliverDateTime||'').slice(0,16))}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty"><b>Không có đơn nào tạo sau khi giao</b>Trong phạm vi đang xem.</div></td></tr>'}
    </tbody></table></div></div>`; }"""),
 # chip lỗi
 ("  LS.forEach(k=>{\n    let txt=k, why='';",
  "  LS.forEach(k=>{\n    if(k==='Created Date'){ out.push(`<span class=\"${kls(k)}\" title=\"${tit(k)}\"><strong><span class=\"xm\">✕</span> Tạo sau khi giao</strong><em>${e.Created?('tạo lúc '+esc(String(e.Created).slice(0,16))):''}</em></span>`); return; }\n    let txt=k, why='';"),
 ("<option value=\"Payload\">Xe quá tải</option></select>",
  "<option value=\"Payload\">Xe quá tải</option><option value=\"Created Date\">Tạo sau khi giao</option></select>"),
 # việc cần làm
 ("    if(x.v_payload==='FAIL') jobs.push({npp:x.npp, k:'Payload',",
  "    if(x.v_created==='FAIL') jobs.push({npp:x.npp, k:'Created Date', n:x.cd_routes_fail, u:'chuyến', t:'Created Date',\n                                        w:`${fmt(x.cd_fail)} đơn tạo sau khi giao`});\n    if(x.v_payload==='FAIL') jobs.push({npp:x.npp, k:'Payload',"),
 # ô tiêu chí của NPP
 ("    ['successful', r.v_successful, fmt(r.ot_fail)+' đơn chưa xong đúng hạn', '']\n  ];",
  "    ['successful', r.v_successful, fmt(r.ot_fail)+' đơn chưa xong đúng hạn', ''],\n    ['created', r.v_created, fmt(r.cd_routes_fail)+' chuyến có đơn tạo sau giao', 'Created Date']\n  ];"),
 ("const ok=r.overall==='PASS', nPass=6-(r.n_fail||0);", "const ok=r.overall==='PASS', nPass=7-(r.n_fail||0);"),
 ("      ${ovRing(nPass,6,ok)}", "      ${ovRing(nPass,7,ok)}"),
 ("    ['successful','SUCCESSFUL', r.v_successful]\n  ];",
  "    ['successful','SUCCESSFUL', r.v_successful],\n    ['created','CREATED DATE', r.v_created]\n  ];"),
 ("    {n:'SUCCESSFUL',     v:r.v_successful, sel:'successful', f:'v_ontime', note:'chưa tách khỏi On time'}\n  ];",
  "    {n:'SUCCESSFUL',     v:r.v_successful, sel:'successful', f:'v_ontime', note:'chưa tách khỏi On time'},\n    {n:'CREATED DATE',   v:r.v_created,    sel:'created',    f:'v_created'}\n  ];"),
 ("  const K=['User name','Distance & Time','Geo Compliance','On time','Successful','Payload'];",
  "  const K=['User name','Distance & Time','Geo Compliance','On time','Successful','Payload','Created Date'];"),
 ("['User name','Distance &amp; Time','Geo Compliance','On time','Successful','Payload']",
  "['User name','Distance &amp; Time','Geo Compliance','On time','Successful','Payload','Created Date']"),
 # cách chấm
 ("""   {i:'',n:'CREATED DATE',q:'Đơn có bị tạo sau khi đã giao không?', th:'Chưa chấm',
    ok:'Nhằm phát hiện tài xế chỉnh giờ điện thoại.',""",
  """   {i:'',n:'CREATED DATE',q:'Đơn có bị tạo sau khi đã giao không?', th:'0 chuyến',
    ok:'Thời điểm tạo đơn (cột Sent_To_distributor của Fill Rate) phải trước giờ giao. 1 đơn tạo sau giao là cả chuyến lỗi; không chuyến nào được lỗi. Nhằm phát hiện tài xế chỉnh giờ điện thoại.',"""),
 ("Bộ luật 6 tiêu chí chưa chấm Created Date, nên tiêu chí này không ảnh hưởng kết quả NPP. File Excel đơn lỗi có kèm cột Created Date (lấy từ Fill Rate) để NPP tự rà soát.",
  "Đơn tạo lúc 15:20 nhưng ghi giao lúc 14:05 cùng ngày → không đạt. Đơn chưa có trong Fill Rate thì chưa xét."),
 ("File dữ liệu hiện <b>chưa có</b> thông tin thời điểm tạo đơn, nên tiêu chí này <b>không được chấm</b> và không ảnh hưởng kết quả NPP.",
  "Đơn tạo lúc 15:20 nhưng ghi giao lúc 14:05 cùng ngày → không đạt. Đơn chưa có trong Fill Rate thì chưa xét."),
 ("    who:'Chờ bổ sung dữ liệu từ hệ thống đặt hàng.',gap:true}];", "    who:'Tài xế xác nhận giao đúng lúc giao · Quản lý NPP kiểm tra giờ điện thoại của tài xế.'}];"),
 ("    <li><b>Thiếu dữ liệu thì để trống, không suy đoán.</b> Tiêu chí Created Date chưa có dữ liệu nên không được chấm — không NPP nào bị trừ điểm vì nó.</li>",
  "    <li><b>Thiếu dữ liệu thì để trống, không suy đoán.</b> Đơn chưa có trong Fill Rate thì chưa xét Created Date — không bị tính lỗi.</li>"),
]

P += [
 ("""       k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`, note:'chưa tách khỏi On time'}
  };""","""       k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`, note:'chưa tách khỏi On time'},
    created:{l:`<b>${fmt(r.cd_routes_fail||0)}</b> chuyến có đơn tạo sau giao<span class="ovp-x"> · ${fmt(r.cd_fail||0)} đơn</span>`,
       k:`KPI 0 chuyến`}
  };"""),
 ("""    successful:()=>({l:`<b>${fmt(r.orders-r.ot_fail)}/${fmt(r.orders)}</b> đơn đạt`,
                     k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`})
  };""","""    successful:()=>({l:`<b>${fmt(r.orders-r.ot_fail)}/${fmt(r.orders)}</b> đơn đạt`,
                     k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`}),
    created:   ()=>({l:`<b>${fmt(r.cd_routes_fail||0)}</b> chuyến có đơn tạo sau giao<span class="ovp-x"> · ${fmt(r.cd_fail||0)} đơn</span>`,
                     k:`KPI 0 chuyến`})
  };"""),
]

P += [
 ("""const CAUSE={
 pl:{""","""const CAUSE={
 cd:{ t:'Đơn tạo sau khi đã giao',
   why:'Giờ tạo đơn (Fill Rate) muộn hơn giờ giao — thường do <b>giờ điện thoại tài xế sai</b> hoặc đơn được tạo bù sau khi giao.',
   acts:[['Quản lý NPP','Kiểm tra giờ trên điện thoại tài xế của các chuyến này và chỉnh về giờ chuẩn.'],
         ['Điều phối','Không tạo bù đơn sau khi đã giao; tạo đơn trước khi xe xuất bến.']]},
 un:{ t:'Tài khoản giao hàng sai định dạng',
   why:'Tài khoản phải là <b>SĐT 10 số</b>, <b>biển số xe</b> hoặc <b>tài khoản DSA</b>.',
   acts:[['Quản lý NPP','Đổi các tài khoản sai sang SĐT tài xế hoặc biển số xe.']]},
 pl:{"""),
 ("""const NB_ICON={""","""const NB_ICON={
  created:'<rect x="4.5" y="3.5" width="15" height="17" rx="2.2"/><path d="M8 8h8M8 12h5"/><circle cx="16" cy="16.5" r="3"/><path d="M16 15.2v1.5l1 .7"/>',"""),
]

GLOBAL = [("Sáu tiêu chí", "Bảy tiêu chí"), ("sáu tiêu chí", "bảy tiêu chí"), ("6 tiêu chí", "7 tiêu chí"), ("hết cả 6", "hết cả 7"), ("cả 6", "cả 7")]

def patch(app):
    miss = []
    for a, b in P:
        if a in app: app = app.replace(a, b)
        elif not a.startswith('Bộ luật 6'): miss.append(a[:70])
    for a, b in GLOBAL: app = app.replace(a, b)
    return app, miss

if __name__ == '__main__':
    a, m = patch(open('z4ref/app.js').read())
    print('missing:', m)
