javascript:

// 1. قراءة القيم الحالية من مخزون التبادل وتحويلها إلى أرقام
var sWood = Number($('#premium_exchange_stock_wood').text());
var sStone = Number($('#premium_exchange_stock_stone').text());
var sIron = Number($('#premium_exchange_stock_iron').text());

// تخزين القيم وأسماء حقول الإدخال المقابلة لها
var stocks = [
    { name: 'iron', stock: sIron },
    { name: 'stone', stock: sStone },
    { name: 'wood', stock: sWood }
];

// قيمة المضاعف الثابتة
var multiplier = 64;

// متغيرات لتتبع المورد الذي يحمل أعلى قيمة (للقاعدة الأولى: مضاعف 64)
var highestStockValueOver64 = 0;
var highestResourceNameOver64 = null;

// متغيرات لتتبع المورد الذي يحمل أعلى قيمة (للقاعدة الثانية: بين 50 و 64)
var highestStockValue50_64 = 0;
var highestResourceName50_64 = null;

// 2. البحث عن المورد الأعلى لكلتا المجموعتين (أكبر من 64، وبين 50 و 64)
stocks.forEach(function(resource) {
    var stockValue = resource.stock;
    var resourceName = resource.name;

    // المجموعة 1: أكبر من 64
    if (stockValue > multiplier) {
        if (stockValue > highestStockValueOver64) {
            highestStockValueOver64 = stockValue;
            highestResourceNameOver64 = resourceName;
        }
    } 
    // المجموعة 2: بين 50 و 64
    else if (stockValue >= 40 && stockValue <= 64) {
         if (stockValue > highestStockValue50_64) {
            highestStockValue50_64 = stockValue;
            highestResourceName50_64 = resourceName;
        }
    }
});

// 3. تطبيق منطق الشراء بناءً على الأولويات

var resourceToBuy = null;
var buyValue = 0;

// الأولوية 1: إذا تم العثور على مورد قيمته أكبر من 64
if (highestResourceNameOver64 !== null) {
    resourceToBuy = highestResourceNameOver64;
    
    // حساب أكبر مضاعف لـ 64 لا يتجاوز قيمة المخزون
    buyValue = Math.floor(highestStockValueOver64 / multiplier) * multiplier;

// الأولوية 2: إذا لم يتم العثور على الأولوية 1، نتحقق من الموارد بين 50 و 64
} else if (highestResourceName50_64 !== null) {
    resourceToBuy = highestResourceName50_64;
    
    // لصق القيمة نفسها (كما طلبت)
    buyValue = highestStockValue50_64;
}

// 4. تنفيذ اللصق والتركيز
if (resourceToBuy !== null && buyValue > 0) {
    // تحديد اسم حقل الإدخال
    var inputName = 'buy_' + resourceToBuy;

    // تعبئة حقل الإدخال
    $('.premium-exchange-input[name="' + inputName + '"]').val(buyValue);

    // التركيز على زر الشراء
    $('.btn-premium-exchange-buy').focus();
}

void(0);
