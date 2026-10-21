/* Local detail-page tools. All assets stay in the existing in-memory page model. */
const toolsSheet = document.querySelector('.detail-tools-sheet');
const toolsBody = document.querySelector('.detail-tools-body');
let toolsReturnFocus;
let layoutUndo;
let shareObjectURL;
const seenToolHints = new Set();

function toolHintOnce(key, text) {
  const storageKey = `muse:tool-hint:${key}`;
  if (seenToolHints.has(key)) return;
  try { if (localStorage.getItem(storageKey)) return; } catch {}
  toolNote(text);
  seenToolHints.add(key);
  try { localStorage.setItem(storageKey, '1'); } catch {}
}

function closeDetailTools() {
  toolsSheet.hidden = true;
  if (shareObjectURL) URL.revokeObjectURL(shareObjectURL);
  shareObjectURL = null;
  refreshDetailPreview(false);
  toolsReturnFocus?.focus?.({ preventScroll: true });
}

function openDetailTools(title) {
  toolsReturnFocus = document.activeElement;
  closeImagePopover();
  closeBackgroundPanel();
  window.clearTimeout(detailIdleTimer);
  document.querySelector('.detail-tools-title').textContent = title;
  toolsSheet.setAttribute('aria-label', title);
  toolsBody.classList.remove('is-creative-menu', 'is-layout-menu');
  toolsBody.replaceChildren();
  toolsSheet.hidden = false;
  document.querySelector('.detail-tools-close').focus({ preventScroll: true });
}

function toolAction(label, callback, parent = toolsBody) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', callback);
  parent.append(button);
  return button;
}

function toolNote(text) {
  const p = document.createElement('p');
  p.textContent = text;
  toolsBody.append(p);
}

document.querySelector('.detail-tools-close').addEventListener('click', closeDetailTools);
toolsSheet.addEventListener('click', event => { if (event.target === toolsSheet) closeDetailTools(); });
toolsSheet.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeDetailTools();
  if (event.key !== 'Tab') return;
  const items = [...toolsSheet.querySelectorAll('button:not(:disabled), input, textarea, select, a[href]')];
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
window.addEventListener('popstate', () => { toolsSheet.hidden = true; });
document.querySelector('.detail-more-toggle').addEventListener('click', () => {
  openDetailTools('创作台');
  toolsBody.classList.add('is-creative-menu');
  if (!viewingFavoritePage) creativeAction('排版', '自动排版', '<rect x="3" y="3" width="8" height="18" rx="1.5"/><rect x="15" y="3" width="6" height="7" rx="1.5"/><rect x="15" y="14" width="6" height="7" rx="1.5"/>', openLayoutTools);
  creativeAction('分享', '生成分享图片', '<path d="M12 15V3m-4 4 4-4 4 4M5 11v9h14v-9"/>', generateShareImage);
  if (viewingFavoritePage) return;
  creativeAction('另存', '另存或移到其他卡片库', '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3m6-5v7m-3.5-3.5h7"/>', openSaveOptions);
});

function creativeAction(label, description, icon, callback) {
  const button = toolAction('', callback);
  button.className = 'creative-action';
  button.setAttribute('aria-label', description);
  button.title = description;
  button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24">${icon}</svg><span>${label}</span>`;
}

function openSaveOptions() {
  if (!activeCard || viewingFavoritePage) return;
  openDetailTools('保存');
  toolAction('另存为新一页', () => { closeDetailTools(); saveCurrentOutfit(); });
  toolAction('复制到其他卡片库', () => openMoveLibrary(true));
  toolAction('移到其他卡片库', () => openMoveLibrary(false));
  toolHintOnce('save-v2', '另存只保留当前显示的单品。复制和移动包含本页所有备选图片；复制保留原页，移动不保留。');
}

