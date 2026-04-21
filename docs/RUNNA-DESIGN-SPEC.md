# Runna 设计规范 - 一比一复刻版

## 设计理念

**核心原则：小而垂直、专注跑步教练**

- 只做跑步训练相关的核心功能
- 界面简洁、信息层级清晰
- 大字体、易读性强
- 黑白为主、强调功能性
- 每个界面只展示最关键的信息

---

## 一、配色方案

### 主色调
```
Primary Black: #000000
Primary White: #FFFFFF
```

### 功能色
```
Success Green: #34C759
Warning Orange: #FF9500
Error Red: #FF3B30
Info Blue: #007AFF
```

### 灰度体系
```
Gray 1 (文字主色): #1C1C1E
Gray 2 (文字次色): #3A3A3C
Gray 3 (文字辅助): #636366
Gray 4 (分割线): #C7C7CC
Gray 5 (背景浅灰): #F2F2F7
Gray 6 (背景深灰): #E5E5EA
```

### 训练类型颜色
```
Easy Run: #34C759 (绿色)
Long Run: #007AFF (蓝色)
Quality: #FF9500 (橙色)
Recovery: #8E8E93 (灰色)
Strength: #AF52DE (紫色)
Rest: #E5E5EA (浅灰)
```

---

## 二、字体规范

### 字体家族
```
Primary Font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
Chinese Font: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"
```

### 字号层级
```
H1 (大标题): 32px / Bold / 行高 40px
H2 (页面标题): 24px / Semibold / 行高 32px
H3 (卡片标题): 20px / Semibold / 行高 28px
H4 (小标题): 18px / Medium / 行高 24px
Body (正文): 16px / Regular / 行高 24px
Caption (说明文字): 14px / Regular / 行高 20px
Small (辅助文字): 12px / Regular / 行高 16px
```

### 字重
```
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
```

---

## 三、间距规范

### 基础单位
```
Base Unit: 4px
```

### 常用间距
```
XXS: 4px
XS: 8px
S: 12px
M: 16px
L: 24px
XL: 32px
XXL: 48px
```

### 页面边距
```
Horizontal Padding: 16px (左右边距)
Vertical Padding: 24px (上下边距)
```

---

## 四、组件规范

### 1. 按钮

#### 主按钮（Primary Button）
```
Height: 56px
Padding: 16px 24px
Background: #000000
Text Color: #FFFFFF
Font Size: 18px
Font Weight: Semibold
Border Radius: 12px
```

#### 次按钮（Secondary Button）
```
Height: 48px
Padding: 12px 20px
Background: #F2F2F7
Text Color: #1C1C1E
Font Size: 16px
Font Weight: Medium
Border Radius: 12px
```

#### 文字按钮（Text Button）
```
Height: 44px
Padding: 8px 16px
Background: Transparent
Text Color: #007AFF
Font Size: 16px
Font Weight: Medium
```

### 2. 卡片

#### 训练卡片
```
Background: #FFFFFF
Padding: 20px
Border Radius: 16px
Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
Margin Bottom: 12px
```

#### 信息卡片
```
Background: #F2F2F7
Padding: 16px
Border Radius: 12px
Margin Bottom: 8px
```

### 3. 标签（Tag）

#### 训练类型标签
```
Height: 28px
Padding: 6px 12px
Border Radius: 14px
Font Size: 14px
Font Weight: Medium
```

### 4. 进度条

#### 圆形进度
```
Size: 120px x 120px
Stroke Width: 12px
Background Stroke: #E5E5EA
Progress Stroke: #007AFF
```

#### 线性进度
```
Height: 8px
Border Radius: 4px
Background: #E5E5EA
Progress: #34C759
```

---

## 五、页面布局规范

### 1. Tab Bar（底部导航栏）

```
Height: 83px (含安全区域)
Background: #FFFFFF
Border Top: 0.5px solid #C7C7CC
Icon Size: 24px
Label Font Size: 10px
Label Font Weight: Medium
```

