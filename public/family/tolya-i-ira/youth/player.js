
(() => {
  'use strict';
  const data=window.FAMILY_FILM, video=document.getElementById('film');
  if(!data||!video||!Array.isArray(data.shots))return;
  const shots=data.shots, photos=[...document.querySelectorAll('.shot')];
  const chapterButtons=[...document.querySelectorAll('.chapter-jump')];
  const photoChapters=JSON.parse(document.getElementById('photo-chapters').textContent);
  const label=seconds=>{const s=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  let pending=null;
  function currentAt(time){let current;for(const shot of shots){if(time<shot.start||time>=shot.end)continue;if(!current||time>=(shot.start+Math.min(current.end,shot.end))/2)current=shot}return current}
  function update(){
    const current=currentAt(video.currentTime||0);
    document.getElementById('current-photo').textContent=current?current.id:'Титры';
    document.getElementById('current-note').textContent=current?(current.note||''):'';
    const duration=Number.isFinite(video.duration)&&video.duration>0?video.duration:data.duration;
    document.getElementById('playback-time').textContent=`${label(video.currentTime)} / ${label(Math.round(duration))}`;
    for(const button of photos){if(current&&button.dataset.photo===current.id)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')}
    for(const button of chapterButtons){if(current&&button.dataset.chapter===photoChapters[current.id])button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')}
  }
  function seek(time){
    if(video.readyState>=1){video.currentTime=Math.min(time,Number.isFinite(video.duration)?video.duration:time);update()}
    else{pending=time;video.load()}
  }
  for(const button of [...photos,...chapterButtons])button.addEventListener('click',()=>{
    const shot=shots.find(s=>s.id===button.dataset.photo);if(!shot)return;
    seek(shot.start+Math.min(1.05,(shot.end-shot.start)/2));
    video.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  });
  video.addEventListener('loadedmetadata',()=>{if(pending!==null){const time=pending;pending=null;seek(time)}update()});
  for(const event of ['timeupdate','seeked','durationchange'])video.addEventListener(event,update);
  video.addEventListener('error',()=>{document.getElementById('video-error').hidden=false});
  video.addEventListener('loadeddata',()=>{document.getElementById('video-error').hidden=true});
  update();
})();
