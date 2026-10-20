import {
  parseExchangeCsv,buildKoinlyCsv,analyzeNarrativeCsv,TEMPLATES,demoExchangeCsv,demoNarrativeCsv,demoMapping,MAX_BYTES
} from './koinly-column-mapper-core.mjs';
const $ = id => document.getElementById(id);
const make = (tag,txt,parent) => {
  const el=document.createElement(tag);
  if(txt!==undefined)el.textContent=String(txt);
  parent.append(el);
  return el;
};
let headers=[],last=null;
let lastNarrative=null;
function resetNarrative(){
  lastNarrative=null;
  $('narrative-download').disabled=true;
  $('narrative-results').replaceChildren();
  $('narrative-results').hidden=true;
}
function refreshNarrativeColumns(){
  resetNarrative();
  const select=$('narrative-description-column');
  select.replaceChildren();
  const blank=make('option','Select an existing source header',select);
  blank.value='';
  for(const h of headers){
    const option=make('option',h,select);option.value=h;
  }
  const suggested=headers.find(h=>h.trim().toLowerCase()==='description');
  if(suggested)select.value=suggested;
}
function resetPreview(){
  last=null;
  $('output-download').disabled=true;
  $('mapping-results').replaceChildren();
  $('mapping-results').hidden=true;
}
function message(text){ $('mapper-message').textContent=text; }
function sourceText(){ return $('csv-original').value; }
function selectedMap(){
  return Object.fromEntries([...$('mapping-fields').querySelectorAll('select[data-target]')]
    .filter(el=>el.value).map(el=>[el.dataset.target,el.value]));
}
function rebuildFields(suggestions={}){
  resetPreview();
  refreshNarrativeColumns();
  const parent=$('mapping-fields');
  parent.replaceChildren();
  if(headers.length===0){make('p','Inspect source CSV headers to display the mapping controls.',parent);return;}
  const spec=TEMPLATES[$('koinly-format').value];
  for(const [type,names] of [
    ['Required fields (must be mapped)',spec.required],
    ['Optional fields (map only if your source actually contains one)',spec.optional]
  ]){
    make('h3',type,parent);
    const grid=make('div',undefined,parent);
    grid.className='mapper-grid';
    for(const name of names){
      const label=make('label',undefined,grid);
      make('span',name,label);
      const select=make('select',undefined,label);
      select.dataset.target=name;
      select.id='map-'+name.replaceAll(' ','-').toLowerCase();
      const blank=make('option','Not mapped',select);blank.value='';
      for(const source of headers){
        const option=make('option',source,select);option.value=source;
      }
      if(suggestions[name]&&headers.includes(suggestions[name]))select.value=suggestions[name];
      else{
        const same=headers.find(x=>x.trim().toLowerCase()===name.toLowerCase());
        if(same)select.value=same;
      }
      select.addEventListener('change',resetPreview);
    }
  }
}
function inspect(suggestions={}){
  resetPreview();
  try{
    const csv=parseExchangeCsv(sourceText());
    headers=csv.headers;
    rebuildFields(suggestions);
    message('Locally recognized '+csv.rowCount+' data rows and '+headers.length+
      ' original columns. No upload; no Koinly account or chain has been queried. Choose source columns for every required output field.');
  }catch(err){
    headers=[];
    rebuildFields();
    message('No conversion allowed: '+(err?.message||'Invalid or unsupported CSV.'));
  }
}
$('narrative-description-column').addEventListener('change',resetNarrative);
$('narrative-demo').addEventListener('click',()=>{
  $('input-file').value='';
  $('csv-original').value=demoNarrativeCsv;
  $('utc-confirm').checked=false;
  inspect();
  $('narrative-status').textContent='Fictional narrative-only demo loaded locally: no external Wealthsimple exporter was tested. Select the Description field and click Analyze.';
});
$('narrative-analyze').addEventListener('click',()=>{
  resetNarrative();
  try{
    const result=analyzeNarrativeCsv(sourceText(),{
      descriptionColumn:$('narrative-description-column').value
    });
    const root=$('narrative-results');
    root.hidden=false;
    make('h3',result.ok?'Narrative evidence columns prepared locally':'NO ANNOTATION FILE — AMBIGUOUS SOURCE DESCRIPTIONS',root);
    const report=result.report;
    make('p','Source: '+report.sourceRows+' records. Strictly recognized: '+report.matchedRows+
      '. Ambiguous/unsafe: '+report.unmatchedRows+'. Output: '+report.resultRows+' records.',root);
    if(report.issues.length){
      const ol=make('ol',undefined,root);
      const safeReasons={
        formula_like_source_cell:'A source cell resembles a spreadsheet formula; do not export.',
        noncanonical_description:'The description includes leading/trailing whitespace or a line break.',
        ambiguous_or_unsupported_phrase:'Cannot safely parse this exact phrase; no amount/asset guessed.'
      };
      for(const issue of report.issues){
        make('li','CSV record '+issue.sourceRecord+': '+(safeReasons[issue.kind]||'Unsupported phrase.'),ol);
      }
      make('p','Fix or review ALL source evidence; one ambiguous record blocks the complete annotated output.',root);
    }
    const warnings=make('ul',undefined,root);
    for(const warning of report.warnings)make('li',warning,warnings);
    if(result.ok){
      lastNarrative=result;$('narrative-download').disabled=false;
      $('narrative-status').textContent='Local annotation ready. Original CSV was not changed. Click Download only if you want a separate evidence CSV; this is NOT a Koinly import file.';
    }else{
      $('narrative-status').textContent='No annotated CSV generated. The list shows row numbers only, never private values. This is not a paid service.';
    }
  }catch(err){
    $('narrative-status').textContent='Fail-closed: '+(err?.message||'Unsupported input.');
  }
});
$('narrative-download').addEventListener('click',()=>{
  if(!lastNarrative?.ok||!lastNarrative.csv)return;
  const blob=new Blob(['\\uFEFF'+lastNarrative.csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const a=document.createElement('a');a.href=url;
    a.download='narrative-amount-asset-evidence-not-koinly.csv';
    document.body.append(a);a.click();a.remove();
    $('narrative-status').textContent='Downloaded LOCAL evidence columns only. This is NOT a Koinly import, cost basis or verified executed trade.';
  }finally{setTimeout(()=>URL.revokeObjectURL(url),500);}
});

$('koinly-format').addEventListener('change',()=>rebuildFields());
$('csv-original').addEventListener('input',()=>{
  headers=[];rebuildFields();message('Input changed. Inspect headers again before generating a new preview.');
});
$('input-file').addEventListener('change',async e=>{
  resetPreview();
  const file=e.target.files?.[0];
  if(!file)return;
  if(file.size>MAX_BYTES){message('Input exceeds 512 KiB and was not read.');return;}
  try {
    const text=await file.text();
    $('csv-original').value=text;
    inspect();
  }catch{message('Your local file could not be read.');}
});
$('input-demo').addEventListener('click',()=>{
  $('input-file').value='';
  $('csv-original').value=demoExchangeCsv;
  $('koinly-format').value='universal';
  $('utc-confirm').checked=false;
  inspect(demoMapping);
  message('Completely fictional 3-row demonstration loaded, with suggested mappings. To continue, verify the UTC rule in the example and check the checkbox. Nothing is sent or downloaded automatically.');
});
$('input-inspect').addEventListener('click',()=>inspect());
$('input-clear').addEventListener('click',()=>{
  $('input-file').value='';$('csv-original').value='';$('utc-confirm').checked=false;
  headers=[];rebuildFields();message('Local input and candidate output cleared. No browser storage was used.');
});
$('input-preview').addEventListener('click',()=>{
  resetPreview();
  try{
    const result=buildKoinlyCsv(sourceText(),{
      template:$('koinly-format').value,
      mapping:selectedMap(),
      confirmedUtc:$('utc-confirm').checked
    });
    const report=result.report;
    const root=$('mapping-results');
    root.hidden=false;
    make('h3',result.ok?'CANDIDATE CSV GENERATED LOCALLY':'NO FILE GENERATED — INPUT REVIEW REQUIRED',root);
    make('p','Source: '+report.sourceRows+' rows, '+report.sourceColumns+
      ' columns. Output: '+report.outputRows+' rows, '+report.mappedOfficialColumns+
      ' Koinly fields. Additional original source columns preserved: '+report.preservedOriginalSourceColumns+'.',root);
    if(report.issues.length){
      make('p','Warnings show ONLY CSV record numbers and Koinly fields, never original values.',root);
      const list=make('ol',undefined,root);
      for(const issue of report.issues){
        make('li','CSV record '+issue.sourceRecord+' — '+issue.field+': '+issue.reason,list);
      }
    }else{
      make('p','Zero source rows deleted, combined, sorted, priced or assigned a tax basis. '+
        'The produced CSV may NOT import successfully at Koinly. You are responsible for checking imported row counts and every transaction against the authorized exchange originals.',root);
    }
    const warnings=make('ul',undefined,root);
    for(const warning of report.warnings)make('li',warning,warnings);
    if(result.ok){last=result;$('output-download').disabled=false;message('Validated formatting preview created IN THIS BROWSER ONLY. Click Download explicitly. Koinly import is not verified.');}
    else message('No downloadable CSV was created; review the row-only issues first. Original input is unchanged.');
  }catch(err){message('Fail-closed: '+(err?.message||'Unsupported input.'));}
});
$('output-download').addEventListener('click',()=>{
  if(!last?.ok||!last.csv)return;
  const blob=new Blob(['\uFEFF'+last.csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const a=document.createElement('a');a.href=url;
    a.download='candidate-koinly-'+last.report.template+'-source-preserved.csv';
    document.body.append(a);a.click();a.remove();
    message('Local candidate CSV downloaded. Verify every row and Koinly import status independently. This is not tax advice.');
  }finally{setTimeout(()=>URL.revokeObjectURL(url),500);}
});
rebuildFields();
