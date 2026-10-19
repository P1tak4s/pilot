// The moderation page: only what needs a person. Hidden scenes first, then scenes the second AI look kept but
// people still reported. Keep puts a scene back for good; Remove takes it down and deletes the file.
export const ADMIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>textless moderation</title>
<style>
:root{color-scheme:dark}
body{margin:0;padding:32px 20px 60px;background:#1a1614;color:#ece6dc;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto}
h1{margin:0 0 6px;font-size:28px;font-weight:600}
p.sub{margin:0 0 24px;color:#a39a93}
ul{list-style:none;margin:0;padding:0;display:grid;gap:14px}
li{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;padding:14px;border-radius:12px;background:#241e1b;border:1px solid #3a302b}
.art{display:grid;place-items:center;height:150px;border-radius:8px;background:#151515}
.art img{max-width:200px;max-height:140px;image-rendering:pixelated}
h2{margin:0;font-size:18px;font-weight:600}
.tag{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;font-size:12px;vertical-align:2px}
.hidden{background:#5a2a20;color:#ffb39c}.live{background:#203a2a;color:#9fdcb0}
.meta,.why{margin:4px 0 0;color:#a39a93;font-size:14px}
.acts{display:flex;gap:10px;margin-top:12px}
button{height:36px;padding:0 16px;border-radius:8px;border:1px solid #3a302b;background:none;color:#ece6dc;font:600 14px system-ui;cursor:pointer}
button.keep{background:#d97757;border-color:#d97757;color:#1b120d}
button:disabled{opacity:.5;cursor:default}
.empty{color:#a39a93}
@media (max-width:640px){li{grid-template-columns:minmax(0,1fr)}}
</style></head>
<body><main>
<h1>Moderation</h1>
<p class="sub">Only scenes that need you: hidden after reports, or kept by the AI but still reported.</p>
<ul id="list"><li class="empty">Loading…</li></ul>
</main>
<script>
var list = document.getElementById('list');
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function load() {
  fetch('/admin/api/queue').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.scenes.length) { list.innerHTML = '<li class="empty">Nothing needs you.</li>'; return; }
    list.innerHTML = d.scenes.map(function (s) {
      var why = (s.reports || []).map(function (r) { return esc(r.reason) + ' ' + r.n; }).join(', ') || 'no reports';
      return '<li data-id="' + esc(s.id) + '"><div class="art"><img src="' + esc(s.file) + '" alt=""></div><div>'
        + '<h2>' + esc(s.name) + '<span class="tag ' + esc(s.status) + '">' + esc(s.status) + '</span></h2>'
        + '<p class="meta">by ' + esc(s.author) + (s.description ? ' · ' + esc(s.description) : '') + '</p>'
        + '<p class="why">Reports: ' + why + '</p><p class="why">AI: ' + esc(s.ai_reason) + '</p>'
        + '<div class="acts"><button class="keep" data-act="keep">Keep</button><button data-act="remove">Remove</button></div></div></li>';
    }).join('');
  });
}
list.addEventListener('click', function (e) {
  var b = e.target.closest('button[data-act]'); if (!b) return;
  var li = b.closest('li'); li.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
  fetch('/admin/api/' + li.dataset.id + '/' + b.dataset.act, { method: 'POST' }).then(load);
});
load();
</script></body></html>`
