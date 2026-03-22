# PowerShell script to force push local code to Kinmann/vibeCoding
Write-Host "========================================="
Write-Host "  vibeCoding GitHub Update Script"
Write-Host "========================================="

# 1. 깃(Git) 설치 여부 확인 및 설치
if (!(Get-Command git -ErrorVariable silent -ErrorAction SilentlyContinue)) {
    Write-Host "1. Git이 설치되어 있지 않습니다. winget을 통해 자동 설치를 시작합니다..." -ForegroundColor Cyan
    winget install --id Git.Git -e --source winget
    Write-Host "Git 설치가 완료되었습니다." -ForegroundColor Green
    
    # 임시 환경변수 추가 (스크립트 실행 중 바로 인식될 수 있도록)
    $env:Path += ";C:\Program Files\Git\cmd"
}
else {
    Write-Host "1. Git이 시스템에 이미 설치되어 있습니다." -ForegroundColor Green
}

# 2. Git 설정 및 초기화
Write-Host "2. 로컬 Git 저장소를 초기화/재설정합니다..." -ForegroundColor Cyan
Set-Location -Path "d:\Experiments\vibeCoding"

# 폴더 소유권 불일치 버그(dubious ownership) 우회
git config --global --add safe.directory D:/Experiments/vibeCoding
git config --global --add safe.directory D:/Experiments/vibeCoding/spirit-notes

# 혹시 .git 폴더가 이상하게 꼬여있을 수 있어, 새로 시작하기 위해 기존 .git 삭제 (옵션)
# 하지만 기존 커밋 히스토리를 유지하고 싶을 수 있으니 단순 init만 수행.
git init

# 3. 원격 리포지토리(Remote Repository) 설정 (기존 origin이 있다면 교체)
git remote remove origin 2>$null
git remote add origin https://github.com/Kinmann/vibeCoding.git

# 현재 브랜치를 update-vibecoding으로 강제 설정
git branch -M update-vibecoding

# 4. 파일 추가 및 커밋
Write-Host "3. 로컬의 모든 파일을 추가하고 커밋합니다..." -ForegroundColor Cyan

# 첫 설치 시 이메일과 이름이 설정되어 있지 않은 에러 방지용 기본 설정
git config user.email "a71090236@gmail.com"
git config user.name "Kinmann"

git add .
git commit -m "Update via VibeCoding: Replace all code"

# 5. 기존 원격 저장소 내용을 덮어쓰기(Force Push)
Write-Host "4. update-vibecoding 브랜치에 코드를 푸시합니다(Force Push)..." -ForegroundColor Cyan
Write-Host "이 작업은 기존 GitHub 레포지토리의 내용을 현재 로컬 코드로 완전히 대체(비우고 채우기)합니다." -ForegroundColor Yellow

git push -u origin update-vibecoding --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host " GitHub 푸시가 완벽히 성공했습니다!" -ForegroundColor Green
    Write-Host " https://github.com/Kinmann/vibeCoding 에서 확인하세요." -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
}
else {
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host " GitHub 인증(로그인)이나 푸시 중 오류가 발생했습니다." -ForegroundColor Red
    Write-Host " 브라우저 창이 열리면 GitHub 로그인을 진행해주세요." -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
}

Read-Host -Prompt "스크립트가 종료되었습니다. 엔터 키를 눌러 창을 닫으세요."
