/* UI-only adapters; existing page nodes and image records remain authoritative. */
(() => {
  // Desktop preview: a 402×874 logical screen inside an 8px device bezel.
  // Only the outer device scales to fit; app coordinates keep their full size.
  function fitIPhonePreview() {
    const frame = document.querySelector('.device-frame');
    if (window.matchMedia('(max-width: 520px)').matches) {
      frame.style.removeProperty('transform');
      return;
    }
    const scale = Math.min(1, Math.max(0.1, (window.innerWidth - 32) / 418), Math.max(0.1, (window.innerHeight - 32) / 890));
    frame.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  window.addEventListener('resize', fitIPhonePreview);
  fitIPhonePreview();
  const icons = {
    top: '<path d="m8 3-5 3-2 5 4 2 2-3v11h10V10l2 3 4-2-2-5-5-3c0 4-8 4-8 0Z"/>',
    bottom: '<path d="M6 3h12l2 18h-7l-1-11-1 11H4L6 3Zm0 4h12"/>',
    dress: '<path d="m9 3-2 5 3 4-5 9h14l-5-9 3-4-2-5M10 12h4M9 3c0 3 6 3 6 0"/>',
    shoes: '<path d="M3 11v7h18v-4l-7-2-4-6-3 6-4-1Zm0 4h18M12 9l3-2m-1 5 3-2"/>',
    bag: '<path d="M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2"/>',
    accessories: '<circle cx="12" cy="13" r="8"/><path d="m9 4 3-3 3 3-3 3-3-3Z"/>'
  };
  const labels = { top: '上衣', bottom: '下装', dress: '裙装', shoes: '鞋履', bag: '包袋', accessories: '配饰' };
  const svg = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  document.querySelectorAll('[data-open-category]').forEach(button => {
    const category = button.dataset.openCategory;
    button.innerHTML = `<span>${labels[category]}</span>${svg(icons[category])}`;
    button.setAttribute('aria-label', `打开${labels[category]}小衣橱`);
    button.title = `查看${labels[category]}图片`;
    const add = button.parentElement.querySelector('[data-add-category]');
    add.title = `新建${labels[category]}格子`;
  });
  // Preserve the confirmed action, with an unambiguous crop icon.
  reframePieceButton.innerHTML = svg('<path d="M7 3v14h14M3 7h14v14M3 3l18 18"/>');
  reframePieceButton.title = '重新取景';
  deletePieceButton.title = '删除所选格子';
  confirmEditButton.title = '完成编辑';
  document.querySelector('.detail-tools-close').innerHTML = svg('<path d="m6 6 12 12M18 6 6 18"/>');
  const selection = document.createElement('span');
  selection.className = 'editor-selection-label';
  selection.setAttribute('aria-live', 'polite');
  document.querySelector('.panel-actions').prepend(selection);
  document.querySelector('.detail-back').addEventListener('click', () => window.history.back());
  document.querySelector('.detail-start').addEventListener('click', () => {
    if (!detailPage.classList.contains('is-editing')) editToggle.click();
  });

  function syncEditorPresentation() {
    const selected = editorCanvas.querySelector('.outfit-piece.is-selected');
    selection.textContent = selected
      ? `${labels[selected.dataset.category] || '单品'} · ${getPieceImages(selected).length} 张`
      : '选择单品';
    document.querySelectorAll('.category-split').forEach(group => {
      group.classList.toggle('is-current', group.querySelector('[data-open-category]')?.dataset.openCategory === selected?.dataset.category);
    });
    document.querySelector('.detail-empty-state').hidden = Boolean(editorCanvas.querySelector('.outfit-piece, .outfit-color-palette')) || detailPage.classList.contains('has-background');
    syncCanvasViewport();
  }
  // Fit the same saved coordinates into the smaller editing stage, then expand the composition for preview.
  function syncCanvasViewport() {
    if (detailPage.hidden || !activeCard) return;
    const state = cardPageStates.get(activeCard)?.[activeCardPageIndex];
    if (!state) return;
    const shell = document.querySelector('.app-shell');
    const width = state.canvasWidth || shell.clientWidth;
    const height = state.canvasHeight || shell.clientHeight;
    state.canvasWidth = width;
    state.canvasHeight = height;
    const baseScale = Math.min(shell.clientWidth / width, shell.clientHeight / height);
    const editing = detailPage.classList.contains('is-editing');
    const controlsBottom = Math.max(...[...detailPage.querySelectorAll('.detail-back, .edit-toggle, .detail-more-toggle')]
      .map(button => button.offsetTop + button.offsetHeight));
    const topEdge = editing ? controlsBottom + 14 : 130;
    const bottomEdge = editing ? editorPanel.offsetTop - 12 : shell.clientHeight - 84;
    const availableHeight = Math.max(160, bottomEdge - topEdge);
    const availableWidth = Math.max(160, shell.clientWidth - 36);
    let leftBound = Infinity, topBound = Infinity, rightBound = -Infinity, bottomBound = -Infinity;
    editorCanvas.querySelectorAll('.outfit-piece, .outfit-color-palette').forEach(item => {
      const w = item.offsetWidth, h = item.offsetHeight;
      const angle = Number(item.dataset.rotation || 0) * Math.PI / 180;
      const halfWidth = (Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * h) / 2;
      const halfHeight = (Math.abs(Math.sin(angle)) * w + Math.abs(Math.cos(angle)) * h) / 2;
      const cx = item.offsetLeft + w / 2, cy = item.offsetTop + h / 2;
      leftBound = Math.min(leftBound, cx - halfWidth);
      rightBound = Math.max(rightBound, cx + halfWidth);
      topBound = Math.min(topBound, cy - halfHeight);
      bottomBound = Math.max(bottomBound, cy + halfHeight);
    });
    const hasItems = Number.isFinite(leftBound);
    const scale = hasItems
      ? Math.min(baseScale * (editing ? .86 : 1.12), availableWidth / Math.max(1, rightBound - leftBound), availableHeight / Math.max(1, bottomBound - topBound))
      : baseScale;
    const centerX = hasItems ? (leftBound + rightBound) / 2 : width / 2;
    const centerY = hasItems ? (topBound + bottomBound) / 2 : height / 2;
    const centeredTop = topEdge + availableHeight / 2 - centerY * scale;
    const canvasTop = editing
      ? Math.min(topEdge, Math.max(bottomEdge - height * scale, centeredTop))
      : centeredTop;
    Object.assign(editorCanvas.style, {
      width: `${width}px`, height: `${height}px`, right: 'auto', bottom: 'auto',
      left: `${shell.clientWidth / 2 - centerX * scale}px`,
      top: `${canvasTop}px`,
      transformOrigin: 'left top', transform: `scale(${scale})`
    });
  }
  new MutationObserver(syncEditorPresentation).observe(editorCanvas, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-image-index'] });
  new MutationObserver(syncEditorPresentation).observe(detailPage, { attributes: true, attributeFilter: ['class', 'hidden'] });
  syncEditorPresentation();

  function syncCardIndex() {
    const cards = [...cardTrack.querySelectorAll('.outfit-card')];
    const index = Math.max(0, cards.indexOf(getCenteredHomeCard()));
    document.querySelector('.home-card-index').textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  }
  cardViewport.addEventListener('scroll', syncCardIndex, { passive: true });
  new MutationObserver(syncCardIndex).observe(cardTrack, { childList: true });
  new ResizeObserver(syncCardIndex).observe(cardViewport);
  new ResizeObserver(syncCanvasViewport).observe(document.querySelector('.app-shell'));
  syncCardIndex();
})();
