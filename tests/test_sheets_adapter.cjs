const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data={
 Items:[['id','name','category','sku','location','total','condition','serial','reorderPoint','notes'],['EQ-001','Radio','Communications','R01','Locker','3','Good','','1','']],
 Loans:[['id','itemId','member','quantity','checkedOutAt','dueAt','returnedAt','issuedBy','returnedBy','note','grade','issueType']],
 Orders:[['id','name','category','quantity','source','eta','status','receivedAt','notes','sku','location','itemId']],
 Activity:[['id','at','actor','action','entity','entityId','details']],
 Users:[['email','displayName','role','active'],['orionwilliams.cap@gmail.com','CAP Demo Admin','admin','TRUE']]
};
const fetch=async(url,opts={})=>{
 let body,status=200;
 const u=new URL(url);
 if(u.hostname==='www.googleapis.com'){body={email:'orionwilliams.cap@gmail.com',email_verified:true,name:'CAP Demo Admin'};}
 else if(u.pathname.endsWith('/values:batchGet')){
  const ranges=u.searchParams.getAll('ranges');
  body={valueRanges:ranges.map(r=>({range:r,values:data[r.split('!')[0]].map(row=>[...row])}))};
 } else if(u.pathname.includes('/values/')){
  const range=decodeURIComponent(u.pathname.split('/values/')[1]);
  const [tab,part]=range.split('!');
  const rows=JSON.parse(opts.body).values;
  if(range.includes(':append')){data[tab].push(...rows);}else{
   const start=Number(part.match(/\d+/)[0])-1;
   data[tab][start]=rows[0];
  }
  body={updatedRows:rows.length};
 }else{status=404;body={error:{message:url}};}
 return {ok:status<400,status,json:async()=>body};
};
const window={CAP_LOGISTICS_CONFIG:{googleOAuthClientId:'test.apps.googleusercontent.com',spreadsheetId:'1Kk5ZJroE6fS2RL-7b2IyumUOcU_gy3tA4g4Q-yeHVh8'}};
const google={accounts:{oauth2:{initTokenClient:cfg=>({requestAccessToken:()=>cfg.callback({access_token:'FAKE_TEST_TOKEN'})})}}};
window.google=google;const context={window,google,fetch,crypto,URL,console,Date,Promise};
vm.runInNewContext(fs.readFileSync(__dirname+'/../sheets-adapter.js','utf8'),context);
(async()=>{
 const api=window.SquadronSheets;
 const bootstrap=await api.connect();
 assert.equal(bootstrap.items.length,1);
 assert.equal(bootstrap.me.role,'admin');
 await api.call('checkout',{itemId:'EQ-001',member:'Example',quantity:2,grade:'C/SSgt'});
 assert.equal(data.Loans.length,2);
 assert.equal(data.Loans[1][10],'C/SSgt');
 assert.equal(data.Loans[1][11],'unknown');
 assert.equal((await api.call('bootstrap')).items[0].available,1);
 await assert.rejects(()=>api.call('checkout',{itemId:'EQ-001',member:'Another',quantity:2,grade:'C/Capt'}),/Not enough/);
 await api.call('returnLoan',{id:data.Loans[1][0]});
 assert.equal((await api.call('bootstrap')).items[0].available,3);
 await api.call('checkout',{itemId:'EQ-001',member:'Permanent',quantity:1,issueType:'permanent'});
 assert.equal((await api.call('bootstrap')).items[0].available,2);
 assert.equal(data.Items[1][5],2);
 await assert.rejects(()=>api.call('returnLoan',{id:data.Loans[2][0]}),/Permanent issues/);
 await api.call('createItem',{name:'Insignia',category:'Rank Insignia',total:5,reorderPoint:2});
 assert.equal(data.Items.length,3);
 api.disconnect();
 assert.equal(api.active,false);
 console.log('PASS Google API mock: OAuth callback, account allowlist, live Sheet read/write, grade checkout, stock, return, signout');
})().catch(e=>{console.error(e);process.exitCode=1});