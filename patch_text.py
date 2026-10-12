"""Viết lại câu chữ theo văn phong đơn giản: câu ngắn, nói thẳng, ít thuật ngữ.
Chạy SAU patch_app và patch_ux. Mỗi cặp (cũ, mới) là chuỗi khớp chính xác trong app."""

R = []
def r(a, b): R.append((a, b))

# ================= TỔNG QUAN (vùng & NPP) =================
r('không đủ điều kiện 15% DIP nếu chốt với số liệu hiện tại', 'nếu chốt hôm nay sẽ không nhận 15% DIP')
r('đệm Geo/On time chỉ 0–5 đơn, hoặc sai số 95% vắt ngang ngưỡng', 'đang đạt nhưng chỉ dư 0–5 đơn, dễ trượt')
r('đệm trên 5 đơn và sai số không vắt ngang ngưỡng', 'đang đạt và còn dư nhiều')
r('Nhóm "mong manh" là cách gom tín hiệu đã có để ưu tiên theo dõi — ', 'Nhóm "sát ngưỡng" chỉ để biết NPP nào cần theo dõi thêm — ')
r('. Bấm tên NPP để mở Tổng quan của NPP đó.', '. Bấm tên NPP để xem riêng NPP đó.')
r('NPP × 7 tiêu chí — xếp theo mức rủi ro', 'NPP × 7 tiêu chí — NPP đang trượt xếp trước')
r('Kết quả 7 tiêu chí của từng NPP, xếp theo mức rủi ro', 'Kết quả 7 tiêu chí của từng NPP')
r('Cần kiểm trước khi làm việc với NPP', 'Lưu ý')
r('đơn sai định dạng · ngưỡng ${num(TH.username,0)}%', 'đơn dùng tài khoản sai · cần 0 đơn sai')
r('Chuyến hỏng (${pct(r.dt_route_fail_pct)}) · ngưỡng dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến', 'Chuyến lỗi (${pct(r.dt_route_fail_pct)}) · cần dưới ${fmt(T_DTR_MONTH_PCT)}% số chuyến')
r('đã vượt ${num(-M.dt_margin,2)} điểm %', 'đã vượt ${num(-M.dt_margin,2)}%')
r('đơn lỗi · đã loại ${fmt(r.geo_excluded)} đơn DSA · ngưỡng ≥${num(T_GEO,0)}%', 'đơn lỗi · không tính ${fmt(r.geo_excluded)} đơn tài khoản kho (DSA) · cần ≥${num(T_GEO,0)}%')
r('đơn quá hạn 24h/48h · ngưỡng &gt;${num(T_OT,0)}%', 'đơn giao trễ hạn · cần &gt;${num(T_OT,0)}%')
r('Dùng chung cờ <span class="formula">is_ontime</span> · ngưỡng &gt;${num(T_OT,0)}%', 'Dùng chung kết quả với On time · cần &gt;${num(T_OT,0)}%')
r('`Tải/xe &gt;${num(T_PLR,1)} lần · ngưỡng ${num(TH.payload,0)}%', '`Chở quá ${num(T_PLR,1)} lần tải trọng xe · cần 0 chuyến')
r('phải xử lý hết ${fmt(-M.pl_margin)} chuyến', 'cần sửa ${fmt(-M.pl_margin)} chuyến')
r('đơn tạo sau giờ giao (Created Date lấy từ Fill Rate) · ngưỡng 0 chuyến', 'đơn được tạo sau giờ giao · cần 0 chuyến')
r('⚠ Số liệu ${fmt(DAYS)} ngày đầu tháng — mới là tạm tính, chưa dùng để chấm thưởng.', '⚠ Mới có số liệu ${fmt(DAYS)} ngày đầu tháng — kết quả tạm tính.')
r('⚠ Kết quả tạm tính — kỳ dữ liệu mới có ${fmt(DAYS)} ngày, chưa dùng để chấm điểm DIP.', '⚠ Mới có số liệu ${fmt(DAYS)} ngày — kết quả tạm tính, chưa chấm DIP.')
r('Cảnh báo cỡ mẫu — đọc trước khi dùng bất kỳ con số nào bên dưới.', 'Lưu ý: số đơn còn ít nên kết quả có thể thay đổi.')
r('Kỳ dữ liệu <b>${esc(DATA.meta.period)}</b> — mới ${fmt(DAYS)}/31 ngày, nên ngưỡng tính theo tháng (dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng) còn <b>chưa đủ kỳ</b>.',
  'Kỳ <b>${esc(DATA.meta.period)}</b> — mới có ${fmt(DAYS)} ngày, chưa đủ tháng.')
r('Kỳ dữ liệu <b>${esc(DATA.meta.period)}</b> — đủ tháng.', 'Kỳ <b>${esc(DATA.meta.period)}</b> — đủ tháng.')
r('<span class="ovs-t">Tóm tắt điều hành</span><span class="ovs-c">việc cần chốt · hạn chót · chủ thể</span>', '<span class="ovs-t">Tóm tắt cho quản lý</span><span class="ovs-c">việc cần làm · ai làm · khi nào</span>')
r('<span class="ovs-t">Biên an toàn · xếp hạng · độ nhạy</span><span class="ovs-c">khoảng cách tới ngưỡng tính bằng đơn · kịch bản chốt quy tắc</span>',
  '<span class="ovs-t">Còn dư bao nhiêu · xếp hạng</span><span class="ovs-c">còn thiếu/dư bao nhiêu đơn · nếu đổi cách tính thì sao</span>')
