import sys
sys.path.append(r"D:\mango_api")

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import timm
from PIL import Image
import io
import torchvision.transforms as transforms

# ---------- Model Definition ----------
class HybridLeafModel(nn.Module):
    def __init__(self, num_classes=8,
                 cnn_model='tf_efficientnetv2_l',
                 transformer_model='swin_base_patch4_window12_384'):
        super(HybridLeafModel, self).__init__()

        # CNN backbone
        self.cnn = timm.create_model(cnn_model, pretrained=False, features_only=True)
        cnn_out_channels = self.cnn.feature_info[-1]['num_chs']
        self.cnn_gap = nn.AdaptiveAvgPool2d(1)

        # Transformer backbone
        self.transformer = timm.create_model(transformer_model, pretrained=False, num_classes=0)

        # Fusion layers
        self.fusion_fc = nn.Sequential(
            nn.Linear(cnn_out_channels + self.transformer.num_features, 1024),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(1024, num_classes)
        )

    def forward(self, x):
        cnn_feats = self.cnn(x)[-1]
        cnn_feats = self.cnn_gap(cnn_feats)
        cnn_feats = torch.flatten(cnn_feats, 1)

        transformer_feats = self.transformer(x)
        combined = torch.cat([cnn_feats, transformer_feats], dim=1)
        out = self.fusion_fc(combined)
        return out


# ---------- Device ----------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------- Load Model ----------
num_classes = 8
model = HybridLeafModel(num_classes=num_classes)

ckpt_path = r"D:\mango_api\best_hybrid_leaf_model.pth"
state_dict = torch.load(ckpt_path, map_location="cpu")

# Fix extra neuron if present
if state_dict['fusion_fc.3.weight'].shape[0] > 8:
    print("⚠️ Trimming checkpoint from 9 to 8 classes...")
    state_dict['fusion_fc.3.weight'] = state_dict['fusion_fc.3.weight'][:8, :]
    state_dict['fusion_fc.3.bias'] = state_dict['fusion_fc.3.bias'][:8]

new_state = {k.replace("module.", ""): v for k, v in state_dict.items()}
model.load_state_dict(new_state, strict=False)
model.to(device)
model.eval()

# ---------- Class Names ----------
classes = [
    "Anthracnose",
    "Bacterial Canker",
    "Cutting Weevil",
    "Die Back",
    "Gall Midge",
    "Healthy",
    "Powdery Mildew",
    "Sooty Mould"
]

# ---------- Image Transform ----------
transform = transforms.Compose([
    transforms.Resize((384, 384)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ---------- FastAPI App ----------
app = FastAPI(title="Mango Leaf Disease Detection API")

# ✅ Allow frontend to connect (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to ["http://localhost:5173"] if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "✅ Mango Leaf Disease API is running. Visit /docs to test predictions."}


# ---------- Prediction Endpoint ----------
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        return {"error": "Invalid image file."}

    img_t = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(img_t)
        probs = torch.softmax(outputs, dim=1)
        conf, pred = torch.max(probs, 1)
        pred_idx = int(pred.item())
        confidence = float(conf.item())

    # ✅ Use stronger threshold for reliability
    threshold = 0.75

    # ✅ Return "Unknown" for low-confidence or invalid results
    if confidence < threshold or pred_idx >= len(classes):
        class_name = "Unknown"
        pred_idx = None
    else:
        class_name = classes[pred_idx]

    return {
        "class_id": pred_idx,
        "class_name": class_name,
        "confidence": round(confidence, 4),
        "is_confident": confidence >= threshold
    }
