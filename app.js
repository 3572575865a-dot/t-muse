const navItems = document.querySelectorAll('.nav-item');
const toast = document.querySelector('.toast');
const cardViewport = document.querySelector('.card-viewport');
const cardTrack = document.querySelector('.card-track');
const detailPage = document.querySelector('.detail-page');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
function syncThemeColor() {
  themeColorMeta?.setAttribute('content', detailPage.hidden ? '#f4f0ea' : '#eae4dc');
}
new MutationObserver(syncThemeColor).observe(detailPage, { attributes: true, attributeFilter: ['hidden'] });
syncThemeColor();
const editToggle = document.querySelector('.edit-toggle');
const editorCanvas = document.querySelector('.editor-canvas');
const imageInput = document.querySelector('.image-input');
const deletePieceButton = document.querySelector('[data-action="delete-piece"]');
const reframePieceButton = document.querySelector('[data-action="reframe-piece"]');
const editorPanel = document.querySelector('.editor-panel');
const confirmEditButton = document.querySelector('[data-action="confirm-edit"]');
const categoryGrid = document.querySelector('.category-grid');
const imagePopover = document.querySelector('.image-popover');
const imageThumbnailList = document.querySelector('.image-thumbnail-list');
const homeCanvas = document.querySelector('.canvas');
const inspirationPage = document.querySelector('.inspiration-page');
const inspirationStage = document.querySelector('.inspiration-stage');
const inspirationSphere = document.querySelector('.inspiration-sphere');
const inspirationInput = document.querySelector('.inspiration-input');
const inspirationCount = document.querySelector('.inspiration-count');
const inspirationViewer = document.querySelector('.inspiration-viewer');
const inspirationViewerImage = document.querySelector('.inspiration-viewer-image');
const inspirationViewerBack = document.querySelector('.inspiration-viewer-back');
const mainAddButton = document.querySelector('[data-action="add"]');
const newOutfitButton = document.querySelector('.new-outfit-button');
const backgroundToggle = document.querySelector('.background-toggle');
const backgroundPanel = document.querySelector('.background-panel');
const backgroundList = document.querySelector('.background-list');
const addBackgroundButton = document.querySelector('.add-background');
const backgroundInput = document.querySelector('.background-input');
const backgroundOpacityControl = document.querySelector('.background-opacity-control');
const backgroundOpacity = document.querySelector('.background-opacity');
const backgroundOpacityValue = document.querySelector('.background-opacity-value');
let toastTimer;
let cardCount = 1;
const internalPageCount = 1;
let pieceCount = 0;
let selectedPiece;
let imageTarget;
let editGesture;
let popoverPiece;
let popoverHoldTimer;
let suppressPopoverClick = false;
let viewGesture;
let pageSwipeGesture;
const pieceImages = new Map();
const pieceDotTimers = new WeakMap();
const cardPageStates = new WeakMap();
let activeCard;
let activeCardPageIndex = 0;
let viewingFavoritePage = false;
let activePageIsFavorite = false;
const newPageButtonIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8"/></svg>';
newOutfitButton.innerHTML = newPageButtonIcon;
newOutfitButton.setAttribute('aria-label', '另存当前搭配为独立页面');
function setFavoritePageMode(enabled) {
  viewingFavoritePage = enabled;
  detailPage.classList.toggle('is-favorite-view', enabled);
  if (enabled) detailPage.classList.remove('is-editing', 'is-managing-images');
  pageSwipeGesture = null;
  newOutfitButton.innerHTML = enabled
    ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>'
    : newPageButtonIcon;
  newOutfitButton.setAttribute('aria-label', enabled ? '返回收藏库' : '另存当前搭配为独立页面');
}
const backgrounds = [
  { id: 'cafe-1', src: './assets/cafe-1.png', name: '咖啡厅1', opacity: 1 },
  { id: 'cafe-2', src: './assets/cafe-2.png', name: '咖啡厅2', opacity: 1 }
];
let activeBackgroundId;
let opacityEditorId;
let deleteBackgroundId;
let customBackgroundCount = 0;
let backgroundPanelTimer;
let backgroundHoldTimer;
let suppressBackgroundClick = false;
let activeTab = 'closet';
let inspirationPhotos = [];
const sphereLibraries = [{ name: '穿搭灵感', photos: inspirationPhotos, nodes: [], rotationX: -8, rotationY: 0 }];
let activeLibraryIndex = 0;
let inspirationGridMode = false;
const libraryName = document.querySelector('.library-name');
const libraryPagination = document.querySelector('.library-pagination');
const topLeftButton = document.querySelector('[data-action="settings"]');
const topRightButton = document.querySelector('[data-action="profile"]');
const heartIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21S1.5 14.8 1.5 8A5.7 5.7 0 0 1 12 4.8 5.7 5.7 0 0 1 22.5 8C22.5 14.8 12 21 12 21Z"/></svg>';
const originalTopLeft = heartIcon;
topLeftButton.innerHTML = heartIcon;
topLeftButton.setAttribute('aria-label', '打开收藏库');
const favoriteToggle = document.querySelector('.favorite-toggle');
const favoritesPage = document.querySelector('.favorites-page');
const favoritesList = document.querySelector('.favorites-list');
const itemFavorites = new Map();
const inspirationFavorites = new Map();
let currentViewerRecord;
const inspirationFavoriteButton = document.querySelector('.inspiration-viewer-favorite');
inspirationFavoriteButton.innerHTML = heartIcon;
inspirationFavoriteButton.addEventListener('click', () => {
  if (!currentViewerRecord) return;
  const record = currentViewerRecord;
  if (inspirationFavorites.has(record.src)) inspirationFavorites.delete(record.src);
  else inspirationFavorites.set(record.src, record);
  inspirationFavoriteButton.setAttribute('aria-pressed', String(inspirationFavorites.has(record.src)));
});
let favoritesTab = 'outfits';
document.querySelectorAll('[data-favorites-tab]').forEach(button => {
  button.addEventListener('click', () => {
    favoritesTab = button.dataset.favoritesTab;
    renderFavorites();
  });
});
favoriteToggle.innerHTML = heartIcon;

function updateFavoriteToggle() {
  const saved = Boolean(cardPageStates.get(activeCard)?.[activeCardPageIndex]?.favorite);
  favoriteToggle.setAttribute('aria-pressed', String(saved));
  favoriteToggle.setAttribute('aria-label', saved ? '取消收藏当前页' : '收藏当前页');
}
function renderFavorites() {
  favoritesList.replaceChildren();
  document.querySelectorAll('[data-favorites-tab]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.favoritesTab === favoritesTab));
  });
  const empty = document.querySelector('.favorites-empty');
  empty.textContent = favoritesTab === 'items'
    ? '在取景时收藏喜欢的单品'
    : '在搭配页点爱心，收藏这一页';
  if (favoritesTab !== 'outfits') {
    const collection = favoritesTab === 'items' ? itemFavorites : inspirationFavorites;
    if (favoritesTab === 'inspiration') empty.textContent = '在灵感大图中点爱心收藏';
    collection.forEach((record, key) => {
      const item = document.createElement('div');
      item.className = 'saved-item';
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'favorite-entry';
      const img = document.createElement('img');
      img.src = record.src;
      img.alt = record.name;
      const caption = document.createElement('span');
      caption.className = 'favorite-caption';
      caption.textContent = record.name;
      entry.append(img, caption);
      entry.addEventListener('click', () => openInspirationViewer(record, favoritesTab === 'inspiration'));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'saved-item-remove';
      remove.textContent = '♥';
      remove.setAttribute('aria-label', '取消收藏此单品');
      remove.addEventListener('click', () => {
        collection.delete(key);
        renderFavorites();
      });
      item.append(entry, remove);
      favoritesList.append(item);
    });
    empty.hidden = collection.size > 0;
    return;
  }
  [...cardTrack.querySelectorAll('.outfit-card')].forEach((card, cardIndex) => {
    (cardPageStates.get(card) || []).forEach((state, pageIndex) => {
      if (!state.favorite) return;
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'favorite-entry';
      const preview = document.createElement('span');
      preview.className = 'favorite-preview';
      const source = card.querySelectorAll('.card-page')[pageIndex]?.querySelector('.card-page-canvas');
      const background = card.querySelectorAll('.card-page')[pageIndex]?.querySelector('.card-preview-background');
      if (background) {
        const clone = background.cloneNode(true);
        if (state.favoriteBackground) {
          clone.style.setProperty('--detail-background-image', state.favoriteBackground.backgroundImage);
          clone.style.setProperty('--detail-background-opacity', state.favoriteBackground.backgroundOpacity);
          clone.classList.toggle('has-background', state.favoriteBackground.backgroundImage !== 'none');
        }
        preview.append(clone);
      }
      if (source) preview.append(source.cloneNode(true));
      const caption = document.createElement('span');
      caption.className = 'favorite-caption';
      caption.textContent = `穿搭 ${cardIndex + 1} · 第 ${pageIndex + 1} 页`;
      entry.append(preview, caption);
      entry.addEventListener('click', () => {
        setFavoritePageMode(true);
        favoritesPage.hidden = true;
        detailPage.hidden = false;
        loadCardPage(card, pageIndex);
        enterDetailPreview();
        window.history.pushState({ view: 'detail' }, '', '#detail');
      });
      favoritesList.append(entry);
    });
  });
  document.querySelector('.favorites-empty').hidden = Boolean(favoritesList.children.length);
  fitFavoritePreviews();
}
function fitFavoritePreviews() {
  favoritesList.querySelectorAll('.card-page-canvas').forEach(canvas => {
    const parent = canvas.parentElement;
    const width = Number(canvas.dataset.sourceWidth);
    const height = Number(canvas.dataset.sourceHeight);
    if (!width || !height || !parent.clientWidth) return;
    fitPreviewOutfit(canvas, parent.clientWidth, parent.clientHeight);
    fitPreviewBackground(parent, parent.clientWidth, parent.clientHeight);
  });
}
new ResizeObserver(fitFavoritePreviews).observe(favoritesList);
function openFavorites() {
  favoritesPage.hidden = false;
  renderFavorites();
  window.history.pushState({ view: 'favorites' }, '', '#favorites');
}
favoriteToggle.addEventListener('click', () => {
  const state = cardPageStates.get(activeCard)?.[activeCardPageIndex];
  if (!state) return;
  state.favorite = !state.favorite;
  if (state.favorite) {
    state.favoriteBackground = {
      backgroundId: activeBackgroundId,
      backgroundImage: detailPage.style.getPropertyValue('--detail-background-image') || 'none',
      backgroundOpacity: detailPage.style.getPropertyValue('--detail-background-opacity') || '1'
    };
  }
  captureActiveCardPage(false);
  updateFavoriteToggle();
});
document.querySelector('.favorites-back').addEventListener('click', () => {
  if (window.history.state?.view === 'favorites') window.history.back();
  else favoritesPage.hidden = true;
});
const originalTopRight = topRightButton.innerHTML;
const maxInspirationPhotos = 30;
let sphereRotationX = -8;
let sphereRotationY = 0;
let inspirationSphereRadius = 1;
let sphereGesture;
let sphereInertiaFrame;
let suppressInspirationClickUntil = 0;

const piecePresets = {
  top: { label: 'Top', width: 174, height: 144 },
  bottom: { label: 'Bottom', width: 174, height: 237 },
  dress: { label: 'Dress', width: 174, height: 270 },
  outwear: { label: 'Outwear', width: 138, height: 178 },
  shoes: { label: 'Shoes', width: 174, height: 96 },
  bag: { label: 'Bag', width: 142, height: 152 },
  accessories: { label: 'Accessories', width: 112, height: 112 }
};

function updateSystemTime() {
  const now = new Date();
  document.querySelector('.system-time').textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

updateSystemTime();
window.setInterval(updateSystemTime, 30000);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 1500);
}

function layoutInspirationPhotos() {
  const cards = [...inspirationSphere.querySelectorAll('.inspiration-photo')];
  if (!cards.length) return;
  const radius = Math.min(inspirationStage.clientWidth * .38, inspirationStage.clientHeight * .29, 160);
  const width = Math.max(72, Math.min(112, 120 - cards.length * 1.6));
  inspirationSphereRadius = Math.max(radius, 1);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  cards.forEach((card, index) => {
    if (cards.length === 1) {
      card.spherePoint = { x: 0, y: 0, z: 0 };
    } else if (index === cards.length - 1) {
      card.spherePoint = { x: 0, y: 0, z: radius };
    } else {
      const distributedCount = cards.length - 1;
      const y = 1 - ((index + .5) / distributedCount) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = index * goldenAngle;
      const x = Math.cos(angle) * ring;
      const z = Math.sin(angle) * ring;
      card.spherePoint = { x: x * radius, y: -y * radius, z: z * radius };
    }
    card.style.setProperty('--photo-width', `${width}px`);
    card.style.setProperty('--photo-max-height', `${width * 1.32}px`);
  });
  renderSphereRotation();
}

