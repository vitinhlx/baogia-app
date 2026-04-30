'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from "@/components/ui/input"
import { Search, ChevronDown, Check } from 'lucide-react'
import { woodMaterials, type Material } from '@/data/materials'
import { cn } from '@/lib/utils'

interface MaterialSelectorProps {
  value: string
  onSelect: (material: Material) => void
  onInputChange?: (value: string) => void
  placeholder?: string
}

export default function MaterialSelector({ value, onSelect, onInputChange, placeholder }: MaterialSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>(woodMaterials)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const results = woodMaterials.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredMaterials(results)
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="relative flex items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Input
          value={value}
          onChange={(e) => {
            const val = e.target.value
            setSearchTerm(val)
            onInputChange?.(val)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || "Chọn vật liệu..."}
          className="w-full h-12 pr-10"
        />
        <ChevronDown className={cn(
          "absolute right-3 w-4 h-4 text-slate-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-md max-h-80 overflow-auto divide-y">
          <div className="p-2 sticky top-0 bg-slate-50 border-b">
            <div className="relative flex items-center">
              <Search className="absolute left-2 w-4 h-4 text-slate-400" />
              <Input 
                autoFocus
                placeholder="Tìm kiếm..." 
                className="h-9 pl-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="py-1">
            {filteredMaterials.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                Không tìm thấy vật liệu nào.
              </div>
            ) : (
              <>
                {['An Cường', 'Ba Thanh', 'Mộc Phát', 'Generic'].map(brand => {
                  const brandMaterials = filteredMaterials.filter(m => m.brand === brand)
                  if (brandMaterials.length === 0) return null
                  
                  return (
                    <div key={brand}>
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                        {brand}
                      </div>
                      {brandMaterials.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors group",
                            value === `${m.brand} ${m.code} - ${m.name}` && "bg-blue-50/50"
                          )}
                          onClick={() => {
                            onSelect(m)
                            setIsOpen(false)
                            setSearchTerm('')
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">{m.brand} {m.code}</span>
                            <span className="text-xs text-slate-500">{m.name} ({m.type})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {m.defaultPrice && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {m.defaultPrice.toLocaleString()} đ
                              </span>
                            )}
                            {value === `${m.brand} ${m.code} - ${m.name}` && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
