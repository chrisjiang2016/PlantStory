(function () {
  const STORAGE_KEYS = {
    favorites: 'zhiwu:favorites',
    plants: 'zhiwu:myPlants',
    lastRecognition: 'zhiwu:lastRecognition'
  };

  const fallbackProfiles = {
    '绿萝': {
      commonName: '绿萝',
      scientificName: 'Epipremnum aureum',
      family: '天南星科',
      emoji: '🌿',
      desc: '适合室内养护，耐阴性强，适合作为入门绿植。',
      watering: '每 3-5 天',
      sunlight: '半阴 / 散射光',
      temperature: '15-30°C',
      fertilizer: '每 2 周'
    },
    '玉露': {
      commonName: '玉露',
      scientificName: 'Haworthia cooperi',
      family: '阿福花科',
      emoji: '🌵',
      desc: '桌面小型多肉，适合通风和明亮散射光环境。',
      watering: '每 10-15 天',
      sunlight: '明亮散射光',
      temperature: '10-28°C',
      fertilizer: '每 4 周'
    },
    '龟背竹': {
      commonName: '龟背竹',
      scientificName: 'Monstera deliciosa',
      family: '天南星科',
      emoji: '🍃',
      desc: '大型观叶植物，叶片开裂明显，适合客厅氛围场景。',
      watering: '每 4-6 天',
      sunlight: '明亮散射光',
      temperature: '18-30°C',
      fertilizer: '每 2-3 周'
    }
  };

  function safeRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizePlantName(name) {
    if (!name) return '绿萝';
    const trimmed = String(name).trim();
    const map = {
      'golden pothos': '绿萝',
      'epipremnum aureum': '绿萝',
      'monstera deliciosa': '龟背竹',
      'haworthia cooperi': '玉露'
    };
    return map[trimmed.toLowerCase()] || trimmed;
  }

  function pickEmoji(detail) {
    const text = `${detail.commonName || ''} ${detail.scientificName || ''}`.toLowerCase();
    if (text.includes('monstera') || text.includes('龟背竹')) return '🍃';
    if (text.includes('haworthia') || text.includes('玉露') || text.includes('succulent')) return '🌵';
    if (text.includes('pothos') || text.includes('epipremnum') || text.includes('绿萝')) return '🌿';
    return '🪴';
  }

  function mapPerenualDetail(payload, preferredName) {
    const detail = payload?.detail || {};
    const searchFirst = payload?.search?.data?.[0] || {};
    const commonName = normalizePlantName(preferredName || detail.common_name || searchFirst.common_name || '绿萝');
    const resultText = [detail.common_name, searchFirst.common_name]
      .concat(Array.isArray(detail.scientific_name) ? detail.scientific_name : [detail.scientific_name])
      .concat(Array.isArray(searchFirst.scientific_name) ? searchFirst.scientific_name : [searchFirst.scientific_name])
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const knownAliases = {
      '绿萝': ['golden pothos', 'epipremnum aureum'],
      '龟背竹': ['monstera deliciosa'],
      '玉露': ['haworthia cooperi']
    };
    const isRelevant = !preferredName || (knownAliases[commonName] || [commonName.toLowerCase()])
      .some((alias) => resultText.includes(alias));
    const scientificName = isRelevant && (Array.isArray(detail.scientific_name)
      ? detail.scientific_name[0]
      : Array.isArray(searchFirst.scientific_name)
        ? searchFirst.scientific_name[0]
        : detail.scientific_name || searchFirst.scientific_name || '');
    const family = isRelevant ? (detail.family || searchFirst.family || '') : '';
    const benchmark = detail.watering_general_benchmark?.value && detail.watering_general_benchmark?.unit
      ? `${String(detail.watering_general_benchmark.value).replace(/"/g, '')} ${detail.watering_general_benchmark.unit}`
      : '';
    return {
      id: detail.id || searchFirst.id || Date.now(),
      commonName,
      scientificName,
      family,
      subtitle: [scientificName, family].filter(Boolean).join(' · '),
      emoji: pickEmoji({ commonName, scientificName }),
      desc: isRelevant ? (detail.description || fallbackProfiles[commonName]?.desc || '已同步植物详情，适合继续开始种植与养护。') : '已完成识别；该植物暂未匹配到可靠的百科详情。',
      watering: isRelevant ? (benchmark || detail.watering || fallbackProfiles[commonName]?.watering || '每周观察土壤后浇水') : '请结合盆土干湿状况浇水',
      sunlight: isRelevant ? (Array.isArray(detail.sunlight) ? detail.sunlight.join(' / ') : detail.sunlight || fallbackProfiles[commonName]?.sunlight || '明亮散射光') : '明亮散射光',
      temperature: detail.temperature || fallbackProfiles[commonName]?.temperature || '15-28°C',
      fertilizer: fallbackProfiles[commonName]?.fertilizer || '每 2-4 周',
      maintenance: isRelevant ? (detail.maintenance || '中等') : '待确认',
      growthRate: isRelevant ? (detail.growth_rate || '中速') : '待确认',
      poisonousToPets: isRelevant && !!detail.poisonous_to_pets,
      defaultImage: '',
      raw: { isRelevant }
    };
  }

  function normalizeError(error) {
    if (!error) return '未知错误，请稍后重试';
    const msg = String(error.message || error);
    const userFriendly = {
      'INVALID_API_KEY': '🔑 百度识花凭证无效，请检查配置',
      'BAIDU_TOKEN_FAILED': '🔄 百度认证服务暂时不可用，请稍后重试',
      'TOKEN_EXPIRED': '🔄 百度认证已过期，请稍后重试',
      'IMAGE_INVALID': '🖼️ 图片数据无效，请重新上传',
      'IMAGE_TOO_SMALL': '📐 图片太小，请上传更大的照片',
      'IMAGE_BLUR': '📷 图片模糊，请上传更清晰的照片',
      'IMAGE_FORMAT': '📄 图片格式不支持，请使用 JPG/PNG',
      'NO_RESULT': '🔍 未识别出植物，试试拍得更近一些',
      'PERENUAL_FAILED': '📚 植物百科服务暂时不可用',
      'PERENUAL_KEY_MISSING': '🔑 植物百科凭证缺失'
    };
    for (const [key, friendly] of Object.entries(userFriendly)) {
      if (msg.includes(key)) return friendly;
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return '🌐 网络连接失败，请检查网络后重试';
    }
    return msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error(`SERVER_ERROR：服务端返回异常，请稍后重试（HTTP ${response.status}）`);
    }

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `请求失败：${response.status}`);
    }

    return data;
  }

  async function compressImage(file, maxWidth = 1500, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('压缩失败'));
              const r = new FileReader();
              r.onload = () => resolve({ dataUrl: r.result, sizeKB: Math.round(blob.size / 1024) });
              r.onerror = reject;
              r.readAsDataURL(blob);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function identifyPlant(imageBase64) {
    let result;
    try {
      result = await requestJson('/api/identify-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });
    } catch (error) {
      throw new Error(normalizeError(error));
    }

    const first = result?.data?.result?.[0];
    if (!first) {
      throw new Error(normalizeError(new Error('NO_RESULT')));
    }

    const plantName = normalizePlantName(first.name || first.keyword || '绿萝');
    const baiduImage = first.baike_info?.image_url || '';
    const saved = {
      plantName,
      score: first.score || 0,
      baiduImage,
      userImage: imageBase64,
      raw: result.data,
      recognizedAt: new Date().toISOString()
    };
    safeWrite(STORAGE_KEYS.lastRecognition, saved);
    return saved;
  }

  async function fetchPlantDetail(name) {
    try {
      const result = await requestJson(`/api/plant-detail?name=${encodeURIComponent(name)}`);
      return mapPerenualDetail(result.data, name);
    } catch (error) {
      throw new Error(normalizeError(error));
    }
  }

  function getFavorites() {
    return safeRead(STORAGE_KEYS.favorites, []);
  }

  function saveFavorite(plant) {
    const list = getFavorites();
    const exists = list.find(item => item.commonName === plant.commonName);
    if (exists) return { added: false, list };
    const next = [{
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      family: plant.family,
      emoji: plant.emoji,
      desc: plant.desc,
      addedAt: new Date().toISOString(),
      tags: buildTags(plant)
    }, ...list];
    safeWrite(STORAGE_KEYS.favorites, next);
    return { added: true, list: next };
  }

  function removeFavorite(name) {
    const next = getFavorites().filter(item => item.commonName !== name);
    safeWrite(STORAGE_KEYS.favorites, next);
    return next;
  }

  function getMyPlants() {
    return safeRead(STORAGE_KEYS.plants, []);
  }

  function saveMyPlant(plantRecord) {
    const list = getMyPlants();
    const next = [{ id: Date.now(), createdAt: new Date().toISOString(), ...plantRecord }, ...list];
    safeWrite(STORAGE_KEYS.plants, next);
    return next;
  }

  function buildTags(plant) {
    const tags = [];
    const text = `${plant.commonName} ${plant.scientificName} ${plant.desc}`;
    if (/绿萝|pothos|monstera|玉露|新手|容易/.test(text)) tags.push('新手友好');
    if (/阴|shade|散射光/.test(text)) tags.push('耐阴植物');
    if (/玉露|小型|桌面/.test(text)) tags.push('桌面小型');
    if (/叶|观叶|pothos|monstera/.test(text)) tags.push('观叶类');
    return tags.length ? tags : ['新手友好'];
  }

  function getLastRecognition() {
    return safeRead(STORAGE_KEYS.lastRecognition, null);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.ZhiWuApp = {
    STORAGE_KEYS,
    fallbackProfiles,
    normalizePlantName,
    mapPerenualDetail,
    compressImage,
    identifyPlant,
    fetchPlantDetail,
    getFavorites,
    saveFavorite,
    removeFavorite,
    getMyPlants,
    saveMyPlant,
    getLastRecognition,
    buildTags,
    fileToBase64
  };
})();
