
(() => {
  'use strict';
  const data=window.FAMILY_FILM, video=document.getElementById('film');
  if(!data||!video)return;
  const shots=data.shots, buttons=[...document.querySelectorAll('.shot')];
  const label=s=>{s=Math.max(0,Math.floor(s||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  let pending=null;
  function currentAt(time){let current;for(const shot of shots){if(time<shot.start||time>=shot.end)continue;if(!current||time>=(shot.start+Math.min(current.end,shot.end))/2)current=shot}return current}
  function update(){const current=currentAt(video.currentTime);document.getElementById('current-photo').textContent=current?current.id:'Титры';document.getElementById('current-note').textContent=current?current.note:'';document.getElementById('playback-time').textContent=`${label(video.currentTime)} / ${label(Math.round(video.duration||data.duration))}`;for(const button of buttons){if(current&&button.dataset.photo===current.id)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')}}
  for(const button of buttons)button.addEventListener('click',()=>{const shot=shots.find(s=>s.id===button.dataset.photo);if(!shot)return;const t=shot.start+Math.min(1.05,(shot.end-shot.start)/2);if(video.readyState>=1){video.currentTime=t;update()}else{pending=t;video.load()}video.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})});
  video.addEventListener('loadedmetadata',()=>{if(pending!==null){video.currentTime=pending;pending=null}update()});
  for(const event of ['timeupdate','seeked','durationchange'])video.addEventListener(event,update);
  video.addEventListener('error',()=>{document.getElementById('video-error').hidden=false});
  update();
})();
