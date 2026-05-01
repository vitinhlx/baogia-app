'use client'

import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import * as XLSX from 'xlsx'
// import { jsPDF } from 'jspdf'
// import autoTable from 'jspdf-autotable'
import { Pencil, Trash2, Plus, FileSpreadsheet, Printer, Save, FolderOpen, ClipboardList } from 'lucide-react'
import { auth } from '@/firebase/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
// import { collection, addDoc, getDocs, query } from 'firebase/firestore'
import FirebaseAuthButton from '@/components/quotation-form/FirebaseAuthButton'
import { toast, ToastContainer } from '@/components/quotation-form/Toast'
import MaterialSelector from '@/components/quotation-form/MaterialSelector'
import TemplatePicker from '@/components/quotation-form/TemplatePicker'
import type { Material } from '@/data/materials'
import {
  DEFAULT_FACTORY_INFO,
  DEFAULT_NOTES,
  loadUserProfile,
  saveUserProfile,
  type UserProfile,
} from '@/services/userProfileService'

// Types
type QuotationItem = {
  id: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  note: string
}

type QuotationTemplateLocal = {
  name: string
  items: QuotationItem[]
}

// Fixed suggestions and defaults
const suggestedUnits = ["Cái", "Bộ", "m2", "md", "Tấm"]

