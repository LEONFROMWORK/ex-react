import { render, screen, waitFor } from '@testing-library/react'
import { AdminDashboard } from '@/app/admin/page'
import { prisma } from '@/lib/prisma'

// Mock fetch API
global.fetch = jest.fn()

describe('Admin Dashboard Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  describe('Dashboard Statistics', () => {
    it('should display key metrics', async () => {
      const mockStats = {
        totalUsers: 150,
        activeUsers: 45,
        totalRevenue: 1500000,
        monthlyRevenue: 300000,
        totalFiles: 500,
        processedToday: 25,
        averageProcessingTime: 3.5,
        aiUsage: {
          tier1Percentage: 70,
          tier2Percentage: 30,
          totalTokensUsed: 50000,
          estimatedCost: 100,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText('45')).toBeInTheDocument()
        expect(screen.getByText('₩1,500,000')).toBeInTheDocument()
        expect(screen.getByText('500')).toBeInTheDocument()
      })
    })

    it('should show recent activities', async () => {
      const mockActivities = [
        {
          id: 'log_1',
          action: 'USER_CREATED',
          targetType: 'user',
          metadata: { email: 'test@example.com' },
          createdAt: new Date(),
        },
        {
          id: 'log_2',
          action: 'PAYMENT_COMPLETED',
          targetType: 'payment',
          metadata: { amount: 9900 },
          createdAt: new Date(),
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockActivities })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/USER_CREATED/)).toBeInTheDocument()
        expect(screen.getByText(/PAYMENT_COMPLETED/)).toBeInTheDocument()
      })
    })

    it('should display system health status', async () => {
      const mockHealth = {
        database: 'healthy',
        redis: 'healthy',
        storage: 'healthy',
        ai: 'degraded',
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => mockHealth })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/시스템 상태/)).toBeInTheDocument()
        expect(screen.getByText(/healthy/)).toBeInTheDocument()
        expect(screen.getByText(/degraded/)).toBeInTheDocument()
      })
    })
  })

  describe('Admin Actions', () => {
    it('should allow viewing user details', async () => {
      const mockUsers = [
        {
          id: 'user_1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'USER',
          subscription: { plan: 'BASIC' },
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUsers,
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument()
        expect(screen.getByText('BASIC')).toBeInTheDocument()
      })
    })

    it('should show role-based access control', async () => {
      // Test SUPER_ADMIN features
      const mockSession = {
        user: { role: 'SUPER_ADMIN' },
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSession,
      })

      render(<AdminDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/관리자 관리/)).toBeInTheDocument()
        expect(screen.getByText(/시스템 설정/)).toBeInTheDocument()
      })
    })
  })
})