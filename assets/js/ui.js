async function saveCardCustomUrl() {
    if (!currentItem) return;
    const input = document.getElementById('cardUrlInput');
    const url = input ? input.value.trim() : '';
    currentItem.cardUrl = url;
    try {
        await saveAsset(currentItem);
        allAssetsCache = null;
        showToast('🎉', url ? '关联网址保存成功！' : '已清空关联网址');
    } catch(err) {
        console.error(err);
        showToast('❌', '保存网址失败');
    }
}
window.saveCardCustomUrl = saveCardCustomUrl;

function copyCurrentCardLink() {
    if (!currentItem) return;
    const customUrl = currentItem.cardUrl || '';
    if (customUrl) {
        navigator.clipboard.writeText(customUrl);
        showToast('🔗', `已复制关联网址: ${customUrl}`);
        return;
    }
    const text = currentItem.rawText || '';
    const urls = text.match(/https?:\/\/[^\s"'<>]+/gi);
    if (urls && urls.length) {
        navigator.clipboard.writeText(urls[0]);
        showToast('🔗', `已复制关联网址: ${urls[0]}`);
    } else {
        const fallbackUrl = window.location.href;
        navigator.clipboard.writeText(fallbackUrl);
        showToast('🔗', '已复制当前角色卡页面直链！');
    }
}
window.copyCurrentCardLink = copyCurrentCardLink;

function openCurrentCardLink() {
    if (!currentItem) return;
    const customUrl = currentItem.cardUrl || '';
    if (customUrl) {
        window.open(customUrl, '_blank');
        showToast('🚀', `已跳转关联网址: ${customUrl}`);
        return;
    }
    const text = currentItem.rawText || '';
    const urls = text.match(/https?:\/\/[^\s"'<>]+/gi);
    if (urls && urls.length) {
        window.open(urls[0], '_blank');
        showToast('🚀', `已跳转唤起: ${urls[0]}`);
    } else {
        showToast('⚠️', '请先在上方输入框填入并保存关联网址');
    }
}
window.openCurrentCardLink = openCurrentCardLink;


function toggleExtrasPanel() { const b = document.getElementById("extrasBody"); const c = document.getElementById("extrasChevron"); if (b) { b.classList.toggle("hidden"); if (c) c.textContent = b.classList.contains("hidden") ? "v" : "^"; } }
window.toggleExtrasPanel = toggleExtrasPanel;

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
    currentFolderOpened = null;
    const oldInput = document.getElementById('globalDirectFileInput');
    if (oldInput) oldInput.remove();
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
        if (linksPanel) { linksPanel.classList.remove('hidden'); populateLinkCategorySelect(); }
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
        function toggleCategoryImportPanel(){ const b=document.getElementById('categoryImportBody'); const c=document.getElementById('categoryImportChevron'); if(b){ b.classList.toggle('hidden'); populateLinkCategorySelect(); if(c)c.textContent=b.classList.contains('hidden')?'⌄':'⌃'; } }
        window.toggleCategoryImportPanel=toggleCategoryImportPanel;
        function ensureCategoryImportUI() {
    let box = document.getElementById('categoryImportBox');
    if (box) { box.innerHTML = ''; box.classList.add('hidden'); }
}

async function processFile(file, targetCategory = currentTab) {
            const ext=file.name.split('.').pop().toLowerCase();
            const id='asset_'+Date.now()+'_'+Math.random().toString(36).slice(2,11);
            const category=categoryStorageKey(targetCategory);
            const folder=currentFolderOpened || '';
            if (isCustomCategoryTab(category)) {
                const raw=await file.arrayBuffer();
                let preview='';
                const textExts=['txt','css','json','html','htm','js','ts','xml','md','yaml','yml','csv','ini','log'];
                if (textExts.includes(ext)) { try { preview=await file.text(); } catch(e) { preview=''; } }
                await saveAsset({id, category, subCategory:folder, name:file.name, fileType:ext || 'bin', rawBuffer:raw, byteSize:raw.byteLength, rawText:preview, createdAt:Date.now()});
                return;
            }
            if (ext==='png' || ext==='jpg' || ext==='jpeg' || ext==='webp' || ext==='gif') {
                const raw=await file.arrayBuffer(); 
                if (category==='gallery') {
                    await saveAsset({id, category:'gallery', subCategory:folder, name:cleanImportName(file.name), fileType:ext, rawBuffer:raw, createdAt:Date.now()});
                    return;
                }
                let cardData={}; const chunk=extractCharaChunk(raw);
                if(chunk) { try { cardData=JSON.parse(chunk); } catch(e){} }
                const d=cardData.data||cardData;
                await saveAsset({id,category:'cards',subCategory:folder,name:d.name||cleanImportName(file.name),fileType:ext,rawBuffer:raw,cardData,tags:extractTagsFromData(d),firstMes:d.first_mes||'',alternateGreetings:d.alternate_greetings||[],personality:extractPersonalityDeep(cardData),worldbook:d.character_book||null,regexScripts:d.extensions?.regex_scripts||null,rawText:JSON.stringify(cardData,null,2),createdAt:Date.now()});
                return;
            }
            if (ext==='json') {
                const text=await file.text(); let json={}; try { json=JSON.parse(text); } catch(e){}
                if (category==='cards') {
                    const d=json.data||json; await saveAsset({id,category:'cards',subCategory:folder,name:d.name||cleanImportName(file.name),fileType:'json',cardData:json,tags:extractTagsFromData(d),rawText:text,personality:extractPersonalityDeep(json),worldbook:d.character_book||null,createdAt:Date.now()});
                } else if (category==='worldbooks') {
                    await saveAsset({id,category:'worldbooks',subCategory:folder,name:json.name||cleanImportName(file.name),fileType:'json',cardData:json,worldbook:json,rawText:text,createdAt:Date.now()});
                } else {
                    await saveAsset({id,category,subCategory:folder,name:cleanImportName(file.name),fileType:'json',cardData:json,rawText:text,createdAt:Date.now()});
                }
                return;
            }
            if (ext==='txt' || ext==='css') {
                const text=await file.text();
                if (category==='emojis') {
                    const parsed=parseEmojiTextLines(text); if(!parsed.length) throw new Error('没有识别到表情链接');
                    await saveAsset({id,category:'emojis',subCategory:folder,name:cleanImportName(file.name),fileType:'json',emojiList:parsed,rawText:text,createdAt:Date.now()});
                } else {
                    await saveAsset({id,category,subCategory:folder,name:cleanImportName(file.name),fileType:ext,rawText:text,createdAt:Date.now()});
                }
                return;
            }
            if (ext==='docx') {
                const raw=await file.arrayBuffer(); const result=await mammoth.extractRawText({arrayBuffer:raw});
                await saveAsset({id,category,subCategory:folder,name:cleanImportName(file.name),fileType:'docx',rawText:result.value,rawBuffer:raw,createdAt:Date.now()}); return;
            }
            if (ext==='zip') {
                const raw=await file.arrayBuffer(); await saveAsset({id,category,subCategory:folder,name:cleanImportName(file.name),fileType:'zip',rawBuffer:raw,createdAt:Date.now()}); return;
            }
            const raw=await file.arrayBuffer(); await saveAsset({id,category,subCategory:folder,name:cleanImportName(file.name),fileType:ext||'bin',rawBuffer:raw,createdAt:Date.now()}); return;
        }
        function parseEmojiTextLines(text) {
            const lines = text.split(/\r?\n/);
            const results = [];
            const urlRegex = /(https?:\/\/[^\s]+)/i;
            for (let idx = 0; idx < lines.length; idx++) {
                let line = lines[idx].trim();
                if (!line) continue;
                const match = line.match(urlRegex);
                if (match) {
                    const url = match[1];
                    let namePart = line.replace(url, '').replace(/[:：\s,，\--]+$/, '').replace(/^[:：\s,，\--]+/, '').trim();
                    const code = url.split('/').pop().split('?')[0] || '';
                    if (!namePart) namePart = code || `表情 #${idx + 1}`;
                    results.push({ id: 'em_' + idx + '_' + Math.random().toString(36).substr(2, 5), name: namePart, url, code });
                }
            }
            return results;
        }

        function extractPersonalityDeep(rootObj) {
            if (!rootObj) return '无人设设定';
            const d = rootObj.data || rootObj;
            let candidates = [d.description, d.personality, d.scenario, d.system_prompt, rootObj.description, rootObj.personality].filter(Boolean);
            if (candidates.length === 0) return '无人设设定';
            let rawText = candidates[0];
            if (typeof rawText === 'string' && (rawText.trim().startsWith('{') || rawText.trim().startsWith('"{'))) {
                try {
                    let cleanStr = rawText.trim().replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"');
                    let parsed = JSON.parse(cleanStr);
                    if (parsed.description) rawText = parsed.description;
                    else if (parsed.personality) rawText = parsed.personality;
                } catch(e){}
            }
            return String(rawText).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        function extractCharaChunk(arrayBuffer) {
            const dataView = new DataView(arrayBuffer); let offset = 8;
            while (offset < dataView.byteLength) {
                const length = dataView.getUint32(offset), type = String.fromCharCode(dataView.getUint8(offset+4), dataView.getUint8(offset+5), dataView.getUint8(offset+6), dataView.getUint8(offset+7));
                if (type === 'tEXt') {
                    const chunkData = new Uint8Array(arrayBuffer, offset + 8, length); let nullIndex = -1;
                    for (let i = 0; i < chunkData.length; i++) { if (chunkData[i] === 0) { nullIndex = i; break; } }
                    if (nullIndex !== -1) {
                        const keyword = new TextDecoder('iso-8859-1').decode(chunkData.subarray(0, nullIndex));
                        if (keyword === 'chara' || keyword === 'ccv3') { return decodeURIComponent(escape(atob(new TextDecoder('iso-8859-1').decode(chunkData.subarray(nullIndex + 1))))); }
                    }
                }
                offset += 12 + length;
            }
            return null;
        }

        let allAssetsCache = null;

                function getAssetImageUrl(item) {
            if (!item) return '';
            if (item.cover instanceof Blob || item.cover instanceof File) {
                return URL.createObjectURL(item.cover);
            }
            if (item.rawBuffer instanceof ArrayBuffer) {
                const blob = new Blob([item.rawBuffer], { type: item.fileType || 'image/png' });
                return URL.createObjectURL(blob);
            }
            if (item.url) return item.url;
            return item.cover || item.rawText || '';
        }

        function saveAsset(asset) {
            return new Promise((resolve, reject) => {
                asset.createdAt = asset.createdAt || Date.now();
                try {
                    const tx = db.transaction('assets', 'readwrite'); 
                    const store = tx.objectStore('assets');
                    const req = store.put(asset);
                    tx.oncomplete = () => { 
                        allAssetsCache = null; 
                        resolve(); 
                        syncAssetToCloudSilent(asset); 
                    };
                    req.onerror = (err) => {
                        console.error('IndexedDB Put Error:', err);
                        reject(req.error || new Error('IndexedDB 写入失败'));
                    };
                    tx.onerror = () => {
                        console.error('IndexedDB transaction error:', tx.error);
                        reject(tx.error || new Error('IndexedDB 事务失败'));
                    };
                } catch(err) {
                    console.error('saveAsset exception:', err);
                    reject(err);
                }
            });
        }

        function getAllAssets() {
            return new Promise((resolve) => {
                if (allAssetsCache) {
                    resolve(allAssetsCache);
                    return;
                }
                const tx = db.transaction('assets', 'readonly'), req = tx.objectStore('assets').getAll();
                req.onsuccess = () => {
                    allAssetsCache = req.result || [];
                    resolve(allAssetsCache);
                };
            });
        }

        // FORCE OVERWRITE BACKUP TO CLOUD
        async function forceOverwriteBackupCloud() {
            if (!supabaseClient) { alert('未配置 Supabase 云端，无法全量覆盖！'); return; }
            if (!confirm('⚠️ 警告：这会清空 Supabase 云端现有的所有数据，并完全用当前本地 IndexedDB 的数据全量覆盖！确定执行吗？')) return;

            document.getElementById('cloudStatusBadge').innerText = '覆盖清空中...';
            showToast('💥', '正在清空 Supabase 远程旧数据...');

            try {
                // Delete all rows
                const { error: delError } = await supabaseClient.from('tavern_assets').delete().neq('id', '___NON_EXISTENT_ID___');
                if (delError) { showToast('❌', `清空云端失败: ${delError.message}`); return; }

                const localAssets = await getAllAssets();
                showToast('📤', `旧数据已清空，正在全量推送 ${localAssets.length} 项本地资产...`);

                let count = 0;
                for (let asset of localAssets) {
                    await syncAssetToCloudSilent(asset);
                    count++;
                }
                await syncApiKeysToCloudSilent();
                await syncCustomFoldersToCloudSilent();
                document.getElementById('cloudStatusBadge').innerText = '已覆盖';
                showToast('🎉', `强行全量覆盖备份完成！已将 ${count} 项资产 + API 密钥 + 文件夹名册覆盖推送到云端！`);
            } catch(e) {
                showToast('❌', '覆盖同步失败，请检查网络');
            }
            setTimeout(() => document.getElementById('cloudStatusBadge').innerText = '已连接', 3000);
        }

        // FORCE OVERWRITE RESTORE TO LOCAL
        async function forceOverwriteRestoreLocal() {
            if (!supabaseClient) { alert('未配置 Supabase 云端，无法恢复！'); return; }
            if (!confirm('⚠️ 极度危险：这会彻底清空当前手机本地 IndexedDB 的所有资产，并强制用 Supabase 云端数据覆盖！确定执行吗？')) return;

            document.getElementById('cloudStatusBadge').innerText = '本地清空中...';
            showToast('⚠️', '正在清空本地数据...');

            try {
                const tx = db.transaction('assets', 'readwrite');
                tx.objectStore('assets').clear();
                allAssetsCache = null;

                tx.oncomplete = async () => {
                    const { data, error } = await supabaseClient.from('tavern_assets').select('*');
                    if (error) { showToast('❌', `拉取云端失败: ${error.message}`); return; }

                    if (data && data.length > 0) {
                        for (let row of data) {
                            let buffer = null;
                            if (row.raw_buffer_base64) {
                                const binary = atob(row.raw_buffer_base64), bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                buffer = bytes.buffer;
                            }
                            const dataObj = row.card_data?.data || row.card_data || {};
                            // 处理文件夹名册配置链
                            if (row.id === '___CUSTOM_FOLDERS_CONFIG___' && row.card_data) {
                                for (let cat in row.card_data) {
                                    if (Array.isArray(row.card_data[cat])) {
                                        localStorage.setItem('TAVERN_CUSTOM_FOLDERS_' + cat, JSON.stringify(row.card_data[cat]));
                                    }
                                }
                                continue;
                            }
                            if (row.id === '___API_KEYS_CONFIG___' && row.card_data) {
                                if (Array.isArray(row.card_data.keys) && typeof saveStoredApiKeys === 'function') saveStoredApiKeys(row.card_data.keys);
                                if (Array.isArray(row.card_data.categories) && typeof saveStoredCustomCategories === 'function') saveStoredCustomCategories(row.card_data.categories);
                                continue;
                            }
                            const asset = { id: row.id, category: row.category, name: row.name, fileType: row.file_type, rawBuffer: buffer, cardData: row.card_data, subCategory: row.card_data?.subCategory || dataObj.subCategory || null, row.card_data, emojiList: row.card_data?.emojiList || null, rawText: row.raw_text, firstMes: dataObj.first_mes || '', alternateGreetings: dataObj.alternate_greetings || [], personality: extractPersonalityDeep(row.card_data || {}), worldbook: dataObj.character_book || (row.category === 'worldbooks' ? row.card_data : null), regexScripts: dataObj.extensions?.regex_scripts || (row.category === 'regex' ? row.card_data : null), createdAt: row.created_at || Date.now() };
                            
                            const putTx = db.transaction('assets', 'readwrite');
                            putTx.objectStore('assets').put(asset);
                        }
                        allAssetsCache = null;
                        updateBadges(); renderItems();
                        showToast('🎉', `强行全量覆盖恢复完成！已从云端拉回 ${data.length} 项资产覆盖本地！`);
                    } else {
                        showToast('ℹ️', '云端无可用备份数据');
                    }
                    document.getElementById('cloudStatusBadge').innerText = '已连接';
                };
            } catch(e) {
                showToast('❌', '覆盖恢复失败');
            }
        }

                async function syncAssetToCloudSilent(asset) {
            if (!supabaseClient) return;
            try {
                let base64Buf = null;
                if (asset.rawBuffer) {
                    const bytes = new Uint8Array(asset.rawBuffer); let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    base64Buf = btoa(binary);
                }
                // 关键修复:把 subCategory 和 card_data 一起塞进 upsert
                const cardData = asset.cardData || {};
                if (asset.subCategory && !cardData.subCategory) {
                    cardData.subCategory = asset.subCategory;
                }
                const { error } = await supabaseClient.from('tavern_assets').upsert({
                    id: asset.id,
                    category: asset.category,
                    name: asset.name,
                    file_type: asset.fileType,
                    card_data: cardData,
                    raw_text: asset.rawText || null,
                    raw_buffer_base64: base64Buf
                });
                if (!error) { showToast('⚡', `"${asset.name}"已增量同步至云端`); }
            } catch(e){}
        }

        async function syncCustomFoldersToCloudSilent() {
            if (!supabaseClient) return;
            try {
                const folders = {};
                const cats = ['cards', 'worldbooks', 'docs', 'gallery', 'themes', 'emojis', 'regex', 'links'];
                for (let cat of cats) {
                    const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_' + cat);
                    if (saved) folders[cat] = JSON.parse(saved);
                }
                const { error } = await supabaseClient.from('tavern_assets').upsert({
                    id: '___CUSTOM_FOLDERS_CONFIG___',
                    category: 'config',
                    name: '__custom_folders_registry__',
                    file_type: 'config',
                    card_data: folders
                });
                if (error) console.error('sync folders err:', error);
            } catch(e){}
        }

        async function manualIncrementalSync() {
            if (!supabaseClient) { alert('未配置 Supabase 云端，无法同步。请在侧边栏填入 URL 与 Key！'); return; }
            const localAssets = await getAllAssets();
            document.getElementById('cloudStatusBadge').innerText = '对比中...';
            showToast('⚡', '正在对比云端与本地资产差异...');

            try {
                const { data: cloudMetadata, error } = await supabaseClient.from('tavern_assets').select('id, created_at');
                if (error) { showToast('❌', `查询云端失败: ${error.message}`); return; }

                const cloudMap = new Map();
                if (cloudMetadata) cloudMetadata.forEach(row => cloudMap.set(row.id, row.created_at));

                let syncedCount = 0;
                for (let a of localAssets) {
                    const cloudTimestamp = cloudMap.get(a.id);
                    if (!cloudTimestamp || (a.createdAt && a.createdAt > cloudTimestamp)) {
                        await syncAssetToCloudSilent(a);
                        syncedCount++;
                    }
                }

                await syncApiKeysToCloudSilent();
                await syncCustomFoldersToCloudSilent();
                document.getElementById('cloudStatusBadge').innerText = '同步完成';
                showToast('✅', `增量同步完成！本次仅上传了 ${syncedCount} 个变动资产`);
            } catch(e) { showToast('❌', '增量同步失败，请检查网络'); }
            setTimeout(() => document.getElementById('cloudStatusBadge').innerText = '已连接', 3000);
        }

        async function restoreFromCloudIncremental() {
            if (!supabaseClient) { alert('未配置 Supabase 云端，无法恢复。请在侧边栏填入 URL 与 Key！'); return; }
            document.getElementById('cloudStatusBadge').innerText = '恢复中...';
            showToast('🔄', '正在对比拉取云端新增资产...');

            try {
                const localAssets = await getAllAssets();
                const localMap = new Map();
                localAssets.forEach(a => localMap.set(a.id, a.createdAt || 0));

                // 1. 先进行轻量级元数据查询，避开 select('*') 在大型图库/美化包下的 Supabase 10s 超时
                const { data: cloudMeta, error: metaErr } = await supabaseClient
                    .from('tavern_assets')
                    .select('id, category, name, file_type, created_at');

                if (metaErr) { 
                    showToast('❌', `对比云端失败: ${metaErr.message}`); 
                    document.getElementById('cloudStatusBadge').innerText = '已连接';
                    return; 
                }

                if (cloudMeta && cloudMeta.length > 0) {
                    // 专门筛选出：API 密钥、自定义设置、以及本地没有或云端更新的全部资产
                    const idsToFetch = [];
                    let hasApiConfig = false;

                    for (let row of cloudMeta) {
                                                        if (row.id === '___CUSTOM_FOLDERS_CONFIG___') {
                                    if (row.card_data) {
                                        for (let cat in row.card_data) {
                                            const key = 'TAVERN_CUSTOM_FOLDERS_' + cat;
                                            if (Array.isArray(row.card_data[cat])) {
                                                localStorage.setItem(key, JSON.stringify(row.card_data[cat]));
                                            }
                                        }
                                    }
                                    continue;
                                }
                                if (row.id === '___API_KEYS_CONFIG___') {
                            hasApiConfig = true;
                            idsToFetch.push(row.id);
                            continue;
                        }
                        const localTimestamp = localMap.get(row.id);
                        const rowTimestamp = row.created_at || 0;
                        if (localTimestamp === undefined || rowTimestamp > localTimestamp) {
                            idsToFetch.push(row.id);
                        }
                    }

                    if (idsToFetch.length === 0) {
                        showToast('🎉', '本地资产与 API 配置已是最新，无须从云端同步！');
                        document.getElementById('cloudStatusBadge').innerText = '已连接';
                        return;
                    }

                    showToast('⌛', `正在分批同步 ${idsToFetch.length} 项变动资产（含 API 密钥/图片/美化包）...`);
                    let restoredCount = 0;
                    const batchSize = 10;

                    for (let i = 0; i < idsToFetch.length; i += batchSize) {
                        const batchIds = idsToFetch.slice(i, i + batchSize);
                        const { data: batchData, error: batchErr } = await supabaseClient
                            .from('tavern_assets')
                            .select('*')
                            .in('id', batchIds);

                        if (batchErr) {
                            console.error('Batch fetch error:', batchErr);
                            continue;
                        }

                        if (batchData && batchData.length > 0) {
                            for (let row of batchData) {
                                // 处理 API 密钥与自定义分类配置的专门恢复
                                                                if (row.id === '___CUSTOM_FOLDERS_CONFIG___') {
                                    if (row.card_data) {
                                        for (let cat in row.card_data) {
                                            const key = 'TAVERN_CUSTOM_FOLDERS_' + cat;
                                            if (Array.isArray(row.card_data[cat])) {
                                                localStorage.setItem(key, JSON.stringify(row.card_data[cat]));
                                            }
                                        }
                                    }
                                    continue;
                                }
                                if (row.id === '___API_KEYS_CONFIG___') {
                                    if (row.card_data) {
                                        if (Array.isArray(row.card_data.keys) && typeof saveStoredApiKeys === 'function') {
                                            saveStoredApiKeys(row.card_data.keys);
                                        }
                                        if (Array.isArray(row.card_data.categories) && typeof saveStoredCustomCategories === 'function') {
                                            saveStoredCustomCategories(row.card_data.categories);
                                        }
                                    }
                                    continue;
                                }

                                // 处理常规资产（图库图片/美化包/角色卡/表情/文档/链接等）
                                let buffer = null;
                                if (row.raw_buffer_base64) {
                                    try {
                                        const cleanB64 = row.raw_buffer_base64.replace(/^data:image\/[^;]+;base64,/, '').trim();
                                        const binary = atob(cleanB64), bytes = new Uint8Array(binary.length);
                                        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
                                        buffer = bytes.buffer;
                                    } catch(err) {
                                        console.error('Decode base64 failed for asset:', row.id, err);
                                    }
                                }

                                const dataObj = row.card_data?.data || row.card_data || {};
                                const asset = {
                                    id: row.id,
                                    category: row.category,
                                    name: row.name,
                                    fileType: row.file_type,
                                    rawBuffer: buffer,
                                    cardData: row.card_data,
                                    subCategory: row.card_data?.subCategory || dataObj.subCategory || null,
                                    emojiList: row.card_data?.emojiList || null,
                                    rawText: row.raw_text,
                                    firstMes: dataObj.first_mes || '',
                                    alternateGreetings: dataObj.alternate_greetings || [],
                                    personality: extractPersonalityDeep(row.card_data || {}),
                                    worldbook: dataObj.character_book || (row.category === 'worldbooks' ? row.card_data : null),
                                    regexScripts: dataObj.extensions?.regex_scripts || (row.category === 'regex' ? row.card_data : null),
                                    createdAt: row.created_at || Date.now()
                                };
                                
                                const tx = db.transaction('assets', 'readwrite');
                                tx.objectStore('assets').put(asset);
                                restoredCount++;
                            }
                        }
                    }

                    if (typeof renderApiKeyList === 'function') renderApiKeyList();
                    if (typeof renderApiKeyCategoryPills === 'function') renderApiKeyCategoryPills();
                    updateBadges(); 
                    await renderItems();
                    showToast('🎉', `云端全模块增量同步完毕！包含 API 密钥、自定义分类及 ${restoredCount} 项大文件资产！`);
                } else { showToast('ℹ️', '云端数据库为空'); }
            } catch(e){ 
                console.error(e); 
                showToast('❌', '恢复失败，请检查 Supabase 配置'); 
            }
            document.getElementById('cloudStatusBadge').innerText = '已连接';
        }

        async function autoSyncFromCloudSilent() {
            if (!supabaseClient) return;
            try { const localAssets = await getAllAssets(); if (localAssets.length === 0) await restoreFromCloudIncremental(); } catch(e){}
        }

        async function updateBadges() {
            const assets = await getAllAssets(), counts = { cards: 0, worldbooks: 0, emojis: 0, regex: 0, docs: 0, gallery: 0, themes: 0, links: 0 };
            assets.forEach(a => { if (counts[a.category] !== undefined) counts[a.category]++; });
            for (let cat in counts) { const el = document.getElementById(`badge-${cat}`); if (el) el.innerText = counts[cat]; }
            const lh=document.getElementById('linksCountHint'); if(lh) lh.innerText=counts.links+' 条链接';
        }

        // Emoji Builder
        function appendEmojiVariable(varName) {
            if (emojiTokens.length > 0 && emojiTokens[emojiTokens.length - 1].type === 'var') {
                emojiTokens.push({ type: 'sep', value: '：' });
            }
            emojiTokens.push({ type: 'var', value: varName });
            renderEmojiFormatBuilder();
        }

        function removeEmojiToken(index) {
            emojiTokens.splice(index, 1);
            renderEmojiFormatBuilder();
        }

        function updateEmojiSepValue(index, val) {
            if (emojiTokens[index]) emojiTokens[index].value = val;
            renderEmojiFormatPreview();
        }

        function clearEmojiFormatTokens() {
            emojiTokens = [];
            renderEmojiFormatBuilder();
        }

        function renderEmojiFormatBuilder() {
            const container = document.getElementById('emojiFormatTokensContainer');
            if (!container) return;
            container.innerHTML = '';

            if (emojiTokens.length === 0) {
                container.innerHTML = `<span class="text-xs text-[#a38b8d] italic">请点击上方胶囊按钮点选变量...</span>`;
                renderEmojiFormatPreview();
                return;
            }

            emojiTokens.forEach((tok, idx) => {
                if (tok.type === 'var') {
                    const badge = document.createElement('div');
                    let bg = 'bg-[#d88c9a] text-white';
                    if (tok.value === '{url}') bg = 'bg-[#7a9bb8] text-white';
                    if (tok.value === '{code}') bg = 'bg-[#5b8a7f] text-white';
                    badge.className = `px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 shadow-sm ${bg}`;
                    badge.innerHTML = `<span>${tok.value}</span><button onclick="removeEmojiToken(${idx})" class="hover:text-rose-100 text-[10px]">✕</button>`;
                    container.appendChild(badge);
                } else if (tok.type === 'sep') {
                    const sepBox = document.createElement('div');
                    sepBox.className = "flex items-center gap-1 bg-[#f8eeee] border border-[#f2dadc] rounded-lg px-1.5 py-0.5";
                    sepBox.innerHTML = `<span class="text-[10px] text-[#8c7173] font-semibold">符号:</span><input type="text" value="${tok.value}" oninput="updateEmojiSepValue(${idx}, this.value)" class="w-8 bg-white border border-[#f2e3e3] rounded px-1 text-center font-mono text-xs text-[#5c494a] focus:outline-none focus:border-[#d88c9a]"><button onclick="removeEmojiToken(${idx})" class="text-[#a38b8d] hover:text-rose-500 text-[10px] px-0.5">✕</button>`;
                    container.appendChild(sepBox);
                }
            });
            renderEmojiFormatPreview();
        }

        function renderEmojiFormatPreview() {
            const el = document.getElementById('emojiFormatPreviewText');
            if (!el) return;
            const sample = { name: '败犬表情', url: 'https://catbox.moe/2a9w.jpg' };
            let out = '';
            emojiTokens.forEach(tok => {
                if (tok.type === 'sep') out += tok.value;
                else if (tok.value === '{name}') out += sample.name;
                else if (tok.value === '{url}') out += sample.url;
            });
            el.innerText = out || '(无表达)';
        }

        function formatEmojiSingleItem(item) {
            let out = '';
            const url = item.url || '';
            const name = item.name || '表情';

            emojiTokens.forEach(tok => {
                if (tok.type === 'sep') out += tok.value;
                else if (tok.value === '{name}') out += name;
                else if (tok.value === '{url}') out += url;
            });
            return out;
        }

        // Export Copy, TXT or DOCX for Current Emoji Pack
        async function exportEmojiPack(formatType) {
            if (!currentItem || !currentItem.emojiList) return;
            const list = currentItem.emojiList.filter(em => selectedEmojiPackItems.has(em.id));
            if (list.length === 0) {
                showToast('ℹ️', '请先勾选需要导出的表情包！');
                return;
            }

            const formattedLines = list.map(em => formatEmojiSingleItem(em));
            const fullText = formattedLines.join('\n');

            if (formatType === 'copy') {
                navigator.clipboard.writeText(fullText);
                showToast('📋', `已快捷复制 ${list.length} 个表情格式文本至剪贴板！`);
            } else if (formatType === 'txt') {
                downloadText(fullText, `${currentItem.name}_表情包导出.txt`, 'text/plain');
                showToast('📄', `已成功导出 ${list.length} 个表情为 TXT 文档！`);
            } else if (formatType === 'docx') {
                const docxContent = `
                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head><meta charset='utf-8'><title>${currentItem.name}</title></head>
                    <body>
                        <h2>${currentItem.name} - 表情包列表</h2>
                        <hr/>
                        <pre style="font-family: monospace; font-size: 12px; line-height: 1.6;">${fullText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </body>
                    </html>
                `;
                downloadText(docxContent, `${currentItem.name}_表情包导出.docx`, 'application/vnd.ms-word');
                showToast('📘', `已成功导出 ${list.length} 个表情为 DOCX 文档！`);
            }
        }

        function togglePackEmojiSelection(emId) {
            if (selectedEmojiPackItems.has(emId)) selectedEmojiPackItems.delete(emId);
            else selectedEmojiPackItems.add(emId);
        }

        function selectAllPackEmojis(select) {
            if (!currentItem || !currentItem.emojiList) return;
            if (select) {
                currentItem.emojiList.forEach(em => selectedEmojiPackItems.add(em.id));
            } else {
                selectedEmojiPackItems.clear();
            }
            renderEmojiPackGrid();
        }

        // List View Batch Selection & Deletion for Emoji Packs
        function toggleEmojiPackInListSelection(id, e) {
            e.stopPropagation();
            if (selectedEmojiPackIdsInList.has(id)) selectedEmojiPackIdsInList.delete(id);
            else selectedEmojiPackIdsInList.add(id);
        }

        async function selectAllEmojiPacksInList(select) {
            const assets = await getAllAssets();
            const filtered = assets.filter(a => a.category === 'emojis');
            if (select) {
                filtered.forEach(a => selectedEmojiPackIdsInList.add(a.id));
            } else {
                selectedEmojiPackIdsInList.clear();
            }
            renderItems();
        }

        async function batchDeleteSelectedEmojiPacks() {
            if (selectedEmojiPackIdsInList.size === 0) {
                showToast('ℹ️', '请先勾选要删除的表情包合集！');
                return;
            }

            if (confirm(`确定要一次性删除已勾选的 ${selectedEmojiPackIdsInList.size} 个表情包合集吗？`)) {
                const idsToDelete = Array.from(selectedEmojiPackIdsInList);
                const tx = db.transaction('assets', 'readwrite');
                const store = tx.objectStore('assets');
                idsToDelete.forEach(id => store.delete(id));

                tx.oncomplete = async () => {
                    if (supabaseClient) {
                        try {
                            for (let id of idsToDelete) {
                                await supabaseClient.from('tavern_assets').delete().eq('id', id);
                            }
                        } catch(e){}
                    }
                    selectedEmojiPackIdsInList.clear();
                    updateBadges(); renderItems();
                    showToast('🗑️', `成功清理并删除了 ${idsToDelete.length} 个表情包合集！`);
                };
            }
        }

        async function savePastedExtrasAsset() {
            const titleInput = document.getElementById('extrasTitleInput');
            const contentInput = document.getElementById('extrasContentInput');
            const title = titleInput ? titleInput.value.trim() : '';
            const content = contentInput ? contentInput.value.trim() : '';

            if (!title) { showToast('⚠️', '请先输入番外/小剧场名字！'); return; }
            if (!content) { showToast('⚠️', '请先输入番外/小剧场内容！'); return; }

            const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await saveAsset({ id, category: 'regex', name: title, fileType: 'txt', rawText: content, createdAt: Date.now() });

            titleInput.value = ''; contentInput.value = '';
            updateBadges(); renderItems();
            showToast('🎉', `已成功保存番外/小剧场 “${title}”！`);
        }

        let searchDebounceTimer = null;

        function onSearchInputDebounced() {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                renderItems();
            }, 180);
        }

        let currentSelectedTagFilter = 'ALL';

        function extractTagsFromData(dataObj) {
            if (!dataObj) return [];
            let rawTags = dataObj.tags || dataObj.data?.tags || [];
            if (typeof rawTags === 'string') {
                rawTags = rawTags.split(/[,，\s]+/).filter(Boolean);
            }
            return Array.isArray(rawTags) ? rawTags.map(t => String(tokTrim(t))).filter(Boolean) : [];
        }

        function tokTrim(t) { return String(t).trim(); }

        async function promptAddCustomTag() {
            if (!currentItem) return;
            const newTag = prompt('请输入新标签名字：');
            if (newTag && newTag.trim()) {
                const tagStr = newTag.trim();
                currentItem.tags = currentItem.tags || [];
                if (!currentItem.tags.includes(tagStr)) {
                    currentItem.tags.push(tagStr);
                    await saveAsset(currentItem);
                    renderOverviewTags();
                    renderTagFilterBar();
                    showToast('🏷️', `已成功添加标签 “${tagStr}”`);
                }
            }
        }

        function removeTagFromCurrentItem(tag) {
            if (!currentItem || !currentItem.tags) return;
            currentItem.tags = currentItem.tags.filter(t => t !== tag);
            saveAsset(currentItem);
            renderOverviewTags();
            renderTagFilterBar();
            showToast('🗑️', `已移除标签 “${tag}”`);
        }

        function renderOverviewTags() {
            const container = document.getElementById('overviewTagsContainer');
            if (!container) return;
            container.innerHTML = '';
            const tags = currentItem?.tags || [];
            if (tags.length === 0) {
                container.innerHTML = `<span class="text-xs text-[#a38b8d] italic">暂无自定义标签</span>`;
                return;
            }
            tags.forEach(tag => {
                const pill = document.createElement('span');
                pill.className = "px-2.5 py-0.5 rounded-full bg-[#f8eeee] border border-[#f2dadc] text-[#b86b7a] text-xs font-semibold flex items-center gap-1";
                pill.innerHTML = `<span>🏷️ ${tag}</span><button onclick="removeTagFromCurrentItem('${tag}')" class="text-[#a38b8d] hover:text-rose-600 text-[10px] ml-0.5">✕</button>`;
                container.appendChild(pill);
            });
        }

        async function renderTagFilterBar() {
            const container = document.getElementById('tagFilterBar');
            if (!container) return;
            container.innerHTML = '';

            const assets = await getAllAssets();
            const categoryAssets = assets.filter(a => a.category === categoryStorageKey(currentTab));
            
            const tagSet = new Set();
            categoryAssets.forEach(a => {
                if (a.tags && Array.isArray(a.tags)) {
                    a.tags.forEach(t => tagSet.add(t));
                }
            });

            if (tagSet.size === 0) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');

            // "All" Pill
            const allBtn = document.createElement('button');
            allBtn.onclick = () => filterByTag('ALL');
            allBtn.className = `px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${currentSelectedTagFilter === 'ALL' ? 'bg-[#d88c9a] text-white shadow-sm' : 'bg-[#f5e8e8] text-[#8c7173] hover:bg-[#f8eeee]'}`;
            allBtn.innerText = '✨ 全部';
            container.appendChild(allBtn);

            tagSet.forEach(tag => {
                const btn = document.createElement('button');
                btn.onclick = () => filterByTag(tag);
                btn.className = `px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition ${currentSelectedTagFilter === tag ? 'bg-[#d88c9a] text-white shadow-sm' : 'bg-[#f5e8e8] text-[#8c7173] hover:bg-[#f8eeee]'}`;
                btn.innerText = `🏷️ ${tag}`;
                container.appendChild(btn);
            });
        }

        function filterByTag(tag) {
            currentSelectedTagFilter = tag;
            renderTagFilterBar();
            renderItems();
        }
        let pendingGalleryFiles = [];
        let pendingGalleryPreviewUrls = [];

        function clearGalleryPreview() {
            pendingGalleryPreviewUrls.forEach(url => URL.revokeObjectURL(url));
            pendingGalleryPreviewUrls = [];
            const box = document.getElementById('galleryPreview');
            if (box) { box.innerHTML = ''; box.classList.add('hidden'); }
        }

        function renderGalleryPreview() {
            const box = document.getElementById('galleryPreview');
            if (!box) return;
            clearGalleryPreview();
            if (!pendingGalleryFiles.length) return;
            box.classList.remove('hidden');
            pendingGalleryFiles.forEach(file => {
                const url = URL.createObjectURL(file);
                pendingGalleryPreviewUrls.push(url);
                const item = document.createElement('div');
                item.className = 'aspect-square rounded-lg overflow-hidden border border-[#f2e3e3] bg-[#fdf4f5]';
                item.innerHTML = `<img src="${url}" class="w-full h-full object-cover">`;
                box.appendChild(item);
            });
        }

        let isGallerySaving = false;

        function bindGalleryUploadControls() {
            const input = document.getElementById('galleryFileInput');
            const chooseBtn = document.getElementById('galleryUploadBtn');
            const localSaveBtn = document.getElementById('galleryLocalSaveBtn');
            const urlSaveBtn = document.getElementById('galleryUrlSaveBtn');

            if (input && input.dataset.bound !== '1') {
                input.dataset.bound = '1';
                chooseBtn?.addEventListener('click', ev => { ev.preventDefault(); input.click(); });
                input.addEventListener('change', ev => {
                    pendingGalleryFiles = Array.from(ev.target.files || []);
                    renderGalleryPreview();
                    if (pendingGalleryFiles.length) showToast('📎', `已选择 ${pendingGalleryFiles.length} 张图片，请确认预览后保存`);
                });
            }

            if (localSaveBtn && localSaveBtn.dataset.bound !== '1') {
                localSaveBtn.dataset.bound = '1';
                localSaveBtn.addEventListener('click', saveLocalGalleryPictures);
            }

            if (urlSaveBtn && urlSaveBtn.dataset.bound !== '1') {
                urlSaveBtn.dataset.bound = '1';
                urlSaveBtn.addEventListener('click', saveGalleryUrl);
            }
        }
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { bindGalleryUploadControls(); if (typeof initCustomCss === 'function') initCustomCss(); }, {once:true}); } else { bindGalleryUploadControls(); if (typeof initCustomCss === 'function') initCustomCss(); }

        async function saveLocalGalleryPictures() {
            if (isGallerySaving) return; // 拦截二次重复保存
            
            const inputNow = document.getElementById('galleryFileInput');
            if (!pendingGalleryFiles.length && inputNow && inputNow.files && inputNow.files.length) {
                pendingGalleryFiles = Array.from(inputNow.files);
            }
            
            const files = pendingGalleryFiles.slice();
            pendingGalleryFiles = []; // 立刻清空全局待保存文件队列，切断重复保存数据源
            clearGalleryPreview();

            if (inputNow) inputNow.value = '';

            const titleInput = document.getElementById('galleryTitleInput');
            const title = titleInput?.value.trim() || '';

            if (!files.length) { 
                showToast('⚠️', '请先选择本地图片'); 
                return; 
            }
window.saveLocalGalleryPictures = saveLocalGalleryPictures;


            isGallerySaving = true;
            try {
                showToast('⌛', `正在保存 ${files.length} 张本地图片...`);
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const name = file.name.replace(/\.[^/.]+$/, '') || `图片_${Date.now()}_${i}`;
                    const assetId = 'asset_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 7);
                    await saveAsset({
                        id: assetId,
                        category: 'gallery',
                        name: files.length === 1 && title ? title : (title ? `${title}_${i+1}` : name),
                        fileType: file.type || 'image/png',
                        cover: new Blob([file], { type: file.type || 'image/png' }),
                        subCategory: currentFolderOpened || '',
                        createdAt: Date.now() + i
                    });
                }
                
                if (titleInput) titleInput.value = '';
                allAssetsCache = null; 
                updateBadges(); 
                await renderItems();
                showToast('🎉', `成功存入 ${files.length} 张图片`);
            } catch (err) { 
                console.error('local gallery save failed', err); 
                showToast('❌', `本地图片保存失败：${err.message || err}`); 
            } finally {
                isGallerySaving = false;
            }
        }

        let isGalleryUrlSaving = false;
        async function saveGalleryUrl() {
            if (isGalleryUrlSaving) return; // 防抖锁拦截重复保存
            const urlInput = document.getElementById('galleryUrlInput');
            const titleInput = document.getElementById('galleryTitleInput');
            const url = urlInput?.value.trim() || '';
            if (!/^https?:\/\//i.test(url)) { showToast('⚠️', '请填写有效的图片链接'); return; }
window.saveGalleryUrl = saveGalleryUrl;

            
            isGalleryUrlSaving = true;
            try {
                if (urlInput) urlInput.value = ''; // 立即清空输入框，切断再次提取数据源
                const nameText = titleInput?.value.trim() || '网络图片';
                if (titleInput) titleInput.value = '';

                await saveAsset({
                    id: 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2), 
                    category: 'gallery', 
                    name: nameText, 
                    fileType: 'img', 
                    url: url,
                    rawText: url, 
                    subCategory: currentFolderOpened || '', 
                    createdAt: Date.now()
                });

                allAssetsCache = null; 
                updateBadges(); 
                await renderItems(); 
                showToast('🎉', '网络图片链接已保存');
            } catch (err) { 
                console.error('url gallery save failed', err); 
                showToast('❌', `网络链接保存失败：${err.message || err}`); 
            } finally {
                isGalleryUrlSaving = false;
            }
        }
        async function renderItems() {
            const assets = await getAllAssets(), keyword = document.getElementById('searchInput').value.toLowerCase().trim(), container = document.getElementById('itemsContainer');
            container.innerHTML = '';

            container.className = "grid grid-cols-2 gap-2.5";

            renderTagFilterBar();

            const builderPanel = document.getElementById('emojiExportBuilderPanel');
            const extrasPanel = document.getElementById('extrasBuilderPanel');
            const galleryPanel = document.getElementById('galleryBuilderPanel');
            const apikeysPanel = document.getElementById('apikeysBuilderPanel');
            if (apikeysPanel) apikeysPanel.classList.add('hidden');
            
            if (currentTab === 'emojis') { 
                builderPanel.classList.remove('hidden'); 
                if (extrasPanel) extrasPanel.classList.add('hidden');
                if (galleryPanel) galleryPanel.classList.add('hidden');
            } else if (currentTab === 'regex') {
                builderPanel.classList.add('hidden'); 
                if (extrasPanel) extrasPanel.classList.add('hidden'); // 强制隐藏极细折叠手账卡片，保持与文本文档纯净一致
                if (galleryPanel) galleryPanel.classList.add('hidden');
            } else if (currentTab === 'gallery') {
                builderPanel.classList.add('hidden'); 
                extrasPanel.classList.add('hidden');
                if (galleryPanel) {
                    if (currentFolderOpened) {
                        galleryPanel.classList.add('hidden');
                    } else {
                        galleryPanel.classList.remove('hidden');
                    }
                }
            } else { 
                builderPanel.classList.add('hidden'); 
                extrasPanel.classList.add('hidden');
                if (galleryPanel) galleryPanel.classList.add('hidden');
            }

            const filtered = assets.filter(a => {
                if (a.category !== categoryStorageKey(currentTab)) return false;

                // Tag Filter
                if (currentSelectedTagFilter !== 'ALL') {
                    if (!a.tags || !a.tags.includes(currentSelectedTagFilter)) return false;
                }

                // Global Multi-field Search Filter
                if (!keyword) return true;

                const nameMatch = a.name && a.name.toLowerCase().includes(keyword);
                const tagMatch = a.tags && a.tags.some(t => t.toLowerCase().includes(keyword));
                const textMatch = a.rawText && a.rawText.toLowerCase().includes(keyword);
                const personalityMatch = a.personality && a.personality.toLowerCase().includes(keyword);

                // Deep search in worldbook entries or emojis
                let wbMatch = false;
                const wb = a.worldbook || a.cardData?.data?.character_book || a.cardData?.character_book;
                if (wb && wb.entries) {
                    const entries = Array.isArray(wb.entries) ? wb.entries : Object.values(wb.entries);
                    wbMatch = entries.some(e => (e.comment && e.comment.toLowerCase().includes(keyword)) || (e.content && e.content.toLowerCase().includes(keyword)) || (Array.isArray(e.keys) && e.keys.some(k => k.toLowerCase().includes(keyword))));
                }

                return nameMatch || tagMatch || textMatch || personalityMatch || wbMatch;
            });
            // document.getElementById('itemCountText').innerText
            // 如果是在子文件夹内部且为空，允许渲染顶部的面包屑导航与导入按钮
            if (filtered.length === 0 && !currentFolderOpened && (keyword || currentTab === 'emojis' || currentTab === 'fonts')) { 
                container.innerHTML = `<div class="col-span-full py-20 text-center text-[#b89b9d]"><i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-30"></i><p class="text-xs">暂无资产</p></div>`; 
                lucide.createIcons(); 
                return; 
            }

            
            // Category/Folder First View (Except fonts)
            if (['cards', 'worldbooks', 'docs', 'regex', 'gallery', 'links', 'emojis'].includes(currentTab) || isCustomCategoryTab(currentTab)) {
                if (!currentFolderOpened && !keyword) {
                    // Group by subCategory & Strict Isolation by Custom Folders list
                    const folderCounts = {};
                    folderCounts['未分类'] = 0;
                    
                    // 读取当前大分类专属持久化的自定义文件夹列表
                    let customFolders = [];
                    try {
                        const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_' + currentTab);
                        if (saved) customFolders = JSON.parse(saved);
                    } catch(e){}
                    if (!Array.isArray(customFolders)) customFolders = [];

                    // 1. 初始化当前 Tab 专属的文件夹名字
                    customFolders.forEach(f => {
                        if (f) folderCounts[f] = 0;
                    });

                    // 2. 统计数量：只有当资产的 subCategory 在当前 Tab 的自定义列表内，或者属于'未分类'时才计数
                    // 彻底防止其他 Tab 的垃圾残留 subCategory 数据跨模块泄露！
                    filtered.forEach(a => {
                        const rawSub = a.subCategory || '未分类';
                        if (rawSub !== '未分类' && customFolders.includes(rawSub)) {
                            folderCounts[rawSub] = (folderCounts[rawSub] || 0) + 1;
                        } else {
                            folderCounts['未分类'] = (folderCounts['未分类'] || 0) + 1;
                        }
                    });

                    // Add Create Folder Cards (只保留一个“+ 创建新分类”单卡片)
                    const addGrid = document.createElement('div');
                    addGrid.className = "col-span-full mb-3";
                    addGrid.innerHTML = `
                        <div onclick="promptCreateFolder()" class="w-full p-3 rounded-[22px] bg-white/80 backdrop-blur-md border border-white/70 flex items-center justify-center gap-2 cursor-pointer hover:border-[#d88c9a] transition active:scale-[0.98] shadow-2xs min-h-[50px]">
                            <div class="w-7 h-7 rounded-full bg-[#f8eeee] text-[#d88c9a] flex items-center justify-center shadow-2xs">
                                <i data-lucide="folder-plus" class="w-4 h-4"></i>
                            </div>
                            <span class="font-bold text-xs text-[#b86b7a]">+ 创建新分类</span>
                        </div>
                    `;
                    container.appendChild(addGrid);

                    // Render Folder Cards (竖版, 1排2列，支持长按整体删除)
                    const sortedFolders = Object.keys(folderCounts).sort((a, b) => {
                        if (a === '未分类') return 1;
                        if (b === '未分类') return -1;
                        return 0;
                    });
                    sortedFolders.forEach(fName => {
                        const cnt = folderCounts[fName];
                        const fCard = document.createElement('div');
                        fCard.className = "col-span-full w-full px-4 py-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 flex items-center justify-between shadow-2xs transition active:scale-[0.99] cursor-pointer relative select-none mb-2.5 min-h-[68px]";
                        
                        let folderLongPressTimer = null;
                        let isFolderLongPress = false;

                        const startFolderPress = (e) => {
                            if (fName === '未分类') return;
                            isFolderLongPress = false;
                            folderLongPressTimer = setTimeout(() => {
                                isFolderLongPress = true;
                                if (navigator.vibrate) try { navigator.vibrate(50); } catch(err){}
                                renameFolder(fName);
                            }, 600);
                        };

                        const cancelFolderPress = () => {
                            if (folderLongPressTimer) clearTimeout(folderLongPressTimer);
                        };

                        fCard.addEventListener('touchstart', startFolderPress, { passive: true });
                        fCard.addEventListener('touchend', cancelFolderPress);
                        fCard.addEventListener('touchmove', cancelFolderPress);
                        fCard.addEventListener('mousedown', startFolderPress);
                        fCard.addEventListener('mouseup', cancelFolderPress);
                        fCard.addEventListener('mouseleave', cancelFolderPress);

                        fCard.onclick = (e) => {
                            if (isFolderLongPress) {
                                e.stopPropagation();
                                e.preventDefault();
                                return;
                            }
                            openFolder(fName);
                        };

                        const editBtnHtml = fName !== '未分类' 
                            ? `<button onclick="event.stopPropagation(); renameFolder('${fName}');" title="重命名分类" class="w-5 h-5 rounded-full bg-[#fdf4f5] hover:bg-[#f8eeee] text-[#b86b7a] flex items-center justify-center transition shadow-2xs mr-1">
                                <i data-lucide="edit-2" class="w-3 h-3"></i>
                               </button>` 
                            : '';
                        const deleteBtnHtml = fName !== '未分类' 
                            ? `<button onclick="event.stopPropagation(); deleteEntireFolder('${fName}', ${cnt});" title="删除分类文件夹" class="w-5 h-5 rounded-full bg-[#f8eeee] hover:bg-[#f2dadc] text-[#b86b7a] flex items-center justify-center transition shadow-2xs">
                                <i data-lucide="trash-2" class="w-3 h-3"></i>
                               </button>` 
                            : '';

                        fCard.innerHTML = `
                            <div class="flex items-center gap-3.5 min-w-0 flex-1">
                                <div class="w-9.5 h-9.5 rounded-2xl bg-[#fdf4f5] text-[#d88c9a] flex items-center justify-center shrink-0 shadow-2xs">
                                    <i data-lucide="folder" class="w-4.5 h-4.5 text-[#d88c9a]"></i>
                                </div>
                                <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                                    <div class="font-extrabold text-sm text-[#4a3e3d] truncate flex items-center gap-2">
                                        <span>${fName}</span>
                                        <span class="text-[10px] px-2 py-0.2 rounded-full bg-[#f8eeee] text-[#b86b7a] font-bold">${cnt} 项</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${editBtnHtml}${deleteBtnHtml}
                                <i data-lucide="chevron-right" class="w-4 h-4 text-[#a89294]"></i>
                            </div>
                        `;
                        container.appendChild(fCard);
                    });
                    lucide.createIcons();
                    return;
                } else if (currentFolderOpened && !keyword) {
                    // Filter assets inside this folder
                    let customFoldersForFilter = [];
                    try {
                        const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_' + currentTab);
                        if (saved) customFoldersForFilter = JSON.parse(saved);
                    } catch(e){}
                    if (!Array.isArray(customFoldersForFilter)) customFoldersForFilter = [];

                    const folderItems = filtered.filter(a => {
                        const sub = a.subCategory || '未分类';
                        if (currentFolderOpened === '未分类') {
                            return sub === '未分类' || !sub || !customFoldersForFilter.includes(sub);
                        } else {
                            return sub === currentFolderOpened;
                        }
                    });
                    filtered.length = 0;
                    folderItems.forEach(fi => filtered.push(fi));

                    // Breadcrumb Header (单排紧凑模式：左侧返回+文件夹名，右侧直接显示“📥 导入”按钮)
                    const breadcrumb = document.createElement('div');
                    breadcrumb.className = "col-span-full flex items-center justify-between bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-2.5 mb-2.5 shadow-2xs gap-2";
                    
                    let importBtnText = '📥 导入文件';
                    if (currentTab === 'cards') importBtnText = '📥 导入角色卡';
                    else if (currentTab === 'worldbooks') importBtnText = '📥 导入世界书';
                    else if (currentTab === 'docs') importBtnText = '📥 导入文档';
                    else if (currentTab === 'regex') importBtnText = '📥 导入';
                    else if (currentTab === 'emojis') importBtnText = '📥 导入表情包';

                    let rightButtonsHtml = `
                        <button onclick="triggerGlobalDirectImport()" class="px-3 py-1.5 rounded-xl bg-[#fff0f3] border border-[#f2dadc] text-[#e11d48] text-xs font-bold hover:bg-[#ffe4e6] transition flex items-center gap-1 shadow-2xs active:scale-95 shrink-0">
                            ${importBtnText}
                        </button>
                    `;
if (currentTab === 'docs' || currentTab === 'regex') {
                        rightButtonsHtml = `
                            <button onclick="triggerDocPasteModalPrompt()" class="px-2 py-1.5 rounded-xl bg-[#fdf4f5] border border-[#f2dadc] text-[#b86b7a] text-[11px] font-bold hover:bg-[#f8eeee] transition flex items-center gap-0.5 shadow-2xs active:scale-95 shrink-0 whitespace-nowrap">
                                ✏️ 粘贴草稿
                            </button>
                            <button onclick="triggerGlobalDirectImport()" class="px-2 py-1.5 rounded-xl bg-[#fff0f3] border border-[#f2dadc] text-[#e11d48] text-[11px] font-bold hover:bg-[#ffe4e6] transition flex items-center gap-0.5 shadow-2xs active:scale-95 shrink-0 whitespace-nowrap">
                                ${importBtnText}
                            </button>
                        `;
                    } else if (currentTab === 'gallery') {
                        rightButtonsHtml = `
                            <button onclick="triggerGalleryLinkInputPrompt()" class="px-2 py-1.5 rounded-xl bg-[#fdf4f5] border border-[#f2dadc] text-[#b86b7a] text-[11px] font-bold hover:bg-[#f8eeee] transition flex items-center gap-0.5 shadow-2xs active:scale-95 shrink-0 whitespace-nowrap">
                                🔗 粘贴直链
                            </button>
                            <button onclick="triggerGlobalDirectImport()" class="px-2 py-1.5 rounded-xl bg-[#fff0f3] border border-[#f2dadc] text-[#e11d48] text-[11px] font-bold hover:bg-[#ffe4e6] transition flex items-center gap-0.5 shadow-2xs active:scale-95 shrink-0 whitespace-nowrap">
                                📥 上传图片
                            </button>
                        `;
                    }

                    breadcrumb.innerHTML = `
                        <div class="flex items-center gap-1 min-w-0 shrink">
                            <button onclick="exitFolderView()" class="px-2 py-1 rounded-xl bg-[#d88c9a] text-white text-[11px] font-bold hover:bg-[#c97b8b] transition flex items-center gap-0.5 shrink-0 shadow-2xs active:scale-95">
                                <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> 返回
                            </button>
                            <span class="text-[11px] font-extrabold text-[#4a3e3d] truncate hidden sm:inline-block">📂 ${currentFolderOpened}</span>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0 ml-auto">
                            ${rightButtonsHtml}
                            <button onclick="promptBatchMoveToFolder()" class="text-[10px] text-[#b86b7a] hover:underline font-semibold shrink-0 ml-0.5 whitespace-nowrap">+移动</button>
                        </div>
                    `;
                    container.appendChild(breadcrumb);
                }
            }

            filtered.forEach(item => {
                const card = document.createElement('div');
                const isSelected = selectedAssetIds.has(item.id);
                
                card.setAttribute('data-asset-id', item.id);
                card.className = `ui-card p-3 flex flex-col justify-between cursor-pointer hover:border-[#d88c9a] transition active:scale-[0.99] relative group ${isSelected ? 'ring-2 ring-[#d88c9a] bg-[#fdf6f7]' : ''}`;
                
                // 绑定长按事件
                bindLongPressEvent(card, item.id);

                card.onclick = (e) => {
                    if (isMultiSelectMode) {
                        toggleSelectAsset(item.id, e);
                    } else if (currentTab === 'links' || item.category === 'links') {
                        openLinkDetailModal(item);
                    } else {
                        openDetailView(item);
                    }
                };

                if (currentTab === 'links') {
                    const linkUrl = item.url || item.rawText || '#';
                    card.className = "ui-card col-span-full w-full p-4 flex flex-col gap-3 hover:border-[#60a5fa] transition relative group bg-white/75 rounded-2xl border border-white/80 shadow-sm backdrop-blur-md";
                    card.innerHTML = `
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-2xl bg-[#e0f2fe]/80 border border-[#93c5fd] flex items-center justify-center shrink-0">
                                    <i data-lucide="link" class="w-4 h-4 text-[#2563eb]"></i>
                                </div>
                                <div class="truncate">
                                    <h3 class="font-bold text-sm text-[#172554] truncate">${item.name}</h3>
                                    <span class="text-[11px] text-[#64748b] font-mono block truncate mt-0.5">${linkUrl}</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-[#dbeafe]">
                            <button onclick="openLinkInDefaultBrowser('${linkUrl}')" class="flex-1 min-w-[150px] py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[11px] transition shadow-xs flex items-center justify-center gap-1">
                                🚀 默认浏览器打开
                            </button>
                            <button onclick="navigator.clipboard.writeText('${linkUrl}'); showToast('📋', '链接已复制！');" class="px-3 py-2 rounded-xl bg-[#eff6ff] text-[#475569] hover:bg-[#e2e8f0] text-[11px] font-bold transition">
                                📋 复制
                            </button>
                            <button onclick="event.stopPropagation(); currentItem = item; promptAddCustomTag();" class="px-3 py-2 rounded-xl bg-[#fdf4f5] text-[#b86b7a] hover:bg-[#f8eeee] text-[11px] font-bold transition">
                                🏷️ 标签
                            </button>
                            <button onclick="deleteSingleAsset('${item.id}', event)" class="px-3 py-2 rounded-xl bg-[#fff1f2] text-[#ef4444] hover:bg-[#fee2e2] text-[11px] font-bold transition">
                                🗑️
                            </button>
                        </div>
                    `;
                } else if (currentTab === 'gallery') {
                    const imgUrl = getAssetImageUrl(item);
                    card.className = `ui-card p-2 flex flex-col justify-between cursor-pointer hover:border-[#d88c9a] transition active:scale-[0.99] relative group ${isSelected ? 'ring-2 ring-[#d88c9a] bg-[#fdf6f7]' : ''}`;
                    card.innerHTML = `
                        <div class="aspect-square rounded-lg overflow-hidden bg-[#fdf4f5] mb-1 border border-[#f5e1e3] flex items-center justify-center p-0.5 relative">
                            <img src="${imgUrl}" class="w-full h-full object-cover rounded-lg" onerror="this.src='https://placehold.co/300x400/fdf4f5/d88c9a?text=图片加载失败'">
                        </div>
                        <div>
                            <h3 class="font-bold text-xs text-[#4a3e3d] text-center truncate px-0.5">${item.name}</h3>${item.tags && item.tags.length > 0 ? `<div class="flex items-center justify-center gap-1 flex-wrap pt-0.5">${item.tags.slice(0, 2).map(t => `<span class="text-[9px] px-1.5 py-0.2 rounded bg-[#f8eeee] text-[#b86b7a] font-medium">🏷️ ${t}</span>`).join('')}</div>` : ''}
                        </div>
                    `;
                } else if (currentTab === 'emojis') {
                    const count = item.emojiList ? item.emojiList.length : 0;
                    const previewCover = item.emojiList && item.emojiList[0] ? item.emojiList[0].url : '';
                    const isChecked = selectedEmojiPackIdsInList.has(item.id);

                    card.innerHTML = `
                        <div class="absolute top-2 left-2 z-10">
                            <input type="checkbox" ${isChecked ? 'checked' : ''} onclick="toggleEmojiPackInListSelection('${item.id}', event)" class="w-4 h-4 text-[#d88c9a] rounded border-[#f2e3e3] cursor-pointer">
                        </div>
                        <div>
                            <div class="h-28 rounded-xl bg-[#fdf4f5] mb-2 border border-[#f5e1e3] flex items-center justify-center overflow-hidden p-1">
                                ${previewCover ? `<img src="${previewCover}" class="max-w-full max-h-full object-contain" onerror="this.src='https://placehold.co/150x150/fdf4f5/d88c9a?text=表情合集'">` : `<i data-lucide="smile" class="w-8 h-8 text-[#d88c9a]"></i>`}
                            </div>
                            <h3 class="font-bold text-sm text-[#4a3e3d] text-center truncate py-0.5">${item.name}</h3>
                            <p class="text-[10px] text-[#b86b7a] font-semibold text-center">包含 ${count} 个表情图片</p>
                        </div>
                    `;
                } else {
                    let coverHtml = '';
                    if (item.rawBuffer && item.fileType === 'png') {
                        const blob = new Blob([item.rawBuffer], { type: 'image/png' }), url = URL.createObjectURL(blob);
                        coverHtml = `<div class="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-1 border border-slate-100"><img src="${url}" class="w-full h-full object-cover"></div>`;
                    } else {
                        coverHtml = `<div class="h-20 rounded-lg bg-[#fdf4f5] mb-1 flex items-center justify-center text-[#d88c9a]"><i data-lucide="${item.fileType === 'docx' || item.fileType === 'txt' ? 'file-text' : 'user'}" class="w-6 h-6"></i></div>`;
                    }
                    card.innerHTML = `<div>${coverHtml}<h3 class="font-bold text-sm text-[#4a3e3d] text-center truncate py-1">${item.name}</h3>${item.tags && item.tags.length > 0 ? `<div class="flex items-center justify-center gap-1 flex-wrap pt-0.5">${item.tags.slice(0, 3).map(t => `<span class="text-[9px] px-1.5 py-0.2 rounded bg-[#f8eeee] text-[#b86b7a] font-medium">🏷️ ${t}</span>`).join('')}${item.tags.length > 3 ? `<span class="text-[9px] text-[#a38b8d]">+${item.tags.length - 3}</span>` : ''}</div>` : ''}</div>`;
                }
                // 如果处于批量多选模式，在卡片右上角统一注入精致勾选红点圆框
                if (isMultiSelectMode) {
                    const checkBadge = document.createElement('div');
                    checkBadge.className = `selection-badge absolute top-2 right-2 z-30 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition ${isSelected ? 'bg-[#d88c9a] text-white scale-110' : 'bg-white/90 border border-gray-300 text-transparent'}`;
                    checkBadge.innerHTML = '✓';
                    checkBadge.onclick = (e) => toggleSelectAsset(item.id, e);
                    card.appendChild(checkBadge);
                }

                container.appendChild(card);
            });

            lucide.createIcons();
        }

        
        async function renameCurrentItem() {
            if (!currentItem) return;
            const newName = prompt('请输入新名称：', currentItem.name);
            if (newName && newName.trim() && newName.trim() !== currentItem.name) {
                currentItem.name = newName.trim();
                await saveAsset(currentItem);
                document.getElementById('pageTitle').innerText = currentItem.name;
                updateBadges();
                renderItems();
                showToast('✏️', `已重命名为 “${currentItem.name}”`);
            }
        }

        function openDetailView(item) {
            currentItem = item; document.getElementById('pageTitle').innerText = item.name;
            document.getElementById('listView').classList.add('hidden'); document.getElementById('detailView').classList.remove('hidden'); document.getElementById('detailView').classList.add('flex');
            setupHeaderExportActions(item);

            // Render Overview Tags
            renderOverviewTags();

            // Standalone Worldbook Category Handling
            if (item.category === 'worldbooks') {
                document.getElementById('secondaryPillsBar').classList.add('hidden');
                switchDetailTab('worldbook');
                selectedWbEntryIndexes.clear();
                renderOverviewTags();
                renderWorldbookEntries();
                return;
            }

            // Standalone Extras / Side Stories Category Handling
            if (item.category === 'regex') {
                document.getElementById('secondaryPillsBar').classList.add('hidden');
                switchDetailTab('doc-full');
                const textarea = document.getElementById('docFullContentTextarea');
                if (textarea) textarea.value = item.rawText || '无番外/小剧场内容';
                renderOverviewTags();
                renderDocVersionSelectOptions();
                return;
            }

            if (item.category === 'themes' || isCustomCategoryTab(item.category)) {
                document.getElementById('headerExportActions').innerHTML = '';
                document.getElementById('secondaryPillsBar').classList.add('hidden');
                switchDetailTab('theme-standalone');
                
                let sizeText = '按需大小';
                if (item.rawBuffer) {
                    sizeText = formatFileSize(item.rawBuffer.byteLength || item.rawBuffer.size || 0);
                } else if (item.rawText) {
                    sizeText = formatFileSize(new Blob([item.rawText]).size);
                }

                const fileTypeUpper = (item.fileType || 'BIN').toUpperCase();
                const isCustomFile = isCustomCategoryTab(item.category);
                const detailTitle = isCustomFile ? '文件资产详情' : '美化资产详情';
                const previewText = item.rawText || '';
                const container = document.getElementById('subview-theme-standalone');

                container.innerHTML = `
                    <div class="w-full space-y-3 pt-1">
                        <!-- 顶栏精美标题卡 -->
                        <div class="w-full bg-white/90 rounded-2xl p-4 border border-[#f2dadc] shadow-xs space-y-3">
                            <div class="flex items-center justify-between gap-2 border-b border-[#f5e1e3] pb-2">
                                <div class="flex items-center gap-1.5 text-xs font-bold text-[#b86b7a]">
                                    <i data-lucide="sparkles" class="w-4 h-4 text-[#d88c9a]"></i>
                                    <span>${detailTitle}</span>
                                </div>
                                <button type="button" onclick="renameCurrentItem()" class="px-3 py-1 rounded-full bg-[#fdf4f5] border border-[#f2dadc] text-[#b86b7a] text-xs font-bold hover:bg-[#f2dadc] transition flex items-center gap-1 shrink-0">
                                    ✏️ 修改名字
                                </button>
                            </div>
                            
                            <!-- 名字展示区 -->
                            <div class="text-base font-bold text-[#4a3e3d] break-all leading-relaxed pt-1">
                                ${item.name}
                            </div>
                            
                            <!-- 格式与大小指标卡 -->
                            <div class="grid grid-cols-2 gap-2.5 pt-2">
                                <div class="bg-[#fdf6f7] p-3 rounded-xl border border-[#f2dadc] flex flex-col justify-center">
                                    <span class="text-[10px] text-[#8c7173] block mb-1">文件格式</span>
                                    <span class="text-xs font-bold font-mono text-[#b86b7a] truncate">${fileTypeUpper} ${isCustomFile ? '文件' : '美化包'}</span>
                                </div>
                                <div class="bg-[#fdf6f7] p-3 rounded-xl border border-[#f2dadc] flex flex-col justify-center">
                                    <span class="text-[10px] text-[#8c7173] block mb-1">文件大小</span>
                                    <span class="text-xs font-bold font-mono text-[#4a3e3d] truncate">${sizeText}</span>
                                </div>
                            </div>
                        </div>

                        ${!isCustomFile ? `
                        <div class="w-full pb-1">
                            <button type="button" onclick="applyThemeCodeAsGlobalCss()" class="w-full py-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-bold text-xs shadow-md hover:opacity-90 transition flex items-center justify-center gap-1.5">
                                ✨ 实时应用为此 CSS 外观皮肤
                            </button>
                        </div>` : ''}
                        
                        <!-- 下载与删除双大按钮区 -->
                        <div class="grid grid-cols-2 gap-2.5 pt-1">
                            ${item.rawBuffer ? `
                                <button type="button" onclick="const cName = currentItem.name.replace(/(\.(json|css|txt|zip|docx|png))+$/gi, '').trim() || '美化资产'; downloadBuffer(currentItem.rawBuffer, cName + '.' + (currentItem.fileType || 'zip'), 'application/zip');" class="w-full py-3 rounded-xl bg-[#d88c9a] text-white font-bold text-xs shadow-sm hover:bg-[#c97b8b] transition flex items-center justify-center gap-1.5">
                                    📥 下载文件
                                </button>
                            ` : `
                                <button type="button" onclick="const cName = currentItem.name.replace(/(\.(json|css|txt|zip|docx|png))+$/gi, '').trim() || '美化资产'; downloadText(currentItem.rawText || '', cName + '.' + (currentItem.fileType || 'json'), 'application/json');" class="w-full py-3 rounded-xl bg-[#d88c9a] text-white font-bold text-xs shadow-sm hover:bg-[#c97b8b] transition flex items-center justify-center gap-1.5">
                                    📥 下载美化文件
                                </button>
                            `}
                            <button type="button" onclick="deleteCurrentItem()" class="w-full py-3 rounded-xl bg-[#f5e1e3] border border-[#f2dadc] text-[#c95368] font-bold text-xs hover:bg-[#f0cfd3] transition flex items-center justify-center gap-1.5">
                                🗑️ 删除资产
                            </button>
                        </div>
                        
                        <!-- 代码与配置预览区 -->
                        ${previewText ? `
                            <div class="w-full bg-white/80 rounded-2xl p-3.5 border border-[#f2dadc] space-y-2">
                                <span class="text-xs font-bold text-[#8c7173] block">${isCustomFile ? '文件内容预览:' : '美化代码 / 配置数据预览:'}</span>
                                <textarea readonly class="w-full h-40 bg-[#faf6f0] border border-[#f2dadc] rounded-xl p-2.5 text-[11px] font-mono text-[#4a3e3d] resize-none custom-scrollbar focus:outline-none leading-relaxed">${previewText}</textarea>
                            </div>
                        ` : ''}
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            if (item.category === 'gallery') {
                document.getElementById('secondaryPillsBar').classList.add('hidden');
                switchDetailTab('theme-standalone');
                const imgUrl = getAssetImageUrl(item);
                const container = document.getElementById('subview-theme-standalone');
                container.innerHTML = `
                    <div class="w-full space-y-3 pt-1">
                        <div class="w-full bg-white/90 rounded-2xl p-4 border border-[#f2dadc] shadow-xs space-y-3 text-center">
                            <div class="flex items-center justify-between gap-2 border-b border-[#f5e1e3] pb-2">
                                <div class="flex items-center gap-1.5 text-xs font-bold text-[#b86b7a]">
                                    <i data-lucide="image" class="w-4 h-4 text-[#d88c9a]"></i>
                                    <span>图库大图预览</span>
                                </div>
                                <button type="button" onclick="renameCurrentItem()" class="px-3 py-1 rounded-full bg-[#fdf4f5] border border-[#f2dadc] text-[#b86b7a] text-xs font-bold hover:bg-[#f2dadc] transition flex items-center gap-1 shrink-0">
                                    ✏️ 修改名字
                                </button>
                            </div>
                            <div class="text-sm font-bold text-[#4a3e3d] truncate pt-1">${item.name}</div>
                            <div class="flex justify-center py-2">
                                <img src="${imgUrl}" class="max-w-full rounded-2xl shadow-md border border-[#f5e1e3] max-h-[65vh] object-contain">
                            </div>
                            <div class="grid grid-cols-2 gap-2.5 pt-2">
                                <button type="button" onclick="const a = document.createElement('a'); a.href='${imgUrl}'; a.download='${item.name}.png'; a.click();" class="w-full py-2.5 rounded-xl bg-[#d88c9a] text-white font-bold text-xs shadow-xs hover:bg-[#c97b8b] transition">
                                    📥 保存原图
                                </button>
                                <button type="button" onclick="deleteCurrentItem()" class="w-full py-2.5 rounded-xl bg-[#f5e1e3] text-[#c95368] font-bold text-xs hover:bg-[#f0cfd3] transition">
                                    🗑️ 删除图片
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            if (item.category === 'emojis') {
                document.getElementById('secondaryPillsBar').classList.add('hidden');
                switchDetailTab('emoji-grid');
                selectedEmojiPackItems.clear();
                if (item.emojiList) item.emojiList.forEach(em => selectedEmojiPackItems.add(em.id));
                renderEmojiPackGrid();
                return;
            }

            // 如果卡片格式是 docx 或 txt 文本类型（或者非 JSON/PNG 深度解析的角色卡/世界书/番外），直接切换到文档全文模式，不显示人设世界书等 Tab
            const ext = (item.fileType || '').toLowerCase();
            const isDeepCard = (item.category === 'cards') && item.cardData && (item.cardData.data || item.cardData.name || item.cardData.spec);
            if (ext === 'docx' || ext === 'doc' || ext === 'txt' || item.category === 'docs' || item.category === 'regex' || !isDeepCard) {
                document.getElementById('secondaryPillsBar').classList.add('hidden');
                switchDetailTab('doc-full');
                const textarea = document.getElementById('docFullContentTextarea');
                if (textarea) textarea.value = item.rawText || '无文档/DOCX文本内容';
                renderOverviewTags();
                renderDocVersionSelectOptions();
                return;
            }
            
            document.getElementById('secondaryPillsBar').classList.remove('hidden');
            let pText = item.personality || extractPersonalityDeep(item.cardData || {});
            document.getElementById('overviewPersonalityText').innerText = pText;
            personalityCollapsed = true; document.getElementById('overviewPersonalityBody').classList.add('hidden'); document.getElementById('personalityChevron').classList.remove('rotate-180');
            renderGreetingsList(item); renderWorldbookEntries(); renderRegexEntries(); switchDetailTab('overview');
        }

        function renderEmojiPackGrid() {
            const container = document.getElementById('emojiPackGridContainer');
            if (!container || !currentItem || !currentItem.emojiList) return;
            container.innerHTML = '';

            currentItem.emojiList.forEach(em => {
                const isChecked = selectedEmojiPackItems.has(em.id);
                const itemCard = document.createElement('div');
                itemCard.className = "ui-card p-2 flex flex-col justify-between hover:border-[#d88c9a] transition relative group";
                itemCard.innerHTML = `
                    <div class="absolute top-1.5 left-1.5 z-10">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="togglePackEmojiSelection('${em.id}')" class="w-3.5 h-3.5 text-[#d88c9a] rounded border-[#f2e3e3] cursor-pointer">
                    </div>
                    <div class="h-24 rounded-lg overflow-hidden bg-[#faf6f0] mb-1 border border-[#f7ecee] flex items-center justify-center p-1">
                        <img src="${em.url}" class="max-w-full max-h-full object-contain" onerror="this.src='https://placehold.co/100x100/faf6f0/a38b8d?text=图片失效'">
                    </div>
                    <div>
                        <h4 class="font-bold text-[11px] text-[#4a3e3d] text-center truncate px-0.5">${em.name}</h4>
                        <p class="text-[9px] text-[#a38b8d] font-mono text-center truncate">${em.url}</p>
                    </div>
                `;
                container.appendChild(itemCard);
            });
            lucide.createIcons();
        }

        function togglePersonalityCollapse() {
            personalityCollapsed = !personalityCollapsed;
            const body = document.getElementById('overviewPersonalityBody'), chevron = document.getElementById('personalityChevron');
            if (personalityCollapsed) { body.classList.add('hidden'); chevron.classList.remove('rotate-180'); }
            else { body.classList.remove('hidden'); chevron.classList.add('rotate-180'); }
        }

        function setupHeaderExportActions(item) {
            const container = document.getElementById('headerExportActions');
            container.innerHTML = `<button onclick="renameCurrentItem()" class="p-1.5 rounded-lg text-[#b86b7a] hover:bg-[#f5e1e3] transition ml-1" title="重命名"><i data-lucide="edit-3" class="w-4 h-4"></i></button><button onclick="deleteCurrentItem()" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition ml-1" title="删除"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
            
            if (item.category === 'docs') {
                const btnCopy = document.createElement('button'); btnCopy.onclick = () => { navigator.clipboard.writeText(item.rawText || ''); showToast('📋', '文档内容已复制！'); };
                btnCopy.className = "px-2.5 py-1 rounded-full bg-[#e098a5] text-white hover:bg-[#d88c9a] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnCopy.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> 复制全文`;
                container.insertBefore(btnCopy, container.firstChild);

                const btnTxt = document.createElement('button'); btnTxt.onclick = () => downloadText(item.rawText || '', `${item.name.replace(/\.[^/.]+$/, '')}.txt`, 'text/plain');
                btnTxt.className = "px-2.5 py-1 rounded-full bg-[#d88c9a] text-white hover:bg-[#c97b8b] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnTxt.innerHTML = `<i data-lucide="file-text" class="w-3 h-3"></i> 导出 TXT`;
                container.insertBefore(btnTxt, container.firstChild);

                const btnDocx = document.createElement('button'); btnDocx.onclick = () => {
                    const docxContent = `
                        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                        <head><meta charset='utf-8'><title>${item.name}</title></head>
                        <body>
                            <h2>${item.name}</h2>
                            <hr/>
                            <pre style="font-family: sans-serif; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${(item.rawText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </body>
                        </html>
                    `;
                    downloadText(docxContent, `${item.name.replace(/\.[^/.]+$/, '')}.docx`, 'application/vnd.ms-word');
                    showToast('📘', '已成功导出为 DOCX 文档！');
                };
                btnDocx.className = "px-2.5 py-1 rounded-full bg-[#7a9bb8] text-white hover:bg-[#688ca6] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnDocx.innerHTML = `<i data-lucide="file" class="w-3 h-3"></i> 导出 DOCX`;
                container.insertBefore(btnDocx, container.firstChild);
            }

            if (item.category === 'regex') {
                const btnCopy = document.createElement('button'); btnCopy.onclick = () => { navigator.clipboard.writeText(item.rawText || ''); showToast('📋', '番外/小剧场 内容已复制！'); };
                btnCopy.className = "px-2.5 py-1 rounded-full bg-[#e098a5] text-white hover:bg-[#d88c9a] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnCopy.innerHTML = `<i data-lucide="copy" class="w-3 h-3"></i> 复制内容`;
                container.insertBefore(btnCopy, container.firstChild);

                const btnTxt = document.createElement('button'); btnTxt.onclick = () => downloadText(item.rawText || '', `${item.name}.txt`, 'text/plain');
                btnTxt.className = "px-2.5 py-1 rounded-full bg-[#d88c9a] text-white hover:bg-[#c97b8b] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnTxt.innerHTML = `<i data-lucide="file-text" class="w-3 h-3"></i> 导出 TXT`;
                container.insertBefore(btnTxt, container.firstChild);

                const btnDocx = document.createElement('button'); btnDocx.onclick = () => {
                    const docxContent = `
                        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                        <head><meta charset='utf-8'><title>${item.name}</title></head>
                        <body>
                            <h2>${item.name}</h2>
                            <hr/>
                            <pre style="font-family: sans-serif; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${(item.rawText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </body>
                        </html>
                    `;
                    downloadText(docxContent, `${item.name}.docx`, 'application/vnd.ms-word');
                    showToast('📘', '已成功导出为 DOCX 文档！');
                };
                btnDocx.className = "px-2.5 py-1 rounded-full bg-[#7a9bb8] text-white hover:bg-[#688ca6] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnDocx.innerHTML = `<i data-lucide="file" class="w-3 h-3"></i> 导出 DOCX`;
                container.insertBefore(btnDocx, container.firstChild);
            }

            if (item.category === 'worldbooks') {
                const btnWbAll = document.createElement('button'); btnWbAll.onclick = () => exportCardWorldbookFull(item);
                btnWbAll.className = "px-2.5 py-1 rounded-full bg-[#d88c9a] text-white hover:bg-[#c97b8b] text-[11px] font-bold transition flex items-center gap-1 shadow-sm"; 
                btnWbAll.innerHTML = `<i data-lucide="book-open" class="w-3 h-3"></i> 导出完整世界书JSON`; 
                container.insertBefore(btnWbAll, container.firstChild);
            }

            if (item.category === 'gallery') {
                const btnDownloadImg = document.createElement('button');
                btnDownloadImg.onclick = () => {
                    const imgUrl = getAssetImageUrl(item);
                    if (imgUrl.startsWith('data:image') || imgUrl.startsWith('blob:')) {
                        const a = document.createElement('a'); a.href = imgUrl; a.download = `${item.name}.png`; a.click();
                    } else {
                        window.open(imgUrl, '_blank');
                    }
                    showToast('📥', '已触发图片保存/下载！');
                };
                btnDownloadImg.className = "px-2.5 py-1 rounded-full bg-[#d88c9a] text-white hover:bg-[#c97b8b] text-[11px] font-bold transition flex items-center gap-1 shadow-sm";
                btnDownloadImg.innerHTML = `<i data-lucide="download" class="w-3 h-3"></i> 下载图片`;
                container.insertBefore(btnDownloadImg, container.firstChild);
            }

            if (item.category === 'cards') {
                const ext = (item.fileType || '').toLowerCase();
                const isDeepCard = item.cardData && (item.cardData.data || item.cardData.name || item.cardData.spec);
                if (ext === 'docx' || ext === 'doc' || ext === 'txt' || !isDeepCard) {
                    const btnTxt = document.createElement('button'); btnTxt.onclick = () => downloadText(item.rawText || '', `${item.name}.txt`, 'text/plain');
                    btnTxt.className = "px-2 py-0.8 rounded-xl bg-[#fdf4f5] text-[#b86b7a] hover:bg-[#f8eeee] text-[10px] font-bold transition flex items-center gap-1 border border-[#f5e1e3] shrink-0"; btnTxt.innerHTML = `<i data-lucide="file-text" class="w-3 h-3"></i> 导出TXT`; container.insertBefore(btnTxt, container.firstChild);

                    const btnDocx = document.createElement('button'); btnDocx.onclick = () => {
                        const docxContent = `
                            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                            <head><meta charset='utf-8'><title>${item.name}</title></head>
                            <body>
                                <h2>${item.name}</h2>
                                <hr/>
                                <pre style="font-family: sans-serif; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${(item.rawText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                            </body>
                            </html>
                        `;
                        downloadText(docxContent, `${item.name}.docx`, 'application/vnd.ms-word');
                        showToast('📘', '已成功导出 DOCX！');
                    };
                    btnDocx.className = "px-2 py-0.8 rounded-xl bg-[#e8f0f8] text-[#688ca6] hover:bg-[#d8e4f2] text-[10px] font-bold transition flex items-center gap-1 shrink-0"; btnDocx.innerHTML = `<i data-lucide="file" class="w-3 h-3"></i> 导出DOCX`; container.insertBefore(btnDocx, container.firstChild);
                } else {
                    const btnWb = document.createElement('button'); btnWb.onclick = () => exportCardWorldbookFull(item);
                    btnWb.className = "px-2 py-0.8 rounded-xl bg-[#fdf4f5] text-[#b86b7a] hover:bg-[#f8eeee] text-[10px] font-bold transition flex items-center gap-1 border border-[#f5e1e3] shrink-0"; btnWb.innerHTML = `<i data-lucide="book-open" class="w-3 h-3"></i> 导出世界书`; container.insertBefore(btnWb, container.firstChild);

                    if (item.fileType === 'png' && item.rawBuffer) {
                        const btnPng = document.createElement('button'); btnPng.onclick = () => downloadBuffer(item.rawBuffer, `${item.name}.png`, 'image/png');
                        btnPng.className = "px-2 py-0.8 rounded-xl bg-[#f8eeee] text-[#b86b7a] hover:bg-[#f5e1e3] text-[10px] font-bold transition flex items-center gap-1 shrink-0"; btnPng.innerHTML = `<i data-lucide="image" class="w-3 h-3"></i> 导出原卡PNG`; container.insertBefore(btnPng, container.firstChild);
                    }
                    const btnJson = document.createElement('button'); btnJson.onclick = () => downloadText(item.rawText || JSON.stringify(item.cardData, null, 2), `${item.name}.json`, 'application/json');
                    btnJson.className = "px-2 py-0.8 rounded-xl bg-[#e8f8f0] text-[#5b8a7f] hover:bg-[#d8ebe5] text-[10px] font-bold transition flex items-center gap-1 shrink-0"; btnJson.innerHTML = `<i data-lucide="file-json" class="w-3 h-3"></i> 导出JSON`; container.insertBefore(btnJson, container.firstChild);
                }
            }
            lucide.createIcons();
        }

        function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        function downloadText(text, filename, mimeType) {
            if (window.AndroidApp && typeof window.AndroidApp.saveBase64File === 'function') {
                try {
                    const base64 = window.btoa(unescape(encodeURIComponent(text)));
                    window.AndroidApp.saveBase64File(base64, filename, mimeType || 'text/plain');
                    return;
                } catch(e) { console.error('Android bridge text save failed', e); }
            }
            const blob = new Blob([text], { type: `${mimeType};charset=utf-8` }), url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
        }

        function downloadBuffer(buffer, filename, mimeType) {
            if (window.AndroidApp && typeof window.AndroidApp.saveBase64File === 'function') {
                try {
                    const base64 = arrayBufferToBase64(buffer);
                    window.AndroidApp.saveBase64File(base64, filename, mimeType || 'application/zip');
                    return;
                } catch(e) { console.error('Android bridge buffer save failed', e); }
            }
            const blob = new Blob([buffer], { type: mimeType }), url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
        }

        function renderGreetingsList(item) {
            const container = document.getElementById('overviewGreetingsList'); container.innerHTML = '';
            const allGreetings = []; if (item.firstMes) allGreetings.push({ title: '主开场白', text: item.firstMes });
            const alts = item.alternateGreetings || item.cardData?.data?.alternate_greetings || []; alts.forEach((g, idx) => allGreetings.push({ title: `备用开场白 #${idx + 1}`, text: g }));
            if (allGreetings.length === 0) { container.innerHTML = `<div class="text-xs text-[#a38b8d] py-8 text-center">无开场白设定</div>`; return; }
            allGreetings.forEach((gItem, index) => {
                const box = document.createElement('div'); box.className = "wb-card-container space-y-2";
                box.innerHTML = `<div class="flex items-center justify-between pb-2 border-b border-[#f5e1e3]"><button onclick="toggleGreetingItemCollapse(${index})" class="text-xs font-bold text-[#b86b7a] flex items-center gap-1.5"><i data-lucide="chevron-down" id="greeting-chevron-${index}" class="w-3.5 h-3.5 text-[#d88c9a] transition-transform duration-200"></i><span>${gItem.title}</span></button><button onclick="copyGreetingText(${index})" class="text-xs text-[#a38b8d] hover:text-[#d88c9a] flex items-center gap-1"><i data-lucide="copy" class="w-3.5 h-3.5"></i> 复制</button></div><div id="greeting-body-${index}" class="hidden"><div id="greeting-text-${index}" class="text-xs text-[#5c494a] leading-relaxed font-sans whitespace-pre-wrap pt-1">${gItem.text}</div></div>`;
                container.appendChild(box);
            });
            lucide.createIcons();
        }

        function toggleGreetingItemCollapse(index) {
            const body = document.getElementById(`greeting-body-${index}`), chevron = document.getElementById(`greeting-chevron-${index}`);
            if (body.classList.contains('hidden')) { body.classList.remove('hidden'); chevron.classList.add('rotate-180'); }
            else { body.classList.add('hidden'); chevron.classList.remove('rotate-180'); }
        }

        function copyGreetingText(index) {
            const el = document.getElementById(`greeting-text-${index}`);
            if (el) { navigator.clipboard.writeText(el.innerText); showToast('📋', '开场白已复制！'); }
        }

        function closeDetailView() {
            document.getElementById('pageTitle').innerText = '资源合集'; document.getElementById('detailView').classList.add('hidden'); document.getElementById('detailView').classList.remove('flex'); document.getElementById('listView').classList.remove('hidden'); currentItem = null;
        }

        function switchDetailTab(subtab) {
            document.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
            const activePill = document.getElementById(`detail-tab-${subtab}`); if (activePill) activePill.classList.add('active');
            ['overview', 'greetings', 'worldbook', 'regex', 'doc-full', 'emoji-grid', 'theme-standalone'].forEach(st => {
                const el = document.getElementById(`subview-${st}`);
                if (st === subtab) el.classList.remove('hidden'); else el.classList.add('hidden');
            });
        }

        let selectedWbEntryIndexes = new Set();

        function selectAllWbEntries(select) {
            const wb = currentItem?.worldbook || currentItem?.cardData?.data?.character_book || currentItem?.cardData?.character_book || currentItem?.cardData;
            const entries = wb?.entries || (Array.isArray(wb) ? wb : []);
            if (select) {
                entries.forEach((_, idx) => selectedWbEntryIndexes.add(idx));
            } else {
                selectedWbEntryIndexes.clear();
            }
            renderWorldbookEntries();
        }

        function toggleWbEntrySelection(index, e) {
            e.stopPropagation();
            if (selectedWbEntryIndexes.has(index)) selectedWbEntryIndexes.delete(index);
            else selectedWbEntryIndexes.add(index);
        }

        function exportSelectedWbJSON() {
            if (!currentItem) return;
            const wb = currentItem?.worldbook || currentItem?.cardData?.data?.character_book || currentItem?.cardData?.character_book || currentItem?.cardData;
            const entries = wb?.entries || (Array.isArray(wb) ? wb : []);
            const selectedEntries = entries.filter((_, idx) => selectedWbEntryIndexes.has(idx));
            
            if (selectedEntries.length === 0) {
                showToast('ℹ️', '请先勾选需要导出的世界书词条！');
                return;
            }

            const exportedWb = {
                name: `${currentItem.name}_世界书`,
                description: `从角色卡 ${currentItem.name} 导出的世界书`,
                entries: selectedEntries
            };

            downloadText(JSON.stringify(exportedWb, null, 2), `${currentItem.name}_选中世界书.json`, 'application/json');
            showToast('📚', `已成功导出包含 ${selectedEntries.length} 个词条的世界书 JSON！`);
        }

        function exportCardWorldbookFull(item) {
            const wb = item?.worldbook || item?.cardData?.data?.character_book || item?.cardData?.character_book || item?.cardData;
            const entries = wb?.entries || (Array.isArray(wb) ? wb : []);
            if (!entries || entries.length === 0) {
                showToast('ℹ️', '该角色卡暂无关联世界书内容');
                return;
            }
            const exportedWb = {
                name: `${item.name}_完整世界书`,
                description: `从角色卡 ${item.name} 导出的完整世界书`,
                entries: entries
            };
            downloadText(JSON.stringify(exportedWb, null, 2), `${item.name}_完整世界书.json`, 'application/json');
            showToast('📚', `已成功导出完整世界书 JSON（共 ${entries.length} 条）！`);
        }

        function renderWorldbookEntries() {
            const container = document.getElementById('wbEntriesList'); container.innerHTML = '';
            let wb = currentItem?.worldbook || currentItem?.cardData?.data?.character_book || currentItem?.cardData?.character_book || currentItem?.cardData;
            
            // Normalize entries if stored as Object dictionary
            let entries = [];
            if (wb) {
                if (Array.isArray(wb.entries)) entries = wb.entries;
                else if (typeof wb.entries === 'object') entries = Object.values(wb.entries);
                else if (Array.isArray(wb)) entries = wb;
            }

            if (!entries || entries.length === 0) { container.innerHTML = `<div class="py-8 text-center text-[#a38b8d] text-xs">暂无世界书词条</div>`; return; }
            
            // Default select all entries on open
            if (selectedWbEntryIndexes.size === 0) {
                entries.forEach((_, idx) => selectedWbEntryIndexes.add(idx));
            }

            entries.forEach((entry, index) => {
                const isSelected = selectedWbEntryIndexes.has(index);
                const keysText = Array.isArray(entry.keys) ? entry.keys.join(', ') : (entry.keys || '无关键词'), commentTitle = entry.comment || keysText || `词条 #${index + 1}`;
                const card = document.createElement('div'); card.className = "wb-card-container space-y-3";
                card.innerHTML = `<div class="flex items-center justify-between pb-2 border-b border-[#f5e1e3]"><div class="flex items-center gap-2 min-w-0 flex-1"><i data-lucide="grip-vertical" class="w-4 h-4 text-[#e2c2c6] shrink-0"></i><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleWbEntrySelection(${index}, event)" class="w-4 h-4 text-[#d88c9a] rounded border-[#f2e3e3] cursor-pointer"><button onclick="toggleWbEntryCollapse(${index})" class="text-xs font-bold text-[#4a3e3d] flex items-center gap-1 truncate"><i data-lucide="chevron-down" id="wb-chevron-${index}" class="w-3.5 h-3.5 text-[#d88c9a] shrink-0 transition-transform duration-200"></i><span class="truncate">词条 · ${commentTitle}</span></button></div><div class="flex items-center gap-1.5 shrink-0"><span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${entry.constant ? 'bg-[#e8f0f8] text-[#688ca6]' : 'bg-[#f5e8e8] text-[#8c7173]'}">${entry.constant ? '🔵 始终' : '⚪ 条件'}</span><button onclick="copyEntryContent(${index})" class="p-1 rounded text-[#a38b8d] hover:text-[#d88c9a]"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button><button onclick="deleteEntry(${index})" class="p-1 rounded text-[#a38b8d] hover:text-rose-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></div></div><div id="wb-body-${index}" class="space-y-3 hidden"><div><label class="block text-[11px] font-semibold text-[#8c7173] mb-1">标题 / 注释</label><input type="text" value="${commentTitle}" onchange="updateEntryField(${index}, 'comment', this.value)" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-xl px-3 py-1.5 text-xs font-medium text-[#5c494a]"></div><div><label class="block text-[11px] font-semibold text-[#8c7173] mb-1">内容</label><textarea onchange="updateEntryField(${index}, 'content', this.value)" class="w-full h-36 bg-[#faf6f0] border border-[#f2e3e3] rounded-xl p-2.5 text-xs font-mono text-[#5c494a] custom-scrollbar">${entry.content || ''}</textarea></div></div>`;
                // 如果处于批量多选模式，在卡片右上角统一注入精致勾选红点圆框
                if (isMultiSelectMode) {
                    const checkBadge = document.createElement('div');
                    checkBadge.className = `selection-badge absolute top-2 right-2 z-30 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition ${isSelected ? 'bg-[#d88c9a] text-white scale-110' : 'bg-white/90 border border-gray-300 text-transparent'}`;
                    checkBadge.innerHTML = '✓';
                    checkBadge.onclick = (e) => toggleSelectAsset(item.id, e);
                    card.appendChild(checkBadge);
                }

                container.appendChild(card);
            });
            lucide.createIcons();
        }

        function toggleWbEntryCollapse(index) {
            const body = document.getElementById(`wb-body-${index}`), chevron = document.getElementById(`wb-chevron-${index}`);
            if (body.classList.contains('hidden')) { body.classList.remove('hidden'); chevron.classList.add('rotate-180'); }
            else { body.classList.add('hidden'); chevron.classList.remove('rotate-180'); }
        }

        async function updateEntryField(index, field, value) {
            const wb = currentItem.worldbook || currentItem.cardData, entries = wb?.entries || (Array.isArray(wb) ? wb : []);
            if (entries[index]) { entries[index][field] = value; await saveAsset(currentItem); }
        }

        function renderRegexEntries() {
            const container = document.getElementById('regexEntriesList'); container.innerHTML = '';
            const regexList = currentItem?.regexScripts || currentItem?.cardData?.data?.extensions?.regex_scripts || currentItem?.cardData;
            const scripts = Array.isArray(regexList) ? regexList : [];
            if (!scripts || scripts.length === 0) { container.innerHTML = `<div class="py-8 text-center text-[#a38b8d] text-xs">暂无正则替换规则</div>`; return; }
            scripts.forEach((script, idx) => {
                const card = document.createElement('div'); card.className = "wb-card-container space-y-3";
                card.innerHTML = `<div class="flex items-center justify-between pb-2 border-b border-[#f5e1e3]"><div class="font-bold text-xs text-[#4a3e3d] flex items-center gap-1.5"><i data-lucide="code" class="w-3.5 h-3.5 text-[#d88c9a]"></i><span>${script.scriptName || `正则规则 #${idx + 1}`}</span></div></div><div><div class="bg-[#faf6f0] border border-[#f2e3e3] rounded-xl p-2.5 text-xs font-mono text-[#b86b7a] break-all">${script.findRegex || ''}</div></div>`;
                // 如果处于批量多选模式，在卡片右上角统一注入精致勾选红点圆框
                if (isMultiSelectMode) {
                    const checkBadge = document.createElement('div');
                    checkBadge.className = `selection-badge absolute top-2 right-2 z-30 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition ${isSelected ? 'bg-[#d88c9a] text-white scale-110' : 'bg-white/90 border border-gray-300 text-transparent'}`;
                    checkBadge.innerHTML = '✓';
                    checkBadge.onclick = (e) => toggleSelectAsset(item.id, e);
                    card.appendChild(checkBadge);
                }

                container.appendChild(card);
            });
            lucide.createIcons();
        }

        function copyEntryContent(index) {
            const wb = currentItem.worldbook || currentItem.cardData, entries = wb?.entries || (Array.isArray(wb) ? wb : []);
            if (entries[index]) { navigator.clipboard.writeText(entries[index].content || ''); showToast('📋', '词条内容已复制！'); }
        }

        async function deleteCurrentItem() {
            if (!currentItem) return;
            if (confirm(`确定要删除“${currentItem.name}”吗？`)) {
                const idToDelete = currentItem.id;
                const tx = db.transaction('assets', 'readwrite'); 
                tx.objectStore('assets').delete(idToDelete);
                tx.oncomplete = async () => { 
                    allAssetsCache = null; // Clear memory cache immediately!
                    if (supabaseClient) { 
                        try { await supabaseClient.from('tavern_assets').delete().eq('id', idToDelete); } catch(e){} 
                    } 
                    closeDetailView(); 
                    updateBadges(); 
                    renderItems(); 
                    showToast('🗑️', '已成功删除资产！'); 
                };
            }
        }

        function copyText(id) { const text = document.getElementById(id)?.innerText; if (text) { navigator.clipboard.writeText(text); showToast('📋', '文本已复制！'); } }

        // Register PWA Service Worker (不主动卸载，保持 PWA 可安装)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // 使用相对路径注册，兼容 GitHub Pages 子路径部署 (如 /TavernCardHub-test/)
                navigator.serviceWorker.register('./sw.js').then(() => {
                    console.log('Service Worker Registered Successfully');
                }).catch(err => {
                    console.log('Service Worker Registration Failed: ', err);
                });
            });
        }

