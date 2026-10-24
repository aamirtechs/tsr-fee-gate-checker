"use strict";
// TSR Fee Gate Checker: core logic. Pure functions, no DOM, no fetch.
function parseDate(s){const m=String(s||"").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));const d=new Date(String(s||"").trim());return isNaN(d.getTime())?null:new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));}
function fmtDate(d){return d?d.toISOString().slice(0,10):"";}
function parseCSV(text){
  const rows=[];let row=[],cur="",q=false;const s=String(text||"");
  for(let i=0;i<s.length;i++){const c=s[i];
    if(q){if(c==='"'){if(s[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
    else if(c==='"')q=true;
    else if(c===","){row.push(cur);cur="";}
    else if(c==="\n"){row.push(cur);rows.push(row);row=[];cur="";}
    else if(c!=="\r")cur+=c;}
  if(cur!==""||row.length){row.push(cur);rows.push(row);}
  return rows.filter(r=>r.some(c=>String(c).trim()!==""));
}
function norm(h){return String(h||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}
function yes(v){return /^(yes|y|true|1)$/i.test(String(v||"").trim());}
function num(v){const n=Number(String(v==null?"":v).replace(/[$,]/g,"").trim());return isNaN(n)?null:n;}
function parseRows(text){
  const grid=parseCSV(text);if(grid.length<2)return{rows:[],errors:["CSV needs a header row plus data rows"]};
  const header=grid[0].map(norm);const rows=[];const errors=[];
  for(let i=1;i<grid.length;i++){const o={};header.forEach((h,j)=>{o[h]=(grid[i][j]||"").trim();});
    rows.push({consumer_ref:o.consumer_ref||"",debt_id:o.debt_id||"",creditor:o.creditor||"",enrolled_debt:num(o.enrolled_debt),settled:o.settled||"",settlement_amount:num(o.settlement_amount),agreement_date:o.agreement_date||"",first_payment_date:o.first_payment_date||"",fee_amount:num(o.fee_amount),fee_date:o.fee_date||"",state:(o.state||"").toUpperCase()});}
  return{rows,errors};
}
function defaultCaps(){return{WA:{capPercent:15,basis:"enrolled"},IL:{capPercent:15,basis:"savings"},CT:{capPercent:10,basis:"savings"}};}
function parseCaps(input){
  let obj=input;if(typeof input==="string"){obj=JSON.parse(input);}
  const out={};Object.keys(obj||{}).forEach(k=>{const v=obj[k]||{};const pct=Number(v.capPercent!=null?v.capPercent:v.percent);const basis=String(v.basis||"enrolled").toLowerCase();
    if(!isNaN(pct)&&(basis==="enrolled"||basis==="savings"))out[k.toUpperCase()]={capPercent:pct,basis};});
  return out;
}
function evaluateDebt(row,caps){
  const failures=[];const capTable=caps||defaultCaps();
  const fee=row.fee_amount;
  if(fee==null)failures.push("missing data: fee_amount");
  if(row.enrolled_debt==null)failures.push("missing data: enrolled_debt");
  if(!row.fee_date)failures.push("missing data: fee_date");
  if(!row.settled)failures.push("missing data: settled");
  const feeDate=parseDate(row.fee_date);
  if(fee!=null&&fee>0){
    if(!yes(row.settled))failures.push("fee before settlement");
    if(!row.agreement_date)failures.push("missing data: agreement_date");
    else{const ad=parseDate(row.agreement_date);if(feeDate&&ad&&feeDate<ad)failures.push("fee before agreement");}
    if(!row.first_payment_date)failures.push("missing data: first_payment_date");
    else{const pd=parseDate(row.first_payment_date);if(feeDate&&pd&&feeDate<pd)failures.push("fee before first payment");}
  }
  let capLimit=null,capBasis="",savings=null;
  if(row.enrolled_debt!=null&&row.settlement_amount!=null)savings=Math.round((row.enrolled_debt-row.settlement_amount)*100)/100;
  const cap=capTable[(row.state||"").toUpperCase()];
  if(cap&&fee!=null){
    capBasis=cap.basis;
    if(cap.basis==="enrolled"&&row.enrolled_debt!=null)capLimit=Math.round(row.enrolled_debt*cap.capPercent)/100;
    if(cap.basis==="savings"){if(savings==null)failures.push("missing data: settlement_amount for savings basis cap");else capLimit=Math.round(savings*cap.capPercent)/100;}
    if(capLimit!=null&&fee>capLimit+0.005)failures.push("fee exceeds cap on "+cap.basis+" basis");
  }
  const dedup=[...new Set(failures)];
  return{consumer_ref:row.consumer_ref,debt_id:row.debt_id,creditor:row.creditor,state:row.state,status:dedup.length?"fail":"pass",failures:dedup,fee_amount:fee,enrolled_debt:row.enrolled_debt,settlement_amount:row.settlement_amount,savings,capLimit,capBasis};
}
function evaluateAll(rows,caps){
  const results=(rows||[]).map(r=>evaluateDebt(r,caps));
  const summary={total:results.length,pass:results.filter(r=>r.status==="pass").length,fail:results.filter(r=>r.status==="fail").length,totalFees:Math.round(results.reduce((a,r)=>a+(r.fee_amount||0),0)*100)/100,flaggedFees:Math.round(results.filter(r=>r.status==="fail").reduce((a,r)=>a+(r.fee_amount||0),0)*100)/100};
  return{results,summary};
}
function csvEscape(v){const s=String(v==null?"":v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function buildAuditCSV(results){
  const rows=[["consumer_ref","debt_id","creditor","state","status","failures","fee_amount","enrolled_debt","settlement_amount","savings","cap_limit","cap_basis"]];
  (results||[]).forEach(r=>rows.push([r.consumer_ref,r.debt_id,r.creditor,r.state,r.status,r.failures.join("; "),r.fee_amount,r.enrolled_debt,r.settlement_amount,r.savings,r.capLimit,r.capBasis]));
  return rows.map(r=>r.map(csvEscape).join(",")).join("\n")+"\n";
}
const api={parseDate,fmtDate,parseCSV,parseRows,yes,num,defaultCaps,parseCaps,evaluateDebt,evaluateAll,buildAuditCSV,csvEscape};
if(typeof module!=="undefined"&&module.exports){module.exports=api;}
if(typeof window!=="undefined"){window.TsrFeeGateChecker=api;}
