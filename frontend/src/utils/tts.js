export const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = navigator.language?.startsWith('pl') ? 'pl-PL' : 'en-US';
  u.lang = lang;
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
};

export const stopSpeak = () => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
};
