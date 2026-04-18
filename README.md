# TFT

Web app tĩnh cho TFT

## 1. Lấy code

### Cách 1: tải file ZIP

Vào repo GitHub rồi bấm:

- `Code`
- `Download ZIP`

### Cách 2: clone bằng git

```bash
git clone https://github.com/050313250102-dot/TFT.git
cd TFT
```

## 2. Chạy local

Đây là app frontend tĩnh. Có thể chạy bằng local server đơn giản.

### Cách nhanh với Python

```bash
python -m http.server 8000
```

Mở trình duyệt:

```text
http://localhost:8000
```

### Cách nhanh với Node

```bash
npx serve .
```

## 3. Cấu trúc chính

- `index.html`: giao diện chính
- `style.css`: CSS
- `app.js`: logic frontend
- `data.js`: dữ liệu app
- `augment-icons.js`: dữ liệu icon augment
- `augment-search-aliases.js`: alias tìm kiếm

## 4. Quy trình làm việc

### Sửa local rồi đẩy lên GitHub

1. Mở repo local.
2. Sửa file.
3. Commit.
4. Push lên GitHub.

```bash
git add .
git commit -m "your message"
git push origin master
```

### Kéo bản mới nhất từ VPS về local

Trong thư mục repo có sẵn:

- `pull-from-vps.cmd`

Chỉ cần bấm file này để kéo source mới từ VPS về local.

### Đẩy source local lên VPS

Trong thư mục repo có sẵn:

- `push-to-vps.cmd`

Chỉ cần bấm file này để đẩy source local lên VPS.

## 5. VPS

- VPS path: `/var/www/html/tft`
- Pull từ VPS về local: `pull-from-vps.cmd`
- Push từ local lên VPS: `push-to-vps.cmd`

## 6. Lưu ý

- Repo hiện dùng branch `master`
- Windows có thể hiện cảnh báo `LF/CRLF`, hiện chưa ảnh hưởng chạy app
- Các file `pull-from-vps.*` và `push-to-vps.*` là file tiện ích local để đồng bộ

## 7. GitHub

Repo hiện tại:

`https://github.com/050313250102-dot/TFT`

Nếu muốn người khác cùng làm:

- repo `Private`: mời họ vào `Settings` -> `Collaborators`
- repo `Public`: chỉ cần gửi link repo
