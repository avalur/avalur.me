const russianPlural = new Intl.PluralRules('ru');

export function photoCountLabel(count: number): string {
  const form = russianPlural.select(count);
  const noun = form === 'one' ? 'фотография' : form === 'few' ? 'фотографии' : 'фотографий';
  return `${count} ${noun}`;
}

export function livePhotoCountLabel(count: number): string {
  return `${count} ${russianPlural.select(count) === 'one' ? 'живое фото' : 'живых фото'}`;
}
