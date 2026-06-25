// EXPORTS: MOCK_DISHES, IDish, IIngredients

export interface IIngredients {
  vegetables: string[];
  meat_eggs: string[];
  seasonings: string[];
}

export interface IDish {
  name: string;
  type: 'meat' | 'veg' | 'soup' | 'staple';
  cook_time: string;
  calories?: string;
  ingredients: IIngredients;
  steps: string[];
}

export const MOCK_DISHES: IDish[] = [
  {
    name: '番茄炒蛋',
    type: 'meat',
    cook_time: '10分钟',
    calories: '280千卡',
    ingredients: {
      vegetables: ['番茄', '葱'],
      meat_eggs: ['鸡蛋'],
      seasonings: ['盐', '糖', '食用油'],
    },
    steps: [
      '番茄切块，鸡蛋打散加少许盐搅匀',
      '热锅冷油，倒入蛋液炒至凝固盛出',
      '锅中再加油，放入番茄块翻炒出汁',
      '倒回鸡蛋，加盐、糖调味，翻炒均匀出锅',
    ],
  },
  {
    name: '清炒时蔬',
    type: 'veg',
    cook_time: '8分钟',
    calories: '120千卡',
    ingredients: {
      vegetables: ['青菜', '蒜'],
      meat_eggs: [],
      seasonings: ['盐', '食用油'],
    },
    steps: [
      '青菜洗净切段，蒜切片',
      '热锅冷油，爆香蒜片',
      '放入青菜大火快炒，加盐调味出锅',
    ],
  },
  {
    name: '紫菜蛋花汤',
    type: 'soup',
    cook_time: '5分钟',
    calories: '60千卡',
    ingredients: {
      vegetables: ['紫菜', '葱'],
      meat_eggs: ['鸡蛋'],
      seasonings: ['盐', '香油'],
    },
    steps: [
      '锅中烧水，紫菜撕碎备用',
      '水开后放入紫菜，鸡蛋打散淋入锅中',
      '加盐调味，滴几滴香油，撒葱花出锅',
    ],
  },
  {
    name: '白米饭',
    type: 'staple',
    cook_time: '30分钟',
    calories: '400千卡',
    ingredients: {
      vegetables: [],
      meat_eggs: [],
      seasonings: ['大米', '水'],
    },
    steps: [
      '大米淘洗两遍',
      '按米水比例1:1.2加水',
      '电饭煲按下煮饭键，跳闸后焖5分钟即可',
    ],
  },
  {
    name: '青椒肉丝',
    type: 'meat',
    cook_time: '12分钟',
    calories: '320千卡',
    ingredients: {
      vegetables: ['青椒', '姜', '蒜'],
      meat_eggs: ['猪里脊肉'],
      seasonings: ['生抽', '料酒', '淀粉', '盐', '食用油'],
    },
    steps: [
      '猪里脊切丝，加料酒、生抽、淀粉腌制10分钟',
      '青椒切丝，姜蒜切末',
      '热锅冷油，下肉丝滑炒至变色盛出',
      '锅中留底油，爆香姜蒜，下青椒翻炒',
      '倒回肉丝，加盐调味，翻炒均匀出锅',
    ],
  },
];
