
const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const config = require('../config/config');

const MAX_HISTORY_MESSAGES = 6;

const FAQ_RESPONSES = [
  {
    keywords: ['giao hàng', 'giao nhan', 'nhan hang', 'ship', 'vận chuyển'],
    answer: 'Shop hỗ trợ giao hàng toàn quốc. Thời gian giao hàng nội thành thường từ 1-2 ngày, liên tỉnh 2-5 ngày tùy khu vực.'
  },
  {
    keywords: ['đổi trả', 'hoàn tiền', 'bảo hành'],
    answer: 'Bạn có thể yêu cầu đổi trả trong 7 ngày nếu sản phẩm lỗi kỹ thuật hoặc không đúng mô tả. Vui lòng giữ hóa đơn và liên hệ CSKH để được hỗ trợ nhanh nhất.'
  },
  {
    keywords: ['thanh toán', 'cod', 'trả tiền'],
    answer: 'Hiện tại hệ thống hỗ trợ COD và chuyển khoản ngân hàng. Khi đặt hàng bạn có thể chọn phương thức thanh toán phù hợp và kiểm tra lại thông tin chuyển khoản nếu chọn bank transfer.'
  },
  {
    keywords: ['liên hệ', 'hỗ trợ', 'tư vấn'],
    answer: 'Bạn có thể nhắn trực tiếp tại khung chat này hoặc liên hệ admin để được tư vấn sản phẩm phù hợp theo nhu cầu và ngân sách.'
  }
];

const WEBSITE_DATA_RESPONSES = [
  {
    keywords: ['đăng ký', 'tạo tài khoản', 'đăng nhập', 'quên mật khẩu'],
    answer: 'Bạn có thể đăng ký/đăng nhập bằng email hoặc số điện thoại. Nếu quên mật khẩu, vào trang đăng nhập và bấm "Quên mật khẩu" để nhận link đặt lại mật khẩu.'
  },
  {
    keywords: ['giỏ hàng', 'đặt hàng', 'checkout', 'thanh toán'],
    answer: 'Quy trình mua hàng gồm: thêm vào giỏ, xác nhận địa chỉ/số điện thoại, chọn phương thức thanh toán, áp mã giảm giá (nếu có), rồi đặt đơn.'
  },
  {
    keywords: ['mã giảm giá', 'coupon', 'khuyến mãi'],
    answer: 'Bạn có thể nhập mã giảm giá ngay ở bước thanh toán. Hệ thống sẽ tự tính mức giảm hợp lệ trước khi xác nhận đặt đơn.'
  },
  {
    keywords: ['hủy đơn', 'chờ xác nhận', 'admin xác nhận'],
    answer: 'Khi đơn còn ở trạng thái chờ xác nhận, bạn có thể hủy đơn và nhập lý do hủy trực tiếp trong trang Đơn hàng của tôi.'
  },
  {
    keywords: ['trả hàng', 'hoàn tiền', 'refund'],
    answer: 'Sau khi đơn hoàn thành, bạn có thể gửi yêu cầu trả hàng trong trang Đơn hàng. Shop sẽ kiểm tra hàng trả và cập nhật kết quả hoàn tiền.'
  }
];

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const containsAny = (text, keywords = []) => keywords.some((keyword) => text.includes(normalizeText(keyword)));

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

const toVndNumber = (textNumber) => {
  const raw = String(textNumber || '').replace(/[,\.\s]/g, '');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
    // Users often type "10" meaning 10 million VND in chat context.
  if (parsed < 1000) {
    return parsed * 1000000;
  }

  return parsed;
};

