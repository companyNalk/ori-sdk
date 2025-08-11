(function(window){
  function capture() {
    const params = new URLSearchParams(window.location.search);
    const utm = {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      term: params.get('utm_term'),
      content: params.get('utm_content')
    };
    const data = {
      url: window.location.href,
      utm,
      ref: document.referrer,
    };
    fetch('http://localhost:5678/webhook/ori-sessions', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
  }
  window.addEventListener('load', capture);
})(window);

