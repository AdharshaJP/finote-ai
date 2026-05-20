import express from "express";
import {
  chatWithAI,
  getInsights,
  predictSpending,
  affordCheck,
  getAnomaly,
} from "../controllers/aiController.js";
import {
  uploadMiddleware,
  processBillUpload,
  confirmBill,
} from "../controllers/billController.js";

const router = express.Router();

router.post("/chat", chatWithAI);
router.get("/insights/:userId", getInsights);
router.get("/predict/:userId", predictSpending);
router.post("/afford", affordCheck);
router.get("/anomaly/:userId", getAnomaly);
router.post("/upload-bill", uploadMiddleware, processBillUpload);
router.post("/confirm-bill", confirmBill);

export default router;
