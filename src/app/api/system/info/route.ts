import { NextRequest, NextResponse } from 'next/server'
import os from 'os'

export async function GET(request: NextRequest) {
  try {
    const memoryUsage = process.memoryUsage()
    
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      cpus: os.cpus().length,
      uptime: Math.round(process.uptime()),
      env: process.env.NODE_ENV || 'development'
    }
    
    return NextResponse.json({
      success: true,
      data: systemInfo
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '시스템 정보를 가져올 수 없습니다'
    }, { status: 500 })
  }
}