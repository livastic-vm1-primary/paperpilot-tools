import {
  parseExchangeCsv,buildKoinlyCsv,TEMPLATES,demoExchangeCsv,demoMapping,MAX_BYTES
} from './koinly-column-mapper-core.mjs';
const $ = id => document.getElementById(id);
const make = (tag,txt,parent) => {
  const el=document.createElement(tag);
  if(txt!==undefined)el.textContent=String(txt);
  parent.append(el);
  return el;
};
let headers=[],last=null;
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
