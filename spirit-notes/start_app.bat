@echo off
set PATH=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot\bin;%PATH%
call npx concurrently "npx firebase-tools emulators:start --project antigravity-dd7c2 --import=./emulator_data --export-on-exit=./emulator_data" "npm run dev"
