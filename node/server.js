const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// قاعدة بيانات التغذية المربوطة بالـ DB (مستخرجة من Nutrition5K / FoodData Central)
const NUTRITION_DATABASE = {
    "rice": { name_ar: "أرز مطبوخ", calories_100g: 130, protein_100g: 2.7, carbs_100g: 28.0, fat_100g: 0.3 },
    "chicken_breast": { name_ar: "صدر دجاج مشوي", calories_100g: 165, protein_100g: 31.0, carbs_100g: 0.0, fat_100g: 3.6 },
    "salad": { name_ar: "سلطة خضراء", calories_100g: 20, protein_100g: 1.0, carbs_100g: 4.0, fat_100g: 0.2 }
};

app.post('/api/scan-dish', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image' });
        }

        const estimatedWeight = req.body.estimated_weight_g || 300;

        // تحويل وإرسال الصورة لسيرفر Python FastAPI
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });
        formData.append('estimated_weight_g', estimatedWeight.toString());

        const aiResponse = await axios.post('http://127.0.0.1:8000/scan-dish-ai', formData, {
            headers: { ...formData.getHeaders() },
        });

        const detectedLabels = aiResponse.data.detected_ingredients;
        const portionPerItem = estimatedWeight / detectedLabels.length;

        let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
        const items = [];

        for (const label of detectedLabels) {
            const foodInfo = NUTRITION_DATABASE[label] || { name_ar: label, calories_100g: 100, protein_100g: 5, carbs_100g: 10, fat_100g: 2 };
            const factor = portionPerItem / 100.0;

            const cal = foodInfo.calories_100g * factor;
            const protein = foodInfo.protein_100g * factor;
            const carbs = foodInfo.carbs_100g * factor;
            const fat = foodInfo.fat_100g * factor;

            totalCal += cal;
            totalProtein += protein;
            totalCarbs += carbs;
            totalFat += fat;

            items.push({
                id: label,
                name_ar: foodInfo.name_ar,
                weight_g: Math.round(portionPerItem),
                calories: Math.round(cal),
                protein_g: Number(protein.toFixed(1)),
                carbs_g: Number(carbs.toFixed(1)),
                fat_g: Number(fat.toFixed(1))
            });
        }

        return res.json({
            status: "success",
            requires_confirmation: true,
            summary: {
                total_calories: Math.round(totalCal),
                total_protein_g: Number(totalProtein.toFixed(1)),
                total_carbs_g: Number(totalCarbs.toFixed(1)),
                total_fat_g: Number(totalFat.toFixed(1))
            },
            items: items
        });

    } catch (error) {
        console.error("Integration Error:", error.message);
        return res.status(500).json({ error: "Failed to connect to AI Microservice" });
    }
});

app.listen(5000, () => {
    console.log("🚀 Node.js Backend running on http://localhost:5000");
});