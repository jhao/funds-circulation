# 财圈管理 (Finance Circle)

一个基于 React + TypeScript + TailwindCSS 的纯前端工程项目管理系统。所有数据存储在本地浏览器 LocalStorage 中。

## 1. 本地开发

需要安装 [Node.js](https://nodejs.org/) (建议 v18+)。

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 2. 项目打包

部署前需要将 TypeScript 和 React 代码编译为静态资源。

```bash
# 执行构建
npm run build
```

构建完成后，会生成一个 `dist` 目录，其中包含：
- `index.html`
- `assets/` (包含打包后的 js 和 css 文件)

## 3. Nginx 部署

### 方案 A：使用 Docker (推荐)

项目根目录下创建一个 `Dockerfile`：

```dockerfile
# 阶段 1：构建
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 阶段 2：Nginx 服务
FROM nginx:alpine
# 复制构建产物到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html
# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

构建并运行：
```bash
docker build -t finance-circle .
docker run -d -p 8080:80 finance-circle
```
访问 `http://localhost:8080` 即可。

### 方案 B：手动部署到 Nginx 服务器

1. 在服务器上安装 Nginx。
2. 将本地 `npm run build` 生成的 `dist` 文件夹内的所有内容上传到服务器目录（例如 `/var/www/finance-circle`）。
3. 修改 Nginx 配置（参考项目中的 `nginx.conf`），确保 `root` 指向上传的目录。
4. 重载 Nginx：`nginx -s reload`。
```