# NEXORBIT 🚀
### Intelligent Satellite Fault Diagnosis & Safety-Constrained Autonomous Recovery System

**Intelligence Beyond Orbit.**

NEXORBIT is an ECE research project designed to explore intelligent satellite health monitoring, fault diagnosis, and safety-constrained autonomous recovery.

The system combines embedded electronics, real-time telemetry monitoring, cross-sensor consistency checking, confidence-aware fault diagnosis, digital twin simulation, and hardware-in-the-loop (HIL) validation.

It aims to demonstrate how a resource-constrained onboard system can detect abnormal conditions, identify possible faults, and take controlled recovery actions while maintaining predefined safety constraints.

> **Project Status:** Research prototype in development  
> **Domain:** Embedded Systems | Aerospace Electronics | Fault Detection | Digital Twin | Autonomous Systems


<img width="1916" height="893" alt="Screenshot 2026-11-24 113129" src="https://github.com/user-attachments/assets/2517ad4b-3182-4136-bdc0-ed72bfb8c3ca" />

---

## 📌 1. Project Overview

Satellites operate in challenging environments where hardware failures, sensor degradation, power fluctuations, and communication interruptions can affect mission performance.

NEXORBIT explores a system that continuously monitors satellite-like subsystem telemetry, identifies abnormal behaviour, diagnoses possible faults, and determines whether a recovery action is safe.

The project uses an ESP32-S3-based laboratory prototype to represent selected satellite monitoring functions. A software-based digital twin and dashboard provide visualization, simulation, diagnosis, and system analysis.

**Main objectives:**
- Monitor voltage, current, and temperature.
- Detect abnormal sensor readings and subsystem behaviour.
- Identify possible faults using sensor consistency and diagnostic algorithms.
- Estimate diagnosis confidence.
- Execute only safety-approved recovery actions.
- Continue local monitoring during communication loss.
- Validate performance through controlled fault-injection experiments.

---

## 🛰️ 2. System Architecture

NEXORBIT follows a modular architecture:

1. **Telemetry Acquisition** – Collects sensor measurements.
2. **Data Validation** – Checks missing, invalid, and abnormal readings.
3. **Cross-Sensor Consistency** – Compares related sensor readings with simplified physical models.
4. **Fault Diagnosis** – Estimates the possible fault and its confidence.
5. **Safety Supervisor** – Checks whether a proposed recovery action is permitted.
6. **Recovery Controller** – Executes approved actions.
7. **Digital Twin** – Represents the monitored system and compares expected and measured behaviour.
8. **Ground Dashboard** – Displays telemetry, alerts, diagnosis, and recovery logs.

### C3R Diagnostic Concept

NEXORBIT uses a proposed three-stage diagnostic and recovery concept called **C3R**:

- **C1 – Cross-Sensor Consistency:** Checks whether sensor readings agree with expected system behaviour.
- **C2 – Confidence-Aware Diagnosis:** Estimates the likely fault and its confidence, including an uncertain or unknown result.
- **C3 – Constrained Recovery:** Allows only recovery actions that satisfy defined safety rules.

---

## 🔧 3. Hardware Components

| Component | Purpose |
|---|---|
| ESP32-S3 DevKit | Main prototype controller |
| INA219 × 2 | Voltage and current monitoring |
| DS18B20 × 2 | Temperature monitoring |
| MPU6050 (optional) | Motion and orientation measurements |
| MOSFET modules × 2 | Controlled dummy-load switching |
| 5V fan / resistive dummy load | Safe subsystem load simulation |
| LEDs and buzzer | Visual and audio alerts |
| Regulated 5V supply | Prototype power source |
| Breadboard / PCB | Hardware connections |

**Important:** This is a low-voltage laboratory demonstrator. The ESP32-S3 is not a radiation-qualified or flight-certified satellite computer. The prototype is not intended for actual spacecraft operation.

---

## 💻 4. Software Technology Stack

