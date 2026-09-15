/**
 * Sandbox & App Runner Module for ResourceHub (Pure Offline & PWA Compatible)
 * 支持单文件 HTML / TXT 以及多文件 ZIP (小手机/微应用) 的虚拟解压与全屏沉浸式运行
 * 配备可自由拖拽、防迷失的悬浮返回胶囊
 * 深度打通 iframe 内部（小手机/各种网页）通过 postMessage 和 原生桥接导出数据到安卓系统
 */

(function () {
    const SANDBOX_CATEGORY = 'sandbox';

    // 状态
    let currentPreviewBlobUrls = [];
    let isFloatingDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let btnStartX = 0, btnStartY = 0;
    let hasMoved = false;

    // 清理创建的虚拟 Blob 资源
    function cleanupBlobs() {
        if (currentPreviewBlobUrls && currentPreviewBlobUrls.length > 0) {
            currentPreviewBlobUrls.forEach(url => {
                try { URL.revokeObjectURL(url); } catch(e){}
            });
            currentPreviewBlobUrls = [];
        }
    }

    // 全局监听来自沙盒 iframe 的导出跨域广播
    window.addEventListener('message', async function(e) {
        if (e.data && e.data.type === 'OPERIT_SANDBOX_EXPORT') {
            const { base64Data, filename, mimeType } = e.data;
            if (base64Data && filename) {
                saveExportedData(base64Data, filename, mimeType || 'application/octet-stream');
            }
        }
    });

    // 统一导出调度器：优先调用 AndroidApp 原生桥接，降级走浏览器下载
    function saveExportedData(base64Data, filename, mimeType) {
        if (window.AndroidApp && typeof window.AndroidApp.saveBase64File === 'function') {
            try {
                window.AndroidApp.saveBase64File(base64Data, filename, mimeType);
                return;
            } catch(err) {
                console.error('AndroidApp.saveBase64File failed:', err);
            }
        }

        // Web / PWA 降级处理
        try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                a.remove();
                URL.revokeObjectURL(url);
            }, 1000);
            if (typeof showToast === 'function') {
                showToast('💾', `已触发下载：${filename}`);
            }
        } catch(e) {
            console.error('Web export failed:', e);
        }
    }

    // 全屏沉浸运行器容器初始化
    function ensureSandboxOverlay() {
        let overlay = document.getElementById('sandboxFullscreenOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'sandboxFullscreenOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100dvh;
            background: #000;
            z-index: 9999999;
            display: none;
            overflow: hidden;
        `;

        // 嵌入 iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'sandboxAppFrame';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            display: block;
            background: #fff;
        `;
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups');

        // 可拖拽的返回胶囊
        const fab = document.createElement('div');
        fab.id = 'sandboxFloatingExitBtn';
        fab.title = '长按/拖拽可移动，点击退出全屏预览';
        fab.style.cssText = `
            position: fixed;
            top: 24px;
            right: 20px;
            z-index: 10000000;
            background: rgba(30, 30, 35, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 9999px;
            padding: 8px 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            cursor: move;
            user-select: none;
            touch-action: none;
            transition: background 0.2s, transform 0.1s;
        `;

        fab.innerHTML = `
            <svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <span style="letter-spacing:0.5px;">退出全屏</span>
        `;

        // 拖拽与点击事件绑定
        setupDraggable(fab, () => {
            closeSandbox();
        });

        overlay.appendChild(iframe);
        overlay.appendChild(fab);
        document.body.appendChild(overlay);

        return overlay;
    }

    // 设置元素可自由拖拽（兼顾移动端触摸 Touch 与 PC 端 Mouse）
    function setupDraggable(el, onClickCallback) {
        function onPointerDown(e) {
            isFloatingDragging = true;
            hasMoved = false;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            dragStartX = clientX;
            dragStartY = clientY;

            const rect = el.getBoundingClientRect();
            btnStartX = rect.left;
            btnStartY = rect.top;

            el.style.transition = 'none';
            document.addEventListener('mousemove', onPointerMove, { passive: false });
            document.addEventListener('mouseup', onPointerUp);
            document.addEventListener('touchmove', onPointerMove, { passive: false });
            document.addEventListener('touchend', onPointerUp);
        }

        function onPointerMove(e) {
            if (!isFloatingDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - dragStartX;
            const dy = clientY - dragStartY;

            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                hasMoved = true;
            }

            if (hasMoved) {
                if (e.cancelable) e.preventDefault();
                let newLeft = btnStartX + dx;
                let newTop = btnStartY + dy;

                // 边界限制
                const maxLeft = window.innerWidth - el.offsetWidth - 10;
                const maxTop = window.innerHeight - el.offsetHeight - 10;

                newLeft = Math.max(10, Math.min(newLeft, maxLeft));
                newTop = Math.max(10, Math.min(newTop, maxTop));

                el.style.left = `${newLeft}px`;
                el.style.top = `${newTop}px`;
                el.style.right = 'auto';
                el.style.bottom = 'auto';
            }
        }

        function onPointerUp(e) {
            if (!isFloatingDragging) return;
            isFloatingDragging = false;
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('mouseup', onPointerUp);
            document.removeEventListener('touchmove', onPointerMove);
            document.removeEventListener('touchend', onPointerUp);

            if (!hasMoved) {
                if (onClickCallback) onClickCallback();
            }
        }

        el.addEventListener('mousedown', onPointerDown);
        el.addEventListener('touchstart', onPointerDown, { passive: false });
    }

    // 生成注入沙盒内部的下载拦截器（同时支持 postMessage、window.parent 直调以及原生 AndroidApp）
    function getSandboxBridgeScript() {
        return `
            <script>
            (function() {
                // 1. 继承父级 AndroidApp 原生桥接对象
                try {
                    if (window.parent && window.parent.AndroidApp) {
                        window.AndroidApp = window.parent.AndroidApp;
                    }
                } catch(e){}

                // 2. 深度拦截 <a> 标签的导出下载行为
                function handleBlobExport(href, filename) {
                    if (!href) return;
                    fetch(href).then(res => res.blob()).then(blob => {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const base64Data = e.target.result.split(',')[1];
                            const mime = blob.type || 'application/octet-stream';
                            
                            // 方式 A: 直接调用原生 AndroidApp 桥接
                            if (window.AndroidApp && typeof window.AndroidApp.saveBase64File === 'function') {
                                window.AndroidApp.saveBase64File(base64Data, filename, mime);
                                return;
                            }
                            
                            // 方式 B: 调用父页面 AndroidApp
                            try {
                                if (window.parent && window.parent.AndroidApp && typeof window.parent.AndroidApp.saveBase64File === 'function') {
                                    window.parent.AndroidApp.saveBase64File(base64Data, filename, mime);
                                    return;
                                }
                            } catch(err){}

                            // 方式 C: 跨域安全通道 postMessage
                            try {
                                window.parent.postMessage({
                                    type: 'OPERIT_SANDBOX_EXPORT',
                                    base64Data: base64Data,
                                    filename: filename,
                                    mimeType: mime
                                }, '*');
                            } catch(err){}
                        };
                        reader.readAsDataURL(blob);
                    }).catch(err => {
                        console.error('Intercept export failed:', err);
                    });
                }

                // 劫持 HTMLElement.prototype.click
                const origClick = HTMLAnchorElement.prototype.click;
                HTMLAnchorElement.prototype.click = function() {
                    const downloadAttr = this.getAttribute('download') || this.download;
                    const href = this.href;
                    if (downloadAttr || (href && (href.startsWith('blob:') || href.startsWith('data:')))) {
                        const filename = downloadAttr || ('backup_' + Date.now() + '.json');
                        handleBlobExport(href, filename);
                        return;
                    }
                    return origClick.apply(this, arguments);
                };

                // 监听全局点击捕获
                document.addEventListener('click', function(e) {
                    const target = e.target.closest('a[download], a[href^="blob:"], a[href^="data:"]');
                    if (target) {
                        const filename = target.getAttribute('download') || target.download || ('backup_' + Date.now() + '.json');
                        handleBlobExport(target.href, filename);
                    }
                }, true);
            })();
            <\/script>
        `;
    }

    /**
     * 运行/全屏预览
     * @param {Object} item - 资产对象，包含 rawText / rawBuffer / fileType 等
     */
    async function runSandboxItem(item) {
        if (!item) return;
        ensureSandboxOverlay();
        cleanupBlobs();

        const overlay = document.getElementById('sandboxFullscreenOverlay');
        const frame = document.getElementById('sandboxAppFrame');
        if (!overlay || !frame) return;

        showToast('🚀', `正在启动 [${item.name || '沙盒应用'}]...`);

        try {
            const ext = (item.fileType || '').toLowerCase();
            const bridgeScript = getSandboxBridgeScript();

            // 1. 单 HTML / TXT 文本运行
            if (ext === 'html' || ext === 'htm' || ext === 'txt') {
                let htmlContent = item.rawText || (item.rawBuffer ? new TextDecoder('utf-8').decode(item.rawBuffer) : '');
                if (!htmlContent) {
                    showToast('⚠️', '未读取到可运行的 HTML 代码');
                    return;
                }

                // 注入下载导出拦截器
                if (htmlContent.includes('<head>')) {
                    htmlContent = htmlContent.replace('<head>', '<head>' + bridgeScript);
                } else {
                    htmlContent = bridgeScript + htmlContent;
                }

                const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
                const blobUrl = URL.createObjectURL(blob);
                currentPreviewBlobUrls.push(blobUrl);

                frame.src = blobUrl;
                overlay.style.display = 'block';
                return;
            }

            // 2. ZIP 多文件微应用（小手机、完整前端静态包）
            if (ext === 'zip' || item.rawBuffer) {
                if (!window.JSZip) {
                    showToast('❌', 'JSZip 库未就绪，无法解压');
                    return;
                }

                let buffer = item.rawBuffer;
                if (!buffer && item.rawText) {
                    showToast('⚠️', 'ZIP 文件数据损坏');
                    return;
                }

                const zip = await JSZip.loadAsync(buffer);
                const fileMap = {}; // 相对路径 -> Blob URL
                let entryHtmlPath = null;

                // 遍历所有文件并生成 Blob URL 映射
                const fileEntries = Object.keys(zip.files).filter(p => !zip.files[p].dir);

                // 优先寻找顶层或嵌套的 index.html
                entryHtmlPath = fileEntries.find(p => p.toLowerCase() === 'index.html') ||
                                fileEntries.find(p => p.toLowerCase().endsWith('/index.html')) ||
                                fileEntries.find(p => p.toLowerCase().endsWith('.html') || p.toLowerCase().endsWith('.htm'));

                if (!entryHtmlPath) {
                    showToast('⚠️', 'ZIP 压缩包内未找到 index.html 入口文件！');
                    return;
                }

                // 提取所有静态资产为 Blob
                for (const path of fileEntries) {
                    const zipFile = zip.files[path];
                    const lowerPath = path.toLowerCase();
                    let mime = 'application/octet-stream';

                    if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) mime = 'text/html;charset=utf-8';
                    else if (lowerPath.endsWith('.js')) mime = 'application/javascript;charset=utf-8';
                    else if (lowerPath.endsWith('.css')) mime = 'text/css;charset=utf-8';
                    else if (lowerPath.endsWith('.json')) mime = 'application/json;charset=utf-8';
                    else if (lowerPath.endsWith('.png')) mime = 'image/png';
                    else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) mime = 'image/jpeg';
                    else if (lowerPath.endsWith('.gif')) mime = 'image/gif';
                    else if (lowerPath.endsWith('.svg')) mime = 'image/svg+xml';
                    else if (lowerPath.endsWith('.webp')) mime = 'image/webp';
                    else if (lowerPath.endsWith('.mp3')) mime = 'audio/mpeg';
                    else if (lowerPath.endsWith('.wav')) mime = 'audio/wav';

                    const blobData = await zipFile.async('blob');
                    const typedBlob = new Blob([blobData], { type: mime });
                    const bUrl = URL.createObjectURL(typedBlob);
                    currentPreviewBlobUrls.push(bUrl);
                    fileMap[path] = bUrl;
                    
                    const simpleName = path.split('/').pop();
                    if (!fileMap[simpleName]) fileMap[simpleName] = bUrl;
                }

                // 读取主 HTML 内容并替换相对资源引用
                let mainHtmlContent = await zip.files[entryHtmlPath].async('string');

                // 资源 URL 替换注入：把 href="./style.css", src="app.js" 等替换为 Blob URL
                for (const [relPath, blobUrl] of Object.entries(fileMap)) {
                    if (relPath === entryHtmlPath) continue;
                    const escaped = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(["'\\(=])(\\.\\/|\\/)?(${escaped})([?"'\\)])`, 'gi');
                    mainHtmlContent = mainHtmlContent.replace(regex, `$1${blobUrl}$4`);
                }

                // 注入下载导出拦截器
                if (mainHtmlContent.includes('<head>')) {
                    mainHtmlContent = mainHtmlContent.replace('<head>', '<head>' + bridgeScript);
                } else {
                    mainHtmlContent = bridgeScript + mainHtmlContent;
                }

                const entryBlob = new Blob([mainHtmlContent], { type: 'text/html;charset=utf-8' });
                const entryUrl = URL.createObjectURL(entryBlob);
                currentPreviewBlobUrls.push(entryUrl);

                frame.src = entryUrl;
                overlay.style.display = 'block';
                return;
            }

            showToast('⚠️', '不支持此格式的沙盒预览');
        } catch (e) {
            console.error('Run sandbox error:', e);
            showToast('❌', '运行失败：' + (e.message || '未知错误'));
        }
    }

    function closeSandbox() {
        const overlay = document.getElementById('sandboxFullscreenOverlay');
        const frame = document.getElementById('sandboxAppFrame');
        if (overlay) overlay.style.display = 'none';
        if (frame) frame.src = 'about:blank';
        cleanupBlobs();
        showToast('📱', '已退出全屏沙盒');
    }

    // 暴露全局 API
    window.runSandboxItem = runSandboxItem;
    window.closeSandbox = closeSandbox;
    window.ensureSandboxOverlay = ensureSandboxOverlay;
})();