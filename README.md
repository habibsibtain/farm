# KisanMitra AI — Smart Farming Assistant

> An AI-powered agriculture platform helping Indian farmers with crop disease detection, crop recommendations, market price forecasting, and multilingual advisory — all from a single mobile app.

KisanMitra AI combines a **React Native** mobile app, a **Node.js REST API**, and **three ML models** (disease classification, crop recommendation, price forecasting) into a unified platform designed for small and marginal farmers. The app supports **9 Indian languages** and works on Android, iOS, and the web.

---

## Features

### Crop Disease Detection
- Upload or capture a leaf photo to identify **38 types of plant diseases** across **14 crop species**
- MobileNetV2-based deep learning model with ~95–97% accuracy
- Returns disease name, cause, symptoms, treatment, and prevention advice
- Falls back to **Gemini AI vision analysis** when the ML service is unavailable

### Smart Crop Recommendations
- Get personalized crop suggestions based on soil type, location, and real-time weather data
- Random Forest model trained on 22 crop profiles with N/P/K, temperature, humidity, pH, and rainfall features
- Integrates **OpenWeatherMap API** for live environmental data enrichment

### Mandi Price Forecasting
- View current and predicted prices for major Indian crops
- **Facebook Prophet** time-series models generate 90-day price forecasts with confidence intervals
- Sell/hold/wait advisories with best-month-to-sell predictions

### AI Chat Assistant (Kisan Sahayak)
- Conversational farming advisor powered by **Google Gemini AI**
- Supports text and **voice input** (audio transcribed via Gemini)
- Provides crop advisory, pest management, and weather-based guidance

### Multilingual Support
- Full UI localization in **9 languages**: English, Hindi, Marathi, Odia, Punjabi, Telugu, Tamil, Kannada, Bengali
- Language preference saved per user and persisted across sessions

### Farm Profile Management
- Register multiple farms with location (state/district/village), land size, soil type, irrigation type, and crops grown
- Soil data tracking (pH, N/P/K, moisture, temperature)
- Profile-based personalized recommendations

### Weather Integration
- Real-time weather display on the home screen using GPS location
- 7-day forecast with OpenWeatherMap (OneCall 3.0 with free API fallback)

### Authentication
- Phone + password registration and login
- JWT-based authentication with HttpOnly cookies (web) and Bearer tokens (mobile)
- Role-based access control (farmer / admin)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React Native 0.81 | Cross-platform mobile framework |
| Expo SDK 54 | Build tooling, routing, native APIs |
| Expo Router v6 | File-based navigation (tabs + stack) |
| TypeScript | Type-safe development |
| i18n-js | Internationalization (9 languages) |
| Google Gemini AI SDK | Chat assistant, image analysis, audio transcription |
| Lucide React Native | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| Node.js (ES Modules) | Server runtime |
| Express.js v5 | REST API framework |
| Mongoose v9 | MongoDB ODM |
| JSON Web Tokens | Stateless authentication |
| bcrypt | Password hashing |
| Multer | Multipart file upload handling |
| Axios | HTTP client for ML API & weather API |

### Database
| Technology | Purpose |
|---|---|
| MongoDB | Primary database |
| Mongoose Schemas | User, Farm, SoilData, CropAdvisory |

### Machine Learning
| Model | Framework | Algorithm | Dataset |
|---|---|---|---|
| Crop Disease Prediction | PyTorch | MobileNetV2 (Transfer Learning) | PlantVillage (54K images, 38 classes) |
| Crop Recommendation | scikit-learn | Random Forest (200 estimators) | Kaggle Crop Recommendation (22 crops) |
| Mandi Price Forecasting | Prophet | Time-Series Forecasting | Synthetic Indian crop price data |

### External APIs
| API | Purpose |
|---|---|
| OpenWeatherMap | Real-time weather & 7-day forecast |
| Google Gemini AI | Chat advisory, image analysis, voice transcription |
| Kaggle | Dataset downloads (PlantVillage, Crop Recommendation) |

---

## Project Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App (Expo)                        │
│  React Native  ·  Expo Router  ·  Gemini AI SDK  ·  i18n-js    │
│                                                                 │
│  ┌──────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐  │
│  │ Home │ │ Sahayak  │ │  Scan    │ │ Mandi  │ │  My Farm   │  │
│  │      │ │ (Chat)   │ │ (Doctor) │ │(Market)│ │ (Profile)  │  │
│  └──┬───┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └─────┬──────┘  │
│     │          │             │            │            │         │
│     └──────────┴──────┬──────┴────────────┴────────────┘         │
│                       ▼                                          │
│              services/api.ts  (HTTP Client)                      │
│              services/geminiService.ts  (AI)                     │
└───────────────────────┬──────────────────────────────────────────┘
                        │  REST API calls
                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Express v5)                   │
