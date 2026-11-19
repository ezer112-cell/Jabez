@echo off
chcp 65001 > nul
cd /d "c:\Users\LG\Documents\home"
echo ===================================================
echo   GitHub (https://github.com/ezer112-cell/Jabez) 로
echo   코드를 업로드(Push)합니다.
echo   만약 GitHub 로그인 창이 뜨면 로그인을 진행해주세요!
echo ===================================================
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo.
echo 완료되었습니다! 이제 GitHub 페이지를 새로고침 해보세요.
pause