r('<span class="ovs-t">Xu hướng trong kỳ</span><span class="ovs-c">nửa đầu so nửa sau · ba ngày kém nhất</span>', '<span class="ovs-t">Tốt lên hay xấu đi</span><span class="ovs-c">nửa đầu so với nửa sau tháng · 3 ngày kém nhất</span>')
r('<span class="ovs-t">Lỗi thuộc về ai — và cần làm gì</span><span class="ovs-c">thống kê theo tài khoản · khuyến nghị xử lý</span>', '<span class="ovs-t">Lỗi của ai, cần làm gì</span><span class="ovs-c">theo từng tài khoản giao hàng</span>')
r('Tính trực tiếp từ ${fmt(DATA.meta.orders)} đơn của kỳ.', 'Tính từ ${fmt(DATA.meta.orders)} đơn trong kỳ.')
r('Quy tắc loại đơn DSA đang quyết định kết quả.', 'Việc không tính đơn tài khoản kho (DSA) làm thay đổi kết quả.')
r(' đổi kết quả vì quy tắc này.`:\'Không NPP nào đổi kết quả.\'} Chưa có văn bản chốt.', ' đổi kết quả vì quy tắc này.`:\'Không NPP nào đổi kết quả.\'}')
r('Ngưỡng là dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến mỗi NPP mỗi tháng (mỗi NPP một mẫu số riêng).', 'Mỗi NPP cần dưới ${fmt(T_DTR_MONTH_PCT)}% số chuyến của mình trong tháng.')
r('đơn đều khớp 1 trong 3 định dạng hợp lệ', 'đơn đều dùng tài khoản đúng')
r("'đang cải thiện và đã vượt ngưỡng':'đang cải thiện nhưng chưa tới ngưỡng'):'đang xấu đi'", "'đang tốt lên và đã đạt':'đang tốt lên nhưng chưa đạt'):'đang xấu đi'")
r('So nửa đầu kỳ (${esc(MH.p1)}, ${fmt(HK.n_h1)} đơn) với nửa sau (${esc(MH.p2)}, ${fmt(HK.n_h2)} đơn). Nhìn một con số trung bình cả kỳ thì không thấy được mình đang tốt lên hay xấu đi.',
  'So nửa đầu tháng (${esc(MH.p1)}, ${fmt(HK.n_h1)} đơn) với nửa sau (${esc(MH.p2)}, ${fmt(HK.n_h2)} đơn) để biết đang tốt lên hay xấu đi.')
r('So sánh nửa đầu và nửa sau kỳ', 'Nửa đầu và nửa sau tháng')
r('<b>Đáng lưu ý:</b> NPP đang cải thiện rõ giữa hai nửa kỳ. Nếu kết quả cuối cùng vẫn không đạt, nên nêu xu hướng này khi trao đổi với HEINEKEN.',
  '<b>Lưu ý:</b> NPP đang tốt lên rõ ở nửa sau tháng.')
r('Bấm một ngày để mở đơn lỗi của ngày đó.', 'Bấm vào một ngày để xem đơn lỗi ngày đó.')
r('ngưỡng 100% — không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng', 'không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng xe')
r('ngưỡng 0 chuyến — ${fmt(r.cd_fail)} đơn tạo sau giờ giao', '${fmt(r.cd_fail)} đơn được tạo sau giờ giao · cần 0 chuyến')
r('Đang lọc theo tiêu chí này — bấm lần nữa để bỏ lọc', 'Đang lọc theo tiêu chí này — bấm lại để bỏ lọc')
r('Bấm để lọc bảng theo tiêu chí này', 'Bấm để chỉ xem tiêu chí này')
r('chuyến · bình quân ${num(perPlan,1)} đơn/plan', 'chuyến · trung bình ${num(perPlan,1)} đơn/chuyến')
r('Đếm theo trạng thái đơn trên TMS. Đây là số lượng đơn đã giao, không phải kết quả Successful.', 'Số đơn có trạng thái Delivered trên TMS.')
r('Tài xế bấm xác nhận ngay tại cửa hàng · quản lý NPP rà lại toạ độ điểm bán', 'Tài xế bấm xác nhận ngay tại cửa hàng · NPP kiểm tra lại vị trí cửa hàng')
r('Điều phối &amp; kho: chốt đơn sớm và xuất bến kịp giờ', 'Điều phối và kho: chốt đơn sớm, xe xuất bến đúng giờ')
r('Điều phối: giãn các điểm giao đang quá sát giờ nhau', 'Tài xế bấm xác nhận tại từng điểm, không bấm dồn')
r('Điều phối &amp; kho xếp lại hàng — không phải lỗi tài xế', 'Điều phối và kho xếp lại hàng hoặc đổi xe lớn hơn')
r('Mục sát nhất: <b>${esc(thin[0])}</b> — còn dư <b>${fmt(thin[1])} ${thin[2]}</b> trước khi chạm mức phải đạt.', 'Sát nhất: <b>${esc(thin[0])}</b> — chỉ còn dư <b>${fmt(thin[1])} ${thin[2]}</b>.')
r('Kết quả theo từng ngày giao trong kỳ', 'Kết quả từng ngày')
r('số nửa kỳ, chưa dùng để chấm kết quả', 'chỉ để tham khảo')
r('Mình đang ở đâu so với mức phải đạt', 'Còn cách mức đạt bao xa')
r(' đang đúng chỗ · vạch đen là mức phải đạt: ', ' giao đúng chỗ · vạch đen là mức cần đạt: ')
r(' · kỳ mới ${fmt(DAYS)} ngày, chưa dùng để chấm thưởng', ' · mới có ${fmt(DAYS)} ngày, kết quả tạm tính')
r('chuyến · bình quân ${num(r.plans?r.orders/r.plans:0,2)} đơn/plan', 'chuyến · trung bình ${num(r.plans?r.orders/r.plans:0,1)} đơn/chuyến')
r("tile('Số plan',", "tile('Số chuyến',")
r('<b>Số plan</b><div class="r">Số chuyến giao trong kỳ (mỗi plan là một chuyến).</div>', '<b>Số chuyến</b><div class="r">Số chuyến xe (PlanNumber) trong kỳ.</div>')
r('<b>Đơn đã giao</b><div class="r">Đếm theo trạng thái đơn trong TMS (Status = Delivered).</div><div class="r">Đây là số khối lượng, không phải kết quả tiêu chí Successful.</div>', '<b>Đơn đã giao</b><div class="r">Số đơn có trạng thái Delivered trên TMS.</div>')
r('cả kỳ · dính ít nhất một tiêu chí', 'đơn bị lỗi ít nhất 1 tiêu chí')
r('<b>Đơn có lỗi</b><div class="r">Số đơn bị bắt lỗi ở ít nhất một trong bảy tiêu chí.</div><div class="r">Một đơn có thể dính nhiều tiêu chí cùng lúc.</div>', '<b>Đơn có lỗi</b><div class="r">Số đơn lỗi ít nhất 1 trong 7 tiêu chí. Một đơn có thể lỗi nhiều tiêu chí.</div>')
r('chuyến hỏng / ${fmt(r.plans)} chuyến (${pct(r.dt_route_fail_pct)})<span class="ovp-x"> · ${fmt(r.dt_orders_fail)} outlet lỗi</span>', 'chuyến lỗi / ${fmt(r.plans)} chuyến (${pct(r.dt_route_fail_pct)})<span class="ovp-x"> · ${fmt(r.dt_orders_fail)} điểm giao lỗi</span>')
r(' — hỏng 1 là mất toàn bộ thưởng.', ' — trượt 1 là mất 15% DIP.')
r('từng đơn sai · nhóm lỗi · tài khoản đang lỗi nhiều', 'đơn lỗi · loại lỗi · tài khoản lỗi nhiều')
r('bảng 7 tiêu chí có tỷ lệ · số plan &amp; đơn đã giao · cổng chặn', 'bảng 7 tiêu chí kèm số liệu')
r('<span class="ovh-if">Nếu chốt với số liệu hiện tại:</span> ', '<span class="ovh-if">Nếu chốt hôm nay:</span> ')
r(' — muốn đạt phải sửa đủ ${G.length} tiêu chí: ', ' — cần sửa ${G.length} tiêu chí: ')
r('Không có tiêu chí nào đang trượt. Khoảng đệm mỏng nhất: <b>${thinest.k} ${sgn(thinest.d,2)} điểm %</b> so với ngưỡng — giữ khoảng cách này ở các kỳ sau.',
  'Đang đạt cả 7 tiêu chí. Sát nhất là <b>${thinest.k}</b>: chỉ dư ${sgn(thinest.d,2)}%.')