function openMoveLibrary(copy = false) {
  openDetailTools('选择目标卡片库');
  const cards = [...cardTrack.querySelectorAll('.outfit-card')];
  cards.forEach((card, index) => {
    if (card !== activeCard) toolAction(`${card.getAttribute('aria-label') || `卡片库 ${index + 1}`} · ${cardPageStates.get(card).length} 页`, () => copy ? copyCurrentPageTo(card) : moveCurrentPageTo(card));
  });
  toolAction(copy ? '＋ 新建卡片库并复制' : '＋ 新建卡片库并移入', () => {
    if (copy) return copyCurrentPageTo(null);
    createCard();
    moveCurrentPageTo(cardTrack.querySelector('.outfit-card:last-child'));
  });
  toolHintOnce(copy ? 'copy' : 'move', copy ? '复制后仍留在当前页，两份页面可独立修改。' : '移动后留在原库；原库没有其他页面时，会保留一张空白页。');
}

async function copyCurrentPageTo(target) {
  if (!activeCard || viewingFavoritePage || target === activeCard) return;
  const buttons = [...toolsBody.querySelectorAll('button')];
  buttons.forEach(button => { button.disabled = true; });
  const page = createCardPageState();
  page.backgroundId = activeBackgroundId;
  page.backgroundImage = detailPage.style.getPropertyValue('--detail-background-image') || 'none';
  page.backgroundOpacity = detailPage.style.getPropertyValue('--detail-background-opacity') || '1';
  page.canvasWidth = editorCanvas.clientWidth;
  page.canvasHeight = editorCanvas.clientHeight;
  const snapshots = [...editorCanvas.querySelectorAll('.outfit-piece')].map(piece => ({
    clone: piece.cloneNode(true), records: getPieceImages(piece).map(record => ({ ...record }))
  }));
  try {
    for (const { clone, records } of snapshots) {
      for (const record of records) {
        const image = await loadToolImage(record.src);
        const bitmap = document.createElement('canvas');
        bitmap.width = image.naturalWidth; bitmap.height = image.naturalHeight;
        bitmap.getContext('2d').drawImage(image, 0, 0);
        record.src = bitmap.toDataURL('image/png');
      }
      clone.dataset.pieceId = String(++pieceCount);
      clone.classList.remove('is-selected', 'show-image-pages');
      pieceImages.set(clone, records);
      if (records.length) clone.querySelector('img').src = records[Number(clone.dataset.imageIndex || 0)].src;
      page.nodes.append(clone);
    }
    const palette = editorCanvas.querySelector('.outfit-color-palette');
    if (palette) page.nodes.append(palette.cloneNode(true));
    if (!target) { createCard(); target = cardTrack.querySelector('.outfit-card:last-child'); }
    const states = cardPageStates.get(target);
    if (states.length === 1 && !states[0].nodes.childNodes.length && states[0].backgroundImage === 'none') states.splice(0, 1);
    states.push(page);
    syncCardPages(target);
    renderCardPagePreview(target, states.length - 1, page.nodes);
    closeDetailTools();
    showToast(`已复制到${target.getAttribute('aria-label')}，第 ${states.length} 页`);
  } catch {
    showToast('图片暂时无法读取，请稍后重试');
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}

function moveCurrentPageTo(target) {
  if (!activeCard || target === activeCard) return;
  const source = activeCard;
  const index = activeCardPageIndex;
  captureActiveCardPage(true);
  const sourceStates = cardPageStates.get(source);
  const [state] = sourceStates.splice(index, 1);
  const targetStates = cardPageStates.get(target);
  // Replace a new library's untouched blank page, otherwise append.
  if (targetStates.length === 1 && !targetStates[0].nodes.childNodes.length && targetStates[0].backgroundImage === 'none') targetStates.splice(0, 1);
  targetStates.push(state);
  if (!sourceStates.length) sourceStates.push(createCardPageState());
  activeCard = null;
  syncCardPages(target);
  renderCardPagePreview(target, targetStates.length - 1, state.nodes);
  loadCardPage(source, Math.min(index, sourceStates.length - 1));
  sourceStates.forEach((page, i) => renderCardPagePreview(source, i, i === activeCardPageIndex ? editorCanvas : page.nodes));
  goToInternalPage(source, activeCardPageIndex);
  closeDetailTools();
  showToast(`已移到${target.getAttribute('aria-label')}，第 ${targetStates.length} 页`);
}

function collectReusableImages() {
  const sources = new Map();
  const collect = root => root.querySelectorAll('.outfit-piece').forEach(piece => {
    if (piece.dataset.decoration) return;
    getPieceImages(piece).forEach(record => sources.set(record.src, record));
  });
  collect(editorCanvas);
  cardTrack.querySelectorAll('.outfit-card').forEach(card => {
    (cardPageStates.get(card) || []).forEach(state => collect(state.nodes));
  });
  return [...sources.values()];
}

function loadToolImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片无法读取'));
    image.src = src;
  });
}

