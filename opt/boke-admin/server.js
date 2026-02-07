import express from "express";
import session from "express-session";
import fs from "fs";
import path from "path";
import { marked } from "marked";
import slugify from "slugify";

const APP_USER = "iozz";
const APP_PASS = "njf1314520";
const RESET_CODE = "ldz";
const RESET_HINT = "一个喜欢的女孩";

const ADMIN_BASE = "/admin";
const PORT = 4001;
const SITE_ROOT = "/www/wwwroot/boke.iozz.cc";
const POSTS_DIR = path.join(SITE_ROOT, "posts");
const MD_DIR = path.join(SITE_ROOT, "md");
const INDEX_JSON = path.join(SITE_ROOT, "posts.json");
const PUBLIC_DIR = "/opt/boke-admin/public";

const app = express();
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(session({
  secret: "boke-admin-secret-iozz",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));

app.use(ADMIN_BASE + "/assets", express.static(PUBLIC_DIR));

function ensureDirs() {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
  if (!fs.existsSync(MD_DIR)) fs.mkdirSync(MD_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_JSON)) fs.writeFileSync(INDEX_JSON, JSON.stringify([]));
}
ensureDirs();

function readPosts() {
  try { return JSON.parse(fs.readFileSync(INDEX_JSON, "utf-8")); } catch { return []; }
}
function writePosts(posts) {
  fs.writeFileSync(INDEX_JSON, JSON.stringify(posts, null, 2));
}
function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$|--+/g, "");
}