r('Tiêu chí làm nhiều NPP trượt nhất: ', 'Trượt nhiều nhất ở: ')
r('<div class="ovgate-n">Data Accuracy không phải một tỷ lệ %, mà là kết quả ĐẠT/KHÔNG ĐẠT của cả 7 tiêu chí.</div>', '<div class="ovgate-n">Kết quả tháng chỉ có ĐẠT hoặc KHÔNG ĐẠT, không tính %.</div>')
r('<span class="ovs-t">Chỉ số chính</span>', '<span class="ovs-t">Chỉ số chính</span>')

# ================= VIỆC CẦN LÀM / TÍN HIỆU / LỖI =================
r('sửa thêm <b>${fmt(need)} đơn</b> đạt đủ cả 3 điều kiện Geo là chạm ngưỡng ${num(T_GEO,0)}%', 'cần thêm <b>${fmt(need)} đơn</b> giao đúng chỗ, đúng giờ để đạt ${num(T_GEO,0)}%')
r('giao đúng hạn thêm <b>${fmt(need)} đơn</b> là chạm ngưỡng ${num(T_OT,0)}%', 'cần thêm <b>${fmt(need)} đơn</b> giao đúng hạn để đạt ${num(T_OT,0)}%')
r('giảm <b>${fmt(needDt)} chuyến</b> lỗi Distance & Time là về dưới ngưỡng ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến', 'cần bớt <b>${fmt(needDt)} chuyến</b> lỗi Distance & Time để xuống dưới ${fmt(T_DTR_MONTH_PCT)}% số chuyến')
r('rà <b>${fmt(x.cd_fail)} đơn</b> tạo sau khi giao (${fmt(x.cd_routes_fail)} chuyến) — tiêu chí này yêu cầu 0 chuyến', 'kiểm tra <b>${fmt(x.cd_fail)} đơn</b> được tạo sau giờ giao (${fmt(x.cd_routes_fail)} chuyến) — cần 0 chuyến')
r('xử lý <b>${fmt(x.payload_plans_fail)} chuyến</b> chở quá tải — tiêu chí này yêu cầu tuyệt đối 0 chuyến', 'sửa <b>${fmt(x.payload_plans_fail)} chuyến</b> chở quá tải — cần 0 chuyến')
r('đơn ở điểm bán nghi sai toạ độ', 'đơn ở cửa hàng có thể bị sai vị trí trên hệ thống')
r('đơn không có giờ giao bị tính ngoài giờ', 'đơn thiếu giờ giao nên bị tính ngoài giờ')
r('đổi kết quả nếu chốt bán kính 200 m', 'sẽ đạt nếu cho phép lệch 200m')
r('đơn chưa giao xong bị tính quá hạn', 'đơn chưa giao xong nên bị tính trễ hạn')
r('chuyến quá tải nằm trên xe khai từ 2 mức tải trọng', 'chuyến quá tải là xe khai 2 mức tải trọng khác nhau')
r(' (nếu dùng tải lớn nhất của chính xe: còn ${fmt(c.best)})', ' (nếu lấy tải trọng lớn nhất của xe: còn ${fmt(c.best)})')
r('(${fv(k,o,o.v)} · mức giữa vùng ${fv(k,o,o.median)})', '(${fv(k,o,o.v)} · trung vị vùng ${fv(k,o,o.median)})')
r('chưa có tiêu chí nào vừa nằm trong top 3 vừa cao hơn mức giữa của vùng.', 'chưa có tiêu chí nào trong top 3 của vùng.')
r(' — phần này không phải để nhắc nhở, mà để giữ khoảng cách an toàn với ngưỡng trong các kỳ sau.', ' — phần này giúp giữ kết quả cho tháng sau.')
r('Việc cần làm, theo thứ tự ưu tiên', 'Việc cần làm (quan trọng trước)')
r('NPP đang trượt: <b>${fails.map(k=>KPI_LABEL[k]).join(\' · \')}</b> — nhóm đầu bảng dưới đây là việc phải làm trước.', 'NPP đang trượt: <b>${fails.map(k=>KPI_LABEL[k]).join(\' · \')}</b>. Làm nhóm đầu tiên trước.')
r(' · <b>đây là tiêu chí đang làm NPP trượt DIP</b>', ' · <b>đây là tiêu chí làm NPP mất DIP</b>')
r('<b>Cách dùng:</b> mỗi tuần lấy một nhóm ra họp đầu ca, giao đích danh người xử lý. Tuần sau mở lại báo cáo và đối chiếu số đơn lỗi của đúng nhóm đó.', '<b>Gợi ý:</b> mỗi tuần chọn 1 nhóm, giao người xử lý, tuần sau mở lại báo cáo xem số lỗi đã giảm chưa.')
r('<span class="ic">◐</span>sát ngưỡng</span>', '<span class="ic">◐</span>sát mức đạt</span>')
r('<b>Ngày cần xem lại:</b>', '<b>Ngày kém nhất:</b>')
r('<b>Số ngày dưới ngưỡng:</b>', '<b>Số ngày không đạt:</b>')
r('<b>Nửa đầu → nửa sau:</b>', '<b>Nửa đầu → nửa sau tháng:</b>')
r('<b>Nửa sau kỳ dưới ngưỡng Geo:</b>', '<b>Nửa sau tháng chưa đạt Geo:</b>')
r('<b>Nửa sau kỳ dưới ngưỡng On time:</b>', '<b>Nửa sau tháng chưa đạt On time:</b>')
r('data-l="Cách outlet trước (phút)" style="color:var(--muted)" title="Outlet đầu tiên của chuyến — không có mốc trước để tính"', 'data-l="Cách điểm trước (phút)" style="color:var(--muted)" title="Điểm giao đầu tiên của chuyến"')
r('data-l="Cách outlet trước (phút)" title="Cách outlet liền trước dưới 2 phút"', 'data-l="Cách điểm trước (phút)" title="Cách điểm giao trước dưới 2 phút"')
r('<td class="n" data-l="Cách outlet trước (phút)">', '<td class="n" data-l="Cách điểm trước (phút)">')
r('NPP dưới ngưỡng</b>: <b>${bad.map(esc).join', 'NPP chưa đạt</b>: <b>${bad.map(esc).join')
r('NPP nhẹ nhất là', 'Dễ sửa nhất là')
r('Cần theo dõi: <b>${thin.map(esc).join(\' · \')}</b> có sai số 95% vắt ngang ngưỡng.', 'Cần theo dõi: <b>${thin.map(esc).join(\' · \')}</b> đang rất sát mức đạt.')
r('Không NPP nào sát ngưỡng ở tiêu chí này.', 'Không NPP nào sát mức đạt ở tiêu chí này.')
r('`Kiểm trước: ${s.map(esc).join(', '`Lưu ý: ${s.map(esc).join(')
r('<div class="r">Bấm để xem danh sách đơn</div>', '<div class="r">Bấm để xem đơn</div>')
r('Lỗi đang ở đâu — và cần làm gì', 'Lỗi ở đâu, cần làm gì')
r('Bốn nhóm đều đếm theo số đơn nên so được với nhau. Bấm vào một nhóm để xem danh sách đơn của nhóm đó.', 'Đếm theo số đơn. Bấm vào một nhóm để xem đơn.')
r('đơn dính từ hai tiêu chí trở lên nên tổng bốn nhóm lớn hơn ${fmt(nRow)} đơn.', 'đơn lỗi từ 2 tiêu chí trở lên nên cộng các nhóm sẽ lớn hơn ${fmt(nRow)} đơn.')
r('Đơn phải đạt đủ cả 3 điều kiện mới tính là giao đúng chỗ. Đang hỏng nhiều nhất ở ', 'Đơn phải đạt cả 3 điều kiện. Lỗi nhiều nhất ở ')
r(' số đơn lỗi Geo. Sửa chỗ này lợi nhất.', ' số đơn lỗi Geo — nên sửa chỗ này trước.')
r(' đơn chỉ sai vì giờ giao, vị trí hoàn toàn đúng — đây là việc của <b>điều phối</b>, không phải GPS.', ' đơn chỉ sai vì giao ngoài giờ, vị trí vẫn đúng — cần <b>điều phối</b> sắp lại giờ chạy.')
r('chuyến hỏng / ${fmt(x.plans)} chuyến (${pct(x.dt_route_fail_pct)}), ngưỡng dưới ${fmt(T_DTR_MONTH_PCT)}%', 'chuyến lỗi / ${fmt(x.plans)} chuyến (${pct(x.dt_route_fail_pct)}), cần dưới ${fmt(T_DTR_MONTH_PCT)}%')
r('Thưởng chấm theo cổng VÀ nên xếp theo NPP: NPP phải sửa ít tiêu chí hơn đứng trước. Số lớn là số đơn/chuyến tối thiểu phải sửa; dòng nhỏ là điều cần kiểm trước khi làm việc với NPP. Bấm một dòng để mở đúng phần cần rà.',
  'NPP cần sửa ít tiêu chí xếp trước. Số lớn là số đơn/chuyến ít nhất phải sửa. Bấm một dòng để xem chi tiết.')