#### Tab 项
```
1. Today (今日)
2. Plan (计划)
3. Training (训练)
4. Profile (我的)
```

### 2. Navigation Bar（导航栏）

```
Height: 44px
Background: #FFFFFF
Title Font Size: 18px
Title Font Weight: Semibold
Title Color: #1C1C1E
```

### 3. 页面内容区

```
Padding: 16px
Max Width: 100%
Background: #F2F2F7
```

---

## 六、核心页面设计

### 1. Today Tab（今日训练）

#### 页面结构（从上到下）
```
1. 日期显示
   - 格式: "星期三, 1月15日"
   - 字体: 16px / Medium / Gray 2
   - 位置: 左上角

2. 今日训练卡片（核心）
   - 训练类型图标（大）
   - 训练标题（大字体）
   - 训练目标（距离/时间）
   - 训练说明（简短）
   - 开始训练按钮（大）

3. 本周概览
   - 本周跑量
   - 完成进度
   - 长距离状态

4. 训练详情展开
   - 热身
   - 主训练
   - 冷身
   - 配速/心率目标
```

#### 关键元素
```
- 训练类型图标: 80px x 80px
- 训练标题: 28px / Bold
- 训练目标: 20px / Semibold
- 开始按钮: 全宽 / 高度 56px
```

### 2. Plan Tab（计划日历）

#### 页面结构
```
1. 月份选择器
   - 左右箭头切换月份
   - 当前月份显示

2. 周视图日历
   - 7天横向展示
   - 当天高亮
   - 训练类型颜色标记
   - 点击展开详情

3. 本周训练列表
   - 按日期排序
   - 显示训练类型、距离
   - 完成状态标记

4. 计划概览
   - 总周数
   - 当前阶段
   - 比赛倒计时
```

#### 日历样式
```
- 日期格子: 48px x 48px
- 训练标记点: 6px 圆点
- 当天背景: #007AFF
- 当天文字: #FFFFFF
```

### 3. Training Tab（训练记录）

#### 页面结构
```
1. 统计概览
   - 本周跑量
   - 本月跑量
   - 总跑量
   - 训练次数

2. 训练记录列表
   - 日期
   - 训练类型
   - 距离/时间
   - 配速
   - 心率

3. 趋势图表
   - 周跑量趋势
   - 训练负荷趋势
```

#### 记录项样式
```
- 列表项高度: 72px
- 左侧图标: 40px x 40px
- 标题: 16px / Semibold
- 副标题: 14px / Regular / Gray 3
- 右侧数据: 16px / Medium
```

### 4. Profile Tab（个人中心）

#### 页面结构
```
1. 用户信息卡片
   - 头像
   - 昵称
   - 目标赛事

2. 训练档案
   - 目标距离
   - 比赛日期
   - 训练频率
   - 最长距离

3. 设置选项
   - 训练提醒
   - 单位设置
   - 数据同步
   - 关于我们
```

---

## 七、交互规范

### 1. 页面转场
```
- Tab 切换: 无动画 / 即时切换
- 页面跳转: 从右向左滑入
- 返回: 从左向右滑出
- Modal: 从底部弹出
```

### 2. 反馈动画
```
- 按钮点击: 缩放 0.95 / 100ms
- 卡片点击: 背景色变化 / 150ms
- 加载状态: 骨架屏
- 完成状态: 打勾动画 / 300ms
```

### 3. 手势操作
```
- 下拉刷新: 刷新数据
- 左滑删除: 删除记录
- 长按: 更多选项
```

---

## 八、文案规范

### 1. 训练类型文案
```
Easy Run: 轻松跑
Long Run: 长距离
Quality: 质量课
Recovery: 恢复跑
Strength: 力量训练
Rest: 休息日
```

### 2. 训练说明文案
```
- 简洁明了，不超过2行
- 使用动词开头
- 说明训练目的和注意事项
- 示例: "轻松跑5公里，保持能说话的节奏"
```

