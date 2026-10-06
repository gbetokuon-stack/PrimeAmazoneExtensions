// ═══════════════════════════════════════════════════════════════════════
// Price Hunter v3.0 - Popup Script
// Viết lại sạch sẽ, siêu mượt, xử lý trực tiếp MUA NGAY & THÊM GIỎ
// ═══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Helpers ───
  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(text, type = 'info') {
    const old = document.getElementById('popup-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'popup-toast';
    toast.textContent = text;

    let bg = 'linear-gradient(135deg, #00d4ff, #00fff0)';
    let color = '#0a0a1a';
    if (type === 'success') {
      bg = 'linear-gradient(135deg, #39ff14, #00e676)';
      color = '#051405';
    } else if (type === 'error') {
      bg = 'linear-gradient(135deg, #ff073a, #ff4444)';
      color = '#fff';
    }

    toast.style.cssText = `
      position: fixed; top: 12px; left: 16px; right: 16px;
      background: ${bg}; color: ${color}; padding: 10px 14px;
      border-radius: 8px; font-weight: 800; font-size: 12px;
      z-index: 999999; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      animation: fadeIn 0.2s ease; font-family: 'Rajdhani', sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast) toast.remove(); }, 3200);
  }

  function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor((ms / (1000 * 60)) % 60);
    const h = Math.floor(ms / (1000 * 60 * 60));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ─── DOM Ready ───
  document.addEventListener('DOMContentLoaded', () => {

    // ═════ 1. TAB SWITCHING ═════
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    const sniperUrl            = document.getElementById('sniper-url');
    const sniperMaxPrice       = document.getElementById('sniper-max-price');
    const sniperPriceCondition = document.getElementById('sniper-price-condition');
    const sniperSpeed          = document.getElementById('sniper-speed');
    const sniperTargetTime     = document.getElementById('sniper-target-time');
    const btnClearTime         = document.getElementById('btn-clear-target-time');
    const sniperAction         = document.getElementById('sniper-action');
    const btnStartSniper       = document.getElementById('btn-start-sniper');
    const btnStopSniper        = document.getElementById('btn-stop-sniper');
    const btnPasteTab          = document.getElementById('btn-paste-active-tab');
    const currencySymbol       = document.getElementById('currency-symbol');
    const sniperRadar          = document.getElementById('sniper-radar');
    const sniperTitle          = document.getElementById('sniper-state-title');
    const sniperDetails        = document.getElementById('sniper-state-details');
    const sniperCountdown      = document.getElementById('sniper-countdown');

    let countdownInterval = null;

    // Tự động nhận diện tiền tệ
    function detectCurrency(url) {
      if (!currencySymbol) return;
      if (/amazon\.co\.jp/i.test(url)) {
        currencySymbol.textContent = '¥ (JPY - Yên Nhật)';
        if (sniperMaxPrice && !sniperMaxPrice.value) sniperMaxPrice.placeholder = 'VD: 5500';
      } else if (/amazon\.co\.uk/i.test(url)) {
        currencySymbol.textContent = '£ (GBP)';
      } else if (/amazon\.(de|fr|it|es|nl)/i.test(url)) {
        currencySymbol.textContent = '€ (EUR)';
      } else {
        currencySymbol.textContent = '$ (USD)';
        if (sniperMaxPrice && !sniperMaxPrice.value) sniperMaxPrice.placeholder = 'VD: 50';
      }
    }

    if (sniperUrl) {
      sniperUrl.addEventListener('input', () => detectCurrency(sniperUrl.value));
    }

    // Đổi chữ và màu trên nút khi đổi hành động
    function updateActionButtonText() {
      if (!sniperAction || !btnStartSniper) return;
      if (sniperAction.value === 'cart') {
        btnStartSniper.textContent = '🛒 BẬT CANH & TỰ THÊM VÀO GIỎ!';
        btnStartSniper.style.background = 'linear-gradient(135deg, #00d4ff, #00fff0)';
        btnStartSniper.style.color = '#0a0a1a';
      } else if (sniperAction.value === 'checkout') {
        btnStartSniper.textContent = '🚀 BẬT CANH & TỰ CHUYỂN THANH TOÁN!';
        btnStartSniper.style.background = 'linear-gradient(135deg, #ff6a00, #ffb300)';
        btnStartSniper.style.color = '#fff';
      } else {
        btnStartSniper.textContent = '⚡ BẬT CANH & TỰ ĐỘNG MUA 100%!';
        btnStartSniper.style.background = 'linear-gradient(135deg, var(--green), #00e676)';
        btnStartSniper.style.color = '#051405';
      }
    }

    if (sniperAction) {
      sniperAction.addEventListener('change', updateActionButtonText);
      updateActionButtonText();
    }

    if (btnClearTime && sniperTargetTime) {
      btnClearTime.addEventListener('click', () => {
        sniperTargetTime.value = '';
        if (sniperCountdown) sniperCountdown.style.display = 'none';
        showToast('Đã xóa giờ hẹn!', 'info');
      });
    }

    if (btnPasteTab) {
      btnPasteTab.addEventListener('click', async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url) {
            sniperUrl.value = tab.url;
            detectCurrency(tab.url);
            showToast('✅ Đã lấy link tab hiện tại!', 'success');
          }
        } catch (e) {
          showToast('Không lấy được link tab', 'error');
        }
      });
    }

    // Nút Bật Canh
    if (btnStartSniper) {
      btnStartSniper.addEventListener('click', async () => {
        const url = sniperUrl.value.trim();
        if (!url || !/amazon\./i.test(url)) {
          showToast('Vui lòng dán link sản phẩm Amazon hợp lệ!', 'error');
          sniperUrl.focus();
          return;
        }

        const maxPrice       = parseFloat(sniperMaxPrice.value) || 0;
        const priceCondition = sniperPriceCondition ? sniperPriceCondition.value : 'lte';
        const intervalSec    = parseInt(sniperSpeed.value) || 8;
        const actionType     = sniperAction ? sniperAction.value : 'checkout';
        const targetTime     = sniperTargetTime?.value ? new Date(sniperTargetTime.value).getTime() : 0;

        updateSniperUI({ active: true, url, scanCount: 0, intervalSec, actionType, targetTime, maxPrice, priceCondition, status: 'scanning' });

        if (targetTime > Date.now()) {
          showToast('⏰ Đã lên lịch hẹn giờ mở bán!', 'success');
        } else {
          showToast('⚡ Đã kích hoạt Sniper! Đang phục kích...', 'success');
        }

        chrome.runtime.sendMessage({
          action: 'START_SNIPER',
          task: { url, maxPrice, priceCondition, intervalSec, actionType, targetTime }
        }).catch(() => {});
      });
    }

    // Nút Dừng Canh
    if (btnStopSniper) {
      btnStopSniper.addEventListener('click', async () => {
        updateSniperUI({ active: false, status: 'stopped' });
        showToast('🛑 Đã dừng canh hàng!', 'info');

        const sData = await chrome.storage.local.get(['sniper']);
        const sn = sData.sniper || {};
        sn.active = false;
        sn.status = 'stopped';
        await chrome.storage.local.set({ sniper: sn });

        chrome.runtime.sendMessage({ action: 'STOP_SNIPER' }).catch(() => {});
      });
    }

    function updateSniperUI(sn) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      if (sn && sn.active) {
        if (btnStartSniper) btnStartSniper.style.display = 'none';
        if (btnStopSniper)  btnStopSniper.style.display  = 'block';
        if (sniperRadar)    sniperRadar.classList.add('scanning');

        let actTitle = '⚡ TỰ ĐỘNG MUA 100%';
        let actDesc  = 'Mua ngay tức thì';
        if (sn.actionType === 'cart') {
          actTitle = '🛒 TỰ THÊM VÀO GIỎ';
          actDesc  = 'Tự thêm vào giỏ hàng';
        } else if (sn.actionType === 'checkout') {
          actTitle = '🚀 TỰ CHUYỂN THANH TOÁN';
          actDesc  = 'Thêm giỏ & chuyển thẳng đến thanh toán';
        }

        if (sniperTitle) {
          sniperTitle.innerHTML = `⚡ <strong>ĐANG PHỤC KÍCH! (${actTitle})</strong>`;
          sniperTitle.style.color = 'var(--green)';
        }

        let priceText = '';
        if (sn.priceCondition === 'any') {
          priceText = ' | Giá: Bất kỳ';
        } else if (sn.maxPrice > 0) {
          const op = sn.priceCondition === 'gte' ? '≥' : '≤';
          priceText = ` | Giá: ${op} ${sn.maxPrice}`;
        }

        if (sn.targetTime && sn.targetTime > Date.now()) {
          if (sniperCountdown) sniperCountdown.style.display = 'block';
          const updateTimer = () => {
            const remain = sn.targetTime - Date.now();
            if (remain > 0) {
              if (sniperCountdown) sniperCountdown.innerHTML = `⏱️ Đếm ngược: <strong style="color:var(--cyan)">${formatCountdown(remain)}</strong> (Trước 15s sẽ tăng tốc)`;
              if (sniperDetails)   sniperDetails.innerHTML   = `Link: <span style="color:var(--cyan)">${esc((sn.url || '').substring(0, 36))}...</span><br>⏳ Đang chờ mở bán...${priceText}`;
            } else {
              if (sniperCountdown) sniperCountdown.innerHTML = `🔥 <strong style="color:var(--green)">ĐÃ ĐẾN GIỜ! ĐANG QUÉT TURBO!</strong>`;
              if (sniperDetails)   sniperDetails.innerHTML   = `Link: <span style="color:var(--cyan)">${esc((sn.url || '').substring(0, 36))}...</span><br>Đã quét: <strong>${sn.scanCount || 0}</strong> lần | ${actDesc}${priceText}`;
            }
          };
          updateTimer();
          countdownInterval = setInterval(updateTimer, 1000);
        } else {
          if (sniperCountdown) sniperCountdown.style.display = 'none';
          if (sniperDetails)   sniperDetails.innerHTML = `Link: <span style="color:var(--cyan)">${esc((sn.url || '').substring(0, 36))}...</span><br>Đã quét: <strong>${sn.scanCount || 0}</strong> lần | ${actDesc} (${sn.intervalSec || 1}s/lần)${priceText}`;
        }
      } else {
        if (btnStartSniper)  btnStartSniper.style.display = 'block';
        if (btnStopSniper)   btnStopSniper.style.display  = 'none';
        if (sniperRadar)     sniperRadar.classList.remove('scanning');
        if (sniperCountdown) sniperCountdown.style.display = 'none';

        if (sn?.status === 'carted') {
          if (sniperTitle)   { sniperTitle.innerHTML = '🛒 <strong>ĐÃ THÊM VÀO GIỎ HÀNG!</strong>'; sniperTitle.style.color = 'var(--cyan)'; }
          if (sniperDetails) sniperDetails.textContent = 'Sản phẩm đã được bỏ vào giỏ hàng ngay khi mở bán!';
        } else if (sn?.status === 'checkout_ready') {
          if (sniperTitle)   { sniperTitle.innerHTML = '🚀 <strong>SẴN SÀNG THANH TOÁN!</strong>'; sniperTitle.style.color = 'var(--orange)'; }
          if (sniperDetails) sniperDetails.textContent = 'Đã thêm giỏ và mở sẵn trang Checkout để bạn đặt hàng!';
        } else if (sn?.status === 'bought') {
          if (sniperTitle)   { sniperTitle.innerHTML = '🎉 <strong>MUA THÀNH CÔNG 100%!</strong>'; sniperTitle.style.color = 'var(--green)'; }
          if (sniperDetails) sniperDetails.textContent = 'Đơn hàng đã được đặt thành công ngay khi mở bán!';
        } else {
          if (sniperTitle)   { sniperTitle.textContent = '💤 Đang nghỉ'; sniperTitle.style.color = 'var(--t2)'; }
          if (sniperDetails) sniperDetails.textContent = 'Chưa canh sản phẩm nào. Dán link và bấm nút!';
        }
      }
    }

    // ═════ 3. TAB TÌM GIÁ & MUA TRỰC TIẾP ═════
    const searchInput   = document.getElementById('search-input');
    const btnSearch     = document.getElementById('btn-search');
    const searchResults = document.getElementById('search-results');
    const searchLoading = document.getElementById('search-loading');

    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }

    if (btnSearch) btnSearch.addEventListener('click', doSearch);

    async function doSearch() {
      const q = searchInput.value.trim();
      if (!q) {
        showToast('Vui lòng nhập tên hoặc dán link sản phẩm!', 'error');
        return;
      }

      if (searchResults) searchResults.style.display = 'none';
      if (searchLoading) searchLoading.style.display = 'block';
      if (btnSearch) { btnSearch.textContent = '⏳ ĐANG TÌM...'; btnSearch.disabled = true; }

      try {
        const isUrl = /^https?:\/\//i.test(q) || /amazon\./i.test(q);
        const resp = await chrome.runtime.sendMessage({
          action: isUrl ? 'SEARCH_BY_URL' : 'SEARCH_BY_NAME',
          query: q
        });

        if (searchLoading) searchLoading.style.display = 'none';
        if (searchResults) searchResults.style.display = 'block';
        if (btnSearch)     { btnSearch.textContent = '🔍 TÌM GIÁ RẺ NHẤT'; btnSearch.disabled = false; }

        if (resp?.success && resp.results?.length > 0) {
          renderSearchResults(resp.results);
        } else {
          searchResults.innerHTML = `<div class="empty-msg"><p>Không tìm thấy sản phẩm</p><p class="hint">${resp?.error || 'Thử từ khóa khác'}</p></div>`;
        }
      } catch (e) {
        if (searchLoading) searchLoading.style.display = 'none';
        if (searchResults) {
          searchResults.style.display = 'block';
          searchResults.innerHTML = `<div class="empty-msg"><p>Lỗi tìm kiếm: ${e.message}</p></div>`;
        }
        if (btnSearch) { btnSearch.textContent = '🔍 TÌM GIÁ RẺ NHẤT'; btnSearch.disabled = false; }
      }
    }

    function renderSearchResults(results) {
      if (!searchResults) return;
      results.sort((a, b) => (a.price || 999999) - (b.price || 999999));

      searchResults.innerHTML = results.map((r, i) => {
        const isBest = i === 0 && results.length > 1;
        const curr = r.currency || '$';
        const displayPrice = r.price > 0 ? (curr === '¥' ? Math.round(r.price) : r.price.toFixed(2)) : 'Xem giá';
        const displayOrig  = r.originalPrice > r.price ? `<span class="orig">${curr}${curr === '¥' ? Math.round(r.originalPrice) : r.originalPrice.toFixed(2)}</span>` : '';
        const displayDisc  = r.discount > 0 ? `<span class="disc">-${r.discount}%</span>` : '';

        return `
          <div class="result-card ${isBest ? 'best-deal' : ''}">
            ${isBest ? '<div class="best-badge">💎 GIÁ RẺ NHẤT</div>' : ''}
            <div class="result-row">
              ${r.image ? `<img class="result-img" src="${esc(r.image)}" alt="">` : ''}
              <div class="result-info">
                <div class="result-name" title="${esc(r.name)}">${esc(r.name)}</div>
                <div class="result-price">
                  ${curr}${displayPrice}
                  ${displayOrig}
                  ${displayDisc}
                </div>
                ${r.rating ? `<div class="result-rating">${'⭐'.repeat(Math.round(r.rating))} ${r.rating}</div>` : ''}
              </div>
            </div>
            <!-- CÁC NÚT BẤM TRỰC TIẾP -->
            <div class="result-actions">
              <button class="result-btn buy-btn" data-act="instant-buy" data-url="${esc(r.url)}" title="Mở trang & Tự mua ngay">⚡ MUA NGAY</button>
              <button class="result-btn cart-btn" data-act="instant-cart" data-url="${esc(r.url)}" title="Mở trang & Tự thêm giỏ + chuyển thanh toán">🛒 THÊM GIỎ</button>
              <button class="result-btn sniper-btn" data-act="snipe" data-idx="${i}" title="Chuyển link sang tab Canh Hàng">🎯 CANH</button>
              <button class="result-btn open" data-act="open" data-url="${esc(r.url)}" title="Mở tab sản phẩm">🔗</button>
            </div>
          </div>
        `;
      }).join('');

      // Xử lý sự kiện nút bấm trong Search
      searchResults.querySelectorAll('.result-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;

          // 1. MUA NGAY (1-Click Instant Buy & Place Order)
          if (act === 'instant-buy') {
            const url = btn.dataset.url;
            showToast('⚡ Đang mở trang & tự động mua ngay...', 'success');
            chrome.runtime.sendMessage({
              action: 'INSTANT_ACTION',
              url: url,
              mode: 'buy'
            }).catch(() => {});
          }

          // 2. THÊM GIỎ HÀNG + CHUYỂN THANH TOÁN (Add to cart & Checkout)
          else if (act === 'instant-cart') {
            const url = btn.dataset.url;
            showToast('🛒 Đang mở trang & tự thêm giỏ hàng...', 'info');
            chrome.runtime.sendMessage({
              action: 'INSTANT_ACTION',
              url: url,
              mode: 'checkout'
            }).catch(() => {});
          }

          // 3. CHUYỂN SANG TAB CANH HÀNG (Snipe)
          else if (act === 'snipe') {
            const r = results[parseInt(btn.dataset.idx)];
            if (sniperUrl) sniperUrl.value = r.url;
            if (sniperMaxPrice && r.price > 0) sniperMaxPrice.value = Math.ceil(r.price * 1.05);

            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('.tab[data-tab="sniper"]')?.classList.add('active');
            document.getElementById('tab-sniper')?.classList.add('active');
            detectCurrency(r.url);
            showToast('Đã chuyển link sang tab Canh Mua!', 'success');
          }

          // 4. MỞ TAB SẢN PHẨM
          else if (act === 'open') {
            chrome.tabs.create({ url: btn.dataset.url });
          }
        });
      });
    }



    // ═════ 5. TAB TELEGRAM ═════
    const teleToken   = document.getElementById('tele-token');
    const teleChatId  = document.getElementById('tele-chat-id');
    const teleDot     = document.getElementById('tele-dot');
    const teleText    = document.getElementById('tele-status-text');
    const btnTeleSave = document.getElementById('btn-tele-save');
    const btnTeleTest = document.getElementById('btn-tele-test');
    const btnTeleDisc = document.getElementById('btn-tele-disconnect');
    const tnD         = document.getElementById('tele-notify-deals');
    const tnB         = document.getElementById('tele-notify-buy');
    const tnP         = document.getElementById('tele-notify-price-drop');
    const tnT         = document.getElementById('tele-notify-target');

    function updateTeleStatus(on) {
      if (!teleDot || !teleText) return;
      if (on) {
        teleDot.classList.add('connected');
        teleText.textContent = '● Đã kết nối Bot';
        teleText.style.color = 'var(--green)';
      } else {
        teleDot.classList.remove('connected');
        teleText.textContent = '○ Chưa kết nối Bot';
        teleText.style.color = 'var(--red)';
      }
    }

    if (btnTeleSave) {
      btnTeleSave.addEventListener('click', async () => {
        const t = teleToken?.value.trim() || '';
        const c = teleChatId?.value.trim() || '';
        if (!t || !c) {
          showToast('Vui lòng nhập Token & Chat ID!', 'error');
          return;
        }
        const cfg = {
          botToken: t, chatId: c, connected: true,
          notifyDeals: tnD?.checked ?? true,
          notifyBuy: tnB?.checked ?? true,
          notifyPriceDrop: tnP?.checked ?? true,
          notifyTarget: tnT?.checked ?? true
        };
        await chrome.storage.local.set({ telegram: cfg });
        chrome.runtime.sendMessage({ action: 'TELEGRAM_CONNECT', telegram: cfg }).catch(() => {});
        updateTeleStatus(true);
        showToast('✅ Đã lưu kết nối Telegram Bot!', 'success');
      });
    }

    if (btnTeleTest) {
      btnTeleTest.addEventListener('click', async () => {
        const t = teleToken?.value.trim() || '';
        const c = teleChatId?.value.trim() || '';
        if (!t || !c) {
          showToast('Nhập Token & Chat ID trước!', 'error');
          return;
        }
        showToast('Đang gửi tin nhắn thử...', 'info');
        const resp = await chrome.runtime.sendMessage({ action: 'TELEGRAM_TEST', botToken: t, chatId: c }).catch(() => null);
        if (resp?.success) {
          showToast('✅ Gửi thành công! Kiểm tra Telegram.', 'success');
        } else {
          showToast('❌ Lỗi: ' + (resp?.error || 'Kiểm tra Bot Token'), 'error');
        }
      });
    }

    if (btnTeleDisc) {
      btnTeleDisc.addEventListener('click', async () => {
        await chrome.storage.local.set({ telegram: { botToken: '', chatId: '', connected: false } });
        if (teleToken)  teleToken.value = '';
        if (teleChatId) teleChatId.value = '';
        updateTeleStatus(false);
        showToast('Đã ngắt kết nối Telegram', 'info');
      });
    }

    // ═════ 6. TAB CONFIG ═════
    const toggleClip   = document.getElementById('toggle-clip');
    const toggleCart   = document.getElementById('toggle-cart');
    const toggleBuy    = document.getElementById('toggle-buy');
    const masterToggle = document.getElementById('master-toggle');
    const minDiscount  = document.getElementById('min-discount');
    const maxPrice     = document.getElementById('max-price');
    const maxDaily     = document.getElementById('max-daily');
    const btnExport    = document.getElementById('btn-export');
    const btnClear     = document.getElementById('btn-clear');

    if (masterToggle) masterToggle.addEventListener('change', () => saveSetting('enabled', masterToggle.checked));
    if (toggleClip)   toggleClip.addEventListener('click', () => { toggleClip.classList.toggle('active'); saveSetting('autoClipCoupons', toggleClip.classList.contains('active')); });
    if (toggleCart)   toggleCart.addEventListener('click', () => { toggleCart.classList.toggle('active'); saveSetting('autoAddToCart', toggleCart.classList.contains('active')); });
    if (toggleBuy)    toggleBuy.addEventListener('click', () => { toggleBuy.classList.toggle('active'); saveSetting('autoBuy', toggleBuy.classList.contains('active')); });

    const preferredCard     = document.getElementById('preferred-card');
    const toggleAutoCheckout = document.getElementById('toggle-auto-checkout');

    if (preferredCard) {
      preferredCard.addEventListener('input', () => {
        // Chỉ cho phép nhập số
        preferredCard.value = preferredCard.value.replace(/\D/g, '').slice(0, 4);
      });
      preferredCard.addEventListener('change', () => {
        saveSetting('preferredCard', preferredCard.value.trim());
      });
    }

    if (toggleAutoCheckout) {
      toggleAutoCheckout.addEventListener('click', () => {
        toggleAutoCheckout.classList.toggle('active');
        saveSetting('autoCheckout', toggleAutoCheckout.classList.contains('active'));
      });
    }

    if (minDiscount) minDiscount.addEventListener('change', () => saveSetting('minDiscount', parseInt(minDiscount.value) || 30));
    if (maxPrice)    maxPrice.addEventListener('change', () => saveSetting('maxPrice', parseInt(maxPrice.value) || 50));
    if (maxDaily)    maxDaily.addEventListener('change', () => saveSetting('maxDailySpend', parseInt(maxDaily.value) || 200));

    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        const d = await chrome.storage.local.get(null);
        const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `pricehunter-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        if (confirm('Xóa TẤT CẢ dữ liệu extension?')) {
          await chrome.storage.local.clear();
          showToast('Đã dọn sạch dữ liệu!', 'info');
          setTimeout(() => window.close(), 1000);
        }
      });
    }

    async function saveSetting(key, val) {
      const d = await chrome.storage.local.get(['settings']);
      const s = d.settings || {};
      s[key] = val;
      await chrome.storage.local.set({ settings: s });
      chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: s }).catch(() => {});
    }

    // ═════ 7. LOAD TOÀN BỘ DỮ LIỆU ═════
    async function refreshAllData() {
      const allData  = await chrome.storage.local.get(null);
      const settings = allData.settings || {};
      const stats    = allData.stats    || {};
      const telegram = allData.telegram || {};
      const sniper   = allData.sniper   || {};

      // Stats
      const sDeals   = document.getElementById('stat-deals');
      const sSaved   = document.getElementById('stat-saved');
      const sCoupons = document.getElementById('stat-coupons');
      const sBought  = document.getElementById('stat-bought');
      if (sDeals)   sDeals.textContent   = stats.dealsFound || 0;
      if (sSaved)   sSaved.textContent   = '$' + (stats.totalSaved || 0).toFixed(0);
      if (sCoupons) sCoupons.textContent = stats.couponsClipped || 0;
      if (sBought)  sBought.textContent  = stats.totalPurchased || 0;

      // Settings
      if (masterToggle) masterToggle.checked = settings.enabled !== false;
      if (toggleClip)   toggleClip.classList.toggle('active', settings.autoClipCoupons !== false);
      if (toggleCart)   toggleCart.classList.toggle('active', settings.autoAddToCart !== false);
      if (toggleBuy)    toggleBuy.classList.toggle('active', !!settings.autoBuy);
      if (minDiscount && settings.minDiscount) minDiscount.value = settings.minDiscount;
      if (maxPrice && settings.maxPrice)       maxPrice.value    = settings.maxPrice;
      if (maxDaily && settings.maxDailySpend)  maxDaily.value    = settings.maxDailySpend;
      if (preferredCard && settings.preferredCard) preferredCard.value = settings.preferredCard;
      if (toggleAutoCheckout) toggleAutoCheckout.classList.toggle('active', settings.autoCheckout !== false);

      // Telegram
      if (teleToken)  teleToken.value  = telegram.botToken || '';
      if (teleChatId) teleChatId.value = telegram.chatId   || '';
      updateTeleStatus(!!telegram.connected);

      // Sniper UI & Inputs
      if (sniper.url && sniperUrl && !sniperUrl.value) sniperUrl.value = sniper.url;
      if (sniper.maxPrice && sniperMaxPrice && !sniperMaxPrice.value) sniperMaxPrice.value = sniper.maxPrice;
      if (sniper.priceCondition && sniperPriceCondition) sniperPriceCondition.value = sniper.priceCondition;
      if (sniper.intervalSec && sniperSpeed) sniperSpeed.value = sniper.intervalSec;
      if (sniper.actionType && sniperAction) sniperAction.value = sniper.actionType;
      updateSniperUI(sniper);

      // Danh sách
      renderWatchlist(allData.watchlist || []);
      renderHistory(allData.history || []);
    }

    function renderWatchlist(wl) {
      const c = document.getElementById('watchlist-container');
      if (!c) return;
      if (!wl.length) {
        c.innerHTML = '<div class="empty-msg"><div class="empty-icon-big">👁️</div><p>Chưa có sản phẩm theo dõi</p></div>';
        return;
      }
      c.innerHTML = wl.map(p => {
        const hit = p.currentPrice > 0 && p.currentPrice <= p.targetPrice;
        const sc  = p.status === 'purchased' ? 'status-bought' : hit ? 'status-target' : p.autoBuy ? 'status-autobuy' : 'status-watching';
        const st  = p.status === 'purchased' ? '✅ ĐÃ MUA' : hit ? '🎉 ĐẠT' : p.autoBuy ? '🤖 AUTO' : '👁️';
        return `
          <div class="product-card ${hit ? 'target-hit' : ''}">
            <div class="card-row">
              ${p.image ? `<img class="card-img" src="${esc(p.image)}">` : ''}
              <div class="card-info">
                <div class="card-name">${esc(p.name)}</div>
                <div class="card-price">$${(p.currentPrice || 0).toFixed(2)}
                  ${p.originalPrice > p.currentPrice ? `<span class="orig">$${p.originalPrice.toFixed(2)}</span>` : ''}
                  ${hit ? `<span class="disc">≤$${p.targetPrice.toFixed(2)}✓</span>` : ''}
                </div>
              </div>
            </div>
            <div class="card-meta">
              <span class="card-status ${sc}">${st}</span>
              <div class="card-actions">
                <button class="card-btn" data-act="open" data-url="${esc(p.url)}">🔗</button>
                <button class="card-btn del" data-act="del" data-id="${p.id}">🗑️</button>
              </div>
            </div>
          </div>`;
      }).join('');

      c.querySelectorAll('.card-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'open') {
            chrome.tabs.create({ url: btn.dataset.url });
          } else if (act === 'del') {
            await chrome.runtime.sendMessage({ action: 'REMOVE_FROM_WATCHLIST', productId: btn.dataset.id }).catch(() => {});
            const curData = await chrome.storage.local.get(['watchlist']);
            const updated = (curData.watchlist || []).filter(item => item.id !== btn.dataset.id);
            await chrome.storage.local.set({ watchlist: updated });
            renderWatchlist(updated);
          }
        });
      });
    }



    function renderHistory(h) {
      const c = document.getElementById('history-container');
      if (!c) return;
      if (!h.length) {
        c.innerHTML = '<div class="empty-msg"><p>Chưa có lịch sử mua hàng</p></div>';
        return;
      }
      c.innerHTML = h.map(x => `
        <div class="history-item">
          <span class="hi-name">${esc(x.name)}</span><br>
          <span class="hi-price">$${(x.price || 0).toFixed(2)}</span>
          ${x.savedAmount > 0 ? `<span class="hi-saved"> (tiết kiệm $${x.savedAmount.toFixed(2)})</span>` : ''}
          <span class="hi-date"> • ${x.date ? new Date(x.date).toLocaleDateString('vi') : ''}</span>
        </div>`).join('');
    }

    // Tự điền link từ tab hiện tại nếu là Amazon
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url && /amazon\./i.test(tab.url)) {
        if (sniperUrl && !sniperUrl.value) {
          sniperUrl.value = tab.url;
          detectCurrency(tab.url);
        }
        if (searchInput && !searchInput.value) searchInput.value = tab.url;
      }
    }).catch(() => {});

    // Khởi chạy
    refreshAllData();

    // Lắng nghe cập nhật
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.action === 'SNIPER_STATUS_CHANGED') {
        updateSniperUI(msg.sniper);
        return;
      }
      refreshAllData();
    });
  });
})();
