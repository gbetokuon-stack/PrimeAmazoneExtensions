# ⚡ Prime Amazon Hunter & Auto Checkout Bot

<p align="center">
  <img src="icons/icon128.png" alt="Logo" width="96" height="96" />
</p>

<p align="center">
  <b>Extension Chrome tự động săn hàng, canh mở bán, thêm giỏ hàng & thanh toán siêu tốc 1-Click trên Amazon.</b>
  <br />
  Hỗ trợ đầy đủ Amazon US, Amazon Japan (co.jp), UK, DE, CA... cùng thông báo tức thì qua Telegram Bot.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-brightgreen.svg" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Version-3.0.0-blue.svg" alt="Version 3.0" />
  <img src="https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/Supported-Amazon%20Global%20%26%20Japan-red.svg" alt="Amazon Global" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
</p>

---

## 🌟 Tính Năng Nổi Bật

### 1. ⚡ Sniper Mode (Canh Giờ Mở Bán & Chốt Đơn Tự Động)
- **Hẹn giờ mở bán chính xác**: Đặt ngày và giờ mở bán (hỗ trợ định dạng `YYYY-MM-DDTHH:mm:ss`).
- **Turbo Mode**: Tự động tăng tốc độ làm mới và quét sản phẩm liên tục (mỗi 500ms) khi còn 15 giây trước giờ mở bán.
- **Điều kiện so sánh giá linh hoạt**:
  - `≤` (Bằng hoặc thấp hơn giá mục tiêu): Săn sale giá rẻ, giảm giá.
  - `≥` (Bằng hoặc cao hơn giá mục tiêu): Dành cho trường hợp chọn bundle, bản đặc biệt hoặc tránh mua nhầm phụ kiện giá rẻ.
  - `Bất kỳ giá nào`: Chốt đơn mở bán bằng mọi giá (dành cho hàng hiếm/limited).
- **3 chế độ hành động**:
  1. `🛒 Thêm vào giỏ hàng`: Chỉ bỏ vào giỏ hàng để bạn kiểm tra sau.
  2. `💳 Đưa đến trang thanh toán`: Tự động thêm giỏ và chuyển thẳng sang màn hình Checkout.
  3. `⚡ Mua ngay 100%`: Tự động ấn *Buy Now* / *Place Order* hoàn tất đặt hàng siêu tốc.

---

### 2. 🛒 On-Page Quick Bar (Nút Tắt Tiện Ích Trực Tiếp Trên Trang Amazon)
- Khi truy cập bất kỳ trang sản phẩm nào trên Amazon, thanh công cụ nổi (Quick Bar) sẽ xuất hiện ở góc dưới màn hình:
  - **`⚡ MUA NGAY 100%`**: Bỏ qua các bước trung gian, tự động nhấn Buy Now và xác nhận đặt hàng.
  - **`🛒 THÊM GIỎ & THANH TOÁN`**: Tự động cho vào giỏ và chuyển thẳng tới trang xác nhận thanh toán.
- **Tự động vượt qua chướng ngại vật**: Bỏ qua các popup mời mọc bảo hiểm (Warranty), gói bảo hành hoặc mời dùng thử Amazon Prime.

---

### 3. 🗾 Tối Ưu Toàn Diện Cho Amazon Nhật Bản (`amazon.co.jp`)
- Hỗ trợ toàn bộ giao diện và nút bấm tiếng Nhật:
  - `カートに入れる` (Add to Cart)
  - `今すぐ買う` (Buy Now)
  - `レジに進む` (Proceed to Checkout)
  - `注文を確定する` (Place your order)
- Hoạt động mượt mà song song với Amazon US, UK, DE, FR, CA, AU, IT, ES...

---

### 4. 🔍 Tìm Kiếm & Chốt Đơn Nhanh Trong Popup
- Tìm kiếm sản phẩm theo từ khóa trực tiếp bên trong popup extension.
- Xem danh sách kết quả, hình ảnh, giá bán theo thời gian thực.
- Nút bấm trực tiếp: **Thêm Giỏ** hoặc **Mua Ngay** cho từng kết quả tìm kiếm.

---

### 5. 📱 Tích Hợp Thông Báo Telegram Bot
- Nhận thông báo tức thì vào điện thoại/máy tính qua Telegram mỗi khi:
  - Bắt đầu canh hàng (Sniper Started).
  - Bắt được hàng thành công (Item Sniped / Cart Added).
  - Hoàn tất đặt hàng (Order Placed) kèm tên sản phẩm, giá tiền và ảnh đại diện sản phẩm.

---

## 🚀 Hướng Dẫn Cài Đặt

### Bước 1: Tải mã nguồn
Clone repo này về máy tính hoặc tải file ZIP về rồi giải nén:
```bash
git clone https://github.com/your-username/prime-amazon-hunter.git
```

### Bước 2: Tạo Icon (nếu chưa có thư mục `icons/`)
Nếu chưa có sẵn file icon, mở PowerShell trong thư mục dự án và chạy:
```powershell
powershell -ExecutionPolicy Bypass -File generate-icons.ps1
```

