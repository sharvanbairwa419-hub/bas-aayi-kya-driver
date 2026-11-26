@echo off
title Push Driver App to GitHub for APK Build
echo ==============================================================
echo        PUSH DRIVER APP TO GITHUB (AUTOMATIC APK BUILD)
echo ==============================================================
echo.
echo Please create an empty repository on https://github.com/new
echo (e.g., name it 'bas-aayi-kya-driver')
echo.
set /p REPO_URL="Enter your GitHub Repository URL (https://github.com/username/repo.git): "
if "%REPO_URL%"=="" (
  echo Error: Repository URL cannot be empty!
  pause
  exit /b
)

cd /d "%~dp0"
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
echo.
echo Pushing code to GitHub...
git push -u origin main
echo.
if %errorlevel% equ 0 (
  echo ==============================================================
  echo SUCCESS! Your Driver Mobile App has been pushed to GitHub.
  echo.
  echo How to download your APK:
  echo 1. Open your repository on GitHub.
  echo 2. Click on the 'Actions' tab at the top.
  echo 3. The 'Build Driver Android APK' workflow will run automatically (approx. 2-3 mins).
  echo 4. Once finished, click on the build run to download 'BasAayiKya-Driver-APK.zip'!
  echo ==============================================================
) else (
  echo Failed to push. Please check your GitHub permissions or token and try again.
)
pause