│                                                                   │
│  Routes ──▶ Controllers ──▶ Models (Mongoose) ──▶ MongoDB         │
│                                                                   │
│  Auth · Farm · Soil · Advisory · CropScan · CropRecommend · Price│
│                    │                │               │             │
│                    │    ┌───────────┘               │             │
│                    ▼    ▼                           ▼             │
│              Proxy to ML API (localhost:5001)                     │
└───────────────────────┬──────────────────────────────────────────┘
                        │  HTTP (axios)
                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Flask ML API (Port 5001)                       │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Disease Pred.  │  │ Crop Recommend.  │  │  Price Forecast │  │
│  │  (MobileNetV2)  │  │ (Random Forest)  │  │   (Prophet)     │  │
│  │  PyTorch        │  │ scikit-learn     │  │   Facebook      │  │
│  │  38 classes     │  │ 22 crops         │  │   per-crop      │  │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

**Data Flow**:
1. The **mobile app** communicates with the **Express.js backend** via REST APIs.
2. For ML predictions, the backend acts as a **gateway/proxy** — forwarding image uploads and JSON payloads to the **Flask ML API**.
3. The **Gemini AI** service is called directly from the frontend for chat, image analysis, and voice transcription.
4. **OpenWeatherMap** is called from both the frontend (weather widget) and backend (crop recommendation enrichment).

---

## Folder Structure

