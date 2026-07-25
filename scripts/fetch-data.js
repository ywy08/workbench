const axios = require('axios');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = process.env.REPO_OWNER || 'ywy0805';
const REPO_NAME = process.env.REPO_NAME || 'workbench';
const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const DATA_DIR = path.join(__dirname, '..', 'data');

const BILIBILI_API = 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all';
const ZHIHU_API = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50';
const DOUBYIN_HOT_API = 'https://www.douyin.com/aweme/v1/web/hot/search/list/';

const FRONTEND_SOURCES = [
  { name: '掘金', url: 'https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed', color: '#1E88E5' },
  { name: 'InfoQ', url: 'https://www.infoq.cn/article/index', color: '#FF6B35' },
];

const STOCK_INDEX_API = 'https://push2.eastmoney.com/api/qt/ulist.np/get';

async function fetchHotTopics() {
  try {
    const results = await Promise.allSettled([
      axios.get(BILIBILI_API, { timeout: 10000 }),
      axios.get(ZHIHU_API, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }),
    ]);

    let items = [];

    const biliRes = results[0];
    if (biliRes.status === 'fulfilled' && biliRes.data?.data?.list) {
      items = biliRes.data.data.list.slice(0, 10).map(v => ({
        title: v.title,
        source: 'B站',
        hot: (v.score || 0).toString(),
        url: `https://www.bilibili.com/video/${v.bvid}`,
        tags: ['视频', 'B站'],
        desc: `${v.title} - 热度${(v.score || 0).toString()}`
      }));
    }

    const zhihuRes = results[1];
    if (zhihuRes.status === 'fulfilled' && zhihuRes.data?.data) {
      const zhihuItems = zhihuRes.data.data.slice(0, 5).map(v => ({
        title: v.target?.title || '',
        source: '知乎',
        hot: v.detail_text || '',
        url: v.target?.url ? `https://www.zhihu.com/question/${v.target.id}` : '',
        tags: ['问答', '知乎'],
        desc: `${v.target?.title || ''} - ${v.detail_text || ''}`
      })).filter(i => i.title);
      items = [...items, ...zhihuItems];
    }

    if (items.length === 0) {
      items = generateMockHotData();
    }

    return items.slice(0, 10);
  } catch (e) {
    console.log('抓取热榜失败，使用示例数据:', e.message);
    return generateMockHotData();
  }
}

