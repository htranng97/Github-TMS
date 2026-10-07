@echo off
chcp 65001 >nul
setlocal
echo === CAI DAT DONG BO TMS DATA ACCURACY ===
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Chua co Git. Cai "Git for Windows" tai https://git-scm.com/download/win
  echo - chon "Only for me" neu may cong ty khong co quyen admin - roi chay lai file nay.
  pause & exit /b 1
)
set "DIR=%USERPROFILE%\Documents\TMS_DA"
if exist "%DIR%\.git" goto have
set /p URL=Dan link repo rieng tu, vd https://github.com/ten/tms-da-data.git : 
git clone "%URL%" "%DIR%"
if errorlevel 1 ( echo Clone loi. Kiem tra link va dang nhap GitHub trong cua so trinh duyet. & pause & exit /b 1 )
:have
cd /d "%DIR%"
git config user.name "TMS DA sync"
git config user.email "tms-da-sync@users.noreply.github.com"
schtasks /Create /F /SC MINUTE /MO 15 /TN "TMS_DA_dong_bo" /TR "wscript.exe \"%DIR%\may_tinh\chay_an.vbs\"" >nul
if errorlevel 1 ( echo Khong tao duoc lich tu dong. Van co the bam may_tinh\dong_bo_ngay.bat moi khi can. ) else ( echo Da tao lich tu dong: 15 phut / lan. )
echo.
echo Thu dong bo lan dau (co the hien cua so dang nhap GitHub)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%DIR%\may_tinh\dong_bo.ps1"
echo.
echo XONG. Tu nay chi can tha file Excel vao: %DIR%\data
explorer "%DIR%\data"
pause
