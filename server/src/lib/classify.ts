/**
 * Rule-based topic auto-classifier.
 * Assigns a human-readable category label to a hot topic
 * without requiring any AI API call (zero cost).
 */

const RULES: { category: string; patterns: RegExp }[] = [
  {
    category: 'AI技术',
    patterns: /ai|人工智能|大模型|llm|gpt|deepseek|chatgpt|claude|gemini|机器学习|深度学习|神经网络|transformer|扩散模型|文生图|大语言/i,
  },
  {
    category: '开发技术',
    patterns: /python|javascript|typescript|react|vue|angular|svelte|rust|golang|java|kotlin|swift|c\+\+|编程|代码|开源|github|npm|docker|kubernetes|devops|api|sdk/i,
  },
  {
    category: '科技硬件',
    patterns: /芯片|半导体|cpu|gpu|nvidia|英伟达|高通|intel|苹果|华为|小米|三星|vivo|oppo|手机发布|处理器|显卡/i,
  },
  {
    category: '产品发布',
    patterns: /发布|上线|推出|开放|内测|产品|版本更新|v\d|release/i,
  },
  {
    category: '财经金融',
    patterns: /股票|基金|证券|a股|港股|纳斯达克|融资|ipo|上市|市值|经济|gdp|通胀|利率|美联储|央行|理财|债券|外汇/i,
  },
  {
    category: '数字货币',
    patterns: /比特币|以太坊|crypto|区块链|web3|nft|defi|metaverse|元宇宙/i,
  },
  {
    category: '娱乐',
    patterns: /明星|演员|歌手|偶像|粉丝|出轨|离婚|恋爱|综艺|电视剧|电影|票房|发片|专辑|演唱会|直播|网红|博主/i,
  },
  {
    category: '游戏',
    patterns: /游戏|王者荣耀|英雄联盟|原神|steam|epic|xbox|ps5|nintendo|switch|绝地求生|吃鸡|lol|moba|fps|mmorpg/i,
  },
  {
    category: '体育',
    patterns: /足球|篮球|nba|cba|世界杯|奥运|运动员|冠军|联赛|比赛|赛事|梅西|c罗|球员|教练|总决赛/i,
  },
  {
    category: '健康医疗',
    patterns: /医疗|健康|疫情|病毒|医院|药物|手术|养生|疫苗|癌症|心脏|中医|西医|确诊|防控/i,
  },
  {
    category: '教育',
    patterns: /教育|高考|大学|留学|培训|学习|考研|考公|985|211|双一流|学生|老师|课程/i,
  },
  {
    category: '国际政治',
    patterns: /美国|白宫|拜登|特朗普|欧洲|俄罗斯|乌克兰|中东|以色列|战争|制裁|外交|联合国|nato|g7|g20/i,
  },
  {
    category: '社会民生',
    patterns: /政策|法规|民生|房价|物价|就业|失业|养老|社保|医保|公积金|农村|城市化|人口/i,
  },
];

const SOURCE_FALLBACKS: Record<string, string> = {
  github: '开发技术',
  hackernews: '开发技术',
  devto: '开发技术',
  reddit: '国际资讯',
  producthunt: '产品发布',
  twitter: '社会热点',
  bingnews: '时事新闻',
  bilibili: '娱乐',
  sogou: '时事新闻',
  gnews_search: '时事新闻',
  gnews_cn_tech: '时事新闻',
  gnews_cn: '时事新闻',
  gnews_ai: 'AI技术',
};

export function autoClassify(
  title: string,
  source: string,
  existingCategory?: string | null
): string {
  // Keep specific categories already set by scrapers (e.g. GitHub language tags
  // are not useful as categories, but Weibo's social tags are)
  if (
    existingCategory &&
    existingCategory !== 'tech' &&
    existingCategory !== 'product' &&
    existingCategory !== 'news' &&
    existingCategory !== 'dev'
  ) {
    // Run through rules anyway to override generic existing values
  }

  for (const rule of RULES) {
    if (rule.patterns.test(title)) {
      return rule.category;
    }
  }

  return SOURCE_FALLBACKS[source] || '社会热点';
}