function openFolder(fName) {
    currentFolderOpened = fName;
    renderItems();
}
function closeFolder() {
    currentFolderOpened = null;
    renderItems();
}

// ============================================================
// 全页面长按批量选择、圆框勾选、全选、批量移动分类与批量删除
// ============================================================

let isMultiSelectMode = false;
let selectedAssetIds = new Set();
let longPressTimer = null;

function toggleMultiSelectMode(enable = null) {
    if (enable === null) isMultiSelectMode = !isMultiSelectMode;
    else isMultiSelectMode = enable;

    if (!isMultiSelectMode) {
        selectedAssetIds.clear();
    }
    renderBatchActionBar();
    renderItems();
}

function toggleSelectAsset(id, e) {
    if (e) e.stopPropagation();
    const isSelected = selectedAssetIds.has(id);
    if (isSelected) {
        selectedAssetIds.delete(id);
    } else {
        selectedAssetIds.add(id);
    }
    
    // 更新底栏计数
    renderBatchActionBar();
    
    // 局部静默更新当前卡片，绝不重新渲染整个页面（防闪烁卡顿）
    const card = document.querySelector(`[data-asset-id="${id}"]`);
    if (card) {
        const checkBadge = card.querySelector('.selection-badge');
        const nowSelected = selectedAssetIds.has(id);
        
        if (nowSelected) {
            card.classList.add('ring-2', 'ring-[#d88c9a]', 'bg-[#fdf6f7]');
            if (checkBadge) {
                checkBadge.className = 'selection-badge absolute top-2 right-2 z-30 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition bg-[#d88c9a] text-white scale-110';
            }
        } else {
            card.classList.remove('ring-2', 'ring-[#d88c9a]', 'bg-[#fdf6f7]');
            if (checkBadge) {
                checkBadge.className = 'selection-badge absolute top-2 right-2 z-30 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs transition bg-white/90 border border-gray-300 text-transparent';
            }
        }
    }
}

