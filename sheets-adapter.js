/* Google Sheets client adapter. This authenticates with Google and uses the signed-in
   person's own Sheet permissions. It is for fictional-data pilot use only: a browser
   integration cannot enforce differentiated server-side roles or atomic mutations. */
(() => {
  'use strict';
  const config = window.CAP_LOGISTICS_CONFIG || {};
  const FIELDS = {
    Items: ['id','name','category','sku','location','total','condition','serial','reorderPoint','notes','trackingMode'],
    Loans: ['id','itemId','member','quantity','checkedOutAt','dueAt','returnedAt','issuedBy','returnedBy','note','grade','issueType','returnedQuantity','unitIds'],
    Orders: ['id','name','category','quantity','source','eta','status','receivedAt','notes','sku','location','itemId'],
    Activity: ['id','at','actor','action','entity','entityId','details'],
    Users: ['email','displayName','role','active'],
    Assets: ['id','itemId','serial','status','location','assignedLoanId','notes'],
    Reconciliations: ['id','at','itemId','expected','observed','difference','applied','reason','actor']
  };
  const issueType=l=>['temporary','permanent','consumed','unknown'].includes(l?.issueType)?l.issueType:(l?.dueAt?'temporary':'unknown');
  const remaining=l=>l.returnedAt?0:Math.max(0,Number(l.quantity||0)-Number(l.returnedQuantity||0));
  const reserves=l=>remaining(l)>0&&!['permanent','consumed'].includes(issueType(l));
  const finalUnit=s=>['Lost','Issued to keep','Consumed'].includes(s);
  const serviceable=s=>['Serviceable','Good',''].includes(String(s||''));
  const ids=s=>String(s||'').split('|').map(x=>x.trim()).filter(Boolean);
  const roles={admin:['read','checkout','return','write','order','receive','users','units','reconcile'],logistics:['read','checkout','return','write','order','receive','units','reconcile'],viewer:['read']};
  const states={active:false,token:null,person:null,me:null,client:null};
  let initialPromise;
  const toDate=()=>new Date().toISOString().slice(0,10);
  const uid=prefix=>prefix+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
  const text=(v,n=140)=>String(v??'').trim().slice(0,n);
  const integer=(v,label,zero=false)=>{const x=Number(v);if(!Number.isInteger(x)||x<(zero?0:1)||x>100000)throw Error(label+' must be a '+(zero?'non-negative':'positive')+' whole number.');return x};
  const sheetId=()=>{if(!/^[\w-]{20,}$/.test(config.spreadsheetId||''))throw Error('Spreadsheet ID has not been configured.');return config.spreadsheetId};
  const resource=path=>'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(sheetId())+path;
  async function request(url,options={}) {
    if(!states.token)throw Error('Your Google session has ended. Please sign in again.');
    const headers={'Authorization':'Bearer '+states.token,'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
    const r=await fetch(url,{...options,headers,cache:'no-store'});
    let data=await r.json().catch(()=>({}));
    if(!r.ok){if(r.status===401){states.token=null;states.active=false;}throw Error((data.error?.message||'Google API request failed')+' (HTTP '+r.status+').');}
    return data;
  }
  function assertSession(){if(!states.active||!states.me)throw Error('Sign in with an authorized Google account.');}
  function permit(name){assertSession();if(!(roles[states.me.role]||[]).includes(name))throw Error('Your current role cannot perform this action.');}
  function ensureApi(){if(!config.googleOAuthClientId || !/\.apps\.googleusercontent\.com$/.test(config.googleOAuthClientId))throw Error('Google OAuth client ID needs to be configured in config.js before Sheets sign-in.');if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services did not load. Check network access and reload.');}
  function connect(){
    ensureApi();
    return new Promise((resolve,reject)=>{
      const client=google.accounts.oauth2.initTokenClient({
        client_id:config.googleOAuthClientId,
        scope:'openid email profile https://www.googleapis.com/auth/spreadsheets',
        callback:async response=>{
          try{
            if(response.error||!response.access_token)throw Error(response.error_description||response.error||'Google sign-in was not completed.');
            states.token=response.access_token;
            states.person=await request('https://www.googleapis.com/oauth2/v3/userinfo');
            if(!states.person.email||states.person.email_verified===false)throw Error('Verified Google account email unavailable.');
            const data=await loadAll();
            const match=data.Users.find(u=>String(u.email).toLowerCase()===states.person.email.toLowerCase()&&String(u.active).toUpperCase()==='TRUE');
            if(!match)throw Error('Your Google account is not active in the Users sheet. Contact the sheet owner.');
            if(!roles[match.role])throw Error('Your assigned role is not recognized.');
            states.me={...match};states.active=true;
            resolve(await bootstrap());
          }catch(err){states.token=null;states.active=false;states.me=null;reject(err);}
        },error_callback:err=>reject(Error(err.message||err.type||'Google authorization was cancelled.'))
      });
      states.client=client;
      client.requestAccessToken({prompt:'select_account'});
    });
  }
  async function loadAll(){
    const ranges=Object.entries(FIELDS).map(([name,cols])=>name+'!A1:'+String.fromCharCode(64+cols.length)+'5000');
    const query=ranges.map(s=>'ranges='+encodeURIComponent(s)).join('&');
    const resp=await request(resource('/values:batchGet?valueRenderOption=FORMATTED_VALUE&'+query));
    let obj={};
    Object.entries(FIELDS).forEach(([name,fields],i)=>{
      const values=resp.valueRanges?.[i]?.values||[];
      if(fields.some((h,j)=>(values[0]||[])[j]!==h))throw Error(name+' Sheet columns are not correctly configured. Required columns: '+fields.join(', '));
      obj[name]=values.slice(1).map((row,j)=>({...Object.fromEntries(fields.map((k,kx)=>[k,row[kx]??''])),_row:j+2})).filter(a=>fields.some(h=>a[h]!==''));
    });
    return obj;
  }
  const clean=o=>Object.fromEntries(Object.entries(o).filter(([k])=>k!=='_row'));
  async function bootstrap(){
    permit('read');const d=await loadAll();
    const active=d.Loans.filter(reserves);
    const items=d.Items.map(i=>({...clean(i),available:i.trackingMode==='serialized'?d.Assets.filter(a=>a.itemId===i.id&&serviceable(a.status)&&!a.assignedLoanId).length:Number(i.total)-active.filter(l=>l.itemId===i.id).reduce((n,l)=>n+remaining(l),0)}));
    return {mode:'google-sheets-pilot',me:states.me,items,loans:d.Loans.map(clean),orders:d.Orders.map(clean),activity:d.Activity.map(clean),users:states.me.role==='admin'?d.Users.map(clean):[],assets:d.Assets.map(clean),reconciliations:d.Reconciliations.map(clean)};
  }
  async function append(tab,record){
    const values=FIELDS[tab].map(k=>record[k]??'');
    return request(resource('/values/'+encodeURIComponent(tab+'!A:'+String.fromCharCode(64+values.length))+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'),{method:'POST',body:JSON.stringify({majorDimension:'ROWS',values:[values]})});
  }
  async function replace(tab,row,record){
    const values=FIELDS[tab].map(k=>record[k]??'');
    return request(resource('/values/'+encodeURIComponent(tab+'!A'+row+':'+String.fromCharCode(64+values.length)+row)+'?valueInputOption=RAW'),{method:'PUT',body:JSON.stringify({majorDimension:'ROWS',values:[values]})});
  }
  async function audit(action,entity,entityId,details){return append('Activity',{id:uid('A'),at:new Date().toISOString(),actor:states.person.email,action,entity,entityId,details});}
  async function call(action,p={}){
    if(action==='bootstrap')return bootstrap();
    if(!states.active)throw Error('Sign in again to continue.');
    const d=await loadAll(); // fresh data before every mutation
    const item=d.Items.find(i=>i.id===p.itemId);
    const onSite=i=>i.trackingMode==='serialized'?d.Assets.filter(a=>a.itemId===i.id&&!finalUnit(a.status)&&!a.assignedLoanId).length:Math.max(0,Number(i.total)-d.Loans.filter(l=>l.itemId===i.id&&reserves(l)).reduce((sum,l)=>sum+remaining(l),0));
    const available=i=>i.trackingMode==='serialized'?d.Assets.filter(a=>a.itemId===i.id&&serviceable(a.status)&&!a.assignedLoanId).length:Number(i.total)-d.Loans.filter(l=>l.itemId===i.id&&reserves(l)).reduce((sum,l)=>sum+remaining(l),0);
    if(action==='createItem'){
      permit('write');const n=integer(p.total,'Quantity');const x={id:uid('EQ'),name:text(p.name),category:text(p.category),sku:text(p.sku,60),location:text(p.location,100),total:n,condition:text(p.condition)||'Good',serial:text(p.serial,100),reorderPoint:integer(p.reorderPoint||0,'Reorder point',true),notes:text(p.notes,400),trackingMode:'quantity'};
      if(!x.name||!x.category)throw Error('Name and category are required.');await append('Items',x);await audit('create','Item',x.id,'Added '+x.name+' ×'+n);
    }else if(action==='updateItem'){
      permit('write');const x=d.Items.find(i=>i.id===p.id);if(!x)throw Error('Item not found.');
      const total=integer(p.total,'Quantity',true);const issued=d.Loans.filter(l=>l.itemId===x.id&&reserves(l)).reduce((a,b)=>a+remaining(b),0);if(x.trackingMode==='serialized'&&total!==Number(x.total))throw Error('Use Unit Register to change tracked quantities.');if(total<issued)throw Error('Cannot reduce stock below the issued quantity.');
      Object.assign(x,{name:text(p.name),category:text(p.category),sku:text(p.sku,60),location:text(p.location,100),total,condition:text(p.condition),serial:text(p.serial,100),reorderPoint:integer(p.reorderPoint||0,'Reorder point',true),notes:text(p.notes,400)});await replace('Items',x._row,x);await audit('edit','Item',x.id,'Updated '+x.name);
    }else if(action==='enableTracking'){
      permit('units');const x=d.Items.find(i=>i.id===p.id);if(!x)throw Error('Item not found.');if(x.trackingMode==='serialized')throw Error('Already tracked.');const n=Number(x.total);if(!Number.isInteger(n)||n<1||n>250)throw Error('Tracking is limited to 1–250 units.');const units=Array.from({length:n},()=>({id:uid('UNIT'),itemId:x.id,serial:'',status:'Serviceable',location:x.location||'',assignedLoanId:'',notes:''}));let at=0;
      for(const l of d.Loans.filter(l=>l.itemId===x.id&&reserves(l))){const q=remaining(l);if(q+at>n)throw Error('Outstanding stock exceeds total.');const selected=units.slice(at,at+q);selected.forEach(u=>u.assignedLoanId=l.id);l.unitIds=selected.map(u=>u.id).join('|');await replace('Loans',l._row,l);at+=q;}
      for(const u of units)await append('Assets',u);x.trackingMode='serialized';await replace('Items',x._row,x);await audit('tracking','Item',x.id,'Created '+n+' unit ID records');
    }else if(action==='updateAsset'){
      permit('units');const a=d.Assets.find(x=>x.id===p.id);if(!a)throw Error('Unit not found.');const x=d.Items.find(i=>i.id===a.itemId);if(!x)throw Error('Catalog item missing.');const status=text(p.status,50);if(!['Serviceable','Damaged','Unserviceable','Lost'].includes(status))throw Error('Invalid unit condition.');if(a.assignedLoanId&&status!==a.status&&status!=='Lost')throw Error('Return the unit before changing its condition.');if(finalUnit(a.status)&&a.status!=='Lost')throw Error('Permanently issued unit cannot be changed.');if(a.status==='Lost'&&status!=='Lost'){x.total=Number(x.total)+1;await replace('Items',x._row,x)}
      if(a.status!=='Lost'&&status==='Lost'){x.total=Number(x.total)-1;await replace('Items',x._row,x);if(a.assignedLoanId){const l=d.Loans.find(l=>l.id===a.assignedLoanId);if(l){l.returnedQuantity=Number(l.returnedQuantity||0)+1;if(remaining(l)===0){l.returnedAt=toDate();l.returnedBy='Loss recorded';}await replace('Loans',l._row,l)}a.assignedLoanId='';}}
      Object.assign(a,{status,serial:text(p.serial,100),location:text(p.location,100),notes:text(p.notes,400)});await replace('Assets',a._row,a);await audit('condition','Unit',a.id,'Changed unit status to '+status);
    }else if(action==='checkout'){
      permit('checkout');if(!item)throw Error('Item not found.');const qty=integer(p.quantity,'Quantity');if(qty>available(item))throw Error('Not enough available stock.');const member=text(p.member),grade=text(p.grade,32),type=['temporary','permanent','consumed','unknown'].includes(p.issueType)?p.issueType:'unknown';if(!member&&type!=='consumed')throw Error('Member last name required unless consumed.');const due=type==='temporary'?text(p.dueAt,10):'';if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))throw Error('Invalid due date.');
      const selected=ids(p.unitIds);let units=[];if(item.trackingMode==='serialized'){if(selected.length!==qty||new Set(selected).size!==qty)throw Error('Choose '+qty+' unique unit IDs.');units=selected.map(id=>d.Assets.find(a=>a.id===id&&a.itemId===item.id));if(units.some(a=>!a||!serviceable(a.status)||a.assignedLoanId))throw Error('Unit unavailable.');}
      const x={id:uid('LN'),itemId:item.id,member,grade,issueType:type,quantity:qty,returnedQuantity:0,unitIds:selected.join('|'),checkedOutAt:toDate(),dueAt:due,returnedAt:'',issuedBy:states.person.email,returnedBy:'',note:text(p.notes||p.note,400)};
      if(type==='permanent'||type==='consumed'){item.total=Number(item.total)-qty;await replace('Items',item._row,item);}
      await append('Loans',x);for(const a of units){if(type==='permanent'||type==='consumed')a.status=type==='permanent'?'Issued to keep':'Consumed';else a.assignedLoanId=x.id;await replace('Assets',a._row,a)}await audit('checkout','Loan',x.id,type+' issue: '+item.name+' ×'+qty+(selected.length?' ['+selected.join(', ')+']':''));
    }else if(action==='returnLoan'){
      permit('return');const l=d.Loans.find(x=>x.id===p.id&&reserves(x));if(!l)throw Error('No outstanding stock.');const x=d.Items.find(i=>i.id===l.itemId);if(!x)throw Error('Catalog item missing.');const qty=integer(p.quantity||remaining(l),'Return quantity');if(qty>remaining(l))throw Error('Return exceeds remaining quantity.');const selected=ids(p.unitIds);
      if(x.trackingMode==='serialized'){if(selected.length!==qty||new Set(selected).size!==qty)throw Error('Select '+qty+' assigned unit IDs.');const units=selected.map(id=>d.Assets.find(a=>a.id===id&&a.assignedLoanId===l.id));if(units.some(a=>!a))throw Error('Unit is not assigned to this checkout.');for(const a of units){a.assignedLoanId='';await replace('Assets',a._row,a);}}
      l.returnedQuantity=Number(l.returnedQuantity||0)+qty;l.returnedBy=states.person.email;if(!remaining(l))l.returnedAt=toDate();await replace('Loans',l._row,l);await audit('return','Loan',l.id,'Returned '+qty+' unit(s); '+remaining(l)+' still outstanding');
    }else if(action==='reconcile'){
      permit('reconcile');const x=d.Items.find(i=>i.id===p.itemId);if(!x)throw Error('Item not found.');const observed=integer(p.observed,'Physical count',true),expected=onSite(x),difference=observed-expected;const reason=text(p.reason);if(!reason)throw Error('Count reason is required.');const applied=x.trackingMode!=='serialized'&&p.apply!=='no';if(applied){x.total=Number(x.total)+difference;if(x.total<0)throw Error('Adjustment would make total negative.');await replace('Items',x._row,x);}
      await append('Reconciliations',{id:uid('RC'),at:new Date().toISOString(),itemId:x.id,expected,observed,difference,applied:applied?'TRUE':'FALSE',reason,actor:states.person.email});await audit('reconcile','Item',x.id,'Physical count '+observed+' expected '+expected+' difference '+difference+(applied?' (adjusted)':' (review only)'));
    }else if(action==='createOrder'){
      permit('order');const x={id:uid('PO'),name:text(p.name),category:text(p.category),quantity:integer(p.quantity,'Quantity'),source:text(p.source,120),eta:text(p.eta,10),status:'Ordered',receivedAt:'',notes:text(p.notes,400),sku:text(p.sku,80),location:text(p.location,100),itemId:text(p.itemId,80)};
      if(!x.name||!x.category)throw Error('Name and category are required.');await append('Orders',x);await audit('order','Order',x.id,'Ordered '+x.name+' ×'+x.quantity);
    }else if(action==='markInTransit'){
      permit('order');const o=d.Orders.find(x=>x.id===p.id&&x.status==='Ordered');if(!o)throw Error('Order not in Ordered status.');o.status='In Transit';await replace('Orders',o._row,o);await audit('order','Order',o.id,'Marked in transit');
    }else if(action==='receiveOrder'){
      permit('receive');const o=d.Orders.find(x=>x.id===p.id&&x.status!=='Received');if(!o)throw Error('Order already received or missing.');
      const x=d.Items.find(i=>i.id===o.itemId)||(o.sku?d.Items.find(i=>i.sku===o.sku):null);
      if(x){x.total=Number(x.total)+Number(o.quantity);await replace('Items',x._row,x);if(x.trackingMode==='serialized')for(let n=0;n<Number(o.quantity);n++)await append('Assets',{id:uid('UNIT'),itemId:x.id,serial:'',status:'Serviceable',location:x.location||'',assignedLoanId:'',notes:''})}else{await append('Items',{id:uid('EQ'),name:o.name,category:o.category,sku:o.sku,location:o.location||'Unassigned',total:o.quantity,condition:'New',serial:'',reorderPoint:0,notes:'Received from '+o.id})}
      o.status='Received';o.receivedAt=toDate();await replace('Orders',o._row,o);await audit('receive','Order',o.id,'Received '+o.name+' ×'+o.quantity);
    }else if(action==='setUser'){
      permit('users');const email=text(p.email,140).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Valid email required.');if(!roles[p.role])throw Error('Invalid role.');if(email===states.person.email.toLowerCase()&&(p.role!=='admin'||p.active==='FALSE'))throw Error('Cannot deactivate yourself.');
      const existing=d.Users.find(u=>u.email.toLowerCase()===email);const u={email,displayName:text(p.displayName,100),role:p.role,active:p.active==='FALSE'?'FALSE':'TRUE'};
      if(existing)await replace('Users',existing._row,u);else await append('Users',u);
      await audit('edit','User',email,'Changed user list: '+email);
    }else throw Error('Unsupported request: '+action);
    return bootstrap();
  }
  function disconnect(){states.active=false;states.token=null;states.me=null;states.person=null;}
  window.SquadronSheets={connect,call,disconnect,get active(){return states.active;},get configured(){return !!config.googleOAuthClientId;},get account(){return states.person?.email||'';},get spreadsheetId(){return config.spreadsheetId||'';}};
})();
