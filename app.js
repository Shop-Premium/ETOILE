const KEY='etoile_products_v2';
const CART_KEY='etoile_cart_v1';
const WA_KEY='etoile_whatsapp_v1';
const $=s=>document.querySelector(s);
function normalize(p){return window.ETOILE_DB.normalize(p)}
function localLoad(){try{const x=JSON.parse(localStorage.getItem(KEY));return (Array.isArray(x)?x:structuredClone(window.ETOILE_DEFAULT_PRODUCTS||[])).map(normalize)}catch{return structuredClone(window.ETOILE_DEFAULT_PRODUCTS||[]).map(normalize)}}
function money(n){return '$'+Number(n||0).toLocaleString('es-CO')}
let phone='3114275057';
function getPhone(){const raw=String(phone||localStorage.getItem(WA_KEY)||'3114275057').replace(/\D/g,'');return raw.startsWith('57')?raw:'57'+raw}
function wa(text){return 'https://wa.me/'+getPhone()+'?text='+encodeURIComponent(text)}
function loadCart(){try{const x=JSON.parse(localStorage.getItem(CART_KEY));return Array.isArray(x)?x:[]}catch{return []}}
let products=localLoad(),cat='Todos',cart=loadCart();
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCartCount()}
function esc(x=''){return String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p||p.status!=='disponible'||Number(p.quantity)<1)return false;const item=cart.find(x=>String(x.id)===String(id));if(item)item.quantity=Math.min((item.quantity||0)+1,Number(p.quantity));else cart.push({id,quantity:1});saveCart();renderCart();return true}
function removeFromCart(id){cart=cart.filter(x=>String(x.id)!==String(id));saveCart();renderCart()}
function changeCartQty(id,delta){const p=products.find(x=>String(x.id)===String(id)),item=cart.find(x=>String(x.id)===String(id));if(!p||!item)return;item.quantity=Math.max(0,Math.min((item.quantity||1)+delta,p.quantity));if(item.quantity===0)cart=cart.filter(x=>String(x.id)!==String(id));saveCart();renderCart()}
function cartTotal(){return cart.reduce((sum,item)=>{const p=products.find(x=>String(x.id)===String(item.id));const price=Number(p?.price)||0;const qty=Number(item.quantity)||0;return sum+price*qty},0)}
function cartMessage(){
  const lines=cart.map(item=>{
    const p=products.find(x=>String(x.id)===String(item.id));if(!p)return '';
    const price=Number(p.price)||0,qty=Number(item.quantity)||0;
    return `• ${p.name} × ${qty} — ${money(price*qty)}`;
  }).filter(Boolean);
  return `Hola, quiero hacer este pedido en ÉTOILE:\n\n${lines.join('\n')}\n\nTOTAL DEL PEDIDO: ${money(cartTotal())}\n\n¿Me confirman disponibilidad y entrega?`;
}
function renderCartCount(){const count=cart.reduce((a,x)=>a+(x.quantity||0),0);const el=$('#cartCount');if(el)el.textContent=count;const btn=$('#cartBtn');if(btn)btn.classList.toggle('has-items',count>0)}
function renderCart(){
  const box=$('#cartItems');if(!box)return;
  if(!cart.length){box.innerHTML='<div class="empty">Tu cesta está vacía.</div>';$('#cartTotal').textContent=money(0);$('#cartWa').classList.add('disabled');return}
  box.innerHTML=cart.map(item=>{
    const p=products.find(x=>String(x.id)===String(item.id));if(!p)return '';
    const price=Number(p.price)||0,qty=Number(item.quantity)||0,subtotal=price*qty;
    const sale=Number(p.previousPrice)>price;
    return `<div class="cart-row"><div class="cart-row-img">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:''}</div><div class="cart-row-info"><b>${esc(p.name)}</b><small>${sale?'<span class="cart-offer">OFERTA</span> ':''}${money(price)} c/u · Subtotal: <strong>${money(subtotal)}</strong></small><div class="cart-qty"><button onclick="changeCartQty('${esc(p.id)}',-1)">−</button><strong>${qty}</strong><button onclick="changeCartQty('${esc(p.id)}',1)">+</button><button class="remove" onclick="removeFromCart('${esc(p.id)}')">Quitar</button></div></div></div>`;
  }).join('');
  $('#cartTotal').textContent=money(cartTotal());
  $('#cartWa').classList.remove('disabled');
  $('#cartWa').href=wa(cartMessage());
}
function openCart(){renderCart();$('#cartDrawer').classList.add('open');document.body.classList.add('no-scroll')}
function closeCart(){$('#cartDrawer').classList.remove('open');document.body.classList.remove('no-scroll')}
function card(p){
  const st=p.status;
  const can=st==='disponible'&&p.quantity>0;
  const onSale=Number(p.previousPrice)>Number(p.price)&&Number(p.price)>0;
  const discount=onSale?Math.round((1-(Number(p.price)/Number(p.previousPrice)))*100):0;
  const priceHtml=Number(p.price)>0?(onSale
    ?`<div class="price sale-price"><span class="offer-label">OFERTA · ${discount}% OFF</span><div><strong>${money(p.price)}</strong> <del>${money(p.previousPrice)}</del></div></div>`
    :`<div class="price">${money(p.price)}</div>`):'';
  return `<article class="card">
    <span class="status ${st==='proximamente'?'soon':st==='agotado'?'sold':''}">${st==='disponible'?'Disponible':st==='proximamente'?'Próximamente':'Agotado'}</span>
    ${onSale?`<span class="offer-badge">OFERTA</span>`:''}
    <div class="card-img">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=placeholder>${esc(p.brand||'ÉTOILE')}</span>'">`:`<span class="placeholder">${esc(p.brand||'ÉTOILE')}</span>`}</div>
    <div class="card-body"><span class="tag">${esc(p.brand)} · ${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p>${priceHtml}<div class="card-actions"><button type="button" class="mini ${can?'dark':''} add-cart icon-cart" data-id="${esc(p.id)}" ${can?'':'disabled'} aria-label="${can?'Agregar a la cesta':st==='proximamente'?'Próximamente':'Agotado'}" title="${can?'Agregar a la cesta':st==='proximamente'?'Próximamente':'Agotado'}">🛒</button></div>${can?`<small class="stock-public">${p.quantity} disponible${p.quantity===1?'':'s'}</small>`:''}</div>
  </article>`;
}
function updateCategoryCounts(){document.querySelectorAll('.filter').forEach(b=>{const c=b.dataset.cat;const n=products.filter(p=>p.status==='disponible'&&p.quantity>0&&(c==='Todos'||String(p.category||'').toLowerCase()===c.toLowerCase())).length;b.textContent=`${c} (${n})`})}
function render(){updateCategoryCounts();const available=products.filter(p=>p.status==='disponible'&&p.quantity>0&&(cat==='Todos'||String(p.category||'').toLowerCase()===cat.toLowerCase()));const soon=products.filter(p=>p.status==='proximamente');const sold=products.filter(p=>p.status==='agotado');$('#productGrid').innerHTML=available.length?available.map(card).join(''):'<div class="empty">No hay productos disponibles en esta categoría.</div>';$('#soonGrid').innerHTML=soon.length?soon.map(card).join(''):'<div class="empty">Próximamente aparecerán aquí los productos que estén en camino.</div>';$('#soldGrid').innerHTML=sold.length?sold.map(card).join(''):'<div class="empty">Todavía no hay productos agotados.</div>';bindCartButtons();renderCartCount()}
function bindCategoryFilters(){document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');cat=b.dataset.cat;render()})}
function bindCartButtons(){document.querySelectorAll('.add-cart').forEach(btn=>{btn.onclick=e=>{e.preventDefault();e.stopPropagation();const ok=addToCart(btn.dataset.id);if(ok){const old=btn.innerHTML;btn.innerHTML='✓';btn.classList.add('added');btn.disabled=true;setTimeout(()=>{btn.innerHTML=old;btn.classList.remove('added');btn.disabled=false},900)}}})}
async function refreshOnline(){try{const remote=await window.ETOILE_DB.getProducts();if(remote.length){products=remote.map(normalize);localStorage.setItem(KEY,JSON.stringify(products));localStorage.setItem('etoile_updated_at',String(Date.now()));cart=cart.filter(i=>products.some(p=>p.id===i.id&&p.status==='disponible'&&p.quantity>0));saveCart();render()}const onlinePhone=await window.ETOILE_DB.getWhatsApp();if(onlinePhone){phone=onlinePhone;localStorage.setItem(WA_KEY,onlinePhone)}$('#waHead').href=wa('Hola, quiero ver el catálogo de ÉTOILE');$('#waCta').href=wa('Hola, quiero hacer un pedido en ÉTOILE');if(cart.length)renderCart()}catch(e){console.warn('Modo local temporal:',e.message||e)}}
window.addToCart=addToCart;window.removeFromCart=removeFromCart;window.changeCartQty=changeCartQty;
bindCategoryFilters();$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');$('#cartBtn').onclick=openCart;$('#cartClose').onclick=closeCart;$('#cartBackdrop').onclick=closeCart;$('#year').textContent=new Date().getFullYear();$('#waHead').href=wa('Hola, quiero ver el catálogo de ÉTOILE');$('#waCta').href=wa('Hola, quiero hacer un pedido en ÉTOILE');
window.addEventListener('storage',e=>{if(e.key===KEY){products=localLoad();cart=cart.filter(i=>products.some(p=>p.id===i.id));saveCart();render()}});
render();refreshOnline();setInterval(refreshOnline,10000);
