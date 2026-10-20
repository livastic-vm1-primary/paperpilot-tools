import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const CODE=readFileSync(new URL('../Code.gs',import.meta.url),'utf8');
const HEADER=['sha256','gmailMessageId','archiveFileId','status','createdAtUTC'];
const PDF=Buffer.from('%PDF-1.4\n%original fictional demonstration data');
function setup({props={},rows=[HEADER],mails=null,failAppend=false,lockOk=true,badSheet=false}={}){
 const writes=[],files=new Map();
 let nextFile=1;
 const events={locked:0,released:0,searched:[],reads:0,created:0,appended:0,sheets:0};
 const config={STAGING_SHEET_ID:'TESTSTAGINGSHEETID123456',ARCHIVE_FOLDER_ID:'TESTDRIVEFOLDERID1234567',INVOICE_GMAIL_QUERY:'label:invoice-review has:attachment newer_than:30d',ALLOW_ARCHIVE_COMMIT:'NO',...props};
 const inbox=mails??[{id:'message-001',attachments:[{name:'invoice.pdf',mime:'application/pdf',buf:PDF}]}];
 const attach=s=>({
  getName(){return s.name;},getContentType(){return s.mime;},
  getSize(){return s.size??s.buf.length;},
  getBytes(){events.reads++;return Array.from(s.buf);},
  copyBlob(){return {setName(name){return {name};}};}
 });
 const sheet={
  getDataRange(){return {getValues(){return rows;}};},
  appendRow(row){events.appended++;if(failAppend&&events.appended===1)throw Error('synthetic failure');rows.push(row);writes.push(row);}
 };
 const orig={
  PropertiesService:{getScriptProperties(){return {getProperty(name){return config[name]??null;}};}},
  GmailApp:{search(query,start,maxThreads){
   events.searched.push({query,start,maxThreads});
   return inbox.slice(start,start+maxThreads).map(m=>({getMessages(){return [{
    getId(){return m.id;},
    getAttachments(){return m.attachments.map(attach);}
   }];}}));
  }},
  SpreadsheetApp:{openById(id){
   events.sheets++;assert.equal(id,config.STAGING_SHEET_ID);
   return {getSheetByName(name){return badSheet?null:(name==='InvoiceStaging'?sheet:null);}};
  }},
  DriveApp:{getFolderById(id){
   assert.equal(id,config.ARCHIVE_FOLDER_ID);
   return {
    getFilesByName(name){return {hasNext(){return files.has(name);},next(){return files.get(name);}};},
    createFile(blob){events.created++;const id='file-'+(nextFile++);
     const f={getId(){return id;}};files.set(blob.name,f);return f;}
   };
  }},
  LockService:{getScriptLock(){return {tryLock(){events.locked++;return lockOk;},releaseLock(){events.released++;}};}},
  Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest(_,bytes){
   return [...createHash('sha256').update(Buffer.from(bytes)).digest()].map(x=>x>127?x-256:x);
  }},
  Date,Number,String,Array,RegExp,Object,Error,console
 };
 vm.runInNewContext(CODE,vm.createContext(orig),{timeout:2000,filename:'Code.gs'});
 return {orig,events,writes,files,rows,config};
}
const run=(c,fn)=>JSON.parse(JSON.stringify(c.orig[fn]()));
test('preview defaults to read only, no saved files, locks or staging writes',()=>{
 const c=setup();const r=run(c,'previewInvoiceIntake');
 assert.equal(r.mode,'PREVIEW_ONLY');assert.equal(r.newDocuments,1);
 assert.equal(c.events.created,0);assert.equal(c.events.appended,0);assert.equal(c.events.locked,0);
});
test('commit explicitly disabled by default, before any file read',()=>{
 const c=setup();assert.throws(()=>c.orig.archiveInvoicesToStaging(),/ALLOW_ARCHIVE_COMMIT/);
 assert.equal(c.events.sheets,0);assert.equal(c.events.created,0);
});
test('commit in owner opt-in mode makes one private staging row and file',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'}});
 const r=run(c,'archiveInvoicesToStaging');assert.equal(r.archivedAndRegistered,1);
 assert.equal(c.writes.length,1);assert.equal(c.events.created,1);
 assert.match(c.writes[0][0],/^[a-f0-9]{64}$/);
 assert.equal(c.writes[0][1],'message-001');assert.equal(c.writes[0][3],'NEEDS_HUMAN_REVIEW');
 assert.equal(c.events.locked,1);assert.equal(c.events.released,1);
});
test('repeat is idempotent, same exact PDF is not archived twice',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'}});
 run(c,'archiveInvoicesToStaging');const r=run(c,'archiveInvoicesToStaging');
 assert.equal(r.duplicateDocuments,1);assert.equal(r.archivedAndRegistered,0);assert.equal(c.files.size,1);
});
test('duplicate forwarded invoice across messages is content-addressably deduped',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},mails:[
  {id:'m1',attachments:[{name:'a.pdf',mime:'application/pdf',buf:PDF}]},
  {id:'m2',attachments:[{name:'renamed.pdf',mime:'application/pdf',buf:PDF}]},
 ]});
 const r=run(c,'archiveInvoicesToStaging');
 assert.equal(r.archivedAndRegistered,1);assert.equal(r.duplicateDocuments,1);
});
test('SHA256 pre-existing in registry prevents new copies',()=>{
 const h=createHash('sha256').update(PDF).digest('hex');
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},rows:[HEADER,[h,'old','file-old','NEEDS_HUMAN_REVIEW','old']]});
 assert.equal(run(c,'archiveInvoicesToStaging').duplicateDocuments,1);
 assert.equal(c.events.created,0);
});
test('fake PDF extension wrong MIME never processed',()=>{
 const c=setup({mails:[{id:'m',attachments:[{name:'abc.pdf',mime:'application/x-msdownload',buf:PDF}]}]});
 const r=run(c,'previewInvoiceIntake');assert.equal(r.otherAttachments,1);assert.equal(r.pdfCandidates,0);
});
test('oversized PDF filtered before reading bytes',()=>{
 const c=setup({mails:[{id:'m',attachments:[{name:'big.pdf',mime:'application/pdf',buf:PDF,size:9000000}]}]});
 assert.equal(run(c,'previewInvoiceIntake').tooLarge,1);assert.equal(c.events.reads,0);
});
test('malformed private registry headings abort before any Drive write',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},rows:[['account','balance']]});
 assert.throws(()=>c.orig.archiveInvoicesToStaging(),/header mismatch/);
 assert.equal(c.events.created,0);assert.equal(c.events.released,1);
});
test('missing staging tab fails safely and releases lock',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},badSheet:true});
 assert.throws(()=>c.orig.archiveInvoicesToStaging(),/InvoiceStaging/);
 assert.equal(c.events.created,0);assert.equal(c.events.released,1);
});
test('busy script lock fails before seeing any Gmail messages',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},lockOk:false});
 assert.throws(()=>c.orig.archiveInvoicesToStaging(),/Another intake is running/);
 assert.equal(c.events.searched.length,0);assert.equal(c.events.sheets,0);
});
test('Sheet append failure after Drive copy retries with same file instead of making duplicate',()=>{
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},failAppend:true});
 const first=run(c,'archiveInvoicesToStaging');
 assert.equal(first.processingErrors,1);assert.equal(c.files.size,1);assert.equal(c.rows.length,1);
 const second=run(c,'archiveInvoicesToStaging');
 assert.equal(second.archivedAndRegistered,1);assert.equal(c.files.size,1);assert.equal(c.rows.length,2);
});
test('bounded Gmail search requires an explicit invoice label',()=>{
 const c=setup();run(c,'previewInvoiceIntake');
 assert.equal(c.events.searched[0].maxThreads,40);
 assert.match(c.events.searched[0].query,/label:/);
});
test('unlabelled Gmail query rejected before account or Drive access',()=>{
 const c=setup({props:{INVOICE_GMAIL_QUERY:'has:attachment'}});
 assert.throws(()=>c.orig.previewInvoiceIntake(),/include a label/);
 assert.equal(c.events.searched.length,0);
});
test('invalid folder id rejects all work',()=>{
 const c=setup({props:{ARCHIVE_FOLDER_ID:'bad'}});
 assert.throws(()=>c.orig.previewInvoiceIntake(),/valid STAGING_SHEET_ID/);
 assert.equal(c.events.sheets,0);
});
test('no new messages is not a sale or fake processing work',()=>{
 const c=setup({mails:[],props:{ALLOW_ARCHIVE_COMMIT:'YES'}});
 const r=run(c,'archiveInvoicesToStaging');
 assert.equal(r.archivedAndRegistered,0);assert.equal(c.events.created,0);
});
test('no third-party HTTP, Gmail deletion, SAGE write, or automatic trigger',()=>{
 assert.doesNotMatch(CODE,/UrlFetchApp|moveToTrash\s*\(|deleteMessage\s*\(|ScriptApp\.newTrigger/);
 assert.doesNotMatch(CODE,/\.getSheetByName\("Movimentos"\)|\.getSheetByName\("Transactions"\)/);
 assert.match(CODE,/NEEDS_HUMAN_REVIEW/);
});
test('35 distinct invoices can advance across two safe, idempotent manual runs',()=>{
 const mails=Array.from({length:35},(_,i)=>({id:'msg-'+i,attachments:[{
  name:'synthetic-'+i+'.pdf',mime:'application/pdf',
  buf:Buffer.from('%PDF-1.4 fictional unique invoice '+i)
 }]}));
 const c=setup({mails,props:{ALLOW_ARCHIVE_COMMIT:'YES'}});
 const a=run(c,'archiveInvoicesToStaging');
 assert.equal(a.archivedAndRegistered,25);
 assert.equal(a.limitReached,true);
 const b=run(c,'archiveInvoicesToStaging');
 assert.equal(b.archivedAndRegistered,10);
 assert.equal(c.files.size,35);
 assert.equal(c.rows.length,36);
});
test('crosses first 40 messages to find an unseen one without any duplicate writes',()=>{
 const dup=Array.from({length:40},(_,i)=>({id:'dup-'+i,attachments:[{
  name:'forward-'+i+'.pdf',mime:'application/pdf',buf:PDF
 }]}));
 const unique={id:'new-one',attachments:[{
  name:'unique.pdf',mime:'application/pdf',buf:Buffer.from('%PDF fresh unique')
 }]};
 const c=setup({props:{ALLOW_ARCHIVE_COMMIT:'YES'},mails:[...dup,unique]});
 const r=run(c,'archiveInvoicesToStaging');
 assert.equal(r.archivedAndRegistered,2);
 assert.equal(r.duplicateDocuments,39);
 assert.deepEqual(c.events.searched.map(q=>q.start),[0,40]);
});