r('— muốn đạt phải sửa đủ ${fmt(j.cnt)} tiêu chí</p>', '— cần sửa ${fmt(j.cnt)} tiêu chí</p>')
r('</b> Phần dưới là các khoảng đệm mỏng cần giữ.</p>', '</b> Bên dưới là các tiêu chí đang sát mức đạt.</p>')
r('đang đạt nhưng đệm rất mỏng', 'đang đạt nhưng rất sát')
r('xử lý vài tài khoản đầu là giải quyết được phần lớn.', 'chỉ cần xử lý vài tài khoản đầu.')
r('nhắc riêng từng người sẽ không đủ, cần chuẩn hoá quy trình chung.', 'lỗi rải đều nhiều người, cần sửa cách làm chung.')
r('tài khoản</b> trong bảng chạy dưới ${fmt(T_SMALL)} đơn, có nhãn "mẫu nhỏ" — chỉ vài lỗi đã ra tỷ lệ cao, đừng lấy riêng con số đó để đánh giá người.', 'tài khoản</b> có dưới ${fmt(T_SMALL)} đơn (nhãn "ít đơn") — vài lỗi đã ra tỷ lệ cao, đừng chỉ nhìn % để đánh giá.')
r('Tài khoản cần nhắc — xếp theo tỷ lệ đơn lỗi', 'Tài khoản lỗi nhiều nhất')
r(' có lỗi trong kỳ, xếp hạng liên tục theo tỷ lệ đơn lỗi. Bấm vào tên tài khoản để xem đơn lỗi của tài khoản đó.', ' có lỗi, xếp theo tỷ lệ đơn lỗi. Bấm vào tài khoản để xem đơn lỗi.')
r(' có thể do nhiều tài xế dùng chung, tài khoản ', ' có thể nhiều tài xế dùng chung, tài khoản ')
r('Trước khi làm việc với ai:', 'Lưu ý:')
r(' là của kho, không phải tài xế. Hãy đối chiếu bảng phân công trước khi quy trách nhiệm.${smlNote}', ' là của kho, không phải tài xế. Nên xem bảng phân công trước khi nhắc ai.${smlNote}')
r('title="Mẫu nhỏ: dưới ${fmt(T_SMALL)} đơn — chỉ vài lỗi đã ra tỷ lệ cao, thận trọng khi dùng để quy trách nhiệm"><span class="ic">◐</span>mẫu nhỏ</span>', 'title="Dưới ${fmt(T_SMALL)} đơn — vài lỗi đã ra tỷ lệ cao"><span class="ic">◐</span>ít đơn</span>')
r('<span class="ea-note">do xếp tải — làm việc với điều phối/kho, không phải tài xế</span>', '<span class="ea-note">do xếp hàng — trao đổi với điều phối/kho</span>')

# ================= Theo góp ý: Created Date / Cổng chặn / Việc cần làm theo NPP =================
r("""    const unit = g => g.k==='dt'||g.k==='pl' ? 'chuyến' : 'đơn';""",
  """    const unit = g => g.k==='geo'||g.k==='ot' ? 'đơn' : (g.k==='un'?'tài khoản':'chuyến');
    const ACT = g => ({geo:`thêm <b>${fmt(g.n)} đơn</b> giao đúng chỗ, đúng giờ`, ot:`thêm <b>${fmt(g.n)} đơn</b> giao đúng hạn`,
      dt:`bớt <b>${fmt(g.n)} chuyến</b> bấm xác nhận quá sát giờ`, pl:`sửa <b>${fmt(g.n)} chuyến</b> chở quá tải`,
      cd:`sửa <b>${fmt(g.n)} chuyến</b> có đơn tạo sau giờ giao`, un:`sửa <b>${fmt(g.n)} tài khoản</b> sai định dạng`})[g.k]||`sửa <b>${fmt(g.n)}</b>`;""")
