@echo off
chcp 65001 >nul
title 游戏制作人模拟器 - 本地服务器

echo ============================================
echo   游戏制作人模拟器 - 启动中...
echo ============================================
echo.

set PORT=8080

:: 切换到bat文件所在目录（即游戏目录）
cd /d "%~dp0"

echo [信息] 游戏目录: %cd%
echo.

:: 尝试使用 Python 启动
where python >nul 2>&1
if %errorlevel%==0 (
    echo [信息] 检测到 Python，使用 Python HTTP 服务器...
    echo [信息] 游戏地址: http://localhost:%PORT%
    echo [信息] 关闭此窗口即可停止服务器
    echo.
    :: 先后台启动Python服务器
    start /b python -m http.server %PORT%
    :: 等待2秒让服务器就绪（ping方式比timeout更可靠）
    ping -n 3 127.0.0.1 >nul
    :: 然后打开浏览器
    start "" http://localhost:%PORT%
    echo.
    echo [信息] 服务器已启动，浏览器已打开
    echo [信息] 按任意键停止服务器...
    pause >nul
    taskkill /f /fi "WINDOWTITLE eq 游戏制作人模拟器*" /im python.exe >nul 2>&1
    goto :eof
)

:: 使用 PowerShell 启动
echo [信息] 使用 PowerShell HTTP 服务器...
echo [信息] 游戏地址: http://localhost:%PORT%
echo [信息] 关闭此窗口即可停止服务器
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT% -Root "%cd%"
