// ═══════════════════════════════════════════════════════════════════════
// Price Hunter v3.0 - Background Service Worker
// Viết lại siêu sạch sẽ, tối ưu hóa toàn bộ tiến trình:
// 1. INSTANT ACTION: Mở tab & Tự động mua ngay hoặc thêm giỏ hàng
// 2. SEARCH ENGINE: Tìm kiếm qua tên hoặc quét qua link trực tiếp
// 3. SNIPER ENGINE: Canh hàng mở bán với đếm ngược & turbo reload
// 4. TELEGRAM BOT: Thông báo tức thì kèm ảnh và link
// ═══════════════════════════════════════════════════════════════════════

// ─── Khởi tạo extension ───
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[PH-ServiceWorker] Installed/Updated v3.0');

  const data = await chrome.storage.local.get(['settings', 'stats', 'watchlist', 'telegram', 'sniper']);

  if (!data.settings) {
    await chrome.storage.local.set({
      settings: {
        enabled: true,
        autoClipCoupons: true,
        autoAddToCart: true,
        autoBuy: false,
        minDiscount: 30,
        maxPrice: 50,
        maxDailySpend: 200,
        checkInterval: 15
      }
    });
  }

  if (!data.stats) {
    await chrome.storage.local.set({
      stats: { dealsFound: 0, totalSaved: 0, couponsClipped: 0, totalPurchased: 0 }
    });
  }

  if (!data.watchlist) await chrome.storage.local.set({ watchlist: [] });
  if (!data.deals)     await chrome.storage.local.set({ deals: [] });
  if (!data.history)   await chrome.storage.local.set({ history: [] });

  chrome.alarms.create('checkWatchlist', { periodInMinutes: 15 });
});

// ─── Helpers: Chrome Notification ───
async function notify(title, message, url) {
  try {
    const notifId = 'ph-' + Date.now();
    await chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: title,
      message: message,
      priority: 2
    });

    if (url) {
      chrome.notifications.onClicked.addListener(function handler(id) {
        if (id === notifId) {
          chrome.tabs.create({ url });
          chrome.notifications.onClicked.removeListener(handler);
        }
      });
    }
  } catch (e) {
    console.error('[PH] Notification error:', e);
  }
}

// ─── Helpers: Telegram Bot ───
async function getTeleConfig() {
  const data = await chrome.storage.local.get(['telegram']);
  return data.telegram || {};
}

async function sendTelegram(text, cfg) {
  const tele = cfg || await getTeleConfig();
  if (!tele.connected || !tele.botToken || !tele.chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${tele.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tele.chatId, text: text, parse_mode: 'Markdown' })
    });
    const d = await res.json();
    return d.ok;
  } catch (e) {
    console.error('[PH] Telegram error:', e);
    return false;
  }
}

