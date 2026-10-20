/* Free DeFi CSV Exception Inbox. The CSV never leaves the browser. */
(function(doc){
  "use strict";
  if(!doc)return;
  const $=name=>doc.getElementById(name);
  const input=$("defi-csv"),file=$("defi-file"),result=$("defi-output"),
        include=$("defi-include-hash"),download=$("defi-download");
  if(!input||!result||!window.PaperPilotDefiReview)return;
  const app=window.PaperPilotDefiReview;
  let report=null;
  function clearReport(text){
    report=null;download.disabled=true;result.replaceChildren();
    const p=doc.createElement("p");p.textContent=text;result.appendChild(p);
  }
  function addLine(label,value){
    const p=doc.createElement("p");
    const b=doc.createElement("strong");b.textContent=label+": ";
    p.appendChild(b);p.appendChild(doc.createTextNode(String(value)));
    result.appendChild(p);
  }
  function analyze(){
    clearReport("Analyzing entirely on this device…");
    try{
      report=app.audit(input.value);
      result.replaceChildren();
      addLine("Data rows",report.totalRows);
      addLine("Rows needing human review",report.rowsNeedingReview);
      addLine("High-priority missing / malformed entries",report.highPriorityRows);
      addLine("Transaction-event rows sharing a hash",report.repeatedHashEventRows);
      addLine("Local-only network / wallet requests","0 / 0");
      const note=doc.createElement("p");
      note.textContent="Each row is an unresolved review prompt, NOT a claim of profit, tax treatment, token ownership or actual wallet activity. File contents have not been sent anywhere.";
      result.appendChild(note);
      if(report.preview.length){
        const list=doc.createElement("ol");
        for(const item of report.preview){
          const li=doc.createElement("li");
          li.textContent="CSV row "+item.rowNumber+" · "+item.priority+
            " · "+item.possibleActivity+" — "+item.reviewReasons.join(" ");
          list.appendChild(li);
        }
        result.appendChild(list);
        if(report.rowsNeedingReview>report.preview.length){
          const p=doc.createElement("p");
          p.textContent="Only the first "+report.preview.length+" are shown. Download the complete local review checklist below.";
          result.appendChild(p);
        }
      }
      download.disabled=false;
    }catch(e){
      clearReport(e instanceof Error?e.message:"Cannot inspect the CSV.");
    }
  }
  $("defi-run")?.addEventListener("click",analyze);
  $("defi-demo")?.addEventListener("click",()=>{
    input.value=app.EXAMPLE;include.checked=false;
    clearReport("Fictional transactions loaded. Click Analyze locally. No real wallets or coins used.");
  });
  $("defi-clear")?.addEventListener("click",()=>{
    input.value="";if(file)file.value="";
    include.checked=false;
    clearReport("Input cleared. No local results or payment.");
  });
  input.addEventListener("input",()=>clearReport("Input changed. Run a new local analysis; no network request."));
  file?.addEventListener("change",async()=>{
    clearReport("Reading an authorized, non-confidential CSV locally…");
    const f=file.files?.[0];
    if(!f){clearReport("No file chosen.");return;}
    if(f.size>app.MAX_BYTES){clearReport("File exceeds the 256 KiB size cap.");return;}
    try{
      const text=await f.text();
      if(new TextEncoder().encode(text).length>app.MAX_BYTES){clearReport("CSV exceeds 256 KiB.");return;}
      input.value=text;
      clearReport("CSV loaded locally. Click Analyze. No upload has occurred.");
    }catch{clearReport("Unable to read local CSV.");}
  });
  download.addEventListener("click",()=>{
    if(!report)return;
    // Generated CSV has only row numbers, fixed labels and optionally a
    // user-authorized, strictly validated public transaction hash.
    const value=app.exportReviewCsv(report,include.checked);
    const blob=new Blob([value],{type:"text/csv;charset=utf-8"});
    const href=URL.createObjectURL(blob);
    try{
      const a=doc.createElement("a");a.href=href;a.download="defi-unresolved-review-checklist.csv";
      a.hidden=true;doc.body.appendChild(a);a.click();a.remove();
    }finally{setTimeout(()=>URL.revokeObjectURL(href),1000);}
  });
  clearReport("No analysis yet. Load the fictional demo or select your own authorized export. All CSV processing is local.");
})(typeof document!=="undefined"?document:null);
