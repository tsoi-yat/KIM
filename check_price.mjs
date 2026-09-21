import nodemailer from 'nodemailer';
import fs from 'fs';

const PRODUCT_ID = 'u0000000052984';
const BASE_PRICE = 1290;
const RECIPIENTS = ['Kim.tsoiyat@gmail.com', 'taiwan781020@gapp.nthu.edu.tw'];
const STATE_FILE = 'last_price.json';

async function checkPrice() {
  const forceSend = process.env.FORCE_SEND === 'true';
  const apiUrl = `https://d.uniqlo.com/tw/h/product/detail?productCode=${PRODUCT_ID}&distribution=EXPRESS&type=DETAIL`;

  console.log(`[${new Date().toISOString()}] 開始檢查 UNIQLO 商品價格 (PID: ${PRODUCT_ID})...`);

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Referer': `https://m.uniqlo.com/tw/product?pid=${PRODUCT_ID}`,
      'Origin': 'https://m.uniqlo.com'
    }
  });

  if (!response.ok) {
    throw new Error(`UNIQLO API 請求失敗，狀態碼: ${response.status}`);
  }

  const data = await response.json();
  const summary = data?.resp?.[0]?.spuInfo?.summary;
  if (!summary) {
    throw new Error('未取得商品資料，API 回傳格式異常');
  }

  const currentPrice = Number(summary.minPrice ?? summary.originPrice ?? BASE_PRICE);
  const productName = summary.fullName || summary.name || '男裝 合身直筒牛仔褲 482856';
  const productCode = summary.code || '482856';
  const productUrl = `https://m.uniqlo.com/tw/product?pid=${PRODUCT_ID}`;

  console.log(`商品名稱: ${productName}`);
  console.log(`貨號: ${productCode}`);
  console.log(`目前售價: NT$ ${currentPrice} (原基準售價: NT$ ${BASE_PRICE})`);

  let lastState = { lastNotifiedPrice: null, lastCheckedAt: null };
  if (fs.existsSync(STATE_FILE)) {
    try {
      lastState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch (e) {
      console.warn('讀取舊狀態失敗，將重新建立狀態檔');
    }
  }

  const isDiscounted = currentPrice < BASE_PRICE;
  const isNewDiscount = isDiscounted && (lastState.lastNotifiedPrice !== currentPrice);

  if (forceSend) {
    console.log('⚡ 觸發強制測試寄信模式 (FORCE_SEND)...');
    await sendEmail({
      productName,
      productCode,
      currentPrice,
      isTest: true,
      productUrl
    });
  } else if (isNewDiscount) {
    console.log(`🎉 偵測到降價！(NT$ ${currentPrice} < NT$ ${BASE_PRICE})，開始寄送信件通知...`);
    await sendEmail({
      productName,
      productCode,
      currentPrice,
      isTest: false,
      productUrl
    });
    lastState.lastNotifiedPrice = currentPrice;
  } else if (isDiscounted) {
    console.log(`商品目前處於特價狀態 (NT$ ${currentPrice})，上次已發送過通知，避免重複打擾。`);
  } else {
    console.log(`商品尚未降價 (目前價格 NT$ ${currentPrice})，暫不發送通知。`);
    lastState.lastNotifiedPrice = null;
  }

  lastState.lastCheckedAt = new Date().toISOString();
  lastState.currentPrice = currentPrice;
  fs.writeFileSync(STATE_FILE, JSON.stringify(lastState, null, 2), 'utf-8');
}

async function sendEmail({ productName, productCode, currentPrice, isTest, productUrl }) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    throw new Error('缺少 GMAIL_USER 或 GMAIL_APP_PASSWORD 環境變數！');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });

  const subject = isTest
    ? `【測試通知】UNIQLO 價格監控排程已啟動（目前價格：NT$ ${currentPrice}）`
    : `🔥【降價通知】UNIQLO ${productName} 降價特價中！只要 NT$ ${currentPrice}！`;

  const nowTaipei = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const html = `
    <div style="font-family: Arial, 'Microsoft JhengHei', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #ed1c24; color: #fff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 22px;">UNIQLO 商品價格通知</h2>
      </div>
      <div style="padding: 24px; color: #333; line-height: 1.6;">
        ${isTest ? '<p style="padding: 10px 14px; background-color: #e8f4fd; border-left: 4px solid #1976d2; color: #0c5460; border-radius: 4px;">ℹ️ 這是一封測試信，表示您的 GitHub Actions 自動價格監控服務已設定成功並開始運作！</p>' : ''}
        <h3 style="margin-top: 0; color: #111;">${productName}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 100px;">商品貨號</td>
            <td style="padding: 8px 0; font-weight: bold;">${productCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">原售價</td>
            <td style="padding: 8px 0; text-decoration: line-through; color: #888;">NT$ ${BASE_PRICE}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">即時售價</td>
            <td style="padding: 8px 0; font-size: 24px; font-weight: bold; color: #ed1c24;">NT$ ${currentPrice}</td>
          </tr>
          ${currentPrice < BASE_PRICE ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">現省金額</td>
            <td style="padding: 8px 0; font-weight: bold; color: #2e7d32;">省下 NT$ ${BASE_PRICE - currentPrice} 元！</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px 0; color: #666;">檢查時間</td>
            <td style="padding: 8px 0; color: #666;">${nowTaipei} (台北時間)</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${productUrl}" style="background-color: #ed1c24; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">前往 UNIQLO 官網購買</a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999; margin: 0; text-align: center;">
          此信件由 GitHub Actions 自動價格監控機器人寄送。<br/>
          監控週期：每 2 小時檢查一次。
        </p>
      </div>
    </div>
  `;

  console.log(`寄送 Email 給: ${RECIPIENTS.join(', ')}...`);
  await transporter.sendMail({
    from: `"UNIQLO 價格監控" <${gmailUser}>`,
    to: RECIPIENTS.join(', '),
    subject: subject,
    html: html
  });

  console.log('✅ Email 寄送成功！');
}

checkPrice().catch(err => {
  console.error('執行過程發生錯誤:', err);
  process.exit(1);
});
