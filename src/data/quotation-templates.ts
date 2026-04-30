import type { QuotationItem } from './types'

export interface QuotationTemplate {
  id: string
  name: string
  icon: string
  description: string
  category: 'kitchen' | 'bedroom' | 'living' | 'storage' | 'other'
  items: Omit<QuotationItem, 'id'>[]
}

export const builtInTemplates: QuotationTemplate[] = [
  // ═══════════════════════════════════════
  // 🍳 BẾP
  // ═══════════════════════════════════════
  {
    id: 'kitchen-i-3m',
    name: 'Tủ Bếp Chữ I (3m)',
    icon: '🍳',
    description: 'Bộ tủ bếp trên + dưới dạng thẳng 3 mét, MDF chống ẩm Melamine',
    category: 'kitchen',
    items: [
      { description: 'Tủ bếp trên – MDF chống ẩm phủ Melamine (3m x 350 x 750)', quantity: 3, unit: 'md', unitPrice: 2800000, note: 'Cốt MDF lõi xanh, cánh Melamine' },
      { description: 'Tủ bếp dưới – MDF chống ẩm phủ Melamine (3m x 600 x 810)', quantity: 3, unit: 'md', unitPrice: 3200000, note: 'Cốt MDF lõi xanh, cánh Melamine' },
      { description: 'Kệ gia vị kéo 2 tầng (Inox 304)', quantity: 1, unit: 'Bộ', unitPrice: 1200000, note: 'Phụ kiện Garis/Hafele' },
      { description: 'Bản lề giảm chấn (cặp)', quantity: 12, unit: 'Cặp', unitPrice: 85000, note: 'Bản lề Blum/Grass tương đương' },
      { description: 'Tay nắm cánh tủ nhôm (thanh 128mm)', quantity: 10, unit: 'Cái', unitPrice: 45000, note: 'Nhôm anode' },
      { description: 'Chân chỉnh tủ dưới (bộ 4)', quantity: 3, unit: 'Bộ', unitPrice: 60000, note: '' },
    ]
  },
  {
    id: 'kitchen-l-3p5m',
    name: 'Tủ Bếp Chữ L (3.5m + 1.5m)',
    icon: '🍳',
    description: 'Bộ tủ bếp chữ L, MDF chống ẩm Melamine, phù hợp căn hộ/nhà phố',
    category: 'kitchen',
    items: [
      { description: 'Tủ bếp trên – MDF chống ẩm Melamine (cạnh dài 3.5m)', quantity: 3.5, unit: 'md', unitPrice: 2800000, note: 'Cốt MDF lõi xanh' },
      { description: 'Tủ bếp trên – MDF chống ẩm Melamine (cạnh ngắn 1.5m)', quantity: 1.5, unit: 'md', unitPrice: 2800000, note: 'Cốt MDF lõi xanh' },
      { description: 'Tủ bếp dưới – MDF chống ẩm Melamine (cạnh dài 3.5m)', quantity: 3.5, unit: 'md', unitPrice: 3200000, note: 'Cốt MDF lõi xanh' },
      { description: 'Tủ bếp dưới – MDF chống ẩm Melamine (cạnh ngắn 1.5m)', quantity: 1.5, unit: 'md', unitPrice: 3200000, note: 'Cốt MDF lõi xanh' },
      { description: 'Tủ góc xoay 3/4 (bộ khay xoay)', quantity: 1, unit: 'Bộ', unitPrice: 3500000, note: 'Khay xoay Inox 304' },
      { description: 'Kệ gia vị kéo 2 tầng (Inox 304)', quantity: 1, unit: 'Bộ', unitPrice: 1200000, note: '' },
      { description: 'Bản lề giảm chấn (cặp)', quantity: 16, unit: 'Cặp', unitPrice: 85000, note: 'Blum/Grass tương đương' },
      { description: 'Tay nắm cánh tủ nhôm (thanh 128mm)', quantity: 14, unit: 'Cái', unitPrice: 45000, note: '' },
    ]
  },

  // ═══════════════════════════════════════
  // 👔 TỦ QUẦN ÁO
  // ═══════════════════════════════════════
  {
    id: 'wardrobe-swing-2p4m',
    name: 'Tủ Quần Áo Cánh Mở (2.4m)',
    icon: '👔',
    description: 'Tủ áo 4 cánh mở kịch trần, MDF chống ẩm Melamine, rộng 2.4m x cao 2.4m',
    category: 'bedroom',
    items: [
      { description: 'Thân tủ + vách ngăn – MDF chống ẩm Melamine (2.4m x 2.4m)', quantity: 5.76, unit: 'm2', unitPrice: 2800000, note: 'Tính theo m² mặt đứng (W x H)' },
      { description: 'Cánh tủ Melamine (4 cánh mở)', quantity: 4, unit: 'Cánh', unitPrice: 950000, note: 'MDF 17mm phủ Melamine' },
      { description: 'Hậu tủ MDF 5mm', quantity: 5.76, unit: 'm2', unitPrice: 120000, note: '' },
      { description: 'Bản lề giảm chấn (cặp)', quantity: 8, unit: 'Cặp', unitPrice: 85000, note: '' },
      { description: 'Tay nắm cánh tủ (thanh dài 320mm)', quantity: 4, unit: 'Cái', unitPrice: 65000, note: 'Nhôm anode' },
      { description: 'Thanh treo quần áo Inox 25mm', quantity: 2, unit: 'Thanh', unitPrice: 180000, note: 'Inox 304, dài 1.1m' },
    ]
  },
  {
    id: 'wardrobe-slide-2p4m',
    name: 'Tủ Quần Áo Cửa Lùa (2.4m)',
    icon: '👔',
    description: 'Tủ áo cửa lùa 3 cánh kịch trần, MDF chống ẩm Melamine',
    category: 'bedroom',
    items: [
      { description: 'Thân tủ + vách ngăn – MDF chống ẩm Melamine (2.4m x 2.4m)', quantity: 5.76, unit: 'm2', unitPrice: 2800000, note: 'Tính theo m² mặt đứng (W x H)' },
      { description: 'Cánh cửa lùa Melamine (3 cánh)', quantity: 3, unit: 'Cánh', unitPrice: 1800000, note: 'MDF 17mm, khung nhôm' },
      { description: 'Ray trượt cửa lùa (bộ trên + dưới)', quantity: 1, unit: 'Bộ', unitPrice: 2200000, note: 'Ray giảm chấn' },
      { description: 'Hậu tủ MDF 5mm', quantity: 5.76, unit: 'm2', unitPrice: 120000, note: '' },
      { description: 'Thanh treo quần áo Inox 25mm', quantity: 2, unit: 'Thanh', unitPrice: 180000, note: '' },
    ]
  },

  // ═══════════════════════════════════════
  // 🛏️ PHÒNG NGỦ
  // ═══════════════════════════════════════
  {
    id: 'bedroom-master',
    name: 'Bộ Phòng Ngủ Master',
    icon: '🛏️',
    description: 'Trọn bộ phòng ngủ chính: tủ áo, giường, 2 tab đầu giường, bàn trang điểm',
    category: 'bedroom',
    items: [
      { description: 'Tủ quần áo cánh mở MDF Melamine (2.0m x 2.4m)', quantity: 4.8, unit: 'm2', unitPrice: 2800000, note: 'Kịch trần, cốt MDF lõi xanh' },
      { description: 'Giường ngủ MDF 1.8m x 2.0m (đầu giường bọc nệm)', quantity: 1, unit: 'Cái', unitPrice: 9500000, note: 'Kích thước King Size' },
      { description: 'Tab đầu giường MDF Melamine (500 x 400 x 500)', quantity: 2, unit: 'Cái', unitPrice: 2800000, note: '2 ngăn kéo' },
      { description: 'Bàn trang điểm MDF Melamine (1.0m x 0.45m) kèm gương', quantity: 1, unit: 'Bộ', unitPrice: 3200000, note: 'Có hộc kéo, gương LED' },
      { description: 'Kệ trang trí treo tường (1.2m x 0.25m)', quantity: 1, unit: 'Cái', unitPrice: 850000, note: '' },
    ]
  },
  {
    id: 'bedroom-kid',
    name: 'Bộ Phòng Ngủ Con',
    icon: '🛏️',
    description: 'Trọn bộ phòng ngủ trẻ: tủ áo nhỏ, giường, bàn học, kệ sách',
    category: 'bedroom',
    items: [
      { description: 'Tủ quần áo cánh mở MDF Melamine (1.2m x 2.2m)', quantity: 2.64, unit: 'm2', unitPrice: 2800000, note: '2 cánh, cốt MDF lõi xanh' },
      { description: 'Giường ngủ MDF 1.2m x 2.0m', quantity: 1, unit: 'Cái', unitPrice: 6500000, note: 'Có hộc kéo bên dưới' },
      { description: 'Bàn học MDF Melamine (1.2m x 0.6m)', quantity: 1, unit: 'Cái', unitPrice: 3500000, note: 'Có hộc kéo + kệ sách mini' },
      { description: 'Kệ sách treo tường (1.2m x 0.8m, 4 tầng)', quantity: 1, unit: 'Cái', unitPrice: 2200000, note: '' },
    ]
  },

  // ═══════════════════════════════════════
  // 📺 PHÒNG KHÁCH
  // ═══════════════════════════════════════
  {
    id: 'living-room',
    name: 'Bộ Phòng Khách',
    icon: '📺',
    description: 'Kệ tivi, tủ giày, vách ốp tường trang trí',
    category: 'living',
    items: [
      { description: 'Kệ tivi treo tường MDF Melamine (2.4m x 0.4m)', quantity: 2.4, unit: 'md', unitPrice: 2500000, note: 'Có ngăn kéo + kệ để đồ' },
      { description: 'Tủ giày MDF Melamine (1.2m x 0.35m x 1.2m)', quantity: 1.44, unit: 'm2', unitPrice: 3200000, note: 'Cánh lật, 4 tầng' },
      { description: 'Vách ốp tường trang trí MDF (2.4m x 2.8m)', quantity: 6.72, unit: 'm2', unitPrice: 1800000, note: 'Lamri chỉ nổi' },
      { description: 'Kệ trang trí treo tường (1.5m x 0.25m)', quantity: 2, unit: 'Cái', unitPrice: 650000, note: '' },
    ]
  },

  // ═══════════════════════════════════════
  // 🪜 CẦU THANG & LƯU TRỮ
  // ═══════════════════════════════════════
  {
    id: 'staircase-cabinet',
    name: 'Tủ Gầm Cầu Thang',
    icon: '🪜',
    description: 'Tủ tận dụng gầm cầu thang, MDF chống ẩm Melamine',
    category: 'storage',
    items: [
      { description: 'Thân tủ gầm cầu thang – MDF chống ẩm Melamine (vát xiên)', quantity: 3.5, unit: 'm2', unitPrice: 3200000, note: 'Thiết kế vát theo góc cầu thang' },
      { description: 'Cánh tủ Melamine (3 cánh, kích thước giảm dần)', quantity: 3, unit: 'Cánh', unitPrice: 1100000, note: 'Hệ số K=1.2 (cắt vát phức tạp)' },
      { description: 'Bản lề giảm chấn + tay nắm', quantity: 3, unit: 'Bộ', unitPrice: 200000, note: '' },
    ]
  },
  {
    id: 'shoe-cabinet-wall',
    name: 'Tủ Giày + Vách Ốp',
    icon: '👟',
    description: 'Tủ giày kết hợp vách ốp trang trí khu vực lối vào',
    category: 'storage',
    items: [
      { description: 'Tủ giày MDF Melamine (1.2m x 0.35m x 1.5m) cánh lật', quantity: 1.8, unit: 'm2', unitPrice: 3200000, note: '5 tầng, cánh lật thông minh' },
      { description: 'Vách ốp trang trí MDF (0.8m x 2.4m) kèm gương', quantity: 1.92, unit: 'm2', unitPrice: 2200000, note: 'Lamri + gương soi toàn thân' },
      { description: 'Móc treo chìa khóa / đồ trang trí', quantity: 1, unit: 'Bộ', unitPrice: 350000, note: 'Inox 304' },
    ]
  },
]
