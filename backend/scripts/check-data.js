const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('=== 用户列表 ===');
  db.all("SELECT id, username, nickname FROM users ORDER BY id DESC LIMIT 5", (err, rows) => {
    if (err) console.error(err);
    else rows.forEach(r => console.log(`  ${r.id}. ${r.username} (${r.nickname})`));
  });

  console.log('\n=== 植物列表 ===');
  db.all(`
    SELECT mp.id, mp.user_id, mp.nickname, mp.location, u.username, ps.name as species_name
    FROM my_plants mp
    JOIN users u ON mp.user_id = u.id
    JOIN plant_species ps ON mp.species_id = ps.id
    ORDER BY mp.id DESC
  `, (err, rows) => {
    if (err) console.error(err);
    else {
      rows.forEach(r => console.log(`  Plant ${r.id}: ${r.nickname} (${r.species_name}) - user: ${r.username} (ID: ${r.user_id})`));
    }
  });

  console.log('\n=== 提醒列表 ===');
  db.all(`
    SELECT r.id, r.user_id, r.title, r.care_type, u.username
    FROM reminders r
    JOIN users u ON r.user_id = u.id
    ORDER BY r.id DESC
  `, (err, rows) => {
    if (err) console.error(err);
    else {
      rows.forEach(r => console.log(`  Reminder ${r.id}: ${r.title} (${r.care_type}) - user: ${r.username} (ID: ${r.user_id})`));
    }
    db.close();
  });
});