```
farm/
├── backend/                          # Node.js REST API
│   ├── server.js                     # Entry point (port 5000)
│   ├── package.json                  # Dependencies
│   └── src/
│       ├── app.js                    # Express app, CORS, routes, error handler
│       ├── config/
│       │   └── db.js                 # MongoDB connection
│       ├── controllers/
│       │   ├── auth.controller.js    # Register, login, logout, profile
│       │   ├── farmer.controller.js  # Farm CRUD operations
│       │   ├── soil.controller.js    # Soil data management
│       │   ├── advisory.controller.js# Crop advisory generation
│       │   ├── crop-scan.controller.js    # Disease prediction proxy
│       │   ├── crop-recommend.controller.js # Crop recommendation proxy
│       │   └── price-forecast.controller.js # Price forecast proxy
│       ├── middleware/
│       │   ├── auth.middleware.js     # JWT verification
│       │   └── role.middleware.js     # Role-based access control
│       ├── models/
│       │   ├── User.js               # User schema (phone, password, role, language)
│       │   ├── Farm.js               # Farm schema (location, soil, irrigation)
│       │   ├── SoilData.js           # Soil chemistry data
│       │   └── CropAdvisory.js       # Advisory history
│       └── routes/
│           ├── auth.routes.js
│           ├── farmer.routes.js
│           ├── soil.routes.js
│           ├── advisory.routes.js
│           ├── crop-scan.routes.js
│           ├── crop-recommend.routes.js
│           └── price-forecast.routes.js
│
├── frontend/                         # React Native (Expo) App
│   ├── app/                          # Expo Router pages
│   │   ├── _layout.tsx               # Root layout (Auth + Language providers)
│   │   ├── index.tsx                 # Auth redirect (login ↔ home)
│   │   ├── login.tsx                 # Login screen
│   │   ├── register.tsx              # Registration screen
│   │   └── (tabs)/                   # Bottom tab navigator
│   │       ├── _layout.tsx           # Tab configuration
│   │       ├── index.tsx             # Home tab
│   │       ├── chat.tsx              # AI chat assistant
│   │       ├── pest-doctor.tsx       # Disease scanner
│   │       ├── market.tsx            # Mandi prices
│   │       └── my-farm.tsx           # Profile & farm management
│   ├── components/
│   │   ├── Features/                 # Feature components
│   │   │   ├── ChatAssistant.tsx     # Gemini-powered chat with voice input
│   │   │   ├── PestDoctor.tsx        # Leaf scan + disease results
│   │   │   ├── MarketInsights.tsx    # Price forecasts + mandi data
│   │   │   ├── WeatherWidget.tsx     # Weather display
│   │   │   └── ForecastRow.tsx       # Price forecast row component
│   │   ├── Layout/
│   │   │   └── AppHeader.tsx         # App header bar
│   │   └── Views/
│   │       ├── HomeView.tsx          # Home screen layout
│   │       └── ProfileView.tsx       # Profile + farm CRUD + crop suggestions
│   ├── context/
│   │   ├── AuthContext.tsx           # Authentication state management
│   │   └── LanguageContext.tsx       # Language selection persistence
│   ├── hooks/
│   │   ├── useWeather.ts            # Weather data fetching (7-day forecast)
│   │   └── useUserLocation.ts       # GPS location hook
│   ├── services/
│   │   ├── api.ts                    # Backend API client (typed services)
│   │   └── geminiService.ts          # Gemini AI integration
│   ├── locales/                      # Translation files (9 languages)
│   │   ├── en.json, hi.json, mr.json, pa.json, te.json,
│   │   ├── ta.json, kn.json, bn.json, or.json
│   ├── types.ts                      # Shared TypeScript types/enums
│   ├── i18n.ts                       # i18n-js configuration
│   └── package.json
│
├── ml/                               # Machine Learning Models
│   ├── crop_disease_pred/            # Disease prediction (PyTorch)
│   │   ├── config.py                 # Hyperparameters, paths, disease info
│   │   ├── dataset.py                # Data download, augmentation, DataLoaders
│   │   ├── model.py                  # MobileNetV2 architecture
│   │   ├── train.py                  # Two-phase training pipeline
│   │   ├── evaluate.py               # Metrics, confusion matrix, plots
│   │   ├── predict.py                # Single/batch inference
│   │   ├── api.py                    # Flask REST API (unified for all 3 models)
│   │   ├── utils.py                  # Visualization helpers
│   │   ├── main.py                   # CLI entry point
│   │   ├── requirements.txt          # Python dependencies
│   │   └── models/                   # Saved model weights
│   ├── crop_recommendation/          # Crop recommendation (scikit-learn)
│   │   ├── train.py                  # Random Forest training
│   │   ├── predict.py                # Inference with soil-type defaults
│   │   ├── data/                     # Training dataset
│   │   └── models/                   # Saved model + scaler + encoder
│   └── mandi_price_prediction/       # Price forecasting (Prophet)
│       ├── generate_data.py          # Synthetic price data generator
│       ├── train.py                  # Per-crop Prophet model training
│       ├── predict.py                # Forecast generation + advisories
│       ├── data/                     # Price time-series CSVs
│       └── models/                   # Saved Prophet models + forecast cache
│
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.9
- **MongoDB** (local or Atlas cloud instance)
- **Expo CLI**: `npm install -g @expo/cli`
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/habibsibtain/farm.git
cd farm
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
MONGO_URI=mongodb://localhost:27017/kisanmitra
JWT_SECRET=your_jwt_secret_key
PORT=5000
ML_API_URL=http://localhost:5001
WEATHER_API_KEY=your_openweathermap_api_key
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_GEMINI_API_KEY=your_google_gemini_api_key
EXPO_PUBLIC_WEATHER_API_KEY=your_openweathermap_api_key
```

### 4. ML Environment Setup

```bash
cd ml/crop_disease_pred
pip install -r requirements.txt
```

#### Train the Models (or use pre-trained weights if available)

```bash
# Disease prediction model
python main.py --all

# Crop recommendation model
cd ../crop_recommendation
python train.py

# Mandi price prediction models
cd ../mandi_price_prediction
python train.py
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `PORT` | No | Server port (default: `5000`) |
| `ML_API_URL` | No | Flask ML API URL (default: `http://localhost:5001`) |
| `WEATHER_API_KEY` | No | OpenWeatherMap API key for crop recommendations |
| `NODE_ENV` | No | Set to `production` for secure cookies and hidden stack traces |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL (e.g., `http://localhost:5000`) |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Yes | Google Gemini AI API key for chat, vision, and transcription |
| `EXPO_PUBLIC_WEATHER_API_KEY` | Yes | OpenWeatherMap API key for weather widget |

---

## Running the Project

### Start All Services

Open **three terminals** and run:

**Terminal 1 — Backend (Express.js)**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 — ML API (Flask)**
```bash
cd ml/crop_disease_pred
python api.py
# Flask API starts on http://localhost:5001
```