export default function QuotationForm() {
  const [items, setItems] = useState<QuotationItem[]>([])
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [note, setNote] = useState('')
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([])
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null)
  
  // Storage states
  const [templates, setTemplates] = useState<QuotationTemplateLocal[]>([])
  const [templateName, setTemplateName] = useState('')
  
  const [editableNotes, setEditableNotes] = useState<string[]>(DEFAULT_NOTES)
  
  const [pageTitle, setPageTitle] = useState(DEFAULT_FACTORY_INFO.pageTitle)
  const [factoryName, setFactoryName] = useState(DEFAULT_FACTORY_INFO.name)
  const [factoryAddress, setFactoryAddress] = useState(DEFAULT_FACTORY_INFO.address)
  const [factoryHotline, setFactoryHotline] = useState(DEFAULT_FACTORY_INFO.hotline)
  const [factoryEmail, setFactoryEmail] = useState(DEFAULT_FACTORY_INFO.email)
  const [uid, setUid] = useState<string | null>(null)

  // Debounce ref cho cloud sync
  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI States
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [tempNotes, setTempNotes] = useState<string[]>([])
  const [isEditingFactory, setIsEditingFactory] = useState(false)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Temp form states for dialogs
  const [tempPageTitle, setTempPageTitle] = useState('')
  const [tempFactoryName, setTempFactoryName] = useState('')
  const [tempFactoryAddress, setTempFactoryAddress] = useState('')
  const [tempFactoryHotline, setTempFactoryHotline] = useState('')
  const [tempFactoryEmail, setTempFactoryEmail] = useState('')

  // Load templates from LocalStorage on mount (templates vẫn local-only)
  useEffect(() => {
    const savedTemplates = localStorage.getItem('quotationTemplates')
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates))
  }, [])

  // Hàm áp dụng profile lên UI state
  const applyProfile = useCallback((profile: UserProfile) => {
    setEditableNotes(profile.defaultNotes)
    setPageTitle(profile.factoryInfo.pageTitle)
    setFactoryName(profile.factoryInfo.name)
    setFactoryAddress(profile.factoryInfo.address)
    setFactoryHotline(profile.factoryInfo.hotline)
    setFactoryEmail(profile.factoryInfo.email)
  }, [])

  // Listen for Firebase auth state changes + load profile khi login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const newUid = user?.uid ?? null
      setUid(newUid)

      if (newUid) {
        // Load profile từ Firestore (fallback sang LocalStorage cache nếu offline)
        const profile = await loadUserProfile(newUid)
        applyProfile(profile)
      } else {
        // Đăng xuất → reset về default
        applyProfile({ factoryInfo: DEFAULT_FACTORY_INFO, defaultNotes: DEFAULT_NOTES })
      }
    })
    return () => unsub()
  }, [applyProfile])

  /** Lưu profile với debounce 1.5s — gọi sau mỗi lần user save factory/notes */
  const debouncedSaveProfile = useCallback(
    (currentUid: string, profile: UserProfile) => {
      if (profileSaveTimerRef.current) clearTimeout(profileSaveTimerRef.current)
      profileSaveTimerRef.current = setTimeout(async () => {
        try {
          await saveUserProfile(currentUid, profile)
        } catch {
          // Mất mạng — LocalStorage đã được ghi rồi, bỏ qua lỗi cloud
        }
      }, 1500)
    },
    []
  )

  // Dọn timer khi component unmount — tránh memory leak
  useEffect(() => {
    return () => {
      if (profileSaveTimerRef.current) clearTimeout(profileSaveTimerRef.current)
    }
  }, [])

  // Material Selection Handler
  const handleMaterialSelect = (material: Material) => {
    const fullDescription = `${material.brand} ${material.code} - ${material.name}`
    setDescription(fullDescription)
    if (material.defaultPrice) {
      setUnitPrice(material.defaultPrice.toString())
    }
    // Auto set unit if it's a board
    if (material.category === 'full' || material.category === 'core') {
      setUnit('Tấm')
    }
  }

  // Apply built-in template
  const applyBuiltInTemplate = (templateItems: Omit<QuotationItem, 'id'>[]) => {
    setItems(prev => {
      const newItems = templateItems.map((item, index) => ({
        ...item,
        id: prev.length + index + 1
      }))
      const all = [...prev, ...newItems]
      return all.map((item, idx) => ({ ...item, id: idx + 1 }))
    })
    toast.success(`Đã thêm ${templateItems.length} hạng mục từ mẫu!`)
  }

  // Handlers
  const addItem = () => {
    if (description && quantity && unit && unitPrice) {
      const newItem: QuotationItem = {
        id: editingItem ? editingItem.id : items.length + 1,
        description,
        quantity: Number(quantity),
        unit,
        unitPrice: Number(unitPrice),
        note
      }
      
      let updatedItems: QuotationItem[];
      if (editingItem) {
        updatedItems = items.map(item => item.id === editingItem.id ? newItem : item)
      } else {
        updatedItems = [...items, newItem]
      }
      
      // Keep IDs sequential
      updatedItems = updatedItems.map((item, index) => ({
        ...item,
        id: index + 1
      }))
      
      setItems(updatedItems)
      setEditingItem(null)
      setDescription('')
      setQuantity('')
      setUnit('')
      setUnitPrice('')
      setNote('')
    }
  }


  const editItem = (item: QuotationItem) => {
    setEditingItem(item)
    setDescription(item.description)
    setQuantity(item.quantity.toString())
    setUnit(item.unit)
    setUnitPrice(item.unitPrice.toString())
    setNote(item.note)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  const deleteItem = (id: number) => {
    const updatedItems = items.filter(item => item.id !== id).map((item, index) => ({
      ...item,
      id: index + 1
    }))
    setItems(updatedItems)
  }

  // Template Handlers
  const saveTemplate = () => {
    if (templateName && items.length > 0) {
      const newTemplate: QuotationTemplateLocal = { name: templateName, items }
      const updatedTemplates = [...templates, newTemplate]
      setTemplates(updatedTemplates)
      localStorage.setItem('quotationTemplates', JSON.stringify(updatedTemplates))
      setTemplateName('')
    }
  }

  const loadTemplate = (template: QuotationTemplateLocal) => {
    const updatedItems = template.items.map((item, index) => ({
      ...item,
      id: index + 1
    }))
    setItems(updatedItems)
  }

  const deleteTemplate = (name: string) => {
    const updatedTemplates = templates.filter(t => t.name !== name)
    setTemplates(updatedTemplates)
    localStorage.setItem('quotationTemplates', JSON.stringify(updatedTemplates))
  }

  // ------------------------------------------------
  // Firestore sync functions
  /* 
  const saveQuotationToFirestore = async () => {
    if (!uid) {
      toast.error('Vui lòng đăng nhập trước khi lưu báo giá.')
      return
    }
    if (items.length === 0) {
      toast.error('Chưa có hạng mục nào để lưu.')
      return
    }
    const quotationName = templateName.trim() || 'Báo giá không tên'
    const payload = {
      name: quotationName,     // Mới: lưu theo Tên báo giá
      customer: quotationName, // Tương thích dữ liệu cũ
      total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      items,
      info: `${factoryName} - ${factoryHotline}`,
      createdAt: new Date().toISOString()
    }
    const loadingId = toast.loading('Đang lưu báo giá...')
    try {
      await addDoc(collection(db, 'users', uid, 'quotations'), payload)
      toast.dismiss(loadingId)
      toast.success(`Đã lưu "${quotationName}" vào Cloud!`)
    } catch (e) {
      console.error(e)
      toast.dismiss(loadingId)
      toast.error('Lưu báo giá thất bại. Vui lòng thử lại.')
    }
  }

  const loadQuotationsFromFirestore = async () => {
    if (!uid) {
      toast.error('Vui lòng đăng nhập để tải báo giá.')
      return
    }
    const loadingId = toast.loading('Đang tải dữ liệu từ Cloud...')
    try {
      const q = query(collection(db, 'users', uid, 'quotations'))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => doc.data())
      
      const cloudTemplates = data.map(doc => ({
        name: `[Cloud] ${doc.name || doc.customer || 'Báo giá không tên'} - ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}`,
        items: doc.items
      }))
      
      setTemplates(prev => {
        const localTemplates = prev.filter(t => !t.name.startsWith('[Cloud]'))
        return [...localTemplates, ...cloudTemplates]
      })
      
      toast.dismiss(loadingId)
      toast.success(`Đã tải ${data.length} báo giá! Mở "Tải mẫu" để xem.`)
    } catch (e) {
      console.error(e)
      toast.dismiss(loadingId)
      toast.error('Lỗi tải báo giá từ Cloud. Vui lòng thử lại.')
    }
  }
  */

  // Note Handlers
  const startEditingNotes = () => {
    setTempNotes([...editableNotes])
    setIsEditingNotes(true)
  }

  const saveNotes = () => {
    setEditableNotes(tempNotes)
    setIsEditingNotes(false)
    if (uid) {
      // Build profile hiện tại với notes mới rồi sync cloud
      const profile: UserProfile = {
        factoryInfo: { name: factoryName, address: factoryAddress, hotline: factoryHotline, email: factoryEmail, pageTitle },
        defaultNotes: tempNotes,
      }
      debouncedSaveProfile(uid, profile)
      // Toast chính xác: đã lưu local, đang sync cloud
      toast.success('Đã lưu ghi chú! Đang đồng bộ lên Cloud...')
    } else {
      toast.success('Đã lưu ghi chú (chưa đăng nhập — chỉ lưu cục bộ).')
    }
  }

  // Factory Handlers
  const startEditingFactory = () => {
    setTempPageTitle(pageTitle)
    setTempFactoryName(factoryName)
    setTempFactoryAddress(factoryAddress)
    setTempFactoryHotline(factoryHotline)
    setTempFactoryEmail(factoryEmail)
    setIsEditingFactory(true)
  }

  const saveFactory = () => {
    setPageTitle(tempPageTitle)
    setFactoryName(tempFactoryName)
    setFactoryAddress(tempFactoryAddress)
    setFactoryHotline(tempFactoryHotline)
    setFactoryEmail(tempFactoryEmail)
    setIsEditingFactory(false)
    if (uid) {
      const profile: UserProfile = {
        factoryInfo: { name: tempFactoryName, address: tempFactoryAddress, hotline: tempFactoryHotline, email: tempFactoryEmail, pageTitle: tempPageTitle },
        defaultNotes: editableNotes,
      }
      debouncedSaveProfile(uid, profile)
      // Toast chính xác: đã lưu local, đang sync cloud
      toast.success('Đã lưu! Đang đồng bộ thông tin xưởng lên Cloud...')
    } else {
      toast.success('Đã lưu thông tin xưởng (chưa đăng nhập — chỉ lưu cục bộ).')
    }
  }

  // Export Handlers
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(items.map(item => ({
      'STT': item.id,
      'Mô tả chi tiết': item.description,
      'Số Lượng': item.quantity,
      'ĐVT': item.unit,
      'Đơn giá': item.unitPrice,
      'Thành tiền': item.quantity * item.unitPrice,
      'Ghi chú': item.note
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bảng Báo Gia')
    XLSX.writeFile(workbook, 'bang_bao_gia.xlsx')
  }

  const importFromExcel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)
        
        const importedItems: QuotationItem[] = jsonData.map((row, index) => ({
          id: index + 1,
          description: row['Mô tả chi tiết'] || '',
          quantity: Number(row['Số Lượng']) || 0,
          unit: row['ĐVT'] || '',
          unitPrice: Number(row['Đơn giá']) || 0,
          note: row['Ghi chú'] || ''
        }))
        setItems(importedItems)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  // PDF Export
  /*
  const generatePDF = () => {
    if (items.length === 0) {
      toast.error('Chưa có hạng mục nào để xuất PDF.')
      return
    }
    const loadingId = toast.loading('Đang tạo file PDF...')
    try {
      const doc = new jsPDF()
      doc.text(pageTitle, 105, 20, { align: 'center' })
      autoTable(doc, {
        startY: 30,
        head: [['STT', 'Mo ta', 'SL', 'DVT', 'Don gia', 'Thanh tien']],
        body: items.map(item => [
          item.id,
          item.description,
          item.quantity,
          item.unit,
          item.unitPrice.toLocaleString('vi-VN'),
          (item.quantity * item.unitPrice).toLocaleString('vi-VN')
        ]),
        foot: [['', '', '', '', 'TONG CONG', items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toLocaleString('vi-VN')]],
      })
      doc.save('bao_gia.pdf')
      toast.dismiss(loadingId)
      toast.success('Đã xuất PDF thành công!')
    } catch (e) {
      console.error(e)
      toast.dismiss(loadingId)
      toast.error('Xuất PDF thất bại. Vui lòng thử lại.')
    }
  }
  */

  const printQuotation = () => {
    window.print()
  }

  // Utils: Number to Vietnamese words
  const numberToVietnameseWords = (number: number): string => {
    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
    const positions = ['', 'nghìn', 'triệu', 'tỷ']
    
    if (number === 0) return 'không'
    
    const groups: string[] = []
    let numStr = Math.floor(number).toString()
    
    while (numStr.length % 3 !== 0) numStr = '0' + numStr
    
    for (let i = 0; i < numStr.length; i += 3) {
      const group = numStr.substr(i, 3)
      if (group !== '000') {
        const h = parseInt(group[0]), t = parseInt(group[1]), o = parseInt(group[2])
        let gWords = ''
        if (h > 0) gWords += units[h] + ' trăm '
        if (t > 0) {
          if (t === 1) gWords += 'mười '
          else gWords += units[t] + ' mươi '
        }
        if (o > 0) {
          if (t === 0 && h !== 0) gWords += 'lẻ '
          if (o === 1 && t > 1) gWords += 'mốt '
          else if (o === 5 && t > 0) gWords += 'lăm '
          else gWords += units[o] + ' '
        }
        const pos = positions[Math.floor((numStr.length - i - 3) / 3)]
        groups.push(gWords + pos)
      }
    }
    return groups.join(' ').trim() + ' đồng'
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 bg-white shadow-lg rounded-xl min-h-screen">
      <ToastContainer />
      {/* Header section */}
      <div className="flex flex-col items-center text-center space-y-4 border-b pb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 uppercase tracking-tight">{pageTitle}</h1>
        <div className="w-full flex flex-col md:flex-row justify-between items-center md:items-start text-sm text-slate-600 gap-4">
          <div className="text-left space-y-1">
            <p className="font-bold text-slate-900">{factoryName}</p>
            <p>{factoryAddress}</p>
            <p>{factoryHotline}</p>
            <p>{factoryEmail}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <FirebaseAuthButton variant="header" />
            <Button variant="outline" size="sm" onClick={startEditingFactory}>
              Sửa thông tin xưởng
            </Button>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-lg border print:hidden">
        <div className="md:col-span-2 relative">
          <Label htmlFor="description" className="mb-2 block">Mô tả chi tiết / Vật liệu</Label>
          <MaterialSelector 
            value={description}
            onSelect={handleMaterialSelect}
            onInputChange={setDescription}
            placeholder="Nhập mô tả hoặc tìm vật liệu (An Cường, Ba Thanh...)"
          />
        </div>
        
        <div>
          <Label htmlFor="unit" className="mb-2 block">ĐVT</Label>
          <div className="relative">
            <Input
              id="unit"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value)
                setUnitSuggestions(suggestedUnits.filter(u => u.toLowerCase().includes(e.target.value.toLowerCase())))
              }}
              placeholder="Cái, Bộ, m2..."
              className="w-full h-12"
            />
            {unitSuggestions.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-slate-200 shadow-xl rounded-md mt-1 divide-y">
                {unitSuggestions.map((u, i) => (
                  <li key={i} className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                    onClick={() => { setUnit(u); setUnitSuggestions([]) }}>
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <div>
            <Label htmlFor="quantity" className="mb-2 block">Số lượng</Label>
            <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-12" />
          </div>
          <div>
            <Label htmlFor="price" className="mb-2 block">Đơn giá</Label>
            <Input id="price" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-12" />
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <Button onClick={addItem} size="lg" className="h-12 w-full font-bold">
            {editingItem ? <><Pencil className="w-4 h-4 mr-2" />Cập nhật</> : <><Plus className="w-4 h-4 mr-2" />Thêm mục</>}
          </Button>
        </div>

        <div className="md:col-span-3">
          <Label htmlFor="note" className="mb-2 block">Ghi chú riêng cho mục này</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Màu sắc, quy cách đặc biệt..." className="h-12" />
        </div>
      </div>

      {/* Table section */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="w-12 text-center font-bold">STT</TableHead>
              <TableHead className="min-w-[200px] font-bold">Mô tả chi tiết</TableHead>
              <TableHead className="text-center font-bold">SL</TableHead>
              <TableHead className="text-center font-bold">ĐVT</TableHead>
              <TableHead className="text-right font-bold">Đơn giá</TableHead>
              <TableHead className="text-right font-bold">Thành tiền</TableHead>
              <TableHead className="hidden md:table-cell font-bold">Ghi chú</TableHead>
              <TableHead className="text-center print:hidden font-bold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-44 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <ClipboardList className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-base font-medium text-slate-400">Chưa có hạng mục nào</p>
                    <p className="text-sm text-slate-300">Điền thông tin ở trên và nhấn <span className="font-semibold">+ Thêm mục</span> để bắt đầu</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="text-center">{item.id}</TableCell>
                  <TableCell className="font-medium text-slate-900">{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-center">{item.unit}</TableCell>
                  <TableCell className="text-right">{item.unitPrice.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-slate-500">{item.note}</TableCell>
                  <TableCell className="text-center print:hidden">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => editItem(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 py-6 border-t font-semibold">
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Ghi chú & Chính sách:</h2>
            <Button variant="link" size="sm" onClick={startEditingNotes} className="print:hidden">Chỉnh sửa</Button>
          </div>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 leading-relaxed pl-4">
            {editableNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="w-full md:w-96 p-6 bg-slate-900 text-white rounded-xl shadow-inner space-y-4">
          <div className="flex justify-between items-baseline border-b border-slate-700 pb-4">
            <span className="text-slate-400 uppercase text-xs tracking-wider">Tổng cộng</span>
            <span className="text-3xl font-black text-amber-400">{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          <p className="text-xs italic text-slate-400 leading-normal">Bằng chữ: <span className="text-slate-200 capitalize">{numberToVietnameseWords(totalAmount)}</span></p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-3 pt-6 border-t print:hidden">
        {/* Row 1: Template management */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-slate-50 p-1 pl-3 rounded-md border">
            <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Tên mẫu báo giá..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="border-none bg-transparent focus-visible:ring-0 min-w-0 w-full"
            />
          </div>
          <Button size="sm" onClick={saveTemplate} variant="ghost" className="hover:bg-white shadow-sm border shrink-0"><Save className="w-4 h-4 mr-2" />Lưu mẫu</Button>
          <Dialog>
            <DialogTrigger>
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-9 px-3 rounded-md border shadow-sm hover:bg-white cursor-pointer shrink-0"><FolderOpen className="w-4 h-4" />Tải mẫu</span>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Danh sách mẫu đã lưu</DialogTitle></DialogHeader>
              {templates.length === 0 ? <p className="text-center py-8 text-slate-400">Bạn chưa có mẫu nào.</p> : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {templates.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 group">
                      <Button variant="ghost" className="flex-1 justify-start font-medium" onClick={() => loadTemplate(t)}>{t.name}</Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.name)} className="text-slate-300 group-hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Row 2: Action buttons — wrap gracefully on mobile */}
        <div className="flex flex-wrap gap-2 justify-end">
          <TemplatePicker onApply={applyBuiltInTemplate} />
          <Input type="file" ref={fileInputRef} onChange={importFromExcel} accept=".xlsx, .xls" className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Nhập</span> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="shrink-0">
            <FileSpreadsheet className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Xuất</span> Excel
          </Button>
          {/* <Button variant="outline" size="sm" onClick={saveQuotationToFirestore} className="border-blue-500 text-blue-700 hover:bg-blue-50 shrink-0">
            <Save className="w-4 h-4 mr-1" />Lưu Cloud
          </Button>
          <Button variant="outline" size="sm" onClick={loadQuotationsFromFirestore} className="border-purple-500 text-purple-700 hover:bg-purple-50 shrink-0">
            <FolderOpen className="w-4 h-4 mr-1" />Tải Cloud
          </Button>
          <Button variant="outline" size="sm" onClick={generatePDF} className="shrink-0">
            <FileText className="w-4 h-4 mr-1" />Xuất PDF
          </Button> */}
          <Button size="sm" onClick={printQuotation} className="bg-slate-800 hover:bg-slate-900 text-white shrink-0">
            <Printer className="w-4 h-4 mr-1" />In trực tiếp
          </Button>
        </div>
      </div>

      {/* Editor Dialogs */}
      <Dialog open={isEditingNotes} onOpenChange={setIsEditingNotes}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Chỉnh sửa ghi chú mặc định</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
            {tempNotes.map((note, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={note} onChange={(e) => {
                  const n = [...tempNotes]; n[idx] = e.target.value; setTempNotes(n);
                }} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => setTempNotes(tempNotes.filter((_, i) => i !== idx))} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" className="w-full dashed border-slate-300" onClick={() => setTempNotes([...tempNotes, ''])}>Thêm dòng ghi chú</Button>
          </div>
          <DialogFooter><Button onClick={saveNotes}>Lưu thay đổi</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingFactory} onOpenChange={setIsEditingFactory}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cấu hình thông tin xưởng</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tiêu đề báo giá</Label><Input value={tempPageTitle} onChange={e => setTempPageTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tên xưởng</Label><Input value={tempFactoryName} onChange={e => setTempFactoryName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Địa chỉ</Label><Input value={tempFactoryAddress} onChange={e => setTempFactoryAddress(e.target.value)} /></div>
            <div className="space-y-2"><Label>Hotline</Label><Input value={tempFactoryHotline} onChange={e => setTempFactoryHotline(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={tempFactoryEmail} onChange={e => setTempFactoryEmail(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={saveFactory}>Lưu thông tin</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