function renderSphereRotation() {
  const radiansX = sphereRotationX * Math.PI / 180;
  const radiansY = sphereRotationY * Math.PI / 180;
  const cosX = Math.cos(radiansX);
  const sinX = Math.sin(radiansX);
  const cosY = Math.cos(radiansY);
  const sinY = Math.sin(radiansY);

  inspirationSphere.querySelectorAll('.inspiration-photo').forEach((card) => {
    const point = card.spherePoint || { x: 0, y: 0, z: 0 };
    const rotatedX = point.x * cosY + point.z * sinY;
    const intermediateZ = -point.x * sinY + point.z * cosY;
    const rotatedY = point.y * cosX - intermediateZ * sinX;
    const rotatedZ = point.y * sinX + intermediateZ * cosX;
    const depth = Math.max(0, Math.min(1, (rotatedZ + inspirationSphereRadius) / (inspirationSphereRadius * 2)));

    card.style.setProperty('--photo-x', `${rotatedX.toFixed(2)}px`);
    card.style.setProperty('--photo-y', `${rotatedY.toFixed(2)}px`);
    card.style.setProperty('--photo-z', `${rotatedZ.toFixed(2)}px`);
    card.style.setProperty('--photo-opacity', `${(.42 + depth * .58).toFixed(3)}`);
    card.style.setProperty('--photo-brightness', `${(.72 + depth * .28).toFixed(3)}`);
    card.style.zIndex = `${Math.round(1000 + rotatedZ)}`;
  });
}

function stopSphereInertia() {
  window.cancelAnimationFrame(sphereInertiaFrame);
  sphereInertiaFrame = undefined;
}

function startSphereInertia(velocityX, velocityY) {
  stopSphereInertia();
  function glide() {
    velocityX *= .91;
    velocityY *= .91;
    if (Math.abs(velocityX) + Math.abs(velocityY) < .05) return;
    sphereRotationY += velocityX;
    sphereRotationX -= velocityY;
    renderSphereRotation();
    sphereInertiaFrame = window.requestAnimationFrame(glide);
  }
  sphereInertiaFrame = window.requestAnimationFrame(glide);
}

function updateInspirationState() {
  inspirationPage.classList.toggle('has-photos', inspirationPhotos.length > 0);
  inspirationCount.value = `${inspirationPhotos.length} / ${maxInspirationPhotos}`;
  inspirationCount.textContent = `${inspirationPhotos.length} / ${maxInspirationPhotos}`;
  libraryName.textContent = sphereLibraries[activeLibraryIndex].name;
  libraryPagination.replaceChildren();
  sphereLibraries.forEach((library, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'library-dot';
    dot.setAttribute('aria-label', library.name);
    if (index === activeLibraryIndex) dot.setAttribute('aria-current', 'page');
    dot.addEventListener('click', () => switchSphereLibrary(index));
    libraryPagination.append(dot);
  });
}

function switchSphereLibrary(index) {
  stopSphereInertia();
  sphereGesture = null;
  inspirationStage.classList.remove('is-dragging');
  const previous = sphereLibraries[activeLibraryIndex];
  previous.nodes = [...inspirationSphere.children];
  previous.rotationX = sphereRotationX;
  previous.rotationY = sphereRotationY;
  activeLibraryIndex = index;
  const next = sphereLibraries[index];
  inspirationPhotos = next.photos;
  inspirationSphere.replaceChildren(...next.nodes);
  sphereRotationX = next.rotationX;
  sphereRotationY = next.rotationY;
  updateInspirationState();
  layoutInspirationPhotos();
}

function createSphereLibrary() {
  sphereLibraries.push({
    name: `穿搭灵感 ${sphereLibraries.length + 1}`,
    photos: [], nodes: [], rotationX: 0, rotationY: 0
  });
  switchSphereLibrary(sphereLibraries.length - 1);
}

function updateInspirationToolbar() {
  const active = activeTab === 'inspire';
  document.querySelector('.topbar').classList.toggle('is-inspiration', active);
  topLeftButton.innerHTML = active
    ? '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
    : originalTopLeft;
  topRightButton.innerHTML = active
    ? '<svg class="solid-icon" aria-hidden="true" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M5 6h9a6 6 0 0 0 6 6h1v6a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Zm2 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3 10 6-5a1 1 0 0 1 1.3 0l3 2.5 2-1.5 3.4 3.5-1.4 1.4-2.2-2.3-1.8 1.4-3.7-3L5.3 20.5 4 19Z"/><path fill-rule="evenodd" d="M19 1a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-.8 1.8v2.4h-2.4v1.6h2.4v2.4h1.6V6.8h2.4V5.2h-2.4V2.8h-1.6Z"/></svg>'
    : originalTopRight;
  topLeftButton.setAttribute('aria-label', active ? (inspirationGridMode ? '切换球体模式' : '切换平铺模式') : '打开收藏库');
  topLeftButton.setAttribute('aria-pressed', String(active && inspirationGridMode));
  topRightButton.setAttribute('aria-label', active ? '添加图片到当前穿搭灵感' : '打开个人主页');
  mainAddButton.setAttribute('aria-label', active ? '新建穿搭灵感' : '添加新穿搭');
}

function renameInspirationLibrary() {
  if (libraryName.querySelector('input')) return;
  const library = sphereLibraries[activeLibraryIndex];
  const input = document.createElement('input');
  input.className = 'library-name-input';
  input.value = library.name;
  input.maxLength = 40;
  input.setAttribute('aria-label', '穿搭灵感名称');
  libraryName.replaceChildren(input);
  let finished = false;
  function finish(cancel = false) {
    if (finished) return;
    finished = true;
    if (!cancel) library.name = input.value.trim() || library.name;
    updateInspirationState();
  }
  input.addEventListener('blur', () => finish());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) finish();
    if (event.key === 'Escape') finish(true);
    event.stopPropagation();
  });
  input.focus();
  input.select();
}
libraryName.addEventListener('dblclick', renameInspirationLibrary);
libraryName.addEventListener('keydown', (event) => {
  if (event.target === libraryName && event.key === 'Enter') renameInspirationLibrary();
});

let librarySwipe;
inspirationPage.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button, input, .library-name') || sphereGesture) return;
  librarySwipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
  inspirationPage.setPointerCapture(event.pointerId);
});
inspirationPage.addEventListener('pointerup', (event) => {
  if (!librarySwipe || librarySwipe.id !== event.pointerId) return;
  const dx = event.clientX - librarySwipe.x;
  const dy = event.clientY - librarySwipe.y;
  librarySwipe = null;
  if (inspirationPage.hasPointerCapture(event.pointerId)) inspirationPage.releasePointerCapture(event.pointerId);
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
  const index = activeLibraryIndex + (dx < 0 ? 1 : -1);
  if (index < 0 || index >= sphereLibraries.length) return;
  switchSphereLibrary(index);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    inspirationStage.animate([
      { transform: `translateX(${dx < 0 ? 36 : -36}px)`, opacity: .3 },
      { transform: 'translateX(0)', opacity: 1 }
    ], { duration: 240, easing: 'ease-out' });
  }
});
inspirationPage.addEventListener('pointercancel', () => { librarySwipe = null; });

function openInspirationViewer(record, canFavorite = false) {
  currentViewerRecord = canFavorite ? record : null;
  inspirationFavoriteButton.hidden = !canFavorite;
  inspirationViewer.classList.toggle('has-favorite-action', canFavorite);
  inspirationFavoriteButton.setAttribute('aria-pressed', String(inspirationFavorites.has(record.src)));
  inspirationViewerImage.src = record.src;
  inspirationViewerImage.alt = record.name || '灵感照片';
  inspirationViewer.hidden = false;
  window.history.pushState({ view: 'inspiration-photo' }, '', '#inspiration-photo');
}

function addInspirationPhotos(files) {
  stopSphereInertia();
  const remaining = maxInspirationPhotos - inspirationPhotos.length;
  if (remaining <= 0) {
    showToast('最多添加 30 张照片');
    return;
  }
  const accepted = [...files].slice(0, remaining);
  accepted.forEach((file) => {
    const record = { src: URL.createObjectURL(file), name: file.name };
    inspirationPhotos.push(record);
    const card = document.createElement('button');
    card.className = 'inspiration-photo is-entering';
    card.type = 'button';
    card.setAttribute('aria-label', `灵感照片 ${inspirationPhotos.length}`);
    const image = document.createElement('img');
    image.src = record.src;
    image.alt = '';
    card.append(image);
    card.inspirationRecord = record;
    card.addEventListener('click', () => {
      if (performance.now() < suppressInspirationClickUntil) return;
      openInspirationViewer(record, true);
    });
    inspirationSphere.append(card);
    window.requestAnimationFrame(() => card.classList.remove('is-entering'));
  });
  sphereRotationX = 0;
  sphereRotationY = 0;
  updateInspirationState();
  layoutInspirationPhotos();
  if (files.length > accepted.length) showToast('已达到 30 张上限');
}

function setMainTab(tab) {
  activeTab = tab;
  const showingInspiration = tab === 'inspire';
  homeCanvas.hidden = showingInspiration;
  inspirationPage.hidden = !showingInspiration;
  updateInspirationToolbar();
  updateInspirationState();
  if (showingInspiration) window.requestAnimationFrame(layoutInspirationPhotos);
}


inspirationInput.addEventListener('change', () => {
  if (inspirationInput.files?.length) addInspirationPhotos(inspirationInput.files);
  inspirationInput.value = '';
});

function closeInspirationViewer() {
  inspirationViewer.hidden = true;
  currentViewerRecord = null;
  inspirationViewerImage.removeAttribute('src');
  inspirationViewerImage.alt = '';
}

inspirationViewerBack.addEventListener('click', () => {
  if (window.history.state?.view === 'inspiration-photo') window.history.back();
  else closeInspirationViewer();
});

inspirationStage.addEventListener('pointerdown', (event) => {
  if (!inspirationPhotos.length || inspirationGridMode || !event.target.closest('.inspiration-photo')) return;
  stopSphereInertia();
  sphereGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: event.clientX,
    y: event.clientY,
    velocityX: 0,
    velocityY: 0,
    moved: false,
    photo: event.target.closest('.inspiration-photo')
  };
  inspirationStage.classList.add('is-dragging');
  inspirationStage.setPointerCapture(event.pointerId);
  event.preventDefault();
});

inspirationStage.addEventListener('pointermove', (event) => {
  if (!sphereGesture || sphereGesture.pointerId !== event.pointerId) return;
  const dx = event.clientX - sphereGesture.x;
  const dy = event.clientY - sphereGesture.y;
  sphereGesture.x = event.clientX;
  sphereGesture.y = event.clientY;
  sphereGesture.velocityX = dx * .42;
  sphereGesture.velocityY = dy * .36;
  if (Math.hypot(event.clientX - sphereGesture.startX, event.clientY - sphereGesture.startY) > 6) sphereGesture.moved = true;
  sphereRotationY += sphereGesture.velocityX;
  sphereRotationX -= sphereGesture.velocityY;
  renderSphereRotation();
  event.preventDefault();
});

function finishSphereGesture(event) {
  if (!sphereGesture || sphereGesture.pointerId !== event.pointerId) return;
  const { velocityX, velocityY, moved, photo } = sphereGesture;
  sphereGesture = null;
  inspirationStage.classList.remove('is-dragging');
  if (inspirationStage.hasPointerCapture(event.pointerId)) inspirationStage.releasePointerCapture(event.pointerId);
  if (event.type !== 'pointercancel' && !moved && photo?.inspirationRecord) {
    suppressInspirationClickUntil = performance.now() + 260;
    openInspirationViewer(photo.inspirationRecord, true);
    return;
  }
  if (moved) suppressInspirationClickUntil = performance.now() + 260;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) startSphereInertia(velocityX, velocityY);
}

inspirationStage.addEventListener('pointerup', finishSphereGesture);
inspirationStage.addEventListener('pointercancel', finishSphereGesture);

function createCardPageState() {
  return {
    nodes: document.createDocumentFragment(),
    backgroundId: undefined,
    backgroundImage: 'none',
    backgroundOpacity: '1'
  };
}

function initializeCardPages(card) {
  const pageCount = Math.max(1, card.querySelectorAll('.card-page').length);
  const states = Array.from({ length: pageCount }, () => createCardPageState());
  cardPageStates.set(card, states);
  syncCardPages(card);
}

function updateHomePageTotal() {
  const total = [...cardTrack.querySelectorAll('.outfit-card')]
    .reduce((sum, card) => sum + (cardPageStates.get(card)?.length || 0), 0);
  const output = document.querySelector('.home-total-pages');
  output.textContent = `${total} ${total === 1 ? 'PAGE' : 'PAGES'}`;
  output.setAttribute('aria-label', `所有卡片共 ${total} 页`);
}

