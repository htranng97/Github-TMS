
/*DATA*/
/* Mảng `errors` được lưu ở dạng NÉN: 1 danh sách tên cột + mỗi dòng là 1 mảng giá trị.
   Lý do: tên cột tiếng Việt lặp lại hàng nghìn lần chiếm gần một nửa dung lượng file.
   Bung lại thành object ngay khi tải để toàn bộ phần còn lại của báo cáo dùng như cũ. */
if(DATA.err_keys && Array.isArray(DATA.errors[0])){
  const EK=DATA.err_keys, N=EK.length;
  DATA.errors=DATA.errors.map(r=>{const o={}; for(let i=0;i<N;i++) o[EK[i]]=r[i]; return o;});
}
/* Ngưỡng KPI đọc từ dữ liệu, KHÔNG viết cứng trong giao diện — đổi ngưỡng ở tầng tính
   là toàn bộ báo cáo (chấm điểm, biên an toàn, câu chữ) tự đổi theo. */
const TH=DATA.thresholds;
const T_GEO=TH.geo, T_OT=TH.ontime, T_DTR=TH.dt_routes_month??10,
      // [18/09/2026, patch_r26] Distance & Time đổi sang ngưỡng %: T_DTR (số chuyến/tháng tuyệt đối)
      // KHÔNG còn dùng để tính verdict — giữ lại chỉ để tương thích, không xoá. Dùng 2 hằng số dưới cho D&T.
      T_DTR_ROUTE_PCT=(TH.dt_route_pct??0.30)*100, T_DTR_MONTH_PCT=(TH.dt_month_pct??0.05)*100,
      T_RAD=TH.geo_radius_m??50, T_PLR=TH.payload_ratio??1.5,
      T_WS=TH.work_start??6, T_WE=TH.work_end??20, T_SMALL=TH.small_sample??30;
const WH_TXT=String(T_WS).padStart(2,'0')+':00–'+String(T_WE).padStart(2,'0')+':00';
/* v47 · M2 — ĐẦU MỐI KHIẾU NẠI: điền 4 trường này khi Ban DIP chốt (Q13).
   Bỏ trống thì báo cáo hiện hướng dẫn tạm, KHÔNG bao giờ in dấu ngoặc vuông rỗng ra màn hình. */
const CONTACT={name:'', mail:'', due:'', sla:''};
function contactTxt(){
  if(!CONTACT.name && !CONTACT.mail) return '<b>quản lý vùng phụ trách NPP của anh/chị</b>';
  return (CONTACT.name?'<b>'+esc(CONTACT.name)+'</b>':'')
       + (CONTACT.mail?(CONTACT.name?' · ':'')+'<a href="mailto:'+esc(CONTACT.mail)+'">'+esc(CONTACT.mail)+'</a>':'');
}
function appealDueTxt(){
  if(CONTACT.due && CONTACT.sla) return 'Hạn nộp <b>'+esc(CONTACT.due)+'</b>; kết quả rà soát trả lời trong <b>'+esc(CONTACT.sla)+'</b> ngày làm việc.';
  return 'Hạn nộp và thời gian phản hồi <b>chưa được '+L.owner+' chốt</b> — khi có sẽ ghi ngay tại đây.';
}
/* ============ TỪ VỰNG CHUẨN — mỗi khái niệm đúng MỘT từ ============
   Chốt 30/08/2026 sau phiên phản biện nội dung. Trước đó cùng một khái niệm bị gọi bằng
   3–4 tên khác nhau trong cùng một màn hình (chuyến/plan/route/PlanNumber), buộc người đọc
   tự dịch. Mọi câu chữ dưới đây dùng đúng bộ từ này; tên cột kỹ thuật chỉ xuất hiện ở
   bảng ánh xạ nghiệp vụ → dữ liệu (tab Chất lượng dữ liệu). */
const L={
  route:'chuyến', routes:'chuyến',
  pass:'ĐẠT', fail:'KHÔNG ĐẠT', gap:'CHƯA CHẤM',
  kpiDT:'Distance & Time',            // tên chính thức trong bộ luật KPI
  kpiGeo:'Geo Compliance',            // tên chính thức trong bộ luật KPI
  owner:'Ban DIP HEINEKEN',           // thay cho "Stakeholder"
  scope:'phạm vi tính'                // thay cho "population"
};
/* ĐỊNH NGHĨA GEO CHUẨN — viết đúng một lần, mọi nơi khác trích ngắn rồi trỏ về tab Cách chấm điểm.
   Trước đây định nghĩa này được viết lại bằng chữ khác nhau ở 7 chỗ. */
const GEO_DEF_SHORT = `đơn phải đạt <b>cả 3 điều kiện</b>: <b>(1)</b> giao tại vị trí điểm bán dưới ${TH.geo_radius_m??50}m · <b>(2)</b> outlet tới outlet trên ${TH.geo_gap_min??2} phút · <b>(3)</b> giao trong giờ làm việc ${WH_TXT}`;
/* ===================== helpers ===================== */
const $ = s => document.querySelector(s);
const fmt = n => (n==null||isNaN(n)) ? '–' : Number(n).toLocaleString('vi-VN');
const num = (n,d=2) => (n==null||isNaN(n)) ? '–'
  : Number(n).toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d});
const sgn = (n,d=2) => (n>0?'+':'')+num(n,d);
const pct = n => (n==null||isNaN(n)) ? '–' : Number(n).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* kho tooltip: giữ HTML trong Map theo id, phần tử chỉ mang data-tip-id (không tái phân tích HTML) */
const TIPS=new Map(); let tipSeq=0;
function tipRef(html){ const id='t'+(++tipSeq); TIPS.set(id,html); return id; }
const cellGo = (x,key,txt,page,type) => {
  const v=x[key];
  if(v!=='FAIL') return chip(v,v==='PASS'?L.pass+' · '+txt:txt);
  return `<button type="button" class="cellbtn" data-go="${page}" data-npp="${esc(x.npp)}" data-type="${esc(type||'')}"
    aria-label="Xem chi tiết ${esc(txt)} của NPP ${esc(x.npp)}">${chip('FAIL',L.fail+' · '+txt)}<span class="gochev">→</span></button>`;
};
/* Nhãn kết quả bằng tiếng Việt ở MỌI chỗ — trước đây thẻ KPI hiện PASS/FAIL/GAP tiếng Anh
   trong khi bảng ngay bên dưới hiện ĐẠT/KHÔNG ĐẠT, cùng một trạng thái hai ngôn ngữ. */
const chip = (v,txt) => v==='GAP'
  ? `<span class="chip gap"><span class="ic">◐</span>${txt||L.gap}</span>`
  : `<span class="chip ${v==='PASS'?'pass':'fail'}"><span class="ic">${v==='PASS'?'✓':'✕'}</span>${txt||(v==='PASS'?L.pass:L.fail)}</span>`;
const SC = {}; DATA.scorecard.forEach(r=>SC[r.npp]=r);
const NPPS = DATA.scorecard.map(r=>r.npp);
let cur = 'ALL';
/* ---- phân quyền: role = 'admin' hoặc mã NPP ---- */
let role = null;
const isAdmin = () => role==='admin';
/* danh sách NPP mà tài khoản hiện tại được phép nhìn thấy */
const SB = () => isAdmin() ? DATA.scorecard : DATA.scorecard.filter(x=>x.npp===role);

/* aggregate row for "ALL" built from the real totals */
function row(){
  if(!isAdmin()) return SC[role];
  if(cur!=='ALL') return SC[cur];
  const t = DATA.total, sc = DATA.scorecard;
  return Object.assign({}, t, {
    v_username: t.username_pct>=TH.username?'PASS':'FAIL',
    v_dt: 'MIX', v_geo: t.geo_pct>=T_GEO?'PASS':'FAIL',
    v_ontime: t.ot_pct>T_OT?'PASS':'FAIL', v_successful: t.ot_pct>T_OT?'PASS':'FAIL',
    v_payload: t.payload_plans_fail===0?'PASS':'FAIL',
    npps_fail: sc.filter(r=>r.overall==='FAIL').length, npps_total: sc.length
  });
}
const tip = $('#tip');
function tipHtmlOf(el){ return TIPS.get(el.getAttribute('data-tip-id'))||''; }
function showTipAt(html,x,y){
  tip.innerHTML=html; tip.style.opacity=1;
  const b=tip.getBoundingClientRect();
  let px=x+14, py=y-10;
  if(px+b.width>innerWidth-8) px=Math.max(8,x-b.width-14);
  if(py+b.height>innerHeight-8) py=innerHeight-b.height-8;
  tip.style.left=px+'px'; tip.style.top=Math.max(8,py)+'px';
}
function showTipFor(el){ const r=el.getBoundingClientRect(); showTipAt(tipHtmlOf(el), r.left+r.width/2, r.top); }
function hideTip(){tip.style.opacity=0;}
/* Một listener uỷ quyền cho toàn bộ <main>: chuột, bàn phím và cảm ứng đều dùng được */
(function(){
  const M=$('#main');
  const hit = t => t.closest && t.closest('[data-tip-id]');
  M.addEventListener('mouseover',e=>{const el=hit(e.target); if(el) showTipAt(tipHtmlOf(el),e.clientX,e.clientY);});
  M.addEventListener('mousemove',e=>{const el=hit(e.target); if(el) showTipAt(tipHtmlOf(el),e.clientX,e.clientY);});
  M.addEventListener('mouseout',e=>{if(hit(e.target)) hideTip();});
  M.addEventListener('focusin',e=>{const el=hit(e.target); if(el) showTipFor(el); });
  M.addEventListener('focusout',e=>{if(hit(e.target)) hideTip();});
  M.addEventListener('click',e=>{const el=hit(e.target); if(el) showTipFor(el);});
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') hideTip(); });
  addEventListener('scroll',hideTip,true);
  /* SVG không tự kích hoạt Enter/Space cho role="button" như <button> thật — bổ sung thủ công
     để bàn phím dùng được biểu đồ (segment lỗi, hàng username bấm-để-xem-lỗi, ...) */
  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter' && e.key!==' ') return;
    const t=e.target; if(!t.getAttribute || t.getAttribute('role')!=='button') return;
    if(t.tagName==='BUTTON' || t.tagName==='A') return; // đã có hành vi gốc, khỏi nhân đôi
    e.preventDefault(); t.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  });
})();

/* ===================== charts (pure SVG) ===================== */
// làm tròn trục về số "đẹp": 1 / 2 / 2.5 / 5 × 10^k, chia hết cho 4 nấc
function tkShort(v){
  v=Number(v)||0; const a=Math.abs(v);
  if(a>=1e9) return (v/1e9).toFixed(a<1e10?1:0).replace('.',',')+' tỷ';
  if(a>=1e6) return (v/1e6).toFixed(a<1e7?1:0).replace('.',',')+' tr';
  if(a>=1e4) return (v/1e3).toFixed(0)+'K';
  return fmt(v);
}
function niceMax(v,steps=4){
  if(v<=0) return steps;
  const raw=v/steps, mag=Math.pow(10,Math.floor(Math.log10(raw)));
  const step=[1,1.5,2,2.5,3,4,5,7.5,10].map(m=>m*mag).find(s=>s>=raw-1e-9)||10*mag;
  return step*steps;
}
// Horizontal bar chart, single series, optional threshold
function hbar(items,{max=100,thr=null,thrLabel='',unit='%',color='var(--brand)',w=760,label=v=>pct(v),a11y=''}={}){
  const rowH=30, padL=62, padR=64, padT=26, padB=26, H=padT+items.length*rowH+padB;
  const iw = w-padL-padR;
  const _id='c'+(++tipSeq);
  let s=`<div class="cwrap"><svg style="max-width:${Math.round(w*1.25)}px" viewBox="0 0 ${w} ${H}" role="img" aria-labelledby="${_id}t"><title id="${_id}t">${esc(a11y||'Biểu đồ cột ngang')}</title>`;
  // gridlines
  for(let i=0;i<=4;i++){const g=max*i/4, x=padL+iw*i/4;
    s+=`<line class="gl" x1="${x}" y1="${padT}" x2="${x}" y2="${padT+items.length*rowH}"/>`;
    s+=`<text class="tk" x="${x}" y="${H-9}" text-anchor="middle">${fmt(Math.round(g*100)/100)}${unit}</text>`;}
  items.forEach((it,i)=>{
    const y=padT+i*rowH, bh=18, by=y+(rowH-bh)/2;
    const bw=Math.max(2,iw*Math.min(it.v,max)/max);
    const c = it.color||color;
    s+=`<text class="vl" x="${padL-9}" y="${by+13}" text-anchor="end">${esc(it.k)}</text>`;
    s+=`<path d="M${padL},${by} h${bw-4} a4,4 0 0 1 4,4 v${bh-8} a4,4 0 0 1 -4,4 h${-(bw-4)} z" fill="${c}"/>`;
    s+=`<text class="vl" x="${padL+bw+8}" y="${by+13}">${label(it.v)}</text>`;
    s+=`<rect class="hit" tabindex="0" role="button" aria-label="${esc(it.k)}: ${esc(label(it.v))}" x="${padL}" y="${y}" width="${iw}" height="${rowH}" data-tip-id="${tipRef(it.tip||'')}"/>`;
  });
  if(thr!=null){const x=padL+iw*thr/max;
    s+=`<line class="thr" x1="${x}" y1="${padT-6}" x2="${x}" y2="${padT+items.length*rowH+2}"/>`;
    s+=`<text class="thrl" x="${x}" y="${padT-11}" text-anchor="middle">${thrLabel}</text>`;}
  s+=`<line class="ax" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+items.length*rowH}"/></svg>`;
  return s+'</div>';
}
// Column chart (counts)
function vbar(items,{w=760,h=250,color='var(--brand)',fmtv=fmt,a11y=''}={}){
  const padL=54,padR=14,padT=22,padB=44, iw=w-padL-padR, ih=h-padT-padB;
  const nice=niceMax(Math.max(1,...items.map(d=>d.v)));
  const bw=Math.min(24, iw/items.length*0.55);
  /* Bỏ bớt nhãn trục khi không đủ chỗ: 28 nhãn ngày trên 692 đơn vị làm 27/28 cặp đè nhau.
     Ước lượng bề rộng nhãn theo số ký tự dài nhất (~5,6 đơn vị/ký tự ở cỡ chữ 11). */
  const _lblW = Math.max(1, Math.max(...items.map(d=>String(d.k).length)) * 5.6);
  const _step = Math.max(1, Math.ceil(items.length / Math.max(1, Math.floor(iw/_lblW))));
  const _id='c'+(++tipSeq);
  let s=`<div class="cwrap"><svg style="max-width:${Math.round(w*1.25)}px" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${_id}t"><title id="${_id}t">${esc(a11y||'Biểu đồ cột')}</title>`;
  for(let i=0;i<=4;i++){const y=padT+ih*i/4, v=nice*(1-i/4);
    s+=`<line class="gl" x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}"/>`;
    s+=`<text class="tk" x="${padL-8}" y="${y+4}" text-anchor="end">${tkShort(Math.round(v))}</text>`;}
  items.forEach((d,i)=>{
    const cx=padL+iw*(i+.5)/items.length, bh=Math.max(2,ih*d.v/nice), y=padT+ih-bh;
    s+=`<path d="M${cx-bw/2},${padT+ih} v${-(bh-4)} a4,4 0 0 1 4,-4 h${bw-8} a4,4 0 0 1 4,4 v${bh-4} z" fill="${d.color||color}"/>`;
    s+=`<text class="vl" x="${cx}" y="${y-7}" text-anchor="middle">${fmtv(d.v)}</text>`;
    if(i%_step===0) s+=`<text class="tk" x="${cx}" y="${h-24}" text-anchor="middle">${esc(d.k)}</text>`;
    s+=`<rect class="hit" tabindex="0" role="button" aria-label="${esc(d.k)}: ${esc(fmtv(d.v))}" x="${cx-iw/items.length/2}" y="${padT}" width="${iw/items.length}" height="${ih}" data-tip-id="${tipRef(d.tip||'')}"/>`;
  });
  s+=`<line class="ax" x1="${padL}" y1="${padT+ih}" x2="${w-padR}" y2="${padT+ih}"/></svg>`;
  return s+'</div>';
}
/* Cột chồng ngang — mỗi đoạn là một loại lỗi, dài bao nhiêu là bấy nhiêu đơn.
   Theo chuẩn dựng biểu đồ: khe hở 2px màu nền tách các đoạn, bo tròn 4px ở đầu mút,
   nhãn số đặt trong đoạn khi đủ rộng, còn lại nằm ở tooltip và bảng dữ liệu. */
function stackbar(items,{keys,w=820,label='đơn',a11y='',rowGo=null}={}){
  const rowH=38, padL=150, padR=86, padT=10, padB=30, bh=22, GAP=2;
  const H=padT+items.length*rowH+padB, iw=w-padL-padR;
  const max=niceMax(Math.max(1,...items.map(it=>it.total)));
  const _id='c'+(++tipSeq);
  let s=`<div class="cwrap"><svg style="max-width:${Math.round(w*1.25)}px" viewBox="0 0 ${w} ${H}" role="img" aria-labelledby="${_id}t"><title id="${_id}t">${esc(a11y)}</title>`;
  for(let i=0;i<=4;i++){const x=padL+iw*i/4;
    s+=`<line class="gl" x1="${x}" y1="${padT}" x2="${x}" y2="${padT+items.length*rowH}"/>`;
    s+=`<text class="tk" x="${x}" y="${H-9}" text-anchor="middle">${fmt(Math.round(max*i/4))}</text>`;}
  items.forEach((it,i)=>{
    const y=padT+i*rowH, by=y+(rowH-bh)/2;
    const go = rowGo ? rowGo(it) : null;
    if(go){
      s+=`<g class="rowlink" tabindex="0" role="button" aria-label="Xem các đơn lỗi của ${esc(it.k)}"
           data-go="${esc(go.go)}" data-user="${esc(go.user)}"${go.npp?` data-npp="${esc(go.npp)}"`:''}>
           <rect class="rowbg" x="0" y="${y}" width="${padL-6}" height="${rowH}" rx="6"/>
           <text class="vl rlbl" x="${padL-22}" y="${by+15}" text-anchor="end">${esc(it.k)}</text>
           <text class="rlgo" x="${padL-10}" y="${by+15}" text-anchor="end">›</text>
           </g>`;
    } else {
      s+=`<text class="vl" x="${padL-10}" y="${by+15}" text-anchor="end">${esc(it.k)}</text>`;
    }
    let x=padL;
    const live=keys.filter(kk=>it[kk.k]>0);
    live.forEach((kk,j)=>{
      const v=it[kk.k], seg=iw*v/max, last=j===live.length-1;
      const wd=Math.max(2, seg-(last?0:GAP));
      const path = last
        ? `M${x},${by} h${Math.max(0,wd-4)} a4,4 0 0 1 4,4 v${bh-8} a4,4 0 0 1 -4,4 h${-Math.max(0,wd-4)} z`
        : `M${x},${by} h${wd} v${bh} h${-wd} z`;
      s+=`<path d="${path}" fill="${kk.c}"/>`;
      if(wd>=30) s+=`<text class="seg-l" x="${x+wd/2}" y="${by+15}" text-anchor="middle">${fmt(v)}</text>`;
      s+=`<rect class="hit" tabindex="0" role="button" aria-label="${esc(it.k)} · ${esc(kk.n)}: ${fmt(v)} ${esc(label)}"
           x="${x}" y="${by}" width="${Math.max(2,seg)}" height="${bh}"
           data-tip-id="${tipRef(`<b>${esc(it.k)}</b><div class="r"><i style="background:${kk.c}"></i>${esc(kk.n)}: <b>${fmt(v)} ${esc(label)}</b></div><div class="r">Tổng các loại: ${fmt(it.total)}</div>`)}"/>`;
      x+=seg;
    });
    s+=`<text class="vl" x="${x+9}" y="${by+15}">${fmt(it.total)}${it.sub?`<tspan class="seg-sub"> · ${esc(it.sub)}</tspan>`:``}</text>`;
  });
  s+=`<line class="ax" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+items.length*rowH}"/></svg>`;
  return s+'</div>';
}
// Multi-series line chart with crosshair
function lines(days,series,{w=900,h=290,min=60,a11y='',thresholds=[],vol=null}={}){
  const padL=48,padR=58,padT=18,padB=40, iw=w-padL-padR, ih=h-padT-padB;
  const X=i=>padL+(days.length<2?iw/2:iw*i/(days.length-1));
  const Y=v=>padT+ih*(1-(v-min)/(100-min));
  const _id='c'+(++tipSeq);
  let s=`<div class="cwrap"><svg style="max-width:${Math.round(w*1.25)}px" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${_id}t"><title id="${_id}t">${esc(a11y||'Biểu đồ đường theo ngày')}</title>`;
  for(let i=0;i<=4;i++){const v=min+(100-min)*i/4, y=Y(v);
    s+=`<line class="gl" x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}"/>`;
    s+=`<text class="tk" x="${padL-8}" y="${y+4}" text-anchor="end">${Math.round(v)}%</text>`;}
  days.forEach((d,i)=>{ if(days.length<=20||i%2===0)
    s+=`<text class="tk" x="${X(i)}" y="${h-20}" text-anchor="middle">${esc(d)}</text>`;});
  thresholds.forEach(t=>{ if(t.v<min) return; const y=Y(t.v);
    s+=`<line class="thr" x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="${t.c||'var(--crit)'}"/>`;
    s+=`<text class="thrl" x="${w-padR-4}" y="${y-6}" text-anchor="end" fill="${t.c||'var(--crit)'}">${esc(t.label)}</text>`;});
  const li=days.length-1;
  /* Duong cong Catmull-Rom -> Bezier, do cong 0,4 (tuong duong tension .4) */
  const SMOOTH=(P,t=0.4)=>{ if(P.length<2) return ''; let d=`M${P[0][0]},${P[0][1]}`;
    for(let i=0;i<P.length-1;i++){ const p0=P[i-1]||P[i], p1=P[i], p2=P[i+1], p3=P[i+2]||P[i+1];
      d+=` C${(p1[0]+(p2[0]-p0[0])*t/3).toFixed(1)},${(p1[1]+(p2[1]-p0[1])*t/3).toFixed(1)}`
       +` ${(p2[0]-(p3[0]-p1[0])*t/3).toFixed(1)},${(p2[1]-(p3[1]-p1[1])*t/3).toFixed(1)}`
       +` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
  s+='<defs>'+series.map((se,k)=>`<linearGradient id="${_id}g${k}" x1="0" y1="0" x2="0" y2="1">`
      +`<stop offset="0%" stop-color="${se.c}" stop-opacity=".28"/>`
      +`<stop offset="100%" stop-color="${se.c}" stop-opacity="0"/></linearGradient>`).join('')+'</defs>';
  series.forEach((se,k)=>{
    const P=se.v.map((v,i)=>[X(i),Y(Math.max(min,Math.min(100,v)))]);
    const dd=SMOOTH(P);
    /* Vung to mau duoi duong — chi duong lien net, duong gach khong to de khong chong nhau */
    if(!se.d||se.d==='none')
      s+=`<path d="${dd} L${X(li)},${padT+ih} L${X(0)},${padT+ih} Z" fill="url(#${_id}g${k})" stroke="none"/>`;
    const solid=(!se.d||se.d==='none');
    s+=`<path${solid?' class="rd-draw" style="--d:'+(k*80)+'ms"':''} d="${dd}" fill="none" stroke="${se.c}" stroke-width="2.5" stroke-dasharray="${se.d||'none'}" stroke-linejoin="round" stroke-linecap="round"/>`;
    s+=`<circle class="rd-dot" cx="${X(li)}" cy="${Y(Math.max(min,Math.min(100,se.v[li])))}" r="4" fill="${se.c}" stroke="var(--surface)" stroke-width="2"/>`;
    if(vol) vol.forEach((n,i)=>{ if(n<100)
      s+=`<circle cx="${X(i)}" cy="${Y(Math.max(min,Math.min(100,se.v[i])))}" r="3.6" fill="var(--surface)" stroke="${se.c}" stroke-width="2"/>`;});
  });
  // nhãn cuối đường: tách nhau tối thiểu 14px để không chồng chữ
  const ends=series.map((se,i)=>({i,y:Y(Math.max(min,Math.min(100,se.v[li]))),t:se.v[li].toFixed(1)+'%'}))
                   .sort((a,b)=>a.y-b.y);
  for(let k=1;k<ends.length;k++) if(ends[k].y-ends[k-1].y<14) ends[k].y=ends[k-1].y+14;
  ends.forEach(e=>{ s+=`<text class="vl" x="${X(li)+10}" y="${e.y+4}">${e.t}</text>`; });
  days.forEach((d,i)=>{
    const rows=(vol?`<div class="r">Sản lượng: <b>${fmt(vol[i])} đơn</b>${vol[i]<100?' — mẫu nhỏ':''}</div>`:'')
      +series.map(se=>`<div class="r"><i style="background:${se.c}"></i>${se.n}: <b>${pct(se.v[i])}</b></div>`).join('');
    const alab=series.map(se=>`${se.n} ${pct(se.v[i])}`).join(', ');
    s+=`<rect class="hit" tabindex="0" role="button" aria-label="Ngày ${esc(d)}: ${esc(alab)}" x="${X(i)-iw/Math.max(1,days.length-1)/2}" y="${padT}" width="${iw/Math.max(1,days.length-1)}" height="${ih}" data-tip-id="${tipRef(`<b>${esc(d)}</b>${rows}`)}"/>`;
  });
  s+=`<line class="ax" x1="${padL}" y1="${padT+ih}" x2="${w-padR}" y2="${padT+ih}"/></svg>`;
  return s+'</div>';
}

/* ============ XUẤT FILE EXCEL (.xlsx) THẬT ============
   Lý do: file CSV phụ thuộc "ký tự phân cột" của từng máy — Excel ngôn ngữ Anh dùng dấu phẩy,
   Excel tiếng Việt dùng dấu chấm phẩy — nên mở ở máy khác là dồn hết vào một cột.
   File .xlsx không có vấn đề đó: cột là cột, số là số, ngày là ngày. */
const CRC_T=(()=>{const t=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0;}return t;})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC_T[(c^u8[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
const ENC=new TextEncoder();
function zipStore(files){
  /* ZIP không nén (method 0) — đủ chuẩn để Excel mở, không cần thư viện ngoài */
  const parts=[], dir=[]; let off=0;
  const u16=n=>[n&255,(n>>8)&255], u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>24)&255];
  files.forEach(f=>{
    const name=ENC.encode(f.name), data=f.data, crc=crc32(data);
    const lh=[...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
      ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)];
    parts.push(new Uint8Array(lh),name,data);
    dir.push({name,crc,len:data.length,off});
    off += lh.length+name.length+data.length;
  });
  const cd=[]; let cdLen=0;
  dir.forEach(d=>{
    const h=[...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
      ...u32(d.crc),...u32(d.len),...u32(d.len),...u16(d.name.length),
      ...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(d.off)];
    cd.push(new Uint8Array(h),d.name); cdLen+=h.length+d.name.length;
  });
  const eo=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(dir.length),...u16(dir.length),
    ...u32(cdLen),...u32(off),...u16(0)]);
  const all=[...parts,...cd,eo];
  let total=0; all.forEach(a=>total+=a.length);
  const out=new Uint8Array(total); let p=0; all.forEach(a=>{out.set(a,p);p+=a.length;});
  return out;
}
const xe = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function colName(n){let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-1-m)/26;}return s;}
const RE_DT=/^(\d{2})\/(\d{2})\/(\d{4})(?:\s(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const RE_NUM=/^-?\d+(\.\d+)?$/;
function excelSerial(d,mo,y,h,mi,se){
  const ms=Date.UTC(y,mo-1,d,h||0,mi||0,se||0);
  return ms/86400000 + 25569;   // 25569 = số ngày từ 1899-12-30 tới 1970-01-01
}
function sheetXml(head,rows,keys){
  const ncol=head.length;
  let x=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView tabSelected="1" workbookViewId="0">
<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/><cols>${head.map((h,i)=>
  `<col min="${i+1}" max="${i+1}" width="${Math.min(34,Math.max(11,h.length+3))}" customWidth="1"/>`).join('')}</cols>
<sheetData><row r="1">${head.map((h,i)=>
  `<c r="${colName(i+1)}1" s="2" t="inlineStr"><is><t>${xe(h)}</t></is></c>`).join('')}</row>`;
  rows.forEach((row,ri)=>{
    const r=ri+2; let cells='';
    keys.forEach((k,ci)=>{
      let v=row[k];
      if(v===null||v===undefined||v==='') return;                 // ô rỗng: bỏ qua
      if(typeof v==='number'){ if(isNaN(v)) return;
        cells+=`<c r="${colName(ci+1)}${r}"><v>${v}</v></c>`; return; }
      const t=String(v);
      const m=RE_DT.exec(t);
      if(m){ const s=excelSerial(+m[1],+m[2],+m[3],+m[4]||0,+m[5]||0,+m[6]||0);
        cells+=`<c r="${colName(ci+1)}${r}" s="1"><v>${s}</v></c>`; return; }
      if(RE_NUM.test(t)){ cells+=`<c r="${colName(ci+1)}${r}"><v>${t}</v></c>`; return; }
      cells+=`<c r="${colName(ci+1)}${r}" t="inlineStr"><is><t>${xe(t)}</t></is></c>`;
    });
    x+=`<row r="${r}">${cells}</row>`;
  });
  x+=`</sheetData><autoFilter ref="A1:${colName(ncol)}${rows.length+1}"/></worksheet>`;
  return x;
}
function buildXlsx(head,rows,keys,sheetName){
  const F=(name,str)=>({name,data:ENC.encode(str)});
  const files=[
    F('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    F('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    F('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xe(sheetName).slice(0,31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    F('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    F('xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm:ss"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF007A33"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`),
    F('xl/worksheets/sheet1.xml', sheetXml(head,rows,keys))
  ];
  return zipStore(files);
}

function tableOf(head,rows,cap){
  return `<details class="dtbl"><summary>Xem dạng bảng dữ liệu</summary>
   <div class="wrap"><table class="rt"><caption class="sr-only">${esc(cap||'')}</caption>
   <thead><tr>${head.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
   <tbody>${rows.map(r=>`<tr>${r.map((c,i)=>i===0?`<th scope="row" data-l="${esc(head[0])}">${c}</th>`:`<td data-l="${esc(head[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
   </table></div></details>`;
}

/* ============ KHUYẾN NGHỊ VẬN HÀNH — góc nhìn quản lý NPP ngành FMCG ============
   Nguyên tắc: bám KPI mà NPP ĐANG TRƯỢT trước, không dàn trải; gộp các tài khoản
   cùng một nguyên nhân thành một nhóm để tránh lặp; không quy trách nhiệm khi
   nguyên nhân nằm ở kế hoạch hoặc hệ thống. */
const KPI_LABEL={geo:L.kpiGeo, ot:'Giao trong cam kết 24h/48h', dt:L.kpiDT, pl:'Xe chở quá tải'};
const CAUSE={
 pl:{ t:'Xe bị chất quá 1,5 lần tải trọng',
   why:'Đây là lỗi <b>khâu lên kế hoạch và xếp hàng tại kho</b> — tài xế không quyết định được chất bao nhiêu lên xe.',
   acts:[['Điều phối','Rà lại việc gán xe cho các chuyến này: chia nhỏ chuyến, hoặc đổi sang xe tải trọng lớn hơn.'],
         ['Thủ kho','Cân đối trước khi xuất hàng — dừng xuất khi tổng khối lượng vượt 1,5 lần tải đăng ký của xe.'],
         ['Quản lý NPP','Kiểm tra <b>tải trọng xe khai trong hệ thống TMS</b> có khớp xe thật không. Nếu khai thấp hơn xe thật thì đây là lỗi dữ liệu, sửa khai báo là hết lỗi.']]},
 /* Geo ghép 3 điều kiện nên nguyên nhân phải tính động theo đúng NPP đang xem — 3 nguyên nhân
    đòi hỏi 3 cách xử lý khác hẳn nhau, gộp chung sẽ ra gợi ý sai. */
 geo:(x)=>{
   const g = x || DATA.total;
   const vN=g.geo_v_fail||0, wN=g.geo_w_fail||0, xN=g.geo_x_fail||0, xOnly=g.geo_x_only||0;
   return { t:'Không đạt Geo Compliance',
     why:`Geo Compliance ghép <b>3 điều kiện</b>, đơn chỉ cần phạm một là tính lỗi: giao cách điểm bán quá ${fmt(T_RAD)}m (<b>${fmt(vN)}</b> đơn) · outlet tới outlet chỉ cách nhau ${fmt(TH.geo_gap_min??2)} phút hoặc ít hơn (<b>${fmt(wN)}</b> đơn) · hoàn tất <b>ngoài khung ${esc(WH_TXT)}</b> (<b>${fmt(xN)}</b> đơn, trong đó <b>${fmt(xOnly)}</b> đơn CHỈ lỗi vì giờ giao dù vị trí hoàn toàn đúng).${xOnly>0?' Phần ngoài giờ là vấn đề <b>lịch xuất bến</b>, không phải độ chính xác GPS.':''}`,
     acts:[
       ['Điều phối', xOnly>0?`Rà các chuyến kết thúc sau ${fmt(T_WE)}h hoặc trước ${fmt(T_WS)}h — dồn giao về sáng hôm sau thay vì cố hoàn tất trong đêm.`:`Kiểm tra lịch xuất bến có nằm gọn trong khung ${esc(WH_TXT)} không.`],
       ['Giám sát bán hàng','Với các đơn lệch vị trí (khác nhóm ngoài giờ): đi thị trường cùng tài xế 1 ngày để biết đang bấm sớm/muộn, giao nhầm cửa, hay toạ độ điểm bán trong hệ thống sai.'],
       ['Tài xế',`Chỉ bấm xác nhận khi đã đứng tại điểm bán. Nếu chuyến chắc chắn xong sau ${fmt(T_WE)}h, báo điều phối thay vì cố giao cho xong.`],
       ['Quản lý NPP','Trích danh sách điểm bán bị lệch vị trí nhiều lần và đo lại toạ độ. Nếu cùng một điểm bán lặp lại thì lỗi ở dữ liệu gốc.']
     ]};
 },
 ot:{ t:'Giao quá hạn cam kết 24h/48h',
   why:'Đồng hồ SLA chạy từ lúc <b>điểm bán đặt hàng</b>, nên quá hạn có thể do chốt đơn muộn, soạn hàng chậm, hay xe rời bến trễ — không nhất thiết do tài xế chạy chậm.',
   acts:[['Điều phối','Dựng lại mốc thời gian của các đơn quá hạn: đặt hàng lúc nào → soạn xong lúc nào → xuất bến lúc nào → giao lúc nào. Khâu ngốn nhiều giờ nhất là khâu phải sửa.'],
         ['Điều phối','Sắp lại thứ tự điểm giao theo cụm địa lý và theo <b>giờ nhận hàng của điểm bán</b> — nhiều tạp hoá không nhận hàng giờ trưa.'],
         ['Giám sát bán hàng','Nếu trễ tập trung ở vài điểm bán cố định, làm việc lại với điểm bán về khung giờ nhận hàng thay vì ép tài xế.']]},
 dt:{ t:'Chuyến lỗi Distance & Time',
   why:`Một outlet bị tính lỗi khi <b>thời gian tới outlet liền trước chưa đủ ${fmt(TH.dt_gap_min??2)} phút</b> — không đủ để vừa di chuyển vừa giao hàng. Dấu hiệu điển hình của <b>bấm xác nhận hàng loạt</b>, hoặc máy mất mạng rồi gửi dữ liệu dồn một lần. Một chuyến được phép sai tối đa <b>${fmt(T_DTR_ROUTE_PCT)}% số outlet của chính chuyến đó</b>; vượt tỷ lệ đó thì cả chuyến tính là hỏng — <b>chuyến càng ít outlet càng dễ vượt ngưỡng này</b> (chuyến 2 outlet chỉ cần 1 outlet lỗi là đã 50%).`,
   acts:[['Giám sát bán hàng','Xác minh trực tiếp: tài xế bấm dồn cuối ca, hay máy mất mạng rồi gửi dồn? Hai nguyên nhân này xử lý hoàn toàn khác nhau.'],
         ['Quản lý NPP','Kiểm tra nhật ký gửi dữ liệu của máy. Nếu khoảng cách giữa các đơn đều tăm tắp (ví dụ đúng 9 giây) thì là lỗi hệ thống, <b>không được quy cho tài xế</b>.'],
         ['Tài xế','Nếu đúng là bấm dồn: nhắc bấm xác nhận ngay tại từng điểm. Đây là dữ liệu dùng xét thưởng DIP, bấm dồn làm hỏng số liệu của cả NPP.']]}};

/* số đơn/chuyến còn thiếu để chạm ngưỡng — con số giám đốc NPP cần nhất */
function gapToPass(x){
  const g=[];
  if(x.v_geo==='FAIL'){ const need=Math.max(1, Math.ceil(T_GEO/100*x.geo_scope_orders) - (x.geo_scope_orders-x.geo_fail));
    g.push({k:'geo', n:need, txt:`sửa thêm <b>${fmt(need)} đơn</b> đạt đủ cả 3 điều kiện Geo là chạm ngưỡng ${num(T_GEO,0)}%`}); }
  if(x.v_ontime==='FAIL'){ const need=Math.max(1, Math.floor(T_OT/100*x.orders)+1 - (x.orders-x.ot_fail));
    g.push({k:'ot', n:need, txt:`giao đúng hạn thêm <b>${fmt(need)} đơn</b> là chạm ngưỡng ${num(T_OT,0)}%`}); }
  if(x.v_dt==='FAIL'){ const needDt=Math.max(1, Math.floor(x.dt_routes_fail - (T_DTR_MONTH_PCT/100)*x.plans) + 1);
    g.push({k:'dt', n:needDt, txt:`giảm <b>${fmt(needDt)} chuyến</b> lỗi Distance & Time là về dưới ngưỡng ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến`}); }
  if(x.v_payload==='FAIL') g.push({k:'pl', n:x.payload_plans_fail, txt:`xử lý <b>${fmt(x.payload_plans_fail)} chuyến</b> chở quá tải — tiêu chí này yêu cầu tuyệt đối 0 chuyến`});
  return g;
}
/* ══ v43 · TÍN HIỆU ĐỘ VỮNG — chỉ ĐỌC khối đã tính sẵn, không tính lại KPI ══
   Trả về các câu SỰ THẬT cho một NPP ở một tiêu chí (geo|ot|pl), để người đọc biết kết luận
   có thể đổi vì dữ liệu/quy tắc chưa chốt hay không — trước khi làm việc với NPP. */
function nppSignals(npp, k){
  const out=[], m=DATA.margin&&DATA.margin[npp];
  const by=(blk,key)=>((DATA[blk]&&DATA[blk][key])||[]);
  if(k==='geo'){
    if(m&&m.geo_straddle) out.push('sai số 95% vắt ngang ngưỡng');
    const o=by('outlet','by_npp').find(x=>x.npp===npp);
    if(o&&o.suspect_orders) out.push(`${fmt(o.suspect_orders)} đơn ở điểm bán nghi sai toạ độ`);
    const w=by('wh_detail','by_npp').find(x=>x.npp===npp);
    if(w&&w.nodate) out.push(`${fmt(w.nodate)} đơn không có giờ giao bị tính ngoài giờ`);
    const S=DATA.sens||[], s0=S[0], s200=S.find(s=>(s.kw||[]).includes('geo200'));
    if(s0&&s200&&s0.verdicts&&s200.verdicts&&s0.verdicts[npp]!==s200.verdicts[npp]) out.push('đổi kết quả nếu chốt bán kính 200 m');
  }
  if(k==='ot'){
    if(m&&m.ot_straddle) out.push('sai số 95% vắt ngang ngưỡng');
    const p=((DATA.pop_scen&&DATA.pop_scen.rows)||[]).find(x=>x.npp===npp);
    if(p&&p.out) out.push(`${fmt(p.out)} đơn chưa giao xong bị tính quá hạn`);
  }
  if(k==='pl'){
    const c=by('cap_check','by_npp').find(x=>x.npp===npp);
    if(c&&c.fail_on_multi) out.push(`${fmt(c.fail_on_multi)}/${fmt(c.now)} chuyến quá tải nằm trên xe khai từ 2 mức tải trọng`
      +(c.best<c.now?` (nếu dùng tải lớn nhất của chính xe: còn ${fmt(c.best)})`:''));
  }
  return out;
}
/* Nửa đầu → nửa sau kỳ (khối ci_half đã tính sẵn). Mỗi nửa chỉ vài ngày: đây là TÍN HIỆU, không phải xu hướng. */
function halfTrend(npp, k){
  const H=DATA.ci_half&&DATA.ci_half[npp]; if(!H) return '';
  const a=k==='geo'?H.geo_h1:H.ot_h1, b=k==='geo'?H.geo_h2:H.ot_h2;
  if(a==null||b==null) return '';
  const d=b-a;
  return `Nửa đầu ${pct(a)} → nửa sau <b>${pct(b)}</b> <span class="ovk-tr">${d>=0?'▲':'▼'} ${num(Math.abs(d))} điểm</span>`;
}
/* Điểm mạnh so với vùng (khối rank đã tính sẵn): hạng ≤ 3 VÀ tốt hơn mức giữa vùng — tránh khen hoà hạng. */
function nppStrengths(npp){
  const R=DATA.rank&&DATA.rank[npp]; if(!R) return '';
  const fv=(k,o,v)=>k==='err'||o.unit==='%'?pct(v):(Number.isInteger(v)?fmt(v):num(v,1))+o.unit;
  const good=['geo','ot','dt','pl','err'].map(k=>({k,o:R[k]}))
    .filter(({o})=>o&&o.rank<=3&&(o.hb?o.v>o.median:o.v<o.median));
  return `<div class="ovgate-n ovstr"><b>Điểm mạnh so với vùng:</b> ${good.length
    ? good.map(({k,o})=>`${esc(o.label)} hạng ${fmt(o.rank)}/${fmt(o.of)} (${fv(k,o,o.v)} · mức giữa vùng ${fv(k,o,o.median)})`).join(' · ')
    : 'chưa có tiêu chí nào vừa nằm trong top 3 vừa cao hơn mức giữa của vùng.'}
    <a href="#logic" data-go="logic" class="ovgate-a">Cách chấm điểm →</a></div>`;
}
/* ══ v43 · DANH MỤC NPP THEO MỨC RỦI RO (admin, toàn vùng) ══
   fail = verdict tổng KHÔNG ĐẠT (có sẵn) · thin = ĐẠT nhưng đệm Geo/On time 0–5 đơn hoặc sai số 95% vắt ngang ngưỡng
   · safe = còn lại. Chỉ gom tín hiệu đã có — là cách ưu tiên, KHÔNG phải kết quả DIP. */
function nppThinKeys(x){
  const m=DATA.margin&&DATA.margin[x.npp]; if(!m) return [];
  const t=v=>v!=null&&v>=0&&v<=5, k=[];
  if(t(m.geo_margin)||m.geo_straddle) k.push('Geo');
  if(t(m.ot_margin)||m.ot_straddle) k.push('On time');
  return k;
}
function nppBucket(x){
  if(x.overall==='FAIL') return 'fail';
  return nppThinKeys(x).length ? 'thin' : 'safe';
}
function ovPortfolio(){
  const L=SB(), G={fail:[],thin:[],safe:[]}; L.forEach(x=>G[nppBucket(x)].push(x));
  const SH={geo:'Geo',ot:'On time',dt:'D&T',pl:'Payload'};
  const why=(k,x)=>k==='fail'?failKeys(x).map(c=>SH[c]).join(' · '):(k==='thin'?nppThinKeys(x).join(' · ')+' sát':'');
  const THIN=(DATA.meta.days||0)>0&&(DATA.meta.days||0)<14;
  const box=(k,title,sub)=>`<div class="ovpb ${k}">
    <div class="ovpb-h"><span class="ovpb-t">${title}</span><span class="ovpb-n">${fmt(G[k].length)}<em>/${fmt(L.length)}</em></span></div>
    <p class="ovpb-s">${sub}</p>
    <div class="ovpb-l">${G[k].map(x=>`<button type="button" class="ovpc" data-scope="${esc(x.npp)}" aria-label="Mở Tổng quan NPP ${esc(x.npp)}"><b>${esc(x.npp)}</b>${why(k,x)?`<span>${esc(why(k,x))}</span>`:''}</button>`).join('')||'<span class="ovpb-e">không có NPP nào</span>'}</div>
  </div>`;
  return `<section class="ovport" aria-label="Danh mục ${fmt(L.length)} NPP theo mức rủi ro">
    ${box('fail','Đang trượt', THIN?'không đủ điều kiện 15% DIP nếu chốt với số liệu hiện tại':'không đủ điều kiện 15% DIP')}
    ${box('thin','Đạt nhưng mong manh','đệm Geo/On time chỉ 0–5 đơn, hoặc sai số 95% vắt ngang ngưỡng')}
    ${box('safe','Đạt an toàn','đệm trên 5 đơn và sai số không vắt ngang ngưỡng')}
    <p class="ovport-n">Nhóm "mong manh" là cách gom tín hiệu đã có để ưu tiên theo dõi — <b>không phải kết quả DIP</b>. Bấm tên NPP để mở Tổng quan của NPP đó.</p>
  </section>`;
}
/* ══ v43 · MA TRẬN 9 NPP × TIÊU CHÍ (admin toàn vùng) — dời từ khối gấp "Bảng điểm theo NPP" ══
   Gọn để vừa 1 màn hình rộng: ô chỉ ghi biểu tượng + con số (nhãn ĐẠT/KHÔNG ĐẠT đọc cho trình đọc màn hình),
   Successful gộp vào cột On time vì dùng chung cờ is_ontime (verdict luôn trùng On time). */
function ovMatrix(){
  const ORD={fail:0,thin:1,safe:2}, LST=SB();
  const rows=LST.slice().sort((a,b)=>(ORD[nppBucket(a)]-ORD[nppBucket(b)])||((b.n_fail||0)-(a.n_fail||0))||(a.geo_pct-b.geo_pct));
  /* ô gọn: KHÔNG ĐẠT -> nút drill-down (giữ đúng đích như cellGo cũ); ĐẠT -> chip */
  const cell=(x,key,txt,page,type)=>{
    const v=x[key], lab=v==='PASS'?L.pass:L.fail;
    const c=`<span class="chip ${v==='PASS'?'pass':'fail'}"><span class="ic" aria-hidden="true">${v==='PASS'?'✓':'✕'}</span><span class="sr-only">${lab}: </span>${txt}</span>`;
    return v!=='FAIL' ? c : `<button type="button" class="cellbtn" data-go="${page}" data-npp="${esc(x.npp)}" data-type="${esc(type||'')}"
      aria-label="Xem chi tiết ${esc(txt)} của NPP ${esc(x.npp)}">${c}<span class="gochev" aria-hidden="true">→</span></button>`;};
  const half=(x,k)=>{const H=DATA.ci_half&&DATA.ci_half[x.npp]; if(!H) return '';
    const a=k==='geo'?H.geo_h1:H.ot_h1, b=k==='geo'?H.geo_h2:H.ot_h2; if(a==null||b==null) return '';
    return `<div class="seqn">nửa sau ${pct(b)} ${b-a>=0?'▲':'▼'}${num(Math.abs(b-a),1)}</div>`;};
  const sig=x=>{const thin=nppThinKeys(x), out=[];
    const add=(lab,k)=>{const s=nppSignals(x.npp,k); if(s.length) out.push(`<b>${lab}:</b> ${s.map(esc).join(' · ')}`);};
    if(x.v_geo==='FAIL'||thin.includes('Geo')) add('Geo','geo');
    if(x.v_ontime==='FAIL'||thin.includes('On time')) add('On time','ot');
    if(x.v_payload==='FAIL') add('Payload','pl');
    return out.length?out.map(t=>`<div>${t}</div>`).join(''):'<span class="seqn">—</span>';};
  const BL={thin:'mong manh', safe:'an toàn'};
  const MH=DATA.half_meta||{};
  return `<div class="card ovmx-c"><h2>${fmt(LST.length)} NPP × 6 tiêu chí — xếp theo mức rủi ro</h2>
   <p class="cap">Mỗi ô là kết quả của <b>chính NPP đó</b>, không phải trung bình vùng. Ô ✕ bấm được để mở chi tiết; bấm tên NPP để mở Tổng quan NPP.
   "Nửa sau" = ${esc(MH.p2||'nửa sau kỳ')} — mỗi nửa kỳ chỉ vài ngày, đọc như tín hiệu, chưa phải xu hướng.</p>
   <div class="wrap"><table class="rt ovmx"><caption class="sr-only">Kết quả 6 tiêu chí của từng NPP, xếp theo mức rủi ro</caption><thead><tr>
   <th scope="col">NPP</th><th scope="col">Data Accuracy</th><th scope="col" class="n">Đơn</th>
   <th scope="col">Geo ≥${num(T_GEO,0)}%</th><th scope="col">On time &gt;${num(T_OT,0)}% <span class="ovmx-h">= Successful</span></th>
   <th scope="col">Payload <span class="ovmx-h">chuyến quá tải</span></th><th scope="col">D&amp;T <span class="ovmx-h">chuyến hỏng</span></th><th scope="col">User name</th>
   <th scope="col">Cần kiểm trước khi làm việc với NPP</th></tr></thead><tbody>
   ${rows.map(x=>{const b=nppBucket(x); return `<tr class="bk-${b}">
     <th scope="row" data-l="NPP"><button type="button" class="ovmx-n" data-scope="${esc(x.npp)}" aria-label="Mở Tổng quan NPP ${esc(x.npp)}">${esc(x.npp)} <span aria-hidden="true">›</span></button></th>
     <td data-l="Data Accuracy">${x.overall==='PASS'
        ? `${chip('PASS')}<div class="seqn bk-t">${BL[b]}</div>`
        : chip('FAIL',`${L.fail} · ${fmt(x.n_fail)} tiêu chí`)}</td>
     <td class="n" data-l="Đơn">${fmt(x.orders)}</td>
     <td data-l="Geo">${cell(x,'v_geo',pct(x.geo_pct),'geo','')}${half(x,'geo')}</td>
     <td data-l="On time = Successful">${cell(x,'v_ontime',pct(x.ot_pct),'errors','On-time')}${half(x,'ot')}${x.v_successful!==x.v_ontime?`<div class="seqn">Successful: ${x.v_successful==='PASS'?L.pass:L.fail}</div>`:''}</td>
     <td data-l="Payload">${cell(x,'v_payload',fmt(x.payload_plans_fail),'accuracy','')}</td>
     <td data-l="Distance & Time">${cell(x,'v_dt',fmt(x.dt_routes_fail),'accuracy','')}</td>
     <td data-l="User name">${cell(x,'v_username',pct(x.username_pct),'accuracy','')}</td>
     <td data-l="Cần kiểm" class="ovmx-s">${sig(x)}</td></tr>`;}).join('')}
   </tbody></table></div></div>`;
}
/* Đếm số NPP có verdict FAIL theo từng tiêu chí, xếp nhiều nhất trước.
   Chỉ đọc verdict đã có trong scorecard — KHÔNG tính lại KPI. Bỏ Successful: dùng chung cờ is_ontime với On time. */
const RANK_KPI=[['v_geo','Geo Compliance'],['v_ontime','On time'],['v_dt','Distance & Time'],['v_payload','Payload'],['v_username','User name']];
function nppFailRank(list){
  return RANK_KPI.map(([f,n])=>({f,n,c:list.filter(x=>x[f]==='FAIL').length}))
    .filter(o=>o.c>0).sort((a,b)=>b.c-a.c);
}
function failKeys(x){ return [ x.v_geo==='FAIL'&&'geo', x.v_ontime==='FAIL'&&'ot',
  x.v_dt==='FAIL'&&'dt', x.v_payload==='FAIL'&&'pl' ].filter(Boolean); }

function recCards(UL,US,x){
  const withErr=UL.filter(u=>u.err>0);
  if(!withErr.length) return '';
  const fails = x ? failKeys(x) : [];
  const isPass = x && x.overall==='PASS';
  const groups=['geo','ot','dt','pl'].map(k=>{
    const mem=withErr.filter(u=>u[k]>0).map(u=>({u,n:u[k]})).sort((a,b)=>b.n-a.n);
    return {k, mem, total:mem.reduce((s,m)=>s+m.n,0), urgent:fails.includes(k)};
  }).filter(g=>g.mem.length).sort((a,b)=>(b.urgent-a.urgent)||(b.total-a.total));

  const head = isPass
    ? `<div class="card"><h2>Điểm còn cải thiện được</h2>
       <p class="cap">NPP đang <b>ĐẠT cả 6 tiêu chí</b> — phần này không phải để nhắc nhở, mà để giữ khoảng cách an toàn với ngưỡng trong các kỳ sau.</p>`
    : `<div class="card"><h2>Việc cần làm, theo thứ tự ưu tiên</h2>
       <p class="cap">Gộp theo nguyên nhân, xử lý một lần cho nhiều tài khoản.
       ${fails.length?`NPP đang trượt: <b>${fails.map(k=>KPI_LABEL[k]).join(' · ')}</b> — nhóm đầu bảng dưới đây là việc phải làm trước.`:''}</p>`;

  const card=(g,i)=>{
    const C=typeof CAUSE[g.k]==='function' ? CAUSE[g.k](x) : CAUSE[g.k];
    const pri = isPass ? 'Theo dõi' : (g.urgent ? 'Phải xử lý' : 'Nên cải thiện');
    const cls = isPass ? 'lo' : (g.urgent ? 'hi' : 'md');
    const chipc = isPass ? 'pass' : (g.urgent ? 'fail' : 'gap');
    const top = g.mem.slice(0,6);
    return `<article class="rec pri-${cls}">
      <header class="rec-h"><span class="rank">${i+1}</span><span class="rec-u">${esc(C.t)}</span>
        <span class="hspace"></span>
        <span class="chip ${chipc}"><span class="ic">${g.urgent&&!isPass?'!':'•'}</span>${pri}</span></header>
      <p class="rec-n"><b style="color:var(--crit)">${fmt(g.total)} đơn</b> ở <b>${fmt(g.mem.length)} tài khoản</b>${g.urgent&&!isPass?' · <b>đây là tiêu chí đang làm NPP trượt DIP</b>':''}</p>
      <p class="rec-c"><b>Nguyên nhân nghi ngờ:</b> ${C.why}</p>
      <p class="rec-c" style="margin-top:9px"><b>Tài khoản cần làm việc:</b>
        ${top.map(m=>`<span class="uchip">${esc(m.u.username)}<b>${fmt(m.n)}</b></span>`).join('')}
        ${g.mem.length>6?`<span class="uchip">+${g.mem.length-6} tài khoản khác</span>`:''}</p>
      <ol class="rec-a">${C.acts.map(a=>`<li><span class="own">${esc(a[0])}</span>${a[1]}</li>`).join('')}</ol>
    </article>`;};
  const must = groups.filter(g=>g.urgent&&!isPass), rest = groups.filter(g=>!(g.urgent&&!isPass));
  /* Không có tiêu chí FAIL (view toàn vùng, hoặc NPP đã ĐẠT) thì mở sẵn 2 nhóm:
     lấp đủ 2 cột của lưới thay vì bỏ trống một nửa, và cho người đọc thấy 2 ưu tiên. */
  const shownFirst = must.length ? must : groups.slice(0,2);
  const hidden = must.length ? rest : groups.slice(2);
  return head + `<div class="recs">` + shownFirst.map((g,i)=>card(g,i)).join('') + `</div>`
    + (hidden.length ? `<details class="dtbl"><summary>Xem thêm ${fmt(hidden.length)} nhóm "${isPass?'theo dõi':'nên cải thiện'}" (${fmt(hidden.reduce((a,b)=>a+b.total,0))} đơn)</summary>
       <div class="recs" style="margin-top:12px">${hidden.map((g,i)=>card(g,i+shownFirst.length)).join('')}</div></details>` : '')
    + `<p class="cap" style="margin-top:14px;margin-bottom:0"><b>Cách dùng:</b> mỗi tuần lấy một nhóm ra họp đầu ca, giao đích danh người xử lý. Tuần sau mở lại báo cáo và đối chiếu số đơn lỗi của đúng nhóm đó.</p></div>`;
}

function userSection(){
  let h='';
  const key = (cur==='ALL'&&isAdmin()) ? 'ALL' : cur;
  const UL = DATA.users[key] || [];
  const US = DATA.user_sum[key] || {users:0,users_err:0,err_total:0,top3_share:0,top3:[]};
  const X  = (key==='ALL') ? null : SC[key];
  const withErr = UL.filter(u=>u.err>0);
  const maxErr = Math.max(1,...withErr.map(u=>u.err));
  const worstRate = withErr.filter(u=>u.orders>=T_SMALL).sort((a,b)=>b.err_pct-a.err_pct)[0];
  const chartTop = withErr.slice(0,10);
  const showNpp = key==='ALL';

  /* Lỗi dồn vào vài tài khoản hay trải rộng? Đây là câu quyết định cách xử lý:
     dồn -> làm việc trực tiếp với từng người; trải rộng -> phải sửa quy trình.
     Ngưỡng 50% lấy đúng từ câu diễn giải đã có sẵn trong khối "Đọc nhanh". */
  const conc = US.top3_share>=50;
  h+=`<div class="ownlead ${conc?'conc':'wide'}">
    <span class="ol-ic" aria-hidden="true">${conc?'◉':'⁘'}</span>
    <span class="ol-x">
      <span class="ol-h">${conc
        ? `Lỗi dồn vào vài tài khoản — xử lý xong 3 tài khoản đầu là giải quyết <b>${num(US.top3_share,1)}%</b> số đơn lỗi.`
        : `Lỗi trải rộng, không dồn vào vài người — 3 tài khoản đầu chỉ chiếm <b>${num(US.top3_share,1)}%</b> số đơn lỗi.`}</span>
      <span class="ol-s"><b>${fmt(US.users_err)}/${fmt(US.users)}</b> tài khoản có ít nhất một đơn lỗi${US.top3.length?' · đầu bảng: <b>'+US.top3.map(esc).join('</b>, <b>')+'</b>':''}. ${conc
        ? 'Làm việc trực tiếp với từng tài khoản là cách nhanh nhất.'
        : 'Nhắc riêng từng người sẽ không đủ — phải chuẩn hoá lại quy trình xác nhận giao hàng cho cả đội.'}</span>
    </span>
  </div>
  <div class="ownwarn">
    <span class="ow-ic" aria-hidden="true">!</span>
    <span><b>Khoan quy trách nhiệm:</b> đây là <b>tài khoản đăng nhập</b>, không chắc chỉ một người dùng.
      Tài khoản đặt theo <b>biển số xe</b> có thể nhiều tài xế dùng chung. Tài khoản <b>DSA</b> là của kho, không phải tài xế.
      Xem lại bảng phân công rồi hãy làm việc với ai.</span>
  </div>`;
  h+=`<div class="card"><h2>Thống kê lỗi theo tài khoản</h2>
    <p class="cap">Gom đơn lỗi theo tài khoản đã bấm giao hàng, để biết cần gặp ai. Mỗi dòng là một tài khoản.</p>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="tile"><div class="lbl">Tài khoản có lỗi</div><div class="val">${fmt(US.users_err)}<span style="font-size:20px;color:var(--muted)">/${fmt(US.users)}</span></div><div class="note">${US.users-US.users_err} tài khoản không có đơn lỗi nào</div></div>
      ${worstRate?`<div class="tile"><div class="lbl">Tỷ lệ lỗi cao nhất</div><div class="val">${pct(worstRate.err_pct)}</div><div class="note">${esc(worstRate.username)} — ${fmt(worstRate.err)}/${fmt(worstRate.orders)} đơn (chỉ xét tài khoản từ ${fmt(T_SMALL)} đơn trở lên)</div></div>`:''}
      <div class="tile"><div class="lbl">Tổng đơn lỗi</div><div class="val">${fmt(US.err_total)}</div><div class="note">trong phạm vi đang xem</div></div>
    </div>`;

  const SEG=[{k:'geo',n:'Không đạt Geo',c:'var(--s1)'},{k:'ot',n:'Quá hạn cam kết',c:'var(--s2)'},
             {k:'dt',n:'Distance & Time',c:'var(--s3)'},{k:'pl',n:'Xe quá tải',c:'var(--s4)'}];
  if(chartTop.length){
    const rowsC=chartTop.map(u=>({k:(showNpp?u.TenantName+' · ':'')+u.username,
      geo:u.geo,ot:u.ot,dt:u.dt,pl:u.pl,total:u.geo+u.ot+u.dt+u.pl,
      sub:num(u.err_pct,0)+'% đơn lỗi', u}))
      .sort((a,b)=>b.total-a.total);  /* thanh phải giảm dần theo đúng con số vẽ ở cuối thanh */
    const sums=SEG.map(g=>({...g,v:rowsC.reduce((a,b)=>a+b[g.k],0)})).filter(g=>g.v>0);
    h+=`<div class="card"><h2>${chartTop.length} tài khoản nhiều lỗi nhất — tách theo từng loại lỗi</h2>
    <p class="cap">Mỗi màu là một loại lỗi. Số ở cuối thanh là <b>tổng lượt lỗi</b> và <b>tỷ lệ đơn lỗi</b> của tài khoản đó.
    Thanh dài chưa chắc đã tệ nhất — người chạy nhiều đơn thì lỗi nhiều là bình thường, phải xem tỷ lệ.
    <b>Bấm tên tài khoản</b> để xem đơn lỗi.</p>
    <div class="legend">${SEG.map(g=>`<span><i style="background:${g.c}"></i>${esc(g.n)}</span>`).join('')}</div>
    ${stackbar(rowsC,{keys:SEG,w:860,label:'đơn',
      a11y:'Số đơn lỗi theo loại của từng tài khoản: '+rowsC.map(r=>`${r.k} có ${SEG.filter(g=>r[g.k]>0).map(g=>g.n+' '+r[g.k]).join(', ')}`).join('; '),
      rowGo:r=>({go:'errors',user:r.u.username,npp:showNpp?r.u.TenantName:''})})}
    <p class="cap" style="margin:10px 0 0">Một đơn dính hai tiêu chí được đếm ở cả hai đoạn, nên tổng lượt lỗi lớn hơn số đơn lỗi.
      ${sums.length?`Cả nhóm: ${sums.map(g=>`<b>${esc(g.n)} ${fmt(g.v)}</b>`).join(' · ')}.`:''}</p>
    ${tableOf(['Tài khoản','Không đạt Geo','Quá hạn','Chuyến lỗi Distance & Time','Xe quá tải','Đơn lỗi','Tỷ lệ lỗi'],
      rowsC.map(r=>[r.k,fmt(r.geo),fmt(r.ot),fmt(r.dt),fmt(r.pl),fmt(r.u.err),pct(r.u.err_pct)]),
      'Số đơn lỗi theo loại của từng tài khoản')}
    </div>`;}

  h+=`<div class="card"><h2>Bảng chi tiết theo tài khoản</h2>
    <p class="cap">Xếp theo số đơn lỗi giảm dần. Tài khoản chạy <b>dưới ${fmt(T_SMALL)} đơn</b> được đánh dấu "cỡ mẫu nhỏ" — vài chục đơn thì một hai lỗi đã đẩy tỷ lệ lên rất cao, không nên đem so trực tiếp với tài khoản chạy hàng trăm đơn.</p>
    <details class="dtbl"><summary>Ba cột lỗi này khác nhau chỗ nào?</summary>
      <ul class="tight" style="margin-bottom:6px">
      <li><b>Đơn không đạt Geo</b> — đếm theo <b>đơn</b>. Đơn phạm bất kỳ điều kiện nào trong <b>3 điều kiện</b> của Geo (vị trí · outlet→outlet · giờ làm việc — chi tiết ở tab <b>Cách chấm điểm</b>).</li>
      <li><b>Chuyến lỗi Distance & Time</b> — đếm theo <b>chuyến</b>. Outlet lỗi khi cách outlet liền trước dưới ${fmt(TH.dt_gap_min??2)} phút; chuyến hỏng khi tỷ lệ outlet lỗi vượt ${fmt(T_DTR_ROUTE_PCT)}% tổng outlet của chính chuyến đó. Dòng nhỏ bên dưới là số outlet lỗi.</li>
      </ul></details>
    <details class="dtbl"><summary>Xem bảng đầy đủ ${fmt(UL.length)} tài khoản</summary>
    <div class="scroll"><table class="rt"><caption class="sr-only">Thống kê lỗi theo tài khoản</caption>
    <thead><tr>${showNpp?'<th scope="col">NPP</th>':''}<th scope="col">Tài khoản</th><th scope="col">Loại</th><th scope="col" class="n">Đơn</th><th scope="col" class="n">Chuyến</th>
      <th scope="col" class="n">Đơn lỗi</th><th scope="col" class="n">Đơn không đạt Geo</th><th scope="col" class="n">Quá hạn</th>
      <th scope="col" class="n">Chuyến lỗi Distance &amp; Time</th><th scope="col" class="n">Xe quá tải</th></tr></thead><tbody>
    ${UL.map((u,i)=>`<tr class="${i<5&&u.err>0?'hot':''}">
      ${showNpp?`<td data-l="NPP"><b>${esc(u.TenantName)}</b></td>`:''}
      <th scope="row" data-l="Tài khoản"><span class="rank">${i+1}</span>${u.err>0
        ?`<button type="button" class="cellbtn" data-go="errors" data-user="${esc(u.username)}"${showNpp?` data-npp="${esc(u.TenantName)}"`:''}
           aria-label="Xem các đơn lỗi của ${esc(u.username)}">${esc(u.username)}<span class="gochev">→</span></button>`
        :esc(u.username)}</th>
      <td data-l="Loại"><span class="utag">${esc(u.utype)}</span></td>
      <td class="n" data-l="Đơn">${fmt(u.orders)}</td>
      <td class="n" data-l="Chuyến">${fmt(u.plans)}</td>
      <td class="n" data-l="Đơn lỗi"><span class="ubar"><span class="track"><i style="width:${Math.round(u.err/maxErr*100)}%"></i></span><b>${fmt(u.err)} · ${pct(u.err_pct)}</b></span>${u.orders<T_SMALL?`<div class="seqn" style="color:var(--warn-ink)">cỡ mẫu nhỏ (${fmt(u.orders)} đơn)</div>`:''}</td>
      <td class="n" data-l="Đơn không đạt Geo">${u.geo?fmt(u.geo):'—'}</td>
      <td class="n" data-l="Quá hạn">${u.ot?fmt(u.ot):'—'}</td>
      <td class="n" data-l="Chuyến lỗi Distance & Time">${u.dt_plans?`${fmt(u.dt_plans)}<div class="seqn">${fmt(u.dt)} outlet lỗi</div>`:'—'}</td>
      <td class="n" data-l="Xe quá tải">${u.pl?fmt(u.pl):'—'}</td></tr>`).join('')}
    </tbody></table></div></details></div>`;

  /* Diễn giải — đếm ĐÚNG theo từng tiêu chí, không cộng dồn theo "lỗi chính" */
  if(withErr.length){
    const S={geo:0,ot:0,dt:0,pl:0}; withErr.forEach(u=>{S.geo+=u.geo;S.ot+=u.ot;S.dt+=u.dt;S.pl+=u.pl;});
    const sorted=Object.entries(S).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]);
    const gapUsers=withErr.filter(u=>u.dt>=10).sort((a,b)=>b.dt-a.dt);
    const clean=UL.filter(u=>u.err===0&&u.orders>=T_SMALL&&u.utype!=='DSA');
    h+=`<div class="card"><details class="dtbl" style="margin:0;border:0;padding:0"><summary style="font-size:16px;font-weight:700;color:var(--ink)">Đọc nhanh bảng trên — 4 nhận xét rút từ số liệu</summary>
      <ul class="tight" style="margin-top:10px">
      <li><b>Số đơn lỗi theo từng tiêu chí:</b> ${sorted.map(([k,v])=>`${KPI_LABEL[k]} <b>${fmt(v)}</b>`).join(' · ')}.</li>
      ${gapUsers.length?`<li><b>Dấu hiệu bấm dồn:</b> ${gapUsers.slice(0,4).map(u=>`${esc(u.username)} (${fmt(u.dt)} outlet)`).join(' · ')} có nhiều outlet xác nhận cách nhau dưới ${fmt(TH.dt_gap_min??2)} phút. Cần xác minh là bấm dồn cuối ca hay máy mất mạng gửi dồn.</li>`:''}
      ${clean.length?`<li><b>Làm tốt (nên ghi nhận):</b> ${clean.slice(0,6).map(u=>`${esc(u.username)} (${fmt(u.orders)} đơn)`).join(' · ')}${clean.length>6?` và ${clean.length-6} tài khoản khác`:''} — không có đơn nào lỗi dù chạy từ ${fmt(T_SMALL)} đơn trở lên.</li>`:''}
    </ul></details></div>`;
  }
  h+=recCards(UL,US,X);
  return h;
}

/* ===================== TÓM TẮT ĐIỀU HÀNH =====================
   Đặt NGAY ĐẦU trang Tổng quan, trước cả dãy thẻ số: đây là khối duy nhất trả lời
   "chuyện gì đang xảy ra và tôi phải làm gì". Thẻ số là bằng chứng, không phải mở bài. */
function execSummary(r,all){
  const T=DATA.meta.period, DAYS=DATA.meta.days||0, THIN=DAYS>0&&DAYS<14;
  if(all&&isAdmin()){
    const sc=DATA.scorecard, pass=sc.filter(x=>x.overall==='PASS'), fail=sc.filter(x=>x.overall==='FAIL');
    const RK=nppFailRank(sc);
    const M=DATA.sens_meta||{stable:[],unstable:[]}, C=DATA.cap_check, P=DATA.pop_scen;
    /* CTA điều hành phải có đủ: AI (một đầu mối có thật) · LÀM GÌ · HẠN · HỆ QUẢ NẾU QUÁ HẠN.
       Trước đây chỉ ghi "Stakeholder — chốt ngưỡng", không hạn, không hệ quả. */
    const acts=[
      M.unstable.length?{o:L.owner, due:'hạn 05/09',
        t:`Ký xác nhận ngưỡng đo vị trí: ${fmt(T_RAD)}m hay 200m`,
        w:`${M.unstable.join(', ')} đạt hay trượt phụ thuộc hoàn toàn vào chữ ký này, không phụ thuộc cách họ giao hàng.`,
        i:`Chưa có chữ ký thì kết quả của ${M.unstable.join(', ')} không công bố.`}:null,
      (C&&C.fail_on_multi>0)?{o:'IT / TMS', due:'hạn 12/09',
        t:`Chuẩn hoá tải trọng xe: mỗi biển số đúng một con số, lấy theo đăng kiểm`,
        w:`${fmt(C.trucks_multi)}/${fmt(C.trucks)} xe đang được khai từ 2 mức tải trọng trở lên. <b>${fmt(C.fail_on_multi)}/${fmt(C.fail_plans)} chuyến quá tải</b> nằm trong nhóm đó; sửa xong còn <b>${fmt(C.fail_best)} chuyến</b>.`,
        i:`Chưa chuẩn hoá thì Payload đang đo lỗi khai báo, không đo hành vi xếp hàng.`}:null,
      (P&&P.n_out>0)?{o:L.owner, due:'hạn 05/09',
        t:`Chốt ${L.scope}: ${fmt(P.n_out)} đơn chưa giao xong có nằm trong mẫu số không`,
        w:`Cả ${fmt(P.n_out)} đơn đang bị đánh trượt On-time và ${fmt(P.geo_fail_in_out)} đơn bị tính thêm lỗi Geo — tức NPP đang bị trừ điểm cho đơn <b>chưa giao xong</b>.`,
        i:P.flips_geo.length?`Nếu loại ra, <b>${P.flips_geo.join(', ')}</b> đổi kết quả Geo sang ĐẠT.`
          :`Chưa chốt thì ${fmt(P.n_out)} đơn chưa giao xong vẫn bị tính là lỗi vận hành của NPP.`}:null,
    ].filter(Boolean);
    if(THIN) acts.unshift({o:L.owner, due:'trước khi công bố',
      t:`Xác nhận quy tắc Distance &amp; Time cho nguồn mới`,
      w:`Nguồn mới không còn cột chấm sẵn nên báo cáo tự tính: outlet lỗi khi thời gian outlet→outlet &lt;${fmt(TH.dt_gap_min??2)} phút; chuyến hỏng khi tỷ lệ outlet lỗi vượt ${fmt(T_DTR_ROUTE_PCT)}%.`,
      i:'Phần chênh cần chốt trước khi dùng cho DIP.'});
    if(!acts.length) acts.push({o:'Zone 4', due:'', t:'Chờ đủ kỳ dữ liệu rồi chạy lại báo cáo',
      w:'Kỳ này không phát sinh vấn đề nào cần xử lý ngay.', i:''});
    return `<div class="card exsum"><h2>Tóm tắt điều hành</h2>
      <p class="exlead">Kỳ <b>${esc(T)}</b> · <b>${pass.length}/${sc.length} NPP ĐẠT</b> (${pass.map(x=>esc(x.npp)).join(', ')||'—'}) —
      <b style="color:var(--crit)">${fail.length} NPP mất trọn 15% DIP</b>. ${RK.length?`Tiêu chí làm nhiều NPP trượt nhất: ${RK.map(o=>`<b>${esc(o.n)}</b> (${fmt(o.c)} NPP)`).join(' · ')}.`:'Không tiêu chí nào đang làm NPP trượt.'}
      ${THIN
        ? `Kỳ dữ liệu chỉ <b>${fmt(DAYS)} ngày</b> nên <b>chưa công bố được kết quả nào</b>. Việc cần làm bây giờ là <b>chốt quy tắc và kiểm chứng cách tính</b>, không phải chấm điểm NPP.`
        : (M.stable.length?`Kết quả của <b>${M.stable.length}/${sc.length} NPP giữ nguyên</b> qua mọi kịch bản chốt quy tắc nên <b>công bố được ngay</b>${M.unstable.length?`; riêng <b>${M.unstable.join(', ')}</b> phải chờ chốt quy tắc.`:'.'}`:'')}</p>
      <ol class="exacts">${acts.map(a=>`<li>${a.due?`<span class="due">${esc(a.due)}</span>`:''}<span class="own">${esc(a.o)}</span><b>${a.t}</b>
        <div class="exw">${a.w}</div>${a.i?`<div class="exif"><b>Nếu chưa xong:</b> ${a.i}</div>`:''}</li>`).join('')}</ol>
      <p class="cap" style="margin:2px 0 0">Chi tiết từng con số ở các phần bên dưới và ở tab <b>Chất lượng dữ liệu</b>.</p></div>`;
  }
  /* --- bản của một NPP: phán quyết và ĐỘ VỮNG của phán quyết nằm chung một câu --- */
  const G=gapToPass(r), F=failKeys(r), m=DATA.margin?DATA.margin[cur]:null;
  const acts=G.slice().sort((a,b)=>a.n-b.n).slice(0,3).map(g=>{
    const C=typeof CAUSE[g.k]==='function'?CAUSE[g.k](r):CAUSE[g.k];
    return {o:C.acts[0][0], t:g.txt, w:C.acts[0][1], k:g.k};
  });
  const soft=[];
  if(THIN) soft.push(`Kỳ mới có <b>${fmt(DAYS)}/31 ngày</b>.`);
  if(m&&(m.geo_straddle||m.ot_straddle))
    soft.push(`${[m.geo_straddle?'Geo':'',m.ot_straddle?'On-time':''].filter(Boolean).join(' và ')} đang sát ngưỡng: kỳ này còn ít đơn nên <b>chưa khẳng định được là đạt hay không đạt</b>.`);
  if(DATA.sens_meta && DATA.sens_meta.unstable.includes(cur))
    soft.push(`Kết quả còn phụ thuộc <b>3 quy tắc chưa chốt bằng văn bản</b>.`);
  const marginTxt=(v,unit)=>v===0?`<b>vừa đúng ngưỡng, không dư ${unit} nào</b>`
    :(v>0?`chỉ dư <b>${fmt(v)} ${unit}</b>`:`đang thiếu <b>${fmt(-v)} ${unit}</b>`);
  const near=[];
  if(m){ if(r.v_geo==='PASS'&&m.geo_straddle) near.push(`Geo đang ĐẠT nhưng <b>sát ngưỡng</b> — ${marginTxt(m.geo_margin,'đơn')}.`);
         if(r.v_ontime==='PASS'&&m.ot_straddle) near.push(`On-time đang ĐẠT nhưng <b>sát ngưỡng</b> — ${marginTxt(m.ot_margin,'đơn')}.`); }
  return `<div class="card exsum"><h2>Tóm tắt điều hành — NPP ${esc(cur)}</h2>
    <p class="exlead">Kỳ <b>${esc(T)}</b> · ${fmt(r.orders)} đơn · ${fmt(r.plans)} chuyến.
    Kết quả Data Accuracy: <b style="color:var(--${r.overall==='PASS'?'good':'crit'})">${r.overall==='PASS'?'ĐẠT — đủ điều kiện nhận 15% DIP':'KHÔNG ĐẠT — mất trọn 15% DIP'}</b>${
      r.overall==='FAIL'?`, trượt ${F.length} tiêu chí: <b>${F.map(k=>KPI_LABEL[k]).join(' · ')}</b>.`:'.'}
    ${G.length?` Khoảng cách tới ngưỡng: <b>${G.map(g=>fmt(g.n)+(g.k==='dt'||g.k==='pl'?' chuyến':' đơn')).join(' · ')}</b>.`:''}
    ${near.join(' ')}</p>
    ${soft.length?`<p class="exif" style="margin:0 0 12px">${soft.join(' ')} Nên mở tab <b>Đơn hàng có lỗi</b>, rà lại đúng số đơn còn thiếu, xem có đơn nào bị tính oan không.</p>`:''}
    ${acts.length?`<ol class="exacts">${acts.map(a=>`<li><span class="own">${esc(a.o)}</span><b>${a.t}</b><div class="exw">${a.w}</div></li>`).join('')}</ol>`
      :`<p class="exw" style="margin:0">Không có tiêu chí nào đang trượt. Việc cần làm là <b>giữ khoảng cách an toàn với ngưỡng</b> — xem phần "Điểm còn cải thiện được" ở cuối trang.</p>`}
    <p class="cap" style="margin:2px 0 0">Chi tiết từng đơn lỗi ở tab <b>Đơn hàng có lỗi</b>; cách chấm điểm ở tab <b>Cách chấm điểm</b>.</p></div>`;
}

/* ===================== XẾP HẠNG ẨN DANH ===================== */
function rankCard(){
  if(isAdmin()) return '';
  const R=DATA.rank&&DATA.rank[role]; if(!R) return '';
  const KEYS=['geo','ot','dt','pl','err'];
  const fv=(k,o)=>k==='err'?pct(o.v):(o.unit==='%'?pct(o.v):fmt(o.v)+o.unit);
  const fm=(k,o)=>k==='err'?pct(o.median):(o.unit==='%'?pct(o.median):num(o.median,1)+o.unit);
  const fb=(k,o)=>k==='err'?pct(o.best):(o.unit==='%'?pct(o.best):fmt(o.best)+o.unit);
  const good=KEYS.filter(k=>R[k].rank<=3).length;
  return `<div class="card"><h2>NPP ${esc(role)} đang đứng đâu so với mặt bằng vùng</h2>
   <p class="cap">Bảng này <b>không nêu tên NPP nào khác</b>. Chỉ cho biết NPP bạn đứng thứ mấy,
   <b>mức giữa</b> của ${R.geo.of} NPP là bao nhiêu, và <b>NPP tốt nhất</b> đạt bao nhiêu.
   Xem để biết chỗ cần sửa là việc riêng của mình hay cả vùng đều vướng — hai trường hợp xử lý khác hẳn nhau.<br>
   <b>Đây là thứ hạng, KHÔNG phải kết quả ĐẠT/KHÔNG ĐẠT.</b> Hạng thấp vẫn có thể đang đạt ngưỡng.</p>
   <div class="wrap"><table class="rt"><caption class="sr-only">Xếp hạng ẩn danh so với mặt bằng vùng</caption>
   <thead><tr><th scope="col">Tiêu chí</th><th scope="col" class="n">NPP ${esc(role)}</th><th scope="col">Thứ hạng</th>
     <th scope="col" class="n">Trung vị vùng</th><th scope="col" class="n">Tốt nhất vùng</th><th scope="col">Đọc là</th></tr></thead><tbody>
   ${KEYS.map(k=>{const o=R[k]; const top=o.rank<=3;
     const better=o.hb ? o.v>=o.median : o.v<=o.median;
     /* Chỉ dùng xanh / trung tính: đây là XẾP HẠNG, KHÔNG phải kết quả ĐẠT/KHÔNG ĐẠT. */
     return `<tr><th scope="row" data-l="Tiêu chí">${esc(o.label)}</th>
       <td class="n" data-l="NPP ${esc(role)}"><b>${fv(k,o)}</b></td>
       <td data-l="Thứ hạng"><span class="chip ${top?'pass':'gap'}"><span class="ic">${top?'✓':'•'}</span>hạng ${fmt(o.rank)}/${fmt(o.of)}</span></td>
       <td class="n" data-l="Trung vị vùng">${fm(k,o)}</td>
       <td class="n" data-l="Tốt nhất vùng">${fb(k,o)}</td>
       <td data-l="Đọc là">${better?'<b style="color:var(--good)">tốt hơn</b> mức giữa của vùng':'<b style="color:var(--warn-ink)">kém hơn</b> mức giữa của vùng'}</td></tr>`;}).join('')}
   </tbody></table></div>
   <p class="cap" style="margin:12px 0 0;border-left:3px solid ${good>=3?'var(--good)':'var(--warn)'};padding-left:11px">
   <b>Cách dùng:</b> tiêu chí nào NPP bạn <b>thấp hơn mức giữa của vùng</b> thì đó là việc trong nhà —
   chỉnh lại điều phối và nhắc lại đội xe là được. Tiêu chí nào <b>cả vùng đều thấp</b> thì nhiều khả năng
   do <b>cách đo hoặc do dữ liệu gốc</b> — nên báo HEINEKEN, đừng ép tài xế.
   ${good?`NPP ${esc(role)} đang nằm <b>top 3 vùng</b> ở ${fmt(good)}/${fmt(KEYS.length)} tiêu chí — phần này nên giữ.`:''}</p></div>`;
}

/* ===================== BIÊN AN TOÀN SO VỚI NGƯỠNG ===================== */
function marginBadge(m,straddle){
  if(straddle) return `<span class="chip gap"><span class="ic">◐</span>sát ngưỡng</span>`;
  if(m>=0) return `<span class="chip pass"><span class="ic">✓</span>dư ${fmt(m)}</span>`;
  return `<span class="chip fail"><span class="ic">✕</span>thiếu ${fmt(-m)}</span>`;
}
function marginCard(){
  const list=SB().map(x=>({x, m:DATA.margin[x.npp]})).filter(o=>o.m);
  if(!list.length) return '';
  const one=list.length===1;
  /* Một NPP: biên + khoảng tin cậy đã ghép thẳng vào thẻ KPI ở trên (mỗi tiêu chí chỉ nói ở MỘT chỗ). */
  if(one){
    const {x,m}=list[0];
    const strad=[m.geo_straddle?'Geo':'', m.ot_straddle?'On-time':''].filter(Boolean);
    if(!strad.length) return '';
    return `<div class="card"><h2>Kết quả đang nằm trong vùng sai số</h2>
      <p class="cap" style="margin:0">${strad.join(' và ')} của NPP ${esc(x.npp)} có khoảng sai số thống kê <b>vắt ngang ngưỡng</b>
      (${m.geo_straddle?`Geo ${pct(m.geo_ci[0])} – ${pct(m.geo_ci[1])} quanh ngưỡng ${num(T_GEO,0)}%`:''}${m.geo_straddle&&m.ot_straddle?'; ':''}${m.ot_straddle?`On-time ${pct(m.ot_ci[0])} – ${pct(m.ot_ci[1])} quanh ngưỡng ${num(T_OT,0)}%`:''})
      — nghĩa là trên cỡ mẫu kỳ này <b>chưa phân biệt được</b> NPP này với ngưỡng, kết quả phụ thuộc vài đơn.
      Việc nên làm: mở tab <b>Đơn hàng có lỗi</b>, rà đúng số đơn còn thiếu ghi ở thẻ KPI phía trên, xem có đơn nào bị tính oan không
      (đơn chưa giao xong, đơn thiếu giờ giao, toạ độ điểm bán sai).</p></div>`;
  }
  let h=`<div class="card"><h2>Biên an toàn so với ngưỡng — còn thiếu (hoặc dư) bao nhiêu ĐƠN</h2>
   <p class="cap">Quy phần trăm thẳng ra <b>số đơn</b>.
   Cột <b>Sai số 95%</b> là khoảng dao động của tỷ lệ trên cỡ mẫu hiện có: nếu khoảng này
   <b>vắt ngang ngưỡng</b> thì <b>chưa phân biệt được</b> NPP đó với ngưỡng — kết luận khi đó phụ thuộc vài đơn,
   không phụ thuộc năng lực thật.</p>
   <div class="wrap"><table class="rt"><caption class="sr-only">Biên an toàn so với ngưỡng theo NPP</caption>
   <thead><tr><th scope="col">NPP</th><th scope="col" class="n">Geo ${num(T_GEO,0)}%</th><th scope="col" class="n">Đạt / mẫu</th>
     <th scope="col">Biên Geo (đơn)</th><th scope="col" class="n">Sai số 95% Geo</th>
     <th scope="col" class="n">On-time ${num(T_OT,0)}%</th><th scope="col">Biên On-time (đơn)</th>
     <th scope="col">Distance &amp; Time (chuyến)</th><th scope="col">Quá tải (chuyến)</th></tr></thead><tbody>`;
  list.forEach(({x,m})=>{
    const hot=(x.v_geo==='FAIL'&&m.geo_straddle)||(x.v_ontime==='FAIL'&&m.ot_straddle);
    h+=`<tr class="${hot?'hot':''}"><th scope="row" data-l="NPP"><b>${esc(x.npp)}</b></th>
      <td class="n" data-l="Geo">${pct(x.geo_pct)}</td>
      <td class="n" data-l="Đạt / mẫu">${fmt(m.geo_ok)} / ${fmt(m.geo_n)}<div class="seqn">cần ${fmt(m.geo_need)}</div></td>
      <td data-l="Biên Geo">${marginBadge(m.geo_margin,m.geo_straddle)}${m.geo_straddle?`<div class="seqn">thực tế ${m.geo_margin>=0?'dư':'thiếu'} ${fmt(Math.abs(m.geo_margin))} đơn</div>`:''}</td>
      <td class="n" data-l="Sai số 95% Geo">${m.geo_ci[0]==null?'–':pct(m.geo_ci[0])+' – '+pct(m.geo_ci[1])}</td>
      <td class="n" data-l="On-time">${pct(x.ot_pct)}</td>
      <td data-l="Biên On-time">${marginBadge(m.ot_margin,m.ot_straddle)}</td>
      <td data-l="Distance & Time">${m.dt_margin>=0?`<span class="chip pass"><span class="ic">✓</span>còn ${num(m.dt_margin,2)} điểm %</span>`:`<span class="chip fail"><span class="ic">✕</span>vượt ${num(-m.dt_margin,2)} điểm %</span>`}</td>
      <td data-l="Quá tải">${m.pl_margin===0?`<span class="chip pass"><span class="ic">✓</span>0 quá tải</span>`:`<span class="chip fail"><span class="ic">✕</span>${fmt(-m.pl_margin)} quá tải</span>`}</td></tr>`;
  });
  h+=`</tbody></table></div>`;
  const strad=list.filter(o=>o.m.geo_straddle).map(o=>o.x.npp);
  const near=list.filter(o=>o.m.geo_margin<0&&o.m.geo_margin>=-10).map(o=>`${o.x.npp} (thiếu ${fmt(-o.m.geo_margin)} đơn)`);
  h+=`<p class="cap" style="margin:12px 0 0;border-left:3px solid var(--warn);padding-left:11px">
    <b>Cách đọc:</b> ${strad.length?`sai số của <b>${strad.join(', ')}</b> vắt ngang ngưỡng Geo ${num(T_GEO,0)}% —
      kết luận của các NPP này <b>chưa vững về mặt thống kê</b> trên cỡ mẫu kỳ này.`
      :`không NPP nào có sai số vắt ngang ngưỡng Geo — các kết luận đều vững trên cỡ mẫu hiện có.`}
    ${near.length?` Riêng ${near.join(' · ')} chỉ cách ngưỡng <b>dưới 10 đơn</b> — nên rà đúng số đơn đó xem có đơn nào bị tính oan (đơn chưa giao xong, đơn thiếu giờ giao, toạ độ điểm bán sai).`:''}</p></div>`;
  return h;
}
/* ===================== ĐỘ NHẠY KẾT QUẢ THEO CÁC ĐIỂM CÒN TREO ===================== */
function sensCard(){
  if(!isAdmin()||!DATA.sens) return '';
  const S=DATA.sens, M=DATA.sens_meta;
  let h=`<div class="card"><h2>Kết quả có đổi không nếu chốt các điểm còn treo?</h2>
   <p class="cap">Ba quy tắc vẫn <b>chưa có xác nhận bằng văn bản</b>: ngưỡng vị trí ${fmt(T_RAD)}m hay 200m ·
   đơn chưa giao xong có nằm trong ${L.scope} không · tải trọng xe khai trong TMS có đáng tin không.
   Bảng dưới tính lại toàn bộ kết quả theo từng kịch bản để biết <b>chốt thế nào thì đổi kết quả của ai</b>.</p>
   <div class="wrap"><table class="rt"><caption class="sr-only">Phân tích độ nhạy kết quả DIP</caption>
   <thead><tr><th scope="col">Kịch bản</th><th scope="col" class="n">Số NPP ĐẠT</th><th scope="col">NPP đổi kết quả</th></tr></thead><tbody>
   ${S.map((s,i)=>`<tr class="${s.flips.length?'hot':''}"><th scope="row" data-l="Kịch bản">${i===0?'<b>'+esc(s.label)+'</b>':esc(s.label)}</th>
     <td class="n" data-l="Số NPP ĐẠT"><b>${s.pass}</b>/${M.npps.length}</td>
     <td data-l="NPP đổi kết quả">${s.flips.length?s.flips.map(n=>`<span class="chip gap"><span class="ic">⇄</span>${esc(n)}</span>`).join(' '):'<span style="color:var(--muted)">không đổi</span>'}</td></tr>`).join('')}
   </tbody></table></div>
   <p class="cap" style="margin:12px 0 0;border-left:3px solid ${M.unstable.length?'var(--warn-ink)':'var(--good)'};padding-left:11px">
   <b>Kết luận:</b> kết quả của <b>${M.stable.length}/${M.npps.length} NPP</b> (${M.stable.join(', ')}) <b>giữ nguyên</b> qua mọi tổ hợp kịch bản —
   phần này công bố được ngay.
   ${M.unstable.length?` Riêng <b>${M.unstable.join(', ')}</b> đạt hay trượt <b>hoàn toàn phụ thuộc vào việc chốt quy tắc</b>, không phụ thuộc vào việc NPP làm tốt hay kém.
     Công bố kết quả của ${M.unstable.join(', ')} trước khi ${L.owner} chốt bằng văn bản là <b>rủi ro công bằng trực tiếp</b>.`
   :''}</p></div>`;
  return h;
}

function pOverview(){
  const r=row(), all=cur==='ALL';
  const M=(!all&&DATA.margin)?DATA.margin[cur]:null;
  const mg=(v,unit)=>v>=0?`<b style="color:var(--good)">dư ${fmt(v)} ${unit}</b>`:`<b style="color:var(--crit)">thiếu ${fmt(-v)} ${unit}</b>`;
  const ci=(c,s)=>c&&c[0]!=null?`<br>Sai số 95%: ${pct(c[0])} – ${pct(c[1])}${s?' <b style="color:var(--warn-ink)">· vắt ngang ngưỡng</b>':''}`:'';
  const kpis=[
    ['USER NAME', r.v_username, pct(r.username_pct), `${fmt(r.username_fail)} đơn sai định dạng · ngưỡng ${num(TH.username,0)}%`],
    ['DISTANCE & TIME', all?(SB().filter(x=>x.v_dt==='FAIL').length?'FAIL':'PASS'):r.v_dt, fmt(r.dt_routes_fail)+' chuyến',
      `Chuyến hỏng (${pct(r.dt_route_fail_pct)}) · ngưỡng dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến${M?' · '+(M.dt_margin>=0?`<b style="color:var(--good)">còn ${num(M.dt_margin,2)} điểm % dưới ngưỡng</b>`:`<b style="color:var(--crit)">đã vượt ${num(-M.dt_margin,2)} điểm %</b>`):''}`],
    ['GEO COMPLIANCE', r.v_geo, pct(r.geo_pct), `${fmt(r.geo_fail)}/${fmt(r.geo_scope_orders)} đơn lỗi · đã loại ${fmt(r.geo_excluded)} đơn DSA · ngưỡng ≥${num(T_GEO,0)}%${M?' · '+mg(M.geo_margin,'đơn')+ci(M.geo_ci,M.geo_straddle):''}`],
    ['ON TIME', r.v_ontime, pct(r.ot_pct), `${fmt(r.ot_fail)} đơn quá hạn 24h/48h · ngưỡng &gt;${num(T_OT,0)}%${M?' · '+mg(M.ot_margin,'đơn')+ci(M.ot_ci,M.ot_straddle):''}`],
    ['SUCCESSFUL', r.v_successful, pct(r.ot_pct), `Dùng chung cờ <span class="formula">is_ontime</span> · ngưỡng &gt;${num(T_OT,0)}%`],
    ['PAYLOAD', r.v_payload, fmt(r.payload_plans_fail)+' chuyến', `Tải/xe &gt;${num(T_PLR,1)} lần · ngưỡng ${num(TH.payload,0)}%${M?' · '+(M.pl_margin===0?'<b style="color:var(--good)">không chuyến nào quá tải</b>':`<b style="color:var(--crit)">phải xử lý hết ${fmt(-M.pl_margin)} chuyến</b>`):''}`],
    ['CREATED DATE', 'GAP', '–', `Thiếu cột thời điểm tạo đơn trong nguồn`],
  ];
  const nFail=kpis.filter(k=>k[1]==='FAIL').length;
  const failNpp=SB().filter(x=>x.overall==='FAIL').length, passNpp=SB().length-failNpp;

  const DAYS=DATA.meta.days||0, THIN=DAYS>0&&DAYS<14, PART=DAYS>0&&DAYS<31;
  let h='';

  /* ---- 1. CẢNH BÁO trước tiên: điều kiện đọc mọi con số bên dưới ---- */
  const SHORTW = !isAdmin() && cur!=='ALL';   /* v48 · N3: vai NPP đọc bản ngắn, admin giữ nguyên bản đầy đủ */
  if(THIN && SHORTW) h+=`<div class="banner bthin" role="note">
    <b class="bthin-h">⚠ Số liệu ${fmt(DAYS)} ngày đầu tháng — mới là tạm tính, chưa dùng để chấm thưởng.</b>
    <details class="nwarn"><summary>Vì sao chưa chấm điểm?</summary>
    <div>Kỳ dữ liệu chỉ có <b>${fmt(DAYS)} ngày</b> (${esc(DATA.meta.period)}) với <b>${fmt(DATA.meta.orders)} đơn</b> toàn vùng.
    Ở cỡ mẫu này, một NPP có thể ĐẠT hay KHÔNG ĐẠT chỉ vì một hai đơn, và các ngưỡng tính theo tháng
    (dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng) <b>chưa thể chốt</b>. Báo cáo dùng để <b>kiểm chứng cách tính</b>,
    <b>không dùng để chấm điểm DIP</b> cho tới khi có đủ kỳ.</div></details></div>`;
  if(THIN && !SHORTW) h+=`<div class="banner bthin" role="note"><b class="bthin-h">⚠ Kết quả tạm tính — kỳ dữ liệu mới có ${fmt(DAYS)} ngày, chưa dùng để chấm điểm DIP.</b>
   <b>Cảnh báo cỡ mẫu — đọc trước khi dùng bất kỳ con số nào bên dưới.</b> Kỳ dữ liệu chỉ có <b>${fmt(DAYS)} ngày</b>
   (${esc(DATA.meta.period)}) với <b>${fmt(DATA.meta.orders)} đơn</b> toàn vùng${(()=>{const m=DATA.scorecard.reduce((a,b)=>a.orders<b.orders?a:b);
     return ` — NPP ít nhất chỉ có <b>${fmt(m.orders)} đơn</b>`;})()}.
   Ở cỡ mẫu này, một NPP có thể ĐẠT hay KHÔNG ĐẠT chỉ vì một hai đơn, và các ngưỡng tính theo tháng
   (dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng) <b>chưa thể chốt</b>. Báo cáo này dùng để <b>kiểm chứng cách tính</b>,
   <b>không dùng để chấm điểm DIP</b> cho tới khi có đủ kỳ.</div>`;

  /* ---- 2. TÓM TẮT ĐIỀU HÀNH: khối trả lời "chuyện gì đang xảy ra và tôi phải làm gì" ---- */
  h+= (!isAdmin() && !all) ? ovNpp(r) : ovSummary(r,all);

  /* Từ đây trở xuống là phần phân tích chi tiết: giữ NGUYÊN mọi khối cũ,
     chỉ gấp lại để trang không còn là một bức tường chữ. */
  h+=`<h2 class="sect">Phân tích chi tiết</h2>
   <p class="sect-cap">Bấm để mở nhóm cần xem.</p>`;
  h+=`<details class="ovsec"><summary><span class="ovs-i"></span><span class="ovs-t">Tóm tắt điều hành</span><span class="ovs-c">việc cần chốt · hạn chót · chủ thể</span></summary><div class="ovs-b">`;
  h+=execSummary(r,all);

  /* ---- 3. Cách chấm điểm, đặt ngay trước dãy số để đọc số cho đúng ---- */
  h+=`<div class="banner">Phải đạt <b>cả 6 tiêu chí</b>. Hỏng 1 tiêu chí là trượt toàn bộ Data Accuracy và mất trọn <b>15% DIP</b> (10% Data Accuracy + 5% TMS).
   ${PART?`Kỳ dữ liệu <b>${esc(DATA.meta.period)}</b> — mới ${fmt(DAYS)}/31 ngày, nên ngưỡng tính theo tháng (dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng) còn <b>chưa đủ kỳ</b>.`:`Kỳ dữ liệu <b>${esc(DATA.meta.period)}</b> — đủ tháng.`}</div>`;
  h+=`</div></details>`;

  /* ---- 4. Dãy số: bằng chứng, đọc sau khi đã biết điều kiện ---- */


  h+=`<details class="ovsec"><summary><span class="ovs-i"></span><span class="ovs-t">Biên an toàn · xếp hạng · độ nhạy</span><span class="ovs-c">khoảng cách tới ngưỡng tính bằng đơn · kịch bản chốt quy tắc</span></summary><div class="ovs-b">`;
  /* v43 · K7: bảng điểm theo NPP đã DỜI LÊN đầu trang thành ma trận (ovMatrix) — không nhân đôi */
  h+=marginCard();
  h+=rankCard();
  h+=sensCard();

  h+= isAdmin() ? `<div class="card"><h2>Sáu con số của kỳ này</h2><p class="cap">Tính trực tiếp từ ${fmt(DATA.meta.orders)} đơn của kỳ.</p><ul class="tight">
    <li><b>Geo ${pct(DATA.total.geo_pct)}</b> toàn vùng, ${DATA.total.geo_pct>=T_GEO?'trên':'dưới'} ngưỡng ${num(T_GEO,0)}%. ${DATA.scorecard.filter(x=>x.v_geo==='FAIL').length}/${DATA.scorecard.length} NPP không đạt riêng tiêu chí này: ${DATA.scorecard.filter(x=>x.v_geo==='FAIL').map(x=>x.npp).join(', ')||'—'}.</li>
    <li><b>Quy tắc loại đơn DSA đang quyết định kết quả.</b> Bỏ quy tắc: Geo toàn vùng ${pct(DATA.dsa_geo_scen_total.geo_with_dsa)}, ${DATA.dsa_geo_scen_total.fail_with_dsa}/${DATA.scorecard.length} NPP không đạt. Giữ quy tắc: ${DATA.dsa_geo_scen_total.fail_no_dsa}/${DATA.scorecard.length}. ${DATA.dsa_geo_scen_total.flips.length?`<b>${DATA.dsa_geo_scen_total.flips.join(', ')}</b> đổi kết quả vì quy tắc này.`:'Không NPP nào đổi kết quả.'} Chưa có văn bản chốt.</li>
    <li><b>Payload ${fmt(DATA.total.payload_plans_fail)} chuyến</b> vượt ${num(T_PLR,1)} lần tải trọng, tập trung ở ${DATA.scorecard.slice().sort((a,b)=>b.payload_plans_fail-a.payload_plans_fail).slice(0,2).filter(x=>x.payload_plans_fail>0).map(x=>`${x.npp} (${x.payload_plans_fail})`).join(' và ')||'—'}. Tỷ lệ cao nhất ${num(DATA.total.payload_max_ratio,2)} lần.</li>
    <li><b>Distance &amp; Time ${fmt(DATA.total.dt_routes_fail)} chuyến hỏng</b> toàn vùng${(()=>{const w=DATA.scorecard.slice().sort((a,b)=>b.dt_routes_fail-a.dt_routes_fail)[0];
      return w&&w.dt_routes_fail>0?`, riêng ${w.npp} đã ${w.dt_routes_fail} chuyến (${pct(w.dt_route_fail_pct)})`:''})()}. Ngưỡng là dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến mỗi NPP mỗi tháng (mỗi NPP một mẫu số riêng).</li>
    <li><b>User name ${pct(DATA.total.username_pct)}</b>${DATA.total.username_fail?` — ${fmt(DATA.total.username_fail)} đơn sai định dạng`:` — cả ${fmt(DATA.meta.orders)} đơn đều khớp 1 trong 3 định dạng hợp lệ`}.</li>
    <li><b>${DATA.scorecard.filter(x=>x.overall==='PASS').length}/${DATA.scorecard.length} NPP đạt toàn bộ</b>: ${DATA.scorecard.filter(x=>x.overall==='PASS').map(x=>x.npp).join(', ')||'—'}.</li>
  </ul></div>` : '';
  h+=`</div></details>`;
  h+=`<details class="ovsec"><summary><span class="ovs-i"></span><span class="ovs-t">Xu hướng trong kỳ</span><span class="ovs-c">nửa đầu so nửa sau · ba ngày kém nhất</span></summary><div class="ovs-b">`;
  const HK = all ? null : DATA.ci_half[cur];
  if(HK){ const MH=DATA.half_meta;
    const rw=(lbl,a,b,thr)=>{ if(a==null||b==null) return '';
      const dd=b-a, up=dd>=0;
      return `<tr><th scope="row" data-l="Tiêu chí">${lbl}</th>
        <td class="n" data-l="Nửa đầu">${pct(a)}</td><td class="n" data-l="Nửa sau">${pct(b)}</td>
        <td class="n" data-l="Thay đổi"><b style="color:${up?'var(--good)':'var(--crit)'}">${up?'▲':'▼'} ${num(Math.abs(dd))} điểm</b></td>
        <td data-l="Đọc là">${up?(b>=thr?'đang cải thiện và đã vượt ngưỡng':'đang cải thiện nhưng chưa tới ngưỡng'):'đang xấu đi'}</td></tr>`;};
    h+=`<div class="card"><h2>Đang tốt lên hay xấu đi?</h2>
      <p class="cap">So nửa đầu kỳ (${esc(MH.p1)}, ${fmt(HK.n_h1)} đơn) với nửa sau (${esc(MH.p2)}, ${fmt(HK.n_h2)} đơn). Nhìn một con số trung bình cả kỳ thì không thấy được mình đang tốt lên hay xấu đi.</p>
      <div class="wrap"><table class="rt"><caption class="sr-only">So sánh nửa đầu và nửa sau kỳ</caption>
      <thead><tr><th scope="col">Tiêu chí</th><th scope="col" class="n">Nửa đầu</th><th scope="col" class="n">Nửa sau</th><th scope="col" class="n">Thay đổi</th><th scope="col">Đọc là</th></tr></thead>
      <tbody>${rw('Geo Compliance',HK.geo_h1,HK.geo_h2,T_GEO)}${rw('Giao trong cam kết (On time)',HK.ot_h1,HK.ot_h2,T_OT)}</tbody></table></div>
      ${(HK.geo_h2>HK.geo_h1+3||HK.ot_h2>HK.ot_h1+3)?`<p class="cap" style="margin:12px 0 0;border-left:3px solid var(--good);padding-left:11px"><b>Đáng lưu ý:</b> NPP đang cải thiện rõ giữa hai nửa kỳ. Nếu kết quả cuối cùng vẫn không đạt, nên nêu xu hướng này khi trao đổi với HEINEKEN.</p>`:''}
      </div>`;
  }
  const BD=DATA.bad_days[all?'ALL':cur]||[];
  if(BD.length) h+=`<div class="card"><h2>Ba ngày kém nhất trong kỳ</h2>
    <p class="cap">Bấm một ngày để mở đơn lỗi của ngày đó.</p>
    <div class="grid g3">${BD.map(x=>`
      <button type="button" class="tile tile-act" data-go="errors" data-day="${esc(x.day)}">
        <div class="lbl">Ngày ${esc(x.day)}</div>
        <div class="val" style="font-size:20px">${x.geo!=null?pct(x.geo):'–'} <span style="font-size:13px;color:var(--muted)">Geo</span></div>
        <div class="note">Đúng hạn ${pct(x.ot)} · ${fmt(x.orders)} đơn giao</div>
        <div class="note gonote">Xem đơn lỗi ngày này →</div></button>`).join('')}</div>
    <p class="cap" style="margin:12px 0 0">Một ngày tụt hẳn so với các ngày khác thường là <b>sự cố hôm đó</b>: mất mạng, kho soạn hàng chậm, mưa bão.
    Không phải do đội xe kém. Xử lý đúng ngày đó nhanh và đỡ tốn hơn nhiều so với huấn luyện lại cả đội.</p></div>`;
  h+=`</div></details>`;
  h+=`<details class="ovsec"><summary><span class="ovs-i"></span><span class="ovs-t">Lỗi thuộc về ai — và cần làm gì</span><span class="ovs-c">thống kê theo tài khoản · khuyến nghị xử lý</span></summary><div class="ovs-b">`;
  h+=userSection();
  h+=`</div></details>`;
  return h;
}

/* ===== TẢI TRỌNG XE KHAI KHÔNG NHẤT QUÁN — nguyên nhân gốc của KPI Payload ===== */
function capCard(){
  const C=DATA.cap_check; if(!C) return '';
  const mine = isAdmin()&&cur==='ALL';
  const scope = mine ? null : (isAdmin()?cur:role);
  const by = C.by_npp.filter(x=>!scope||x.npp===scope);
  const rows = C.rows.filter(x=>!scope||x.npp===scope);
  const now = by.reduce((a,b)=>a+b.now,0), best = by.reduce((a,b)=>a+b.best,0);
  if(!now) return '';
  const trucksAll = mine ? C.trucks : by.reduce((a,b)=>a+b.trucks,0);
  const trucksMul = mine ? C.trucks_multi : by.reduce((a,b)=>a+b.trucks_multi,0);
  const failAll   = mine ? C.fail_plans : now;
  const failMul   = mine ? C.fail_on_multi : by.reduce((a,b)=>a+(b.fail_on_multi||0),0);
  return `<div class="card" style="margin:14px 0;background:var(--plane);border-color:rgba(250,178,25,.5)">
   <h2>Trước khi quy lỗi: tải trọng xe khai trong TMS đang không nhất quán</h2>
   <p class="cap">Payload lấy mẫu số là <span class="formula">TruckCapacityWeight</span> — tải trọng xe <b>khai trong hệ thống</b>.
   Kiểm tra cột này phát hiện <b>cùng một biển số xe được khai nhiều mức tải trọng khác nhau</b>,
   nên tỷ lệ "quá tải" phụ thuộc vào chuyến đó tình cờ được gán mức khai nào.
   ${C.ref_wider?`<br><b>Cách kiểm:</b> hai lần khai khác nhau của cùng một xe có thể cách nhau vài tuần, nên bảng đối chiếu
   biển số → tải trọng được dựng trên cửa sổ rộng hơn kỳ báo cáo (<code>${esc(C.ref_label)}</code> · ${fmt(C.ref_orders)} đơn · ${fmt(C.ref_days)} ngày).
   Việc chấm điểm vẫn dùng đúng tải trọng khai của từng chuyến, không đổi.`:''}</p>
   <div class="grid g3" style="margin-bottom:14px">
     <div class="tile"><div class="lbl">Xe khai từ 2 mức tải trọng trở lên</div>
       <div class="val" style="color:var(--warn-ink)">${fmt(trucksMul)}<span style="font-size:20px;color:var(--muted)">/${fmt(trucksAll)}</span></div>
       <div class="note">biển số xe ${mine?'trong toàn vùng':'của NPP '+esc(scope)} · cùng một xe, hai con số tải trọng</div></div>
     <div class="tile"><div class="lbl">Chuyến quá tải thuộc nhóm xe đó</div>
       <div class="val" style="color:var(--crit)">${fmt(failMul)}<span style="font-size:20px;color:var(--muted)">/${fmt(failAll)}</span></div>
       <div class="note">${pct(failMul/Math.max(1,failAll)*100)} số chuyến quá tải${mine?' toàn vùng':' của NPP '+esc(scope)}</div></div>
     <div class="tile" style="border-color:rgba(12,163,12,.4)"><div class="lbl">Nếu dùng tải trọng lớn nhất từng khai của <b>chính xe đó</b></div>
       <div class="val" style="font-size:32px">${fmt(now)} → <b style="color:var(--good)">${fmt(best)}</b></div>
       <div class="note">chuyến quá tải${scope?` của NPP ${esc(scope)}`:' toàn vùng'}</div></div>
   </div>
   <div class="wrap"><table class="rt"><caption class="sr-only">Số chuyến quá tải theo hai cách hiểu tải trọng xe</caption>
   <thead><tr><th scope="col">NPP</th><th scope="col" class="n">Xe chạy</th><th scope="col" class="n">Xe khai ≥2 mức</th>
     <th scope="col" class="n">Chuyến quá tải (đang tính)</th><th scope="col" class="n">Nếu dùng tải trọng lớn nhất của chính xe</th><th scope="col">Payload</th></tr></thead><tbody>
   ${by.map(x=>`<tr class="${x.now!==x.best?'hot':''}"><th scope="row" data-l="NPP"><b>${esc(x.npp)}</b></th>
     <td class="n" data-l="Xe chạy">${fmt(x.trucks)}</td><td class="n" data-l="Xe khai ≥2 mức">${x.trucks_multi?fmt(x.trucks_multi):'—'}</td>
     <td class="n" data-l="Chuyến quá tải">${x.now?`<b style="color:var(--crit)">${fmt(x.now)}</b>`:'—'}</td>
     <td class="n" data-l="Nếu dùng tải trọng lớn nhất">${x.best?fmt(x.best):'0'}</td>
     <td data-l="Payload">${x.now>0&&x.best===0?chip('PASS','ĐỔI THÀNH ĐẠT'):(x.now?chip('FAIL','vẫn KHÔNG ĐẠT'):chip('PASS'))}</td></tr>`).join('')}
   </tbody></table></div>
   ${rows.length?`<details class="dtbl"><summary>Xem danh sách xe khai nhiều mức tải trọng (${fmt(rows.length)} xe nhiều lỗi nhất)</summary>
   <div class="wrap"><table class="rt"><caption class="sr-only">Xe được khai nhiều mức tải trọng</caption>
   <thead><tr><th scope="col">Biển số</th>${mine?'<th scope="col">NPP</th>':''}<th scope="col" class="n">Tải khai thấp nhất</th><th scope="col" class="n">Tải khai cao nhất</th>
     <th scope="col" class="n">Chuyến</th><th scope="col" class="n">Chuyến quá tải</th><th scope="col" class="n">Hàng chở nhiều nhất</th></tr></thead><tbody>
   ${rows.map(x=>`<tr><th scope="row" data-l="Biển số">${esc(x.truck)}</th>${mine?`<td data-l="NPP">${esc(x.npp)}</td>`:''}
     <td class="n" data-l="Tải khai thấp nhất">${num(x.capmin,2)} t</td><td class="n" data-l="Tải khai cao nhất">${num(x.capmax,2)} t</td>
     <td class="n" data-l="Chuyến">${fmt(x.plans)}</td><td class="n" data-l="Chuyến quá tải"><b style="color:var(--crit)">${fmt(x.fail)}</b></td>
     <td class="n" data-l="Hàng chở nhiều nhất">${num(x.maxw,2)} t</td></tr>`).join('')}
   </tbody></table></div></details>`:''}
   <p class="cap" style="margin:12px 0 0;border-left:3px solid var(--warn);padding-left:11px">
   <b>Fact:</b> <span class="formula">TruckCapacityWeight</span> không phải tải trọng riêng của từng xe mà là <b>một hằng số gán theo</b>
   <span class="formula">TruckCategory</span>${C.cat_uniform?' (mỗi loại xe chỉ có đúng 1 giá trị trong cả kỳ)':''} —
   ${C.cat_list.slice(0,4).map(c=>`${esc(c.cat)} = ${num(c.cap,2)} t`).join(' · ')}…
   Cùng một biển số xe lại được gán <b>hai loại xe khác nhau</b> ở hai chuyến khác nhau, nên tải trọng nhảy theo.
   ${(()=>{ if(!C.worst_ex) return '';
     const W=C.worst_ex, k=W.capmin>0?W.maxw/W.capmin:0;
     const head=`<b>Assumption cần loại trừ:</b> xe <b>${esc(W.truck)}</b> lúc thì khai ${num(W.capmin,2)} tấn, lúc thì khai ${num(W.capmax,2)} tấn,
       và có chuyến ghi nhận chở tới <b>${num(W.maxw,2)} tấn</b> — `;
     /* Chỉ được nói "bất khả thi về mặt vật lý" khi chênh lệch đủ lớn (từ 3 lần trở lên) —
        kết luận mạnh hơn bằng chứng là lỗi nặng trong một báo cáo dùng để chi trả tiền. */
     return head + (k>=3
       ? `gấp <b>${num(k,1)} lần</b> mức khai thấp, <b>bất khả thi về mặt vật lý</b> — nghĩa là hoặc loại xe gán sai, hoặc <span class="formula">Assigned_Weight</span> không cùng đơn vị.`
       : `gấp ${num(k,1)} lần mức khai thấp. Mức này <b>vẫn có thể xảy ra trên thực tế</b> nên chưa kết luận được là lỗi khai báo hay quá tải thật; phải đối chiếu tải trọng đăng kiểm mới phân định được.`);})()}
   <b>Recommendation:</b> chuẩn hoá bảng tải trọng xe (biển số → tải trọng đăng kiểm, một giá trị duy nhất)
   và chốt đơn vị trọng lượng <b>trước khi</b> dùng Payload cho chi trả DIP. Trong lúc chờ, con số
   "${fmt(now)} chuyến quá tải" nên đọc là <b>${fmt(C.fail_on_multi)}/${fmt(C.fail_plans)} chuyến có nguyên nhân nghi ngờ từ dữ liệu khai báo</b>,
   không phải bằng chứng NPP chất hàng quá tải.
   ${(()=>{const flip=by.filter(z=>z.now>0&&z.best===0).map(z=>z.npp);
     return flip.length?`<br><b style="color:var(--crit)">Ảnh hưởng trực tiếp tới kết quả:</b> toàn bộ chuyến quá tải của
     <b>${flip.join(', ')}</b> đều thuộc nhóm xe khai nhiều mức tải trọng — nếu dùng tải trọng lớn nhất từng khai của chính xe đó thì
     <b>không còn chuyến nào quá tải</b> và Payload chuyển sang ĐẠT. Không nên công bố kết quả Payload
     ${flip.length===1?'của '+flip[0]:'của các NPP này'} trước khi chốt bảng tải trọng xe.`:'';})()}</p></div>`;
}

function pAccuracy(){
  const r=row();
  let h=`<div class="banner">Trang này gồm <b>4 tiêu chí</b> chưa có tab riêng: User name · Distance &amp; Time · Payload · Created Date. Ngưỡng <b>100%</b> cho User name / Created Date / Payload; Distance &amp; Time dùng ngưỡng chuyến và ngưỡng tháng riêng.
    <b>Created Date hiện chưa chấm</b> nên không nằm trong 6 tiêu chí quyết định DIP.</div>`;

  h+=`<div class="card"><h2 id="kpi-username">1 · USER NAME — cột <span class="formula">username</span></h2>
    <p class="cap">Quy tắc: tài khoản hợp lệ khi khớp 1 trong 3 định dạng — DSA <span class="formula">[DISCODE]+[DSA]+[KHO]</span>, số điện thoại 10 số, hoặc biển số xe. Ngưỡng 100%.</p>
    <div class="grid g2"><div>
      ${(()=>{const ut = (cur==='ALL'&&isAdmin()) ? DATA.dq.user_types : (SC[cur]?.user_types||{});
              const tot = Object.values(ut).reduce((a,b)=>a+b,0)||1;
              return vbar(Object.entries(ut).map(([k,v])=>({k,v,tip:`<b>${esc(k)}</b><div class="r">${fmt(v)} đơn (${pct(v/tot*100)})</div>`})),
                {h:230,a11y:'Phân bố loại tài khoản đăng nhập: '+Object.entries(ut).map(([k,v])=>k+' '+fmt(v)+' đơn').join(', ')});})()}
      <p class="cap" style="margin-top:6px">Phân bố loại tài khoản trên ${fmt(r.orders)} đơn${cur==='ALL'&&isAdmin()?' toàn vùng':' của NPP '+esc(cur)}.</p>
    </div><div>
      <dl class="kv"><dt>Đơn hợp lệ</dt><dd>${fmt(r.orders-r.username_fail)} / ${fmt(r.orders)}</dd>
      <dt>Tỷ lệ đạt</dt><dd>${pct(r.username_pct)}</dd>
      <dt>Đơn sai định dạng</dt><dd>${fmt(r.username_fail)}</dd>
      <dt>Kết quả</dt><dd>${chip(r.v_username)}</dd></dl>
      <p class="cap" style="margin-top:10px"><b>Liên hệ với Geo:</b> ${fmt(r.geo_excluded||0)} đơn dùng tài khoản DSA đã được <b>loại khỏi Geo</b> theo quy tắc đã chốt — nhưng <b>vẫn tính đầy đủ</b> ở On time và Distance &amp; Time. Đây là điểm chưa nhất quán; xem thẻ "Phần đến từ tài khoản kho" ở mục 2 bên dưới.</p>
      <p class="cap" style="margin-top:10px"><b>Lưu ý (Assumption):</b> tiêu chí chỉ kiểm được <i>định dạng</i>. Muốn kiểm "đúng người" (DSA của đúng NPP/kho, tài xế đúng xe) cần bảng tham chiếu Ship-to / Distributor AP — hiện chưa có trong nguồn.</p>
    </div></div></div>`;

  const dtItems = SB().map(x=>({k:x.npp, v:x.dt_route_fail_pct, color:x.v_dt==='FAIL'?'var(--crit)':'var(--brand)',
    tip:`<b>${esc(x.npp)}</b><div class="r">Chuyến hỏng: <b>${x.dt_routes_fail}</b>/${fmt(x.plans)} chuyến (<b>${pct(x.dt_route_fail_pct)}</b>)</div><div class="r">Outlet lỗi: <b>${fmt(x.dt_orders_fail)}</b></div><div class="r">Tỷ lệ đơn đạt: <b>${pct(x.dt_pct)}</b></div>`}));
  h+=`<div class="card"><h2 id="kpi-dt">2 · DISTANCE &amp; TIME — khoảng cách và thời gian giữa hai outlet liền nhau</h2>
    <p class="cap"><b>Quy tắc (từ kỳ tháng 9/2026):</b> trong <b>cùng một chuyến</b>, một outlet bị tính lỗi khi
    <b>thời gian tới outlet liền trước &lt; ${fmt(TH.dt_gap_min??2)} phút</b>.
    Outlet đầu chuyến không có mốc trước nên không tính.
    Một chuyến <b>được phép sai tối đa ${fmt(T_DTR_ROUTE_PCT)}% số outlet của chính chuyến đó</b>; vượt tỷ lệ đó thì cả chuyến tính là hỏng.
    NPP <b>được phép dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến trong tháng</b> hỏng.</p>
    <details class="dtbl" style="margin-top:0"><summary>Thời gian này đo thế nào?</summary>
      <p class="cap" style="margin:8px 0 0">Đo giữa hai lần xác nhận liền nhau <b>trong cùng một chuyến</b>, sắp theo giờ giao.
      Báo cáo tự tính từ <span class="formula">DeliverDateTime</span> để giữ độ chính xác tới giây, thay vì dùng cột <span class="formula">time_outlet_outlet</span> đã làm tròn về phút — nếu dùng cột làm tròn thì một cặp cách nhau 1 phút 40 giây sẽ thành "2 phút" và thoát ngưỡng.
      <b>Không xét khoảng cách giữa hai outlet</b> (quyết định rút gọn 30/08/2026).</p></details>
    ${hbar(dtItems,{max:Math.max(niceMax(Math.max(...dtItems.map(d=>d.v))),T_DTR_MONTH_PCT),thr:T_DTR_MONTH_PCT,thrLabel:'ngưỡng '+fmt(T_DTR_MONTH_PCT)+'% tổng chuyến/tháng',
      a11y:'Tỷ lệ % chuyến hỏng Distance & Time theo NPP: '+dtItems.map(d=>d.k+' '+pct(d.v)).join(', ')})}
    ${(()=>{ if(cur==='ALL'&&isAdmin()) return '';
      const Q=DATA.dt_quota[cur], D=DATA.dsa_split[cur]; if(!Q) return '';
      const over=Q.pct>=Q.pct_threshold;
      return `<div class="grid g3" style="margin:14px 0">
        <div class="tile" style="${over?'border-color:rgba(208,59,59,.45)':''}">
          <div class="lbl">Tỷ lệ chuyến hỏng trong tháng</div>
          <div class="val" style="color:${over?'var(--crit)':'var(--brand)'};font-size:20px">${pct(Q.pct)}</div>
          <div class="note">${fmt(Q.fail_routes)}/${fmt(Q.total_routes)} chuyến hỏng sau ${fmt(Q.days_done)} ngày (còn ${fmt(Q.days_left)} ngày) · ngưỡng dưới ${fmt(T_DTR_MONTH_PCT)}%</div></div>
        <div class="tile" style="${over?'border-color:rgba(208,59,59,.45)':''}"><div class="lbl">Biên so với ngưỡng</div>
          <div class="val" style="color:${over?'var(--crit)':'var(--brand)'};font-size:20px">${sgn(Q.margin_pct,2)} điểm %</div>
          <div class="note">dương = còn cách ngưỡng · âm = đã vượt ngưỡng ${fmt(T_DTR_MONTH_PCT)}%</div></div>
        ${D&&D.dt_orders_dsa>0?`<div class="tile" style="border-color:rgba(250,178,25,.45)">
          <div class="lbl">Phần đến từ tài khoản kho (DSA)</div>
          <div class="val" style="color:var(--warn-ink);font-size:20px">${fmt(D.dt_orders_dsa)}<span style="font-size:14px;color:var(--muted)">/${fmt(D.dt_orders_all)} đơn</span></div>
          <div class="note">Nếu loại tài khoản DSA như đang làm với Geo: <b>${fmt(D.dt_routes_now)} → ${fmt(D.dt_routes_nodsa)} chuyến hỏng</b> (${pct(Q.pct)} → ${D.dt_pct_nodsa==null?'–':pct(D.dt_pct_nodsa)})${(D.dt_pct_nodsa!=null&&D.dt_pct_nodsa<T_DTR_MONTH_PCT&&Q.pct>=T_DTR_MONTH_PCT)?' → tiêu chí này sẽ ĐẠT':''}</div></div>`:''}
      </div>`;})()}
    <p class="cap" style="margin-top:10px">Đơn vị đo là <b>chuyến</b>, không phải đơn hàng — đúng theo cách phát biểu KPI trong logic gốc.<br>
    <b>Tuyến càng NGẮN càng dễ dính (đảo ngược so với quy tắc cũ, từ kỳ tháng 9):</b> ${DATA.route_len.map(x=>`${esc(x.label)} điểm giao ${pct(x.dt_route_pct??0)} chuyến hỏng`).join(' · ')}. Ngưỡng nay tính theo <b>%</b> nên chuyến càng ít outlet thì 1 outlet lỗi đã chiếm tỷ lệ lớn — chuyến 2 outlet chỉ cần 1 outlet lỗi là 50%, vượt xa ngưỡng ${fmt(T_DTR_ROUTE_PCT)}%. Trước đây (ngưỡng tuyệt đối) tuyến ngắn gần như miễn nhiễm, tuyến dài mới dễ dính — nên nêu rõ điểm đảo chiều này khi thương lượng ngưỡng với NPP.<br>
    <b>Đọc đúng con số:</b> ${fmt(DATA.total.dt_routes_fail)} chuyến vượt mức cho phép (outlet lỗi &gt;${fmt(T_DTR_ROUTE_PCT)}% tổng outlet của chuyến), trên tổng ${fmt(DATA.total.dt_routes_any)} chuyến có ít nhất 1 outlet lỗi và ${fmt(DATA.meta.plans)} chuyến toàn kỳ.</p>
    <div class="scroll" style="margin-top:14px"><table class="rt"><thead><tr><th scope="col">NPP</th><th scope="col">Mã chuyến</th><th scope="col">Xe</th><th scope="col" class="n">Số đơn</th><th scope="col" class="n">Outlet lỗi</th><th scope="col">Kết quả chuyến</th></tr></thead><tbody>
    ${DATA.dt_top.filter(x=>cur==='ALL'||x.TenantName===cur).map(x=>`<tr><td data-l="NPP"><b>${esc(x.TenantName)}</b></td><td data-l="Mã chuyến">${esc(x.PlanNumber)}</td><td data-l="Xe">${esc(x.truck)}</td>
      <td class="n" data-l="Số đơn">${fmt(x.orders)}</td><td class="n" data-l="Outlet lỗi">${fmt(x.dt_fail)}</td><td data-l="Kết quả chuyến">${chip(x.dt_route_fail?'FAIL':'PASS',x.dt_route_fail?'HỎNG':'trong ngưỡng')}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty"><b>Không có chuyến nào lỗi Distance &amp; Time</b>Trong phạm vi đang xem.</div></td></tr>'}
    </tbody></table></div></div>`;

  const plItems = SB().map(x=>({k:x.npp,v:x.payload_plans_fail,color:x.v_payload==='FAIL'?'var(--crit)':'var(--brand)',
    tip:`<b>${esc(x.npp)}</b><div class="r">Chuyến quá tải: <b>${x.payload_plans_fail}</b>/${fmt(x.plans)}</div><div class="r">Tỷ lệ chuyến đạt: <b>${pct(x.payload_pct)}</b></div><div class="r">Tỷ lệ tải cao nhất: <b>${num(x.payload_max_ratio,3)}×</b></div>`}));
  h+=`<div class="card"><h2 id="kpi-payload">3 · PAYLOAD — tính theo chuyến</h2>
    <p class="cap">Công thức: <span class="formula">Σ Assigned_Weight của chuyến ÷ TruckCapacityWeight &lt; ${num(T_PLR,1)}</span>. Ngưỡng 100% — không cho phép chuyến quá tải nào.</p>
    ${hbar(plItems,{max:niceMax(Math.max(4,...plItems.map(d=>d.v))),unit:'',label:v=>fmt(v)+' chuyến',
      a11y:'Số chuyến quá tải theo NPP: '+plItems.map(d=>d.k+' '+d.v+' chuyến').join(', ')})}
    ${(()=>{const T=(DATA.truck_by[cur==='ALL'&&isAdmin()?'ALL':cur]||[]).filter(x=>x.plans>=3);
      if(T.length<2) return '';
      const bad=T.filter(x=>x.fail>0), spare=T.filter(x=>x.fail===0&&x.ratio<0.6&&x.plans>=5);
      return `<div class="card" style="margin:14px 0;background:var(--plane)"><h2>Nhìn theo loại xe — đây mới là gốc của quá tải</h2>
      <p class="cap">Quá tải không rải đều mà dồn vào vài dòng xe. So khối lượng hàng thực chở với tải trọng khai của từng dòng xe sẽ thấy vấn đề nằm ở khâu <b>điều xe</b>, không phải tài xế.</p>
      <div class="wrap"><table class="rt"><caption class="sr-only">Tải trọng theo loại xe</caption>
      <thead><tr><th scope="col">Loại xe</th><th scope="col" class="n">Chuyến</th><th scope="col" class="n">Tải khai</th><th scope="col" class="n">Hàng chở (trung vị)</th><th scope="col" class="n">Tỷ lệ</th><th scope="col" class="n">Chuyến quá tải</th></tr></thead><tbody>
      ${T.map(x=>`<tr class="${x.fail>0?'hot':''}"><th scope="row" data-l="Loại xe">${esc(x.cat)}</th>
        <td class="n" data-l="Chuyến">${fmt(x.plans)}</td><td class="n" data-l="Tải khai">${num(x.cap,2)} t</td>
        <td class="n" data-l="Hàng chở">${num(x.w,2)} t</td>
        <td class="n" data-l="Tỷ lệ"><b style="color:${x.ratio>T_PLR?'var(--crit)':'var(--ink)'}">${num(x.ratio,2)}×</b></td>
        <td class="n" data-l="Chuyến quá tải">${x.fail?`<b style="color:var(--crit)">${fmt(x.fail)}</b>`:'—'}</td></tr>`).join('')}
      </tbody></table></div>
      ${(bad.length&&spare.length)?`<p class="cap" style="margin:12px 0 0;border-left:3px solid var(--warn);padding-left:11px">
        <b>Việc làm được ngay:</b> ${bad.map(x=>esc(x.cat)).join(' và ')} đang chở trung vị ${num(bad[0].w,2)} tấn trên tải khai ${num(bad[0].cap,2)} tấn,
        trong khi ${spare.map(x=>`${esc(x.cat)} (${fmt(x.plans)} chuyến, chỉ dùng ${pct(spare[0].ratio*100)} tải)`).join(', ')} đang chạy rỗng phần lớn.
        Chuyển bớt hàng sang dòng xe đang dư tải là giải quyết được phần lớn ${fmt(bad.reduce((a,b)=>a+b.fail,0))} chuyến quá tải — <b>không cần mua thêm xe</b>.</p>`:''}
      </div>`;})()}
    ${capCard()}
    <div class="scroll" style="margin-top:14px"><table class="rt"><thead><tr><th scope="col">NPP</th><th scope="col">Mã chuyến</th><th scope="col">Xe</th><th scope="col" class="n">Số đơn</th><th scope="col" class="n">Tổng tải</th><th scope="col" class="n">Tải xe</th><th scope="col" class="n">Tỷ lệ</th></tr></thead><tbody>
    ${DATA.pl_top.filter(x=>cur==='ALL'||x.TenantName===cur).map(x=>`<tr><td data-l="NPP"><b>${esc(x.TenantName)}</b></td><td data-l="Mã chuyến">${esc(x.PlanNumber)}</td><td data-l="Xe">${esc(x.truck)}</td>
      <td class="n" data-l="Số đơn">${fmt(x.orders)}</td><td class="n" data-l="Tổng tải">${x.weight.toLocaleString('vi-VN')}</td><td class="n" data-l="Tải xe">${x.cap.toLocaleString('vi-VN')}</td>
      <td class="n" data-l="Tỷ lệ"><b style="color:var(--crit)">${num(x.ratio,3)}×</b></td></tr>`).join('')||'<tr><td colspan="7"><div class="empty"><b>Không có chuyến nào quá tải</b>Trong phạm vi đang xem.</div></td></tr>'}
    </tbody></table></div>
    <p class="cap" style="margin-top:10px"><b>Assumption:</b> đơn vị của <span class="formula">Assigned_Weight</span> và <span class="formula">TruckCapacityWeight</span> được giả định cùng hệ (tấn). Cần ${L.owner} xác nhận trước khi dùng kết quả này cho chi trả DIP.</p></div>`;

  h+=`<div class="card"><h2>4 · CREATED DATE — ${chip('GAP')}</h2>
    <p class="cap">Quy tắc gốc: <span class="formula">Created Date (on DIS) &lt; DeliverDate</span>, ngưỡng 100% — nhằm phát hiện tài xế chỉnh giờ điện thoại.</p>
    <ul class="tight"><li>Nguồn hiện có <b>DeliverDate, DeliverDateTime, RouteConfirmDate, PromisedDate</b> nhưng <b>không có thời điểm tạo đơn trên DIS</b>.</li>
    <li>Theo nguyên tắc dự án — <b>không suy đoán quy tắc thiếu</b> — tiêu chí này để trạng thái chưa chấm, không quy kết NPP.</li>
    <li>Đề xuất: bổ sung cột <span class="formula">CreatedDate</span> từ DIS vào file trích xuất TMS để bật lại tiêu chí.</li></ul></div>`;
  return h;
}

/* ===== LỖI THUỘC VỀ TÀI XẾ HAY THUỘC VỀ TOẠ ĐỘ ĐIỂM BÁN? ===== */
function outletCard(){
  const O=DATA.outlet; if(!O) return '';
  const mine = isAdmin()&&cur==='ALL';
  const scope = mine ? null : (isAdmin()?cur:role);
  const by = (O.by_npp||[]).filter(x=>!scope||x.npp===scope);
  const rows = (O.rows||[]).filter(x=>!scope||x.npp===scope);
  const nOut = mine ? O.outlets : by.reduce((a,b)=>a+b.outlets,0);
  const nSus = mine ? O.suspect_n : by.reduce((a,b)=>a+b.suspect,0);
  const nSusOrd = mine ? O.suspect_orders : by.reduce((a,b)=>a+b.suspect_orders,0);
  return `<div class="card"><h2>Lỗi thuộc về tài xế hay thuộc về toạ độ điểm bán?</h2>
   <p class="cap">Nguồn mới có <span class="formula">OutletCode</span> và toạ độ cố định của từng điểm bán, nên lần đầu tiên
   tách được hai nguyên nhân vốn bị gộp làm một. Cách đọc: nếu <b>cùng một điểm bán mà lần giao nào cũng lệch quá ${fmt(T_RAD)}m</b>
   thì nguyên nhân gần như chắc chắn là <b>toạ độ điểm bán lưu sai trong hệ thống</b> — nhắc tài xế không giải quyết được gì.</p>
   <div class="grid g4" style="margin-bottom:14px">
     <div class="tile"><div class="lbl">Điểm bán trong kỳ</div><div class="val">${fmt(nOut)}</div>
       <div class="note">${mine?fmt(O.repeat)+' điểm được giao từ 2 lần trở lên':'trong phạm vi NPP '+esc(scope)}</div></div>
     <div class="tile" style="${nSus?'border-color:rgba(208,59,59,.45)':''}"><div class="lbl">Nghi toạ độ điểm bán sai</div>
       <div class="val" style="color:${nSus?'var(--crit)':'var(--good)'}">${fmt(nSus)}</div>
       <div class="note">${nSus?`điểm bán giao ≥2 lần mà <b>lần nào cũng lệch</b> · ${fmt(nSusOrd)} đơn liên quan`:'không phát hiện điểm bán nào lệch có hệ thống'}</div></div>
     <div class="tile"><div class="lbl">Chưa khai toạ độ</div><div class="val" style="color:${O.no_coord_outlets?'var(--warn-ink)':'var(--good)'}">${fmt(O.no_coord_outlets)}</div>
       <div class="note">điểm bán có toạ độ (0,0) · ${fmt(O.no_coord_orders)} đơn — không kết luận được nguyên nhân</div></div>
     <div class="tile"><div class="lbl">Lệch nhưng mới giao 1 lần</div><div class="val">${fmt(O.once_bad)}</div>
       <div class="note">chưa đủ dữ kiện để kết luận — cần thêm lần giao mới phân biệt được</div></div>
   </div>
   ${rows.length?`<div class="wrap"><table class="rt"><caption class="sr-only">Điểm bán nghi sai toạ độ</caption>
   <thead><tr><th scope="col">Mã điểm bán</th>${mine?'<th scope="col">NPP</th>':''}<th scope="col" class="n">Số lần giao</th>
     <th scope="col" class="n">Số lần lệch</th><th scope="col" class="n">Lệch trung vị</th><th scope="col" class="n">Lệch xa nhất</th><th scope="col">Đọc là</th></tr></thead><tbody>
   ${rows.map(x=>`<tr class="hot"><th scope="row" data-l="Mã điểm bán">${esc(x.code)}</th>${mine?`<td data-l="NPP">${esc(x.npp)}</td>`:''}
     <td class="n" data-l="Số lần giao">${fmt(x.n)}</td><td class="n" data-l="Số lần lệch"><b style="color:var(--crit)">${fmt(x.bad)}</b></td>
     <td class="n" data-l="Lệch trung vị">${x.med>=1000?num(x.med/1000,1)+' km':fmt(Math.round(x.med))+' m'}</td>
     <td class="n" data-l="Lệch xa nhất">${x.mx>=1000?num(x.mx/1000,1)+' km':fmt(Math.round(x.mx))+' m'}</td>
     <td data-l="Đọc là">${x.coord?'toạ độ điểm bán nhiều khả năng sai — <b>đo lại</b>':'<b>chưa khai toạ độ</b> — bổ sung trước'}</td></tr>`).join('')}
   </tbody></table></div>
   <p class="cap" style="margin:12px 0 0;border-left:3px solid var(--warn);padding-left:11px">
   <b>Việc làm được ngay:</b> gửi danh sách ${fmt(nSus)} mã điểm bán này cho bộ phận quản lý master data để <b>đo lại toạ độ</b>.
   Xử lý xong nhóm này là ${fmt(nSusOrd)} đơn hết lỗi mà <b>không cần tác động gì tới đội xe</b>.</p>`
   :`<p class="cap" style="margin:0;border-left:3px solid var(--good);padding-left:11px">
   <b>Kết quả tốt:</b> không có điểm bán nào giao từ 2 lần trở lên mà lần nào cũng lệch — nghĩa là các đơn lệch vị trí trong kỳ
   <b>không đến từ toạ độ điểm bán sai có hệ thống</b>. ${O.once_bad?`Còn ${fmt(O.once_bad)} điểm bán mới giao 1 lần đã lệch — chưa đủ dữ kiện, theo dõi thêm ở kỳ sau.`:''}</p>`}
   </div>`;
}

function pGeo(){
  const r=row();
  const items=SB().map(x=>({k:x.npp,v:x.geo_pct,color:x.v_geo==='FAIL'?'var(--crit)':'var(--brand)',
    tip:`<b>${esc(x.npp)}</b><div class="r">Đạt Geo: <b>${pct(x.geo_pct)}</b></div><div class="r">Đơn lỗi: <b>${fmt(x.geo_fail)}</b>/${fmt(x.geo_scope_orders)}</div><div class="r">Ngưỡng ≥${num(T_GEO,0)}%</div>`}));
  const gd=DATA.geo_dist[cur]||DATA.geo_dist['ALL'];
  const seq=['#cde2fb','#9ec5f4','#5598e7','#2a78d6','#184f95'];
  let h=`<div class="banner"><b>Geo Compliance:</b> ${GEO_DEF_SHORT}. Chỉ cần trượt một điều kiện là tính lỗi. Ngưỡng NPP ≥${num(T_GEO,0)}%.
  <a href="#logic" data-go="logic" class="cellbtn" style="font-weight:600">Xem định nghĩa đầy đủ →</a></div>`;
  h+=`<div class="grid g4" style="margin-bottom:18px">
   ${(()=>{const C=(cur!=='ALL'||!isAdmin())?DATA.ci_half[isAdmin()?cur:role]:null;
     const ci=C&&C.geo_ci&&C.geo_ci[0]!=null?`<div class="note">Sai số 95%: <b>${pct(C.geo_ci[0])} – ${pct(C.geo_ci[1])}</b></div>`:'';
     return `<div class="tile hero ${r.v_geo==='FAIL'?'bad':''}"><div class="lbl">Geo Compliance</div><div class="val">${pct(r.geo_pct)}</div>
       <div class="note">${chip(r.v_geo)} · ngưỡng ≥${num(T_GEO,0)}%</div>${ci}</div>`;})()}
   <div class="tile"><div class="lbl">Đơn không đạt Geo</div><div class="val">${fmt(r.geo_fail)}</div><div class="note">trên ${fmt(r.geo_scope_orders)} đơn trong ${L.scope} · đã loại ${fmt(r.geo_excluded)} đơn DSA</div></div>
   <div class="tile"><div class="lbl">Lệch xa nhất</div><div class="val">${(r.geo_max!=null?r.geo_max:DATA.dq.geo_max)>=1000?fmt(Math.round((r.geo_max??DATA.dq.geo_max)/1000))+' km':fmt(Math.round(r.geo_max??DATA.dq.geo_max))+' m'}</div><div class="note">${fmt(r.geo_out5k!=null?r.geo_out5k:DATA.dq.geo_outlier_5km)} đơn &gt;5km · cần xử lý ở tầng ETL</div></div>
   ${isAdmin()?`<div class="tile"><div class="lbl">NPP không đạt Geo</div><div class="val">${DATA.scorecard.filter(x=>x.v_geo==='FAIL').length}<span style="font-size:20px;color:var(--muted)">/${DATA.scorecard.length}</span></div><div class="note">${DATA.scorecard.filter(x=>x.v_geo==='FAIL').map(x=>x.npp).join(', ')||'—'}</div></div>`
    :`<div class="tile"><div class="lbl">Cách ngưỡng ${num(T_GEO,0)}%</div><div class="val">${r.geo_pct>=T_GEO?'+':''}${num(r.geo_pct-T_GEO)}<span style="font-size:20px;color:var(--muted)"> điểm</span></div><div class="note">${r.geo_pct>=T_GEO?'đang dư so với ngưỡng':'cần cải thiện để đạt ngưỡng'}</div></div>`}
  </div>`;
  h+=`<div class="card"><h2>Tỷ lệ Geo Compliance ${isAdmin()?'theo NPP':'· NPP '+esc(role)}</h2>
    <p class="cap">Cột đỏ = dưới ngưỡng ${num(T_GEO,0)}%. Mẫu số đã loại các đơn dùng tài khoản DSA.</p>
    ${hbar(items,{max:100,thr:T_GEO,thrLabel:'ngưỡng '+num(T_GEO,0)+'%',a11y:'Tỷ lệ Geo Compliance theo NPP: '+items.map(d=>d.k+' '+pct(d.v)).join(', ')})}</div>`;
  h+=`<div class="card"><h2>Vì sao Geo Compliance lỗi — tách theo từng điều kiện</h2>
    <p class="cap">Một đơn có thể phạm nhiều hơn 1 điều kiện cùng lúc, nên tổng ba cột giữa <b>lớn hơn</b> cột "Đơn không đạt Geo". Cột áp chót là phần <b>CHỈ</b> lỗi vì ngoài giờ dù vị trí hoàn toàn đúng.</p>
    <div class="wrap"><table class="rt"><thead><tr><th scope="col">NPP</th><th scope="col" class="n">Đơn không đạt Geo</th><th scope="col" class="n">(1) Lệch vị trí &gt;${fmt(T_RAD)}m</th><th scope="col" class="n">(2) Outlet→outlet ≤${fmt(TH.geo_gap_min??2)} phút</th><th scope="col" class="n">(3) Ngoài giờ ${esc(WH_TXT)}</th><th scope="col" class="n">— CHỈ do ngoài giờ</th><th scope="col" class="n">— trong đó chưa có giờ giao</th></tr></thead><tbody>
    ${SB().filter(x=>isAdmin()||x.npp===role).map(x=>{const nd=(DATA.wh_detail&&DATA.wh_detail.by_npp||[]).find(b=>b.npp===x.npp);
      return `<tr><td data-l="NPP"><b>${esc(x.npp)}</b></td><td class="n" data-l="Đơn không đạt Geo">${fmt(x.geo_fail)}</td>
      <td class="n" data-l="(1) Lệch vị trí">${x.geo_v_fail?fmt(x.geo_v_fail):'—'}</td><td class="n" data-l="(2) Outlet→outlet quá gần">${x.geo_w_fail?fmt(x.geo_w_fail):'—'}</td>
      <td class="n" data-l="(3) Ngoài giờ">${x.geo_x_fail?fmt(x.geo_x_fail):'—'}</td>
      <td class="n" data-l="CHỈ do ngoài giờ">${x.geo_x_only?`<b style="color:var(--warn-ink)">${fmt(x.geo_x_only)}</b>`:'—'}</td>
      <td class="n" data-l="trong đó chưa có giờ giao">${nd&&nd.nodate?`<b style="color:var(--crit)">${fmt(nd.nodate)}</b>`:'—'}</td></tr>`;}).join('')}
    ${isAdmin()?`<tr style="background:var(--plane)"><td data-l="NPP"><b>Toàn vùng</b></td><td class="n" data-l="Đơn không đạt Geo"><b>${fmt(DATA.total.geo_fail)}</b></td>
      <td class="n" data-l="(1)"><b>${fmt(DATA.total.geo_v_fail)}</b></td><td class="n" data-l="(2)"><b>${fmt(DATA.total.geo_w_fail)}</b></td>
      <td class="n" data-l="(3)"><b>${fmt(DATA.total.geo_x_fail)}</b></td><td class="n" data-l="CHỈ do ngoài giờ"><b style="color:var(--warn-ink)">${fmt(DATA.total.geo_x_only)}</b></td>
      <td class="n" data-l="chưa có giờ giao"><b style="color:var(--crit)">${fmt(DATA.wh_detail?DATA.wh_detail.x_only_nodate:0)}</b></td></tr>`:''}
    </tbody></table></div>
    <p class="cap" style="margin-top:10px">${isAdmin()?`Toàn vùng có <b>${fmt(DATA.total.geo_x_only)} đơn</b> (trong tổng ${fmt(DATA.total.geo_fail)} đơn không đạt Geo) trượt <b>chỉ vì</b> hoàn tất ngoài khung giờ — đây là vấn đề <b>lịch xuất bến</b>, khác hẳn nguyên nhân sai GPS. Không nên gộp chung khi đi tìm nguyên nhân với NPP.`
      :(r.geo_x_only?`NPP ${esc(role)} có <b>${fmt(r.geo_x_only)} đơn</b> (trong tổng ${fmt(r.geo_fail)} đơn không đạt Geo) trượt <b>chỉ vì</b> hoàn tất ngoài khung giờ, vị trí hoàn toàn đúng — nên rà lịch xuất bến trước khi nghi ngờ GPS.`
      :`NPP ${esc(role)} không có đơn nào lỗi Geo do riêng nguyên nhân ngoài giờ.`)}</p>
    ${(()=>{const nd=(DATA.wh_detail&&DATA.wh_detail.by_npp||[]).find(b=>b.npp===(isAdmin()?cur:role));
      const n = isAdmin()&&cur==='ALL' ? (DATA.wh_detail?DATA.wh_detail.x_only_nodate:0) : (nd?nd.nodate:0);
      const of= isAdmin()&&cur==='ALL' ? (DATA.wh_detail?DATA.wh_detail.x_only:0) : (nd?nd.x_only:0);
      if(!n) return '';
      return `<p class="cap" style="margin:10px 0 0;border-left:3px solid var(--crit);padding-left:11px">
      <b>Cảnh báo tính oan:</b> trong ${fmt(of)} đơn "chỉ lỗi vì ngoài giờ" có <b>${fmt(n)} đơn thực chất KHÔNG CÓ giờ giao trong file</b>
      (đơn còn ở trạng thái Loading Confirmed / Order Scheduled / Cancelled — tức <b>chưa giao xong</b>, không phải giao ban đêm).
      Các đơn này bị đánh lỗi vì <b>thiếu dữ liệu để đối chiếu</b>. Đây là <b>lỗi phương pháp</b>, không phải lỗi vận hành${n===of?' — toàn bộ nhóm này thuộc diện đó':''}. Cần chốt ${L.scope} trước khi dùng con số này.</p>`;})()}</div>`;
    h+=(()=>{ if(!isAdmin()||!DATA.wh_detail||!DATA.wh_detail.hours.length) return '';
      const H=DATA.wh_detail, tot=H.hours.reduce((a,b)=>a+b.n,0);
      const items=H.hours.map(x=>({k:String(x.h).padStart(2,'0')+':00–'+String(x.h).padStart(2,'0')+':59', v:x.n,
        color:x.h===T_WE?'var(--s4)':'var(--crit)',
        tip:`<b>${String(x.h).padStart(2,'0')}h</b><div class="r">${fmt(x.n)} đơn (${pct(x.n/tot*100)} số đơn ngoài giờ đo được)</div>`}));
      return `<div class="card"><h2>Điều kiện (3) — các đơn ngoài giờ lệch ngưỡng bao xa?</h2>
      <p class="cap">Quy tắc là hoàn tất trong khung <b>${esc(WH_TXT)}</b>. Nhưng "lố 3 phút" và "giao lúc 22h" đang bị chấm <b>giống hệt nhau</b>.
      Biểu đồ dưới đếm theo giờ hoàn tất thật để thấy phần lớn vi phạm nằm ở đâu.</p>
      <div class="grid g4" style="margin-bottom:14px">
        <div class="tile"><div class="lbl">Đơn lỗi điều kiện giờ làm việc</div><div class="val">${fmt(H.x_fail)}</div><div class="note">trong ${L.scope} của Geo (đã loại DSA)</div></div>
        <div class="tile" style="border-color:rgba(208,59,59,.4)"><div class="lbl">Không có giờ giao trong file</div><div class="val" style="color:var(--crit)">${fmt(H.x_fail_nodate)}</div><div class="note">bị đánh lỗi vì <b>thiếu dữ liệu</b>, không phải vì giao ngoài giờ</div></div>
        <div class="tile" style="border-color:rgba(250,178,25,.45)"><div class="lbl">Hoàn tất trong giờ đầu sau ${fmt(T_WE)}h</div><div class="val" style="color:var(--warn-ink)">${fmt(H.late_hour_1)}</div><div class="note">chỉ lố ngưỡng dưới 1 tiếng · ${pct(H.late_hour_1/Math.max(1,tot)*100)} số đơn đo được</div></div>
        <div class="tile"><div class="lbl">Đo được giờ hoàn tất</div><div class="val">${fmt(tot)}</div><div class="note">= ${fmt(H.x_fail)} − ${fmt(H.x_fail_nodate)} đơn thiếu giờ giao</div></div>
      </div>
      ${vbar(items,{h:240,a11y:'Số đơn ngoài giờ làm việc theo giờ hoàn tất: '+items.map(i=>i.k+' '+fmt(i.v)+' đơn').join(', ')})}
      <p class="cap" style="margin-top:10px"><b>Recommendation:</b> đề nghị ${L.owner} chốt hai điểm khi ban hành quy tắc giờ làm việc bằng văn bản:
      <b>(1)</b> đơn <b>không có giờ giao</b> phải bị loại khỏi điều kiện này (hiện đang tự động đánh lỗi ${fmt(H.x_fail_nodate)} đơn vì thiếu dữ liệu);
      <b>(2)</b> cân nhắc <b>dung sai</b> cho nhóm hoàn tất trong giờ đầu sau ${fmt(T_WE)}h (${fmt(H.late_hour_1)} đơn) — đây là chuyến kết thúc muộn vài phút, khác hẳn giao lúc 22h.</p></div>`;})();
  h+=outletCard();
  h+=`<div class="card"><h2>Phân bố sai lệch vị trí</h2>
    <p class="cap">Chỉ nhóm 0–${fmt(T_RAD)}m đạt <b>điều kiện (1)</b> — một đơn nằm trong nhóm này <b>vẫn có thể không đạt Geo</b> nếu phạm điều kiện (2) hoặc (3). Đã loại các đơn dùng tài khoản DSA để khớp mẫu số.</p>
    ${vbar(gd.map((b,i)=>({k:b.label,v:b.n,color:seq[i],tip:`<b>${esc(b.label)}</b><div class="r">${fmt(b.n)} đơn</div>`})),{h:250,
      a11y:'Phân bố sai lệch vị trí: '+gd.map(b=>b.label+' có '+fmt(b.n)+' đơn').join(', ')})}
    <p class="cap" style="margin-top:10px"><b>Fact quan trọng:</b> tiêu đề cột trong file ghi "bán kính &lt;200m" nhưng giá trị đạt lớn nhất thực tế là <b>${DATA.dq.v_label_max_pass}m</b> — công thức đang chạy đúng ngưỡng <b>&lt;${fmt(T_RAD)}m</b> như logic KPI gốc. Đề nghị sửa lại nhãn cột để tránh hiểu nhầm khi bàn giao.</p></div>`;

  h+=`<div class="card"><h2>Kịch bản: nếu áp ngưỡng ${fmt(T_RAD)}m hay 200m?</h2>
    <p class="cap">Nhãn cột (&lt;200m) và công thức thực tế (&lt;${fmt(T_RAD)}m) đang mâu thuẫn — <b>rủi ro công bằng</b>, cần ${L.owner} chốt trước khi kết quả dùng cho DIP. ${fmt(gd[1].n)} đơn nằm trong khoảng ${fmt(T_RAD)}–200m sẽ đổi trạng thái. Kịch bản này <b>chỉ đổi ngưỡng khoảng cách</b>, hai điều kiện còn lại giữ nguyên.</p>
    <div class="wrap"><table class="rt"><thead><tr><th scope="col">NPP</th><th scope="col" class="n">Geo (&lt;${fmt(T_RAD)}m — đang áp dụng)</th><th scope="col">Kết quả</th><th scope="col" class="n">Geo (&lt;200m — theo nhãn cột)</th><th scope="col">Kết quả</th><th scope="col">Data Accuracy tổng</th></tr></thead><tbody>
    ${DATA.scen.filter(x=>isAdmin()||x.npp===role).map(x=>`<tr><td data-l="NPP"><b>${esc(x.npp)}</b></td><td class="n" data-l="Geo 50m">${pct(x.geo50)}</td><td data-l="Kết quả">${chip(x.v50)}</td>
      <td class="n" data-l="Geo 200m">${pct(x.geo200)}</td><td data-l="Kết quả">${chip(x.v200)}</td>
      <td data-l="Data Accuracy tổng">${x.overall50===x.overall200?`<span style="color:var(--muted)">không đổi · ${x.overall50==='PASS'?L.pass:L.fail}</span>`:chip(x.overall200,'ĐỔI THÀNH '+(x.overall200==='PASS'?L.pass:L.fail))}</td></tr>`).join('')}
    ${isAdmin()?`<tr style="background:var(--plane)"><td data-l="NPP"><b>Toàn vùng</b></td><td class="n" data-l="Geo 50m"><b>${pct(DATA.scen_total.geo50)}</b></td><td data-l="Kết quả">${chip(DATA.scen_total.geo50>=T_GEO?'PASS':'FAIL')}</td>
      <td class="n" data-l="Geo 200m"><b>${pct(DATA.scen_total.geo200)}</b></td><td data-l="Kết quả">${chip(DATA.scen_total.geo200>=T_GEO?'PASS':'FAIL')}</td><td data-l="Data Accuracy tổng"></td></tr>`:''}
    </tbody></table></div>
    <p class="cap" style="margin-top:10px"><b>Kết luận:</b> ${isAdmin()
      ? (()=>{const kpiFlip=DATA.scen.filter(x=>x.v50!==x.v200), allFlip=DATA.scen.filter(x=>x.overall50!==x.overall200);
          const p1 = kpiFlip.length
            ? `đổi ngưỡng làm <b>${kpiFlip.map(x=>x.npp).join(', ')}</b> chuyển Geo từ KHÔNG ĐẠT sang ĐẠT.`
            : `đổi ngưỡng không làm NPP nào thay đổi kết quả Geo.`;
          const p2 = allFlip.length
            ? ` Quan trọng hơn: <b>${allFlip.map(x=>x.npp).join(', ')}</b> đổi luôn kết quả Data Accuracy tổng — nghĩa là <b>ngưỡng này ảnh hưởng trực tiếp tới chi trả DIP kỳ này</b> và phải được ${L.owner} chốt bằng văn bản trước khi công bố.`
            : ` Kết quả cuối cùng của cả ${DATA.scen.length} NPP không đổi — tranh cãi ngưỡng này chưa ảnh hưởng chi trả DIP kỳ này, nhưng vẫn phải chốt cho các kỳ sau.`;
          return p1+p2;})()
      : (()=>{const sx=DATA.scen.find(x=>x.npp===role);
          return sx.v50===sx.v200
            ? `với NPP ${esc(role)}, đổi ngưỡng <b>không làm thay đổi</b> kết quả Geo (${pct(sx.geo50)} → ${pct(sx.geo200)}, vẫn ${sx.v50==='PASS'?L.pass:L.fail}).`
            : `với NPP ${esc(role)}, đổi ngưỡng làm Geo chuyển từ <b>${sx.v50==='PASS'?L.pass:L.fail}</b> (${pct(sx.geo50)}) sang <b>${sx.v200==='PASS'?L.pass:L.fail}</b> (${pct(sx.geo200)}) — cần ${L.owner} chốt ngưỡng trước khi kết quả dùng cho DIP.`;})()}</p></div>`;
  return h;
}

function pOntime(){
  const r=row();
  const items=SB().map(x=>({k:x.npp,v:x.ot_pct,color:x.v_ontime==='FAIL'?'var(--crit)':'var(--brand)',
    tip:`<b>${esc(x.npp)}</b><div class="r">Đúng hạn: <b>${pct(x.ot_pct)}</b></div><div class="r">Đơn trễ: <b>${fmt(x.ot_fail)}</b>/${fmt(x.orders)}</div>`}));
  let h=`<div class="banner"><b>Định nghĩa nghiệp vụ:</b> ON TIME = đơn được <b>giao thành công trong vòng 24 giờ (hoặc 48 giờ tuỳ nhóm điểm bán) kể từ thời điểm điểm bán đặt hàng</b> — đây là cam kết dịch vụ (SLA) với điểm bán.<br>
<b>Cách chấm:</b> hệ thống TMS đã tính sẵn SLA này và kết tinh vào cột <b><span class="formula">is_ontime</span></b> (1 = đúng hạn, 0 = quá hạn); báo cáo lấy <b>thẳng kết quả đó</b>. ON TIME và SUCCESSFUL dùng chung cột này, ngưỡng &gt;${num(T_OT,0)}% cho cả hai.</div>`;
  h+=`<div class="grid g4" style="margin-bottom:18px">
   ${(()=>{const C=(cur!=='ALL'||!isAdmin())?DATA.ci_half[isAdmin()?cur:role]:null;
     const ci=C&&C.ot_ci&&C.ot_ci[0]!=null?`<div class="note">Sai số 95%: <b>${pct(C.ot_ci[0])} – ${pct(C.ot_ci[1])}</b></div>`:'';
     return `<div class="tile hero ${r.v_ontime==='FAIL'?'bad':''}"><div class="lbl">On time / Successful</div><div class="val">${pct(r.ot_pct)}</div>
       <div class="note">${chip(r.v_ontime)} · ngưỡng &gt;${num(T_OT,0)}%</div>${ci}</div>`;})()}
   <div class="tile"><div class="lbl">Đơn quá hạn cam kết</div><div class="val">${fmt(r.ot_fail)}</div><div class="note">trên ${fmt(r.orders)} đơn · cam kết 24h/48h từ lúc đặt hàng</div></div>
   ${isAdmin()?`<div class="tile"><div class="lbl">NPP không đạt</div><div class="val">${DATA.scorecard.filter(x=>x.v_ontime==='FAIL').length}<span style="font-size:20px;color:var(--muted)">/${DATA.scorecard.length}</span></div><div class="note">${DATA.scorecard.filter(x=>x.v_ontime==='FAIL').map(x=>x.npp).join(', ')||'—'}</div></div>`
    :`<div class="tile"><div class="lbl">Cách ngưỡng ${num(T_OT,0)}%</div><div class="val">${sgn(r.ot_pct-T_OT)}<span style="font-size:20px;color:var(--muted)"> điểm</span></div><div class="note">${r.ot_pct>T_OT?'đang dư so với ngưỡng':'cần cải thiện để đạt ngưỡng'}</div></div>`}
   <div class="tile"><div class="lbl">Giao ngoài giờ ${esc(WH_TXT)}</div><div class="val">${fmt(r.wh_fail)}</div><div class="note">không liên quan On time — đây là <b>điều kiện (3) của Geo Compliance</b>, xem Chi tiết KPI › Geo Compliance</div></div>
  </div>`;
  h+=`<div class="card"><h2>Tỷ lệ giao trong cam kết ${isAdmin()?'theo NPP':'· NPP '+esc(role)}</h2><p class="cap">Cột đỏ = dưới ngưỡng ${num(T_OT,0)}%.</p>
    ${hbar(items,{max:100,thr:T_OT,thrLabel:'ngưỡng '+num(T_OT,0)+'%',a11y:'Tỷ lệ giao trong cam kết theo NPP: '+items.map(d=>d.k+' '+pct(d.v)).join(', ')})}
    ${tableOf(['NPP','Tỷ lệ trong cam kết','Đơn quá hạn','Kết quả'], items.map(d=>{const x=SC[d.k];
       return [x.npp,pct(x.ot_pct),fmt(x.ot_fail),chip(x.v_ontime)];}),'Bảng dữ liệu giao đúng hạn theo NPP')}</div>`;
  h+=`<div class="card"><h2>Đối chiếu cột <span class="formula">is_ontime</span> — kiểm chứng độ tin cậy</h2>
    <p class="cap">Đã soát toàn bộ ${fmt(DATA.otif_check.rows)} dòng để chắc chắn cột này nhất quán với ngày giao / ngày hứa, trước khi dùng làm căn cứ chấm điểm.</p>
    <div class="wrap"><table class="rt"><caption class="sr-only">Kết quả đối chiếu cột OTIF</caption>
    <thead><tr><th scope="col">Phép đối chiếu</th><th scope="col" class="n">Số dòng lệch</th><th scope="col">Kết luận</th></tr></thead><tbody>
    <tr><th scope="row" data-l="Phép đối chiếu">Cột <span class="formula">is_ontime</span> chỉ nhận giá trị 0 hoặc 1</th>
      <td class="n" data-l="Số dòng lệch">${fmt(DATA.otif_check.num_vs_text_mismatch)}</td><td data-l="Kết luận">${chip('PASS','Khớp tuyệt đối')}</td></tr>
    <tr><th scope="row" data-l="Phép đối chiếu">Đơn lỗi <b>có</b> ngày giao, nhưng thực tế không trễ (trong ${fmt(DATA.otif_check.fail_checkable)} đơn đối chiếu được)</th>
      <td class="n" data-l="Số dòng lệch">${fmt(DATA.otif_check.fail_not_late)}</td><td data-l="Kết luận">${chip(DATA.otif_check.fail_not_late?'FAIL':'PASS',DATA.otif_check.fail_not_late?'Cần rà lại':'Không có đơn nào bị tính oan')}</td></tr>
    <tr><th scope="row" data-l="Phép đối chiếu">Đơn đạt nhưng thực tế <b>có</b> giao sau ngày hứa</th>
      <td class="n" data-l="Số dòng lệch">${fmt(DATA.otif_check.pass_but_late)}</td><td data-l="Kết luận">${chip(DATA.otif_check.pass_but_late?'FAIL':'PASS',DATA.otif_check.pass_but_late?'Cần rà lại':'Không có đơn nào bị bỏ sót')}</td></tr>
    <tr><th scope="row" data-l="Phép đối chiếu">Đơn lỗi <b>không có ngày giao</b> nên không đối chiếu được</th>
      <td class="n" data-l="Số dòng lệch">${fmt(DATA.otif_check.fail_no_deliverdate)}</td><td data-l="Kết luận">${chip('GAP','Cần rà lại')}</td></tr>
    </tbody></table></div>
    <p class="cap" style="margin-top:10px;border-left:3px solid var(--warn);padding-left:11px"><b>Điểm cần ${L.owner} xem lại:</b> ${fmt(DATA.otif_check.fail_no_deliverdate)} đơn bị đánh lỗi <b>nhưng không có ngày giao trong file</b> — trạng thái của chúng là ${Object.entries(DATA.otif_check.nodate_status).map(([k,v])=>esc(k)+' '+v).join(' · ')||'—'}. Phần lớn là đơn <b>chưa giao xong</b> chứ không phải giao trễ.</p>
    ${(()=>{const P=DATA.pop_scen; if(!P||!P.n_out) return '';
      const mine=isAdmin()&&cur==='ALL', sc=mine?null:(isAdmin()?cur:role);
      const rw=P.rows.filter(x=>!sc||x.npp===sc);
      const o=mine?{ot0:P.ot0,ot1:P.ot1,geo0:P.geo0,geo1:P.geo1}:rw[0]&&{ot0:rw[0].ot0,ot1:rw[0].ot1,geo0:rw[0].geo0,geo1:rw[0].geo1};
      if(!o) return '';
      return `<p class="cap" style="margin-top:10px;border-left:3px solid var(--crit);padding-left:11px">
      <b>Đã lượng hoá tác động:</b> toàn bộ <b>${fmt(P.n_out)} đơn chưa ở trạng thái Delivered</b>
      (${Object.entries(P.status).map(([k,v])=>esc(k)+' '+v).join(' · ')}) hiện <b>đều</b> bị đánh quá hạn
      (${fmt(P.ot_fail_in_out)} đơn) và <b>${fmt(P.geo_fail_in_out)} đơn</b> trong số đó còn bị tính thêm lỗi Geo —
      tức NPP đang bị trừ điểm cho những đơn <b>chưa giao xong</b>.
      Nếu chốt ${L.scope} = chỉ đơn Delivered: ${sc?`NPP ${esc(sc)} có On-time ${pct(o.ot0)} → <b>${pct(o.ot1)}</b>, Geo ${pct(o.geo0)} → <b>${pct(o.geo1)}</b>.`
        :`On-time toàn vùng ${pct(P.ot0)} → <b>${pct(P.ot1)}</b>, Geo toàn vùng ${pct(P.geo0)} → <b>${pct(P.geo1)}</b>.`}
      ${isAdmin()
        ? `${P.flips_geo.length?`<b>Quan trọng: ${P.flips_geo.join(', ')} đổi kết quả Geo sang ĐẠT.</b>`:''}
           ${P.flips_ot.length?`<b>${P.flips_ot.join(', ')} đổi kết quả On-time.</b>`:''}`
        : `${rw[0]&&rw[0].vg0!==rw[0].vg1?`<b>Quan trọng: kết quả Geo của NPP ${esc(sc)} đổi từ KHÔNG ĐẠT sang ĐẠT.</b>`:''}
           ${rw[0]&&rw[0].vo0!==rw[0].vo1?`<b>Kết quả On-time của NPP ${esc(sc)} cũng đổi.</b>`:''}`}
      Đây là điểm mở <b>có ảnh hưởng thật tới kết quả</b>, cần ${L.owner} chốt bằng văn bản.</p>`;})()}
    </div>`;
  h+=(()=>{const LD=DATA.late_by[cur==='ALL'&&isAdmin()?'ALL':cur]||[];
    if(!LD.length) return '';
    const tot=LD.reduce((a,b)=>a+b.n,0);
    return `<div class="card"><h2>Các đơn quá hạn bao lâu</h2>
    <p class="cap">Chỉ để tham khảo, không ảnh hưởng điểm. Toàn bộ ${fmt(tot)} đơn dưới đây đều đã tính là không đạt.</p>
    ${vbar(LD.map(x=>({k:x.d==null?'chưa có ngày giao':'trễ '+x.d+' ngày',v:x.n,
        color:x.d==null?'var(--warn-ink)':(x.d<=1?'var(--s2)':'var(--crit)'),
        tip:x.d==null?`<b>Chưa có ngày giao</b><div class="r">${fmt(x.n)} đơn — bị đánh lỗi nhưng file không ghi ngày giao</div>`
                     :`<b>Trễ ${x.d} ngày</b><div class="r">${fmt(x.n)} đơn (${pct(x.n/tot*100)} số đơn trễ)</div>`})),
      {h:230,a11y:'Phân bố số ngày trễ: '+LD.map(x=>x.d==null?`chưa có ngày giao ${x.n} đơn`:`trễ ${x.d} ngày có ${x.n} đơn`).join(', ')})}
    <p class="cap" style="margin-top:10px">${LD[0]&&LD[0].d===1?`<b>${fmt(LD[0].n)}/${fmt(tot)} đơn (${pct(LD[0].n/tot*100)}) chỉ trễ đúng 1 ngày</b> — thường là đơn chỉ lố khung cam kết vài giờ. Đây là nhóm dễ kéo về đúng hạn nhất: rút ngắn khâu chốt đơn hoặc soạn hàng, không cần chạy nhanh hơn.`:''}
    ${(()=>{const nd=LD.find(x=>x.d==null); return nd?` Riêng <b>${fmt(nd.n)} đơn chưa có ngày giao</b> (cột vàng) là đơn chưa hoàn tất, không phải giao trễ — nên tách riêng khi họp với đội giao hàng.`:'';})()}</p></div>`;})();
  h+=`<div class="card"><h2>Ghi chú phương pháp</h2><ul class="tight">
    <li><b>Recommendation:</b> logic gốc định nghĩa SUCCESSFUL = <span class="formula">Total Successful Orders / Total Assigned Orders</span> — tức đo <i>giao được hay không</i>, khác với ON TIME đo <i>giao có kịp hạn không</i>. Dùng chung cột OTIF khiến tiêu chí này mất ý nghĩa độc lập.</li>
    <li>Dữ liệu sẵn có để tách: cột <span class="formula">Status</span> — ${fmt(DATA.dq.status['Delivered']||0)} đơn Delivered / ${fmt(DATA.meta.orders)} đơn (${pct((DATA.dq.status['Delivered']||0)/DATA.meta.orders*100)}). Chỉ cần chốt định nghĩa "Assigned Orders" là bật được tiêu chí riêng.</li>
    <li><b>Đã chốt:</b> lấy cột OTIF làm căn cứ duy nhất cho ON TIME. Cột này là kết quả hệ thống chấm theo SLA <b>24h/48h kể từ lúc điểm bán đặt hàng</b>.</li>
    <li><b>Đồng hồ SLA bao gồm cả khâu nội bộ:</b> tính từ lúc điểm bán đặt hàng, nên thời gian chốt đơn ở DSA và soạn hàng ở kho đều nằm trong khung cam kết. Khi phân tích đơn quá hạn, cần rà cả chuỗi <i>đặt hàng → soạn hàng → xuất bến → giao</i>, không chỉ khâu vận chuyển.</li>
  </ul></div>`;
  return h;
}

/* v47 · M4: kết luận cho tab Xu hướng. Mỗi dòng chỉ dùng số có sẵn:
   - ngày Geo thấp nhất và số ngày dưới ngưỡng: lấy từ DATA.daily (tỷ lệ của chính ngày đó);
   - nửa đầu/nửa sau: lấy từ DATA.ci_half (không có dòng ALL nên vai toàn vùng đếm theo NPP). */
function trendNote(dl){
  const SM=100; /* ngày dưới 100 đơn: cỡ mẫu nhỏ, đã ghi chú sẵn trong biểu đồ */
  const big=dl.filter(d=>d.orders>=SM), pool=big.length?big:dl;
  const low=pool.slice().sort((a,b)=>a.geo-b.geo)[0];
  const dGeo=dl.filter(d=>d.geo<T_GEO).length, dOt=dl.filter(d=>d.ot<=T_OT).length;
  const items=[];
  if(low) items.push(`<b>Ngày cần xem lại:</b> ${esc(low.day)} — Geo ${pct(low.geo)} · On time ${pct(low.ot)} (${fmt(low.orders)} đơn)`);
  items.push(`<b>Số ngày dưới ngưỡng:</b> Geo ${fmt(dGeo)}/${fmt(dl.length)} ngày · On time ${fmt(dOt)}/${fmt(dl.length)} ngày`);
  const H=DATA.ci_half||{}, MH=DATA.half_meta||{};
  if(cur!=='ALL' && H[cur]){
    const h=H[cur], ar=(a,b)=>a==null||b==null?'—':`${pct(a)} → <b>${pct(b)}</b> ${b>=a?'▲':'▼'}${num(Math.abs(b-a),2)} điểm`;
    items.push(`<b>Nửa đầu → nửa sau:</b> Geo ${ar(h.geo_h1,h.geo_h2)} · On time ${ar(h.ot_h1,h.ot_h2)}`);
  } else {
    const g=SB().filter(x=>H[x.npp]&&H[x.npp].geo_h2!=null&&H[x.npp].geo_h2<T_GEO).map(x=>x.npp);
    const o=SB().filter(x=>H[x.npp]&&H[x.npp].ot_h2!=null&&H[x.npp].ot_h2<=T_OT).map(x=>x.npp);
    if(g.length) items.push(`<b>Nửa sau kỳ dưới ngưỡng Geo:</b> ${fmt(g.length)}/${fmt(SB().length)} NPP — <b>${g.map(esc).join(' · ')}</b>`);
    if(o.length) items.push(`<b>Nửa sau kỳ dưới ngưỡng On time:</b> ${fmt(o.length)}/${fmt(SB().length)} NPP — <b>${o.map(esc).join(' · ')}</b>`);
  }
  return `<div class="card trnote"><h2>Kết luận nhanh</h2>
    <ul class="trn">${items.map(t=>`<li>${t}</li>`).join('')}</ul>
    <p class="cap">Mỗi ô là tỷ lệ của chính ngày (hoặc nửa kỳ) đó, không phải kết quả cả kỳ. Kỳ này chỉ ${fmt(DATA.meta.days)} ngày
    và ${esc(MH.p1||'nửa đầu')} / ${esc(MH.p2||'nửa sau')} mỗi nửa chỉ vài ngày — đọc như tín hiệu, chưa phải xu hướng.</p></div>`;
}
function pTrend(){
  const dl=DATA.daily[cur]||DATA.daily['ALL'];
  const days=dl.map(d=>d.day);
  const series=[{n:'Geo',c:'var(--s1)',d:'none',v:dl.map(d=>d.geo)},
                {n:'On time',c:'var(--s2)',d:'7 4',v:dl.map(d=>d.ot)},
                {n:'Distance & Time',c:'var(--s3)',d:'2 3',v:dl.map(d=>d.dt)}];
  const vol=dl.map(d=>d.orders);
  let h=`<div class="banner">Diễn biến 3 tiêu chí theo ngày giao — dùng để phát hiện <b>ngày bất thường</b> (sự cố GPS, lỗi gửi dữ liệu theo lô) thay vì chỉ nhìn số trung bình tháng.</div>`;
  h+=trendNote(dl);
  h+=`<div class="card"><h2>Xu hướng theo ngày · ${cur==='ALL'?'toàn vùng':esc(cur)}</h2>
    <p class="cap">Trục dọc cắt từ 60%. Di chuột để xem từng ngày.</p>
    <div class="legend">${series.map(s=>`<span><i style="background:${s.c}"></i>${s.n}</span>`).join('')}
      <span><i style="background:var(--down)"></i>Ngưỡng</span></div>
    ${lines(days,series,{vol,thresholds:[{v:T_GEO,label:'Geo ≥'+num(T_GEO,0)+'%',c:'var(--s1)'},{v:T_OT,label:'On time >'+num(T_OT,0)+'%',c:'var(--s2)'}],
      a11y:'Diễn biến 3 tiêu chí theo ngày. '+series.map(s=>s.n+' ngày cuối '+pct(s.v[s.v.length-1])).join('; ')})}
    <p class="cap" style="margin-top:10px">Ngày có dưới 100 đơn được đánh dấu chấm rỗng — tỷ lệ ngày đó dao động mạnh do mẫu nhỏ, không nên diễn giải như xu hướng.</p></div>`;
  h+=`<div class="card"><h2>Sản lượng giao theo ngày</h2><p class="cap">Số đơn mỗi ngày.</p>
    ${vbar(dl.map(d=>({k:d.day,v:d.orders,tip:`<b>${esc(d.day)}</b><div class="r">${fmt(d.orders)} đơn</div><div class="r">Geo ${pct(d.geo)} · On time ${pct(d.ot)}</div>`})),{h:250,
      a11y:'Số đơn giao mỗi ngày: '+dl.map(d=>d.day+' '+fmt(d.orders)+' đơn').join(', ')})}</div>`;
  const DW=DATA.dow_by[cur==='ALL'&&isAdmin()?'ALL':cur]||[];
  if(DW.length>=5){
    const worst=[...DW].filter(x=>x.geo!=null).sort((a,b)=>a.geo-b.geo)[0];
    const best=[...DW].filter(x=>x.geo!=null).sort((a,b)=>b.geo-a.geo)[0];
    h+=`<div class="card"><h2>Kết quả theo thứ trong tuần</h2>
    <p class="cap">Nếu một thứ cố định luôn kém hơn thì đó là vấn đề <b>bố trí ca và định tuyến</b>, giải được bằng điều phối — khác hẳn với lỗi rải đều do thói quen tài xế.</p>
    ${hbar(DW.filter(x=>x.geo!=null).map(x=>({k:x.d,v:x.geo,color:x.geo<T_GEO?'var(--crit)':'var(--brand)',
       tip:`<b>${esc(x.d)}</b><div class="r">${fmt(x.orders)} đơn</div><div class="r">Geo <b>${pct(x.geo)}</b> · Đúng hạn <b>${pct(x.ot)}</b></div>`})),
      {max:100,thr:T_GEO,thrLabel:'ngưỡng '+num(T_GEO,0)+'%',w:700,
       a11y:'Geo theo thứ trong tuần: '+DW.filter(x=>x.geo!=null).map(x=>x.d+' '+pct(x.geo)).join(', ')})}
    ${(worst&&best&&(best.geo-worst.geo)>=5)?`<p class="cap" style="margin:10px 0 0"><b>Chênh lệch đáng chú ý:</b> ${esc(worst.d)} chỉ đạt ${pct(worst.geo)} trong khi ${esc(best.d)} đạt ${pct(best.geo)} — cách nhau <b>${num(best.geo-worst.geo)} điểm</b>. Rà lại phân ca, số điểm giao và tuyến chạy của ${esc(worst.d)} trước khi nhắc tài xế.</p>`:''}
    ${tableOf(['Thứ','Số đơn','Geo','Đúng hạn'], DW.map(x=>[x.d,fmt(x.orders),x.geo!=null?pct(x.geo):'–',pct(x.ot)]),'Kết quả theo thứ trong tuần')}
    </div>`;}
  h+=`<div class="card"><h2>Bảng dữ liệu</h2><p class="cap">Bản xem dạng bảng của 2 biểu đồ trên.</p>
    <div class="scroll"><table class="rt"><thead><tr><th scope="col">Ngày</th><th scope="col" class="n">Đơn</th><th scope="col" class="n">Geo</th><th scope="col" class="n">On time</th><th scope="col" class="n">Distance &amp; Time</th></tr></thead><tbody>
    ${dl.map(d=>`<tr><td data-l="Ngày">${esc(d.day)}</td><td class="n" data-l="Đơn">${fmt(d.orders)}</td><td class="n" data-l="Geo">${pct(d.geo)}</td><td class="n" data-l="On time">${pct(d.ot)}</td><td class="n" data-l="Distance & Time">${pct(d.dt)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  return h;
}

/* Bốn thẻ đầu tab Đơn hàng có lỗi.
   Bản cũ chỉ in SỐ LƯỢNG với nền xám giống hệt nhau, nên "GEO 144 đơn" của một NPP
   đang ĐẠT trông y hệt "PAYLOAD 72 chuyến" của một NPP đang TRƯỢT. Bản này gắn
   verdict sẵn có (v_geo/v_ontime/v_dt/v_payload) và khoảng cách tới ngưỡng vào thẻ —
   không tính lại bất kỳ con số nào. */
function esTiles(){
  const r=row(), act=$('#etype')?$('#etype').value:(EF?EF.type:'');
  const mg=(v,t)=>v>=t?`còn dư ${num(v-t,2)} điểm`:`còn thiếu ${num(t-v,2)} điểm`;
  const nFail=k=>DATA.scorecard.filter(x=>x[k]==='FAIL').length;
  const T=[
    {f:'Geo',           n:'Geo Compliance',   v:r.v_geo,     c:r.geo_fail,           u:'đơn không đạt',
     t:`${pct(r.geo_pct)} · ngưỡng ${num(T_GEO,0)}% · ${mg(r.geo_pct,T_GEO)}`},
    {f:'On-time',       n:'On time',          v:r.v_ontime,  c:r.ot_fail,            u:'đơn trễ hạn',
     t:`${pct(r.ot_pct)} · ngưỡng trên ${num(T_OT,0)}% · ${mg(r.ot_pct,T_OT)}`},
    {f:'Distance&Time', n:'Distance & Time',  v:r.v_dt,      c:r.dt_routes_fail,     u:'chuyến hỏng',
     t:`${pct(r.dt_route_fail_pct)} tổng số chuyến · ngưỡng dưới ${fmt(T_DTR_MONTH_PCT)}% · ${mg(100-r.dt_route_fail_pct,100-T_DTR_MONTH_PCT)}`,
     x:nFail('v_dt')},
    {f:'Payload',       n:'Payload',          v:r.v_payload, c:r.payload_plans_fail, u:'chuyến quá tải',
     t:`ngưỡng 100% — không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng`}
  ];
  return T.map(x=>{
    const fail=x.v==='FAIL', mix=!fail&&x.v!=='PASS';
    const cls=(fail?'fail':mix?'mix':'pass')+(x.c===0?' zero':'');
    const bdg=fail?'<span class="es-b bad">✕ KHÔNG ĐẠT</span>'
             :mix ?`<span class="es-b mid">${fmt(x.x||0)}/${fmt(DATA.scorecard.length)} NPP trượt</span>`
                  :'<span class="es-b ok">✓ ĐẠT</span>';
    const on=act===x.f;
    return `<button type="button" class="es ${cls}${on?' on':''}" data-etype="${esc(x.f)}" aria-pressed="${on}"
      title="${on?'Đang lọc theo tiêu chí này — bấm lần nữa để bỏ lọc':'Bấm để lọc bảng theo tiêu chí này'}">
      <span class="es-h"><span class="es-n">${esc(x.n)}</span>${bdg}</span>
      <span class="es-r"><span class="es-v">${fmt(x.c)}</span><span class="es-u">${esc(x.u)}</span></span>
      <span class="es-t">${x.t}</span></button>`;
  }).join('');
}
function pErrors(){
  /* Một câu mở đầu. Mọi giải thích dài đưa vào hai khối gấp — người vào tab này
     đang đi tìm một đơn cụ thể, không đọc hướng dẫn 330 chữ trước khi bắt đầu. */
  let h=`<div class="card"><h2>Đơn hàng có lỗi</h2>
  <p class="cap" style="margin-bottom:10px">Đơn dính ít nhất một tiêu chí. Lọc, rồi tải <b>đúng phần đang lọc</b> ra Excel để đối soát với đội giao hàng.</p>
  <div class="errsum" id="errsum"></div>
  <p class="eslegend">
    <span><i style="background:var(--crit)"></i><b>Thẻ đỏ</b> = tiêu chí đang trượt, đây là phần phải xử lý</span>
    <span>Bấm một thẻ để lọc bảng theo tiêu chí đó.</span></p>
  <details class="dtbl" style="margin-top:0"><summary>Cách đọc bảng này</summary>
    <ul class="tight" style="margin-bottom:6px">
    <li><b>Các tiêu chí độc lập nhau.</b> "Giao trễ hạn" là quá cam kết 24h/48h kể từ lúc điểm bán đặt hàng — không liên quan phút hoàn tất hay lệch vị trí. Một đơn có thể lệch 5m, hoàn tất sau 2 tiếng, mà vẫn trễ hạn vì giao sang ngày hôm sau.</li>
    <li><b>Outlet→outlet</b> = thời gian và khoảng cách so với outlet liền trước <i>trong cùng một chuyến</i>. Thời gian tô đỏ khi &lt;2 phút. Outlet đầu chuyến hiển thị "—" vì không có mốc trước.</li>
    <li><b>Distance &amp; Time</b> đếm theo <b>chuyến</b>: outlet lỗi khi cách outlet trước dưới ${fmt(TH.dt_gap_min??2)} phút, chuyến hỏng khi tỷ lệ outlet lỗi vượt ${fmt(T_DTR_ROUTE_PCT)}% tổng outlet của chuyến. <b>Geo Compliance</b> đếm theo <b>đơn</b>: điều kiện (2) yêu cầu outlet→outlet trên ${fmt(TH.geo_gap_min??2)} phút.</li>
    <li><b>SL</b> = số lượng trên đơn · <b>Code</b> = mã điểm bán · <b>Status</b> = trạng thái đơn trong TMS.
      Ba cột này giữ đúng tên như trong file Excel xuất ra để đối chiếu cho nhanh; cột Status chỉ hiện khi trạng thái
      <b>khác Delivered</b> — đó là các đơn chưa giao xong nhưng vẫn bị chấm.</li>
    <li><b>Gom nhóm theo chuyến:</b> các đơn cùng một chuyến chung một dải màu ở mép trái; dòng đầu khối in đậm mã chuyến, các dòng sau có dấu └.</li>
    <li><b>Sắp xếp:</b> bấm tiêu đề cột — lần nữa đảo chiều, lần thứ ba bỏ sắp xếp. Khi sắp xếp, gom nhóm theo chuyến tự tắt vì các đơn cùng chuyến không còn nằm cạnh nhau.</li>
    </ul></details>
  <details class="dtbl"><summary>File Excel gồm những cột nào</summary>
    <p class="cap" style="margin:8px 0 0">Giữ đúng <b>25 cột của file nguồn <code>${esc(DATA.meta.source||"")}</code></b> theo nguyên thứ tự và tên cột, cộng các cột phân tích ở cuối: Thời gian outlet→outlet · Đơn thứ mấy của chuyến · Tổng đơn của chuyến · Số ngày trễ · Tỷ lệ tải của chuyến · Loại lỗi. File <b>chỉ chứa dữ liệu của NPP đang xem</b>, mở thẳng bằng Excel: đúng cột, ngày ra ngày, số ra số, tiêu đề khoá sẵn kèm bộ lọc.</p></details>
  <p class="cap" id="ecap" style="margin-top:12px"></p>
  <div id="eufilter"></div>
  <div class="f">
    <input id="eq" type="search" aria-label="Tìm theo mã chuyến, xe, username hoặc mã điểm bán" placeholder="Tìm chuyến / xe / username / mã điểm bán…">
    <select id="eday" aria-label="Lọc theo ngày giao"><option value="">Tất cả các ngày</option></select>
    <select id="etype" aria-label="Lọc theo loại lỗi"><option value="">Tất cả loại lỗi</option><option value="Geo">Không đạt Geo</option><option value="On-time">Giao trễ hạn</option><option value="Distance&Time">Distance &amp; Time</option><option value="Payload">Xe quá tải</option></select>
    <label class="pill" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
      <input type="checkbox" id="egap" style="margin:0;accent-color:var(--crit)"> Chỉ outlet cách nhau &lt;2 phút</label>
    <button type="button" class="btn-exp" id="exls">⤓ Tải Excel</button>
    <button type="button" class="btn-csv" id="ecsv">Tải CSV</button>
    <span class="pill" id="ecount" aria-live="polite"></span>
  </div>
  <div class="pager" id="pagerTop">
    <button type="button" data-nav="-1">‹ Trước</button>
    <span class="pinfo"></span>
    <button type="button" data-nav="1">Sau ›</button>
  </div>
  <div id="esortnote"></div>
  <div class="scroll">  <table class="rt"><caption class="sr-only">Danh sách đơn hàng vi phạm tiêu chí, nhóm theo chuyến</caption>
  <thead><tr>${[
    ['NPP','TenantName','s',''],['Mã chuyến','PlanNumber','s',''],['Xe / Username','DriverName','s',''],
    ['Code','OutletCode','s',''],['Outlet','OutletName','s',''],['Ngày giao','DeliverDateTime','dt',''],['Cách outlet trước (phút)','gap_prev_min','n','n'],
    ['Ngày hứa · trễ','late_days','n',''],['Lệch vị trí (m)','distance_to_dropped','n','n'],
    ['SL','Assigned_Quantity','n','n'],['Status','Status','s','']
  ].map(([lbl,k,t,cls])=>`<th scope="col" class="sortable ${cls}" aria-sort="none" data-k="${k}">
      <button type="button" class="sortbtn" data-sort="${k}" data-t="${t}"
        aria-label="Sắp xếp theo ${esc(lbl)}">${esc(lbl)}<span class="sar" aria-hidden="true">⇅</span></button></th>`).join('')}
    <th scope="col">Loại lỗi</th></tr></thead>
  <tbody id="ebody"></tbody></table></div>
  <div class="pager" id="pagerBot">
    <button type="button" data-nav="-1">‹ Trước</button>
    <span class="pinfo"></span>
    <button type="button" data-nav="1">Sau ›</button>
  </div></div>`;
  return h;
}
const isNum = v => v!==null && v!==undefined && !isNaN(v);
const dmy  = v => String(v||'').replace(/:\d{2}$/,'');
const dOnly= v => String(v||'').split(' ')[0];
function gapCell(v){
  if(!isNum(v)) return `<td class="n" data-l="Cách outlet trước (phút)" style="color:var(--muted)" title="Outlet đầu tiên của chuyến — không có mốc trước để tính">—</td>`;
  const txt = Number(v).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});
  return v<2 ? `<td class="n gap-bad" data-l="Cách outlet trước (phút)" title="Cách outlet liền trước dưới 2 phút">${txt}</td>`
             : `<td class="n" data-l="Cách outlet trước (phút)">${txt}</td>`;
}

/* Mỗi lỗi hiện thành một chip riêng kèm con số gây ra lỗi — người xem không phải suy đoán. */
function loiChips(e){
  const LS=String(e.loi||'').split(' + ').filter(Boolean), out=[];
  /* Một nền chung cho mọi chip. Vạch màu bên trái cho biết lỗi thuộc nhóm nào,
     dùng đúng bảng màu của biểu đồ ở tab Tổng quan. */
  const CAT={'Geo':'c-geo','On-time':'c-ot','Distance&Time':'c-dt',
             'Payload':'c-pl','Username':'c-un'};
  const kls=k=>`chip lchip fail ${CAT[k]||'c-un'}`;
  const tit=k=>'Đơn này vi phạm tiêu chí '+k;
  LS.forEach(k=>{
    let txt=k, why='';
    if(k==='On-time'){ txt='Giao trễ hạn';
      why = (isNum(e.late_days)&&e.late_days>0) ? `quá hạn cam kết ${fmt(e.late_days)} ngày` : 'quá hạn cam kết 24h/48h'; }
    else if(k==='Geo'){
      const segs=String(e.geo_why||'').split('; ').filter(Boolean);
      if(!segs.length){ out.push(`<span class="${kls('Geo')}" title="${tit('Geo')}"><strong><span class="xm">✕</span> Không đạt Geo</strong><em>xem cột vị trí/giờ giao</em></span>`); return; }
      segs.forEach(s=>{
        let t2='Không đạt Geo', w2=s;
        if(s.indexOf('Sai vi tri')===0){ t2='Sai vị trí';
          const m=s.match(/lech (\d+)m/); w2 = m?`lệch ${m[1]}m · ngưỡng ${fmt(T_RAD)}m`:`lệch quá ${fmt(T_RAD)}m`; }
        else if(s.indexOf('Outlet toi outlet')===0){ t2='Outlet tới outlet quá gần';
          const m=s.match(/([\d.,]+) phut/); w2 = m?`chỉ ${m[1]} phút · yêu cầu trên ${fmt(TH.geo_gap_min??2)} phút`:'không đo được khoảng cách thời gian'; }
        else if(s.indexOf('Khong do duoc')===0){ t2='Outlet tới outlet quá gần'; w2='không đo được khoảng cách thời gian'; }
        else if(s.indexOf('Ngoai gio lam viec')===0){ t2='Ngoài giờ làm việc';
          const m=s.match(/luc (\d{2}:\d{2})/); w2 = m?`hoàn tất lúc ${m[1]} · chỉ tính ${WH_TXT}`:'thiếu thời điểm giao để đối chiếu giờ'; }
        out.push(`<span class="${kls('Geo')}" title="${tit('Geo')}"><strong><span class="xm">✕</span> ${esc(t2)}</strong><em>${esc(w2)}</em></span>`);
      });
      return;
    }
    else if(k==='Distance&Time'){ txt='Distance & Time';
      why = isNum(e.gap_prev_min)?`cách outlet trước ${num(e.gap_prev_min,1)} phút · ngưỡng ${fmt(TH.dt_gap_min??2)} phút`
                                 :`cách outlet trước dưới ${fmt(TH.dt_gap_min??2)} phút`; }
    else if(k==='Payload'){ txt='Xe quá tải';
      why = isNum(e.plan_ratio)?`cả chuyến chở ${num(e.plan_ratio,2)} lần tải trọng · ngưỡng ${num(T_PLR,1)}`:`chuyến chở quá ${num(T_PLR,1)} lần tải trọng`; }
    else if(k==='Username'){ txt='Sai định dạng tài khoản'; why='không khớp 3 định dạng hợp lệ'; }
    out.push(`<span class="${kls(k)}" title="${tit(k)}"><strong><span class="xm">✕</span> ${esc(txt)}</strong><em>${esc(why)}</em></span>`);
  });
  return out.join('');
}
/* ---------- sắp xếp bảng đơn lỗi ---------- */
let ESORT={key:null,type:'s',dir:1};
const SORT_LBL={TenantName:'NPP',PlanNumber:'Mã chuyến',DriverName:'Xe / Username',
  DeliverDateTime:'Ngày giao',gap_prev_min:'Cách outlet trước',
  late_days:'Số ngày trễ',distance_to_dropped:'Lệch vị trí giao',Assigned_Quantity:'Số lượng',Status:'Status'};
function dtVal(s){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})(?:\s(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(s||''));
  return m ? Date.UTC(+m[3],+m[2]-1,+m[1],+m[4]||0,+m[5]||0,+m[6]||0) : null;
}
function sortRows(rows){
  if(!ESORT.key) return rows;
  const k=ESORT.key, t=ESORT.type, d=ESORT.dir;
  const val=e=>{
    if(t==='dt') return dtVal(e[k]);
    if(t==='n'){ const v=e[k]; return (v===null||v===undefined||isNaN(v))?null:Number(v); }
    const s=e[k]; return (s===null||s===undefined||s==='')?null:String(s).toLowerCase();
  };
  return rows.map((e,i)=>({e,i,v:val(e)})).sort((a,b)=>{
    if(a.v===null&&b.v===null) return a.i-b.i;
    if(a.v===null) return 1;            // ô trống luôn xuống cuối
    if(b.v===null) return -1;
    if(a.v<b.v) return -d; if(a.v>b.v) return d;
    return a.i-b.i;                     // ổn định
  }).map(o=>o.e);
}
function toggleSort(key,type){
  if(ESORT.key===key){
    if(ESORT.dir===-1) ESORT={key:null,type:'s',dir:1};   // lần 3: bỏ sắp xếp
    else ESORT={key,type,dir:-1};
  } else ESORT={key,type,dir:1};
  epage=1; renderErrors();
}
function clearAllFilters(){
  EF={q:'',type:'',gap:false,day:''}; userFilter=''; ESORT={key:null,type:'s',dir:1}; epage=1;
  const q=$('#eq'), t=$('#etype'), g=$('#egap'), dy=$('#eday');
  if(q)q.value=''; if(t)t.value=''; if(g)g.checked=false; if(dy)dy.value='';
  renderErrors();
}
function renderErrors(){
  EF={q:$('#eq')?$('#eq').value:'', type:$('#etype')?$('#etype').value:'', gap:!!($('#egap')&&$('#egap').checked), day:$('#eday')?$('#eday').value:''};
  const _es=$('#errsum'); if(_es) _es.innerHTML=esTiles();
  const q=EF.q.toLowerCase(), t=EF.type, onlyGap=EF.gap, day=EF.day;
  let rows=DATA.errors.filter(e=>cur==='ALL'||e.TenantName===cur);
  const uf=$('#eufilter');
  if(uf){
    uf.innerHTML = userFilter
      ? `<div class="banner" style="margin:0 0 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <span>Đang lọc riêng lỗi của tài khoản <b>${esc(userFilter)}</b>.</span>
          <button type="button" class="btn-csv" id="eufclear" style="min-height:30px;padding:5px 10px">✕ Bỏ lọc tài khoản</button>
        </div>` : '';
    const cb=$('#eufclear'); if(cb) cb.addEventListener('click',()=>{ userFilter=''; epage=1; renderErrors(); });
  }
  if(userFilter) rows=rows.filter(e=>e.username===userFilter);
  if(t) rows=rows.filter(e=>e.loi.includes(t));
  if(day) rows=rows.filter(e=>e.dkey===day);
  if(onlyGap) rows=rows.filter(e=>isNum(e.gap_prev_min) && e.gap_prev_min<2);
  if(q) rows=rows.filter(e=>(e.PlanNumber+' '+(e.DriverName!=null?e.DriverName:'')+' '+e.username+' '+(e.OutletCode!=null?e.OutletCode:'')).toLowerCase().includes(q));
  rows=sortRows(rows);
  ERR_ROWS=rows;
  document.querySelectorAll('#p-errors th.sortable').forEach(th=>{
    const on=th.dataset.k===ESORT.key;
    th.setAttribute('aria-sort', on ? (ESORT.dir===1?'ascending':'descending') : 'none');
    const s=th.querySelector('.sar'); if(s) s.textContent = on ? (ESORT.dir===1?'▲':'▼') : '⇅';
  });
  const sn=$('#esortnote');
  if(sn){
    sn.innerHTML = ESORT.key
      ? `<div class="sortnote"><span>Đang sắp xếp theo <b>${esc(SORT_LBL[ESORT.key]||ESORT.key)}</b>
          ${ESORT.dir===1?'tăng dần':'giảm dần'} — <b>đã tắt gom nhóm theo chuyến</b>. Ô trống xếp cuối.</span>
          <button type="button" class="btn-csv" id="esortclear" style="min-height:30px;padding:5px 10px">✕ Bỏ sắp xếp, gom lại theo chuyến</button></div>`
      : '';
    const cb=$('#esortclear');
    if(cb) cb.addEventListener('click',()=>{ ESORT={key:null,type:'s',dir:1}; epage=1; renderErrors(); });
  }
  const cap=rows.length, nGap=rows.filter(e=>isNum(e.gap_prev_min)&&e.gap_prev_min<2).length;
  const PS=pageSize();
  const pages=Math.max(1,Math.ceil(cap/PS));
  if(epage>pages) epage=pages; if(epage<1) epage=1;
  const from=(epage-1)*PS, shown=rows.slice(from,from+PS);
  $('#ecount').textContent=`${fmt(cap)} đơn · ${fmt(nGap)} đơn cách outlet trước <2 phút`;
  const scopeTxt = (isAdmin() && cur!=='ALL')
    ? ` <span class="escope">Phạm vi: <b>NPP ${esc(cur)}</b> <button type="button" class="btn-csv escope-b" id="eallnpp">Xem tất cả NPP</button></span>` : '';
  $('#ecap').innerHTML = (cap
    ? `Đang xem đơn <b>${fmt(from+1)}–${fmt(from+shown.length)}</b> trong tổng <b>${fmt(cap)}</b> đơn.`
    : '') + scopeTxt;
  /* #ecap vẽ lại mỗi lần lọc nên nút luôn là phần tử mới -> không gắn trùng listener */
  const eall=$('#eallnpp');
  if(eall) eall.addEventListener('click',()=>{ cur='ALL'; $('#rls').value='ALL'; syncMeta();
    userFilter=''; epage=1; render(); say('Đã chuyển sang xem tất cả NPP'); });
  document.querySelectorAll('#p-errors .pager').forEach(pg=>{
    pg.querySelector('.pinfo').textContent=`Trang ${fmt(epage)} / ${fmt(pages)}`;
    pg.querySelector('[data-nav="-1"]').disabled = epage<=1;
    pg.querySelector('[data-nav="1"]').disabled  = epage>=pages;
    pg.hidden = pages<=1;});
  const xb=$('#exls'), csvb=$('#ecsv');
  if(xb){ xb.textContent = cap?`⤓ Tải Excel (${fmt(cap)} đơn)`:'⤓ Không có đơn để tải'; xb.disabled=!cap; }
  if(csvb){ csvb.disabled=!cap; }
  const showNpp = (cur==='ALL' && isAdmin());
  const cnt={}; shown.forEach(e=>cnt[e.PlanNumber]=(cnt[e.PlanNumber]||0)+1);
  const grouped = !ESORT.key;
  let gi=-1, prevPlan=null;
  $('#ebody').innerHTML=shown.map((e,ri)=>{
    const start = grouped && e.PlanNumber!==prevPlan;
    if(start){ gi++; prevPlan=e.PlanNumber; }
    const cls = grouped ? `pg g${gi%2} ${gi%2?'alt':''} ${start?'start':''}` : (ri%2?'alt':'');
    const dot=`<span class="dot" style="background:${gi%2?'var(--grp2)':'var(--grp1)'}"></span>`;
    const planCell = !grouped
      ? `<div class="plan-h" style="font-weight:600">${esc(e.PlanNumber)}</div>
         <div style="margin-top:3px"><span class="rbadge">chuyến ${fmt(e.plan_orders)} đơn</span></div>`
      : start
      ? `<div class="plan-h">${dot}${esc(e.PlanNumber)}</div>
         <div style="margin-top:4px"><span class="rbadge">chuyến ${fmt(e.plan_orders)} đơn · ${fmt(cnt[e.PlanNumber])} dòng ở trang này</span></div>`
      : `<div class="plan-c"><span class="ln">└</span>${esc(e.PlanNumber)}</div>`;
    return `<tr class="${cls}">
    <td data-l="NPP"${showNpp?'':' hidden'}><b>${esc(e.TenantName)}</b></td><td data-l="Mã chuyến">${planCell}</td>
    <td data-l="Xe / Username">${esc(e.DriverName!=null?e.DriverName:'—')}${e.username&&String(e.username)!==String(e.DriverName)?`<div style="color:var(--muted);font-size:11px">${esc(e.username)}</div>`:''}</td>
    <td data-l="Code">${esc(e.OutletCode!=null?e.OutletCode:'—')}</td>
    <td data-l="Outlet" class="outname">${e.OutletName?esc(e.OutletName):'<span class="nooutlet">chưa có tên</span>'}</td>
    <td data-l="Ngày giao">${esc(dmy(e.DeliverDateTime))}<div class="seqn">đơn ${fmt(e.seq1)}/${fmt(e.plan_orders)} của chuyến</div></td>
    ${gapCell(e.gap_prev_min)}<td data-l="Ngày hứa">${esc(dOnly(e.PromisedDate))}${isNum(e.late_days)&&e.late_days>0?`<div class="seqn" style="color:var(--crit);font-weight:700">trễ ${fmt(e.late_days)} ngày</div>`:''}</td>
    <td class="n" data-l="Lệch vị trí (m)">${e.distance_to_dropped==null?'–':fmt(Math.round(e.distance_to_dropped))}</td>
    <td class="n" data-l="Số lượng">${fmt(e.Assigned_Quantity)}</td>
    <td data-l="Status">${e.Status&&e.Status!=='Delivered'?`<span class="est-x">${esc(e.Status)}</span>`:'<span class="seqn">—</span>'}</td>
    <td data-l="Loại lỗi">${loiChips(e)}</td></tr>`;}).join('')
    ||`<tr><td colspan="12"><div class="empty"><b>Không có đơn nào khớp bộ lọc</b>Thử bỏ bớt bộ lọc ngày hoặc loại lỗi.<br>
       <button type="button" class="btn-csv" id="eclearall" style="margin-top:10px">Xoá tất cả bộ lọc</button></div></td></tr>`;
  const ca=$('#eclearall'); if(ca) ca.addEventListener('click',clearAllFilters);
  document.querySelectorAll('#p-errors thead th')[0].hidden = !showNpp;
  const sc=$('#p-errors .scroll'), note=sc&&sc.previousElementSibling;
  if(note&&note.classList.contains('scrollnote')){
    const over = sc.scrollHeight>sc.clientHeight+8;
    note.hidden=!over; sc.classList.toggle('more',over);
    if(over) note.textContent=`Trang này có ${fmt(shown.length)} đơn — cuộn bên trong bảng để xem hết`;
  }
  say(`${fmt(cap)} đơn khớp bộ lọc, đang xem trang ${epage} trên ${pages}`);
}
function scopedRows(){
  /* Chốt chặn phạm vi: NPP đăng nhập chỉ lấy dữ liệu của chính mình, không phụ thuộc bộ lọc trên màn hình */
  const scope = isAdmin() ? cur : role;
  const rows = scope==='ALL' ? ERR_ROWS : ERR_ROWS.filter(e=>e.TenantName===scope);
  return {scope,rows};
}
function fileBase(scope){
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return `TMS_don_loi_${scope==='ALL'?'TAT-CA-NPP':scope}_${p(d.getDate())}${p(d.getMonth()+1)}${d.getFullYear()}`;
}
function saveBlob(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
function exportXlsx(){
  const {scope,rows}=scopedRows();
  if(!rows.length){ say('Không có đơn nào để tải'); return; }
  const cols=DATA.csv_cols;
  const bytes=buildXlsx(cols.map(c=>c[1]), rows, cols.map(c=>c[0]), 'Don loi KPI');
  const name=fileBase(scope)+'.xlsx';
  saveBlob(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);
  say(`Đã tải ${fmt(rows.length)} đơn ra file ${name}`);
}
function exportCsv(){
  const {scope,rows}=scopedRows();
  if(!rows.length){ say('Không có đơn nào để tải'); return; }
  const cols=DATA.csv_cols;
  const q = v => {
    if(v===null||v===undefined||(typeof v==='number'&&isNaN(v))) return '';
    let t=String(v);
    if(/^[=+\-@]/.test(t)) t="'"+t;
    return /[";\n\r]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t;
  };
  /* Dòng "sep=;" báo cho Excel biết ký tự phân cột, để máy dùng dấu phẩy vẫn tách đúng */
  const lines=['sep=;', cols.map(c=>q(c[1])).join(';')];
  rows.forEach(e=>lines.push(cols.map(c=>q(e[c[0]])).join(';')));
  const name=fileBase(scope)+'.csv';
  saveBlob(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),name);
  say(`Đã tải ${fmt(rows.length)} đơn ra file ${name}`);
}

/* v47 · M7: dải thẻ theo mức, dựng TỪ chính bảng phát hiện (không viết lại số liệu),
   và đưa khối "Việc phải chốt" lên trước bảng. */
/* v47 · M8: gấp khối dài trên điện thoại. Chỉ áp cho 2 tab nặng nhất; nội dung vẫn nằm trong DOM
   (tìm kiếm của trình duyệt và bản in vẫn thấy), chỉ giới hạn chiều cao cho tới khi bấm mở. */
const FOLD_PAGES=['kpi','dq'], FOLD_MIN=560, FOLD_KEEP=360;
function mobileFold(el){
  if(innerWidth>640 || !FOLD_PAGES.includes(curPage)) return;
  el.querySelectorAll('.card').forEach(c=>{
    if(c.classList.contains('mf')||c.classList.contains('kpilead')||c.classList.contains('dqtodo')) return;
    if(c.offsetHeight < FOLD_MIN) return;
    const head=c.querySelector('h2'); const name=head?head.textContent.trim():'khối này';
    c.classList.add('mf');
    const b=document.createElement('button');
    b.type='button'; b.className='mf-b'; b.setAttribute('aria-expanded','false');
    b.innerHTML='Xem thêm <span aria-hidden="true">↓</span>';
    b.setAttribute('aria-label','Mở rộng: '+name);
    b.addEventListener('click',()=>{
      const open=c.classList.toggle('mf-o');
      b.setAttribute('aria-expanded',String(open));
      b.innerHTML=open?'Thu gọn <span aria-hidden="true">↑</span>':'Xem thêm <span aria-hidden="true">↓</span>';
      if(!open) c.scrollIntoView({block:'nearest'});
    });
    c.appendChild(b);
  });
}
function dqSeverity(el){
  const tb=el.querySelector('table.dqfind'); if(!tb) return;
  const card=tb.closest('.card'); if(!card || el.querySelector('.dqsev')) return;
  const META={dip:['Đổi kết quả DIP','Phải chốt trước khi dùng số này để chi trả','sev-dip'],
              fix:['Cần chuẩn hoá / bổ sung','Không đổi phán quyết kỳ này, nhưng làm số kém tin cậy','sev-fix'],
              done:['Đã xử lý','Đã tự tính hoặc đã kiểm chứng, không cần làm gì thêm','sev-done']};
  const rows=[...tb.querySelectorAll('tbody tr[data-sev]')];
  const g={dip:[],fix:[],done:[]};
  rows.forEach((tr,i)=>{ const s=tr.dataset.sev; if(!g[s]) return;
    if(!tr.id) tr.id='dqf-'+i;
    const b=tr.querySelector('td b'); g[s].push({id:tr.id, t:b?b.textContent.trim():'phát hiện'}); });
  const box=document.createElement('div'); box.className='dqsev';
  box.innerHTML=Object.keys(META).map(k=>{const m=META[k];
    return `<div class="dqs ${m[2]}">
      <p class="dqs-h"><span class="dqs-n">${g[k].length}</span> ${m[0]}</p>
      <p class="dqs-c">${m[1]}</p>
      <ul class="dqs-l">${g[k].map(x=>`<li><button type="button" data-dqf="${x.id}">${x.t}</button></li>`).join('')}</ul>
    </div>`;}).join('');
  /* khuyến nghị lên trước bảng, rồi tới dải thẻ */
  const todo=[...el.querySelectorAll('.card')].find(c=>c.querySelector('.dqtodo-l'));
  if(todo){ todo.classList.add('dqtodo'); card.parentNode.insertBefore(todo, card); }
  card.parentNode.insertBefore(box, card);
  box.querySelectorAll('[data-dqf]').forEach(b=>b.addEventListener('click',()=>{
    const tr=el.querySelector('#'+b.dataset.dqf); if(!tr) return;
    tr.scrollIntoView({behavior:'smooth',block:'center'});
    tr.classList.add('dqf-hit'); setTimeout(()=>tr.classList.remove('dqf-hit'),1600);
  }));
}
function pDq(){
  const s=DATA.dq;
  let h=`<div class="banner">Theo nguyên tắc dự án: <b>thách thức chất lượng dữ liệu trước khi tính toán</b>. Đây là các phát hiện cần xử lý ở tầng ETL trước khi kết quả được dùng cho chi trả DIP.</div>`;
  h+=`<div class="card"><h2>Phát hiện chất lượng dữ liệu — nguồn mới</h2>
  <p class="cap">Kiểm tra trực tiếp trên <code>${esc(DATA.meta.source||'')}</code>. Nguồn mới đổi cấu trúc so với kỳ trước nên danh sách này được soát lại từ đầu.</p>
  <div class="wrap"><table class="rt dqfind"><thead><tr><th scope="col">Phát hiện</th><th scope="col" class="n">Số lượng</th><th scope="col">Ảnh hưởng</th><th scope="col">Xử lý</th></tr></thead><tbody>

  <tr data-sev="done"><td data-l="Phát hiện"><b>Nguồn không còn cột chấm sẵn</b><div style="color:var(--muted);font-size:13px">Bản cũ có 5 cột công thức. Bản mới chỉ có dữ liệu thô — báo cáo phải tự tính toàn bộ.</div></td>
    <td class="n" data-l="Số lượng">5 cột</td>
    <td data-l="Ảnh hưởng">Đã kiểm chứng trên phần dữ liệu chồng lấn với kỳ trước: tái lập <b>vị trí &lt;${fmt(T_RAD)}m</b>, <b>giờ làm việc ${esc(WH_TXT)}</b>, <b>tải trọng &gt;${num(T_PLR,1)} lần</b> và <b>on-time</b> đều khớp <b>100%</b>. Riêng Distance &amp; Time nay tính từ toạ độ điểm bán nên không so trực tiếp được với cột chấm cũ — xem ghi chú ở Chi tiết KPI › Distance &amp; Time.</td>
    <td data-l="Xử lý">${chip('PASS','Đã tự tính, có hiệu chuẩn')}</td></tr>

  <tr data-sev="done"><td data-l="Phát hiện"><b>Không còn dòng "ma"</b><div style="color:var(--muted);font-size:13px">File có ${fmt(s.total_rows_file)} dòng thì cả ${fmt(s.real_rows)} dòng đều là dữ liệu thật.</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.ghost_rows)}</td><td data-l="Ảnh hưởng">Bỏ được hẳn một lớp rủi ro ETL của bản cũ</td><td data-l="Xử lý">${chip('PASS','Sạch')}</td></tr>

  <tr data-sev="done"><td data-l="Phát hiện"><b>Đã có mã điểm bán và toạ độ điểm bán</b><div style="color:var(--muted);font-size:13px">3 cột mới <span class="formula">OutletCode</span> · <span class="formula">lat_to</span> · <span class="formula">long_to</span>. Toạ độ cố định theo từng điểm bán — tức là <b>master data</b>.</div></td>
    <td class="n" data-l="Số lượng">${fmt(DATA.outlet?DATA.outlet.outlets:0)} điểm bán</td>
    <td data-l="Ảnh hưởng"><b>Mở được GAP lớn nhất của kỳ trước:</b> lần đầu tiên <b>tách được "tài xế bấm sai vị trí" khỏi "toạ độ điểm bán lưu sai"</b>. Xem Chi tiết KPI › Geo Compliance.</td>
    <td data-l="Xử lý">${chip('PASS','Đã khai thác')}</td></tr>

  <tr data-sev="fix"><td data-l="Phát hiện"><b>Điểm bán chưa khai toạ độ</b><div style="color:var(--muted);font-size:13px">Toạ độ ghi (0,0) — không phải vị trí thật</div></td>
    <td class="n" data-l="Số lượng">${fmt(DATA.outlet?DATA.outlet.no_coord_outlets:0)} điểm bán · ${fmt(DATA.outlet?DATA.outlet.no_coord_orders:0)} đơn</td>
    <td data-l="Ảnh hưởng">Không kết luận được lỗi vị trí của các đơn này là do tài xế hay do dữ liệu. Đã loại khỏi mọi phép tính khoảng cách điểm–điểm.</td>
    <td data-l="Xử lý">${chip('GAP','Đề nghị bổ sung toạ độ')}</td></tr>

  <tr data-sev="done"><td data-l="Phát hiện"><b>Cột <span class="formula">time_outlet_outlet</span> bị làm tròn về phút</b><div style="color:var(--muted);font-size:13px">Báo cáo <b>không dùng cột này</b> mà tự tính khoảng cách thời gian từ <span class="formula">DeliverDateTime</span> để giữ độ chính xác tới giây.</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.time_col_null)} dòng trống</td>
    <td data-l="Ảnh hưởng">Nếu dùng cột làm tròn, một đơn cách nhau 1 phút 40 giây sẽ thành "2 phút" và thoát ngưỡng — sai lệch trực tiếp tới tiêu chí Distance &amp; Time</td>
    <td data-l="Xử lý">${chip('PASS','Tự tính từ giờ giao')}</td></tr>

  <tr data-sev="dip"><td data-l="Phát hiện"><b>Đơn chưa ở trạng thái Delivered</b><div style="color:var(--muted);font-size:13px">${Object.entries(s.status).filter(([k])=>k!=='Delivered').map(([k,v])=>esc(k)+': '+v).join(' · ')||'không có'}</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.non_delivered)}</td>
    <td data-l="Ảnh hưởng">${s.non_delivered?`<b>Đã lượng hoá:</b> ${fmt(DATA.pop_scen.ot_fail_in_out)} đơn bị tính quá hạn và ${fmt(DATA.pop_scen.geo_fail_in_out)} đơn bị tính thêm lỗi Geo dù <b>chưa giao xong</b>. Nếu loại khỏi mẫu số: Geo ${pct(DATA.pop_scen.geo0)}→${pct(DATA.pop_scen.geo1)}, On-time ${pct(DATA.pop_scen.ot0)}→${pct(DATA.pop_scen.ot1)}${DATA.pop_scen.flips_geo.length?`, <b>${DATA.pop_scen.flips_geo.join(', ')} đổi kết quả Geo sang ĐẠT</b>`:''}`:'Kỳ này mọi đơn đều đã Delivered — không ảnh hưởng'}</td>
    <td data-l="Xử lý">${chip(s.non_delivered?'GAP':'PASS',s.non_delivered?'Chờ chốt '+L.scope:'Không phát sinh')}</td></tr>

  <tr data-sev="fix"><td data-l="Phát hiện"><b>Thiếu giờ giao (<span class="formula">DeliverDateTime</span>)</b><div style="color:var(--muted);font-size:13px">Ảnh hưởng thứ tự đơn trong chuyến, khoảng cách thời gian và điều kiện (3) giờ làm việc của Geo</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.null_deliverdatetime)}</td>
    <td data-l="Ảnh hưởng">${s.null_deliverdatetime?`${fmt(DATA.wh_detail.x_fail_nodate)} đơn bị đánh trượt điều kiện giờ làm việc <b>chỉ vì thiếu dữ liệu để đối chiếu</b>`:'Kỳ này không có đơn nào thiếu giờ giao'}</td>
    <td data-l="Xử lý">${chip(s.null_deliverdatetime?'GAP':'PASS',s.null_deliverdatetime?'Cần bổ sung':'Sạch')}</td></tr>

  <tr data-sev="fix"><td data-l="Phát hiện"><b>Outlier khoảng cách &gt;5km</b><div style="color:var(--muted);font-size:13px">Xa nhất ${fmt(s.geo_max)}m ≈ ${Math.round(s.geo_max/1000)}km — vượt xa phạm vi ${esc(DATA.meta.region)}</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.geo_outlier_5km)}</td>
    <td data-l="Ảnh hưởng">Kéo Geo xuống. Với nguồn mới, phần lớn nhóm này <b>kiểm chứng được</b>: nếu cùng một điểm bán lần nào cũng lệch thì là toạ độ sai, không phải hành vi tài xế.</td>
    <td data-l="Xử lý">${chip('GAP','Rà theo điểm bán')}</td></tr>

  <tr data-sev="fix"><td data-l="Phát hiện"><b>Cột <span class="formula">DriverName</span> không chuẩn định dạng</b><div style="color:var(--muted);font-size:13px">${fmt(s.name_bad_vals)}/${fmt(s.name_total_vals)} giá trị không theo mẫu biển số — lẫn tài khoản kho và số điện thoại. Ví dụ: ${(s.name_examples||[]).map(esc).join(' · ')}</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.name_bad_rows)}</td>
    <td data-l="Ảnh hưởng">Không ảnh hưởng tiêu chí User name (cột <span class="formula">username</span> sạch ${pct(DATA.total.username_pct)}), nhưng chặn việc chuẩn hoá bảng tải trọng xe và đối chiếu xe–tài xế.</td>
    <td data-l="Xử lý">${chip('GAP','Chuẩn hoá ở ETL')}</td></tr>

  <tr data-sev="dip"><td data-l="Phát hiện"><b>Tải trọng xe khai không nhất quán</b><div style="color:var(--muted);font-size:13px">${fmt(DATA.cap_check.trucks_multi)}/${fmt(DATA.cap_check.trucks)} xe được khai từ 2 mức <span class="formula">TruckCapacityWeight</span> trở lên</div></td>
    <td class="n" data-l="Số lượng">${fmt(DATA.cap_check.fail_on_multi)}/${fmt(DATA.cap_check.fail_plans)} chuyến</td>
    <td data-l="Ảnh hưởng"><b>Ảnh hưởng phán quyết:</b> Payload có ngưỡng tuyệt đối 100% nhưng mẫu số lại không ổn định. Dùng tải trọng lớn nhất từng khai của chính xe đó: ${fmt(DATA.cap_check.fail_plans)} → <b>${fmt(DATA.cap_check.fail_best)} chuyến</b> quá tải.</td>
    <td data-l="Xử lý">${chip('GAP','Cần chuẩn hoá tải trọng xe')}</td></tr>

  <tr data-sev="dip"><td data-l="Phát hiện"><b>Quy tắc loại DSA không đồng nhất giữa các tiêu chí</b><div style="color:var(--muted);font-size:13px">Chỉ áp cho Geo Compliance; On time và Distance &amp; Time vẫn tính đủ đơn DSA</div></td>
    <td class="n" data-l="Số lượng">${fmt(s.geo_excluded_dsa)} đơn</td>
    <td data-l="Ảnh hưởng">Geo toàn vùng ${pct(DATA.dsa_geo_scen_total.geo_with_dsa)} → ${pct(DATA.total.geo_pct)} sau khi loại; ${DATA.dsa_geo_scen_total.flips.length?`<b>${DATA.dsa_geo_scen_total.flips.join(', ')}</b> đổi kết quả Geo`:'không NPP nào đổi kết quả Geo'}</td>
    <td data-l="Xử lý">${chip('GAP','Chờ '+L.owner+' chốt')}</td></tr>
  </tbody></table></div></div>`;
  h+=`<div class="card"><h2>Ánh xạ nghiệp vụ → dữ liệu (đang áp dụng)</h2>
  <p class="cap">Đây là <b>nơi duy nhất</b> trong báo cáo dùng tên cột kỹ thuật. Mọi trang khác gọi bằng tên nghiệp vụ tiếng Việt.</p>
  <div class="wrap"><table class="rt"><thead><tr><th scope="col">Tên trong báo cáo</th><th scope="col">Tên trong logic gốc</th><th scope="col">Cột nguồn</th><th scope="col">Cách tính</th><th scope="col">Đơn vị đo</th><th scope="col">Ngưỡng</th><th scope="col">Trạng thái</th></tr></thead><tbody>
  <tr><td data-l="Tên trong báo cáo">User name</td><td data-l="Logic gốc">USER NAME</td><td data-l="Cột nguồn"><span class="formula">username</span></td><td data-l="Cách tính">khớp 1 trong 3 định dạng: DSA · SĐT 10 số · biển số xe</td><td data-l="Đơn vị">Đơn hàng</td><td data-l="Ngưỡng">${num(TH.username,0)}%</td><td data-l="Trạng thái">${chip('PASS','Áp dụng')}</td></tr>
  <tr><td data-l="Tên trong báo cáo"><b>Distance &amp; Time</b></td><td data-l="Logic gốc">DISTANCE &amp; TIME</td><td data-l="Cột nguồn"><span class="formula">DeliverDateTime</span> + <span class="formula">PlanNumber</span></td><td data-l="Cách tính">thời gian outlet→outlet &lt;${fmt(TH.dt_gap_min??2)} phút → outlet lỗi; chuyến hỏng khi tỷ lệ outlet lỗi &gt;${fmt(T_DTR_ROUTE_PCT)}% tổng outlet của chuyến</td><td data-l="Đơn vị">Chuyến</td><td data-l="Ngưỡng">&lt;${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng</td><td data-l="Trạng thái">${chip('PASS','Áp dụng')}</td></tr>
  <tr><td data-l="Tên trong báo cáo"><b>Geo Compliance</b></td><td data-l="Logic gốc">GEO COMPLIANCE</td><td data-l="Cột nguồn"><span class="formula">distance_to_dropped</span> + <span class="formula">DeliverDateTime</span> + <span class="formula">PlanNumber</span></td><td data-l="Cách tính">(1) giao cách điểm bán &lt;${fmt(T_RAD)}m <b>và</b> (2) outlet→outlet &gt;${fmt(TH.geo_gap_min??2)} phút <b>và</b> (3) hoàn tất trong ${esc(WH_TXT)}</td><td data-l="Đơn vị">Đơn hàng — <b>loại đơn tài khoản DSA</b></td><td data-l="Ngưỡng">≥${num(T_GEO,0)}%</td><td data-l="Trạng thái">${chip('PASS','Áp dụng')}</td></tr>
  <tr><td data-l="Tên trong báo cáo">On time</td><td data-l="Logic gốc">ON TIME</td><td data-l="Cột nguồn"><span class="formula">is_ontime</span></td><td data-l="Cách tính">lấy thẳng cờ 1/0 do TMS chấm theo SLA 24h/48h</td><td data-l="Đơn vị">Đơn hàng</td><td data-l="Ngưỡng">&gt;${num(T_OT,0)}%</td><td data-l="Trạng thái">${chip('PASS','Áp dụng')}</td></tr>
  <tr><td data-l="Tên trong báo cáo">Successful</td><td data-l="Logic gốc">SUCCESSFUL</td><td data-l="Cột nguồn"><span class="formula">is_ontime</span> (dùng chung)</td><td data-l="Cách tính">chưa tách khỏi On time</td><td data-l="Đơn vị">Đơn hàng</td><td data-l="Ngưỡng">&gt;${num(T_OT,0)}%</td><td data-l="Trạng thái">${chip('GAP','Chưa tách riêng')}</td></tr>
  <tr><td data-l="Tên trong báo cáo">Payload</td><td data-l="Logic gốc">PAYLOAD</td><td data-l="Cột nguồn"><span class="formula">Assigned_Weight</span> + <span class="formula">TruckCapacityWeight</span></td><td data-l="Cách tính">Σ khối lượng của chuyến ÷ tải trọng xe &gt; ${num(T_PLR,1)} → chuyến quá tải</td><td data-l="Đơn vị">Chuyến</td><td data-l="Ngưỡng">${num(TH.payload,0)}%</td><td data-l="Trạng thái">${chip('PASS','Áp dụng')}</td></tr>
  <tr><td data-l="Tên trong báo cáo">Created date</td><td data-l="Logic gốc">CREATED DATE</td><td data-l="Cột nguồn">—</td><td data-l="Cách tính">nguồn vẫn chưa có thời điểm tạo đơn trên DIS</td><td data-l="Đơn vị">Đơn hàng</td><td data-l="Ngưỡng">${num(TH.username,0)}%</td><td data-l="Trạng thái">${chip('GAP','Thiếu cột nguồn')}</td></tr>
  </tbody></table></div></div>`;
  h+=`<div class="card"><h2>Việc phải chốt</h2><ul class="tight dqtodo-l">
   <li><b>Ba việc phải chốt trước khi dùng cho DIP</b> — tất cả đã lượng hoá tác động:
     <b>(1)</b> ${L.scope} của ${fmt(s.non_delivered)} đơn chưa giao xong (${DATA.pop_scen&&DATA.pop_scen.flips_geo.length?'đổi kết quả Geo của <b>'+DATA.pop_scen.flips_geo.join(', ')+'</b>':'đã đo: <b>không NPP nào</b> đổi kết quả Geo'});
     <b>(2)</b> ngưỡng vị trí ${fmt(T_RAD)}m hay 200m (${DATA.sens_meta&&DATA.sens_meta.unstable.length?'đổi kết quả DIP của <b>'+DATA.sens_meta.unstable.join(', ')+'</b>':'đã đo: <b>không NPP nào</b> đổi kết quả DIP'});
     <b>(3)</b> tải trọng xe khai trong TMS (${fmt(DATA.cap_check?DATA.cap_check.fail_on_multi:0)}/${fmt(DATA.cap_check?DATA.cap_check.fail_plans:0)} chuyến quá tải đến từ xe khai nhiều mức).</li>
   <li><b>Rà ${fmt(s.geo_outlier_5km)} đơn outlier GPS &gt;5km theo ĐIỂM BÁN</b> — nguồn mới đã có mã điểm bán nên làm được ngay: điểm bán nào lần nào cũng lệch thì sửa toạ độ trong hệ thống, không nhắc tài xế.</li>
   <li><b>Kỳ dữ liệu ${fmt(DATA.meta.days||0)}/31 ngày</b> (${esc(DATA.meta.period)}) — ngưỡng theo tháng (dưới ${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng) chỉ nên chốt khi có đủ kỳ.</li>
   <li><b>Xác nhận quy tắc Distance &amp; Time bằng văn bản</b> — outlet lỗi chỉ xét <b>thời gian outlet→outlet dưới ${fmt(TH.dt_gap_min??2)} phút</b>, mức cho phép tối đa ${fmt(T_DTR_ROUTE_PCT)}% outlet mỗi chuyến và dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến hỏng mỗi tháng (đổi từ ngưỡng tuyệt đối sang % kể từ kỳ tháng 9/2026).</li>
   <li><b>Còn thiếu trong nguồn:</b> thời điểm tạo đơn trên DIS, danh sách SLA 24/48h theo nhóm điểm bán, bảng tải trọng đăng kiểm theo biển số.</li>
   <li><b>Chuyển sang Power BI</b> theo star schema (Fact_Delivery · Dim_NPP · Dim_Truck · Dim_Date · Dim_KPI_Rule) khi cần scale ra nhiều Region — dashboard HTML này phù hợp cho vòng review nội bộ.</li>
  </ul></div>`;
  return h;
}

/* ===================== TRANG: CÁCH CHẤM ĐIỂM ===================== */
function gateSvg(){
  const K=['User name','Distance & Time','Geo Compliance','On time','Successful','Payload'];
  const W=900,H=300, bx=18, bw=230, bh=34, gap=8;
  const top=(H-(K.length*bh+(K.length-1)*gap))/2;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gt"><title id="gt">Sơ đồ: sáu tiêu chí phải cùng đạt thì nhà phân phối mới đạt Data Accuracy và nhận 15% DIP; chỉ cần một tiêu chí không đạt là mất toàn bộ.</title>`;
  K.forEach((k,i)=>{
    const y=top+i*(bh+gap);
    s+=`<rect x="${bx}" y="${y}" width="${bw}" height="${bh}" rx="9" fill="var(--surface)" stroke="var(--axis)"/>`;
    s+=`<text x="${bx+12}" y="${y+bh/2+4}" class="gt-t">${esc(k)}</text>`;
    s+=`<path d="M${bx+bw} ${y+bh/2} H${bx+bw+34}" stroke="var(--axis)" stroke-width="1.5" fill="none"/>`;
  });
  const gx=bx+bw+34, gy=top-6, gh=K.length*(bh+gap)-gap+12;
  s+=`<path d="M${gx} ${gy} H${gx+30} Q${gx+86} ${gy+gh/2} ${gx+30} ${gy+gh} H${gx} Z" fill="var(--brand-lt)" stroke="var(--brand)" stroke-width="1.5"/>`;
  s+=`<text x="${gx+30}" y="${gy+gh/2-4}" class="gt-g" text-anchor="middle">VÀ</text>`;
  s+=`<text x="${gx+30}" y="${gy+gh/2+14}" class="gt-s" text-anchor="middle">tất cả</text>`;
  const ox=gx+110;
  s+=`<path d="M${gx+86} ${gy+gh/2} H${ox-14}" stroke="var(--axis)" stroke-width="1.5" fill="none"/>`;
  s+=`<path d="M${ox-14} ${gy+gh/2} V${gy+34} H${ox}" stroke="var(--good)" stroke-width="1.5" fill="none"/>`;
  s+=`<path d="M${ox-14} ${gy+gh/2} V${gy+gh-34} H${ox}" stroke="var(--crit)" stroke-width="1.5" fill="none"/>`;
  s+=`<rect x="${ox}" y="${gy+16}" width="212" height="40" rx="10" fill="rgba(12,163,12,.12)" stroke="var(--good)"/>`;
  s+=`<text x="${ox+16}" y="${gy+41}" class="gt-o" fill="var(--good)">✓ ĐẠT — nhận 15% DIP</text>`;
  s+=`<rect x="${ox}" y="${gy+gh-56}" width="212" height="40" rx="10" fill="rgba(208,59,59,.12)" stroke="var(--crit)"/>`;
  s+=`<text x="${ox+16}" y="${gy+gh-31}" class="gt-o" fill="var(--crit)">✕ KHÔNG ĐẠT — mất 15% DIP</text>`;
  s+=`<text x="${ox+8}" y="${gy+gh+2}" class="gt-s">chỉ cần 1 tiêu chí không đạt</text>`;
  s+=`</svg>`;
  return s;
}

function pLogic(){
  let h=`<div class="banner">Trang này dành cho <b>người mới đọc báo cáo</b>: chấm những gì, ngưỡng bao nhiêu, lỗi nghĩa là gì, và làm gì nếu thấy số liệu chưa đúng.</div>`;

  h+=`<div class="card"><h2>Toàn bộ cách chấm điểm trong một hình</h2>
   <p class="cap">Data Accuracy gồm 6 tiêu chí. Phải <b>đạt hết cả 6</b> mới được tính là đạt — không có điểm trung bình, không bù trừ.</p>
   <div class="gatewrap">${gateSvg()}
     <div class="gate-m" aria-hidden="true">
       <div class="gm-list">${['User name','Distance &amp; Time','Geo Compliance','On time','Successful','Payload']
         .map(k=>`<span class="gm-k">${esc(k)}</span>`).join('')}</div>
       <div class="gm-and"><span>phải đạt <b>TẤT CẢ</b></span></div>
       <div class="gm-out ok">✓ ĐẠT — nhận 15% DIP</div>
       <div class="gm-out no">✕ KHÔNG ĐẠT — mất 15% DIP<em>chỉ cần 1 tiêu chí không đạt</em></div>
     </div>
   </div>
   <p class="cap" style="margin:12px 0 0"><b>Nhớ một điều:</b> đây là <b>cửa chặn</b>, không phải bài thi lấy điểm trung bình. Làm tốt 5 tiêu chí mà hỏng 1 thì vẫn là không đạt, và mất trọn <b>15% DIP</b> (10% Data Accuracy + 5% TMS).</p></div>`;

  h+=`<div class="card"><h2>Ba mức khắt khe — nhớ cái này là đủ</h2>
   <p class="cap">Sáu tiêu chí không khắt khe như nhau — biết cái nào không cho phép sai sót.</p>
   <div class="tiers">
    <div class="tier t-hard"><div class="tier-h"><span class="tier-n">100%</span><span class="tier-l">Không được sai một lần nào</span></div>
      <ul><li><b>User name</b> — tài khoản đăng nhập phải hợp lệ</li>
          <li><b>Payload</b> — không chuyến nào được chở quá ${num(T_PLR,1)} lần tải trọng xe</li></ul>
      <p class="tier-w">Chỉ cần <b>một</b> chuyến quá tải là trượt cả tiêu chí, kéo theo trượt toàn bộ Data Accuracy.</p></div>
    <div class="tier t-mid"><div class="tier-h"><span class="tier-n">&gt;${num(T_OT,0)}%</span><span class="tier-l">Cho phép sai dưới ${num(100-T_OT,0)}%</span></div>
      <ul><li><b>On time</b> — giao xong trong 24h/48h kể từ lúc điểm bán đặt hàng</li>
          <li><b>Successful</b> — giao được thành công</li></ul>
      <p class="tier-w">Với 1.000 đơn thì được phép trễ tối đa khoảng 50 đơn. Vượt con số đó là trượt.</p></div>
    <div class="tier t-soft"><div class="tier-h"><span class="tier-n">≥${num(T_GEO,0)}%</span><span class="tier-l">Cho phép sai tới ${num(100-T_GEO,0)}%</span></div>
      <ul><li><b>Geo Compliance</b> — giao đúng chỗ, thời gian giao giữa 2 outlet &gt; ${fmt(TH.geo_gap_min??2)} phút, và trong giờ làm việc (${WH_TXT})</li></ul>
      <p class="tier-w">Nới hơn vì tín hiệu GPS có sai số thực tế. Nhưng đây lại là tiêu chí <b>nhiều NPP trượt nhất</b>.</p></div>
    <div class="tier t-plan"><div class="tier-h"><span class="tier-n">&lt;${fmt(T_DTR_MONTH_PCT)}%</span><span class="tier-l">Đếm theo chuyến, không theo đơn</span></div>
      <ul><li><b>Distance &amp; Time</b> — hai outlet xác nhận quá sát giờ nhau</li></ul>
      <p class="tier-w">Mỗi chuyến được phép sai tối đa ${fmt(T_DTR_ROUTE_PCT)}% outlet. Mỗi tháng được phép dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến hỏng — chuyến càng ít outlet càng dễ vượt ngưỡng đầu.</p></div>
   </div></div>`;

  const K=[
   {i:'',n:'USER NAME',q:'Người giao hàng có đăng nhập bằng tài khoản hợp lệ không?', th:'100%',
    ok:'Tài khoản là mã kho (DSA), số điện thoại tài xế, hoặc biển số xe.',
    ex:'Đăng nhập bằng <code>0941296986</code> → hợp lệ. Đăng nhập bằng một chuỗi lạ → không hợp lệ.',
    who:'Quản lý NPP cấp và kiểm soát tài khoản.'},
   {i:'',n:'GEO COMPLIANCE',q:'Tài xế có bấm xác nhận <b>tại đúng điểm bán</b> và <b>trong giờ làm việc</b> không?', th:'≥'+num(T_GEO,0)+'%',
    ok:`Cả <b>3 điều kiện</b> cùng đạt: <b>(1)</b> giao tại vị trí điểm bán, cách <b>dưới ${fmt(T_RAD)}m</b> · <b>(2)</b> giữa outlet tới outlet <b>trên ${fmt(TH.geo_gap_min??2)} phút</b> · <b>(3)</b> giao trong giờ làm việc <b>${WH_TXT}</b>. <b>Đây là định nghĩa chuẩn — mọi nơi khác trong báo cáo đều trỏ về đây.</b>`,
    ex:`Bấm cách cửa hàng 38m, lúc 15h, cách outlet trước 9 phút → đạt. Bấm khi còn cách 200m, hoặc chỉ cách outlet trước 1 phút, hoặc đúng vị trí nhưng hoàn tất lúc 21h → đều không đạt.`,
    who:`Tài xế bấm đúng chỗ, đúng giờ · Điều phối sắp lịch xuất bến để chuyến kết thúc trước ${fmt(T_WE)}h · Quản lý NPP kiểm tra toạ độ điểm bán trong hệ thống có đúng không.`},
   {i:'',n:'ON TIME',q:'Đơn có được giao xong <b>trong thời gian cam kết dịch vụ</b> không?', th:'>'+num(T_OT,0)+'%',
    ok:'Giao hàng <b>thành công</b> trong vòng <b>24 giờ</b> — hoặc <b>48 giờ</b> tuỳ nhóm điểm bán — kể từ thời điểm điểm bán <b>đặt hàng</b>. Đây là cam kết dịch vụ (SLA), không phải mốc do NPP tự đặt.',
    ex:'Điểm bán đặt hàng 14h ngày 02, cam kết 24h → hạn chót 14h ngày 03. Giao lúc 09h ngày 04 → <b>quá hạn</b> → không đạt, dù giao đúng vị trí và đủ hàng.',
    who:'DSA chốt đơn sớm · Kho soạn hàng kịp · Điều phối sắp chuyến và giờ xuất bến.'},
   {i:'',n:'SUCCESSFUL',q:'Đơn có giao được thành công không — <b>bất kể sớm hay muộn</b>?', th:'>'+num(T_OT,0)+'%',
    ok:'Đơn giao xong, không bị huỷ, không bỏ dở. Khác On time ở chỗ: On time hỏi <i>có kịp hạn không</i>, Successful hỏi <i>có giao được không</i>.',
    ex:'Hiện tiêu chí này <b>chưa tách riêng</b> mà dùng chung kết quả với On time, nên hai ô luôn giống nhau. Cần chốt định nghĩa "đơn được giao" để tách.',
    who:'Điều phối và đội giao hàng.'},
   {i:'',n:'PAYLOAD',q:'Xe có chở <b>quá tải</b> không?', th:'100%',
    ok:`Tổng hàng trên xe dưới <b>${num(T_PLR,1)} lần</b> tải trọng xe khai trong hệ thống.`,
    ex:'Chở 7,3 tấn trên xe khai 1,1 tấn → 6,6 lần → không đạt.',
    who:'Điều phối gán xe · Thủ kho kiểm soát khi xuất hàng.'},
   {i:'',n:'DISTANCE & TIME',q:'Có điểm bán nào xác nhận <b>quá sát giờ</b> với điểm bán liền trước không?', th:'<'+fmt(T_DTR_MONTH_PCT)+'% tổng số chuyến/tháng',
    ok:`Outlet bị tính lỗi khi <b>thời gian tới outlet liền trước chưa đủ ${fmt(TH.dt_gap_min??2)} phút</b>. Outlet đầu chuyến luôn được cho đạt. Mỗi chuyến được phép sai <b>tối đa ${fmt(T_DTR_ROUTE_PCT)}% số outlet của chính chuyến đó</b>; mỗi tháng NPP được phép <b>dưới ${fmt(T_DTR_MONTH_PCT)}% tổng số chuyến</b> hỏng.`,
    ex:`Chuyến 3 outlet, bấm 2 outlet trong vòng 1 phút khi về kho → 1 outlet lỗi trên 3 = 33%, vượt mức cho phép ${fmt(T_DTR_ROUTE_PCT)}% nên <b>cả chuyến</b> tính hỏng. Chuyến 10 outlet mà chỉ 1 outlet lỗi (10%) thì vẫn trong mức cho phép — <b>chuyến càng ít outlet càng dễ vượt ngưỡng</b>.`,
    who:'Tài xế bấm tại từng điểm · Quản lý NPP kiểm tra máy có mất mạng gửi dồn không.'},
   {i:'',n:'CREATED DATE',q:'Đơn có bị tạo sau khi đã giao không?', th:'Chưa chấm',
    ok:'Nhằm phát hiện tài xế chỉnh giờ điện thoại.',
    ex:'File dữ liệu hiện <b>chưa có</b> thông tin thời điểm tạo đơn, nên tiêu chí này <b>không được chấm</b> và không ảnh hưởng kết quả NPP.',
    who:'Chờ bổ sung dữ liệu từ hệ thống đặt hàng.',gap:true}];

  h+=`<div class="card"><h2>Sáu tiêu chí, mỗi tiêu chí trả lời một câu hỏi</h2>
   <p class="cap">Mỗi tiêu chí là một câu hỏi về chất lượng giao hàng.</p>
   <div class="kgrid">
   ${K.map(k=>`<article class="kcard ${k.gap?'gapcard':''}">
     <header class="k-h"><span class="k-i" aria-hidden="true">${k.i}</span>
       <div><div class="k-n">${esc(k.n)}</div><div class="k-th">${esc(k.th)}</div></div></header>
     <p class="k-q">${k.q}</p>
     <p class="k-ok"><b>Đạt khi:</b> ${k.ok}</p>
     <p class="k-ex">${k.ex}</p>
     <p class="k-who"><span class="own">Ai giữ</span>${k.who}</p>
   </article>`).join('')}
   </div></div>`;

  h+=`<div class="card"><h2>Đọc một dòng lỗi như thế nào</h2>
   <p class="cap">Trong bảng "Đơn hàng có lỗi", mỗi đơn có thể mang nhiều nhãn lỗi cùng lúc. Các tiêu chí <b>độc lập nhau</b> — đúng chỗ vẫn có thể trễ giờ.</p>
   <div class="errtbl"><table class="rt"><caption class="sr-only">Ý nghĩa các nhãn lỗi</caption>
   <thead><tr><th scope="col">Nhãn lỗi</th><th scope="col">Nghĩa là</th><th scope="col">Việc cần làm</th></tr></thead><tbody>
   <tr><th scope="row" data-l="Nhãn lỗi"><span class="chip fail"><span class="ic">✕</span>Sai vị trí</span></th>
     <td data-l="Nghĩa là">Bấm xác nhận cách điểm bán quá ${fmt(T_RAD)}m. Nhãn ghi kèm số mét lệch thật. Đây là điều kiện (1) của Geo.</td>
     <td data-l="Việc cần làm">Đi thị trường xác minh: tài xế bấm sớm/muộn, hay toạ độ điểm bán trong hệ thống sai?</td></tr>
   <tr><th scope="row" data-l="Nhãn lỗi"><span class="chip fail"><span class="ic">✕</span>Ngoài giờ làm việc</span></th>
     <td data-l="Nghĩa là">Hoàn tất giao hàng <b>ngoài khung ${esc(WH_TXT)}</b> — dù vị trí hoàn toàn đúng vẫn không đạt Geo. Điều kiện (3). Nhãn ghi kèm giờ hoàn tất thật.</td>
     <td data-l="Việc cần làm">Kiểm tra lịch xuất bến của chuyến — chuyến xuất muộn hoặc đi quá dài dễ kết thúc sau ${fmt(T_WE)}h. Đây là vấn đề lịch trình, không phải lỗi GPS.</td></tr>
   <tr><th scope="row" data-l="Nhãn lỗi"><span class="chip fail"><span class="ic">✕</span>Giao trễ hạn</span></th>
     <td data-l="Nghĩa là">Giao xong <b>quá thời gian cam kết 24h/48h</b> kể từ lúc điểm bán đặt hàng. Nhãn ghi kèm số ngày quá hạn.</td>
     <td data-l="Việc cần làm">Rà chuỗi thời gian: điểm bán đặt lúc nào → kho soạn xong lúc nào → xe rời bến lúc nào. Khâu chậm nhất là khâu cần sửa.</td></tr>
   <tr><th scope="row" data-l="Nhãn lỗi"><span class="chip fail"><span class="ic">✕</span>Distance &amp; Time</span></th>
     <td data-l="Nghĩa là">Outlet này xác nhận <b>cách outlet liền trước chưa tới ${fmt(TH.dt_gap_min??2)} phút</b>. Nhãn ghi kèm số phút thật. Chuyến chỉ tính hỏng khi tỷ lệ outlet lỗi trong chuyến vượt ${fmt(T_DTR_ROUTE_PCT)}%.</td>
     <td data-l="Việc cần làm">Xem cột "Cách outlet trước (phút)" của chính dòng đó, rồi xác minh tài xế bấm dồn hay máy gửi dữ liệu theo lô.</td></tr>
   <tr><th scope="row" data-l="Nhãn lỗi"><span class="chip fail"><span class="ic">✕</span>Outlet tới outlet quá gần</span></th>
     <td data-l="Nghĩa là">Điều kiện (2) của <b>Geo Compliance</b>: thời gian tới outlet liền trước <b>không quá ${fmt(TH.geo_gap_min??2)} phút</b>. Khác Distance &amp; Time ở chỗ <b>không xét khoảng cách</b>.</td>
     <td data-l="Việc cần làm">Nhắc tài xế bấm xác nhận ngay tại từng điểm thay vì bấm gộp khi rời điểm.</td></tr>
   <tr><th scope="row" data-l="Nhãn lỗi"><span class="chip fail"><span class="ic">✕</span>Xe quá tải</span></th>
     <td data-l="Nghĩa là">Cả chuyến chở quá ${num(T_PLR,1)} lần tải trọng. Nhãn ghi kèm tỷ lệ thật.</td>
     <td data-l="Việc cần làm">Chia lại chuyến hoặc đổi xe. Kiểm tra tải trọng xe khai trong hệ thống có đúng không.</td></tr>
   </tbody></table></div>
   <p class="cap" style="margin:12px 0 0"><b>Lưu ý:</b> một đơn mang 3 nhãn lỗi <b>vẫn chỉ là 1 đơn lỗi</b>, nhưng bị tính vào cả 3 tiêu chí. Vì vậy cộng số đơn lỗi của từng tiêu chí sẽ ra tổng lớn hơn số đơn lỗi thực tế.</p></div>`;

  /* ---- Lối khiếu nại: trước đây FAQ mời NPP đi rà soát rồi bỏ họ ở đó ---- */
  h+=`<div class="card" style="border-left:4px solid var(--brand)"><h2>Nếu bạn thấy số liệu chưa đúng — làm gì tiếp</h2>
   <p class="cap">Báo cáo này dùng để chi trả tiền, nên mọi con số đều <b>tra ngược được tới từng đơn</b> và đều <b>khiếu nại được</b>. Đây là quy trình:</p>
   <ol class="appeal">
     <li><b>Tìm đúng nhóm đơn.</b> Mở tab <b>Đơn hàng có lỗi</b>, lọc theo loại lỗi hoặc theo ngày, rồi bấm <b>Tải Excel</b> — file chỉ chứa dữ liệu của NPP bạn.</li>
     <li><b>Đánh dấu đơn nghi bị tính oan</b> trong file Excel đó và ghi rõ lý do. Ba trường hợp thường gặp: đơn <b>chưa giao xong</b> mà vẫn bị tính, đơn <b>thiếu giờ giao</b> trong file, và <b>toạ độ điểm bán sai</b> khiến lần giao nào cũng lệch.</li>
     <li><b>Gửi file cho ${contactTxt()}.</b> ${appealDueTxt()} Kết quả DIP chỉ chốt sau bước này.</li>
   </ol>
   <p class="cap" style="margin:12px 0 0">Nếu tiêu chí của bạn đang <b>sát ngưỡng</b>, khối <b>"Việc cần làm — nhẹ nhất trước"</b> ở tab Tổng quan cho biết còn thiếu <b>đúng bao nhiêu đơn</b> — rà đúng chừng đó đơn là đủ, không cần rà cả danh sách.</p></div>`;

  const GLO=[
   ['DIP','Chương trình thưởng nhà phân phối. Data Accuracy là điều kiện để được xét — không đạt là mất <b>15%</b>.'],
   ['NPP','Nhà phân phối.'],
   ['Chuyến','Một lần xe xuất bến giao nhiều điểm bán. Trong hệ thống gọi là <i>PlanNumber</i>. Báo cáo này luôn gọi là <b>chuyến</b>.'],
   ['Điểm bán','Cửa hàng, tạp hoá, quán nhận hàng. Trong hệ thống gọi là <i>outlet</i>.'],
   ['DSA','Tài khoản của <b>kho / văn phòng</b> NPP, không phải tài xế. Đơn dùng tài khoản này <b>không tính vào Geo Compliance</b>, nhưng <b>vẫn tính</b> ở On time và Distance &amp; Time.'],
   ['is_ontime (OTIF)','<i>On Time In Full</i> — giao <b>đúng hạn cam kết và đủ hàng</b>. Hệ thống TMS chấm sẵn theo SLA 24h/48h; báo cáo lấy thẳng kết quả này.'],
   ['SLA','Cam kết thời gian giao hàng với điểm bán: <b>24 giờ</b> hoặc <b>48 giờ</b> kể từ lúc đặt hàng, tuỳ nhóm điểm bán.'],
   ['Outlet tới outlet',`Thời gian giữa lần xác nhận ở điểm bán này và điểm bán liền trước trong cùng chuyến. <b>Distance &amp; Time</b> đếm theo chuyến (được phép sai tối đa ${fmt(T_DTR_ROUTE_PCT)}% outlet của chuyến); <b>Geo Compliance</b> đếm theo từng đơn.`],
   ['Giờ làm việc',`Khung <b>${WH_TXT}</b> — điều kiện (3) của Geo Compliance. Hoàn tất ngoài khung này không đạt Geo dù vị trí hoàn toàn đúng. Khác hẳn On time (đo tốc độ phục vụ trong 24h/48h).`],
   ['Biên an toàn','Còn <b>thiếu (hoặc dư) bao nhiêu ĐƠN</b> so với ngưỡng, chứ không phải bao nhiêu phần trăm. Ví dụ 84,94% nghe như "gần đạt", nhưng quy ra đơn có thể chỉ thiếu đúng 1 đơn.'],
   ['Sai số 95%','Khoảng dao động của một tỷ lệ đo trên cỡ mẫu có hạn. Nếu khoảng này <b>vắt ngang ngưỡng</b> thì kết quả <b>chưa phân biệt được với ngưỡng</b> — không phải NPP làm tốt hay kém, mà là mẫu chưa đủ để kết luận.'],
   ['Phạm vi tính','Tập đơn được đưa vào tính một tiêu chí. Ví dụ Geo loại các đơn dùng tài khoản DSA khỏi phạm vi tính.'],
   ['Chưa chấm','Thiếu dữ liệu nên <b>chưa chấm được</b>. Báo cáo để trống thay vì suy đoán — không gây bất lợi cho NPP.']];
  h+=`<div class="card"><h2>Từ hay gặp</h2>
   <div class="wrap"><table class="rt"><caption class="sr-only">Từ điển thuật ngữ</caption>
   <thead><tr><th scope="col">Từ</th><th scope="col">Nghĩa</th></tr></thead><tbody>
   ${GLO.map(g=>`<tr><th scope="row" data-l="Từ"><b>${esc(g[0])}</b></th><td data-l="Nghĩa">${g[1]}</td></tr>`).join('')}
   </tbody></table></div></div>`;

  const FAQ=[
   ['Đơn giao đúng chỗ, chỉ lệch 5m, sao vẫn bị lỗi?',
    `Có hai khả năng khác nhau. <b>(1) Giao trễ hạn</b> — On time đo <b>tốc độ phục vụ</b>: đơn phải giao xong trong 24h/48h kể từ lúc điểm bán đặt hàng, giao đúng chỗ nhưng quá khung cam kết vẫn không đạt. <b>(2) Ngoài giờ làm việc</b> (thuộc Geo Compliance) — nếu hoàn tất trước ${fmt(T_WS)}h hoặc sau ${fmt(T_WE)}h thì dù vị trí đúng 100% vẫn không đạt Geo Compliance. <b>(3) Outlet tới outlet quá gần</b> — nếu xác nhận cách outlet liền trước không quá ${fmt(TH.geo_gap_min??2)} phút thì cũng không đạt Geo Compliance, dù đứng đúng chỗ. Mỗi nhãn lỗi trên dòng đã ghi rõ con số gây ra lỗi đó.`],
   ['Đồng hồ 24h/48h bắt đầu tính từ lúc nào?',
    'Từ thời điểm <b>điểm bán đặt hàng</b>, không phải từ lúc xe rời kho. Nghĩa là thời gian chốt đơn ở DSA và thời gian soạn hàng ở kho <b>đều nằm trong đồng hồ</b>. Một đơn chốt muộn buổi chiều đã tiêu mất phần lớn khung 24h trước khi xe kịp xuất bến.'],
   ['Xe quá tải có phải lỗi của tài xế?',
    'Thường là không. Tài xế không quyết định được chất bao nhiêu hàng lên xe — đó là việc của <b>khâu lên kế hoạch và xếp hàng tại kho</b>. Cũng nên kiểm tra tải trọng xe khai trong hệ thống có khớp xe thật không; nếu khai thấp hơn thì là lỗi khai báo, sửa là hết.'],
   ['Nhiều đơn xác nhận cách nhau đúng 9 giây, tài xế gian lận?',
    'Chưa kết luận được. Khoảng cách <b>đều tăm tắp</b> giống lỗi máy gửi dữ liệu theo lô hơn là bấm tay. Nên kiểm tra máy của tài xế trước khi quy trách nhiệm.'],
   ['Cùng một tài khoản thì có phải cùng một người?',
    'Không chắc. Tài khoản đặt theo <b>biển số xe</b> có thể nhiều tài xế dùng chung; tài khoản <b>DSA</b> là của kho. Nên đối chiếu bảng phân công theo ngày trước khi làm việc với ai.'],
   ['Chỉ vài đơn lỗi sao lại trượt cả tháng?',
    'Vì <b>Payload</b> và <b>User name</b> yêu cầu tuyệt đối 100%. Một chuyến quá tải là trượt Payload, kéo theo trượt toàn bộ. Khối <b>"Việc cần làm — nhẹ nhất trước"</b> ở tab Tổng quan cho biết chính xác cần sửa bao nhiêu đơn hoặc chuyến.'],
   ['NPP tôi trượt sát ngưỡng — có được xem lại không?',
    `Được, và có quy trình rõ ràng: xem mục <b>"Nếu bạn thấy số liệu chưa đúng — làm gì tiếp"</b> ngay trên trang này (3 bước, có đầu mối và hạn nộp). Khối <b>"Việc cần làm — nhẹ nhất trước"</b> ở tab Tổng quan cho biết còn thiếu <b>đúng bao nhiêu đơn</b>; nhóm <b>"Biên an toàn · xếp hạng · độ nhạy"</b> cho biết kết luận có vững về mặt thống kê không.`],
   ['Số liệu có tự cập nhật không?',
    `Không. Báo cáo là bản chụp dữ liệu kỳ <b>${esc(DATA.meta.period)}</b>. Kỳ sau phải dựng lại báo cáo từ file mới.`]];
  h+=`<div class="card"><h2>Câu hỏi thường gặp</h2>
   <p class="cap">Bấm vào từng câu để xem giải đáp.</p>
   ${FAQ.map(f=>`<details class="faq"><summary>${esc(f[0])}</summary><div class="faq-a">${f[1]}</div></details>`).join('')}
   </div>`;

  h+=`<div class="card"><h2>Cam kết về tính công bằng</h2>
   <p class="cap">Báo cáo này phục vụ việc chi trả tiền, nên nguyên tắc là <b>quy oan nguy hiểm hơn bỏ sót</b>.</p>
   <ul class="tight">
    <li><b>Thiếu dữ liệu thì để trống, không suy đoán.</b> Tiêu chí Created Date chưa có dữ liệu nên không được chấm — không NPP nào bị trừ điểm vì nó.</li>
    <li><b>Mọi con số đều truy ngược được.</b> Từ tỷ lệ trên bảng điểm, bấm xuống là ra danh sách từng đơn, tải được ra Excel để đối soát.</li>
    <li><b>Nguyên nhân hệ thống không tính là lỗi NPP.</b> Nếu lỗi đến từ toạ độ điểm bán sai, tải trọng xe khai sai, hay máy gửi dữ liệu theo lô thì phải sửa dữ liệu gốc, không quy cho tài xế.</li>
    <li><b>Sát ngưỡng thì nói rõ là sát ngưỡng.</b> Báo cáo công bố cả <b>biên an toàn tính bằng số đơn</b> và <b>sai số 95%</b>. NPP nào có sai số vắt ngang ngưỡng đều được ghi rõ là <i>chưa phân biệt được với ngưỡng</i>.</li>
    <li><b>Còn điểm đang chờ chốt — và đã đo sẵn tác động.</b> Ngưỡng đo vị trí (${fmt(T_RAD)}m hay 200m), cách xử lý đơn chưa giao xong, và tải trọng xe khai trong TMS đều chưa có văn bản chốt. Báo cáo <b>tính sẵn kết quả theo từng kịch bản</b> để thấy chốt thế nào thì đổi kết quả của ai.</li>
    <li><b>Có lối khiếu nại.</b> Xem mục "Nếu bạn thấy số liệu chưa đúng" phía trên.</li>
   </ul></div>`;

  return h;
}


/* ══════════════════════════════════════════════════════════════
   GỘP TAB: Geo Compliance · Đúng hạn · 4 tiêu chí còn lại  ->  một tab "Chi tiết KPI".
   Ba hàm dựng trang pGeo / pOntime / pAccuracy giữ NGUYÊN, chỉ được gọi từ đây.
   Trang Tổng quan không bị sửa một dòng nào.
   ══════════════════════════════════════════════════════════════ */
let kpiSel='geo', kpiJump='';
const KPI_TABS=[['geo','Geo Compliance'],['ontime','On time'],['successful','Successful'],
                ['dt','Distance & Time'],['payload','Payload'],['username','User name']];
/* v47 · M5: dải "đang thế nào / phải làm gì" cho từng tiêu chí đang chọn. */
function kpiLead(sel){
  const KEY={geo:'v_geo', ontime:'v_ontime', successful:'v_successful', dt:'v_dt', payload:'v_payload', username:'v_username'}[sel];
  const NAME={geo:L.kpiGeo, ontime:'On time', successful:'Successful', dt:L.kpiDT, payload:'Payload', username:'User name'}[sel];
  const SIG={geo:'geo', ontime:'ot', successful:'ot', payload:'pl'}[sel];
  const all=(cur==='ALL'&&isAdmin()), LST=SB(), r=row();
  let what='', act='';
  if(all){
    const bad=LST.filter(x=>x[KEY]==='FAIL').map(x=>x.npp);
    what = bad.length
      ? `<b>${fmt(bad.length)}/${fmt(LST.length)} NPP dưới ngưỡng</b>: <b>${bad.map(esc).join(' · ')}</b>`
      : `<b>${fmt(LST.length)}/${fmt(LST.length)} NPP đạt</b> tiêu chí ${esc(NAME)} trong kỳ này`;
    if(bad.length){
      const first=LST.filter(x=>x[KEY]==='FAIL')
        .map(x=>({npp:x.npp, g:gapToPass(x).find(g=>g.k===({geo:'geo',ontime:'ot',successful:'ot',dt:'dt',payload:'pl'}[sel])), s:SIG?nppSignals(x.npp,SIG):[]}))
        .sort((a,b)=>((a.g?a.g.n:1e9)-(b.g?b.g.n:1e9)))[0];
      if(first){
        act = `NPP nhẹ nhất là <b>${esc(first.npp)}</b>${first.g?` — ${first.g.txt}`:''}.`
            + (first.s.length?` Kiểm trước: ${first.s.map(esc).join(' · ')}.`:'');
      }
    } else {
      const thin=LST.filter(x=>{const m=DATA.margin&&DATA.margin[x.npp];
        return m && ((sel==='geo'&&m.geo_straddle)||((sel==='ontime'||sel==='successful')&&m.ot_straddle));}).map(x=>x.npp);
      act = thin.length ? `Cần theo dõi: <b>${thin.map(esc).join(' · ')}</b> có sai số 95% vắt ngang ngưỡng.`
                        : 'Không NPP nào sát ngưỡng ở tiêu chí này.';
    }
  } else {
    const fail = r[KEY]==='FAIL';
    what = fail ? `NPP <b>${esc(cur)}</b>: <b class="st-no-t">KHÔNG ĐẠT</b> tiêu chí ${esc(NAME)}`
                : `NPP <b>${esc(cur)}</b>: <b class="st-ok-t">ĐẠT</b> tiêu chí ${esc(NAME)}`;
    const g = gapToPass(r).find(g=>g.k===({geo:'geo',ontime:'ot',successful:'ot',dt:'dt',payload:'pl'}[sel]));
    const s = SIG?nppSignals(cur,SIG):[];
    act = (g?`${g.txt}. `:'') + (s.length?`Kiểm trước: ${s.map(esc).join(' · ')}.`:(g?'':'Giữ khoảng đệm như hiện tại.'));
  }
  return `<div class="card kpilead">
    <p class="kl-w">${what}</p>
    ${act?`<p class="kl-a"><span class="kl-t">Việc cần làm</span> ${act}</p>`:''}</div>`;
}
function pKpi(){
  const sel = KPI_TABS.some(t=>t[0]===kpiSel) ? kpiSel : 'geo';
  let h='<div class="kpisel" role="group" aria-label="Chọn tiêu chí">'
    + KPI_TABS.map(t=>'<button type="button" aria-pressed="'+(t[0]===sel)+'" class="'+(t[0]===sel?'on':'')+'" data-kpi="'+t[0]+'">'+t[1]+'</button>').join('')
    + '</div>';
  h+=kpiLead(sel);
  const MERGED=['dt','payload','username'];
  if(MERGED.includes(sel)) h+=`<p class="kpisel-n">Ba tiêu chí <b>Distance &amp; Time · Payload · User name</b> nằm chung một trang —
    bấm nút là nhảy tới đúng mục.</p>`;
  if(sel==='ontime'||sel==='successful') h+=`<p class="kpisel-n">On time và Successful dùng chung cờ đúng hạn nên chung một trang.</p>`;
  if(sel==='geo') h+=pGeo();
  else if(sel==='ontime'||sel==='successful') h+=pOntime();
  else h+=pAccuracy();
  return h;
}


/* ══════════════════════════════════════════════════════════════
   KHỐI TÓM TẮT TRỰC QUAN — thay cho dãy hero + 7 thẻ KPI dạng chữ.
   Mọi con số lấy thẳng từ row() và DATA.thresholds, không tính lại, không bịa.
   LƯU Ý: Data Accuracy KHÔNG phải một tỷ lệ phần trăm — nó là cổng chặn VÀ
   trên 6 tiêu chí, nên ở đây biểu diễn bằng "n/6 tiêu chí đạt", không phải %.
   ══════════════════════════════════════════════════════════════ */

/* Vòng tròn số tiêu chí đạt */
function ovRing(pass,total,ok){
  /* cutout 68%: (2R-sw)/(2R+sw)=0.68 -> sw = 0,1905*2R */
  const R=52, SW=20, C=2*Math.PI*R, f=total? pass/total : 0, GAP=2;
  return `<div class="ovring-w"><svg viewBox="0 0 132 132" role="img" aria-label="${pass} trên ${total} tiêu chí đạt">
    <circle cx="66" cy="66" r="${R}" fill="none" stroke="var(--grid)" stroke-width="${SW}"/>
    <circle class="rd-ring" cx="66" cy="66" r="${R}" fill="none" stroke="${ok?'var(--up)':'var(--down)'}" stroke-width="${SW}"
      stroke-linecap="butt" stroke-dasharray="${Math.max(0,C*f-GAP).toFixed(1)} ${(C*(1-f)+GAP).toFixed(1)}"
      transform="rotate(-90 66 66)"/>
    <text x="66" y="63" text-anchor="middle" class="ovr-n">${pass}/${total}</text>
    <text x="66" y="84" text-anchor="middle" class="ovr-l">tiêu chí đạt</text>
  </svg></div>`;
}
/* Thanh vị trí so với ngưỡng — dùng cho tiêu chí dạng phần trăm */
function ovBar(v,thr){
  if(v==null||thr==null) return '';
  const lo=Math.min(v,thr)-8, span=Math.max(1,100-lo);
  const px=x=>Math.max(0,Math.min(100,(x-lo)/span*100));
  return `<span class="ovbar" role="img" aria-label="Đạt ${pct(v)}, ngưỡng ${pct(thr)}">
    <i class="f" style="width:${px(v).toFixed(1)}%;background:${v>=thr?'var(--good)':'var(--crit)'}"></i>
    <i class="m" style="left:${px(thr).toFixed(1)}%"></i></span>`;
}
/* Thanh hạn mức — dùng cho tiêu chí đếm số chuyến (càng thấp càng tốt) */
function ovQuota(used,limit){
  if(limit==null||limit<=0) return '';
  const p=Math.max(0,Math.min(100,used/limit*100));
  return `<span class="ovbar" role="img" aria-label="Đã dùng ${fmt(used)} trên hạn mức ${fmt(limit)}">
    <i class="f" style="width:${p.toFixed(1)}%;background:${used>=limit?'var(--crit)':'var(--good)'}"></i>
    <i class="m" style="left:100%"></i></span>`;
}

/* ══ THỐNG KÊ LỖI cho tab Tổng quan ══════════════════════════════════
   Mọi con số lấy từ trường đã tính sẵn; hàm này KHÔNG tính lại KPI nào.
   Ba câu hỏi, ba khối:
     1. Lỗi nằm ở tiêu chí nào  -> đếm dòng bảng đơn lỗi theo cột `loi`
     2. Nguyên nhân gốc của Geo -> 3 điều kiện, cùng đơn vị ĐƠN nên so sánh được
     3. Ai sửa bao nhiêu thì đạt -> margin.*_margin, xếp việc nhẹ nhất lên trước  */
function ovErrStats(r, all){
  const scope = isAdmin() ? cur : role;
  const rows  = DATA.errors.filter(e => scope==='ALL' || e.TenantName===scope);
  const nRow  = rows.length;

  /* ---- 1. Lỗi theo tiêu chí. Đếm theo DÒNG (mỗi dòng là một đơn) nên bốn
       nhóm cùng đơn vị, so sánh được. Không trộn "đơn" với "chuyến". ---- */
  const CAT = [['Geo','Geo Compliance','var(--s1)'],['On-time','On time','var(--s2)'],
               ['Distance&Time','Distance & Time','var(--s3)'],['Payload','Payload','var(--s4)']];
  const cnt = {}; let multi = 0;
  rows.forEach(e => {
    const ks = String(e.loi||'').split(' + ').filter(Boolean);
    if(ks.length>1) multi++;
    ks.forEach(k => cnt[k] = (cnt[k]||0)+1);
  });
  const maxCat = Math.max(1, ...CAT.map(c => cnt[c[0]]||0));

  /* den  = mẫu số cho BỀ RỘNG thanh (giá trị lớn nhất trong nhóm)
     pden = mẫu số cho PHẦN TRĂM (tổng của chính nhóm đó) — hai thứ khác nhau,
            trộn lẫn là ra phần trăm sai. */
  const bar = (name, val, den, pden, color, go) => `
    <button type="button" class="ebar" ${go} title="Bấm để xem danh sách đơn"
      data-tip-id="${tipRef(`<b>${esc(name)}</b><div class="r">${fmt(val)} đơn${pden?` · ${num(val/pden*100,0)}% số đơn lỗi`:''}</div><div class="r">Bấm để xem danh sách đơn</div>`)}">
      <span class="ebar-n">${esc(name)}</span>
      <span class="ebar-t"><i class="ebar-f" style="width:${den?Math.max(2,val/den*100):0}%;background:${color}"></i></span>
      <span class="ebar-v">${fmt(val)} <em>đơn · ${pden?num(val/pden*100,0):0}%</em></span>
    </button>`;

  let h = `<section class="estat" aria-label="Thống kê lỗi">
    <div class="estat-h"><span class="estat-t">Lỗi đang ở đâu — và cần làm gì</span>
      <span class="estat-s">${fmt(nRow)} đơn có lỗi trên ${fmt(r.orders)} đơn của kỳ${
        all?'':' · NPP '+esc(scope)}</span></div>
    <div class="estat-g">`;

  h += `<div class="estat-c">
    <p class="estat-ct">Lỗi thuộc tiêu chí nào</p>
    <p class="estat-cs">Bốn nhóm đều đếm theo số đơn nên so được với nhau. Bấm vào một nhóm để xem danh sách đơn của nhóm đó.</p>
    ${CAT.map(([k,lbl,c]) => bar(lbl, cnt[k]||0, maxCat, nRow, c,
        `data-go="errors" data-type="${esc(k)}"${(isAdmin()&&scope!=='ALL')?` data-npp="${esc(scope)}"`:''}`)).join('')}
    ${multi?`<p class="estat-f">${fmt(multi)} đơn dính từ hai tiêu chí trở lên nên tổng bốn nhóm lớn hơn ${fmt(nRow)} đơn.</p>`:''}
  </div>`;

  /* ---- 2. Nguyên nhân gốc của Geo — chỉ hiện khi Geo thực sự có lỗi ---- */
  const gv=r.geo_v_fail||0, gw=r.geo_w_fail||0, gx=r.geo_x_fail||0, gs=gv+gw+gx;
  if(gs>0){
    const gm = Math.max(1,gv,gw,gx);
    const gden = r.geo_fail || gs;   /* phần trăm tính trên SỐ ĐƠN lỗi Geo, không phải tổng dòng lỗi */
    const top = [['Lệch vị trí',gv],['Outlet→outlet',gw],['Ngoài giờ',gx]].sort((a,b)=>b[1]-a[1])[0];
    h += `<div class="estat-c">
      <p class="estat-ct">Geo hỏng vì điều kiện nào</p>
      <p class="estat-cs">Đơn phải đạt đủ cả 3 điều kiện mới tính là giao đúng chỗ. Đang hỏng nhiều nhất ở <b>${esc(top[0])}</b> —
        chiếm <b>${num(top[1]/gden*100,0)}%</b> số đơn lỗi Geo. Sửa chỗ này lợi nhất.</p>
      ${bar('Lệch vị trí > '+fmt(T_RAD)+'m', gv, gm, gden, 'var(--s1)', 'data-go="geo"')}
      ${bar('Outlet→outlet ≤ '+fmt(TH.geo_gap_min??2)+' phút', gw, gm, gden, 'var(--s1)', 'data-go="geo"')}
      ${bar('Ngoài giờ '+WH_TXT, gx, gm, gden, 'var(--s1)', 'data-go="geo"')}
      <p class="estat-f">Cộng dồn ${fmt(gs)} lượt trên ${fmt(r.geo_fail)} đơn lỗi Geo — có đơn phạm nhiều điều kiện cùng lúc.${
        (r.geo_x_only||0)>0?` Riêng <b>${fmt(r.geo_x_only)}</b> đơn chỉ sai vì giờ giao, vị trí hoàn toàn đúng — đây là việc của <b>điều phối</b>, không phải GPS.`:''}</p>
    </div>`;
  }

  /* ---- 3. Việc cần làm: xếp NHẸ NHẤT lên trước để chốt nhanh ---- */
  const jobs = [];
  SB().filter(x => scope==='ALL' || x.npp===scope).forEach(x => {
    const m = DATA.margin ? DATA.margin[x.npp] : null;
    if(!m) return;
    if(x.v_geo==='FAIL')     jobs.push({npp:x.npp, k:'Geo Compliance',  n:-m.geo_margin, u:'đơn',    t:'Geo',
                                        w:`đang ${pct(x.geo_pct)}, ngưỡng ≥${num(T_GEO,0)}%`});
    if(x.v_ontime==='FAIL')  jobs.push({npp:x.npp, k:'On time',         n:-m.ot_margin,  u:'đơn',    t:'On-time',
                                        w:`đang ${pct(x.ot_pct)}, ngưỡng >${num(T_OT,0)}%`});
    if(x.v_payload==='FAIL') jobs.push({npp:x.npp, k:'Payload',         n:x.payload_plans_fail, u:'chuyến', t:'Payload',
                                        w:`chuyến chở quá ${num(T_PLR,1)} lần tải trọng`});
    if(x.v_dt==='FAIL'){ const needDt2=Math.max(1, Math.floor(x.dt_routes_fail - (T_DTR_MONTH_PCT/100)*x.plans) + 1);
      jobs.push({npp:x.npp, k:'Distance & Time', n:needDt2, u:'chuyến', t:'Distance&Time',
                                        w:`${fmt(x.dt_routes_fail)} chuyến hỏng / ${fmt(x.plans)} chuyến (${pct(x.dt_route_fail_pct)}), ngưỡng dưới ${fmt(T_DTR_MONTH_PCT)}%`}); }
  });
  /* v43: đơn vị ưu tiên là NPP (cổng VÀ). NPP ít tiêu chí phải sửa đứng trước, rồi tới việc nhẹ nhất. */
  const SIGK={'Geo':'geo','On-time':'ot','Payload':'pl'};
  const byNpp={}; jobs.forEach(j=>{ j.sig=SIGK[j.t]?nppSignals(j.npp,SIGK[j.t]):[]; (byNpp[j.npp]=byNpp[j.npp]||[]).push(j); });
  Object.values(byNpp).forEach(a=>a.sort((x,y)=>x.n-y.n));
  const nppOrder=Object.keys(byNpp).sort((a,b)=>(byNpp[a].length-byNpp[b].length)||(byNpp[a][0].n-byNpp[b][0].n));
  jobs.length=0;
  nppOrder.forEach(n=>byNpp[n].forEach((j,i)=>{ j.first=(i===0); j.cnt=byNpp[n].length; jobs.push(j); }));

  /* NPP đang ĐẠT nhưng khoảng đệm mỏng — cảnh báo sớm, không phải việc phải làm */
  const thin = [];
  SB().filter(x => scope==='ALL' || x.npp===scope).forEach(x => {
    const m = DATA.margin ? DATA.margin[x.npp] : null; if(!m) return;
    if(x.v_geo==='PASS'    && m.geo_margin>=0 && m.geo_margin<=5)
      thin.push({npp:x.npp, k:'Geo Compliance', n:m.geo_margin, t:'Geo'});
    if(x.v_ontime==='PASS' && m.ot_margin>=0  && m.ot_margin<=5)
      thin.push({npp:x.npp, k:'On time', n:m.ot_margin, t:'On-time'});
  });
  thin.sort((a,b) => a.n-b.n);
  thin.forEach(t=>{ t.sig=nppSignals(t.npp, t.t==='Geo'?'geo':'ot'); });

  h += `<div class="estat-c">
    <p class="estat-ct">Việc cần làm — theo từng NPP</p>
    <p class="estat-cs">Thưởng chấm theo cổng VÀ nên xếp theo NPP: NPP phải sửa ít tiêu chí hơn đứng trước. Số lớn là số đơn/chuyến tối thiểu phải sửa; dòng nhỏ là điều cần kiểm trước khi làm việc với NPP. Bấm một dòng để mở đúng phần cần rà.</p>
    <div class="etodo">`;
  if(jobs.length){
    h += jobs.map(j => `${j.first&&j.cnt>1?`<p class="etg"><b>${esc(j.npp)}</b> — muốn đạt phải sửa đủ ${fmt(j.cnt)} tiêu chí</p>`:''}<button type="button" class="etd crit"
        data-go="errors" data-type="${esc(j.t)}"${isAdmin()?` data-npp="${esc(j.npp)}"`:''}>
        <span class="etd-npp">${esc(j.npp)}</span>
        <span class="etd-w"><b>${esc(j.k)}</b><br>${j.w}${j.sig.length?`<span class="etd-sig">${j.sig.map(esc).join(' · ')}</span>`:''}</span>
        <span class="etd-n">${fmt(Math.max(1,j.n))}<em>${esc(j.u)} cần sửa</em></span></button>`).join('');
  } else {
    h += `<p class="estat-ok"><b>✓ ${scope==='ALL'?'Không NPP nào đang trượt tiêu chí.':'NPP đang đạt cả 6 tiêu chí.'}</b> Phần dưới là các khoảng đệm mỏng cần giữ.</p>`;
  }
  if(thin.length){
    h += thin.slice(0,2).map(t => `<button type="button" class="etd warn"
        data-go="errors" data-type="${esc(t.t)}"${isAdmin()?` data-npp="${esc(t.npp)}"`:''}>
        <span class="etd-npp">${esc(t.npp)}</span>
        <span class="etd-w"><b>${esc(t.k)}</b><br>đang đạt nhưng đệm rất mỏng${t.sig.length?`<span class="etd-sig">${t.sig.map(esc).join(' · ')}</span>`:''}</span>
        <span class="etd-n">${fmt(t.n)}<em>đơn đệm còn lại</em></span></button>`).join('');
  }
  h += `</div>`;
  const us = DATA.user_sum ? DATA.user_sum[scope==='ALL'?'ALL':scope] : null;
  if(us && us.users_err){
    h += `<p class="estat-f">Lỗi nằm ở <b>${fmt(us.users_err)}</b>/${fmt(us.users)} tài khoản; ba tài khoản đầu chiếm
      <b>${num(us.top3_share,1)}%</b> — ${us.top3_share>=50
        ? 'xử lý vài tài khoản đầu là giải quyết được phần lớn.'
        : 'nhắc riêng từng người sẽ không đủ, cần chuẩn hoá quy trình chung.'}</p>`;
  }
  h += `</div></div>`;   /* đóng thẻ cuối + lưới 3 thẻ */

  /* ---- 4. BẢNG TÀI KHOẢN CẦN NHẮC ------------------------------------
     Xếp theo TỶ LỆ đơn lỗi, không theo số tuyệt đối: người chạy nhiều đơn
     tất nhiên có nhiều lỗi hơn, xếp theo số đếm là quy oan họ.
     [18/09/2026, patch_r27] Trước đây bảng chỉ hiện TOP 8 tài khoản ĐỦ cỡ
     mẫu (>=T_SMALL đơn), tài khoản dưới cỡ mẫu bị tách hẳn khỏi bảng chính.
     Từ nay hiện ĐẦY ĐỦ mọi tài khoản có lỗi trong kỳ, xếp hạng liên tục —
     tài khoản dưới ngưỡng cỡ mẫu vẫn xếp chung nhưng có nhãn "mẫu nhỏ" +
     tooltip cảnh báo ngay cạnh tên, để không quy oan mà cũng không giấu
     ai khỏi bảng. */
  const UA    = (DATA.users && DATA.users[scope==='ALL'?'ALL':scope]) || [];
  const uErr  = UA.filter(u => u.err > 0).sort((a,b) => b.err_pct - a.err_pct);
  const uSmlN = uErr.filter(u => u.orders < T_SMALL).length;
  if(uErr.length){
    const TOPN = uErr;
    const maxP = Math.max(1, ...TOPN.map(u => u.err_pct));
    const showNppCol = (scope === 'ALL');
    const SLIM = (!isAdmin() && scope !== 'ALL');   /* v48 · N4: chủ NPP xem bảng gọn 5 cột */
    const DOM = {'Geo':['d-geo','Geo'],'On-time':['d-ot','Quá hạn'],
                 'Distance&Time':['d-dt','Distance & Time'],'Payload':['d-pl','Xe quá tải']};
    /* Bằng chứng cho câu "đừng xếp theo số tuyệt đối": so ngôi đầu của hai cách xếp */
    const byCnt = uErr.slice().sort((a,b) => b.err - a.err)[0];
    const byPct = uErr[0];
    const contrast = (byCnt && byPct && byCnt.username !== byPct.username)
      ? ` Ví dụ ngay trong kỳ này: <b>${esc(byCnt.username)}</b> nhiều lỗi nhất về số đếm
          (${fmt(byCnt.err)} đơn) nhưng tỷ lệ chỉ ${pct(byCnt.err_pct)}, trong khi
          <b>${esc(byPct.username)}</b> chỉ ${fmt(byPct.err)} đơn lỗi mà tỷ lệ tới ${pct(byPct.err_pct)}.`
      : '';
    const smlNote = uSmlN
      ? ` <b>${fmt(uSmlN)} tài khoản</b> trong bảng chạy dưới ${fmt(T_SMALL)} đơn, có nhãn "mẫu nhỏ" — chỉ vài lỗi đã ra tỷ lệ cao, đừng lấy riêng con số đó để đánh giá người.`
      : '';

    h += `<div class="eacc">
      <p class="estat-ct">Tài khoản cần nhắc — xếp theo tỷ lệ đơn lỗi</p>
      ${(!isAdmin() && scope!=='ALL')
        ? `<p class="estat-cs">Đầy đủ <b>${fmt(uErr.length)} tài khoản</b> có lỗi trong kỳ, xếp hạng liên tục theo tỷ lệ đơn lỗi. Bấm vào tên tài khoản để xem đơn lỗi của tài khoản đó.</p>
           <details class="nwarn"><summary>Đọc trước khi nhắc ai</summary><div>Đây là <b>tài khoản đăng nhập</b>, không chắc là một người cố định:
           tài khoản đặt theo <b>biển số xe</b> có thể do nhiều tài xế dùng chung, tài khoản <b>DSA</b> là của kho.
           Hãy đối chiếu bảng phân công trước khi quy trách nhiệm.${smlNote}${contrast}</div></details>`
        : `<p class="estat-cs">Đầy đủ <b>${fmt(uErr.length)} tài khoản</b> có lỗi trong kỳ, xếp hạng liên tục theo tỷ lệ đơn lỗi.${contrast}
        Bấm tên tài khoản để mở đúng các đơn lỗi của người đó.</p>
      <div class="eacc-warn"><i>⚠</i><span><b>Trước khi làm việc với ai:</b> đây là <i>tài khoản đăng nhập</i>,
        không chắc là một người cố định. Tài khoản đặt theo <b>biển số xe</b> có thể do nhiều tài xế dùng chung;
        tài khoản <b>DSA</b> là của kho, không phải tài xế. Hãy đối chiếu bảng phân công trước khi quy trách nhiệm.${smlNote}</span></div>`}
      <div class="scroll"><table class="eacc-t">
      <caption class="sr-only">Tài khoản có tỷ lệ đơn lỗi cao nhất</caption>
      <thead><tr>
        <th scope="col">Tài khoản</th>
        ${showNppCol?'<th scope="col">NPP</th>':''}
        ${SLIM?'':'<th scope="col" class="hide-s">Loại</th>'}
        <th scope="col" class="n">Đơn giao</th>
        <th scope="col" class="n">Đơn lỗi</th>
        <th scope="col" class="n">Tỷ lệ lỗi</th>
        ${SLIM?'':`<th scope="col" class="n hide-s">Geo</th>
        <th scope="col" class="n hide-s">Quá hạn</th>
        <th scope="col" class="n hide-s">D&amp;T</th>
        <th scope="col" class="n hide-s">Quá tải</th>`}
        <th scope="col">Lỗi chính</th>
      </tr></thead><tbody>
      ${TOPN.map((u,i) => {
        const d = DOM[u.dominant] || ['','—'];
        const small = u.orders < T_SMALL;
        return `<tr>
        <th scope="row" data-l="Tài khoản"><span class="ea-rk">${i+1}</span><button type="button" class="ea-u"
            data-go="errors" data-user="${esc(u.username)}"${isAdmin()?` data-npp="${esc(u.TenantName)}"`:''}
            aria-label="Xem đơn lỗi của tài khoản ${esc(u.username)}">${esc(u.username)}<span>→</span></button>${small?`<span class="chip gap ea-sml" title="Mẫu nhỏ: dưới ${fmt(T_SMALL)} đơn — chỉ vài lỗi đã ra tỷ lệ cao, thận trọng khi dùng để quy trách nhiệm"><span class="ic">◐</span>mẫu nhỏ</span>`:''}</th>
        ${showNppCol?`<td data-l="NPP"><b>${esc(u.TenantName)}</b></td>`:''}
        ${SLIM?'':`<td class="hide-s" data-l="Loại"><span class="ea-ty">${esc(u.utype)}</span></td>`}
        <td class="n" data-l="Đơn giao">${fmt(u.orders)}</td>
        <td class="n" data-l="Đơn lỗi">${fmt(u.err)}</td>
        <td class="n" data-l="Tỷ lệ lỗi"><span class="ea-pct">
          <span class="ea-tr"><i style="width:${Math.round(u.err_pct/maxP*100)}%"></i></span>
          <b>${pct(u.err_pct)}</b></span></td>
        ${SLIM?'':`<td class="n hide-s" data-l="Geo">${u.geo?fmt(u.geo):'—'}</td>
        <td class="n hide-s" data-l="Quá hạn">${u.ot?fmt(u.ot):'—'}</td>
        <td class="n hide-s" data-l="D&T">${u.dt_plans?fmt(u.dt_plans):'—'}</td>
        <td class="n hide-s" data-l="Quá tải">${u.pl?fmt(u.pl):'—'}</td>`}
        <td data-l="Lỗi chính">${DOM[u.dominant]
          ? `<button type="button" class="ea-dom ${d[0]}" data-go="errors" data-type="${esc(u.dominant)}"${isAdmin()?` data-npp="${esc(u.TenantName)}"`:''}
              aria-label="Xem các đơn lỗi ${esc(d[1])}">${esc(d[1])}</button>`
          : `<span class="ea-dom ${d[0]}">${esc(d[1])}</span>`}${u.dominant==='Payload'?'<span class="ea-note">do xếp tải — làm việc với điều phối/kho, không phải tài xế</span>':''}</td>
      </tr>`;}).join('')}
      </tbody></table></div>`;
    h += `</div>`;
  }

h += `</section>`;
  return h;
}
/* v44 · L2: khối lượng kỳ — Số plan (chuyến) và Đơn đã giao. Số khối lượng, KHÔNG phải kết quả tiêu chí. */
function ovVolume(r,all){
  const orders=r.orders||0, plans=r.plans||0;
  const ST={}; let out=0;
  DATA.errors.forEach(e=>{ if((all||e.TenantName===cur) && e.Status && e.Status!=='Delivered'){ ST[e.Status]=(ST[e.Status]||0)+1; out++; } });
  const done=orders-out, perPlan=plans?orders/plans:0;
  const P=DATA.pop_scen||{}, otAll=P.n_out!=null && P.ot_fail_in_out===P.n_out;
  const list=Object.entries(ST).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<b>${fmt(n)}</b> ${esc(s)}`).join(' · ');
  return `<div class="card ovvol">
    <div class="ovgate-h">Số plan &amp; đơn đã giao</div>
    <div class="ovv-g">
      <div class="ovv"><span class="ovv-k">Số plan</span><span class="ovv-v">${fmt(plans)}</span>
        <span class="ovv-s">chuyến · bình quân ${num(perPlan,1)} đơn/plan</span></div>
      <div class="ovv"><span class="ovv-k">Đơn đã giao</span><span class="ovv-v">${fmt(done)}<small>/${fmt(orders)}</small></span>
        <span class="ovv-s">${pct(orders?done/orders*100:0)} tổng đơn</span></div>
    </div>
    <p class="ovv-n">${out
      ? `Chưa giao <b>${fmt(out)} đơn</b>: ${list}${otAll?' — các đơn này đang bị tính quá hạn ở On time.':'.'}`
      : `Toàn bộ ${fmt(orders)} đơn đã giao.`}</p>
    <p class="ovv-f">Đếm theo trạng thái đơn trên TMS. Đây là số lượng đơn đã giao, không phải kết quả Successful.</p>
  </div>`;
}
/* ══ v48 · N1: MÀN HÌNH CHO CHỦ NPP ══════════════════════════════════════
   Người xem: chủ NPP, ít quen đọc số. Nguyên tắc: một màn hình đầu = một câu trả lời;
   nói bằng số đếm và việc phải làm, không nói bằng "điểm %".
   Mọi con số lấy y như cũ (row(), gapToPass(), nppSignals()) — không tính lại gì. */
const KPI_VN={geo:['Giao đúng chỗ','Geo Compliance'], ontime:['Giao đúng hạn','On time'],
  dt:['Khoảng cách 2 điểm giao','Distance & Time'], payload:['Không chở quá tải','Payload'],
  username:['Tài khoản hợp lệ','User name'], successful:['Giao thành công','Successful']};
const WHO_VN={geo:'Tài xế bấm xác nhận ngay tại cửa hàng · quản lý NPP rà lại toạ độ điểm bán',
  ot:'Điều phối &amp; kho: chốt đơn sớm và xuất bến kịp giờ',
  dt:'Điều phối: giãn các điểm giao đang quá sát giờ nhau',
  pl:'Điều phối &amp; kho xếp lại hàng — không phải lỗi tài xế'};
const GAPKEY={geo:'geo', ontime:'ot', dt:'dt', payload:'pl', successful:'ot'};
/* v49 · V3: biểu tượng 6 ô — vẽ bằng SVG nội tuyến, aria-hidden vì chữ đã nói đủ nghĩa */
const NB_ICON={
  /* ── Bo icon 24x24 THUAN STROKE ─────────────────────────────────────────
     Nguyen tac thiet ke (giu nguyen cho cac vong sau):
     - Luoi 24x24, vung ve thuc 18x18 (le 3px moi ben) -> moi icon cung "suc nang"
       thi giac, khong cai to cai nho.
     - Mot do day net duy nhat 1.7, dau tron, noi tron -> nhin nhu mot bo.
     - Hinh hoc toi gian: moi icon nhieu nhat 3 y (than + chi tiet + diem nhan).
     - Khong to mau dac, khong do bong ben trong glyph: mau do khung ngoai lo. */
  geo:'<path d="M12 20.9c4.3-4.7 6.5-8.2 6.5-10.6a6.5 6.5 0 0 0-13 0c0 2.4 2.2 5.9 6.5 10.6Z"/><circle cx="12" cy="10.2" r="2.5"/>',
  ontime:'<circle cx="12" cy="12" r="8.3"/><path d="M12 7.2V12l3.3 1.9"/>',
  dt:'<circle cx="5.8" cy="18.2" r="2.4"/><circle cx="18.2" cy="5.8" r="2.4"/><path d="M7.6 16.4C9 12.5 12.5 9 16.4 7.6"/>',
  payload:'<path d="M2.9 16.3V7.9a1.1 1.1 0 0 1 1.1-1.1h8.2a1.1 1.1 0 0 1 1.1 1.1v8.4"/><path d="M13.3 10.3h3.4l3.4 3.3v2.7h-1.5"/><path d="M9.2 16.3h5.3"/><circle cx="7.3" cy="17.9" r="1.7"/><circle cx="16.5" cy="17.9" r="1.7"/>',
  username:'<rect x="3.3" y="5.3" width="17.4" height="13.4" rx="2.7"/><circle cx="9" cy="10.7" r="1.9"/><path d="M6 15.7c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4"/><path d="M14.9 10.2h3.2M14.9 13.3h3.2"/>',
  successful:'<path d="M12 3.2 19.5 6v5.9c0 4.1-3 7.1-7.5 8.9-4.5-1.8-7.5-4.8-7.5-8.9V6z"/><path d="M9.2 11.9l2.3 2.3 3.9-4.5"/>'
};
const nbIcon=k=>`<svg class="nb-ic" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${NB_ICON[k]||''}</svg>`;
function ovNppBoxes(r){
  const ROWS=[
    ['geo', r.v_geo, fmt(r.geo_fail)+' đơn sai chỗ', 'Geo'],
    ['ontime', r.v_ontime, fmt(r.ot_fail)+' đơn trễ hạn', 'On-time'],
    ['dt', r.v_dt, fmt(r.dt_routes_fail)+' chuyến hỏng', 'Distance&Time'],
    ['payload', r.v_payload, fmt(r.payload_plans_fail)+' chuyến quá tải', 'Payload'],
    ['username', r.v_username, fmt(r.username_fail)+' đơn sai tài khoản', ''],
    ['successful', r.v_successful, fmt(r.ot_fail)+' đơn chưa xong đúng hạn', '']
  ];
  return `<div class="nb">${ROWS.map(([k,v,n,type])=>{
    const bad=v==='FAIL', tag=`${bad?'✕':'✓'}`;
    const inner=`<span class="nb-r"><span class="nb-i" aria-hidden="true">${tag}</span>${nbIcon(k)}</span>
      <span class="nb-t">${esc(KPI_VN[k][0])}</span>
      <span class="nb-o">${esc(KPI_VN[k][1])}</span>
      <span class="nb-n">${n}</span>
      <span class="sr-only">${bad?L.fail:L.pass}</span>`;
    return type
      ? `<button type="button" class="nb-x ${bad?'no':'ok'}" data-go="errors" data-type="${esc(type)}"
           aria-label="${esc(KPI_VN[k][0])}: ${bad?L.fail:L.pass}. Xem danh sách đơn">${inner}<span class="nb-go" aria-hidden="true">→</span></button>`
      : `<div class="nb-x ${bad?'no':'ok'}">${inner}</div>`;}).join('')}</div>`;
}
function ovNppJobs(r){
  const G=gapToPass(r), M=(DATA.margin||{})[cur];
  if(!G.length){
    const thin=[M&&M.geo_margin!=null?['Giao đúng chỗ', M.geo_margin,'đơn']:null,
                M&&M.ot_margin!=null?['Giao đúng hạn', M.ot_margin,'đơn']:null].filter(Boolean)
               .sort((a,b)=>a[1]-b[1])[0];
    return `<div class="njob ok">
      <p class="nj-h">Đang đạt cả 6 mục — giữ nguyên cách làm hiện tại.</p>
      ${thin?`<p class="nj-c">Mục sát nhất: <b>${esc(thin[0])}</b> — còn dư <b>${fmt(thin[1])} ${thin[2]}</b> trước khi chạm mức phải đạt.</p>`:''}</div>`;
  }
  const TYPE={geo:'Geo', ot:'On-time', dt:'Distance&Time', pl:'Payload'};
  const NAME={geo:'Giao đúng chỗ', ot:'Giao đúng hạn', dt:'Khoảng cách 2 điểm giao', pl:'Không chở quá tải'};
  const UNIT={geo:'đơn cần sửa', ot:'đơn cần sửa', dt:'chuyến cần sửa', pl:'chuyến cần sửa'};
  return `<div class="njobs">${G.map(g=>`
    <div class="njob">
      <p class="nj-n">${fmt(g.n)}<span>${esc(UNIT[g.k]||'cần sửa')}</span></p>
      <p class="nj-t">${esc(NAME[g.k]||'')}</p>
      <p class="nj-w">${WHO_VN[g.k]||''}</p>
      ${TYPE[g.k]?`<button type="button" class="nj-b" data-go="errors" data-type="${esc(TYPE[g.k])}">Xem danh sách đơn <span aria-hidden="true">→</span></button>`:''}
    </div>`).join('')}</div>`;
}
/* v48 · N2: lưới ô đếm đơn — mỗi ô là 1 đơn, ô đỏ là đơn bấm sai chỗ.
   Dành cho người không quen đọc %: nhìn số ô đỏ là thấy nhiều hay ít. */
/* v49 · V1: modal xem nhanh một tài khoản. Chỉ đọc DATA, không tính lại gì. */
let qmBack=null, flashNext=false;
function qmClose(){ const m=$('#qm'); if(!m||m.hidden) return; m.hidden=true; document.body.classList.remove('qm-on');
  if(qmBack&&qmBack.focus) qmBack.focus(); qmBack=null; }
function qmOpen(user, npp, back){
  const m=$('#qm'); if(!m) return;
  const list=(DATA.users&&DATA.users[npp])||[]; const u=list.find(x=>x.username===user)||{};
  const rows=DATA.errors.filter(e=>e.username===user && (!npp||npp==='ALL'||e.TenantName===npp));
  const STAT=[['Giao đúng chỗ',u.geo||0,'Geo'],['Giao đúng hạn',u.ot||0,'On-time'],
              ['Khoảng cách 2 điểm giao',u.dt||0,'Distance&Time'],['Không chở quá tải',u.pl||0,'Payload']];
  m.querySelector('.qm-t').textContent=user;
  m.querySelector('.qm-s').textContent=`NPP ${npp} · ${u.utype||'—'} · ${fmt(u.orders||0)} đơn giao · ${fmt(u.err||0)} đơn lỗi`;
  m.querySelector('.qm-b').innerHTML=`
    <div class="qm-g">${STAT.map(([k,v])=>`<div class="qm-s1"><p class="qm-k">${esc(k)}</p>
      <p class="qm-v ${v?'no':''}">${fmt(v)}</p><p class="qm-u">đơn lỗi</p></div>`).join('')}</div>
    <p class="qm-n">${fmt(rows.length)} dòng vi phạm trong kỳ${rows.length>10?' — hiện 10 dòng gần nhất':''}.</p>
    <div class="wrap"><table class="rt qm-t2"><thead><tr><th scope="col">Ngày</th><th scope="col">Chuyến</th>
      <th scope="col">Điểm bán</th><th scope="col">Loại lỗi</th><th scope="col">Chi tiết</th></tr></thead><tbody>
      ${rows.slice(-10).reverse().map(e=>`<tr>
        <td data-l="Ngày">${esc(e.dkey||'')}</td><td data-l="Chuyến">${esc(e.PlanNumber||'')}</td>
        <td data-l="Điểm bán">${esc(e.OutletName||e.OutletCode||'')}</td>
        <td data-l="Loại lỗi">${esc(e.loi||'')}</td>
        <td data-l="Chi tiết">${esc(e.geo_why || (isNum(e.late_days)&&e.late_days>0?`trễ ${fmt(e.late_days)} ngày`:'')
          || (e.Status&&e.Status!=='Delivered'?e.Status:'') || '—')}</td></tr>`).join('')||
        '<tr><td colspan="5">Không có dòng vi phạm nào trong phạm vi đang xem.</td></tr>'}
    </tbody></table></div>`;
  m.querySelector('.qm-f').innerHTML=`<button type="button" class="qm-go" data-go="errors" data-user="${esc(user)}"${
    isAdmin()?` data-npp="${esc(npp)}"`:''}>Xem đầy đủ ở tab Đơn lỗi <span aria-hidden="true">→</span></button>`;
  m.querySelector('.qm-go').addEventListener('click',()=>{ qmClose(); });
  m.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{
    if(isAdmin() && b.dataset.npp){ cur=b.dataset.npp; $('#rls').value=cur; syncMeta(); }
    epage=1; go('errors',{user:b.dataset.user});
  }));
  qmBack=back||null; m.hidden=false; document.body.classList.add('qm-on');
  const f=m.querySelector('.qm-c'); if(f) f.focus();
  say(`Đã mở tóm tắt tài khoản ${user}`);
}
/* bẫy tiêu điểm + Esc + bấm nền để đóng */
document.addEventListener('keydown',e=>{
  const m=$('#qm'); if(!m||m.hidden) return;
  if(e.key==='Escape'){ e.preventDefault(); qmClose(); return; }
  if(e.key!=='Tab') return;
  const f=[...m.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(x=>x.offsetParent!==null);
  if(!f.length) return;
  const first=f[0], last=f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
});
document.addEventListener('click',e=>{ if(e.target.closest('[data-qclose]')) qmClose(); });
function ovNppDots(r){
  /* v3.2 — thay luoi o dem don bang BIEU DO THEO NGAY.
     Chi doc DATA.daily[cur] co san, khong tinh lai gi. */
  const D=(DATA.daily||{})[cur]||[];
  if(D.length<2) return '';
  const days=D.map(x=>esc(x.day));
  const vol =D.map(x=>x.orders||0);
  const S=[];
  if(D.some(x=>x.geo!=null)) S.push({n:'Giao đúng chỗ', c:'var(--s1)', d:'none', v:D.map(x=>x.geo==null?0:x.geo)});
  /* Khong dung mau do cho duong On time: duong NGUONG cung mau do -> nhin lan. */
  if(D.some(x=>x.ot!=null))  S.push({n:'Giao đúng hạn', c:'var(--s4)', d:'4 3',  v:D.map(x=>x.ot==null?0:x.ot)});
  if(!S.length) return '';
  const worst=D.filter(x=>x.geo!=null).sort((a,b)=>a.geo-b.geo)[0];
  return `<div class="card ndot">
    <h2>Theo ngày trong kỳ</h2>
    <p class="cap">Mỗi điểm là kết quả của riêng ngày đó.${worst?` Ngày thấp nhất: <b>${esc(worst.day)}</b> — ${pct(worst.geo)} trên ${fmt(worst.orders)} đơn.`:''}</p>
    <div class="legend">${S.map(x=>`<span><i style="background:${x.c}"></i>${esc(x.n)}</span>`).join('')}
      <span><i style="background:var(--down)"></i>Ngưỡng</span></div>
    ${lines(days,S,{w:820,h:250,min:50,vol,
      a11y:'Kết quả theo từng ngày giao trong kỳ',
      thresholds:[{v:T_GEO,label:'ngưỡng ≥'+num(T_GEO,0)+'%',c:'var(--crit)'}]})}
  </div>`;
}
/* v48 · N2: thanh vạch đích — nói bằng SỐ ĐƠN, không nói bằng điểm phần trăm. */
/* v49 · V5: hai tiêu chí có số nửa kỳ (Geo, On time) — nói bằng "tốt lên / kém đi" trước, số để sau. */
function ovNppHalf(){
  const H=(DATA.ci_half||{})[cur], MH=DATA.half_meta||{}; if(!H) return '';
  const row=(nm,a,b)=>{ if(a==null||b==null) return '';
    const d=b-a, up=d>=0;
    return `<li><b>${esc(nm)}</b>: ${up?'<span class="nh-up">tốt lên</span>':'<span class="nh-dn">kém đi</span>'}
      — ${pct(a)} → <b>${pct(b)}</b> (${up?'▲':'▼'}${num(Math.abs(d),2)} điểm)</li>`;};
  const items=row('Giao đúng chỗ',H.geo_h1,H.geo_h2)+row('Giao đúng hạn',H.ot_h1,H.ot_h2);
  if(!items) return '';
  return `<div class="card nhalf"><h2>Mấy ngày gần đây có tốt lên không</h2>
    <ul class="nh-l">${items}</ul>
    <p class="cap">${esc(MH.p1||'')} so với ${esc(MH.p2||'')} — <b>số nửa kỳ, chưa dùng để chấm kết quả</b>.</p></div>`;
}
function ovNppBullet(r){
  const tot=r.geo_scope_orders||0; if(!tot) return '';
  const okNow=tot-(r.geo_fail||0), need=Math.ceil(T_GEO/100*tot);
  const p=x=>Math.max(0,Math.min(100,x/tot*100));
  const pass=okNow>=need;
  return `<div class="card nbul">
    <h2>Mình đang ở đâu so với mức phải đạt</h2>
    <div class="nbul-b" role="img" aria-label="Đang ${fmt(okNow)} đơn đúng chỗ, cần ít nhất ${fmt(need)} đơn">
      <i class="nbul-f ${pass?'ok':'no'}" style="width:${p(okNow).toFixed(1)}%"></i>
      <i class="nbul-m" style="left:${p(need).toFixed(1)}%"></i>
    </div>
    <p class="nbul-t"><b>${fmt(okNow)} đơn</b> đang đúng chỗ · vạch đen là mức phải đạt: <b>${fmt(need)} đơn</b>
      ${pass?`<span class="nbul-ok">— đang dư ${fmt(okNow-need)} đơn</span>`:`<span class="nbul-no">— còn thiếu ${fmt(need-okNow)} đơn</span>`}</p>
  </div>`;
}
/* v50 · X1: dải kết quả + 3 ô khối lượng, dựng theo bố cục bản mẫu v46 (không dùng thư viện ngoài). */
function ovNppHead(r){
  const DAYS=DATA.meta.days||0, THIN=DAYS>0&&DAYS<14;
  const ok=r.overall==='PASS', nPass=6-(r.n_fail||0);
  const out=DATA.errors.filter(e=>e.TenantName===cur && e.Status && e.Status!=='Delivered').length;
  const done=(r.orders||0)-out;
  const nErr=DATA.errors.filter(e=>e.TenantName===cur).length;
  const line = ok ? 'Đang đạt cả 6 mục — đủ điều kiện nhận 15% thưởng.'
    : `Còn <b>${fmt(r.n_fail||0)} việc</b> phải sửa thì mới nhận được <b>15% thưởng</b>.`;
  const tile=(lbl,val,sub,tip)=>`<div class="card nt">
    <p class="nt-k">${esc(lbl)} <span class="tip nt-q" data-tip-id="${tipRef(tip)}" tabindex="0" role="button" aria-label="Giải thích ${esc(lbl)}">?</span></p>
    <p class="nt-v">${val}</p><p class="nt-s">${sub}</p></div>`;
  return `<div class="nhead">
    <section class="card nhx ${ok?'ok':'no'}">
      ${ovRing(nPass,6,ok)}
      <div class="nhx-m">
        <p class="nhx-k">NPP ${esc(cur)} · ${THIN?'KẾT QUẢ TẠM TÍNH':'KẾT QUẢ'}</p>
        <p class="nhx-v"><span aria-hidden="true">${ok?'✓':'✕'}</span> ${ok?'ĐANG ĐẠT':'CHƯA ĐẠT'}</p>
        <p class="nhx-l">${line}</p>
        <p class="nhx-s">${esc(DATA.meta.period)}${THIN?` · kỳ mới ${fmt(DAYS)} ngày, chưa dùng để chấm thưởng`:''}</p>
      </div>
    </section>
    ${tile('Số plan', fmt(r.plans), `chuyến · bình quân ${num(r.plans?r.orders/r.plans:0,2)} đơn/plan`,
      '<b>Số plan</b><div class="r">Số chuyến giao trong kỳ (mỗi plan là một chuyến).</div>')}
    ${tile('Đơn đã giao', `${fmt(done)}<small>/${fmt(r.orders)}</small>`,
      `${pct(r.orders?done/r.orders*100:0)} tổng đơn${out?` · ${fmt(out)} đơn chưa giao`:''}`,
      '<b>Đơn đã giao</b><div class="r">Đếm theo trạng thái đơn trong TMS (Status = Delivered).</div><div class="r">Đây là số khối lượng, không phải kết quả tiêu chí Successful.</div>')}
    ${tile('Đơn có lỗi', fmt(nErr), 'cả kỳ · dính ít nhất một tiêu chí',
      '<b>Đơn có lỗi</b><div class="r">Số đơn bị bắt lỗi ở ít nhất một trong sáu tiêu chí.</div><div class="r">Một đơn có thể dính nhiều tiêu chí cùng lúc.</div>')}
  </div>`;
}
/* v50 · X2: 4 thẻ tiêu chí vận hành. Thanh tiến độ chỉ vẽ cho tiêu chí dạng %,
   tiêu chí đếm chuyến (D&T, Payload) dùng thanh hạn mức có sẵn. */
/* v50 · X3: thẻ 6 tiêu chí — mỗi dòng một tiêu chí, bấm được để mở danh sách đơn. */
function ovNpp6(r){
  const SIX=[
    ['geo','GEO COMPLIANCE', r.v_geo],
    ['ontime','ON TIME', r.v_ontime],
    ['dt','DISTANCE & TIME', r.v_dt],
    ['payload','PAYLOAD', r.v_payload],
    ['username','USER NAME', r.v_username],
    ['successful','SUCCESSFUL', r.v_successful]
  ];
  const DET={
    geo:{l:`<b>${fmt(r.geo_scope_orders-r.geo_fail)}/${fmt(r.geo_scope_orders)}</b> đơn đạt${r.geo_excluded?`<span class="ovp-x"> · không tính ${fmt(r.geo_excluded)} đơn DSA</span>`:''}`,
       k:`<b>${pct(r.geo_pct)}</b> / KPI ≥${num(T_GEO,0)}%`},
    ontime:{l:`<b>${fmt(r.orders-r.ot_fail)}/${fmt(r.orders)}</b> đơn đạt`,
       k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`},
    dt:{l:`<b>${fmt(r.dt_routes_fail)}</b> chuyến hỏng / ${fmt(r.plans)} chuyến (${pct(r.dt_route_fail_pct)})<span class="ovp-x"> · ${fmt(r.dt_orders_fail)} outlet lỗi</span>`,
       k:`KPI &lt;${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng`},
    payload:{l:`<b>${fmt(r.plans-r.payload_plans_fail)}/${fmt(r.plans)}</b> chuyến không quá tải`,
       k:`<b>${pct(r.payload_pct)}</b> / KPI ${num(TH.payload??100,0)}%`},
    username:{l:`<b>${fmt(r.orders-r.username_fail)}/${fmt(r.orders)}</b> đơn đạt`,
       k:`<b>${pct(r.username_pct)}</b> / KPI ${num(TH.username??100,0)}%`},
    successful:{l:`<b>${fmt(r.orders-r.ot_fail)}/${fmt(r.orders)}</b> đơn đạt`,
       k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`, note:'chưa tách khỏi On time'}
  };
  return `<div class="card ovpills"><div class="ovp-h">Trạng thái 6 tiêu chí</div>
    ${SIX.map(([sel,nm,v])=>{const d=DET[sel];
      return `<button type="button" class="ovp st-${v==='FAIL'?'no':'ok'}" data-kpi="${sel}"
             aria-label="${esc(nm)} — xem ở tab Chi tiết KPI">
        <span class="ovp-n">${nm}</span>
        <span class="ovp-c">${chip(v)}</span>
        <span class="ovp-d">${d.l}</span><span class="ovp-k">${d.k}</span>
        <span class="ovp-s">${d.note?esc(d.note):''}</span>
      </button>`;}).join('')}
    <p class="cap">Phải đạt <b>cả 6</b> — hỏng 1 là mất toàn bộ thưởng.</p></div>`;
}
function ovNppKpi(r){
  const dGeo=r.geo_pct-T_GEO, dOt=r.ot_pct-T_OT;
  const M = DATA.margin ? DATA.margin[cur] : null;
  const CARDS=[
    {n:'GEO COMPLIANCE', sel:'geo', type:'Geo', v:r.v_geo, val:pct(r.geo_pct),
     bar:ovBar(r.geo_pct,T_GEO), thr:'ngưỡng ≥ '+num(T_GEO,0)+'%',
     m:sgn(dGeo,2)+' điểm %', sub:fmt(r.geo_fail)+'/'+fmt(r.geo_scope_orders)+' đơn chưa đạt'},
    {n:'ON TIME', sel:'ontime', type:'On-time', v:r.v_ontime, val:pct(r.ot_pct),
     bar:ovBar(r.ot_pct,T_OT), thr:'ngưỡng > '+num(T_OT,0)+'%',
     m:sgn(dOt,2)+' điểm %', sub:fmt(r.ot_fail)+' đơn quá hạn 24h/48h'},
    {n:'DISTANCE & TIME', sel:'dt', type:'Distance&Time', v:r.v_dt, val:fmt(r.dt_routes_fail)+' chuyến',
     bar:ovQuota(r.dt_route_fail_pct,T_DTR_MONTH_PCT), thr:'ngưỡng < '+fmt(T_DTR_MONTH_PCT)+'% tổng chuyến/tháng',
     m: M ? sgn(M.dt_margin,2)+' điểm %' : '',
     sub:pct(r.dt_route_fail_pct)+' của '+fmt(r.plans)+' chuyến · '+fmt(r.dt_orders_fail)+' outlet lỗi'},
    {n:'PAYLOAD', sel:'payload', type:'Payload', v:r.v_payload, val:fmt(r.payload_plans_fail)+' chuyến',
     bar:'', thr:'ngưỡng 0 chuyến quá tải',
     m: r.payload_plans_fail===0 ? 'không chuyến nào quá tải' : 'phải xử lý hết '+fmt(r.payload_plans_fail)+' chuyến',
     sub: r.payload_plans_fail? 'tỷ lệ cao nhất '+num(r.payload_max_ratio,2)+' lần tải khai' : 'tải/xe luôn dưới '+num(T_PLR,1)+' lần'}
  ];
  const FK={geo:['geo',true], ontime:['ot',true], payload:['pl',false]};
  CARDS.forEach(c=>{ const f=FK[c.sel]; if(!f) return;
    c.f=[f[1]?halfTrend(cur,f[0]):'', ...nppSignals(cur,f[0]).map(x=>'<i aria-hidden="true"></i> '+x)].filter(Boolean); });
  return `<h2 class="sect nsect">Bốn tiêu chí vận hành
      <span class="tip nt-q" data-tip-id="${tipRef('<b>Cổng chặn VÀ</b><div class="r">Phải đạt cả 6 tiêu chí. Trượt 1 tiêu chí là mất trọn 15% DIP — không có điểm trung bình, không bù trừ.</div>')}" tabindex="0" role="button" aria-label="Giải thích cách chấm">?</span></h2>
    <div class="ovkpi">${CARDS.map(c=>{const bad=c.v==='FAIL';
      return `<button type="button" class="ovk st-${bad?'no':'ok'}" data-go="errors" data-type="${esc(c.type)}"
        aria-label="${esc(c.n)}: ${bad?L.fail:L.pass}. Xem danh sách đơn">
        <span class="ovk-n">${c.n}</span>
        <span class="ovk-v">${c.val}</span>
        ${c.bar}
        <span class="ovk-t">${esc(c.thr)}</span>
        <span class="ovk-m">${c.m}</span>
        <span class="ovk-s">${c.sub}</span>
        ${c.f&&c.f.length?`<span class="ovk-f">${c.f.map(x=>`<span>${x}</span>`).join('')}</span>`:''}
      </button>`;}).join('')}</div>`;
}
function ovNpp(r){
  const DAYS=DATA.meta.days||0, THIN=DAYS>0&&DAYS<14;
  let h=ovNppHead(r);
  h+=ovNppKpi(r);
  h+=`<div class="nrow2">${ovNpp6(r)}
    <div class="nrow2-b"><h2 class="sect">Việc cần làm</h2>${ovNppJobs(r)}</div></div>`;
  h+=`<details class="ovsec nfold"><summary><span class="ovs-i"></span><span class="ovs-t">Chi tiết lỗi của NPP</span>
      <span class="ovs-c">từng đơn sai · nhóm lỗi · tài khoản đang lỗi nhiều</span></summary><div class="ovs-b">`;
  h+=`<div class="nviz">${ovNppDots(r)}<div class="nviz-c">${ovNppBullet(r)}${ovNppHalf()}</div></div>`;
  h+=ovErrStats(r,false);
  h+=`</div></details>`;
  h+=`<details class="ovsec ovfull"><summary><span class="ovs-i"></span><span class="ovs-t">Bản chi tiết</span>
      <span class="ovs-c">bảng 6 tiêu chí có tỷ lệ · số plan &amp; đơn đã giao · cổng chặn</span></summary><div class="ovs-b">`;
  h+=ovSummary(r,false,true);
  h+=`</div></details>`;
  return h;
}
function ovSummary(r,all,noStats){
  const anyDtFail = SB().some(x=>x.v_dt==='FAIL');
  const vDt = all ? (anyDtFail?'FAIL':'PASS') : r.v_dt;
  const failNpp=SB().filter(x=>x.overall==='FAIL').length, nNpp=SB().length;
  const ok = all ? (failNpp===0) : (r.overall==='PASS');
  const DAYS=DATA.meta.days||0, THIN=DAYS>0&&DAYS<14;
  const nfOf=f=>SB().filter(x=>x[f]==='FAIL').length;

  /* Sáu tiêu chí — verdict lấy y như bản cũ, không đổi quy tắc nào */
  const SIX=[
    {n:'GEO COMPLIANCE', v:r.v_geo,        sel:'geo',        f:'v_geo'},
    {n:'ON TIME',        v:r.v_ontime,     sel:'ontime',     f:'v_ontime'},
    {n:'DISTANCE & TIME',v:vDt,            sel:'dt',         f:'v_dt'},
    {n:'PAYLOAD',        v:r.v_payload,    sel:'payload',    f:'v_payload'},
    {n:'USER NAME',      v:r.v_username,   sel:'username',   f:'v_username'},
    {n:'SUCCESSFUL',     v:r.v_successful, sel:'successful', f:'v_ontime', note:'chưa tách khỏi On time'}
  ];
  const nPass=SIX.filter(k=>k.v==='PASS').length;
  /* v44 · L1: số đạt/tổng + % / KPI cho từng dòng — chỉ đọc số có sẵn, không tính lại verdict.
     Geo: mẫu số là đơn trong phạm vi Geo (đã loại đơn DSA). D&T, Payload: đơn vị là chuyến (plan). */
  const DET={
    geo:       ()=>({l:`<b>${fmt(r.geo_scope_orders-r.geo_fail)}/${fmt(r.geo_scope_orders)}</b> đơn đạt${r.geo_excluded?`<span class="ovp-x"> · không tính ${fmt(r.geo_excluded)} đơn DSA</span>`:''}`,
                     k:`<b>${pct(r.geo_pct)}</b> / KPI ≥${num(T_GEO,0)}%`}),
    ontime:    ()=>({l:`<b>${fmt(r.orders-r.ot_fail)}/${fmt(r.orders)}</b> đơn đạt`,
                     k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`}),
    dt:        ()=>({l:`<b>${fmt(r.dt_routes_fail)}</b> chuyến hỏng / ${fmt(r.plans)} chuyến (${pct(r.dt_route_fail_pct)})<span class="ovp-x"> · ${fmt(r.dt_orders_fail)} outlet lỗi</span>`,
                     k:`KPI &lt;${fmt(T_DTR_MONTH_PCT)}% tổng chuyến/tháng`}),
    payload:   ()=>({l:`<b>${fmt(r.plans-r.payload_plans_fail)}/${fmt(r.plans)}</b> chuyến không quá tải`,
                     k:`<b>${pct(r.payload_pct)}</b> / KPI ${num(TH.payload??100,0)}%`}),
    username:  ()=>({l:`<b>${fmt(r.orders-r.username_fail)}/${fmt(r.orders)}</b> đơn đạt`,
                     k:`<b>${pct(r.username_pct)}</b> / KPI ${num(TH.username??100,0)}%`}),
    successful:()=>({l:`<b>${fmt(r.orders-r.ot_fail)}/${fmt(r.orders)}</b> đơn đạt`,
                     k:`<b>${pct(r.ot_pct)}</b> / KPI &gt;${num(T_OT,0)}%`})
  };

  /* ---- 1. Dải kết quả: câu trả lời đứng trước mọi thứ ---- */
  let h=`<section class="ovhero ${ok?'ok':'no'}">
    <span class="ovh-ic" aria-hidden="true">${ok?'✓':'✕'}</span>
    <span class="ovh-m">
      <span class="ovh-t">Kết quả Data Accuracy — ${all?'Toàn vùng':'NPP '+esc(cur)}</span>
      <span class="ovh-s">${esc(DATA.meta.period)} · ${fmt(r.orders)} đơn · ${fmt(r.plans)} chuyến</span>
    </span>
    <span class="ovh-b">
      <span class="ovh-bk">${THIN?'Kết quả tạm tính':'Kết quả'}</span>
      <span class="ovh-bv">${all ? (failNpp? fmt(failNpp)+'/'+fmt(nNpp)+' NPP KHÔNG ĐẠT' : fmt(nNpp)+'/'+fmt(nNpp)+' NPP ĐẠT') : (ok?'ĐẠT':'KHÔNG ĐẠT')}</span>
      <span class="ovh-bs">${THIN?'<span class="ovh-if">Nếu chốt với số liệu hiện tại:</span> ':''}${all
        ? (failNpp? (THIN?'không':'Không')+' đủ điều kiện 15% DIP — <b>'+SB().filter(x=>x.overall==='FAIL').map(x=>esc(x.npp)).join(' · ')+'</b>' : (THIN?'toàn':'Toàn')+' bộ NPP đủ điều kiện 15% DIP')
        : (ok?(THIN?'đủ':'Đủ')+' điều kiện nhận 15% DIP':(THIN?'không':'Không')+' đủ điều kiện nhận 15% DIP')}</span>
    </span>
  </section>`;

  const dGeo=r.geo_pct-T_GEO, dOt=r.ot_pct-T_OT;
  /* ---- 1b. Dòng kết luận ngay dưới dải kết quả (v42): ai/tiêu chí nào đang trượt, trước mọi thẻ số ---- */
  const fails=SIX.filter(k=>k.v==='FAIL');
  let line;
  if(fails.length){
    const G = all ? [] : gapToPass(r);
    const unit = g => g.k==='dt'||g.k==='pl' ? 'chuyến' : 'đơn';
    /* cổng VÀ: phải sửa ĐỦ mọi tiêu chí đang trượt mới đạt — liệt kê hết, không chọn một */
    const near = !G.length ? '' : (G.length>1
      ? ` — muốn đạt phải sửa đủ ${G.length} tiêu chí: ${G.map(g=>`<b>${esc(KPI_LABEL[g.k]||'')} ${fmt(g.n)} ${unit(g)}</b>`).join(' · ')}`
      : ` — còn thiếu <b>${fmt(G[0].n)} ${unit(G[0])}</b> ở <b>${esc(KPI_LABEL[G[0].k]||'')}</b>`);
    line=`<span class="ovnote-i st-no">✕</span><span>Đang trượt <b>${fails.length}</b> tiêu chí: <b>${fails.map(k=>k.n).join(' · ')}</b>${near}.</span>`;
  } else {
    const thinest=[{k:'Geo Compliance',d:dGeo},{k:'On time',d:dOt}].sort((a,b)=>a.d-b.d)[0];
    line=`<span class="ovnote-i st-ok">✓</span><span>Không có tiêu chí nào đang trượt. Khoảng đệm mỏng nhất: <b>${thinest.k} ${sgn(thinest.d,2)} điểm %</b> so với ngưỡng — giữ khoảng cách này ở các kỳ sau.</span>`;
  }
  if(all && isAdmin()){
    const RK=nppFailRank(SB());
    if(RK.length) line=`<span class="ovnote-i st-no">✕</span><span><b>${fmt(failNpp)}/${fmt(nNpp)} NPP đang trượt.</b> Tiêu chí làm nhiều NPP trượt nhất: ${RK.map(o=>`<b>${esc(o.n)}</b> (${fmt(o.c)} NPP)`).join(' · ')}.</span>`;
  }
  h+=`<p class="ovnote">${line}</p>`;
  if(all && isAdmin()) h+=ovPortfolio();

  /* ---- 2. Vòng tròn 6 tiêu chí + dải trạng thái, thay cho đoạn văn "logic VÀ" ---- */
  if(all && isAdmin()) h+=ovMatrix();
  else h+=`<div class="ovsplit">
    <div class="ovcol"><div class="card ovgate">
      ${ovRing(nPass,6,nPass===6)}
      <div class="ovgate-x">
        <div class="ovgate-h">Cổng chặn <b>VÀ</b></div>
        <p class="ovgate-p">Trượt <b>1 trong 6</b> tiêu chí là mất trọn <b>15% DIP</b> — không có điểm trung bình, không bù trừ.</p>
        ${all?'<div class="ovgate-n">Data Accuracy không phải một tỷ lệ %, mà là kết quả ĐẠT/KHÔNG ĐẠT của cả 6 tiêu chí.</div>':nppStrengths(cur)}
      </div>
    </div>${ovVolume(r,all)}</div>
    <div class="card ovpills">
      <div class="ovp-h">Trạng thái 6 tiêu chí${all?' — mức toàn vùng':''}</div>
      ${SIX.map(k=>{const nf=all?nfOf(k.f):0;
        return `<button type="button" class="ovp st-${k.v==='FAIL'?'no':'ok'}" data-kpi="${k.sel}">
          <span class="ovp-n">${k.n}</span>
          <span class="ovp-c">${chip(k.v)}</span>
          ${(d=>`<span class="ovp-d">${d.l}</span><span class="ovp-k">${d.k}</span>`)(DET[k.sel]())}
          <span class="ovp-s">${k.note?esc(k.note):(all&&nf?fmt(nf)+'/'+nNpp+' NPP không đạt':'')}</span>
        </button>`;}).join('')}
    </div>
  </div>`;

  /* ---- 3. Bốn tiêu chí vận hành: số lớn + thanh ngưỡng, không đoạn văn ---- */
  const M=(!all && DATA.margin) ? DATA.margin[cur] : null;
  const CARDS=[
    {n:'GEO COMPLIANCE', sel:'geo', v:r.v_geo, val:pct(r.geo_pct),
     bar:ovBar(r.geo_pct,T_GEO), thr:'ngưỡng ≥ '+num(T_GEO,0)+'%',
     m:sgn(dGeo,2)+' điểm %', sub:fmt(r.geo_fail)+'/'+fmt(r.geo_scope_orders)+' đơn chưa đạt'},
    {n:'ON TIME', sel:'ontime', v:r.v_ontime, val:pct(r.ot_pct),
     bar:ovBar(r.ot_pct,T_OT), thr:'ngưỡng > '+num(T_OT,0)+'%',
     m:sgn(dOt,2)+' điểm %', sub:fmt(r.ot_fail)+' đơn quá hạn 24h/48h'},
    {n:'DISTANCE & TIME', sel:'dt', v:vDt, val:fmt(r.dt_routes_fail)+' chuyến',
     bar: all?'':ovQuota(r.dt_route_fail_pct,T_DTR_MONTH_PCT), thr:'ngưỡng < '+fmt(T_DTR_MONTH_PCT)+'% tổng chuyến/tháng',
     m: all ? fmt(nfOf('v_dt'))+'/'+nNpp+' NPP không đạt'
            : (M ? sgn(M.dt_margin,2)+' điểm %' : ''),
     sub:pct(r.dt_route_fail_pct)+' của '+fmt(r.plans)+' chuyến · '+fmt(r.dt_orders_fail)+' outlet lỗi'},
    {n:'PAYLOAD', sel:'payload', v:r.v_payload, val:fmt(r.payload_plans_fail)+' chuyến',
     bar:'', thr:'ngưỡng 0 chuyến quá tải',
     m: r.payload_plans_fail===0 ? 'không chuyến nào quá tải' : 'phải xử lý hết '+fmt(r.payload_plans_fail)+' chuyến',
     sub: r.payload_plans_fail? 'tỷ lệ cao nhất '+num(r.payload_max_ratio,2)+' lần tải khai' : 'tải/xe luôn dưới '+num(T_PLR,1)+' lần'}
  ];
  if(!all){
    const FK={geo:['geo',true], ontime:['ot',true], payload:['pl',false]};
    CARDS.forEach(k=>{ const c=FK[k.sel]; if(!c) return;
      k.f=[c[1]?halfTrend(cur,c[0]):'', ...nppSignals(cur,c[0]).map(x=>'<i aria-hidden="true"></i> '+x)].filter(Boolean); });
  }
  if(all && isAdmin()){
    /* v43 · K8: trung bình vùng che NPP kém nhất -> nói thêm NPP thấp nhất và số NPP dưới ngưỡng (verdict có sẵn) */
    const lowest=f=>SB().slice().sort((a,b)=>a[f]-b[f])[0];
    const lowTxt=f=>{const s=lowest(f); return s?`Thấp nhất <b>${esc(s.npp)} ${pct(s[f])}</b>`:'';};
    const AG={geo:['v_geo',()=>[lowTxt('geo_pct'), `${fmt(nfOf('v_geo'))}/${fmt(nNpp)} NPP dưới ngưỡng`]],
              ontime:['v_ontime',()=>[lowTxt('ot_pct'), `${fmt(nfOf('v_ontime'))}/${fmt(nNpp)} NPP dưới ngưỡng`]],
              payload:['v_payload',()=>[`${fmt(nfOf('v_payload'))}/${fmt(nNpp)} NPP có chuyến quá tải`]],
              dt:['v_dt',()=>[]]};
    CARDS.forEach(k=>{ const a=AG[k.sel]; if(!a) return; k.v=nfOf(a[0])?'FAIL':'PASS'; k.agg=true;
      if(k.sel==='geo'||k.sel==='ontime') k.thr+=' · số trung bình vùng';
      k.f=a[1]().filter(Boolean); });
  }
  h+=`<div class="ovkpi">${CARDS.map(k=>`
    <button type="button" class="ovk st-${k.v==='FAIL'?'no':'ok'}${k.agg?' agg':''}" data-kpi="${k.sel}">
      <span class="ovk-n">${k.n}</span>
      <span class="ovk-v">${k.val}</span>
      ${k.bar}
      <span class="ovk-t">${esc(k.thr)}</span>
      <span class="ovk-m">${k.m}</span>
      <span class="ovk-s">${k.sub}</span>
      ${k.f&&k.f.length?`<span class="ovk-f">${k.f.map(x=>`<span>${x}</span>`).join('')}</span>`:''}
    </button>`).join('')}</div>`;

  /* Thống kê lỗi: hiện thẳng, không gấp — đây là phần trả lời "làm gì tiếp". */
  if(!noStats) h+=ovErrStats(r,all);
  return h;
}

/* ===================== shell ===================== */
/* Ba trang geo / ontime / accuracy không biến mất mà gộp vào 'Chi tiết KPI'.
   Mọi lệnh go('geo'/'ontime'/'accuracy') cũ vẫn chạy nhờ PAGE_ALIAS bên dưới,
   nên toàn bộ drill-down từ trang Tổng quan giữ nguyên, không phải sửa chỗ gọi nào. */
const PAGES=[['overview','Tổng quan',pOverview],['kpi','Chi tiết KPI',pKpi],
             ['trend','Xu hướng theo ngày',pTrend],['errors','Đơn hàng có lỗi',pErrors],
             ['logic','Cách chấm điểm',pLogic],['dq','Chất lượng dữ liệu',pDq]];
const ADMIN_ONLY=['dq'];
const PAGE_ALIAS={geo:['kpi','geo'],ontime:['kpi','ontime'],accuracy:['kpi','dt'],
                  successful:['kpi','successful'],payload:['kpi','payload'],username:['kpi','username']};
let curPage='overview', pending=null, epage=1, ERR_ROWS=[];
let EF={q:'',type:'',gap:false,day:''};
let userFilter='';
const pageSize = () => innerWidth<=640 ? 20 : 100;
function buildNav(){
  const vis = PAGES.filter(p=>isAdmin()||!ADMIN_ONLY.includes(p[0]));   // trang nội bộ: chỉ admin
  $('#nav').innerHTML=vis.map(p=>`<button id="tab-${p[0]}" role="tab" data-p="${p[0]}"
     aria-controls="p-${p[0]}" aria-selected="${p[0]===curPage}" tabindex="${p[0]===curPage?0:-1}"
     class="${p[0]===curPage?'on':''}">${p[1]}</button>`).join('');
}
let navPush=false;
function go(page,opts,push){
  const al=PAGE_ALIAS[page];            // giữ nguyên mọi drill-down đã có
  if(al){ kpiSel=al[1]; page=al[0]; }
  if(!PAGES.some(p=>p[0]===page)) page='overview';
  if(!isAdmin() && ADMIN_ONLY.includes(page)) page='overview';
  curPage=page; pending=opts||null; navPush = push!==false;
  $('#nav').querySelectorAll('button').forEach(x=>{
    const on=x.dataset.p===curPage;
    x.classList.toggle('on',on); x.setAttribute('aria-selected',on); x.tabIndex=on?0:-1;});
  render();
  requestAnimationFrame(rdEnhance);
}
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;go(b.dataset.p);});
addEventListener('popstate',()=>{ if(!role) return;
  const want=(location.hash||'#overview').replace('#','');
  if(want!==curPage) go(want,null,false); });
$('#nav').addEventListener('keydown',e=>{
  const ks=['ArrowRight','ArrowLeft','Home','End']; if(!ks.includes(e.key))return;
  const bs=[...$('#nav').querySelectorAll('button')], i=bs.findIndex(x=>x.dataset.p===curPage);
  let n = e.key==='Home'?0 : e.key==='End'?bs.length-1 : e.key==='ArrowRight'?(i+1)%bs.length:(i-1+bs.length)%bs.length;
  e.preventDefault(); go(bs[n].dataset.p); $('#nav').querySelector('button.on').focus();});
$('#rls').addEventListener('change',e=>{if(isAdmin()){cur=e.target.value; flashNext=true;
  /* tài khoản thuộc về đúng 1 NPP: giữ lọc tài khoản khi đổi NPP chỉ ra bảng rỗng */
  userFilter=''; epage=1; syncMeta();render();}});
/* Đổi giao diện KHÔNG render lại: mọi màu đều là CSS variable nên tự cập nhật. */
$('#theme').addEventListener('click',()=>{const r=document.documentElement;
  const dark = r.dataset.theme!=='dark';
  r.dataset.theme = dark?'dark':'light';
  $('#theme').setAttribute('aria-pressed',dark);
  say(dark?'Đã chuyển giao diện tối':'Đã chuyển giao diện sáng');});

const say = m => { $('#sr').textContent = m; };
function markScrollables(el){
  el.querySelectorAll('.scroll').forEach(sc=>{
    sc.tabIndex=0; if(!sc.getAttribute('role')){sc.setAttribute('role','region');
      const hh=sc.closest('.card')?sc.closest('.card').querySelector('h2'):null;
      sc.setAttribute('aria-label', hh?hh.textContent:'Bảng dữ liệu');}
    const rows=sc.querySelectorAll('tbody tr').length;
    if(sc.scrollHeight>sc.clientHeight+8){
      sc.classList.add('more');
      const prev=sc.previousElementSibling;
      if(!(prev&&prev.classList.contains('scrollnote'))){
        const n=document.createElement('p'); n.className='scrollnote';
        n.textContent=`${fmt(rows)} dòng — cuộn trong bảng`;
        sc.parentNode.insertBefore(n,sc);
      }
    }
  });
}
/* ═══════ REDESIGN v1 — o icon 40x40 cho the KPI + count-up 900ms ═══════
   Chi them lop trinh bay: khong doc, khong doi, khong tinh lai bat ky so nao. */
const RD_ICONS={
  geo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  time:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  load:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h13v10H3z"/><path d="M16 10h3.2l1.8 3v4H16z"/><circle cx="7" cy="19" r="1.8"/><circle cx="18" cy="19" r="1.8"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h4"/></svg>',
  order:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v13H4z"/><path d="M4 10h16"/><path d="M9 6V3h6v3"/></svg>',
  err:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 3 20h18z"/><path d="M12 10v5M12 17.6v.1"/></svg>',
  acc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5 11 15l4.6-5"/></svg>',
  dist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.5 13.5 3 21 10.5 10.5 21z"/><path d="M7 9.5l1.6 1.6M10 6.5l1.6 1.6M13 10.5l1.6 1.6M16 7.5l1.6 1.6"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M13 16V8M18 16v-7"/></svg>'
};
function rdIconFor(t){
  t=(t||'').toLowerCase();
  if(/lỗi|sai|trượt|không đạt|vi phạm/.test(t)) return 'err';
  if(/khoảng cách|distance|mét|bán kính|km/.test(t)) return 'dist';
  if(/tài khoản|user ?name|username|người dùng/.test(t)) return 'user';
  if(/quá tải|tải trọng|payload|khối lượng/.test(t)) return 'load';
  if(/đúng chỗ|geo|vị trí|toạ độ/.test(t)) return 'geo';
  if(/đúng hạn|on ?time|quá hạn|giờ|thời gian|ngày/.test(t)) return 'time';
  if(/plan|chuyến|kế hoạch/.test(t)) return 'plan';
  if(/đơn|order|giao/.test(t)) return 'order';
  if(/đạt|tỷ lệ|chính xác|accuracy|%/.test(t)) return 'acc';
  return 'chart';
}
function rdIcons(root){
  /* .nkpi .nk da co bieu tuong rieng (svg.nb-ic tu v49) -> khong chen icon thu hai */
  /* Theo mau: chi 4 the tieu chi co bieu tuong (glyph 16px cham vao nhan).
     The khoi luong (SO PLAN / DON DA GIAO / DON CO LOI) khong co bieu tuong. */
  root.querySelectorAll('.ovkpi>.ovk')
    .forEach(el=>{
      if(el.querySelector('.ic40')) return;   /* glyph nam TRONG nhan -> phai do ca cay con */
      const lab=el.querySelector('.lbl,.nt-k,.ovk-n,.nk-k');
      const sp=document.createElement('span');
      sp.className='ic40'; sp.setAttribute('aria-hidden','true');
      sp.innerHTML=RD_ICONS[rdIconFor(lab?lab.textContent:el.textContent)];
      (lab||el).insertBefore(sp, (lab||el).firstChild);
    });
}
/* Count-up 900ms — chi doi cach HIEN chu so dang co trong DOM, khong tinh lai */
function rdCountUp(root){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  root.querySelectorAll('.tile .val,.nt-v,.ovk-v,.nhx-v').forEach(el=>{
    if(el.dataset.rdCu) return; el.dataset.rdCu='1';
    const html=el.innerHTML, txt=el.textContent;
    const m=txt.match(/-?[\d.,]*\d/); if(!m) return;
    const raw=m[0], target=parseFloat(raw.replace(/\./g,'').replace(',','.'));
    if(!isFinite(target)||Math.abs(target)<2) return;
    const dec=(raw.split(',')[1]||'').length;
    const fm=v=>{const x=dec?v.toFixed(dec):String(Math.round(v));
      const p=x.split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');
      return p.join(',');};
    const t0=performance.now();
    (function tick(now){
      const k=Math.min(1,(now-t0)/900), e=1-Math.pow(1-k,4);   /* easeOutQuart */
      el.innerHTML=html.replace(raw, fm(target*e));
      if(k<1) requestAnimationFrame(tick); else el.innerHTML=html;
    })(t0);
  });
}
/* ═══════ REDESIGN v1 — mot dong + nut "thêm" ═══════════════════════
   Khong xoa chu: cau dau hien san, phan con lai gap vao. Bam la ra het.
   Khong doc, khong doi, khong tinh lai bat ky so nao. */
const RD_FOLD_SEL='.cap,.sect-cap,.estat-cs,.estat-f,.tier-d,.gm-n,.ovnote-t,.n6-note,.ea-note,.dq-note,.k-note,.bthin,.exif,.eacc-f,.rec-c,.lnote,.ovnote-t,.scrollnote,.k-ex,.tier-w,.nj-w,.estat-f,.estat-cs,.ovs-c,.ea-note,.gm-d,li:not(:has(*)),.dq-d,.exif,.k-q';
/* Loai tru: nhan/so/ghi chu trong the KPI — da la 1 dong ellipsis, khong them cap thu 4 */
const RD_FOLD_SKIP='.lbl,.val,.nt-k,.nt-v,.nt-s,.nk-k,.nk-s,.ovk-k,.ovk-v,.ovk-s,.note,th,td,summary,h1,h2,h3';
/* p[0] dem tren chuoi DA CHUAN HOA khoang trang, con cay DOM giu nguyen xuong dong.
   Ham nay quy so ky tu chuan hoa ve dung chi so trong chuoi THAT, de khong cat giua tu. */
function rdRawCut(el, nNorm){
  const raw=el.textContent; let norm=0, prevWs=true;
  for(let i=0;i<raw.length;i++){
    const ws=/\s/.test(raw[i]);
    if(ws){ if(!prevWs) norm++; prevWs=true; }
    else  { norm++; prevWs=false; }
    if(norm>=nNorm && !ws) return i+1;
  }
  return raw.length;
}
/* Cat noi dung cua mot phan tu tai ky tu thu n: tra ve [DocumentFragment dau,
   DocumentFragment sau]. Di theo cay DOM nen the <b>, <a>... hai ben deu con nguyen. */
function rdSplitHtml(el, n){
  try{
    const A=document.createDocumentFragment(), B=document.createDocumentFragment();
    let seen=0;
    const walk=(src, dstA, dstB)=>{
      src.childNodes.forEach(node=>{
        if(node.nodeType===3){
          const t=node.textContent, left=Math.max(0, n-seen);
          if(left<=0){ dstB.appendChild(node.cloneNode()); }
          else if(t.length<=left){ dstA.appendChild(node.cloneNode()); }
          else { dstA.appendChild(document.createTextNode(t.slice(0,left)));
                 dstB.appendChild(document.createTextNode(t.slice(left))); }
          seen+=t.length;
        } else if(node.nodeType===1){
          const len=node.textContent.length;
          if(seen>=n){ dstB.appendChild(node.cloneNode(true)); seen+=len; }
          else if(seen+len<=n){ dstA.appendChild(node.cloneNode(true)); seen+=len; }
          else { const a=node.cloneNode(false), b=node.cloneNode(false);
                 walk(node, a, b);
                 if(a.textContent.trim()) dstA.appendChild(a);
                 if(b.textContent.trim()) dstB.appendChild(b); }
        }
      });
    };
    walk(el, A, B);
    if(!A.textContent.trim()||!B.textContent.trim()) return null;
    return [A,B];
  }catch(e){ return null; }
}

function rdSplit(t){
  t=t.trim();
  const re=/(?:\.\s|;\s|\s—\s)/g; let m, cut=-1;
  while((m=re.exec(t))){ if(m.index>=30){cut=m.index+m[0].length;break;} }
  if(cut<0||t.length-cut<16){
    /* Mot cau dai lien mach: van thu gon duoc — lay ~64 ky tu dau lam tieu de. */
    if(t.length<110) return null;
    let k=t.lastIndexOf(' ',64); if(k<24) k=64;
    return [t.slice(0,k).trim()+'…', t.slice(k).trim()];
  }
  return [t.slice(0,cut).trim(), t.slice(cut).trim()];
}
function rdFold(root){
  root.querySelectorAll(RD_FOLD_SEL).forEach(el=>{
    if(el.dataset.rdFold||el.querySelector('.rd-more,button,a,input,select')) return;
    if(el.matches(RD_FOLD_SKIP)||el.closest('.tile,.nt,.nk,.ovk,thead')) return;
    /* Chu in dam = ket luan / luu y. Chi gap duoc khi phan in dam nam o cau dau. */
    if([...el.querySelectorAll('b,strong')].length){ el.dataset.rdBold='1'; }
    const txt=el.textContent.replace(/\s+/g,' ').trim();
    if(txt.length<=64) return;
    /* Dong ket luan / viec can lam luon hien — khong gap. */
    if(/^\s*(Kết luận|Việc cần làm|Đáng lưu ý|Ngày cần xem lại|Nửa sau|Nửa đầu|Số ngày dưới ngưỡng|Chênh lệch đáng chú ý)/i.test(txt)) return;
    const p=rdSplit(txt); if(!p) return;
    if(el.dataset.rdBold==='1'){
      const outside=[...el.querySelectorAll('b,strong')]
        .map(b=>b.textContent.replace(/\s+/g,' ').trim())
        .some(t=>t.length>=20 && /\s/.test(t) && p[0].indexOf(t)<0);
      if(outside && txt.length<=200) return;   /* doan vua ma co luu y in dam: giu nguyen */
    }
    el.dataset.rdFold='1';
    const full=el.innerHTML;
    /* Cau dau lam tieu de, bam tam giac moi mo phan con lai.
       Ban day du nam ngay trong DOM (trong <details>) — khong mat chu. */
    const d=document.createElement('details');
    d.className='rd-d '+(el.className||'');
    d.dataset.rdFold='1';
    const sm=document.createElement('summary');
    const bd=document.createElement('div'); bd.className='rd-db';
    /* Tach dung cho: cau dau (giu ca in dam) len tieu de, phan con lai xuong duoi.
       Khong lap cau, khong mat dinh dang. */
    const cut=rdSplitHtml(el, rdRawCut(el, p[0].length));
    if(cut){ sm.appendChild(cut[0]); bd.appendChild(cut[1]); }
    else   { sm.textContent=p[0]; bd.innerHTML=full; }
    d.appendChild(sm); d.appendChild(bd);
    el.replaceWith(d);
    return;
  });
}
/* Danh sach viec can lam: giu 3 dong dau, con lai gap vao */
function rdFoldList(root){
  root.querySelectorAll('ul.tight').forEach(ul=>{
    if(ul.dataset.rdFold) return;
    const li=[...ul.children]; if(li.length<=2) return;
    ul.dataset.rdFold='1';
    li.slice(2).forEach(x=>x.hidden=true);
    const b=document.createElement('button');
    b.type='button'; b.className='rd-more rd-more-l'; b.setAttribute('aria-expanded','false');
    b.textContent='+ '+(li.length-2)+' việc nữa';
    b.addEventListener('click',()=>{
      const on=b.getAttribute('aria-expanded')==='true';
      b.setAttribute('aria-expanded',String(!on));
      li.slice(2).forEach(x=>x.hidden=on);
      b.textContent=on?('+ '+(li.length-2)+' việc nữa'):'thu gọn';
    });
    ul.after(b);
  });
}

/* Trang tham chieu: gap tung muc lai, chi muc dau mo san.
   Noi dung nguyen ven — dat trong <details>, bam la ra het. */
function rdSections(root){
  if(root.id!=='p-logic'&&root.id!=='p-dq') return;
  [...root.querySelectorAll(':scope>.card')].forEach((c,i)=>{
    if(c.dataset.rdSec) return; c.dataset.rdSec='1';
    const h=c.querySelector(':scope>h2'); if(!h) return;
    const d=document.createElement('details'); d.className='rd-sec'; if(i===0) d.open=true;
    const sm=document.createElement('summary'); sm.innerHTML=h.innerHTML;
    d.appendChild(sm);
    while(c.children.length>1) d.appendChild(c.children[1]);
    h.remove(); c.appendChild(d);
  });
}

/* ═══════ REDESIGN v1.1 — the KPI ve 3 cap thong tin ═══════════════
   Gop cac dong phu thanh MOT dong noi bang "·", cat ellipsis,
   chu day du dat o thuoc tinh title. Khong xoa chu, khong doi so. */
function rdCompact(root){
  root.querySelectorAll('.ovk,.tile,.nt,.nk').forEach(card=>{
    if(card.dataset.rdCp) return; card.dataset.rdCp='1';
    /* a) khoi cuoi xep chong 2 dong -> 1 dong noi bang dau cham giua */
    const f=card.querySelector('.ovk-f,.nk-f');
    if(f && f.children.length>1){
      /* KHONG dung textContent= : se xoa sach phan tu con (vi du mui ten xu huong
         .ovk-tr da bi khoa mau theo quyet dinh LOCKED #3). Chi chuyen sang inline
         va chen dau phan cach. */
      const kids=[...f.children];
      kids.forEach((x,i)=>{ x.style.display='inline'; if(i) f.insertBefore(document.createTextNode(' · '), x); });
      f.title=f.textContent.replace(/\s+/g,' ').trim();
      f.classList.add('rd-1l');
    }
    /* a2) delta thuoc ve cau "so voi nguong" -> gop vao dong nguong.
           Nguong dung TRUOC, delta dung SAU. O be ngang hep the KPI khong du cho
           dat delta canh con so 32px ma khong bop nat con so (da do: col con 67px). */
    const m=card.querySelector('.ovk-m'), t=card.querySelector('.ovk-t');
    if(m && t && !t.querySelector('.ovk-m')){
      t.appendChild(document.createTextNode(' · '));
      t.appendChild(m); m.style.display='inline';
      t.title=t.textContent.replace(/\s+/g,' ').trim();
    }
    /* a3) nhan the tieu chi cat ellipsis -> giu chu day o title */
    const h=card.querySelector('.nk-h');
    if(h && !h.title) h.title=h.textContent.replace(/\s+/g,' ').trim();
    const on=card.querySelector('.ovk-n');
    if(on && !on.title) on.title=on.textContent.replace(/\s+/g,' ').trim();
    /* b) cac dong phu 11px -> 1 dong ellipsis, giu chu day o title */
    card.querySelectorAll('.ovk-s,.nt-s,.nk-s,.note').forEach(x=>{
      const t=x.textContent.replace(/\s+/g,' ').trim();
      if(t && !x.title) x.title=t;
      x.classList.add('rd-1l');
    });
  });
}

/* ═══════ REDESIGN v2 — nut "?" va tooltip ═══════════════════════════
   Dung lai he tooltip san co cua file (TIPS / tipRef / data-tip-id):
   re chuot, Tab ban phim va cham tren dien thoai deu mo duoc.
   Chu KHONG bi xoa: ban day du van nam trong DOM duoi dang .sr-only
   de trinh doc man hinh va chuc nang tim kiem cua trinh duyet van thay. */
function rdQ(html, label){
  const b=document.createElement('button');
  b.type='button'; b.className='tip rd-q';
  b.setAttribute('data-tip-id', tipRef(html));
  b.setAttribute('aria-label', label||'Giải thích');
  b.textContent='?';
  return b;
}
function rdSr(html){
  const x=document.createElement('span');
  x.className='sr-only'; x.innerHTML=html; return x;
}
/* 2a. Mo ta / quy tac / canh bao duoi tieu de -> tooltip canh tieu de */
function rdCapToTip(root){
  root.querySelectorAll('.card,section.card').forEach(card=>{
    if(card.dataset.rdCap) return;
    const h=card.querySelector(':scope>h2,:scope>.nhx-m>h2');
    const cap=card.querySelector(':scope>.cap,:scope>p.cap');
    if(!h||!cap) return;
    card.dataset.rdCap='1';
    const html=cap.innerHTML;
    const txt=cap.textContent.replace(/\s+/g,' ').trim();
    if(txt.length<24) return;                       /* cau ngan thi cu de nguyen */
    /* De doan mo ta lai duoi tieu de nhung gap lai — nguoi dung tu quyet dinh mo. */
    cap.dataset.rdCap='1';
  });
  /* tieu de muc roi (h2.sect + p.sect-cap) */
  root.querySelectorAll('h2.sect').forEach(h=>{
    if(h.dataset.rdCap) return;
    const cap=h.nextElementSibling;
    if(!cap||!cap.classList.contains('sect-cap')) return;
    const txt=cap.textContent.replace(/\s+/g,' ').trim();
    if(txt.length<24) return;
    h.dataset.rdCap='1';
    const html=cap.innerHTML;
    cap.dataset.rdCap='1';
  });
}
/* 2a1. Canh bao dai (.banner): giu cau dau, phan con lai vao tooltip.
   Ban day du van nam trong DOM (.sr-only) nen trinh doc man hinh va Ctrl+F van thay. */
/* ═══════ REDESIGN v2.1 — canh bao co mau -> chi con nut "?" ═══════
   Neo vao nhan cua THE KET QUA, vi canh bao noi ve chinh ket qua do.
   Chi go khoi chu khi tim duoc cho neo hop ly; khong thi giu nguyen
   dang mot dong + "?" nhu truoc, de canh bao khong bao gio bien mat. */
function rdBannerAnchor(page, el){
  return page.querySelector('.nhx-k')                 /* vai NPP: "NPP BD16 · KET QUA TAM TINH" */
      || page.querySelector('.ovh-t')                 /* vai admin: "Ket qua Data Accuracy — Toan vung" */
      || null;
}
/* ═══════ REDESIGN v2.2 — khoi canh bao ho phach con lai ═══════════
   .eacc-warn / .ownwarn / .nwarn / .exwarn: cung cach lam nhu .banner —
   neo "?" vao tieu de gan nhat, go khoi chu khoi trang.
   Neu khong tim duoc cho neo thi giu "cau dau + ?" de canh bao khong bien mat. */
function rdHeadNear(el){
  /* tieu de cua the chua no, hoac tieu de muc dung ngay trên */
  const card=el.closest('.card,section.card');
  if(card){ const h=card.querySelector(':scope>h2,:scope>.nhx-m>h2,:scope>h3'); if(h) return h; }
  let n=el.previousElementSibling;
  while(n){ if(/^H[23]$/.test(n.tagName)) return n; n=n.previousElementSibling; }
  return null;
}
function rdWarnToTip(root){
  root.querySelectorAll('.eacc-warn,.ownwarn,.exwarn,.dqwarn').forEach(el=>{
    if(el.dataset.rdW) return;
    const txt=el.textContent.replace(/\s+/g,' ').trim();
    if(txt.length<=90) return;
    if(el.querySelector('button,a,input,select')) return;   /* co nut bam thi de nguyen */
    const full=el.innerHTML;
    const h=rdHeadNear(el);
    el.dataset.rdW='1';
    if(h){
      const q=rdQ(full,'Cảnh báo: '+h.textContent.replace(/\s+/g,' ').trim());
      q.classList.add('rd-q-warn');
      h.appendChild(q);
      el.replaceWith(rdSr(full));
    } else {
      rdBanner1(el, full, txt);
      el.classList.add('rd-warn1');
    }
  });
}

/* ═══════ REDESIGN v2.2 — chan o luoi phinh qua khung nhin ═══════════
   Chi sua dung o dang tran, GIU NGUYEN so cot (nen luoi 2 cot tren dien
   thoai — quyet dinh K9 — khong bi ep thanh 1 cot). */
function rdGridFit(root){
  root.querySelectorAll('*').forEach(e=>{
    if(!e.offsetParent) return;
    const s=getComputedStyle(e);
    if(s.display!=='grid'&&s.display!=='inline-grid') return;
    const cols=s.gridTemplateColumns.split(' ').map(parseFloat).filter(x=>!isNaN(x));
    if(cols.length<1) return;
    const gap=parseFloat(s.columnGap)||0;
    const need=cols.reduce((a,b)=>a+b,0)+gap*(cols.length-1);
    if(need<=e.clientWidth+2) return;
    e.style.gridTemplateColumns=cols.map(()=>'minmax(0,1fr)').join(' ');
  });
}

function rdBannerToTip(root){
  root.querySelectorAll(':scope>.banner').forEach(el=>{
    if(el.dataset.rdB) return;
    const full=el.innerHTML;
    const txt=el.textContent.replace(/\s+/g,' ').trim();
    if(txt.length<=120) return;
    const anchor=rdBannerAnchor(root, el);
    if(!anchor){ rdBanner1(el, full, txt); return; }   /* khong co cho neo -> giu mot dong + "?" */
    el.dataset.rdB='1';
    const q=rdQ(full,'Cảnh báo về kỳ số liệu');
    q.classList.add('rd-q-warn');
    anchor.appendChild(q);
    el.replaceWith(rdSr(full));
  });
}
/* Phuong an du phong: giu cau dau, phan con lai vao "?" */
function rdBanner1(el, full, txt){
  const p=rdSplit(txt); if(!p) return;
  el.dataset.rdB='1';
  el.innerHTML='';
  const lead=document.createElement('b'); lead.textContent=p[0]+' ';
  el.appendChild(lead);
  el.appendChild(rdQ(full,'Xem đầy đủ cảnh báo'));
  el.appendChild(rdSr(full));
}

function rdBanner(root){
  root.querySelectorAll('.banner').forEach(el=>{
    if(el.dataset.rdB) return;
    const txt=el.textContent.replace(/\s+/g,' ').trim();
    if(txt.length<=120) return;
    const p=rdSplit(txt); if(!p) return;
    el.dataset.rdB='1';
    const full=el.innerHTML;
    el.innerHTML='';
    const lead=document.createElement('b'); lead.textContent=p[0]+' ';
    el.appendChild(lead);
    el.appendChild(rdQ(full,'Xem đầy đủ cảnh báo'));
    el.appendChild(rdSr(full));
  });
}
/* 2a2. Trang thai 6 tieu chi: ten chinh thuc + so lieu gop mot dong, cat ellipsis */
function rdRow6(root){
  root.querySelectorAll('.n6-r').forEach(r=>{
    if(r.dataset.rdSub) return;
    const m=r.querySelector('.n6-m'); if(!m) return;
    const o=m.querySelector('.n6-o'), d=m.querySelector('.n6-d');
    if(!o&&!d) return;
    r.dataset.rdSub='1';
    const sub=document.createElement('span'); sub.className='n6-sub';
    /* CHUYEN phan tu vao trong, khong xoa: .n6-o va .n6-d van con trong DOM
       nen phep kiem X2 (ban v50) va trinh doc man hinh van thay. */
    if(o) sub.appendChild(o);
    if(o && d) sub.appendChild(document.createTextNode(' · '));
    if(d) sub.appendChild(d);
    sub.title=sub.textContent.replace(/\s+/g,' ').trim();
    m.appendChild(sub);
  });
}
/* 2b. The tieu chi: ten chinh thuc + chi tiet day du -> tooltip o nut "?" */
function rdCardToTip(root){
  root.querySelectorAll('.nk,.ovk').forEach(card=>{
    if(card.dataset.rdQ) return; card.dataset.rdQ='1';
    const isNk=card.classList.contains('nk');
    const head=isNk? card.querySelector('.nk-h') : card.querySelector('.ovk-n');
    if(!head) return;
    const name=(isNk? card.querySelector('.nk-n') : card.querySelector('.ovk-n'));
    const off =card.querySelector('.nk-o');                       /* ten tieng Anh */
    const thr =card.querySelector('.nk-t,.ovk-t');
    const det =card.querySelector('.nk-s,.ovk-s');
    const foot=card.querySelector('.ovk-f');
    const bits=[];
    /* Vai NPP: the hien TEN CHINH THUC (GEO COMPLIANCE...) cho khop file Excel
       va du cho tren mot dong; ten tieng Viet chuyen vao tooltip. */
    if(isNk && off && name){
      const vn=name.textContent.replace(/\s+/g,' ').trim();
      const en=off.textContent.replace(/\s+/g,' ').trim();
      bits.push('<b>'+vn+'</b>');
      name.textContent=en;                 /* nhan tren the = ten chinh thuc */
      off.classList.add('sr-only');
      card.setAttribute('aria-label', vn+' ('+en+')');
    } else if(off) bits.push('<b>'+off.textContent.replace(/\s+/g,' ').trim()+'</b>');
    if(thr)  bits.push(thr.textContent.replace(/\s+/g,' ').trim());
    if(det)  bits.push(det.textContent.replace(/\s+/g,' ').trim());
    if(foot) bits.push(foot.textContent.replace(/\s+/g,' ').trim());
    if(!bits.length) return;
    bits.push('<i>Định nghĩa đầy đủ ở tab Cách chấm điểm.</i>');
    const lbl=(name?name.textContent:'tiêu chí').replace(/\s+/g,' ').trim();
    const q=rdQ(bits.map(x=>'<div class="r">'+x+'</div>').join(''), 'Giải thích '+lbl);
    q.classList.add('rd-q-card');
    card.appendChild(q);
    /* ten tieng Anh da nam trong tooltip -> giau khoi the, giu cho trinh doc man hinh */
    if(off && !off.classList.contains('sr-only')) off.classList.add('sr-only');
    /* khoi cuoi cua the toan vung cung da nam trong tooltip */
    if(foot){ foot.classList.add('sr-only'); }
  });
}

function rdEnhance(){
  const pg=document.querySelector('.page.on'); if(!pg) return;
  try{ rdSections(pg); rdBannerToTip(pg); rdWarnToTip(pg); rdBanner(pg); rdCapToTip(pg); rdFold(pg); rdCardToTip(pg); rdRow6(pg); rdFoldList(pg);
       rdIcons(pg); rdCompact(pg); rdCountUp(pg); rdGridFit(pg); }catch(e){}
}

function render(){
  /* Xoá nội dung các trang không hiển thị: tránh dữ liệu cũ của NPP khác còn sót lại khi in */
  document.querySelectorAll('.page').forEach(p=>{
    p.classList.remove('on');
    if(p.id!=='p-'+curPage) p.innerHTML='';
  });
  const el=$('#p-'+curPage); el.classList.add('on');
  el.innerHTML=PAGES.find(p=>p[0]===curPage)[2]();
  /* Nút mang data-kpi (bộ chọn ở trang Chi tiết KPI) mở đúng tiêu chí đó */
  el.querySelectorAll('[data-kpi]').forEach(b=>b.addEventListener('click',()=>{
    kpiSel=b.dataset.kpi; kpiJump=b.dataset.kpi; if(curPage==='kpi') render(); else go('kpi'); }));
  /* v47 · M1: 3 tiêu chí dùng chung trang gộp -> cuộn tới đúng mục và làm nổi, để nút không "bấm mà không thấy gì đổi" */
  if(flashNext){
    /* v49 · V7: báo "dữ liệu đã đổi" bằng một nhịp nhấp nháy, không bắt người dùng chờ spinner */
    const f=el.querySelector('.ovhero,.ovmx-c,.card');
    if(f){ f.classList.add('flash'); setTimeout(()=>f.classList.remove('flash'),600); }
    flashNext=false;
  }
  if(curPage==='overview'){
    /* v48 · N5: desktop mở sẵn, điện thoại gấp lại — chỉ là trạng thái mở/đóng, nội dung luôn nằm trong trang */
    el.querySelectorAll('details.nfold').forEach(d=>{ d.open = innerWidth>640; });
  }
  if(curPage==='overview' && !isAdmin() && innerWidth<=640){
    /* v50 · X4: điện thoại gấp khối 4 thẻ — thẻ "Trạng thái 6 tiêu chí" đã tóm tắt đủ */
    const g=el.querySelector('.ovkpi'), hd=g&&g.previousElementSibling;
    if(g && !g.closest('details')){
      const d=document.createElement('details'); d.className='ovsec nkfold';
      d.innerHTML='<summary><span class="ovs-i"></span><span class="ovs-t">Bốn tiêu chí vận hành</span>'
        +'<span class="ovs-c">số lớn · ngưỡng · thanh tiến độ</span></summary><div class="ovs-b"></div>';
      g.parentNode.insertBefore(d,hd&&hd.classList.contains('nsect')?hd:g);
      if(hd&&hd.classList.contains('nsect')) hd.remove();
      d.querySelector('.ovs-b').appendChild(g);
    }
  }
  if(curPage==='overview' && !isAdmin()){
    /* v48 · N2: bỏ khối lặp — thẻ "Việc cần làm" ở trên đã nói đúng nội dung này */
    const t=[...el.querySelectorAll('.estat-c .estat-ct')].find(p=>/Việc cần làm/i.test(p.textContent));
    if(t){ const c=t.closest('.estat-c'); if(c) c.remove(); }
  }
  if(curPage==='dq'){ dqSeverity(el); }
  mobileFold(el);
  if(curPage==='kpi' && kpiJump){
    const t=el.querySelector('#kpi-'+kpiJump); kpiJump='';
    if(t){ const c=t.closest('.card')||t;
      c.classList.add('kpi-hit');
      setTimeout(()=>c.classList.remove('kpi-hit'),1600);
      requestAnimationFrame(()=>t.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  }
  if(curPage==='errors'){
    let td; $('#eq').addEventListener('input',()=>{clearTimeout(td);td=setTimeout(renderErrors,180);});
    $('#etype').addEventListener('change',renderErrors);
    $('#egap').addEventListener('change',renderErrors);
    $('#exls').addEventListener('click',exportXlsx);
    $('#ecsv').addEventListener('click',exportCsv);
    document.querySelectorAll('#p-errors th.sortable .sortbtn').forEach(b=>
      b.addEventListener('click',()=>toggleSort(b.dataset.sort,b.dataset.t)));
    document.querySelectorAll('#p-errors .pager button').forEach(bt=>bt.addEventListener('click',()=>{
      epage += Number(bt.dataset.nav); renderErrors();
      $('#p-errors .scroll').scrollIntoView({block:'start',behavior:'instant'});}));
    ['#eq','#etype','#egap','#eday'].forEach(sel=>$(sel).addEventListener('input',()=>{epage=1;}));
    $('#eday').addEventListener('change',renderErrors);
    $('#errsum').addEventListener('click',ev=>{
      const b=ev.target.closest('.es'); if(!b) return;
      const t=$('#etype'); t.value=(t.value===b.dataset.etype)?'':b.dataset.etype;
      epage=1; renderErrors();
      say(t.value?`Đã lọc theo tiêu chí ${b.dataset.etype}`:'Đã bỏ lọc theo loại lỗi');
    });
    const dayList=[...new Set(DATA.errors.filter(e=>cur==='ALL'||e.TenantName===cur).map(e=>e.dkey))]
      .filter(Boolean).sort((a,b)=>{const p1=a.split('/'),p2=b.split('/');return (p1[1]-p2[1])||(p1[0]-p2[0]);});
    $('#eday').innerHTML=`<option value="">Tất cả các ngày</option>`+dayList.map(x=>`<option value="${esc(x)}">Ngày ${esc(x)}</option>`).join('');
    $('#eq').value=EF.q; $('#etype').value=EF.type; $('#egap').checked=EF.gap; $('#eday').value=EF.day||'';
    if(pending){
      if(pending.type!==undefined){$('#etype').value=pending.type; $('#eq').value=''; $('#egap').checked=false; userFilter='';}
      if(pending.day!==undefined){$('#eday').value=pending.day; $('#etype').value=''; $('#eq').value=''; $('#egap').checked=false; userFilter='';}
      if(pending.user!==undefined){userFilter=pending.user; $('#eq').value=''; $('#etype').value=''; $('#eday').value=''; $('#egap').checked=false;}
      if(pending.gap)$('#egap').checked=true; epage=1; }
    renderErrors();
  }
  pending=null;
  el.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',ev=>{
    ev.preventDefault();
    if(isAdmin() && b.dataset.npp){ cur=b.dataset.npp; $('#rls').value=cur; syncMeta(); }
    epage=1;
    const o={};
    if(b.dataset.user!==undefined){ o.user=b.dataset.user; }
    else{ if(b.dataset.type!==undefined&&b.dataset.day===undefined) o.type=b.dataset.type;
      if(b.dataset.day) o.day=b.dataset.day; }
    go(b.dataset.go,o);
  }));
  /* v49 · V1: mỗi dòng bảng tài khoản có nút "xem nhanh"; bấm vào dòng cũng mở modal.
     Nút tên tài khoản vẫn giữ hành vi cũ là mở tab Đơn lỗi. */
  el.querySelectorAll('table.eacc-t tbody tr').forEach(tr=>{
    const nameBtn=tr.querySelector('.ea-u'); if(!nameBtn) return;
    const user=nameBtn.dataset.user, npp=nameBtn.dataset.npp || (isAdmin()?cur:role);
    const last=tr.lastElementChild;
    if(last && !tr.querySelector('.ea-q')){
      const q=document.createElement('button');
      q.type='button'; q.className='ea-q'; q.innerHTML='<span aria-hidden="true">›</span>';
      q.setAttribute('aria-label','Xem nhanh tài khoản '+user);
      q.addEventListener('click',ev=>{ ev.stopPropagation(); qmOpen(user,npp,q); });
      last.appendChild(q);
    }
    tr.addEventListener('click',ev=>{ if(ev.target.closest('button,a')) return; qmOpen(user,npp,tr.querySelector('.ea-q')); });
  });
  el.querySelectorAll('[data-scope]').forEach(b=>b.addEventListener('click',()=>{
    if(!isAdmin()) return;
    cur=b.dataset.scope; $('#rls').value=cur; userFilter=''; epage=1; flashNext=true; syncMeta(); go('overview');
    say('Đã mở Tổng quan NPP '+cur);
  }));
  markScrollables(el);
  if(curPage==='kpi' && ['username','dt','payload'].includes(kpiSel)){
    const t=el.querySelector('#kpi-'+kpiSel);
    if(t) t.scrollIntoView({block:'start',behavior:'instant'});
  }
  hideTip();
  try{
    const url='#'+curPage;
    if(location.hash!==url){ navPush ? history.pushState({p:curPage},'',url) : history.replaceState({p:curPage},'',url); }
  }catch(_){}
  navPush=false;
  const label=PAGES.find(p=>p[0]===curPage)[1];
  say('Đã mở trang '+label);
  scrollTo({top:0,behavior:'instant'});
  el.focus({preventScroll:true});
  requestAnimationFrame(rdEnhance);
}

/* ===================== đăng nhập / phân quyền ===================== */
const ADMIN_USER='admin', ADMIN_PASS='123123a@';
$('#lperiod').textContent=DATA.meta.period;
$('#fperiod').textContent=DATA.meta.period;
/* Mốc thời gian dữ liệu được cập nhật — hiện ở 3 nơi: màn hình đăng nhập, thanh tiêu đề, chân trang */
const UPDAT = (DATA.build && (DATA.build.at || DATA.build.date)) || '';
if(UPDAT){
  $('#lupd').textContent = 'Cập nhật ' + UPDAT;
  $('#hupd').textContent = 'Cập nhật ' + UPDAT;
  $('#fupd').textContent = UPDAT;
}
if(DATA.build) $('#fver').textContent=DATA.build.ver;
$('#fsrc').textContent = (DATA.meta.source||'tracking tms.xlsx');

function signIn(u,p){
  const un=String(u||'').trim(), pw=String(p||'').trim();
  if(un.toLowerCase()===ADMIN_USER && pw===ADMIN_PASS) return 'admin';
  const hit=NPPS.find(n=>n.toLowerCase()===un.toLowerCase());
  if(hit && DATA.auth[hit]===pw) return hit;
  return null;
}
function syncMeta(){
  const admin=isAdmin();
  const scope = (!admin) ? role : (cur==='ALL' ? null : cur);
  /* Kỳ và quy mô đã nằm trong khối kết quả ở đầu trang Tổng quan — header chỉ giữ phạm vi. */
  const fc=$('#fcontact'); if(fc) fc.innerHTML=contactTxt();
  const lc=$('#lcontact'); if(lc) lc.innerHTML=contactTxt();
  $('#hmeta').textContent = scope
    ? `${DATA.meta.bu} · ${DATA.meta.region} · NPP ${scope}`
    : `${DATA.meta.bu} · ${DATA.meta.region} · ${DATA.meta.npps} NPP`;
}
function applyRole(rl){
  role=rl;
  const admin=isAdmin();
  cur = admin ? 'ALL' : role;
  $('#who').textContent = admin ? 'Admin — toàn bộ NPP' : 'NPP '+role;
  $('#rls').style.display = admin ? '' : 'none';
  if(admin){
    $('#rls').innerHTML=`<option value="ALL">Tất cả NPP</option>`+NPPS.map(n=>`<option value="${n}">NPP ${n}</option>`).join('');
    $('#rls').value='ALL';
  }
  syncMeta();
  document.body.classList.remove('locked');
  const want=(location.hash||'').replace('#','');
  curPage='overview'; buildNav();
  go(PAGES.some(p=>p[0]===want)?want:'overview');
  const nb=$('#nav').querySelector('button.on'); if(nb) nb.focus();
}
$('#loginbox').addEventListener('submit',e=>{
  e.preventDefault();
  const rl=signIn($('#lu').value,$('#lp').value);
  if(!rl){
    $('#lerr').textContent='Tên đăng nhập hoặc mật khẩu không đúng.';
    $('#lerr').classList.add('on');
    $('#lu').setAttribute('aria-invalid','true'); $('#lp').setAttribute('aria-invalid','true');
    $('#lp').value=''; $('#lp').focus(); return;
  }
  $('#lerr').classList.remove('on'); $('#lp').value='';
  $('#lu').removeAttribute('aria-invalid'); $('#lp').removeAttribute('aria-invalid');
  applyRole(rl);
});
$('#logout').addEventListener('click',()=>{
  role=null; cur='ALL';
  document.querySelectorAll('.page').forEach(p=>{p.innerHTML='';p.classList.remove('on')});
  document.body.classList.add('locked');
  EF={q:'',type:'',gap:false,day:''}; userFilter=''; epage=1; curPage='overview';
  ESORT={key:null,type:'s',dir:1};
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(_){}
  $('#lu').value=''; $('#lp').value=''; $('#lerr').classList.remove('on');
  hideTip(); $('#lu').focus();
});
$('#lu').focus();
