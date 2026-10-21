const homeCardName = document.querySelector('.home-card-name');
const homeCardPagination = document.querySelector('.home-card-pagination');
let homeCardSyncFrame;

function getCenteredHomeCard() {
  const cards = [...cardTrack.querySelectorAll('.outfit-card')];
  const viewport = cardViewport.getBoundingClientRect();
  const center = viewport.left + viewport.width / 2;
  return cards.reduce((closest, card) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - center);
    return !closest || distance < closest.distance ? { card, distance } : closest;
  }, null)?.card;
}

function syncHomeCardNavigation() {
  const cards = [...cardTrack.querySelectorAll('.outfit-card')];
  const current = getCenteredHomeCard();
  cards.forEach((card, index) => {
    if (!card.dataset.cardName) card.dataset.cardName = '我的搭配';
    card.setAttribute('aria-label', `${card.dataset.cardName} · 卡片 ${index + 1}`);
  });
  if (!homeCardName.querySelector('input')) homeCardName.textContent = current?.dataset.cardName || '我的搭配';
  if (homeCardPagination.children.length !== cards.length) {
    homeCardPagination.replaceChildren();
    cards.forEach((card, index) => {
      const dot = document.createElement('button');
      dot.type = 'button'; dot.className = 'home-card-dot';
      dot.addEventListener('click', () => goToCard(index));
      homeCardPagination.append(dot);
    });
  }
  [...homeCardPagination.children].forEach((dot, index) => {
    const active = cards[index] === current;
    dot.classList.toggle('is-active', active);
    dot.setAttribute('aria-label', `第 ${index + 1} 张卡片：${cards[index].dataset.cardName}`);
    if (active) dot.setAttribute('aria-current', 'page');
    else dot.removeAttribute('aria-current');
  });
}

function scheduleHomeCardSync() {
  cancelAnimationFrame(homeCardSyncFrame);
  homeCardSyncFrame = requestAnimationFrame(syncHomeCardNavigation);
}

function renameHomeCard() {
  if (homeCardName.querySelector('input')) return;
  const card = getCenteredHomeCard();
  if (!card) return;
  const input = document.createElement('input');
  input.className = 'home-card-name-input';
  input.value = card.dataset.cardName || '我的搭配';
  input.maxLength = 40;
  input.setAttribute('aria-label', '卡片名称');
  homeCardName.replaceChildren(input);
  let finished = false;
  function finish(cancel = false) {
    if (finished) return;
    finished = true;
    if (!cancel) card.dataset.cardName = input.value.trim() || card.dataset.cardName || '我的搭配';
    homeCardName.replaceChildren();
    syncHomeCardNavigation();
  }
  input.addEventListener('blur', () => finish());
  input.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.isComposing) return;
    if (event.key === 'Enter') { event.preventDefault(); finish(); }
    if (event.key === 'Escape') finish(true);
  });
  input.focus(); input.select();
}

homeCardName.addEventListener('dblclick', renameHomeCard);
homeCardName.addEventListener('keydown', event => {
  if (event.target === homeCardName && event.key === 'Enter') renameHomeCard();
});
cardViewport.addEventListener('scroll', scheduleHomeCardSync, { passive: true });
new MutationObserver(scheduleHomeCardSync).observe(cardTrack, { childList: true });
new ResizeObserver(scheduleHomeCardSync).observe(cardViewport);
window.addEventListener('popstate', scheduleHomeCardSync);
syncHomeCardNavigation();
