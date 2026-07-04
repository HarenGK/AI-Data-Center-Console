# EcoDC: AI-Powered Green Data Centre Console 🍃💻

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

An interactive Proof of Concept (POC) dashboard for an AI-driven, highly sustainable data centre. This platform demonstrates how edge computing, predictive AI, and unified IT/OT security can dramatically reduce a facility's environmental footprint while ensuring 100% operational uptime.

## 📖 Project Background

Modern data centres consume massive amounts of electricity and water (for cooling systems). As global digitalization accelerates, sustainable infrastructure is no longer optional. 

**EcoDC** was built to visualize a closed-loop intelligence system that:
1. **Reduces Municipal Water Dependency:** By using AI to predict local weather and autonomously manage Rainwater Harvesting (RWHT) systems for cooling.
2. **Unifies IT & OT Security (SIEM):** By correlating IT cyber threats (like cryptomining malware) with OT physical consequences (like thermal runaway in cooling loops) to prevent catastrophic failures.

## ✨ Key Features

* **🌦️ Weather-Aware Rainwater Manager:** Simulates meteorological AI forecasting for specific locations (e.g., Cyberjaya, Kuala Lumpur). Recommends and automates water harvesting based on precipitation probability.
* **🚰 Dynamic Physics & Depletion Engine:** Real-time physics loop simulating water draw. Automatically treats raw stormwater/rooftop water, prioritizes treated rainwater for cooling, and seamlessly fails over to the municipal grid if reserves drop to a strict 20% safety threshold.
* **🛡️ IT/OT SIEM Correlation Engine:** Monitors live Power Usage Effectiveness (PUE) and total facility draw. Includes a threat injection simulator that maps a cascading cyber-physical attack and prescribes automated mitigation steps.
* **📊 Central Health Dashboard:** A unified view of financial savings (RM), dependency reduction percentages, live telemetry, and critical system alerts.

## 🛠️ Technology Stack

* **Frontend Framework:** React 18
* **Build Tool:** Vite
* **Styling:** Tailwind CSS (v3)
* **Icons:** Lucide React
* **Architecture Design:** Single-page application (SPA) with complex, unified state management handling real-time simulation ticks.

## 🏗️ Proposed System Architecture (POC Only)

![System Architecture Diagram (EcoDC)](https://github.com/HarenGK/AI-Data-Center-Console/blob/3912d95c27fcae6ba05e98d75be083dffb9debeb/System%20Architecture%20Diagram%20(EcoDC).png?raw=true)

*The architecture diagram above illustrates the flow of data from the Edge IoT sensors (Data Acquisition Layer) through the Real-Time Processing Pipeline (Apache Kafka/Spark), feeding into the AI Analytics Engine for autonomous control commands.*

---

## 🚀 Getting Started

Follow these instructions to run the interactive demonstration on your local machine.

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (Node Package Manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/HarenGK/AI-Data-Center-Console.git)
   cd green-datacenter

2. **Install Dependencies:**
   ```bash
   npm install
   
3. **Run the development server:**
   ```bash
   npm run dev

4. **View the App:**

   Open your browser and navigate to the local URL provided in the terminal (usually http://localhost:5173).

## 🎮 How to Demo the System
This POC is interactive and simuates teh core concept of the Sustainable Green Data Center using Rainwater Harvesting System. Here is a guide on how to show off the system's logic during a presentation:

**1. Test the AI Weather Logic**

  * Navigate to the Rainwater AI tab.
  
  * Select a dry location (e.g., Bukit Jalil) and click Forecast. Notice the AI recommends conserving water.
  
  * Select a wet location (e.g., Cyberjaya) and click Forecast. The AI predicts rain.

  * Click Approve & Prep System to watch the Raw Collection tanks fill and automatically filter into the Treated tank.

**2. Test the Sequential Failover Physics**

  * On the Rainwater AI tab, locate the Simulate Facility Draw slider at the bottom.

  * Drag it up to a high multiplier (e.g., 8x).

  * Watch the Treated Rainwater tank rapidly deplete. Once it hits 30%, observe it aggressively pulling and treating remaining Raw Water.

  * Once it hits 20%, watch the system gracefully halt the treated draw and seamlessly switch to draining the Municipal Grid to protect the reserve.

**3. Trigger a Cyber-Physical Attack**

  * Navigate to the Energy & SIEM tab.

  * Click the red Inject Anomalous Spike button.

  * Watch the live Power Telemetry spike dangerously high.

  * Read the cascading logs in the Terminal window as the AI traces an IT malware infection causing an OT cooling overload, ultimately issuing a mitigation command.

  * Quickly swap to the Central Dashboard to see the system-wide critical alerts and disrupted PUE metrics.


## 📄 License

This project is licensed under the ![MIT License](LICENSE.md).
   