**Terminal 3 — Frontend (Expo)**
```bash
cd frontend
npx expo start
# Press 'w' for web, 'a' for Android, 'i' for iOS
```

### Quick Health Checks

```bash
# Backend health
curl http://localhost:5000/api/health

# ML API health
curl http://localhost:5001/health

# ML disease classes
curl http://localhost:5001/classes
```

---

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ✗ | Register with name, phone, password, language |
| `POST` | `/auth/login` | ✗ | Phone-only login (legacy) |
| `POST` | `/auth/login/password` | ✗ | Phone + password login |
| `POST` | `/auth/logout` | ✓ | Clear auth token |
| `GET`  | `/auth/profile` | ✓ | Get authenticated user profile |

### Farm Management (`/farmer`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST`   | `/farmer/farm` | ✓ (farmer) | Create a new farm |
| `GET`    | `/farmer/farms` | ✓ | Get all farms for current user |
| `GET`    | `/farmer/farm/:id` | ✓ | Get farm by ID |
| `PUT`    | `/farmer/farm/:id` | ✓ | Update farm details |
| `DELETE` | `/farmer/farm/:id` | ✓ | Soft-delete a farm |

### Soil Data (`/soil`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/soil/:farmId` | ✓ (farmer) | Add soil data (pH, N/P/K, moisture) |
| `GET`  | `/soil/:farmId` | ✓ | Get soil data history for a farm |

### Crop Advisory (`/advisory`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/advisory/generate` | ✓ (farmer) | Generate crop advisory for a farm |
| `GET`  | `/advisory/history/:farmerId` | ✓ (farmer) | Get paginated advisory history |

### Crop Disease Scan (`/crop-scan`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/crop-scan/predict` | ✗ | Upload leaf image → disease prediction |
| `GET`  | `/crop-scan/health` | ✗ | Check ML service connectivity |

### Crop Recommendation (`/crop-recommend`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/crop-recommend/suggest` | ✗ | Get crop suggestions (soil + weather enriched) |
| `GET`  | `/crop-recommend/health` | ✗ | Check ML service connectivity |

### Price Forecast (`/price-forecast`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/price-forecast/all` | ✗ | Get price forecasts for all crops |
| `GET` | `/price-forecast/:crop` | ✗ | Get forecast for a specific crop |

### ML API Direct Endpoints (Flask — Port 5001)

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/` | API info and available endpoints |
| `GET`  | `/health` | Model load status and device info |
| `GET`  | `/classes` | All 38 disease classes with crop/disease metadata |
| `POST` | `/predict` | Disease prediction (multipart image or base64 JSON) |
| `POST` | `/predict/batch` | Batch prediction (up to 10 images) |
| `POST` | `/recommend` | Crop recommendation from soil/weather data |
| `GET`  | `/price-forecast/all` | All crop price forecasts |
| `GET`  | `/price-forecast/<crop>` | Single crop forecast |

---

## Machine Learning Pipeline

### 1. Crop Disease Prediction

#### Dataset
- **PlantVillage Dataset** — 54,000+ images of healthy and diseased plant leaves
- **38 classes** across **14 crop species** (Apple, Corn, Grape, Tomato, Potato, Rice, etc.)
- Automated download via `kagglehub`

#### Preprocessing
- Resize to **224 × 224** pixels
- ImageNet normalization (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`)
- 80/20 train-validation split (seeded for reproducibility)

#### Data Augmentation (Training)
- Random rotation (±30°), horizontal flip, width/height shift (±20%)
- Random zoom (±20%), shear (20%), brightness jitter (0.8–1.2)
- Random crop (256 → 224) and color contrast adjustment

#### Model Architecture
```
MobileNetV2 (ImageNet pretrained, frozen)
    → AdaptiveAvgPool2d → Flatten
    → BatchNorm1d(1280)
    → Linear(1280, 256) → ReLU → Dropout(0.3)
    → Linear(256, 128)  → ReLU → Dropout(0.15)
    → Linear(128, 38)   → Softmax
```

#### Training Strategy
| Phase | Epochs | Learning Rate | Description |
|---|---|---|---|
| Transfer Learning | 25 | 1e-4 | Freeze backbone, train classifier head |
| Fine-Tuning | 10 | 1e-5 | Unfreeze top backbone layers, train end-to-end |

