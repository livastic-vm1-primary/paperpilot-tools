(() => {
"use strict";
const korean={
"nav-how":"사용 방법","nav-demo":"직접 체험","nav-join":"사전 알림 받기 ↗",
"hire":"맞춤 제작 / 의뢰","customTag":"맞춤 개발 / 견적 상담","customTitle":"우리 업무에 맞는 도구가 필요한가요?","customBody":"한·영 문서 서식, 오프라인 업무용 웹 도구, 브라우저 자동 테스트. 실제 제작 사례와 기준 가격을 확인하고 결제 전에 작업 범위를 협의할 수 있습니다.","customCta":"맞춤 제작 서비스·가격 보기 ↗",
"chip":"1인 사업자 · 프리랜서를 위한 영어·한국어 도구",
"hero-h1":"견적서는 멋지게.\n일은 간단하게.",
"hero-body":"내 브라우저에서 만드는 깔끔한 견적서와 청구서. 회원가입·구독료도 필요 없고 고객 정보를 업로드하지도 않습니다. 필요한 기능만 담았습니다.",
"hero-demo":"무료 계산기 체험 ↗","hero-early":"출시 알림 신청 →",
"price-note":"오프라인 전체 도구는 <strong>1회 $12</strong> 출시 예정입니다. 결제 설정 후 정식 판매합니다.",
"pill-one":"PDF 저장, 빠르게","pill-two":"내 데이터는 내 기기에",
"strip-one":"완전 오프라인","strip-two":"한국어 + English","strip-three":"월 구독료 없음","strip-four":"A4 PDF 출력",
"how-eyebrow":"서류 작업은 줄이고, 본업에 집중하세요","how-title":"세 단계면 완료.","how-copy":"복잡한 SaaS 설정 대신, 독립 사업자에게 필요한 핵심 기능을 깔끔하게 제공합니다.",
"step1-title":"파일 열기","step1-body":"압축파일을 풀고 HTML 파일을 여세요. 계정이나 인터넷이 필요하지 않습니다.",
"step2-title":"내용 입력","step2-body":"서비스 항목·수량·단가·세율·할인·결제 안내를 입력하세요.",
"step3-title":"PDF로 전달","step3-body":"A4 PDF 인쇄, 편집 가능한 JSON 백업, 장부용 CSV 내보내기를 지원합니다.",
"demo-eyebrow":"무료로 체험하는 견적 계산기","demo-title":"숫자를 바꾸고\n합계를 확인하세요.",
"demo-description":"한 개 항목의 견적 금액을 바로 계산해 보세요. 정식 다운로드 도구는 여러 항목, 영어·한국어 문서, PDF 출력과 백업 기능을 지원합니다.",
"demo-point1":"브라우저에서 즉시 계산","demo-point2":"입력값은 서버로 전송되지 않습니다","demo-point3":"표시 금액은 예시이며 실제 세금 규정을 확인하세요",
"demo-cta":"출시 알림 받기 ↗","calc-title":"간편 견적 계산","calc-rate":"단가 (USD)","calc-qty":"수량","calc-discount":"할인율 (%)","calc-tax":"세율 (%)",
"res-subtotal":"소계","res-discount":"할인","res-tax":"예상 세금","res-total":"견적 합계",
"calc-note":"예시 계산용이며 법적 청구서나 세무 자문이 아닙니다. 달러(USD) 금액입니다.",
"features-tag":"불필요한 기능 없이 핵심만","features-title":"작은 파일 하나,\n확실히 간편한 작업.",
"feature1":"A4 PDF 맞춤 레이아웃","feature1-body":"견적서·청구서를 깔끔한 서식으로 인쇄합니다.",
"feature2":"영어와 한국어 지원","feature2-body":"언어 설정 하나로 메뉴와 문서 제목을 전환합니다.",
"feature3":"7가지 표시 통화","feature3-body":"USD, KRW, EUR, GBP, JPY, AUD, CAD. 환율 변환 기능은 아닙니다.",
"feature4":"문서를 파일로 보관","feature4-body":"JSON 백업, CSV 추출, PDF 인쇄. 방문자 추적 없음.",
"faq-title":"시작 전 궁금한 점.",
"faq1-q":"PaperPilot을 지금 구매할 수 있나요?",
"faq1-a":"아직 판매 전입니다. 상품 파일은 준비됐지만 판매자 정산 확인이 필요합니다. 결제 설정이 완료되면 알림을 드릴 수 있습니다. 결제가 가능해지기 전에는 구매를 받지 않습니다.",
"faq2-q":"정말 인터넷 없이 작동하나요?",
"faq2-a":"예. 다운로드한 HTML·CSS·자바스크립트 파일이 브라우저에서 동작합니다. 별도 서버나 분석 추적 기능 없이 문서를 기기에서 작성합니다.",
"faq3-q":"국세청 전자세금계산서를 발급하나요?",
"faq3-a":"아니요. 인쇄 가능한 견적서·청구서 작성 도구이며 국세청 전자세금계산서 발급 시스템은 아닙니다. 세무·법적 의무를 따로 확인하세요.",
"faq4-q":"원화/달러 환율도 계산하나요?",
"faq4-a":"아니요. 통화 선택은 숫자 표시 형식과 기호를 바꿀 뿐 환율을 자동 계산하지 않습니다. 원하는 통화의 금액을 직접 입력하세요.",
"faq5-q":"우리 회사에 맞게 커스터마이징할 수 있나요?",
"faq5-a":"필요한 기능을 이메일로 알려주시면 범위를 확인하고 견적을 협의할 수 있습니다. 계약과 결제 수단을 상호 확인하기 전에는 유료 작업을 시작하지 않습니다.",
"closing-tag":"지금부터 준비하세요","closing-h2":"서류 시간은 줄이고.\n일의 완성도는 높이고.",
"closing-body":"출시 예정입니다. 알림 신청에는 계정도 결제도 필요 없습니다.",
"closing-cta":"출시 알림 신청 ↗","footer":"단순하고 정직한 생산성 도구.","footer-contact":"문의"
};
const original=new Map([...document.querySelectorAll("[data-i18n]")].map(el=>[el,el.innerHTML]));
const langButton=document.getElementById("lang"),label=document.getElementById("lang-label");
let lang="en";
function setLanguage(language){
 lang=language==="ko"?"ko":"en";
 document.documentElement.lang=lang;
 for(const [el,en] of original.entries()){
   const key=el.dataset.i18n;
   if(lang==="en"){el.innerHTML=en;continue;}
   if(!Object.prototype.hasOwnProperty.call(korean,key))continue;
   const text=korean[key];
   if(key==="price-note"){el.innerHTML=text;continue;}
   el.textContent=text;
 }
 label.textContent=lang==="ko"?"EN":"한국어";
 document.title=lang==="ko"?"PaperPilot — 오프라인 견적서·청구서 도구":"PaperPilot — Private, Offline Bilingual Invoice Maker (EN/KR)";
 if(lang==="ko"){document.querySelectorAll("[data-i18n='demo-title'],[data-i18n='features-title'],[data-i18n='closing-h2'],[data-i18n='hero-h1']").forEach(el=>el.textContent=korean[el.dataset.i18n].replace(/\\n/g,"\n"));}
 try{localStorage.setItem("paperpilot-landing-language",lang)}catch{}
}
langButton.addEventListener("click",()=>setLanguage(lang==="en"?"ko":"en"));
try{if(localStorage.getItem("paperpilot-landing-language")==="ko")setLanguage("ko");}catch{}
const $=id=>document.getElementById(id);
function amount(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}
function num(id,min,max){
 const raw=$(id).value, n=Number(raw);
 return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min;
}
function dollars(v){return Math.round((v+Number.EPSILON)*100)/100}
function recalc(){
 const rate=num("rate",0,1e7),qty=num("qty",0,1e5),discount=num("discount",0,100),tax=num("tax",0,100);
 const subtotal=dollars(rate*qty),rebate=dollars(subtotal*discount/100);
 const taxable=dollars(Math.max(0,subtotal-rebate)),taxValue=dollars(taxable*tax/100),total=dollars(taxable+taxValue);
 $("subtotal").textContent=amount(subtotal);
 $("discount-value").textContent="−"+amount(rebate);
 $("tax-value").textContent=amount(taxValue);
 $("total").textContent=amount(total);
}
for(const id of ["rate","qty","discount","tax"]){$(id).addEventListener("input",recalc);}
recalc();
})();
