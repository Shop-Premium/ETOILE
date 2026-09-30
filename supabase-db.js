(function(){
  const client=window.supabase.createClient(window.ETOILE_SUPABASE_URL,window.ETOILE_SUPABASE_PUBLISHABLE_KEY);
  const KEY='etoile_products_v2';
  const WA_KEY='etoile_whatsapp_v1';
  function normalize(p){
    const rawPrice=p.price??p.precio??0;
    let price=Number(String(rawPrice).replace(/[^0-9.-]/g,''))||0;
    if(price>0&&price<1000)price*=1000;
    const rawPrevious=p.previousPrice??p.precio_anterior??0;
    let previousPrice=Number(String(rawPrevious).replace(/[^0-9.-]/g,''))||0;
    if(previousPrice>0&&previousPrice<1000)previousPrice*=1000;
    const rawCat=String(p.category||p.categoria||'').trim().toLowerCase();
    const category=rawCat==='belleza'?'Belleza':rawCat==='skincare'?'Skincare':rawCat==='accesorios'?'Accesorios':(p.category||p.categoria||'Belleza');
    const rawStatus=String(p.status||p.estado||'disponible').trim().toLowerCase();
    const status=rawStatus==='proximamente'?'proximamente':rawStatus==='agotado'?'agotado':'disponible';
    return {id:String(p.id),name:String(p.name??p.nombre??''),brand:String(p.brand??p.marca??''),category,price,previousPrice, status, image:String(p.image??p.imagen_url??''),description:String(p.description??p.descripcion??''),quantity:Math.max(0,Number.isFinite(Number(p.quantity??p.cantidad))?Number(p.quantity??p.cantidad):0)};
  }
  function toRemote(p){
    const x=normalize(p);
    return {id:x.id,nombre:x.name,marca:x.brand,categoria:x.category,precio:x.price,precio_anterior:x.previousPrice||null,imagen_url:x.image,descripcion:x.description,cantidad:x.quantity,estado:x.status};
  }
  function fromRemote(r){return normalize(r)}
  async function getProducts(){
    const {data,error}=await client.from('Productos').select('id,nombre,marca,categoria,precio,precio_anterior,imagen_url,descripcion,cantidad,estado').order('created_at',{ascending:true});
    if(error)throw error;
    return (data||[]).map(fromRemote);
  }
  async function replaceProducts(products){
    const rows=products.map(toRemote);
    if(!rows.length)return {data:[],error:null};
    const {data,error}=await client.from('Productos').upsert(rows,{onConflict:'id'}).select();
    return {data,error};
  }
  async function saveProduct(product){
    const {data,error}=await client.from('Productos').upsert(toRemote(product),{onConflict:'id'}).select().single();
    return {data,error};
  }
  async function deleteProduct(id){return await client.from('Productos').delete().eq('id',String(id));}
  async function getWhatsApp(){
    try{
      const {data,error}=await client.from('Configuracion').select('whatsapp').eq('id','principal').maybeSingle();
      if(error)throw error;
      if(data?.whatsapp){localStorage.setItem(WA_KEY,data.whatsapp);return data.whatsapp;}
    }catch(e){console.warn('Configuración online no disponible:',e.message||e)}
    return localStorage.getItem(WA_KEY)||'311 427 50 57';
  }
  async function saveWhatsApp(phone){
    localStorage.setItem(WA_KEY,phone);
    const {data,error}=await client.from('Configuracion').upsert({id:'principal',whatsapp:phone},{onConflict:'id'}).select().single();
    return {data,error};
  }
  window.ETOILE_DB={client,normalize,toRemote,fromRemote,getProducts,replaceProducts,saveProduct,deleteProduct,getWhatsApp,saveWhatsApp,KEY,WA_KEY};
})();
