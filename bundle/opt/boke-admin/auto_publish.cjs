const fs = require('fs');
const path = require('path');
const marked = require('/opt/boke-admin/node_modules/marked');
const slugify = require('/opt/boke-admin/node_modules/slugify');

const SITE_ROOT = '/www/wwwroot/boke.iozz.cc';
const POSTS_DIR = path.join(SITE_ROOT, 'posts');
const MD_DIR = path.join(SITE_ROOT, 'md');
const INDEX_JSON = path.join(SITE_ROOT, 'posts.json');

function randPick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function nowStr(){ return new Date().toISOString().replace('T',' ').slice(0,19); }

const topics = [
  '远程协作', '系统稳定性', '性能优化', '日志与可观测性', '自动化运维',
  '安全与合规', '用户体验', '产品迭代', '工程效率', '数据整理'
];
const verbs = ['提升','打磨','梳理','优化','复盘','构建','设计','校准'];
const title = `${randPick(topics)}：如何${randPick(verbs)}你的日常流程`;

const keywords = [randPick(topics), '稳定性', '效率', '可维护性', '最佳实践'];
const summary = `本文围绕“${keywords[0]}”展开，给出可落地的流程与注意事项，帮助系统更稳、更快、更易维护。`;

const sections = [
  ['背景与目标', `明确目标能降低无效投入：先定义可衡量的指标（如响应时间、发布频率、错误率），再制定边界与优先级。`],
  ['关键策略', `优先处理高杠杆环节：从自动化、可观测性、可复用组件入手，降低重复劳动。`],
  ['执行清单', `把方法变成清单：每日/每周/每月固定复盘；所有改动先评估影响，再分阶段发布。`],
  ['常见误区', `只追求速度忽视稳定性、只做工具不做流程、指标设定过多导致执行疲劳。`],
  ['结论', `把复杂问题拆成小步骤，持续迭代，系统就会长期保持在可控状态。`]
];

let body = `# ${title}\n\n`;
body += `**摘要**：${summary}\n\n`;
body += `**关键词**：${keywords.join('、')}\n\n`;
sections.forEach(([h, p], i) => {
  body += `## ${i+1}. ${h}\n${p}\n\n`;
});
body += `> 小结：持续优化比一次性重构更可靠。\n`;

if (body.length < 500) {
  body += "\\n\\n### 补充建议\\n- 记录基线数据\\n- 逐步灰度发布\\n- 预留回滚方案\\n";
}

const slug = slugify(title, { lower: true, strict: true }) || ('post-' + Date.now());
const createdAt = nowStr();
const htmlContent = marked.parse(body);

const html = '<!doctype html>\\n'
  + '<html lang="zh-CN">\\n'
  + '<head>\\n'
  + '  <meta charset="utf-8">\\n'
  + '  <meta name="viewport" content="width=device-width, initial-scale=1">\\n'
  + `  <title>${title}</title>\\n`
  + `  <meta name="description" content="${summary}">\\n`
  + `  <meta name="keywords" content="${keywords.join(',')}">\\n`
  + '  <style>\\n'
  + '    body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Arial,sans-serif;margin:0;background:#fff;color:#0b0b0f;}\\n'
  + '    .wrap{max-width:900px;margin:0 auto;padding:64px 24px 96px;}\\n'
  + '    h1{font-size:36px;margin:0 0 8px 0;letter-spacing:-0.02em;}\\n'
  + '    .meta{color:#6b7280;font-size:14px;margin-bottom:24px;}\\n'
  + '    article{line-height:1.85;font-size:17px;}\\n'
  + '    pre{background:#0b0b0f;color:#f9fafb;padding:16px;border-radius:12px;overflow:auto;}\\n'
  + '    code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}\\n'
  + '    a{color:#111827;text-decoration:none;border-bottom:1px solid #e5e7eb;}\\n'
  + '    a:hover{border-bottom-color:#111827;}\\n'
  + '  </style>\\n'
  + '</head>\\n'
  + '<body>\\n'
  + '  <div class="wrap">\\n'
  + `    <h1>${title}</h1>\\n`
  + `    <div class="meta">${createdAt}</div>\\n`
  + `    <article>${htmlContent}</article>\\n`
  + '  </div>\\n'
  + '</body>\\n'
  + '</html>';

fs.mkdirSync(POSTS_DIR, { recursive: true });
fs.mkdirSync(MD_DIR, { recursive: true });

fs.writeFileSync(path.join(POSTS_DIR, slug + '.html'), html);
fs.writeFileSync(path.join(MD_DIR, slug + '.md'), body);

let posts = [];
try { posts = JSON.parse(fs.readFileSync(INDEX_JSON, 'utf-8')); } catch {}
posts.unshift({ title, slug, createdAt });
fs.writeFileSync(INDEX_JSON, JSON.stringify(posts, null, 2));

console.log('auto published', slug);