| Technology | Application |
|---|---|
| C / C++ | Embedded firmware |
| ESP32-S3 | Telemetry acquisition and local control |
| Python | Diagnostic algorithms and simulation |
| NumPy | Numerical processing |
| SciPy | Signal and mathematical processing |
| Scikit-learn | Machine learning experiments |
| FastAPI | Backend API |
| React | Monitoring dashboard |
| Three.js | 3D digital twin visualization |
| SQLite / CSV | Telemetry and event storage |

<img width="1911" height="890" alt="Screenshot 2026-11-24 113108" src="https://github.com/user-attachments/assets/ed9acb05-d315-4718-961e-dad8d916da68" />

---

## ⚙️ 5. How NEXORBIT Works

```text
       SENSOR INPUTS
             |
             v
     TELEMETRY ACQUISITION
             |
             v
       DATA VALIDATION
             |
             v
    CROSS-SENSOR CHECKING
             |
             v
       FAULT DIAGNOSIS
             |
             v
      CONFIDENCE CHECK
             |
             v
       SAFETY SUPERVISOR
          /       \
         /         \
      SAFE        UNSAFE
       |              |
       v              v
   RECOVERY        SAFE HOLD
       |
       v
   VERIFICATION
       |
       v
   EVENT LOGGING
```

### Example Scenario

If a temperature sensor reports an abnormal reading:

1. The system receives the sensor measurement.
2. It checks the measurement against expected behaviour and other available data.
3. The diagnostic engine identifies a possible sensor fault.
4. It estimates confidence in the diagnosis.
5. The safety supervisor evaluates the proposed action.
6. If safe, the system isolates the faulty channel or applies an approved response.
7. The result is verified and recorded.

If the diagnosis is uncertain, the system enters a safe-hold state instead of performing an unsafe action.

---

## 🧠 6. Fault Detection and Diagnosis

The proposed system will investigate the following fault scenarios:

| Fault | Description |
|---|---|
| Temperature Bias | Sensor reports an incorrect offset |
| Sensor Stuck | Reading remains constant |
| Sensor Disconnection | Sensor stops providing valid data |
| Voltage Sag | Supply voltage drops below the defined limit |
| Excessive Current | Load draws more current than expected |
| Load-Switch Failure | Controlled load does not respond correctly |
| Communication Loss | Telemetry communication is interrupted |
| Multiple Faults | More than one fault occurs simultaneously |

### Diagnostic Methods

- Threshold-based monitoring
- Cross-sensor residual analysis
- Statistical anomaly detection
- CUSUM change detection
- Confidence-aware fault classification
- Safety-rule-based recovery

---

## 📊 7. Digital Twin and Dashboard

The software platform is planned to provide a ground-station-style monitoring interface.

**Planned dashboard modules:**

- Mission Overview
- 3D Satellite Visualization
- Real-Time Telemetry
- Voltage and Current Monitoring
- Temperature Monitoring
- Fault Detection Centre
- Diagnosis and Confidence Results
- Autonomous Recovery Centre
- Fault Simulation Laboratory
- Event History and System Logs
- Performance Analytics

The digital twin will compare measured telemetry with simplified expected system behaviour.

---

## 🧪 8. Testing and Validation

NEXORBIT will be evaluated through controlled fault-injection experiments.

| Test ID | Experiment |
|---|---|
| T01 | Normal operating condition |
| T02 | Temperature sensor bias |
| T03 | Stuck sensor |
| T04 | Sensor disconnection |
| T05 | Voltage sag |
| T06 | Excessive dummy-load current |
| T07 | Communication loss |
| T08 | Simultaneous fault injection |
| T09 | Unsafe recovery command rejection |
| T10 | Recovery verification |

### Performance Metrics

- Fault detection accuracy
- Precision, recall, and F1-score
- False alarm rate
- Fault detection latency
- Diagnosis accuracy
- Recovery success rate
- Unsafe-action rate
- RAM and CPU usage
- Power consumption

Results will be measured during testing. Target values are not treated as achieved results until experimentally validated.

<img width="1918" height="892" alt="Screenshot 2026-11-24 113214" src="https://github.com/user-attachments/assets/de6622a4-acac-4f94-b024-08e19be1cf7b" />

## 🛡️ 9. Safety Mechanisms

