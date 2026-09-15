function toggleCloudConfigCollapse() {
            cloudConfigCollapsed = !cloudConfigCollapsed;
            const body = document.getElementById('cloudConfigBody');
            const chevron = document.getElementById('cloudConfigChevron');
            if (cloudConfigCollapsed) { body.classList.add('hidden'); chevron.classList.remove('rotate-180'); }
            else { body.classList.remove('hidden'); chevron.classList.add('rotate-180'); }
        }

        const SQL_CODE = `CREATE TABLE IF NOT EXISTS tavern_assets (id TEXT PRIMARY KEY, category TEXT, name TEXT, file_type TEXT, card_data JSONB, raw_text TEXT, raw_buffer_base64 TEXT, created_at BIGINT); ALTER TABLE tavern_assets ENABLE ROW LEVEL SECURITY; CREATE POLICY "Public Access" ON tavern_assets FOR ALL USING (true) WITH CHECK (true);`;

        function copySqlCode() { navigator.clipboard.writeText(SQL_CODE); showToast('📋', '建表 SQL 已复制到剪贴板！'); }

        let db, currentTab = 'cards', currentItem = null, personalityCollapsed = true;

        function toggleSidebar() {
            const drawer = document.getElementById('sidebarDrawer'), overlay = document.getElementById('drawerOverlay');
            if (!drawer.classList.contains('-translate-x-full')) { drawer.classList.add('-translate-x-full'); overlay.classList.add('opacity-0', 'pointer-events-none'); }
            else { drawer.classList.remove('-translate-x-full'); overlay.classList.remove('opacity-0', 'pointer-events-none'); }
        }

        const request = indexedDB.open('TavernCardHubDB', 1);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('assets')) {
                const store = db.createObjectStore('assets', { keyPath: 'id' });
                store.createIndex('category', 'category', { unique: false });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            // ui.js 在本文件之后加载，等待所有模块完成定义后再启动界面。
            const boot = () => {
                if (typeof updateBadges !== 'function' || typeof renderItems !== 'function') {
                    setTimeout(boot, 0);
                    return;
                }
                initSupabaseClient();
                initGithubClient();
                updateBadges();
                renderItems();
                autoSyncFromCloudSilent();
                renderEmojiFormatBuilder();
                setupGlobalPasteListener();
            };
            boot();
        };