function syncCardPages(card) {
  const states = cardPageStates.get(card) || [];
  const pages = card.querySelector('.card-pages');
  const pagination = card.querySelector('.card-pagination');
  while (pages.children.length < states.length) {
    const page = document.createElement('div');
    page.className = 'card-page';
    pages.append(page);
  }
  while (pages.children.length > states.length) pages.lastElementChild.remove();
  pages.style.width = `${states.length * 100}%`;
  [...pages.children].forEach((page, index) => {
    page.style.flexBasis = `${100 / states.length}%`;
    page.setAttribute('aria-label', `图片 ${index + 1}`);
  });

  pagination.replaceChildren();
  states.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = `page-dot${index === activeCardPageIndex && card === activeCard ? ' is-active' : ''}`;
    dot.type = 'button';
    dot.dataset.page = String(index);
    dot.setAttribute('aria-label', `第 ${index + 1} 页`);
    if (dot.classList.contains('is-active')) dot.setAttribute('aria-current', 'page');
    pagination.append(dot);
  });
  updateInternalPage(card, Number(card.dataset.currentPage || 0));
  if (card === activeCard) document.querySelector('.detail-page-count').textContent = `${activeCardPageIndex + 1}/${states.length}`;
  updateHomePageTotal();
}

const pagesOverview = document.querySelector('.detail-pages-overview');
let pagesSortMode = false;
const pagesSortButton = document.querySelector('.detail-pages-sort');
pagesSortButton.addEventListener('click', () => {
  pagesSortMode = !pagesSortMode;
  renderPagesOverview();
});
document.querySelector('.detail-pages-close').addEventListener('click', () => { pagesOverview.hidden = true; });
window.addEventListener('popstate', () => { pagesOverview.hidden = true; });
document.querySelector('.detail-pages-toggle').addEventListener('click', () => {
  pagesSortMode = false;
  renderPagesOverview();
});

function moveOverviewPage(from, to) {
  const states = activeCard && cardPageStates.get(activeCard);
  if (!states || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= states.length || to < 0 || to >= states.length || from === to) return;
  captureActiveCardPage(false);
  const currentState = states[activeCardPageIndex];
  const [moved] = states.splice(from, 1);
  states.splice(to, 0, moved);
  activeCardPageIndex = states.indexOf(currentState);
  activeCard.dataset.currentPage = String(activeCardPageIndex);
  syncCardPages(activeCard);
  states.forEach((state, index) => renderCardPagePreview(activeCard, index, index === activeCardPageIndex ? editorCanvas : state.nodes));
  const media = activeCard.querySelector('.card-media');
  media.scrollTo({ left: media.clientWidth * activeCardPageIndex, behavior: 'instant' });
  renderPagesOverview();
}

function renderPagesOverview() {
  if (!activeCard || viewingFavoritePage) return;
  closeBackgroundPanel();
  closeImagePopover();
  captureActiveCardPage(false);
  const states = cardPageStates.get(activeCard);
  const grid = document.querySelector('.detail-pages-grid');
  grid.replaceChildren();
  pagesOverview.hidden = false;
  pagesOverview.classList.toggle('is-sorting', pagesSortMode);
  pagesSortButton.textContent = pagesSortMode ? '完成' : '排序';
  pagesSortButton.setAttribute('aria-pressed', String(pagesSortMode));
  document.querySelector('.detail-pages-sort-hint').hidden = !pagesSortMode;
  states.forEach((state, index) => {
    if (index !== activeCardPageIndex) renderCardPagePreview(activeCard, index, state.nodes);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'detail-page-tile';
    tile.setAttribute('aria-label', `进入第 ${index + 1} 页`);
    if (index === activeCardPageIndex) tile.setAttribute('aria-current', 'page');
    const preview = document.createElement('div');
    preview.className = 'detail-page-tile-preview';
    const original = activeCard.querySelectorAll('.card-page')[index];
    [...original.children].forEach(child => preview.append(child.cloneNode(true)));
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'detail-page-number';
    label.setAttribute('aria-label', `第 ${index + 1} 页，双击修改位置`);
    label.textContent = `${index + 1}/${states.length}`;
    tile.append(preview);
    const item = document.createElement('div');
    item.className = 'detail-page-item';
    item.dataset.pageIndex = String(index);
    item.append(tile, label);
    grid.append(item);
    label.addEventListener('dblclick', () => {
      const input = document.createElement('input');
      input.className = 'detail-page-position-input';
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '1';
      input.max = String(states.length);
      input.value = String(index + 1);
      input.setAttribute('aria-label', `目标页码，1 至 ${states.length}`);
      label.replaceWith(input);
      let finished = false;
      const finish = (cancel = false) => {
        if (finished) return;
        const position = Number(input.value);
        finished = true;
        input.replaceWith(label);
        if (cancel) return;
        if (!Number.isInteger(position) || position < 1 || position > states.length) {
          showToast(`请输入 1 至 ${states.length} 的整数页码`);
          return;
        }
        moveOverviewPage(index, position - 1);
      };
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          finish(event.key === 'Escape');
        }
      });
      input.addEventListener('blur', () => finish());
      input.focus();
      input.select();
    });
    let drag;
    tile.addEventListener('pointerdown', event => {
      if (!pagesSortMode || event.button !== 0 || drag) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, to: index, moved: false };
      tile.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    tile.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 8) return;
      drag.moved = true;
      tile.classList.add('is-dragging');
      tile.style.transform = `translate(${dx}px, ${dy}px)`;
      const bounds = pagesOverview.getBoundingClientRect();
      if (event.clientY > bounds.bottom - 48) pagesOverview.scrollTop += 14;
      if (event.clientY < bounds.top + 100) pagesOverview.scrollTop -= 14;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.detail-page-item');
      if (target && grid.contains(target)) drag.to = Number(target.dataset.pageIndex);
      grid.querySelectorAll('.detail-page-item').forEach(node => node.classList.toggle('is-drop-target', Number(node.dataset.pageIndex) === drag.to));
      event.preventDefault();
    });
    const endDrag = event => {
      if (!drag || drag.id !== event.pointerId) return;
      const finished = drag;
      drag = null;
      if (tile.hasPointerCapture(event.pointerId)) tile.releasePointerCapture(event.pointerId);
      tile.classList.remove('is-dragging');
      tile.style.transform = '';
      grid.querySelectorAll('.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
      if (event.type === 'pointerup' && finished.moved) moveOverviewPage(index, finished.to);
    };
    tile.addEventListener('pointerup', endDrag);
    tile.addEventListener('pointercancel', endDrag);
    const canvas = preview.querySelector('.card-page-canvas');
    if (canvas) fitPreviewOutfit(canvas, preview.clientWidth, preview.clientHeight);
    fitPreviewBackground(preview, preview.clientWidth, preview.clientHeight);
    tile.addEventListener('click', () => {
      if (pagesSortMode) return;
      pagesOverview.hidden = true;
      switchDetailCardPage(index);
    });
  });
}

function renderCardPagePreview(card, index, source) {
  const state = cardPageStates.get(card)?.[index];
  const page = card.querySelectorAll('.card-page')[index];
  if (!state || !page) return;
  const shell = document.querySelector('.app-shell');
  const sourceWidth = state.canvasWidth || editorCanvas.clientWidth || shell.clientWidth;
  const sourceHeight = state.canvasHeight || editorCanvas.clientHeight || shell.clientHeight;
  if (!sourceWidth || !sourceHeight) return;
  page.replaceChildren();
  page.style.background = 'var(--paper-deep, #ece9e1)';

  const previewCanvas = document.createElement('div');
  previewCanvas.className = 'card-page-canvas';
  const background = document.createElement('div');
  background.className = 'card-preview-background';
  background.classList.toggle('has-background', state.backgroundImage !== 'none');
  background.style.setProperty('--detail-background-image', state.backgroundImage);
  background.style.setProperty('--detail-background-opacity', state.backgroundOpacity);
  previewCanvas.dataset.sourceWidth = String(sourceWidth);
  previewCanvas.dataset.sourceHeight = String(sourceHeight);
  previewCanvas.style.width = `${sourceWidth}px`;
  previewCanvas.style.height = `${sourceHeight}px`;
  background.dataset.sourceWidth = String(sourceWidth);
  background.dataset.sourceHeight = String(sourceHeight);
  background.style.width = `${sourceWidth}px`;
  background.style.height = `${sourceHeight}px`;
  source.querySelectorAll('.outfit-piece').forEach((piece) => {
    const clone = piece.cloneNode(true);
    clone.classList.remove('is-selected', 'show-image-pages');
    previewCanvas.append(clone);
  });
  const palette = source.querySelector('.outfit-color-palette');
  if (palette) {
    const clone = palette.cloneNode(true);
    clone.querySelectorAll('button').forEach(button => {
      const dot = document.createElement('span');
      dot.className = button.className;
      dot.style.cssText = button.style.cssText;
      if (button.dataset.color) dot.dataset.color = button.dataset.color;
      button.replaceWith(dot);
    });
    previewCanvas.append(clone);
  }
  page.append(background, previewCanvas);
  fitCardPreview(previewCanvas);
}

function fitCardPreview(canvas) {
  const card = canvas.closest('.outfit-card');
  const width = Number(canvas.dataset.sourceWidth);
  const height = Number(canvas.dataset.sourceHeight);
  if (!card || !width || !height || !card.clientWidth || !card.clientHeight) return;
  fitPreviewOutfit(canvas, card.clientWidth, card.clientHeight);
  fitPreviewBackground(canvas.parentElement, card.clientWidth, card.clientHeight);
}

function fitPreviewOutfit(canvas, targetWidth, targetHeight) {
  const width = Number(canvas.dataset.sourceWidth);
  const height = Number(canvas.dataset.sourceHeight);
  const baseScale = Math.min(targetWidth / width, targetHeight / height);
  const pieces = [...canvas.querySelectorAll('.outfit-piece')];
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  pieces.forEach(piece => {
    const w = piece.offsetWidth, h = piece.offsetHeight;
    const angle = Number(piece.dataset.rotation || 0) * Math.PI / 180;
    const halfWidth = (Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * h) / 2;
    const halfHeight = (Math.abs(Math.sin(angle)) * w + Math.abs(Math.cos(angle)) * h) / 2;
    const cx = piece.offsetLeft + w / 2, cy = piece.offsetTop + h / 2;
    left = Math.min(left, cx - halfWidth);
    right = Math.max(right, cx + halfWidth);
    top = Math.min(top, cy - halfHeight);
    bottom = Math.max(bottom, cy + halfHeight);
  });
  const palette = canvas.querySelector('.outfit-color-palette');
  if (palette) {
    const w = palette.offsetWidth, h = palette.offsetHeight;
    const angle = Number(palette.dataset.rotation || 0) * Math.PI / 180;
    const halfWidth = (Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * h) / 2;
    const halfHeight = (Math.abs(Math.sin(angle)) * w + Math.abs(Math.cos(angle)) * h) / 2;
    const cx = palette.offsetLeft + w / 2, cy = palette.offsetTop + h / 2;
    left = Math.min(left, cx - halfWidth);
    top = Math.min(top, cy - halfHeight);
    right = Math.max(right, cx + halfWidth);
    bottom = Math.max(bottom, cy + halfHeight);
  }
  const hasItems = pieces.length || palette;
  const scale = hasItems ? Math.min(baseScale * 1.25,
    Math.max(1, targetWidth - 24) / Math.max(1, right - left),
    Math.max(1, targetHeight - 42) / Math.max(1, bottom - top)) : baseScale;
  const cx = hasItems ? (left + right) / 2 : width / 2;
  const cy = hasItems ? (top + bottom) / 2 : height / 2;
  canvas.style.left = `${targetWidth / 2 - cx * scale}px`;
  canvas.style.top = `${targetHeight / 2 - cy * scale}px`;
  canvas.style.transform = `scale(${scale})`;
}

function fitPreviewBackground(parent, targetWidth, targetHeight) {
  const background = parent.querySelector('.card-preview-background');
  if (!background) return;
  const width = Number(background.dataset.sourceWidth);
  const height = Number(background.dataset.sourceHeight);
  if (!width || !height || !targetWidth || !targetHeight) return;
  const scale = Math.max(targetWidth / width, targetHeight / height);
  background.style.left = `${(targetWidth - width * scale) / 2}px`;
  background.style.top = `${(targetHeight - height * scale) / 2}px`;
  background.style.transform = `scale(${scale})`;
}