### 3. 反馈文案
```
- 积极、鼓励性
- 个性化、有温度
- 示例: "今天的状态不错，继续保持！"
```

---

## 九、图标规范

### 1. 图标尺寸
```
- Tab Bar 图标: 24px x 24px
- 列表图标: 20px x 20px
- 功能图标: 16px x 16px
- 大图标: 80px x 80px
```

### 2. 图标风格
```
- 线性图标
- 线宽: 2px
- 圆角: 2px
- 颜色: 单色 / Gray 2
```

### 3. 训练类型图标
```
Easy Run: 跑步剪影
Long Run: 长跑剪影
Quality: 闪电
Strength: 哑铃
Rest: 月亮
```

---

## 十、数据展示规范

### 1. 数字格式
```
距离: 5.0 km / 10.5 km
时间: 30:00 / 1:15:30
配速: 5'30" / 6'15"
心率: 145 bpm
```

### 2. 日期格式
```
完整日期: 2024年1月15日
简短日期: 1月15日
星期: 星期三
时间: 15:30
```

### 3. 进度格式
```
百分比: 75%
分数: 3/4
进度条: ████████░░ 80%
```

---

## 十一、响应式适配

### 1. 屏幕尺寸
```
- iPhone SE: 375px
- iPhone 14: 390px
- iPhone 14 Plus: 428px
- iPad: 768px
```

### 2. 适配原则
```
- 使用相对单位（rpx）
- 最大宽度限制
- 内容居中对齐
- 合理利用空白
```

---

## 十二、性能优化

### 1. 图片优化
```
- 使用 WebP 格式
- 按需加载
- 压缩质量: 80%
```

### 2. 动画优化
```
- 使用 CSS 动画
- 避免重排重绘
- 硬件加速
```

### 3. 数据加载
```
- 分页加载
- 骨架屏
- 缓存策略
```

---

## 十三、无障碍设计

### 1. 对比度
```
- 文字对比度: ≥ 4.5:1
- 大文字对比度: ≥ 3:1
```

### 2. 触控区域
```
- 最小触控区域: 44px x 44px
- 按钮间距: ≥ 8px
```

### 3. 文字大小
```
- 支持系统字体缩放
- 最小字体: 12px
```

---

## 十四、设计资源

### 1. 设计工具
```
- Figma: 界面设计
- Sketch: 图标设计
- Principle: 交互动画
```

### 2. 图标库
```
- SF Symbols (iOS)
- Material Icons
- 自定义图标
```

### 3. 字体资源
```
- Apple System Font
- PingFang SC
```

---

## 十五、设计检查清单

### 上线前检查
```
□ 所有页面符合设计规范
□ 字体大小一致
□ 颜色使用正确
□ 间距符合规范
□ 图标清晰
□ 动画流畅
□ 文案准确
□ 交互反馈明确
□ 加载状态完善
□ 错误提示友好
```

---

## 十六、版本迭代

### 设计版本
```
v1.0: 基础功能
v1.1: 优化体验
v1.2: 新增功能
v2.0: 重大改版
```

### 迭代原则
```
- 保持设计一致性
- 渐进式优化
- 用户反馈驱动
- 数据驱动决策
```

---

## 附录：Runna 核心功能清单

### 必须实现（P0）
```
1. 今日训练展示
2. 训练计划日历
3. 训练执行记录
4. 训练反馈提交
5. 训练负荷展示
6. 比赛预测
```

### 重要功能（P1）
```
1. 训练计划调整
2. 黑名单日期
3. Not Feeling 100%
4. 训练详情展开
```

### 可选功能（P2）
```
1. 设备同步
2. 数据导出
3. 训练分享
```

### 不做功能
```
✗ 社区功能
✗ 跑团
✗ 挑战
✗ 奖牌
✗ 商业化
✗ 真人教练
✗ 模板商店
```
