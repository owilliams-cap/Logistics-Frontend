(function installer() {
 'use strict';
 const GROUPS=[
  {id:'cadetEnlisted',name:'Cadet Enlisted',note:'Airman and NCO grades',icon:'shield',test:g=>g.group==='cadet'&&g.tier!=='Officer'},
  {id:'cadetOfficer',name:'Cadet Officers',note:'Cadet officer grades',icon:'package',test:g=>g.group==='cadet'&&g.tier==='Officer'},
  {id:'seniorOfficer',name:'Senior Officers',note:'Senior member officer grades',icon:'users',test:g=>g.group==='seniorOfficer'},
  {id:'seniorNco',name:'Senior NCOs',note:'Senior member NCO grades',icon:'clipboard',test:g=>g.group==='seniorNco'},
  {id:'flight',name:'Flight Officers',note:'Flight officer grades',icon:'package',test:g=>g.group==='flight'}
 ];
 const classify=(g,items,available)=>{
  if(!g.sku)return 'none';
  if(!items.length)return 'missing';
  const qty=items.reduce((n,i)=>n+Math.max(0,available(i)),0);
  if(!qty)return 'missing';
  if(items.some(i=>available(i)>0&&available(i)<=Number(i.reorderPoint||0)))return 'low';
  return 'stocked';
 };
 const statusNames={stocked:'In stock',low:'Low stock',missing:'Not stocked',none:'No grade insignia'};
 function render({data,grades,gradeStockItems,available,allowed,esc,ico,shelf}){
  const selected=GROUPS.find(g=>g.id===shelf.group)||GROUPS[0];
  const query=String(shelf.query||'').trim().toLocaleLowerCase();
  const all=grades.map(g=>{const items=gradeStockItems(data,g);return {g,items,status:classify(g,items,available),qty:items.reduce((n,i)=>n+Math.max(0,available(i)),0)}});
  const groupItems=all.filter(r=>selected.test(r.g));
  const matched=(query?all:groupItems).filter(r=>(!query||[r.g.name,r.g.code,r.g.form,r.g.tier,...r.items.map(i=>i.name+' '+i.sku)].join(' ').toLowerCase().includes(query))&&(shelf.stock==='all'||r.status===shelf.stock));
  const count=k=>groupItems.filter(r=>r.status===k).length;
  const filters=[['all','All',groupItems.length],['stocked','In stock',count('stocked')],['low','Low stock',count('low')],['missing','Not stocked',count('missing')]];
  const nav=GROUPS.map(g=>{
   const v=all.filter(r=>g.test(r.g)),stocked=v.filter(r=>r.qty>0).length;
   return `<button type="button" data-shelf-group="${g.id}" class="shelf-group ${selected.id===g.id?'selected':''}" aria-pressed="${selected.id===g.id}"><span class="shelf-group-icon">${ico(g.icon,20)}</span><span class="shelf-group-body"><strong>${g.name}</strong><small>${g.note}</small></span><span class="shelf-group-count">${stocked}/${v.length}</span>${ico('chevron',14)}</button>`;
  }).join('');
  const cards=matched.map(({g,items,status,qty})=>{
   const ready=items.filter(i=>available(i)>0),first=ready[0],code=esc(g.code);
   const line=!g.sku?'No grade insignia':qty?`${qty} ready`:items.length?'Currently out of stock':'Not in inventory';
   const action=!g.sku?'':first&&allowed('checkout')?`<button type="button" class="shelf-issue" data-action="insigniaIssue" data-id="${esc(first.id)}">Issue ${ico('arrow',15)}</button>`:allowed('write')?`<button type="button" class="shelf-register" data-action="insigniaAdd" data-grade="${code}">${ico('plus',15)} ${items.length?'Update stock':'Register stock'}</button>`:'';
   const variants=ready.length>1?`<div class="shelf-variants">${ready.map(i=>`<button type="button" data-action="insigniaIssue" data-id="${esc(i.id)}">${esc(i.name)} <span>${available(i)} ready ${ico('arrow',12)}</span></button>`).join('')}</div>`:'';
   return `<article class="shelf-card"><span class="shelf-status shelf-${status}">${statusNames[status]}</span><div class="shelf-grade-mark" aria-label="Grade identifier ${code}"><span>${code}</span>${ico('shield',20)}</div><div class="shelf-card-copy"><small>${code} · ${esc(g.tier)}</small><h3>${esc(g.name)}</h3><p>${line}</p></div>${variants}${action}</article>`;
  }).join('')||`<div class="shelf-no-results">${ico('search',27)}<h3>No matching grades</h3><p>Try another search or stock status.</p><button type="button" data-shelf-stock="all">Show all statuses</button></div>`;
  return `<div class="insignia-shelf">
   <header class="shelf-header"><div><span class="shelf-kicker">UNIFORM SUPPLY / GRADE DIRECTORY</span><h1>Insignia Shelf</h1><p>Find a grade, check physical stock, and issue the correct item without searching a long register.</p></div><label class="shelf-search">${ico('search',18)}<input type="search" data-shelf-search aria-label="Search grades and insignia" placeholder="Search grade, code or variant…" autocomplete="off" value="${esc(shelf.query||'')}"></label></header>
   <div class="shelf-workspace"><aside class="shelf-groups"><div class="shelf-overline">INSIGNIA GROUPS <span>${GROUPS.length} groups</span></div><div class="shelf-groups-nav">${nav}</div><div class="shelf-note">${ico('info',17)} Grade references are not stock records. Icons are placeholders, not official insignia artwork.</div></aside>
   <section class="shelf-catalog"><div class="shelf-catalog-head"><div><span class="shelf-kicker">${query?'SEARCH RESULTS':esc(selected.name).toUpperCase()}</span><h2>${query?'Matching insignia':esc(selected.name)+' insignia'}</h2><small>${matched.length} displayed</small></div><div class="shelf-view-controls" role="group" aria-label="Catalog layout"><button type="button" data-shelf-view="grid" class="${shelf.view==='grid'?'selected':''}" aria-pressed="${shelf.view==='grid'}" title="Grid view">${ico('grid',17)}</button><button type="button" data-shelf-view="list" class="${shelf.view==='list'?'selected':''}" aria-pressed="${shelf.view==='list'}" title="List view">${ico('clipboard',17)}</button></div></div>
   <div class="shelf-filters" aria-label="Stock status">${filters.map(([key,label,n])=>`<button type="button" class="${shelf.stock===key?'selected':''}" data-shelf-stock="${key}" aria-pressed="${shelf.stock===key}"><span class="shelf-filter-dot dot-${key}"></span>${label} <span>${n}</span></button>`).join('')}</div><div class="shelf-cards ${shelf.view==='list'?'shelf-cards-list':''}">${cards}</div></section></div>
   <div class="shelf-actions"><div><span>SUPPLY ACTIONS</span><p>Common tasks for insignia and uniform supply.</p></div><button type="button" data-nav="inventory">${ico('package',23)}<span><b>Stock</b><small>Find or register inventory</small></span>${ico('arrow',15)}</button><button type="button" data-nav="checkouts">${ico('clipboard',23)}<span><b>Assignments</b><small>Review members and returns</small></span>${ico('arrow',15)}</button><button type="button" data-action="checkout">${ico('shield',23)}<span><b>Issuance</b><small>Record a new issue</small></span>${ico('arrow',15)}</button></div></div>`;
 }
 window.SquadronInsigniaShelf=Object.freeze({render});
})();