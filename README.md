# AI Todo Lab

A full-stack Todo application built with **.NET Web API** and **React Native (Expo)**, developed using an **AI-driven multi-agent workflow**.

This project explores how different AI roles (Product Manager, Architect, Frontend, Backend, Tester) can collaborate to design and implement a real mobile application.

---

# ✨ Features

### Mobile App
- Todo list
- Create new todo
- Edit todo
- Toggle completion
- Delete todo
- Navigation between screens
- Error and loading states

### Backend API
- RESTful Todo API
- Health endpoint
- Validation with ProblemDetails
- Integration tests

### Testing
- Backend integration tests (xUnit)
- End-to-end tests (Playwright)

---

# 🏗 Architecture


Mobile (React Native / Expo)
↓
HTTP API
↓
Backend (.NET Web API)


Project structure:


ai-todo-lab
│
├─ backend
│ ├─ TodoApp.Api
│ ├─ TodoApp.Api.Tests
│ └─ TodoApp.slnx
│
├─ mobile
│ └─ Expo React Native application
│
├─ docs
│ └─ Architecture documentation
│
├─ tasks
│ └─ AI generated tickets
│
└─ README.md


---

# 🤖 AI Agent Workflow

Development was coordinated using an AI multi-agent structure:

- **Product Manager** → Defines features and user stories
- **Team Lead** → Breaks work into tasks
- **Architect** → Designs system architecture
- **Backend Developer** → Implements API
- **Frontend Developer** → Builds mobile UI
- **Tester / QA** → Writes automated tests

This approach simulates a real engineering team collaborating on a project.

---

# ⚙️ Tech Stack

Backend

- .NET 8 Web API
- xUnit
- ASP.NET Integration Testing

Mobile

- React Native
- Expo
- React Navigation
- TypeScript

Testing

- Playwright (E2E)

---

# 🚀 Getting Started

## Backend


cd backend/TodoApp.Api
dotnet run --urls http://localhost:5100


API will run at:


http://localhost:5100


---

## Mobile


cd mobile
npx expo start


Run on Android emulator:


npx expo start --android


---

# 🧪 Running Tests

Backend tests:


dotnet test


Mobile E2E tests:


npm run test:e2e


---

# 📱 Future Roadmap

- Persistent database (EF Core + SQLite)
- Authentication
- Improved UI design
- Push notifications
- Cloud deployment
- App Store / Play Store release

---

# 📜 License

MIT License
