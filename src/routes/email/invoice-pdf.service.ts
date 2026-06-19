import { Injectable } from '@nestjs/common';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export interface InvoiceData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  shopName: string;
  deliveredAt: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  shippingFee: number;
  vatAmount: number;
  vatRate: number;
  finalAmount: number;
  paymentMethod: string;
}

@Injectable()
export class InvoicePdfService {
  async generate(data: InvoiceData): Promise<Buffer> {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.buildHtml(data), { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private fmt(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' ₫';
  }

  private formatPayment(method: string): string {
    const map: Record<string, string> = {
      COD: 'Thanh toán khi nhận hàng',
      BANK_TRANSFER: 'Chuyển khoản ngân hàng',
      E_WALLET: 'Ví điện tử',
      CREDIT_CARD: 'Thẻ tín dụng',
    };
    return map[method] ?? method;
  }

  private buildHtml(data: InvoiceData): string {
    const itemRows = data.items
      .map(
        (item, i) => `
      <tr class="${i % 2 === 0 ? 'row-even' : ''}">
        <td class="product-name">${item.productName}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${this.fmt(item.unitPrice)}</td>
        <td class="right bold">${this.fmt(item.totalPrice)}</td>
      </tr>`,
      )
      .join('');

    const vatRow =
      data.vatAmount > 0
        ? `<tr>
            <td colspan="3" class="summary-label">VAT (${data.vatRate}%)</td>
            <td class="summary-value">${this.fmt(data.vatAmount)}</td>
           </tr>`
        : '';

    const shippingDisplay =
      data.shippingFee > 0
        ? `<span>${this.fmt(data.shippingFee)}</span>`
        : `<span class="free">Miễn phí</span>`;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body { height: 297mm; }
  body {
    font-family: 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    display: flex;
    flex-direction: column;
  }
  .content-wrap { flex: 1; }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
    padding: 32px 48px 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 5px;
    background: #f55319;
  }
  .header::after {
    content: '';
    position: absolute;
    right: -60px; top: -60px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(245, 83, 25, 0.08);
  }

  .brand { position: relative; z-index: 1; }
  .brand-name {
    font-size: 28px;
    font-weight: 700;
    color: #f55319;
    letter-spacing: -0.5px;
  }
  .brand-name span { color: #fff; }
  .invoice-label {
    font-size: 11px;
    font-weight: 400;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0;
    margin-top: 4px;
  }
  .order-badge {
    display: inline-block;
    margin-top: 10px;
    background: #f55319;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 0.5px;
  }

  .header-right {
    text-align: right;
    position: relative;
    z-index: 1;
  }
  .header-right .date {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
  }
  .header-right .date-label {
    font-size: 10px;
    color: rgba(255,255,255,0.45);
    margin-top: 3px;
    letter-spacing: 0;
  }
  .status-badge {
    display: inline-block;
    margin-top: 12px;
    background: rgba(16, 185, 83, 0.2);
    border: 1px solid rgba(16, 185, 83, 0.4);
    color: #10b953;
    font-size: 10px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 20px;
    letter-spacing: 0;
  }

  /* ── Info cards ── */
  .info-section {
    display: flex;
    gap: 16px;
    padding: 28px 48px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
  }
  .info-card {
    flex: 1;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 10px;
    padding: 16px 20px;
    position: relative;
    overflow: hidden;
  }
  .info-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: #f55319;
    border-radius: 3px 0 0 3px;
  }
  .info-card .card-label {
    font-size: 10px;
    font-weight: 700;
    color: #f55319;
    letter-spacing: 0;
    margin-bottom: 8px;
  }
  .info-card .card-name {
    font-size: 14px;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 3px;
  }
  .info-card .card-sub {
    font-size: 11px;
    color: #888;
  }

  /* ── Items table ── */
  .table-section {
    padding: 0 48px 24px;
  }
  .table-title {
    font-size: 12px;
    font-weight: 700;
    color: #555;
    letter-spacing: 0;
    padding: 20px 0 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead tr {
    background: #1a1a2e;
  }
  thead td {
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0;
    padding: 10px 12px;
  }
  thead td:first-child {
    border-radius: 0;
    border-left: 3px solid #f55319;
    padding-left: 16px;
  }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr.row-even { background: #fafafa; }
  tbody td {
    padding: 11px 12px;
    font-size: 12px;
    color: #333;
    vertical-align: middle;
  }
  tbody td.product-name {
    padding-left: 16px;
    color: #1a1a2e;
  }
  td.center { text-align: center; }
  td.right { text-align: right; }
  td.bold { font-weight: 700; color: #1a1a2e; }

  /* ── Summary ── */
  .summary-section {
    display: flex;
    justify-content: flex-end;
    padding: 0 48px 28px;
  }
  .summary-box {
    width: 260px;
  }
  .summary-box table { border-collapse: collapse; }
  .summary-box td { padding: 7px 0; font-size: 12px; }
  .summary-box td.summary-label { color: #888; }
  .summary-box td.summary-value {
    text-align: right;
    color: #333;
    font-weight: 500;
  }
  .summary-box td.free { text-align: right; color: #10b953; font-weight: 600; }
  .summary-divider td { border-top: 1px solid #e8e8e8; padding-top: 10px; }
  .total-row td {
    padding: 12px 14px !important;
    font-size: 13px;
    font-weight: 700;
    color: #fff !important;
    background: #f55319;
  }
  .total-row td:first-child { border-radius: 8px 0 0 8px; }
  .total-row td:last-child {
    text-align: right;
    border-radius: 0 8px 8px 0;
    font-size: 15px;
  }

  /* ── Payment & Footer ── */
  .payment-section {
    padding: 0 48px 32px;
  }
  .payment-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 11px;
    color: #555;
  }
  .payment-badge .payment-icon {
    width: 20px; height: 20px;
    background: #f55319;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 10px; font-weight: bold;
  }
  .payment-badge .payment-label { font-size: 9px; color: #aaa; display: block; }
  .payment-badge .payment-value { font-weight: 600; color: #333; display: block; }

  .footer {
    background: #1a1a2e;
    padding: 16px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
  }
  .footer::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 5px;
    background: #f55319;
  }
  .footer-left {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
  }
  .footer-left span {
    color: #f55319;
    font-weight: 700;
  }
  .footer-right {
    font-size: 10px;
    color: rgba(255,255,255,0.3);
  }
  .free { color: #10b953 !important; font-weight: 600; }
</style>
</head>
<body>
<div class="content-wrap">

<!-- Header -->
<div class="header">
  <div class="brand">
    <div class="brand-name">Shop<span>VN</span></div>
    <div class="invoice-label">Hóa đơn bán hàng</div>
    <div class="order-badge">#${data.orderId}</div>
  </div>
  <div class="header-right">
    <div class="date">${data.deliveredAt}</div>
    <div class="date-label">Ngày giao hàng</div>
    <div class="status-badge">✓ Đã giao</div>
  </div>
</div>

<!-- From / To -->
<div class="info-section">
  <div class="info-card">
    <div class="card-label">Từ</div>
    <div class="card-name">${data.shopName}</div>
    <div class="card-sub">Người bán hàng</div>
  </div>
  <div class="info-card">
    <div class="card-label">Đến</div>
    <div class="card-name">${data.customerName}</div>
    <div class="card-sub">${data.customerEmail}</div>
  </div>
</div>

<!-- Items -->
<div class="table-section">
  <div class="table-title">Chi tiết đơn hàng</div>
  <table>
    <thead>
      <tr>
        <td style="width:50%">Sản phẩm</td>
        <td class="center" style="width:10%">SL</td>
        <td class="right" style="width:20%">Đơn giá</td>
        <td class="right" style="width:20%">Thành tiền</td>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>
</div>

<!-- Summary -->
<div class="summary-section">
  <div class="summary-box">
    <table>
      <tr>
        <td class="summary-label">Tạm tính</td>
        <td class="summary-value">${this.fmt(data.totalAmount)}</td>
      </tr>
      <tr>
        <td class="summary-label">Phí vận chuyển</td>
        <td>${data.shippingFee > 0 ? `<span class="summary-value">${this.fmt(data.shippingFee)}</span>` : `<span class="free" style="display:block;text-align:right">Miễn phí</span>`}</td>
      </tr>
      ${vatRow}
      <tr class="summary-divider"><td colspan="2"></td></tr>
      <tr class="total-row">
        <td>Tổng cộng</td>
        <td>${this.fmt(data.finalAmount)}</td>
      </tr>
    </table>
  </div>
</div>

<!-- Payment -->
<div class="payment-section">
  <div class="payment-badge">
    <div class="payment-icon">₫</div>
    <div>
      <span class="payment-label">Phương thức thanh toán</span>
      <span class="payment-value">${this.formatPayment(data.paymentMethod)}</span>
    </div>
  </div>
</div>

</div><!-- end content-wrap -->

<!-- Footer -->
<div class="footer">
  <div class="footer-left">
    Cảm ơn bạn đã mua hàng tại <span>ShopVN</span>!
  </div>
  <div class="footer-right">shopvn.com</div>
</div>

</body>
</html>`;
  }
}
