// ============================================================
// API Key Manager Module (Dynamic Categories & Adaptive Grid UI)
// ============================================================

const API_KEYS_STORAGE_KEY = 'TAVERN_API_KEYS_DATA_V1';
const API_CATEGORIES_STORAGE_KEY = 'TAVERN_API_CATEGORIES_CUSTOM_V1';

// 默认三类系统基础分类
const DEFAULT_SYSTEM_CATEGORIES = [
    { id: 'Relay', name: 'API 中转站', icon: '🔀' },
    { id: 'Official', name: '官方渠道', icon: '🤖' },
    { id: 'TTS', name: '语音服务', icon: '🎙️' }
];

const PROVIDER_PRESETS = {
    oneapi: { name: '中转站 / One-API', baseUrl: 'https://your-oneapi-domain.com/v1', balancePath: '/api/user/self', icon: '🔀', category: 'Relay' },
    openai: { name: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1', balancePath: '/dashboard/billing/credit_grants', icon: '🤖', category: 'Official' },
    claude: { name: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1', balancePath: '', icon: '🧠', category: 'Official' },
    siliconflow: { name: '硅基流动 (SiliconFlow)', baseUrl: 'https://api.siliconflow.cn/v1', balancePath: '/user/info', icon: '⚡', category: 'Official' },
    deepseek: { name: 'DeepSeek 官方', baseUrl: 'https://api.deepseek.com/v1', balancePath: '/user/balance', icon: '🐳', category: 'Official' },
    zhipu: { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', balancePath: '', icon: '🔮', category: 'Official' },
    moonshot: { name: '月之暗面 (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', balancePath: '/user/balance', icon: '🌙', category: 'Official' },
    minimax_tts: { name: 'MiniMax 语音 (TTS)', baseUrl: 'https://api.minimax.chat/v1', balancePath: '', icon: '🎙️', category: 'TTS' },
    volcengine_tts: { name: '火山引擎语音', baseUrl: 'https://openspeech.bytedance.com/api/v1/tts', balancePath: '', icon: '🌋', category: 'TTS' },
    aliyun_tts: { name: '阿里云语音', baseUrl: 'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts', balancePath: '', icon: '☁️', category: 'TTS' },
    tencent_tts: { name: '腾讯云语音', baseUrl: 'https://tts.cloud.tencent.com/stream', balancePath: '', icon: '🐧', category: 'TTS' },
    xunfei_tts: { name: '讯飞开放平台', baseUrl: 'https://tts-api.xfyun.cn/v2/tts', balancePath: '', icon: '🗣️', category: 'TTS' },
    azure_speech: { name: 'Microsoft Azure Speech', baseUrl: 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1', balancePath: '', icon: '🔷', category: 'TTS' },
    elevenlabs: { name: 'ElevenLabs', baseUrl: 'https://api.elevenlabs.io/v1', balancePath: '/user/subscription', icon: '🎧', category: 'TTS' },
    openai_tts: { name: 'OpenAI Audio TTS', baseUrl: 'https://api.openai.com/v1/audio/speech', balancePath: '', icon: '🔊', category: 'TTS' },
    custom: { name: '自定义 API', baseUrl: '', balancePath: '', icon: '🔧', category: 'Relay' }
};

let activeApiKeyCategory = null; 
let editingKeyId = null; 

function getStoredApiKeys() {
    try {
        const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        return [];
    }
}

function getStoredCustomCategories() {
    try {
        const raw = localStorage.getItem(API_CATEGORIES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        return [];
    }
}

function saveCustomCategories(cats) {
    localStorage.setItem(API_CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
}

function saveStoredApiKeys(keys) {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    renderApiKeyList();
    if (typeof updateBadges === 'function') updateBadges();
    if (typeof syncApiKeysToCloudSilent === 'function') syncApiKeysToCloudSilent(keys);
}

function showAddApiKeyDialog(editId = null) {
    editingKeyId = editId;
    createApiKeyModalDom();
    const modal = document.getElementById('apiKeyModal');
    if (!modal) return;

    const titleEl = document.getElementById('apiKeyModalTitle');
    const nameInput = document.getElementById('keyNameInput');
    const presetSelect = document.getElementById('keyProviderSelect');
    const categorySelect = document.getElementById('keyCategorySelect');
    const customCategoryInput = document.getElementById('keyCustomCategoryInput');
    const urlInput = document.getElementById('keyBaseUrlInput');
    const secretInput = document.getElementById('keySecretInput');

    refreshCategorySelectOptions();

    if (editId) {
        const keys = getStoredApiKeys();
        const item = keys.find(k => k.id === editId);
        if (item) {
            if (titleEl) titleEl.innerText = '✏️ 编辑 API 密钥';
            if (nameInput) nameInput.value = item.name || '';
            if (presetSelect) presetSelect.value = item.provider || 'custom';
            if (urlInput) urlInput.value = item.baseUrl || '';
            if (secretInput) secretInput.value = item.apiKey || '';
            if (categorySelect) categorySelect.value = item.category || 'Relay';
        }
    } else {
        if (titleEl) titleEl.innerText = '🔑 新增 API 密钥';
        if (nameInput) nameInput.value = '';
        if (presetSelect) presetSelect.value = 'oneapi';
        if (categorySelect) categorySelect.value = activeApiKeyCategory || 'Relay';
        onProviderPresetChange();
        if (secretInput) secretInput.value = '';
    }
    toggleCustomCategoryInput();
    modal.classList.remove('hidden');
}

function closeApiKeyModal() {
    const dialog = document.getElementById('apiKeyModal');
    if (dialog) dialog.classList.add('hidden');
    editingKeyId = null;
}

function onProviderPresetChange() {
    const presetSelect = document.getElementById('keyProviderSelect');
    const urlInput = document.getElementById('keyBaseUrlInput');
    const categorySelect = document.getElementById('keyCategorySelect');
    if (!presetSelect || !urlInput) return;
    const p = PROVIDER_PRESETS[presetSelect.value];
    if (p && p.baseUrl && !editingKeyId) {
        urlInput.value = p.baseUrl;
        if (categorySelect && p.category) categorySelect.value = p.category;
    }
}

function toggleCustomCategoryInput() {
    const categorySelect = document.getElementById('keyCategorySelect');
    const customInputContainer = document.getElementById('customCategoryContainer');
    if (categorySelect && customInputContainer) {
        if (categorySelect.value === 'NEW_CUSTOM') {
            customInputContainer.classList.remove('hidden');
        } else {
            customInputContainer.classList.add('hidden');
        }
    }
}

function refreshCategorySelectOptions() {
    const categorySelect = document.getElementById('keyCategorySelect');
    if (!categorySelect) return;

    const customCats = getStoredCustomCategories();
    let html = '';
    
    // 默认系统分类
    DEFAULT_SYSTEM_CATEGORIES.forEach(c => {
        html += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
    });

    // 用户自定义新增的分类
    customCats.forEach(c => {
        html += `<option value="${c.id}">✨ ${c.name}</option>`;
    });

    // 新增自定义选项
    html += `<option value="NEW_CUSTOM">➕ + 手动新建分类...</option>`;
    categorySelect.innerHTML = html;
}

function submitSaveApiKey() {
    const nameInput = document.getElementById('keyNameInput');
    const presetSelect = document.getElementById('keyProviderSelect');
    const categorySelect = document.getElementById('keyCategorySelect');
    const customCategoryInput = document.getElementById('keyCustomCategoryInput');
    const urlInput = document.getElementById('keyBaseUrlInput');
    const secretInput = document.getElementById('keySecretInput');

    const name = nameInput ? nameInput.value.trim() : '';
    const provider = presetSelect ? presetSelect.value : 'custom';
    const baseUrl = urlInput ? urlInput.value.trim() : '';
    const apiKey = secretInput ? secretInput.value.trim() : '';

    if (!name) { showToast('⚠️', '请输入 Key 名称'); return; }
    if (!apiKey) { showToast('⚠️', '请输入 API Key 秘钥'); return; }

    let selectedCat = categorySelect ? categorySelect.value : 'Relay';

    // 如果是新建分类
    if (selectedCat === 'NEW_CUSTOM') {
        const newCatName = customCategoryInput ? customCategoryInput.value.trim() : '';
        if (!newCatName) { showToast('⚠️', '请输入自定义分类名称'); return; }
        
        const catId = 'cat_' + Date.now();
        const customCats = getStoredCustomCategories();
        customCats.push({ id: catId, name: newCatName, icon: '✨' });
        saveCustomCategories(customCats);
        selectedCat = catId;
    }

    let keys = getStoredApiKeys();

    if (editingKeyId) {
        keys = keys.map(k => {
            if (k.id === editingKeyId) {
                return { ...k, name, provider, category: selectedCat, baseUrl, apiKey, updatedAt: Date.now() };
            }
            return k;
        });
        showToast('🎉', 'API Key 修改成功！');
    } else {
        keys.push({
            id: 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name,
            provider,
            category: selectedCat,
            baseUrl,
            apiKey,
            createdAt: Date.now()
        });
        showToast('🎉', 'API Key 保存成功！');
    }

    saveStoredApiKeys(keys);
    closeApiKeyModal();
}

function deleteApiKeyItem(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('确定删除该 API Key 吗？')) return;
    let keys = getStoredApiKeys();
    keys = keys.filter(k => k.id !== id);
    saveStoredApiKeys(keys);
    showToast('🗑️', '已删除密钥');
}

function copyApiKeyText(text, label, e) {
    if (e) e.stopPropagation();
    if (!text) { showToast('⚠️', '无可复制内容'); return; }
    navigator.clipboard.writeText(text);
    showToast('📋', `已复制 ${label || '内容'}`);
}

function createApiKeyModalDom() {
    let modal = document.getElementById('apiKeyModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'apiKeyModal';
        modal.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        let providerOptions = '';
        for (const key in PROVIDER_PRESETS) {
            const p = PROVIDER_PRESETS[key];
            providerOptions += `<option value="${key}">${p.icon} ${p.name}</option>`;
        }

        modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-2.5 border border-[#f2e3e3]">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-2">
                <h3 id="apiKeyModalTitle" class="font-bold text-xs text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🔑</span> 新增 API 密钥
                </h3>
                <button onclick="closeApiKeyModal()" class="text-gray-400 hover:text-gray-600 text-base font-bold">&times;</button>
            </div>
            
            <div class="space-y-2 text-[11px]">
                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">密钥名称 / 备注</label>
                    <input id="keyNameInput" type="text" placeholder="例: 吾爱 API / 个人自建" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a]">
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block font-semibold text-[#785e60] mb-0.5">服务商预设</label>
                        <select id="keyProviderSelect" onchange="onProviderPresetChange()" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#d88c9a] text-[10px]">
                            ${providerOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-[#785e60] mb-0.5">所属分类</label>
                        <select id="keyCategorySelect" onchange="toggleCustomCategoryInput()" class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#d88c9a] text-[10px]">
                        </select>
                    </div>
                </div>

                <div id="customCategoryContainer" class="hidden">
                    <label class="block font-semibold text-[#d88c9a] mb-0.5">新建分类名称</label>
                    <input id="keyCustomCategoryInput" type="text" placeholder="输入自定义分类名称，如: 画图通道" class="w-full bg-[#fdf6f7] border border-[#d88c9a]/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a]">
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">Base URL (请求基地址)</label>
                    <input id="keyBaseUrlInput" type="text" placeholder="https://..." class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a] font-mono text-[10px]">
                </div>

                <div>
                    <label class="block font-semibold text-[#785e60] mb-0.5">API Key 密钥</label>
                    <input id="keySecretInput" type="password" placeholder="sk-..." class="w-full bg-[#faf6f0] border border-[#f2e3e3] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#d88c9a] font-mono text-[10px]">
                </div>
            </div>

            <div class="flex justify-end gap-2 pt-1.5 border-t border-[#f7ecee]">
                <button onclick="closeApiKeyModal()" class="px-3 py-1 rounded-full border border-gray-300 text-gray-600 text-[11px] hover:bg-gray-50 transition">取消</button>
                <button onclick="submitSaveApiKey()" class="px-3.5 py-1 rounded-full bg-[#d88c9a] text-white text-[11px] font-bold hover:bg-[#c97b8b] shadow-sm transition">保存</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);
    }
}

function selectApiKeyCategory(catKey) {
    activeApiKeyCategory = catKey;
    renderApiKeyList();
}

function renderApiKeyList() {
    const container = document.getElementById('apikeyList') || document.getElementById('apikeysListContainer');
    if (!container) return;

    const keys = getStoredApiKeys();
    const countBadge = document.getElementById('tab-apikeys-count');
    if (countBadge) countBadge.innerText = keys.length;

    // 整合系统默认分类与用户自定义分类
    const allCategoriesMap = {};
    DEFAULT_SYSTEM_CATEGORIES.forEach(c => {
        allCategoriesMap[c.id] = { id: c.id, name: c.name, icon: c.icon, items: [] };
    });

    const customCats = getStoredCustomCategories();
    customCats.forEach(c => {
        allCategoriesMap[c.id] = { id: c.id, name: c.name, icon: c.icon || '✨', items: [] };
    });

    // 将密钥归集到对应分类
    keys.forEach(k => {
        let cat = k.category;
        if (!cat) {
            const preset = PROVIDER_PRESETS[k.provider] || PROVIDER_PRESETS.custom;
            cat = preset.category || 'Relay';
        }
        if (allCategoriesMap[cat]) {
            allCategoriesMap[cat].items.push(k);
        } else {
            // 如果指派了不存在的分类，分配至 Relay 或新增该临时映射
            if (!allCategoriesMap['Relay']) allCategoriesMap['Relay'] = { id: 'Relay', name: 'API 中转站', icon: '🔀', items: [] };
            allCategoriesMap['Relay'].items.push(k);
        }
    });

    // 视角 1：自适应美化分类网格 (未选择具体分类时)
    if (!activeApiKeyCategory) {
        let html = `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pb-2">`;
        
        for (const catId in allCategoriesMap) {
            const group = allCategoriesMap[catId];
            const count = group.items.length;
            
            html += `
                <div onclick="selectApiKeyCategory('${catId}')" class="group bg-gradient-to-b from-white to-[#fdf8f8] border border-[#f2e3e3] rounded-2xl p-3 flex flex-col justify-between cursor-pointer hover:border-[#d88c9a] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xl p-1.5 rounded-xl bg-[#f8eeee] group-hover:bg-[#f2dadc] transition">${group.icon}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-[#d88c9a]/10 text-[#d88c9a]' : 'bg-gray-100 text-gray-400'}">${count} 项</span>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-[#4a3e3d] group-hover:text-[#d88c9a] transition truncate">${group.name}</div>
                        <div class="text-[9px] text-[#8c7476] opacity-75 mt-0.5 flex items-center justify-between">
                            <span>点击进入</span>
                            <span class="text-gray-300 group-hover:text-[#d88c9a] transition">›</span>
                        </div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    // 视角 2：分类二级列表 (点击进入具体分类后，极窄紧凑行)
    const activeGroup = allCategoriesMap[activeApiKeyCategory] || { name: '分类查看', icon: '🔑', items: [] };
    const catKeys = activeGroup.items;

    let html = `
        <div class="space-y-1.5">
            <div class="flex items-center justify-between pb-1 text-xs">
                <button onclick="selectApiKeyCategory(null)" class="text-[#d88c9a] font-bold hover:underline flex items-center gap-1 text-[11px] bg-[#f8eeee] px-2.5 py-1 rounded-full hover:bg-[#f2dadc] transition">
                    ‹ 返回分类列表
                </button>
                <span class="text-[#785e60] font-bold text-[11px] flex items-center gap-1">
                    <span>${activeGroup.icon}</span> ${activeGroup.name} (${catKeys.length})
                </span>
            </div>
    `;

    if (catKeys.length === 0) {
        html += `
            <div class="py-12 text-center text-[#b89b9d] text-xs bg-white rounded-2xl border border-[#f2e3e3]">
                <div class="text-lg mb-1">📭</div>
                该分类下暂无已保存的 API 密钥
            </div>
        `;
    } else {
        catKeys.forEach(k => {
            const preset = PROVIDER_PRESETS[k.provider] || PROVIDER_PRESETS.custom;
            const icon = preset.icon || '🔑';
            const maskedKey = k.apiKey.length > 8 ? k.apiKey.substring(0, 3) + '...' + k.apiKey.substring(k.apiKey.length - 3) : '***';

            html += `
                <div class="bg-white border border-[#f2e3e3] rounded-xl px-2.5 py-1.5 shadow-2xs hover:border-[#d88c9a] transition flex items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="text-base shrink-0">${icon}</span>
                        <div class="min-w-0 leading-tight">
                            <div class="font-bold text-[#4a3e3d] truncate text-[11px]">${k.name}</div>
                            <div class="text-[9px] font-mono text-gray-400 truncate opacity-90">${maskedKey}</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="copyApiKeyText('${k.apiKey}', 'Key', event)" class="px-2 py-0.5 rounded-md bg-[#f8eeee] text-[#785e60] text-[10px] font-medium hover:bg-[#f2dadc] transition">Key</button>
                        <button onclick="copyApiKeyText('${k.baseUrl}', 'URL', event)" class="px-2 py-0.5 rounded-md bg-[#f8eeee] text-[#785e60] text-[10px] font-medium hover:bg-[#f2dadc] transition">URL</button>
                        <button onclick="openApiKeyDetailModal('${k.id}')" class="px-2 py-0.5 rounded-md bg-[#d88c9a] text-white text-[10px] font-bold hover:bg-[#c97b8b] transition">详情</button>
                        <button onclick="showAddApiKeyDialog('${k.id}')" class="px-1.5 py-0.5 text-gray-400 hover:text-[#d88c9a] transition text-[11px]" title="编辑">✏️</button>
                        <button onclick="deleteApiKeyItem('${k.id}', event)" class="px-1.5 py-0.5 text-gray-300 hover:text-rose-500 transition text-[11px]" title="删除">🗑️</button>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    container.innerHTML = html;
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

// 挂载全局逻辑
window.showAddApiKeyDialog = showAddApiKeyDialog;
window.closeApiKeyModal = closeApiKeyModal;
window.submitSaveApiKey = submitSaveApiKey;
window.onProviderPresetChange = onProviderPresetChange;
window.renderApiKeyList = renderApiKeyList;
window.deleteApiKeyItem = deleteApiKeyItem;
window.copyApiKeyText = copyApiKeyText;
window.selectApiKeyCategory = selectApiKeyCategory;
window.toggleCustomCategoryInput = toggleCustomCategoryInput;


async function openApiKeyDetailModal(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;

    let modal = document.getElementById('apiKeyDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'apiKeyDetailModal';
        modal.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    // 先渲染加载中状态
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#f2e3e3] space-y-4 animate-in fade-in zoom-in duration-200">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-3">
                <h3 class="font-bold text-sm text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🏷️</span> 令牌信息
                </h3>
                <button onclick="closeApiKeyDetailModal()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <div class="py-8 text-center text-[#d88c9a] text-xs font-semibold animate-pulse">
                ⏳ 正在拉取中转站令牌详细信息...
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    const origin = (item.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const candidatePaths = [
        '/api/usage/token/',
        '/api/user/self',
        '/v1/dashboard/billing/subscription',
        '/v1/dashboard/billing/credit_grants'
    ];

    let info = {
        name: item.name,
        total: '未知',
        remain: '未知',
        used: '未知',
        expire: '永不过期',
        isUnlimited: false
    };

    for (const path of candidatePaths) {
        const fullUrl = origin.endsWith('/v1') && path.startsWith('/v1') ? origin + path.slice(3) : origin + path;
        try {
            let data = null;
            let res = await fetch(fullUrl, {
                headers: { 'Authorization': 'Bearer ' + item.apiKey, 'Accept': 'application/json' }
            });
            if (res.ok) data = await res.json();
            else if (typeof CF_PROXY_PREFIX !== 'undefined') {
                let proxyRes = await fetch(CF_PROXY_PREFIX + encodeURIComponent(fullUrl), {
                    headers: { 'Authorization': 'Bearer ' + item.apiKey, 'Accept': 'application/json' }
                });
                if (proxyRes.ok) data = await proxyRes.json();
            }

            if (data) {
                // A. neko-api-key-tool 结构 ({ data: { name, unlimited_quota, total_granted, total_used, total_available, expires_at } })
                if (data.data && typeof data.data.total_used !== 'undefined') {
                    const d = data.data;
                    info.name = d.name || item.name;
                    const usedUSD = (d.total_used / 500000).toFixed(2);
                    
                    if (d.unlimited_quota === true || d.unlimited_quota === 'true') {
                        info.isUnlimited = true;
                        info.total = '无限';
                        info.remain = '无限制';
                        info.used = '不进行计算';
                    } else {
                        info.isUnlimited = false;
                        const grantedUSD = (d.total_granted / 500000).toFixed(2);
                        const availUSD = typeof d.total_available !== 'undefined' ? (d.total_available / 500000).toFixed(2) : Math.max(0, grantedUSD - usedUSD).toFixed(2);
                        info.total = `$${grantedUSD}`;
                        info.remain = `$${availUSD}`;
                        info.used = `$${usedUSD}`;
                    }

                    if (d.expires_at && d.expires_at > 0) {
                        info.expire = new Date(d.expires_at * 1000).toLocaleDateString();
                    } else {
                        info.expire = '永不过期';
                    }
                    break;
                }

                // B. Subscription 结构 ({ hard_limit_usd: ... })
                if (typeof data.hard_limit_usd !== 'undefined') {
                    let hardLimitUSD = data.hard_limit_usd / 100;
                    if (hardLimitUSD >= 1000000) {
                        info.isUnlimited = true;
                        info.total = '无限';
                        info.remain = '无限制';
                        info.used = '不进行计算';
                    } else {
                        info.total = `$${hardLimitUSD.toFixed(2)}`;
                        info.remain = `$${hardLimitUSD.toFixed(2)}`;
                        info.used = '$0.00';
                    }
                    break;
                }
            }
        } catch(e) {}
    }

    // 渲染完备的复刻弹窗 UI
    modal.innerHTML = `
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#f2e3e3] space-y-4 animate-in fade-in zoom-in duration-200">
            <div class="flex items-center justify-between border-b border-[#f7ecee] pb-3">
                <h3 class="font-bold text-sm text-[#4a3e3d] flex items-center gap-1.5">
                    <span>🏷️</span> 令牌信息
                </h3>
                <button onclick="copyFormattedTokenDetail('${item.id}')" class="px-2.5 py-1 rounded-full bg-[#f8eeee] text-[#b86b7a] text-[11px] font-bold hover:bg-[#f2dadc] transition flex items-center gap-1">
                    <i data-lucide="copy" class="w-3 h-3"></i> 复制令牌信息
                </button>
                <button onclick="closeApiKeyDetailModal()" class="text-gray-400 hover:text-gray-600 text-xl font-bold ml-1">&times;</button>
            </div>

            <div class="space-y-2.5 text-xs text-[#5c494a] py-1">
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">令牌名称 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold font-mono text-[#d88c9a] truncate max-w-[180px]">${info.name}</span>
                </div>

                <div class="space-y-1 bg-[#faf6f0] p-2 rounded-xl border border-[#f2e3e3]">
                    <div class="flex items-center justify-between gap-1 text-[11px]">
                        <span class="text-[#8c7476] font-medium shrink-0">Base URL:</span>
                        <button onclick="copyApiKeyText('${item.baseUrl}', 'URL', event)" class="font-mono text-[#4a3e3d] truncate hover:text-[#d88c9a] text-[10px] text-right" title="点击复制完整 URL">
                            ${item.baseUrl || '（默认官方）'} 📋
                        </button>
                    </div>
                    <div class="flex items-center justify-between gap-1 text-[11px] border-t border-[#f2e3e3] pt-1">
                        <span class="text-[#8c7476] font-medium shrink-0">API Key:</span>
                        <button onclick="copyApiKeyText('${item.apiKey}', 'Key', event)" class="font-mono text-[#d88c9a] break-all text-[10px] text-right font-bold hover:underline" title="点击复制完整 Key">
                            ${item.apiKey} 📋
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">令牌总额 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold text-[#4a3e3d]">${info.total}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">剩余额度 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold text-[#d88c9a]">${info.remain}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">已用额度 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold ${info.isUnlimited ? 'text-[#c09a9c]' : 'text-[#4a3e3d]'}">${info.used}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[#8c7476] font-medium">有效期至 <span class="text-[#d88c9a]">🍥</span></span>
                    <span class="font-bold text-[#d88c9a]">${info.expire}</span>
                </div>
            </div>

            <div class="pt-2 border-t border-[#f7ecee] flex justify-end">
                <button onclick="closeApiKeyDetailModal()" class="px-5 py-1.5 rounded-full bg-[#d88c9a] text-white text-xs font-bold hover:bg-[#c97b8b] transition shadow-sm">关闭</button>
            </div>
        </div>
    `;
    if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
}

function closeApiKeyDetailModal() {
    const modal = document.getElementById('apiKeyDetailModal');
    if (modal) modal.classList.add('hidden');
}

function copyFormattedTokenDetail(id) {
    const keys = getStoredApiKeys();
    const item = keys.find(k => k.id === id);
    if (!item) return;
    const infoText = `令牌名称: ${item.name}\nBase URL: ${item.baseUrl}\nAPI Key: ${item.apiKey}`;
    navigator.clipboard.writeText(infoText);
    showToast('📋', '已复制令牌详细信息');
}

window.openApiKeyDetailModal = openApiKeyDetailModal;
window.closeApiKeyDetailModal = closeApiKeyDetailModal;
window.copyFormattedTokenDetail = copyFormattedTokenDetail;
