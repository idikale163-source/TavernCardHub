const DB_NAME = 'FontPreviewBox';
    const DB_VERSION = 2;
    const STORE_NAME = 'fonts';

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function addFontItem(item) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.add({
                ...item,
                addedAt: Date.now()
            });
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getAllFonts() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getFont(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function deleteFont(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function clearAllFonts() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // ========== UI 逻辑 ==========
    let currentFontId = null;
    let loadedFontFamilies = {}; // id -> font-family name

    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const fontListEl = document.getElementById('font-list');
    const fontCountEl = document.getElementById('font-count');
    const previewBox = document.getElementById('preview-box');
    const previewWrapper = document.getElementById('preview-wrapper');
    const loadingIndicator = document.getElementById('loading-indicator');

    function switchFontBoxTab(type) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        if (type === 'file') {
            document.querySelectorAll('.tab-btn')[0].classList.add('active');
            document.getElementById('tab-file').classList.add('active');
        } else {
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
            document.getElementById('tab-url').classList.add('active');
        }
    }

    // 上传区点击与拖拽
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    async function handleFiles(files) {
        const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
        let added = 0;
        for (const file of files) {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!validExts.includes(ext)) {
                showToast('⚠️ ' + file.name + ' 格式不支持');
                continue;
            }
            const existing = await getAllFonts();
            const dup = existing.find(f => f.name === file.name && f.size === file.size);
            if (dup) {
                showToast(file.name + ' 已存在，跳过');
                continue;
            }
            const ab = await file.arrayBuffer();
            await addFontItem({
                sourceType: 'file',
                name: file.name,
                type: ext,
                size: file.size,
                data: ab
            });
            added++;
        }
        if (added > 0) showToast('✅ 已添加 ' + added + ' 款本地字体');
        renderList();
    }

    // 添加 URL 字体直链
    async function addUrlFont() {
        const urlInput = document.getElementById('url-input');
        const rawUrl = urlInput.value.trim();
        if (!rawUrl) {
            showToast('⚠️ 请先输入字体直链 URL');
            return;
        }

        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            showToast('⚠️ 请输入有效的 HTTP / HTTPS 链接');
            return;
        }

        // 提取文件名
        let fileName = rawUrl.split('/').pop().split('?')[0];
        if (!fileName || !fileName.includes('.')) {
            fileName = '网络字体_' + Math.random().toString(36).substring(2, 7) + '.ttf';
        }
        try { fileName = decodeURIComponent(fileName); } catch(e){}

        // 查重
        const existing = await getAllFonts();
        const dup = existing.find(f => f.url === rawUrl);
        if (dup) {
            showToast('该直链已在列表中，已自动为你选择');
            selectFont(dup.id);
            return;
        }

        const newId = await addFontItem({
            sourceType: 'url',
            name: fileName,
            url: rawUrl,
            size: 0
        });

        urlInput.value = '';
        showToast('🔗 直链保存成功！');
        await renderList();
        selectFont(newId);
    }

    function formatSize(bytes) {
        if (!bytes) return '网络直链';
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
        return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    }

    async function renderList() {
        const fonts = await getAllFonts();
        fontCountEl.textContent = fonts.length;

        if (fonts.length === 0) {
            fontListEl.innerHTML = '<div class="empty-hint">还没有字体哦<br>上传文件或添加直链试试吧</div>';
            return;
        }

        fonts.sort((a, b) => b.addedAt - a.addedAt);

        let html = '';
        for (const f of fonts) {
            const isActive = f.id === currentFontId;
            const isUrl = f.sourceType === 'url';
            const badge = isUrl ? '<span class="badge badge-url">🔗 链接</span>' : '<span class="badge badge-file">📂 本地</span>';
            const copyBtnHtml = isUrl ? '<button class="action-btn" data-copy="' + f.id + '" title="复制直链">📋</button>' : '';
            const downloadBtnHtml = '<button class="action-btn" data-download="' + f.id + '" title="导出下载字体文件">⬇️</button>';
            
            html += '<div class="font-item' + (isActive ? ' active' : '') + '" data-id="' + f.id + '">'
                + badge
                + '<span class="name" title="' + (f.url || f.name) + '">' + f.name + '</span>'
                + '<span class="size">' + formatSize(f.size) + '</span>'
                + '<div class="action-btns">'
                + copyBtnHtml
                + downloadBtnHtml
                + '<button class="del-btn" data-del="' + f.id + '" title="删除">✕</button>'
                + '</div>'
                + '</div>';
        }
        fontListEl.innerHTML = html;

        fontListEl.querySelectorAll('.font-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.action-btns')) return;
                selectFont(parseInt(el.dataset.id));
            });
        });
        fontListEl.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyFontUrlById(parseInt(btn.dataset.copy));
            });
        });
        fontListEl.querySelectorAll('[data-download]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFontById(parseInt(btn.dataset.download));
            });
        });
        fontListEl.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFontById(parseInt(btn.dataset.del));
            });
        });
    }

    async function copyFontUrlById(id) {
        const fontData = await getFont(id);
        if (fontData && fontData.url) {
            navigator.clipboard.writeText(fontData.url).then(() => {
                showToast('📋 字体直链已复制！');
            }).catch(() => {
                showToast('⚠️ 复制失败');
            });
        }
    }

    async function downloadFontById(id) {
        const fontData = await getFont(id);
        if (!fontData) return;

        showToast('⏳ 正在触发导出下载...');
        if (fontData.sourceType === 'file') {
            try {
                const blob = new Blob([fontData.data], { type: 'font/' + (fontData.type||'ttf').replace('.','') });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fontData.name;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);
                }, 1000);
            } catch (err) {
                showToast('⚠️ 导出失败：' + err.message);
            }
        } else if (fontData.sourceType === 'url') {
            window.open(fontData.url, '_blank');
        }
    }

    async function selectFont(id) {
        currentFontId = id;
        const fontData = await getFont(id);
        if (!fontData) {
            showToast('⚠️ 字体数据丢失');
            return;
        }

        let familyName = loadedFontFamilies[id];
        if (!familyName) {
            familyName = 'CustomFont_' + id + '_' + Date.now();
            loadingIndicator.style.display = 'block';

            let srcUrl = '';
            if (fontData.sourceType === 'url') {
                srcUrl = fontData.url;
            } else {
                const blob = new Blob([fontData.data], { type: 'font/' + (fontData.type||'ttf').replace('.','') });
                srcUrl = URL.createObjectURL(blob);
            }

            const fontFace = new FontFace(familyName, 'url("' + srcUrl + '")');
            try {
                await fontFace.load();
                document.fonts.add(fontFace);
                loadedFontFamilies[id] = familyName;
                loadingIndicator.style.display = 'none';
            } catch (err) {
                loadingIndicator.style.display = 'none';
                showToast('⚠️ 字体加载失败（可能是跨域 CORS 限制或格式有误）');
                renderList();
                return;
            }
        }

        previewBox.style.fontFamily = '"' + familyName + '", sans-serif';
        renderList();
    }

    async function deleteFontById(id) {
        await deleteFont(id);
        if (currentFontId === id) {
            currentFontId = null;
            previewBox.style.fontFamily = 'sans-serif';
            delete loadedFontFamilies[id];
        }
        showToast('🗑 已删除');
        renderList();
    }

    document.getElementById('clear-all-btn').addEventListener('click', async () => {
        const fonts = await getAllFonts();
        if (fonts.length === 0) return;
        if (!confirm('确定要清空所有字体吗？此操作不可恢复。')) return;
        await clearAllFonts();
        currentFontId = null;
        loadedFontFamilies = {};
        previewBox.style.fontFamily = 'sans-serif';
        showToast('🗑 已清空全部字体');
        renderList();
    });

    function updateStyle() {
        const size = document.getElementById('fontSize').value;
        document.getElementById('fontSizeVal').textContent = size + 'px';
        previewBox.style.fontSize = size + 'px';
        previewWrapper.style.backgroundColor = document.getElementById('bgColor').value;
        previewBox.style.color = document.getElementById('fontColor').value;
    }

    function _legacyShowToast(msg) { const t = document.getElementById("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2500); }

    renderList();
    

        let currentFolderOpened = null; // null = Category View, 'string' = Folder Inner View

        function exitFolderView() {
            currentFolderOpened = null;
            renderItems();
        }

        function openFolder(folderName) {
            currentFolderOpened = folderName;
            renderItems();
        }

        function promptCreateFolder() {
            const folderName = prompt('请输入新分类名称：');
            if (folderName && folderName.trim()) {
                const cleanName = folderName.trim();
                let customFolders = [];
                try {
                    const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_' + currentTab);
                    if (saved) customFolders = JSON.parse(saved);
                } catch(e){}
                if (!Array.isArray(customFolders)) customFolders = [];
                if (!customFolders.includes(cleanName)) {
                    customFolders.unshift(cleanName); // 优先插在最前方，确保新建后置顶在列表首位！
                    localStorage.setItem('TAVERN_CUSTOM_FOLDERS_' + currentTab, JSON.stringify(customFolders));
                }
                currentFolderOpened = null;
                renderItems();
                showToast('📂', `已成功创建新分类 “${cleanName}”！`);
            }
        }

        async function promptBatchMoveToFolder() {
            const folderName = prompt('请输入目标分类名称（输入新名字可直接新建）：');
            if (!folderName || !folderName.trim()) return;
            const targetFolder = folderName.trim();

            const assets = await getAllAssets();
            const curAssets = assets.filter(a => a.category === currentTab);
            
            let count = 0;
            for (let a of curAssets) {
                if ((a.subCategory || '未分类') === currentFolderOpened) {
                    a.subCategory = targetFolder;
                    await saveAsset(a);
                    count++;
                }
            }
            currentFolderOpened = targetFolder;
            renderItems();
            showToast('📁', `已将 ${count} 项资源移入小分类 “${targetFolder}”`);
        }