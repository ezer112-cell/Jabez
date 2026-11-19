@echo off
chcp 65001 > nul
set "PATH=%PATH%;C:\Program Files\nodejs"
echo ===================================================
echo   2026년 야베스 말씀암송 홈페이지 서버를 시작합니다...
echo   브라우저에서 http://localhost:3000 으로 접속하세요.
echo ===================================================
start "" "http://localhost:3000"
call npm.cmd run dev
pause
