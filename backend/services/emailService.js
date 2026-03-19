/**
 * Email Service
 * Service gửi email thông báo
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

const EMAIL_QUEUE_MAX_RETRIES = 3;
const EMAIL_QUEUE_RETRY_DELAY_MS = 8000;
const EMAIL_QUEUE_POLL_INTERVAL_MS = 1200;

const emailQueue = [];
let queueProcessing = false;

/**
 * Tạo transporter để gửi email
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Gửi email xác nhận đơn hàng
 * @param {Object} order - Thông tin đơn hàng
 */
const sendOrderConfirmation = async (order) => {
  try {
    const transporter = createTransporter();
    
    // Tạo nội dung HTML cho email
    const emailHTML = generateOrderEmailHTML(order);
    
    // Cấu hình email
    const mailOptions = {
      from: `"E-Commerce Store" <${config.email.from}>`,
      to: order.Email,
      subject: `Xác nhận đơn hàng #${order.OrderId}`,
      html: emailHTML
    };
    
    // Gửi email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email đã được gửi:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    throw error;
  }
};

/**
 * Tạo HTML cho email đơn hàng
 * @param {Object} order - Thông tin đơn hàng
 * @returns {string} HTML content
 */
const generateOrderEmailHTML = (order) => {
  // Format ngày
  const orderDate = new Date(order.OrderDate).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Format tiền
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  // Tạo bảng sản phẩm
  let productsHTML = '';
  order.Items.forEach(item => {
    productsHTML += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.ProductName}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.Quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ${formatMoney(item.Price)}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          <strong>${formatMoney(item.Quantity * item.Price)}</strong>
        </td>
      </tr>
    `;
  });
  
  // HTML template
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận đơn hàng</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Cảm ơn bạn đã đặt hàng!</h1>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 20px; margin-top: 20px;">
        <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
          Thông tin đơn hàng #${order.OrderId}
        </h2>
        
        <div style="margin: 20px 0;">
          <p><strong>Khách hàng:</strong> ${order.FullName}</p>
          <p><strong>Email:</strong> ${order.Email}</p>
          <p><strong>Số điện thoại:</strong> ${order.Phone}</p>
          <p><strong>Địa chỉ giao hàng:</strong> ${order.ShippingAddress}</p>
          <p><strong>Ngày đặt hàng:</strong> ${orderDate}</p>
          <p><strong>Trạng thái:</strong> <span style="color: #ff9800;">${order.Status}</span></p>
        </div>
        
        <h3 style="color: #4CAF50; margin-top: 30px;">Chi tiết đơn hàng:</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white;">
          <thead>
            <tr style="background-color: #4CAF50; color: white;">
              <th style="padding: 10px; text-align: left;">Sản phẩm</th>
              <th style="padding: 10px; text-align: center;">Số lượng</th>
              <th style="padding: 10px; text-align: right;">Đơn giá</th>
              <th style="padding: 10px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${productsHTML}
          </tbody>
          <tfoot>
            <tr style="background-color: #f0f0f0;">
              <td colspan="3" style="padding: 15px; text-align: right;">
                <strong style="font-size: 18px;">Tổng cộng:</strong>
              </td>
              <td style="padding: 15px; text-align: right;">
                <strong style="font-size: 20px; color: #4CAF50;">
                  ${formatMoney(order.TotalAmount)}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Hình thức thanh toán:</strong> Thanh toán khi nhận hàng (COD)</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
          <p>Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ với bạn sớm nhất có thể.</p>
          <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
        </div>
      </div>
      
      <div style="background-color: #333; color: white; padding: 20px; margin-top: 20px; text-align: center;">
        <p style="margin: 0;">© 2026 E-Commerce Store. All rights reserved.</p>
        <p style="margin: 10px 0 0 0; font-size: 12px;">
          Email này được gửi tự động, vui lòng không trả lời.
        </p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Gửi email thông báo (dùng cho các mục đích khác)
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML
 */
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"E-Commerce Store" <${config.email.from}>`,
      to,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email đã được gửi:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    throw error;
  }
};

/**
 * Thêm email vào hàng đợi gửi nền
 */
const enqueueEmail = ({ to, subject, html, meta = {} }) => {
  if (!to || !subject || !html) {
    throw new Error('Thiếu dữ liệu để đưa email vào hàng đợi');
  }

  const job = {
    id: Date.now() + '-' + Math.round(Math.random() * 1e9),
    to,
    subject,
    html,
    meta,
    retries: 0,
    nextAttemptAt: Date.now(),
    createdAt: new Date().toISOString()
  };

  emailQueue.push(job);
  return {
    queued: true,
    jobId: job.id
  };
};

