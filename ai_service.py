from fastapi import FastAPI, UploadFile, File, Form
from PIL import Image
import io
import uvicorn

app = FastAPI(title="Dish Scanner AI Microservice")

@app.post("/scan-dish-ai")
async def scan_dish_ai(
    file: UploadFile = File(...),
    estimated_weight_g: float = Form(300.0)
):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))

    detected_labels = ["rice", "chicken_breast", "salad"]

    return {
        "status": "success",
        "detected_ingredients": detected_labels,
        "estimated_weight_g": estimated_weight_g
    }

# الشرط ده هو اللي بيخلي الأمر python ai_service.py يشتغل!
if __name__ == "__main__":
    uvicorn.run("ai_service:app", host="127.0.0.1", port=8000, reload=True)