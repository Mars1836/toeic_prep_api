# Sử dụng hình ảnh Node.js chính thức
FROM node:18-alpine

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Copy file package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Expose port mà server sử dụng
EXPOSE 4000

# Lệnh để chạy server
CMD ["npm", "run", "start:docker"]