const processEmailQueue = async () => {
  if (queueProcessing || emailQueue.length === 0) {
    return;
  }

  const now = Date.now();
  const nextJobIndex = emailQueue.findIndex((job) => job.nextAttemptAt <= now);
  if (nextJobIndex === -1) {
    return;
  }

  const job = emailQueue[nextJobIndex];
  queueProcessing = true;

  try {
    await sendEmail(job.to, job.subject, job.html);
    emailQueue.splice(nextJobIndex, 1);
  } catch (error) {
    job.retries += 1;
    if (job.retries > EMAIL_QUEUE_MAX_RETRIES) {
      console.error('Email queue drop job after max retries:', {
        jobId: job.id,
        to: job.to,
        meta: job.meta,
        error: error.message
      });
      emailQueue.splice(nextJobIndex, 1);
    } else {
      job.nextAttemptAt = Date.now() + EMAIL_QUEUE_RETRY_DELAY_MS * job.retries;
      console.warn('Email queue retry scheduled:', {
        jobId: job.id,
        retries: job.retries,
        nextAttemptAt: new Date(job.nextAttemptAt).toISOString(),
        error: error.message
      });
    }
  } finally {
    queueProcessing = false;
  }
};

setInterval(() => {
  processEmailQueue().catch((error) => {
    console.error('Email queue processor error:', error.message);
  });
}, EMAIL_QUEUE_POLL_INTERVAL_MS);

/**
 * Lấy thống kê hàng đợi email cho monitoring
 */
const getEmailQueueMetrics = () => {
  return {
    queuedCount: emailQueue.length,
    processing: queueProcessing,
    oldestQueuedAt: emailQueue.length > 0 ? emailQueue[0].createdAt : null
  };
};

/**
 * Gửi email khi admin xác nhận đơn hàng
 * @param {Object} order - Thông tin đơn hàng
 */
const sendOrderApprovedEmail = async (order) => {
  const orderId = order?.OrderId;
  const email = order?.Email;
  const fullName = order?.FullName || 'Khách hàng';

  if (!orderId || !email) {
    throw new Error('Thiếu dữ liệu để gửi email xác nhận đơn hàng');
  }

  const orderDate = order?.OrderDate
    ? new Date(order.OrderDate).toLocaleString('vi-VN')
    : new Date().toLocaleString('vi-VN');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0; padding: 16px 20px; background: #16a34a; color: #fff; border-radius: 8px 8px 0 0;">
        Don hang #${orderId} da duoc xac nhan
      </h2>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
        <p>Chao <strong>${fullName}</strong>,</p>
        <p>Shop da xac nhan don hang cua ban va se tien hanh dong goi trong thoi gian som nhat.</p>
        <p><strong>Thong tin nhanh:</strong></p>
        <ul>
          <li>Ma don: #${orderId}</li>
          <li>Ngay dat: ${orderDate}</li>
          <li>Trang thai: Da xac nhan</li>
        </ul>
        <p>Cam on ban da mua hang tai shop. Neu can ho tro, ban vui long lien he CSKH.</p>
      </div>
    </div>
  `;

  return sendEmail(email, `Don hang #${orderId} da duoc xac nhan`, html);
};

const enqueueOrderConfirmation = (order) => {
  if (!order?.Email || !order?.OrderId) {
    throw new Error('Thiếu dữ liệu đơn hàng để queue email xác nhận');
  }

  const emailHTML = generateOrderEmailHTML(order);
  return enqueueEmail({
    to: order.Email,
    subject: `Xác nhận đơn hàng #${order.OrderId}`,
    html: emailHTML,
    meta: {
      type: 'order-confirmation',
      orderId: order.OrderId
    }
  });
};

const enqueueOrderApprovedEmail = (order) => {
  const orderId = order?.OrderId;
  const email = order?.Email;
  const fullName = order?.FullName || 'Khách hàng';

  if (!orderId || !email) {
    throw new Error('Thiếu dữ liệu để queue email xác nhận đơn hàng');
  }

  const orderDate = order?.OrderDate
    ? new Date(order.OrderDate).toLocaleString('vi-VN')
    : new Date().toLocaleString('vi-VN');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0; padding: 16px 20px; background: #16a34a; color: #fff; border-radius: 8px 8px 0 0;">
        Don hang #${orderId} da duoc xac nhan
      </h2>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
        <p>Chao <strong>${fullName}</strong>,</p>
        <p>Shop da xac nhan don hang cua ban va se tien hanh dong goi trong thoi gian som nhat.</p>
        <p><strong>Thong tin nhanh:</strong></p>
        <ul>
          <li>Ma don: #${orderId}</li>
          <li>Ngay dat: ${orderDate}</li>
          <li>Trang thai: Da xac nhan</li>
        </ul>
        <p>Cam on ban da mua hang tai shop. Neu can ho tro, ban vui long lien he CSKH.</p>
      </div>
    </div>
  `;

  return enqueueEmail({
    to: email,
    subject: `Don hang #${orderId} da duoc xac nhan`,
    html,
    meta: {
      type: 'order-approved',
      orderId
    }
  });
};