async function selectAllCurrentAssets() {
    if (!currentFolderOpened) {
        showToast('⚠️', '请先点进具体的小分类文件夹，再全选勾选！');
        return;
    }
    const assets = await getAllAssets();
    const categoryAssets = assets.filter(a => a.category === categoryStorageKey(currentTab));

    let customFolders = [];
    try {
        const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_' + currentTab);
        if (saved) customFolders = JSON.parse(saved);
    } catch(e){}
    if (!Array.isArray(customFolders)) customFolders = [];

    // 精确锁定：只获取当前点进来的这个小文件夹内部的文件！
    const curFolderAssets = categoryAssets.filter(a => {
        const sub = a.subCategory || '未分类';
        if (currentFolderOpened === '未分类') {
            return sub === '未分类' || !sub || !customFolders.includes(sub);
        } else {
            return sub === currentFolderOpened;
        }
    });

    const curIds = curFolderAssets.map(a => a.id);
    if (curIds.length === 0) return;

    const allSelected = curIds.every(id => selectedAssetIds.has(id));

    if (allSelected) {
        curIds.forEach(id => selectedAssetIds.delete(id));
    } else {
        curIds.forEach(id => selectedAssetIds.add(id));
    }
    renderBatchActionBar();
    renderItems();
}

async function batchDeleteSelectedAssets() {
    if (selectedAssetIds.size === 0) return;
    if (!confirm(`确定要批量删除选中的 ${selectedAssetIds.size} 项资产吗？此操作无法撤销。`)) return;

    try {
        showToast('⌛', '正在批量删除...');
        for (const id of selectedAssetIds) {
            await deleteAssetFromDB(id);
        }
        showToast('🎉', `已成功删除 ${selectedAssetIds.size} 项资产`);
        selectedAssetIds.clear();
        isMultiSelectMode = false;
        renderBatchActionBar();
        allAssetsCache = null;
        updateBadges();
        await renderItems();
    } catch(err) {
        console.error('Batch delete failed', err);
        showToast('❌', '批量删除失败');
    }
}