function sizeOutfitCards() {
  const shell = document.querySelector('.app-shell');
  const width = shell.clientWidth;
  const height = shell.clientHeight;
  if (!width || !height) return;
  const cardWidth = Math.min(width * .82, 320, Math.max(170, (height - 335) * 357 / 486));
  cardTrack.style.setProperty('--card-viewport-width', `${width}px`);
  cardTrack.style.setProperty('--outfit-card-width', `${cardWidth}px`);
  cardTrack.querySelectorAll('.card-page-canvas').forEach(fitCardPreview);
}
new ResizeObserver(sizeOutfitCards).observe(document.querySelector('.app-shell'));
sizeOutfitCards();

function captureActiveCardPage(detach = false) {
  if (!activeCard || detailPage.hidden) return;
  const state = cardPageStates.get(activeCard)?.[activeCardPageIndex];
  if (!state) return;
  if (editorCanvas.clientWidth && editorCanvas.clientHeight) {
    state.canvasWidth = editorCanvas.clientWidth;
    state.canvasHeight = editorCanvas.clientHeight;
  }
  if (activePageIsFavorite) {
    state.favoriteBackground = {
      backgroundId: activeBackgroundId,
      backgroundImage: detailPage.style.getPropertyValue('--detail-background-image') || 'none',
      backgroundOpacity: detailPage.style.getPropertyValue('--detail-background-opacity') || '1'
    };
    if (detach) state.nodes.append(...editorCanvas.childNodes);
    return;
  }
  state.backgroundId = activeBackgroundId;
  state.backgroundImage = detailPage.style.getPropertyValue('--detail-background-image') || 'none';
  state.backgroundOpacity = detailPage.style.getPropertyValue('--detail-background-opacity') || '1';
  renderCardPagePreview(activeCard, activeCardPageIndex, editorCanvas);
  if (detach) state.nodes.append(...editorCanvas.childNodes);
}

function loadCardPage(card, index) {
  const states = cardPageStates.get(card);
  if (!states?.[index]) return;
  if (activeCard && editorCanvas.childNodes.length) captureActiveCardPage(true);
  activeCard = card;
  activeCardPageIndex = index;
  activePageIsFavorite = viewingFavoritePage;
  card.dataset.currentPage = String(index);
  const state = states[index];
  editorCanvas.replaceChildren();
  editorCanvas.append(state.nodes);
  const appearance = viewingFavoritePage && state.favoriteBackground ? state.favoriteBackground : state;
  activeBackgroundId = appearance.backgroundId;
  detailPage.style.setProperty('--detail-background-image', appearance.backgroundImage);
  detailPage.style.setProperty('--detail-background-opacity', appearance.backgroundOpacity);
  detailPage.classList.toggle('has-background', appearance.backgroundImage !== 'none');
  selectPiece(null);
  updateImageLibrary();
  syncCardPages(card);
  updateFavoriteToggle();
  if (!detailPage.classList.contains('is-editing')) {
    detailPage.classList.add('preview-controls-hidden');
    refreshDetailPreview(false);
  }
}

let detailIdleTimer;
function enterDetailPreview() {
  detailPage.classList.remove('is-editing', 'is-managing-images');
  detailPage.classList.add('preview-controls-hidden');
  editToggle.setAttribute('aria-pressed', 'false');
  editToggle.setAttribute('aria-label', '进入编辑模式');
  refreshDetailPreview(false);
}

function refreshDetailPreview(revealControls = false) {
  window.clearTimeout(detailIdleTimer);
  if (detailPage.classList.contains('is-editing')) return;
  if (revealControls) detailPage.classList.remove('preview-controls-hidden');
  editorCanvas.querySelectorAll('.outfit-piece').forEach(piece => {
    window.clearTimeout(pieceDotTimers.get(piece));
    if (getPieceImages(piece).length) piece.classList.add('show-image-pages');
  });
  detailIdleTimer = window.setTimeout(() => {
    if (detailPage.classList.contains('is-editing') || !backgroundPanel.hidden || !pagesOverview.hidden || document.querySelector('.detail-tools-sheet:not([hidden])')) return;
    detailPage.classList.add('preview-controls-hidden');
    editorCanvas.querySelectorAll('.show-image-pages').forEach(piece => piece.classList.remove('show-image-pages'));
  }, 3000);
}

detailPage.addEventListener('click', () => refreshDetailPreview(true));
detailPage.addEventListener('pointerdown', () => window.clearTimeout(detailIdleTimer), true);
detailPage.addEventListener('pointerup', () => refreshDetailPreview(false));
detailPage.addEventListener('pointercancel', () => refreshDetailPreview(false));
detailPage.addEventListener('input', () => refreshDetailPreview(false));
detailPage.addEventListener('keydown', () => refreshDetailPreview(true));
window.addEventListener('popstate', () => window.clearTimeout(detailIdleTimer));

function switchDetailCardPage(index) {
  const states = activeCard && cardPageStates.get(activeCard);
  if (!states || index < 0 || index >= states.length || index === activeCardPageIndex) return false;
  const card = activeCard;
  captureActiveCardPage(true);
  loadCardPage(card, index);
  goToInternalPage(card, index);
  showToast(`第 ${index + 1} 页`);
  return true;
}

function renderBackgrounds() {
  backgroundList.replaceChildren();
  const none = document.createElement('article');
  none.className = `background-preset${!activeBackgroundId ? ' is-active' : ''}`;
  none.innerHTML = '<button class="background-preview no-background" type="button" aria-label="无背景"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m6 18 12-12"/></svg></button><span class="background-name">无背景</span>';
  none.querySelector('button').addEventListener('click', () => {
    activeBackgroundId = undefined;
    detailPage.style.setProperty('--detail-background-image', 'none');
    detailPage.style.setProperty('--detail-background-opacity', '1');
    detailPage.classList.remove('has-background');
    captureActiveCardPage(false);
    renderBackgrounds();
    closeBackgroundPanel();
  });
  backgroundList.append(none);
  backgrounds.forEach((background) => {
    const preset = document.createElement('article');
    preset.className = `background-preset${background.id === activeBackgroundId ? ' is-active' : ''}`;

    const preview = document.createElement('button');
    preview.className = 'background-preview';
    preview.type = 'button';
    preview.dataset.backgroundId = background.id;
    preview.setAttribute('aria-label', `使用背景 ${background.name}`);
    const image = document.createElement('img');
    image.src = background.src;
    image.alt = '';
    preview.append(image);

    const name = document.createElement('span');
    name.className = 'background-name';
    name.dataset.backgroundId = background.id;
    name.tabIndex = 0;
    name.textContent = background.name;
    name.title = '双击重命名';
    const remove = document.createElement('button');
    remove.className = 'background-delete';
    remove.type = 'button';
    remove.dataset.backgroundId = background.id;
    remove.setAttribute('aria-label', `删除背景 ${background.name}`);
    remove.textContent = '×';
    preset.classList.toggle('is-delete-ready', background.id === deleteBackgroundId);
    preset.append(preview, name, remove);
    backgroundList.append(preset);
  });

  const editedBackground = backgrounds.find((background) => background.id === opacityEditorId);
  backgroundOpacityControl.hidden = !editedBackground;
  if (editedBackground) {
    const opacity = editedBackground.id === activeBackgroundId
      ? Number(detailPage.style.getPropertyValue('--detail-background-opacity') || '1')
      : editedBackground.opacity;
    const value = Math.round(opacity * 100);
    backgroundOpacity.value = String(value);
    backgroundOpacityValue.value = `${value}%`;
    backgroundOpacityValue.textContent = `${value}%`;
  }
}

function applyBackground(background) {
  activeBackgroundId = background.id;
  detailPage.style.setProperty('--detail-background-image', `url("${background.src}")`);
  detailPage.style.setProperty('--detail-background-opacity', String(background.opacity));
  detailPage.classList.add('has-background');
  renderBackgrounds();
  captureActiveCardPage(false);
}

function openBackgroundPanel() {
  window.clearTimeout(backgroundPanelTimer);
  renderBackgrounds();
  backgroundPanel.hidden = false;
  backgroundToggle.setAttribute('aria-expanded', 'true');
  window.requestAnimationFrame(() => backgroundPanel.classList.add('is-open'));
}

function closeBackgroundPanel() {
  opacityEditorId = undefined;
  deleteBackgroundId = undefined;
  window.clearTimeout(backgroundHoldTimer);
  backgroundPanel.classList.remove('is-open');
  backgroundToggle.setAttribute('aria-expanded', 'false');
  window.clearTimeout(backgroundPanelTimer);
  backgroundPanelTimer = window.setTimeout(() => {
    if (!backgroundPanel.classList.contains('is-open')) backgroundPanel.hidden = true;
  }, 350);
}

backgroundToggle.addEventListener('click', () => {
  if (!backgroundPanel.classList.contains('is-open')) openBackgroundPanel();
  else closeBackgroundPanel();
});

backgroundList.addEventListener('click', (event) => {
  if (suppressBackgroundClick) {
    suppressBackgroundClick = false;
    return;
  }
  const remove = event.target.closest('.background-delete');
  if (remove) {
    const index = backgrounds.findIndex((item) => item.id === remove.dataset.backgroundId);
    if (index < 0) return;
    const [removed] = backgrounds.splice(index, 1);
    if (removed.id.startsWith('custom-')) URL.revokeObjectURL(removed.src);
    if (activeBackgroundId === removed.id) {
      activeBackgroundId = undefined;
      detailPage.classList.remove('has-background');
      detailPage.style.setProperty('--detail-background-image', 'none');
    }
    deleteBackgroundId = undefined;
    opacityEditorId = undefined;
    renderBackgrounds();
    return;
  }
  const preview = event.target.closest('.background-preview');
  if (!preview) return;
  const background = backgrounds.find((item) => item.id === preview.dataset.backgroundId);
  if (background) {
    if (background.id === activeBackgroundId) {
      deleteBackgroundId = undefined;
      opacityEditorId = background.id;
      renderBackgrounds();
      return;
    }
    opacityEditorId = undefined;
    applyBackground(background);
    closeBackgroundPanel();
  }
});

backgroundList.addEventListener('pointerdown', (event) => {
  const preview = event.target.closest('.background-preview');
  if (!preview || !preview.dataset.backgroundId || viewingFavoritePage) return;
  window.clearTimeout(backgroundHoldTimer);
  backgroundHoldTimer = window.setTimeout(() => {
    suppressBackgroundClick = true;
    opacityEditorId = undefined;
    deleteBackgroundId = preview.dataset.backgroundId;
    renderBackgrounds();
  }, 2000);
});

['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
  backgroundList.addEventListener(type, () => window.clearTimeout(backgroundHoldTimer));
});

backgroundOpacity.addEventListener('input', () => {
  const background = backgrounds.find((item) => item.id === opacityEditorId);
  if (!background) return;
  const opacity = Number(backgroundOpacity.value) / 100;
  if (!viewingFavoritePage) background.opacity = opacity;
  backgroundOpacityValue.value = `${backgroundOpacity.value}%`;
  backgroundOpacityValue.textContent = `${backgroundOpacity.value}%`;
  if (background.id === activeBackgroundId) {
    detailPage.style.setProperty('--detail-background-opacity', String(opacity));
    captureActiveCardPage(false);
  }
});

backgroundList.addEventListener('dblclick', (event) => {
  const name = event.target.closest('.background-name');
  if (!name) return;
  name.contentEditable = 'true';
  name.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(name);
  selection.removeAllRanges();
  selection.addRange(range);
});

backgroundList.addEventListener('keydown', (event) => {
  if (!event.target.matches('.background-name[contenteditable="true"]')) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    event.target.blur();
  }
});

backgroundList.addEventListener('focusout', (event) => {
  const name = event.target.closest('.background-name[contenteditable="true"]');
  if (!name) return;
  const background = backgrounds.find((item) => item.id === name.dataset.backgroundId);
  if (!background) return;
  background.name = name.textContent.trim() || background.name;
  name.contentEditable = 'false';
  renderBackgrounds();
});

addBackgroundButton.addEventListener('click', () => backgroundInput.click());

backgroundInput.addEventListener('change', () => {
  const file = backgroundInput.files?.[0];
  if (!file) return;
  customBackgroundCount += 1;
  const background = {
    id: `custom-${Date.now()}`,
    src: URL.createObjectURL(file),
    name: `自定义背景${customBackgroundCount}`,
    opacity: 1
  };
  backgrounds.push(background);
  applyBackground(background);
  closeBackgroundPanel();
  backgroundInput.value = '';
});

document.addEventListener('pointerdown', (event) => {
  if (backgroundPanel.hidden) return;
  if (event.target.closest('.background-panel, .background-toggle')) return;
  closeBackgroundPanel();
});

newOutfitButton.addEventListener('click', () => {
  if (viewingFavoritePage) {
    window.history.back();
    return;
  }
  openSaveOptions();
});

