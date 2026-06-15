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
import { Pencil, Trash2, Plus, FileSpreadsheet, Printer, Save, FolderOpen, ClipboardList, Camera, Loader2 } from 'lucide-react'
import { auth } from '@/firebase/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
// import { collection, addDoc, getDocs, query } from 'firebase/firestore'
import FirebaseAuthButton from '@/components/quotation-form/FirebaseAuthButton'
import { toast, ToastContainer } from '@/components/quotation-form/Toast'
import TemplatePicker from '@/components/quotation-form/TemplatePicker'
import {
  DEFAULT_FACTORY_INFO,
  DEFAULT_NOTES,
  loadUserProfile,
  saveProfileToCloud,
  writeProfileCache,
  readProfileCache,
  APPS_SCRIPT_URL,
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

type QuotationTemplateCloud = {
  name: string
  items: QuotationItem[]
  createdAt: string
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
  const [templates, setTemplates] = useState<QuotationTemplateCloud[]>([])
  const [templateName, setTemplateName] = useState('')
  
  const [editableNotes, setEditableNotes] = useState<string[]>(DEFAULT_NOTES)
  
  const [pageTitle, setPageTitle] = useState(DEFAULT_FACTORY_INFO.pageTitle)
  const [factoryName, setFactoryName] = useState(DEFAULT_FACTORY_INFO.name)
  const [factoryAddress, setFactoryAddress] = useState(DEFAULT_FACTORY_INFO.address)
  const [factoryHotline, setFactoryHotline] = useState(DEFAULT_FACTORY_INFO.hotline)
  const [factoryEmail, setFactoryEmail] = useState(DEFAULT_FACTORY_INFO.email)
  const [uid, setUid] = useState<string | null>(null)

  // Image Import States
  const [isImageImportOpen, setIsImageImportOpen] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [extractedItems, setExtractedItems] = useState<Omit<QuotationItem, 'id'>[]>([])

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
        // 1. Hiển thị ngay từ LocalStorage cache (synchronous, không chờ mạng)
        const cached = readProfileCache(newUid)
        if (cached) {
          applyProfile(cached)
        }

        // 2. Fetch Firestore để lấy data mới nhất (bất đồng bộ)
        const profile = await loadUserProfile(newUid)
        applyProfile(profile)
      } else {
        // Đăng xuất → reset về default
        applyProfile({ factoryInfo: DEFAULT_FACTORY_INFO, defaultNotes: DEFAULT_NOTES })
      }
    })
    return () => unsub()
  }, [applyProfile])

  // Tự động tải danh sách báo giá Cloud khi uid thay đổi (đăng nhập thành công)
  useEffect(() => {
    if (uid) {
      loadQuotationsFromCloud()
    } else {
      setTemplates([])
    }
  }, [uid])

  // Khôi phục Gemini API Key từ localStorage khi khởi chạy
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key')
    if (savedKey) {
      setGeminiApiKey(savedKey)
    }
  }, [])

  const saveApiKey = (key: string) => {
    setGeminiApiKey(key)
    localStorage.setItem('gemini_api_key', key)
    toast.success('Đã lưu Gemini API Key trên trình duyệt của bạn!')
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setImagePreviewUrl(URL.createObjectURL(file))
      setExtractedItems([]) // Reset danh sách cũ
    }
  }

  const analyzeImageWithGemini = async () => {
    if (!selectedImage) {
      toast.error('Vui lòng chọn hình ảnh báo giá.')
      return
    }
    if (!geminiApiKey.trim()) {
      toast.error('Vui lòng cấu hình Gemini API Key trước.')
      return
    }

    setIsAnalyzing(true)
    const toastId = toast.loading('Đang phân tích hình ảnh bằng AI...')

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64Str = result.split(',')[1]
          resolve(base64Str)
        };
        reader.onerror = (error) => reject(error)
        reader.readAsDataURL(selectedImage)
      });

      const mimeType = selectedImage.type || 'image/jpeg'

      const promptText = `
Bạn là một chuyên gia bóc tách dữ liệu hóa đơn và bảng báo giá thi công nội thất chuyên nghiệp. 
Hãy đọc hình ảnh bảng báo giá nội thất được đính kèm và trích xuất toàn bộ danh sách các hạng mục thi công vào cấu trúc JSON được chỉ định.

Yêu cầu trích xuất:
1. Trích xuất chính xác:
   - "description": Tên hạng mục (ví dụ: "Bếp trên gỗ MDF KES", "Tủ đồ khô",...). Nếu có mô tả vật liệu (như cốt gỗ, bề mặt acrylic, melamine...) hãy gộp chung vào description này để người dùng dễ đọc.
   - "quantity": Số lượng (dạng số, ví dụ 4.1 hoặc 1).
   - "unit": Đơn vị tính (ví dụ: md, m2, bộ, cái, tấm,...).
   - "unitPrice": Đơn giá của hạng mục đó (dạng số nguyên, không chứa dấu chấm/dấu phẩy hay ký hiệu tiền tệ, ví dụ: 3600000).
   - "note": Bất kỳ ghi chú hoặc quy cách chi tiết nào có ghi trên dòng đó (ví dụ: "cánh Acrylic noline Livas", "2400*2400*450", "inox 304 nan vuông kt 400mm",...). Nếu không có thì để rỗng "".
2. Chỉ trả về một đối tượng JSON duy nhất theo cấu trúc sau, không kèm bất kỳ ký tự Markdown hay giải thích nào khác ngoài JSON:
{
  "items": [
    {
      "description": "Tên hạng mục",
      "quantity": 1,
      "unit": "cái",
      "unitPrice": 1000000,
      "note": "ghi chú thêm"
    }
  ]
}
      `.trim();

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`)
      }

      const resJson = await response.json()
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) {
        throw new Error('Không nhận được kết quả phân tích từ AI. Vui lòng kiểm tra lại ảnh.')
      }

      const parsedData = JSON.parse(rawText)
      if (!parsedData.items || !Array.isArray(parsedData.items)) {
        throw new Error('Dữ liệu trả về không đúng cấu trúc bảng báo giá.')
      }

      setExtractedItems(parsedData.items)
      toast.dismiss(toastId)
      toast.success(`Phân tích thành công! Trích xuất được ${parsedData.items.length} hạng mục.`)
    } catch (e: any) {
      console.error(e)
      toast.dismiss(toastId)
      toast.error(`Lỗi phân tích: ${e.message || 'Lỗi kết nối hoặc API Key không hợp lệ.'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const importExtractedItems = (mode: 'overwrite' | 'append') => {
    if (extractedItems.length === 0) return

    let startId = mode === 'append' ? items.length + 1 : 1
    const newItems: QuotationItem[] = extractedItems.map((item, idx) => ({
      id: startId + idx,
      description: item.description || 'Hạng mục không tên',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'Bộ',
      unitPrice: Number(item.unitPrice) || 0,
      note: item.note || ''
    }))

    if (mode === 'overwrite') {
      setItems(newItems)
      toast.success('Đã ghi đè bảng báo giá thành công!')
    } else {
      setItems([...items, ...newItems])
      toast.success('Đã thêm nối tiếp các hạng mục thành công!')
    }

    setIsImageImportOpen(false)
    setSelectedImage(null)
    setImagePreviewUrl(null)
    setExtractedItems([])
  }

  /** Debounce cloud sync 1.5s — cache đã được ghi ngay tại saveNotes/saveFactory */
  const debouncedSaveProfile = useCallback(
    (currentUid: string, profile: UserProfile) => {
      if (profileSaveTimerRef.current) clearTimeout(profileSaveTimerRef.current)
      profileSaveTimerRef.current = setTimeout(async () => {
        try {
          await saveProfileToCloud(currentUid, profile, auth.currentUser?.email || '')
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

  const loadTemplate = (template: QuotationTemplateCloud) => {
    const updatedItems = template.items.map((item, index) => ({
      ...item,
      id: index + 1
    }))
    setItems(updatedItems)
  }


  // ------------------------------------------------
  // Cloud sync functions (Google Sheets via Apps Script)
  const saveQuotationToCloud = async () => {
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
      name: quotationName,     
      customer: quotationName, 
      total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      items,
      info: `${factoryName} - ${factoryHotline}`,
      createdAt: new Date().toISOString()
    }
    
    const loadingId = toast.loading('Đang lưu báo giá...')
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveQuotation',
          uid,
          email: auth.currentUser?.email || '',
          quotation: payload
        })
      });
      toast.dismiss(loadingId)
      toast.success(`Đã lưu "${quotationName}" vào Cloud!`)
      await loadQuotationsFromCloud()
    } catch (e) {
      console.error(e)
      toast.dismiss(loadingId)
      toast.error('Lưu báo giá thất bại. Vui lòng thử lại.')
    }
  }

  const loadQuotationsFromCloud = async () => {
    if (!uid) {
      toast.error('Vui lòng đăng nhập để tải báo giá.')
      return
    }

    const loadingId = toast.loading('Đang tải dữ liệu từ Cloud...')
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getQuotations&uid=${uid}`)
      const json = await res.json()
      if (json.success && json.data) {
        const cloudTemplates = json.data.map((doc: any) => ({
          name: `${doc.name || doc.customer || 'Báo giá không tên'} - ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}`,
          items: doc.items,
          createdAt: doc.createdAt
        }))
        
        setTemplates(cloudTemplates)
        
        toast.dismiss(loadingId)
        toast.success(`Đã tải ${json.data.length} báo giá! Mở "Tải mẫu Cloud" để xem.`)
      } else {
        throw new Error('Failed to load')
      }
    } catch (e) {
      console.error(e)
      toast.dismiss(loadingId)
      toast.error('Lỗi tải báo giá từ Cloud. Vui lòng thử lại.')
    }
  }

  const deleteQuotationFromCloud = async (createdAt: string) => {
    if (!uid) {
      toast.error('Vui lòng đăng nhập để xóa báo giá.')
      return
    }
    const loadingId = toast.loading('Đang xóa báo giá trên Cloud...')
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteQuotation',
          uid,
          createdAt
        })
      })
      const json = await res.json()
      toast.dismiss(loadingId)
      if (json.success) {
        toast.success('Đã xóa báo giá thành công!')
        await loadQuotationsFromCloud()
      } else {
        toast.error(json.message || 'Xóa báo giá thất bại. Vui lòng thử lại.')
      }
    } catch (e) {
      console.error(e)
      toast.dismiss(loadingId)
      toast.error('Lỗi kết nối hoặc API chưa được cập nhật. Vui lòng thử lại.')
    }
  }

  // Note Handlers
  const startEditingNotes = () => {
    setTempNotes([...editableNotes])
    setIsEditingNotes(true)
  }

  const saveNotes = () => {
    setEditableNotes(tempNotes)
    setIsEditingNotes(false)
    if (uid) {
      // Build profile hiện tại với notes mới
      const profile: UserProfile = {
        factoryInfo: { name: factoryName, address: factoryAddress, hotline: factoryHotline, email: factoryEmail, pageTitle },
        defaultNotes: tempNotes,
      }
      // Ghi cache NGAY — đảm bảo data tồn tại kể cả khi đóng trang
      writeProfileCache(uid, profile)
      // Debounce cloud sync
      debouncedSaveProfile(uid, profile)
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
      // Ghi cache NGAY — đảm bảo data tồn tại kể cả khi đóng trang
      writeProfileCache(uid, profile)
      // Debounce cloud sync
      debouncedSaveProfile(uid, profile)
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
      {/* Header section — centered compact layout for print */}
      <div className="text-center border-b-2 border-slate-800 pb-3 space-y-1">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase leading-tight">{factoryName}</h2>
        <div className="text-xs text-slate-600 space-y-0">
          <p>{factoryAddress}</p>
          <p>{factoryHotline} | {factoryEmail}</p>
        </div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight pt-2">{pageTitle}</h1>
        <p className="text-[11px] text-slate-500">Ngày: {new Date().toLocaleDateString('vi-VN')}</p>
        <div className="flex items-center justify-center gap-2 mt-2 print:hidden">
          <FirebaseAuthButton variant="header" />
          <Button variant="outline" size="sm" onClick={startEditingFactory} className="h-7 text-xs">
            Sửa thông tin
          </Button>
        </div>
      </div>

      {/* Form section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-lg border print:hidden">
        <div className="md:col-span-2">
          <Label htmlFor="description" className="mb-2 block">Mô tả chi tiết</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Bếp trên MDF chống ẩm phủ Melamine..."
            className="w-full h-12"
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

      {/* Summary section — compact for print */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 py-3 border-t">
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Ghi chú & Chính sách:</h2>
            <Button variant="link" size="sm" onClick={startEditingNotes} className="print:hidden text-xs h-6">Chỉnh sửa</Button>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600 leading-relaxed pl-2">
            {editableNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="w-full md:w-80 p-4 bg-slate-900 text-white rounded-lg shadow-inner space-y-2">
          <div className="flex justify-between items-baseline border-b border-slate-700 pb-2">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Tổng cộng</span>
            <span className="text-2xl font-black text-amber-400">{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          <p className="text-[10px] italic text-slate-400 leading-normal">Bằng chữ: <span className="text-slate-200 capitalize">{numberToVietnameseWords(totalAmount)}</span></p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-3 pt-6 border-t print:hidden">
        {/* Row 1: Template management */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-slate-50 p-1 pl-3 rounded-md border">
            <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Nhập tên báo giá..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="border-none bg-transparent focus-visible:ring-0 min-w-0 w-full"
            />
          </div>
          <Dialog>
            <DialogTrigger>
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-9 px-3 rounded-md border shadow-sm hover:bg-white cursor-pointer shrink-0"><FolderOpen className="w-4 h-4" />Tải mẫu Cloud</span>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Danh sách báo giá trên Cloud</DialogTitle></DialogHeader>
              {templates.length === 0 ? <p className="text-center py-8 text-slate-400">Chưa có báo giá nào trên Cloud hoặc bạn chưa đăng nhập.</p> : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {templates.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 group">
                      <Button variant="ghost" className="flex-1 justify-start font-medium text-left truncate" onClick={() => loadTemplate(t)}>{t.name}</Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuotationFromCloud(t.createdAt)} className="text-slate-300 group-hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
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

          <Dialog open={isImageImportOpen} onOpenChange={setIsImageImportOpen}>
            <DialogTrigger>
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-9 px-3 rounded-md border shadow-sm hover:bg-emerald-50 cursor-pointer shrink-0 border-emerald-500 text-emerald-700">
                <Camera className="w-4 h-4" />Nhập từ ảnh AI
              </span>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Camera className="w-5 h-5 text-emerald-600" /> Nhập báo giá tự động bằng hình ảnh AI
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* API Key Setup */}
                <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="gemini-key" className="text-xs font-semibold text-slate-700">Cấu hình Gemini API Key (Lưu cục bộ trên máy)</Label>
                    <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Lấy Key miễn phí</a>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="gemini-key"
                      type="password"
                      placeholder="Dán Gemini API Key của bạn vào đây..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button size="sm" onClick={() => saveApiKey(geminiApiKey)} className="h-8 bg-slate-700 hover:bg-slate-800 text-white text-xs">Lưu Key</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Image upload area */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Tải lên ảnh báo giá (PNG, JPG, WebP)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[180px] bg-slate-50 hover:bg-slate-100 transition relative">
                      {imagePreviewUrl ? (
                        <div className="w-full h-full flex flex-col items-center gap-2">
                          <img src={imagePreviewUrl} alt="Preview" className="max-h-[160px] object-contain rounded border" />
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedImage(null); setImagePreviewUrl(null); setExtractedItems([]); }} className="text-red-500 hover:bg-red-50 text-xs h-6">Chọn ảnh khác</Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center space-y-1">
                          <Camera className="w-8 h-8 text-slate-400 mb-1" />
                          <p className="text-xs text-slate-600 font-medium">Kéo thả ảnh vào đây hoặc click để chọn file</p>
                          <p className="text-[10px] text-slate-400">Hỗ trợ PNG, JPG, JPEG, WEBP</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action and Info area */}
                  <div className="flex flex-col justify-center space-y-3 p-4 bg-slate-50 border rounded-lg">
                    <h4 className="text-xs font-bold text-slate-700">Hướng dẫn thực hiện:</h4>
                    <ol className="text-xs text-slate-600 space-y-1 list-decimal pl-4 leading-relaxed">
                      <li>Cấu hình API Key của bạn (nếu chưa có).</li>
                      <li>Tải lên ảnh chụp bảng báo giá (chụp rõ nét, thẳng bảng biểu).</li>
                      <li>Bấm nút **Phân tích bằng AI** phía dưới.</li>
                      <li>Đối chiếu kết quả ở bảng xem trước rồi bấm **Nạp dữ liệu**.</li>
                    </ol>

                    <Button 
                      onClick={analyzeImageWithGemini} 
                      disabled={isAnalyzing || !selectedImage || !geminiApiKey}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 h-10"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang phân tích...
                        </>
                      ) : (
                        <>
                          Phân tích bằng AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Extracted items table (Preview) */}
                {extractedItems.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <Label className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      🔍 Bảng xem trước kết quả trích xuất ({extractedItems.length} hạng mục)
                    </Label>
                    <div className="border rounded-md overflow-x-auto max-h-60">
                      <Table className="text-xs">
                        <TableHeader className="bg-slate-100 sticky top-0">
                          <TableRow>
                            <TableHead className="w-[8%]">STT</TableHead>
                            <TableHead className="w-[40%]">Hạng mục</TableHead>
                            <TableHead className="w-[12%] text-right">SL</TableHead>
                            <TableHead className="w-[10%]">ĐVT</TableHead>
                            <TableHead className="w-[15%] text-right">Đơn giá</TableHead>
                            <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedItems.map((item, idx) => {
                            const qty = Number(item.quantity) || 0
                            const price = Number(item.unitPrice) || 0
                            const total = qty * price
                            return (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell className="font-medium">
                                  <div>{item.description}</div>
                                  {item.note && <div className="text-[10px] text-slate-400 font-normal italic">{item.note}</div>}
                                </TableCell>
                                <TableCell className="text-right">{qty.toLocaleString('vi-VN')}</TableCell>
                                <TableCell>{item.unit || 'Bộ'}</TableCell>
                                <TableCell className="text-right">{price.toLocaleString('vi-VN')}</TableCell>
                                <TableCell className="text-right font-semibold text-slate-700">{(total).toLocaleString('vi-VN')}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Total Summary of Extracted Items */}
                    <div className="flex justify-end p-2 bg-slate-50 border rounded-md text-xs font-bold text-slate-800">
                      Tổng tiền dự kiến: &nbsp;
                      <span className="text-emerald-700">
                        {extractedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-4 gap-2 flex-row justify-end">
                <Button variant="ghost" onClick={() => { setIsImageImportOpen(false); setSelectedImage(null); setImagePreviewUrl(null); setExtractedItems([]); }} className="text-xs">
                  Hủy bỏ
                </Button>
                {extractedItems.length > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => importExtractedItems('append')} 
                      variant="outline"
                      className="border-blue-500 text-blue-700 hover:bg-blue-50 text-xs font-semibold"
                    >
                      Thêm nối tiếp vào bảng
                    </Button>
                    <Button 
                      onClick={() => importExtractedItems('overwrite')} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Ghi đè bảng hiện tại
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="shrink-0">
            <FileSpreadsheet className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Xuất</span> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={saveQuotationToCloud} className="border-blue-500 text-blue-700 hover:bg-blue-50 shrink-0">
            <Save className="w-4 h-4 mr-1" />Lưu Cloud
          </Button>
          <Button variant="outline" size="sm" onClick={loadQuotationsFromCloud} className="border-purple-500 text-purple-700 hover:bg-purple-50 shrink-0">
            <FolderOpen className="w-4 h-4 mr-1" />Tải Cloud
          </Button>
          {/* <Button variant="outline" size="sm" onClick={generatePDF} className="shrink-0">
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