async function batchMoveSelectedCategory() {
    if (selectedAssetIds.size === 0) return;
    const targetFolder = prompt('请输入要批量移动到的目标分类/文件夹名称：', currentFolderOpened || '');
    if (targetFolder === null) return;

    const folderName = targetFolder.trim();
    try {
        showToast('⌛', '正在批量移动分类...');
        const allAssets = await getAllAssets();
        for (const id of selectedAssetIds) {
            const item = allAssets.find(a => a.id === id);
            if (item) {
                item.subCategory = folderName;
                await saveAsset(item);
            }
        }
        showToast('📁', `已将 ${selectedAssetIds.size} 项资产移动至 “${folderName || '未分类'}”`);
        selectedAssetIds.clear();
        isMultiSelectMode = false;
        renderBatchActionBar();
        allAssetsCache = null;
        updateBadges();
        await renderItems();
    } catch(err) {
        console.error('Batch move failed', err);
        showToast('❌', '批量移动失败');
    }
}

function renderBatchActionBar() {
    let bar = document.getElementById('batchActionBar');
    if (!isMultiSelectMode) {
        if (bar) bar.classList.add('hidden');
        return;
    }

    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'batchActionBar';
        bar.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#4a3e3d] text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-[#6b5857] text-xs animate-in slide-in-from-bottom duration-200 max-w-[92vw] overflow-x-auto';
        document.body.appendChild(bar);
    }

    bar.innerHTML = `
        <span class="font-bold text-[#f2e3e3] whitespace-nowrap">已选 ${selectedAssetIds.size} 项</span>
        <button onclick="selectAllCurrentAssets()" class="px-2.5 py-1 rounded-full bg-[#6b5857] hover:bg-[#856e6c] transition whitespace-nowrap">🔳 全选</button>
        <button onclick="batchMoveSelectedCategory()" class="px-2.5 py-1 rounded-full bg-[#d88c9a] font-bold hover:bg-[#c97b8b] transition whitespace-nowrap">📁 移动分类</button>
        <button onclick="batchDeleteSelectedAssets()" class="px-2.5 py-1 rounded-full bg-rose-500 font-bold hover:bg-rose-600 transition whitespace-nowrap">🗑️ 批量删除</button>
        <button onclick="toggleMultiSelectMode(false)" class="text-gray-300 hover:text-white font-bold ml-1 text-base">&times;</button>
    `;
    bar.classList.remove('hidden');
}

