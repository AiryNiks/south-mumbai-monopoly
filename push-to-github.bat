@echo off
cd /d "%~dp0"
echo Working in: %CD%
echo.

echo [1/5] Checking git...
git --version
if errorlevel 1 (
  echo ERROR: Git is not installed or not in PATH.
  pause & exit /b 1
)

echo [2/5] Setting up repo...
git init
git remote remove origin 2>nul
git remote add origin https://github.com/AiryNiks/south-mumbai-monopoly.git
echo Remote set.

echo [3/5] Staging files...
git add .
git status

echo [4/5] Committing...
git commit -m "Refactor: full South Mumbai Business Game rewrite with bug fixes"
if errorlevel 1 (
  echo NOTE: Nothing new to commit, or commit failed. See above.
)

echo [5/5] Pushing to GitHub...
echo When prompted, enter your GitHub username and a Personal Access Token as the password.
echo (Get a token at: github.com/settings/tokens - check the 'repo' scope)
echo.
git branch -M main
git push -u origin main --force
if errorlevel 1 (
  echo.
  echo ERROR: Push failed. Check your username and token above.
) else (
  echo.
  echo SUCCESS! Visit: https://github.com/AiryNiks/south-mumbai-monopoly
)

echo.
pause
