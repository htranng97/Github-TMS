
"use strict";
function startApp(BUNDLE, LOGIN_ROLE){
const $=s=>document.querySelector(s);
/* Gói dữ liệu gồm nhiều tháng; DATA là tháng đang chọn. */
const ORDER=BUNDLE.order, DONE=(BUNDLE.completed||ORDER).filter(m=>ORDER.includes(m)), CUR=BUNDLE.current||null, ml=m=>`T${+m.slice(5)}/${m.slice(0,4)}`;
const exclTxt=d=>(d.meta.excluded||[]).map(x=>`${x.start.slice(0,5)}–${x.end}`).join(', ');
let month=ORDER[ORDER.length-1], DATA, TH, NPPS, EK, ERR, SC;
function loadMonth(m){
  month=m; DATA=BUNDLE.months[m]; TH=DATA.thresholds; NPPS=DATA.npps; EK=DATA.err_keys;
  ERR=DATA.errors.map(r=>{const o={};EK.forEach((k,i)=>o[k]=r[i]);return o;});
  SC=Object.fromEntries(DATA.scorecard.map(s=>[s.npp,s]));
}
loadMonth(month);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null?'—':Number(v).toLocaleString('vi-VN');
const pc=(v,d=2)=>v==null?'—':Number(v).toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const n1=(v,d=1)=>v==null?'—':Number(v).toLocaleString('vi-VN',{maximumFractionDigits:d});
const T_PLAN=Math.round(TH.plan_err_pct*100), T_TOL=Math.round(TH.npp_plan_tol*100);
const T_DT=TH.dt_month_pct*100, T_PL=TH.payload_tol*100;

let role=null, scope='ALL', page='overview', kpiSel='payload';
let EF={q:'',type:'',day:'',npp:'',pf:false}, epage=1;
const isAdmin=()=>role==='admin';
const curS=()=>scope==='ALL'?DATA.total:SC[scope];
const rowsIn=arr=>scope==='ALL'?arr:arr.filter(r=>(r.npp??r.TenantName)===scope);

/* ---------------- biểu đồ ---------------- */
function hbar(items,{thr=null,max=null,fmtv=v=>pc(v),neutral=0}={}){
  const W=760,lw=64,rw=86,rh=28,H=items.length*rh+30;
  const raw=max??(Math.max(...items.map(i=>i.v||0),thr||0)*1.08||1);
  const mx=(()=>{const e=Math.pow(10,Math.floor(Math.log10(raw)));for(const m of [1,2,2.5,5,10]) if(m*e>=raw) return m*e;return 10*e;})();
  const x=v=>lw+(W-lw-rw)*(Math.max(0,v)/mx);
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Biểu đồ theo NPP">`;
  [0,.5,1].forEach(t=>{const xx=lw+(W-lw-rw)*t;s+=`<line class="grid-l" x1="${xx}" x2="${xx}" y1="4" y2="${H-22}"/><text x="${xx}" y="${H-6}" text-anchor="middle">${n1(mx*t,mx<10?1:0)}</text>`;});
  items.forEach((it,i)=>{const y=6+i*rh;
    s+=`<text class="tl" x="${lw-10}" y="${y+15}" text-anchor="end">${esc(it.l)}</text>`;
    s+=`<rect x="${lw}" y="${y+5}" width="${Math.max(2,x(it.v)-lw)}" height="${rh-12}" rx="4" fill="${neutral?(it.bad?'var(--warn)':'var(--s1)'):it.bad?'var(--crit)':'var(--good)'}"><title>${esc(it.l)}: ${fmtv(it.v)}</title></rect>`;
    s+=`<text class="tv" x="${x(it.v)+6}" y="${y+15}">${it.bad?(neutral?'! ':'✕ '):''}${fmtv(it.v)}</text>`;});
  if(thr!=null){const tx=x(thr);s+=`<line x1="${tx}" x2="${tx}" y1="0" y2="${H-22}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>`;}
  return `<div class="chart">${s}</svg></div>`;
}
function vbar(items,{color='var(--brand)',hl=null,hl2=null,fmtv=fmt}={}){
  const W=560,H=210,pl=44,pb=32,pt=18;const mx=Math.max(...items.map(i=>i.v),1)*1.12;
  const bw=(W-pl-10)/items.length;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Biểu đồ cột">`;
  [0,.5,1].forEach(t=>{const y=H-pb-(H-pb-pt)*t;s+=`<line class="grid-l" x1="${pl}" x2="${W-10}" y1="${y}" y2="${y}"/><text x="${pl-6}" y="${y+4}" text-anchor="end">${fmt(Math.round(mx*t))}</text>`;});
  items.forEach((it,i)=>{const h=(H-pb-pt)*(it.v/mx), x=pl+i*bw+bw*.18, y=H-pb-h;
    s+=`<rect x="${x}" y="${y}" width="${bw*.64}" height="${Math.max(h,0)}" rx="3" fill="${hl&&hl(it)?'var(--crit)':hl2&&hl2(it)?'var(--s2)':color}"><title>${esc(it.l)}: ${fmtv(it.v)}</title></rect>`;
    if(items.length<=12) s+=`<text class="tv" x="${x+bw*.32}" y="${y-5}" text-anchor="middle">${fmtv(it.v)}</text>`;
    if(items.length<=12||i%2===0) s+=`<text x="${x+bw*.32}" y="${H-pb+16}" text-anchor="middle">${esc(it.l)}</text>`;});
  return `<div class="chart">${s}</svg></div>`;
}
function lines(days,series,{min=50,max=100}={}){
  const W=900,H=270,pl=44,pr=14,pt=14,pb=32;
  const x=i=>pl+(W-pl-pr)*(days.length<2?.5:i/(days.length-1));
  const y=v=>pt+(H-pt-pb)*(1-(Math.max(min,Math.min(max,v))-min)/(max-min));
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="Biểu đồ theo ngày">`;
  for(let v=min;v<=max;v+=10){s+=`<line class="grid-l" x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end">${v}%</text>`;}
  days.forEach((d,i)=>{if(i%3===0||i===days.length-1) s+=`<text x="${x(i)}" y="${H-10}" text-anchor="middle">${d}</text>`;});
  series.forEach(se=>{
    let d='';se.v.forEach((v,i)=>{if(v!=null) d+=(d?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);});
    s+=`<path d="${d}" fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round"/>`;
    se.v.forEach((v,i)=>{if(v!=null) s+=`<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="transparent"><title>${days[i]} · ${se.n}: ${pc(v)}</title></circle>`;});
  });
  return `<div class="chart">${s}</svg></div>`;
}
function ring(pass,total){
  const r=52,c=2*Math.PI*r,f=total?pass/total:0;
  return `<div class="ring"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--crit-soft)" stroke-width="14"/><circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--good)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c*f} ${c}"/></svg><div class="c"><div><b>${pass}/${total}</b><small>NPP đạt</small></div></div></div>`;
}

/* ---------------- bảng & nhãn ---------------- */
function table(head,rows){
  return `<div class="tscroll"><table><thead><tr>${head.map(h=>`<th class="${h[1]||''}" scope="col">${h[0]}</th>`).join('')}</tr></thead><tbody>${
    rows.length?rows.join(''):`<tr><td colspan="${head.length}" style="color:var(--muted)">Không có dữ liệu.</td></tr>`}</tbody></table></div>`;
}
const chip=v=>v==='PASS'?'<span class="chip ok">✓ Đạt</span>':'<span class="chip no">✕ Không đạt</span>';
const trkChip=v=>v==='PASS'?'<span class="chip ok">✓ Trong mức</span>':'<span class="chip warn">! Dưới mức</span>';

/* ---------------- định nghĩa tiêu chí ---------------- */
const DA=[
 {k:'payload',n:'Payload',v:s=>pc(s.payload_fail_pct),ok:s=>s.v_payload,th:`Ngưỡng < ${T_PL}% chuyến`,
  sub:s=>`${fmt(s.payload_plans_fail)}/${fmt(s.plans)} chuyến quá tải`,bar:s=>[s.payload_fail_pct,T_PL]},
 {k:'dt',n:'Distance & Time',v:s=>pc(s.dt_route_fail_pct),ok:s=>s.v_dt,th:`Ngưỡng < ${T_DT}% chuyến`,
  sub:s=>`${fmt(s.dt_routes_fail)}/${fmt(s.dt_plans??s.plans)} chuyến lỗi · không tính DSA`,bar:s=>[s.dt_route_fail_pct,T_DT]},
 {k:'created',n:'Created Date',v:s=>`${fmt(s.cd_routes_fail)}<small>chuyến</small>`,ok:s=>s.v_created,th:'Ngưỡng 0 chuyến',
  sub:s=>`${fmt(s.cd_fail)} đơn tạo sau khi giao`},
 {k:'username',n:'User name',v:s=>`${fmt(s.users_wrong)}<small>tài khoản</small>`,ok:s=>s.v_username,th:'Ngưỡng 0 tài khoản sai',
  sub:s=>`${fmt(s.users_total)} tài khoản giao hàng`}];
const TRK=[
 {k:'geo',n:'Geo Compliance',v:s=>pc(s.geo_pct,1),ok:s=>s.v_geo,th:`Mức tham chiếu ≥ ${TH.geo}%`,sub:s=>`${fmt(s.geo_fail)} đơn lỗi`},
 {k:'plan',n:`Chuyến lỗi > ${T_PLAN}%`,v:s=>pc(s.plan_fail_pct,1),ok:s=>s.v_plan,th:`Mức tham chiếu ≤ ${T_TOL}%`,sub:s=>`${fmt(s.plan_fail)}/${fmt(s.plans)} chuyến, mọi loại lỗi`}];
/* Đơn duyệt bởi tài khoản DSA: chỉ để theo dõi, không có ngưỡng */
const dsaN=s=>(s.user_types||{}).DSA||0, dsaP=s=>s.orders?dsaN(s)/s.orders*100:0;
TRK.push({k:'dsa',n:'Đơn duyệt bởi DSA',info:1,v:s=>pc(dsaP(s),1),ok:()=>'PASS',th:'Chỉ theo dõi, không có ngưỡng',sub:s=>`${fmt(dsaN(s))}/${fmt(s.orders)} đơn dùng tài khoản DSA`});
/* Năng lực giao hàng: không phải lỗi, không tính vào kết quả */
const CAP=[
 {k:'ontime',n:'On time',v:s=>pc(s.ot_pct,1),ok:s=>s.v_ontime,th:`Tham chiếu > ${TH.ontime}%`,sub:s=>`${fmt(s.ot_fail)} đơn giao trễ hạn`},
 {k:'h24',n:'On time 24H',v:s=>pc(s.t24_pct,1),ok:s=>s.v_24,th:`Tham chiếu > ${TH.ontime}%`,sub:s=>`${fmt(s.h24_fail)} đơn quá 24H · ${fmt(s.wh_fail)} giao sau ${TH.wh_end}:00`}];
const DRV=[['Geo'],['D&T'],['Payload'],['Created Date'],['User']];
const capNote=v=>v==='PASS'?'<span class="chip na">Trên tham chiếu</span>':'<span class="chip warn">! Dưới tham chiếu</span>';

function tile(c,s,all,track){
  const ok=c.ok(s)==='PASS';
  if(c.info) return `<button type="button" class="kpi trk" data-kpi="${c.k}">
    <div class="kh"><span class="kn">${c.n}</span><span class="chip na">Theo dõi</span></div>
    <div class="kv">${c.v(s)}</div><div class="kt">${esc(c.sub(s))}</div><div class="kt">${esc(c.th)}${all?` · ${DATA.scorecard.filter(x=>dsaN(x)>0).length}/${NPPS.length} NPP có đơn DSA`:''}</div></button>`;
  if(track==='cap') return `<button type="button" class="kpi trk ${ok?'':'below'}" data-kpi="${c.k}">
    <div class="kh"><span class="kn">${c.n}</span>${capNote(c.ok(s))}</div>
    <div class="kv" style="${ok?'':'color:var(--warn)'}">${c.v(s)}</div><div class="kt">${esc(c.sub(s))}</div><div class="kt">${esc(c.th)}${all?` · ${DATA.scorecard.filter(x=>c.ok(x)!=='PASS').length}/${NPPS.length} NPP dưới tham chiếu`:''}</div></button>`;
  let bar='';
  if(c.bar){const [v,t]=c.bar(s);bar=`<div class="meter" aria-hidden="true"><b style="width:${Math.min(100,(v||0)/(t*3)*100)}%;background:${ok?'var(--good)':'var(--crit)'}"></b><i style="left:33.3%"></i></div>`;}
  const npass=all?DATA.scorecard.filter(x=>c.ok(x)==='PASS').length:null;
  return `<button type="button" class="kpi ${track?'trk':''}" data-kpi="${c.k}">
    <div class="kh"><span class="kn">${c.n}</span>${track?trkChip(c.ok(s)):chip(c.ok(s))}</div>
    <div class="kv">${c.v(s)}</div>${bar}
    <div class="kt">${esc(c.sub(s))}</div>
    <div class="kt">${esc(c.th)}${all?` · ${npass}/${NPPS.length} NPP ${track?'trong mức':'đạt'}`:''}</div></button>`;
}
function gaps(s){
  const g=[], m=s.margin;
  if(s.v_payload==='FAIL') g.push([-m.pl_margin,'chuyến',`Payload: giảm ${fmt(-m.pl_margin)} chuyến quá tải (tối đa ${fmt(m.pl_allow)} chuyến).`]);
  if(s.v_dt==='FAIL') g.push([-m.dt_margin,'chuyến',`Distance & Time: giảm ${fmt(-m.dt_margin)} chuyến lỗi (tối đa ${fmt(m.dt_allow)} chuyến, không tính DSA).`]);
  if(s.v_created==='FAIL') g.push([s.cd_routes_fail,'chuyến',`Created Date: rà ${fmt(s.cd_fail)} đơn tạo sau khi giao. Không cho phép chuyến nào.`]);
  if(s.v_username==='FAIL') g.push([s.users_wrong,'tài khoản',`User name: đổi sang SĐT, biển số xe hoặc tài khoản DSA.`]);
  return g.sort((a,b)=>a[0]-b[0]);
}
function todoList(s){
  const g=gaps(s), m=s.margin;
  if(!g.length) return `<ul class="todo"><li class="okk"><span class="tn">✓</span><span>Đạt cả 4 tiêu chí. Dư địa: ${fmt(m.dt_margin)} chuyến lỗi D&T, ${fmt(m.pl_margin)} chuyến quá tải.</span></li></ul>`;
  return `<ul class="todo">${g.map(x=>`<li><span class="tn">${fmt(x[0])}<small>${x[1]}</small></span><span>${esc(x[2])}</span></li>`).join('')}</ul>`;
}

function notes(){
  let n='';
  if(month===CUR) n+=`<span class="chip warn">Current · số liệu tạm tính</span> `;
  (DATA.meta.fill_gap||[]).filter(x=>scope==='ALL'||x.npp===scope).forEach(x=>{n+=`<span class="chip warn">${esc(x.npp)}: thiếu Fill Rate (${x.matched_pct}% đơn khớp) · Created Date, 24H chưa đủ dữ liệu</span> `;});
  (DATA.meta.excluded||[]).forEach(x=>{n+=`<span class="chip na">Loại trừ ${esc(x.start.slice(0,5))}–${esc(x.end)} · ${fmt(x.orders)} đơn${x.note?' · '+esc(x.note):''}</span> `;});
  return n?`<div style="display:flex;flex-wrap:wrap;gap:6px">${n}</div>`:'';
}
/* ---------------- Tổng quan ---------------- */
function pOverview(){
  const s=curS(), all=scope==='ALL';
  let h='';
  if(all){
    const np=DATA.scorecard.filter(x=>x.overall==='PASS').length;
    h+=`<section class="card"><div class="hero">${ring(np,NPPS.length)}
      <div style="display:grid;gap:6px;min-width:0"><div class="lbl">Data Accuracy · ${esc(DATA.meta.period)}</div>
      <h2>${np} trên ${NPPS.length} NPP đạt kết quả tháng</h2>
      <p class="sub">${fmt(DATA.meta.orders)} đơn · ${fmt(DATA.meta.plans)} chuyến. Đạt khi qua cả 4 tiêu chí.</p>${notes()}
      <div class="npps">${DATA.scorecard.map(x=>`<button type="button" class="npill ${x.overall==='PASS'?'ok':'no'}" data-npp="${x.npp}"><b>${x.npp}</b><span>${x.overall==='PASS'?'✓ Đạt':'✕ Trượt '+x.n_fail}</span></button>`).join('')}</div></div></div></section>`;
  } else {
    const inf=DATA.npp_info[scope], ok=s.overall==='PASS';
    h+=`<section class="card"><div class="hero"><div class="verdict ${ok?'':''}" style="color:${ok?'var(--good)':'var(--crit)'}">${ok?'✓ ĐẠT':'✕ KHÔNG ĐẠT'}</div>
      <div style="display:grid;gap:4px;min-width:0"><div class="lbl">NPP ${esc(scope)} · ${esc(DATA.meta.period)}</div><h2>${esc(inf.name)}</h2>
      <p class="sub">${esc(inf.area)} · ${fmt(s.orders)} đơn · ${fmt(s.plans)} chuyến${s.n_fail?` · trượt ${s.n_fail}/4 tiêu chí`:''}</p>${notes()}</div></div></section>`;
  }
  h+=`<section class="card"><div class="ch"><div><h2>4 tiêu chí xét kết quả</h2><p class="sub">Trượt 1 tiêu chí là không đạt tháng.</p></div></div><div class="kpis">${DA.map(c=>tile(c,s,all,false)).join('')}</div></section>`;
  h+=`<section class="card"><div class="ch"><div><h2>Chỉ số theo dõi</h2><p class="sub">Không tính vào kết quả tháng.</p></div></div><div class="kpis">${TRK.map(c=>tile(c,s,all,true)).join('')}</div></section>`;
  h+=`<section class="card"><div class="ch"><div><h2>Năng lực giao hàng</h2><p class="sub">Đánh giá năng lực giao hàng, không tính là lỗi.</p></div></div><div class="kpis">${CAP.map(c=>tile(c,s,all,'cap')).join('')}</div></section>`;
  if(all){
    const cell=(v,ok)=>`<td class="n ${ok==null?'':(ok==='PASS'?'cok':'cno')}">${v}</td>`;
    const rw=(x,tot)=>cell(pc(x.payload_fail_pct),tot?null:x.v_payload)+cell(pc(x.dt_route_fail_pct),tot?null:x.v_dt)+cell(fmt(x.cd_routes_fail),tot?null:x.v_created)+cell(fmt(x.users_wrong),tot?null:x.v_username);
    const trk=x=>`<td class="n ${x.v_ontime==='PASS'?'':'cwarn'}">${pc(x.ot_pct,1)}</td><td class="n ${x.v_24==='PASS'?'':'cwarn'}">${pc(x.t24_pct,1)}</td><td class="n">${pc(x.geo_pct,1)}</td><td class="n">${pc(x.plan_fail_pct,1)}</td><td class="n">${pc(dsaP(x),1)}</td>`;
    const rows=DATA.scorecard.map(x=>`<tr class="click" data-npp="${x.npp}"><th scope="row">${x.npp}</th><td>${chip(x.overall)}</td>${rw(x)}${trk(x)}</tr>`);
    rows.push(`<tr class="tot"><th scope="row">Tổng</th><td></td>${rw(DATA.total,true)}${trk(DATA.total)}</tr>`);
    h+=`<section class="card"><div class="ch"><div><h2>Bảng điểm NPP</h2><p class="sub">Bấm một dòng để xem riêng NPP.</p></div></div>${table([['NPP'],['Kết quả'],['Payload','n'],['D&T','n'],['Created Date','n'],['User sai','n'],['On time','n'],['24H','n'],['Geo','n'],[`Chuyến lỗi`,'n'],['Đơn DSA','n']],rows)}
      <p class="sub">Payload, D&T: % chuyến lỗi · Created Date: số chuyến lỗi · User sai: số tài khoản. On time, 24H: năng lực giao hàng · Geo, Chuyến lỗi, Đơn DSA: theo dõi.</p></section>`;
    const fails=DATA.scorecard.filter(x=>x.overall==='FAIL');
    if(fails.length) h+=`<section class="card"><div class="ch"><div><h2>Ưu tiên xử lý</h2><p class="sub">Tiêu chí cần tập trung và phần còn thiếu để đạt.</p></div></div>
      <div class="grid2">${fails.map(x=>`<div style="display:grid;gap:8px"><h3>${x.npp}</h3>${todoList(x)}</div>`).join('')}</div></section>`;
  } else {
    h+=`<section class="card"><div class="ch"><div><h2>Ưu tiên xử lý</h2><p class="sub">Tiêu chí cần tập trung và phần còn thiếu để đạt.</p></div></div>${todoList(s)}</section>`;
    const us=DATA.users.ALL.filter(u=>u.npp===scope).slice(0,15);
    h+=`<section class="card"><div class="ch"><div><h2>Tài khoản nhiều đơn lỗi</h2><p class="sub">Bấm một tài khoản để xem đơn lỗi.</p></div></div>${
      table([['Tài khoản'],['Loại'],['Đơn','n'],['Đơn lỗi','n'],['D&T','n'],['Payload','n'],['Created','n'],['Geo','n'],['Trễ On time','n'],['Trễ 24H','n']],
      us.map(u=>`<tr class="click" data-user="${esc(u.username)}"><td class="mono">${esc(u.username)}</td><td>${esc(u.utype)}</td><td class="n">${fmt(u.orders)}</td><td class="n">${fmt(u.err)}</td><td class="n">${fmt(u.dt)}</td><td class="n">${fmt(u.pl)}</td><td class="n">${fmt(u.cd)}</td><td class="n">${fmt(u.geo)}</td><td class="n">${fmt(u.ot)}</td><td class="n">${fmt(u.t24)}</td></tr>`))}</section>`;
  }
  return h;
}

/* ---------------- Chi tiết KPI ---------------- */
function head(c,s,track){
  return `<div class="ch"><div><div class="lbl">${scope==='ALL'?'Tất cả NPP':'NPP '+esc(scope)} · ${track?'theo dõi':'xét kết quả'}</div><h2>${c.n}: ${c.v(s).replace(/<small>/,' <small>')}</h2><p class="sub">${esc(c.sub(s))} · ${esc(c.th)}</p></div>${c.info?'<span class="chip na">Theo dõi</span>':track?trkChip(c.ok(s)):chip(c.ok(s))}</div>`;
}
function headCap(c,s){
  return `<div class="ch"><div><div class="lbl">${scope==='ALL'?'Tất cả NPP':'NPP '+esc(scope)} · năng lực giao hàng, không tính là lỗi</div><h2>${c.n}: ${c.v(s)}</h2><p class="sub">${esc(c.sub(s))} · ${esc(c.th)}</p></div>${capNote(c.ok(s))}</div>`;
}
function lateTable(f){
  const rows=rowsIn(DATA.late_list||[]).filter(f), lim=300;
  return `<p class="sub">${fmt(rows.length)} đơn${rows.length>lim?`, hiện ${lim} đơn đầu`:''}.</p>`+table([['Ngày'],['NPP'],['Chuyến'],['Đơn'],['Tài khoản'],['Tạo lúc'],['Giao lúc'],['Ngày hứa'],['Giờ SLA','n'],['Chi tiết']],
    rows.slice(0,lim).map(r=>`<tr><td>${esc(r.day)}</td><td>${esc(r.npp)}</td><td class="mono">${esc(r.plan)}</td><td class="mono">${esc(r.order)}</td><td class="mono">${esc(r.user)}</td><td class="mono">${esc((r.created||'').slice(0,16))}</td><td class="mono">${esc((r.delivered||'—').slice(0,16))}</td><td>${esc(r.promised)}</td><td class="n">${r.hours==null?'—':n1(r.hours)}</td><td class="why">${esc(r.why)}</td></tr>`));
}
const byNpp=(f,o={})=>hbar(DATA.scorecard.map(x=>({l:x.npp,v:f(x),bad:o.bad?o.bad(x):false})),o);
const capMax=(f,t)=>Math.max(t*1.5,...DATA.scorecard.map(f))*1.08;
function sec(title,sub,body){return `<section class="card"><div><h2>${title}</h2>${sub?`<p class="sub">${sub}</p>`:''}</div>${body}</section>`;}
function pKpi(){
  const s=curS(), all=scope==='ALL';
  if(!DA.concat(TRK,CAP).some(c=>c.k===kpiSel)) kpiSel='payload';
  const btn=(c,track)=>`<button type="button" data-ks="${c.k}" class="${c.k===kpiSel?'on':''}" aria-pressed="${c.k===kpiSel}">${track?'':`<i style="background:${c.ok(s)==='PASS'?'var(--good)':'var(--crit)'}"></i>`}${c.n}</button>`;
  let h=`<div class="segs"><div class="seg"><span class="lbl">Xét KQ</span>${DA.map(c=>btn(c,false)).join('')}</div><div class="seg"><span class="lbl">Giao hàng</span>${CAP.map(c=>btn(c,true)).join('')}</div><div class="seg"><span class="lbl">Theo dõi</span>${TRK.map(c=>btn(c,true)).join('')}</div></div>`;
  const k=kpiSel, da=DA.find(c=>c.k===k), cap=CAP.find(x=>x.k===k), c=da||cap||TRK.find(x=>x.k===k), track=!da;
  const top=extra=>`<section class="card">${cap?headCap(c,s):head(c,s,track)}${extra||''}</section>`;
  const plRow=r=>`<tr class="click" data-plan="${esc(r.plan)}"><td class="mono">${esc(r.plan)}</td><td>${esc(r.npp)}</td><td>${esc(r.date)}</td>`;
  if(k==='payload'){
    h+=top(all?byNpp(x=>x.payload_fail_pct,{thr:T_PL,max:capMax(x=>x.payload_fail_pct,T_PL),bad:x=>x.v_payload==='FAIL'}):'');
    h+=sec(`Chuyến chở ≥ ${TH.payload_ratio} lần tải trọng`,'Vẫn ghi lỗi để theo dõi dù NPP đạt. Nên kiểm tra tải trọng xe khai trên TMS.',
      table([['Chuyến'],['NPP'],['Ngày'],['Xe'],['Đơn','n'],['Hàng','n'],['Tải trọng','n'],['Tỷ lệ','n']],rowsIn(DATA.pl_top).map(r=>plRow(r)+`<td class="mono">${esc(r.truck)}</td><td class="n">${fmt(r.orders)}</td><td class="n">${n1(r.weight,2)} t</td><td class="n">${n1(r.cap,2)} t</td><td class="n cno">${n1(r.ratio,2)}×</td></tr>`)));
  }
  if(k==='dt'){
    h+=top(all?byNpp(x=>x.dt_route_fail_pct,{thr:T_DT,max:capMax(x=>x.dt_route_fail_pct,T_DT),bad:x=>x.v_dt==='FAIL'}):'');
    h+=sec('Chuyến lỗi Distance & Time',`Đơn lỗi: cách outlet trước < ${TH.dt_gap_min} phút và > ${TH.dt_dist_min}m. Chuyến lỗi khi > ${TH.dt_route_pct*100}% đơn lỗi. Không tính đơn tài khoản DSA${s.dt_excl_plans!=null?` (loại ${fmt(s.dt_excl_orders)} đơn, ${fmt(s.dt_excl_plans)} chuyến chỉ có DSA)`:''}.`,
      table([['Chuyến'],['NPP'],['Ngày'],['Tài khoản'],['Đơn','n'],['Đơn lỗi','n'],['Tỷ lệ','n']],rowsIn(DATA.dt_top).map(r=>plRow(r)+`<td class="mono">${esc(r.user)}</td><td class="n">${fmt(r.orders)}</td><td class="n">${fmt(r.bad)}</td><td class="n cno">${pc(r.bad/r.orders*100,0)}</td></tr>`)));
  }
  if(k==='created'){
    h+=top(all?byNpp(x=>x.cd_routes_fail,{fmtv:v=>fmt(v)+' chuyến',max:Math.max(1,...DATA.scorecard.map(x=>x.cd_routes_fail))*1.25,bad:x=>x.cd_routes_fail>0}):'');
    h+=sec('Đơn tạo sau khi giao','Created Date lấy từ <code>Sent_To_distributor</code> (Fill Rate), ghép <code>DocNo = OrderNumber</code>. 1 đơn lỗi là chuyến lỗi.',
      table([['Đơn'],['Chuyến'],['NPP'],['Tài khoản'],['Tạo lúc'],['Giao lúc'],['Chênh','n']],rowsIn(DATA.cd_list).map(r=>`<tr class="click" data-plan="${esc(r.plan)}"><td class="mono">${esc(r.order)}</td><td class="mono">${esc(r.plan)}</td><td>${esc(r.npp)}</td><td class="mono">${esc(r.user)}</td><td class="mono">${esc(r.created)}</td><td class="mono">${esc(r.delivered)}</td><td class="n cno">${r.hours>=24?n1(r.hours/24)+' ngày':n1(r.hours)+' giờ'}</td></tr>`)));
  }
  if(k==='username'){
    h+=top();
    h+=sec('Tài khoản giao hàng','Hợp lệ: SĐT 10 số, biển số xe, hoặc tài khoản DSA.',
      table([['NPP'],['Tài khoản','n'],['Đơn DSA','n'],['Đơn SĐT','n'],['Đơn biển số','n'],['Sai','n'],['Danh sách sai']],(all?DATA.scorecard:[s]).map(x=>`<tr><th scope="row">${x.npp}</th><td class="n">${fmt(x.users_total)}</td>${['DSA','SĐT tài xế','Biển số xe'].map(t=>`<td class="n">${fmt(x.user_types[t]||0)}</td>`).join('')}<td class="n ${x.users_wrong?'cno':''}">${fmt(x.users_wrong)}</td><td class="mono">${esc(x.users_wrong_list.join(', '))||'—'}</td></tr>`)));
  }
  if(k==='geo'){
    h+=top(all?byNpp(x=>x.geo_pct,{thr:TH.geo,max:100,bad:x=>x.v_geo==='FAIL'}):'');
    h+=sec('Đơn lỗi Geo theo điều kiện','Một đơn có thể trượt nhiều điều kiện. Không tính đơn tài khoản DSA.',
      table([['NPP'],['Đơn xét','n'],['Đơn lỗi','n'],[`Lệch > ${TH.geo_radius_m}m`,'n'],[`≤ ${TH.geo_gap_min} phút`,'n'],['Ngoài giờ','n'],['Tỷ lệ đạt','n']],(all?DATA.scorecard:[s]).map(x=>`<tr><th scope="row">${x.npp}</th><td class="n">${fmt(x.geo_scope)}</td><td class="n">${fmt(x.geo_fail)}</td><td class="n">${fmt(x.geo_v)}</td><td class="n">${fmt(x.geo_w)}</td><td class="n">${fmt(x.geo_x)}</td><td class="n">${pc(x.geo_pct)}</td></tr>`)));
    const gd=DATA.geo_dist[scope], hr=DATA.hours[scope];
    h+=`<div class="grid2">${sec('Khoảng lệch vị trí','Chỉ nhóm 0–50m đạt.',vbar(gd.map(g=>({l:g.label,v:g.n})),{hl:it=>it.l!=='0–50m'}))}
      ${sec('Giờ hoàn tất',`Cột đỏ: ngoài ${String(TH.work_start).padStart(2,'0')}:00–${TH.work_end}:00.`,vbar(hr.map((v,i)=>({l:i+'h',v})),{hl:it=>{const hh=parseInt(it.l);return hh<TH.work_start||hh>=TH.work_end;}}))}</div>`;
  }
  if(k==='ontime'){
    h+=top(all?byNpp(x=>x.ot_pct,{thr:TH.ontime,max:100,neutral:1,bad:x=>x.v_ontime!=='PASS'}):'');
    const late={};rowsIn(DATA.late_list||[]).filter(r=>r.ot).forEach(r=>{const m=/trễ (\d+) ngày/.exec(r.why);const key=m?m[1]+' ngày':(/chưa có giờ giao/.test(r.why)?'Thiếu giờ giao':'Trong ngày hứa');late[key]=(late[key]||0)+1;});
    const lk=Object.keys(late).sort((a,b)=>(parseInt(a)||99)-(parseInt(b)||99));
    h+=sec('Đơn giao trễ theo số ngày','So với PromisedDate. "Trong ngày hứa": TMS chấm trễ theo SLA giờ. Successful dùng chung kết quả này.',vbar(lk.map(x=>({l:x,v:late[x]})),{color:'var(--s1)'}));
    h+=sec('Danh sách đơn giao trễ (On time)','',lateTable(r=>r.ot));
  }
  if(k==='h24'){
    h+=top(all?byNpp(x=>x.t24_pct,{thr:TH.ontime,max:100,neutral:1,bad:x=>x.v_24!=='PASS'}):'');
    h+=sec('Đơn chưa đạt 24H theo nguyên nhân',`Quá ${TH.sla_hours} giờ SLA hoặc giao sau ${TH.wh_end}:00. "Không xét": thiếu giờ tạo hoặc giờ giao.`,
      table([['NPP'],['Đơn xét','n'],['Chưa đạt','n'],['Quá 24H','n'],[`Sau ${TH.wh_end}:00`,'n'],['Không xét','n'],['Tỷ lệ đạt','n']],(all?DATA.scorecard:[s]).map(x=>`<tr><th scope="row">${x.npp}</th><td class="n">${fmt(x.t24_scope)}</td><td class="n">${fmt(x.t24_fail)}</td><td class="n">${fmt(x.h24_fail)}</td><td class="n">${fmt(x.wh_fail)}</td><td class="n">${fmt(x.h24_na)}</td><td class="n">${pc(x.t24_pct)}</td></tr>`)));
    const L=['Âm','0–12h','12–24h','24–48h','48–72h','> 72h'], hr=DATA.hours[scope], over=it=>it.l==='Âm'||it.l.startsWith('24')||it.l.startsWith('48')||it.l.startsWith('>');
    h+=`<div class="grid2">${sec('Thời gian giao tính SLA','Đã quy đổi mốc 17:00 và trừ Chủ nhật. Cột đậm: quá 24H; "Âm": tạo sau khi giao.',vbar(s.h24_bins.map((v,i)=>({l:L[i],v})),{color:'var(--s3)',hl2:over}))}
      ${sec('Giờ hoàn tất',`Cột đậm: từ ${TH.wh_end}h trở đi.`,vbar(hr.map((v,i)=>({l:i+'h',v})),{color:'var(--s3)',hl2:it=>parseInt(it.l)>=TH.wh_end}))}</div>`;
    h+=sec('Danh sách đơn chưa đạt 24H','',lateTable(r=>r.h24||r.wh));
  }
  if(k==='dsa'){
    h+=top(all?byNpp(x=>dsaP(x),{neutral:1,max:Math.max(5,...DATA.scorecard.map(dsaP))*1.1}):'');
    h+=sec('Đơn DSA theo NPP','Đơn có tài khoản giao hàng là tài khoản kho (DSA) thay vì tài xế. Đơn DSA không xét Geo và Distance & Time.',
      table([['NPP'],['Tổng đơn','n'],['Đơn DSA','n'],['% đơn DSA','n'],['Tài khoản DSA','n']],(all?DATA.scorecard:[s]).map(x=>`<tr><th scope="row">${x.npp}</th><td class="n">${fmt(x.orders)}</td><td class="n">${fmt(dsaN(x))}</td><td class="n">${pc(dsaP(x),1)}</td><td class="n">${fmt(DATA.users.ALL.filter(u=>u.npp===x.npp&&u.utype==='DSA').length)}</td></tr>`)));
    const us=rowsIn(DATA.users.ALL).filter(u=>u.utype==='DSA').sort((a,b)=>b.orders-a.orders);
    h+=sec('Tài khoản DSA','Bấm một tài khoản để xem các đơn lỗi của tài khoản đó.',
      table([['Tài khoản'],['NPP'],['Đơn','n'],['Chuyến','n'],['Đơn lỗi','n']],us.map(u=>`<tr class="click" data-user="${esc(u.username)}"><td class="mono">${esc(u.username)}</td><td>${esc(u.npp)}</td><td class="n">${fmt(u.orders)}</td><td class="n">${fmt(u.plans)}</td><td class="n">${fmt(u.err)}</td></tr>`)));
  }
  if(k==='plan'){
    h+=top(all?byNpp(x=>x.plan_fail_pct,{thr:T_TOL,bad:x=>x.v_plan==='FAIL'}):'');
    h+=sec('Loại lỗi trong chuyến lỗi','Số chuyến lỗi có chứa loại lỗi đó. Một chuyến có thể chứa nhiều loại.',
      table([['NPP'],['Chuyến lỗi','n'],...DRV.map(d=>[d[0],'n'])],(all?DATA.scorecard:[s]).map(x=>`<tr><th scope="row">${x.npp}</th><td class="n">${fmt(x.plan_fail)}</td>${DRV.map(d=>`<td class="n">${fmt(x.plan_drivers[d[0]])}</td>`).join('')}</tr>`)));
    const pls=rowsIn(DATA.plan_list), lim=200;
    h+=sec('Danh sách chuyến lỗi',`${fmt(pls.length)} chuyến${pls.length>lim?`, hiện ${lim} chuyến đầu`:''}. Bấm để xem đơn.`,
      table([['Chuyến'],['NPP'],['Ngày'],['Tài khoản'],['Đơn','n'],['Đơn lỗi','n'],['Tỷ lệ','n'],['Loại lỗi']],pls.slice(0,lim).map(r=>plRow(r)+`<td class="mono">${esc(r.user)}</td><td class="n">${fmt(r.orders)}</td><td class="n">${fmt(r.err)}</td><td class="n">${n1(r.ratio)}%</td><td>${esc(r.types)}</td></tr>`)));
  }
  return h;
}

/* ---------------- Xu hướng ---------------- */
function pTrend(){
  const d=DATA.daily[scope], days=d.map(x=>x.day);
  let h=sec('Chuyến lỗi Distance & Time theo ngày',`Cột đỏ: ngày ≥ ${T_DT}%. Ngưỡng xét trên cả tháng.`,vbar(d.map(x=>({l:x.day,v:x.dtr_pct??0})),{fmtv:v=>n1(v)+'%',hl:it=>it.v>=T_DT}));
  h+=sec('Geo và năng lực giao hàng theo ngày','Tỷ lệ đơn đạt. Trục dọc từ 50%.',
    `<div class="legend"><span><i style="background:var(--s1)"></i>Geo Compliance</span><span><i style="background:var(--s2)"></i>On time</span><span><i style="background:var(--s3)"></i>On time 24H</span></div>`+
    lines(days,[{n:'Geo',v:d.map(x=>x.geo),c:'var(--s1)'},{n:'On time',v:d.map(x=>x.ot),c:'var(--s2)'},{n:'24H',v:d.map(x=>x.t24),c:'var(--s3)'}]));
  h+=sec('Số liệu theo ngày','Bấm một ngày để xem đơn lỗi.',
    table([['Ngày'],['Chuyến','n'],['Lỗi D&T','n'],['% D&T','n'],['Created lỗi','n'],['Đơn','n'],['Đơn lỗi','n'],['Geo','n'],['On time','n'],['24H','n']],d.map(x=>`<tr class="click" data-day="${x.day}"><td>${x.day}</td><td class="n">${fmt(x.plans)}</td><td class="n">${fmt(x.dtr)}</td><td class="n ${x.dtr_pct>=T_DT?'cno':''}">${pc(x.dtr_pct,1)}</td><td class="n ${x.cd?'cno':''}">${fmt(x.cd)}</td><td class="n">${fmt(x.orders)}</td><td class="n">${fmt(x.err)}</td><td class="n">${pc(x.geo,1)}</td><td class="n">${pc(x.ot,1)}</td><td class="n">${pc(x.t24,1)}</td></tr>`)));
  return h;
}

/* ---------------- Đơn lỗi ---------------- */
const TYPES=['D&T','Payload','Created Date','User','Geo'], TRK_T=['Geo'];
function filtered(){
  const q=EF.q.trim().toLowerCase();
  return ERR.filter(e=>(scope==='ALL'||e.TenantName===scope)&&(!EF.npp||e.TenantName===EF.npp)&&
    (!EF.type||e.loi.split(' + ').includes(EF.type))&&(!EF.pf||e.plan_fail)&&(!EF.day||(e.Date||'').startsWith(EF.day))&&
    (!q||[e.OrderNumber,e.PlanNumber,e.username,String(e.OutletCode),e.DriverName].some(v=>String(v??'').toLowerCase().includes(q))));
}
function pErrors(){
  const rows=filtered(), ps=50, pages=Math.max(1,Math.ceil(rows.length/ps)); epage=Math.min(epage,pages);
  const days=DATA.daily.ALL.map(x=>x.day);
  const cnt=t=>ERR.filter(e=>(scope==='ALL'||e.TenantName===scope)&&e.loi.split(' + ').includes(t)).length;
  let h=`<section class="card"><div class="ch"><div><h2>Đơn lỗi</h2><p class="sub">${fmt(rows.length)} đơn. Nhãn đỏ: xét kết quả · nhãn xám: theo dõi.</p></div>
    <div style="display:flex;gap:8px"><button class="btn sm" type="button" id="xlsx">Tải Excel</button><button class="btn sm" type="button" id="csv">Tải CSV</button></div></div>
  <div class="filters">
    <div class="field"><label for="fq">Tìm kiếm</label><input type="search" id="fq" value="${esc(EF.q)}" placeholder="Đơn, chuyến, tài khoản, outlet"></div>
    <div class="field"><label for="ft">Loại lỗi</label><select id="ft"><option value="">Tất cả</option>${TYPES.map(t=>`<option ${EF.type===t?'selected':''} value="${t}">${t} (${fmt(cnt(t))})</option>`).join('')}</select></div>
    ${scope==='ALL'?`<div class="field"><label for="fn">NPP</label><select id="fn"><option value="">Tất cả</option>${NPPS.map(n=>`<option ${EF.npp===n?'selected':''}>${n}</option>`).join('')}</select></div>`:''}
    <div class="field"><label for="fd">Ngày</label><select id="fd"><option value="">Tất cả</option>${days.map(d=>`<option ${EF.day===d?'selected':''}>${d}</option>`).join('')}</select></div>
    <label class="check"><input type="checkbox" id="fpf" ${EF.pf?'checked':''}> Chỉ chuyến lỗi &gt; ${T_PLAN}%</label>
    <button class="btn sm" type="button" id="fclear">Xoá lọc</button>
  </div>`;
  const slice=rows.slice((epage-1)*ps,epage*ps);
  h+=table([['Ngày'],['NPP'],['Chuyến'],['Đơn'],['Tài khoản'],['Giao lúc'],['Lỗi'],['Chi tiết']],
    slice.map(e=>`<tr><td>${esc((e.Date||'').slice(0,5))}</td><td>${esc(e.TenantName)}</td><td class="mono">${esc(e.PlanNumber)}</td><td class="mono">${esc(e.OrderNumber)}<br><span class="sub">Outlet ${esc(e.OutletCode)}</span></td><td class="mono">${esc(e.username)}</td><td class="mono">${esc((e.DeliverDateTime||'—').slice(0,16))}</td><td>${e.loi.split(' + ').map(t=>`<span class="chip ${TRK_T.includes(t)?'na':'no'}">${esc(t)}</span>`).join(' ')}</td><td class="why">${esc(e.ly_do)}</td></tr>`));
  h+=`<div class="pager"><button class="btn sm" type="button" id="pprev" ${epage<=1?'disabled':''}>← Trước</button><span>Trang ${epage}/${pages}</span><button class="btn sm" type="button" id="pnext" ${epage>=pages?'disabled':''}>Sau →</button></div></section>`;
  return h;
}
const XCOLS=[['Date','Ngày'],['TenantName','NPP'],['PlanNumber','Chuyến'],['OrderNumber','Đơn'],['OutletCode','Outlet'],['username','Tài khoản'],['utype','Loại tài khoản'],['DriverName','Tài xế/Xe'],['Status','Trạng thái'],['Sent_To_distributor','Created Date'],['DeliverDateTime','Giao lúc'],['PromisedDate','Ngày hứa'],['distance_to_dropped','Lệch vị trí (m)'],['gap','Cách outlet trước (phút)'],['seq','Thứ tự trong chuyến'],['plan_orders','Số đơn của chuyến'],['plan_err','Đơn lỗi của chuyến'],['plan_err_pct','% đơn lỗi của chuyến'],['plan_fail_txt','Chuyến lỗi >30%'],['plan_ratio','Tỷ lệ tải chuyến'],['TruckCategory','Loại xe'],['TruckCapacityWeight','Tải trọng xe'],['Assigned_Weight','Khối lượng đơn'],['h24_dur','Thời gian SLA 24H (giờ)'],['loi','Loại lỗi'],['ly_do','Chi tiết']];
const xv=(r,k)=>k==='plan_err_pct'?Math.round(r.plan_err_ratio*1000)/10:k==='plan_fail_txt'?(r.plan_fail?'Có':'Không'):r[k];
async function saveFile(kind){
  const rows=filtered();
  const name=`TMS_don_loi_${scope==='ALL'?(EF.npp||'tat_ca'):scope}${EF.type?'_'+EF.type.replace(/\W+/g,''):''}${EF.day?'_'+EF.day.replace('/','-'):''}.${kind}`;
  let data;
  if(kind==='csv'){
    const q=v=>{const s=String(v??'');return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    data='﻿'+[XCOLS.map(c=>c[1]).join(','),...rows.map(r=>XCOLS.map(c=>q(xv(r,c[0]))).join(','))].join('\n');
  } else {
    if(!window.XLSX){toast('Chưa tải được thư viện Excel, hãy dùng CSV.');return;}
    const ws=XLSX.utils.aoa_to_sheet([XCOLS.map(c=>c[1]),...rows.map(r=>XCOLS.map(c=>xv(r,c[0])??''))]);
    ws['!cols']=XCOLS.map(c=>({wch:Math.max(10,c[1].length+2)}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Don loi');
    data=new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
  }
  const dl=window.claude&&window.claude.use&&await window.claude.use('downloads');
  if(!dl){const blob=new Blob([data],{type:kind==='csv'?'text/csv;charset=utf-8':'application/octet-stream'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);toast('Đã tải '+fmt(rows.length)+' dòng');return;}
  try{await dl.save({filename:name,data});toast('Đã tải '+fmt(rows.length)+' dòng');}
  catch(e){if(e&&e.code!=='declined') toast('Không tải được file ('+(e.code||'lỗi')+').');}
}

/* ---------------- Cách tính ---------------- */
function pLogic(){
  const W=`${String(TH.work_start).padStart(2,'0')}:00–${TH.work_end}:00`;
  const R=[
   ['Payload',`< ${T_PL}% chuyến`,`Chuyến lỗi khi tổng tải / tải trọng xe ≥ ${TH.payload_ratio}.`],
   ['Distance & Time',`< ${T_DT}% chuyến`,`Đơn lỗi khi cách outlet trước < ${TH.dt_gap_min} phút và > ${TH.dt_dist_min}m. Chuyến lỗi khi > ${TH.dt_route_pct*100}% đơn lỗi. Không tính đơn tài khoản DSA; chuyến chỉ có đơn DSA không đưa vào mẫu số.`],
   ['Created Date','0 chuyến','Đơn lỗi khi tạo sau giờ giao (<code>Sent_To_distributor</code> > <code>DeliverDateTime</code>). 1 đơn lỗi là chuyến lỗi.'],
   ['User name','0 tài khoản sai','Tài khoản phải là SĐT 10 số, biển số xe hoặc tài khoản DSA.']];
  const T=[
   ['Geo Compliance',`≥ ${TH.geo}%`,`Đạt khi lệch ≤ ${TH.geo_radius_m}m, cách outlet trước > ${TH.geo_gap_min} phút, hoàn tất trong ${W}. Không tính DSA.`],
   [`Chuyến lỗi > ${T_PLAN}%`,`≤ ${T_TOL}% chuyến`,'Gộp lỗi của Payload, D&T, Created Date, User name và Geo.'],
   ['Đơn duyệt bởi DSA','Không có ngưỡng','Tỷ lệ và số đơn có tài khoản giao hàng là tài khoản kho (DSA). Đơn DSA không xét Geo và Distance & Time.']];
  const C=[
   ['On time',`Tham chiếu > ${TH.ontime}%`,'Theo cột <code>is_ontime</code> của TMS. Successful dùng chung kết quả.'],
   ['On time 24H',`Tham chiếu > ${TH.ontime}%`,`Từ lúc tạo đơn đến lúc giao ≤ ${TH.sla_hours} giờ. Đơn tạo từ ${TH.send_cutoff}:00, giao hôm sau: tính từ 00:00 hôm sau (thứ 7 → thứ 2). Trừ Chủ nhật nếu không giao Chủ nhật. Giao sau ${TH.wh_end}:00 tính là chưa đạt.`]];
  let h=`<section class="card"><div><h2>Cách tính kết quả tháng</h2><p class="sub">Theo file chấm Data Accuracy chính thức.</p></div>
    <div class="flow"><div><span class="lbl">Bước 1</span><b>Đơn lỗi</b><span class="sub">Ghi nhận lỗi theo từng tiêu chí.</span></div>
    <div><span class="lbl">Bước 2</span><b>Chuyến lỗi</b><span class="sub">Gộp đơn lỗi theo chuyến (PlanNumber).</span></div>
    <div><span class="lbl">Bước 3</span><b>Kết quả NPP</b><span class="sub">Đạt cả 4 tiêu chí mới đạt tháng, nhận 15% DIP.</span></div></div></section>`;
  h+=`<section class="card"><h2>4 tiêu chí xét kết quả</h2><div class="rules">${R.map(r=>`<article class="rule"><div class="rh"><h3>${r[0]}</h3><span class="rt">${r[1]}</span></div><p>${r[2]}</p></article>`).join('')}</div></section>`;
  h+=`<section class="card"><div><h2>Năng lực giao hàng</h2><p class="sub">Đánh giá năng lực giao hàng của NPP. Không tính là lỗi, không ảnh hưởng kết quả tháng.</p></div><div class="rules">${C.map(r=>`<article class="rule trk"><div class="rh"><h3>${r[0]}</h3><span class="rt">${r[1]}</span></div><p>${r[2]}</p></article>`).join('')}</div></section>`;
  h+=`<section class="card"><div><h2>Chỉ số theo dõi</h2><p class="sub">Giúp NPP cải thiện, không tính vào kết quả.</p></div><div class="rules">${T.map(r=>`<article class="rule trk"><div class="rh"><h3>${r[0]}</h3><span class="rt">${r[1]}</span></div><p>${r[2]}</p></article>`).join('')}</div></section>`;
  h+=`<section class="card"><h2>Lưu ý</h2><div class="rules">
    <article class="rule"><h3>Mức cho phép</h3><p>Số chuyến lỗi tối đa vẫn đạt = số lớn nhất còn dưới ${T_DT}% tổng chuyến. Ví dụ 400 chuyến: tối đa 19.</p></article>
    <article class="rule"><h3>Loại trừ ngày</h3><p>${ORDER.flatMap(m=>BUNDLE.months[m].meta.excluded||[]).map(x=>`${esc(x.start)}–${esc(x.end)}: loại khỏi toàn bộ KPI (${fmt(x.orders)} đơn, ${fmt(x.plans)} chuyến).`).join(' ')||'Không có khoảng ngày nào bị loại trừ.'}</p></article>
    <article class="rule"><h3>Khoảng cách outlet</h3><p>Tính từ toạ độ <code>lat_to/long_to</code> của 2 outlet liên tiếp trong chuyến.</p></article>
    <article class="rule"><h3>Phản hồi số liệu</h3><p>Tab Đơn lỗi → lọc → Tải Excel → đánh dấu đơn cần xem lại → gửi quản lý vùng.</p></article></div></section>`;
  return h;
}

/* ---------------- Tổng quan nhiều tháng ---------------- */
let mSel='payload';
const MC=[  // tiêu chí: khoá verdict, cách hiện giá trị, true = càng thấp càng tốt
 {k:'overall',n:'Kết quả tháng',v:'overall'},
 {k:'payload',n:'Payload',v:'v_payload',val:x=>x.payload_fail_pct,f:v=>pc(v),low:1},
 {k:'dt',n:'Distance & Time',v:'v_dt',val:x=>x.dt_route_fail_pct,f:v=>pc(v),low:1},
 {k:'created',n:'Created Date',v:'v_created',val:x=>x.cd_routes_fail,f:v=>fmt(v)+' chuyến',low:1},
 {k:'username',n:'User name',v:'v_username',val:x=>x.users_wrong,f:v=>fmt(v)+' TK',low:1},
 {k:'geo',n:'Geo Compliance',v:'v_geo',val:x=>x.geo_pct,f:v=>pc(v,1),trk:1},
 {k:'ontime',n:'On time',v:'v_ontime',val:x=>x.ot_pct,f:v=>pc(v,1),trk:1,cap:1},
 {k:'h24',n:'On time 24H',v:'v_24',val:x=>x.t24_pct,f:v=>pc(v,1),trk:1,cap:1},
 {k:'dsa',n:'Đơn duyệt bởi DSA',v:'_',val:x=>dsaP(x),f:v=>pc(v,1),trk:1,info:1}];
const rowOf=(m,n)=>{const d=BUNDLE.months[m];return n==='ALL'?d.total:d.scorecard.find(s=>s.npp===n);};
const nppsAll=()=>[...new Set(ORDER.flatMap(m=>BUNDLE.months[m].npps))].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
function pMonths(){
  const all=scope==='ALL', ms=DONE;
  if(!ms.length) return sec('Chưa có tháng hoàn thành','Trang này tổng hợp các tháng đã kết thúc. Tháng Current xem ở tab Tổng quan.','');
  let h=`<section class="card"><div class="ch"><div><h2>Kết quả ${ms.length} tháng đã hoàn thành</h2><p class="sub">${all?'Số NPP đạt Data Accuracy mỗi tháng.':'Kết quả Data Accuracy của NPP '+esc(scope)+' mỗi tháng.'} Không gồm tháng Current. Bấm một tháng để xem chi tiết.</p></div></div><div class="mcards">${
    ms.map(m=>{const d=BUNDLE.months[m];
      if(all){const np=d.scorecard.filter(x=>x.overall==='PASS').length;
        return `<button type="button" class="mcard ${m===month?'cur':''}" data-month="${m}">${ring(np,d.npps.length)}<div><div class="lbl">${ml(m)}</div><div class="big">${np}/${d.npps.length} NPP đạt</div><div class="sub">${fmt(d.meta.orders)} đơn · ${fmt(d.meta.plans)} chuyến${exclTxt(d)?' · loại trừ '+exclTxt(d):''}</div></div></button>`;}
      const r=rowOf(m,scope);
      if(!r) return `<div class="mcard"><div class="big" style="color:var(--muted)">—</div><div><div class="lbl">${ml(m)}</div><div class="sub">Không có dữ liệu</div></div></div>`;
      const ok=r.overall==='PASS';
      return `<button type="button" class="mcard ${m===month?'cur':''}" data-month="${m}"><div class="big" style="color:${ok?'var(--good)':'var(--crit)'};font-size:1.6rem">${ok?'✓':'✕'}</div><div><div class="lbl">${ml(m)}</div><div class="big">${ok?'Đạt':'Không đạt'}</div><div class="sub">${ok?'Qua cả 4 tiêu chí':'Trượt '+r.n_fail+'/4 tiêu chí'}</div></div></button>`;}).join('')}</div></section>`;
  /* bảng tiêu chí × tháng */
  const head=[['Tiêu chí'],...ms.map(m=>[ml(m),'n'])];
  const cell=(m,c)=>{
    if(c.info){const r=rowOf(m,scope); return `<td class="n">${r?c.f(c.val(r))+(all?` · ${fmt(dsaN(r))} đơn`:''):'—'}</td>`;}
    if(all){const d=BUNDLE.months[m], k=d.scorecard.filter(x=>x[c.v]==='PASS').length, n=d.npps.length, f=k/n;
      return `<td class="n"><div class="ratio" style="margin-left:auto"><span>${k}/${n} ${c.cap?'trên tham chiếu':c.trk?'trong mức':'đạt'}</span><div class="meter"><b style="width:${f*100}%;background:${c.cap?(f===1?'var(--s1)':'var(--warn)'):f===1?'var(--good)':c.trk?'var(--warn)':'var(--crit)'}"></b></div></div></td>`;}
    const r=rowOf(m,scope); if(!r) return '<td class="n">—</td>';
    const ok=r[c.v]==='PASS';
    if(!c.val) return `<td class="n">${chip(r.overall)}</td>`;
    return `<td class="n ${c.cap?(ok?'':'cwarn'):c.trk?'':(ok?'cok':'cno')}">${c.val?c.f(c.val(r))+' ':''}${c.cap?(ok?'':'!'):c.trk?(ok?'':'!'):(ok?'✓':'✕')}</td>`;};
  h+=`<section class="card"><div><h2>${all?'Số NPP đạt theo tiêu chí':'Từng tiêu chí qua các tháng'}</h2><p class="sub">4 tiêu chí đầu xét kết quả · Geo, Đơn DSA: theo dõi · On time, 24H: năng lực giao hàng, không tính là lỗi.</p></div>${
    table(head,MC.map(c=>`<tr><th scope="row" style="${c.trk?'font-weight:500;color:var(--muted)':''}">${c.n}</th>${ms.map(m=>cell(m,c)).join('')}</tr>`))}</section>`;
  /* đạt / rớt từng NPP */
  if(all){
    const tag=(r,v,l)=>`<span class="${!r?'na':r[v]==='PASS'?'ok':'no'}" title="${l}">${l[0]}</span>`;
    const rows=nppsAll().map(n=>{let won=0,has=0;
      const cells=ms.map(m=>{const r=rowOf(m,n); if(!r) return '<td>—</td>'; has++; if(r.overall==='PASS') won++;
        return `<td>${chip(r.overall)}<span class="tags">${tag(r,'v_payload','Payload')}${tag(r,'v_dt','D&T')}${tag(r,'v_created','Created Date')}${tag(r,'v_username','User name')}</span></td>`;}).join('');
      return `<tr class="click" data-npp="${n}"><th scope="row">${n}</th>${cells}<td class="n ${won===has?'cok':won===0?'cno':''}">${won}/${has}</td></tr>`;});
    h+=`<section class="card"><div><h2>Đạt / rớt theo NPP</h2><p class="sub">Ô màu: P Payload · D Distance &amp; Time · C Created Date · U User name; ô đỏ là tiêu chí trượt.</p></div>${
      table([['NPP'],...ms.map(m=>[ml(m)]),['Số tháng đạt','n']],rows)}</section>`;
  }
  /* diễn biến chỉ số (khi xem tất cả NPP; một NPP đã có ở bảng trên) */
  if(!all) return h;
  const c=MC.find(x=>x.k===mSel);
  const segs=MC.filter(x=>x.val).map(x=>`<button type="button" data-ms="${x.k}" class="${x.k===mSel?'on':''}" aria-pressed="${x.k===mSel}">${x.n}</button>`).join('');
  const better=(a,b)=>c.low?b<a:b>a;
  const line=n=>{let prev=null;
    return ms.map(m=>{const r=rowOf(m,n); if(!r) return '<td class="n">—</td>';
      const v=c.val(r), ok=r[c.v]==='PASS';
      let d=''; if(prev!=null&&v!==prev) d=`<span class="delta ${c.info?'':better(prev,v)?'up':'dn'}">${v>prev?'▲':'▼'}</span>`;
      prev=v; return `<td class="n ${c.info?'':c.cap?(ok?'':'cwarn'):c.trk?'':(ok?'cok':'cno')}">${c.f(v)}${d}</td>`;}).join('');};
  const list=all?nppsAll():[scope];
  h+=`<section class="card"><div class="ch"><div><h2>Diễn biến chỉ số</h2><p class="sub">▲▼ so với tháng trước; xanh là tốt lên, đỏ là xấu đi.</p></div></div><div class="seg">${segs}</div>${
    table([['NPP'],...ms.map(m=>[ml(m),'n'])],list.map(n=>`<tr class="${all?'click':''}" ${all?`data-npp="${n}"`:''}><th scope="row">${n}</th>${line(n)}</tr>`).concat(all?[`<tr class="tot"><th scope="row">Tổng</th>${line('ALL').replace(/ c(ok|no)/g,'')}</tr>`]:[]))}</section>`;
  return h;
}

/* ---------------- Data Quality (admin) ---------------- */
function pDq(){
  const q=DATA.dq;
  let h=`<section class="card"><div><h2>Ghép 2 file</h2><p class="sub">TMS Order Detail (<code>OrderNumber</code>) ghép Fill Rate (<code>DocNo</code>).</p></div>
  <div class="stats">
    <div><b>${fmt(q.rows_tms)}</b><span>đơn TMS · ${fmt(q.dup_orders)} trùng</span></div>
    <div><b>${fmt(q.rows_fr)}</b><span>dòng Fill Rate</span></div>
    <div><b>${pc(q.matched/q.rows_tms*100)}</b><span>${fmt(q.matched)} đơn ghép được</span></div>
    <div><b>${fmt(q.tms_unmatched)}</b><span>đơn TMS không có Fill Rate</span></div>
    <div><b>${fmt(q.fr_unmatched)}</b><span>đơn Fill Rate không có TMS</span></div></div>
  ${q.tms_unmatched_rows.length?table([['NPP'],['Đơn không ghép được'],['Trạng thái']],q.tms_unmatched_rows.map(r=>`<tr><td>${esc(r.npp)}</td><td class="mono">${esc(r.order)}</td><td>${esc(r.status)}</td></tr>`)):''}</section>`;
  h+=`<section class="card"><h2>Bất thường trong dữ liệu</h2><div class="stats">
    <div><b>${fmt(q.null_deliver)}</b><span>đơn thiếu giờ giao</span></div>
    <div><b>${fmt(q.deliver_after_period)}</b><span>đơn giao sau kỳ</span></div>
    <div><b>${fmt(q.deliver_before_period)}</b><span>đơn ghi giao trước kỳ</span></div>
    <div><b>${fmt(q.geo_out5k)}</b><span>đơn lệch > 5km (xa nhất ${fmt(Math.round(q.geo_max/1000))}km)</span></div>
    <div><b>${fmt(q.plans_mixed_cap)}</b><span>chuyến nhiều mức tải trọng</span></div>
    <div><b>${fmt(q.cd_neg)}</b><span>đơn tạo sau khi giao</span></div>
    ${Object.entries(q.status).map(([k,v])=>`<div><b>${fmt(v)}</b><span>${esc(k)}</span></div>`).join('')}</div></section>`;
  const sens=DATA.sens;
  h+=`<section class="card"><div><h2>So sánh cách tính</h2><p class="sub">Ô vàng: NPP đổi kết quả so với cách đang áp dụng.</p></div>
    ${table([['Cách tính'],['Đạt','n'],...NPPS.map(n=>[n])],sens.map(s=>`<tr><th scope="row" style="font-weight:500">${esc(s.label)}</th><td class="n">${s.pass}/${NPPS.length}</td>${NPPS.map(n=>{const ch=s.v[n]!==sens[0].v[n];return `<td style="${ch?'background:var(--warn-soft)':''}" class="${s.v[n]==='PASS'?'cok':''}">${s.v[n]==='PASS'?'✓':'✕'}</td>`;}).join('')}</tr>`))}</section>`;
  return h;
}

/* ---------------- điều hướng ---------------- */
const PAGES=[['months',`${DONE.length||3} tháng`,pMonths],['overview','Tổng quan',pOverview],['kpi','Chi tiết KPI',pKpi],['trend','Xu hướng',pTrend],['errors','Đơn lỗi',pErrors],['logic','Cách tính',pLogic],['dq','Data Quality',pDq]];
function buildTabs(){
  $('#tabs').innerHTML=PAGES.filter(p=>p[0]!=='dq'||isAdmin()).map(p=>`<button type="button" role="tab" data-p="${p[0]}" aria-selected="${p[0]===page}" class="${p[0]===page?'on':''}">${p[1]}</button>`).join('');
}
function render(){
  buildTabs();
  const inf=scope==='ALL'?null:DATA.npp_info[scope];
  $('#hmeta').textContent=`${scope==='ALL'?DATA.meta.bu+' · '+NPPS.length+' NPP':'NPP '+scope+' · '+inf.area} · ${page==='months'?DONE.map(ml).join(', '):DATA.meta.period}`;
  $('#month').disabled=page==='months';
  $('#main').innerHTML=PAGES.find(p=>p[0]===page)[2]();
  try{ if(location.hash!=='#'+page) history.replaceState(null,'','#'+page);}catch(_){}
  wire();
}
function go(p){page=p;render();window.scrollTo({top:0});}
function setScope(n){if(!isAdmin())return;
  if(n!=='ALL'&&!NPPS.includes(n)){const m=ORDER.slice().reverse().find(x=>BUNDLE.months[x].npps.includes(n)); if(!m) return; loadMonth(m);$('#month').value=m;}
  scope=n;fillScope();EF.npp='';epage=1;render();}
const reset=o=>Object.assign({q:'',type:'',day:'',npp:'',pf:false},o);
function wire(){
  document.querySelectorAll('[data-npp]').forEach(el=>el.addEventListener('click',()=>setScope(el.dataset.npp)));
  document.querySelectorAll('.kpi[data-kpi]').forEach(el=>el.addEventListener('click',()=>{kpiSel=el.dataset.kpi;go('kpi');}));
  document.querySelectorAll('[data-ks]').forEach(el=>el.addEventListener('click',()=>{kpiSel=el.dataset.ks;render();}));
  document.querySelectorAll('[data-ms]').forEach(el=>el.addEventListener('click',()=>{mSel=el.dataset.ms;render();}));
  document.querySelectorAll('[data-month]').forEach(el=>el.addEventListener('click',()=>{loadMonth(el.dataset.month);fillScope();$('#month').value=month;go('overview');}));
  document.querySelectorAll('[data-plan]').forEach(el=>el.addEventListener('click',()=>{EF=reset({q:el.dataset.plan});epage=1;go('errors');}));
  document.querySelectorAll('[data-user]').forEach(el=>el.addEventListener('click',()=>{EF=reset({q:el.dataset.user});epage=1;go('errors');}));
  document.querySelectorAll('[data-day]').forEach(el=>el.addEventListener('click',()=>{EF=reset({day:el.dataset.day});epage=1;go('errors');}));
  if(page==='errors'){
    let tmr;
    $('#fq').addEventListener('input',e=>{clearTimeout(tmr);tmr=setTimeout(()=>{EF.q=e.target.value;epage=1;render();const f=$('#fq');f.focus();f.setSelectionRange(f.value.length,f.value.length);},300);});
    $('#ft').addEventListener('change',e=>{EF.type=e.target.value;epage=1;render();});
    $('#fd').addEventListener('change',e=>{EF.day=e.target.value;epage=1;render();});
    $('#fpf').addEventListener('change',e=>{EF.pf=e.target.checked;epage=1;render();});
    if($('#fn')) $('#fn').addEventListener('change',e=>{EF.npp=e.target.value;epage=1;render();});
    $('#fclear').addEventListener('click',()=>{EF=reset({});epage=1;render();});
    $('#pprev').addEventListener('click',()=>{epage--;render();});
    $('#pnext').addEventListener('click',()=>{epage++;render();});
    $('#xlsx').addEventListener('click',()=>saveFile('xlsx'));
    $('#csv').addEventListener('click',()=>saveFile('csv'));
  }
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b) go(b.dataset.p);});
$('#scope').addEventListener('change',e=>setScope(e.target.value));
function fillScope(){
  if(role!=='admin') return;
  if(scope!=='ALL'&&!NPPS.includes(scope)) scope='ALL';
  $('#scope').innerHTML=`<option value="ALL">Tất cả NPP</option>`+NPPS.map(n=>`<option value="${n}">NPP ${n}</option>`).join('');
  $('#scope').value=scope;
}
$('#month').innerHTML=ORDER.slice().reverse().map(m=>`<option value="${m}">${ml(m)}${m===CUR?' · Current':''}</option>`).join('');
$('#month').value=month;
$('#month').addEventListener('change',e=>{loadMonth(e.target.value);fillScope();EF.day='';epage=1;render();});
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2600);}
$('#theme').addEventListener('click',()=>{const r=document.documentElement;
  const dark=r.dataset.theme?r.dataset.theme!=='dark':!matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',dark);});

/* ---------------- vào ứng dụng ---------------- */
$('#foot').textContent=`RTC · Future-Fit · HEINEKEN EverGreen 2030 — Nguồn: ${DATA.meta.src} · Cập nhật ${DATA.meta.built}`;
role=LOGIN_ROLE;scope=role==='admin'?'ALL':role;
$('#who').textContent=role==='admin'?'Admin':'NPP '+role;
const sel=$('#scope');sel.hidden=role!=='admin';
fillScope();
$('#login').hidden=true;$('#app').hidden=false;
const want=(location.hash||'').slice(1);
page=PAGES.some(p=>p[0]===want)&&(want!=='dq'||role==='admin')?want:'overview';
render();
$('#logout').addEventListener('click',()=>{try{history.replaceState(null,'',location.pathname);}catch(_){}location.reload();});
}