- **Optimizer**: Adam
- **Loss**: CrossEntropyLoss
- **Early Stopping**: Patience 5, restores best weights
- **LR Scheduler**: ReduceLROnPlateau (factor 0.2, patience 3)
- **Logging**: TensorBoard + CSV export

#### Evaluation
| Metric | Expected Score |
|---|---|
| Accuracy | ~95–97% |
| Top-3 Accuracy | ~99% |
| F1-Score (weighted) | ~0.96 |
| Inference Time | ~100–200ms (GPU) |

Generates: confusion matrix, per-class precision/recall/F1 charts, confidence distribution plots.

#### Prediction Output
Returns: predicted class, confidence score, crop name, disease name, health status, disease info (cause, symptoms, treatment, prevention), and top-K alternative predictions.

---

### 2. Crop Recommendation

- **Algorithm**: Random Forest (200 estimators, max depth 20)
- **Features**: N, P, K, temperature, humidity, pH, rainfall
- **Classes**: 22 Indian crops (rice, wheat, maize, cotton, jute, etc.)
- **Dataset**: Kaggle Crop Recommendation Dataset (2,200 samples) with synthetic fallback
- **Preprocessing**: StandardScaler + LabelEncoder
- **Evaluation**: 5-fold cross-validation
- **Soil-type defaults**: Maps soil types (Alluvial, Black, etc.) to typical N/P/K/pH values when detailed soil data is unavailable

---

### 3. Mandi Price Forecasting

- **Algorithm**: Facebook Prophet (per-crop time-series model)
- **Forecast horizon**: 90 days (3 months)
- **Outputs**: Monthly predicted price, confidence interval (low/high), trend (UP/DOWN/STABLE), sell/hold/wait advisory
- **Data**: Synthetic Indian crop price time-series with seasonal patterns
- **Metrics**: MAE and MAPE per crop

---

## Screenshots

> Add screenshots of your app here.

| Screen | Preview |
|---|---|
| Home Screen | ![Home Screen](screenshots/home.png) |
| AI Chat Assistant | ![Chat](screenshots/chat.png) |
| Crop Disease Scanner | ![Disease Scan](screenshots/scan.png) |
| Disease Results | ![Results](screenshots/results.png) |
| Mandi Price Forecast | ![Market](screenshots/market.png) |
| Farm Profile | ![Profile](screenshots/profile.png) |
| Login / Register | ![Auth](screenshots/auth.png) |

*Replace the paths above with actual screenshot images placed in a `screenshots/` directory.*

---

## Future Improvements

- **Offline Mode**: Cache ML models on-device using ONNX Runtime for inference without internet connectivity
- **Push Notifications**: Weather alerts, price spike notifications, and pest outbreak warnings
- **IoT Sensor Integration**: Connect soil sensors for automated soil data collection
- **Community Forum**: Farmer-to-farmer knowledge sharing platform
- **Government Scheme Integration**: Surface relevant agricultural subsidies and loan programs
- **Regional Mandi API**: Integrate with real mandi price APIs (e.g., Agmarknet) instead of synthetic data
- **On-Device Inference**: Deploy the ONNX-converted disease model directly on mobile for zero-latency predictions
- **Crop Calendar**: Sowing/harvesting schedule based on region and crop selection
- **Expense Tracker**: Track farming costs and revenue per crop cycle
- **Multi-Image Scan**: Batch scan multiple leaves and generate a farm-wide health report

---

## Contributors

| Name | Role | Key Contributions |
|---|---|---|
| **Md Sibtain Habib** ([@habibsibtain](https://github.com/habibsibtain)) | Backend & ML Lead | Backend architecture, REST API, database design, crop disease prediction ML pipeline, project setup |
| **Ishank Dahat** ([@Ishank108](https://github.com/Ishank108)) | Frontend Developer | React Native UI, Expo setup, OTP auth flow, registration screens, profile components |
| **Md Saif** ([@mdsaifansari1](https://github.com/mdsaifansari1)) | ML Engineer | Crop recommendation model, mandi price prediction model, frontend localization |

---

## License

This project is currently unlicensed. Please add a `LICENSE` file to specify the terms under which this software can be used, modified, and distributed.

For an open-source release, consider:
- **MIT License** — permissive, minimal restrictions
- **Apache 2.0** — permissive with patent protection
- **GPL v3** — copyleft, requires derivative works to remain open source

---

<div align="center">

**Built with ❤️ for Indian Farmers**

 KisanMitra AI — *Your Smart Farming Companion*

</div>
