# 🏥 MediQueue - Smart Hospital Queue Management System

MediQueue is a modern, role-based Smart Hospital Queue Management System designed to improve hospital OPD queue management. It provides patients, caregivers, staff, and administrators with digital token booking, real-time queue tracking, notifications, and queue management features.

---

## 🏗️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- Socket.io

### Frontend
- React / React Native
- Context API / Redux
- React Router
- Socket.io-client

---

## 👥 Team Responsibilities

| Member | Responsibilities |
|---|---|
| **Kavindya** | Authentication, Roles, OPD, Doctor, Room, Token Booking, Chatbot |
| **Sewmini** | Live Queue, Socket Events, Alerts, Notifications, Tracking & Reports |
| **Hiba** | Caregiver Links, User Preferences, Waiting Areas, User Management |
| **Wijekoon** | Queue Status, Consultation, Feedback, Announcements, Public Display |

---

## 🔑 Key Features

### Authentication & Identity
- JWT-based authentication
- Password hashing using bcryptjs
- Role-based access control
- Custom unique IDs such as `USR-XXXXX`, `PAT-XXXXX`, `CGV-XXXXX`, `STF-XXXXX`, and `ADM-XXXXX`

### Master Data Management
- OPD management
- Doctor management
- Room management
- Role-restricted CRUD operations

### Token Booking
- Daily token sequence generation per OPD
- Duplicate booking prevention
- MongoDB unique indexes
- Token cancellation with reason tracking

### Real-Time Queue
- Live queue updates using Socket.io
- Token status updates
- Real-time patient queue tracking
- Staff queue updates

### Chatbot
- Basic queue-related assistance
- Token status information
- System navigation support

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB
- npm

### Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Start the server:

```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## 🔄 System Workflow

```text
Register / Login
      ↓
Select OPD
      ↓
Book Token
      ↓
Token Confirmation
      ↓
Real-Time Queue Tracking
      ↓
Notifications / Alerts
      ↓
Consultation
```

---

## 👥 Team

| Member               | Student ID | Area                                               |
| -------------------- | ---------- | -------------------------------------------------- |
| **Kavindya U L R**   | IT23600898 | Authentication, OPD, Token, Chatbot                |
| **Sewmini A A M Y**  | IT23602946 | Queue, Alerts, Notifications                       |
| **Hiba J**           | IT23600966 | Caregiver, Profile, Waiting Areas, User Management |
| **Wijekoon K P C J** | IT23588950 | Staff Queue, Consultation, Public Display          |

---

## 🎓 Academic Project

**IT3060 - Human Computer Interaction**
**Sri Lanka Institute of Information Technology (SLIIT)**

Developed for academic purposes by the MediQueue project team.