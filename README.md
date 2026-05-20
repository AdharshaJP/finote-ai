# Finote-Finance-Tracker
Track your finances


<h1 align="center">💸 Finote — Finance Tracker</h1>
<p align="center">Track your income, expenses, and budgets with delightful micro-interactions.</p>

<p align="center">
  <a href="https://finote-finance-tracker.vercel.app"><img alt="Live Demo" src="https://img.shields.io/badge/Live-Demo-2ea44f?logo=vercel&logoColor=white"></a>
  <img alt="Status" src="https://img.shields.io/badge/Status-Active-success">
  <img alt="Built with" src="https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20MongoDB-blue">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-informational">
</p>

---

## 🚀 Live
**Deployment:** https://finote-finance-tracker.vercel.app

---

## ✨ Highlights
- 📊 Beautiful dashboards with monthly/weekly breakdowns
- 🧠 Smart categories + notes per transaction
- 🧾 Import/Export CSV
- 🛟 Persistent auth & secure storage
- 🔔 Budget alerts with subtle animations
- 🌙 Light/Dark themes

---

<p align="center">
  <img src="assets/demo/finote-overview.gif" alt="Overview" width="85%"><br/>
  <sub>Quick tour: add a transaction ➜ set a budget ➜ view insights.</sub>
</p>

<table>
<tr>
<td align="center"><img src="assets/demo/add-transaction.gif" width="100%"><br/><sub>Add Transaction</sub></td>
<td align="center"><img src="assets/demo/budget-setup.gif" width="100%"><br/><sub>Budget Setup</sub></td>
<td align="center"><img src="assets/demo/filters-search.gif" width="100%"><br/><sub>Filters & Search</sub></td>
</tr>
</table>

---

## 🪄 Built-in Animations
Finote ships with micro-animations to feel snappy yet calm:

- **Page transitions:** fade + slide via Framer Motion
- **Buttons:** scale on tap, ripple on click
- **Cards & charts:** gentle float-in on first view
- **Toasts:** springy entrance for success/error states

<details>
<summary>Framer Motion snippet (used across views)</summary>

```tsx
import { motion } from "framer-motion";

export const FadeSlideIn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.28, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);
