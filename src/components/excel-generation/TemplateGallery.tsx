'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Search, 
  Download, 
  Eye, 
  TrendingUp, 
  Star,
  FileSpreadsheet,
  DollarSign,
  Users,
  Package,
  Calendar,
  GraduationCap,
  User,
  Briefcase,
  BarChart3
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { TEMPLATE_CATEGORIES } from '@/Features/ExcelGeneration/Common/ExcelTemplates'

interface Template {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  popularity: number
  thumbnail?: string
}

interface TemplateCustomization {
  companyName?: string
  logoUrl?: string
  primaryColor?: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  [TEMPLATE_CATEGORIES.FINANCE]: <DollarSign className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.SALES]: <TrendingUp className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.HR]: <Users className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.PROJECT]: <Briefcase className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.INVENTORY]: <Package className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.MARKETING]: <BarChart3 className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.EDUCATION]: <GraduationCap className="w-5 h-5" />,
  [TEMPLATE_CATEGORIES.PERSONAL]: <User className="w-5 h-5" />,
}

export function TemplateGallery() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false)
  const [customization, setCustomization] = useState<TemplateCustomization>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/excel/templates')
      const data = await response.json()
      setTemplates(data.templates)
    } catch (error) {
      toast.error('템플릿을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const handleUseTemplate = async (template: Template) => {
    setSelectedTemplate(template)
    setShowCustomizeDialog(true)
  }

  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate) return

    try {
      const response = await fetch('/api/excel/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customization,
          options: {
            fillSampleData: true,
            applyFormatting: true,
            includeFormulas: true,
          },
        }),
      })

      if (!response.ok) throw new Error('생성 실패')

      const result = await response.json()
      
      toast.success('템플릿 기반 Excel 파일이 생성되었습니다!', {
        action: {
          label: '다운로드',
          onClick: () => window.open(result.downloadUrl, '_blank'),
        },
      })

      setShowCustomizeDialog(false)
      setCustomization({})
    } catch (error) {
      toast.error('Excel 생성 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="템플릿 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-10 items-center justify-start">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              전체
            </TabsTrigger>
            {Object.entries(TEMPLATE_CATEGORIES).map(([key, value]) => (
              <TabsTrigger key={key} value={value} className="flex items-center gap-2">
                {categoryIcons[value]}
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:border-primary/50 transition-colors h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {template.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {template.popularity}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Template Preview Placeholder */}
                      <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            toast.info('미리보기 기능은 준비 중입니다')
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          미리보기
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          사용하기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">검색 결과가 없습니다</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Customize Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>템플릿 커스터마이징</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} 템플릿을 사용자 정의하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">회사명 (선택사항)</Label>
              <Input
                id="companyName"
                placeholder="예: 주식회사 엑셀앱"
                value={customization.companyName || ''}
                onChange={(e) => setCustomization({ ...customization, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">주 색상 (선택사항)</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={customization.primaryColor || '#3B82F6'}
                  onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={customization.primaryColor || '#3B82F6'}
                  onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
              취소
            </Button>
            <Button onClick={handleGenerateFromTemplate}>
              Excel 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}