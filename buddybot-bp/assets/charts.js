// BuddyBot BP · charts.js
(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule-solid').trim();
  var bg2 = style.getPropertyValue('--bg2-solid').trim();
  var fontStack = '"WorkSans", "Noto Sans CJK SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

  // ---------- Chart 1: BOM 成本构成 ----------
  var bomEl = document.getElementById('chart-bom');
  if (bomEl) {
    var bom = echarts.init(bomEl, null, { renderer: 'svg' });
    var items = [
      { name: 'Jetson Orin Nano Super SoM', value: 95 },
      { name: '单线固态激光雷达 (LiDAR)', value: 70 },
      { name: '深度相机 (RealSense 类)', value: 50 },
      { name: 'Raspberry Pi 5 (4GB)', value: 55 },
      { name: '麦克纳姆轮 + 电机模组', value: 40 },
      { name: '屏幕 + 外壳 + 结构件', value: 32 },
      { name: '其他 (线材 / PCB / 组装)', value: 30 },
      { name: '电池 + BMS 电源管理', value: 28 }
    ];
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);

    bom.setOption({
      animation: false,
      color: [accent],
      grid: { left: 8, right: 90, top: 30, bottom: 10, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        appendToBody: true,
        formatter: function (p) {
          var d = p[0];
          return d.name + '<br/><b style="color:' + accent + '">$' + d.value + '</b> · 占比 ' + (d.value / total * 100).toFixed(1) + '%';
        }
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: rule, type: 'dashed' } },
        axisLabel: {
          color: muted,
          fontFamily: fontStack,
          formatter: '${value}'
        }
      },
      yAxis: {
        type: 'category',
        data: items.map(function (i) { return i.name; }).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: ink, fontFamily: fontStack, fontSize: 12.5, width: 180, overflow: 'truncate' }
      },
      series: [{
        type: 'bar',
        data: items.map(function (i) { return i.value; }).reverse(),
        barWidth: 18,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: function (p) {
            // gradient from accent to lighter accent
            return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: accent },
              { offset: 1, color: '#818CF8' }
            ]);
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: function (p) { return '$' + p.value; },
          color: ink,
          fontFamily: fontStack,
          fontWeight: 700,
          fontSize: 12.5
        }
      }],
      graphic: [{
        type: 'text',
        right: 14,
        top: 6,
        style: {
          text: '单机 BOM 合计 ≈ $' + total,
          fill: '#B45309',
          fontFamily: fontStack,
          fontWeight: 700,
          fontSize: 13
        }
      }]
    });
    window.addEventListener('resize', function () { bom.resize(); });
  }

  // ---------- Chart 2: 核心能力雷达对比 ----------
  var radarEl = document.getElementById('chart-radar');
  if (radarEl) {
    var radar = echarts.init(radarEl, null, { renderer: 'svg' });
    radar.setOption({
      animation: false,
      legend: {
        data: ['BuddyBot', 'Enabot EBO X', 'Rocki Robot'],
        top: 10,
        textStyle: { color: ink, fontFamily: fontStack, fontSize: 13 },
        itemGap: 28
      },
      tooltip: { trigger: 'item', appendToBody: true },
      radar: {
        indicator: [
          { name: 'AI 算力', max: 5 },
          { name: '物理交互\n(机械臂)', max: 5 },
          { name: '健康监测', max: 5 },
          { name: '模块化扩展', max: 5 },
          { name: '价格友好度', max: 5 },
          { name: '导航自主性', max: 5 }
        ],
        center: ['50%', '58%'],
        radius: '68%',
        axisName: {
          color: ink,
          fontFamily: fontStack,
          fontSize: 12.5,
          fontWeight: 600
        },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { areaStyle: { color: ['rgba(79,70,229,0.02)', 'rgba(79,70,229,0.05)'] } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        data: [
          {
            value: [5, 5, 5, 5, 5, 5],
            name: 'BuddyBot',
            itemStyle: { color: accent },
            lineStyle: { color: accent, width: 3 },
            areaStyle: { color: 'rgba(79,70,229,0.20)' }
          },
          {
            value: [2, 0, 1, 0, 2, 4],
            name: 'Enabot EBO X',
            itemStyle: { color: accent2 },
            lineStyle: { color: accent2, width: 2 },
            areaStyle: { color: 'rgba(245,158,11,0.10)' }
          },
          {
            value: [1, 1, 0, 0, 4, 1],
            name: 'Rocki Robot',
            itemStyle: { color: muted },
            lineStyle: { color: muted, width: 2, type: 'dashed' },
            areaStyle: { color: 'rgba(91,100,120,0.06)' }
          }
        ]
      }]
    });
    window.addEventListener('resize', function () { radar.resize(); });
  }
})();
