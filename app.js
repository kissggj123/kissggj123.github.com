function updateTiming() {
    // 这里写开始日期
    var startDate = new Date('2024/03/12 00:00:00');
    var currentDate = new Date();
    var timestamp = currentDate.getTime();
    var startstamp = startDate.getTime();
    var elapsedMilliseconds = timestamp - startstamp;

    // 计算天数，精确到小数点后三位
    var elapsedDays = elapsedMilliseconds / (1000 * 60 * 60 * 24);
    var elapsedDaysFormatted = elapsedDays.toFixed(3);

    // 计算小时、分钟和秒
    var elapsedHours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
    var elapsedMinutes = Math.floor((elapsedMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    var elapsedSeconds = Math.floor((elapsedMilliseconds % (1000 * 60)) / 1000);

    // 格式化日期
    function formatDate(date) {
        var year = date.getFullYear();
        var month = (date.getMonth() + 1).toString().padStart(2, '0');
        var day = date.getDate().toString().padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    // 计算下一个100天、180天、300天的纪念日
    function getNextAnniversaryDate(startDate, days) {
        var nextAnniversaryDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
        var count = 1; // 纪念日计数
        while (nextAnniversaryDate < currentDate) {
            nextAnniversaryDate = new Date(nextAnniversaryDate.getTime() + days * 24 * 60 * 60 * 1000);
            count++;
        }
        return { date: nextAnniversaryDate, count: count };
    }

    var next100Days = getNextAnniversaryDate(startDate, 100);
    var next180Days = getNextAnniversaryDate(startDate, 180);
    var next300Days = getNextAnniversaryDate(startDate, 300);

    var next100DaysFormatted = formatDate(next100Days.date) + `（第${next100Days.count}个100天）`;
    var next180DaysFormatted = formatDate(next180Days.date) + `（第${next180Days.count}个180天）`;
    var next300DaysFormatted = formatDate(next300Days.date) + `（第${next300Days.count}个300天）`;

    // 计算下一个一周年纪念日
    function getNextYearAnniversary(startDate) {
        var nextYearAnniversaryDate = new Date(startDate);
        var yearsCount = 1; // 纪念年计数
        nextYearAnniversaryDate.setFullYear(nextYearAnniversaryDate.getFullYear() + yearsCount);
        while (nextYearAnniversaryDate < currentDate) {
            yearsCount++;
            nextYearAnniversaryDate.setFullYear(nextYearAnniversaryDate.getFullYear() + 1);
        }
        return { date: nextYearAnniversaryDate, count: yearsCount };
    }

    var nextYearAnniversary = getNextYearAnniversary(startDate);
    var nextYearAnniversaryFormatted = formatDate(nextYearAnniversary.date) + `（第${nextYearAnniversary.count}周年）`;

    // 拼接显示字符串
    var timingString = 
        `🐰兔可可已经到来 ${elapsedDaysFormatted}天啦\n` +
        `🌱下一个100天纪念日是 ${next100DaysFormatted}\n` +
        `🌿下一个180天纪念日是 ${next180DaysFormatted}\n` +
        `🍀下一个300天纪念日是 ${next300DaysFormatted}\n` +
        `🎉下一个一周年纪念日是 ${nextYearAnniversaryFormatted}\n` +
        `🎂目前已经到来 ${elapsedHours}小时${elapsedMinutes}分钟${elapsedSeconds}秒`;

    document.getElementById('timing').textContent = timingString;
}

// 每100毫秒更新一次
setInterval(updateTiming, 100);