function saveCurrentOutfit() {
  if (!activeCard) return;
  const pieces = [...editorCanvas.querySelectorAll('.outfit-piece')];
  if (!pieces.some(piece => getPieceImages(piece).length)) {
    showToast('先添加衣服图片，再另存搭配');
    return;
  }
  const savedPage = createCardPageState();
  savedPage.backgroundId = activeBackgroundId;
  savedPage.backgroundImage = detailPage.style.getPropertyValue('--detail-background-image') || 'none';
  savedPage.backgroundOpacity = detailPage.style.getPropertyValue('--detail-background-opacity') || '1';
  savedPage.canvasWidth = editorCanvas.clientWidth;
  savedPage.canvasHeight = editorCanvas.clientHeight;
  try {
    pieces.forEach(piece => {
      const records = getPieceImages(piece);
      const current = records[Number(piece.dataset.imageIndex || 0)];
      if (!current) return;
      const image = piece.querySelector('img');
      if (!image.complete || !image.naturalWidth) throw new Error('图片仍在加载');
      // Each saved page owns a full original image, independent of source deletion/replacement.
      const bitmap = document.createElement('canvas');
      bitmap.width = image.naturalWidth;
      bitmap.height = image.naturalHeight;
      bitmap.getContext('2d').drawImage(image, 0, 0);
      const record = { ...current, src: bitmap.toDataURL('image/png') };
      const clone = piece.cloneNode(true);
      clone.dataset.pieceId = String(++pieceCount);
      clone.dataset.imageIndex = '0';
      clone.classList.remove('is-selected', 'show-image-pages');
      clone.querySelector('img').src = record.src;
      clone.querySelector('.piece-page-dots').replaceChildren();
      pieceImages.set(clone, [record]);
      savedPage.nodes.append(clone);
    });
    const palette = editorCanvas.querySelector('.outfit-color-palette');
    if (palette) savedPage.nodes.append(palette.cloneNode(true));
  } catch (error) {
    showToast('图片尚未准备好，请稍后再保存');
    return;
  }
  closeBackgroundPanel();
  closeImagePopover();
  captureActiveCardPage(false);
  const states = cardPageStates.get(activeCard);
  states.push(savedPage);
  syncCardPages(activeCard);
  const newPageIndex = states.length - 1;
  renderCardPagePreview(activeCard, newPageIndex, savedPage.nodes);
  showToast(`已另存到第 ${newPageIndex + 1} 页`);
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((button) => {
      const active = button === item;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    setMainTab(item.dataset.tab);
    showToast(item.dataset.tab === 'closet' ? '我的衣橱' : '灵感收藏');
  });
});

topLeftButton.addEventListener('click', () => {
  if (activeTab !== 'inspire') return openFavorites();
  stopSphereInertia();
  inspirationGridMode = !inspirationGridMode;
  inspirationStage.classList.toggle('is-grid', inspirationGridMode);
  updateInspirationToolbar();
  layoutInspirationPhotos();
});
topRightButton.addEventListener('click', () => {
  if (activeTab === 'inspire') inspirationInput.click();
  else showToast('个人主页');
});

function createCard() {
  cardCount += 1;
  const card = buildCard(cardCount);
  cardTrack.append(card);
  initializeCardPages(card);
  bindCard(card);
  window.requestAnimationFrame(() => {
    goToCard(cardCount - 1);
  });
  card.addEventListener('animationend', () => card.classList.remove('is-new'), { once: true });
  showToast(`已新建第 ${cardCount} 张穿搭卡片`);
}

function buildCard(number) {
  const card = document.createElement('article');
  card.className = 'outfit-card is-new';
  card.setAttribute('aria-label', `穿搭卡片 ${number}`);

  const media = document.createElement('div');
  media.className = 'card-media';
  media.setAttribute('aria-label', `卡片 ${number} 图片，可左右滑动`);
  const pages = document.createElement('div');
  pages.className = 'card-pages';
  for (let index = 0; index < internalPageCount; index += 1) {
    const page = document.createElement('div');
    page.className = 'card-page';
    page.setAttribute('aria-label', `图片 ${index + 1}`);
    pages.append(page);
  }
  media.append(pages);

  const pagination = document.createElement('nav');
  pagination.className = 'card-pagination';
  pagination.setAttribute('aria-label', '卡片分页');
  for (let index = 0; index < internalPageCount; index += 1) {
    const dot = document.createElement('button');
    dot.className = `page-dot${index === 0 ? ' is-active' : ''}`;
    dot.type = 'button';
    dot.dataset.page = String(index);
    dot.setAttribute('aria-label', `第 ${index + 1} 页`);
    if (index === 0) dot.setAttribute('aria-current', 'page');
    pagination.append(dot);
  }
  card.append(media, pagination);
  return card;
}

function updateInternalPage(card, index) {
  card.dataset.currentPage = String(index);
  card.querySelectorAll('.page-dot').forEach((dot) => {
    const active = Number(dot.dataset.page) === index;
    dot.classList.toggle('is-active', active);
    if (active) dot.setAttribute('aria-current', 'page');
    else dot.removeAttribute('aria-current');
  });
}

function goToInternalPage(card, index) {
  const media = card.querySelector('.card-media');
  updateInternalPage(card, index);
  media.scrollTo({ left: media.clientWidth * index, behavior: 'smooth' });
}

function goToCard(index) {
  const card = cardTrack.querySelectorAll('.outfit-card')[index];
  if (!card) return;
  const targetLeft = card.offsetLeft - (cardViewport.clientWidth - card.offsetWidth) / 2;
  cardViewport.scrollTo({ left: targetLeft, behavior: 'smooth' });
}

function bindCard(card) {
  const media = card.querySelector('.card-media');
  let mediaScrollFrame;
  media.addEventListener('scroll', () => {
    window.cancelAnimationFrame(mediaScrollFrame);
    mediaScrollFrame = window.requestAnimationFrame(() => {
      const page = Math.round(media.scrollLeft / media.clientWidth);
      updateInternalPage(card, page);
    });
  }, { passive: true });
}

cardTrack.querySelectorAll('.outfit-card').forEach((card) => {
  initializeCardPages(card);
  bindCard(card);
});

cardTrack.addEventListener('click', (event) => {
  if (performance.now() < ignoreCardClickUntil) return;
  const dot = event.target.closest('.page-dot');
  if (dot) {
    const card = dot.closest('.outfit-card');
    goToInternalPage(card, Number(dot.dataset.page));
    return;
  }

  const card = event.target.closest('.outfit-card');
  if (!card) return;
  const media = card.querySelector('.card-media');
  const pageIndex = Math.max(0, Math.min(
    cardPageStates.get(card).length - 1,
    Math.round(media.scrollLeft / Math.max(1, media.clientWidth))
  ));
  setFavoritePageMode(false);
  loadCardPage(card, pageIndex);
  detailPage.hidden = false;
  detailPage.setAttribute('aria-label', `${card.getAttribute('aria-label')}详情页`);
  enterDetailPreview();
  window.history.pushState({ view: 'detail' }, '', '#detail');
});

window.addEventListener('popstate', () => {
  if (framing) closeFraming();
  if (!inspirationViewer.hidden) {
    closeInspirationViewer();
    if (!favoritesPage.hidden) renderFavorites();
    return;
  }
  captureActiveCardPage(true);
  detailPage.hidden = true;
  setFavoritePageMode(false);
  detailPage.classList.remove('is-editing');
  closeBackgroundPanel();
  closeImagePopover();
  favoritesPage.hidden = window.history.state?.view !== 'favorites';
  if (!favoritesPage.hidden) renderFavorites();
  else window.requestAnimationFrame(restoreHomePreviews);
});

function restoreHomePreviews() {
  if (!detailPage.hidden || !favoritesPage.hidden) return;
  sizeOutfitCards();
  cardTrack.querySelectorAll('.outfit-card').forEach(card => {
    (cardPageStates.get(card) || []).forEach((state, index) => {
      renderCardPagePreview(card, index, state.nodes);
    });
    const media = card.querySelector('.card-media');
    const index = Number(card.dataset.currentPage || 0);
    media.scrollTo({ left: index * media.clientWidth, behavior: 'instant' });
  });
}

function selectPiece(piece) {
  editorCanvas.querySelectorAll('.outfit-piece').forEach((item) => item.classList.toggle('is-selected', item === piece));
  selectedPiece = piece;
  deletePieceButton.disabled = !piece;
  reframePieceButton.disabled = !piece || !getPieceImages(piece).length;
}

function getPieceImages(piece) {
  return pieceImages.get(piece) || [];
}

function updatePieceDots(piece) {
  const images = getPieceImages(piece);
  const currentIndex = Math.max(0, Math.min(images.length - 1, Number(piece.dataset.imageIndex || 0)));
  const dots = piece.querySelector('.piece-page-dots');
  dots.innerHTML = images.map((_, index) => `<i class="${index === currentIndex ? 'is-active' : ''}"></i>`).join('');
}

function renderPieceImage(piece, index = Number(piece.dataset.imageIndex || 0)) {
  const images = getPieceImages(piece);
  const image = piece.querySelector('img');
  const label = piece.querySelector('.piece-label');
  if (!images.length) {
    image.removeAttribute('src');
    image.hidden = true;
    piece.classList.remove('has-image');
    label.hidden = false;
    piece.dataset.imageIndex = '0';
    updatePieceDots(piece);
    return;
  }
  const safeIndex = Math.max(0, Math.min(images.length - 1, index));
  const record = images[safeIndex];
  piece.dataset.imageIndex = String(safeIndex);
  image.hidden = false;
  piece.classList.add('has-image');
  label.hidden = true;
  const applyTransform = () => setImageTransform(piece, record.x, record.y, record.scale);
  if (image.src !== record.src) {
    image.addEventListener('load', applyTransform, { once: true });
    image.src = record.src;
  } else if (image.complete) {
    applyTransform();
  }
  updatePieceDots(piece);
}

function showPieceDots(piece) {
  if (!getPieceImages(piece).length) return;
  window.clearTimeout(pieceDotTimers.get(piece));
  piece.classList.add('show-image-pages');
  refreshDetailPreview(false);
}

function updateImageLibrary() {
  if (popoverPiece?.isConnected && !imagePopover.hidden) renderImagePopover();
}

function closeImagePopover() {
  window.clearTimeout(popoverHoldTimer);
  suppressPopoverClick = false;
  imagePopover.hidden = true;
  imagePopover.classList.remove('is-delete-mode');
  popoverPiece = null;
}