r("""      ? ` — cần sửa ${G.length} tiêu chí: ${G.map(g=>`<b>${esc(KPI_LABEL[g.k]||'')} ${fmt(g.n)} ${unit(g)}</b>`).join(' · ')}`
      : ` — còn thiếu <b>${fmt(G[0].n)} ${unit(G[0])}</b> ở <b>${esc(KPI_LABEL[G[0].k]||'')}</b>`);""",
  """      ? `. Để đạt cần: ${G.map(ACT).join('; ')}`
      : `. Để đạt cần ${ACT(G[0])}`);""")
r("""<span>Đang trượt <b>${fails.length}</b> tiêu chí: <b>${fails.map(k=>k.n).join(' · ')}</b>${near}.</span>""",
  """<span>Đang rớt <b>${fails.length}</b> tiêu chí: <b>${fails.map(k=>k.n).join(' · ')}</b>${near}.</span>""")
r("""<div class="ovgate-h">Cổng chặn <b>VÀ</b></div>""", """<div class="ovgate-h">Phải đạt cả ${SIX.length} tiêu chí</div>""")
r("""Trượt <b>1 trong ${SIX.length}</b> tiêu chí là mất <b>15% DIP</b>. Không tính trung bình, không bù trừ.""",
  """Chỉ cần rớt <b>1</b> tiêu chí là không đạt tháng và mất <b>15% DIP</b>.""")
r("""<b>Cổng chặn VÀ</b><div class="r">Phải đạt cả 7 tiêu chí. Trượt 1 tiêu chí là mất trọn 15% DIP — không có điểm trung bình, không bù trừ.</div>""",
  """<b>Cách tính kết quả</b><div class="r">Phải đạt cả 7 tiêu chí. Rớt 1 tiêu chí là không đạt tháng, mất 15% DIP.</div>""")
r("""<b>Điểm mạnh so với vùng:</b>""", """<b>Điểm mạnh:</b>""")
r('chưa có tiêu chí nào trong top 3 của vùng.', 'chưa có tiêu chí nào lọt top 3 của vùng.')
# Việc cần làm theo từng NPP
r("""k:'Geo Compliance',  n:-m.geo_margin, u:'đơn',    t:'Geo',
                                        w:`đang ${pct(x.geo_pct)}, ngưỡng ≥${num(T_GEO,0)}%`});""",
  """k:'Geo Compliance (giao đúng chỗ, đúng giờ)',  n:-m.geo_margin, u:'đơn',    t:'Geo',
                                        w:`Hiện ${pct(x.geo_pct)} · cần từ ${num(T_GEO,0)}% trở lên`});""")
r("""k:'On time',         n:-m.ot_margin,  u:'đơn',    t:'On-time',
                                        w:`đang ${pct(x.ot_pct)}, ngưỡng >${num(T_OT,0)}%`});""",
  """k:'On time (giao đúng hạn)',         n:-m.ot_margin,  u:'đơn',    t:'On-time',
                                        w:`Hiện ${pct(x.ot_pct)} · cần trên ${num(T_OT,0)}%`});""")
r("""k:'Created Date', n:x.cd_routes_fail, u:'chuyến', t:'Created Date',
                                        w:`${fmt(x.cd_fail)} đơn tạo sau khi giao`});""",
  """k:'Created Date (tạo đơn trước khi giao)', n:x.cd_routes_fail, u:'chuyến', t:'Created Date',
                                        w:`${fmt(x.cd_fail)} đơn được tạo sau giờ giao · cần 0 chuyến`});""")
r("""k:'Payload',         n:x.payload_plans_fail, u:'chuyến', t:'Payload',
                                        w:`chuyến chở quá ${num(T_PLR,1)} lần tải trọng`});""",
  """k:'Payload (không chở quá tải)',         n:x.payload_plans_fail, u:'chuyến', t:'Payload',
                                        w:`Chở quá ${num(T_PLR,1)} lần tải trọng xe · cần 0 chuyến`});""")
r("""jobs.push({npp:x.npp, k:'Distance & Time', n:needDt2,""", """jobs.push({npp:x.npp, k:'Distance & Time (bấm xác nhận quá sát giờ)', n:needDt2,""")
r("""<p class="estat-ct">Việc cần làm — theo từng NPP</p>
    <p class="estat-cs">NPP cần sửa ít tiêu chí xếp trước. Số lớn là số đơn/chuyến ít nhất phải sửa. Bấm một dòng để xem chi tiết.</p>""",
  """<p class="estat-ct">Việc cần làm của từng NPP</p>
    <p class="estat-cs">Mỗi dòng là một tiêu chí NPP đang rớt. Số bên phải là số đơn hoặc chuyến cần sửa để đạt. Bấm vào dòng để xem danh sách đơn.</p>""")
r("""<p class="etg"><b>${esc(j.npp)}</b> — cần sửa ${fmt(j.cnt)} tiêu chí</p>""", """<p class="etg"><b>${esc(j.npp)}</b> — đang rớt ${fmt(j.cnt)} tiêu chí</p>""")
r("""<span class="etd-n">${fmt(Math.max(1,j.n))}<em>${esc(j.u)} cần sửa</em></span>""", """<span class="etd-n">${fmt(Math.max(1,j.n))}<em>${esc(j.u)} cần sửa</em></span>""")
r("""<span class="etd-n">${fmt(t.n)}<em>đơn đệm còn lại</em></span>""", """<span class="etd-n">${fmt(t.n)}<em>đơn còn dư</em></span>""")
r("""Lỗi nằm ở <b>${fmt(us.users_err)}</b>/${fmt(us.users)} tài khoản; ba tài khoản đầu chiếm""", """Có <b>${fmt(us.users_err)}</b>/${fmt(us.users)} tài khoản bị lỗi; 3 tài khoản lỗi nhiều nhất chiếm""")
r("""<p class="estat-ct">Geo hỏng vì điều kiện nào</p>""", """<p class="estat-ct">Geo rớt vì lý do nào</p>""")

# ================= NGUYÊN NHÂN & VIỆC LÀM (CAUSE) =================
r("""why:'Giờ tạo đơn (Fill Rate) muộn hơn giờ giao — thường do <b>giờ điện thoại tài xế sai</b> hoặc đơn được tạo bù sau khi giao.',""",
  """why:'Đơn được tạo sau giờ giao. Thường do <b>giờ trên điện thoại tài xế bị sai</b>, hoặc đơn được tạo bù sau khi đã giao.',""")
