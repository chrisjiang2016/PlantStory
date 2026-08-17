const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始插入测试数据...\n');

  // 1. 插入测试物种
  const species = [
    {
      name: '绿萝',
      commonName: '绿萝',
      scientificName: 'Epipremnum aureum',
      imageUrl: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bb6?w=400',
      watering: '每周1-2次，保持土壤湿润',
      sunlight: '散射光或半阴环境',
      cycle: '多年生',
    },
    {
      name: '多肉植物',
      commonName: '多肉',
      scientificName: 'Succulent',
      imageUrl: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=400',
      watering: '每2-3周1次，土壤完全干透后浇水',
      sunlight: '充足的阳光',
      cycle: '多年生',
    },
    {
      name: '发财树',
      commonName: '发财树',
      scientificName: 'Pachira aquatica',
      imageUrl: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400',
      watering: '每1-2周1次，避免积水',
      sunlight: '明亮散射光',
      cycle: '多年生',
    },
  ];

  for (const s of species) {
    const created = await prisma.plantSpecies.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    console.log(`✓ 物种: ${created.name} (ID: ${created.id})`);
  }

  // 2. 查找测试用户
  const user = await prisma.user.findFirst({
    where: { username: 'fluttertest' },
  });

  if (!user) {
    console.log('\n⚠️  未找到用户 fluttertest，请先注册');
    return;
  }

  console.log(`\n✓ 找到用户: ${user.username} (ID: ${user.id})\n`);

  // 3. 为用户添加植物
  const speciesData = await prisma.plantSpecies.findMany({
    where: { name: { in: ['绿萝', '多肉植物', '发财树'] } },
  });

  const plants = [
    {
      userId: user.id,
      speciesId: speciesData.find((s) => s.name === '绿萝').id,
      nickname: '客厅的小绿',
      location: '客厅窗台',
      currentStage: 'growing',
    },
    {
      userId: user.id,
      speciesId: speciesData.find((s) => s.name === '多肉植物').id,
      nickname: '阳台多肉',
      location: '阳台',
      currentStage: 'mature',
    },
    {
      userId: user.id,
      speciesId: speciesData.find((s) => s.name === '发财树').id,
      nickname: '书房的发财树',
      location: '书房',
      currentStage: 'growing',
    },
  ];

  const createdPlants = [];
  for (const p of plants) {
    const created = await prisma.myPlant.create({ data: p });
    console.log(`✓ 植物: ${created.nickname} (ID: ${created.id})`);
    createdPlants.push(created);
  }

  // 4. 为每个植物添加提醒
  const now = new Date();
  const reminders = [
    {
      userId: user.id,
      myPlantId: createdPlants[0].id,
      title: '浇水提醒',
      careType: 'water',
      remindAt: new Date(now.getTime() + 1 * 60 * 60 * 1000), // 1小时后
      isCompleted: false,
    },
    {
      userId: user.id,
      myPlantId: createdPlants[1].id,
      title: '施肥提醒',
      careType: 'fertilize',
      remindAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2天后
      repeatRule: 'weekly',
      isCompleted: false,
    },
    {
      userId: user.id,
      myPlantId: createdPlants[2].id,
      title: '修剪提醒',
      careType: 'prune',
      remindAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7天后
      isCompleted: false,
    },
  ];

  console.log('\n');
  for (const r of reminders) {
    const created = await prisma.reminder.create({ data: r });
    console.log(`✓ 提醒: ${created.title} → ${created.remindAt.toLocaleString()}`);
  }

  console.log('\n✅ 测试数据插入完成！');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
