const ENV = {
  DEV: 'development',
  PROD: 'production'
};

const CURRENT_ENV = ENV.PROD;

const CONFIG = {
  [ENV.DEV]: {
    apiBaseUrl: 'http://localhost:3000/api',
    cloudEnvId: 'dev-cloud-id',
    appId: 'wx-dev-app-id'
  },
  [ENV.PROD]: {
    apiBaseUrl: 'https://api.runna-clone.com/api',
    cloudEnvId: 'prod-cloud-id',
    appId: 'wx-prod-app-id'
  }
};

module.exports = {
  ENV,
  CURRENT_ENV,
  getConfig: () => CONFIG[CURRENT_ENV],
  API_BASE_URL: CONFIG[CURRENT_ENV].apiBaseUrl,
  CLOUD_ENV_ID: CONFIG[CURRENT_ENV].cloudEnvId,
  APP_ID: CONFIG[CURRENT_ENV].appId,
  
  STORAGE_KEYS: {
    USER_TOKEN: 'runna_user_token',
    USER_INFO: 'runna_user_info',
    TRAINING_PLAN: 'runna_training_plan',
    RECORDS: 'runna_records',
    SETTINGS: 'runna_settings'
  },
  
  DEFAULT_VALUES: {
    TRAINING_DAYS_PER_WEEK: 3,
    GOAL_TYPE: 'standard_finish',
    MAX_HEART_RATE_FORMULA: age => 220 - age
  },
  
  HEART_RATE_ZONES: {
    recovery: { min: 0.50, max: 0.65 },
    easy: { min: 0.60, max: 0.72 },
    long: { min: 0.65, max: 0.78 },
    quality: { min: 0.75, max: 0.85 },
    cross: { min: 0.60, max: 0.70 }
  },
  
  TRAINING_PHASES: {
    base: '基础期',
    build: '提升期',
    peak: '巅峰期',
    taper: '减量期',
    race: '比赛期'
  },
  
  RISK_LEVELS: {
    low: '低风险',
    medium: '中风险',
    high: '高风险'
  },
  
  GOAL_TYPES: {
    standard_finish: '稳完赛',
    conservative_finish: '更保守完赛',
    run_walk_finish: '跑走结合完赛',
    pb: '追求PB'
  }
};
