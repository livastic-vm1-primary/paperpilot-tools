(() => {
"use strict";
const formatWon = value => new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits:0,
  minimumFractionDigits:0
}).format(value) + "원";
const element = id => document.getElementById(id);
const maxPrice=1000000000, maxQty=10000;
let latest = null;

function numberAt(id,max,integer=true) {
  const input=element(id);
  const value=Number(input.value);
  if(!Number.isFinite(value)||value<0)return 0;
  const bounded=Math.min(value,max);
  return integer?Math.round(bounded):bounded;
}
function calculate() {
  const unit=numberAt("unit",maxPrice);
  const qty=numberAt("qty",maxQty);
  const discountRate=numberAt("discount",100,false);
  const taxRate=numberAt("tax",100,false);
  const subtotal=unit*qty;
  // Math is illustrative and rounded to whole KRW; it is NOT certified tax logic.
  const discount=Math.round(subtotal*discountRate/100);
  const taxable=Math.max(0,subtotal-discount);
  const tax=Math.round(taxable*taxRate/100);
  const total=taxable+tax;
  const name=element("item").value.trim().slice(0,120)||"서비스 항목";
  latest={unit,qty,discountRate,taxRate,subtotal,discount,tax,total,name};
  element("preview-name").textContent=name;
  element("subtotal").textContent=formatWon(subtotal);
  element("discount-amount").textContent="−"+formatWon(discount);
  element("tax-amount").textContent=formatWon(tax);
  element("grand-total").textContent=formatWon(total);
  const clipped=unit!==Number(element("unit").value)||
    qty!==Number(element("qty").value)||
    discountRate!==Number(element("discount").value)||
    taxRate!==Number(element("tax").value);
  element("calc-feedback").textContent=clipped
    ? "유효하지 않거나 한도를 벗어난 값은 계산 범위로 조정했습니다. 입력값을 확인해 주세요."
    : "모든 값은 브라우저 안에서만 계산됩니다.";
  return latest;
}
function reportText(doc) {
  const date=new Date().toISOString().slice(0,10);
  return [
    "프리랜서 견적 계산 메모 — PaperPilot",
    "생성일: "+date,
    "",
    "항목: "+doc.name,
    "단가: "+formatWon(doc.unit),
    "수량: "+doc.qty,
    "소계: "+formatWon(doc.subtotal),
    "할인율: "+doc.discountRate+"%",
    "할인액: "+formatWon(doc.discount),
    "세율(사용자 지정 예시): "+doc.taxRate+"%",
    "세금 계산 예시: "+formatWon(doc.tax),
    "견적 합계: "+formatWon(doc.total),
    "",
    "계약·납품 범위·수정·세금·증빙·결제 조건은 실제 당사자끼리 확인하세요.",
    "이 파일은 단순 계산 메모이며 계약서/청구서/전자세금계산서가 아닙니다.",
    "https://livastic-vm1-primary.github.io/paperpilot-tools/freelance-estimate-ko.html",
    ""
  ].join("\n");
}
function exportNotes() {
  const doc=calculate();
  const blob=new Blob([reportText(doc)],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="paperpilot-견적-계산-메모.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  element("calc-feedback").textContent="견적 계산 메모를 저장했습니다. 실제 거래 조건은 별도로 확인하세요.";
}
function resetSample() {
  element("item").value="웹사이트 UI 작업";
  element("unit").value="350000";
  element("qty").value="2";
  element("discount").value="0";
  element("tax").value="0";
  calculate();
}
for(const name of ["item","unit","qty","discount","tax"]){
  element(name).addEventListener("input",calculate);
}
element("sample").addEventListener("click",resetSample);
element("save").addEventListener("click",exportNotes);
calculate();
})();
