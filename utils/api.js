const request = require('./request');

const API = {
  user: {
    login: (data) => request.post('/user/login', data),
    register: (data) => request.post('/user/register', data),
    getProfile: () => request.get('/user/profile'),
    updateProfile: (data) => request.put('/user/profile', data),
    deleteAccount: () => request.delete('/user/account')
  },

  plan: {
    generate: (data) => request.post('/plan/generate', data),
    getCurrent: () => request.get('/plan/current'),
    getByDate: (date) => request.get(`/plan/date/${date}`),
    update: (id, data) => request.put(`/plan/${id}`, data),
    rebuild: (data) => request.post('/plan/rebuild', data),
    adjust: (id, data) => request.put(`/plan/${id}/adjust`, data),
    getHistory: () => request.get('/plan/history')
  },

  training: {
    getToday: () => request.get('/training/today'),
    getByDate: (date) => request.get(`/training/date/${date}`),
    getWeek: (weekIndex) => request.get(`/training/week/${weekIndex}`),
    complete: (data) => request.post('/training/complete', data),
    feedback: (data) => request.post('/training/feedback', data),
    getRecords: (params) => request.get('/training/records', params)
  },

  load: {
    getCurrent: () => request.get('/load/current'),
    getHistory: (days) => request.get(`/load/history/${days}`),
    getTrend: () => request.get('/load/trend')
  },

  prediction: {
    get: (distance) => request.get(`/prediction/${distance}`),
    update: (data) => request.put('/prediction', data)
  },

  coach: {
    ask: (data) => request.post('/coach/ask', data),
    getHistory: () => request.get('/coach/history'),
    getSessions: () => request.get('/coach/sessions'),
    bookSession: (data) => request.post('/coach/sessions', data)
  },

  race: {
    getList: () => request.get('/race/list'),
    getDetail: (id) => request.get(`/race/${id}`),
    register: (data) => request.post('/race/register', data),
    getMyRaces: () => request.get('/race/my-races'),
    getResult: (id) => request.get(`/race/${id}/result`)
  },

  community: {
    getPosts: (params) => request.get('/community/posts', params),
    createPost: (data) => request.post('/community/posts', data),
    likePost: (id) => request.post(`/community/posts/${id}/like`),
    comment: (id, data) => request.post(`/community/posts/${id}/comment`, data),
    getGroups: () => request.get('/community/groups'),
    joinGroup: (id) => request.post(`/community/groups/${id}/join`)
  },

  challenge: {
    getList: () => request.get('/challenge/list'),
    join: (id) => request.post(`/challenge/${id}/join`),
    getProgress: (id) => request.get(`/challenge/${id}/progress`),
    getMyChallenges: () => request.get('/challenge/my-challenges')
  },

  shoe: {
    getList: () => request.get('/shoe/list'),
    add: (data) => request.post('/shoe', data),
    update: (id, data) => request.put(`/shoe/${id}`, data),
    delete: (id) => request.delete(`/shoe/${id}`),
    updateMileage: (id, distance) => request.put(`/shoe/${id}/mileage`, { distance })
  },

  subscription: {
    getPlans: () => request.get('/subscription/plans'),
    getCurrent: () => request.get('/subscription/current'),
    subscribe: (data) => request.post('/subscription/subscribe', data),
    cancel: () => request.post('/subscription/cancel')
  },

  upload: {
    image: (filePath) => request.upload('/upload/image', filePath),
    file: (filePath, formData) => request.upload('/upload/file', filePath, formData)
  }
};

module.exports = API;
