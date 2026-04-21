---
name: "wechat-mini-program-development"
description: "微信小程序开发标准化工作流程与规范。包含标准目录结构、统一请求封装、API管理、登录检查等。用于新建小程序项目或重构现有项目。"
---

# 微信小程序开发技能

## 核心功能

- **标准项目目录结构**
- **统一请求封装（带拦截器）**
- **集中式API管理**
- **配置文件规范**
- **全局登录检查**
- **工具函数库**

## 使用场景

- 新建微信小程序demo项目
- 重构现有小程序项目
- 结合技能新开发小程序完整项目
- 团队统一小程序开发规范

## 项目结构

```
小程序项目/
├── app.js              # 带全局登录检查
├── app.json            # 带TabBar配置
├── utils/
│   ├── config.js       # 配置文件
│   ├── api.js          # API统一管理
│   ├── request.js      # 请求封装
│   └── util.js         # 工具函数
└── pages/              # 标准页面结构
```

## 技术规范

- 使用CommonJS（module.exports）
- 401跳转使用wx.reLaunch
- 统一的错误处理
- 模块化设计

## 调用示例

```
用 wechat-mini-program-development skill 创建一个新的微信小程序项目
使用 wechat-mini-program-development 技能帮我开发一个电商小程序
```