# SEO 部署清单

## ✅ 已完成的 SEO 配置

### 1. HTML Meta 标签 (index.html)
- [x] Title 标签优化
- [x] Description meta 标签
- [x] Keywords meta 标签
- [x] Robots meta 标签
- [x] Open Graph (OG) 标签（Facebook、LinkedIn）
- [x] Twitter Card 标签
- [x] Canonical URL 标签
- [x] hreflang 标签（多语言）
- [x] Theme color 标签
- [x] Apple mobile web app 标签

### 2. 结构化数据 (JSON-LD)
- [x] WebApplication schema
- [x] SoftwareApplication schema
- [x] FAQPage schema
- [x] 支持多语言配置

### 3. 网站文件
- [x] robots.txt - 搜索引擎爬虫指南
- [x] sitemap.xml - 网站地图
- [x] manifest.json - PWA 应用清单
- [x] metadata.json - 元数据配置
- [x] .htaccess - Apache 服务器配置
- [x] SEO_CONFIG.md - SEO 配置指南

## 🚀 部署步骤

### 第 1 步：更新 URL 配置
在以下文件中，将所有 `https://camera-simulator.example.com/` 替换为实际的网站 URL：

```bash
# 编辑 index.html
# 编辑 sitemap.xml
# 编辑 manifest.json
# 编辑 .htaccess
# 编辑 metadata.json
```

示例：
```
https://camera-simulator.example.com/ 
改为
https://yourdomain.com/
```

### 第 2 步：上传文件到服务器

```bash
# 确保以下文件在网站根目录
- index.html
- robots.txt
- sitemap.xml
- manifest.json
- .htaccess （仅适用于 Apache 服务器）
- metadata.json
```

### 第 3 步：配置服务器

**Apache 服务器（使用 .htaccess）：**
1. 确保 mod_rewrite 已启用
2. 确保 mod_deflate（gzip）已启用
3. .htaccess 文件应自动加载

**Nginx 服务器：**
需要在 nginx.conf 中手动配置相等的设置：

```nginx
# 启用 gzip 压缩
gzip on;
gzip_types text/plain text/css text/javascript application/json;

# 设置缓存头
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.(html|htm)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800";
}

# 添加安全头
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
```

### 第 4 步：提交到搜索引擎

**Google Search Console：**
1. 访问 https://search.google.com/search-console
2. 验证网站所有权
3. 提交 sitemap.xml
   - 进入 Sitemaps 部分
   - 输入 `https://yourdomain.com/sitemap.xml`

**Bing Webmaster Tools：**
1. 访问 https://www.bing.com/webmasters
2. 添加网站
3. 验证网站所有权
4. 提交 sitemap.xml

**Baidu Search Console（中文网站）：**
1. 访问 https://zhanzhang.baidu.com/
2. 添加网站
3. 提交 sitemap.xml

### 第 5 步：添加图片资源

在网站根目录创建以下图片：

```
/og-image.jpg (1200x630px) - 社交媒体分享
/screenshot.jpg (1280x720px) - 应用截图
/screenshot-192.png (192x192px) - 小型截图
/screenshot-512.png (512x512px) - 大型截图
/icon-192.png (192x192px) - 应用图标
/icon-512.png (512x512px) - 应用图标
/icon-maskable.png (512x512px) - 可掩膜图标
/apple-touch-icon.png (180x180px) - iOS 主屏幕图标
```

### 第 6 步：测试 SEO 配置

**Google Rich Results Test：**
https://search.google.com/test/rich-results

**Mobile-Friendly Test：**
https://search.google.com/test/mobile-friendly

**PageSpeed Insights：**
https://pagespeed.web.dev/

**Schema Validator：**
https://validator.schema.org/

## 📊 监测与维护

### 定期检查项目

1. **Google Search Console**
   - 检查页面索引状态
   - 查看搜索查询和排名
   - 检查爬虫错误

2. **性能监测**
   - 使用 PageSpeed Insights 监测页面速度
   - 监测 Core Web Vitals
   - 检查爬虫数据

3. **排名跟踪**
   - 使用 SEO 工具跟踪关键词排名
   - 监测竞争对手

## 🔍 SEO 检查清单

- [ ] 所有 URL 已更新为实际域名
- [ ] robots.txt 已上传且格式正确
- [ ] sitemap.xml 已上传且格式正确
- [ ] manifest.json 已上传
- [ ] 网站在 Google Search Console 中注册
- [ ] Sitemap 已在 GSC 中提交
- [ ] 网站在 Bing Webmaster 中注册
- [ ] 图片资源已上传
- [ ] HTTPS 已启用
- [ ] 安全头已配置
- [ ] Gzip 压缩已启用
- [ ] 缓存头已配置
- [ ] 移动设备测试通过
- [ ] Schema 验证通过

## 💡 关键词优化

已优化的主要关键词：
- 相機模擬器
- Camera Simulator
- 攝影模擬
- 光圈快門 ISO 模擬
- 景深效果
- 漏光效果
- 降噪工具

## 🌐 多语言 SEO

已配置的语言：
- 繁體中文 (zh-Hant)
- English (en)
- 日本語 (ja)

每种语言都有单独的 hreflang 标签和 Sitemap 条目。

## 📞 技术支持

如有任何 SEO 相关问题，请参考：
- [Google Search Central](https://developers.google.com/search)
- [Moz SEO Learning Center](https://moz.com/learn/seo)
- [Schema.org Documentation](https://schema.org/)