function bindLongPressEvent(element, assetId) {
    element.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            if (!isMultiSelectMode) {
                isMultiSelectMode = true;
                selectedAssetIds.add(assetId);
                renderBatchActionBar();
                renderItems();
                if (navigator.vibrate) navigator.vibrate(40);
                showToast('☑️', '进入长按多选模式');
            }
        }, 500);
    }, { passive: true });

    element.addEventListener('touchend', () => {
        if (longPressTimer) clearTimeout(longPressTimer);
    });

    element.addEventListener('touchmove', () => {
        if (longPressTimer) clearTimeout(longPressTimer);
    });
}

function deleteAssetFromDB(id) {
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction('assets', 'readwrite');
            const store = tx.objectStore('assets');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        } catch(e) { reject(e); }
    });
}

window.toggleMultiSelectMode = toggleMultiSelectMode;
window.toggleSelectAsset = toggleSelectAsset;
window.selectAllCurrentAssets = selectAllCurrentAssets;
window.batchDeleteSelectedAssets = batchDeleteSelectedAssets;
window.batchMoveSelectedCategory = batchMoveSelectedCategory;

// ============================================================
// 文本文档 (Docs) 抽屉式复制粘贴导入面板 (仅点进分类后显示)
// ============================================================

function renderDocDrawerImportUI() {
    let container = document.getElementById('docDrawerContainer');
    if (container) container.remove();
}