/**
 * Gửi email khuyến mãi cho 1 khách hàng
 * @param {Object} recipient - Người nhận
 * @param {Object} payload - Nội dung chiến dịch
 */
const sendPromotionEmail = async (recipient, payload) => {
  const email = recipient?.Email || recipient?.email;
  const name = recipient?.FullName || recipient?.full_name || 'ban';

  if (!email) {
    throw new Error('Nguoi nhan khong co email hop le');
  }

  const {
    subject,
    content,
    couponCode,
    ctaUrl,
    ctaText,
    expiresAt
  } = payload;

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleDateString('vi-VN')
    : null;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #111827; line-height: 1.6;">
      <div style="padding: 18px 20px; background: linear-gradient(135deg, #ef4444, #f97316); color: #fff; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">Uu dai danh cho ban</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p>Xin chao <strong>${name}</strong>,</p>
        <p>${content}</p>
        ${couponCode ? `<p style="font-size: 16px;">Ma khuyen mai: <strong style="color:#dc2626;">${couponCode}</strong></p>` : ''}
        ${expiryText ? `<p>Han su dung: <strong>${expiryText}</strong></p>` : ''}
        ${ctaUrl ? `<p><a href="${ctaUrl}" style="display:inline-block; background:#111827; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px;">${ctaText || 'Mua ngay'}</a></p>` : ''}
        <p style="margin-top: 16px; color:#6b7280; font-size: 12px;">Email nay duoc gui tu dong tu he thong khuyen mai.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
};

/**
 * Gửi email khuyến mãi hàng loạt theo danh sách người nhận
 * @param {Array} recipients - Danh sách khách hàng
 * @param {Object} payload - Nội dung chiến dịch
 */
const sendPromotionCampaign = async (recipients = [], payload = {}) => {
  const jobs = recipients.map((recipient) => sendPromotionEmail(recipient, payload));
  const results = await Promise.allSettled(jobs);

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results
    .map((result, index) => ({ result, recipient: recipients[index] }))
    .filter((item) => item.result.status === 'rejected')
    .map((item) => ({
      email: item.recipient?.Email || item.recipient?.email || null,
      error: item.result.reason?.message || 'Unknown error'
    }));

  return {
    total: recipients.length,
    successCount,
    failedCount: failed.length,
    failed
  };
};

const enqueuePromotionCampaign = (recipients = [], payload = {}) => {
  const failed = [];
  let queuedCount = 0;

  for (const recipient of recipients) {
    try {
      const email = recipient?.Email || recipient?.email;
      const name = recipient?.FullName || recipient?.full_name || 'ban';
      if (!email) {
        throw new Error('Nguoi nhan khong co email hop le');
      }

      const {
        subject,
        content,
        couponCode,
        ctaUrl,
        ctaText,
        expiresAt
      } = payload;

      const expiryText = expiresAt
        ? new Date(expiresAt).toLocaleDateString('vi-VN')
        : null;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #111827; line-height: 1.6;">
          <div style="padding: 18px 20px; background: linear-gradient(135deg, #ef4444, #f97316); color: #fff; border-radius: 10px 10px 0 0;">
            <h2 style="margin: 0;">Uu dai danh cho ban</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p>Xin chao <strong>${name}</strong>,</p>
            <p>${content}</p>
            ${couponCode ? `<p style="font-size: 16px;">Ma khuyen mai: <strong style="color:#dc2626;">${couponCode}</strong></p>` : ''}
            ${expiryText ? `<p>Han su dung: <strong>${expiryText}</strong></p>` : ''}
            ${ctaUrl ? `<p><a href="${ctaUrl}" style="display:inline-block; background:#111827; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px;">${ctaText || 'Mua ngay'}</a></p>` : ''}
            <p style="margin-top: 16px; color:#6b7280; font-size: 12px;">Email nay duoc gui tu dong tu he thong khuyen mai.</p>
          </div>
        </div>
      `;

      enqueueEmail({
        to: email,
        subject: payload.subject,
        html,
        meta: {
          type: 'promotion-campaign',
          recipientEmail: email
        }
      });
      queuedCount += 1;
    } catch (error) {
      failed.push({
        email: recipient?.Email || recipient?.email || null,
        error: error.message
      });
    }
  }

  return {
    total: recipients.length,
    queuedCount,
    failedCount: failed.length,
    failed
  };
};

module.exports = {
  sendOrderConfirmation,
  sendEmail,
  sendOrderApprovedEmail,
  sendPromotionEmail,
  sendPromotionCampaign,
  enqueueEmail,
  enqueueOrderConfirmation,
  enqueueOrderApprovedEmail,
  enqueuePromotionCampaign,
  getEmailQueueMetrics
};
