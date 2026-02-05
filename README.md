# 🌬️ AireBA — Air Quality Map for Buenos Aires

**AireBA** is a modern web application to visualize **real-time and estimated air quality (AQI)** across **Buenos Aires and the AMBA region**.

👉 **Live app:** https://aire-ba.vercel.app/

The app combines **official monitoring stations** with **transparent estimations for uncovered areas**, presenting the information in a clear, human-friendly.

---

## ✨ Features

- 🗺️ **Interactive map** with partidos, comunas, and AMBA zones  
- 📍 **Real AQI data** from official monitoring stations (WAQI)  
- 📊 **Estimated AQI** for zones without sensors  
- 🧠 Distance-based interpolation (IDW) with confidence levels  
- 🟢 Clear distinction between **REAL** vs **ESTIMATED** data  
- 💬 Contextual recommendations:
  - *Good day to walk*
  - *Reduce outdoor activity*
  - *Better to stay indoors*
- 📱 **Mobile-first UI** with bottom-sheet interaction  
- 🎨 Dark, minimal, map-centric design

---

## 🧠 How it works (high level)

- **Data sources**
  - Official air quality stations (WAQI)
  - GeoJSON boundaries for CABA, Conurbano, and AMBA

- **Estimation logic**
  - Inverse Distance Weighting (IDW)
  - Fallback to nearest-station average
  - Confidence level based on distance to sensors

- **UX principle**
  > Be explicit when data is estimated, and always communicate uncertainty.

This allows meaningful insights even in areas without direct sensors (e.g. parts of the Conurbano).

---

## 🧱 Tech Stack

- **Frontend:** React + TypeScript  
- **Maps:** Leaflet + GeoJSON  
- **Styling:** Tailwind CSS  
- **State & Logic:** Custom hooks + pure domain utilities  
- **Build & Deploy:** Vite + Vercel  

---

## 🎯 Why AireBA

Air quality data is often:
- fragmented  
- hard to interpret  
- or unavailable at neighborhood level  

**AireBA** explores how **engineering, data modeling, and UX** can work together to deliver a trustworthy, understandable product — even when real-world data is incomplete.

---

## 🚧 Project Status

This project is **actively evolving**.

- ✔️ Core architecture defined  
- ✔️ Real + estimated AQI pipeline implemented  
- ✔️ Interactive map and mobile UX  
- 🔜 Historical data
- 🔜 Alerts & health-based insights
- 🔜 Performance and accessibility refinements

---

## 👤 Author

Built by **Matías Senia**  
Backend Developer · Data & Visualization Enthusiast  

👉 https://github.com/matiassenia
