/* ── Shared utilities ───────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  animateCounters();
  animateProgressBars();
  initBackToTop();
});

function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

/* Counter animation ─────────────────────────────────────── */
function animateCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        runCounter(e.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-target]').forEach(el => io.observe(el));
}

function runCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const dec    = (el.dataset.dec | 0) || 0;
  const dur    = 2200;
  const t0     = performance.now();
  const step   = now => {
    const p = Math.min((now - t0) / dur, 1);
    const v = target * (1 - Math.pow(1 - p, 3));
    el.textContent = prefix + v.toFixed(dec) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Progress bars ─────────────────────────────────────────── */
function animateProgressBars() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const fill = e.target.querySelector('.progress-fill');
        if (fill) fill.style.width = fill.dataset.w || fill.dataset.width || '0%';
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.progress-row').forEach(el => io.observe(el));
}

/* Back to top ───────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.style.opacity = window.scrollY > 400 ? '1' : '0';
    btn.style.pointerEvents = window.scrollY > 400 ? 'auto' : 'none';
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* Network canvas (index.html) ───────────────────────────── */
function initNetworkCanvas() {
  const canvas = document.getElementById('network-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const ICONS = ['🏭','⚓','✈️','🚢','🚛','🏪','📦','🌐'];
  const N = 22;
  const nodes = Array.from({ length: N }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: 3 + Math.random() * 3,
    icon: i < ICONS.length ? ICONS[i] : null,
  }));

  const DIST = 180;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // edges
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          const a = (1 - d / DIST) * 0.35;
          ctx.strokeStyle = `rgba(0,200,255,${a})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,200,255,0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,200,255,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // move
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });

    requestAnimationFrame(draw);
  }
  draw();
}

/* AI Chatbot ─────────────────────────────────────────────── */
async function sendChat(userText, messagesEl, inputEl, sendBtn) {
  if (!userText.trim()) return;

  appendMsg(messagesEl, userText, 'user');
  inputEl.value = '';
  sendBtn.disabled = true;

  const typingEl = appendMsg(messagesEl, null, 'typing');

  const history = window.__chatHistory || [];
  history.push({ role: 'user', content: userText });
  window.__chatHistory = history;

  const SYSTEM = `Ты — LogiBot, AI-ассистент платформы LogiChain по аналитике логистических цепочек.
Отвечай кратко, по делу, на русском языке. Специализируешься на: анализе логистических цепочек,
оптимизации маршрутов, показателях KPI (OTD, OTIF, Fill Rate, Lead Time), складской логистике,
управлении запасами, затратах на доставку, цифровизации supply chain.
Давай конкретные цифры и советы. Максимум 3-4 предложения на ответ.`;

  try {
    const resp = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: SYSTEM },
          ...history.slice(-8),
        ],
        seed: Math.floor(Math.random() * 9999),
      }),
    });

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content || data?.text || getLocalReply(userText);
    history.push({ role: 'assistant', content: reply });
    typingEl.remove();
    appendMsg(messagesEl, reply, 'bot');
  } catch {
    typingEl.remove();
    appendMsg(messagesEl, getLocalReply(userText), 'bot');
  }

  sendBtn.disabled = false;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMsg(container, text, type) {
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  if (type === 'typing') {
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  } else {
    div.textContent = text;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function getLocalReply(q) {
  q = q.toLowerCase();
  if (q.includes('kpi') || q.includes('кпи') || q.includes('показател'))
    return 'Ключевые KPI логистики: OTD (On-Time Delivery) — норма 95%+, OTIF (On-Time In Full) — 90%+, Fill Rate — 97-99%, Lead Time — зависит от сегмента (B2B: 3-7 дней). Улучшение OTD на 5% снижает затраты на обслуживание претензий на 12%.';
  if (q.includes('маршрут') || q.includes('оптимиз'))
    return 'Оптимизация маршрутов сокращает пробег в среднем на 15-25%. Используйте алгоритмы VRP (Vehicle Routing Problem) и учитывайте временны́е окна доставки. Комбинированные маршруты снижают CO₂-выбросы на 20%.';
  if (q.includes('склад') || q.includes('запас'))
    return 'Оптимальный уровень запасов = страховой запас + цикличный запас. Формула: SS = Z × σ_D × √LT. При DOI (Days of Inventory) > 45 дней — избыток; < 10 дней — риск stockout. ABC-анализ помогает правильно расставить приоритеты.';
  if (q.includes('затрат') || q.includes('стоимост') || q.includes('цена'))
    return 'Структура логистических затрат: транспорт — 40-60%, складирование — 20-30%, управление запасами — 15-25%, административные — 5-10%. Основной потенциал экономии — консолидация грузов и переход на мультимодальные схемы.';
  if (q.includes('цифровиз') || q.includes('технолог') || q.includes('ai') || q.includes('ии'))
    return 'Топ-технологии в supply chain: IoT-трекинг даёт видимость на 100%, TMS снижает транспортные расходы на 8-15%, WMS повышает точность склада до 99.9%, AI-прогнозирование спроса снижает запасы на 20-30%.';
  return 'Я помогаю анализировать логистические цепочки. Спросите об OTD/OTIF, оптимизации маршрутов, управлении запасами, транспортных затратах или цифровизации supply chain.';
}

/* Route Optimizer ──────────────────────────────────────── */
function calcRoute(from, to, mode) {
  const dists = {
    'Алматы': { 'Нур-Султан': 1100, 'Шымкент': 680, 'Ташкент': 940, 'Москва': 4200, 'Бишкек': 240 },
    'Нур-Султан': { 'Алматы': 1100, 'Шымкент': 1600, 'Ташкент': 2000, 'Москва': 3500, 'Бишкек': 1300 },
    'Шымкент': { 'Алматы': 680, 'Нур-Султан': 1600, 'Ташкент': 250, 'Москва': 4900, 'Бишкек': 900 },
  };
  const dist = dists[from]?.[to] || dists[to]?.[from] || Math.round(500 + Math.random() * 2500);
  const speeds = { auto: 70, rail: 55, air: 650, sea: 30 };
  const costs  = { auto: 45, rail: 28, air: 220, sea: 12 };
  const speed  = speeds[mode] || 60;
  const cost   = costs[mode] || 40;
  const time   = (dist / speed).toFixed(1);
  const price  = (dist * cost / 1000 * 1.2).toFixed(0);
  const co2    = { auto: 95, rail: 22, air: 630, sea: 8 };
  return { dist, time, price, co2: co2[mode] || 50 };
}
