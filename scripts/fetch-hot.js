const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'hot-data.json');

const HOT_API = 'https://api.oioweb.cn/api/common/HotList';
const BILIBILI_API = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all';
const ZHIHU_API = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50';

async function fetchHotTopics() {
  try {
    const [biliRes, zhihuRes] = await Promise.allSettled([
      axios.get(BILIBILI_API, { timeout: 10000 }),
      axios.get(ZHIHU_API, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } })
    ]);

    let items = [];

    if (biliRes.status === 'fulfilled' && biliRes.data?.data?.list) {
      items = biliRes.data.data.list.map(v => ({
        title: v.title,
        source: 'B站',
        hot: (v.score || 0).toString(),
        url: `https://www.bilibili.com/video/${v.bvid}`,
        tags: ['视频', 'B站']
      }));
    }

    if (zhihuRes.status === 'fulfilled' && zhihuRes.data?.data) {
      const zhihuItems = zhihuRes.data.data.map(v => ({
        title: v.target?.title || '',
        source: '知乎',
        hot: v.detail_text || '',
        url: v.target?.url ? `https://www.zhihu.com/question/${v.target.id}` : '',
        tags: ['问答', '知乎']
      })).filter(i => i.title);
      items = [...items, ...zhihuItems];
    }

    if (items.length === 0) {
      items = generateMockData();
    }

    return items;
  } catch (e) {
    console.log('抓取失败，使用示例数据:', e.message);
    return generateMockData();
  }
}

function generateMockData() {
  return [
    { title: '程序员为什么越来越不愿意写代码了', source: '抖音', hot: '热榜第一', url: '', tags: ['职场', '程序员'] },
    { title: '一个人开始走下坡路的3个信号', source: '抖音', hot: '情绪共鸣', url: '', tags: ['情感', '成长'] },
    { title: '今年最值得买的3款千元手机', source: '抖音', hot: '数码测评', url: '', tags: ['数码', '测评'] },
    { title: '95后整顿职场的真实案例', source: '抖音', hot: '热门话题', url: '', tags: ['职场', '话题'] },
    { title: '普通人逆袭的3个底层逻辑', source: '抖音', hot: '涨粉话题', url: '', tags: ['成长', '干货'] },
    { title: '当代年轻人的存钱方式', source: '抖音', hot: '生活方式', url: '', tags: ['理财', '生活'] },
    { title: '减肥最有效的5个方法', source: '抖音', hot: '健康话题', url: '', tags: ['健康', '减肥'] },
    { title: '为什么你的视频总是没人看', source: '抖音', hot: '干货教程', url: '', tags: ['短视频', '教程'] },
    { title: '农村生活真实记录', source: '抖音', hot: '治愈系', url: '', tags: ['生活', '治愈'] },
    { title: '一分钟学会的早餐', source: '抖音', hot: '美食话题', url: '', tags: ['美食', '生活'] }
  ];
}

function generateRemixDirections(items) {
  const templates = [
    { style: '纪录片+科普', directions: ['深度解读事件背后的真相', '采访相关当事人，还原真实经历', '从专业角度分析事件影响'] },
    { style: '情感口播', directions: ['以第一人称讲述你的观点和感受', '引用热门评论作为素材展示', '结尾给出正能量的思考或建议'] },
    { style: '对比测评', directions: ['对比不同解决方案的优劣', '展示前后变化和效果对比', '邀请观众参与投票讨论'] },
    { style: '知识干货', directions: ['整理成3-5个核心要点', '配合图表/动画辅助说明', '结尾给出行动建议'] },
    { style: '情景再现', directions: ['用短剧形式还原事件场景', '加入旁白解说补充背景', '设置悬念吸引观众看下去'] }
  ];

  return items.slice(0, 10).map((item, i) => ({
    source: item.title,
    style: templates[i % templates.length].style,
    directions: templates[i % templates.length].directions.map(d => d.replace('事件', item.title.slice(0, 5)))
  }));
}

function saveToFile(inspiration, remix) {
  const now = new Date();
  const data = {
    inspiration: inspiration.map((item, i) => ({
      id: i + 1,
      title: item.title,
      source: item.source,
      hot: item.hot,
      tags: item.tags,
      desc: `【${item.source}】${item.title} - 热度：${item.hot}`,
      url: item.url || ''
    })),
    remix: remix,
    version: '1.0',
    updatedAt: now.toISOString(),
    updatedAtCN: now.toLocaleString('zh-CN')
  };

  try {
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('✅ 已保存到本地文件');
  } catch (e) {
    console.log('❌ 保存文件失败:', e.message);
  }
}

async function main() {
  console.log('🔥 开始抓取热榜数据...');
  
  const items = await fetchHotTopics();
  console.log(`📊 抓取到 ${items.length} 条数据`);
  
  const inspiration = items.slice(0, 10).map((item, i) => ({
    title: item.title,
    source: item.source,
    hot: item.hot,
    tags: item.tags || [],
    url: item.url || '',
    desc: `【${item.source}】${item.title}`
  }));
  
  const remix = generateRemixDirections(items);
  
  saveToFile(inspiration, remix);
  
  console.log('✅ 完成！');
  
  console.log('\n📋 今日灵感选题:');
  inspiration.slice(0, 3).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.title}`);
  });
}

main().catch(console.error);
