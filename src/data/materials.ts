export interface Material {
  id: string;
  brand: string;
  type: string; // MDF, HDF, MFC, Plywood
  surface: string; // Melamine, Laminate, Acrylic, Veneer
  code: string;
  name: string;
  category: 'core' | 'surface' | 'full';
  defaultPrice?: number;
}

export const woodMaterials: Material[] = [
  // An Cường - MDF Melamine
  { id: 'ac-mdf-me-101', brand: 'An Cường', type: 'MDF Chống ẩm', surface: 'Melamine', code: 'MS 101G', name: 'Trắng Sần', category: 'full', defaultPrice: 450000 },
  { id: 'ac-mdf-me-388', brand: 'An Cường', type: 'MDF Chống ẩm', surface: 'Melamine', code: 'MS 388EV', name: 'Vân gỗ Sồi (Oak)', category: 'full', defaultPrice: 520000 },
  { id: 'ac-mdf-me-402', brand: 'An Cường', type: 'MDF Chống ẩm', surface: 'Melamine', code: 'MS 402PL', name: 'Vân gỗ Óc chó (Walnut)', category: 'full', defaultPrice: 550000 },
  
  // Ba Thanh
  { id: 'bt-mdf-me-trang', brand: 'Ba Thanh', type: 'MDF Chống ẩm', surface: 'Melamine', code: 'BT 01', name: 'Trắng Tuyết', category: 'full', defaultPrice: 380000 },
  { id: 'bt-mdf-me-wood', brand: 'Ba Thanh', type: 'MDF Chống ẩm', surface: 'Melamine', code: 'BT 102', name: 'Vân gỗ xoan đào', category: 'full', defaultPrice: 420000 },

  // Mộc Phát
  { id: 'mp-mdf-me-std', brand: 'Mộc Phát', type: 'MDF Chống ẩm', surface: 'Melamine', code: 'MP 201', name: 'Trắng mịn', category: 'full', defaultPrice: 390000 },
  
  // Các loại cốt ván (Core)
  { id: 'core-mdf-ca-17', brand: 'Generic', type: 'MDF Chống ẩm', surface: 'Thô', code: 'MDF-CA-17', name: 'MDF Chống ẩm 17mm', category: 'core', defaultPrice: 320000 },
  { id: 'core-hdf-ca-17', brand: 'Generic', type: 'HDF Siêu chống ẩm', surface: 'Thô', code: 'HDF-CA-17', name: 'HDF Siêu chống ẩm 17mm', category: 'core', defaultPrice: 480000 },
  
  // Các loại bề mặt (Surface)
  { id: 'surf-lam-ac', brand: 'An Cường', type: 'Laminate', surface: 'Laminate', code: 'Laminate AC', name: 'Laminate An Cường cao cấp', category: 'surface', defaultPrice: 850000 },
  { id: 'surf-acr-ac', brand: 'An Cường', type: 'Acrylic', surface: 'Acrylic', code: 'Acrylic AC', name: 'Acrylic bóng gương No-line', category: 'surface', defaultPrice: 1200000 },
];
