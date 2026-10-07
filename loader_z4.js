/* Đăng nhập: giải mã AES-GCM (khoá PBKDF2-SHA256 từ mật khẩu). Admin mở toàn bộ, mỗi NPP chỉ mở phần của mình.
   Sau khi mở: nạp giao diện báo cáo với DATA của tháng đang chọn. */
(function(){
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const $=s=>document.querySelector(s);
const APP=document.getElementById('appsrc').textContent;
document.body.classList.add('locked');
const ml=m=>`T${+m.slice(5)}/${m.slice(0,4)}`;
/* bản chụp giao diện gốc (không gồm script) để nạp lại khi đổi tháng */
const SNAP=[...document.body.childNodes].filter(n=>n.nodeName!=='SCRIPT').map(n=>n.cloneNode(true));
let BUNDLE=null, ROLE=null, MONTH=null, DOC_L=[];
const sub=(o,k)=>{ const e=document.getElementById(o); if(e) e.textContent=k; };
function setLoginMeta(){
  sub('lperiod', ENC.period); sub('lupd', ' · Cập nhật '+ENC.built);
}
setLoginMeta();
async function unlock(user,pass){
  const u=String(user||'').trim().toLowerCase(), blob=ENC.blobs[u];
  if(!blob) return null;
  try{
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pass||'').trim()),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(blob.salt),iterations:ENC.iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
    const gz=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(blob.iv)},key,b64(blob.ct));
    return JSON.parse(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }catch(e){ return null; }
}
function run(month){
  MONTH=month;
  /* gỡ listener cấp document của lần chạy trước, dựng lại giao diện gốc */
  DOC_L.forEach(a=>document.removeEventListener(...a)); DOC_L=[];
  [...document.body.childNodes].filter(n=>n.nodeName!=='SCRIPT').forEach(n=>n.remove());
  const first=document.body.firstChild;
  SNAP.forEach(n=>document.body.insertBefore(n.cloneNode(true), first));
  document.body.classList.add('locked');
  const D=BUNDLE.months[month];
  window.__DATA=D;
  const orig=document.addEventListener;
  document.addEventListener=function(...a){ DOC_L.push(a); return orig.apply(this,a); };
  try{
    const fn=new Function(APP+'\n;return {applyRole};');
    const api=fn();
    const b=D.build||{}, m=D.meta||{};
    sub('fsrc', m.source||''); sub('fperiod', m.period||''); sub('fver', b.ver||''); sub('fupd', b.at||'');
    sub('hupd', 'Cập nhật '+(b.at||''));
    const sel=$('#mth');
    sel.innerHTML=BUNDLE.order.slice().reverse().map(k=>`<option value="${k}">${ml(k)}${k===BUNDLE.current?' · đang chạy':''}</option>`).join('');
    sel.value=month; sel.hidden=BUNDLE.order.length<2;
    api.applyRole(ROLE);
  } finally { document.addEventListener=orig; }
}
window.addEventListener('submit',async e=>{
  if(!e.target||e.target.id!=='loginbox') return;
  e.preventDefault(); e.stopImmediatePropagation();
  const btn=e.target.querySelector('button[type=submit]'), err=$('#lerr');
  btn.disabled=true; const t0=btn.textContent; btn.textContent='Đang mở dữ liệu…';
  const D=await unlock($('#lu').value,$('#lp').value);
  btn.disabled=false; btn.textContent=t0; $('#lp').value='';
  if(!D){ err.textContent='Tên đăng nhập hoặc mật khẩu không đúng.'; err.classList.add('on'); $('#lp').focus(); return; }
  BUNDLE=D; ROLE=D.__role;
  run(D.order[D.order.length-1]);
},true);
window.addEventListener('click',e=>{
  if(e.target&&e.target.closest&&e.target.closest('#logout')){
    e.stopImmediatePropagation(); e.preventDefault();
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){}
    location.reload();
  }
},true);
window.addEventListener('change',e=>{
  if(e.target&&e.target.id==='mth'&&BUNDLE){ const h=location.hash; run(e.target.value); }
},true);
})();
