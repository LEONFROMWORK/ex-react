#!/usr/bin/env python3

import subprocess
import time
import requests
import os
import sys

def check_server():
    """Check if server is running"""
    try:
        response = requests.get('http://localhost:3000/api/health', timeout=2)
        return response.status_code == 200
    except:
        return False

def start_server():
    """Start the Next.js server"""
    if check_server():
        print("✅ Server is already running on port 3000")
        return None
    
    print("🚀 Starting Next.js server...")
    os.chdir('/Users/kevin/excelapp')
    
    # Start server in background
    process = subprocess.Popen(
        ['npm', 'run', 'dev'], 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        universal_newlines=True
    )
    
    # Wait for server to start
    attempts = 0
    while attempts < 30:
        time.sleep(2)
        if check_server():
            print("✅ Server started successfully!")
            return process
        attempts += 1
        print(f"  Waiting for server... ({attempts}/30)")
    
    print("❌ Server failed to start")
    return None

def run_tests():
    """Run API tests"""
    print("\n📋 Running tests...\n")
    
    tests = [
        ('Health Check', 'http://localhost:3000/api/health'),
        ('Home Page', 'http://localhost:3000'),
        ('Test Page', 'http://localhost:3000/test'),
        ('AI Generate', 'http://localhost:3000/api/excel/generate'),
        ('Cache Stats', 'http://localhost:3000/api/cache/stats')
    ]
    
    for name, url in tests:
        print(f"Testing: {name}")
        try:
            response = requests.get(url, timeout=5)
            status = f"{response.status_code} {'✅' if response.status_code in [200, 401, 405] else '❌'}"
            print(f"  Status: {status}")
            
            if url.endswith('/health') and response.status_code == 200:
                data = response.json()
                print(f"  Database: {data['services']['database']}")
                print(f"  Redis: {data['services']['redis']}")
                print(f"  Cache: {data['services']['cache']}")
        except Exception as e:
            print(f"  Error: {str(e)} ❌")
    
    print("\n✨ Test complete!")
    print("\nOpen http://localhost:3000/test in your browser to see the interactive test page.")

def main():
    print("🎯 Excel App Test Runner\n")
    
    # Start server
    process = start_server()
    
    # Run tests
    run_tests()
    
    # Keep running if we started the server
    if process:
        print("\nPress Ctrl+C to stop the server.")
        try:
            process.wait()
        except KeyboardInterrupt:
            print("\n\n🛑 Stopping server...")
            process.terminate()
            process.wait()

if __name__ == "__main__":
    main()