### Bước 3: Cài đặt vào trình duyệt (Chrome / Edge / Brave / Cốc Cốc)
1. Mở trình duyệt Chrome và truy cập đường dẫn: `chrome://extensions/`
2. Bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
3. Nhấp vào nút **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục chứa mã nguồn extension (`PrimeAmazon`).
5. Ghim (Pin) icon extension lên thanh công cụ của trình duyệt để sử dụng thuận tiện.

---

## 📖 Hướng Dẫn Sử Dụng

### 1. Chuẩn bị tài khoản Amazon (Rất quan trọng cho Mua Tự Động)
Để tính năng mua 1-Click hoặc tự động đặt hàng hoạt động không bị khựng:
1. Đăng nhập sẵn tài khoản Amazon của bạn trên trình duyệt.
2. Cài đặt sẵn **Địa chỉ giao hàng mặc định** (Default Shipping Address).
3. Cài đặt sẵn **Phương thức thanh toán mặc định** (1-Click Settings / Default Payment).

### 2. Thiết lập Telegram Bot (Nhận thông báo)
1. Mở Telegram, tìm bot `@BotFather` và tạo một bot mới để lấy **Bot Token**.
2. Tìm bot `@userinfobot` hoặc `@getmyid_bot` để lấy **Chat ID** của bạn.
3. Mở extension, vào tab **⚙️ CÀI ĐẶT**:
   - Dán `Bot Token` và `Chat ID`.
   - Bật tuỳ chọn *Bật thông báo Telegram*.
   - Nhấn **Lưu cài đặt**.

### 3. Cài đặt Sniper (Canh giờ mở bán)
1. Mở extension, chọn tab **🎯 SNIPER**.
2. **Link SP**: Dán link sản phẩm Amazon cần canh (hoặc mở trang sản phẩm rồi click extension, link sẽ tự động được nhận).
3. **Giờ mở bán**: Chọn ngày giờ sản phẩm dự kiến mở bán (bỏ trống nếu muốn quét và mua ngay lập tức).
4. **Điều kiện giá**:
   - `≤` : Giá phải nhỏ hơn hoặc bằng giá bạn mong muốn.
   - `≥` : Giá phải lớn hơn hoặc bằng giá bạn mong muốn.
   - `Bất kỳ` : Bỏ qua giá, mở bán là xúc ngay.
5. **Giá mục tiêu**: Nhập số tiền (ví dụ: `2500` cho Yên Nhật hoặc `50` cho USD).
6. **Hành động**: Chọn hành động mong muốn (*Thêm giỏ* / *Đưa vào thanh toán* / *Mua ngay 100%*).
7. Nhấn **⚡ KÍCH HOẠT SNIPER**. Extension sẽ tự động canh giờ và thực hiện tác vụ chính xác.

---

## 📁 Cấu Trúc Thư Mục

```text
PrimeAmazon/
├── background/
│   └── service-worker.js    # Xử lý chạy ngầm, vòng lặp Sniper, gọi Telegram API, quản lý Alarms
├── content/
│   ├── content.js           # Script tương tác trực tiếp DOM, tự động click nút, chèn Quick Bar
│   └── content.css          # Giao diện styling cho thanh Quick Bar và thông báo trên trang
├── popup/
│   ├── popup.html           # Giao diện chính của Extension (Cyberpunk Neon Theme)
│   ├── popup.js             # Logic điều khiển giao diện, gửi lệnh sniper, tìm kiếm sản phẩm
│   └── popup.css            # Stylesheet hiện đại cho popup
├── options/
│   ├── options.html         # Trang cài đặt nâng cao
│   └── options.js
├── icons/                   # Chứa icon kích thước 16x16, 48x48, 128x128
├── generate-icons.ps1       # Script PowerShell hỗ trợ tạo icon tự động
├── manifest.json            # Cấu hình Chrome Extension Manifest V3
└── README.md                # Tài liệu hướng dẫn sử dụng
```

---

## 🔒 Quyền Hạn (Permissions) & Bảo Mật

Extension tuân thủ nghiêm ngặt chuẩn **Manifest V3** của Google Chrome:
- `storage`: Lưu trữ cấu hình sniper và thông tin cài đặt cá nhân cục bộ trên máy.
- `alarms`: Đặt lịch trình kiểm tra giá và canh giờ mở bán chính xác mà không tốn pin.
- `notifications`: Hiển thị thông báo trên máy tính khi bắt được sản phẩm.
- `activeTab` & `scripting`: Hỗ trợ thao tác nhấn nút trên tab sản phẩm bạn đang mở.
- `host_permissions`: Chỉ tương tác trên các tên miền Amazon (`amazon.com`, `amazon.co.jp`, v.v.). Không thu thập thông tin thẻ hay dữ liệu mật của người dùng.

---

## ⚠️ Tuyên Bố Từ Chối Trách Nhiệm (Disclaimer)

- Công cụ này được phát triển phục vụ mục đích học tập, nghiên cứu tự động hóa trình duyệt và hỗ trợ cá nhân mua sắm thuận tiện hơn.
- Người dùng chịu hoàn toàn trách nhiệm đối với các giao dịch mua hàng, chi phí phát sinh và việc tuân thủ Điều khoản dịch vụ của Amazon.
- Tác giả không chịu trách nhiệm về bất kỳ thiệt hại tài chính hoặc tài khoản nào phát sinh từ việc sử dụng công cụ này.

---

## 📄 License

Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
"# JapanPriceAmazon" 