r("""'Kiểm tra giờ trên điện thoại tài xế của các chuyến này và chỉnh về giờ chuẩn.'""", """'Kiểm tra và chỉnh lại giờ trên điện thoại của tài xế.'""")
r("""'Không tạo bù đơn sau khi đã giao; tạo đơn trước khi xe xuất bến.'""", """'Tạo đơn trước khi xe chạy, không tạo bù sau khi đã giao.'""")
r("""t:'Tài khoản giao hàng sai định dạng',""", """t:'Tài khoản giao hàng sai',""")
r("""why:'Tài khoản phải là <b>SĐT 10 số</b>, <b>biển số xe</b> hoặc <b>tài khoản DSA</b>.',""", """why:'Tài khoản giao hàng phải là <b>SĐT 10 số</b>, <b>biển số xe</b> hoặc <b>tài khoản kho (DSA)</b>.',""")
r("""pl:{ t:'Xe bị chất quá 1,5 lần tải trọng',
   why:'Đây là lỗi <b>khâu lên kế hoạch và xếp hàng tại kho</b> — tài xế không quyết định được chất bao nhiêu lên xe.',""",
  """pl:{ t:'Xe chở quá 1,5 lần tải trọng',
   why:'Lỗi này do <b>khâu xếp chuyến và xếp hàng ở kho</b>, không phải do tài xế.',""")
r("""'Rà lại việc gán xe cho các chuyến này: chia nhỏ chuyến, hoặc đổi sang xe tải trọng lớn hơn.'""", """'Chia nhỏ chuyến hoặc đổi sang xe lớn hơn.'""")
r("""'Cân đối trước khi xuất hàng — dừng xuất khi tổng khối lượng vượt 1,5 lần tải đăng ký của xe.'""", """'Không xuất hàng khi tổng hàng vượt 1,5 lần tải trọng của xe.'""")
r("""'Kiểm tra <b>tải trọng xe khai trong hệ thống TMS</b> có khớp xe thật không. Nếu khai thấp hơn xe thật thì đây là lỗi dữ liệu, sửa khai báo là hết lỗi.'""",
  """'Kiểm tra <b>tải trọng xe khai trên TMS</b> có đúng với xe thật không. Nếu khai thấp hơn thực tế thì sửa lại khai báo.'""")
r("""return { t:'Không đạt Geo Compliance',""", """return { t:'Geo Compliance rớt',""")
r("""why:`Geo Compliance ghép <b>3 điều kiện</b>, đơn chỉ cần phạm một là tính lỗi: giao cách điểm bán quá ${fmt(T_RAD)}m (<b>${fmt(vN)}</b> đơn) · hai điểm giao liên tiếp chỉ cách nhau ${fmt(TH.geo_gap_min??2)} phút hoặc ít hơn (<b>${fmt(wN)}</b> đơn) · hoàn tất <b>ngoài khung ${esc(WH_TXT)}</b> (<b>${fmt(xN)}</b> đơn, trong đó <b>${fmt(xOnly)}</b> đơn CHỈ lỗi vì giờ giao dù vị trí hoàn toàn đúng).${xOnly>0?' Phần ngoài giờ là vấn đề <b>lịch xuất bến</b>, không phải độ chính xác GPS.':''}`,""",
  """why:`Đơn bị tính lỗi Geo khi rơi vào 1 trong 3 trường hợp: giao cách cửa hàng quá ${fmt(T_RAD)}m (<b>${fmt(vN)}</b> đơn) · bấm xác nhận cách điểm giao trước không quá ${fmt(TH.geo_gap_min??2)} phút (<b>${fmt(wN)}</b> đơn) · giao <b>ngoài giờ ${esc(WH_TXT)}</b> (<b>${fmt(xN)}</b> đơn).${xOnly>0?` Có <b>${fmt(xOnly)}</b> đơn đúng vị trí nhưng giao ngoài giờ — cần sắp lại giờ chạy xe.`:''}`,""")
r("""xOnly>0?`Rà các chuyến kết thúc sau ${fmt(T_WE)}h hoặc trước ${fmt(T_WS)}h — dồn giao về sáng hôm sau thay vì cố hoàn tất trong đêm.`:`Kiểm tra lịch xuất bến có nằm gọn trong khung ${esc(WH_TXT)} không.`""",
  """xOnly>0?`Xem lại các chuyến giao sau ${fmt(T_WE)}h hoặc trước ${fmt(T_WS)}h — nên dời sang sáng hôm sau.`:`Sắp xếp để xe giao xong trong khung ${esc(WH_TXT)}.`""")
r("""'Với các đơn lệch vị trí (khác nhóm ngoài giờ): đi thị trường cùng tài xế 1 ngày để biết đang bấm sớm/muộn, giao nhầm cửa, hay toạ độ điểm bán trong hệ thống sai.'""",
  """'Đi cùng tài xế 1 ngày để xem vì sao lệch vị trí: bấm sớm/muộn, giao nhầm cửa hàng, hay vị trí cửa hàng trên hệ thống bị sai.'""")
r("""`Chỉ bấm xác nhận khi đã đứng tại điểm bán. Nếu chuyến chắc chắn xong sau ${fmt(T_WE)}h, báo điều phối thay vì cố giao cho xong.`""",
  """`Chỉ bấm xác nhận khi đã đứng tại cửa hàng. Nếu biết sẽ giao sau ${fmt(T_WE)}h thì báo điều phối.`""")
r("""'Trích danh sách điểm bán bị lệch vị trí nhiều lần và đo lại toạ độ. Nếu cùng một điểm bán lặp lại thì lỗi ở dữ liệu gốc.'""",
  """'Lọc các cửa hàng bị lệch vị trí nhiều lần và cập nhật lại vị trí trên hệ thống.'""")
r("""ot:{ t:'Giao quá hạn cam kết 24h/48h',
   why:'Đồng hồ SLA chạy từ lúc <b>điểm bán đặt hàng</b>, nên quá hạn có thể do chốt đơn muộn, soạn hàng chậm, hay xe rời bến trễ — không nhất thiết do tài xế chạy chậm.',""",
  """ot:{ t:'Giao trễ hạn 24h/48h',
   why:'Thời hạn tính từ lúc <b>cửa hàng đặt hàng</b>. Trễ có thể do chốt đơn muộn, soạn hàng chậm, hoặc xe xuất bến trễ — không hẳn do tài xế.',""")
