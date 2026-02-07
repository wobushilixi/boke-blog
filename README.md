# boke-blog

轻量静态博客 + 后台编辑器（Markdown 实时预览、锚点、颜色）+ 访问统计。

## 结构
- `/www/wwwroot/boke.iozz.cc`：前端静态站点
- `/opt/boke-admin`：后台管理（Node.js）
- `/opt/visitor-stats`：访问统计（独立 IP）
- `/etc/systemd/system/boke-admin.service`
- `/etc/systemd/system/visitor-stats.service`
- `/www/server/panel/vhost/nginx/boke.iozz.cc.conf`

> 本仓库已按上述结构打包（路径保持一致）。

## 部署（在新服务器）

### 1. 前置
```bash
apt update
apt install -y nodejs npm nginx
```

### 2. 放置文件
将本仓库内容解压到服务器根目录（保持路径不变）。
例如：
```bash
rsync -av ./www/ /www/
rsync -av ./opt/ /opt/
rsync -av ./etc/systemd/system/ /etc/systemd/system/
rsync -av ./www/server/panel/vhost/nginx/ /www/server/panel/vhost/nginx/
```

### 3. 安装后台依赖
```bash
cd /opt/boke-admin
npm install
```

### 4. 启动服务
```bash
systemctl daemon-reload
systemctl enable --now boke-admin
systemctl enable --now visitor-stats
```

### 5. Nginx
```bash
nginx -t && systemctl reload nginx
```

### 6. 访问
- 网站：`https://boke.iozz.cc`
- 后台：`https://boke.iozz.cc/admin`

## 说明
- 默认后台账号：`iozz / njf1314520`
- 忘记密码重置码：`ldz`
- 访问统计接口：`/api/visit`

## 贡献
欢迎 PR。
