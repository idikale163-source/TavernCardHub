
window.getCleanAssetFilename = function(item) {
    if (!item) return 'theme_file.json';
    const ext = item.fileType || 'json';
    const cleanName = item.name.replace(/\.(json|css|txt|zip|docx|png)$/i, '').trim() || '美化资产';
    return `${cleanName}.${ext}`;
};


function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '动态大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function switchTab(tab, e) {
    currentTab = tab;
    if (typeof currentFolderOpened !== 'undefined') currentFolderOpened = null;
    setTimeout(ensureCategoryImportUI, 0);
    closeDetailView();
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();

    // 强行清理并物理移除 Docs 复制抽屉，防止切到 API Key、字体等其他 Tab 时残留
    const oldDocDrawer = document.getElementById('docDrawerContainer');
    if (oldDocDrawer) oldDocDrawer.remove();

    const apikeysPanel = document.getElementById('apikeysBuilderPanel');
    if (apikeysPanel) apikeysPanel.classList.add('hidden');

    const fontsPanel = document.getElementById('fontsBuilderPanel');
    const galleryPanel = document.getElementById('galleryBuilderPanel');
    const extrasPanel = document.getElementById('extrasBuilderPanel');
    const themePanel = document.getElementById('themeBuilderPanel');
    const emojiPanel = document.getElementById('emojiExportBuilderPanel');
    const linksPanel = document.getElementById('linksBuilderPanel');
    const itemsGrid = document.getElementById('itemsContainer');
    const searchBar = document.getElementById('searchInput')?.parentElement?.parentElement;
    
    if (fontsPanel) fontsPanel.classList.add('hidden');
    if (galleryPanel) galleryPanel.classList.add('hidden');
    if (extrasPanel) extrasPanel.classList.add('hidden');
    if (themePanel) themePanel.classList.add('hidden');
    if (emojiPanel) emojiPanel.classList.add('hidden');
    if (linksPanel) linksPanel.classList.add('hidden');
    if (itemsGrid) itemsGrid.classList.remove('hidden');
    if (searchBar) searchBar.classList.remove('hidden');

    if (tab === 'fonts') {
        if (fontsPanel) fontsPanel.classList.remove('hidden');
        if (itemsGrid) itemsGrid.classList.add('hidden');
        if (searchBar) searchBar.classList.add('hidden');
        if (typeof renderList === 'function') renderList();
    } else if (tab === 'apikeys') {
        if (apikeysPanel) apikeysPanel.classList.remove('hidden');
        if (typeof renderApiKeyList === 'function') renderApiKeyList();
        if (itemsGrid) itemsGrid.classList.add('hidden');
        if (searchBar) searchBar.classList.add('hidden');
    } else if (tab === 'gallery') {
        if (galleryPanel) galleryPanel.classList.remove('hidden');
        renderItems();
    } else if (tab === 'regex') {
        if (extrasPanel) extrasPanel.classList.remove('hidden');
        renderItems();
    } else if (tab === 'emojis') {
        if (emojiPanel) emojiPanel.classList.remove('hidden');
        renderItems();
    } else if (tab === 'themes') {
        if (themePanel) themePanel.classList.remove('hidden');
        renderItems();
    } else if (tab === 'links') {
        if (linksPanel) linksPanel.classList.remove('hidden');
        renderItems();
    } else {
        renderItems();
    }
    // 最后关闭 sidebar,确保点击事件不再冒泡到 overlay
    if (typeof toggleSidebar === 'function') toggleSidebar();
    setTimeout(ensureCategoryImportUI, 0);
}

        // Setup Global Paste Listener for Emojis
        function setupGlobalPasteListener() {
            window.addEventListener('paste', async (e) => {
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                if (currentTab !== 'emojis') return;

                const text = e.clipboardData.getData('text');
                if (text && text.trim()) {
                    const parsed = parseEmojiTextLines(text);
                    if (parsed.length > 0) {
                        e.preventDefault();
                        const packName = '未命名表情合集_' + new Date().toLocaleDateString();
                        const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        await saveAsset({ id, category: 'emojis', name: packName, fileType: 'json', emojiList: parsed, rawText: text, createdAt: Date.now() });
                        updateBadges(); renderItems();
                        showToast('📋', `已快捷将 ${parsed.length} 个表情收纳为总合集 “${packName}”！`);
                    }
                }
            });
        }

        async function parseAndSavePastedEmojiPack() {
            const nameInput = document.getElementById('emojiPackNameInput');
            const textInput = document.getElementById('emojiPasteInput');
            const packName = nameInput ? nameInput.value.trim() : '';
            const text = textInput ? textInput.value.trim() : '';

            if (!packName) { showToast('⚠️', '请先填写表情包合集名字！'); return; }
            if (!text) { showToast('⚠️', '请粘贴包含表情直链的文本！'); return; }

            const parsed = parseEmojiTextLines(text);
            if (parsed.length === 0) { showToast('⚠️', '未在文本中识别到包含 http/https 的表情链接！'); return; }

            const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await saveAsset({ id, category: 'emojis', name: packName, fileType: 'json', emojiList: parsed, rawText: text, createdAt: Date.now() });
            
            nameInput.value = ''; textInput.value = '';
            updateBadges(); renderItems();
            showToast('🎉', `成功生成包含 ${parsed.length} 个表情的合集 “${packName}”！`);
        }

        const fileIn = document.getElementById('fileInput');
if (fileIn) {
    fileIn.addEventListener('change', async (e) => {
        try {
            const files = Array.from(e.target.files || []);
            for (const file of files) await processFile(file, 'themes');
            allAssetsCache = null;
            updateBadges();
            await renderItems();
        } catch (err) {
            console.error('File import failed:', err);
            showToast('❌', '导入失败，请检查文件格式');
        } finally {
            e.target.value = '';
        }
    });
}

        function isCustomCategoryTab(tab) { return typeof tab === 'string' && tab.indexOf('custom:') === 0; }
        function categoryStorageKey(tab) { return isCustomCategoryTab(tab) ? tab : tab; }
        function cleanImportName(name) { return name.replace(/(\.(json|css|txt|zip|docx|png))+$/gi, '').trim() || '未命名文件'; }
        function toggleCategoryImportPanel(){ const b=document.getElementById('categoryImportBody'); const c=document.getElementById('categoryImportChevron'); if(b){ b.classList.toggle('hidden'); if(c)c.textContent=b.classList.contains('hidden')?'⌄':'⌃'; } }
        window.toggleCategoryImportPanel=toggleCategoryImportPanel;
        function ensureCategoryImportUI() {
            let box=document.getElementById('categoryImportBox');
            if (box) { box.innerHTML=''; box.classList.add('hidden'); }
        }
        
