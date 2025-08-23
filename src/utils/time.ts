export const toHHmm = (msOrTs: number | string) => {
  const d = new Date(typeof msOrTs === 'number' ? msOrTs : Number(msOrTs));
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};
