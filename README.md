# B3D Lab · Quản lý kinh doanh in 3D

Ứng dụng Next.js quản lý các nhóm dữ liệu trong workbook B3D Lab. Supabase lưu dữ liệu; ứng dụng tính giá thành profile, tổng hợp doanh thu đơn hàng, tồn kho, chi phí và báo cáo.

## Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

## Kết nối Supabase

1. Tạo project trong [Supabase Dashboard](https://supabase.com/dashboard).
2. Mở **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql` và nhấn **Run**. Script tạo các bảng nghiệp vụ, các view tính giá thành/giá mục tiêu, cùng trigger tổng hợp đơn hàng và tồn kho. Có thể chạy lại để cập nhật schema; nếu database đã có dữ liệu, hãy sao lưu trước.
3. Trong **Project Settings → API Keys**, lấy Project URL và secret/service_role key. Anon key không được dùng để đọc dữ liệu của dashboard.
4. Tạo `.env.local` cạnh `package.json`:

   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
   APP_PASSWORD=choose-a-long-private-password
   ```

5. Khởi động lại `npm run dev`. Đăng nhập bằng `APP_PASSWORD`. Không đưa secret key, mật khẩu hoặc `.env.local` lên GitHub.

## Chuyển workbook sang ứng dụng

Dashboard có liên kết tới màn quản lý cho các nhóm dữ liệu: cấu hình, sản phẩm, vật liệu, máy in, cấu hình in, kênh bán, đơn hàng, chi tiết đơn, sản xuất, tồn kho, chi phí và báo cáo. Mỗi màn hỗ trợ xem, thêm, sửa và xóa bản ghi. Profile in hiển thị giá thành ước tính; báo cáo tổng hợp số liệu tháng.

Để nhập workbook, trên dashboard chọn **Nhập Excel**. Chọn sheet đích; workbook B3D Lab được nhận diện theo hàng tiêu đề số 4, còn CSV/Excel thông thường dùng hàng tiêu đề đầu tiên. Import theo thứ tự để mã liên kết có sẵn trước: `CAU_HINH`, `VAT_LIEU`, `MAY_IN`, `KENH_BAN`, `SAN_PHAM`, `CAU_HINH_IN`, `DON_HANG`, `CT_DON_HANG`, `SAN_XUAT`, `TON_KHO`, `CHI_PHI`. `HUONG_DAN` và `BAO_CAO` là sheet mô tả/tổng hợp, không nhập làm bảng dữ liệu.

Importer xem trước cột và vài dòng trước khi ghi, hỗ trợ tối đa 1.000 dòng/lần và yêu cầu đăng nhập quản trị. Các dòng có cùng mã được cập nhật. Workbook mẫu có dữ liệu minh họa; chỉ xác nhận nhập những dòng bạn muốn giữ. Không có dòng mẫu nào tự được thêm vào Supabase.

### Quy tắc tính hiện tại

- Giá vật liệu/gram = giá mua ÷ khối lượng cuộn nếu file chưa có giá/gram.
- Khấu hao máy/giờ = giá máy và phụ kiện ÷ tổng giờ dự kiến nếu chưa nhập.
- Giá thành profile tính nhựa, điện, khấu hao, bảo trì, công vận hành, công thiết kế phân bổ và tỷ lệ lỗi.
- Giá mục tiêu theo kênh dùng phí tỷ lệ, phí cố định, bao bì và biên lợi nhuận mục tiêu.
- Đơn hàng tổng hợp doanh thu/lợi nhuận từ chi tiết đơn và điều chỉnh ở đầu đơn.
- Tồn vật liệu/thành phẩm được cập nhật từ sổ giao dịch tồn kho; tồn đầu kỳ là mức nền vật liệu.

Đối chiếu các giả định phí sàn, điện, công, hao hụt và chi phí với số liệu thật trước khi dùng báo cáo làm quyết định kinh doanh. Tích hợp API Shopee và sao kê quyết toán chưa có trong bản này.

## GitHub và deploy

GitHub lưu source code, Supabase lưu dữ liệu. Không commit `.env.local`. Khi deploy, khai báo ba biến môi trường trên trong cấu hình hosting và redeploy. `service_role` chỉ được dùng ở server routes; không gắn tiền tố `NEXT_PUBLIC_`.
