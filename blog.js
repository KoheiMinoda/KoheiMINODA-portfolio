/* ===========================================================
   blog.js — JSON からブログ一覧 / 詳細を描画する共通スクリプト
   一覧: renderIndex("cfd")   詳細: renderPost()
   =========================================================== */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const LOAD_ERROR =
  'データを読み込めませんでした。ローカルで確認するときは ' +
  '<code>python -m http.server</code> などで配信してください' +
  '（GitHub Pages 上では自動で動きます）。';

/* ---------- 一覧ページ ---------- */
async function renderIndex(category) {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  try {
    const res = await fetch(`data/${category}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const posts = await res.json();

    posts.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    if (!posts.length) {
      status.textContent = "まだ投稿がありません。";
      return;
    }
    status.remove();

    grid.innerHTML = posts.map(p => {
      const href = p.url
        ? p.url
        : `post.html?cat=${encodeURIComponent(category)}&id=${encodeURIComponent(p.id)}`;
      const thumb = p.thumb
        ? `<div class="post-thumb"><img src="${esc(p.thumb)}" alt="${esc(p.title)}"></div>`
        : `<div class="post-thumb thumb-empty"><span>${esc((p.tags && p.tags[0]) || category.toUpperCase())}</span></div>`;
      return `
        <a class="post-card" href="${href}">
          ${thumb}
          <div class="info">
            ${p.date ? `<span class="post-date">${esc(p.date)}</span>` : ""}
            <h3>${esc(p.title || "Untitled")}</h3>
          </div>
        </a>`;
    }).join("");
  } catch (e) {
    status.innerHTML = LOAD_ERROR;
  }
}

/* ---------- 詳細ページ ---------- */
function renderBlock(b) {
  switch (b.type) {
    case "h":    return `<h2>${esc(b.text)}</h2>`;
    case "p":    return `<p>${esc(b.text)}</p>`;          // 数式は $...$ で書けます
    case "code": return `<pre><code>${esc(b.text)}</code></pre>`;
    case "img":  return `<figure><img src="${esc(b.src)}" alt="${esc(b.alt || "")}">` +
                        (b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : "") +
                        `</figure>`;
    case "url": {                                          // 外部リンク（別タブで開く）
      if (!/^https?:\/\//i.test(b.href || "")) return "";
      const host = new URL(b.href).hostname;
      return `<a class="link-card" href="${esc(b.href)}" target="_blank" rel="noopener noreferrer">` +
             `<span class="link-title">${esc(b.text || b.href)} ↗</span>` +
             (b.desc ? `<span class="link-desc">${esc(b.desc)}</span>` : "") +
             `<span class="link-host">${esc(host)}</span></a>`;
    }
    default:     return "";
  }
}

async function renderPost() {
  const el = document.getElementById("post");
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const id = params.get("id");

  // ナビの現在地をハイライト
  const navLink = document.querySelector(`.nav-links a[href="${cat}.html"]`);
  if (navLink) navLink.setAttribute("aria-current", "page");

  if (!cat || !id) { el.innerHTML = "記事が指定されていません。"; return; }

  try {
    const res = await fetch(`data/${cat}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const posts = await res.json();
    const p = posts.find(x => x.id === id);
    if (!p) { el.innerHTML = "記事が見つかりませんでした。"; return; }

    document.title = `${p.title} — Kohei MINODA`;

    let html = `<a class="back-link" href="${cat}.html">← ${esc(cat.toUpperCase())}</a>`;
    html += `<h1>${esc(p.title)}</h1>`;
    if (p.date) html += `<p class="post-date">${esc(p.date)}</p>`;
    if (Array.isArray(p.tags) && p.tags.length)
      html += `<ul class="tags">${p.tags.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
    html += `<div class="post-body">${(p.body || []).map(renderBlock).join("")}</div>`;
    el.innerHTML = html;

    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
  } catch (e) {
    el.innerHTML = LOAD_ERROR;
  }
}