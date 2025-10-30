import React, { useState, useRef } from "react";
import DISEASE_SOLUTIONS from "./data/diseaseSolutions";

function App() {
  const [screen, setScreen] = useState(1);
  const [language, setLanguage] = useState("en");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const uploadRef = useRef(null);
  const cameraRef = useRef(null);

  // Handle image selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Upload to backend
  const handleUpload = async () => {
    if (!selectedImage) return alert("Please select an image first!");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedImage);

    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Backend error");
      const data = await response.json();

      setPrediction(data);
      setScreen(3);
    } catch (err) {
      console.error(err);
      alert("⚠️ Unable to connect to backend. Please ensure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reusable Back Button (inline, no new file)
  const BackButton = ({ onClick }) => (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "#ffcccc",
        color: "#800000",
        border: "none",
        borderRadius: "10px",
        padding: "8px 16px",
        fontWeight: "bold",
        marginBottom: "20px",
        cursor: "pointer",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }}
    >
      🔙 {language === "en" ? "Back" : "వెనక్కి"}
    </button>
  );

  // -------- Screen 1: Language Selection --------
  if (screen === 1) {
    return (
      <div style={styles.centered}>
        <h1 style={{ color: "#2b7a0b" }}>🌿 MangoCure</h1>
        <h3>Select Language / భాషను ఎంచుకోండి</h3>
        <button onClick={() => { setLanguage("en"); setScreen(2); }} style={styles.btn}>English</button>
        <button onClick={() => { setLanguage("te"); setScreen(2); }} style={styles.btn}>తెలుగు</button>
      </div>
    );
  }

  // -------- Screen 2: Upload / Capture --------
  if (screen === 2) {
    return (
      <div style={styles.centered}>
        <div style={{ alignSelf: "flex-start" }}>
          <BackButton onClick={() => setScreen(1)} />
        </div>

        <h2 style={{ color: "#2b7a0b" }}>
          {language === "en"
            ? "Upload or Capture Mango Leaf Image"
            : "మామిడి ఆకు చిత్రాన్ని అప్‌లోడ్ చేయండి లేదా తీసుకోండి"}
        </h2>

        {/* Hidden Inputs */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {/* Action Buttons */}
        <div style={{ marginTop: "20px" }}>
          <button
            style={{ ...styles.btn, backgroundColor: "#4CAF50", color: "#fff" }}
            onClick={() => uploadRef.current.click()}
          >
            📁 {language === "en" ? "Upload from Gallery" : "గ్యాలరీ నుండి అప్‌లోడ్ చేయండి"}
          </button>
          <button
            style={{ ...styles.btn, backgroundColor: "#2196F3", color: "#fff" }}
            onClick={() => cameraRef.current.click()}
          >
            📸 {language === "en" ? "Take a Photo" : "ఫోటో తీయండి"}
          </button>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div style={{ marginTop: "20px" }}>
            <img
              src={previewUrl}
              alt="preview"
              style={{
                width: "250px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                marginBottom: "10px",
              }}
            />
            <div>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setPreviewUrl(null);
                }}
                style={{ ...styles.iconBtn, backgroundColor: "#ff4d4d" }}
              >
                ❌
              </button>
              <button
                onClick={handleUpload}
                style={{ ...styles.iconBtn, backgroundColor: "#4caf50" }}
                disabled={loading}
              >
                {loading ? "⏳" : "✅"}
              </button>
            </div>
          </div>
        )}

        {!previewUrl && (
          <p style={{ color: "#777", marginTop: "20px" }}>
            {language === "en"
              ? "Choose or take a clear photo of a mango leaf."
              : "మామిడి ఆకు యొక్క స్పష్టమైన ఫోటోను ఎంచుకోండి లేదా తీయండి."}
          </p>
        )}
      </div>
    );
  }

  // -------- Screen 3: Prediction Result --------
  if (screen === 3 && prediction) {
    const diseaseName = prediction.class_name;
    const diseaseInfo = DISEASE_SOLUTIONS[diseaseName]?.[language];

    return (
      <div style={{ padding: "30px", textAlign: "center" }}>
        <div style={{ textAlign: "left" }}>
          <BackButton onClick={() => setScreen(2)} />
        </div>

        <h1 style={{ color: "#2b7a0b" }}>🌿 MangoCure</h1>
        <h2>
          {language === "en" ? "Detected Disease:" : "గుర్తించిన వ్యాధి:"}{" "}
          <span style={{ color: "#e65100" }}>{diseaseName}</span>
        </h2>
        <p>
          {language === "en"
            ? `Confidence: ${(prediction.confidence * 100).toFixed(2)}%`
            : `నమ్మకం: ${(prediction.confidence * 100).toFixed(2)}%`}
        </p>

        {diseaseInfo ? (
          <div style={styles.infoBox}>
            <h3 style={{ color: "#2b7a0b", textAlign: "center" }}>{diseaseInfo.name}</h3>
            <p dangerouslySetInnerHTML={{ __html: diseaseInfo.description }} />
          </div>
        ) : (
          <p style={{ color: "red" }}>
            {language === "en"
              ? "No information available for this disease."
              : "ఈ వ్యాధి గురించి సమాచారం లేదు."}
          </p>
        )}

        <button onClick={() => { setPrediction(null); setScreen(2); }} style={styles.btn}>
          {language === "en" ? "Check Another Leaf" : "మరొక ఆకు తనిఖీ చేయండి"}
        </button>
      </div>
    );
  }

  return null;
}

// ---- STYLES ----
const styles = {
  centered: {
    textAlign: "center",
    padding: "40px",
  },
  btn: {
    margin: "10px",
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#ddd",
    cursor: "pointer",
    fontSize: "16px",
    transition: "0.3s",
  },
  iconBtn: {
    margin: "5px",
    padding: "10px 15px",
    border: "none",
    borderRadius: "50%",
    color: "white",
    cursor: "pointer",
    fontSize: "20px",
  },
  infoBox: {
    backgroundColor: "#f9fff5",
    border: "1px solid #cce0cc",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "left",
    margin: "20px auto",
    maxWidth: "700px",
    lineHeight: "1.6",
  },
};

export default App;
