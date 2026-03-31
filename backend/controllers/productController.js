
const ProductModel = require('../models/ProductModel');
const ReviewModel = require('../models/ReviewModel');

const PURPOSE_PROFILES = {
  office: {
    label: 'Lam viec van phong',
    baseComponents: [
      { key: 'cpu', label: 'CPU', ratio: 0.2, keywords: ['cpu', 'vi xu ly', 'processor', 'intel core', 'amd ryzen'] },
      { key: 'mainboard', label: 'Mainboard', ratio: 0.14, keywords: ['mainboard', 'motherboard', 'bo mach chu'] },
      { key: 'ram', label: 'RAM', ratio: 0.12, keywords: ['ram', 'ddr4', 'ddr5'] },
      { key: 'storage', label: 'O cung', ratio: 0.14, keywords: ['ssd', 'nvme', 'hdd', 'o cung', 'storage'] },
      { key: 'psu', label: 'Nguon', ratio: 0.1, keywords: ['nguon', 'psu', 'power supply'] },
      { key: 'case', label: 'Vo case', ratio: 0.08, keywords: ['case', 'vo may', 'thung may'] },
      { key: 'monitor', label: 'Man hinh', ratio: 0.22, keywords: ['man hinh', 'monitor'] }
    ],
    optionalComponents: [
      { key: 'keyboard', label: 'Ban phim', ratio: 0.05, keywords: ['ban phim', 'keyboard'] },
      { key: 'mouse', label: 'Chuot', ratio: 0.05, keywords: ['chuot', 'mouse'] }
    ]
  },
  gaming: {
    label: 'Choi game',
    baseComponents: [
      { key: 'cpu', label: 'CPU', ratio: 0.18, keywords: ['cpu', 'vi xu ly', 'processor', 'intel core', 'amd ryzen'] },
      { key: 'gpu', label: 'Card do hoa', ratio: 0.32, keywords: ['vga', 'gpu', 'card man hinh', 'rtx', 'radeon', 'geforce'] },
      { key: 'mainboard', label: 'Mainboard', ratio: 0.12, keywords: ['mainboard', 'motherboard', 'bo mach chu'] },
      { key: 'ram', label: 'RAM', ratio: 0.12, keywords: ['ram', 'ddr4', 'ddr5'] },
      { key: 'storage', label: 'SSD', ratio: 0.1, keywords: ['ssd', 'nvme', 'o cung'] },
      { key: 'psu', label: 'Nguon', ratio: 0.1, keywords: ['nguon', 'psu', 'power supply'] },
      { key: 'case', label: 'Vo case', ratio: 0.06, keywords: ['case', 'vo may', 'thung may'] }
    ],
    optionalComponents: [
      { key: 'monitor', label: 'Man hinh', ratio: 0.18, keywords: ['man hinh', 'monitor', '144hz', '165hz'] },
      { key: 'cooler', label: 'Tan nhiet', ratio: 0.05, keywords: ['tan nhiet', 'cooler', 'fan', 'aio'] }
    ]
  },
  design: {
    label: 'Do hoa va sang tao noi dung',
    baseComponents: [
      { key: 'cpu', label: 'CPU', ratio: 0.2, keywords: ['cpu', 'vi xu ly', 'processor', 'intel core', 'amd ryzen'] },
      { key: 'gpu', label: 'Card do hoa', ratio: 0.3, keywords: ['vga', 'gpu', 'card man hinh', 'rtx', 'radeon', 'geforce'] },
      { key: 'mainboard', label: 'Mainboard', ratio: 0.1, keywords: ['mainboard', 'motherboard', 'bo mach chu'] },
      { key: 'ram', label: 'RAM', ratio: 0.15, keywords: ['ram', 'ddr4', 'ddr5'] },
      { key: 'storage', label: 'SSD/NVMe', ratio: 0.12, keywords: ['ssd', 'nvme', 'o cung', 'storage'] },
      { key: 'psu', label: 'Nguon', ratio: 0.08, keywords: ['nguon', 'psu', 'power supply'] },
      { key: 'monitor', label: 'Man hinh mau chuan', ratio: 0.2, keywords: ['man hinh', 'monitor', 'ips', 'color', 'srgb', 'adobe'] }
    ],
    optionalComponents: [
      { key: 'keyboard', label: 'Ban phim', ratio: 0.05, keywords: ['ban phim', 'keyboard'] },
      { key: 'mouse', label: 'Chuot', ratio: 0.05, keywords: ['chuot', 'mouse'] }
    ]
  }
};

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const parseBudget = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = Number(String(value).replace(/[^\d]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
};

const matchKeywordScore = (haystack, keywords = []) => {
  if (!haystack || !keywords.length) {
    return 0;
  }

  return keywords.reduce((score, keyword) => (haystack.includes(normalizeText(keyword)) ? score + 1 : score), 0);
};

const buildProductSearchText = (product) => {
  return normalizeText([
    product.product_name,
    product.description,
    product.category_name
  ].filter(Boolean).join(' '));
};

const scoreProductForComponent = (product, component, budget) => {
  const searchText = buildProductSearchText(product);
  const keywordScore = matchKeywordScore(searchText, component.keywords);
  if (!keywordScore) {
    return null;
  }

  const price = Number(product.price || 0);
  const stock = Number(product.stock_quantity || 0);
  const onSaleBoost = product.is_on_sale ? 8 : 0;
  const stockBoost = Math.min(8, Math.floor(stock / 5));

  let budgetFit = 0;
  if (budget && Number.isFinite(budget) && budget > 0) {
    const target = Math.max(500000, budget * Number(component.ratio || 0));
    const delta = Math.abs(price - target);
    const fitRatio = Math.max(0, 1 - (delta / target));
    budgetFit = Math.round(fitRatio * 25);
  }

  const score = keywordScore * 30 + onSaleBoost + stockBoost + budgetFit;

  return {
    score,
    product,
    reason: [
      keywordScore > 1 ? 'Phu hop nhom linh kien' : 'Trung tu khoa nhu cau',
      product.is_on_sale ? 'dang giam gia' : null,
      stock > 0 ? `con ${stock} san pham` : null
    ].filter(Boolean).join(', ')
  };
};

const mapProductPayload = (item) => ({
  product_id: item.product_id,
  product_name: item.product_name,
  price: Number(item.price || 0),
  base_price: Number(item.base_price || item.price || 0),
  sale_price: Number(item.sale_price || 0),
  is_on_sale: Boolean(item.is_on_sale),
  stock_quantity: Number(item.stock_quantity || 0),
  category_name: item.category_name || null,
  image_url: item.image_url || null
});

const generateBuildRecommendation = async ({ purpose, budget }) => {
  const profile = PURPOSE_PROFILES[purpose] || PURPOSE_PROFILES.office;
  const productPool = await ProductModel.getAll({ page: 1, limit: 500 });
  const products = Array.isArray(productPool?.products)
    ? productPool.products.filter((item) => Number(item.stock_quantity || 0) > 0)
    : [];

  const selectedIds = new Set();
  const selectedItems = [];
  const missingComponents = [];

  for (const component of profile.baseComponents) {
    const scored = products
      .map((item) => scoreProductForComponent(item, component, budget))
      .filter(Boolean)
      .filter((entry) => !selectedIds.has(entry.product.product_id))
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      missingComponents.push(component.label);
      continue;
    }

    const best = scored[0];
    selectedIds.add(best.product.product_id);
    selectedItems.push({
      group_key: component.key,
      group_label: component.label,
      confidence: Math.min(99, Math.max(55, best.score)),
      reason: best.reason,
      product: mapProductPayload(best.product)
    });
  }
  // Keep optional picks limited so recommendation stays practical and affordable.
  for (const optional of profile.optionalComponents.slice(0, 2)) {
    const scored = products
      .map((item) => scoreProductForComponent(item, optional, budget))
      .filter(Boolean)
      .filter((entry) => !selectedIds.has(entry.product.product_id))
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      continue;
    }

    const best = scored[0];
    selectedIds.add(best.product.product_id);
    selectedItems.push({
      group_key: optional.key,
      group_label: optional.label,
      confidence: Math.min(95, Math.max(50, best.score - 5)),
      reason: `Tuy chon bo sung, ${best.reason}`,
      product: mapProductPayload(best.product)
    });
  }

  const totalEstimated = selectedItems.reduce((sum, item) => sum + Number(item.product.price || 0), 0);
  const baseCount = profile.baseComponents.length;
  const coveredBaseCount = baseCount - missingComponents.length;
  const coverage = baseCount ? Math.round((coveredBaseCount / baseCount) * 100) : 0;

  const tips = [];
  if (budget && totalEstimated > budget) {
    tips.push('Tong gia tri dang vuot ngan sach. Ban co the bo bot man hinh/phu kien de toi uu chi phi.');
  }
  if (budget && totalEstimated < budget * 0.75) {
    tips.push('Cau hinh dang duoi ngan sach kha nhieu. Ban co the nang cap CPU/GPU de hieu nang tot hon.');
  }
  if (missingComponents.length) {
    tips.push('He thong chua tim du linh kien cho mot so nhom. Ban nen bo sung san pham trong danh muc con thieu.');
  }
  if (!tips.length) {
    tips.push('Bo cau hinh nay can bang cho nhu cau da chon va uu tien san pham dang con hang.');
  }

  return {
    profile: {
      key: purpose,
      label: profile.label
    },
    budget,
    totalEstimated,
    coverage,
    missingComponents,
    items: selectedItems,
    tips
  };
};

