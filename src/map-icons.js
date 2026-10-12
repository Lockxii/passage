const svg=body=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const train='<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 11h14M12 3v8M8 18l-2 3m10-3 2 3"/><path d="M8 14h.01M16 14h.01"/>';
const bus='<rect x="4" y="3" width="16" height="16" rx="4"/><path d="M4 11h16M12 3v8M7 19v2m10-2v2M7 15h.01M17 15h.01"/>';
const tram='<path d="M9 1h6m-3 0v3"/>'+train;
export function reportIcon(mode,photo=false){
 return `<span class="report-bubble">${svg(({bus,metro:train,tram})[mode]||bus)}<span class="report-alert">!</span>${photo?'<span class="report-photo-dot" title="Photo jointe"></span>':''}</span><span class="report-tip"></span>`;
}
export const destinationIcon=svg('<path d="M6 22V3m0 1c4-4 8 4 12 0v10c-4 4-8-4-12 0"/>');
