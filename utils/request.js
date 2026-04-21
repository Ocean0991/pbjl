const { API_BASE_URL, STORAGE_KEYS } = require('./config');

class Request {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = 10000;
  }

  getStorageToken() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.USER_TOKEN) || '';
    } catch (error) {
      return '';
    }
  }

  interceptors(request) {
    const token = this.getStorageToken();
    if (token) {
      request.header = request.header || {};
      request.header.Authorization = `Bearer ${token}`;
    }
    return request;
  }

  handleResponse(response) {
    const { statusCode, data } = response;
    
    if (statusCode === 401) {
      wx.removeStorageSync(STORAGE_KEYS.USER_TOKEN);
      wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
      wx.reLaunch({
        url: '/pages/welcome/index'
      });
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    if (statusCode === 200 || statusCode === 201) {
      return data;
    }
    
    const errorMessage = data && data.message ? data.message : '请求失败';
    wx.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000
    });
    
    return Promise.reject(new Error(errorMessage));
  }

  handleError(error) {
    console.error('Request error:', error);
    
    wx.showToast({
      title: '网络请求失败',
      icon: 'none',
      duration: 2000
    });
    
    return Promise.reject(error);
  }

  request(options) {
    const defaultOptions = {
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      timeout: this.timeout
    };

    const mergedOptions = Object.assign({}, defaultOptions, options);
    mergedOptions.url = this.baseURL + mergedOptions.url;
    
    this.interceptors(mergedOptions);

    return new Promise((resolve, reject) => {
      wx.request({
        ...mergedOptions,
        success: (res) => {
          this.handleResponse(res).then(resolve).catch(reject);
        },
        fail: (error) => {
          this.handleError(error).catch(reject);
        }
      });
    });
  }

  get(url, data) {
    return this.request({
      url,
      method: 'GET',
      data
    });
  }

  post(url, data) {
    return this.request({
      url,
      method: 'POST',
      data
    });
  }

  put(url, data) {
    return this.request({
      url,
      method: 'PUT',
      data
    });
  }

  delete(url, data) {
    return this.request({
      url,
      method: 'DELETE',
      data
    });
  }

  upload(url, filePath, formData) {
    return new Promise((resolve, reject) => {
      const token = this.getStorageToken();
      
      wx.uploadFile({
        url: this.baseURL + url,
        filePath,
        name: 'file',
        formData,
        header: {
          Authorization: `Bearer ${token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            this.handleError(new Error(data.message || '上传失败')).catch(reject);
          }
        },
        fail: (error) => {
          this.handleError(error).catch(reject);
        }
      });
    });
  }
}

const request = new Request();

module.exports = request;