const isLikelyPriceOnlyQuery = (normalizedMessage) => {
  if (!normalizedMessage) {
    return false;
  }

  const hasPriceUnit = /\b(\d+[\d\.,]*\s*(tr|trieu|k|nghin|ngan))\b/i.test(normalizedMessage);
  const hasPriceContext = containsAny(normalizedMessage, ['gia', 'tam gia', 'khoang', 'duoi', 'tren', 'tu', 'den']);
  const nonPriceText = normalizedMessage
    .replace(/\d+[\d\.,]*/g, ' ')
    .replace(/\b(tr|trieu|k|nghin|ngan|gia|tam|khoang|duoi|tren|tu|den|san|pham|goi|y|tim|mua)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (hasPriceUnit || hasPriceContext) && nonPriceText.length === 0;
};

const findFaqAnswer = (message) => {
  const normalized = normalizeText(message);

  if (containsAny(normalized, ['xin chào', 'chào shop', 'hello', 'alo'])) {
    return 'Chào bạn, mình có thể tư vấn theo nhu cầu, tầm giá hoặc danh mục sản phẩm. Bạn đang quan tâm món nào?';
  }

  if (containsAny(normalized, ['cảm ơn', 'thanks', 'thank you'])) {
    return 'Rất vui được hỗ trợ bạn. Nếu cần mình có thể gợi ý thêm sản phẩm phù hợp ngân sách của bạn.';
  }

  if (containsAny(normalized, ['đơn hàng', 'tra cứu đơn', 'kiểm tra đơn', 'mã đơn'])) {
    return 'Để kiểm tra đơn hàng chính xác, bạn vui lòng đăng nhập và vào mục Đơn hàng. Nếu cần, mình có thể hướng dẫn từng bước ngay.';
  }

  for (const item of FAQ_RESPONSES) {
    if (item.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return item.answer;
    }
  }
  return null;
};

const findWebsiteDataAnswer = async (message) => {
  const normalized = normalizeText(message);

  for (const item of WEBSITE_DATA_RESPONSES) {
    if (item.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return item.answer;
    }
  }

  if (!containsAny(normalized, ['dữ liệu web', 'website có gì', 'có gì', 'thống kê', 'danh mục nào'])) {
    return null;
  }

  const [categories, productPool] = await Promise.all([
    CategoryModel.getAll().catch(() => []),
    ProductModel.getAll({ page: 1, limit: 80 }).catch(() => ({ products: [], totalCount: 0 }))
  ]);

  const categoryNames = Array.isArray(categories)
    ? categories.slice(0, 8).map((c) => c.category_name || c.CategoryName).filter(Boolean)
    : [];

  const productTotal = Number(productPool?.totalCount || 0);
  const inStockCount = Array.isArray(productPool?.products)
    ? productPool.products.filter((p) => Number(p.stock_quantity ?? p.Stock ?? 0) > 0).length
    : 0;

  return [
    `Hiện website có khoảng ${productTotal} sản phẩm trong hệ thống và ${inStockCount} sản phẩm còn hàng trong danh sách gần nhất.`,
    categoryNames.length
      ? `Các danh mục tiêu biểu: ${categoryNames.join(', ')}.`
      : 'Hiện mình chưa đọc được danh sách danh mục từ hệ thống.',
    'Bạn muốn mình gợi ý theo danh mục hay theo khoảng giá?'
  ].join(' ');
};

const findLatestInStockProductsAnswer = async (message) => {
  const normalized = normalizeText(message);
  if (!containsAny(normalized, ['mới nhất', 'nổi bật', 'gợi ý nhanh', 'còn hàng'])) {
    return null;
  }

  const poolData = await ProductModel.getAll({ page: 1, limit: 40 });
  const products = Array.isArray(poolData?.products) ? poolData.products : [];
  const inStockProducts = products.filter((p) => Number(p.stock_quantity ?? p.Stock ?? 0) > 0);

  if (!inStockProducts.length) {
    return 'Hiện mình chưa thấy sản phẩm còn hàng để gợi ý nhanh. Bạn thử lại sau ít phút nhé.';
  }

  const lines = inStockProducts.slice(0, 5).map((p, index) => {
    const name = p.product_name || p.ProductName || 'Sản phẩm';
    const price = Number(p.price ?? p.Price ?? 0);
    const stock = Number(p.stock_quantity ?? p.Stock ?? 0);
    return `${index + 1}. ${name} - ${formatCurrency(price)} (còn ${stock})`;
  });

  return `Mình gợi ý nhanh ${Math.min(5, inStockProducts.length)} sản phẩm mới và còn hàng:\n${lines.join('\n')}`;
};

const getFallbackChoices = () => {
  return [
    {
      type: 'message',
      label: 'Goi y danh muc san pham',
      value: 'Cho toi biet cac danh muc san pham hien co tren website'
    },
    {
      type: 'message',
      label: 'Goi y san pham duoi 10 trieu',
      value: 'Goi y cho toi 5 san pham duoi 10 trieu dang con hang'
    }
  ];
};

const findProductsFromMessage = async (message) => {
  const normalized = normalizeText(message);
  const triggerWords = ['tim', 'goi y', 'san pham', 'mua', 'dien thoai', 'laptop', 'tai nghe', 'phone', 'smartphone'];
  const phoneIntentKeywords = ['dien thoai', 'phone', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme'];

  if (!containsAny(normalized, triggerWords)) {
    return null;
  }
  if (isLikelyPriceOnlyQuery(normalized)) {
    return null;
  }

  const keyword = normalized
    .replace(/tim|goi y|san pham|mua|giup|cho|minh|em|anh|voi|phone|smartphone/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!keyword) {
    if (containsAny(normalized, phoneIntentKeywords)) {
      const poolData = await ProductModel.getAll({ page: 1, limit: 80 });
      const products = Array.isArray(poolData?.products) ? poolData.products : [];
      const phoneProducts = products.filter((p) => {
        const name = normalizeText(p.product_name || p.ProductName || '');
        const category = normalizeText(p.category_name || p.CategoryName || '');
        return containsAny(`${name} ${category}`, phoneIntentKeywords);
      });

      if (!phoneProducts.length) {
        return 'Mình chưa tìm thấy sản phẩm điện thoại phù hợp trong dữ liệu hiện tại. Bạn thử nêu thương hiệu cụ thể như iPhone, Samsung hoặc Xiaomi nhé.';
      }

      const lines = phoneProducts.slice(0, 5).map((p, index) => {
        const name = p.product_name || p.ProductName || 'Sản phẩm';
        const price = Number(p.price ?? p.Price ?? 0);
        const stock = Number(p.stock_quantity ?? p.Stock ?? 0);
        return `${index + 1}. ${name} - ${formatCurrency(price)} (còn ${stock})`;
      });

      return `Mình gợi ý nhanh một số điện thoại bạn có thể tham khảo:\n${lines.join('\n')}\n\nBạn muốn mình lọc tiếp theo tầm giá không?`;
    }

    return 'Bạn muốn tìm sản phẩm theo từ khóa nào? Ví dụ: iPhone, laptop gaming, tai nghe chống ồn.';
  }

  const products = await ProductModel.search(keyword);
  if (!products || products.length === 0) {
    if (containsAny(normalized, phoneIntentKeywords)) {
      return 'Mình chưa tìm thấy mẫu điện thoại đúng từ khóa bạn nhập. Bạn thử nêu thương hiệu hoặc tầm giá, ví dụ: "điện thoại dưới 10 triệu".';
    }
    return `Mình chưa tìm thấy sản phẩm phù hợp với từ khóa "${keyword}". Bạn thử từ khóa ngắn hơn nhé.`;
  }

  const topProducts = products.slice(0, 5);
  const lines = topProducts.map((p, index) => {
    const name = p.product_name || p.ProductName || 'Sản phẩm';
    const price = Number(p.price ?? p.Price ?? 0);
    const stock = Number(p.stock_quantity ?? p.Stock ?? 0);
    const formattedPrice = formatCurrency(price);
    return `${index + 1}. ${name} - ${formattedPrice} (còn ${stock})`;
  });

  return `Mình gợi ý ${topProducts.length} sản phẩm phù hợp:\n${lines.join('\n')}\n\nBạn muốn mình lọc thêm theo mức giá không?`;
};

const findCategoryAnswer = async (message) => {
  const normalized = normalizeText(message);
  if (!containsAny(normalized, ['danh mục', 'loại sản phẩm', 'category', 'ngành hàng'])) {
    return null;
  }

  const categories = await CategoryModel.getAll();
  if (!categories || categories.length === 0) {
    return 'Hiện chưa có dữ liệu danh mục để hiển thị.';
  }

  const names = categories.slice(0, 12).map((c) => c.category_name || c.CategoryName).filter(Boolean);
  return `Hiện shop có ${categories.length} danh mục: ${names.join(', ')}.${categories.length > 12 ? ' ...' : ''} Bạn muốn mình gợi ý theo danh mục nào?`;
};

const findPriceRangeFromMessage = (message) => {
  const normalized = normalizeText(message);
  const underMatch = normalized.match(/(?:duoi|<)\s*(\d+[\d\.,]*)\s*(tr|trieu|k|nghin|ngan)?/i);
  if (underMatch) {
    let value = toVndNumber(underMatch[1]);
    if (underMatch[2] && /k|nghin|ngan/i.test(underMatch[2])) {
      value = Number(String(underMatch[1]).replace(/[,\.\s]/g, '')) * 1000;
    }
    return value ? { maxPrice: value } : null;
  }

  const overMatch = normalized.match(/(?:tren|>)\s*(\d+[\d\.,]*)\s*(tr|trieu|k|nghin|ngan)?/i);
  if (overMatch) {
    let value = toVndNumber(overMatch[1]);
    if (overMatch[2] && /k|nghìn|ngan/i.test(overMatch[2])) {
      value = Number(String(overMatch[1]).replace(/[,\.\s]/g, '')) * 1000;
    }
    return value ? { minPrice: value } : null;
  }

  const betweenMatch = normalized.match(/(?:tu)\s*(\d+[\d\.,]*)\s*(?:den|-|toi)\s*(\d+[\d\.,]*)\s*(tr|trieu|k|nghin|ngan)?/i);
  if (betweenMatch) {
    let minValue = toVndNumber(betweenMatch[1]);
    let maxValue = toVndNumber(betweenMatch[2]);
    if (betweenMatch[3] && /k|nghìn|ngan/i.test(betweenMatch[3])) {
      minValue = Number(String(betweenMatch[1]).replace(/[,\.\s]/g, '')) * 1000;
      maxValue = Number(String(betweenMatch[2]).replace(/[,\.\s]/g, '')) * 1000;
    }

    if (minValue && maxValue) {
      return minValue <= maxValue
        ? { minPrice: minValue, maxPrice: maxValue }
        : { minPrice: maxValue, maxPrice: minValue };
    }
  }

  const aroundMatch = normalized.match(/(?:khoang|tam|muc|gia)\s*(\d+[\d\.,]*)\s*(tr|trieu|k|nghin|ngan)?/i);
  if (aroundMatch) {
    let value = toVndNumber(aroundMatch[1]);
    if (aroundMatch[2] && /k|nghin|ngan/i.test(aroundMatch[2])) {
      value = Number(String(aroundMatch[1]).replace(/[,\.\s]/g, '')) * 1000;
    }

    if (value) {
      const delta = Math.max(500000, Math.round(value * 0.2));
      return { minPrice: Math.max(0, value - delta), maxPrice: value + delta };
    }
  }
  const exactValueMatch = normalized.match(/\b(\d+[\d\.,]*)\s*(tr|trieu|k|nghin|ngan)\b/i);
  if (exactValueMatch) {
    let value = toVndNumber(exactValueMatch[1]);
    if (exactValueMatch[2] && /k|nghin|ngan/i.test(exactValueMatch[2])) {
      value = Number(String(exactValueMatch[1]).replace(/[,\.\s]/g, '')) * 1000;
    }

    if (value) {
      const delta = Math.max(500000, Math.round(value * 0.2));
      return { minPrice: Math.max(0, value - delta), maxPrice: value + delta };
    }
  }

  return null;
};

const findProductsByPriceRange = async (message) => {
  const normalized = normalizeText(message);
  if (!containsAny(normalized, ['gia', 'trieu', 'k', 'nghin', 'ngan', 'duoi', 'tren', 'tu', 'den', 'khoang', 'tam'])) {
    return null;
  }

  const range = findPriceRangeFromMessage(normalized);
  if (!range) {
    return null;
  }

  const poolData = await ProductModel.getAll({ page: 1, limit: 500 });
  const products = Array.isArray(poolData?.products) ? poolData.products : [];

  const filtered = products.filter((p) => {
    const price = Number(p.price ?? p.Price ?? 0);
    if (range.minPrice && price < range.minPrice) return false;
    if (range.maxPrice && price > range.maxPrice) return false;
    return true;
  });

  if (filtered.length === 0) {
    if (range.minPrice && range.maxPrice) {
      return `Hiện mình chưa thấy sản phẩm trong khoảng ${formatCurrency(range.minPrice)} - ${formatCurrency(range.maxPrice)}.`;
    }
    if (range.minPrice) {
      return `Hiện mình chưa thấy sản phẩm từ ${formatCurrency(range.minPrice)} trở lên.`;
    }
    return `Hiện mình chưa thấy sản phẩm dưới ${formatCurrency(range.maxPrice)}.`;
  }

  const ranked = filtered
    .map((p) => {
      const price = Number(p.price ?? p.Price ?? 0);
      const center = range.minPrice && range.maxPrice
        ? (range.minPrice + range.maxPrice) / 2
        : (range.maxPrice || range.minPrice || price);
      return {
        p,
        distance: Math.abs(price - center)
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);

  const lines = ranked.map(({ p }, index) => {
    const name = p.product_name || p.ProductName || 'Sản phẩm';
    const price = Number(p.price ?? p.Price ?? 0);
    const stock = Number(p.stock_quantity ?? p.Stock ?? 0);
    return `${index + 1}. ${name} - ${formatCurrency(price)} (còn ${stock})`;
  });

  return `Mình tìm được ${filtered.length} sản phẩm theo khoảng giá bạn cần:\n${lines.join('\n')}\n\nBạn muốn mình lọc thêm theo danh mục (laptop, PC, màn hình...) để sát nhu cầu hơn không?`;
};

const buildCatalogContext = async (message) => {
  const normalized = normalizeText(message);
  const keyword = normalized
    .replace(/tim|goi y|san pham|mua|giup|cho|minh|em|anh|voi|khoang|gia|duoi|tren|tu|den/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const [categories, productsByKeyword] = await Promise.all([
    CategoryModel.getAll().catch(() => []),
    keyword ? ProductModel.search(keyword).catch(() => []) : Promise.resolve([])
  ]);

  const categoryLine = Array.isArray(categories) && categories.length > 0
    ? `Danh mục hiện có: ${categories.slice(0, 10).map((c) => c.category_name || c.CategoryName).filter(Boolean).join(', ')}`
    : 'Danh mục hiện có: chưa rõ';

  const productLines = Array.isArray(productsByKeyword) && productsByKeyword.length > 0
    ? productsByKeyword.slice(0, 5).map((p, idx) => {
      const name = p.product_name || p.ProductName || 'Sản phẩm';
      const price = Number(p.price ?? p.Price ?? 0);
      const stock = Number(p.stock_quantity ?? p.Stock ?? 0);
      return `${idx + 1}. ${name} - ${formatCurrency(price)} - tồn ${stock}`;
    })
    : [];

  const contextBlocks = [
    'DỮ LIỆU CATALOG NỘI BỘ (ưu tiên thông tin này khi tư vấn):',
    categoryLine
  ];

  if (productLines.length > 0) {
    contextBlocks.push('Sản phẩm gần khớp với câu hỏi:');
    contextBlocks.push(productLines.join('\n'));
  }

  return contextBlocks.join('\n');
};

const buildSystemPrompt = () => {
  return [
    'Bạn là trợ lý bán hàng cho website thương mại điện tử.',
    'Luôn trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, ưu tiên hành động cụ thể.',
    'Không bịa thông tin về chính sách, tồn kho hay đơn hàng.',
    'Nếu thiếu dữ liệu, hãy nói rõ và đề xuất cách kiểm tra trong hệ thống.'
  ].join(' ');
};

const callGemini = async (message, history = [], contextText = '') => {
  const apiKey = config.ai.geminiApiKey;
  if (!apiKey) {
    return null;
  }

  if (typeof fetch !== 'function') {
    return null;
  }

  const model = config.ai.geminiModel || 'gemini-1.5-flash';
  const recentHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
  const historyParts = recentHistory
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map((m) => `${m.role === 'assistant' ? 'Trợ lý' : 'Khách hàng'}: ${String(m.content).slice(0, 1200)}`);

  const prompt = [
    buildSystemPrompt(),
    contextText,
    ...historyParts,
    `Khách hàng: ${message}`,
    'Trợ lý:'
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 300
      },
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API error:', response.status, errorBody);
    return null;
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) => part?.text || '')
    .join('')
    .trim();

  return text || null;
};

const callOpenAI = async (message, history = [], contextText = '') => {
  const apiKey = config.ai.openaiApiKey;
  if (!apiKey) {
    return null;
  }

  if (typeof fetch !== 'function') {
    return 'Server chưa hỗ trợ fetch runtime để gọi AI. Bạn có thể cập nhật Node.js lên phiên bản mới hơn hoặc dùng FAQ nội bộ.';
  }

  const recentHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...(contextText ? [{ role: 'system', content: contextText.slice(0, 3000) }] : []),
    ...recentHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1200) })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.ai.openaiModel,
      temperature: 0.4,
      max_tokens: 300,
      messages
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API error:', response.status, errorBody);
    return null;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
};