function openImageSourcePicker() {
  if (!imageTarget?.isConnected) return;
  openDetailTools('添加图片');
  toolAction('相册 / 文件', () => { closeDetailTools(); imageInput.click(); });
  toolAction('已添加的图片', openReusableImagePicker);
}

function openReusableImagePicker() {
  if (!imageTarget?.isConnected) return;
  openDetailTools('已添加的图片');
  toolAction('‹ 返回选择来源', openImageSourcePicker);
  toolHintOnce('reuse', '仅显示仍保留在卡片页面中的图片。');
  const records = collectReusableImages();
  if (!records.length) { toolNote('还没有可复用的图片。'); return; }
  const grid = document.createElement('div');
  grid.className = 'reuse-image-grid';
  toolsBody.append(grid);
  records.forEach((record, index) => {
    const button = toolAction('', async () => {
      button.disabled = true;
      try {
        const image = await loadToolImage(record.src);
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        const copy = canvas.toDataURL('image/png');
        closeDetailTools();
        startImageFraming(copy);
      } catch { button.disabled = false; showToast('这张图片暂时无法读取，请重新选择'); }
    }, grid);
    button.setAttribute('aria-label', `使用已上传图片 ${index + 1}`);
    const image = document.createElement('img');
    image.src = record.src; image.alt = ''; image.loading = 'lazy';
    button.append(image);
  });
}


