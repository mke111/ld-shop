function addCart(productId, qty) {
  qty = qty || 1;
  fetch('/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, qty: parseInt(qty) })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      const el = document.querySelector('.cart-count');
      if (el) el.textContent = data.count;
      showToast('已加入购物车 ✓');
    }
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:30px;right:30px;background:#4fc3f7;color:#000;padding:12px 20px;border-radius:6px;font-weight:600;z-index:9999;animation:fadeIn .3s';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}