const getAllProducts = async (req, res) => {
  try {
    const { page, limit, categoryId } = req.query;
    
    const result = await ProductModel.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
      categoryId: categoryId ? parseInt(categoryId) : null
    });
    
    res.json({
      success: true,
      data: result.products,
      pagination: {
        total: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        perPage: result.perPage
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm: ' + error.message
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const product = await ProductModel.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }
    const reviews = await ReviewModel.getByProductId(productId);
    product.Reviews = reviews;
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length;
      product.AverageRating = Math.round(avgRating * 10) / 10;
    } else {
      product.AverageRating = 0;
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy sản phẩm: ' + error.message
    });
  }
};

const searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm'
      });
    }
    
    const products = await ProductModel.search(keyword);
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm: ' + error.message
    });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file ảnh'
      });
    }
    const imageUrl = `/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Upload ảnh thành công',
      data: {
        image_url: imageUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh: ' + error.message
    });
  }
};

const recommendBuild = async (req, res) => {
  try {
    const purposeInput = normalizeText(req.query.purpose || 'office');
    const purpose = ['office', 'gaming', 'design'].includes(purposeInput) ? purposeInput : 'office';
    const budget = parseBudget(req.query.budget);

    const recommendation = await generateBuildRecommendation({ purpose, budget });

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Recommend build error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi khi goi y cau hinh: ' + error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  searchProducts,
  uploadImage,
  recommendBuild
};
