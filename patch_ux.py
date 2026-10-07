"""Vá câu chữ cho ngắn gọn, dễ hiểu + CSS dễ đọc. Chạy SAU patch_app."""

P = [
 # thanh tab
 ("['kpi','Chi tiết KPI',pKpi]", "['kpi','Chi tiết tiêu chí',pKpi]"),
 ("['trend','Xu hướng theo ngày',pTrend],['errors','Đơn hàng có lỗi',pErrors]", "['trend','Theo ngày',pTrend],['errors','Đơn lỗi',pErrors]"),
 ("['logic','Cách chấm điểm',pLogic],['dq','Chất lượng dữ liệu',pDq]", "['logic','Cách chấm',pLogic],['dq','Kiểm tra dữ liệu',pDq]"),
 # banner
 ("Phải đạt <b>cả 7 tiêu chí</b>. Hỏng 1 tiêu chí là trượt toàn bộ Data Accuracy và mất trọn <b>15% DIP</b> (10% Data Accuracy + 5% TMS).",
  "Phải đạt <b>cả 7 tiêu chí</b>. Trượt 1 tiêu chí là không đạt tháng, mất <b>15% DIP</b>."),
 ("Trang này gồm <b>4 tiêu chí</b> chưa có tab riêng: User name · Distance &amp; Time · Payload · Created Date. Ngưỡng <b>100%</b> cho User name / Created Date / Payload; Distance &amp; Time dùng ngưỡng chuyến và ngưỡng tháng riêng.",
  "Trang gồm 4 tiêu chí: <b>User name · Distance &amp; Time · Payload · Created Date</b>. User name, Payload, Created Date <b>không cho phép lỗi nào</b>; Distance &amp; Time cho phép dưới 5% số chuyến."),
 ("Diễn biến 3 tiêu chí theo ngày giao — dùng để phát hiện <b>ngày bất thường</b> (sự cố GPS, lỗi gửi dữ liệu theo lô) thay vì chỉ nhìn số trung bình tháng.",
  "Kết quả từng ngày — để thấy <b>ngày nào bất thường</b>."),
 ("Theo nguyên tắc dự án: <b>thách thức chất lượng dữ liệu trước khi tính toán</b>. Đây là các phát hiện cần xử lý ở tầng ETL trước khi kết quả được dùng cho chi trả DIP.",
  "Những điểm bất thường trong dữ liệu, cần kiểm tra trước khi chốt kết quả."),
 ("Trang này dành cho <b>người mới đọc báo cáo</b>: chấm những gì, ngưỡng bao nhiêu, lỗi nghĩa là gì, và làm gì nếu thấy số liệu chưa đúng.",
  "Chấm những gì, ngưỡng bao nhiêu, và làm gì khi thấy số liệu chưa đúng."),
 # tổng quan
 ("  h+=`<h2 class=\"sect\">Phân tích chi tiết</h2>\n   <p class=\"sect-cap\">Bấm để mở nhóm cần xem.</p>`;",
  "  h+=`<h2 class=\"sect\">Xem thêm</h2>\n   <p class=\"sect-cap\">Phân tích sâu cho quản lý vùng — bấm để mở.</p>`;"),
 ("<h2 class=\"sect nsect\">Bốn tiêu chí vận hành", "<h2 class=\"sect nsect\">Chỉ số chính"),
 ("<span class=\"ovs-t\">Bốn tiêu chí vận hành</span>", "<span class=\"ovs-t\">Chỉ số chính</span>"),
 # việc cần làm của NPP
 ("  const TYPE={geo:'Geo', ot:'On-time', dt:'Distance&Time', pl:'Payload'};\n  const NAME={geo:'Giao đúng chỗ', ot:'Giao đúng hạn', dt:'Khoảng cách 2 điểm giao', pl:'Không chở quá tải'};\n  const UNIT={geo:'đơn cần sửa', ot:'đơn cần sửa', dt:'chuyến cần sửa', pl:'chuyến cần sửa'};",
  "  const TYPE={geo:'Geo', ot:'On-time', dt:'Distance&Time', pl:'Payload', cd:'Created Date'};\n  const NAME={geo:'Giao đúng chỗ', ot:'Giao đúng hạn', dt:'Khoảng cách 2 điểm giao', pl:'Không chở quá tải', cd:'Tạo đơn trước khi giao', un:'Tài khoản đúng định dạng'};\n  const UNIT={geo:'đơn cần sửa', ot:'đơn cần sửa', dt:'chuyến cần sửa', pl:'chuyến cần sửa', cd:'chuyến cần sửa', un:'tài khoản cần sửa'};"),
 ("  pl:'Điều phối &amp; kho xếp lại hàng — không phải lỗi tài xế'};",
  "  pl:'Điều phối &amp; kho xếp lại hàng — không phải lỗi tài xế',\n  cd:'Quản lý NPP kiểm tra giờ điện thoại tài xế',\n  un:'Quản lý NPP đổi sang SĐT hoặc biển số xe'};"),
 ("<p class=\"nj-h\">Đang đạt cả 7 mục — giữ nguyên cách làm hiện tại.</p>", "<p class=\"nj-h\">Đang đạt cả 7 tiêu chí — giữ nguyên cách làm.</p>"),
 ("const line = ok ? 'Đang đạt cả 7 mục — đủ điều kiện nhận 15% thưởng.'", "const line = ok ? 'Đạt cả 7 tiêu chí — đủ điều kiện nhận 15% DIP.'"),
 ("    : `Còn <b>${fmt(r.n_fail||0)} việc</b> phải sửa thì mới nhận được <b>15% thưởng</b>.`;",
  "    : `Trượt <b>${(failKeys(r).map(k=>KPI_LABEL[k]).join(', '))||fmt(r.n_fail||0)+' tiêu chí'}</b>. Sửa hết mới nhận được <b>15% DIP</b>.`;"),
 # trạng thái tiêu chí
 ("['Distance&Time','Distance & Time','var(--s3)'],['Payload','Payload','var(--s4)']];",
  "['Distance&Time','Distance & Time','var(--s3)'],['Payload','Payload','var(--s4)'],['Created Date','Created Date','var(--crit)']];"),
 ("const RANK_KPI=[['v_geo','Geo Compliance'],['v_ontime','On time'],['v_dt','Distance & Time'],['v_payload','Payload'],['v_username','User name']];",
  "const RANK_KPI=[['v_geo','Geo Compliance'],['v_ontime','On time'],['v_dt','Distance & Time'],['v_payload','Payload'],['v_username','User name'],['v_created','Created Date']];"),
 ("k:`KPI 0 chuyến`", "k:`ngưỡng 0 chuyến`"),
 ("note:'chưa tách khỏi On time'}", "note:'dùng chung kết quả On time'}"),
 ("k:`KPI &lt;${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng`}", "k:`Ngưỡng &lt;${fmt(T_DTR_MONTH_PCT)}% số chuyến`}"),
]
GLOBAL = [
 ("/ KPI ≥", "/ ngưỡng ≥"), ("/ KPI &gt;", "/ ngưỡng &gt;"), ("/ KPI ", "/ ngưỡng "),
 ("Outlet→outlet", "Hai điểm giao"), ("outlet tới outlet", "hai điểm giao liên tiếp"),
 ("Outlet tới outlet quá gần", "Hai điểm giao quá sát giờ"),
]

CSS = """
/* ===== Dễ đọc hơn ===== */
body{font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
main{max-width:1240px;margin-inline:auto}
.card{padding:20px 22px}
.cap,.sect-cap{max-width:78ch;line-height:1.55}
.banner{font-size:14.5px;line-height:1.55;padding:12px 16px}
h2.sect{margin-top:30px}
.rt th,.rt td{padding-block:9px}
.ovmx .ovmx-s{font-size:12.5px;line-height:1.45;max-width:34ch}
#nav button{font-size:14.5px}
@media (max-width:640px){body{font-size:14.5px}.card{padding:16px}}
"""

def patch(app):
    miss = []
    for a, b in P:
        if a in app: app = app.replace(a, b)
        else: miss.append(a[:70])
    for a, b in GLOBAL: app = app.replace(a, b)
    return app, miss

if __name__ == '__main__':
    import patch_app
    a, m = patch_app.patch(open('z4ref/app.js').read())
    a, m2 = patch(a)
    print('missing:', m, m2)
