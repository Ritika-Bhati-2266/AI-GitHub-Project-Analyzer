# AI GitHub Project Analyzer

> Understand any GitHub repository in seconds, powered by AI.

## 📌 Overview

Reading through an unfamiliar repository to understand what it does, how good
the code is, and where it can improve takes time. **AI GitHub Project Analyzer**
solves this: paste a repository link and get a clear, AI-generated report.

## 🎯 Who Is It For?

- **Developers** exploring open-source projects
- **Students** reviewing their own or others' projects
- **Recruiters and mentors** who want a quick view of a candidate's repository

## ✨ Key Features

| Feature               | Description                                       |
| --------------------- | ------------------------------------------------- |
| Repository analysis   | Fetches repo details through the GitHub REST API  |
| AI summary            | Explains what the project does in plain language  |
| Tech stack detection  | Shows languages and tools used                    |
| Improvement tips      | Suggests fixes for code quality and documentation |

## 🖥️ Usage

1. Open the app
2. Paste a public repository URL, for example:
   `https://github.com/facebook/react`
3. Click **Analyze**
4. Read the generated report

## 🧰 Built With

- React (Create React App)
- GitHub REST API
- AI model API (OpenAI / Gemini)
- Backend: Node.js / Express

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/Ritika-Bhati-2266/AI-GitHub-Project-Analyzer.git

# Move into the project folder
cd AI-GitHub-Project-Analyzer

# Install dependencies
npm install

# Start the development server
npm start
```

Open http://localhost:3000 in your browser.

## 🔐 Environment Variables

Create a `.env` file in the root folder and add your own keys:

```
REACT_APP_API_URL=
REACT_APP_GITHUB_TOKEN=
```

> Never commit your real API keys. `.env` is already ignored through `.gitignore`.

## ❓ FAQ

**Does it work with private repositories?**
Not yet. Only public repositories are supported right now.

**Why do I sometimes get an error?**
The GitHub API has rate limits. Wait a few minutes and try again.

## 🛣️ Future Plans

- [ ] Private repository support
- [ ] Charts for languages and commit activity
- [ ] Downloadable PDF report
- [ ] Compare two repositories

## 👩‍💻 Author

**Ritika Bhati**
[GitHub](https://github.com/Ritika-Bhati-2266)

---
⭐ If you like this project, consider giving it a star!
