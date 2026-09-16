(() => {
  'use strict';
  const dataElement = document.getElementById('page-data');
  if (!dataElement) return;
  const data = JSON.parse(dataElement.textContent);
  const allPhotos = [...data.photos, ...data.archivePhotos];
  const dialog = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-image');
  const motion = document.getElementById('lightbox-motion');
  const motionToggle = document.getElementById('lightbox-motion-toggle');
  const canvas = dialog.querySelector('.lightbox-canvas');
  const counter = document.getElementById('lightbox-counter');
  const caption = document.getElementById('lightbox-caption');
  const original = document.getElementById('lightbox-original');
  const close = document.getElementById('lightbox-close');
  let activePhotos = data.photos;
  let photoIndex = 0;
  let returnFocus = null;
  let touchStart = null;
  function asset(path) { return path; }
  function stopMotion(restoreFocus = true) {
    if (!motion) return;
    const hadFocus = document.activeElement === motion;
    motion.pause();
    motion.hidden = true;
    image.hidden = false;
    canvas.classList.remove('has-motion');
    motionToggle.textContent = 'Оживить снимок';
    motionToggle.setAttribute('aria-pressed', 'false');
    if (restoreFocus && hadFocus && dialog.open && !motionToggle.hidden) motionToggle.focus({ preventScroll: true });
  }
  function showPhoto(index) {
    const hadMotionFocus = document.activeElement === motion || document.activeElement === motionToggle;
    stopMotion(false);
    photoIndex = (index + activePhotos.length) % activePhotos.length;
    const photo = activePhotos[photoIndex];
    image.src = asset(photo.src);
    image.alt = photo.alt || photo.caption;
    counter.textContent = `${photo.year ? 'Из архива · ' + photo.year + ' · ' : ''}${photoIndex + 1} / ${activePhotos.length}`;
    caption.textContent = photo.caption;
    original.href = asset(photo.src);
    document.getElementById('lightbox-prev').hidden = activePhotos.length < 2;
    document.getElementById('lightbox-next').hidden = activePhotos.length < 2;
    if (motionToggle) {
      const clip = data.videos.find(item => item.id === photo.liveVideoId && item.displayKind === 'live');
      motionToggle.hidden = !clip;
      motionToggle.disabled = !clip;
      if (hadMotionFocus && dialog.open) (clip ? motionToggle : close).focus({ preventScroll: true });
    }
    const next = new Image();
    next.src = asset(activePhotos[(photoIndex + 1) % activePhotos.length].src);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-photo]');
    if (!button) return;
    const photo = allPhotos.find(item => String(item.id) === button.dataset.photo);
    if (!photo) return;
    activePhotos = data.archivePhotos.some(item => item.id === photo.id) ? data.archivePhotos : data.photos;
    document.getElementById('trip-video')?.pause();
    returnFocus = button;
    showPhoto(activePhotos.findIndex(item => item.id === photo.id));
    dialog.showModal();
    document.body.classList.add('modal-open');
    close.focus();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stopMotion(false);
    document.body.classList.remove('modal-open');
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  });
  motionToggle?.addEventListener('click', () => {
    if (!motion.hidden) {
      stopMotion();
      return;
    }
    const photo = activePhotos[photoIndex];
    const clip = data.videos.find(item => item.id === photo.liveVideoId && item.displayKind === 'live');
    if (!clip) return;
    motion.src = asset(clip.src);
    motion.poster = asset(photo.src);
    motion.setAttribute('aria-label', clip.title);
    image.hidden = true;
    motion.hidden = false;
    canvas.classList.add('has-motion');
    motionToggle.textContent = 'Показать фотографию';
    motionToggle.setAttribute('aria-pressed', 'true');
    // Native controls remain available if the browser declines playback.
    motion.play().catch(() => {});
  });
  motion?.addEventListener('ended', () => stopMotion());
  document.getElementById('lightbox-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
  document.getElementById('lightbox-next').addEventListener('click', () => showPhoto(photoIndex + 1));
  dialog.addEventListener('keydown', event => {
    if (event.target === motion) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  image.addEventListener('touchstart', event => { touchStart = [event.touches[0].clientX, event.touches[0].clientY]; }, { passive: true });
  image.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart[0];
    const dy = event.changedTouches[0].clientY - touchStart[1];
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  const more = document.getElementById('gallery-more');
  if (more) more.addEventListener('click', () => {
    const expanded = more.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.gallery-extra').forEach(card => card.hidden = expanded);
    more.setAttribute('aria-expanded', String(!expanded));
    more.querySelector('span').textContent = expanded ? `Все фотографии (${data.photos.length})` : 'Свернуть альбом';
    document.getElementById('gallery-status').textContent = `Фотографии: показано ${expanded ? Math.min(12, data.photos.length) : data.photos.length} из ${data.photos.length}`;
    if (expanded) document.getElementById('photos').scrollIntoView({ block: 'start' });
  });
  const video = document.getElementById('trip-video');
  function selectVideo(id, moveFocus = false) {
    const clip = data.videos.find(item => String(item.id) === String(id));
    if (!clip || !video) return false;
    video.pause();
    video.poster = asset(clip.poster);
    video.src = asset(clip.src);
    video.setAttribute('aria-label', clip.title);
    document.getElementById('video-title').textContent = clip.title;
    document.getElementById('video-length').textContent = clip.durationLabel;
    document.querySelectorAll('[data-video]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.video === String(id))));
    document.querySelectorAll('[data-video-kind]').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.videoKind === clip.displayKind)));
    document.querySelectorAll('[data-clip-kind]').forEach(choice => choice.hidden = choice.dataset.clipKind !== clip.displayKind);
    if (moveFocus) video.focus({ preventScroll: true });
    return true;
  }
  document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => selectVideo(button.dataset.video)));
  document.querySelectorAll('[data-video-kind]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.videoKind;
    const first = data.videos.find(clip => clip.displayKind === kind);
    if (first) selectVideo(first.id);
  }));
  document.querySelectorAll('[data-story-video]').forEach(link => link.addEventListener('click', event => {
    if (!selectVideo(link.dataset.storyVideo, true)) return;
    event.preventDefault();
    document.getElementById('video').scrollIntoView({ block: 'start' });
  }));
  if (data.videos.length) selectVideo(data.videos[0].id);
})();