r("""'Dựng lại mốc thời gian của các đơn quá hạn: đặt hàng lúc nào → soạn xong lúc nào → xuất bến lúc nào → giao lúc nào. Khâu ngốn nhiều giờ nhất là khâu phải sửa.'""",
  """'Xem lại các đơn trễ: đặt hàng lúc nào → soạn xong lúc nào → xe chạy lúc nào → giao lúc nào. Khâu nào chậm nhất thì sửa khâu đó.'""")
r("""'Sắp lại thứ tự điểm giao theo cụm địa lý và theo <b>giờ nhận hàng của điểm bán</b> — nhiều tạp hoá không nhận hàng giờ trưa.'""",
  """'Sắp xếp tuyến giao theo khu vực và theo <b>giờ nhận hàng của cửa hàng</b>.'""")
r("""'Nếu trễ tập trung ở vài điểm bán cố định, làm việc lại với điểm bán về khung giờ nhận hàng thay vì ép tài xế.'""",
  """'Nếu trễ hay rơi vào vài cửa hàng cố định, trao đổi lại với cửa hàng về giờ nhận hàng.'""")
r("""dt:{ t:'Chuyến lỗi Distance & Time',""", """dt:{ t:'Chuyến lỗi Distance & Time (bấm xác nhận quá sát giờ)',""")
r("""'Xác minh trực tiếp: tài xế bấm dồn cuối ca, hay máy mất mạng rồi gửi dồn? Hai nguyên nhân này xử lý hoàn toàn khác nhau.'""",
  """'Kiểm tra xem tài xế bấm dồn cuối ca, hay điện thoại mất mạng rồi gửi dồn.'""")
r("""'Kiểm tra nhật ký gửi dữ liệu của máy. Nếu khoảng cách giữa các đơn đều tăm tắp (ví dụ đúng 9 giây) thì là lỗi hệ thống, <b>không được quy cho tài xế</b>.'""",
  """'Nếu các đơn cách nhau đều tăm tắp (ví dụ đúng 9 giây) thì có thể là lỗi máy, <b>không phải lỗi tài xế</b>.'""")
r("""'Nếu đúng là bấm dồn: nhắc bấm xác nhận ngay tại từng điểm. Đây là dữ liệu dùng xét thưởng DIP, bấm dồn làm sai số liệu của cả NPP.'""",
  """'Nhắc tài xế bấm xác nhận ngay tại từng cửa hàng, không bấm dồn.'""")
r("""const KPI_LABEL={geo:L.kpiGeo, ot:'Giao trong cam kết 24h/48h', dt:L.kpiDT, pl:'Xe chở quá tải', cd:'Created Date', un:'User name'};""",
  """const KPI_LABEL={geo:'Geo Compliance', ot:'On time', dt:'Distance & Time', pl:'Payload', cd:'Created Date', un:'User name'};""")
r("""const GEO_DEF_SHORT = `đơn phải đạt <b>cả 3 điều kiện</b>: <b>(1)</b> giao tại vị trí điểm bán dưới ${TH.geo_radius_m??50}m · <b>(2)</b> hai điểm giao liên tiếp trên ${TH.geo_gap_min??2} phút · <b>(3)</b> giao trong giờ làm việc ${WH_TXT}`;""",
  """const GEO_DEF_SHORT = `đơn phải đạt <b>cả 3 điều kiện</b>: <b>(1)</b> giao cách cửa hàng dưới ${TH.geo_radius_m??50}m · <b>(2)</b> cách điểm giao trước trên ${TH.geo_gap_min??2} phút · <b>(3)</b> giao trong giờ ${WH_TXT}`;""")
# ================= TRANG ĐƠN LỖI =================
r("""<h2>Đơn hàng có lỗi</h2>""", """<h2>Đơn lỗi</h2>""")
r("""Đơn dính ít nhất một tiêu chí. Lọc, rồi tải <b>đúng phần đang lọc</b> ra Excel để đối soát với đội giao hàng.""",
  """Các đơn bị lỗi ít nhất 1 tiêu chí. Lọc theo nhu cầu rồi bấm <b>Tải Excel</b> để gửi đội giao hàng kiểm tra.""")
r("""<b>Thẻ đỏ</b> = tiêu chí đang rớt, đây là phần phải xử lý""", """<b>Thẻ đỏ</b> = tiêu chí đang rớt, cần xử lý trước""")
r("""Bấm một thẻ để lọc bảng theo tiêu chí đó.""", """Bấm vào thẻ để chỉ xem tiêu chí đó.""")
r("""<li><b>Các tiêu chí độc lập nhau.</b> "Giao trễ hạn" là quá cam kết 24h/48h kể từ lúc điểm bán đặt hàng — không liên quan phút hoàn tất hay lệch vị trí. Một đơn có thể lệch 5m, hoàn tất sau 2 tiếng, mà vẫn trễ hạn vì giao sang ngày hôm sau.</li>""",
  """<li><b>Mỗi tiêu chí chấm riêng.</b> Một đơn giao đúng chỗ vẫn có thể bị trễ hạn nếu giao quá 24h/48h kể từ lúc cửa hàng đặt.</li>""")
r("""<li><b>Hai điểm giao</b> = thời gian và khoảng cách so với điểm giao liền trước <i>trong cùng một chuyến</i>. Thời gian tô đỏ khi &lt;2 phút. Điểm giao đầu tiên hiển thị "—" vì không có mốc trước.</li>""",
  """<li><b>Cách điểm trước</b> = số phút so với điểm giao trước trong cùng chuyến. Tô đỏ khi dưới 2 phút. Điểm giao đầu tiên hiện "—".</li>""")
r("""<li><b>Distance &amp; Time</b> đếm theo <b>chuyến</b>: điểm giao lỗi khi cách điểm giao trước dưới ${fmt(TH.dt_gap_min??2)} phút, chuyến lỗi khi tỷ lệ điểm giao lỗi vượt ${fmt(T_DTR_ROUTE_PCT)}% tổng điểm giao của chuyến. <b>Geo Compliance</b> đếm theo <b>đơn</b>: điều kiện (2) yêu cầu giữa 2 điểm giao trên ${fmt(TH.geo_gap_min??2)} phút.</li>""",
  """<li><b>Distance &amp; Time</b> tính theo <b>chuyến</b>: chuyến bị lỗi khi hơn ${fmt(T_DTR_ROUTE_PCT)}% điểm giao trong chuyến bấm cách nhau dưới ${fmt(TH.dt_gap_min??2)} phút. <b>Geo Compliance</b> tính theo <b>đơn</b>.</li>""")
