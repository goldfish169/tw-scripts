// ==UserScript==
// @name         تريبال وار - قناص الإرسال والإلغاء (تone attack)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  توليد ملاحظة شاملة ومفصلة للإرسال والإلغاء بالألوان فور الضغط وعرضها في الصفحة التالية
// @author       You
// @match        https://*.tribalwars.ae/*
// @match        https://*.tribalwars.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let savedAttacks = [];
    let isScheduled = false;
    let launchTargetMs = 0;
    let cancelTargetMs = 0;
    let currentSelectedMinutes = 0;
    let isCancelPhase = false;

    function getVillageId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('village') || 'default';
    }

    function getVillageName() {
        const villageAnchor = document.querySelector('#menu_row2_village a');
        return villageAnchor ? villageAnchor.innerText.trim() : "قرية مجهولة";
    }

    const currentVillageId = getVillageId();

    let savedDataRaw = localStorage.getItem('snipeData_v_' + currentVillageId);
    let finalTargetTimeStr = "00:00:00:000";

    if (savedDataRaw) {
        try {
            let parsed = JSON.parse(savedDataRaw);
            finalTargetTimeStr = parsed.time;
        } catch(e) {
            finalTargetTimeStr = savedDataRaw;
        }
    }

    let delayOffset = parseInt(localStorage.getItem('snipe_offset') || '0');

    // إضافة ستايل الوميض إلى الصفحة
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes blueBlink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
        .blinking-signature {
            animation: blueBlink 1s infinite;
        }
    `;
    document.head.appendChild(style);

    // 1. إنشاء واجهة المستخدم المتكاملة
    const panel = document.createElement('div');
    panel.id = 'sniper-panel';
    panel.style = `
        position: fixed; top: 10px; left: 10px; background: #e1cbb3; border: 2px solid #804000;
        padding: 10px; z-index: 9999; direction: rtl; font-family: Arial, sans-serif;
        box-shadow: 2px 2px 10px rgba(0,0,0,0.5); width: 320px; border-radius: 5px;
    `;
    panel.innerHTML = `
        <h4 style="margin: 0 0 5px 0; color: #804000; text-align: center;">لوحة قنص الهجمات (إرسال + إلغاء)</h4>

        <div style="background: #222; color: #00ff00; text-align: center; font-family: monospace; font-size: 18px; padding: 6px; border-radius: 3px; margin-bottom: 5px; border: 1px solid #804000;">
            توقيت السيرفر: <span id="sniper-server-clock">00:00:00:00</span>
        </div>

        <div style="font-size: 11px; text-align: center; color: #555; margin-bottom: 5px; font-weight: bold;">
            القرية الحالية: <span style="color: brown;">${getVillageName()}</span>
        </div>

        <div id="launch-status-box" style="background: #fff3cd; color: #856404; padding: 5px; border: 1px solid #ffeeba; border-radius: 3px; font-size: 11px; text-align: center; margin-bottom: 5px; font-weight: bold; display: none;">
            خامل - لا يوجد إطلاق مجدول حالياً
        </div>

        <div style="background: #f4eae1; padding: 8px; border: 1px solid #804000; border-radius: 3px; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #804000; margin-bottom: 5px; text-align: center;">
                التوقيت النشط بالبوكس حالياً:
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-bottom: 8px;">
                <button id="btn-minus-50" style="padding: 4px 8px; font-weight: bold; cursor: pointer; background: #fff; border: 1px solid #804000; border-radius: 3px;">▼ -50</button>
                <input type="text" id="target-time-input" value="${finalTargetTimeStr}" style="width: 110px; text-align: center; font-weight: bold; font-size: 14px; padding: 4px; border: 1px solid #804000; border-radius: 3px;">
                <button id="btn-plus-50" style="padding: 4px 8px; font-weight: bold; cursor: pointer; background: #fff; border: 1px solid #804000; border-radius: 3px;">▲ +50</button>
            </div>

            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-bottom: 8px; font-size: 11px;">
                <span>تعويض تأخر الشبكة (ملي ثانية):</span>
                <input type="number" id="offset-input" value="${delayOffset}" style="width: 60px; text-align: center; font-weight: bold; border: 1px solid #804000; border-radius: 3px; padding: 2px;">
            </div>

            <button id="btn-save-permanent" style="width: 100%; padding: 6px; background: #28a745; color: white; font-weight: bold; border: 1px solid #1e7e34; border-radius: 3px; cursor: pointer; font-size: 12px;">
                💾 حفظ التوقيت الحالي والتعويض
            </button>
        </div>

        <div id="minutes-selector-box" style="background: #fdfefe; border: 1px solid #28a745; padding: 5px; border-radius: 3px; margin-bottom: 10px; display: none;">
            <div style="font-size: 11px; font-weight: bold; color: #28a745; text-align: center; margin-bottom: 5px;">⏰ اختر وقت الإرسال (سيتم الإلغاء في النصف تلقائياً):</div>
            <div id="minutes-buttons-container" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px;"></div>
        </div>

        <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 7px; border-radius: 3px; margin-bottom: 10px;">
            <div style="font-size: 12px; font-weight: bold; color: #721c24; text-align: center; margin-bottom: 5px;">📝 ملاحظة التحريك:</div>
            <div id="snipe-note-display" style="background: #fff; padding: 6px; border: 1px solid #f5c6cb; border-radius: 3px; font-size: 12px; min-height: 20px; word-break: break-all; color: #721c24; line-height: 1.5; text-align: center;">
                لا توجد تحركات مسجلة حالياً لهذه القرية.
            </div>
        </div>

        <div style="background: #fff; border: 1px solid #804000; padding: 5px; border-radius: 3px; margin-bottom: 5px;">
            <div style="font-size: 11px; font-weight: bold; color: #804000; margin-bottom: 5px; text-align: center;">
                📋 لائحة التوقيتات المحفوظة سابقاً:
            </div>
            <div id="saved-list-container" style="max-height: 90px; overflow-y: auto;"></div>
        </div>
        
        <!-- التوقيع المومض باللون الأزرق العريض -->
        <div class="blinking-signature" style="text-align: center; font-weight: bold; color: #007bff; font-size: 14px; margin-top: 8px; border-top: 1px dashed #804000; padding-top: 5px;">
            دحدوحة
        </div>
    `;
    document.body.appendChild(panel);

    // 2. محرك المزامنة والمراقبة المزدوجة
    function initAbsoluteServerClock() {
        function updateClock() {
            let currentServerMs = Date.now();

            if (typeof window.Timing !== "undefined" && typeof window.Timing.getCurrentServerTime === "function") {
                currentServerMs = window.Timing.getCurrentServerTime();
            } else if (typeof window.timing !== "undefined" && typeof window.timing.getReturnTime === "function") {
                currentServerMs = window.timing.getReturnTime();
            }

            let currentServerDate = new Date(currentServerMs);
            let h = String(currentServerDate.getHours()).padStart(2, '0');
            let m = String(currentServerDate.getMinutes()).padStart(2, '0');
            let s = String(currentServerDate.getSeconds()).padStart(2, '0');
            let ms = String(currentServerDate.getMilliseconds()).padStart(3, '0').slice(0, 2);

            const fullClockStr = `${h}:${m}:${s}:${ms}`;
            if (document.getElementById('sniper-server-clock')) document.getElementById('sniper-server-clock').innerText = fullClockStr;
            if (document.getElementById('serverTime')) document.getElementById('serverTime').innerText = fullClockStr;

            let currentOffset = parseInt(document.getElementById('offset-input').value || '0');

            // المرحلة الأولى: انتظار وقت الإرسال تلقائياً والضغط
            if (isScheduled && !isCancelPhase) {
                if (currentServerMs >= (launchTargetMs - currentOffset)) {
                    const confirmBtn = document.getElementById('troop_confirm_submit') || document.querySelector('.troop_confirm_go');
                    if (confirmBtn) {
                        isCancelPhase = true;
                        localStorage.setItem('snipe_cancel_active_' + currentVillageId, 'true');

                        // التعديل المطلوب: صياغة الملاحظة الكاملة والمفصلة لحظة الإرسال الفعلي
                        const moveTimeStr = msToLocalTimeStr(launchTargetMs);
                        const cancelTimeStr = msToLocalTimeStr(cancelTargetMs);
                        const sourceVillage = getVillageName();
                        const cancelMinutes = currentSelectedMinutes / 2;

                        const generatedNote = `تم التحريك في <span style="color: blue; font-weight: bold;">${moveTimeStr}</span> قبل <span style="color: blue; font-weight: bold;">${currentSelectedMinutes} دقائق</span> من وصول الهجمة من قرية <span style="color: red; font-weight: bold; font-size: 13px;">${sourceVillage}</span><br>⏳ والالغاء توقيت <span style="color: blue; font-weight: bold;">${cancelTimeStr}</span> بعد <span style="color: blue; font-weight: bold;">${cancelMinutes} دقيقة</span> واحدة`;

                        // حفظها في المتصفح لتعرض مباشرة بالصفحة التالية
                        localStorage.setItem('snipe_note_v_' + currentVillageId, generatedNote);

                        confirmBtn.click();
                    }
                }
            }

            // المرحلة الثانية: المراقبة لزر الإلغاء
            if (isCancelPhase) {
                const statusBox = document.getElementById('launch-status-box');
                if (statusBox) {
                    statusBox.style.background = "#f8d7da";
                    statusBox.style.color = "#721c24";
                    statusBox.innerText = `⚠️ جاري انتظار موعد الإلغاء الفوري في: ${msToLocalTimeStr(cancelTargetMs)}`;
                }

                if (currentServerMs >= (cancelTargetMs - currentOffset)) {
                    const cancelBtn = document.querySelector('.cancel_link_icon') || document.querySelector('a[href*="action=cancel"]');
                    if (cancelBtn) {
                        isScheduled = false;
                        isCancelPhase = false;
                        localStorage.removeItem('snipe_cancel_active_' + currentVillageId);

                        if (cancelBtn.tagName === 'A') {
                            cancelBtn.click();
                        } else {
                            cancelBtn.parentElement.click();
                        }
                    }
                }
            }

            requestAnimationFrame(updateClock);
        }

        requestAnimationFrame(updateClock);
    }

    function timeToMs(hours, minutes, seconds, ms) {
        return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000 + parseInt(ms);
    }

    function msToLocalTimeStr(totalMs) {
        let d = new Date(totalMs);
        let h = String(d.getHours()).padStart(2, '0');
        let m = String(d.getMinutes()).padStart(2, '0');
        let s = String(d.getSeconds()).padStart(2, '0');
        let ms = String(d.getMilliseconds()).padStart(3, '0');
        return `${h}:${m}:${s}:${ms}`;
    }

    function adjustTime(amount) {
        const currentInputVal = document.getElementById('target-time-input').value;
        const match = currentInputVal.match(/(\d{2}):(\d{2}):(\d{2}):(\d{3})/);
        if (match) {
            let today = new Date();
            today.setHours(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4]));
            let totalMs = today.getTime() + amount;
            document.getElementById('target-time-input').value = msToLocalTimeStr(totalMs);
        }
    }

    function checkConfirmationPage() {
        const confirmBtn = document.getElementById('troop_confirm_submit') || document.querySelector('.troop_confirm_go');
        const cancelBtn = document.querySelector('.cancel_link_icon') || document.querySelector('a[href*="action=cancel"]');

        if (confirmBtn || cancelBtn) {
            const minBox = document.getElementById('minutes-selector-box');
            if (minBox) minBox.style.display = 'block';
            setupMinutesButtons();
        }
    }

    function setupMinutesButtons() {
        const container = document.getElementById('minutes-buttons-container');
        container.innerHTML = "";
        const minutesOptions = [18, 16, 14, 12, 10, 8, 6, 4, 2];

        minutesOptions.forEach(min => {
            const btn = document.createElement('button');
            btn.innerText = `${min} د`;
            btn.style = `padding: 4px; font-weight: bold; cursor: pointer; background: #e8f4fd; border: 1px solid #007bff; border-radius: 3px; font-size: 11px; text-align: center;`;

            btn.onclick = function(e) {
                e.preventDefault();
                scheduleAttackAndCancel(min);
            };
            container.appendChild(btn);
        });
    }

    function scheduleAttackAndCancel(minusMinutes) {
        const currentInputVal = document.getElementById('target-time-input').value;
        const match = currentInputVal.match(/(\d{2}):(\d{2}):(\d{2}):(\d{3})/);

        if (!match) {
            alert("يرجى اختيار توقيت صالح من اللائحة السفلية أولاً!");
            return;
        }

        let today = new Date();
        if (typeof window.Timing !== "undefined" && typeof window.Timing.getCurrentServerTime === "function") {
            today = new Date(window.Timing.getCurrentServerTime());
        }

        today.setHours(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4]));
        let arrivalMs = today.getTime();

        launchTargetMs = arrivalMs - (minusMinutes * 60 * 1000);
        let cancelMinutes = minusMinutes / 2;
        cancelTargetMs = arrivalMs - (cancelMinutes * 60 * 1000);
        currentSelectedMinutes = minusMinutes;

        localStorage.setItem('snipe_launch_target_' + currentVillageId, launchTargetMs);
        localStorage.setItem('snipe_cancel_target_' + currentVillageId, cancelTargetMs);
        localStorage.setItem('snipe_selected_min_' + currentVillageId, minusMinutes);

        let currentOffset = parseInt(document.getElementById('offset-input').value || '0');

        const statusBox = document.getElementById('launch-status-box');
        statusBox.style.display = "block";
        statusBox.style.background = "#d4edda";
        statusBox.style.color = "#155724";
        statusBox.style.borderColor = "#c3e6cb";
        statusBox.innerHTML = `⚔️ <b>مجدول ثنائي:</b><br>
                               الإرسال في: ${msToLocalTimeStr(launchTargetMs - currentOffset)}<br>
                               الإلغاء في: ${msToLocalTimeStr(cancelTargetMs - currentOffset)}`;

        isScheduled = true;
        isCancelPhase = false;
    }

    function checkActiveSession() {
        const activeCancel = localStorage.getItem('snipe_cancel_active_' + currentVillageId);
        if (activeCancel === 'true') {
            launchTargetMs = parseInt(localStorage.getItem('snipe_launch_target_' + currentVillageId) || '0');
            cancelTargetMs = parseInt(localStorage.getItem('snipe_cancel_target_' + currentVillageId) || '0');
            currentSelectedMinutes = parseInt(localStorage.getItem('snipe_selected_min_' + currentVillageId) || '0');

            isScheduled = true;
            isCancelPhase = true;
        }
    }

    function loadSavedNote() {
        const savedNote = localStorage.getItem('snipe_note_v_' + currentVillageId);
        if (savedNote) {
            document.getElementById('snipe-note-display').innerHTML = savedNote;
        } else {
            document.getElementById('snipe-note-display').innerHTML = "لا توجد تحركات مسجلة حالياً لهذه القرية.";
        }
    }

    function updateSavedListUI() {
        const container = document.getElementById('saved-list-container');
        container.innerHTML = "";
        let foundAny = false;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('snipeData_v_')) {
                foundAny = true;
                try {
                    let data = JSON.parse(localStorage.getItem(key));
                    const itemWrapper = document.createElement('div');
                    itemWrapper.style = "display: flex; align-items: center; gap: 4px; margin: 4px 0;";

                    const selectBtn = document.createElement('button');
                    selectBtn.innerHTML = `<span style="color: red; font-weight: bold;">[ ${data.name || "مجهول"} ]</span> ➔ ${data.time}`;
                    selectBtn.style = `flex-grow: 1; text-align: right; padding: 4px; background: #e8f4fd; border: 1px solid #007bff; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;`;
                    selectBtn.onclick = function() {
                        document.getElementById('target-time-input').value = data.time;
                    };

                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerText = "❌";
                    deleteBtn.style = `padding: 4px 6px; background: #dc3545; color: white; border: 1px solid #bd2130; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: bold;`;
                    deleteBtn.onclick = function() {
                        if (confirm(`حذف التوقيت؟`)) {
                            localStorage.removeItem(key);
                            localStorage.removeItem('snipe_note_v_' + key.replace('snipeData_v_', ''));
                            updateSavedListUI();
                        }
                    };

                    itemWrapper.appendChild(selectBtn);
                    itemWrapper.appendChild(deleteBtn);
                    container.appendChild(itemWrapper);
                } catch(e) {}
            }
        }
        if (!foundAny) container.innerHTML = '<span style="color: gray; font-size: 11px;">لا توجد توقيتات محفوظة.</span>';
    }

    document.getElementById('btn-plus-50').onclick = () => adjustTime(50);
    document.getElementById('btn-minus-50').onclick = () => adjustTime(-50);

    document.getElementById('btn-save-permanent').onclick = function() {
        const valueToSave = document.getElementById('target-time-input').value;
        const currentOffsetVal = document.getElementById('offset-input').value;

        localStorage.setItem('snipeData_v_' + currentVillageId, JSON.stringify({ name: getVillageName(), time: valueToSave }));
        localStorage.setItem('snipe_offset', currentOffsetVal);

        updateSavedListUI();
    };

    initAbsoluteServerClock();
    setTimeout(() => {
        updateSavedListUI();
        checkActiveSession();
        checkConfirmationPage();
        loadSavedNote();
    }, 500);

})();
