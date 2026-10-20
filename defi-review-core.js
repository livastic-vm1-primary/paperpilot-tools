/**
 * PaperPilot DeFi CSV Exception Inbox — dependency-free, offline, read-only.
 * Parses supplied CSV, surfaces review questions; NEVER assigns tax treatment,
 * calculates gains, recommends investments, talks to chains or signs transactions.
 */
(function (root) {
  "use strict";
  const MAX_BYTES = 256 * 1024;
  const MAX_RECORDS = 750;
  const MAX_COLUMNS = 35;
  const MAX_WARNINGS_PREVIEW = 18;
  const HASH = /^0x[a-f0-9]{64}$/i;
  const ADDR = /^0x[a-f0-9]{40}$/i;
  const alias = {
    tx:["txhash","transactionhash","hash","txid","transactionid","txnhash"],
    method:["method","functionname","function","action","type","transactiontype","description","activity"],
    chain:["chain","network","blockchain"],
    date:["datetimeutc","dateutc","timestamp","date","datetime","blocktimestamp","time"],
    from:["from","fromaddress","sender","sourceaddress"],
    to:["to","toaddress","recipient","destinationaddress"],
    amount:["amount","value","quantity","tokenamount"],
    asset:["asset","symbol","tokensymbol","currency","token"]
  };
  function normalizeHeader(x){return String(x).toLowerCase().replace(/[^a-z0-9]/g,"");}
  function parseCSV(data) {
    const str = String(data??"").replace(/^\ufeff/,"");
    if (!str.trim()) throw Error("No CSV text. Load the fictional example or a local export.");
    const bytes = new TextEncoder().encode(str).length;
    if (bytes > MAX_BYTES) throw Error("CSV exceeds 256 KiB. Export a smaller non-confidential sample.");
    const records = [];
    let cell="",row=[],inside=false,closed=false,started=false;
    function field(){row.push(cell);if(row.length>MAX_COLUMNS)throw Error("Too many CSV columns; 35 maximum.");cell="";started=false;closed=false;}
    function endRow(){field();records.push(row);row=[];if(records.length>MAX_RECORDS+1)throw Error("CSV exceeds 750 data rows; split your export locally.");}
    for(let i=0;i<str.length;i++){
      const c=str[i];
      if(inside){
        if(c==='"'){
          if(str[i+1]==='"'){cell+='"';i++;}
          else{inside=false;closed=true;}
        }else {cell+=c;if(cell.length>65536)throw Error("CSV field exceeds 64 KiB.");}
      } else if(c===","){field();}
      else if(c==="\n"||c==="\r"){
        if(c==="\r"&&str[i+1]==="\n")i++;
        endRow();
      } else if(c==='"'){
        if(started||closed)throw Error("Malformed quote in CSV field.");
        inside=true;started=true;
      }else{
        if(closed)throw Error("Unexpected text after a closing CSV quote.");
        cell+=c;started=true;
        if(cell.length>65536)throw Error("CSV field exceeds 64 KiB.");
      }
    }
    if(inside)throw Error("Unclosed quoted CSV field.");
    if(row.length||cell!==""||started||closed)endRow();
    if(records.length<2)throw Error("Include a CSV header row and at least one transaction row.");
    if(records[0].length>MAX_COLUMNS)throw Error("Too many columns; 35 maximum.");
    return records;
  }
  function getIndices(head){
    const h=head.map(normalizeHeader);
    const idx={};
    for (const [k,names] of Object.entries(alias)) {
      const matches=h.map((v,i)=>names.includes(v)?i:-1).filter(i=>i!==-1);
      idx[k]=matches.length?matches[0]:-1;
    }
    return idx;
  }
  function get(row,i){return i===-1?"":String(row[i]??"").trim();}
  function candidateAction(text) {
    const s=String(text??"").toLowerCase().replace(/([a-z])([A-Z])/g,"$1 $2");
    const compact=s.replace(/[^a-z0-9]/g,"");
    if(/bridge|crosschain|stargate|layerzero|acrossprotocol/i.test(s))return "Possible bridge / cross-chain movement";
    if(/add\s*liquid|remove\s*liquid|liquidity\s*pool|lp\s*deposit|lp\s*withdraw|increaseliquidity|decreaseliquidity/i.test(s)||/addliquidity|removeliquidity/.test(compact))return "Possible liquidity-pool activity";
    if(/claim.?rewards?|harvest|unstake|stake|rebas(e|ing)|validator rewards?/i.test(s))return "Possible staking or reward activity";
    if(/borrow|repay|liquidat|collateral|supply.?asset|redeem.?asset/i.test(s))return "Possible lending or collateral activity";
    if(/swap|exactinput|exactoutput|trade/i.test(s))return "Possible token swap / trade";
    if(/transfer|send|receive|withdraw|deposit/i.test(s))return "Transfer or balance movement (intent unknown)";
    return "Unknown activity — not automatically categorized";
  }
  function audit(input){
    const rows=parseCSV(input);
    const header=rows[0], idx=getIndices(header);
    const detectable=Object.values(idx).filter(i=>i>=0).length;
    if(detectable<2 || (idx.tx<0&&idx.method<0)){
      throw Error("Need at least two recognized fields including a transaction hash or method/action. Try the fictional demo and match its headers.");
    }
    const txmap=new Map();
    const results=[];
    for(let i=1;i<rows.length;i++){
      const row=rows[i], why=[];
      const originalHash=get(row,idx.tx);
      const hash=HASH.test(originalHash)?originalHash.toLowerCase():"";
      const method=get(row,idx.method);
      const activity=candidateAction(method);
      if(row.length!==header.length)why.push("Column count differs from header; verify import alignment.");
      if(idx.tx>=0&&!originalHash)why.push("Transaction hash absent; cannot join explorer records.");
      if(idx.tx>=0&&originalHash&&!hash)why.push("Transaction ID is not a 32-byte EVM hash; inspect source/chain.");
      if(idx.method<0 || !method)why.push("Action/method unavailable; token transfers alone do not identify DeFi intent.");
      if(idx.method>=0&&method&&activity.startsWith("Unknown"))why.push("Unknown method; inspect explorer logs and protocol context.");
      if(/Possible/.test(activity))why.push("Complex DeFi event: human needs protocol context; tax treatment not inferred.");
      if(activity.startsWith("Transfer"))why.push("Transfer does not prove trade, income or self-owned wallet movement.");
      const from=get(row,idx.from), to=get(row,idx.to);
      if(ADDR.test(from)&&ADDR.test(to)&&from.toLowerCase()===to.toLowerCase()){
        why.push("Same from/to address; source may reflect internal/contract activity, not a taxable label.");
      }
      if(idx.amount>=0){
        const a=get(row,idx.amount);
        if(!a)why.push("Amount/value blank; inspect source before reconciling.");
        else if(!/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(a))why.push("Amount format is nonnumeric; no value/cost basis calculation made.");
      }
      if(idx.date>=0&&!get(row,idx.date))why.push("Date/time missing; chronological reconciliation may be incomplete.");
      if(hash)txmap.set(hash,(txmap.get(hash)||0)+1);
      results.push({rowNumber:i+1,hash,activity,reasons:why,reviewLevel:"review"});
    }
    let multiple=0;
    for(const item of results){
      if(item.hash&&txmap.get(item.hash)>1){
        item.reasons.push("Several exported events share this transaction hash; keep event legs grouped, not counted as separate trades automatically.");
        multiple++;
      }
      if(item.reasons.length===0)item.reviewLevel="low";
      else if(item.reasons.some(w=>/Column count|absent|not a 32|nonnumeric|blank|missing/.test(w)))item.reviewLevel="high";
    }
    const review=results.filter(x=>x.reasons.length>0);
    const high=review.filter(x=>x.reviewLevel==="high").length;
    return {
      ok:true,kind:"local_defi_transaction_csv_review_only",
      totalRows:results.length,columns:header.length,
      rowsNeedingReview:review.length,highPriorityRows:high,
      repeatedHashEventRows:multiple,
      distinctValidTransactionHashes:txmap.size,
      preview:review.slice(0,MAX_WARNINGS_PREVIEW).map(x=>({rowNumber:x.rowNumber,priority:x.reviewLevel,possibleActivity:x.activity,reviewReasons:[...x.reasons]})),
      reviewRows:review,
      recognizedHeaders:Object.keys(idx).filter(k=>idx[k]>=0),
      localOnly:true,networkCalls:0,walletConnection:false,tokenCharged:"0",
      disclaimer:"Only keyword/structure warnings; no tax treatment, gains, ownership, token valuation, compliance decision, or DeFi protocol verification."
    };
  }
  function csvEscape(x){
    const s=String(x??"");
    // Only generated fixed strings, or validated canonical hash. Export must also
    // be safe if a future source supplied a cell with a spreadsheet formula.
    const safe=/^[=+@\-\t\r\n]/.test(s.trimStart())?"'"+s:s;
    return '"'+safe.replace(/"/g,'""')+'"';
  }
  function exportReviewCsv(result,includeFullHash=false){
    if(!result||!result.ok||!Array.isArray(result.reviewRows))throw Error("Run a local audit before exporting.");
    const out=[["csvRow","reviewLevel","possibleActivity","reviewReasons","publicTransactionHash","unresolved"].map(csvEscape).join(",")];
    for(const row of result.reviewRows){
      const hash=includeFullHash&&HASH.test(row.hash)?row.hash:"";
      out.push([row.rowNumber,row.reviewLevel,row.activity,row.reasons.join(" | "),hash,"Human review needed; NOT a tax determination"].map(csvEscape).join(","));
    }
    return out.join("\r\n")+"\r\n";
  }
  const EXAMPLE=[
    "Txn Hash,Network,DateTime (UTC),Method,From,To,Token Symbol,Value",
    ["0x"+ "1".repeat(64),"Base","2026-10-01","swapExactTokensForTokens","0x"+"a".repeat(40),"0x"+"b".repeat(40),"USDC","10"].join(","),
    ["0x"+ "1".repeat(64),"Base","2026-10-01","Transfer","0x"+"a".repeat(40),"0x"+"b".repeat(40),"ETH","0.01"].join(","),
    ["0x"+ "2".repeat(64),"Base","2026-10-02","addLiquidity","0x"+"a".repeat(40),"0x"+"b".repeat(40),"USDC","50"].join(","),
    ["0x"+ "3".repeat(64),"Base","2026-10-03","bridgeTokens","0x"+"a".repeat(40),"0x"+"b".repeat(40),"USDC","4"].join(","),
    ["0x"+ "4".repeat(64),"Base","2026-10-04","claimRewards","0x"+"a".repeat(40),"0x"+"b".repeat(40),"ETH","0.0003"].join(","),
    ["0x"+ "5".repeat(64),"Base","2026-10-05","Transfer","0x"+"a".repeat(40),"0x"+"a".repeat(40),"ETH","0.02"].join(","),
    ["0x"+ "6".repeat(64),"Base","","unknownOperation","0x"+"a".repeat(40),"0x"+"b".repeat(40),"USDC",""].join(",")
  ].join("\n")+"\n";
  if(typeof module!=="undefined"&&module.exports)module.exports={parseCSV,audit,candidateAction,csvEscape,exportReviewCsv,EXAMPLE,MAX_BYTES,MAX_RECORDS,MAX_COLUMNS};
  if(root&&typeof root==="object")root.PaperPilotDefiReview={audit,exportReviewCsv,EXAMPLE,MAX_BYTES,MAX_RECORDS,MAX_COLUMNS};
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:this);
