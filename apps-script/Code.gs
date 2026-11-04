/**
 * Squadron Logistics | Google Apps Script backend
 * Install as a BOUND script: open the imported spreadsheet > Extensions > Apps Script.
 * Paste Code.gs, Index.html, Styles.html, Client.html, then run setupAdmin() ONCE.
 * For live deployment, CAP IT must approve this configuration and verify the Google
 * Workspace identity and data residency. No external tokens or shared passwords.
 *
 * IMPORTANT: We DENY access if Session.getActiveUser().getEmail() is unavailable.
 * It is NOT reliably available on all personal-Gmail / execute-as-owner web apps.
 */
const TAB_FIELDS = Object.freeze({
  Items:['id','name','category','sku','location','total','condition','serial','reorderPoint','notes','trackingMode'],
  Loans:['id','itemId','member','quantity','checkedOutAt','dueAt','returnedAt','issuedBy','returnedBy','note','grade','issueType','returnedQuantity','unitIds'],
  Orders:['id','name','category','quantity','source','eta','status','receivedAt','notes','sku','location','itemId'],
  Activity:['id','at','actor','action','entity','entityId','details'],
  Users:['email','displayName','role','active'],
  Assets:['id','itemId','serial','status','location','assignedLoanId','notes'],
  Reconciliations:['id','at','itemId','expected','observed','difference','applied','reason','actor']
});
const PERMS = Object.freeze({admin:['read','checkout','return','write','order','receive','users','units','reconcile'],logistics:['read','checkout','return','write','order','receive','units','reconcile'],viewer:['read']});
function doGet(){
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Squadron Logistics · Operations');
}
function include(filename){return HtmlService.createHtmlOutputFromFile(filename).getContent();}
function workbook_(){const s=SpreadsheetApp.getActiveSpreadsheet();if(!s)throw new Error('This Apps Script project must be bound to the logistics spreadsheet.');return s;}
function sheet_(name){const s=workbook_().getSheetByName(name);if(!s)throw new Error('Missing '+name+' sheet. Import the provided workbook before setup.');return s;}
function safeCell_(value){let s=String(value==null?'':value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return s;}
function rowData_(name){const s=sheet_(name);const vals=s.getDataRange().getDisplayValues();const headers=TAB_FIELDS[name];if(!vals.length||headers.some((x,i)=>vals[0][i]!==x))throw new Error(name+' headers do not match the application schema.');return vals.slice(1).map((row,i)=>({row,sourceRow:i+2})).filter(x=>x.row.some(v=>v!=='')).map(({row,sourceRow})=>{const obj={};headers.forEach((k,n)=>obj[k]=row[n]??'');obj._row=sourceRow;return obj;});}
function strip_(value){const out={};Object.keys(value).filter(k=>k!=='_row').forEach(k=>out[k]=value[k]);return out;}
function append_(name,obj){const keys=TAB_FIELDS[name];sheet_(name).appendRow(keys.map(k=>safeCell_(obj[k])));}
function replace_(name,obj){if(!obj._row)throw new Error('Cannot update a row without its source index.');sheet_(name).getRange(obj._row,1,1,TAB_FIELDS[name].length).setValues([TAB_FIELDS[name].map(k=>safeCell_(obj[k]))]);}
function required_(value,label,max=140){const s=String(value??'').trim();if(!s||s.length>max)throw new Error(label+' is required (max '+max+' characters).');return s;}
function optional_(value,max=400){return String(value??'').trim().slice(0,max);}
function amount_(value,label){const n=Number(value);if(!Number.isInteger(n)||n<1||n>100000)throw new Error(label+' must be a positive integer.');return n;}
function threshold_(value){const n=Number(value);if(!Number.isInteger(n)||n<0||n>100000)throw new Error('Threshold must be a non-negative integer.');return n;}
function date_(v){const s=optional_(v,10);if(s&&!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Invalid ISO date.');return s;}
function today_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Denver','yyyy-MM-dd');}
function now_(){return new Date().toISOString();}
function id_(prefix){return prefix+'-'+Utilities.getUuid().slice(0,8).toUpperCase();}
function email_(){return String(Session.getActiveUser().getEmail()||'').toLowerCase().trim();}
function identity_(){
  const email=email_();
  if(!email)throw new Error('Google did not expose a verifiable signed-in email. Access denied. Deploy under an approved Workspace configuration that supports identity, or use demo mode.');
  const users=rowData_('Users');
  const user=users.find(u=>u.email.toLowerCase()===email&&String(u.active).toUpperCase()==='TRUE');
  if(!user)throw new Error('This Google account has not been authorized for the logistics application.');
  if(!PERMS[user.role])throw new Error('Unrecognized permission role.');
  return strip_(user);
}
function authorize_(user,perm){if(!PERMS[user.role].includes(perm))throw new Error('You do not have permission to perform this action.');}
function log_(user,action,entity,entityId,details){append_('Activity',{id:id_('A'),at:now_(),actor:user.displayName||user.email,action,entity,entityId,details});}
function issueType_(l){return ['temporary','permanent','consumed','unknown'].indexOf(l.issueType)>-1?l.issueType:(l.dueAt?'temporary':'unknown');}
function remaining_(l){return l.returnedAt?0:Math.max(0,Number(l.quantity||0)-Number(l.returnedQuantity||0));}
function reserves_(l){return remaining_(l)>0&&['permanent','consumed'].indexOf(issueType_(l))===-1;}
function finalUnit_(s){return ['Lost','Issued to keep','Consumed'].includes(String(s));}
function serviceable_(s){return !s||s==='Serviceable'||s==='Good';}
function idList_(s){return String(s||'').split('|').filter(Boolean);}
function onsite_(item,loans,assets){return item.trackingMode==='serialized'?assets.filter(a=>a.itemId===item.id&&!finalUnit_(a.status)&&!a.assignedLoanId).length:Math.max(0,Number(item.total)-loans.filter(l=>l.itemId===item.id&&reserves_(l)).reduce((n,l)=>n+remaining_(l),0));}
function available_(item,loans,assets){return item.trackingMode==='serialized'?assets.filter(a=>a.itemId===item.id&&serviceable_(a.status)&&!a.assignedLoanId).length:Math.max(0,Number(item.total)-loans.filter(l=>l.itemId===item.id&&reserves_(l)).reduce((n,l)=>n+remaining_(l),0));}
function inventory_(){const items=rowData_('Items'),loans=rowData_('Loans'),assets=rowData_('Assets');return items.map(i=>({...strip_(i),available:available_(i,loans,assets)}));}
function bootstrap_(user){
  authorize_(user,'read');
  return {me:user,mode:'apps-script',items:inventory_(),loans:rowData_('Loans').map(strip_),orders:rowData_('Orders').map(strip_),activity:rowData_('Activity').map(strip_),users:user.role==='admin'?rowData_('Users').map(strip_):[],assets:rowData_('Assets').map(strip_),reconciliations:rowData_('Reconciliations').map(strip_)};
}
function mutate_(action,p,user){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const items=rowData_('Items');const loans=rowData_('Loans');const assets=rowData_('Assets');
  if(action==='createItem'){
   authorize_(user,'write');const id=id_('EQ');const n=amount_(p.total,'Quantity');const obj={id,name:required_(p.name,'Item name'),category:required_(p.category,'Category'),sku:optional_(p.sku,60),location:optional_(p.location,100),total:n,condition:optional_(p.condition,60)||'Good',serial:optional_(p.serial,100),reorderPoint:threshold_(p.reorderPoint||0),notes:optional_(p.notes),trackingMode:'quantity'};
   append_('Items',obj);log_(user,'create','Item',id,'Created '+obj.name+' x'+n);
  }else if(action==='updateItem'){
   authorize_(user,'write');const i=items.find(x=>x.id===p.id);if(!i)throw new Error('Item not found.');const n=Number(p.total);if(!Number.isInteger(n)||n<0||n>100000)throw new Error('Quantity must be a non-negative integer.');const allocated=loans.filter(l=>l.itemId===i.id&&reserves_(l)).reduce((sum,l)=>sum+remaining_(l),0);if(i.trackingMode==='serialized'&&n!==Number(i.total))throw new Error('Change tracked quantity using Unit Register.');if(n<allocated)throw new Error('Cannot set total below currently issued quantity ('+allocated+').');Object.assign(i,{name:required_(p.name,'Item name'),category:required_(p.category,'Category'),sku:optional_(p.sku,60),location:optional_(p.location,100),total:n,condition:optional_(p.condition,60),serial:optional_(p.serial,100),reorderPoint:threshold_(p.reorderPoint||0),notes:optional_(p.notes)});replace_('Items',i);log_(user,'edit','Item',i.id,'Updated '+i.name);
  }else if(action==='enableTracking'){
   authorize_(user,'units');const i=items.find(x=>x.id===p.id);if(!i||i.trackingMode==='serialized')throw new Error('Item missing or already tracked.');const n=Number(i.total);if(!Number.isInteger(n)||n<1||n>250)throw new Error('Tracking supports 1–250 units.');const units=Array.from({length:n},()=>({id:id_('UNIT'),itemId:i.id,serial:'',status:'Serviceable',location:i.location,assignedLoanId:'',notes:''}));let at=0;
   loans.filter(l=>l.itemId===i.id&&reserves_(l)).forEach(l=>{const q=remaining_(l);if(at+q>n)throw new Error('Outstanding units exceed stock.');const selected=units.slice(at,at+q);selected.forEach(a=>a.assignedLoanId=l.id);l.unitIds=selected.map(a=>a.id).join('|');replace_('Loans',l);at+=q});units.forEach(a=>append_('Assets',a));i.trackingMode='serialized';replace_('Items',i);log_(user,'tracking','Item',i.id,'Created '+n+' unit records');
  }else if(action==='updateAsset'){
   authorize_(user,'units');const a=assets.find(x=>x.id===p.id),i=items.find(x=>x.id===a?.itemId);if(!a||!i)throw new Error('Unit or catalog item not found.');const status=optional_(p.status,50);if(['Serviceable','Damaged','Unserviceable','Lost'].indexOf(status)<0)throw new Error('Invalid unit status.');if(a.assignedLoanId&&status!==a.status&&status!=='Lost')throw new Error('Return the unit before changing condition.');if(finalUnit_(a.status)&&a.status!=='Lost')throw new Error('Issued-to-keep and consumed units cannot be changed.');
   if(a.status==='Lost'&&status!=='Lost'){i.total=Number(i.total)+1;replace_('Items',i);}if(a.status!=='Lost'&&status==='Lost'){i.total=Number(i.total)-1;replace_('Items',i);if(a.assignedLoanId){const l=loans.find(x=>x.id===a.assignedLoanId);if(l){l.returnedQuantity=Number(l.returnedQuantity||0)+1;if(!remaining_(l)){l.returnedAt=today_();l.returnedBy='Loss recorded';}replace_('Loans',l);}a.assignedLoanId='';}}
   Object.assign(a,{status,serial:optional_(p.serial,100),location:optional_(p.location,100),notes:optional_(p.notes,400)});replace_('Assets',a);log_(user,'condition','Unit',a.id,'Updated condition: '+status);
  }else if(action==='checkout'){
   authorize_(user,'checkout');const i=items.find(x=>x.id===p.itemId);if(!i)throw new Error('Item missing.');const qty=amount_(p.quantity,'Issue quantity');if(qty>available_(i,loans,assets))throw new Error('Not enough available stock.');const type=['temporary','permanent','consumed','unknown'].indexOf(p.issueType)>-1?p.issueType:'unknown',member=type==='consumed'?optional_(p.member,140):required_(p.member,'Member last name'),due=type==='temporary'?date_(p.dueAt):'';
   const ids=idList_(p.unitIds);let selected=[];if(i.trackingMode==='serialized'){if(ids.length!==qty||new Set(ids).size!==qty)throw new Error('Select exactly '+qty+' unique unit IDs.');selected=ids.map(id=>assets.find(a=>a.id===id&&a.itemId===i.id));if(selected.some(a=>!a||!serviceable_(a.status)||a.assignedLoanId))throw new Error('Selected unit not available.');}
   const id=id_('LN');if(type==='permanent'||type==='consumed'){i.total=Number(i.total)-qty;replace_('Items',i);}
   append_('Loans',{id,itemId:i.id,member,quantity:qty,returnedQuantity:0,unitIds:ids.join('|'),checkedOutAt:today_(),dueAt:due,returnedAt:'',issuedBy:user.displayName||user.email,returnedBy:'',note:optional_(p.notes||p.note),grade:optional_(p.grade,32),issueType:type});
   selected.forEach(a=>{if(type==='permanent'||type==='consumed')a.status=type==='permanent'?'Issued to keep':'Consumed';else a.assignedLoanId=id;replace_('Assets',a);});log_(user,'checkout','Loan',id,type+' issue: '+i.name+' x'+qty+(ids.length?' ['+ids.join(', ')+']':''));
  }else if(action==='returnLoan'){
   authorize_(user,'return');const l=loans.find(x=>x.id===p.id&&reserves_(x));if(!l)throw new Error('No outstanding loan quantity.');const i=items.find(x=>x.id===l.itemId);if(!i)throw new Error('Item missing.');const qty=amount_(p.quantity||remaining_(l),'Return quantity');if(qty>remaining_(l))throw new Error('Cannot return more than outstanding quantity.');const ids=idList_(p.unitIds);
   if(i.trackingMode==='serialized'){if(ids.length!==qty||new Set(ids).size!==qty)throw new Error('Select exactly '+qty+' assigned unit IDs.');const selected=ids.map(id=>assets.find(a=>a.id===id&&a.assignedLoanId===l.id));if(selected.some(a=>!a))throw new Error('Invalid unit selection.');selected.forEach(a=>{a.assignedLoanId='';replace_('Assets',a);});}
   l.returnedQuantity=Number(l.returnedQuantity||0)+qty;l.returnedBy=user.displayName||user.email;if(!remaining_(l))l.returnedAt=today_();replace_('Loans',l);log_(user,'return','Loan',l.id,'Received '+qty+' unit(s); '+remaining_(l)+' outstanding');
  }else if(action==='reconcile'){
   authorize_(user,'reconcile');const i=items.find(x=>x.id===p.itemId);if(!i)throw new Error('Item missing.');const observed=threshold_(p.observed),expected=onsite_(i,loans,assets),difference=observed-expected,reason=required_(p.reason,'Count explanation');const applied=i.trackingMode!=='serialized'&&p.apply!=='no';if(applied){i.total=Number(i.total)+difference;if(i.total<0)throw new Error('Invalid adjustment.');replace_('Items',i);}
   append_('Reconciliations',{id:id_('RC'),at:now_(),itemId:i.id,expected,observed,difference,applied:applied?'TRUE':'FALSE',reason,actor:user.displayName||user.email});log_(user,'reconcile','Item',i.id,'Count '+observed+', expected '+expected+', difference '+difference+(applied?' applied':' review only'));
  }else if(action==='createOrder'){
   authorize_(user,'order');const id=id_('PO');const o={id,name:required_(p.name,'Item description'),category:required_(p.category,'Category'),quantity:amount_(p.quantity,'Quantity'),source:optional_(p.source,120),eta:date_(p.eta),status:'Ordered',receivedAt:'',notes:optional_(p.notes),sku:optional_(p.sku,80),location:optional_(p.location,100),itemId:optional_(p.itemId,60)};append_('Orders',o);log_(user,'order','Order',id,'Ordered '+o.name+' x'+o.quantity);
  }else if(action==='markInTransit'){
   authorize_(user,'order');const o=rowData_('Orders').find(x=>x.id===p.id);if(!o||o.status!=='Ordered')throw new Error('Order is not in Ordered state.');o.status='In Transit';replace_('Orders',o);log_(user,'order','Order',o.id,'Marked '+o.name+' as in transit');
  }else if(action==='receiveOrder'){
   authorize_(user,'receive');const o=rowData_('Orders').find(x=>x.id===p.id);if(!o||o.status==='Received')throw new Error('Order already received or missing.');let i=items.find(x=>x.id===o.itemId)||(o.sku?items.find(x=>x.sku===o.sku):null);if(i){i.total=Number(i.total)+Number(o.quantity);replace_('Items',i);if(i.trackingMode==='serialized')for(let n=0;n<Number(o.quantity);n++)append_('Assets',{id:id_('UNIT'),itemId:i.id,serial:'',status:'Serviceable',location:i.location,assignedLoanId:'',notes:''});}else{i={id:id_('EQ'),name:o.name,category:o.category,sku:o.sku,location:o.location||'Unassigned',total:Number(o.quantity),condition:'New',serial:'',reorderPoint:0,notes:'Created from '+o.id};append_('Items',i);}o.status='Received';o.receivedAt=today_();replace_('Orders',o);log_(user,'receive','Order',o.id,'Received '+o.name+' x'+o.quantity+' into '+i.id);
  }else if(action==='setUser'){
   authorize_(user,'users');const email=required_(p.email,'Email').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email.');if(!PERMS[p.role])throw new Error('Invalid role.');const active=p.active==='FALSE'?'FALSE':'TRUE';if(email===user.email&&(active==='FALSE'||p.role!=='admin'))throw new Error('Do not remove your own administrative access.');const u=rowData_('Users').find(x=>x.email.toLowerCase()===email);const obj={email,displayName:optional_(p.displayName,100),role:p.role,active};if(u){Object.assign(u,obj);replace_('Users',u)}else append_('Users',obj);log_(user,'edit','User',email,'Updated access for '+email);
  }else throw new Error('Unsupported operation.');
  return bootstrap_(user);
 }finally{lock.releaseLock()}
}
/** Single public RPC endpoint. All operations re-check Google identity server-side. */
function api(action,payload){
 try{
  const user=identity_();
  const permitted=['bootstrap','createItem','updateItem','checkout','returnLoan','enableTracking','updateAsset','reconcile','createOrder','markInTransit','receiveOrder','setUser'];
  if(!permitted.includes(action))throw new Error('Unsupported action.');
  const data=action==='bootstrap'?bootstrap_(user):mutate_(action,payload||{},user);
  return {ok:true,data};
 }catch(err){return {ok:false,error:String(err&&err.message||err)}}
}
/** Run only from Apps Script editor after uploading workbook. Never expose as RPC. */
function setupAdmin(){
 const actor=String(Session.getEffectiveUser().getEmail()||'').toLowerCase();
 if(!actor)throw new Error('Cannot identify spreadsheet owner.');
 const users=rowData_('Users');
 if(users.some(u=>u.email.toLowerCase()===actor))return 'Existing user already present: '+actor;
 append_('Users',{email:actor,displayName:'Squadron Administrator',role:'admin',active:'TRUE'});
 return 'Added '+actor+' as administrator. Review CAP hosting/permissions requirements before live use.';
}