function generateMockHotData() {
  return [
    { title: '程序员为什么越来越不愿意写代码了', source: '抖音', hot: '热榜第一', url: '', tags: ['职场', '程序员'], desc: '程序员职业发展话题' },
    { title: '一个人开始走下坡路的3个信号', source: '抖音', hot: '情绪共鸣', url: '', tags: ['情感', '成长'], desc: '人生感悟' },
    { title: '今年最值得买的3款千元手机', source: '抖音', hot: '数码测评', url: '', tags: ['数码', '测评'], desc: '数码产品测评' },
    { title: '95后整顿职场的真实案例', source: '抖音', hot: '热门话题', url: '', tags: ['职场', '话题'], desc: '职场文化讨论' },
    { title: '普通人逆袭的3个底层逻辑', source: '抖音', hot: '涨粉话题', url: '', tags: ['成长', '干货'], desc: '个人成长' },
    { title: '当代年轻人的存钱方式', source: '抖音', hot: '生活方式', url: '', tags: ['理财', '生活'], desc: '理财观念' },
    { title: '减肥最有效的5个方法', source: '抖音', hot: '健康话题', url: '', tags: ['健康', '减肥'], desc: '健康生活' },
    { title: '为什么你的视频总是没人看', source: '抖音', hot: '干货教程', url: '', tags: ['短视频', '教程'], desc: '短视频运营' },
    { title: '农村生活真实记录', source: '抖音', hot: '治愈系', url: '', tags: ['生活', '治愈'], desc: '生活记录' },
    { title: '一分钟学会的早餐', source: '抖音', hot: '美食话题', url: '', tags: ['美食', '生活'], desc: '美食制作' }
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

async function fetchFrontendNews() {
  try {
    const results = [];
    
    const juejinRes = await axios.get('https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed', {
      method: 'POST',
      data: { id_type: 2, sort_type: 200, cate_id: '', cursor: '0', limit: 10 },
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (juejinRes?.data?.data) {
      const articles = juejinRes.data.data.slice(0, 8);
      articles.forEach(a => {
        results.push({
          source: '掘金',
          sourceColor: '#1E88E5',
          title: a.article_info?.title || a.title || '',
          meta: `${a.author_user_info?.user_name || ''} · 前端技术`,
          url: a.article_info?.article_url || a.article_url || ''
        });
      });
    }

    if (results.length < 5) {
      results.push(
        { source: 'InfoQ', sourceColor: '#FF6B35', title: 'React 19 正式发布：Server Components 成核心特性', meta: '前端框架', url: 'https://infoq.cn/article/react-19-release' },
        { source: 'GitHub', sourceColor: '#24292e', title: 'shadcn-ui 成为本周最热门仓库', meta: '开源项目', url: 'https://github.com/shadcn-ui/ui' },
        { source: 'MDN', sourceColor: '#000', title: 'CSS Container Queries 浏览器支持率突破 85%', meta: 'CSS 新特性', url: 'https://developer.mozilla.org/docs/Web/CSS/CSS_container_queries' },
        { source: 'Chrome', sourceColor: '#4285F4', title: 'Chrome 127：开发者工具新增 AI 辅助功能', meta: '浏览器更新', url: 'https://developer.chrome.com/blog/chrome-127' },
        { source: '掘金', sourceColor: '#1E88E5', title: 'Vite 7 性能实测：构建速度提升 50%', meta: '构建工具', url: 'https://juejin.cn/post/vite-7-test' },
      );
    }

    return results.slice(0, 10);
  } catch (e) {
    console.log('抓取前端新闻失败，使用示例数据:', e.message);
    return generateMockFrontendNews();
  }
}

function generateMockFrontendNews() {
  return [
    { source: '掘金', sourceColor: '#1E88E5', title: 'React 19 正式发布：Server Components 成核心特性', meta: '前端框架', url: 'https://juejin.cn/post/react-19-release' },
    { source: 'InfoQ', sourceColor: '#FF6B35', title: 'TypeScript 5.6 beta 发布：性能提升 30%', meta: '编程语言', url: 'https://infoq.cn/article/typescript-5-6' },
    { source: 'GitHub', sourceColor: '#24292e', title: 'shadcn-ui 成为本周最热门仓库，已超 100k Stars', meta: '开源项目', url: 'https://github.com/shadcn-ui/ui' },
    { source: 'MDN', sourceColor: '#000', title: 'CSS Container Queries 浏览器支持率突破 85%', meta: 'CSS 新特性', url: 'https://developer.mozilla.org/docs/Web/CSS/CSS_container_queries' },
    { source: 'Chrome', sourceColor: '#4285F4', title: 'Chrome 127：开发者工具新增 AI 辅助功能', meta: '浏览器更新', url: 'https://developer.chrome.com/blog/chrome-127' },
    { source: '掘金', sourceColor: '#1E88E5', title: 'Vite 7 性能实测：构建速度提升 50%', meta: '构建工具', url: 'https://juejin.cn/post/vite-7-test' },
    { source: 'InfoQ', sourceColor: '#FF6B35', title: 'WebAssembly 在服务端的应用实践', meta: '技术前沿', url: 'https://infoq.cn/article/wasm-server' },
    { source: 'GitHub', sourceColor: '#24292e', title: 'lucide-icons：轻量级图标库，周下载量破百万', meta: '工具库', url: 'https://github.com/lucide-icons/lucide' }
  ];
}

async function fetchStockData() {
  try {
    const indices = [
      { key: 'shanghai', code: '1.000001', name: '上证指数' },
      { key: 'shenzhen', code: '0.399001', name: '深证成指' },
      { key: 'chinext', code: '0.399006', name: '创业板指' },
    ];

    const results = {};
    for (const idx of indices) {
      try {
        const res = await axios.get(STOCK_INDEX_API, {
          params: {
            fltt: 2,
            secids: idx.code,
            fields: 'f2,f3,f4,f12,f14'
          },
          timeout: 5000
        });
        if (res.data?.data?.diff) {
          const d = res.data.data.diff[0];
          results[idx.key] = {
            name: idx.name,
            value: d.f2?.toString() || '--',
            change: d.f3 ? (d.f3 > 0 ? '+' : '') + d.f3 + '%' : '--',
            up: d.f3 > 0
          };
        }
      } catch (e) {
        results[idx.key] = { name: idx.name, value: '--', change: '--', up: true };
      }
    }

    results.us = { name: '纳斯达克', value: '--', change: '--', up: true };
    results.hangseng = { name: '恒生指数', value: '--', change: '--', up: true };

    return results;
  } catch (e) {
    console.log('抓取股票数据失败:', e.message);
    return {
      shanghai: { name: '上证指数', value: '--', change: '--', up: true },
      shenzhen: { name: '深证成指', value: '--', change: '--', up: true },
      chinext: { name: '创业板指', value: '--', change: '--', up: true },
      us: { name: '纳斯达克', value: '--', change: '--', up: true },
      hangseng: { name: '恒生指数', value: '--', change: '--', up: true }
    };
  }
}

function generateStockNews() {
  const now = new Date();
  const hour = now.getHours();
  let period = '早';
  if (hour >= 14) period = '晚';
  else if (hour >= 10) period = '中';
  
  return [
    { title: `${period}间重要财经新闻汇总`, time: `${period}间更新`, level: '关注' },
    { title: '央行货币政策最新动向', time: '实时', level: '关注' },
    { title: 'A股市场热点板块分析', time: '今日', level: '利好' },
    { title: '北向资金流向分析', time: '今日', level: '关注' }
  ];
}

async function writeToGist(data) {
  if (!GITHUB_TOKEN || !GIST_ID) {
    console.log('未配置 GITHUB_TOKEN 或 GIST_ID，跳过 Gist 写入');
    return;
  }

  try {
    const content = JSON.stringify(data, null, 2);
    const resp = await axios.patch(
      `https://api.github.com/gists/${GIST_ID}`,
      {
        files: {
          'workbench-data.json': {
            content: content
          }
        }
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      }
    );

    if (resp.status === 200) {
      console.log('✅ 已更新 Gist');
    } else {
      console.log('❌ Gist 更新失败:', resp.status);
    }
  } catch (e) {
    console.log('❌ Gist 写入失败:', e.message);
  }
}

async function saveToRepoFiles(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(
      path.join(DATA_DIR, 'hot-data.json'),
      JSON.stringify({ inspiration: data.inspiration, remix: data.remix, updatedAt: data.updatedAt, updatedAtCN: data.updatedAtCN }, null, 2),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(DATA_DIR, 'frontend-news.json'),
      JSON.stringify({ news: data.frontendNews, updatedAt: data.updatedAt, updatedAtCN: data.updatedAtCN }, null, 2),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(DATA_DIR, 'stock-data.json'),
      JSON.stringify({ stock: data.stock, stockNews: data.stockNews, updatedAt: data.updatedAt, updatedAtCN: data.updatedAtCN }, null, 2),
      'utf-8'
    );

    console.log('✅ 已保存到仓库文件');
  } catch (e) {
    console.log('❌ 保存文件失败:', e.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';

  const now = new Date();
  const data = {
    updatedAt: now.toISOString(),
    updatedAtCN: now.toLocaleString('zh-CN'),
    inspiration: [],
    remix: [],
    frontendNews: [],
    stock: {},
    stockNews: []
  };

  if (mode === 'hot' || mode === 'all') {
    console.log('🔥 抓取热榜数据...');
    const hotItems = await fetchHotTopics();
    data.inspiration = hotItems.map((item, i) => ({
      id: i + 1,
      title: item.title,
      source: item.source,
      hot: item.hot,
      tags: item.tags || [],
      desc: item.desc || `【${item.source}】${item.title}`,
      url: item.url || ''
    }));
    data.remix = generateRemixDirections(hotItems);
    console.log(`📊 热榜: ${data.inspiration.length} 条灵感 + ${data.remix.length} 条二创方向`);
  }

  if (mode === 'frontend' || mode === 'all') {
    console.log('💻 抓取前端新闻...');
    data.frontendNews = await fetchFrontendNews();
    console.log(`📊 前端新闻: ${data.frontendNews.length} 条`);
  }

  if (mode === 'stock' || mode === 'all') {
    console.log('📈 抓取股票数据...');
    data.stock = await fetchStockData();
    data.stockNews = generateStockNews();
    console.log('📊 股票数据已更新');
  }

  await saveToRepoFiles(data);
  await writeToGist(data);

  console.log('✅ 完成！');
  console.log(`📅 ${data.updatedAtCN}`);
}

main().catch(console.error);
