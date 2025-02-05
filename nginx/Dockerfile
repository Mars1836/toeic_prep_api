FROM nginx:latest

# Cài đặt Certbot và các phần mềm cần thiết
RUN apt-get update && apt-get install -y \
    certbot \
    python3-certbot-nginx \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục /etc/letsencrypt nếu chưa có
RUN mkdir -p /etc/letsencrypt

# Tải các tệp SSL cần thiết cho Nginx từ GitHub
RUN wget https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -P /etc/letsencrypt/ \
    && wget https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/ssl-dhparams.pem -P /etc/letsencrypt/

# Sao chép các cấu hình Nginx vào container
COPY default.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Mở cổng 80 và 443 để có thể cài đặt SSL
EXPOSE 80 443

# Tạo một script để tự động cài đặt chứng chỉ SSL và khởi động Nginx
RUN echo "#!/bin/bash\n\
    certbot --nginx -d ftp.codelife138.io.vn --agree-tos --no-eff-email --email hauhpll123@gmail.com\n\
    nginx -g 'daemon off;'" > /entrypoint.sh \
    && chmod +x /entrypoint.sh

# Đặt entrypoint là script vừa tạo
ENTRYPOINT ["/entrypoint.sh"]
