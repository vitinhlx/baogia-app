'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, LayoutTemplate, ChevronRight } from 'lucide-react'
import { builtInTemplates, type QuotationTemplate } from '@/data/quotation-templates'

interface TemplatePickerProps {
  onApply: (items: QuotationTemplate['items']) => void
}

const categoryLabels: Record<string, string> = {
  kitchen: '🍳 Bếp',
  bedroom: '🛏️ Phòng Ngủ',
  living: '📺 Phòng Khách',
  storage: '🪜 Lưu trữ',
  other: '📦 Khác',
}

export default function TemplatePicker({ onApply }: TemplatePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null)

  const filtered = builtInTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = Object.entries(categoryLabels).map(([key, label]) => ({
    key,
    label,
    templates: filtered.filter(t => t.category === key)
  })).filter(g => g.templates.length > 0)

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate.items)
      setOpen(false)
      setSelectedTemplate(null)
      setSearch('')
    }
  }

  const totalAmount = selectedTemplate
    ? selectedTemplate.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : 0

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedTemplate(null); setSearch('') } }}>
      <DialogTrigger>
        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-sm font-medium h-9 px-3 rounded-md border border-emerald-500 text-emerald-700 hover:bg-emerald-50 cursor-pointer shrink-0">
          <LayoutTemplate className="w-4 h-4" />Mẫu BG
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {selectedTemplate ? (
              <button onClick={() => setSelectedTemplate(null)} className="flex items-center gap-2 hover:text-emerald-700 transition-colors">
                <span className="text-sm">←</span> {selectedTemplate.icon} {selectedTemplate.name}
              </button>
            ) : (
              '📋 Chọn mẫu báo giá'
            )}
          </DialogTitle>
          {!selectedTemplate && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm mẫu (tủ bếp, phòng ngủ...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-white"
              />
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!selectedTemplate ? (
            /* ─── LIST VIEW ─── */
            <div className="py-2">
              {grouped.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">Không tìm thấy mẫu nào.</p>
                </div>
              ) : (
                grouped.map(group => (
                  <div key={group.key}>
                    <div className="px-6 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80 sticky top-0 z-10">
                      {group.label}
                    </div>
                    {group.templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-emerald-50/50 transition-colors text-left group border-b border-slate-100 last:border-0"
                      >
                        <span className="text-2xl shrink-0">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">{template.name}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{template.items.length} mục</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ─── DETAIL VIEW ─── */
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">{selectedTemplate.description}</p>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 w-6">#</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Hạng mục</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">SL</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600">ĐVT</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Đơn giá</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTemplate.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800 text-xs leading-snug">{item.description}</p>
                          {item.note && <p className="text-[10px] text-slate-400 mt-0.5">{item.note}</p>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                        <td className="px-3 py-2 text-right text-slate-600 font-mono text-xs">{item.unitPrice.toLocaleString('vi-VN')}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800 font-mono text-xs">{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-900 text-white rounded-lg px-4 py-3">
                <span className="text-slate-400 text-xs uppercase tracking-wider">Tổng tham khảo</span>
                <span className="text-xl font-black text-amber-400">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>

              <p className="text-[10px] text-slate-400 italic text-center">
                * Đơn giá tham khảo thị trường 2025-2026 (MDF chống ẩm Melamine). Bạn có thể sửa sau khi áp dụng.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>Quay lại</Button>
            <Button size="sm" onClick={handleApply} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Áp dụng mẫu này
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
