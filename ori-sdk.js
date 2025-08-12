<script>
(function(w,d){
  const API = 'http://localhost:5678/webhook-test/ori-sessions'; // <-- troque
  const ctxKey = 'ori_ctx';
  const sidKey = 'ori_sid';

  // 1) sessionId
  let sid = localStorage.getItem(sidKey);
  if (!sid) {
    sid = (crypto.randomUUID && crypto.randomUUID()) || (Date.now()+'-'+Math.random());
    localStorage.setItem(sidKey, sid);
  }

  // 2) UTM helpers
  function readUTM() {
    const p = new URLSearchParams(location.search);
    const utm = {
      utm_source:  p.get('utm_source'),
      utm_medium:  p.get('utm_medium'),
      utm_campaign:p.get('utm_campaign'),
      utm_term:    p.get('utm_term'),
      utm_content: p.get('utm_content'),
    };
    // só guarda se houver pelo menos 1 utm
    return Object.values(utm).some(Boolean) ? utm : null;
  }
  function ensureCtx() {
    const saved = JSON.parse(localStorage.getItem(ctxKey) || '{}');
    if (!saved.utm) {
      const utm = readUTM();
      if (utm) {
        saved.utm = utm;
        saved.first_url = location.href;
        saved.referrer = document.referrer || null;
        localStorage.setItem(ctxKey, JSON.stringify(saved));
      }
    }
    return JSON.parse(localStorage.getItem(ctxKey) || '{}');
  }
  const ctx = ensureCtx();

  // 3) envio robusto
  function send(payload){
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        return navigator.sendBeacon(API, new Blob([body], {type:'application/json'}));
      }
      return fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body});
    } catch(e){}
  }

  // 4) envia page_view
  send({
    type:'page_view',
    sessionId: sid,
    url: location.href,
    referer: document.referrer || null,
    utm: ctx.utm || readUTM(),
    timestamp: new Date().toISOString()
  });

  // 5) serialização de formulário (evita dados sensíveis)
  function serializeForm(form){
    const data = {};
    form.querySelectorAll('input, select, textarea').forEach(el=>{
      const name = el.name || el.id;
      if(!name) return;
      const type = (el.type||'').toLowerCase();
      // ignore campos sensíveis
      if (['password'].includes(type)) return;
      if (/(password|senha|card|credit|cvv|cvc)/i.test(name)) return;

      if (type === 'checkbox') data[name] = !!el.checked;
      else if (type === 'radio') { if (el.checked) data[name] = el.value; }
      else data[name] = el.value;
    });
    return data;
  }

  function trackForm(form){
    const formId = form.getAttribute('id') || form.getAttribute('name') || 'no-id';
    let timer = null;
    const sendUpdate = ()=>{
      const snapshot = serializeForm(form);
      send({
        type:'form_update',
        sessionId: sid,
        url: location.href,
        referer: document.referrer || null,
        utm: ctx.utm || readUTM(),
        formId,
        formData: snapshot,
        timestamp: new Date().toISOString()
      });
    };
    const debounced = ()=>{
      clearTimeout(timer);
      timer = setTimeout(sendUpdate, 1200); // evita spam (1,2s)
    };
    form.addEventListener('input',  debounced, true);
    form.addEventListener('change', debounced, true);
    form.addEventListener('submit', ()=>{
      send({
        type:'form-submit',
        sessionId: sid,
        url: location.href,
        referer: document.referrer || null,
        utm: ctx.utm || readUTM(),
        formId,
        formData: serializeForm(form),
        timestamp: new Date().toISOString()
      });
    });
    w.addEventListener('beforeunload', sendUpdate);
  }

  function init(){
    d.querySelectorAll('form').forEach(trackForm);
  }
  if (document.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
</script>