function openLayoutTools() {
  openDetailTools('自动排版');
  toolsBody.classList.add('is-layout-menu');
  creativeAction('网格', '整齐网格', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', () => autoArrangeOutfit('grid'));
  creativeAction('主角', '主角突出', '<rect x="3" y="3" width="10" height="18" rx="1"/><rect x="17" y="3" width="4" height="7" rx="1"/><rect x="17" y="14" width="4" height="7" rx="1"/>', () => autoArrangeOutfit('hero'));
  creativeAction('拼贴', '错落拼贴', '<rect x="4" y="4" width="10" height="13" rx="1" transform="rotate(-10 9 10)"/><path d="m16 8 5 1-2 13-10-2"/>', () => autoArrangeOutfit('collage'));
  const undo = toolAction('', undoOutfitLayout);
  undo.className = 'layout-undo creative-action';
  undo.setAttribute('aria-label', '撤销上一次排版');
  undo.title = '撤销上一次排版';
  undo.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12h-3"/></svg>';
}

function fitPieceIntoCell(piece, cell, angle = 0) {
  const oldW = piece.offsetWidth, oldH = piece.offsetHeight;
  const scale = Math.min(cell.w / oldW, cell.h / oldH);
  const w = oldW * scale, h = oldH * scale;
  piece.style.width = w + 'px'; piece.style.height = h + 'px';
  piece.style.left = cell.x + (cell.w - w) / 2 + 'px';
  piece.style.top = cell.y + (cell.h - h) / 2 + 'px';
  piece.dataset.rotation = String(angle); piece.style.setProperty('--rotation', angle + 'deg');
  getPieceImages(piece).forEach(record => { record.x *= scale; record.y *= scale; });
  renderPieceImage(piece, Number(piece.dataset.imageIndex || 0));
}

function autoArrangeOutfit(style) {
  const pieces = [...editorCanvas.querySelectorAll('.outfit-piece')].filter(piece => !piece.dataset.decoration && getPieceImages(piece).length);
  if (!pieces.length) { showToast('先添加衣服图片'); return; }
  layoutUndo = { card: activeCard, page: cardPageStates.get(activeCard)[activeCardPageIndex], pieces: pieces.map(piece => ({ piece, css: piece.style.cssText, rotation: piece.dataset.rotation, offsets: getPieceImages(piece).map(record => ({ record, x: record.x, y: record.y })) })) };
  const gap = 16, x = 24, y = 150;
  const width = editorCanvas.clientWidth - 48, height = Math.max(160, editorCanvas.clientHeight - 350);
  if (style === 'hero' && pieces.length > 1) {
    const sorted = [...pieces].sort((a,b) => Number(['dress','top','bottom'].includes(b.dataset.category)) - Number(['dress','top','bottom'].includes(a.dataset.category)));
    fitPieceIntoCell(sorted[0], { x, y, w: width * .56, h: height });
    const remaining = sorted.slice(1), cols = remaining.length > 4 ? 2 : 1, rows = Math.ceil(remaining.length / cols);
    const sideW = width * .44 - gap;
    remaining.forEach((piece,i) => fitPieceIntoCell(piece, { x: x + width * .56 + gap + (i % cols) * sideW / cols, y: y + Math.floor(i / cols) * height / rows, w: sideW / cols - 8, h: height / rows - gap }));
  } else {
    const cols = pieces.length === 1 ? 1 : pieces.length <= 6 ? 2 : 3;
    const rows = Math.ceil(pieces.length / cols), cw = width / cols, ch = height / rows;
    pieces.forEach((piece,i) => {
      const lastCount = pieces.length % cols;
      const offset = lastCount && Math.floor(i / cols) === rows - 1 ? (cols - lastCount) * cw / 2 : 0;
      fitPieceIntoCell(piece, { x: x + i % cols * cw + offset + gap / 2, y: y + Math.floor(i / cols) * ch + gap / 2, w: cw - gap, h: ch - gap }, style === 'collage' ? (i % 2 ? 3 : -3) : 0);
    });
  }
  selectPiece(null); captureActiveCardPage(false); showToast('已排版，可切换样式或撤销');
}

function undoOutfitLayout() {
  if (!layoutUndo || layoutUndo.card !== activeCard || layoutUndo.page !== cardPageStates.get(activeCard)[activeCardPageIndex]) { showToast('当前页没有可撤销的排版'); return; }
  layoutUndo.pieces.forEach(({piece,css,rotation,offsets}) => {
    if (!piece.isConnected) return;
    piece.style.cssText = css; piece.dataset.rotation = rotation;
    offsets.forEach(({record,x,y}) => Object.assign(record, {x,y}));
    renderPieceImage(piece, Number(piece.dataset.imageIndex || 0));
  });
  layoutUndo = null; captureActiveCardPage(false); showToast('已恢复排版');
}


async function renderOutfitImage() {
  const width = editorCanvas.clientWidth, height = editorCanvas.clientHeight;
  const canvas = document.createElement('canvas');
  const resolution = Math.min(3, 2160 / Math.max(width, height));
  canvas.width = Math.round(width * resolution); canvas.height = Math.round(height * resolution);
  const ctx = canvas.getContext('2d'); ctx.scale(resolution, resolution);
  ctx.fillStyle = getComputedStyle(detailPage).backgroundColor;
  ctx.fillRect(0,0,width,height);
  const raw = detailPage.style.getPropertyValue('--detail-background-image');
  const src = raw.match(/url\(["']?(.*?)["']?\)/)?.[1];
  if (src) {
    const image = await loadToolImage(src);
    const scale = Math.max(width/image.naturalWidth,height/image.naturalHeight);
    ctx.save(); ctx.globalAlpha = Number(detailPage.style.getPropertyValue('--detail-background-opacity') || 1);
    ctx.drawImage(image,(width-image.naturalWidth*scale)/2,(height-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);
    const tint = ctx.createLinearGradient(0,0,0,height); tint.addColorStop(0,'rgba(36,39,34,.04)'); tint.addColorStop(1,'rgba(36,39,34,.07)');
    ctx.fillStyle = tint; ctx.fillRect(0,0,width,height); ctx.restore();
  }
  const pieces = [...editorCanvas.querySelectorAll('.outfit-piece')].sort((a,b) => Number(getComputedStyle(a).zIndex || 0)-Number(getComputedStyle(b).zIndex || 0));
  for (const piece of pieces) {
    const record = getPieceImages(piece)[Number(piece.dataset.imageIndex || 0)];
    if (!record) continue;
    const image = await loadToolImage(record.src);
    const w=piece.clientWidth,h=piece.clientHeight;
    const baseScale=Math.min(w/image.naturalWidth,h/image.naturalHeight);
    const iw=image.naturalWidth*baseScale*record.scale, ih=image.naturalHeight*baseScale*record.scale;
    ctx.save(); ctx.translate(piece.offsetLeft+piece.offsetWidth/2,piece.offsetTop+piece.offsetHeight/2);
    ctx.rotate(Number(piece.dataset.rotation||0)*Math.PI/180);
    ctx.beginPath();ctx.rect(-w/2,-h/2,w,h);ctx.clip();
    ctx.drawImage(image,-iw/2+record.x,-ih/2+record.y,iw,ih);ctx.restore();
  }
  const palette = editorCanvas.querySelector('.outfit-color-palette');
  if (palette) {
    const size = Number(palette.dataset.size) || 22;
    ctx.save();
    ctx.translate(palette.offsetLeft + palette.offsetWidth / 2, palette.offsetTop + palette.offsetHeight / 2);
    ctx.rotate(Number(palette.dataset.rotation || 0) * Math.PI / 180);
    [...palette.querySelectorAll('.palette-swatch')].forEach((swatch, index) => {
      ctx.beginPath();
      ctx.arc(2 + size / 2 + index * (size + 8) - palette.offsetWidth / 2, 2 + size / 2 - palette.offsetHeight / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = swatch.dataset.color || '#f7f5f0';
      ctx.fill();
    });
    ctx.restore();
  }
  return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片生成失败')), 'image/png'));
}

async function generateShareImage() {
  openDetailTools('生成分享图片'); toolNote('正在生成高清图片…');
  try {
    const blob = await renderOutfitImage();
    if (toolsSheet.hidden) return;
    toolsBody.replaceChildren();
    if (shareObjectURL) URL.revokeObjectURL(shareObjectURL);
    shareObjectURL = URL.createObjectURL(blob);
    const image = document.createElement('img'); image.className='share-image-preview'; image.src=shareObjectURL; image.alt='搭配分享图片预览'; toolsBody.append(image);
    const filename = `搭配-${Date.now()}.png`;
    const file = new File([blob],filename,{type:'image/png'});
    toolAction('保存图片', () => { const a=document.createElement('a');a.href=shareObjectURL;a.download=filename;a.click(); });
    if (navigator.canShare?.({files:[file]})) toolAction('分享给朋友', async () => {
      try { await navigator.share({files:[file],title:'我的搭配'}); }
      catch(error) { if(error.name!=='AbortError') showToast('分享未成功，可以先保存图片'); }
    });
    else toolNote('当前浏览器未提供系统分享，可保存图片后发送给朋友。');
  } catch { toolsBody.replaceChildren(); toolNote('图片读取失败，请等待图片加载完毕后重试。'); toolAction('重新生成',generateShareImage); }
}
