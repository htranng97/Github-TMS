/* AES-GCM, khoá PBKDF2-SHA256 từ mật khẩu. Admin mở toàn bộ; mỗi NPP chỉ mở phần của mình. */
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function unlock(user,pass){
  const u=String(user||'').trim().toLowerCase(), blob=ENC.blobs[u]||ENC.blobs[(ENC.alias||{})[u]];
  if(!blob) return null;
  try{
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pass||'').trim()),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(blob.salt),iterations:ENC.iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
    const gz=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(blob.iv)},key,b64(blob.ct));
    const txt=await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    return JSON.parse(txt);
  }catch(e){return null;}
}
document.getElementById('lper').textContent='Kỳ '+ENC.period+' · cập nhật '+ENC.built;
document.getElementById('lform').addEventListener('submit',async e=>{e.preventDefault();
  const btn=e.target.querySelector('button[type=submit]'),err=document.getElementById('lerr'),u=document.getElementById('lu').value;
  btn.disabled=true;err.textContent='';btn.textContent='Đang mở dữ liệu…';
  const D=await unlock(u,document.getElementById('lp').value);
  btn.disabled=false;btn.textContent='Đăng nhập';document.getElementById('lp').value='';
  if(!D){err.textContent='Sai tên đăng nhập hoặc mật khẩu.';document.getElementById('lp').focus();return;}
  startApp(D,D.__role);
});
document.getElementById('lu').focus();
