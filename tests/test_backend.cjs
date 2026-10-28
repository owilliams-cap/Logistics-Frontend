/* Contract smoke tests of Code.gs with a fake Google Sheets runtime.
   This does not test Google's authentication / hosting configuration. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const seed=JSON.parse(fs.readFileSync(__dirname+'/../demo-seed.json','utf8'));
const schema={Items:['id','name','category','sku','location','total','condition','serial','reorderPoint','notes'],Loans:['id','itemId','member','quantity','checkedOutAt','dueAt','returnedAt','issuedBy','returnedBy','note','grade','issueType'],Orders:['id','name','category','quantity','source','eta','status','receivedAt','notes','sku','location','itemId'],Activity:['id','at','actor','action','entity','entityId','details'],Users:['email','displayName','role','active']};
const sheets={};for(const [name,cols] of Object.entries(schema))sheets[name]=[cols,...seed[name.toLowerCase()].map(x=>cols.map(k=>String(x[k]??'')))];
let signed='outsider@example.test';
const mockSheet=name=>({
 getDataRange:()=>({getDisplayValues:()=>sheets[name].map(r=>[...r])}),
 appendRow:row=>{sheets[name].push(row.map(String))},
 getRange:(row,col,nr,nc)=>({setValues:(rows)=>{for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)sheets[name][row+i-1][col+j-1]=String(rows[i][j])}})
});
const context={SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>sheets[name]?mockSheet(name):null})},Session:{getActiveUser:()=>({getEmail:()=>signed}),getEffectiveUser:()=>({getEmail:()=>signed}),getScriptTimeZone:()=> 'America/Denver'},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},Utilities:{formatDate:()=> '2026-10-27',getUuid:()=>require('crypto').randomUUID()},Date,Number,String,Error,Object,Math,RegExp,JSON,HtmlService:{},console};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../apps-script/Code.gs','utf8'),context);
const api=(action,p={})=>context.api(action,p);
const denied=api('bootstrap');assert.equal(denied.ok,false);
assert.match(context.setupAdmin(),/Added outsider/);
let result=api('bootstrap');assert.equal(result.ok,true);assert.equal(result.data.items.length,seed.items.length);
const start=result.data.items.find(i=>i.id==='EQ-001').available;
result=api('checkout',{itemId:'EQ-001',member:'Mockerson',quantity:2,dueAt:'2026-11-04'});assert.equal(result.ok,true);assert.equal(result.data.items.find(i=>i.id==='EQ-001').available,start-2);
result=api('checkout',{itemId:'EQ-001',member:'Mockerson',quantity:800});assert.equal(result.ok,false);
const loan=api('bootstrap').data.loans.find(x=>x.member==='Mockerson');result=api('returnLoan',{id:loan.id});assert.equal(result.ok,true);assert.equal(result.data.items.find(i=>i.id==='EQ-001').available,start);
result=api('checkout',{itemId:'EQ-001',member:'Keeper',quantity:1,issueType:'permanent'});assert.equal(result.ok,true);
 const keeper=result.data.loans.find(l=>l.member==='Keeper');assert.equal(keeper.issueType,'permanent');assert.equal(keeper.dueAt,'');
 assert.equal(result.data.items.find(i=>i.id==='EQ-001').available,start-1);
 result=api('returnLoan',{id:keeper.id});assert.equal(result.ok,false);
 result=api('checkout',{itemId:'EQ-001',member:'Undetermined',quantity:1,issueType:'unknown',dueAt:'2028-12-12'});assert.equal(result.ok,true);
 const unknown=result.data.loans.find(l=>l.member==='Undetermined');assert.equal(unknown.dueAt,'');
 result=api('createOrder',{name:'Mock Safety Kit',category:'Medical & Safety',quantity:3,source:'Test Vendor',eta:'2026-11-04'});assert.equal(result.ok,true);
const order=result.data.orders.find(o=>o.name==='Mock Safety Kit');result=api('receiveOrder',{id:order.id});assert.equal(result.ok,true);assert.ok(result.data.items.find(i=>i.name==='Mock Safety Kit'&&i.total==='3'));
result=api('receiveOrder',{id:order.id});assert.equal(result.ok,false);
result=api('setUser',{email:'viewer@example.test',displayName:'Test Viewer',role:'viewer',active:'TRUE'});assert.equal(result.ok,true);
signed='viewer@example.test';result=api('bootstrap');assert.equal(result.ok,true);assert.equal(result.data.me.role,'viewer');assert.equal(result.data.users.length,0);
result=api('createItem',{name:'Unauthorized item',category:'Other',total:3});assert.equal(result.ok,false);
signed='';result=api('bootstrap');assert.equal(result.ok,false);assert.match(result.error,/verifiable signed-in email/);
console.log('PASS: backend identity, admin bootstrap, stock locking logic, checkout, overissue rejection, returns, receive-once, role restriction, failure closed');