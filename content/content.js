// ═══════════════════════════════════════════════════════════════════════
// Price Hunter v3.0 - Content Script
// Viết lại siêu sạch sẽ, tự động xử lý:
// 1. Tự động tìm & bấm nút mua / thêm giỏ hàng (Toàn cầu & Amazon Nhật)
// 2. Chế độ Mua Ngay (Instant Buy) & Chế độ Chuyển Thanh Toán (Instant Checkout)
// 3. Tự động áp mã giảm giá (Clip Coupon) & bỏ qua popup quảng cáo
// 4. Canh hàng mở bán (Sniper)
// ═══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.__PH_LOADED) return;
  window.__PH_LOADED = true;

  console.log('[PH] 🎯 Content script activated on:', location.hostname);

  let settings = {};
  let isProductPage = false;
  let phSniperReloadTimer = null;

  // ─── Helpers ───
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function showToast(message) {
    const old = document.getElementById('ph-auto-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'ph-auto-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, #0a0a1a, #0d0d25);
      color: #00fff0; padding: 12px 24px; border-radius: 10px;
      font-size: 14px; font-weight: 700; z-index: 9999999;
      border: 1px solid #00d4ff; box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      animation: phToastIn 0.3s ease; font-family: 'Rajdhani', sans-serif;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Bỏ qua các popup/drawer mua thêm bảo hiểm hoặc Prime của Amazon
  async function dismissAttachPopups() {
    const closeSelectors = [
      '#attachSiNoCoverage',
      '#attach-close_sideSheet-link',
      '#attach-sidesheet-close-button',
      '.a-button-close[aria-label="Close"]',
      '#siNoCoverage-announce',
      'button[data-action="a-popover-close"]',
      '#attach-sidesheet-view-cart-button-announce'
    ];
    for (const sel of closeSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        try { el.click(); } catch (e) {}
      }
    }
  }

  // ─── Scrape Thông Tin Sản Phẩm ───
  function scrapeProduct() {
    const title = document.getElementById('productTitle');
    const name = title ? title.textContent.trim() : document.title.split(':')[0].trim();

    let price = 0;
    const priceSelectors = [
      '#corePriceDisplay_desktop_feature_div .a-offscreen',
      '.apexPriceToPay .a-offscreen',
      '.priceToPay .a-offscreen',
      '#priceblock_dealprice',
      '#priceblock_ourprice',
      '#priceblock_saleprice',
      '#price_inside_buybox',
      '#newBuyBoxPrice',
      '.a-price .a-offscreen',
      '#kindle-price'
    ];

    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const m = (el.textContent || '').match(/[\d,.]+/);
        if (m) {
          price = parseFloat(m[0].replace(/,/g, ''));
          if (price > 0) break;
        }
      }
    }

    if (!price) {
      const whole = document.querySelector('.a-price-whole');
      const frac = document.querySelector('.a-price-fraction');
      if (whole) {
        price = parseFloat(whole.textContent.replace(/[,.]/g, '') + '.' + (frac ? frac.textContent : '00'));
      }
    }

    let originalPrice = 0;
    const origEl = document.querySelector('.a-text-price .a-offscreen, .priceBlockStrikePriceString, .a-price[data-a-strike] .a-offscreen, .basisPrice .a-offscreen');
    if (origEl) {
      const m = origEl.textContent.match(/[\d,.]+/);
      if (m) originalPrice = parseFloat(m[0].replace(/,/g, ''));
    }

    const imgEl = document.getElementById('landingImage') || document.getElementById('imgBlkFront') || {};
    const image = imgEl.src || '';
    const asinMatch = location.pathname.match(/\/dp\/([A-Z0-9]{10})/i) || location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    const asin = asinMatch ? asinMatch[1] : '';
    const discount = originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;

    return {
      name, price, originalPrice, discount, image, asin,
      url: location.href,
      timestamp: Date.now()
    };
  }

  // ─── Tìm Nút Mua (Đầy đủ tiếng Anh & tiếng Nhật) ───
  function findBuyButtons() {
    // 1. Nút MUA NGAY (Buy Now / 1-Click / 今すぐ買う)
    const buyNowSelectors = [
      '#buy-now-button',
      '#one-click-button',
      'input[name="submit.buy-now"]',
      '#buyNow_feature_div input[type="submit"]',
      '#buyNow_feature_div input[type="button"]',
      '#buyNow_feature_div input',
      '#buy-now-button-ubb',
      'input[name="submit.preorder-now"]'
    ];
    let buyNowBtn = null;
    for (const s of buyNowSelectors) {
      const el = document.querySelector(s);
      if (el && !el.disabled && el.offsetParent !== null) {
        buyNowBtn = el;
        break;
      }
    }

    // 2. Nút THÊM VÀO GIỎ (Add to Cart / カートに入れる)
    const cartSelectors = [
      '#add-to-cart-button',
      'input[name="submit.add-to-cart"]',
      '#addToCart input[type="submit"]',
      '#addToCart input[type="button"]',
      '#addToCart_feature_div input',
      '#add-to-cart-button-ubb'
    ];
    let cartBtn = null;
    for (const s of cartSelectors) {
      const el = document.querySelector(s);
      if (el && !el.disabled && el.offsetParent !== null) {
        cartBtn = el;
        break;
      }
    }

    // Quét thêm theo text tiếng Nhật nếu chưa tìm thấy
    if (!buyNowBtn || !cartBtn) {
      const allBtns = document.querySelectorAll('input[type="submit"], input[type="button"], button');
      for (const el of allBtns) {
        const val = (el.value || el.textContent || '').trim();
        if (!buyNowBtn && (val === '今すぐ買う' || val === '予約注文する')) {
          if (!el.disabled && el.offsetParent !== null) buyNowBtn = el;
        }
        if (!cartBtn && val === 'カートに入れる') {
          if (!el.disabled && el.offsetParent !== null) cartBtn = el;
        }
      }
    }

    return { buyNowBtn, cartBtn };
  }

  // ─── Tự Động Áp Mã Giảm Giá (Clip Coupon) ───
  function autoClipCoupon() {
    const clipSelectors = [
      '#couponBadgeRegularVpc input[type="submit"]',
      '#vpcButton',
      '[data-action="coupon-clip"] input',
      '.couponBadge button',
      '#couponText input[type="submit"]',
      'label[for="coupon_checkbox"] + input',
      '#couponWidgetInternalDiv input'
    ];
    for (const sel of clipSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        console.log('[PH] ✅ Đã tự động clip coupon!');
        showToast('🎫 Đã tự động áp dụng mã giảm giá!');
        return true;
      }
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // HÀNH ĐỘNG 1: MUA NGAY LẬP TỨC (1-Click Instant Buy & Place Order)
  // ═══════════════════════════════════════════════════════════════════
  async function executeInstantBuy() {
    console.log('[PH] ⚡ Bắt đầu Mua Ngay tức thì...');
    showToast('⚡ ĐANG TỰ ĐỘNG MUA HÀNG...');

    // 1. Áp coupon trước nếu có
    autoClipCoupon();
    await sleep(250);

    const { buyNowBtn, cartBtn } = findBuyButtons();

    // 2. Click Buy Now hoặc Cart fallback
    if (buyNowBtn) {
      buyNowBtn.click();
      console.log('[PH] ⚡ Đã click Buy Now!');
    } else if (cartBtn) {
      cartBtn.click();
      console.log('[PH] ⚡ Fallback: Đã click Add to Cart, đang chuyển thanh toán...');
      await executeProceedToCheckout();
      return;
    } else {
      showToast('⚠️ Chưa tìm thấy nút mua (hết hàng hoặc cần đăng nhập)');
      return;
    }

    // 3. Tự động click nút Place Order (Xác nhận đặt hàng)
    let placeAttempts = 0;
    const placeTimer = setInterval(async () => {
      placeAttempts++;
      await dismissAttachPopups();

      let placeBtn = document.getElementById('submitOrderButtonId') ||
                     document.querySelector('#placeYourOrder input') ||
                     document.querySelector('[name="placeYourOrder1"]') ||
                     document.querySelector('.place-your-order-button input') ||
                     document.getElementById('bottomSubmitOrderButtonId') ||
                     document.querySelector('#submitOrderButtonId button') ||
                     document.querySelector('input[name="placeYourOrder"]') ||
                     document.querySelector('input[name="placeYourOrder2"]') ||
                     document.querySelector('#placeYourOrderButton') ||
                     document.querySelector('.place-order-button input') ||
                     document.querySelector('input[name="submit.placeYourOrder"]');

      if (!placeBtn) {
        const orderBtns = document.querySelectorAll('input[type="submit"], input[type="button"], button');
        for (const el of orderBtns) {
          const t = (el.value || el.textContent || '').trim();
          if (t === '注文を確定する' || t === '注文を確定' || t === 'Place your order' || t === 'Place Order') {
            if (!el.disabled && el.offsetParent !== null) {
              placeBtn = el;
              break;
            }
          }
        }
      }

      if (placeBtn && placeBtn.offsetParent !== null) {
        clearInterval(placeTimer);
        placeBtn.click();
        console.log('[PH] 🎉 ĐÃ BẤM PLACE ORDER HOÀN TẤT!');
        showToast('🎉 ĐÃ ĐẶT HÀNG THÀNH CÔNG 100%!');

        const p = scrapeProduct();
        chrome.runtime.sendMessage({
          action: 'PURCHASE_COMPLETE',
          data: {
            name: p.name,
            price: p.price,
            asin: p.asin,
            url: location.href
          }
        }).catch(() => {});
      } else if (placeAttempts > 18) {
        clearInterval(placeTimer);
        console.log('[PH] Dừng chờ Place Order (có thể cần xác nhận bảo mật hoặc OTP)');
      }
    }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════
  // HÀNH ĐỘNG 2: THÊM GIỎ & CHUYỂN THẲNG THANH TOÁN (Add to Cart & Checkout)
  // ═══════════════════════════════════════════════════════════════════
  async function executeInstantCart() {
    console.log('[PH] 🛒 Bắt đầu Thêm Giỏ & Chuyển Thanh Toán...');
    showToast('🛒 ĐANG THÊM GIỎ & CHUYỂN THANH TOÁN...');

    autoClipCoupon();
    await sleep(250);

    const { buyNowBtn, cartBtn } = findBuyButtons();

    if (cartBtn) {
      cartBtn.click();
      console.log('[PH] 🛒 Đã click Add to Cart!');
    } else if (buyNowBtn) {
      buyNowBtn.click();
      return;
    } else {
      showToast('⚠️ Sản phẩm hiện chưa có nút thêm giỏ');
      return;
    }

    await executeProceedToCheckout();
  }

  // Chờ và bấm nút Proceed to Checkout (Đưa thẳng vào màn hình thanh toán)
  async function executeProceedToCheckout() {
    let attempts = 0;
    const checkoutTimer = setInterval(async () => {
      attempts++;
      await dismissAttachPopups();

      const proceedSelectors = [
        '#hlb-ptc-btn-native',
        'input[name="proceedToRetailCheckout"]',
        '#attach-sidesheet-checkout-button',
        '#sc-buy-box-ptc-button input',
        '#sc-buy-box-ptc-button',
        'a[href*="/gp/buy/spc/handlers/display.html"]',
        'a[href*="/gp/cart/desktop-go-to-checkout.html"]',
        'a[href*="/checkout/enter-checkout"]',
        'input[aria-labelledby="attach-sidesheet-checkout-button-announce"]',
        '#attach-checkout-button',
        '.attach-proceed-to-checkout',
        'input[name="proceedToCheckout"]'
      ];

      for (const sel of proceedSelectors) {
        const pBtn = document.querySelector(sel);
        if (pBtn && pBtn.offsetParent !== null) {
          clearInterval(checkoutTimer);
          pBtn.click();
          console.log('[PH] 🚀 ĐÃ BẤM CHUYỂN SANG THANH TOÁN:', sel);
          showToast('🎉 ĐÃ CHUYỂN VÀO TRANG THANH TOÁN SẴN SÀNG!');
          return;
        }
      }

      // Quét text tiếng Nhật: レジに進む
      const allButtons = document.querySelectorAll('input[type="submit"], input[type="button"], button, a');
      for (const el of allButtons) {
        const txt = (el.value || el.textContent || '').trim();
        if (txt.includes('レジに進む') || txt.includes('Proceed to checkout')) {
          if (el.offsetParent !== null) {
            clearInterval(checkoutTimer);
            el.click();
            console.log('[PH] 🚀 ĐÃ BẤM レジに進む (CHUYỂN THANH TOÁN)!');
            showToast('🎉 ĐÃ CHUYỂN VÀO TRANG THANH TOÁN SẴN SÀNG!');
            return;
          }
        }
      }

      // Đã ở trang Checkout rồi
      if (location.href.includes('/gp/buy/') || location.href.includes('/checkout/')) {
        clearInterval(checkoutTimer);
        showToast('🎉 ĐÃ Ở TRANG THANH TOÁN SẴN SÀNG!');
        return;
      }

      if (attempts > 15) {
        clearInterval(checkoutTimer);
        // Fallback: Chuyển hướng thẳng sang giỏ hàng
        const isJp = /amazon\.co\.jp/i.test(location.href);
        location.href = isJp ? 'https://www.amazon.co.jp/gp/cart/view.html' : 'https://www.amazon.com/gp/cart/view.html';
      }
    }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════
  // HÀNH ĐỘNG 3: CANH HÀNG MỞ BÁN (SNIPER SCAN)
  // ═══════════════════════════════════════════════════════════════════
  function showSniperTopBar() {
    if (document.getElementById('ph-sniper-top-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'ph-sniper-top-bar';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:900px;margin:0 auto;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">⚡</span>
          <span style="font-weight:800;font-size:13px;color:#39ff14;letter-spacing:1px;">PRICE HUNTER SNIPER ĐANG CANH MỞ BÁN!</span>
          <span style="font-size:12px;color:#00d4ff;">(Tự động reload & giật đơn ngay khi có nút mua)</span>
        </div>
        <button id="ph-btn-stop-on-page" style="background:#ff073a;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 0 15px rgba(255,7,58,0.5);">
          🛑 DỪNG CANH
        </button>
      </div>
    `;
    bar.style.cssText = `
      position:fixed;top:0;left:0;right:0;height:48px;background:rgba(10,10,26,0.96);
      border-bottom:2px solid #39ff14;box-shadow:0 0 25px rgba(57,255,20,0.3);
      z-index:9999999;display:flex;align-items:center;padding:0 20px;
      font-family:'Rajdhani', sans-serif;
    `;
    document.body.prepend(bar);

    document.getElementById('ph-btn-stop-on-page')?.addEventListener('click', async () => {
      stopSniperOnTab();
      await chrome.runtime.sendMessage({ action: 'STOP_SNIPER' }).catch(() => {});
      showToast('🛑 Đã dừng canh hàng!');
    });
  }

  function stopSniperOnTab() {
    if (phSniperReloadTimer) {
      clearTimeout(phSniperReloadTimer);
      phSniperReloadTimer = null;
    }
    document.getElementById('ph-sniper-top-bar')?.remove();
  }

  async function handleSniperScan(options) {
    const sData = await chrome.storage.local.get(['sniper']);
    if (!sData.sniper?.active) {
      stopSniperOnTab();
      return;
    }

    showSniperTopBar();
    const current = scrapeProduct();
    const { buyNowBtn, cartBtn } = findBuyButtons();

    // 1. Nếu chưa có nút mua
    if (!buyNowBtn && !cartBtn) {
      console.log('[PH-Sniper] Chưa có nút mua, đang chờ...');
      showToast('⚡ [SNIPER] Đang canh hàng... Chưa mở bán');

      if (phSniperReloadTimer) clearTimeout(phSniperReloadTimer);
      phSniperReloadTimer = setTimeout(async () => {
        const check = (await chrome.storage.local.get(['sniper'])).sniper;
        if (check?.active) {
          location.reload();
        } else {
          stopSniperOnTab();
        }
      }, 2500);
      return;
    }

    // 2. Đã có nút mua! Kiểm tra điều kiện giá (≤, ≥ hoặc bất kỳ)
    const cond = options.priceCondition || 'lte';
    if (cond === 'lte' && options.maxPrice > 0 && current.price > options.maxPrice) {
      showToast(`⚠️ [SNIPER] Giá ${current.price} vượt giá trần (≤ ${options.maxPrice})`);
      return;
    } else if (cond === 'gte' && options.maxPrice > 0 && current.price < options.maxPrice) {
      showToast(`⚠️ [SNIPER] Giá ${current.price} thấp hơn mức yêu cầu (≥ ${options.maxPrice})`);
      return;
    }

    // 3. Thực hiện hành động theo cấu hình
    console.log('[PH-Sniper] 🔥 PHÁT HIỆN MỞ BÁN ĐẠT ĐIỀU KIỆN! Hành động:', options.actionType);

    if (options.actionType === 'cart') {
      await executeInstantCart();
      stopSniperOnTab();
      chrome.runtime.sendMessage({ action: 'SNIPER_CART_SUCCESS', product: current }).catch(() => {});
    } else if (options.actionType === 'checkout') {
      await executeInstantCart();
      stopSniperOnTab();
      chrome.runtime.sendMessage({ action: 'SNIPER_CHECKOUT_READY', product: current }).catch(() => {});
    } else {
      await executeInstantBuy();
      stopSniperOnTab();
      chrome.runtime.sendMessage({ action: 'SNIPER_BOUGHT_SUCCESS', product: current }).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // LẮNG NGHE LỆNH TỪ POPUP & BACKGROUND
  // ═══════════════════════════════════════════════════════════════════
  function listenForCommands() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      switch (msg.action) {
        // Lệnh trực tiếp: Mua ngay hoặc thêm giỏ hàng
        case 'EXECUTE_INSTANT_ACTION':
          if (msg.mode === 'buy') {
            executeInstantBuy();
          } else {
            executeInstantCart();
          }
          sendResponse({ success: true });
          break;

        case 'EXECUTE_SNIPER_SCAN':
          handleSniperScan(msg);
          sendResponse({ success: true });
          break;

        case 'STOP_SNIPER_TAB':
          stopSniperOnTab();
          sendResponse({ success: true });
          break;

        case 'SCRAPE_PRODUCT':
          sendResponse({ success: true, data: scrapeProduct() });
          break;
      }
      return true;
    });
  }

  // ─── INIT ───
  async function init() {
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'GET_SETTINGS' });
      if (resp?.settings) settings = resp.settings;
    } catch (e) {
      settings = { enabled: true, autoClipCoupons: true, autoAddToCart: true };
    }

    isProductPage = !!(
      location.pathname.match(/\/dp\/[A-Z0-9]{10}/i) ||
      location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i) ||
      document.getElementById('productTitle')
    );

    if (isProductPage) {
      if (settings.autoClipCoupons !== false) {
        setTimeout(autoClipCoupon, 1000);
      }
      injectOnPageQuickPanel();
    }

    listenForCommands();
  }

  // ─── BẢNG ĐIỀU KHIỂN NỔI TRỰC TIẾP TRÊN TRANG SẢN PHẨM AMAZON ───
  function injectOnPageQuickPanel() {
    if (document.getElementById('ph-quick-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'ph-quick-bar';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">⚡</span>
        <span style="font-weight:800;font-size:13px;color:#00fff0;letter-spacing:1px;font-family:'Rajdhani',sans-serif;">PRICE HUNTER:</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="ph-btn-page-buy" style="background:linear-gradient(135deg,#39ff14,#00e676);color:#0a0a1a;border:none;border-radius:8px;padding:8px 16px;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 0 15px rgba(57,255,20,0.4);transition:0.2s;">
          ⚡ MUA NGAY 100%
        </button>
        <button id="ph-btn-page-checkout" style="background:linear-gradient(135deg,#ff6a00,#ffb300);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:900;font-size:12px;cursor:pointer;box-shadow:0 0 15px rgba(255,106,0,0.4);transition:0.2s;">
          🛒 THÊM GIỎ & THANH TOÁN
        </button>
      </div>
    `;
    bar.style.cssText = `
      position:fixed;bottom:20px;right:20px;
      background:rgba(10,10,26,0.95);border:1px solid #00d4ff;border-radius:12px;
      padding:10px 14px;box-shadow:0 8px 30px rgba(0,0,0,0.8),0 0 20px rgba(0,212,255,0.25);
      z-index:999999;display:flex;align-items:center;gap:12px;
      font-family:'Segoe UI',sans-serif;backdrop-filter:blur(8px);
    `;
    document.body.appendChild(bar);

    document.getElementById('ph-btn-page-buy')?.addEventListener('click', () => {
      executeInstantBuy();
    });

    document.getElementById('ph-btn-page-checkout')?.addEventListener('click', () => {
      executeInstantCart();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }
})();
