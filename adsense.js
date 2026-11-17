(() => {
  // Enable only after the real publisher/unit IDs and Google CMP are configured.
  const config = {enabled:false, client:'ca-pub-1548422917384062', slot:''};
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
