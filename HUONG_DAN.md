# Tự cập nhật dashboard TMS Data Accuracy (HCM Zone 1 & 3) bằng GitHub

## Cách hoạt động
Repo RIÊNG TƯ (chứa file Excel + script)  --tự build-->  repo PUBLIC (chỉ có index.html đã mã hoá)  -->  GitHub Pages
Mỗi lần bạn upload file Excel mới vào thư mục data/, GitHub Actions tự chạy (~1-2 phút) và trang web tự cập nhật.
File Excel gốc KHÔNG BAO GIỜ nằm trong repo public.

## Cài đặt một lần
1. Tạo repo PUBLIC, ví dụ `tms-data-accuracy` (để trống).
2. Tạo repo PRIVATE, ví dụ `tms-da-data`. Upload toàn bộ nội dung file zip này vào (giữ nguyên thư mục `.github/workflows`).
3. Tạo khoá deploy (máy có Git):  ssh-keygen -t ed25519 -N "" -f deploy_key
   - Repo PUBLIC > Settings > Deploy keys > Add: dán nội dung deploy_key.pub, TICK "Allow write access".
   - Repo PRIVATE > Settings > Secrets and variables > Actions > New secret:
       SITE_DEPLOY_KEY = nội dung file deploy_key (khoá riêng)
       PASSWORDS_JSON  = toàn bộ nội dung file passwords.json
   - Cùng trang đó, tab Variables > New variable:
       SITE_REPO = <tên-tài-khoản>/tms-data-accuracy
4. Repo PRIVATE > Actions > "Cập nhật dashboard" > Run workflow (chạy lần đầu).
5. Repo PUBLIC > Settings > Pages > Source: Deploy from a branch > gh-pages / (root) > Save.
   Link: https://<tên-tài-khoản>.github.io/tms-data-accuracy/

## Đồng bộ từ thư mục trên máy tính (Windows)
Sau khi cài đặt xong phần GitHub ở trên:
1. Cài Git for Windows: https://git-scm.com/download/win (chọn "Only for me" nếu máy công ty không có quyền admin).
2. Bấm đúp file may_tinh\cai_dat.bat (tải riêng hoặc lấy trong zip), dán link repo riêng tư khi được hỏi.
   Lần đầu sẽ hiện cửa sổ đăng nhập GitHub: đăng nhập một lần, máy sẽ nhớ.
3. Xong. Thư mục làm việc: Documents\TMS_DA\data

## Việc hằng ngày
Xuất 2 file TMS Order Detail và Fill Rate, lưu thẳng vào Documents\TMS_DA\data. Hết.
- Cứ 15 phút máy tự đẩy file mới lên GitHub (chạy ngầm, cần mở máy và có mạng). GitHub build xong sau 1-2 phút.
- Cần ngay: bấm may_tinh\dong_bo_ngay.bat.
- Tên file không quan trọng, không cần chia thư mục theo tháng: script tự nhận loại file và tự chia tháng theo ngày trong dữ liệu.
- Có thể để lại file cũ: đơn trùng lấy bản ở file mới hơn. Xoá file trong thư mục thì trên GitHub cũng xoá theo.
- Nhật ký: may_tinh\dong_bo.log. Tắt tự động: may_tinh\tat_tu_dong.bat.
- Không đặt thư mục TMS_DA trong OneDrive (OneDrive và Git dễ xung đột).

## Ghi chú
- Xem lỗi build: repo PRIVATE > Actions > lần chạy có dấu đỏ.
- NPP mới chưa có mật khẩu: Actions báo cảnh báo, tạm thời chỉ Admin xem được. Thêm NPP đó vào secret PASSWORDS_JSON:
  "<mã 8 số>": {"npp": "<mã ngắn>", "name": "<tên>", "pw": "<mật khẩu>"}
- Đổi mật khẩu: sửa secret PASSWORDS_JSON rồi Run workflow.
- KHÔNG đặt passwords.json vào thư mục/repo.
- Ngưỡng chấm: biến TH đầu file build.py.
