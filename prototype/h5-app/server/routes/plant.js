const express = require('express');
const { getBaiduAccessToken, identifyPlantByImageBase64, searchPlantDetail } = require('../services/plantService');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'api ok' });
});

router.get('/baidu-token', async (req, res) => {
  try {
    const data = await getBaiduAccessToken();
    // Never return access_token / refresh_token / session credentials to the browser.
    res.json({ ok: true, data: { authenticated: true, expiresIn: data.expires_in } });
  } catch (error) {
    console.error('Baidu token request failed:', error);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR：服务暂时不可用，请稍后重试' });
  }
});

router.post('/identify-plant', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'imageBase64 is required' });
    }

    const data = await identifyPlantByImageBase64(imageBase64);
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Plant identification failed:', error);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR：服务暂时不可用，请稍后重试' });
  }
});

router.get('/plant-detail', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({ ok: false, error: 'name is required' });
    }

    const data = await searchPlantDetail(name);
    // The upstream payload contains signed URLs with the Perenual API key.
    // Return only the fields consumed by the H5 client.
    const detail = data?.detail;
    const search = data?.search;
    res.json({
      ok: true,
      data: {
        search: { data: (search?.data || []).slice(0, 5).map(({ id, common_name, scientific_name, family }) => ({ id, common_name, scientific_name, family })) },
        detail: detail ? {
          id: detail.id,
          common_name: detail.common_name,
          scientific_name: detail.scientific_name,
          family: detail.family,
          watering: detail.watering,
          watering_general_benchmark: detail.watering_general_benchmark,
          sunlight: detail.sunlight,
          maintenance: detail.maintenance,
          growth_rate: detail.growth_rate,
          poisonous_to_pets: detail.poisonous_to_pets,
          description: detail.description
        } : null
      }
    });
  } catch (error) {
    console.error('Plant detail request failed:', error);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR：服务暂时不可用，请稍后重试' });
  }
});

module.exports = router;
