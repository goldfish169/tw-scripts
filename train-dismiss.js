// ==UserScript==
// @name         Tribal Wars - Ultimate Noble Bot (Fix Tab logo )
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  بوت متكامل لتدريب النبلاء مع العودة المباشرة وحل مشكلة توقف البوت عند تغيير التبويبات مع واجهة مميزة في أعلى وسط الشاشة
// @author       You
// @match        https://*.tribalwars.ae/game.php?*screen=train*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let isRunning = false; // 

    // 
    function createVisualWidget() {
        // التحقق من عدم وجود الواجهة مسبقاً
        if (document.getElementById('dahdouha-widget')) return;

        // إنشاء حاوية الواجهة
        const widget = document.createElement('div');
        widget.id = 'dahdouha-widget';

        // 
        widget.style.position = 'fixed';
        widget.style.top = '10px';
        widget.style.left = '50%';
        widget.style.transform = 'translateX(-50%)'; // 
        widget.style.zIndex = '99999';
        widget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        widget.style.border = '2px solid #00f3ff';
        widget.style.borderRadius = '10px';
        widget.style.padding = '12px 20px';
        widget.style.textAlign = 'center';
        widget.style.boxShadow = '0 0 20px rgba(0, 243, 255, 0.6)';
        widget.style.pointerEvents = 'none'; // 

        // 
        const gifUrl = 'https://i.ibb.co/hR5Zb0rH/image.gif';

        // 
        widget.innerHTML = `
            <img src="${gifUrl}" alt="GIF" style="max-width: 130px; max-height: 130px; display: block; margin: 0 auto 10px; border-radius: 6px;">
            <div class="blinking-text">دحدوحة</div>
            <style>
                @keyframes neonBlink {
                    0%, 100% {
                        color: #00f3ff;
                        text-shadow: 0 0 4px #fff, 0 0 12px #00f3ff, 0 0 25px #00f3ff;
                        opacity: 1;
                    }
                    50% {
                        color: #00334d;
                        text-shadow: 0 0 2px #00111a;
                        opacity: 0.3;
                    }
                }
                .blinking-text {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-weight: bold;
                    font-size: 20px;
                    animation: neonBlink 1.4s infinite ease-in-out;
                    direction: rtl;
                }
            </style>
        `;

        document.body.appendChild(widget);
    }

    // 1. 
    function handleMassTrain() {
        const nobleInputs = document.querySelectorAll('input[id^="snob_"]');
        let addedAny = false;

        nobleInputs.forEach(input => {
            const running = parseInt(input.getAttribute('data-running')) || 0;
            const existing = parseInt(input.getAttribute('data-existing')) || 0;

            // شرط التدريب: لا يوجد نبيل يتدرب ولا نبيل موجود
            if (running === 0 && existing === 0) {
                input.value = "1";
                addedAny = true;
                input.style.backgroundColor = "#ccffcc";
            } else {
                input.value = "";
                input.style.backgroundColor = "#f0f0f0";
            }
        });

        // 
        if (addedAny) {
            setTimeout(() => {
                const trainButton = document.querySelector('input.btn-recruit[value="قم بالتدريب"]');
                if (trainButton) trainButton.click();
            }, 20000);
        }
    }

    // 2. 
    function handleMassDismiss() {
        const nobleInputs = document.querySelectorAll('input[id^="snob_"]');
        let addedAny = false;

        nobleInputs.forEach(input => {
            const existing = parseInt(input.getAttribute('data-existing')) || 0;

            if (existing > 0) {
                input.value = existing;
                addedAny = true;
                input.style.backgroundColor = "#ffcccc";
            } else {
                input.value = "";
            }
        });

        if (addedAny) {
            setTimeout(() => {
                const dismissButton = document.querySelector('input.btn-recruit[value="تسريح"]');
                if (dismissButton) dismissButton.click();
            }, 20000);
        }

        // 
        const confirmInterval = setInterval(() => {
            const confirmBtn = document.querySelector('button.btn-confirm-yes, button[aria-label="التأكيد"]');
            if (confirmBtn && confirmBtn.offsetWidth > 0 && confirmBtn.offsetHeight > 0) {
                confirmBtn.click();
                clearInterval(confirmInterval); // إيقاف التكرار فور الضغط بنجاح
            }
        }, 500);
    }

    // الدالة الرئيسية لفحص وتوجيه البوت
    function initBot() {
        // تشغيل الواجهة المرئية فوراً عند بدء الفحص والتشغيل
        createVisualWidget();

        if (isRunning) return; // إذا كان البوت يعمل بالفعل لا تفعل شيئاً
        isRunning = true;

        // فحص أولى وأهم: هل يوجد زر أو رابط نصي يحتوي على "الرجوع للتدريب" في الصفحة؟
        const allLinks = document.querySelectorAll('a');
        let foundBackLink = false;

        for (let link of allLinks) {
            if (link.textContent.trim() === "الرجوع للتدريب") {
                foundBackLink = true;
                setTimeout(() => {
                    link.click();
                    isRunning = false;
                }, 1500); // يضغط رجوع بعد ثانية ونصف
                break;
            }
        }

        // إذا لم نكن في صفحة التقارير/الرجوع، نتابع العمليات العادية حسب الرابط
        if (!foundBackLink) {
            const currentUrl = window.location.href;

            if (currentUrl.includes('mode=mass_decommission')) {
                handleMassDismiss();
            } else if (currentUrl.includes('mode=mass')) {
                handleMassTrain();
            }
            isRunning = false;
        }
    }

    // [الحل الجذري للمشكلة]: تشغيل البوت عند تحميل الصفحة
    window.addEventListener('load', () => {
        setTimeout(initBot, 1500);
    });

    // [الحل الجذري للمشكلة]: إعادة تشغيل البوت فوراً بمجرد العودة للتاب (التبويب)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log("تمت العودة للتبويب، إعادة تشغيل البوت...");
            setTimeout(initBot, 500); // يعمل بعد نصف ثانية من العودة للتبويب للتأكد من استقرار الصفحة
        }
    });
})();