async function sendTelegramPhoto(photoUrl, caption, cfg) {
  const tele = cfg || await getTeleConfig();
  if (!tele.connected || !tele.botToken || !tele.chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${tele.botToken}/sendPhoto`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: tele.chatId,
        photo: photoUrl,
        caption: caption,
        parse_mode: 'Markdown'
      })
    });
    const d = await res.json();
    return d.ok;
  } catch (e) {
    return sendTelegram(caption, tele);
  }
}

// ═══════════════════════════════════════════════════════════════════
// TÍNH NĂNG 1: INSTANT ACTION (BẤM VÀO SẢN PHẨM → TỰ MUA / THÊM GIỎ)
// ═══════════════════════════════════════════════════════════════════
async function executeInstantActionOnUrl(url, mode) {
  console.log(`[PH] Instant Action: ${mode} cho URL: ${url}`);

  // Tạo tab mới và active
  const tab = await chrome.tabs.create({ url: url, active: true });

  // Đợi tab load xong
  const onComplete = (tabId, changeInfo) => {
    if (tabId === tab.id && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(onComplete);

      // Đợi thêm một chút để Amazon render Buy Box
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'EXECUTE_INSTANT_ACTION',
          mode: mode // 'buy' hoặc 'checkout'
        }).catch(err => {
          console.log('[PH] Gửi lệnh Instant Action:', err);
        });
      }, 1200);
    }
  };

  chrome.tabs.onUpdated.addListener(onComplete);
  return { success: true, tabId: tab.id };
}

// ═══════════════════════════════════════════════════════════════════
// TÍNH NĂNG 2: SEARCH ENGINE (TÌM THEO TÊN HOẶC LINK TRỰC TIẾP)
// ═══════════════════════════════════════════════════════════════════
async function searchByUrl(url) {
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: url, active: false });

    await new Promise((resolve) => {
      const listener = (tid, info) => {
        if (tid === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(resolve, 8000);
    });

    const isJp = /amazon\.co\.jp/i.test(url);
    const curr = isJp ? '¥' : '$';

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (currency) => {
        const title = document.getElementById('productTitle');
        const name = title ? title.textContent.trim() : document.title.split(':')[0].trim();

        let price = 0;
        const priceEls = document.querySelectorAll(
          '#corePriceDisplay_desktop_feature_div .a-offscreen, .apexPriceToPay .a-offscreen, .priceToPay .a-offscreen, #priceblock_ourprice, .a-price .a-offscreen'
        );
        for (const el of priceEls) {
          const m = (el.textContent || '').match(/[\d,.]+/);
          if (m) {
            price = parseFloat(m[0].replace(/,/g, ''));
            if (price > 0) break;
          }
        }

        let originalPrice = 0;
        const origEl = document.querySelector('.a-text-price .a-offscreen');
        if (origEl) {
          const m = (origEl.textContent || '').match(/[\d,.]+/);
          if (m) originalPrice = parseFloat(m[0].replace(/,/g, ''));
        }

        const imgEl = document.getElementById('landingImage') || document.getElementById('imgBlkFront') || {};
        const image = imgEl.src || '';
        const discount = originalPrice > price && originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;

        return [{
          name: name || 'Sản phẩm Amazon',
          price: price,
          originalPrice: originalPrice,
          discount: discount,
          image: image,
          currency: currency,
          url: location.href
        }];
      },
      args: [curr]
    });

    try { await chrome.tabs.remove(tab.id); } catch (e) {}

    if (results && results[0] && results[0].result) {
      return { success: true, results: results[0].result };
    }
    return { success: false, error: 'Không lấy được thông tin từ link này' };
  } catch (e) {
    if (tab) try { await chrome.tabs.remove(tab.id); } catch (err) {}
    return { success: false, error: e.message };
  }
}

async function searchByName(keyword) {
  let tab = null;
  try {
    const isJp = /[぀-ヿ㐀-䶿一-鿿]/.test(keyword) || /pokemon|japan|jp/i.test(keyword);
    const domain = isJp ? 'https://www.amazon.co.jp' : 'https://www.amazon.com';
    const curr = isJp ? '¥' : '$';
    const searchUrl = `${domain}/s?k=${encodeURIComponent(keyword)}`;

    tab = await chrome.tabs.create({ url: searchUrl, active: false });

    await new Promise((resolve) => {
      const listener = (tid, info) => {
        if (tid === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(resolve, 8000);
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (baseDomain, currency) => {
        const items = [];
        const cards = document.querySelectorAll('[data-asin]:not([data-asin=""])');

        cards.forEach((card) => {
          try {
            const titleEl = card.querySelector('h2 a span, h2 span, .a-size-medium, .a-size-base-plus');
            const name = titleEl ? titleEl.textContent.trim() : '';
            if (!name) return;

            const linkEl = card.querySelector('h2 a, a.a-link-normal[href*="/dp/"]');
            let href = linkEl ? linkEl.getAttribute('href') : '';
            if (href && !href.startsWith('http')) href = baseDomain + href;

            const priceEl = card.querySelector('.a-price .a-offscreen');
            let price = 0;
            if (priceEl) {
              const m = (priceEl.textContent || '').match(/[\d,.]+/);
              if (m) price = parseFloat(m[0].replace(/,/g, ''));
            }

            const origEl = card.querySelector('.a-text-price .a-offscreen');
            let orig = 0;
            if (origEl) {
              const m = (origEl.textContent || '').match(/[\d,.]+/);
              if (m) orig = parseFloat(m[0].replace(/,/g, ''));
            }

            const imgEl = card.querySelector('.s-image');
            const image = imgEl ? imgEl.src : '';

            const ratingEl = card.querySelector('.a-icon-alt');
            let rating = 0;
            if (ratingEl) {
              const m = ratingEl.textContent.match(/([\d.]+)/);
              if (m) rating = parseFloat(m[1]);
            }

            if (name && href && price > 0) {
              items.push({
                name,
                price,
                originalPrice: orig,
                discount: orig > price ? Math.round((1 - price / orig) * 100) : 0,
                image,
                rating,
                currency,
                url: href
              });
            }
          } catch (e) {}
        });

        return items.slice(0, 15);
      },
      args: [domain, curr]
    });

    try { await chrome.tabs.remove(tab.id); } catch (e) {}

    if (results && results[0] && results[0].result && results[0].result.length > 0) {
      const items = results[0].result;
      items.sort((a, b) => a.price - b.price);
      return { success: true, results: items };
    }
    return { success: false, error: 'Không tìm thấy sản phẩm phù hợp trên Amazon' };
  } catch (e) {
    if (tab) try { await chrome.tabs.remove(tab.id); } catch (err) {}
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// TÍNH NĂNG 3: SNIPER ENGINE (CANH MỞ BÁN / ĐẾM NGƯỢC / TURBO)
// ═══════════════════════════════════════════════════════════════════
let sniperIntervalTimer = null;

async function startSniper(task) {
  await stopSniper();

  console.log('[PH-Sniper] Bắt đầu phục kích:', task.url);
  const tab = await chrome.tabs.create({ url: task.url, active: true });

  const sniperState = {
    active: true,
    url: task.url,
    name: task.name || 'Sản phẩm Sniper',
    maxPrice: task.maxPrice || 0,
    priceCondition: task.priceCondition || 'lte',
    intervalSec: Math.max(1, task.intervalSec || 1),
    actionType: task.actionType || 'checkout',
    targetTime: task.targetTime || 0,
    tabId: tab.id,
    scanCount: 0,
    lastCheckTime: Date.now(),
    status: 'scanning'
  };

  await chrome.storage.local.set({ sniper: sniperState });

  let actLabel = 'Tự động mua 100%';
  if (sniperState.actionType === 'cart') actLabel = 'Tự thêm vào giỏ hàng';
  else if (sniperState.actionType === 'checkout') actLabel = 'Thêm giỏ & chuyển trang thanh toán';

  const isScheduled = sniperState.targetTime && sniperState.targetTime > Date.now();
  const timeDesc = isScheduled
    ? `⏰ Đã hẹn giờ mở bán: ${new Date(sniperState.targetTime).toLocaleTimeString('vi-VN')}`
    : `⚡ Quét ngay tức thì (${sniperState.intervalSec}s/lần)`;

  await notify('⚡ BẮT ĐẦU CANH HÀNG!', `Chế độ: ${actLabel}\n${timeDesc}`, task.url);

  const tg = await getTeleConfig();
  if (tg.connected) {
    const isJp = /amazon\.co\.jp/i.test(task.url);
    const curr = isJp ? '¥' : '$';
    let condStr = 'Không giới hạn';
    if (task.priceCondition === 'any') {
      condStr = 'Bất kỳ giá nào';
    } else if (task.maxPrice > 0) {
      const op = task.priceCondition === 'gte' ? '≥' : '≤';
      condStr = `${op} ${curr}${task.maxPrice}`;
    }

    await sendTelegram(
      `⚡ *BẮT ĐẦU CANH HÀNG (SNIPER)!*\n\n`
      + `📦 *Link:* [Nhấn để xem sản phẩm](${task.url})\n`
      + `🎯 *Chế độ:* *${actLabel}*\n`
      + (isScheduled ? `⏰ *Hẹn giờ mở bán:* ${new Date(sniperState.targetTime).toLocaleString('vi-VN')}\n` : `⏱️ *Tần suất:* ${sniperState.intervalSec}s/lần\n`)
      + `💰 *Điều kiện giá:* ${condStr}\n`
      + `🚀 *Trạng thái:* Đang phục kích...\n`
      + `\n⏰ ${new Date().toLocaleString('vi-VN')}`,
      tg
    );
  }

  // Vòng lặp kiểm tra
  const checkLoop = async () => {
    const cur = (await chrome.storage.local.get(['sniper'])).sniper;
    if (!cur || !cur.active || !cur.tabId) {
      if (sniperIntervalTimer) clearInterval(sniperIntervalTimer);
      return;
    }

    // Nếu có hẹn giờ và còn > 15s thì chỉ chờ, không reload
    if (cur.targetTime && cur.targetTime > Date.now()) {
      const msLeft = cur.targetTime - Date.now();
      if (msLeft > 15000) return;
    }

    try {
      chrome.tabs.sendMessage(cur.tabId, {
        action: 'EXECUTE_SNIPER_SCAN',
        maxPrice: cur.maxPrice,
        priceCondition: cur.priceCondition || 'lte',
        actionType: cur.actionType || 'checkout'
      }).catch(async () => {
        try { chrome.tabs.reload(cur.tabId); } catch (e) {}
      });

      cur.scanCount = (cur.scanCount || 0) + 1;
      cur.lastCheckTime = Date.now();
      await chrome.storage.local.set({ sniper: cur });
    } catch (e) {
      console.log('[PH-Sniper] Loop tick error:', e);
    }
  };

  sniperIntervalTimer = setInterval(checkLoop, sniperState.intervalSec * 1000);
  return { success: true, tabId: tab.id };
}

async function stopSniper() {
  if (sniperIntervalTimer) {
    clearInterval(sniperIntervalTimer);
    sniperIntervalTimer = null;
  }

  const data = await chrome.storage.local.get(['sniper']);
  const cur = data.sniper || {};
  cur.active = false;
  cur.status = 'stopped';
  await chrome.storage.local.set({ sniper: cur });

  if (cur.tabId) {
    chrome.tabs.sendMessage(cur.tabId, { action: 'STOP_SNIPER_TAB' }).catch(() => {});
  }

  chrome.runtime.sendMessage({ action: 'SNIPER_STATUS_CHANGED', sniper: cur }).catch(() => {});
  console.log('[PH-Sniper] Đã dừng Sniper');
  return { success: true };
}

// Khi Sniper hoàn tất
async function handleSniperCartSuccess(product) {
  await stopSniper();
  const cur = (await chrome.storage.local.get(['sniper'])).sniper || {};
  cur.status = 'carted';
  await chrome.storage.local.set({ sniper: cur });

  const isJp = /amazon\.co\.jp/i.test(product.url || '');
  const curr = isJp ? '¥' : '$';
  await notify('🛒 [SNIPER] ĐÃ THÊM GIỎ HÀNG!', `${product.name}\nGiá: ${curr}${product.price}`, product.url);

  const tg = await getTeleConfig();
  if (tg.connected) {
    const cartUrl = isJp ? 'https://www.amazon.co.jp/gp/cart/view.html' : 'https://www.amazon.com/gp/cart/view.html';
    const msg = `🛒 *[SNIPER: ĐÃ THÊM VÀO GIỎ HÀNG!]*\n\n`
      + `⚡ *Sản phẩm vừa mở bán -> Tự động thêm giỏ ngay!*\n`
      + `📦 ${product.name || 'Sản phẩm'}\n`
      + `💰 Giá: *${curr}${product.price || 0}*\n`
      + `🛒 [Mở Giỏ Hàng Ngay](${cartUrl})\n`
      + `\n⏰ ${new Date().toLocaleString('vi-VN')}`;
    if (product.image) await sendTelegramPhoto(product.image, msg, tg);
    else await sendTelegram(msg, tg);
  }
}

async function handleSniperCheckoutReady(product) {
  await stopSniper();
  const cur = (await chrome.storage.local.get(['sniper'])).sniper || {};
  cur.status = 'checkout_ready';
  await chrome.storage.local.set({ sniper: cur });

  const isJp = /amazon\.co\.jp/i.test(product.url || '');
  const curr = isJp ? '¥' : '$';
  await notify('🚀 [SNIPER] SẴN SÀNG THANH TOÁN!', `${product.name}\nĐã đưa bạn thẳng vào trang Checkout!`, product.url);

  const tg = await getTeleConfig();
  if (tg.connected) {
    const cartUrl = isJp ? 'https://www.amazon.co.jp/gp/cart/view.html' : 'https://www.amazon.com/gp/cart/view.html';
    const msg = `🚀 *[SNIPER: ĐÃ CHUYỂN ĐẾN THANH TOÁN!]*\n\n`
      + `⚡ *Vừa mở bán -> Đã thêm giỏ & đưa vào trang Checkout sẵn sàng!*\n`
      + `📦 ${product.name || 'Sản phẩm'}\n`
      + `💰 Giá: *${curr}${product.price || 0}*\n`
      + `👉 [Hoàn tất đơn hàng ngay](${cartUrl})\n`
      + `\n⏰ ${new Date().toLocaleString('vi-VN')}`;
    if (product.image) await sendTelegramPhoto(product.image, msg, tg);
    else await sendTelegram(msg, tg);
  }
}

async function handleSniperBoughtSuccess(product) {
  await stopSniper();
  const cur = (await chrome.storage.local.get(['sniper'])).sniper || {};
  cur.status = 'bought';
  await chrome.storage.local.set({ sniper: cur });

  const isJp = /amazon\.co\.jp/i.test(product.url || '');
  const curr = isJp ? '¥' : '$';
  await notify('🎉 [SNIPER] MUA THÀNH CÔNG 100%!', `${product.name}\nGiá: ${curr}${product.price}`, product.url);

  const tg = await getTeleConfig();
  if (tg.connected) {
    const msg = `🎉 *[SNIPER: MUA THÀNH CÔNG 100%!]*\n\n`
      + `⚡ *Sản phẩm vừa mở bán phát là tự động đặt xong luôn!*\n`
      + `📦 ${product.name || 'Sản phẩm'}\n`
      + `💰 Giá mua: *${curr}${product.price || 0}*\n`
      + `🔗 [Xem chi tiết đơn hàng](${product.url || ''})\n`
      + `\n⏰ ${new Date().toLocaleString('vi-VN')}`;
    if (product.image) await sendTelegramPhoto(product.image, msg, tg);
    else await sendTelegram(msg, tg);
  }

  // Ghi vào lịch sử mua
  await recordPurchase(product);
}

async function recordPurchase(product) {
  const data = await chrome.storage.local.get(['history', 'stats']);
  const history = data.history || [];
  const stats = data.stats || {};

  history.unshift({
    name: product.name,
    price: product.price,
    date: Date.now()
  });

  stats.totalPurchased = (stats.totalPurchased || 0) + 1;
  await chrome.storage.local.set({ history: history.slice(0, 50), stats });
}

// ═══════════════════════════════════════════════════════════════════
// MESSAGE LISTENER TRUNG TÂM
// ═══════════════════════════════════════════════════════════════════
async function handleBackgroundMessage(msg) {
  switch (msg.action) {
    // LỆNH MUA NGAY / THÊM GIỎ HÀNG TRỰC TIẾP TỪ SEARCH
    case 'INSTANT_ACTION':
      return await executeInstantActionOnUrl(msg.url, msg.mode);

    // TÌM KIẾM
    case 'SEARCH_BY_URL':
      return await searchByUrl(msg.query);

    case 'SEARCH_BY_NAME':
      return await searchByName(msg.query);

    // SNIPER
    case 'START_SNIPER':
      return await startSniper(msg.task);

    case 'STOP_SNIPER':
      return await stopSniper();

    case 'SNIPER_CART_SUCCESS':
      await handleSniperCartSuccess(msg.product);
      return { success: true };

    case 'SNIPER_CHECKOUT_READY':
      await handleSniperCheckoutReady(msg.product);
      return { success: true };

    case 'SNIPER_BOUGHT_SUCCESS':
      await handleSniperBoughtSuccess(msg.product);
      return { success: true };

    case 'PURCHASE_COMPLETE':
      await recordPurchase(msg.data);
      return { success: true };

    // TELEGRAM
    case 'TELEGRAM_CONNECT':
      await chrome.storage.local.set({ telegram: msg.telegram });
      if (msg.telegram.connected) {
        await sendTelegram('✅ *Price Hunter v3.0 đã kết nối thành công!*', msg.telegram);
      }
      return { success: true };

    case 'TELEGRAM_TEST': {
      const ok = await sendTelegram('👋 Xin chào! Price Hunter Bot đang hoạt động hoàn hảo!', {
        connected: true,
        botToken: msg.botToken,
        chatId: msg.chatId
      });
      return { success: ok, error: ok ? null : 'Không gửi được tin nhắn' };
    }

    // CÀI ĐẶT
    case 'UPDATE_SETTINGS':
      await chrome.storage.local.set({ settings: msg.settings });
      return { success: true };

    case 'GET_SETTINGS': {
      const sd = await chrome.storage.local.get(['settings']);
      return { success: true, settings: sd.settings };
    }

    case 'ADD_TO_WATCHLIST': {
      const wd = await chrome.storage.local.get(['watchlist']);
      const wl = wd.watchlist || [];
      wl.unshift({ ...msg.product, id: 'w-' + Date.now() });
      await chrome.storage.local.set({ watchlist: wl.slice(0, 30) });
      return { success: true };
    }

    case 'REMOVE_FROM_WATCHLIST': {
      const wd = await chrome.storage.local.get(['watchlist']);
      const updated = (wd.watchlist || []).filter(item => item.id !== msg.productId);
      await chrome.storage.local.set({ watchlist: updated });
      return { success: true };
    }

    case 'FORCE_CHECK':
      return { success: true };

    default:
      return { success: true };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleBackgroundMessage(msg)
    .then(res => sendResponse(res))
    .catch(err => {
      console.error('[PH] Message handler error:', err);
      sendResponse({ success: false, error: err?.message || String(err) });
    });
  return true; // Giữ channel mở cho async response
});
