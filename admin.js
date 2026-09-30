const KEY='etoile_products_v2';
const defaults=window.ETOILE_DEFAULT_PRODUCTS||[];
let products=[];
let editing=null;
let categoryFilter='Todos';
const $=s=>document.querySelector(s);

function normalize(p){return window.ETOILE_DB.normalize(p)}
function esc(x=''){return String(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function statusLabel(s){return s==='disponible'?'Disponible':s==='proximamente'?'Próximamente':'Agotado'}
function parseCOP(value){const digits=String(value??'').replace(/[^0-9]/g,'');return digits?Number(digits):0}
function formatCOP(value){return Number(value||0).toLocaleString('es-CO')}
function showNotice(msg,type='ok'){const n=$('#notice');if(!n)return;n.textContent=msg;n.className='notice '+type;n.classList.remove('hidden');clearTimeout(window._noticeTimer);window._noticeTimer=setTimeout(()=>n.classList.add('hidden'),4200)}
function showLoginNotice(msg){const n=$('#loginNotice');n.textContent=msg;n.className='notice error';n.classList.remove('hidden')}
function normalizePhone(v){return String(v||'').replace(/\D/g,'').replace(/^57(?=3\d{9})/,'')}
function localProducts(){try{const x=JSON.parse(localStorage.getItem(KEY));return (Array.isArray(x)?x:structuredClone(defaults)).map(normalize)}catch{return structuredClone(defaults).map(normalize)}}
function mirrorLocal(){localStorage.setItem(KEY,JSON.stringify(products));localStorage.setItem('etoile_updated_at',String(Date.now()))}

async function loadOnlineCatalog(){
  const remote=await window.ETOILE_DB.getProducts();
  if(remote.length){products=remote.map(normalize);mirrorLocal();return {migrated:false,count:remote.length}}
  const local=localProducts();
  if(local.length){const result=await window.ETOILE_DB.replaceProducts(local);if(result.error)throw result.error;products=local;mirrorLocal();return {migrated:true,count:local.length}}
  products=[];return {migrated:false,count:0}
}

async function persistRemote(message='Catálogo guardado correctamente.'){
  try{
    const result=await window.ETOILE_DB.replaceProducts(products);
    if(result.error)throw result.error;
    mirrorLocal();renderList();showNotice(message,'ok');
  }catch(e){console.error(e);mirrorLocal();showNotice('No se pudo sincronizar con Supabase. Se guardó una copia local.','error')}
}

async function openEditor(p=null){
  editing=p?.id||null;$('#editor').classList.remove('hidden');
  $('#editor').innerHTML=`<div class="section-head"><div><p class="eyebrow">${p?'EDITAR':'NUEVO'}</p><h2>${p?'Editar producto':'Agregar producto'}</h2></div></div><div class="form-grid">
  <div class="field"><label>Nombre</label><input id="fName" value="${esc(p?.name||'')}"></div>
  <div class="field"><label>Marca</label><input id="fBrand" value="${esc(p?.brand||'')}"></div>
  <div class="field"><label>Categoría</label><select id="fCat"><option ${p?.category==='Belleza'?'selected':''}>Belleza</option><option ${p?.category==='Skincare'?'selected':''}>Skincare</option><option ${p?.category==='Accesorios'?'selected':''}>Accesorios</option></select></div>
  <div class="field"><label>Estado</label><select id="fStatus"><option value="disponible" ${p?.status==='disponible'?'selected':''}>Disponible</option><option value="proximamente" ${p?.status==='proximamente'?'selected':''}>Próximamente en llegar</option><option value="agotado" ${p?.status==='agotado'?'selected':''}>Agotado</option></select></div>
  <div class="field"><label>Precio (COP)</label><input id="fPrice" type="text" inputmode="numeric" autocomplete="off" value="${p?.price?formatCOP(p.price):''}" placeholder="60.000"></div>
  <div class="field"><label>Unidades en inventario</label><input id="fQty" type="number" min="0" step="1" value="${p?.quantity??1}"></div>
  <div class="field full"><label>URL de imagen (opcional)</label><input id="fImage" value="${esc((p?.image||'').startsWith('data:')?'':(p?.image||''))}" placeholder="https://..."></div>
  <div class="field full"><label>Subir foto</label><input id="fFile" type="file" accept="image/*"><div id="previewWrap" class="preview-wrap">${p?.image?`<img id="previewImg" src="${esc(p.image)}" alt="Vista previa">`:'<span>Vista previa</span>'}</div></div>
  <div class="field full"><label>Descripción corta</label><textarea id="fDesc">${esc(p?.description||'')}</textarea></div></div>
  <div class="editor-actions"><button class="btn" id="saveP">Guardar producto</button><button class="btn ghost" id="cancelP">Cancelar</button></div>`;
  $('#saveP').onclick=saveProduct;$('#cancelP').onclick=()=>{$('#editor').classList.add('hidden');editing=null};$('#fFile').onchange=e=>previewFile(e.target.files[0]);$('#fPrice').oninput=e=>e.target.value=e.target.value.replace(/[^0-9., ]/g,'');$('#fPrice').onblur=e=>{const n=parseCOP(e.target.value);e.target.value=n?formatCOP(n):''};$('#fImage').oninput=e=>{if(e.target.value.trim())setPreview(e.target.value.trim())};window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
}
function setPreview(src){const w=$('#previewWrap');if(w)w.innerHTML=`<img id="previewImg" src="${esc(src)}" alt="Vista previa" onerror="this.parentElement.innerHTML='<span>No se pudo cargar la imagen</span>'">`}
function previewFile(file){if(!file)return;if(!file.type.startsWith('image/')){showNotice('Selecciona una imagen válida.','error');return}const r=new FileReader();r.onload=()=>setPreview(r.result);r.readAsDataURL(file)}
function compressImage(file,max=1200,quality=.82){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',quality))};img.onerror=reject;img.src=reader.result};reader.readAsDataURL(file)})}
async function saveProduct(){
  const name=$('#fName').value.trim();if(!name){showNotice('Escribe el nombre del producto.','error');return}
  const file=$('#fFile').files[0];let image=$('#fImage').value.trim();if(file){try{image=await compressImage(file)}catch{showNotice('No se pudo procesar la foto.','error');return}}
  let status=$('#fStatus').value;const quantity=Math.max(0,Number($('#fQty').value||0));if(quantity===0&&status==='disponible')status='agotado';if(quantity>0&&status==='agotado')status='disponible';
  const obj=normalize({id:editing||('p-'+Date.now()),name,brand:$('#fBrand').value.trim(),category:$('#fCat').value,status,price:parseCOP($('#fPrice').value),quantity,image,description:$('#fDesc').value.trim()});
  if(editing)products=products.map(p=>p.id===editing?obj:p);else products.push(obj);
  await persistRemote('Producto guardado correctamente.');$('#editor').classList.add('hidden');editing=null;
}
async function changeQty(id,delta){const p=products.find(x=>x.id===id);if(!p)return;p.quantity=Math.max(0,(p.quantity??1)+delta);if(p.quantity===0&&p.status==='disponible')p.status='agotado';if(p.quantity>0&&p.status==='agotado')p.status='disponible';await persistRemote(`Inventario actualizado: ${p.name} · ${p.quantity} unidad${p.quantity===1?'':'es'}.`)}
async function changeStatus(id,status){const p=products.find(x=>x.id===id);if(!p)return;p.status=status;if(status==='agotado')p.quantity=0;if(status==='disponible'&&p.quantity===0)p.quantity=1;await persistRemote(`${p.name}: ${statusLabel(status)}.`)}
async function deleteProduct(id){if(!confirm('¿Eliminar este producto?'))return;products=products.filter(p=>p.id!==id);await window.ETOILE_DB.deleteProduct(id);mirrorLocal();renderList();showNotice('Producto eliminado.','ok')}
async function consolidateDuplicates(){const map=new Map(),out=[];for(const p of products){const key=[p.name.trim().toLowerCase(),p.brand.trim().toLowerCase(),p.category,p.price,p.image||''].join('|');if(map.has(key)){const target=map.get(key);target.quantity=(target.quantity||0)+(p.quantity||0);if(target.status!=='proximamente'&&p.status==='proximamente')target.status='proximamente'}else{const copy=normalize(p);map.set(key,copy);out.push(copy)}}if(out.length===products.length){showNotice('No encontré productos repetidos exactos.','ok');return}products=out;await persistRemote('Productos repetidos consolidados.')}
function renderList(){const q=($('#searchAdmin')?.value||'').toLowerCase();const filter=$('#statusFilter')?.value||'todos';const list=products.filter(p=>(p.name+' '+p.brand+' '+p.category+' '+statusLabel(p.status)).toLowerCase().includes(q)&&(filter==='todos'||p.status===filter)&&(categoryFilter==='Todos'||p.category===categoryFilter));const counts=products.reduce((a,p)=>(a[p.status]=(a[p.status]||0)+1,a),{});const units=products.reduce((a,p)=>a+(Number(p.quantity)||0),0);$('#countAll').textContent=products.length;$('#countAvail').textContent=counts.disponible||0;$('#countSoon').textContent=counts.proximamente||0;$('#countSold').textContent=counts.agotado||0;$('#countUnits').textContent=units;$('#adminList').innerHTML=list.map(p=>`<div class="admin-row"><div>${p.image?`<img class="admin-thumb" src="${esc(p.image)}" onerror="this.style.display='none'">`:'<div class="admin-thumb"></div>'}</div><div class="admin-info"><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${esc(p.category)} · ${statusLabel(p.status)} · ${p.price?('$ '+formatCOP(p.price)):'Sin precio'}</small><div class="stock-line"><button class="qty-btn" onclick="changeQty('${esc(p.id)}',-1)">−</button><strong>${p.quantity??0}</strong><button class="qty-btn" onclick="changeQty('${esc(p.id)}',1)">+</button><span>unidad${(p.quantity??0)===1?'':'es'}</span></div></div><div class="admin-buttons"><button class="primary" onclick="editProduct('${esc(p.id)}')">Editar</button><select class="status-select" onchange="changeStatus('${esc(p.id)}',this.value)"><option value="disponible" ${p.status==='disponible'?'selected':''}>Disponible</option><option value="proximamente" ${p.status==='proximamente'?'selected':''}>Próximamente</option><option value="agotado" ${p.status==='agotado'?'selected':''}>Agotado</option></select><button onclick="deleteProduct('${esc(p.id)}')">Eliminar</button></div></div>`).join('')||'<div class="empty">No hay productos.</div>'}

async function initSettings(){const input=$('#waNumber');if(input)input.value=await window.ETOILE_DB.getWhatsApp();$('#saveWa').onclick=async()=>{const n=normalizePhone(input.value.trim());if(n.length!==10||!n.startsWith('3')){showNotice('Escribe un número colombiano válido de 10 dígitos.','error');return}const result=await window.ETOILE_DB.saveWhatsApp(n);if(result.error){showNotice('Se guardó localmente, pero no se pudo sincronizar WhatsApp.','error');return}showNotice('Número de WhatsApp guardado.','ok')}}

async function initAdmin(){
  try{
    const {data:{session}}=await window.ETOILE_DB.client.auth.getSession();
    if(!session){$('#loginScreen').classList.remove('hidden');return}
    $('#loginScreen').classList.add('hidden');$('#adminApp').classList.remove('hidden');
    const result=await loadOnlineCatalog();
    if(result.migrated)showNotice(`Catálogo sincronizado: ${result.count} referencias subidas a Supabase.`,'ok');
    await initSettings();renderList();
  }catch(e){console.error(e);showLoginNotice('No se pudo conectar con Supabase. Revisa la configuración e inténtalo de nuevo.')}}

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const password=$('#loginPassword').value;if(!password)return;const {error}=await window.ETOILE_DB.client.auth.signInWithPassword({email:window.ETOILE_ADMIN_EMAIL,password});if(error){showLoginNotice('Contraseña incorrecta o acceso no disponible.');return}$('#loginPassword').value='';await initAdmin()});
$('#logoutBtn').onclick=async()=>{await window.ETOILE_DB.client.auth.signOut();location.reload()};
$('#newBtn').onclick=()=>openEditor();$('#consolidateBtn').onclick=consolidateDuplicates;$('#searchAdmin').oninput=renderList;$('#statusFilter').onchange=renderList;document.querySelectorAll('.category-filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.category-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');categoryFilter=b.dataset.adminCat;renderList()});$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:4,exportedAt:new Date().toISOString(),products},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='etoile-catalogo-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};$('#importFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{const parsed=JSON.parse(r.result);const x=Array.isArray(parsed)?parsed:parsed.products;if(!Array.isArray(x))throw Error();products=x.map(normalize);await persistRemote('Catálogo importado y sincronizado.')}catch{showNotice('Archivo no válido.','error')}};r.readAsText(f);e.target.value=''};
window.editProduct=id=>openEditor(products.find(p=>p.id===id));window.changeQty=changeQty;window.changeStatus=changeStatus;window.deleteProduct=deleteProduct;
window.ETOILE_DB.client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')location.reload()});
initAdmin();