Safety is a central part of the NEXORBIT design.

- Default-off outputs during reset.
- Defined voltage and current limits.
- Recovery action timeouts.
- Command rate limiting.
- Safety supervisor before actuation.
- Post-recovery verification.
- Safe-hold mode when diagnosis is uncertain.
- Local monitoring during communication loss.
- Event logging for system analysis.

All fault injection and recovery experiments will use controlled, low-voltage laboratory hardware.

---

## 📁 10. Proposed Repository Structure

```text
NEXORBIT/
│
├── firmware/
│   ├── esp32/
│   ├── sensors/
│   └── recovery_controller/
│
├── backend/
│   ├── api/
│   ├── telemetry/
│   ├── diagnosis/
│   └── safety_supervisor/
│
├── frontend/
│   ├── dashboard/
│   ├── telemetry/
│   └── satellite_view/
│
├── digital_twin/
│   ├── models/
│   ├── simulation/
│   └── visualization/
│
├── algorithms/
│   ├── residual_analysis/
│   ├── cusum/
│   └── fault_classification/
│
├── experiments/
│   ├── test_cases/
│   ├── datasets/
│   └── results/
│
├── hardware/
│   ├── circuit_diagrams/
│   ├── wiring/
│   └── components/
│
├── docs/
│   ├── architecture/
│   ├── research/
│   └── images/
│
├── requirements.txt
└── README.md
```

---

## 🚀 11. Development Roadmap

- [ ] Literature review and research-gap analysis
- [ ] Hardware component selection
- [ ] ESP32-S3 sensor integration
- [ ] Real-time telemetry acquisition
- [ ] Data validation and storage
- [ ] Cross-sensor consistency checking
- [ ] Residual-based anomaly detection
- [ ] CUSUM implementation
- [ ] Confidence-aware fault diagnosis
- [ ] Safety supervisor development
- [ ] Autonomous recovery state machine
- [ ] Python backend integration
- [ ] React monitoring dashboard
- [ ] 3D satellite digital twin
- [ ] Hardware-in-the-loop validation
- [ ] Performance evaluation
- [ ] Research paper and final documentation

---

## 🔬 12. Research Direction

**Proposed Research Question:**

Can a resource-constrained onboard monitoring system combine cross-sensor consistency checks, uncertainty-aware fault diagnosis, and safety-constrained recovery to maintain safe operation during simultaneous sensor degradation and communication loss?

The research will investigate the performance of the proposed C3R approach against simpler monitoring and anomaly-detection baselines.

The final research contribution will depend on experimental results and a systematic review of existing literature and prior art.

---

## 🔮 13. Future Development

- Lightweight onboard machine-learning models.
- Advanced satellite subsystem simulation.
- More realistic electrical power-system modelling.
- Extended fault diagnosis for multiple subsystems.
- Improved communication-loss handling.
- External satellite telemetry dataset evaluation.
- Advanced digital twin visualization.
- Further embedded resource and power optimization.

---

## 👨‍💻 14. Project Information

**Project Name:** NEXORBIT  
**Full Title:** Intelligent Satellite Fault Diagnosis & Safety-Constrained Autonomous Recovery System  
**Domain:** Electronics and Communication Engineering  
**Project Type:** Research and Hardware-Software Prototype  
**Tagline:** Intelligence Beyond Orbit.

---

## 📚 15. References and Resources

- [ESP32-S3 Technical Documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/)
- [NASA Small Spacecraft Systems Virtual Institute](https://www.nasa.gov/smallsat-institute/)
- [NASA Small Spacecraft Systems Knowledge Base](https://www.nasa.gov/smallsat-institute/sst-soa/)
- [ESA OPS-SAT Mission](https://www.esa.int/Enabling_Support/Operations/OPS-SAT)

---

## ⚠️ Disclaimer

NEXORBIT is an academic research prototype intended for laboratory experimentation and simulation. It does not represent a flight-qualified satellite fault-management system. All recovery actions are demonstrated using controlled, low-voltage hardware and simulated subsystem behaviour.

---

**NEXORBIT — Intelligence Beyond Orbit.** 🚀
