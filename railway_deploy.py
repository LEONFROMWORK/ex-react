#!/usr/bin/env python3
import subprocess
import os
import pty
import sys
import select
import time

def run_with_pty(command):
    """PTY를 사용하여 명령 실행"""
    master, slave = pty.openpty()
    
    process = subprocess.Popen(
        command,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        shell=True
    )
    
    os.close(slave)
    
    output = []
    while True:
        try:
            r, w, e = select.select([master], [], [], 0.1)
            if r:
                data = os.read(master, 1024)
                if data:
                    output.append(data.decode('utf-8', errors='ignore'))
                    print(data.decode('utf-8', errors='ignore'), end='')
            elif process.poll() is not None:
                break
        except OSError:
            break
    
    os.close(master)
    return ''.join(output), process.returncode

print("Railway 자동 배포 스크립트")
print("=" * 50)

# 서비스 연결
print("\n1. 서비스 연결 중...")
output, _ = run_with_pty("echo '1' | railway service")
time.sleep(2)

# 환경 변수 설정
print("\n2. 환경 변수 설정 중...")
env_vars = {
    "NIXPACKS_NODE_VERSION": "18",
    "NIXPACKS_PYTHON_VERSION": "3.10",
    "NODE_ENV": "production",
    "ENABLE_PAYMENT_FEATURES": "false",
    "SKIP_EMAIL_VERIFICATION": "true",
    "NEXT_PUBLIC_DEMO_MODE": "true"
}

for key, value in env_vars.items():
    print(f"   설정: {key}={value}")
    run_with_pty(f"railway variables set {key}={value}")
    time.sleep(1)

print("\n3. 배포 시작...")
print("   railway up 명령 실행 중...")
output, _ = run_with_pty("railway up --detach")

print("\n배포가 시작되었습니다!")
print("Railway 대시보드에서 진행 상황을 확인하세요.")
print("https://railway.app/project/a35b2fd3-c70b-487d-b8e2-fe38a966f0d1")