function renderHtml({ title, content, createdAt }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif;margin:0;background:#fff;color:#0b0b0f;}
    .wrap{max-width:900px;margin:0 auto;padding:64px 24px 96px;}
    h1{font-size:36px;margin:0 0 8px 0;letter-spacing:-0.02em;}
    .meta{color:#6b7280;font-size:14px;margin-bottom:24px;}
    article{line-height:1.85;font-size:17px;}
    pre{background:#0b0b0f;color:#f9fafb;padding:16px;border-radius:12px;overflow:auto;}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
    a{color:#111827;text-decoration:none;border-bottom:1px solid #e5e7eb;}
    a:hover{border-bottom-color:#111827;}
    .anchor{margin-left:6px;font-size:12px;color:#6b7280;text-decoration:none;border:0;}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${title}</h1>
    <div class="meta">${createdAt}</div>
    <article>${content}</article>
  </div>
</body>
</html>`;
}

function requireLogin(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.redirect(ADMIN_BASE + "/login");
}

// simple rate limit
const attempts = new Map();
function hit(ip, key){
  const now = Date.now();
  const k = ip+":"+key;
  const arr = attempts.get(k) || [];
  const fresh = arr.filter(t => now - t < 10*60*1000);
  fresh.push(now);
  attempts.set(k, fresh);
  return fresh.length;
}
function tooMany(ip, key){
  const now = Date.now();
  const k = ip+":"+key;
  const arr = (attempts.get(k) || []).filter(t => now - t < 10*60*1000);
  return arr.length >= 6;
}

app.get(ADMIN_BASE + "/login", (req, res) => {
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>登录</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial;margin:0;background:#f5f6f7;} .box{max-width:360px;margin:120px auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,.06);} input{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;margin:8px 0;} button{width:100%;padding:10px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer;} a{color:#111827;text-decoration:none;font-size:13px;} </style></head>
<body><div class="box"><h3>后台登录</h3>
<form method="POST" action="${ADMIN_BASE}/login">
<input name="username" placeholder="用户名">
<input name="password" type="password" placeholder="密码">
<button type="submit">登录</button>
</form>
<div style="margin-top:10px;"><a href="${ADMIN_BASE}/forgot">忘记密码</a></div>
</div></body></html>`);
});

app.post(ADMIN_BASE + "/login", (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "";
  if (tooMany(ip, "login")) return res.send("尝试过多，请稍后再试");
  const { username, password } = req.body || {};
  if (username === APP_USER && password === APP_PASS) {
    req.session.authed = true;
    return res.redirect(ADMIN_BASE + "/");
  }
  hit(ip, "login");
  return res.send("登录失败");
});

app.get(ADMIN_BASE + "/forgot", (req, res) => {
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>忘记密码</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial;margin:0;background:#f5f6f7;} .box{max-width:360px;margin:120px auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,.06);} input{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;margin:8px 0;} button{width:100%;padding:10px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer;} .hint{color:#6b7280;font-size:12px;} </style></head>
<body><div class="box"><h3>忘记密码</h3>
<div class="hint">提示词：${RESET_HINT}</div>
<form method="POST" action="${ADMIN_BASE}/forgot">
<input name="code" placeholder="重置码">
<button type="submit">验证</button>
</form>
</div></body></html>`);
});

app.post(ADMIN_BASE + "/forgot", (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "";
  if (tooMany(ip, "forgot")) return res.send("尝试过多，请稍后再试");
  const { code } = req.body || {};
  if (code === RESET_CODE) {
    return res.send(`账号：${APP_USER}  密码：${APP_PASS}`);
  }
  hit(ip, "forgot");
  return res.send("验证失败");
});

app.get(ADMIN_BASE + "/logout", (req, res) => {
  req.session.destroy(() => res.redirect(ADMIN_BASE + "/login"));
});

app.get(ADMIN_BASE + "/", requireLogin, (req, res) => {
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>文章编辑器</title>
<link rel="stylesheet" href="${ADMIN_BASE}/assets/easymde.min.css">
<style>
:root{color-scheme:light dark;}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif;margin:0;background:#f5f6f7;color:#0b0b0f;}
.wrap{max-width:1400px;margin:24px auto;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,.06)}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
input{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;margin:8px 0;font-size:14px;}
button{padding:8px 12px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer;}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px;align-items:center}
.grid{display:grid;grid-template-columns:260px 1fr 1fr;gap:16px;}
.card{border:1px solid #e5e7eb;border-radius:16px;padding:14px;background:#fff;}
.preview{max-height:75vh;overflow:auto;}
.preview h1,.preview h2,.preview h3{scroll-margin-top:80px}
.preview a{color:#111827;text-decoration:none;border-bottom:1px solid #e5e7eb;}
.anchor{margin-left:6px;font-size:12px;color:#6b7280;text-decoration:none;border:0;}
.color-box{display:flex;align-items:center;gap:6px}
.list{max-height:75vh;overflow:auto;}
.list-item{padding:8px 6px;border-bottom:1px solid #f1f1f1;display:flex;flex-direction:column;gap:6px}
.list-item b{font-size:13px}
.list-actions{display:flex;gap:6px}
.btn-outline{background:#fff;color:#111827;border:1px solid #e5e7eb}
@media (max-width: 1100px){ .grid{grid-template-columns:1fr;} }
</style></head>
<body><div class="wrap">
<div class="top"><h3>文章编辑器</h3><a href="${ADMIN_BASE}/logout">退出</a></div>
<form id="editorForm" method="POST" action="${ADMIN_BASE}/publish">
<input type="hidden" id="slug" name="slug" value="">
<input id="title" name="title" placeholder="标题">
<div class="actions">
  <div class="color-box">
    <input type="color" id="colorPicker" value="#111827" style="height:32px;width:42px;padding:0;border-radius:8px;border:1px solid #e5e7eb;">
    <button type="button" id="btnColor">应用颜色</button>
  </div>
  <button type="button" id="btnAnchors">生成标题锚点</button>
  <button type="button" id="btnNew" class="btn-outline">新建</button>
  <button type="submit">发布 / 更新</button>
</div>
<div class="grid">
  <div class="card">
    <div style="font-weight:600;margin-bottom:8px;">文章列表</div>
    <div class="list" id="postList"></div>
  </div>
  <div class="card">
    <textarea id="content" name="content"></textarea>
  </div>
  <div class="card preview" id="preview">预览区域</div>
</div>
</form>
</div>
<script src="${ADMIN_BASE}/assets/marked.min.js"></script>
<script src="${ADMIN_BASE}/assets/easymde.min.js"></script>
<script>
const textarea = document.getElementById('content');
const preview = document.getElementById('preview');
const form = document.getElementById('editorForm');
const btnAnchors = document.getElementById('btnAnchors');
const btnColor = document.getElementById('btnColor');
const colorPicker = document.getElementById('colorPicker');
const postList = document.getElementById('postList');
const titleInput = document.getElementById('title');
const slugInput = document.getElementById('slug');
const btnNew = document.getElementById('btnNew');

const easyMDE = new EasyMDE({
  element: textarea,
  spellChecker: false,
  autofocus: false,
  status: false,
  toolbar: [
    'bold','italic','heading-2','heading-3','quote','unordered-list','ordered-list','link','image','code','table','horizontal-rule','|','preview','side-by-side','fullscreen'
  ]
});

function slugify(text){
  return String(text||'').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^-|-$|--+/g,'');
}

const renderer = new marked.Renderer();
renderer.heading = function(text, level){
  const id = slugify(text);
  if(level >= 2 && level <= 3){
    return "<h"+level+" id=\""+id+"\">"+text+"<a class=\\\"anchor\\\" href=\\\"#"+id+"\\\">#</a></h"+level+">";
  }
  return "<h"+level+">"+text+"</h"+level+">";
};
marked.setOptions({ renderer });

function renderPreview(){
  const md = easyMDE.value();
  preview.innerHTML = marked.parse(md || '') || '预览区域';
}

easyMDE.codemirror.on('change', renderPreview);
renderPreview();

btnAnchors.onclick = ()=>{
  const md = easyMDE.value();
  const lines = md.split('\n').map(l=>{
    if(/^#{2,3} /.test(l)){
      const t = l.replace(/^#{2,3} /,'');
      const id = slugify(t);
      if(l.includes('name="'+id+'"')) return l;
      return l + " <a name=\""+id+"\"></a>";
    }
    return l;
  });
  easyMDE.value(lines.join('\n'));
  renderPreview();
};

btnColor.onclick = ()=>{
  const color = colorPicker.value || '#111827';
  const cm = easyMDE.codemirror;
  const sel = cm.getSelection();
  const text = sel || '文字';
  cm.replaceSelection("<span style=\\\"color:"+color+"\\\">"+text+"</span>");
  cm.focus();
};

form.addEventListener('submit', ()=>{ textarea.value = easyMDE.value(); });

btnNew.onclick = ()=>{
  titleInput.value = '';
  slugInput.value = '';
  easyMDE.value('');
  renderPreview();
};

async function loadPosts(){
  const res = await fetch('/api/posts');
  const posts = await res.json();
  postList.innerHTML = '';
  posts.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = '<b>' + p.title + '</b><div class="list-actions">'
      + '<button type="button" class="btn-outline" data-edit="' + p.slug + '">编辑</button>'
      + '<button type="button" class="btn-outline" data-del="' + p.slug + '">删除</button>'
      + '</div>';
    postList.appendChild(div);
  });
}

postList.addEventListener('click', async (e)=>{
  const edit = e.target.getAttribute('data-edit');
  const del = e.target.getAttribute('data-del');
  if(edit){
    const res = await fetch('${ADMIN_BASE}/post/'+edit);
    if(res.ok){
      const data = await res.json();
      titleInput.value = data.title || '';
      slugInput.value = data.slug || '';
      easyMDE.value(data.content || '');
      renderPreview();
    }
  }
  if(del){
    if(!confirm('确认删除这篇文章？')) return;
    const res = await fetch('${ADMIN_BASE}/delete/'+del, {method:'POST'});
    if(res.ok){
      await loadPosts();
      if(slugInput.value === del){ btnNew.click(); }
    }
  }
});

loadPosts();
</script>
</body></html>`);
});

app.get(ADMIN_BASE + "/post/:slug", requireLogin, (req, res) => {
  const slug = req.params.slug;
  const mdPath = path.join(MD_DIR, `${slug}.md`);
  if (!fs.existsSync(mdPath)) return res.status(404).json({ error: "not found" });
  const content = fs.readFileSync(mdPath, "utf-8");
  const posts = readPosts();
  const p = posts.find(x => x.slug === slug);
  res.json({ slug, title: p?.title || slug, content });
});

app.post(ADMIN_BASE + "/delete/:slug", requireLogin, (req, res) => {
  const slug = req.params.slug;
  const htmlPath = path.join(POSTS_DIR, `${slug}.html`);
  const mdPath = path.join(MD_DIR, `${slug}.md`);
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
  const posts = readPosts().filter(p => p.slug !== slug);
  writePosts(posts);
  res.json({ ok: true });
});

app.post(ADMIN_BASE + "/publish", requireLogin, (req, res) => {
  const { title, content, slug } = req.body || {};
  if (!title || !content) return res.send("标题或内容不能为空");
  const isUpdate = !!slug;
  const finalSlug = isUpdate ? slug : (slugify(title, { lower: true, strict: true }) || ("post-" + Date.now()));

  const posts = readPosts();
  const existing = posts.find(p => p.slug === finalSlug);
  const createdAt = existing?.createdAt || new Date().toISOString().replace("T"," ").slice(0,19);

  const renderer = new marked.Renderer();
  renderer.heading = function(text, level){
    const id = makeSlug(text);
    if(level >= 2 && level <= 3){
      return "<h"+level+" id=\""+id+"\">"+text+"<a class=\\\"anchor\\\" href=\\\"#"+id+"\\\">#</a></h"+level+">";
    }
    return "<h"+level+">"+text+"</h"+level+">";
  };
  marked.setOptions({ renderer });

  const htmlContent = marked.parse(content);
  const html = renderHtml({ title, content: htmlContent, createdAt });
  fs.writeFileSync(path.join(POSTS_DIR, `${finalSlug}.html`), html);
  fs.writeFileSync(path.join(MD_DIR, `${finalSlug}.md`), content);

  const newPosts = posts.filter(p => p.slug !== finalSlug);
  newPosts.unshift({ title, slug: finalSlug, createdAt });
  writePosts(newPosts);

  return res.redirect(ADMIN_BASE + "/");
});

app.get("/api/posts", (req, res) => {
  return res.json(readPosts());
});

app.listen(PORT, "127.0.0.1", () => {
  console.log("boke-admin listening on", PORT);
});
