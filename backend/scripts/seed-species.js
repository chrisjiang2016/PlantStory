const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');
const db = new sqlite3.Database(dbPath);

const species = [
  { 
    name: '绿萝', 
    scientificName: 'Epipremnum aureum',
    family: '天南星科',
    genus: 'Epipremnum',
    watering: 'moderate', 
    sunlight: 'partial',
    description: '绿萝是一种非常容易养护的室内观叶植物，适合初学者。',
    imageUrl: 'https://example.com/pothos.jpg'
  },
  { 
    name: '发财树', 
    scientificName: 'Pachira aquatica',
    family: '木棉科',
    genus: 'Pachira',
    watering: 'low', 
    sunlight: 'partial',
    description: '发财树寓意吉祥，是常见的室内观赏植物。',
    imageUrl: 'https://example.com/money-tree.jpg'
  },
  { 
    name: '多肉植物', 
    scientificName: 'Succulent',
    family: '景天科',
    genus: 'Sedum',
    watering: 'low', 
    sunlight: 'full',
    description: '多肉植物耐旱，适合忙碌的养护者。',
    imageUrl: 'https://example.com/succulent.jpg'
  },
  { 
    name: '吊兰', 
    scientificName: 'Chlorophytum comosum',
    family: '百合科',
    genus: 'Chlorophytum',
    watering: 'moderate', 
    sunlight: 'partial',
    description: '吊兰具有净化空气的作用，是常见的室内植物。',
    imageUrl: 'https://example.com/spider-plant.jpg'
  },
  { 
    name: '虎皮兰', 
    scientificName: 'Sansevieria trifasciata',
    family: '百合科',
    genus: 'Sansevieria',
    watering: 'low', 
    sunlight: 'partial',
    description: '虎皮兰耐阴耐旱，是非常适合室内养护的植物。',
    imageUrl: 'https://example.com/snake-plant.jpg'
  }
];

db.serialize(() => {
  const stmt = db.prepare(`
    INSERT INTO plant_species (
      name, scientific_name, family, genus, watering, sunlight, description, image_url, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  species.forEach(s => {
    stmt.run(
      s.name, 
      s.scientificName, 
      s.family, 
      s.genus, 
      s.watering, 
      s.sunlight, 
      s.description,
      s.imageUrl
    );
  });

  stmt.finalize();

  db.all("SELECT * FROM plant_species", (err, rows) => {
    if (err) {
      console.error('❌ 错误:', err);
    } else {
      console.log('✓ 已插入物种数据：');
      rows.forEach(r => console.log(`  ${r.id}. ${r.name} (${r.scientific_name}) - ${r.watering} water, ${r.sunlight} sun`));
    }
    db.close();
  });
});
