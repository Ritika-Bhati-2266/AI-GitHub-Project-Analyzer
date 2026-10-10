# 🔍 AI GitHub Project Analyzer

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-In%20Progress-yellow)

Paste any public GitHub repository link and get an AI-powered analysis of
its structure, tech stack, and overall quality, in seconds.

## ✨ Features

- Analyze any public repository using its GitHub URL
- AI-generated project summary and insights
- Overview of languages, commits, and contributors
- Suggestions to improve code quality and documentation
- Clean, responsive React interface

## ⚙️ How It Works

1. User enters a GitHub repository URL
2. The app fetches repository data using the GitHub REST API
3. The data is sent to an AI model for analysis
4. Results are displayed in a simple, readable dashboard

## 🛠️ Tech Stack

| Layer    | Technology                 |
| -------- | -------------------------- |
| Frontend | React (Create React App)   |
| Backend  | Node.js / Express          |
| AI       | OpenAI / Gemini API        |
| Data     | GitHub REST API            |

## 🚀 Getting Started

### Prerequisites
- Node.js 16 or above
- npm

### Installation

```bash
git clone https://github.com/Ritika-Bhati-2266/AI-GitHub-Project-Analyzer.git
cd AI-GitHub-Project-Analyzer
npm install
```

### Run locally

```bash
npm start
```

The app will open at http://localhost:3000

## 📁 Project Structure

```
AI-GitHub-Project-Analyzer/
├── public/        # Static files
├── src/           # React components and app logic
├── package.json
└── README.md
```

## 🗺️ Roadmap

- [ ] Support for private repositories
- [ ] Handle GitHub API rate limits
- [ ] Add charts for language and commit stats
- [ ] Export analysis as PDF

## 🤝 Contributing

Contributions are welcome! Open an issue first to discuss what you'd like
to change, then submit a pull request.

## 👩‍💻 Author

**Ritika Bhati**
GitHub: [@Ritika-Bhati-2266](https://github.com/Ritika-Bhati-2266)
