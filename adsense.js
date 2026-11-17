(() => {
  // One manual placement; consent is managed by the published Google CMP.
  const config = {enabled:true, client:'ca-pub-1548422917384062', slot:'6538389469'};
  window.googlefc=window.googlefc||{};
  window.googlefc.callbackQueue=window.googlefc.callbackQueue||[];
  const privacyButton=document.getElementById('ad-privacy-options');
  window.googlefc.callbackQueue.push({CONSENT_API_READY:()=>{
    if(privacyButton)privacyButton.hidden=false;
  }});
  if(privacyButton)privacyButton.addEventListener('click',()=>{
    window.googlefc.callbackQueue.push({CONSENT_API_READY:()=>window.googlefc.showRevocationMessage()});
  });
  const section=document.getElementById('teveo-ad-home');
  if(!section || !config.enabled || !/^ca-pub-\d{16}$/.test(config.client) || !/^\d+$/.test(config.slot))return;
  const ad=section.querySelector('ins');
  ad.dataset.adClient=config.client;ad.dataset.adSlot=config.slot;
  section.hidden=false;
  const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
  script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+config.client;
  script.onerror=()=>{section.hidden=true;};
  document.head.append(script);
  (window.adsbygoogle=window.adsbygoogle||[]).push({});
})();
