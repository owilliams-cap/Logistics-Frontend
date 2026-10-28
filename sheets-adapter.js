/* Google Sheets client adapter. This authenticates with Google and uses the signed-in
   person's own Sheet permissions. It is for fictional-data pilot use only: a browser
   integration cannot enforce differentiated server-side roles or atomic mutations. */
(() => {
  'use strict';
  const config = window.CAP_LOGISTICS_CONFIG || {};
  const FIELDS = {
    Items: ['id','name','category','sku','location','total','condition','serial','reorderPoint','notes'],
    Loans: ['id','itemId','member','quantity','checkedOutAt','dueAt','returnedAt','issuedBy','returnedBy','note','grade','issueType'],
    Orders: ['id','name','category','quantity','source','eta','status','receivedAt','notes','sku','location','itemId'],
    Activity: ['id','at','actor','action','entity','entityId','details'],
    Users: ['email','displayName','role','active']
  };
  const issueType=l=>['temporary','permanent','unknown'].includes(l?.issueType)?l.issueType:(l?.dueAt?'temporary':'unknown');
  const reserves=l=>!l.returnedAt&&issueType(l)!=='permanent';
  const roles={admin:['read','checkout','return','write','order','receive','users'],logistics:['read','checkout','return','write','order','receive'],viewer:['read']};
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
    const items=d.Items.map(i=>({...clean(i),available:Number(i.total)-active.filter(l=>l.itemId===i.id).reduce((s,l)=>s+Number(l.quantity),0)}));
    return {mode:'google-sheets-pilot',me:states.me,items,loans:d.Loans.map(clean),orders:d.Orders.map(clean),activity:d.Activity.map(clean),users:states.me.role==='admin'?d.Users.map(clean):[]};
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
    if(action==='createItem'){
      permit('write');const n=integer(p.total,'Quantity');const x={id:uid('EQ'),name:text(p.name),category:text(p.category),sku:text(p.sku,60),location:text(p.location,100),total:n,condition:text(p.condition)||'Good',serial:text(p.serial,100),reorderPoint:integer(p.reorderPoint||0,'Reorder point',true),notes:text(p.notes,400)};
      if(!x.name||!x.category)throw Error('Name and category are required.');await append('Items',x);await audit('create','Item',x.id,'Added '+x.name+' ×'+n);
    }else if(action==='updateItem'){
      permit('write');const x=d.Items.find(i=>i.id===p.id);if(!x)throw Error('Item not found.');
      const total=integer(p.total,'Quantity');const issued=d.Loans.filter(l=>l.itemId===x.id&&reserves(l)).reduce((a,b)=>a+Number(b.quantity),0);if(total<issued)throw Error('Cannot reduce stock below the issued quantity.');
      Object.assign(x,{name:text(p.name),category:text(p.category),sku:text(p.sku,60),location:text(p.location,100),total,condition:text(p.condition),serial:text(p.serial,100),reorderPoint:integer(p.reorderPoint||0,'Reorder point',true),notes:text(p.notes,400)});await replace('Items',x._row,x);await audit('edit','Item',x.id,'Updated '+x.name);
    }else if(action==='checkout'){
      permit('checkout');if(!item)throw Error('Item not found.');const qty=integer(p.quantity,'Quantity');
      const taken=d.Loans.filter(l=>l.itemId===item.id&&reserves(l)).reduce((a,b)=>a+Number(b.quantity),0);
      if(qty>Number(item.total)-taken)throw Error('Not enough available stock.');
      const member=text(p.member),grade=text(p.grade,32),type=['temporary','permanent','unknown'].includes(p.issueType)?p.issueType:'unknown';
      if(!member)throw Error('Member last name is required.');const due=type==='temporary'?text(p.dueAt,10):'';
      if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))throw Error('Invalid due date.');
      const x={id:uid('LN'),itemId:item.id,member,grade,issueType:type,quantity:qty,checkedOutAt:toDate(),dueAt:due,returnedAt:'',issuedBy:states.person.email,returnedBy:'',note:text(p.notes||p.note,400)};
      if(type==='permanent'){item.total=Number(item.total)-qty;await replace('Items',item._row,item);}
      await append('Loans',x);await audit('checkout','Loan',x.id,type+' issue: '+item.name+' ×'+qty+' to '+(grade?grade+' ':'')+member);
    }else if(action==='returnLoan'){
      permit('return');const l=d.Loans.find(x=>x.id===p.id&&!x.returnedAt);if(!l)throw Error('Loan already returned or missing.');if(issueType(l)==='permanent')throw Error('Permanent issues cannot be returned; use an inventory adjustment for recovered stock.');l.returnedAt=toDate();l.returnedBy=states.person.email;await replace('Loans',l._row,l);await audit('return','Loan',l.id,'Returned '+l.quantity+' units from '+l.member);
    }else if(action==='createOrder'){
      permit('order');const x={id:uid('PO'),name:text(p.name),category:text(p.category),quantity:integer(p.quantity,'Quantity'),source:text(p.source,120),eta:text(p.eta,10),status:'Ordered',receivedAt:'',notes:text(p.notes,400),sku:text(p.sku,80),location:text(p.location,100),itemId:text(p.itemId,80)};
      if(!x.name||!x.category)throw Error('Name and category are required.');await append('Orders',x);await audit('order','Order',x.id,'Ordered '+x.name+' ×'+x.quantity);
    }else if(action==='markInTransit'){
      permit('order');const o=d.Orders.find(x=>x.id===p.id&&x.status==='Ordered');if(!o)throw Error('Order not in Ordered status.');o.status='In Transit';await replace('Orders',o._row,o);await audit('order','Order',o.id,'Marked in transit');
    }else if(action==='receiveOrder'){
      permit('receive');const o=d.Orders.find(x=>x.id===p.id&&x.status!=='Received');if(!o)throw Error('Order already received or missing.');
      const x=d.Items.find(i=>i.id===o.itemId)||(o.sku?d.Items.find(i=>i.sku===o.sku):null);
      if(x){x.total=Number(x.total)+Number(o.quantity);await replace('Items',x._row,x)}else{await append('Items',{id:uid('EQ'),name:o.name,category:o.category,sku:o.sku,location:o.location||'Unassigned',total:o.quantity,condition:'New',serial:'',reorderPoint:0,notes:'Received from '+o.id})}
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