function toggleDocImportDrawer(show = null) {
    // 兼容原有的代码逻辑为空函数，避免之前旧代码调用报错。
}

async function submitSavePastedDoc() {
    const titleInput = document.getElementById('docImportTitleInput');
    const contentInput = document.getElementById('docImportTextContent');

    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!content) {
        showToast('⚠️', '请粘贴或输入文档内容！');
        return;
    }

    const docName = title || `复制文档_${new Date().toLocaleDateString()}`;
    const assetId = 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    try {
        showToast('⌛', '正在保存...');
        const saveCategory = (currentTab === 'regex') ? 'regex' : 'docs';
        await saveAsset({
            id: assetId,
            category: saveCategory,
            name: docName,
            fileType: 'txt',
            rawText: content,
            subCategory: currentFolderOpened || '',
            createdAt: Date.now()
        });

        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        toggleDocImportDrawer(false);

        allAssetsCache = null;
        updateBadges();
        await renderItems();
        showToast('🎉', saveCategory === 'regex' ? '已保存至当前番外/小剧场文件夹！' : '已保存至当前文本文档文件夹！');
    } catch (e) {
        console.error(e);
        showToast('❌', '保存失败');
    }
}

window.toggleDocImportDrawer = toggleDocImportDrawer;
window.submitSavePastedDoc = submitSavePastedDoc;


        async function syncApiKeysToCloudSilent(keys = null) {
            if (!supabaseClient) return;
            try {
                const apiKeys = keys || ((typeof getStoredApiKeys === 'function') ? getStoredApiKeys() : []);
                const apiCategories = (typeof getStoredCustomCategories === 'function') ? getStoredCustomCategories() : [];
                const payload = { keys: apiKeys, categories: apiCategories };
                await supabaseClient.from('tavern_assets').upsert({
                    id: '___API_KEYS_CONFIG___',
                    category: 'apikeys',
                    name: 'API 密钥与分类配置备份',
                    file_type: 'json',
                    card_data: payload,
                    created_at: Date.now()
                });
            } catch(e) { console.error('Sync API keys to cloud failed', e); }
        }


