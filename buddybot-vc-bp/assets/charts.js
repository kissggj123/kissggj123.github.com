/* BuddyBot VC BP — charts.js
   4 ECharts: market funnel · unit economics · competitor radar · funding allocation */
(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var ok = style.getPropertyValue('--ok').trim();
  var danger = style.getPropertyValue('--danger').trim();
  var ruleSolid = style.getPropertyValue('--rule-solid').trim();
  var bg2Solid = style.getPropertyValue('--bg2-solid').trim();

  var FONT = '"WorkSans", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  var MONO = '"JetBrainsMono", monospace';

  /* ============================================================
     1. MARKET FUNNEL — TAM → SAM → SOM
     ============================================================ */
  function initFunnel() {
    var el = document.getElementById('chart-funnel');
    if (!el) return;
    var chart = echarts.init(el, null, { renderer: 'svg' });
    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          return p.name + '<br/>' + p.value;
        },
        backgroundColor: bg2Solid,
        borderColor: ruleSolid,
        borderWidth: 1,
        textStyle: { color: ink, fontFamily: FONT, fontSize: 13 },
        extraCssText: 'box-shadow:0 8px 24px -8px rgba(10,22,40,0.20);border-radius:10px;padding:10px 14px;'
      },
      series: [{
        type: 'funnel',
        left: '12%',
        right: '12%',
        top: 24,
        bottom: 24,
        minSize: '34%',
        maxSize: '100%',
        sort: 'descending',
        gap: 6,
        label: {
          show: true,
          position: 'inside',
          formatter: function (p) {
            return '{title|' + p.name + '}\n{val|' + p.value + '}';
          },
          rich: {
            title: { color: '#fff', fontFamily: FONT, fontSize: 15, fontWeight: 700, lineHeight: 26 },
            val: { color: 'rgba(255,255,255,0.92)', fontFamily: MONO, fontSize: 13, lineHeight: 20 }
          }
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: 'transparent',
          borderWidth: 0
        },
        data: [
          { value: 'TAM · 全球宠物科技 + 消费级机器人\n约 $370 亿美元', name: 'TAM', itemStyle: { color: accent } },
          { value: 'SAM · 美/中/欧一二线城市中产科技家庭\n约 $65 亿美元', name: 'SAM', itemStyle: { color: '#7C72E8' } },
          { value: 'SOM · 首期 15 万活跃付费家庭\n约 $7,500 万美元年营收', name: 'SOM', itemStyle: { color: accent2 } }
        ]
      }]
    });
    window.addEventListener('resize', function () { chart.resize(); });
  }

  /* ============================================================
     2. UNIT ECONOMICS — 24-month cumulative cash flow
     ============================================================ */
  function initUE() {
    var el = document.getElementById('chart-ue');
    if (!el) return;
    var chart = echarts.init(el, null, { renderer: 'svg' });

    var months = [];
    var cumulative = [];
    var monthly = [];
    var initCost = 500;
    var monthlyRev = 39;
    for (var i = 0; i <= 24; i++) {
      months.push(i === 0 ? '投入' : 'M' + i);
      var c = -initCost + monthlyRev * i;
      cumulative.push(c);
      monthly.push(i === 0 ? { value: -initCost, itemStyle: { color: danger } } : monthlyRev);
    }

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: bg2Solid,
        borderColor: ruleSolid,
        borderWidth: 1,
        textStyle: { color: ink, fontFamily: FONT, fontSize: 13 },
        extraCssText: 'box-shadow:0 8px 24px -8px rgba(10,22,40,0.20);border-radius:10px;padding:10px 14px;',
        formatter: function (params) {
          var m = params[0].axisValue;
          var html = '<b>' + m + '</b>';
          params.forEach(function (p) {
            var sign = p.value >= 0 ? '+' : '';
            html += '<br/>' + p.marker + p.seriesName + ': ' + sign + '$' + p.value;
          });
          return html;
        }
      },
      legend: {
        data: ['累计净现金流', '月度收入'],
        top: 4,
        right: 10,
        textStyle: { color: muted, fontFamily: FONT, fontSize: 12 },
        itemWidth: 14,
        itemHeight: 8
      },
      grid: { left: 52, right: 28, top: 44, bottom: 38 },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: ruleSolid } },
        axisTick: { show: false },
        axisLabel: { color: muted, fontFamily: MONO, fontSize: 10.5, interval: 1, rotate: 0 }
      },
      yAxis: {
        type: 'value',
        name: 'USD',
        nameTextStyle: { color: muted, fontFamily: MONO, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: ruleSolid, type: 'dashed' } },
        axisLabel: {
          color: muted, fontFamily: MONO, fontSize: 11,
          formatter: function (v) { return v >= 0 ? '$' + v : '-$' + Math.abs(v); }
        }
      },
      series: [
        {
          name: '月度收入',
          type: 'bar',
          data: monthly,
          barWidth: 14,
          itemStyle: {
            color: accent2,
            borderRadius: [3, 3, 0, 0]
          },
          z: 2
        },
        {
          name: '累计净现金流',
          type: 'line',
          data: cumulative,
          smooth: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: accent, width: 3 },
          itemStyle: { color: accent, borderColor: '#fff', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(79,70,229,0.18)' },
                { offset: 1, color: 'rgba(79,70,229,0.02)' }
              ]
            }
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: ok, type: 'dashed', width: 1.5 },
            label: {
              formatter: '盈亏平衡 · 第13个月',
              color: ok,
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 700,
              position: 'insideEndTop'
            },
            data: [{ yAxis: 0 }]
          },
          markPoint: {
            symbol: 'circle',
            symbolSize: 12,
            itemStyle: { color: ok, borderColor: '#fff', borderWidth: 3 },
            label: {
              formatter: function (p) { return 'Payback\nM13'; },
              color: ok,
              fontFamily: FONT,
              fontSize: 10.5,
              fontWeight: 700,
              position: 'top',
              distance: 8
            },
            data: [{ coord: ['M13', cumulative[13]] }]
          },
          z: 3
        }
      ]
    });
    window.addEventListener('resize', function () { chart.resize(); });
  }

  /* ============================================================
     3. COMPETITOR RADAR — 6 dimensions × 4 competitors
     ============================================================ */
  function initRadar() {
    var el = document.getElementById('chart-radar');
    if (!el) return;
    var chart = echarts.init(el, null, { renderer: 'svg' });

    chart.setOption({
      animation: false,
      tooltip: {
        backgroundColor: bg2Solid,
        borderColor: ruleSolid,
        borderWidth: 1,
        textStyle: { color: ink, fontFamily: FONT, fontSize: 13 },
        extraCssText: 'box-shadow:0 8px 24px -8px rgba(10,22,40,0.20);border-radius:10px;padding:10px 14px;'
      },
      legend: {
        data: ['BuddyBot', 'Enabot EBO X', 'PetPace', 'Rocki 逗宠车'],
        top: 4,
        right: 10,
        textStyle: { color: muted, fontFamily: FONT, fontSize: 12 },
        itemWidth: 14,
        itemHeight: 8
      },
      radar: {
        center: ['50%', '56%'],
        radius: '62%',
        indicator: [
          { name: '底盘通过性', max: 5 },
          { name: '物理交互', max: 5 },
          { name: '健康监测', max: 5 },
          { name: '边缘算力', max: 5 },
          { name: '价格友好度', max: 5 },
          { name: '静音友好度', max: 5 }
        ],
        axisName: { color: ink, fontFamily: FONT, fontSize: 12.5, fontWeight: 600 },
        splitLine: { lineStyle: { color: ruleSolid } },
        splitArea: {
          areaStyle: {
            color: ['rgba(79,70,229,0.015)', 'rgba(79,70,229,0.04)']
          }
        },
        axisLine: { lineStyle: { color: ruleSolid } }
      },
      series: [{
        type: 'radar',
        emphasis: { focus: 'series' },
        data: [
          {
            value: [5, 5, 5, 5, 5, 5],
            name: 'BuddyBot',
            symbolSize: 7,
            lineStyle: { color: accent, width: 3 },
            itemStyle: { color: accent },
            areaStyle: { color: 'rgba(79,70,229,0.22)' }
          },
          {
            value: [2, 0, 1, 2, 1, 2],
            name: 'Enabot EBO X',
            symbolSize: 5,
            lineStyle: { color: accent2, width: 2, type: 'dashed' },
            itemStyle: { color: accent2 },
            areaStyle: { color: 'rgba(217,119,6,0.06)' }
          },
          {
            value: [0, 0, 3, 0, 3, 0],
            name: 'PetPace',
            symbolSize: 5,
            lineStyle: { color: ok, width: 2, type: 'dashed' },
            itemStyle: { color: ok },
            areaStyle: { color: 'rgba(5,150,105,0.05)' }
          },
          {
            value: [1, 0, 0, 1, 3, 1],
            name: 'Rocki 逗宠车',
            symbolSize: 5,
            lineStyle: { color: '#94A3B8', width: 2, type: 'dashed' },
            itemStyle: { color: '#94A3B8' },
            areaStyle: { color: 'rgba(148,163,184,0.05)' }
          }
        ]
      }]
    });
    window.addEventListener('resize', function () { chart.resize(); });
  }

  /* ============================================================
     4. FUNDING ALLOCATION — $5M donut
     ============================================================ */
  function initFunding() {
    var el = document.getElementById('chart-funding');
    if (!el) return;
    var chart = echarts.init(el, null, { renderer: 'svg' });

    chart.setOption({
      animation: false,
      tooltip: {
        trigger: 'item',
        backgroundColor: bg2Solid,
        borderColor: ruleSolid,
        borderWidth: 1,
        textStyle: { color: ink, fontFamily: FONT, fontSize: 13 },
        extraCssText: 'box-shadow:0 8px 24px -8px rgba(10,22,40,0.20);border-radius:10px;padding:10px 14px;',
        formatter: function (p) {
          return p.name + '<br/>' + p.marker + p.value + ' (' + p.percent + '%)';
        }
      },
      legend: {
        orient: 'vertical',
        right: '6%',
        top: 'center',
        textStyle: { color: ink, fontFamily: FONT, fontSize: 13 },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 18,
        formatter: function (name) {
          var map = {
            '研发与工程落地': '研发  45% · $2.25M',
            '供应链与生产备料': '供应链 35% · $1.75M',
            '市场运营与渠道': '市场 20% · $1.00M'
          };
          return map[name] || name;
        }
      },
      series: [{
        type: 'pie',
        radius: ['54%', '78%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: bg2Solid, borderWidth: 3 },
        label: {
          show: true,
          position: 'center',
          formatter: function () {
            return '{total|$5M}\n{lbl|Seed / Pre-A}';
          },
          rich: {
            total: { color: ink, fontFamily: '"Bricolage", sans-serif', fontSize: 34, fontWeight: 700, lineHeight: 42 },
            lbl: { color: muted, fontFamily: MONO, fontSize: 12, lineHeight: 18, letterSpacing: '0.1em' }
          }
        },
        emphasis: {
          label: { show: true },
          itemStyle: { shadowBlur: 14, shadowColor: 'rgba(10,22,40,0.18)' }
        },
        labelLine: { show: false },
        data: [
          { value: 2.25, name: '研发与工程落地', itemStyle: { color: accent } },
          { value: 1.75, name: '供应链与生产备料', itemStyle: { color: accent2 } },
          { value: 1.00, name: '市场运营与渠道', itemStyle: { color: ok } }
        ]
      }]
    });
    window.addEventListener('resize', function () { chart.resize(); });
  }

  /* ---------- init all ---------- */
  function initAll() {
    initFunnel();
    initUE();
    initRadar();
    initFunding();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
