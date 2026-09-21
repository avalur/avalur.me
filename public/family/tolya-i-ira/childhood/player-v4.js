
(() => {
  'use strict';
  const data = window.FAMILY_FILM;
  const video = document.getElementById('film');
  if (!data || !video || !Array.isArray(data.shots)) return;
  const photos = [...document.querySelectorAll('.shot')];
  const chapters = [...document.querySelectorAll('.chapter-jump')];
  const music = [...document.querySelectorAll('.music-jump')];
  const photoChapters = JSON.parse(document.getElementById('photo-chapters').textContent);
  const titleCards = (data.titleCards || []).map(card => ({...card, isTitle: true}));
  const segments = [...data.shots, ...titleCards].sort((a, b) => a.start - b.start);
  const cues = data.musicCues || [];
  const label = seconds => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  };
  let pending = null;
  function segmentAt(time, candidates) {
    let current;
    for (const segment of candidates) {
      if (time < segment.start || time >= segment.end) continue;
      if (!current || time >= (segment.start + Math.min(current.end, segment.end)) / 2) current = segment;
    }
    return current;
  }
  function mark(button, selected) {
    if (selected) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
  function update() {
    const time = video.currentTime || 0;
    const current = segmentAt(time, segments);
    const cue = segmentAt(time, cues);
    const photoId = current && !current.isTitle ? current.id : null;
    const titlePhoto = current?.before_photo || current?.before_photo_id;
    const chapter = photoChapters[photoId || titlePhoto];
    const chapterAtTime = [...chapters].reverse().find(button => time >= Number(button.dataset.start));
    document.getElementById('current-photo').textContent = current ? (current.isTitle ? current.title : current.id) : 'Титры';
    document.getElementById('current-note').textContent = photoId ? (current.note || '') : '';
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : data.duration;
    document.getElementById('playback-time').textContent = `${label(time)} / ${label(Math.round(duration))}`;
    for (const button of photos) mark(button, button.dataset.photo === photoId);
    for (const button of chapters) mark(button, chapterAtTime ? button === chapterAtTime : chapter === button.dataset.chapter);
    for (const button of music) mark(button, cues[Number(button.dataset.cue)] === cue);
  }
  function seek(time) {
    if (!Number.isFinite(time) || time < 0) return;
    if (video.readyState >= 1) {
      video.currentTime = Math.min(time, Number.isFinite(video.duration) ? video.duration : time);
      update();
    } else {
      pending = time;
      video.load();
    }
  }
  function revealVideo() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    video.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'center'});
  }
  for (const button of [...photos, ...chapters]) button.addEventListener('click', () => {
    const shot = data.shots.find(item => item.id === button.dataset.photo);
    if (!shot) return;
    const titleStart = Number(button.dataset.titleStart);
    seek(button.hasAttribute('data-title-start') && Number.isFinite(titleStart)
      ? titleStart + 0.6 : shot.start + Math.min(1.05, (shot.end - shot.start) / 2));
    revealVideo();
  });
  for (const button of music) button.addEventListener('click', () => {
    const cue = cues[Number(button.dataset.cue)];
    if (!cue) return;
    seek(cue.start);
    revealVideo();
  });
  video.addEventListener('loadedmetadata', () => {
    if (pending !== null) {const time = pending; pending = null; seek(time)}
    update();
  });
  for (const event of ['timeupdate', 'seeked', 'durationchange']) video.addEventListener(event, update);
  video.addEventListener('error', () => {document.getElementById('video-error').hidden = false});
  video.addEventListener('loadeddata', () => {document.getElementById('video-error').hidden = true});
  update();
})();