// 彻底删除一整个分类文件夹及其下属所有资产
async function deleteEntireFolder(folderName, itemCount) {
    if (folderName === '未分类') {
        showToast('⚠️', '“未分类”为系统默认分类，无法整体删除！');
        return;
    }
    const confirmMsg = itemCount > 0 
        ? `⚠️ 确定要彻底删除分类文件夹“${folderName}”吗？\n这将同时清空该分类下的 ${itemCount} 项所有资产，且不可恢复！`
        : `⚠️ 确定要删除空分类文件夹“${folderName}”吗？`;
    
    if (!confirm(confirmMsg)) return;

    showToast('🗑️', `正在清理分类“${folderName}”下的所有资产...`);
    try {
        // 1. 删除 IndexedDB assets 表中属于该 subCategory 的资产
        const all = await getAllAssets();
        const toDelete = all.filter(a => a.category === currentTab && a.subCategory === folderName);
        for (let item of toDelete) {
            const tx = db.transaction('assets', 'readwrite');
            tx.objectStore('assets').delete(item.id);
            // 如果开启了 Supabase 云端，静默清理云端对应行
            if (supabaseClient) {
                try { await supabaseClient.from('tavern_assets').delete().eq('id', item.id); } catch(e){}
            }
        }

        // 2. 从本地保存的自定义文件夹列表中移除该文件夹名
        const key = 'TAVERN_CUSTOM_FOLDERS_' + currentTab;
        let customFolders = [];
        try {
            const saved = localStorage.getItem(key);
            if (saved) customFolders = JSON.parse(saved);
        } catch(e){}
        customFolders = customFolders.filter(f => f !== folderName);
        localStorage.setItem(key, JSON.stringify(customFolders));

        allAssetsCache = null;
        if (typeof updateBadges === 'function') updateBadges();
        await renderItems();
        showToast('🎉', `分类文件夹“${folderName}”已成功彻底删除！`);
    } catch(err) {
        console.error('Delete folder failed', err);
        showToast('❌', `删除分类失败: ${err.message||err}`);
    }
}
window.deleteEntireFolder = deleteEntireFolder;


        // ============================================================
        // 🎨 美化 (Themes) 快捷代码粘贴保存 & ZIP / 文件导入引擎
        // ============================================================
        async function savePastedThemeCode() {
            const titleInput = document.getElementById('themeTitleInput');
            const codeInput = document.getElementById('themeCodeInput');
            const title = titleInput?.value.trim() || `美化配置_${Date.now()}`;
            const code = codeInput?.value.trim() || '';

            if (!code) {
                showToast('⚠️', '请先粘贴或输入 CSS/JSON 美化代码！');
                return;
            }

            try {
                const isJson = code.startsWith('{') || code.startsWith('[');
                const fileType = isJson ? 'json' : 'css';
                const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

                await saveAsset({
                    id,
                    category: 'themes',
                    name: title,
                    fileType: fileType,
                    rawText: code,
                    subCategory: currentFolderOpened || '',
                    createdAt: Date.now()
                });

                if (titleInput) titleInput.value = '';
                if (codeInput) codeInput.value = '';

                allAssetsCache = null;
                updateBadges();
                await renderItems();
                showToast('🎉', `美化代码 “${title}” 已成功保存！`);
            } catch (err) {
                console.error('Save theme code failed:', err);
                showToast('❌', `保存美化代码失败：${err.message || err}`);
            }
        }

        function triggerThemeFileInput() {
            const fileEl = document.getElementById('themeFileInput');
            if (fileEl) fileEl.click();
        }

        async function handleThemeFilesImport(e) {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            showToast('⌛', `正在导入 ${files.length} 个美化/文档文件...`);
            try {
                for (const file of files) {
                    await processFile(file, 'themes');
                }
                e.target.value = '';
                allAssetsCache = null;
                updateBadges();
                await renderItems();
                showToast('🎉', `成功导入 ${files.length} 个美化文件！`);
            } catch (err) {
                console.error('Theme files import failed:', err);
                showToast('❌', `美化文件导入失败：${err.message || err}`);
            }
        }

        window.savePastedThemeCode = savePastedThemeCode;
        window.triggerThemeFileInput = triggerThemeFileInput;
        window.handleThemeFilesImport = handleThemeFilesImport;


        // 清洁后缀导出引擎，彻底解决 .json.txt 误拼接 Bug
        function getCleanAssetFilename(item) {
            if (!item) return 'theme_file.json';
            const ext = item.fileType || 'json';
            const cleanName = item.name.replace(/\.(json|css|txt|zip|docx|png)$/i, '').trim() || '美化资产';
            return `${cleanName}.${ext}`;
        }

        function downloadThemeBufferAsset() {
            if (!currentItem) return;
            const filename = getCleanAssetFilename(currentItem);
            const mime = currentItem.fileType === 'zip' ? 'application/zip' : 'application/octet-stream';
            downloadBuffer(currentItem.rawBuffer, filename, mime);
        }

        function downloadThemeTextAsset() {
            if (!currentItem) return;
            const filename = getCleanAssetFilename(currentItem);
            const mime = currentItem.fileType === 'json' ? 'application/json' : 'text/css';
            downloadText(currentItem.rawText || '', filename, mime);
        }

        window.downloadThemeBufferAsset = downloadThemeBufferAsset;
        window.downloadThemeTextAsset = downloadThemeTextAsset;
        window.getCleanAssetFilename = getCleanAssetFilename;

window.getCleanAssetFilename = function(item) {
    if (!item) return 'theme_file.json';
    const ext = item.fileType || 'json';
    const cleanName = item.name.replace(/\.(json|css|txt|zip|docx|png)$/i, '').trim() || '美化资产';
    return `${cleanName}.${ext}`;
};

window.downloadThemeBufferAsset = function() {
    if (!currentItem) return;
    const filename = window.getCleanAssetFilename(currentItem);
    const mime = currentItem.fileType === 'zip' ? 'application/zip' : 'application/octet-stream';
    downloadBuffer(currentItem.rawBuffer, filename, mime);
};

window.downloadThemeTextAsset = function() {
    if (!currentItem) return;
    const filename = window.getCleanAssetFilename(currentItem);
    const mime = currentItem.fileType === 'json' ? 'application/json' : 'text/css';
    downloadText(currentItem.rawText || '', filename, mime);
};


        function applyThemeCodeAsGlobalCss() {
            if (!currentItem) return;
            const cssText = currentItem.rawText || '';
            if (!cssText) {
                showToast('⚠️', '该资产暂无可应用的 CSS 代码！');
                return;
            }
            localStorage.setItem('TAVERN_CUSTOM_CSS', cssText);
            if (typeof initCustomCss === 'function') {
                initCustomCss();
            } else {
                let styleTag = document.getElementById('appCustomUserCss');
                if (!styleTag) {
                    styleTag = document.createElement('style');
                    styleTag.id = 'appCustomUserCss';
                    document.head.appendChild(styleTag);
                }
                styleTag.textContent = cssText;
            }
            showToast('🎨', `已成功将 “${currentItem.name}” 应用为当前系统主题外观！`);
        }

        window.applyThemeCodeAsGlobalCss = applyThemeCodeAsGlobalCss;


/* ------------------------------------------------------------
   📁 自定义分类与 🔗 网址链接逻辑
   ------------------------------------------------------------ */
let customCategoryList = JSON.parse(localStorage.getItem('RESOURCE_CUSTOM_CATEGORIES') || '[]');
customCategoryList = customCategoryList.map(x => typeof x === 'string' ? ({id:'custom:'+encodeURIComponent(x),name:x}) : x);

function saveCustomCategoryList() {
    localStorage.setItem('RESOURCE_CUSTOM_CATEGORIES', JSON.stringify(customCategoryList));
    renderCustomCategoriesMenu();
}

function promptCreateCustomCategory() {
    const catName = prompt('请输入新自定义分类名称：');
    if (catName && catName.trim()) {
        const clean = catName.trim();
        if (!customCategoryList.some(x => x.name === clean)) {
            customCategoryList.push({id:'custom:'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:clean});
            saveCustomCategoryList();
            showToast('📁', `已成功创建新自定义分类 “${clean}”！`);
        } else {
            showToast('⚠️', '该分类名称已存在！');
        }
    }
}

function toggleCustomCategoriesCollapse() {
    const body = document.getElementById('customCategoriesBody');
    const chevron = document.getElementById('customCatChevron');
    if (body) {
        body.classList.toggle('hidden');
        if (chevron) chevron.classList.toggle('rotate-180');
    }
}

function renderCustomCategoriesMenu() {
    const container = document.getElementById('customCategoriesList');
    if (!container) return;
    container.innerHTML = '';
    if (customCategoryList.length === 0) {
        container.innerHTML = `<div class="text-[10px] text-[#94a3b8] py-1 text-center">暂无自定义分类，点击右上角添加</div>`;
        return;
    }
    customCategoryList.forEach((cat, idx) => {
        const catName=cat.name;
        const catBtn = document.createElement('div');
        catBtn.className = "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#334155] hover:bg-[#e2e8f0] transition group cursor-pointer";
        catBtn.onclick = (e) => {
            // 自定义分类必须走完整 Tab 切换，统一清理美化、图库、文档等旧面板
            switchTab(cat.id, e);
        };
        catBtn.innerHTML = `
            <div class="flex items-center gap-1.5 truncate">
                <i data-lucide="folder" class="w-3.5 h-3.5 text-[#0284c7]"></i>
                <span class="truncate">${catName}</span>
            </div>
            <button onclick="deleteCustomCategory(${idx}, event)" class="opacity-0 group-hover:opacity-100 p-0.5 text-[#94a3b8] hover:text-[#ef4444] transition">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
        `;
        container.appendChild(catBtn);
    });
    lucide.createIcons();
}

function deleteCustomCategory(idx, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const name = customCategoryList[idx]?.name || customCategoryList[idx];
    if (confirm(`确定要删除自定义分类“${name}”吗？`)) {
        customCategoryList.splice(idx, 1);
        saveCustomCategoryList();
        showToast('🗑️', `已删除分类 “${name}”`);
    }
}

