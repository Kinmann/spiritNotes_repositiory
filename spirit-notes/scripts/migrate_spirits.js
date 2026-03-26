const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // I'll need to check if this exists or use default

// If running in environment with default credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'antigravity-dd7c2'
  });
}

const db = admin.firestore();

const spiritMigrationData = {
  '4SfepyxW7Ye1Q46FFLw2': { // Springbank 10Y
    distilleryId: 'springbank-distillery',
    info: { title: 'Slow Matured', description: '전통적인 캄벨타운 방식으로 숙성되어 46% ABV의 풍부한 힘을 고스란히 간직하고 있습니다.' }
  },
  '54nXY3Lgkfab2R80zdxS': { // Macallan 12Y
    distilleryId: 'macallan-distillery',
    info: { title: 'Sherry Oak Cask', description: '최고급 쉐리 오크통에서 숙성되어 깊고 풍부한 풍미를 자랑합니다.' }
  },
  'M8k94sltZgy1Hz9nNliw': { // Ardbeg 10Y
    distilleryId: 'ardbeg-distillery',
    info: { title: 'Ultimate Islay Malt', description: '강렬한 피트 향과 섬세한 단맛이 완벽한 균형을 이루는 아일라의 대표 주자입니다.' }
  },
  '7Rt8a8KXxyZQBOEbcHBL': { // Hibiki
    distilleryId: 'suntory',
    info: { title: 'Japanese Harmony', description: '일본의 사계를 담은 24절기를 상징하는 병 디자인과 정교한 블렌딩이 특징입니다.' }
  },
  'VNsUCMo9JjHxufGRCNlC': { // Aberlour 12Y
    distilleryId: 'aberlour-distillery',
    info: { title: 'Double Cask Matured', description: '쉐리 캐스크와 버번 캐스크에서 각각 숙성된 원액을 합쳐 과일 향과 스파이시함이 조화롭습니다.' }
  },
  'VY07i1pXQFkGjrJJARvP': { // Glenfiddich 12Y
    distilleryId: 'glenfiddich-distillery',
    info: { title: 'Pioneering Spirit', description: '세계에서 가장 많이 팔리는 싱글 몰트로, 신선한 배의 향과 부드러운 목넘김이 일품입니다.' }
  },
  'cE27L2aZaBjZR2GMXzPC': { // Lagavulin 16Y
    distilleryId: 'lagavulin-distillery',
    info: { title: 'King of Islay', description: '긴 숙성 시간만큼이나 깊고 묵직한 탄 향과 드라이한 풍미를 지니고 있습니다.' }
  },
  '8hw5ee2dQstVuu8J2leP': { // Balvenie 12Y
    distilleryId: 'william-grant-sons',
    info: { title: 'DoubleWood 12', description: '전통적인 오크통에서 쉐리 오크통으로 옮겨 숙성하는 \'피니시\' 기법의 선구자입니다.' }
  },
  'B0uxTSDBTjjij2swmHUH': { // Yamazaki 12Y
    distilleryId: 'suntory-yamazaki-distillery',
    info: { title: 'Deep & Multi-layered', description: '미즈나라 오크통 숙성 특유의 향기로운 나무 향과 과일의 단맛이 층층이 쌓여있습니다.' }
  },
  'Dn9V6u75icRxwdIiE0ZP': { // Ballantine\'s 17Y
    distilleryId: 'ballantines',
    info: { title: 'The Original', description: '40여 가지 이상의 엄선된 몰트와 그레인 위스키를 블렌딩하여 우아하고 균형 잡힌 맛을 냅니다.' }
  },
  'GtcfupHukVQMDG4fe1Gx': { // Hendrick\'s Gin
    distilleryId: 'william-grant-sons',
    info: { title: 'Curiously Small Batch', description: '장미 꽃잎과 오이 추출물을 더해 기존 진에서는 찾아볼 수 없는 독특하고 상쾌한 향이 느껴집니다.' }
  },
  '5u8YlHFDKIyUfwVz4PvH': { // Opus One 2019
    distilleryId: 'opus-one-winery',
    info: { title: 'Napa Valley Red Wine', description: '로버트 먼다비와 바론 필립 드 로칠드가 합작하여 만든 전설적인 나파 밸리 레드 와인입니다.' }
  },
  'XX9othMhxTceNK3uHWy3': { // Chateau Margaux 2017
    distilleryId: 'chateau-margaux',
    info: { title: 'Premier Grand Cru Classé', description: '5대 샤토 중 가장 우아하고 여성적이라고 평가받으며, 실크처럼 부드러운 타닌이 특징입니다.' }
  },
  'diuDpqTAgz4tTzfQSK5N': { // Screaming Eagle 2019
    distilleryId: 'screaming-eagle-winery',
    info: { title: 'Cult Wine', description: '미국 컬트 와인의 정점으로 불리며, 매년 극소량만 생산되어 전 세계 수집가들의 목표가 됩니다.' }
  }
};

async function migrate() {
  const batch = db.batch();
  
  for (const [id, data] of Object.entries(spiritMigrationData)) {
    const ref = db.collection('spirits').doc(id);
    batch.update(ref, {
      distilleryId: data.distilleryId,
      info: data.info,
      distillery: admin.firestore.FieldValue.delete(),
      description: admin.firestore.FieldValue.delete()
    });
  }
  
  await batch.commit();
  console.log('Migration completed successfully');
}

migrate().catch(console.error);