// Dismiss on the page's empty canvas without starting a move or page swipe.
detailPage.addEventListener('pointerdown', event => {
  if (imagePopover.hidden || event.target.closest('.image-popover, .editor-panel, .outfit-piece, button, input, .background-panel, .detail-pages-overview')) return;
  closeImagePopover();
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

function renderImagePopover() {
  if (!popoverPiece) return;
  const images = getPieceImages(popoverPiece);
  const currentIndex = Number(popoverPiece.dataset.imageIndex || 0);
  const peers = [...editorCanvas.querySelectorAll('.outfit-piece')].filter(piece => piece.dataset.category === popoverPiece.dataset.category);
  const tabs = imagePopover.querySelector('.popover-piece-tabs');
  tabs.hidden = peers.length < 2;
  tabs.replaceChildren();
  peers.forEach((piece, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${piecePresets[piece.dataset.category].label} ${index + 1}`;
    button.setAttribute('aria-pressed', String(piece === popoverPiece));
    button.addEventListener('click', () => {
      popoverPiece = piece;
      selectPiece(piece);
      renderImagePopover();
    });
    tabs.append(button);
  });
  imageThumbnailList.innerHTML = images.map((record, index) => ({ record, index })).reverse().map(({ record, index }) => `
    <span class="image-thumbnail ${index === currentIndex ? 'is-active' : ''}" data-image-index="${index}">
      <button class="thumbnail-select" type="button" aria-label="查看第 ${index + 1} 张图片"><img src="${record.src}" alt="" /></button>
      <button class="thumbnail-delete" type="button" aria-label="删除第 ${index + 1} 张图片">×</button>
    </span>
  `).join('') + '<button class="thumbnail-add" type="button" aria-label="给当前格子添加衣服图片">+</button>';
}

function openImagePopover(piece, anchor) {
  popoverPiece = piece;
  imagePopover.hidden = false;
  imagePopover.classList.remove('is-delete-mode');
  renderImagePopover();
  const panelRect = editorPanel.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const width = imagePopover.offsetWidth;
  const center = anchorRect.left + anchorRect.width / 2 - panelRect.left;
  const left = Math.max(12, Math.min(panelRect.width - width - 12, center - width / 2));
  imagePopover.style.left = `${left}px`;
  imagePopover.style.setProperty('--tail-x', `${center - left}px`);
}

function createPiece(category) {
  closeImagePopover();
  const preset = piecePresets[category];
  if (!preset) return;
  pieceCount += 1;
  const piece = document.createElement('div');
  piece.className = 'outfit-piece';
  piece.dataset.pieceId = String(pieceCount);
  piece.dataset.category = category;
  piece.dataset.rotation = '0';
  piece.style.width = `${preset.width}px`;
  piece.style.height = `${preset.height}px`;
  const x = Math.max(18, (editorCanvas.clientWidth - preset.width) / 2 + ((pieceCount - 1) % 3 - 1) * 16);
  const y = 170 + ((pieceCount - 1) % 5) * 24;
  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
  piece.innerHTML = `
    <span class="piece-label">${preset.label}<small>点击添加图片</small></span>
    <span class="piece-image-viewport"><img alt="${preset.label}" hidden /></span>
    <span class="piece-page-dots" aria-hidden="true"></span>
    <button class="piece-handle piece-move-handle" type="button" aria-label="移动 ${preset.label}"></button>
    <button class="piece-handle image-scale-handle" type="button" aria-label="缩放 ${preset.label} 图片"></button>
    <button class="piece-handle rotate-handle" type="button" aria-label="旋转 ${preset.label}"></button>
    <button class="piece-handle resize-handle" type="button" aria-label="缩放 ${preset.label}"></button>
  `;
  pieceImages.set(piece, []);
  editorCanvas.append(piece);
  selectPiece(piece);
  updateImageLibrary();
}

editToggle.addEventListener('click', () => {
  if (viewingFavoritePage) return;
  closeBackgroundPanel();
  const editing = detailPage.classList.toggle('is-editing');
  editorPanel.classList.remove('is-second-page');
  detailPage.classList.remove('is-managing-images');
  closeImagePopover();
  editToggle.setAttribute('aria-pressed', String(editing));
  editToggle.setAttribute('aria-label', editing ? '退出编辑模式' : '进入编辑模式');
  if (!editing) {
    selectPiece(null);
    captureActiveCardPage(false);
  }
});

confirmEditButton.addEventListener('click', () => {
  detailPage.classList.remove('is-editing', 'is-managing-images');
  editorPanel.classList.remove('is-second-page');
  editToggle.setAttribute('aria-pressed', 'false');
  editToggle.setAttribute('aria-label', '进入编辑模式');
  closeImagePopover();
  selectPiece(null);
  captureActiveCardPage(false);
});

document.querySelectorAll('[data-category]').forEach((button) => {
  const category = button.dataset.category;
  const group = document.createElement('span');
  group.className = 'category-split';
  button.replaceWith(group);
  button.className = 'category-label';
  button.removeAttribute('data-category');
  button.dataset.openCategory = category;
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'category-add';
  add.dataset.addCategory = category;
  add.textContent = '+';
  add.setAttribute('aria-label', `新建 ${piecePresets[category].label} 格子`);
  group.append(button, add);
});

categoryGrid.addEventListener('click', (event) => {
  const add = event.target.closest('[data-add-category]');
  if (add) {
    createPiece(add.dataset.addCategory);
    return;
  }
  const label = event.target.closest('[data-open-category]');
  if (!label) return;
  const category = label.dataset.openCategory;
  const pieces = [...editorCanvas.querySelectorAll('.outfit-piece')].filter(piece => piece.dataset.category === category);
  if (!pieces.length) {
    showToast('先点类型旁的 + 新建一个格子');
    return;
  }
  const piece = pieces.includes(selectedPiece) ? selectedPiece : pieces[pieces.length - 1];
  selectPiece(piece);
  openImagePopover(piece, label);
});

imagePopover.addEventListener('click', (event) => {
  if (event.target.closest('.thumbnail-add') && popoverPiece) {
    imageTarget = popoverPiece;
    imagePopover.classList.remove('is-delete-mode');
    openImageSourcePicker();
    return;
  }
  const thumbnail = event.target.closest('.image-thumbnail');
  if (event.target.closest('.thumbnail-delete') && thumbnail && popoverPiece) {
    const index = Number(thumbnail.dataset.imageIndex);
    const images = getPieceImages(popoverPiece);
    const [removed] = images.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.src);
    renderPieceImage(popoverPiece, Math.min(index, images.length - 1));
    renderImagePopover();
    return;
  }
  if (event.target.closest('.thumbnail-select') && thumbnail && popoverPiece) {
    renderPieceImage(popoverPiece, Number(thumbnail.dataset.imageIndex));
    selectPiece(popoverPiece);
    renderImagePopover();
    return;
  }
  if (imagePopover.classList.contains('is-delete-mode')) {
    if (suppressPopoverClick) {
      suppressPopoverClick = false;
      return;
    }
    imagePopover.classList.remove('is-delete-mode');
  }
});

imagePopover.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button, .image-thumbnail')) return;
  window.clearTimeout(popoverHoldTimer);
  popoverHoldTimer = window.setTimeout(() => {
    suppressPopoverClick = true;
    imagePopover.classList.add('is-delete-mode');
  }, 3000);
});

['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
  imagePopover.addEventListener(type, () => window.clearTimeout(popoverHoldTimer));
});

deletePieceButton.addEventListener('click', () => {
  if (!selectedPiece) return;
  getPieceImages(selectedPiece).forEach((record) => URL.revokeObjectURL(record.src));
  pieceImages.delete(selectedPiece);
  selectedPiece.remove();
  selectPiece(null);
  updateImageLibrary();
  closeImagePopover();
});

function setImageTransform(piece, x, y, scale) {
  const image = piece.querySelector('img');
  if (!image || image.hidden || !image.naturalWidth || !image.naturalHeight) return;
  const boxWidth = piece.clientWidth;
  const boxHeight = piece.clientHeight;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = boxWidth / boxHeight;
  const baseWidth = imageRatio > boxRatio ? boxWidth : boxHeight * imageRatio;
  const baseHeight = imageRatio > boxRatio ? boxWidth / imageRatio : boxHeight;
  const zoomLimit = Math.max(6, getPieceImages(piece)[Number(piece.dataset.imageIndex || 0)]?.zoomLimit || 6);
  const safeScale = Math.max(.2, Math.min(zoomLimit, scale));
  const renderedWidth = baseWidth * safeScale;
  const renderedHeight = baseHeight * safeScale;
  const minVisible = 18;
  const maxX = Math.max(0, (renderedWidth + boxWidth) / 2 - minVisible);
  const maxY = Math.max(0, (renderedHeight + boxHeight) / 2 - minVisible);
  const safeX = Math.max(-maxX, Math.min(maxX, x));
  const safeY = Math.max(-maxY, Math.min(maxY, y));
  piece.dataset.imageX = String(safeX);
  piece.dataset.imageY = String(safeY);
  piece.dataset.imageScale = String(safeScale);
  image.style.setProperty('--image-x', `${safeX}px`);
  image.style.setProperty('--image-y', `${safeY}px`);
  image.style.setProperty('--image-scale', String(safeScale));
  const records = getPieceImages(piece);
  const record = records[Number(piece.dataset.imageIndex || 0)];
  if (record) Object.assign(record, { x: safeX, y: safeY, scale: safeScale });
}

const activeImagePointers = new Map();
const activePiecePointers = new Map();

function getImagePointers(piece) {
  return [...activeImagePointers.values()].filter((pointer) => pointer.piece === piece);
}

function getPiecePointers(piece) {
  return [...activePiecePointers.values()].filter((pointer) => pointer.piece === piece);
}

function pointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerCenter(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function pointerAngle(first, second) {
  return Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI;
}

function canvasDisplayScale() {
  return editorCanvas.getBoundingClientRect().width / Math.max(1, editorCanvas.clientWidth) || 1;
}

function canvasEditMinTop() {
  const canvasTop = editorCanvas.getBoundingClientRect().top;
  const controlsBottom = Math.max(...[...detailPage.querySelectorAll('.detail-back, .edit-toggle, .detail-more-toggle')]
    .map(button => button.getBoundingClientRect().bottom));
  return Math.max(0, (controlsBottom + 14 - canvasTop) / canvasDisplayScale());
}

function canvasEditMaxTop(itemHeight = 0) {
  const scale = canvasDisplayScale();
  const panelTop = editorPanel.getBoundingClientRect().top;
  const canvasTop = editorCanvas.getBoundingClientRect().top;
  return Math.max(canvasEditMinTop(), Math.min(editorCanvas.clientHeight - itemHeight, (panelTop - canvasTop) / scale - itemHeight - 12));
}

editorCanvas.addEventListener('pointerdown', (event) => {
  if (!detailPage.classList.contains('is-editing')) return;
  const piece = event.target.closest('.outfit-piece');
  if (!piece) {
    selectPiece(null);
    return;
  }

  const wasSelected = piece === selectedPiece;
  const rect = piece.getBoundingClientRect();
  const canvasRect = editorCanvas.getBoundingClientRect();
  {
    activePiecePointers.set(event.pointerId, {
      pointerId: event.pointerId,
      piece,
      x: event.clientX,
      y: event.clientY
    });
    const pointers = getPiecePointers(piece);
    if (pointers.length >= 2) {
      const [first, second] = pointers;
      const center = pointerCenter(first, second);
      editGesture = {
        mode: 'piece-pinch',
        piece,
        pointerIds: [first.pointerId, second.pointerId],
        startDistance: Math.max(1, pointerDistance(first, second)),
        startAngle: pointerAngle(first, second),
        startCenterX: center.x,
        startCenterY: center.y,
        pieceCenterX: piece.offsetLeft + piece.offsetWidth / 2,
        pieceCenterY: piece.offsetTop + piece.offsetHeight / 2,
        width: piece.offsetWidth,
        height: piece.offsetHeight,
        rotation: Number(piece.dataset.rotation || 0),
        imageOffsets: getPieceImages(piece).map(record => ({ record, x: record.x, y: record.y })),
        moved: true,
        wasSelected: false
      };
      piece.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
  }
  const mode = 'move';
  editGesture = {
    mode,
    piece,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: piece.offsetLeft,
    top: piece.offsetTop,
    width: rect.width,
    height: rect.height,
    rotation: Number(piece.dataset.rotation || 0),
    imageX: Number(piece.dataset.imageX || 0),
    imageY: Number(piece.dataset.imageY || 0),
    imageScale: Number(piece.dataset.imageScale || 1),
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    wasSelected,
    moved: false
  };
  piece.setPointerCapture(event.pointerId);
  event.preventDefault();
});

editorCanvas.addEventListener('pointermove', (event) => {
  const activePointer = activeImagePointers.get(event.pointerId);
  if (activePointer) {
    activePointer.x = event.clientX;
    activePointer.y = event.clientY;
  }
  const activePiecePointer = activePiecePointers.get(event.pointerId);
  if (activePiecePointer) {
    activePiecePointer.x = event.clientX;
    activePiecePointer.y = event.clientY;
  }
  if (!editGesture) return;
  if (editGesture.mode === 'piece-pinch') {
    if (!editGesture.pointerIds.includes(event.pointerId)) return;
    const pointers = editGesture.pointerIds.map((id) => activePiecePointers.get(id));
    if (pointers.some((pointer) => !pointer)) return;
    const [first, second] = pointers;
    const distance = Math.max(1, pointerDistance(first, second));
    const center = pointerCenter(first, second);
    const rotation = editGesture.rotation + pointerAngle(first, second) - editGesture.startAngle;
    const displayScale = canvasDisplayScale();
    const availableHeight = Math.max(42, canvasEditMaxTop() - canvasEditMinTop());
    const minRatio = Math.max(.3, 42 / editGesture.width, 42 / editGesture.height);
    const maxRatio = Math.max(minRatio, Math.min(4, editorCanvas.clientWidth / editGesture.width, availableHeight / editGesture.height));
    const ratio = Math.max(minRatio, Math.min(maxRatio, distance / editGesture.startDistance));
    const width = editGesture.width * ratio;
    const height = editGesture.height * ratio;
    const centerX = editGesture.pieceCenterX + (center.x - editGesture.startCenterX) / displayScale;
    const centerY = editGesture.pieceCenterY + (center.y - editGesture.startCenterY) / displayScale;
    const maxLeft = Math.max(0, editorCanvas.clientWidth - width);
    const maxTop = canvasEditMaxTop(height);
    editGesture.piece.style.width = `${width}px`;
    editGesture.piece.style.height = `${height}px`;
    editGesture.piece.style.left = `${Math.max(0, Math.min(maxLeft, centerX - width / 2))}px`;
    editGesture.piece.style.top = `${Math.max(canvasEditMinTop(), Math.min(maxTop, centerY - height / 2))}px`;
    editGesture.piece.dataset.rotation = String(rotation);
    editGesture.piece.style.setProperty('--rotation', `${rotation}deg`);
    editGesture.imageOffsets.forEach(({ record, x, y }) => {
      record.x = x * ratio;
      record.y = y * ratio;
    });
    const currentImage = getPieceImages(editGesture.piece)[Number(editGesture.piece.dataset.imageIndex || 0)];
    setImageTransform(
      editGesture.piece,
      currentImage?.x || 0,
      currentImage?.y || 0,
      Number(editGesture.piece.dataset.imageScale || 1)
    );
    event.preventDefault();
    return;
  }
  if (editGesture.mode === 'image-pinch') {
    if (!editGesture.pointerIds.includes(event.pointerId)) return;
    const pointers = editGesture.pointerIds.map((id) => activeImagePointers.get(id));
    if (pointers.some((pointer) => !pointer)) return;
    const [first, second] = pointers;
    const distance = Math.max(1, pointerDistance(first, second));
    const center = pointerCenter(first, second);
    const rect = editGesture.piece.getBoundingClientRect();
    const zoomLimit = Math.max(6, getPieceImages(editGesture.piece)[Number(editGesture.piece.dataset.imageIndex || 0)]?.zoomLimit || 6);
    const scale = Math.max(.2, Math.min(zoomLimit, editGesture.imageScale * distance / editGesture.startDistance));
    const scaleRatio = scale / editGesture.imageScale;
    const focusX = center.x - (rect.left + rect.width / 2);
    const focusY = center.y - (rect.top + rect.height / 2);
    const imageX = focusX - (editGesture.startFocusX - editGesture.imageX) * scaleRatio;
    const imageY = focusY - (editGesture.startFocusY - editGesture.imageY) * scaleRatio;
    editGesture.moved = true;
    setImageTransform(editGesture.piece, imageX, imageY, scale);
    event.preventDefault();
    return;
  }
  if (event.pointerId !== editGesture.pointerId) return;
  const { piece } = editGesture;
  const dx = (event.clientX - editGesture.startX) / canvasDisplayScale();
  const dy = (event.clientY - editGesture.startY) / canvasDisplayScale();
  if (Math.abs(dx) + Math.abs(dy) > 4) editGesture.moved = true;

  if (editGesture.mode === 'move') {
    const maxLeft = editorCanvas.clientWidth - piece.offsetWidth;
    const maxTop = canvasEditMaxTop(piece.offsetHeight);
    piece.style.left = `${Math.max(0, Math.min(maxLeft, editGesture.left + dx))}px`;
    piece.style.top = `${Math.max(canvasEditMinTop(), Math.min(maxTop, editGesture.top + dy))}px`;
  } else if (editGesture.mode === 'resize') {
    piece.style.width = `${Math.max(42, editGesture.width + dx)}px`;
    piece.style.height = `${Math.max(42, editGesture.height + dy)}px`;
    setImageTransform(piece, Number(piece.dataset.imageX || 0), Number(piece.dataset.imageY || 0), Number(piece.dataset.imageScale || 1));
  } else if (editGesture.mode === 'image-move') {
    setImageTransform(piece, editGesture.imageX + dx, editGesture.imageY + dy, editGesture.imageScale);
  } else if (editGesture.mode === 'image-scale') {
    const scale = editGesture.imageScale + (-dx + dy) / 180;
    setImageTransform(piece, editGesture.imageX, editGesture.imageY, scale);
  } else {
    const currentAngle = Math.atan2(event.clientY - editGesture.centerY, event.clientX - editGesture.centerX) * 180 / Math.PI;
    const startAngle = Math.atan2(editGesture.startY - editGesture.centerY, editGesture.startX - editGesture.centerX) * 180 / Math.PI;
    const rotation = editGesture.rotation + currentAngle - startAngle;
    piece.dataset.rotation = String(rotation);
    piece.style.setProperty('--rotation', `${rotation}deg`);
  }
});

function finishEditGesture(event) {
  const activePointer = activeImagePointers.get(event.pointerId);
  if (activePointer) activeImagePointers.delete(event.pointerId);
  const activePiecePointer = activePiecePointers.get(event.pointerId);
  if (activePiecePointer) activePiecePointers.delete(event.pointerId);
  if (!editGesture) return;
  if (editGesture.mode === 'piece-pinch') {
    if (!editGesture.pointerIds.includes(event.pointerId)) return;
    const { piece } = editGesture;
    if (piece.hasPointerCapture(event.pointerId)) piece.releasePointerCapture(event.pointerId);
    const remaining = getPiecePointers(piece)[0];
    if (remaining) {
      editGesture = {
        mode: 'move',
        piece,
        pointerId: remaining.pointerId,
        startX: remaining.x,
        startY: remaining.y,
        left: piece.offsetLeft,
        top: piece.offsetTop,
        width: piece.offsetWidth,
        height: piece.offsetHeight,
        moved: true,
        wasSelected: false
      };
    } else {
      editGesture = null;
    }
    return;
  }
  if (editGesture.mode === 'image-pinch') {
    if (!editGesture.pointerIds.includes(event.pointerId)) return;
    const { piece } = editGesture;
    if (piece.hasPointerCapture(event.pointerId)) piece.releasePointerCapture(event.pointerId);
    const remaining = getImagePointers(piece)[0];
    editGesture = remaining ? {
      mode: 'image-move',
      piece,
      pointerId: remaining.pointerId,
      startX: remaining.x,
      startY: remaining.y,
      imageX: Number(piece.dataset.imageX || 0),
      imageY: Number(piece.dataset.imageY || 0),
      imageScale: Number(piece.dataset.imageScale || 1),
      moved: true,
      wasSelected: true
    } : null;
    return;
  }
  if (event.pointerId !== editGesture.pointerId) return;
  const { piece, moved, wasSelected, mode } = editGesture;
  if (piece.hasPointerCapture(event.pointerId)) piece.releasePointerCapture(event.pointerId);
  editGesture = null;
  if (!moved && !wasSelected && mode === 'move') {
    selectPiece(piece);
    return;
  }
  if (!moved && wasSelected && mode === 'move' && !getPieceImages(piece).length) {
    imageTarget = piece;
    openImageSourcePicker();
  }
}

editorCanvas.addEventListener('pointerup', finishEditGesture);
editorCanvas.addEventListener('pointercancel', finishEditGesture);

editorCanvas.addEventListener('pointerdown', (event) => {
  if (detailPage.classList.contains('is-editing')) return;
  const piece = event.target.closest('.outfit-piece');
  if (!piece || !getPieceImages(piece).length) return;
  viewGesture = {
    piece,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY
  };
  piece.setPointerCapture(event.pointerId);
  event.preventDefault();
});

editorCanvas.addEventListener('pointermove', (event) => {
  if (!viewGesture || viewGesture.pointerId !== event.pointerId) return;
  viewGesture.currentX = event.clientX;
  viewGesture.currentY = event.clientY;
  event.preventDefault();
});

function finishViewGesture(event) {
  if (!viewGesture || viewGesture.pointerId !== event.pointerId) return;
  const { piece, startX, currentX, startY, currentY } = viewGesture;
  const dx = currentX - startX;
  if (piece.hasPointerCapture(event.pointerId)) piece.releasePointerCapture(event.pointerId);
  viewGesture = null;
  const images = getPieceImages(piece);
  if (Math.abs(dx) > 34 && images.length > 1) {
    const currentIndex = Number(piece.dataset.imageIndex || 0);
    const direction = dx < 0 ? 1 : -1;
    renderPieceImage(piece, (currentIndex + direction + images.length) % images.length);
  }
  showPieceDots(piece);
  if (event.type === 'pointerup' && Math.hypot(dx, currentY - startY) < 6) refreshDetailPreview(true);
}

editorCanvas.addEventListener('pointerup', finishViewGesture);
editorCanvas.addEventListener('pointercancel', finishViewGesture);

editorCanvas.addEventListener('pointerdown', (event) => {
  if (detailPage.classList.contains('is-editing')) return;
  if (event.target.closest('.outfit-piece')) return;
  pageSwipeGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    currentX: event.clientX,
    currentY: event.clientY
  };
  editorCanvas.setPointerCapture(event.pointerId);
});

editorCanvas.addEventListener('pointermove', (event) => {
  if (!pageSwipeGesture || pageSwipeGesture.pointerId !== event.pointerId) return;
  pageSwipeGesture.currentX = event.clientX;
  pageSwipeGesture.currentY = event.clientY;
  event.preventDefault();
});

function finishPageSwipe(event) {
  if (!pageSwipeGesture || pageSwipeGesture.pointerId !== event.pointerId) return;
  const dx = pageSwipeGesture.currentX - pageSwipeGesture.startX;
  const dy = pageSwipeGesture.currentY - pageSwipeGesture.startY;
  if (editorCanvas.hasPointerCapture(event.pointerId)) editorCanvas.releasePointerCapture(event.pointerId);
  pageSwipeGesture = null;
  if (viewingFavoritePage) return;
  if (Math.abs(dx) < 54 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

  if (dx > 0) {
    if (activeCardPageIndex === 0) {
      window.history.back();
    } else {
      switchDetailCardPage(activeCardPageIndex - 1);
    }
    return;
  }

  if (switchDetailCardPage(activeCardPageIndex + 1)) return;
  const states = activeCard && cardPageStates.get(activeCard);
  if (!states) return;
  const hasContent = Boolean(editorCanvas.querySelector('.outfit-piece, .outfit-color-palette'))
    || (detailPage.style.getPropertyValue('--detail-background-image') || 'none') !== 'none';
  if (!hasContent) {
    showToast('先在这一页添加内容，再新建下一页');
    return;
  }
  captureActiveCardPage(true);
  states.push(createCardPageState());
  syncCardPages(activeCard);
  loadCardPage(activeCard, states.length - 1);
  goToInternalPage(activeCard, states.length - 1);
  closeBackgroundPanel();
  closeImagePopover();
  showToast('已新建空白页');
}

editorCanvas.addEventListener('pointerup', finishPageSwipe);
editorCanvas.addEventListener('pointercancel', finishPageSwipe);

const framingPage = document.querySelector('.image-framing');
const framingStage = document.querySelector('.framing-stage');
const framingPhoto = document.querySelector('.framing-photo');
const framingImage = framingPhoto.querySelector('img');
const framingSelection = document.querySelector('.framing-selection');
const framingSize = document.querySelector('.framing-size');
const framingZoom = document.querySelector('.framing-zoom');
framingZoom.addEventListener('input', () => {
  if (!framing?.ready) return;
  framing.zoom = Number(framingZoom.value) / 100;
  renderFramingSelection();
});
const framingConfirm = document.querySelector('.framing-confirm');
const framingFavorite = document.querySelector('.framing-favorite');
const framingReplaceInput = document.querySelector('.framing-replace-input');
let framing;
let framingGesture;

function renderFramingSelection() {
  if (!framing?.ready) return;
  const f = framing;
  const zoom = f.zoom || 1;
  framingImage.style.transform = `scale(${zoom})`;
  document.querySelector('.framing-zoom-control').hidden = !f.lockedRatio;
  framingZoom.value = String(zoom * 100);
  document.querySelector('.framing-zoom-control output').textContent = `${Math.round(zoom * 100)}%`;
  f.width = Math.max(f.minWidth, Math.min(f.maxWidth, f.width));
  const height = f.width / f.ratio;
  f.x = Math.max(0, Math.min(f.photoWidth - f.width, f.x));
  f.y = Math.max(0, Math.min(f.photoHeight - height, f.y));
  Object.assign(framingSelection.style, {
    left: f.x + 'px', top: f.y + 'px', width: f.width + 'px', height: height + 'px'
  });
  framingSize.value = String(100 * (f.width - f.minWidth) / Math.max(.001, f.maxWidth - f.minWidth));
  framingFavorite.disabled = false;
  const saved = itemFavorites.has(f.src);
  framingFavorite.setAttribute('aria-pressed', String(saved));
  framingFavorite.textContent = saved ? '♥ 已收藏单品' : '♡ 收藏单品';
}

function sizeFramingPhoto() {
  if (!framing || !framingImage.naturalWidth) return;
  const f = framing;
  const oldWidth = f.photoWidth;
  const fit = Math.min(framingStage.clientWidth / framingImage.naturalWidth, framingStage.clientHeight / framingImage.naturalHeight);
  f.photoWidth = framingImage.naturalWidth * fit;
  f.photoHeight = framingImage.naturalHeight * fit;
  Object.assign(framingPhoto.style, { width: f.photoWidth + 'px', height: f.photoHeight + 'px' });
  f.maxWidth = Math.min(f.photoWidth, f.photoHeight * f.ratio);
  // Match the existing in-frame zoom range so confirming preserves the preview.
  f.minWidth = Math.max(f.photoWidth, f.photoHeight * f.ratio) / 6;
  if (f.minWidth > f.maxWidth) f.minWidth = f.maxWidth;
  if (f.ready && oldWidth) {
    const ratio = f.photoWidth / oldWidth;
    f.x *= ratio;
    f.y *= ratio;
    f.width *= ratio;
  } else if (f.existingRecord && f.src === f.existingRecord.src) {
    const record = f.existingRecord;
    const bw = f.target.clientWidth;
    const bh = f.target.clientHeight;
    const baseWidth = Math.min(bw, bh * f.photoWidth / f.photoHeight);
    f.zoom = record.framingZoom || 1;
    const mapping = baseWidth * record.scale / (f.photoWidth * f.zoom);
    f.width = bw / mapping;
    f.x = f.photoWidth / 2 - record.x / mapping - f.width / 2;
    f.y = f.photoHeight / 2 - record.y / mapping - f.width / f.ratio / 2;
  } else {
    f.width = f.maxWidth;
    f.x = (f.photoWidth - f.width) / 2;
    f.y = (f.photoHeight - f.width / f.ratio) / 2;
  }
  f.ready = true;
  framingSelection.hidden = false;
  framingConfirm.disabled = false;
  renderFramingSelection();
}

function closeFraming(keepImage = false) {
  if (framing && !keepImage && framing.src !== framing.existingRecord?.src) URL.revokeObjectURL(framing.src);
  framing = null;
  framingGesture = null;
  framingPage.hidden = true;
  framingImage.removeAttribute('src');
}

document.querySelector('.framing-cancel').addEventListener('click', () => closeFraming());
document.querySelector('.framing-replace').addEventListener('click', () => {
  if (framing) framingReplaceInput.click();
});
framingReplaceInput.addEventListener('change', () => {
  const file = framingReplaceInput.files?.[0];
  framingReplaceInput.value = '';
  if (!file || !framing) return;
  if (framing.src !== framing.existingRecord?.src) URL.revokeObjectURL(framing.src);
  framing.src = URL.createObjectURL(file);
  framing.zoom = 1;
  framing.ready = false;
  framingConfirm.disabled = true;
  framingFavorite.disabled = true;
  framingSelection.hidden = true;
  framingImage.src = framing.src;
});
framingFavorite.addEventListener('click', () => {
  if (!framing?.ready) return;
  const f = framing;
  if (itemFavorites.has(f.src)) {
    itemFavorites.delete(f.src);
  } else {
    // Save a separate preview; the editable original and its URL remain untouched.
    const canvas = document.createElement('canvas');
    const zoom = f.zoom || 1;
    const sourceScale = framingImage.naturalWidth / (f.photoWidth * zoom);
    const sw = f.width * sourceScale;
    const sh = sw / f.ratio;
    const fit = Math.min(1, 1400 / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * fit));
    canvas.height = Math.max(1, Math.round(sh * fit));
    canvas.getContext('2d').drawImage(framingImage,
      (f.x + f.photoWidth * (zoom - 1) / 2) * sourceScale,
      (f.y + f.photoHeight * (zoom - 1) / 2) * sourceScale,
      sw, sh, 0, 0, canvas.width, canvas.height);
    itemFavorites.set(f.src, {
      src: canvas.toDataURL('image/png'),
      name: piecePresets[f.target.dataset.category]?.label || '单品'
    });
  }
  renderFramingSelection();
});
framingImage.addEventListener('load', sizeFramingPhoto);
framingImage.addEventListener('error', () => {
  closeFraming();
  showToast('图片无法读取，请换一张图片');
});
new ResizeObserver(() => {
  if (!framingPage.hidden && framing?.ready) sizeFramingPhoto();
}).observe(framingStage);

framingSize.addEventListener('input', () => {
  if (!framing?.ready) return;
  const nextWidth = framing.minWidth + Number(framingSize.value) / 100 * (framing.maxWidth - framing.minWidth);
  framing.x += (framing.width - nextWidth) / 2;
  framing.y += (framing.width - nextWidth) / (2 * framing.ratio);
  framing.width = nextWidth;
  renderFramingSelection();
});
framingSelection.addEventListener('pointerdown', (event) => {
  if (!framing?.ready || framingGesture) return;
  framingGesture = { id: event.pointerId, x: event.clientX, y: event.clientY,
    left: framing.x, top: framing.y, width: framing.width, height: framing.width / framing.ratio,
    resize: Boolean(event.target.closest('.framing-resize')) };
  framingSelection.setPointerCapture(event.pointerId);
  event.preventDefault();
});
framingSelection.addEventListener('pointermove', (event) => {
  if (!framingGesture || event.pointerId !== framingGesture.id) return;
  const g = framingGesture;
  const rect = framingPhoto.getBoundingClientRect();
  const dx = (event.clientX - g.x) * framing.photoWidth / rect.width;
  const dy = (event.clientY - g.y) * framing.photoHeight / rect.height;
  if (g.resize) {
    if (!framing.lockedRatio) {
      const width = Math.max(24, Math.min(framing.photoWidth - g.left, g.width + dx));
      const height = Math.max(24, Math.min(framing.photoHeight - g.top, g.height + dy));
      framing.ratio = width / height;
      framing.maxWidth = Math.min(framing.photoWidth, framing.photoHeight * framing.ratio);
      framing.minWidth = Math.min(framing.maxWidth, Math.max(framing.photoWidth, framing.photoHeight * framing.ratio) / 6);
      framing.width = width;
      renderFramingSelection();
      return;
    }
    const delta = (dx + dy * framing.ratio) / 2;
    const limit = Math.min(framing.photoWidth - g.left, (framing.photoHeight - g.top) * framing.ratio);
    framing.width = Math.max(framing.minWidth, Math.min(limit, g.width + delta));
  } else {
    framing.x = g.left + dx;
    framing.y = g.top + dy;
  }
  renderFramingSelection();
});
function endFramingGesture(event) {
  if (event.pointerId !== framingGesture?.id) return;
  framingGesture = null;
  if (framingSelection.hasPointerCapture(event.pointerId)) framingSelection.releasePointerCapture(event.pointerId);
}
framingSelection.addEventListener('pointerup', endFramingGesture);
framingSelection.addEventListener('pointercancel', endFramingGesture);
framingConfirm.addEventListener('click', () => {
  if (!framing?.ready || !framing.target.isConnected) return;
  const f = framing;
  const target = f.target;
  if (!f.lockedRatio) {
    const maxHeight = Math.max(42, editorCanvas.clientHeight - editorPanel.offsetHeight - 52);
    const width = Math.min(target.clientWidth, maxHeight * f.ratio);
    target.style.width = width + 'px';
    target.style.height = width / f.ratio + 'px';
  }
  target.dataset.frameRatio = String(f.ratio);
  const boxWidth = target.clientWidth;
  const boxHeight = target.clientHeight;
  const mapping = boxWidth / f.width;
  const baseWidth = Math.min(boxWidth, boxHeight * f.photoWidth / f.photoHeight);
  const record = {
    src: f.src,
    x: (f.photoWidth / 2 - f.x - f.width / 2) * mapping,
    y: (f.photoHeight / 2 - f.y - f.width / f.ratio / 2) * mapping,
    scale: f.photoWidth * mapping / baseWidth * (f.zoom || 1),
    framingZoom: f.zoom || 1
  };
  record.zoomLimit = Math.max(6, record.scale * 2);
  const images = getPieceImages(target);
  let index = 0;
  if (f.existingRecord) {
    index = images.indexOf(f.existingRecord);
    if (index < 0) return;
    const previousSrc = f.existingRecord.src;
    Object.assign(f.existingRecord, record);
    if (previousSrc !== record.src) URL.revokeObjectURL(previousSrc);
  } else {
    images.unshift(record);
  }
  pieceImages.set(target, images);
  closeFraming(true);
  renderPieceImage(target, index);
  selectPiece(target);
  updateImageLibrary();
  if (editorPanel.classList.contains('is-second-page')) detailPage.classList.add('is-managing-images');
});

reframePieceButton.addEventListener('click', () => {
  if (!selectedPiece) return;
  const images = getPieceImages(selectedPiece);
  const record = images[Number(selectedPiece.dataset.imageIndex || 0)];
  if (!record) return;
  if (framing) closeFraming();
  framing = {
    src: record.src, target: selectedPiece, existingRecord: record,
    ratio: Number(selectedPiece.dataset.frameRatio) || selectedPiece.clientWidth / selectedPiece.clientHeight,
    lockedRatio: images.length > 1, ready: false
  };
  document.querySelector('.framing-footer p').textContent = framing.lockedRatio
    ? '拖动选框 · 比例已锁定'
    : '拖动选框 · 右下角调整比例';
  framingConfirm.disabled = true;
  framingSelection.hidden = true;
  framingPage.hidden = false;
  framingFavorite.disabled = true;
  framingFavorite.setAttribute('aria-pressed', String(itemFavorites.has(record.src)));
  framingFavorite.textContent = itemFavorites.has(record.src) ? '♥ 已收藏单品' : '♡ 收藏单品';
  framingImage.src = record.src;
});

imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (!file || !imageTarget) return;
  startImageFraming(URL.createObjectURL(file));
  imageInput.value = '';
});

function startImageFraming(src) {
  if (!imageTarget?.isConnected) return;
  if (framing) closeFraming();
  framing = { src, target: imageTarget,
    ratio: Number(imageTarget.dataset.frameRatio) || imageTarget.clientWidth / imageTarget.clientHeight,
    lockedRatio: Boolean(imageTarget.dataset.frameRatio) || getPieceImages(imageTarget).length > 0, ready: false };
  document.querySelector('.framing-footer p').textContent = framing.lockedRatio
    ? '拖动选框 · 比例已锁定'
    : '拖动选框 · 右下角调整比例';
  framingConfirm.disabled = true;
  framingSelection.hidden = true;
  framingPage.hidden = false;
  framingFavorite.disabled = true;
  framingFavorite.setAttribute('aria-pressed', 'false');
  framingFavorite.textContent = '♡ 收藏单品';
  framingImage.src = framing.src;
}

let dragStartX = 0;
let dragStartScroll = 0;
let dragSurface;
let dragCandidateMedia;
let dragOuterStartScroll = 0;
let dragMoved = false;
let ignoreCardClickUntil = 0;
let cardDragPointerId;

cardViewport.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  dragSurface = null;
  dragCandidateMedia = event.target.closest('.card-media');
  dragStartX = event.clientX;
  dragStartScroll = dragCandidateMedia?.scrollLeft || 0;
  dragOuterStartScroll = cardViewport.scrollLeft;
  dragMoved = false;
  cardDragPointerId = event.pointerId;
});

cardViewport.addEventListener('pointermove', (event) => {
  if (cardDragPointerId !== event.pointerId) return;
  const dx = event.clientX - dragStartX;
  if (!dragSurface && Math.abs(dx) > 4) {
    cardViewport.setPointerCapture(event.pointerId);
    if (!dragCandidateMedia) {
      dragSurface = cardViewport;
    } else {
      const pageCount = dragCandidateMedia.querySelectorAll('.card-page').length;
      const pageIndex = Math.round(dragStartScroll / Math.max(1, dragCandidateMedia.clientWidth));
      const pullingPastFirst = pageIndex === 0 && dx > 0;
      const pullingPastLast = pageIndex === pageCount - 1 && dx < 0;
      dragSurface = pageCount <= 1 || pullingPastFirst || pullingPastLast
        ? cardViewport
        : dragCandidateMedia;
    }
    dragSurface.classList.add('is-dragging');
  }
  if (!dragSurface) return;
  dragMoved = true;
  const startScroll = dragSurface === cardViewport ? dragOuterStartScroll : dragStartScroll;
  dragSurface.scrollLeft = startScroll - dx;
  event.preventDefault();
});

function stopDragging(event) {
  if (cardDragPointerId !== event.pointerId) return;
  cardDragPointerId = undefined;
  const surface = dragSurface;
  if (surface) surface.classList.remove('is-dragging');
  if (dragMoved) ignoreCardClickUntil = performance.now() + 260;
  if (surface?.classList.contains('card-media')) {
    const card = surface.closest('.outfit-card');
    const page = Math.round(surface.scrollLeft / Math.max(1, surface.clientWidth));
    goToInternalPage(card, page);
  } else if (surface === cardViewport) {
    const viewportCenter = cardViewport.scrollLeft + cardViewport.clientWidth / 2;
    const cards = [...cardTrack.querySelectorAll('.outfit-card')];
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    goToCard(nearestIndex);
  }
  if (cardViewport.hasPointerCapture(event.pointerId)) cardViewport.releasePointerCapture(event.pointerId);
  dragSurface = null;
  dragCandidateMedia = null;
  dragMoved = false;
}

cardViewport.addEventListener('pointerup', stopDragging);
cardViewport.addEventListener('pointercancel', stopDragging);

mainAddButton.addEventListener('click', () => {
  if (activeTab === 'inspire') createSphereLibrary();
  else createCard();
});
