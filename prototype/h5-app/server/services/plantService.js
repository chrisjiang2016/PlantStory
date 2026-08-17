async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 500)}`);
  }
}

async function getBaiduAccessToken() {
  const apiKey = process.env.BAIDU_AI_API_KEY;
  const secretKey = process.env.BAIDU_AI_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('MISSING_CREDENTIALS：缺少 BAIDU_AI_API_KEY 或 BAIDU_AI_SECRET_KEY，请检查 .env 文件');
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`;
  const response = await fetch(url, { method: 'POST' });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`BAIDU_TOKEN_FAILED：百度认证服务返回异常（HTTP ${response.status}），请稍后重试`);
  }

  if (data.error) {
    if (data.error === 'invalid_client') {
      throw new Error('INVALID_API_KEY：API Key 或 Secret Key 无效，请检查 .env 中的百度凭证');
    }
    throw new Error(`BAIDU_TOKEN_ERROR：${data.error_description || data.error}`);
  }

  if (!data.access_token) {
    throw new Error('BAIDU_TOKEN_EMPTY：百度认证成功但未返回 access_token，请稍后重试');
  }

  return data;
}

async function identifyPlantByImageBase64(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('IMAGE_INVALID：图片数据无效，请重新上传');
  }

  const tokenData = await getBaiduAccessToken();
  const accessToken = tokenData.access_token;

  const normalized = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  if (!normalized || normalized.length < 100) {
    throw new Error('IMAGE_TOO_SMALL：图片数据过小，请上传清晰的植物照片');
  }

  const body = new URLSearchParams({ image: normalized, baike_num: 5 });

  const response = await fetch(`https://aip.baidubce.com/rest/2.0/image-classify/v1/plant?access_token=${accessToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`BAIDU_API_FAILED：百度识花服务返回异常（HTTP ${response.status}），请稍后重试`);
  }

  if (data.error_code) {
    const errorMap = {
      216201: 'IMAGE_EMPTY：未检测到植物图片，请上传包含植物的照片',
      216202: 'IMAGE_BLUR：图片模糊，请上传更清晰的照片',
      216203: 'IMAGE_FORMAT：图片格式不支持，请使用 JPG/PNG 格式',
      110: 'TOKEN_EXPIRED：百度认证已过期，请稍后重试',
      111: 'TOKEN_INVALID：百度认证无效，请稍后重试'
    };
    throw new Error(errorMap[data.error_code] || `BAIDU_ERROR[${data.error_code}]：${data.error_msg || '识花服务异常'}`);
  }

  if (!data.result || data.result.length === 0) {
    throw new Error('NO_RESULT：未识别出植物，请尝试更换角度或更清晰的照片');
  }

  return data;
}

async function searchPlantDetail(name) {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) {
    throw new Error('PERENUAL_KEY_MISSING：缺少 PERENUAL_API_KEY，请检查 .env 文件');
  }

  const searchUrl = `https://perenual.com/api/v2/species-list?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(name)}`;
  const searchResponse = await fetch(searchUrl);
  const searchText = await searchResponse.text();
  let searchData;
  try {
    searchData = JSON.parse(searchText);
  } catch (e) {
    throw new Error('PERENUAL_FAILED：植物百科服务返回异常，请稍后重试');
  }

  if (!searchResponse.ok) {
    throw new Error(`PERENUAL_ERROR[${searchResponse.status}]：植物百科服务异常`);
  }

  const first = searchData?.data?.[0];
  if (!first) {
    return { search: searchData, detail: null };
  }

  const detailUrl = `https://perenual.com/api/v2/species/details/${first.id}?key=${encodeURIComponent(apiKey)}`;
  const detailResponse = await fetch(detailUrl);
  const detailText = await detailResponse.text();
  let detailData;
  try {
    detailData = JSON.parse(detailText);
  } catch (e) {
    throw new Error('PERENUAL_DETAIL_FAILED：植物详情服务返回异常，请稍后重试');
  }

  if (!detailResponse.ok) {
    throw new Error(`PERENUAL_DETAIL_ERROR[${detailResponse.status}]：植物详情服务异常`);
  }

  return {
    search: searchData,
    detail: detailData
  };
}

module.exports = {
  getBaiduAccessToken,
  identifyPlantByImageBase64,
  searchPlantDetail
};
