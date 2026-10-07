# Đồng bộ thư mục data/ lên GitHub. Chạy ngầm mỗi 15 phút (Task Scheduler) hoặc bấm dong_bo_ngay.bat.
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repo
$log = Join-Path $repo 'may_tinh\dong_bo.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Add-Content -Encoding UTF8 $log; Write-Host $m }

# File vừa lưu chưa tới 1 phút (có thể đang xuất dở) -> đợi lần sau
$fresh = Get-ChildItem -Path (Join-Path $repo 'data') -Recurse -File -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -notlike '~$*' -and $_.LastWriteTime -gt (Get-Date).AddMinutes(-1) }
if ($fresh) { Log "Có file vừa lưu, đợi lần sau: $($fresh.Name -join ', ')"; exit 0 }

git pull --rebase --autostash -q 2>&1 | ForEach-Object { Log "pull: $_" }
git add -A data
$changed = git status --porcelain -- data
if (-not $changed) { Write-Host 'Không có file mới.'; exit 0 }

git commit -q -m ("Cap nhat du lieu " + (Get-Date -Format 'dd/MM/yyyy HH:mm')) | Out-Null
git push -q 2>&1 | ForEach-Object { Log "push: $_" }
if ($LASTEXITCODE -eq 0) {
  Log "Đã đẩy lên GitHub: $(($changed | ForEach-Object { $_.Substring(3) }) -join ' | ')"
  Log 'Dashboard sẽ cập nhật sau khoảng 1-2 phút.'
} else {
  Log 'LỖI: chưa đẩy được lên GitHub (kiểm tra mạng / đăng nhập). Sẽ thử lại lần sau.'
}
# giữ log gọn
$lines = Get-Content $log -Encoding UTF8; if ($lines.Count -gt 500) { $lines[-300..-1] | Set-Content $log -Encoding UTF8 }
