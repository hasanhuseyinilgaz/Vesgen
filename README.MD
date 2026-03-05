<h1 align="center">Vesgen</h1>

<p align="center">
  <strong>Next-Generation Infrastructure & Database Command Center</strong><br>
  <i>"Manage complex systems with a seamless interface."</i>
</p>

---

## 📖 About the Project

Traditional database management tools and server panels are often complex, slow, and feature outdated interfaces. **Vesgen** is a modern **B2B SaaS Internal Management and Monitoring** platform designed to end this chaos.

**Our Main Goal:** To manage databases, server metrics, custom SQL queries, and system logs belonging to different clients (Tenants) from a single, dark-mode focused interface that feels like a native desktop application.

Vesgen aims to be the **"Single Source of Truth"** for DevOps engineers, Database Administrators (DBAs), and SaaS founders serving multiple clients.

---

## 🚀 Detailed Features & Modules

Vesgen is not just an interface; it's a highly secure workspace. The application is built around the following core modules:

### 1. Multi-Tenant Management Module

The biggest challenge in the SaaS world is managing the data and connection settings of different clients (Company A, Company B) without mixing them up.

- **How it works:** The `configs/tenants/` directory in the project holds isolated configuration files (JSON/YAML) for each client.

- **Security:** This folder is strictly protected by `.gitignore`. Developers' local settings or client passwords will never leak to GitHub.

### 2. Centralized Query Library

Instead of repeatedly writing the same SQL queries or server commands, Vesgen stores them in a modular library.

- **How it works:** Categorized scripts are securely stored under the `queries/` directory. Every action triggered from the UI is executed from this secure library.

### 3. Premium UI, Native Desktop Feel & i18n

Vesgen doesn't act like an ordinary website; powered by `electron/`, it feels exactly like a native desktop application.

- **Custom Titlebar:** We hide the operating system's standard frames and use a custom, draggable `Titlebar.tsx` component built with React.
- **Persistent Theme Engine:** A dedicated infrastructure that saves the user's dark/light mode preferences directly into the browser's local storage.
- **i18n (Multi-Language):** Thanks to the `locales/` architecture, the application can instantly adapt to different languages.

### 4. Centralized Configuration System (Constants)

The application's brand identity is never hardcoded across the codebase.

- The `APP_INFO` object inside `src/lib/constants.ts` acts as the heart of the entire project.
- The moment the version number (`1.0.0-dev`), application name, or company name is updated here, the changes are instantly reflected across all panels and screens.

---

## 📂 Detailed Directory Architecture

Vesgen features a highly scalable and enterprise-grade file structure:

```text
Vesgen/
├── configs/
│   └── tenants/          # ⚠️ [SECRET] Client-specific database/server connection configs (JSON)
├── electron/             # Main Process and Preload scripts for the desktop application
├── queries/              # ⚠️ [SECRET] Custom SQL/BASH scripts strictly behind the firewall
├── src/
│   ├── components/       # UI (Titlebar, etc.) and Main Page components
│   ├── hooks/            # Custom React Hooks
│   ├── lib/              # constants.ts and utility functions
│   ├── locales/          # Multi-language (i18n) support files
│   ├── App.tsx           # Main router and Theme Provider
│   └── main.tsx          # Application entry point (DOM render)
├── .gitignore            # Security shield preventing sensitive data from leaking to GitHub
└── package.json          # NPM dependencies and "Vesgen" identity

```

---

## 🛠️ Installation & Setup Guide

To run the project in your local development environment:

1. **Clone the repository:**

```bash
git clone [https://github.com/YOUR_USERNAME/Vesgen.git](https://github.com/YOUR_USERNAME/Vesgen.git)
cd Vesgen

```

2. **Install dependencies:**

```bash
npm install

```

3. **Start the development server:**

```bash
npm run dev

```

---

<p align="center">
<i>Engineered for reliability by <b>lizoco</b></i>

<code>v1.0.0-dev</code>

</p>