r("""<li><b>SL</b> = số lượng trên đơn · <b>Code</b> = mã điểm bán · <b>Status</b> = trạng thái đơn trong TMS.
      Ba cột này giữ đúng tên như trong file Excel xuất ra để đối chiếu cho nhanh; cột Status chỉ hiện khi trạng thái
      <b>khác Delivered</b> — đó là các đơn chưa giao xong nhưng vẫn bị chấm.</li>""",
  """<li><b>SL</b> = số lượng · <b>Code</b> = mã cửa hàng · <b>Status</b> = trạng thái đơn trên TMS (chỉ hiện khi đơn chưa giao xong).</li>""")
r("""<li><b>Gom nhóm theo chuyến:</b> các đơn cùng một chuyến chung một dải màu ở mép trái; dòng đầu khối in đậm mã chuyến, các dòng sau có dấu └.</li>""",
  """<li>Các đơn cùng chuyến được gom lại, có chung dải màu bên trái.</li>""")
r("""<li><b>Sắp xếp:</b> bấm tiêu đề cột — lần nữa đảo chiều, lần thứ ba bỏ sắp xếp. Khi sắp xếp, gom nhóm theo chuyến tự tắt vì các đơn cùng chuyến không còn nằm cạnh nhau.</li>""",
  """<li>Bấm tên cột để sắp xếp; bấm lần nữa để đảo chiều.</li>""")
r("""<summary>File Excel gồm những cột nào</summary>""", """<summary>File Excel có gì</summary>""")
r("""Giữ đúng <b>25 cột của file nguồn <code>${esc(DATA.meta.source||"")}</code></b> theo nguyên thứ tự và tên cột, cộng các cột phân tích ở cuối: Thời gian giữa 2 điểm giao · Đơn thứ mấy của chuyến · Tổng đơn của chuyến · Số ngày trễ · Tỷ lệ tải của chuyến · Loại lỗi. File <b>chỉ chứa dữ liệu của NPP đang xem</b>, mở thẳng bằng Excel: đúng cột, ngày ra ngày, số ra số, tiêu đề khoá sẵn kèm bộ lọc.""",
  """Gồm đủ các cột của file TMS gốc, thêm các cột: số phút cách điểm trước, số ngày trễ, tỷ lệ tải của chuyến, loại lỗi, Created Date. File <b>chỉ có dữ liệu của NPP đang xem</b>.""")
r("""<td colspan="5">Không có dòng vi phạm nào trong phạm vi đang xem.</td>""", """<td colspan="5">Không có đơn lỗi.</td>""")
r("""<strong><span class="xm">✕</span> Không đạt Geo</strong><em>xem cột vị trí/giờ giao</em>""", """<strong><span class="xm">✕</span> Geo rớt</strong><em>xem cột vị trí và giờ giao</em>""")
r("""chỉ ${m[1]} phút · yêu cầu trên ${fmt(TH.geo_gap_min??2)} phút""", """chỉ ${m[1]} phút · cần trên ${fmt(TH.geo_gap_min??2)} phút""")
r("""thiếu thời điểm giao để đối chiếu giờ""", """không có giờ giao""")
r("""cách điểm giao trước ${num(e.gap_prev_min,1)} phút · ngưỡng ${fmt(TH.dt_gap_min??2)} phút""", """cách điểm trước ${num(e.gap_prev_min,1)} phút · cần từ ${fmt(TH.dt_gap_min??2)} phút""")
r("""cả chuyến chở ${num(e.plan_ratio,2)} lần tải trọng · ngưỡng ${num(T_PLR,1)}""", """chuyến chở ${num(e.plan_ratio,2)} lần tải trọng · tối đa dưới ${num(T_PLR,1)} lần""")
r("""Đang lọc riêng lỗi của tài khoản """, """Đang xem lỗi của tài khoản """)
r("""đã tắt gom nhóm theo chuyến""", """đã bỏ gom theo chuyến""")
r("""✕ Bỏ sắp xếp, gom lại theo chuyến""", """✕ Bỏ sắp xếp""")
r("""${fmt(cap)} đơn · ${fmt(nGap)} đơn cách điểm giao trước <2 phút""", """${fmt(cap)} đơn · ${fmt(nGap)} đơn bấm cách điểm trước dưới 2 phút""")
r("""Đang xem đơn <b>${fmt(from+1)}–${fmt(from+shown.length)}</b> trong tổng <b>${fmt(cap)}</b> đơn.""", """Đơn <b>${fmt(from+1)}–${fmt(from+shown.length)}</b> / <b>${fmt(cap)}</b>.""")
r("""chuyến ${fmt(e.plan_orders)} đơn · ${fmt(cnt[e.PlanNumber])} dòng ở trang này""", """chuyến ${fmt(e.plan_orders)} đơn · ${fmt(cnt[e.PlanNumber])} đơn lỗi""")
r("""Thử bỏ bớt bộ lọc ngày hoặc loại lỗi.""", """Thử bỏ bớt bộ lọc.""")
r("""Trang này có ${fmt(shown.length)} đơn — cuộn bên trong bảng để xem hết""", """Có ${fmt(shown.length)} đơn — kéo trong bảng để xem hết""")
r("""${fmt(cap)} đơn khớp bộ lọc, đang xem trang ${epage} trên ${pages}""", """${fmt(cap)} đơn · trang ${epage}/${pages}""")
r("""Danh sách đơn hàng vi phạm tiêu chí, nhóm theo chuyến""", """Danh sách đơn lỗi, gom theo chuyến""")

import re as _re
TERMS = [('chuyến hỏng','chuyến lỗi'),('tính là hỏng','tính là lỗi'),('tính hỏng','tính là lỗi'),('làm hỏng','làm sai'),
         ('Geo hỏng','Geo rớt'),(' hỏng',' rớt'),
         ('TRƯỢT','RỚT'),('Trượt','Rớt'),('trượt','rớt'),
         ('outlet→outlet','giữa 2 điểm giao'),('Outlet lỗi','Điểm giao lỗi'),('Outlet đầu chuyến','Điểm giao đầu tiên')]
OUTLET = _re.compile(r'(?<=[\s>("\'])outlet(?=[\s<&)"\'.,])')
def terms(app):
    keep = 'Outlet toi outlet'
    app = app.replace(keep, '\x00KEEP\x00')
    for a, b in TERMS: app = app.replace(a, b)
    app = OUTLET.sub('điểm giao', app)
    return app.replace('\x00KEEP\x00', keep)

def patch(app):
    miss = []
    app = terms(app)
    for a, b in R:
        if a in app: app = app.replace(a, b)
        elif terms(a) in app: app = app.replace(terms(a), b)
        else: miss.append(a[:80])
    return terms(app), miss

if __name__ == '__main__':
    import patch_app, patch_ux
    a, _ = patch_app.patch(open('z4ref/app.js').read()); a, _ = patch_ux.patch(a)
    a, m = patch(a)
    print(len(R), 'cặp · thiếu:', len(m)); [print('  -', x) for x in m]
