'use strict';
import {getPlan, safeId} from './koinly-import-triage.mjs';
// Only fixed trusted text from local module is rendered. User tax records are never read.
const select = document.getElementById('issue');
const title = document.getElementById('plan-title');
const description = document.getElementById('plan-description');
const steps = document.getElementById('plan-steps');
const source = document.getElementById('plan-source');
const offer = document.getElementById('plan-offer');
function show(id) {
  const key = safeId(id);
  const plan = getPlan(key);
  select.value = key;
  title.textContent = plan.heading;
  description.textContent = plan.explanation;
  steps.replaceChildren(...plan.steps.map(s => {
    const li = document.createElement('li');
    li.textContent = s;
    return li;
  }));
  source.href = plan.source;
  source.textContent = plan.sourceTitle + ' (official ↗)';
  offer.textContent = plan.offer;
}
show(new URLSearchParams(location.search).get('issue'));
select.addEventListener('change', () => show(select.value));
