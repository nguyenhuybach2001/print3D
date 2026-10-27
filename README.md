# B3D Lab · Dashboard quản lý xưởng in 3D

Ứng dụng Next.js đọc dashboard trực tiếp từ Supabase. Project chưa có dữ liệu giả được chèn sẵn; bảng trống sẽ được hiển thị khi chưa nhập dữ liệu.

## Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Kết nối Supabase

1. Tạo project tại [supabase.com/dashboard](https://supabase.com/dashboard) và lưu database password ở nơi an toàn.
2. Trong Supabase, mở **SQL Editor → New query**, dán nội dung `supabase/schema.sql`, rồi nhấn **Run**. Script tạo các bảng `orders`, `materials`, `products` và chính sách đọc của MVP.
3. Vào **Project Settings → API** (một số giao diện hiển thị ở **Project Settings → Data API**) để lấy Project URL và anon/publishable key.
4. Tạo file `.env.local` ở thư mục gốc (cùng cấp `package.json`) với nội dung:

   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

5. Dừng rồi chạy lại `npm run dev`. Dashboard sẽ truy vấn `orders` và `materials` từ Supabase khi mở trang.
6. Nhập dữ liệu thật vào Table Editor hoặc import CSV. Đơn hàng cần `order_number`, `channel`, `total_amount`, `profit`, `status`; vật liệu cần `name`, `quantity`, `low_stock_threshold`. Schema đã có mặc định cho một số cột.

`SUPABASE_ANON_KEY`/publishable key được dùng với RLS và chỉ có policy `SELECT` trong schema này. Không dùng `service_role`/secret key ở trình duyệt hoặc commit key lên GitHub. `.env.local` đã bị Git bỏ qua theo `.gitignore`. MVP hiện chỉ đọc dashboard, chưa có đăng nhập hoặc form ghi/sửa dữ liệu. Vì vậy, trước khi đưa dữ liệu kinh doanh nhạy cảm lên môi trường public, cần bổ sung Supabase Auth và policy giới hạn theo tài khoản; không mở quyền đọc công khai cho dữ liệu thật.

## Đưa code lên GitHub

1. Tạo repository mới trên GitHub, nên để **Private** khi source còn chứa chi tiết nghiệp vụ. Không chọn tạo README nếu repo local đã có README.
2. Trong Terminal, ở thư mục dự án, chạy:

   ```bash
   git add .
   git commit -m "Build B3D Lab dashboard with Supabase"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

   Nếu đã có remote `origin`, xem bằng `git remote -v` và dùng `git remote set-url origin ...` thay vì thêm lần nữa.
3. Trên GitHub, kiểm tra **Settings → Secrets and variables → Actions** nếu sau này thêm CI. Không tạo commit `.env.local`; file này chứa credential cá nhân.

GitHub lưu và quản lý mã nguồn; dữ liệu live vẫn ở Supabase. Nếu deploy lên Vercel, thêm cùng hai biến môi trường trong **Project Settings → Environment Variables**, sau đó redeploy.