async function saveNewLinkAsset() {
    const titleInput = document.getElementById('linkTitleInput');
    const urlInput = document.getElementById('linkUrlInput');
    const catInput = document.getElementById('linkCategoryInput');

    const title = titleInput ? titleInput.value.trim() : '';
    let url = urlInput ? urlInput.value.trim() : '';
    const subCat = catInput ? catInput.value.trim() : '';

    if (!title) { showToast('⚠️', '请输入网址名称！'); return; }
    if (!url) { showToast('⚠️', '请输入 URL 网址！'); return; }

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const asset = {
        id,
        category: 'links',
        name: title,
        url: url,
        fileType: 'link',
        subCategory: subCat,
        rawText: `${title}\n${url}`,
        createdAt: Date.now()
    };

    
    if (subCat) {
        let customFolders = [];
        try {
            const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_links');
            if (saved) customFolders = JSON.parse(saved);
        } catch(e){}
        if (!customFolders.includes(subCat)) {
            customFolders.unshift(subCat);
            localStorage.setItem('TAVERN_CUSTOM_FOLDERS_links', JSON.stringify(customFolders));
        }
    }

    await saveAsset(asset);
    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';
    if (catInput) catInput.value = '';

    updateBadges();
    renderItems();
    showToast('🔗', `已成功添加网址链接 “${title}”！`);
}

function openLinkInDefaultBrowser(url) {
    if (!url) return;
    if (window.AndroidApp && typeof window.AndroidApp.openExternalBrowser === 'function') {
        try {
            window.AndroidApp.openExternalBrowser(url);
            return;
        } catch(e) { console.error('Android bridge openExternalBrowser failed', e); }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

async function deleteSingleAsset(id, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (confirm('确定要删除这项资产吗？')) {
        const tx = db.transaction('assets', 'readwrite');
        tx.objectStore('assets').delete(id);
        tx.oncomplete = async () => {
            allAssetsCache = null;
            if (supabaseClient) {
                try { await supabaseClient.from('tavern_assets').delete().eq('id', id); } catch(err){}
            }
            updateBadges();
            renderItems();
            showToast('🗑️', '已删除');
        };
    }
}

window.toggleCustomCategoriesCollapse = toggleCustomCategoriesCollapse;
window.promptCreateCustomCategory = promptCreateCustomCategory;
window.renderCustomCategoriesMenu = renderCustomCategoriesMenu;
window.deleteCustomCategory = deleteCustomCategory;
window.saveNewLinkAsset = saveNewLinkAsset;
window.openLinkInDefaultBrowser = openLinkInDefaultBrowser;
window.deleteSingleAsset = deleteSingleAsset;

// 初始化自定义分类列表
document.addEventListener('DOMContentLoaded', () => {
    renderCustomCategoriesMenu();
    setTimeout(() => { if (typeof ensureCategoryImportUI === 'function') ensureCategoryImportUI(); }, 0);
});

async function pasteLinkFromClipboard(){ try { const t=await navigator.clipboard.readText(); const el=document.getElementById('linkUrlInput'); if(el) el.value=t.trim(); } catch(e){ showToast('⚠️','请允许读取剪贴板'); } }
window.pasteLinkFromClipboard=pasteLinkFromClipboard;


function populateLinkCategorySelect() {
    const sel = document.getElementById('linkCategorySelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">一键选择已有分类...</option>';
    let customFolders = [];
    try {
        const saved = localStorage.getItem('TAVERN_CUSTOM_FOLDERS_links');
        if (saved) customFolders = JSON.parse(saved);
    } catch(e){}
    if (Array.isArray(customFolders)) {
        customFolders.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.innerText = f;
            sel.appendChild(opt);
        });
    }
}
window.populateLinkCategorySelect = populateLinkCategorySelect;

function toggleLinksPanel(){ const b=document.getElementById('linksPanelBody'); const c=document.getElementById('linksPanelChevron'); if(b){ b.classList.toggle('hidden'); populateLinkCategorySelect(); if(c)c.textContent=b.classList.contains('hidden')?'⌄':'⌃'; } }
window.toggleLinksPanel=toggleLinksPanel;

function toggleThemeBuilderPanel(){ const b=document.getElementById('themeBuilderBody'); const c=document.getElementById('themeBuilderChevron'); if(b){ b.classList.toggle('hidden'); populateLinkCategorySelect(); if(c)c.textContent=b.classList.contains('hidden')?'⌄':'⌃'; } }
window.toggleThemeBuilderPanel=toggleThemeBuilderPanel;


// 全局智能直连导入器
function triggerGlobalDirectImport() {
    if (currentTab === 'links') {
        const linkInput = document.getElementById('linkUrlInput');
        if (linkInput) {
            linkInput.focus();
            linkInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showToast('🔗', '请在上方粘贴框输入或粘贴网址链接');
        return;
    }
    if (currentTab === 'gallery') {
        let gInput = document.getElementById('galleryDirectFileInput');
        if (!gInput) {
            gInput = document.createElement('input');
            gInput.type = 'file';
            gInput.id = 'galleryDirectFileInput';
            gInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
            gInput.multiple = true;
            gInput.className = 'hidden';
            document.body.appendChild(gInput);
            gInput.onchange = async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                try {
                    showToast('⌛', `正在上传 ${files.length} 张图片...`);
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const name = file.name.replace(/\.[^/.]+$/, '') || `图片_${Date.now()}`;
                        await saveAsset({
                            id: 'asset_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 7),
                            category: 'gallery',
                            name: name,
                            fileType: file.type || 'image/png',
                            cover: new Blob([file], { type: file.type || 'image/png' }),
                            subCategory: currentFolderOpened || '',
                            createdAt: Date.now() + i
                        });
                    }
                    allAssetsCache = null;
                    updateBadges();
                    await renderItems();
                    showToast('🎉', `成功上传 ${files.length} 张图片！`);
                } catch(err) {
                    showToast('❌', '图片上传失败');
                } finally {
                    e.target.value = '';
                }
            };
        }
        gInput.click();
        return;
    }
    if (currentTab === 'themes') {
        const t = document.getElementById('themeFileInput');
        if (t) { t.click(); return; }
    }
    let input = document.getElementById('globalDirectFileInput');
    if (input) input.remove();
    if (true) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'globalDirectFileInput';
        input.multiple = true;
        input.accept = '*/*';
        input.className = 'hidden';
        document.body.appendChild(input);
        input.onchange = async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            try {
                showToast('⌛', `正在导入 ${files.length} 个文件...`);
                for (const file of files) await processFile(file, currentTab);
                allAssetsCache = null;
                updateBadges();
                await renderItems();
                showToast('🎉', `成功存入当前分类！`);
            } catch(err) {
                showToast('❌', '文件导入失败');
            } finally {
                e.target.value = '';
            }
        };
    }
    input.click();
}
window.triggerGlobalDirectImport = triggerGlobalDirectImport;

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
            customFolders.unshift(cleanName);
            localStorage.setItem('TAVERN_CUSTOM_FOLDERS_' + currentTab, JSON.stringify(customFolders));
        }
        currentFolderOpened = null;
        renderItems();
        showToast('📂', `已成功创建新分类 “${cleanName}”！`);
    }
}
window.promptCreateFolder = promptCreateFolder;


async function convertCurrentAssetCategory(targetCat) {
    if (!currentItem || !targetCat) return;
    if (currentItem.category === targetCat) {
        showToast('ℹ️', '当前资产已在该分类中');
        return;
    }
    currentItem.category = targetCat;
    delete currentItem.subCategory;
    try {
        await saveAsset(currentItem);
        allAssetsCache = null;
        updateBadges();
        showToast('🎉', '已成功转换分类！');
        closeDetailView();
        switchTab(targetCat);
    } catch(err) {
        console.error(err);
        showToast('❌', '分类转换失败');
    }
}
window.convertCurrentAssetCategory = convertCurrentAssetCategory;

function switchDocVersion(verValue) {
    if (!currentItem) return;
    const textarea = document.getElementById('docFullContentTextarea');
    if (!textarea) return;
    if (verValue === 'current') {
        textarea.value = currentItem.rawText || '';
    } else {
        const versions = currentItem.historyVersions || [];
        const found = versions.find(v => String(v.version) === String(verValue));
        if (found) textarea.value = found.content || '';
    }
}
window.switchDocVersion = switchDocVersion;

async function saveDocContent(isNewVersion) {
    if (!currentItem) return;
    const textarea = document.getElementById('docFullContentTextarea');
    if (!textarea) return;
    const newText = textarea.value;
    if (isNewVersion) {
        currentItem.historyVersions = currentItem.historyVersions || [];
        const newVerNum = currentItem.historyVersions.length + 2;
        currentItem.historyVersions.push({ version: newVerNum, content: newText, createdAt: Date.now() });
        currentItem.rawText = newText;
        try {
            await saveAsset(currentItem);
            allAssetsCache = null;
            renderDocVersionSelectOptions();
            showToast('✨', '已保存为新版本！');
        } catch(e) { showToast('❌', '保存新版本失败'); }
    } else {
        currentItem.rawText = newText;
        try {
            await saveAsset(currentItem);
            allAssetsCache = null;
            showToast('💾', '已覆盖保存当前版本！');
        } catch(e) { showToast('❌', '覆盖保存失败'); }
    }
}
window.saveDocContent = saveDocContent;

function renderDocVersionSelectOptions() {
    if (!currentItem) return;
    const sel = document.getElementById('docVersionSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="current">当前版本 (最新)</option>';
    const versions = currentItem.historyVersions || [];
    versions.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.version;
        opt.innerText = '历史版本 V' + v.version;
        sel.appendChild(opt);
    });
}
window.renderDocVersionSelectOptions = renderDocVersionSelectOptions;


async function triggerGalleryLinkInputPrompt() {
    const url = prompt('请输入或粘贴图片网络直链 (以 https:// 开头)：');
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
        showToast('⚠️', '请输入有效的 https:// 图片直链！');
        return;
    }
    const defaultName = '图片_' + new Date().toLocaleDateString().replace(/\//g, '');
    const title = prompt('请输入图片名称/备注：', defaultName) || defaultName;

    try {
        showToast('⌛', '正在保存网络图片直链...');
        await saveAsset({
            id: 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            category: 'gallery',
            name: title.trim(),
            fileType: 'img',
            url: cleanUrl,
            rawText: cleanUrl,
            subCategory: currentFolderOpened || '',
            createdAt: Date.now()
        });
        allAssetsCache = null;
        updateBadges();
        await renderItems();
        showToast('🎉', '网络图片直链保存成功！');
    } catch(e) {
        console.error(e);
        showToast('❌', '保存图片直链失败');
    }
}
window.triggerGalleryLinkInputPrompt = triggerGalleryLinkInputPrompt;

async function triggerDocPasteModalPrompt() {
    const defaultName = (currentTab === 'regex' ? '番外_' : '文档_') + new Date().toLocaleDateString().replace(/\//g, '');
    
    // 注入自定义美化的对话框（模态框）来代替原生的丑陋 prompt
    const modalHtml = `
        <div id="customPasteModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div class="bg-white/90 backdrop-blur-md border border-white/60 w-[85%] max-w-[320px] rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 transform transition-all scale-100">
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-8 h-8 rounded-full bg-[#fdf4f5] text-[#d88c9a] flex items-center justify-center shadow-inner">
                        <i data-lucide="clipboard-paste" class="w-4 h-4"></i>
                    </div>
                    <h3 class="font-extrabold text-[#4a3e3d] text-[15px]">粘贴长篇内容</h3>
                </div>
                
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-[#8c7476] ml-1">标题 / 备注</label>
                    <input type="text" id="customPasteTitle" value="${defaultName}" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-xl px-3 py-2 text-xs text-[#4a3e3d] font-bold focus:outline-none focus:border-[#d88c9a] focus:ring-1 focus:ring-[#d88c9a]/30 transition shadow-inner">
                </div>

                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-[#8c7476] ml-1">长文本正文内容</label>
                    <textarea id="customPasteContent" placeholder="在此长按粘贴剪贴板的长篇文本..." class="w-full h-32 bg-[#faf6f0] border border-[#f2e3e3] rounded-xl p-3 text-xs font-mono text-[#4a3e3d] focus:outline-none focus:border-[#d88c9a] focus:ring-1 focus:ring-[#d88c9a]/30 transition shadow-inner custom-scrollbar resize-none"></textarea>
                </div>

                <div class="flex gap-2.5 mt-2">
                    <button onclick="document.getElementById('customPasteModal').remove()" class="flex-1 py-2.5 rounded-xl bg-[#f5e8e8] text-[#8c7173] font-bold text-xs hover:bg-[#eedbdb] transition active:scale-95 shadow-sm">
                        取消
                    </button>
                    <button id="customPasteConfirmBtn" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#d88c9a] to-[#c97b8b] text-white font-bold text-xs hover:opacity-90 transition active:scale-95 shadow-md">
                        确定保存
                    </button>
                </div>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('customPasteModal');
    if (oldModal) oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    lucide.createIcons();

    const titleInput = document.getElementById('customPasteTitle');
    const contentInput = document.getElementById('customPasteContent');
    contentInput.focus();

    document.getElementById('customPasteConfirmBtn').onclick = async () => {
        const title = titleInput.value.trim() || defaultName;
        const content = contentInput.value.trim();
        
        if (!content) {
            showToast('⚠️', '请粘贴或输入文本内容！');
            contentInput.focus();
            return;
        }

        document.getElementById('customPasteModal').remove();

        try {
            showToast('⌛', '正在保存草稿...');
            const saveCategory = (currentTab === 'regex') ? 'regex' : 'docs';
            await saveAsset({
                id: 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                category: saveCategory,
                name: title,
                fileType: 'txt',
                rawText: content,
                subCategory: currentFolderOpened || '',
                createdAt: Date.now()
            });
            allAssetsCache = null;
            updateBadges();
            await renderItems();
            showToast('🎉', saveCategory === 'regex' ? '番外/小剧场文本已保存！' : '文本文档已保存！');
        } catch(e) {
            console.error(e);
            showToast('❌', '保存文本失败');
        }
    };
}
window.triggerDocPasteModalPrompt = triggerDocPasteModalPrompt;

        async function promptBatchMoveToFolder() {
            const folderName = prompt('请输入目标分类名称（输入新名字可直接新建）：');
            if (!folderName || !folderName.trim()) return;
            const targetFolder = folderName.trim();

            // 1. 确保将新输入的文件夹名称持久化保存到当前 Tab 的自定义文件夹列表
            const key = 'TAVERN_CUSTOM_FOLDERS_' + currentTab;
            let customFolders = [];
            try {
                const saved = localStorage.getItem(key);
                if (saved) customFolders = JSON.parse(saved);
            } catch(e){}
            if (!Array.isArray(customFolders)) customFolders = [];
            if (!customFolders.includes(targetFolder)) {
                customFolders.unshift(targetFolder);
                localStorage.setItem(key, JSON.stringify(customFolders));
            }

            // 2. 只针对【勾选选中的资产】或【当前文件夹下的资产】进行精确移动，绝对不越界跨分类
            const assets = await getAllAssets();
            const curAssets = assets.filter(a => a.category === currentTab);
            let count = 0;

            if (selectedAssetIds && selectedAssetIds.size > 0) {
                // 如果在多选状态下，只移动勾选的这几个资产
                for (let a of curAssets) {
                    if (selectedAssetIds.has(a.id)) {
                        a.subCategory = targetFolder;
                        await saveAsset(a);
                        count++;
                    }
                }
                selectedAssetIds.clear();
                isMultiSelectMode = false;
            } else {
                // 如果在普通打开文件夹状态下，只移动当前打开文件夹里的资产
                for (let a of curAssets) {
                    if ((a.subCategory || '未分类') === currentFolderOpened) {
                        a.subCategory = targetFolder;
                        await saveAsset(a);
                        count++;
                    }
                }
            }

            allAssetsCache = null;
            if (typeof updateBadges === 'function') updateBadges();
            currentFolderOpened = targetFolder;
            await renderItems();
            showToast('📁', `已成功将 ${count} 项资源移入当前模块的小分类 “${targetFolder}”`);
        }
window.promptBatchMoveToFolder = promptBatchMoveToFolder;


async function renameFolder(oldName) {
    if (!oldName || oldName === '未分类') {
        showToast('⚠️', '“未分类”为系统默认分类，无法重命名！');
        return;
    }
    const newName = prompt(`请输入分类“${oldName}”的新名称：`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanNew = newName.trim();

    showToast('⌛', `正在将分类“${oldName}”重命名为“${cleanNew}”...`);

    try {
        // 1. 更新当前 Tab 的 localStorage 文件夹列表
        const key = 'TAVERN_CUSTOM_FOLDERS_' + currentTab;
        let customFolders = [];
        try {
            const saved = localStorage.getItem(key);
            if (saved) customFolders = JSON.parse(saved);
        } catch(e){}
        if (!Array.isArray(customFolders)) customFolders = [];
        const idx = customFolders.indexOf(oldName);
        if (idx !== -1) {
            customFolders[idx] = cleanNew;
        } else {
            customFolders.unshift(cleanNew);
        }
        localStorage.setItem(key, JSON.stringify(customFolders));

        // 2. 更新 IndexedDB 表中所有该大分类下属于 oldName 的资产 subCategory
        const all = await getAllAssets();
        const toUpdate = all.filter(a => a.category === currentTab && a.subCategory === oldName);
        for (let item of toUpdate) {
            item.subCategory = cleanNew;
            await saveAsset(item);
            if (supabaseClient) {
                try { await supabaseClient.from('tavern_assets').upsert(item); } catch(e){}
            }
        }

        allAssetsCache = null;
        if (typeof updateBadges === 'function') updateBadges();
        await renderItems();
        showToast('🎉', `分类已成功更名为“${cleanNew}”！`);
    } catch(err) {
        console.error('Rename folder failed', err);
        showToast('❌', `重命名失败: ${err.message||err}`);
    }
}
window.renameFolder = renameFolder;