const askChatbot = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung câu hỏi không hợp lệ'
      });
    }

    const cleanMessage = message.trim().slice(0, 1200);
    const faqAnswer = findFaqAnswer(cleanMessage);
    if (faqAnswer) {
      return res.json({
        success: true,
        data: {
          answer: faqAnswer,
          source: 'faq'
        }
      });
    }

    const priceAnswer = await findProductsByPriceRange(cleanMessage);
    if (priceAnswer) {
      return res.json({
        success: true,
        data: {
          answer: priceAnswer,
          source: 'price-filter'
        }
      });
    }

    const productAnswer = await findProductsFromMessage(cleanMessage);
    if (productAnswer) {
      return res.json({
        success: true,
        data: {
          answer: productAnswer,
          source: 'catalog'
        }
      });
    }

    const websiteDataAnswer = await findWebsiteDataAnswer(cleanMessage);
    if (websiteDataAnswer) {
      return res.json({
        success: true,
        data: {
          answer: websiteDataAnswer,
          source: 'website-data'
        }
      });
    }

    const categoryAnswer = await findCategoryAnswer(cleanMessage);
    if (categoryAnswer) {
      return res.json({
        success: true,
        data: {
          answer: categoryAnswer,
          source: 'category'
        }
      });
    }

    const latestInStockAnswer = await findLatestInStockProductsAnswer(cleanMessage);
    if (latestInStockAnswer) {
      return res.json({
        success: true,
        data: {
          answer: latestInStockAnswer,
          source: 'latest-in-stock'
        }
      });
    }

    const catalogContext = await buildCatalogContext(cleanMessage);

    let aiAnswer = null;
    let aiSource = null;
    const provider = String(config.ai.provider || '').toLowerCase();

    if (provider === 'openai') {
      aiAnswer = await callOpenAI(cleanMessage, history, catalogContext);
      if (aiAnswer) aiSource = 'ai-openai';
      if (!aiAnswer) {
        aiAnswer = await callGemini(cleanMessage, history, catalogContext);
        if (aiAnswer) aiSource = 'ai-gemini';
      }
    } else {
      aiAnswer = await callGemini(cleanMessage, history, catalogContext);
      if (aiAnswer) aiSource = 'ai-gemini';
      if (!aiAnswer) {
        aiAnswer = await callOpenAI(cleanMessage, history, catalogContext);
        if (aiAnswer) aiSource = 'ai-openai';
      }
    }

    if (aiAnswer) {
      return res.json({
        success: true,
        data: {
          answer: aiAnswer,
          source: aiSource || 'ai'
        }
      });
    }

    return res.json({
      success: true,
      data: {
        answer: 'Xin lỗi bạn, mình chưa đủ dữ liệu để trả lời thật chính xác cho câu hỏi này. Bạn có thể chọn một hướng bên dưới để mình tư vấn đúng dữ liệu trên website nhé.',
        source: 'fallback',
        suggestions: getFallbackChoices()
      }
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý chatbot: ' + error.message
    });
  }
};

module.exports = {
  askChatbot
};
